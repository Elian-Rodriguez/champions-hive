from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.db.models import MatchStatus, SportType, StageType


# --------------------------------------------------------------------------- #
#  Auth / Users
# --------------------------------------------------------------------------- #
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "admin"


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


# --------------------------------------------------------------------------- #
#  Players & Teams
# --------------------------------------------------------------------------- #
class PlayerBase(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    identification_number: Optional[str] = None
    photo_url: Optional[str] = None


class PlayerCreate(PlayerBase):
    number: Optional[int] = None


class PlayerResponse(PlayerBase):
    id: UUID
    number: Optional[int] = None

    class Config:
        from_attributes = True


class TeamBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    photo_url: Optional[str] = None
    color: Optional[str] = None


class TeamCreate(TeamBase):
    group_name: Optional[str] = None


class TeamResponse(TeamBase):
    id: UUID
    group_name: Optional[str] = None
    status: Optional[str] = None

    class Config:
        from_attributes = True


class GroupAssignment(BaseModel):
    group_name: Optional[str] = None


class ShuffleGroupsRequest(BaseModel):
    num_groups: int = 2


# --------------------------------------------------------------------------- #
#  Venues & Courts
# --------------------------------------------------------------------------- #
class CourtBase(BaseModel):
    name: str
    is_active: bool = True
    photo_url: Optional[str] = None


class CourtCreate(CourtBase):
    pass


class CourtResponse(CourtBase):
    id: UUID
    venue_id: UUID

    class Config:
        from_attributes = True


class VenueBase(BaseModel):
    name: str
    location: Optional[str] = None
    photo_url: Optional[str] = None


class VenueCreate(VenueBase):
    pass


class VenueResponse(VenueBase):
    id: UUID
    courts: List[CourtResponse] = []

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Stages
# --------------------------------------------------------------------------- #
class StageBase(BaseModel):
    name: str
    type: StageType
    config: Optional[Dict[str, Any]] = None


class StageCreate(StageBase):
    pass


class StageResponse(StageBase):
    id: UUID
    tournament_id: UUID

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Tournaments
# --------------------------------------------------------------------------- #
class TournamentBase(BaseModel):
    name: str
    sport_type: SportType
    category: str = "masculino"
    points_config: Optional[Dict[str, Any]] = None
    tiebreaker_rules: Optional[List[str]] = None
    match_duration: Optional[int] = None
    waiting_time: Optional[int] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    max_matches_per_day: Optional[int] = None


class TournamentCreate(TournamentBase):
    pass


class TournamentResponse(TournamentBase):
    id: UUID
    status: str
    stages: List[StageResponse] = []

    class Config:
        from_attributes = True


class StatusUpdate(BaseModel):
    status: str


class RenameRequest(BaseModel):
    name: str


class ImageUpdate(BaseModel):
    url: str


class TournamentUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    points_config: Optional[Dict[str, Any]] = None
    tiebreaker_rules: Optional[List[str]] = None
    match_duration: Optional[int] = None
    waiting_time: Optional[int] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    max_matches_per_day: Optional[int] = None
    status: Optional[str] = None


# --------------------------------------------------------------------------- #
#  Sponsors & Photos
# --------------------------------------------------------------------------- #
class SponsorBase(BaseModel):
    name: str
    logo_url: Optional[str] = None
    website_url: Optional[str] = None
    order: int = 0


class SponsorCreate(SponsorBase):
    pass


class SponsorResponse(SponsorBase):
    id: UUID
    tournament_id: UUID

    class Config:
        from_attributes = True


class PhotoBase(BaseModel):
    url: str
    caption: Optional[str] = None
    order: int = 0


class PhotoCreate(PhotoBase):
    pass


class PhotoResponse(PhotoBase):
    id: UUID
    tournament_id: UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Matches & Events
# --------------------------------------------------------------------------- #
class MatchCreate(BaseModel):
    stage_id: UUID
    home_team_id: Optional[UUID] = None
    away_team_id: Optional[UUID] = None
    court_id: Optional[UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    bracket_round: Optional[int] = None


class MatchScheduleUpdate(BaseModel):
    court_id: Optional[UUID] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None


class MatchStatusUpdate(BaseModel):
    status: MatchStatus
    home_score: Optional[int] = None
    away_score: Optional[int] = None


class MatchResponse(BaseModel):
    id: UUID
    stage_id: Optional[UUID] = None
    home_team_id: Optional[UUID] = None
    away_team_id: Optional[UUID] = None
    court_id: Optional[UUID] = None
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    status: MatchStatus
    bracket_round: Optional[int] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None

    class Config:
        from_attributes = True


class EventCreate(BaseModel):
    match_id: UUID
    player_id: Optional[UUID] = None
    event_type: str
    event_data: Optional[Dict[str, Any]] = None


class EventResponse(BaseModel):
    id: UUID
    match_id: UUID
    player_id: Optional[UUID] = None
    event_type: str
    event_data: Optional[Dict[str, Any]] = None
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Standings
# --------------------------------------------------------------------------- #
class StandingsRequest(BaseModel):
    sport_type: SportType
    matches: List[Dict[str, Any]]
    tiebreaker_rules: Optional[List[str]] = None
