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
    # Aplazado: no se juega en su fecha y todavía no tiene una nueva. No suma a
    # la tabla (solo cuentan los terminados) y el validador de calendario lo
    # ignora, que es justo lo que se quiere de un partido suspendido por lluvia.
    POSTPONED = "postponed"


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
    # Sanción de puntos del reglamento (negativa para descontar, positiva para
    # una bonificación). Se suma a los puntos de la tabla sin tocar los
    # partidos: el resultado en cancha fue el que fue.
    points_adjustment = Column(Integer, default=0)
    points_adjustment_reason = Column(String)


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
    # Admin que registró la sede. Todos pueden verla y usar sus canchas para
    # programar; solo el dueño (o el superadmin) puede editarla o borrarla.
    # NULL = sede heredada, editable por cualquier admin.
    owner_id = Column(GUID(), nullable=True)

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
    # W.O.: quién NO se presentó ("home", "away" o "both"). El partido sigue
    # siendo `finished` y con marcador —cuenta para la tabla— pero queda dicho
    # que no se jugó, que es lo que hoy se perdía al escribir 3-0 a mano.
    walkover = Column(String)

    stage = relationship("Stage", back_populates="matches")
    home_team = relationship("Team", foreign_keys=[home_team_id])
    away_team = relationship("Team", foreign_keys=[away_team_id])
    court = relationship("Court", back_populates="matches")
    events = relationship(
        "MatchStat", back_populates="match", cascade="all, delete-orphan"
    )
    lineup = relationship(
        "MatchLineup", back_populates="match", cascade="all, delete-orphan"
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


class MatchLineup(Base):
    """Quiénes jugaron ESE partido (planilla), no la nómina del equipo.

    El acta se firma para dejar constancia de quién estuvo en cancha: sin esta
    tabla el acta imprimía el plantel completo, que no prueba nada. `number` se
    guarda aquí y no se lee de `TeamPlayer` porque el dorsal de ese día es el
    que quedó escrito en la planilla, aunque después cambie.
    """

    __tablename__ = "match_lineups"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    match_id = Column(GUID(), ForeignKey("matches.id", ondelete="CASCADE"))
    team_id = Column(GUID(), ForeignKey("teams.id"))
    player_id = Column(GUID(), ForeignKey("players.id"))
    is_starter = Column(Boolean, default=True)  # titular o suplente
    is_captain = Column(Boolean, default=False)
    number = Column(Integer)

    match = relationship("Match", back_populates="lineup")


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
    # superadmin: ve y administra toda la plataforma, único que gestiona
    # organizadores. admin: organizador, dueño de sus propios torneos.
    # referee: solo dirige los partidos que le asignan.
    # captain: capitán o delegado de un equipo, solo ve lo suyo.
    role = Column(String, default="admin")
    name = Column(String)  # nombre visible (el email sigue siendo el usuario)
    phone = Column(String)
    # Cupo de campeonatos que el organizador puede crear. NULL = sin límite;
    # es lo que separa un plan comercial de otro.
    max_tournaments = Column(Integer, nullable=True)
    # Quién dio de alta la cuenta. Es la frontera entre organizadores: un admin
    # solo ve y gestiona los usuarios que él mismo creó (sus capitanes y
    # árbitros); el superadmin ve todos. NULL = cuenta heredada o sembrada.
    created_by_id = Column(GUID(), nullable=True)
    # True tras un reset de contraseña hecho por soporte: la próxima sesión
    # obliga a cambiarla antes de seguir.
    must_change_password = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime)


class TournamentPhoto(Base):
    __tablename__ = "tournament_photos"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"))
    url = Column(String, nullable=False)
    caption = Column(String)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    tournament = relationship("Tournament", back_populates="photos")


class TeamManager(Base):
    """Capitán o delegado a cargo de un equipo.

    Es la puerta de entrada del rol `captain`: el usuario ve exactamente los
    equipos que tiene aquí y nada más (partidos, tabla y estadísticas de esos
    equipos). Un equipo puede tener varios responsables y una persona puede
    llevar varios equipos.
    """

    __tablename__ = "team_managers"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    team_id = Column(GUID(), ForeignKey("teams.id"))
    user_id = Column(GUID(), ForeignKey("users.id"))
    role = Column(String, default="captain")  # captain | delegate
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    """Aviso dirigido a un usuario (hoy, a los capitanes de los equipos).

    Se genera cuando cambia algo que le afecta: se aplaza o reprograma un
    partido, cambia la cancha o se carga el resultado. Se guarda en la base en
    vez de mandarse por correo para que el panel funcione sin infraestructura
    externa; `read_at` (y no `read`, palabra reservada en SQL) marca la lectura.
    """

    __tablename__ = "notifications"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), index=True)
    team_id = Column(GUID(), ForeignKey("teams.id"))
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"))
    match_id = Column(GUID(), ForeignKey("matches.id"))
    # partido_reprogramado | partido_cancha | partido_programado |
    # partido_resultado | partido_en_vivo | general
    type = Column(String, default="general")
    title = Column(String, nullable=False)
    body = Column(String)
    data = Column(JSON)
    read_at = Column(DateTime)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
