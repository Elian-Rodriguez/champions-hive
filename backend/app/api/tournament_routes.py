import random
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_staff, require_admin
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
    StageResponse,
    StatusUpdate,
    TournamentCreate,
    TournamentResponse,
    TournamentUpdate,
)
from app.services.strategy import (
    TIEBREAKER_LABELS,
    StrategyFactory,
    calculate_standings,
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


def _compute_best_thirds(group_standings: Dict[str, List[Dict]]) -> List[Dict]:
    """
    De cada grupo toma el equipo en posición 3 (índice 2) y los rankea entre sí.
    Criterios: puntos -> diferencia -> goles a favor -> goles en contra (menor).
    """
    thirds = []
    for g, rows in group_standings.items():
        if len(rows) >= 3:
            row = dict(rows[2])
            row["from_group"] = g
            thirds.append(row)

    def rank_key(r):
        return (
            r.get("league_points", 0),
            r.get("diff", 0),
            r.get("points_scored", 0),
            -r.get("points_conceded", 0),
        )

    thirds.sort(key=rank_key, reverse=True)
    return thirds


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
def reset_all(db: Session = Depends(get_db), _=Depends(require_admin)):
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
def dashboard(db: Session = Depends(get_db), _=Depends(require_staff)):
    """Agregados globales para el panel: totales, distribuciones y gráficas."""
    tournaments = db.query(Tournament).all()
    by_status: Dict[str, int] = defaultdict(int)
    by_sport: Dict[str, int] = defaultdict(int)
    for t in tournaments:
        by_status[t.status or "draft"] += 1
        by_sport[_sport_type_str(t)] += 1

    matches = db.query(Match).all()
    finished = [m for m in matches if _status_str(m) == "finished"]
    live = sum(1 for m in matches if _status_str(m) == "live")
    total_goals = sum((m.home_score or 0) + (m.away_score or 0) for m in finished)

    gbd: Dict[str, int] = defaultdict(int)
    for m in finished:
        d = m.scheduled_start.date().isoformat() if m.scheduled_start else "Sin fecha"
        gbd[d] += (m.home_score or 0) + (m.away_score or 0)

    goals_by_player: Dict[str, int] = defaultdict(int)
    d_yellow = d_blue = d_red = d_fouls = 0
    for e in db.query(MatchStat).all():
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
            "teams": db.query(TournamentTeam).count(),
            "matches": len(matches),
            "finished": len(finished),
            "live": live,
            "goals": total_goals,
            "players": db.query(Player).count(),
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
    _=Depends(require_staff),
):
    obj = Tournament(**tournament.model_dump(exclude_unset=True), status="draft")
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("", response_model=List[TournamentResponse])
def get_tournaments(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Tournament).offset(skip).limit(limit).all()


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
    _=Depends(require_staff),
):
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    obj = Stage(tournament_id=tournament_id, **stage.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{tournament_id}/stages", response_model=List[StageResponse])
def get_stages_for_tournament(tournament_id: UUID, db: Session = Depends(get_db)):
    return db.query(Stage).filter(Stage.tournament_id == tournament_id).all()


@router.delete("/stages/{stage_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_stage(stage_id: UUID, db: Session = Depends(get_db), _=Depends(require_staff)):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
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
            "bracket_round": m.bracket_round,
            "scheduled_start": m.scheduled_start,
        }
        for m in matches
    ]


@router.post("/stages/{stage_id}/generate_fixture")
def generate_fixture(
    stage_id: UUID, db: Session = Depends(get_db), _=Depends(require_staff)
):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")

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
    if len(groups) < 2:
        raise HTTPException(
            status_code=400,
            detail="Se necesitan al menos 2 equipos para generar fixture",
        )

    teams_by_group: Dict[str, List[str]] = defaultdict(list)
    for team_id, g in groups.items():
        teams_by_group[g].append(team_id)

    created, ci = 0, 0
    for g, team_ids in teams_by_group.items():
        for i in range(len(team_ids)):
            for j in range(i + 1, len(team_ids)):
                court = courts[ci % len(courts)]
                ci += 1
                db.add(
                    Match(
                        stage_id=stage_id,
                        home_team_id=team_ids[i],
                        away_team_id=team_ids[j],
                        court_id=court.id,
                        status=MatchStatus.SCHEDULED,
                        home_score=0,
                        away_score=0,
                    )
                )
                created += 1
    db.commit()
    return {
        "total_teams": len(groups),
        "message": f"Se han generado {created} partidos exitosamente",
    }


@router.post("/stages/{stage_id}/swiss_round")
def generate_swiss_round(
    stage_id: UUID, db: Session = Depends(get_db), _=Depends(require_staff)
):
    """Genera la siguiente ronda de sistema suizo: ronda 1 al azar; las
    siguientes emparejan por posición actual evitando repetir enfrentamientos."""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
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
    """Retorna los mejores terceros de una fase de grupos (count = cuántos clasifican)."""
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    thirds = _compute_best_thirds(_build_group_standings(db, stage))
    return {"best_thirds": thirds[:count], "all_thirds": thirds}


@router.post("/stages/{stage_id}/advance")
def advance_to_next_phase(
    stage_id: UUID,
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db),
    _=Depends(require_staff),
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
    src = db.query(Stage).filter(Stage.id == stage_id).first()
    if not src:
        raise HTTPException(status_code=404, detail="Fase origen no encontrada")
    dst = db.query(Stage).filter(Stage.id == next_stage_id).first()
    if not dst:
        raise HTTPException(status_code=404, detail="Fase destino no encontrada")

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
    _=Depends(require_staff),
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
    dst = db.query(Stage).filter(Stage.id == stage_id).first()
    if not dst:
        raise HTTPException(status_code=404, detail="Fase destino no encontrada")
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
    stage_id: UUID, db: Session = Depends(get_db), _=Depends(require_staff)
):
    stage = db.query(Stage).filter(Stage.id == stage_id).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
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
    _=Depends(require_staff),
):
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
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
    _=Depends(require_staff),
):
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
    _=Depends(require_staff),
):
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
    _=Depends(require_staff),
):
    if not db.query(Tournament).filter(Tournament.id == tournament_id).first():
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
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
    _=Depends(require_staff),
):
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
    _=Depends(require_staff),
):
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
    _=Depends(require_staff),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
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

    per_day = max_per_day if (max_per_day and max_per_day > 0) else len(matches)
    n_days = -(-len(matches) // per_day)  # techo (ceil)

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
    for i, m in enumerate(matches):
        day, slot = divmod(i, per_day)
        when = day_dates[day] + timedelta(minutes=slot * step)
        m.scheduled_start = when
        m.scheduled_end = when + timedelta(minutes=duration)
        count += 1
    db.commit()
    return {
        "message": f"{count} partido(s) programados en {n_days} día(s)",
        "scheduled": count,
        "days": n_days,
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
def get_player_stats(tournament_id: UUID, db: Session = Depends(get_db)):
    """Estadísticas por jugador: goles y tarjetas agregadas desde los eventos."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    stage_ids = [s.id for s in tournament.stages]
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
def get_team_stats(tournament_id: UUID, db: Session = Depends(get_db)):
    """Estadísticas por equipo: tabla global del torneo (todas las fases combinadas)."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    stage_ids = [s.id for s in tournament.stages]
    matches = (
        db.query(Match).filter(Match.stage_id.in_(stage_ids)).all() if stage_ids else []
    )
    if not matches:
        return []
    dicts = _matches_to_dicts(db, matches)
    return calculate_standings(
        dicts, _sport_type_str(tournament), tournament.tiebreaker_rules or None
    )


@router.get("/{tournament_id}/fairplay")
def fairplay(tournament_id: UUID, db: Session = Depends(get_db)):
    """Tabla de juego limpio: ranking por menor penalización (tarjetas/faltas).
    Pesos: amarilla=1, azul=2, roja=3, falta=1. Menos puntos = más limpio."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    stage_ids = [s.id for s in tournament.stages]
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
def get_metrics(tournament_id: UUID, db: Session = Depends(get_db)):
    """Métricas agregadas para gráficas: goles por fecha y totales del torneo."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
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
    _=Depends(require_staff),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    tournament.logo_url = payload_in.url
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/{tournament_id}/banner", response_model=TournamentResponse)
def update_tournament_banner(
    tournament_id: UUID,
    payload_in: ImageUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
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
    _=Depends(require_staff),
):
    """Actualiza la configuración del torneo: puntos, criterios de desempate,
    duración/espera de partidos, categoría y branding."""
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
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
    _=Depends(require_staff),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    tournament.status = payload_in.status
    db.commit()
    db.refresh(tournament)
    return tournament


@router.put("/{tournament_id}/rename", response_model=TournamentResponse)
def rename_tournament(
    tournament_id: UUID,
    payload_in: RenameRequest,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")
    tournament.name = payload_in.name
    db.commit()
    db.refresh(tournament)
    return tournament


@router.delete("/{tournament_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_tournament(
    tournament_id: UUID, db: Session = Depends(get_db), _=Depends(require_staff)
):
    tournament = db.query(Tournament).filter(Tournament.id == tournament_id).first()
    if not tournament:
        raise HTTPException(status_code=404, detail="Torneo no encontrado")

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
