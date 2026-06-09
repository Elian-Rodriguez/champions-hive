from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.deps import require_staff
from app.db.database import get_db
from app.db.models import Court, Venue
from app.schemas import CourtCreate, CourtResponse, VenueBase, VenueCreate, VenueResponse

router = APIRouter()


@router.post("", response_model=VenueResponse, status_code=status.HTTP_201_CREATED)
def create_venue(
    venue: VenueCreate, db: Session = Depends(get_db), _=Depends(require_staff)
):
    obj = Venue(**venue.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("", response_model=List[VenueResponse])
def get_venues(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Venue).offset(skip).limit(limit).all()


@router.get("/{venue_id}", response_model=VenueResponse)
def get_venue(venue_id: UUID, db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    return venue


@router.put("/{venue_id}", response_model=VenueResponse)
def update_venue(
    venue_id: UUID,
    payload_in: VenueBase,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    for key, value in payload_in.model_dump(exclude_unset=True).items():
        setattr(venue, key, value)
    db.commit()
    db.refresh(venue)
    return venue


@router.delete("/{venue_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_venue(venue_id: UUID, db: Session = Depends(get_db), _=Depends(require_staff)):
    venue = db.query(Venue).filter(Venue.id == venue_id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    db.delete(venue)
    db.commit()


@router.post(
    "/{venue_id}/courts",
    response_model=CourtResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_court_for_venue(
    venue_id: UUID,
    court: CourtCreate,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    if not db.query(Venue).filter(Venue.id == venue_id).first():
        raise HTTPException(status_code=404, detail="Sede no encontrada")
    obj = Court(venue_id=venue_id, **court.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/{venue_id}/courts", response_model=List[CourtResponse])
def get_courts_for_venue(venue_id: UUID, db: Session = Depends(get_db)):
    return db.query(Court).filter(Court.venue_id == venue_id).all()


@router.put("/courts/{court_id}", response_model=CourtResponse)
def update_court(
    court_id: UUID,
    payload_in: CourtCreate,
    db: Session = Depends(get_db),
    _=Depends(require_staff),
):
    court = db.query(Court).filter(Court.id == court_id).first()
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    for key, value in payload_in.model_dump(exclude_unset=True).items():
        setattr(court, key, value)
    db.commit()
    db.refresh(court)
    return court


@router.delete("/courts/{court_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_court(court_id: UUID, db: Session = Depends(get_db), _=Depends(require_staff)):
    court = db.query(Court).filter(Court.id == court_id).first()
    if not court:
        raise HTTPException(status_code=404, detail="Cancha no encontrada")
    db.delete(court)
    db.commit()
