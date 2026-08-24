from datetime import timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import (
    ROL_REFEREE,
    get_current_user,
    get_current_user_optional,
    puede_administrar,
    require_staff,
)
from app.db.database import get_db
from app.db.models import (
    Match,
    MatchLineup,
    MatchStat,
    MatchStatus,
    Player,
    Stage,
    TeamPlayer,
    Tournament,
    User,
)
from app.schemas import (
    EventCreate,
    EventResponse,
    EventUpdate,
    LineupPlayerResponse,
    LineupUpdate,
    MatchCreate,
    MatchResponse,
    MatchScheduleUpdate,
    MatchStatusUpdate,
    StandingsRequest,
)
from app.services.bracket import propagar_resultado
from app.services.notifications import (
    notificar_cambio_de_partido,
    notificar_estado_de_partido,
    snapshot_partido,
)
from app.services.strategy import calculate_standings, marcador_walkover

router = APIRouter()


def _torneo_del_partido(db: Session, match: Match) -> Optional[Tournament]:
    stage = db.query(Stage).filter(Stage.id == match.stage_id).first()
    if not stage:
        return None
    return db.query(Tournament).filter(Tournament.id == stage.tournament_id).first()


def _asegurar_puede_dirigir(db: Session, user: User, match: Match) -> None:
    """El árbitro solo carga los partidos que tiene asignados; el admin, los de
    los torneos que le pertenecen."""
    if user.role == ROL_REFEREE:
        if not match.referee_id or str(match.referee_id) != str(user.id):
            raise HTTPException(
                status_code=403,
                detail="Solo puedes cargar los partidos que tienes asignados",
            )
        return
    if not puede_administrar(user, _torneo_del_partido(db, match)):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )


def _asegurar_arbitro_valido(db: Session, referee_id) -> None:
    """El árbitro asignado tiene que existir, estar activo y tener rol árbitro.

    `Match.referee_id` no es clave foránea (los partidos se crean antes de saber
    quién dirige), así que la validación va aquí.
    """
    if referee_id is None:
        return
    arbitro = db.query(User).filter(User.id == referee_id).first()
    if not arbitro or not arbitro.is_active:
        raise HTTPException(status_code=404, detail="Árbitro no encontrado")
    if arbitro.role != ROL_REFEREE:
        raise HTTPException(
            status_code=400, detail="El usuario asignado no tiene rol de árbitro"
        )


@router.get("", response_model=List[MatchResponse])
def list_matches(
    stage_id: Optional[UUID] = None,
    status_filter: Optional[MatchStatus] = None,
    mine: bool = False,
    db: Session = Depends(get_db),
    current=Depends(get_current_user_optional),
):
    """Partidos, opcionalmente filtrados por fase o estado.

    Es una consulta pública (la usa el marcador), pero con `mine=true` un
    árbitro autenticado obtiene solo los partidos que tiene asignados, sin
    tener que filtrarlos en el cliente.
    """
    query = db.query(Match)
    if stage_id:
        query = query.filter(Match.stage_id == stage_id)
    if status_filter:
        query = query.filter(Match.status == status_filter)
    if mine:
        if current is None:
            raise HTTPException(
                status_code=401, detail="Necesitas iniciar sesión para ver tus partidos"
            )
        query = query.filter(Match.referee_id == current.id)
    return query.all()


@router.post("/schedule", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
def schedule_match(
    match_data: MatchCreate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    data = match_data.model_dump(exclude_unset=True)
    stage = db.query(Stage).filter(Stage.id == data.get("stage_id")).first()
    if not stage:
        raise HTTPException(status_code=404, detail="Fase no encontrada")
    torneo = db.query(Tournament).filter(Tournament.id == stage.tournament_id).first()
    if not puede_administrar(current, torneo):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )
    _asegurar_arbitro_valido(db, data.get("referee_id"))
    match = Match(**data)
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.put("/{match_id}/schedule", response_model=MatchResponse)
def update_match_schedule(
    match_id: UUID,
    payload_in: MatchScheduleUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    # Reprogramar y asignar árbitro es administrar: solo el dueño del torneo.
    if not puede_administrar(current, _torneo_del_partido(db, match)):
        raise HTTPException(
            status_code=403, detail="Este torneo pertenece a otro administrador"
        )
    cambios = payload_in.model_dump(exclude_unset=True)
    if "referee_id" in cambios:
        _asegurar_arbitro_valido(db, cambios["referee_id"])
    # Foto previa: mover la hora o la cancha de un partido ya programado es lo
    # que dispara el aviso a los capitanes de los dos equipos.
    antes = snapshot_partido(match)
    for key, value in cambios.items():
        setattr(match, key, value)
    # Mover la hora a mano dejaba `scheduled_end` con el valor viejo: se
    # recalcula con la duración del torneo para que el fin siga siendo cierto
    # (lo usan el panel del capitán y el validador de calendario).
    if "scheduled_start" in cambios and "scheduled_end" not in cambios:
        if match.scheduled_start:
            torneo = _torneo_del_partido(db, match)
            duracion = (torneo.match_duration if torneo else None) or 60
            match.scheduled_end = match.scheduled_start + timedelta(minutes=duracion)
        else:
            match.scheduled_end = None
    # Ponerle fecha nueva a un aplazado ES reprogramarlo: vuelve al calendario.
    # Si no, se quedaría aplazado para siempre, fuera de la tabla y sin que el
    # validador mire su horario.
    if match.status == MatchStatus.POSTPONED and cambios.get("scheduled_start"):
        match.status = MatchStatus.SCHEDULED
    db.flush()
    notificar_cambio_de_partido(db, match, antes)
    db.commit()
    db.refresh(match)
    return match


@router.put("/{match_id}/status", response_model=MatchResponse)
def update_match_status(
    match_id: UUID,
    payload_in: MatchStatusUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    _asegurar_puede_dirigir(db, current, match)
    antes = snapshot_partido(match)
    enviado = payload_in.model_dump(exclude_unset=True)
    match.status = payload_in.status
    if "walkover" in enviado:
        # Mandar walkover: null quita la marca y deja el partido como jugado.
        match.walkover = payload_in.walkover
    if payload_in.home_score is not None:
        match.home_score = payload_in.home_score
    if payload_in.away_score is not None:
        match.away_score = payload_in.away_score

    # W.O. sin marcador: lo pone el reglamento de la disciplina (3-0 en fútbol,
    # 20-0 en baloncesto). Si el árbitro manda uno, manda el suyo.
    if (
        match.walkover
        and match.status == MatchStatus.FINISHED
        and payload_in.home_score is None
        and payload_in.away_score is None
    ):
        torneo = _torneo_del_partido(db, match)
        deporte = getattr(torneo, "sport_type", None) if torneo else None
        deporte = getattr(deporte, "value", deporte)
        match.home_score, match.away_score = marcador_walkover(
            str(deporte), match.walkover
        )

    # Auto-avance del cuadro: escribe en los cruces "ganador de…" el equipo que
    # corresponde al resultado ACTUAL. Corregir un marcador o devolver el
    # partido a "en vivo" reescribe la casilla en vez de dejarla congelada.
    propagar_resultado(db, match)

    db.flush()
    notificar_estado_de_partido(db, match, antes)
    db.commit()
    db.refresh(match)
    return match


@router.get("/{match_id}/events", response_model=List[EventResponse])
def get_match_events(match_id: UUID, db: Session = Depends(get_db)):
    return db.query(MatchStat).filter(MatchStat.match_id == match_id).all()


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def record_event(
    event_data: EventCreate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    match = db.query(Match).filter(Match.id == event_data.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    _asegurar_puede_dirigir(db, current, match)
    event = MatchStat(**event_data.model_dump(exclude_unset=True))
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def _evento_dirigible(db: Session, event_id: UUID, user: User) -> MatchStat:
    """El evento existe y quien lo toca puede dirigir ese partido.

    Corregir un gol mal cargado es la misma potestad que cargarlo: el árbitro
    asignado y el dueño del torneo, nadie más.
    """
    event = db.query(MatchStat).filter(MatchStat.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Evento no encontrado")
    match = db.query(Match).filter(Match.id == event.match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    _asegurar_puede_dirigir(db, user, match)
    return event


@router.put("/events/{event_id}", response_model=EventResponse)
def update_event(
    event_id: UUID,
    payload_in: EventUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Corrige un evento ya cargado (jugador, tipo, equipo o minuto)."""
    event = _evento_dirigible(db, event_id, current)
    cambios = payload_in.model_dump(exclude_unset=True)
    if "event_data" in cambios:
        # Mezcla, no reemplazo: corregir el minuto no puede borrar el equipo.
        # Reasignar el dict completo es lo que hace que SQLAlchemy vea el
        # cambio en la columna JSON (mutarlo en sitio pasa desapercibido).
        detalle = dict(event.event_data or {})
        detalle.update(cambios.pop("event_data") or {})
        event.event_data = detalle
    for campo, valor in cambios.items():
        setattr(event, campo, valor)
    db.commit()
    db.refresh(event)
    return event


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: UUID,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Borra un evento cargado por error."""
    event = _evento_dirigible(db, event_id, current)
    db.delete(event)
    db.commit()


# --------------------------------------------------------------------------- #
#  Planilla del partido (quiénes jugaron)
# --------------------------------------------------------------------------- #
def _lineup_payload(db: Session, filas: List[MatchLineup]) -> List[dict]:
    nombres = {}
    ids = [f.player_id for f in filas if f.player_id]
    if ids:
        nombres = {
            str(p.id): p.name for p in db.query(Player).filter(Player.id.in_(ids)).all()
        }
    return [
        {
            "id": f.id,
            "match_id": f.match_id,
            "team_id": f.team_id,
            "player_id": f.player_id,
            "player_name": nombres.get(str(f.player_id)),
            "is_starter": bool(f.is_starter),
            "is_captain": bool(f.is_captain),
            "number": f.number,
        }
        for f in filas
    ]


@router.get("/{match_id}/lineup", response_model=List[LineupPlayerResponse])
def get_match_lineup(match_id: UUID, db: Session = Depends(get_db)):
    """Quiénes jugaron el partido, de los dos equipos.

    Es pública como los eventos: el acta que sale de aquí circula por toda la
    liga y el marcador muestra quién estuvo en cancha.
    """
    filas = db.query(MatchLineup).filter(MatchLineup.match_id == match_id).all()
    return _lineup_payload(db, filas)


@router.put("/{match_id}/lineup", response_model=List[LineupPlayerResponse])
def set_match_lineup(
    match_id: UUID,
    payload_in: LineupUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(get_current_user),
):
    """Reemplaza la planilla de UN equipo para este partido.

    Cargar quién juega es la misma potestad que cargar el resultado: el árbitro
    asignado y el dueño del torneo. Un jugador que no esté en la nómina del
    equipo se rechaza; ahí empieza el control de elegibilidad.
    """
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    _asegurar_puede_dirigir(db, current, match)

    equipo = payload_in.team_id
    if str(equipo) not in (str(match.home_team_id), str(match.away_team_id)):
        raise HTTPException(
            status_code=400, detail="Ese equipo no juega este partido"
        )

    pedidos = [e.player_id for e in payload_in.players]
    if len(set(map(str, pedidos))) != len(pedidos):
        raise HTTPException(
            status_code=400, detail="Hay un jugador repetido en la planilla"
        )

    # La nómina del equipo es la que manda: el dorsal que no venga se toma de
    # ahí, y el jugador que no esté inscrito no puede figurar en el acta.
    inscritos = {
        str(tp.player_id): tp
        for tp in db.query(TeamPlayer).filter(TeamPlayer.team_id == equipo).all()
    }
    ajenos = [str(p) for p in pedidos if str(p) not in inscritos]
    if ajenos:
        nombres = {
            str(p.id): p.name
            for p in db.query(Player).filter(Player.id.in_(ajenos)).all()
        }
        detalle = ", ".join(nombres.get(p, p) for p in ajenos)
        raise HTTPException(
            status_code=400,
            detail=f"No están en la nómina del equipo: {detalle}",
        )

    db.query(MatchLineup).filter(
        MatchLineup.match_id == match_id, MatchLineup.team_id == equipo
    ).delete(synchronize_session=False)
    for entrada in payload_in.players:
        inscrito = inscritos.get(str(entrada.player_id))
        db.add(
            MatchLineup(
                match_id=match_id,
                team_id=equipo,
                player_id=entrada.player_id,
                is_starter=entrada.is_starter,
                is_captain=entrada.is_captain,
                number=entrada.number if entrada.number is not None else (
                    inscrito.number if inscrito else None
                ),
            )
        )
    db.commit()
    filas = (
        db.query(MatchLineup)
        .filter(MatchLineup.match_id == match_id, MatchLineup.team_id == equipo)
        .all()
    )
    return _lineup_payload(db, filas)


@router.post("/standings")
def get_standings(req: StandingsRequest, db: Session = Depends(get_db)):

    standings = calculate_standings(
        req.matches, req.sport_type.value, req.tiebreaker_rules
    )
    return {"standings": standings}
