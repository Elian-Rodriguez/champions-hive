import enum
import uuid

from sqlalchemy import (
    JSON,
    Boolean,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
)
from sqlalchemy import Enum as SQLEnum
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import relationship
from sqlalchemy.types import CHAR, TypeDecorator
from datetime import datetime

from app.db.database import Base


class GUID(TypeDecorator):
    """Platform-independent GUID type.

    Uses PostgreSQL's UUID type, otherwise uses CHAR(32), storing as
    stringified hex values.
    """

    impl = CHAR
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID())
        return dialect.type_descriptor(CHAR(32))

    def process_bind_param(self, value, dialect):
        if value is None:
            return value
        if dialect.name == "postgresql":
            return str(value)
        if not isinstance(value, uuid.UUID):
            return "%.32x" % uuid.UUID(value).int
        return "%.32x" % value.int

    def process_result_value(self, value, dialect):
        if value is None:
            return value
        if not isinstance(value, uuid.UUID):
            return uuid.UUID(value)
        return value


# --------------------------------------------------------------------------- #
#  Enumeraciones
# --------------------------------------------------------------------------- #
class SportType(str, enum.Enum):
    FOOTBALL = "football"
    MICRO = "micro"
    BASKETBALL = "basketball"
    BANQUITAS = "banquitas"


class MatchStatus(str, enum.Enum):
    SCHEDULED = "scheduled"
    LIVE = "live"
    FINISHED = "finished"


class StageType(str, enum.Enum):
    GROUP = "group"
    KNOCKOUT = "knockout"
    LEAGUE = "league"
    SWISS = "swiss"


class SlotType(str, enum.Enum):
    TEAM = "team"
    WINNER_OF = "winner_of"
    LOSER_OF = "loser_of"
    POSITION = "position"


# --------------------------------------------------------------------------- #
#  Modelos
# --------------------------------------------------------------------------- #
class Tournament(Base):
    __tablename__ = "tournaments"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    sport_type = Column(SQLEnum(SportType), nullable=False)
    category = Column(String, default="masculino")
    status = Column(String, default="draft")
    # Admin dueño del torneo. NULL = torneo heredado de antes de que existiera
    # la propiedad: lo puede administrar cualquier admin (ver _puede_administrar).
    owner_id = Column(GUID(), nullable=True)
    # Qué secciones se publican en el marcador público. Ausente = todo público.
    # Claves: sanciones, nominas, metricas.
    visibility = Column(JSON)
    logo_url = Column(String)
    banner_url = Column(String)
    points_config = Column(JSON)
    tiebreaker_rules = Column(JSON)
    match_duration = Column(Integer)
    waiting_time = Column(Integer)
    max_matches_per_day = Column(Integer)

    stages = relationship(
        "Stage", back_populates="tournament", cascade="all, delete-orphan"
    )
    sponsors = relationship(
        "Sponsor", back_populates="tournament", cascade="all, delete-orphan"
    )
    photos = relationship(
        "TournamentPhoto",
        back_populates="tournament",
        cascade="all, delete-orphan",
        order_by="TournamentPhoto.order",
    )


class Stage(Base):
    __tablename__ = "stages"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"))
    name = Column(String, nullable=False)
    type = Column(SQLEnum(StageType), nullable=False)
    config = Column(JSON)
    # Orden real de la fase dentro del torneo (grupos → cuartos → semis → final).
    # Se llama order_index y no "order" porque esta última es palabra reservada
    # en SQL y el shim de migración genera el ALTER TABLE sin comillas.
    order_index = Column(Integer, default=0)

    tournament = relationship("Tournament", back_populates="stages")
    matches = relationship(
        "Match", back_populates="stage", cascade="all, delete-orphan"
    )


class Team(Base):
    __tablename__ = "teams"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    logo_url = Column(String)
    photo_url = Column(String)
    color = Column(String)  # color principal del uniforme (hex)
    colors = Column(JSON)  # lista de uniformes (hex): local, visitante, alternativo…


class Player(Base):
    __tablename__ = "players"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    email = Column(String)
    identification_number = Column(String)
    photo_url = Column(String)


class TournamentTeam(Base):
    __tablename__ = "tournament_teams"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"))
    team_id = Column(GUID(), ForeignKey("teams.id"))
    group_name = Column(String)
    status = Column(String, default="approved")


class TeamPlayer(Base):
    __tablename__ = "team_players"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    team_id = Column(GUID(), ForeignKey("teams.id"))
    player_id = Column(GUID(), ForeignKey("players.id"))
    number = Column(Integer)


class Venue(Base):
    __tablename__ = "venues"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    name = Column(String, nullable=False)
    location = Column(String)
    photo_url = Column(String)

    courts = relationship(
        "Court", back_populates="venue", cascade="all, delete-orphan"
    )


class Court(Base):
    __tablename__ = "courts"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    venue_id = Column(GUID(), ForeignKey("venues.id"))
    name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    photo_url = Column(String)

    venue = relationship("Venue", back_populates="courts")
    matches = relationship("Match", back_populates="court")


class Match(Base):
    __tablename__ = "matches"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    stage_id = Column(GUID(), ForeignKey("stages.id"))
    home_team_id = Column(GUID(), ForeignKey("teams.id"))
    away_team_id = Column(GUID(), ForeignKey("teams.id"))
    court_id = Column(GUID(), ForeignKey("courts.id"))
    home_score = Column(Integer, default=0)
    away_score = Column(Integer, default=0)
    status = Column(SQLEnum(MatchStatus), default=MatchStatus.SCHEDULED)
    bracket_round = Column(Integer)
    is_third_place = Column(Boolean, default=False)
    scheduled_start = Column(DateTime)
    scheduled_end = Column(DateTime)
    referee_id = Column(GUID(), nullable=True)  # User (árbitro) asignado al partido

    stage = relationship("Stage", back_populates="matches")
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
    court = relationship("Court", back_populates="matches")
    events = relationship(
        "MatchStat", back_populates="match", cascade="all, delete-orphan"
    )
    slots = relationship(
        "StageSlot",
        back_populates="match",
        foreign_keys="[StageSlot.match_id]",
        cascade="all, delete-orphan",
    )


class MatchStat(Base):
    __tablename__ = "match_stats"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    match_id = Column(GUID(), ForeignKey("matches.id"))
    player_id = Column(GUID(), ForeignKey("players.id"))
    event_type = Column(String)
    event_data = Column(JSON)
    timestamp = Column(DateTime, default=datetime.utcnow)

    match = relationship("Match", back_populates="events")


class StageSlot(Base):
    __tablename__ = "stage_slots"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    stage_id = Column(GUID(), ForeignKey("stages.id"))
    match_id = Column(GUID(), ForeignKey("matches.id", ondelete="CASCADE"))
    is_home = Column(Boolean)
    slot_type = Column(SQLEnum(SlotType), default=SlotType.POSITION)
    resolved = Column(Boolean, default=False)
    source_group = Column(String)
    source_match_id = Column(GUID(), ForeignKey("matches.id"))
    source_position = Column(Integer)
    source_stage_id = Column(GUID(), ForeignKey("stages.id"))

    match = relationship("Match", back_populates="slots", foreign_keys=[match_id])
    source_match = relationship("Match", foreign_keys=[source_match_id])
    source_stage = relationship("Stage", foreign_keys=[source_stage_id])


class Sponsor(Base):
    __tablename__ = "sponsors"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"))
    name = Column(String, nullable=False)
    logo_url = Column(String)
    website_url = Column(String)
    order = Column(Integer, default=0)

    tournament = relationship("Tournament", back_populates="sponsors")


class User(Base):
    __tablename__ = "users"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    # superadmin: ve y administra todo, único que gestiona usuarios.
    # admin: dueño de sus propios torneos. referee: solo dirige partidos.
    role = Column(String, default="admin")


class TournamentPhoto(Base):
    __tablename__ = "tournament_photos"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"))
    url = Column(String, nullable=False)
    caption = Column(String)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    tournament = relationship("Tournament", back_populates="photos")
