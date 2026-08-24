"""Panel del capitán: solo lo que le afecta a su equipo.

El rol `captain` no administra nada. Entra, ve qué equipos lleva, cuándo y
dónde juega, cómo va en la tabla y cómo van sus jugadores. Todo endpoint parte
de `_equipos_del_usuario`, que es la frontera: si un equipo no está ahí, no se
responde con sus datos.
"""
from collections import defaultdict
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.tournament_routes import _build_group_standings, _ordered_stages
from app.core.deps import require_captain
from app.db.database import get_db
from app.db.models import (
    Court,
    Match,
    MatchStat,
    Player,
    Stage,
    StageType,
    Team,
    TeamManager,
    TeamPlayer,
    Tournament,
    TournamentTeam,
    User,
    Venue,
)

router = APIRouter()


def _equipos_del_usuario(db: Session, user: User) -> Dict[str, str]:
    """{team_id: rol} de los equipos que el usuario tiene a cargo."""
    return {
        str(l.team_id): (l.role or "captain")
        for l in db.query(TeamManager).filter(TeamManager.user_id == user.id).all()
    }


def _asegurar_equipo_propio(db: Session, team_id, user: User) -> str:
    equipos = _equipos_del_usuario(db, user)
    if str(team_id) not in equipos:
        raise HTTPException(
            status_code=403, detail="No estás registrado como responsable de este equipo"
        )
    return str(team_id)


def _cancha_info(db: Session, court_ids) -> Dict[str, Dict[str, Any]]:
    ids = [c for c in court_ids if c]
    if not ids:
        return {}
    canchas = db.query(Court).filter(Court.id.in_(ids)).all()
    sedes = {
        str(v.id): v
        for v in db.query(Venue)
        .filter(Venue.id.in_([c.venue_id for c in canchas if c.venue_id]))
        .all()
    }
    out = {}
    for c in canchas:
        sede = sedes.get(str(c.venue_id))
        out[str(c.id)] = {
            "court_id": str(c.id),
            "court_name": c.name,
            "venue_name": sede.name if sede else None,
            "venue_location": sede.location if sede else None,
        }
    return out


def _mis_equipos(db: Session, user: User) -> List[Dict[str, Any]]:
    """Equipos del usuario, uno por inscripción a un torneo."""
    roles = _equipos_del_usuario(db, user)
    if not roles:
        return []
    ids = list(roles.keys())
    equipos = {str(t.id): t for t in db.query(Team).filter(Team.id.in_(ids)).all()}
    links = db.query(TournamentTeam).filter(TournamentTeam.team_id.in_(ids)).all()
    torneos = {
        str(t.id): t
        for t in db.query(Tournament)
        .filter(Tournament.id.in_([l.tournament_id for l in links]))
        .all()
    }
    out = []
    for link in links:
        equipo = equipos.get(str(link.team_id))
        torneo = torneos.get(str(link.tournament_id))
        if not equipo or not torneo:
            continue
        out.append(
            {
                "team_id": str(equipo.id),
                "team_name": equipo.name,
                "logo_url": equipo.logo_url,
                "colors": equipo.colors or ([equipo.color] if equipo.color else []),
                "group_name": link.group_name,
                "manager_role": roles.get(str(equipo.id), "captain"),
                "tournament_id": str(torneo.id),
                "tournament_name": torneo.name,
                "sport_type": (
                    torneo.sport_type.value
                    if hasattr(torneo.sport_type, "value")
                    else torneo.sport_type
                ),
                "tournament_status": torneo.status,
                "tournament_logo_url": torneo.logo_url,
            }
        )
    out.sort(key=lambda x: (x["tournament_name"] or "", x["team_name"] or ""))
    return out


def _partidos_de_equipos(
    db: Session, team_ids: List[str], limite: int = 200
) -> List[Dict[str, Any]]:
    """Partidos de esos equipos, con rival, sede y contexto del torneo."""
    if not team_ids:
        return []
    partidos = (
        db.query(Match)
        .filter(
            (Match.home_team_id.in_(team_ids)) | (Match.away_team_id.in_(team_ids))
        )
        # El orden hace que el tope recorte siempre lo mismo (y el orden final
        # lo fija el sort de abajo, que además manda los sin fecha al fondo).
        .order_by(Match.scheduled_start)
        .limit(limite)
        .all()
    )
    if not partidos:
        return []
    fases = {
        str(s.id): s
        for s in db.query(Stage)
        .filter(Stage.id.in_([m.stage_id for m in partidos if m.stage_id]))
        .all()
    }
    torneos = {
        str(t.id): t
        for t in db.query(Tournament)
        .filter(Tournament.id.in_([s.tournament_id for s in fases.values()]))
        .all()
    }
    equipos_ids = set()
    for m in partidos:
        equipos_ids.update([m.home_team_id, m.away_team_id])
    nombres = {
        str(t.id): t
        for t in db.query(Team).filter(Team.id.in_([e for e in equipos_ids if e])).all()
    }
    canchas = _cancha_info(db, [m.court_id for m in partidos])

    propios = {str(t) for t in team_ids}
    out = []
    for m in partidos:
        fase = fases.get(str(m.stage_id))
        torneo = torneos.get(str(fase.tournament_id)) if fase else None
        es_local = str(m.home_team_id) in propios
        mi_id = m.home_team_id if es_local else m.away_team_id
        rival_id = m.away_team_id if es_local else m.home_team_id
        rival = nombres.get(str(rival_id))
        mio = nombres.get(str(mi_id))
        out.append(
            {
                "match_id": str(m.id),
                "team_id": str(mi_id) if mi_id else None,
                "team_name": mio.name if mio else None,
                "rival_id": str(rival_id) if rival_id else None,
                "rival_name": rival.name if rival else "Por definir",
                "rival_logo_url": rival.logo_url if rival else None,
                "is_home": es_local,
                "home_score": m.home_score,
                "away_score": m.away_score,
                "my_score": m.home_score if es_local else m.away_score,
                "rival_score": m.away_score if es_local else m.home_score,
                "status": m.status.value if hasattr(m.status, "value") else m.status,
                # W.O.: al capitán le importa por qué figura un 3-0 que su
                # equipo no jugó, o por qué el rival no llegó.
                "walkover": m.walkover,
                "scheduled_start": m.scheduled_start,
                "scheduled_end": m.scheduled_end,
                "stage_id": str(fase.id) if fase else None,
                "stage_name": fase.name if fase else None,
                "tournament_id": str(torneo.id) if torneo else None,
                "tournament_name": torneo.name if torneo else None,
                "sport_type": (
                    (
                        torneo.sport_type.value
                        if hasattr(torneo.sport_type, "value")
                        else torneo.sport_type
                    )
                    if torneo
                    else None
                ),
                **(canchas.get(str(m.court_id)) or {"court_name": None, "venue_name": None}),
            }
        )
    # Sin fecha al final; el resto por hora, del más próximo al más lejano.
    out.sort(key=lambda x: (x["scheduled_start"] is None, x["scheduled_start"] or datetime.max))
    return out


@router.get("/teams")
def mis_equipos(db: Session = Depends(get_db), current: User = Depends(require_captain)):
    """Equipos a cargo del usuario, con el torneo y el grupo de cada uno."""
    return _mis_equipos(db, current)


@router.get("/matches")
def mis_partidos(
    team_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current: User = Depends(require_captain),
):
    """Calendario del capitán: cuándo y dónde juega cada equipo suyo."""
    equipos = list(_equipos_del_usuario(db, current).keys())
    if team_id:
        _asegurar_equipo_propio(db, team_id, current)
        equipos = [str(team_id)]
    partidos = _partidos_de_equipos(db, equipos)
    ahora = datetime.utcnow()
    proximos = [
        p
        for p in partidos
        if p["status"] != "finished"
        and (p["scheduled_start"] is None or p["scheduled_start"] >= ahora)
    ]
    jugados = [p for p in partidos if p["status"] == "finished"]
    jugados.sort(key=lambda x: (x["scheduled_start"] or datetime.min), reverse=True)
    return {
        "upcoming": proximos,
        "played": jugados,
        "live": [p for p in partidos if p["status"] == "live"],
    }


@router.get("/teams/{team_id}/summary")
def resumen_de_equipo(
    team_id: UUID,
    tournament_id: Optional[UUID] = None,
    db: Session = Depends(get_db),
    current: User = Depends(require_captain),
):
    """Cómo va el equipo: récord, posición por fase, goleadores y disciplina."""
    # El cálculo de la tabla vive en tournament_routes y se reutiliza tal cual,
    # para que la posición que ve el capitán sea la misma del marcador público.
    tid = _asegurar_equipo_propio(db, team_id, current)
    equipo = db.query(Team).filter(Team.id == team_id).first()
    if not equipo:
        raise HTTPException(status_code=404, detail="Equipo no encontrado")

    inscripciones = (
        db.query(TournamentTeam).filter(TournamentTeam.team_id == team_id).all()
    )
    if tournament_id:
        inscripciones = [
            l for l in inscripciones if str(l.tournament_id) == str(tournament_id)
        ]
    if not inscripciones:
        raise HTTPException(
            status_code=404, detail="El equipo no está inscrito en ese torneo"
        )
    link = inscripciones[0]
    torneo = db.query(Tournament).filter(Tournament.id == link.tournament_id).first()

    partidos = _partidos_de_equipos(db, [tid])
    if torneo:
        partidos = [p for p in partidos if p["tournament_id"] == str(torneo.id)]
    jugados = [p for p in partidos if p["status"] == "finished"]
    ganados = sum(1 for p in jugados if (p["my_score"] or 0) > (p["rival_score"] or 0))
    empatados = sum(1 for p in jugados if (p["my_score"] or 0) == (p["rival_score"] or 0))
    perdidos = len(jugados) - ganados - empatados
    gf = sum(p["my_score"] or 0 for p in jugados)
    gc = sum(p["rival_score"] or 0 for p in jugados)

    # Posición del equipo en cada fase con tabla (grupos, liga o suizo).
    posiciones = []
    if torneo:
        for fase in _ordered_stages(db, torneo.id):
            if fase.type == StageType.KNOCKOUT:
                continue
            for grupo, tabla in _build_group_standings(db, fase).items():
                for i, fila in enumerate(tabla):
                    if str(fila.get("team_id")) == tid:
                        posiciones.append(
                            {
                                "stage_id": str(fase.id),
                                "stage_name": fase.name,
                                "group_name": grupo,
                                "position": i + 1,
                                "of": len(tabla),
                                **fila,
                            }
                        )

    # Goleadores y disciplina del equipo, a partir de los eventos cargados.
    plantilla = db.query(TeamPlayer).filter(TeamPlayer.team_id == team_id).all()
    jugadores = {
        str(p.id): p
        for p in db.query(Player)
        .filter(Player.id.in_([l.player_id for l in plantilla]))
        .all()
    }
    dorsales = {str(l.player_id): l.number for l in plantilla}
    match_ids = [p["match_id"] for p in partidos]
    eventos = (
        db.query(MatchStat).filter(MatchStat.match_id.in_(match_ids)).all()
        if match_ids
        else []
    )
    por_jugador: Dict[str, Dict[str, int]] = defaultdict(
        lambda: {"goals": 0, "yellow": 0, "blue": 0, "red": 0, "fouls": 0}
    )
    for e in eventos:
        pid = str(e.player_id) if e.player_id else None
        if not pid or pid not in jugadores:
            continue
        et = (e.event_type or "").upper()
        if et in ("GOL", "GOAL"):
            por_jugador[pid]["goals"] += 1
        elif et in ("AMARILLA", "YELLOW"):
            por_jugador[pid]["yellow"] += 1
        elif et in ("AZUL", "BLUE"):
            por_jugador[pid]["blue"] += 1
        elif et in ("ROJA", "RED"):
            por_jugador[pid]["red"] += 1
        elif et in ("FALTA", "FOUL", "TECNICA", "ANTIDEPORTIVA"):
            # Baloncesto y banquitas muestran faltas en vez de (o además de)
            # tarjetas; ver discColumns en frontend/src/sports.ts.
            por_jugador[pid]["fouls"] += 1
    plantel = [
        {
            "player_id": pid,
            "player_name": jugadores[pid].name,
            "number": dorsales.get(pid),
            **datos,
        }
        for pid, datos in por_jugador.items()
    ]
    plantel.sort(key=lambda x: (-x["goals"], x["player_name"] or ""))

    return {
        "team": {
            "id": tid,
            "name": equipo.name,
            "logo_url": equipo.logo_url,
            "group_name": link.group_name,
            "players": len(plantilla),
        },
        "tournament": (
            {
                "id": str(torneo.id),
                "name": torneo.name,
                "status": torneo.status,
                "sport_type": (
                    torneo.sport_type.value
                    if hasattr(torneo.sport_type, "value")
                    else torneo.sport_type
                ),
                "logo_url": torneo.logo_url,
            }
            if torneo
            else None
        ),
        "record": {
            "played": len(jugados),
            "wins": ganados,
            "draws": empatados,
            "losses": perdidos,
            "goals_for": gf,
            "goals_against": gc,
            "goal_diff": gf - gc,
            "form": [
                (
                    "G"
                    if (p["my_score"] or 0) > (p["rival_score"] or 0)
                    else "E" if (p["my_score"] or 0) == (p["rival_score"] or 0) else "P"
                )
                for p in sorted(
                    jugados, key=lambda x: (x["scheduled_start"] or datetime.min)
                )[-5:]
            ],
        },
        "standings": posiciones,
        "squad_stats": plantel,
        "next_matches": [p for p in partidos if p["status"] != "finished"][:5],
        "last_matches": sorted(
            jugados, key=lambda x: (x["scheduled_start"] or datetime.min), reverse=True
        )[:5],
    }
