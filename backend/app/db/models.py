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
    # Tejo: deporte nacional colombiano. No se juega por tiempo sino a 21
    # puntos, y lo que suma no es un gol repetido sino cuatro jugadas que
    # valen distinto (ver PUNTOS_POR_EVENTO en services/strategy.py).
    TEJO = "tejo"


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
    # Reglamento disciplinario: cuántas amarillas suspenden, por cuántas
    # fechas, etc. Ausente o `enabled: false` = apagado, que es como sigue todo
    # torneo que ya existía: la suspensión automática es OPCIONAL, porque hay
    # ligas que la llevan a mano en un comité y no quieren que el sistema
    # marque a nadie (ver services/disciplina.py).
    discipline_config = Column(JSON)
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
    # Tanda de penales. Va en columnas propias y NO en el marcador porque un
    # penal de la tanda no es un gol: no cuenta para la tabla, no va a
    # goleadores y no entra en el global de la llave. Antes la única forma de
    # dejar constancia era escribir el ganador arriba en el marcador —un 2-2
    # definido 4-3 se guardaba como 3-2—, así que el acta imprimía un
    # resultado que no ocurrió (ver services/bracket.py).
    home_penalties = Column(Integer, nullable=True)
    away_penalties = Column(Integer, nullable=True)
    # Llave a ida y vuelta: los dos partidos comparten `tie_id` y se
    # distinguen por `leg` (1 = ida, 2 = vuelta). NULL en los dos = partido
    # único, que es como queda todo lo que ya estaba creado.
    tie_id = Column(GUID(), nullable=True)
    leg = Column(Integer, nullable=True)

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


class AuditLog(Base):
    """Quién cambió qué y cuándo.

    Un marcador es una columna que se sobrescribe: cuando el organizador dice
    «alguien me cambió un resultado» no había nada que responderle. Aquí queda
    la constancia, y con el valor de ANTES, que es lo que permite deshacerlo.

    `user_email` es una copia, no una lectura de `users`: la cuenta se puede
    borrar y el rastro tiene que sobrevivirla —si no, el borrado de la cuenta
    borraría también la prueba de lo que hizo—. Por eso `user_id` tampoco es
    clave foránea.
    """

    __tablename__ = "audit_logs"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    user_id = Column(GUID(), nullable=True)
    user_email = Column(String)  # copia: la cuenta puede desaparecer
    user_role = Column(String)
    action = Column(String, index=True)  # marcador, evento, sancion, cuenta…
    # Contexto para filtrar desde el panel; sin clave foránea por lo mismo que
    # el usuario: el rastro sobrevive al torneo que lo originó.
    tournament_id = Column(GUID(), nullable=True, index=True)
    match_id = Column(GUID(), nullable=True, index=True)
    team_id = Column(GUID(), nullable=True)
    # Frase lista para leer, escrita en el momento del cambio: dentro de un mes
    # nadie va a reconstruirla desde los ids.
    summary = Column(String)
    data = Column(JSON)  # {antes: {...}, despues: {...}}


class PasswordResetToken(Base):
    """Enlace de recuperación de contraseña, de un solo uso.

    Se guarda el HASH del token y no el token, por lo mismo que las
    contraseñas: quien lea la base no puede entrar con lo que hay ahí. Vive
    poco (`RESET_TOKEN_MINUTES`) y se marca usado al canjearlo, así el enlace
    que quedó en el buzón no sirve dos veces.
    """

    __tablename__ = "password_reset_tokens"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(GUID(), ForeignKey("users.id"), index=True)
    token_hash = Column(String, unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)


class TournamentPhoto(Base):
    __tablename__ = "tournament_photos"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"))
    url = Column(String, nullable=False)
    caption = Column(String)
    order = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    tournament = relationship("Tournament", back_populates="photos")


class MatchHighlight(Base):
    """Una mejor jugada: el clip de un gol, un regate, una atajada.

    **El video no vive aquí.** El escudo del equipo sí se guarda en la base
    como data URI (pesa 2-10 KB y así viaja con el backup), pero una jugada de
    veinte segundos pesa megabytes: el archivo va a disco bajo `MEDIA_ROOT` y
    esta fila guarda la ficha —de qué partido es, qué jugada fue, de quién— más
    la ruta. `media_path` existe para poder borrar el archivo cuando se borra
    la jugada; sin ella el disco se llenaría de clips huérfanos.

    `storage` dice de dónde sale el video, y son tres casos reales: `local` es
    el archivo que subió el organizador, `link` es la jugada que la liga ya
    tiene publicada en YouTube o Instagram (pegar el enlace no cuesta nada y
    cubre a quien no quiere pagar almacenamiento) y `contentful` es el espejo
    en el CDN, que es opcional y viene apagado.

    `play_type` está acoplado a la disciplina del torneo: las jugadas de fútbol
    son gol, regate y atajada, y las de tejo son moñona, embocinada y mecha.
    El catálogo y la validación están en `services/strategy.py`
    (`JUGADAS_POR_DEPORTE`), que es donde ya viven los demás hechos por
    disciplina.
    """

    __tablename__ = "match_highlights"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"), index=True)
    # El partido del que es la jugada. Nullable porque hay clips que son del
    # campeonato y no de un partido (el resumen de la jornada, la premiación).
    match_id = Column(GUID(), ForeignKey("matches.id", ondelete="SET NULL"), index=True)
    team_id = Column(GUID(), ForeignKey("teams.id"))
    player_id = Column(GUID(), ForeignKey("players.id"))
    # Tipo de jugada, de las que tiene la disciplina del torneo.
    play_type = Column(String)
    title = Column(String)
    minute = Column(Integer)

    # De dónde sale el video: local | link | contentful.
    storage = Column(String, default="local")
    video_url = Column(String)
    # Ruta relativa dentro de MEDIA_ROOT (solo cuando storage = local). Es lo
    # que permite borrar el archivo al borrar la jugada.
    media_path = Column(String)
    mime_type = Column(String)
    size_bytes = Column(Integer)
    duration_seconds = Column(Integer)
    # Portada: un fotograma reducido, en data URI, como los escudos. Pesa poco
    # y es lo que deja que la grilla del reel cargue sin bajar un solo video.
    poster_url = Column(String)

    # Espejo en Contentful (opcional). Vacío = no se subió, que es el caso por
    # defecto porque la integración viene apagada.
    external_id = Column(String)
    external_url = Column(String)

    # El organizador decide qué sale al marcador público. Arranca publicada:
    # quien la sube es quien la quiere mostrar.
    published = Column(Boolean, default=True)
    # Orden en el reel. Se llama order_index y no "order" por lo mismo que en
    # Stage: "order" es palabra reservada y el shim de migración genera el
    # ALTER TABLE sin comillas.
    order_index = Column(Integer, default=0)
    created_by_id = Column(GUID(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)


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


class PlayerSanction(Base):
    """Sanción a un jugador que decide una persona, no un contador.

    La suspensión por acumulación (`services/disciplina.py`) cubre las tres
    amarillas; lo que no cubría es lo que resuelve el comité el martes: la
    agresión que el árbitro anotó en el informe, el insulto al juez de línea, la
    alineación indebida. Eso son fechas que nadie puede derivar de los eventos,
    así que se guardan —a diferencia de la acumulación, que se recalcula— con su
    motivo, porque una suspensión sin motivo es la que se pierde en el reclamo.

    Las fechas cumplidas sí se calculan: son los partidos que el equipo terminó
    después de `match_id` (el partido donde ocurrió) o, si no se dice, después
    de que se cargó la sanción. `status = annulled` es la que cayó en un
    reclamo: no se borra, porque que existió y se revocó es parte de la historia.
    """

    __tablename__ = "player_sanctions"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"), index=True)
    player_id = Column(GUID(), ForeignKey("players.id"))
    team_id = Column(GUID(), ForeignKey("teams.id"))
    # Fechas de suspensión. 0 es una amonestación que queda en el registro.
    matches = Column(Integer, default=1)
    reason = Column(String, nullable=False)
    # Partido donde ocurrió: desde ahí se cuentan las fechas cumplidas.
    match_id = Column(GUID(), ForeignKey("matches.id", ondelete="SET NULL"))
    # Incidencia del informe arbitral que la originó (id dentro del JSON de
    # MatchReport.incidents), para que el informe diga «sancionado».
    incident_id = Column(String)
    status = Column(String, default="active")  # active | annulled
    created_by_id = Column(GUID(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class MatchReport(Base):
    """Informe arbitral: lo que el árbitro firma además del marcador.

    El acta dice cuánto terminó; el informe dice qué pasó —la agresión del
    minuto 70, el público que invadió, el equipo que llegó tarde— y es la
    prueba con la que el comité sanciona. Las incidencias van como lista JSON
    dentro del informe y no en tabla aparte porque se cargan y se firman juntas,
    igual que la planilla de un equipo, y así viajan enteras por la cola sin
    señal del árbitro.

    `submitted_at` es la firma: desde ahí el árbitro ya no lo toca (lo que
    firmó, firmó) y solo el organizador lo puede reabrir.
    """

    __tablename__ = "match_reports"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    match_id = Column(
        GUID(), ForeignKey("matches.id", ondelete="CASCADE"), unique=True, index=True
    )
    author_id = Column(GUID(), nullable=True)
    author_email = Column(String)  # copia, por lo mismo que en AuditLog
    observations = Column(String)
    # [{id, kind, minute, team: home|away|null, player_id, description}]
    incidents = Column(JSON)
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)


class Claim(Base):
    """Reclamo de un equipo: el resultado, una alineación, una sanción.

    Hasta ahora el reclamo llegaba por WhatsApp y la resolución también, así
    que nadie más en la liga se enteraba de por qué se le dieron los puntos a
    quién. Aquí queda el reclamo, la prueba —el clip de la jugada, que es
    justo lo que se discute— y la resolución, que el organizador puede
    publicar en el marcador.

    La prueba es una jugada ya cargada (`highlight_id`) o un video propio del
    equipo (`evidence_*`), porque quien reclama casi nunca es quien subió el
    clip oficial: es el delegado que lo grabó desde la tribuna.
    """

    __tablename__ = "claims"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    tournament_id = Column(GUID(), ForeignKey("tournaments.id"), index=True)
    match_id = Column(GUID(), ForeignKey("matches.id", ondelete="SET NULL"))
    team_id = Column(GUID(), ForeignKey("teams.id"))  # el que reclama
    # Si se apela una sanción manual: la resolución puede bajarla o anularla.
    sanction_id = Column(
        GUID(), ForeignKey("player_sanctions.id", ondelete="SET NULL")
    )
    # resultado | alineacion_indebida | arbitraje | sancion | otro
    kind = Column(String, default="otro")
    description = Column(String, nullable=False)

    highlight_id = Column(
        GUID(), ForeignKey("match_highlights.id", ondelete="SET NULL")
    )
    evidence_storage = Column(String)  # local | link
    evidence_url = Column(String)
    evidence_path = Column(String)  # para borrar el archivo con el reclamo
    evidence_mime = Column(String)
    evidence_size = Column(Integer)

    # open | in_review | accepted | rejected | withdrawn
    status = Column(String, default="open")
    resolution = Column(String)
    resolved_by_id = Column(GUID(), nullable=True)
    resolved_at = Column(DateTime)
    # La resolución sale al marcador público solo si el organizador lo decide.
    published = Column(Boolean, default=False)
    created_by_id = Column(GUID(), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow)
