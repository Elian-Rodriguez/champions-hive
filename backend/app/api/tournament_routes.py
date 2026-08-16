import random
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import (
    ROL_REFEREE,
    es_superadmin,
    get_current_user_optional,
    puede_administrar,
    require_staff,
    require_superadmin,
)
from app.db.database import get_db
from app.db.models import (
    Court,
    Match,
    MatchStat,
    MatchStatus,
    Player,
    SlotType,
    Sponsor,
    Stage,
    StageSlot,
    Team,
    TeamPlayer,
    Tournament,
    TournamentPhoto,
    TournamentTeam,
    User,
    Venue,
)
from app.schemas import (
    ImageUpdate,
    PhotoCreate,
    PhotoResponse,
    RenameRequest,
    SponsorCreate,
    SponsorResponse,
    StageCreate,
    StageReorder,
    StageResponse,
    StageUpdate,
    StatusUpdate,
    TournamentCreate,
    TournamentResponse,
    TournamentUpdate,
)
from app.services.strategy import (
    DEFAULT_CROSS_TIEBREAKERS,
    SPORT_DEFAULTS,
    TIEBREAKER_LABELS,
    StrategyFactory,
    calculate_standings,
    cross_group_sort_key,
)

router = APIRouter()


# --------------------------------------------------------------------------- #
#  Helpers
# --------------------------------------------------------------------------- #
def _sport_type_str(tournament: Tournament) -> str:
    st = tournament.sport_type
    return st.value if hasattr(st, "value") else str(st)


def _status_str(match: Match) -> str:
    s = match.status
    return s.value if hasattr(s, "value") else str(s)


def _team_groups(db: Session, tournament_id) -> Dict[str, str]:
    links = (
        db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == tournament_id)
        .all()
    )
    return {str(l.team_id): (l.group_name or "Sin Grupo") for l in links}


def _name_map(db: Session, team_ids) -> Dict[str, str]:
    ids = [t for t in team_ids if t]
    if not ids:
        return {}
    return {str(t.id): t.name for t in db.query(Team).filter(Team.id.in_(ids)).all()}


def _matches_to_dicts(db: Session, matches: List[Match]) -> List[Dict[str, Any]]:
    ids = set()
    for m in matches:
        if m.home_team_id:
            ids.add(m.home_team_id)
        if m.away_team_id:
            ids.add(m.away_team_id)
    names = _name_map(db, ids)
    out = []
    for m in matches:
        events = [
            {"event_type": e.event_type, "event_data": e.event_data} for e in m.events
        ]
        out.append(
            {
                "home_team_id": str(m.home_team_id) if m.home_team_id else None,
                "away_team_id": str(m.away_team_id) if m.away_team_id else None,
                "home_team_name": names.get(str(m.home_team_id)),
                "away_team_name": names.get(str(m.away_team_id)),
                "home_score": m.home_score,
                "away_score": m.away_score,
                "events": events,
            }
        )
    return out


def _torneo_administrable(db: Session, tournament_id, user: User) -> Tournament:
    """Carga el torneo y verifica que el usuario pueda administrarlo."""
    t = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not t:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    if not puede_administrar(user, t):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )
    return t


def _fase_administrable(db: Session, stage_id, user: User) -> Stage:
    """Carga la fase y verifica la propiedad del torneo al que pertenece."""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    _torneo_administrable(db, stage.tournament_id, user)
    return stage


def _torneos_visibles(db: Session, user: User) -> List[Tournament]:
    """Torneos que el usuario puede administrar (todos, si es superadmin)."""
    q = db.query(Tournament)
    if es_superadmin(user):
        return q.all()
    return [t for t in q.all() if puede_administrar(user, t)]


# Secciones que el organizador puede publicar u ocultar en el marcador público.
SECCIONES_PUBLICABLES = ("sanciones", "nominas", "metricas")


def _es_publica(tournament: Tournament, seccion: str) -> bool:
    """Por defecto todo es público; solo se oculta si el organizador lo apaga."""
    return bool((tournament.visibility or {}).get(seccion, True))


def _asegurar_visible(tournament: Tournament, seccion: str, user) -> None:
    """Deja pasar si la sección es pública o si quien pregunta la administra."""
    if _es_publica(tournament, seccion):
        return
    if not puede_administrar(user, tournament):
        raise HTTPException(
            status_code=403,
            detail="El organizador no publica esta sección de este torneo",
        )


def _torneos_del_arbitro(db: Session, user: User) -> List[Tournament]:
    """Campeonatos donde el árbitro tiene al menos un partido asignado."""
    stage_ids = {
        m.stage_id
        for m in db.query(Match).filter(Match.referee_id == user.id).all()
        if m.stage_id
    }
    if not stage_ids:
        return []
    tour_ids = {
        s.tournament_id
        for s in db.query(Stage).filter(Stage.id.in_(list(stage_ids))).all()
    }
    if not tour_ids:
        return []
    return db.query(Tournament).filter(Tournament.id.in_(list(tour_ids))).all()


def _ordered_stages(db: Session, tournament_id) -> List[Stage]:
    """Fases del torneo en su orden real.

    Las fases creadas antes de que existiera `order_index` lo tienen en NULL:
    se ordenan al final (por nombre) y se les asigna un índice concreto la
    primera vez que se consultan, para que no se mezclen con las nuevas.
    """
    stages = db.query(Stage).filter(Stage.tournament_id == tournament_id).all()
    stages.sort(key=lambda s: (s.order_index is None, s.order_index or 0, s.name or ""))
    if any(s.order_index is None for s in stages):
        for position, s in enumerate(stages):
            s.order_index = position
        db.commit()
    return stages


def _stage_config(stage: Stage) -> Dict[str, Any]:
    return stage.config or {}


def _stage_team_ids(db: Session, stage: Stage) -> Optional[List[str]]:
    """Equipos que disputan la fase, o None si la fase usa todos los del torneo.

    Se guarda en `stage.config["team_ids"]`; se ignoran los ids que ya no estén
    inscritos en el torneo (equipos eliminados después de configurar la fase).
    """
    raw = _stage_config(stage).get("team_ids")
    if not raw:
        return None
    inscritos = set(_team_groups(db, stage.tournament_id).keys())
    return [str(t) for t in raw if str(t) in inscritos]


def _stage_ids_for_stats(
    db: Session, tournament: Tournament, stage_id: Optional[UUID], mode: str
) -> List[Any]:
    """Fases que entran en una estadística (goleadores, valla, juego limpio).

    Sin `stage_id` cuentan todas. Con `stage_id`, `mode="only"` limita a esa
    fase y `mode="from"` (por defecto) toma esa fase y las posteriores según el
    orden del torneo — que es lo que se pide al decir "desde qué fase cuentan".
    """
    stages = _ordered_stages(db, tournament.id)
    if stage_id is None:
        return [s.id for s in stages]
    ids = [str(s.id) for s in stages]
    target = str(stage_id)
    if target not in ids:
        raise HTTPException(status_code=404, detail="Fase no encontrada en el torneo")
    if mode == "only":
        return [s.id for s in stages if str(s.id) == target]
    return [s.id for s in stages[ids.index(target):]]


def _round_robin_rounds(team_ids: List[Any]) -> List[List[tuple]]:
    """Round-robin por el método del círculo: devuelve jornadas en las que cada
    equipo juega como máximo una vez, separando los partidos de un mismo equipo."""
    teams: List[Any] = list(team_ids)
    if len(teams) % 2 == 1:
        teams.append(None)  # bye
    n = len(teams)
    rounds: List[List[tuple]] = []
    arr = teams[:]
    for _ in range(max(1, n - 1)):
        pairs = [
            (arr[i], arr[n - 1 - i])
            for i in range(n // 2)
            if arr[i] is not None and arr[n - 1 - i] is not None
        ]
        if pairs:
            rounds.append(pairs)
        arr = [arr[0]] + [arr[-1]] + arr[1:-1]  # rotar fijando el primero
    return rounds


def _pack_slots(
    matches: List[Match], slot_cap: int = 1, rest_slots: int = 1
) -> List[List[Match]]:
    """Agrupa los partidos en turnos. Cada turno reúne hasta `slot_cap` partidos
    con equipos distintos (que se jugarían a la misma hora en canchas distintas)
    y ningún equipo juega en turnos consecutivos: descansa al menos `rest_slots`
    turno(s). Con `slot_cap=1` queda un partido por turno (una sola cancha)."""
    remaining = list(matches)
    slots: List[List[Match]] = []
    last: Dict[Any, int] = {}
    while remaining:
        si = len(slots)
        slot: List[Match] = []
        slot_teams: set = set()
        used: List[int] = []
        for idx, m in enumerate(remaining):
            if len(slot) >= slot_cap:
                break
            teams = [t for t in (m.home_team_id, m.away_team_id) if t]
            if any(t in slot_teams for t in teams):
                continue  # un equipo no juega dos partidos a la vez
            if any(si - last.get(t, -(10 ** 9)) <= rest_slots for t in teams):
                continue  # respetar el descanso entre sus partidos
            slot.append(m)
            used.append(idx)
            slot_teams.update(teams)
        if not slot:  # descanso imposible de cumplir: relajar para avanzar
            slot.append(remaining[0])
            used.append(0)
            slot_teams.update(
                t for t in (remaining[0].home_team_id, remaining[0].away_team_id) if t
            )
        for t in slot_teams:
            last[t] = si
        slots.append(slot)
        used_set = set(used)
        remaining = [m for j, m in enumerate(remaining) if j not in used_set]
    return slots


def _build_group_standings(db: Session, stage: Stage) -> Dict[str, List[Dict]]:
    """Calcula standings por grupo para una fase usando solo partidos de esa fase."""
    tournament = (
        db.query(Tournament).filter(Tournament.id == stage.tournament_id).first()
    )
    sport = _sport_type_str(tournament)
    rules = tournament.tiebreaker_rules or None
    groups = _team_groups(db, stage.tournament_id)
    matches = db.query(Match).filter(Match.stage_id == stage.id).all()

    by_group: Dict[str, List[Match]] = defaultdict(list)
    for m in matches:
        g = groups.get(str(m.home_team_id), "Sin Grupo")
        by_group[g].append(m)

    result = {}
    for g, ms in by_group.items():
        standings = calculate_standings(_matches_to_dicts(db, ms), sport, rules)
        result[g] = standings
    return result


# Sistemas de clasificación predefinidos. El organizador elige uno por nombre y
# se traduce a los números que usa _compute_qualifiers.
QUALIFICATION_PRESETS: Dict[str, Dict[str, Any]] = {
    "dos_por_grupo": {
        "label": "2 mejores de cada grupo (+ repesca para completar)",
        "qualifiers_per_group": 2,
        "best_thirds_count": "auto",
    },
    "dos_sin_repesca": {
        "label": "2 mejores de cada grupo, sin repescados",
        "qualifiers_per_group": 2,
        "best_thirds_count": 0,
    },
    "campeones_de_grupo": {
        "label": "Solo el campeón de cada grupo",
        "qualifiers_per_group": 1,
        "best_thirds_count": 0,
    },
    "campeon_y_repesca": {
        "label": "Campeón de grupo + mejores segundos",
        "qualifiers_per_group": 1,
        "best_thirds_count": "auto",
    },
    "cuatro_por_grupo": {
        "label": "4 mejores de cada grupo",
        "qualifiers_per_group": 4,
        "best_thirds_count": 0,
    },
}


def _reglas_clasificacion(stage: Stage) -> Dict[str, Any]:
    """Resuelve la configuración de clasificación de una fase.

    Si hay `preset`, sus valores son la base; cualquier clave puesta a mano en
    el config manda sobre el preset.
    """
    cfg = _stage_config(stage)
    base = dict(QUALIFICATION_PRESETS.get(cfg.get("preset") or "", {}))
    base.pop("label", None)
    for clave in ("qualifiers_per_group", "best_thirds_count"):
        if cfg.get(clave) is not None:
            base[clave] = cfg[clave]
    return {
        "preset": cfg.get("preset"),
        "qualifiers_per_group": max(1, int(base.get("qualifiers_per_group") or 2)),
        "best_thirds_count": base.get("best_thirds_count", "auto"),
        "cross_tiebreakers": cfg.get("cross_tiebreakers") or None,
    }


def _compute_best_thirds(
    group_standings: Dict[str, List[Dict]],
    index: int = 2,
    cross_tiebreakers: Optional[List[str]] = None,
) -> List[Dict]:
    """
    De cada grupo toma el equipo en la posición `index` (0-based) y los rankea
    entre sí. Con index=2 son los clásicos "mejores terceros"; el índice se
    ajusta según cuántos clasifican directo por grupo. El orden usa los
    criterios configurados en la fase (`cross_tiebreakers`) o los por defecto.
    """
    thirds = []
    for g, rows in group_standings.items():
        if len(rows) > index:
            row = dict(rows[index])
            row["from_group"] = g
            thirds.append(row)

    thirds.sort(key=lambda r: cross_group_sort_key(r, cross_tiebreakers), reverse=True)
    return thirds


def _next_pow2(x: int) -> int:
    p = 1
    while p < x:
        p *= 2
    return p


def _prev_pow2(x: int) -> int:
    p = 1
    while p * 2 <= x:
        p *= 2
    return p


def _compute_qualifiers(db: Session, stage: Stage) -> Optional[Dict[str, Any]]:
    """Quién clasifica a la siguiente fase, según la configuración de la fase.

    Config (en `stage.config`):
        qualifiers_per_group – cuántos pasan directo por grupo (por defecto 2)
        best_thirds_count    – cuántos repescados entran; "auto" o ausente
                               completa el cuadro a la potencia de 2 más cercana

    Los "repescados" son los equipos que quedan justo debajo del corte en cada
    grupo (los terceros si pasan 2, los segundos si pasa 1), rankeados entre sí.
    """
    reglas = _reglas_clasificacion(stage)
    per_group = reglas["qualifiers_per_group"]

    standings = _build_group_standings(db, stage)
    groups = {g: rows for g, rows in standings.items() if g != "Sin Grupo" and rows}
    if len(groups) < 2:
        return None

    direct: List[Dict] = []
    for g in sorted(groups):
        for row in groups[g][:per_group]:
            r = dict(row)
            r["from_group"] = g
            direct.append(r)

    extras = _compute_best_thirds(
        groups, index=per_group, cross_tiebreakers=reglas["cross_tiebreakers"]
    )

    raw = reglas["best_thirds_count"]
    if raw is None or raw == "auto":
        base = len(direct)
        total = base + len(extras)
        size = _next_pow2(base)
        if size > total:
            size = _prev_pow2(total)
        size = max(2, size)
        needed = max(0, size - base)
    else:
        needed = max(0, int(raw))
    needed = min(needed, len(extras))

    for i, r in enumerate(extras):
        r["qualifies"] = i < needed

    preset = QUALIFICATION_PRESETS.get(reglas["preset"] or "")
    return {
        "preset": reglas["preset"],
        "preset_label": preset["label"] if preset else None,
        "cross_tiebreakers": reglas["cross_tiebreakers"] or DEFAULT_CROSS_TIEBREAKERS,
        "qualifiers_per_group": per_group,
        "extras_needed": needed,
        "bracket_size": len(direct) + needed,
        "groups": sorted(groups),
        "direct": direct,
        "extras": extras,
    }


def _preview_cruces(qualifiers: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Cruces que quedarían armados con los clasificados actuales.

    Se siembran todos los clasificados por mérito (criterios entre grupos) y se
    cruza el mejor contra el peor: 1 vs N, 2 vs N-1, etc.
    """
    clasificados = list(qualifiers["direct"]) + [
        e for e in qualifiers["extras"] if e.get("qualifies")
    ]
    orden = sorted(
        clasificados,
        key=lambda r: cross_group_sort_key(r, qualifiers.get("cross_tiebreakers")),
        reverse=True,
    )
    cruces = []
    izq, der = 0, len(orden) - 1
    while izq < der:
        local, visita = orden[izq], orden[der]
        cruces.append(
            {
                "match": len(cruces) + 1,
                "home_seed": izq + 1,
                "away_seed": der + 1,
                "home_team_id": local.get("team_id"),
                "home_team_name": local.get("team_name"),
                "home_group": local.get("from_group"),
                "away_team_id": visita.get("team_id"),
                "away_team_name": visita.get("team_name"),
                "away_group": visita.get("from_group"),
            }
        )
        izq += 1
        der -= 1
    return cruces


def _auto_resolve_winner_slots(db: Session, stage_id) -> int:
    slots = (
        db.query(StageSlot)
        .filter(
            StageSlot.stage_id == stage_id,
            StageSlot.slot_type.in_([SlotType.WINNER_OF, SlotType.LOSER_OF]),
            StageSlot.resolved == False,  # noqa: E712
        )
        .all()
    )
    changed = 0
    for slot in slots:
        src = db.query(Match).filter(Match.id == slot.source_match_id).first()
        if (
            src
            and _status_str(src) == "finished"
            and src.home_score is not None
            and src.away_score is not None
        ):
            home_wins = src.home_score >= src.away_score
            winner = src.home_team_id if home_wins else src.away_team_id
            loser = src.away_team_id if home_wins else src.home_team_id
            team = winner if slot.slot_type == SlotType.WINNER_OF else loser
            match = db.query(Match).filter(Match.id == slot.match_id).first()
            if match:
                if slot.is_home:
                    match.home_team_id = team
                else:
                    match.away_team_id = team
                slot.resolved = True
                changed += 1
    return changed


# --------------------------------------------------------------------------- #
#  Desempates / Tournaments CRUD
# --------------------------------------------------------------------------- #
@router.get("/tiebreaker_options")
def get_tiebreaker_options():
    """Devuelve los criterios de desempate disponibles con sus etiquetas."""
    return [{"key": k, "label": v} for k, v in TIEBREAKER_LABELS.items()]


@router.delete("/reset_all")
def reset_all(db: Session = Depends(get_db), current: User = Depends(require_superadmin)):
    """Elimina TODOS los torneos y sus datos (equipos, jugadores, partidos,
    eventos, fases). Conserva sedes, canchas y usuarios. Solo admin."""
    n = db.query(Tournament).count()
    db.query(StageSlot).delete(synchronize_session=False)
    db.query(MatchStat).delete(synchronize_session=False)
    db.query(Match).delete(synchronize_session=False)
    db.query(Stage).delete(synchronize_session=False)
    db.query(TeamPlayer).delete(synchronize_session=False)
    db.query(Player).delete(synchronize_session=False)
    db.query(TournamentTeam).delete(synchronize_session=False)
    db.query(Team).delete(synchronize_session=False)
    db.query(Sponsor).delete(synchronize_session=False)
    db.query(TournamentPhoto).delete(synchronize_session=False)
    db.query(Tournament).delete(synchronize_session=False)
    db.commit()
    return {"message": f"{n} torneo(s) eliminados", "deleted": n}


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), current: User = Depends(require_staff)):
    """Agregados del panel: totales, distribuciones y gráficas.

    El superadmin ve el global; cada admin ve solo sus propios torneos.
    """
    tournaments = _torneos_visibles(db, current)
    by_status: Dict[str, int] = defaultdict(int)
    by_sport: Dict[str, int] = defaultdict(int)
    for t in tournaments:
        by_status[t.status or "draft"] += 1
        by_sport[_sport_type_str(t)] += 1

    # Todo lo agregado se limita a los torneos visibles: un admin no debe ver
    # goles, tarjetas ni goleadores de los torneos de otro organizador.
    tour_ids = [t.id for t in tournaments]
    stage_ids = (
        [s.id for s in db.query(Stage).filter(Stage.tournament_id.in_(tour_ids)).all()]
        if tour_ids
        else []
    )
    matches = (
        db.query(Match).filter(Match.stage_id.in_(stage_ids)).all() if stage_ids else []
    )
    finished = [m for m in matches if _status_str(m) == "finished"]
    live = sum(1 for m in matches if _status_str(m) == "live")
    total_goals = sum((m.home_score or 0) + (m.away_score or 0) for m in finished)

    gbd: Dict[str, int] = defaultdict(int)
    for m in finished:
        d = m.scheduled_start.date().isoformat() if m.scheduled_start else "Sin fecha"
        gbd[d] += (m.home_score or 0) + (m.away_score or 0)

    match_ids = [m.id for m in matches]
    eventos = (
        db.query(MatchStat).filter(MatchStat.match_id.in_(match_ids)).all()
        if match_ids
        else []
    )
    goals_by_player: Dict[str, int] = defaultdict(int)
    d_yellow = d_blue = d_red = d_fouls = 0
    for e in eventos:
        et = (e.event_type or "").upper()
        if et in ("GOL", "GOAL"):
            if e.player_id:
                goals_by_player[str(e.player_id)] += 1
        elif et in ("AMARILLA", "YELLOW"):
            d_yellow += 1
        elif et in ("AZUL", "BLUE"):
            d_blue += 1
        elif et in ("ROJA", "RED"):
            d_red += 1
        elif et in ("FALTA", "FOUL", "TECNICA", "ANTIDEPORTIVA"):
            d_fouls += 1
    pids = list(goals_by_player.keys())
    players = (
        {str(p.id): p.name for p in db.query(Player).filter(Player.id.in_(pids)).all()}
        if pids
        else {}
    )
    links = (
        db.query(TeamPlayer).filter(TeamPlayer.player_id.in_(pids)).all() if pids else []
    )
    pteam = {str(l.player_id): l.team_id for l in links}
    team_ids = list({tid for tid in pteam.values() if tid})
    tnames = (
        {str(t.id): t.name for t in db.query(Team).filter(Team.id.in_(team_ids)).all()}
        if team_ids
        else {}
    )
    top = sorted(goals_by_player.items(), key=lambda kv: kv[1], reverse=True)[:8]
    top_scorers = [
        {
            "player_name": players.get(pid, "—"),
            "team_name": tnames.get(str(pteam.get(pid))),
            "goals": g,
        }
        for pid, g in top
    ]

    return {
        "totals": {
            "tournaments": len(tournaments),
            "teams": (
                db.query(TournamentTeam)
                .filter(TournamentTeam.tournament_id.in_(tour_ids))
                .count()
                if tour_ids
                else 0
            ),
            "matches": len(matches),
            "finished": len(finished),
            "live": live,
            "goals": total_goals,
            "players": len(
                {
                    str(l.player_id)
                    for l in (
                        db.query(TeamPlayer)
                        .filter(
                            TeamPlayer.team_id.in_(
                                [
                                    tt.team_id
                                    for tt in db.query(TournamentTeam)
                                    .filter(TournamentTeam.tournament_id.in_(tour_ids))
                                    .all()
                                ]
                            )
                        )
                        .all()
                        if tour_ids
                        else []
                    )
                }
            ),
            "venues": db.query(Venue).count(),
        },
        "by_status": dict(by_status),
        "by_sport": dict(by_sport),
        "discipline": {"yellow": d_yellow, "blue": d_blue, "red": d_red, "fouls": d_fouls},
        "goals_by_date": [{"date": d, "goals": g} for d, g in sorted(gbd.items())],
        "top_scorers": top_scorers,
        "tournaments": [
            {
                "id": str(t.id),
                "name": t.name,
                "sport_type": _sport_type_str(t),
                "status": t.status,
            }
            for t in tournaments
        ],
    }


@router.post("", response_model=TournamentResponse, status_code=status.HTTP_201_CREATED)
def create_tournament(
    tournament: TournamentCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    data = tournament.model_dump(exclude_unset=True)
    # Cada disciplina trae sus valores por defecto (puntos, duración y
    # descanso); solo se rellenan los campos que el organizador no envió.
    sport = data.get("sport_type")
    defaults = SPORT_DEFAULTS.get(
        sport.value if hasattr(sport, "value") else str(sport), {}
    )
    for field, value in defaults.items():
        if data.get(field) is None:
            data[field] = value

    # El admin que lo crea queda como dueño del torneo.
    data.pop("owner_id", None)
    obj = Tournament(**data, status="draft", owner_id=current.id)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("", response_model=List[TournamentResponse])
def get_tournaments(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """Lista de torneos.

    Sin sesión (marcador público) devuelve todos: el público puede consultar
    cualquier torneo. El admin ve solo los suyos y el árbitro solo aquellos
    donde tiene partidos asignados, para que cada panel muestre lo propio.
    """
    if current is None:
        return db.query(Tournament).offset(skip).limit(limit).all()
    if current.role == ROL_REFEREE:
        return _torneos_del_arbitro(db, current)[skip : skip + limit]
    return _torneos_visibles(db, current)[skip : skip + limit]


# --- Stages -------------------------------------------------------------- #
@router.post(
    "/{tournament_id}/stages",
    response_model=StageResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_stage_for_tournament(
    tournament_id: UUID,
    stage: StageCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    data = stage.model_dump()
    if data.get("order_index") is None:
        # Se agrega al final del torneo.
        data["order_index"] = len(_ordered_stages(db, tournament_id))
    obj = Stage(tournament_id=tournament_id, **data)
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{tournament_id}/stages", response_model=List[StageResponse])
def get_stages_for_tournament(tournament_id: UUID, db: Session = Depends(get_db)):
    return _ordered_stages(db, tournament_id)


@router.put("/stages/{stage_id}", response_model=StageResponse)
def update_stage(
    stage_id: UUID,
    payload: StageUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Renombra una fase, cambia su tipo o actualiza su configuración."""
    stage = _fase_administrable(db, stage_id, current)

    data = payload.model_dump(exclude_unset=True)
    if "type" in data and data["type"] is not None:
        played = (
            db.query(Match)
            .filter(
                Match.stage_id == stage_id,
                Match.status.in_([MatchStatus.LIVE, MatchStatus.FINISHED]),
            )
            .count()
        )
        if played and data["type"] != stage.type:
            raise HTTPException(
                status_code=400,
                detail=(
                    f"No se puede cambiar el tipo: la fase ya tiene {played} "
                    "partido(s) en vivo o finalizados."
                ),
            )
    for field, value in data.items():
        if value is not None:
            setattr(stage, field, value)
    db.commit()
    db.refresh(stage)
    return stage


@router.post("/{tournament_id}/stages/reorder", response_model=List[StageResponse])
def reorder_stages(
    tournament_id: UUID,
    payload: StageReorder,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Reordena las fases del torneo según la lista recibida (primera → última)."""
    _torneo_administrable(db, tournament_id, current)
    stages = _ordered_stages(db, tournament_id)
    by_id = {str(s.id): s for s in stages}
    incoming = [str(sid) for sid in payload.stage_ids]
    unknown = [sid for sid in incoming if sid not in by_id]
    if unknown:
        raise HTTPException(
            status_code=400,
            detail=f"Fases que no pertenecen al torneo: {', '.join(unknown)}",
        )
    # Las fases no incluidas conservan su orden relativo, al final.
    rest = [str(s.id) for s in stages if str(s.id) not in incoming]
    for position, sid in enumerate(incoming + rest):
        by_id[sid].order_index = position
    db.commit()
    return _ordered_stages(db, tournament_id)


@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(stage_id: UUID, db: Session = Depends(get_db), current: User = Depends(require_staff)):
    stage = _fase_administrable(db, stage_id, current)
    db.delete(stage)
    db.commit()


@router.get("/stages/{stage_id}/standings_by_group")
def get_stage_standings_by_group(stage_id: UUID, db: Session = Depends(get_db)):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    return _build_group_standings(db, stage)


@router.get("/stages/{stage_id}/matches")
def get_stage_matches(stage_id: UUID, db: Session = Depends(get_db)):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    matches = db.query(Match).filter(Match.stage_id == stage_id).all()
    names = _name_map(
        db, {m.home_team_id for m in matches} | {m.away_team_id for m in matches}
    )
    court_ids = [m.court_id for m in matches if m.court_id]
    courts = (
        {str(co.id): co for co in db.query(Court).filter(Court.id.in_(court_ids)).all()}
        if court_ids
        else {}
    )
    venue_ids = [co.venue_id for co in courts.values() if co.venue_id]
    venues = (
        {str(v.id): v.name for v in db.query(Venue).filter(Venue.id.in_(venue_ids)).all()}
        if venue_ids
        else {}
    )
    court_info = {
        cid: {"name": co.name, "venue": venues.get(str(co.venue_id))}
        for cid, co in courts.items()
    }
    stage_type = stage.type.value if hasattr(stage.type, "value") else stage.type
    groups = _team_groups(db, stage.tournament_id) if stage_type == "group" else {}
    ref_ids = [m.referee_id for m in matches if m.referee_id]
    refs = (
        {str(u.id): u.email for u in db.query(User).filter(User.id.in_(ref_ids)).all()}
        if ref_ids
        else {}
    )
    return [
        {
            "id": str(m.id),
            "home_team_id": str(m.home_team_id) if m.home_team_id else None,
            "away_team_id": str(m.away_team_id) if m.away_team_id else None,
            "home_team_name": names.get(str(m.home_team_id)),
            "away_team_name": names.get(str(m.away_team_id)),
            "home_score": m.home_score,
            "away_score": m.away_score,
            "status": _status_str(m),
            "court_id": str(m.court_id) if m.court_id else None,
            "court_name": court_info.get(str(m.court_id), {}).get("name"),
            "venue_name": court_info.get(str(m.court_id), {}).get("venue"),
            "stage_name": stage.name,
            "stage_type": stage_type,
            "group_name": (
                groups.get(str(m.home_team_id))
                if groups.get(str(m.home_team_id)) not in (None, "Sin Grupo")
                else None
            ),
            "bracket_round": m.bracket_round,
            "scheduled_start": m.scheduled_start,
            "referee_id": str(m.referee_id) if m.referee_id else None,
            "referee_name": (
                (refs.get(str(m.referee_id)) or "").split("@")[0] or None
                if m.referee_id
                else None
            ),
        }
        for m in matches
    ]


@router.post("/stages/{stage_id}/generate_fixture")
def generate_fixture(
    stage_id: UUID, db: Session = Depends(get_db), current: User = Depends(require_staff)
):
    stage = _fase_administrable(db, stage_id, current)

    courts = db.query(Court).all()
    if not courts:
        raise HTTPException(
            status_code=400, detail="No hay canchas registradas para asignar partidos"
        )

    existing = db.query(Match).filter(Match.stage_id == stage_id).all()
    locked = [m for m in existing if _status_str(m) in ("live", "finished")]
    if locked:
        raise HTTPException(
            status_code=400,
            detail=(
                f"No se puede regenerar el fixture: hay {len(locked)} partido(s) "
                "en vivo o finalizados en esta fase. Finaliza o elimina esos "
                "partidos primero."
            ),
        )
    for m in existing:
        db.delete(m)
    db.flush()

    groups = _team_groups(db, stage.tournament_id)
    # La fase puede disputarse con un subconjunto de equipos (los que
    # clasificaron); si no se configura ninguno, juegan todos los del torneo.
    solo = _stage_team_ids(db, stage)
    if solo is not None:
        groups = {tid: g for tid, g in groups.items() if tid in set(solo)}
    if len(groups) < 2:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 2 equipos para generar fixture",
        )

    teams_by_group: Dict[str, List[str]] = defaultdict(list)
    for team_id, g in groups.items():
        teams_by_group[g].append(team_id)

    # Ida y vuelta: se repiten todas las jornadas invirtiendo la localía.
    doble = bool(_stage_config(stage).get("double_round"))
    rounds_by_group = {}
    for g, tids in teams_by_group.items():
        rounds = _round_robin_rounds(tids)
        if doble:
            rounds = rounds + [[(a, h) for h, a in r] for r in rounds]
        rounds_by_group[g] = rounds
    max_rounds = max((len(r) for r in rounds_by_group.values()), default=0)
    created, ci = 0, 0
    # Intercalar las jornadas de cada grupo para que los partidos de un equipo
    # queden separados (descanso) en el orden de generación.
    for r in range(max_rounds):
        for g in teams_by_group:
            rounds = rounds_by_group[g]
            if r >= len(rounds):
                continue
            for home_id, away_id in rounds[r]:
                court = courts[ci % len(courts)]
                ci += 1
                db.add(
                    Match(
                        stage_id=stage_id,
                        home_team_id=home_id,
                        away_team_id=away_id,
                        court_id=court.id,
                        status=MatchStatus.SCHEDULED,
                        home_score=0,
                        away_score=0,
                    )
                )
                created += 1
    db.commit()
    detalle = " (ida y vuelta)" if doble else ""
    return {
        "total_teams": len(groups),
        "message": f"Se han generado {created} partidos exitosamente{detalle}",
    }


@router.post("/stages/{stage_id}/swiss_round")
def generate_swiss_round(
    stage_id: UUID, db: Session = Depends(get_db), current: User = Depends(require_staff)
):
    """Genera la siguiente ronda de sistema suizo: ronda 1 al azar; las
    siguientes emparejan por posición actual evitando repetir enfrentamientos."""
    stage = _fase_administrable(db, stage_id, current)
    tournament = (
        db.query(Tournament).filter(Tournament.id == stage.tournament_id).first()
    )
    courts = db.query(Court).all()
    if not courts:
        raise HTTPException(status_code=400, detail="No hay canchas registradas")

    team_ids = list(_team_groups(db, stage.tournament_id).keys())
    if len(team_ids) < 2:
        raise HTTPException(status_code=400, detail="Se necesitan al menos 2 equipos")

    existing = db.query(Match).filter(Match.stage_id == stage_id).all()
    if any(_status_str(m) == "live" for m in existing):
        raise HTTPException(
            status_code=400, detail="Hay partidos en vivo; finalízalos antes de emparejar"
        )
    played = {
        frozenset({str(m.home_team_id), str(m.away_team_id)})
        for m in existing
        if m.home_team_id and m.away_team_id
    }

    if not existing:
        order = team_ids[:]
        random.shuffle(order)
    else:
        standings = calculate_standings(
            _matches_to_dicts(db, existing),
            _sport_type_str(tournament),
            tournament.tiebreaker_rules or None,
        )
        order = [r["team_id"] for r in standings]
        for t in team_ids:
            if t not in order:
                order.append(t)

    used: set = set()
    pairs = []
    for i, t in enumerate(order):
        if t in used:
            continue
        opp = None
        for j in range(i + 1, len(order)):
            o = order[j]
            if o in used or frozenset({t, o}) in played:
                continue
            opp = o
            break
        if opp is None:  # todos ya jugados: permite repetir
            for j in range(i + 1, len(order)):
                if order[j] not in used:
                    opp = order[j]
                    break
        if opp:
            used.add(t)
            used.add(opp)
            pairs.append((t, opp))

    rnd = max([m.bracket_round or 0 for m in existing], default=0) + 1
    ci, created = 0, 0
    for home, away in pairs:
        court = courts[ci % len(courts)]
        ci += 1
        db.add(
            Match(
                stage_id=stage_id,
                home_team_id=home,
                away_team_id=away,
                court_id=court.id,
                status=MatchStatus.SCHEDULED,
                home_score=0,
                away_score=0,
                bracket_round=rnd,
            )
        )
        created += 1
    db.commit()
    return {
        "message": f"Ronda suiza {rnd}: {created} partido(s) creados",
        "round": rnd,
        "created": created,
    }


@router.get("/stages/{stage_id}/best_thirds")
def get_best_thirds(stage_id: UUID, count: int = 4, db: Session = Depends(get_db)):
    """Retorna los mejores terceros de una fase de grupos (count = cuántos clasifican).

    El índice del repescado sigue a `qualifiers_per_group`: si por grupo pasan 2
    son los terceros, si pasa 1 son los segundos.
    """
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    per_group = max(1, int(_stage_config(stage).get("qualifiers_per_group") or 2))
    thirds = _compute_best_thirds(_build_group_standings(db, stage), index=per_group)
    return {"best_thirds": thirds[:count], "all_thirds": thirds}


@router.get("/stages/{stage_id}/qualifiers")
def get_qualifiers(stage_id: UUID, db: Session = Depends(get_db)):
    """Clasificados a la siguiente fase según la configuración de la fase.

    Devuelve `null` si la fase no tiene al menos 2 grupos con partidos.
    """
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    return _compute_qualifiers(db, stage)


@router.get("/qualification_presets")
def get_qualification_presets():
    """Sistemas de clasificación predefinidos, para elegir por nombre."""
    return {
        "presets": [
            {"value": clave, **datos} for clave, datos in QUALIFICATION_PRESETS.items()
        ],
        "cross_tiebreaker_options": [
            {"value": k, "label": v}
            for k, v in TIEBREAKER_LABELS.items()
            if k != "PARTIDO_DIRECTO"
        ],
        "default_cross_tiebreakers": DEFAULT_CROSS_TIEBREAKERS,
    }


@router.get("/stages/{stage_id}/bracket_preview")
def get_bracket_preview(stage_id: UUID, db: Session = Depends(get_db)):
    """Vista previa de los cruces que se armarían con la configuración actual.

    No crea nada: sirve para revisar antes de generar la siguiente fase.
    """
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    qualifiers = _compute_qualifiers(db, stage)
    if not qualifiers:
        return None
    cruces = _preview_cruces(qualifiers)
    return {
        "bracket_size": qualifiers["bracket_size"],
        "preset_label": qualifiers["preset_label"],
        "es_potencia_de_dos": qualifiers["bracket_size"] > 0
        and _next_pow2(qualifiers["bracket_size"]) == qualifiers["bracket_size"],
        "pairings": cruces,
    }


@router.post("/stages/{stage_id}/advance")
def advance_to_next_phase(
    stage_id: UUID,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """
    Toma los standings reales de la fase actual y crea los partidos en la fase
    destino según los cruces definidos en `pairings`:
        {"next_stage_id": "<uuid>",
         "pairings": [{"h_group": "A", "h_pos": 1, "a_group": "B", "a_pos": 2}, ...]}
    Usar group "__all__" para fases sin grupos, "__best_thirds__" para mejores terceros.
    """
    next_stage_id = payload.get("next_stage_id")
    pairings = payload.get("pairings", [])
    if not next_stage_id:
        raise HTTPException(status_code=400, detail="Falta next_stage_id")
    src = _fase_administrable(db, stage_id, current)
    dst = _fase_administrable(db, next_stage_id, current)

    gs = _build_group_standings(db, src)
    best_thirds = _compute_best_thirds(gs)
    warnings: List[str] = []

    def team_at(group, pos):
        if group == "__best_thirds__":
            if pos and pos - 1 < len(best_thirds):
                return best_thirds[pos - 1]["team_id"]
            warnings.append(
                f"No hay suficientes terceros clasificados (solicitado #{pos}, "
                f"disponibles {len(best_thirds)})"
            )
            return None
        rows = gs.get(group) or gs.get("__all__") or gs.get("Sin Grupo")
        if not rows or not pos or pos - 1 >= len(rows):
            warnings.append(f"Grupo «{group}» tiene menos de {pos} equipo(s) en standings")
            return None
        return rows[pos - 1]["team_id"]

    courts = db.query(Court).all()
    created, ci = 0, 0
    for p in pairings:
        home = team_at(p.get("h_group"), p.get("h_pos"))
        away = team_at(p.get("a_group"), p.get("a_pos"))
        court_id = courts[ci % len(courts)].id if courts else None
        ci += 1
        db.add(
            Match(
                stage_id=next_stage_id,
                home_team_id=home,
                away_team_id=away,
                court_id=court_id,
                status=MatchStatus.SCHEDULED,
                home_score=0,
                away_score=0,
            )
        )
        created += 1
    db.commit()
    msg = f"Avance completado: {created} partido(s) creado(s) en «{dst.name}»"
    if warnings:
        msg += ". Advertencias: " + "; ".join(warnings)
    return {"message": msg, "created": created, "warnings": warnings}


@router.post("/stages/{stage_id}/seed_bracket")
def seed_bracket(
    stage_id: UUID,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """
    Crea el árbol completo del bracket knockout a partir de los cruces de la
    primera ronda:
        {"source_stage_id": "<uuid>",
         "round1": [{"home_group": "A", "home_position": 1,
                     "away_group": "B", "away_position": 2}, ...]}
    """
    source_stage_id = payload.get("source_stage_id")
    round1 = payload.get("round1", [])
    if not source_stage_id:
        raise HTTPException(status_code=400, detail="Falta source_stage_id")
    if not round1:
        raise HTTPException(status_code=400, detail="round1 no puede estar vacío")
    if len(round1) > 1 and len(round1) % 2 != 0:
        raise HTTPException(
            status_code=400, detail="round1 debe tener cantidad par de cruces"
        )
    dst = _fase_administrable(db, stage_id, current)
    if not db.query(Stage).filter(Stage.id == source_stage_id).first():
        raise HTTPException(status_code=404, detail="Fase origen no encontrada")

    for m in db.query(Match).filter(Match.stage_id == stage_id).all():
        db.delete(m)
    db.flush()

    courts = db.query(Court).all()
    ci = 0

    def next_court():
        nonlocal ci
        c = courts[ci % len(courts)].id if courts else None
        ci += 1
        return c

    current = []
    for cross in round1:
        match = Match(
            stage_id=stage_id,
            bracket_round=1,
            court_id=next_court(),
            status=MatchStatus.SCHEDULED,
            home_score=0,
            away_score=0,
        )
        db.add(match)
        db.flush()
        db.add(
            StageSlot(
                stage_id=stage_id,
                match_id=match.id,
                is_home=True,
                slot_type=SlotType.POSITION,
                source_stage_id=source_stage_id,
                source_group=cross.get("home_group"),
                source_position=cross.get("home_position"),
                resolved=False,
            )
        )
        db.add(
            StageSlot(
                stage_id=stage_id,
                match_id=match.id,
                is_home=False,
                slot_type=SlotType.POSITION,
                source_stage_id=source_stage_id,
                source_group=cross.get("away_group"),
                source_position=cross.get("away_position"),
                resolved=False,
            )
        )
        current.append(match)

    semifinals: List[Match] = []
    final_round_num = 1
    rnd = 2
    while len(current) > 1:
        if len(current) == 2:
            semifinals = list(current)
            final_round_num = rnd
        nxt = []
        for i in range(0, len(current), 2):
            match = Match(
                stage_id=stage_id,
                bracket_round=rnd,
                court_id=next_court(),
                status=MatchStatus.SCHEDULED,
                home_score=0,
                away_score=0,
            )
            db.add(match)
            db.flush()
            db.add(
                StageSlot(
                    stage_id=stage_id,
                    match_id=match.id,
                    is_home=True,
                    slot_type=SlotType.WINNER_OF,
                    source_match_id=current[i].id,
                    resolved=False,
                )
            )
            if i + 1 < len(current):
                db.add(
                    StageSlot(
                        stage_id=stage_id,
                        match_id=match.id,
                        is_home=False,
                        slot_type=SlotType.WINNER_OF,
                        source_match_id=current[i + 1].id,
                        resolved=False,
                    )
                )
            nxt.append(match)
        current = nxt
        rnd += 1

    # Partido por el tercer puesto (perdedores de las semifinales)
    if payload.get("third_place") and len(semifinals) == 2:
        tp = Match(
            stage_id=stage_id,
            bracket_round=final_round_num,
            is_third_place=True,
            court_id=next_court(),
            status=MatchStatus.SCHEDULED,
            home_score=0,
            away_score=0,
        )
        db.add(tp)
        db.flush()
        db.add(
            StageSlot(
                stage_id=stage_id,
                match_id=tp.id,
                is_home=True,
                slot_type=SlotType.LOSER_OF,
                source_match_id=semifinals[0].id,
                resolved=False,
            )
        )
        db.add(
            StageSlot(
                stage_id=stage_id,
                match_id=tp.id,
                is_home=False,
                slot_type=SlotType.LOSER_OF,
                source_match_id=semifinals[1].id,
                resolved=False,
            )
        )

    db.commit()
    return {"message": f"Bracket generado en «{dst.name}»", "rounds": rnd - 1}


@router.get("/stages/{stage_id}/bracket_tree")
def get_bracket_tree(stage_id: UUID, db: Session = Depends(get_db)):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    matches = (
        db.query(Match)
        .filter(Match.stage_id == stage_id)
        .order_by(Match.bracket_round)
        .all()
    )
    names = _name_map(
        db, {m.home_team_id for m in matches} | {m.away_team_id for m in matches}
    )
    rounds: Dict[int, List[Dict]] = defaultdict(list)
    for m in matches:
        slots = db.query(StageSlot).filter(StageSlot.match_id == m.id).all()
        rounds[m.bracket_round or 0].append(
            {
                "match_id": str(m.id),
                "home_team_id": str(m.home_team_id) if m.home_team_id else None,
                "away_team_id": str(m.away_team_id) if m.away_team_id else None,
                "home_team_name": names.get(str(m.home_team_id)),
                "away_team_name": names.get(str(m.away_team_id)),
                "home_score": m.home_score,
                "away_score": m.away_score,
                "status": _status_str(m),
                "is_third_place": bool(m.is_third_place),
                "slots": [
                    {
                        "is_home": s.is_home,
                        "slot_type": s.slot_type.value
                        if hasattr(s.slot_type, "value")
                        else s.slot_type,
                        "source_group": s.source_group,
                        "source_position": s.source_position,
                        "source_match_id": str(s.source_match_id)
                        if s.source_match_id
                        else None,
                        "resolved": s.resolved,
                    }
                    for s in slots
                ],
            }
        )
    return {"rounds": [{"round": r, "matches": rounds[r]} for r in sorted(rounds)]}


@router.post("/stages/{stage_id}/resolve_position_slots")
def resolve_position_slots(
    stage_id: UUID, db: Session = Depends(get_db), current: User = Depends(require_staff)
):
    stage = _fase_administrable(db, stage_id, current)
    slots = (
        db.query(StageSlot)
        .filter(
            StageSlot.stage_id == stage_id,
            StageSlot.slot_type == SlotType.POSITION,
            StageSlot.resolved == False,  # noqa: E712
        )
        .all()
    )
    cache: Dict[Any, Dict] = {}
    resolved = 0
    for slot in slots:
        src_id = slot.source_stage_id
        if src_id not in cache:
            src_stage = db.query(Stage).filter(Stage.id == src_id).first()
            cache[src_id] = _build_group_standings(db, src_stage) if src_stage else {}
        gs = cache[src_id]
        if slot.source_group == "__best_thirds__":
            rows = _compute_best_thirds(gs)
        else:
            rows = gs.get(slot.source_group) or gs.get("__all__") or gs.get("Sin Grupo")
        if rows and slot.source_position and slot.source_position - 1 < len(rows):
            team_id = rows[slot.source_position - 1]["team_id"]
            match = db.query(Match).filter(Match.id == slot.match_id).first()
            if match:
                if slot.is_home:
                    match.home_team_id = team_id
                else:
                    match.away_team_id = team_id
                slot.resolved = True
                resolved += 1
    changed = _auto_resolve_winner_slots(db, stage_id)
    db.commit()
    return {
        "message": f"{resolved} cruce(s) por posición y {changed} por ganador resueltos",
        "resolved_positions": resolved,
        "resolved_winners": changed,
    }


# --- Photos -------------------------------------------------------------- #
@router.get("/{tournament_id}/photos", response_model=List[PhotoResponse])
def get_photos(tournament_id: UUID, db: Session = Depends(get_db)):
    return (
        db.query(TournamentPhoto)
        .filter(TournamentPhoto.tournament_id == tournament_id)
        .order_by(TournamentPhoto.order)
        .all()
    )


@router.post(
    "/{tournament_id}/photos",
    response_model=PhotoResponse,
    status_code=status.HTTP_201_CREATED,
)
def add_photo(
    tournament_id: UUID,
    photo: PhotoCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    obj = TournamentPhoto(tournament_id=tournament_id, **photo.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{tournament_id}/photos/{photo_id}", response_model=PhotoResponse)
def update_photo(
    tournament_id: UUID,
    photo_id: UUID,
    photo: PhotoCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    obj = db.query(TournamentPhoto).filter(TournamentPhoto.id == photo_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    for key, value in photo.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/{tournament_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_photo(
    tournament_id: UUID,
    photo_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    obj = db.query(TournamentPhoto).filter(TournamentPhoto.id == photo_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Foto no encontrada")
    db.delete(obj)
    db.commit()


# --- Sponsors ------------------------------------------------------------ #
@router.get("/{tournament_id}/sponsors", response_model=List[SponsorResponse])
def get_sponsors(tournament_id: UUID, db: Session = Depends(get_db)):
    return (
        db.query(Sponsor)
        .filter(Sponsor.tournament_id == tournament_id)
        .order_by(Sponsor.order)
        .all()
    )


@router.post(
    "/{tournament_id}/sponsors",
    response_model=SponsorResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_sponsor(
    tournament_id: UUID,
    sponsor: SponsorCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    obj = Sponsor(tournament_id=tournament_id, **sponsor.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.put("/{tournament_id}/sponsors/{sponsor_id}", response_model=SponsorResponse)
def update_sponsor(
    tournament_id: UUID,
    sponsor_id: UUID,
    sponsor: SponsorCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    obj = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Patrocinador no encontrado")
    for key, value in sponsor.model_dump(exclude_unset=True).items():
        setattr(obj, key, value)
    db.commit()
    db.refresh(obj)
    return obj


@router.delete(
    "/{tournament_id}/sponsors/{sponsor_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_sponsor(
    tournament_id: UUID,
    sponsor_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    _torneo_administrable(db, tournament_id, current)
    obj = db.query(Sponsor).filter(Sponsor.id == sponsor_id).first()
    if not obj:
        raise HTTPException(status_code=404, detail="Patrocinador no encontrado")
    db.delete(obj)
    db.commit()


# --- Calendario / Stats / Branding -------------------------------------- #
@router.post("/{tournament_id}/schedule")
def schedule_tournament_calendar(
    tournament_id: UUID,
    payload: Dict[str, Any] = Body(default={}),
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    tournament = _torneo_administrable(db, tournament_id, current)
    start = payload.get("start")
    start_dt = datetime.fromisoformat(start) if start else datetime.utcnow()
    duration = payload.get("match_duration") or tournament.match_duration or 60
    waiting = payload.get("waiting_time") or tournament.waiting_time or 0
    step = duration + waiting
    max_per_day = payload.get("max_matches_per_day") or tournament.max_matches_per_day or 0
    days_of_week = payload.get("days_of_week") or None  # 0=lunes … 6=domingo
    interval = payload.get("days_interval") or None

    stage_ids = [s.id for s in tournament.stages]
    matches = (
        db.query(Match)
        .filter(Match.stage_id.in_(stage_ids))
        .order_by(Match.bracket_round, Match.id)
        .all()
        if stage_ids
        else []
    )
    if not matches:
        return {"message": "No hay partidos para programar", "scheduled": 0, "days": 0}

    # ¿Una sola cancha (en secuencia) o varias canchas a la vez (en paralelo)?
    parallel = bool(payload.get("parallel_courts"))
    courts_all = db.query(Court).all()
    active_courts = [c for c in courts_all if getattr(c, "is_active", True)] or courts_all
    num_courts = len(active_courts) or 1
    slot_cap = num_courts if parallel else 1
    rest_raw = payload.get("min_rest_slots")
    rest_slots = int(rest_raw) if rest_raw is not None else 1

    # Armar los turnos por ronda (grupos antes que eliminatorias), con descanso.
    by_round: Dict[int, List[Match]] = defaultdict(list)
    for m in matches:
        by_round[m.bracket_round or 0].append(m)
    slots: List[List[Match]] = []
    for rnd in sorted(by_round):
        slots.extend(_pack_slots(by_round[rnd], slot_cap, rest_slots))

    # Repartir los turnos en jornadas según el máximo de partidos por día.
    max_pd = max_per_day if (max_per_day and max_per_day > 0) else len(matches)
    slot_day: List[tuple] = []
    day_idx = in_day = slot_in_day = 0
    for slot in slots:
        if in_day > 0 and in_day + len(slot) > max_pd:
            day_idx += 1
            in_day = slot_in_day = 0
        slot_day.append((day_idx, slot_in_day))
        in_day += len(slot)
        slot_in_day += 1
    n_days = day_idx + 1

    # Fechas de cada jornada según la recurrencia (días de semana o intervalo).
    if days_of_week:
        while start_dt.weekday() not in days_of_week:
            start_dt += timedelta(days=1)
    day_dates = [start_dt]
    for _ in range(1, n_days):
        prev = day_dates[-1]
        if days_of_week:
            nxt = prev + timedelta(days=1)
            while nxt.weekday() not in days_of_week:
                nxt += timedelta(days=1)
        elif interval:
            nxt = prev + timedelta(days=int(interval))
        else:
            nxt = prev + timedelta(days=1)
        day_dates.append(nxt)

    count = 0
    for slot, (d, s) in zip(slots, slot_day):
        when = day_dates[d] + timedelta(minutes=s * step)
        for ci, m in enumerate(slot):
            m.scheduled_start = when
            m.scheduled_end = when + timedelta(minutes=duration)
            if parallel:
                m.court_id = active_courts[ci % num_courts].id
            count += 1
    db.commit()
    return {
        "message": (
            f"{count} partido(s) en {n_days} día(s) · "
            + (f"{num_courts} canchas en paralelo" if parallel else "1 cancha a la vez")
        ),
        "scheduled": count,
        "days": n_days,
        "parallel": parallel,
        "courts": num_courts if parallel else 1,
    }


@router.get("/{tournament_id}/stats")
def get_tournament_stats(tournament_id: UUID, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    stage_ids = [s.id for s in tournament.stages]
    num_matches = (
        db.query(Match).filter(Match.stage_id.in_(stage_ids)).count()
        if stage_ids
        else 0
    )
    finished = (
        db.query(Match)
        .filter(Match.stage_id.in_(stage_ids), Match.status == MatchStatus.FINISHED)
        .count()
        if stage_ids
        else 0
    )
    teams = (
        db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == tournament_id)
        .count()
    )
    return {
        "teams": teams,
        "stages": len(tournament.stages),
        "matches": num_matches,
        "finished_matches": finished,
    }


@router.get("/{tournament_id}/player_stats")
def get_player_stats(
    tournament_id: UUID,
    stage_id: Optional[UUID] = None,
    mode: str = "from",
    db: Session = Depends(get_db),
):
    """Estadísticas por jugador: goles y tarjetas agregadas desde los eventos.

    Con `stage_id` se acota desde qué fase cuentan (ver `_stage_ids_for_stats`).
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    stage_ids = _stage_ids_for_stats(db, tournament, stage_id, mode)
    if not stage_ids:
        return []
    match_ids = [
        m.id for m in db.query(Match).filter(Match.stage_id.in_(stage_ids)).all()
    ]
    if not match_ids:
        return []
    events = (
        db.query(MatchStat)
        .filter(MatchStat.match_id.in_(match_ids), MatchStat.player_id.isnot(None))
        .all()
    )
    agg: Dict[str, Dict[str, Any]] = {}
    for e in events:
        pid = str(e.player_id)
        a = agg.setdefault(
            pid,
            {"goals": 0, "yellow": 0, "blue": 0, "red": 0, "fouls": 0, "matches": set()},
        )
        et = (e.event_type or "").upper()
        if et in ("GOL", "GOAL"):
            a["goals"] += 1
        elif et in ("AMARILLA", "YELLOW"):
            a["yellow"] += 1
        elif et in ("AZUL", "BLUE"):
            a["blue"] += 1
        elif et in ("ROJA", "RED"):
            a["red"] += 1
        elif et in ("FALTA", "FOUL", "TECNICA", "ANTIDEPORTIVA"):
            a["fouls"] += 1
        a["matches"].add(str(e.match_id))
    if not agg:
        return []
    pids = list(agg.keys())
    players = {str(p.id): p for p in db.query(Player).filter(Player.id.in_(pids)).all()}
    links = db.query(TeamPlayer).filter(TeamPlayer.player_id.in_(pids)).all()
    player_team = {str(l.player_id): l.team_id for l in links}
    team_ids = list({tid for tid in player_team.values() if tid})
    team_names = (
        {str(t.id): t.name for t in db.query(Team).filter(Team.id.in_(team_ids)).all()}
        if team_ids
        else {}
    )
    out = []
    for pid, a in agg.items():
        p = players.get(pid)
        out.append(
            {
                "player_id": pid,
                "player_name": p.name if p else "—",
                "team_name": team_names.get(str(player_team.get(pid))),
                "goals": a["goals"],
                "yellow": a["yellow"],
                "blue": a["blue"],
                "red": a["red"],
                "fouls": a["fouls"],
                "matches": len(a["matches"]),
            }
        )
    out.sort(key=lambda x: (x["goals"], x["matches"]), reverse=True)
    return out


@router.get("/{tournament_id}/team_stats")
def get_team_stats(
    tournament_id: UUID,
    stage_id: Optional[UUID] = None,
    mode: str = "from",
    db: Session = Depends(get_db),
):
    """Estadísticas por equipo: tabla global del torneo.

    Por defecto combina todas las fases; con `stage_id` se acota desde qué fase
    cuentan los goles a favor/en contra (base de la valla menos vencida).
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    stage_ids = _stage_ids_for_stats(db, tournament, stage_id, mode)
    matches = (
        db.query(Match).filter(Match.stage_id.in_(stage_ids)).all() if stage_ids else []
    )
    if not matches:
        return []
    dicts = _matches_to_dicts(db, matches)
    return calculate_standings(
        dicts, _sport_type_str(tournament), tournament.tiebreaker_rules or None,
    )


@router.get("/{tournament_id}/valla")
def get_valla(
    tournament_id: UUID,
    stage_id: Optional[UUID] = None,
    mode: str = "from",
    db: Session = Depends(get_db),
):
    """Ranking de valla menos vencida.

    Ordena por menos goles en contra; a igualdad, mejor promedio por partido y
    más vallas invictas. `vallas_invictas` cuenta los partidos terminados sin
    recibir gol. Acepta el mismo filtro de fase que el resto de estadísticas.
    """
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    stage_ids = _stage_ids_for_stats(db, tournament, stage_id, mode)
    matches = (
        db.query(Match).filter(Match.stage_id.in_(stage_ids)).all() if stage_ids else []
    )
    finished = [
        m
        for m in matches
        if _status_str(m) == "finished"
        and m.home_team_id
        and m.away_team_id
        and m.home_score is not None
        and m.away_score is not None
    ]
    if not finished:
        return []

    agg: Dict[str, Dict[str, Any]] = {}
    for m in finished:
        for tid, recibidos, anotados in (
            (str(m.home_team_id), m.away_score, m.home_score),
            (str(m.away_team_id), m.home_score, m.away_score),
        ):
            a = agg.setdefault(
                tid,
                {"matches_played": 0, "conceded": 0, "scored": 0, "clean_sheets": 0},
            )
            a["matches_played"] += 1
            a["conceded"] += int(recibidos)
            a["scored"] += int(anotados)
            if int(recibidos) == 0:
                a["clean_sheets"] += 1

    names = _name_map(db, {m.home_team_id for m in finished} | {m.away_team_id for m in finished})
    out = []
    for tid, a in agg.items():
        pj = a["matches_played"] or 1
        out.append(
            {
                "team_id": tid,
                "team_name": names.get(tid, "—"),
                "matches_played": a["matches_played"],
                "conceded": a["conceded"],
                "scored": a["scored"],
                "conceded_avg": round(a["conceded"] / pj, 2),
                "clean_sheets": a["clean_sheets"],
            }
        )
    out.sort(key=lambda r: (r["conceded"], r["conceded_avg"], -r["clean_sheets"]))
    for i, r in enumerate(out, start=1):
        r["position"] = i
    return out


@router.get("/{tournament_id}/fairplay")
def fairplay(
    tournament_id: UUID,
    stage_id: Optional[UUID] = None,
    mode: str = "from",
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """Tabla de juego limpio: ranking por menor penalización (tarjetas/faltas).
    Pesos: amarilla=1, azul=2, roja=3, falta=1. Menos puntos = más limpio.
    Con `stage_id` se acota desde qué fase cuentan las sanciones."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    _asegurar_visible(tournament, "sanciones", current)
    stage_ids = _stage_ids_for_stats(db, tournament, stage_id, mode)
    matches = (
        db.query(Match).filter(Match.stage_id.in_(stage_ids)).all() if stage_ids else []
    )
    if not matches:
        return []
    match_map = {str(m.id): m for m in matches}
    team_ids = set()
    for m in matches:
        if m.home_team_id:
            team_ids.add(m.home_team_id)
        if m.away_team_id:
            team_ids.add(m.away_team_id)
    names = _name_map(db, team_ids)
    agg = {str(tid): {"yellow": 0, "blue": 0, "red": 0, "fouls": 0} for tid in team_ids}
    for e in (
        db.query(MatchStat)
        .filter(MatchStat.match_id.in_(list(match_map.keys())))
        .all()
    ):
        m = match_map.get(str(e.match_id))
        if not m:
            continue
        side = (e.event_data or {}).get("team")
        team_id = (
            str(m.home_team_id)
            if side == "home"
            else (str(m.away_team_id) if side == "away" else None)
        )
        if not team_id or team_id not in agg:
            continue
        et = (e.event_type or "").upper()
        if et in ("AMARILLA", "YELLOW"):
            agg[team_id]["yellow"] += 1
        elif et in ("AZUL", "BLUE"):
            agg[team_id]["blue"] += 1
        elif et in ("ROJA", "RED"):
            agg[team_id]["red"] += 1
        elif et in ("FALTA", "FOUL", "TECNICA", "ANTIDEPORTIVA"):
            agg[team_id]["fouls"] += 1
    played: Dict[str, int] = defaultdict(int)
    for m in matches:
        if _status_str(m) == "finished":
            if m.home_team_id:
                played[str(m.home_team_id)] += 1
            if m.away_team_id:
                played[str(m.away_team_id)] += 1
    out = []
    for tid, a in agg.items():
        penalty = a["yellow"] + a["blue"] * 2 + a["red"] * 3 + a["fouls"]
        out.append(
            {
                "team_id": tid,
                "team_name": names.get(tid),
                "matches_played": played.get(tid, 0),
                "yellow": a["yellow"],
                "blue": a["blue"],
                "red": a["red"],
                "fouls": a["fouls"],
                "penalty": penalty,
            }
        )
    out.sort(key=lambda x: (x["penalty"], x["red"], x["blue"], x["yellow"]))
    for i, r in enumerate(out, start=1):
        r["position"] = i
    return out


@router.get("/{tournament_id}/metrics")
def get_metrics(
    tournament_id: UUID,
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """Métricas agregadas para gráficas: goles por fecha y totales del torneo."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    _asegurar_visible(tournament, "metricas", current)
    stage_ids = [s.id for s in tournament.stages]
    empty = {"goals": 0, "matches": 0, "yellow": 0, "blue": 0, "red": 0}
    if not stage_ids:
        return {"goals_by_date": [], "totals": empty}
    matches = db.query(Match).filter(Match.stage_id.in_(stage_ids)).all()
    match_ids = [m.id for m in matches]
    finished = [m for m in matches if _status_str(m) == "finished"]

    goals_by_date: Dict[str, int] = defaultdict(int)
    total_goals = 0
    for m in finished:
        g = (m.home_score or 0) + (m.away_score or 0)
        total_goals += g
        d = m.scheduled_start.date().isoformat() if m.scheduled_start else "Sin fecha"
        goals_by_date[d] += g

    yellow = blue = red = fouls = 0
    if match_ids:
        for e in db.query(MatchStat).filter(MatchStat.match_id.in_(match_ids)).all():
            et = (e.event_type or "").upper()
            if et in ("AMARILLA", "YELLOW"):
                yellow += 1
            elif et in ("AZUL", "BLUE"):
                blue += 1
            elif et in ("ROJA", "RED"):
                red += 1
            elif et in ("FALTA", "FOUL", "TECNICA", "ANTIDEPORTIVA"):
                fouls += 1

    series = [{"date": d, "goals": g} for d, g in sorted(goals_by_date.items())]

    # Evolución de puntos por equipo (curva): puntos acumulados por jornada.
    strat = StrategyFactory.get_strategy(_sport_type_str(tournament))
    pcfg = tournament.points_config or {}
    ordered = sorted(
        finished, key=lambda m: (m.scheduled_start or datetime(1970, 1, 1), str(m.id))
    )
    cum: Dict[str, int] = defaultdict(int)
    prog: Dict[str, list] = defaultdict(list)
    for m in ordered:
        if not m.home_team_id or not m.away_team_id:
            continue
        hp, ap = strat.calculate_points(m.home_score or 0, m.away_score or 0, pcfg)
        h, a = str(m.home_team_id), str(m.away_team_id)
        cum[h] += hp
        cum[a] += ap
        prog[h].append(cum[h])
        prog[a].append(cum[a])
    pp_names = _name_map(
        db, [m.home_team_id for m in ordered] + [m.away_team_id for m in ordered]
    )
    top = sorted(cum.keys(), key=lambda t: cum[t], reverse=True)[:6]
    points_progression = [
        {"team_name": pp_names.get(t, t[:6]), "points": prog[t]} for t in top
    ]

    return {
        "goals_by_date": series,
        "points_progression": points_progression,
        "totals": {
            "goals": total_goals,
            "matches": len(finished),
            "yellow": yellow,
            "blue": blue,
            "red": red,
            "fouls": fouls,
        },
    }


@router.put("/{tournament_id}/logo", response_model=TournamentResponse)
def update_tournament_logo(
    tournament_id: UUID,
    payload_in: ImageUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    tournament = _torneo_administrable(db, tournament_id, current)
    tournament.logo_url = payload_in.url
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/{tournament_id}/banner", response_model=TournamentResponse)
def update_tournament_banner(
    tournament_id: UUID,
    payload_in: ImageUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    tournament = _torneo_administrable(db, tournament_id, current)
    tournament.banner_url = payload_in.url
    db.commit()
    db.refresh(tournament)
    return tournament


# --- Single tournament (rutas con {tournament_id} de un solo segmento) --- #
@router.get("/{tournament_id}", response_model=TournamentResponse)
def get_tournament(tournament_id: UUID, db: Session = Depends(get_db)):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    return tournament


@router.put("/{tournament_id}", response_model=TournamentResponse)
def update_tournament(
    tournament_id: UUID,
    payload_in: TournamentUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Actualiza la configuración del torneo: puntos, criterios de desempate,
    duración/espera de partidos, categoría y branding."""
    tournament = _torneo_administrable(db, tournament_id, current)
    for key, value in payload_in.model_dump(exclude_unset=True).items():
        setattr(tournament, key, value)
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/{tournament_id}/status", response_model=TournamentResponse)
def update_tournament_status(
    tournament_id: UUID,
    payload_in: StatusUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    tournament = _torneo_administrable(db, tournament_id, current)
    tournament.status = payload_in.status
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/{tournament_id}/rename", response_model=TournamentResponse)
def rename_tournament(
    tournament_id: UUID,
    payload_in: RenameRequest,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    tournament = _torneo_administrable(db, tournament_id, current)
    tournament.name = payload_in.name
    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(
    tournament_id: UUID, db: Session = Depends(get_db), current: User = Depends(require_staff)
):
    tournament = _torneo_administrable(db, tournament_id, current)

    stage_ids = [
        s.id for s in db.query(Stage).filter(Stage.tournament_id == tournament_id).all()
    ]
    match_ids = (
        [m.id for m in db.query(Match).filter(Match.stage_id.in_(stage_ids)).all()]
        if stage_ids
        else []
    )
    team_ids = [
        l.team_id
        for l in db.query(TournamentTeam)
        .filter(TournamentTeam.tournament_id == tournament_id)
        .all()
    ]
    player_ids = (
        [
            tp.player_id
            for tp in db.query(TeamPlayer).filter(TeamPlayer.team_id.in_(team_ids)).all()
        ]
        if team_ids
        else []
    )

    # Borrado explícito hijo->padre (las claves foráneas de Postgres lo exigen).
    if stage_ids:
        db.query(StageSlot).filter(StageSlot.stage_id.in_(stage_ids)).delete(
            synchronize_session=False
        )
    if match_ids:
        db.query(MatchStat).filter(MatchStat.match_id.in_(match_ids)).delete(
            synchronize_session=False
        )
        db.query(Match).filter(Match.id.in_(match_ids)).delete(
            synchronize_session=False
        )
    if stage_ids:
        db.query(Stage).filter(Stage.id.in_(stage_ids)).delete(
            synchronize_session=False
        )
    if team_ids:
        db.query(TeamPlayer).filter(TeamPlayer.team_id.in_(team_ids)).delete(
            synchronize_session=False
        )
    if player_ids:
        db.query(Player).filter(Player.id.in_(player_ids)).delete(
            synchronize_session=False
        )
    db.query(TournamentTeam).filter(
        TournamentTeam.tournament_id == tournament_id
    ).delete(synchronize_session=False)
    if team_ids:
        db.query(Team).filter(Team.id.in_(team_ids)).delete(synchronize_session=False)
    db.query(Sponsor).filter(Sponsor.tournament_id == tournament_id).delete(
        synchronize_session=False
    )
    db.query(TournamentPhoto).filter(
        TournamentPhoto.tournament_id == tournament_id
    ).delete(synchronize_session=False)
    db.query(Tournament).filter(Tournament.id == tournament_id).delete(
        synchronize_session=False
    )
    db.commit()
