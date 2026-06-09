from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_staff
from app.db.database import get_db
from app.db.models import Match, MatchStat, MatchStatus, SlotType, StageSlot
from app.schemas import (
    EventCreate,
    EventResponse,
    MatchCreate,
    MatchResponse,
    MatchScheduleUpdate,
    MatchStatusUpdate,
    StandingsRequest,
)
from app.services.strategy import calculate_standings

router = APIRouter()


@router.get("", response_model=List[MatchResponse])
def list_matches(
    stage_id: Optional[UUID] = None,
    status_filter: Optional[MatchStatus] = None,
    db: Session = Depends(get_db),
):
    query = db.query(Match)
    if stage_id:
        query = query.filter(Match.stage_id == stage_id)
    if status_filter:
        query = query.filter(Match.status == status_filter)
    return query.all()


@router.post("/schedule", response_model=MatchResponse, status_code=status.HTTP_201_CREATED)
def schedule_match(
    match_data: MatchCreate, db: Session = Depends(get_db), _=Depends(require_staff)
):
    match = Match(**match_data.model_dump(exclude_unset=True))
    db.add(match)
    db.commit()
    db.refresh(match)
    return match


@router.put("/{match_id}/schedule", response_model=MatchResponse)
def update_match_schedule(
    match_id: UUID,
    payload_in: MatchScheduleUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
    for key, value in payload_in.model_dump(exclude_unset=True).items():
        setattr(match, key, value)
    db.commit()
    db.refresh(match)
    return match


@router.put("/{match_id}/status", response_model=MatchResponse)
def update_match_status(
    match_id: UUID,
    payload_in: MatchStatusUpdate,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    match = db.query(Match).filter(Match.id == match_id).first()
    if not match:
        raise HTTPException(status_code=404, detail="Partido no encontrado")
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
        winner = (
            match.home_team_id
            if match.home_score >= match.away_score
            else match.away_team_id
        )
        slots = (
            db.query(StageSlot)
            .filter(
                StageSlot.source_match_id == match.id,
                StageSlot.slot_type == SlotType.WINNER_OF,
                StageSlot.resolved == False,  # noqa: E712
            )
            .all()
        )
        for slot in slots:
            target = db.query(Match).filter(Match.id == slot.match_id).first()
            if target:
                if slot.is_home:
                    target.home_team_id = winner
                else:
                    target.away_team_id = winner
                slot.resolved = True

    db.commit()
    db.refresh(match)
    return match


@router.get("/{match_id}/events", response_model=List[EventResponse])
def get_match_events(match_id: UUID, db: Session = Depends(get_db)):
    return db.query(MatchStat).filter(MatchStat.match_id == match_id).all()


@router.post("/events", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def record_event(
    event_data: EventCreate, db: Session = Depends(get_db), _=Depends(require_staff)
):
    if not db.query(Match).filter(Match.id == event_data.match_id).first():
        raise HTTPException(status_code=404, detail="Partido no encontrado")
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
