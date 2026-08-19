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
    MatchStat,
    MatchStatus,
    SlotType,
    Stage,
    StageSlot,
    Tournament,
    User,
)
from app.schemas import (
    EventCreate,
    EventResponse,
    MatchCreate,
    MatchResponse,
    MatchScheduleUpdate,
    MatchStatusUpdate,
    StandingsRequest,
)
from app.services.notifications import (
    notificar_cambio_de_partido,
    notificar_estado_de_partido,
    snapshot_partido,
)
from app.services.strategy import calculate_standings

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
    match.status = payload_in.status
    if payload_in.home_score is not None:
        match.home_score = payload_in.home_score
    if payload_in.away_score is not None:
        match.away_score = payload_in.away_score

    # Auto-avance del bracket: al finalizar, resuelve los cruces "ganador de…"
    # que dependen de este partido (cascada por ronda).
    if (
        match.status == MatchStatus.FINISHED
        and match.home_score is not None
        and match.away_score is not None
    ):
        home_wins = match.home_score >= match.away_score
        winner = match.home_team_id if home_wins else match.away_team_id
        loser = match.away_team_id if home_wins else match.home_team_id
        slots = (
            db.query(StageSlot)
            .filter(
                StageSlot.source_match_id == match.id,
                StageSlot.slot_type.in_([SlotType.WINNER_OF, SlotType.LOSER_OF]),
                StageSlot.resolved == False,  # noqa: E712
            )
            .all()
        )
        for slot in slots:
            team = winner if slot.slot_type == SlotType.WINNER_OF else loser
            target = db.query(Match).filter(Match.id == slot.match_id).first()
            if target:
                if slot.is_home:
                    target.home_team_id = team
                else:
                    target.away_team_id = team
                slot.resolved = True

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


@router.post("/standings")
def get_standings(req: StandingsRequest, db: Session = Depends(get_db)):
    standings = calculate_standings(
        req.matches, req.sport_type.value, req.tiebreaker_rules
    )
    return {"standings": standings}
