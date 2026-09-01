import re
from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator

from app.db.models import MatchStatus, SportType, StageType

# Quién no se presentó en un W.O.: el local, el visitante o ninguno de los dos.
WALKOVER_VALIDOS = ("home", "away", "both")


# --------------------------------------------------------------------------- #
#  Auth / Users
# --------------------------------------------------------------------------- #
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    role: str = "admin"
    name: Optional[str] = None
    phone: Optional[str] = None
    # Cupo de campeonatos del organizador. None = sin límite. Solo lo fija el
    # superadministrador; es la palanca comercial de los planes.
    max_tournaments: Optional[int] = None


class UserUpdate(BaseModel):
    """Edición de una cuenta desde el panel; solo se aplican los campos enviados."""

    role: Optional[str] = None
    is_active: Optional[bool] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    max_tournaments: Optional[int] = None


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    is_active: bool
    name: Optional[str] = None
    phone: Optional[str] = None
    max_tournaments: Optional[int] = None
    created_by_id: Optional[UUID] = None
    must_change_password: Optional[bool] = False
    created_at: Optional[datetime] = None
    last_login_at: Optional[datetime] = None
    # Campos calculados que rellena el panel (no son columnas del modelo).
    tournaments_count: Optional[int] = None
    teams_count: Optional[int] = None

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: Optional[str] = None
    # El frontend obliga a cambiar la clave cuando soporte la reseteó.
    must_change_password: bool = False


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class PasswordReset(BaseModel):
    """Reseteo hecho por soporte: sin la contraseña actual del usuario.

    Si no se envía `new_password` el backend genera una temporal y la devuelve
    una sola vez para que quien da soporte se la entregue al usuario.
    """

    new_password: Optional[str] = None


class ForgotPassword(BaseModel):
    """Petición del enlace de recuperación. Solo hace falta el correo."""

    email: EmailStr


class PasswordResetWithToken(BaseModel):
    """Canje del enlace recibido por correo por una contraseña nueva."""

    token: str
    new_password: str


# --------------------------------------------------------------------------- #
#  Auditoría
# --------------------------------------------------------------------------- #
class AuditEntry(BaseModel):
    """Una línea del historial: quién, qué, cuándo y qué decía antes."""

    id: str
    created_at: Optional[datetime] = None
    user_id: Optional[str] = None
    user_email: Optional[str] = None
    user_role: Optional[str] = None
    action: str
    action_label: Optional[str] = None
    tournament_id: Optional[str] = None
    match_id: Optional[str] = None
    team_id: Optional[str] = None
    summary: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# --------------------------------------------------------------------------- #
#  Capitanes / responsables de equipo
# --------------------------------------------------------------------------- #
class TeamManagerCreate(BaseModel):
    """Alta o vinculación del capitán de un equipo.

    Si el email no existe se crea la cuenta con rol `captain` (con `password` o
    con una temporal generada); si ya existe, se vincula al equipo.
    """

    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    password: Optional[str] = None
    role: str = "captain"  # captain | delegate


class TeamManagerResponse(BaseModel):
    id: UUID
    team_id: UUID
    user_id: UUID
    email: EmailStr
    name: Optional[str] = None
    phone: Optional[str] = None
    role: str
    is_active: bool = True
    # Solo viene rellena en el alta que generó una contraseña temporal.
    temp_password: Optional[str] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Notificaciones
# --------------------------------------------------------------------------- #
class NotificationResponse(BaseModel):
    id: UUID
    type: str
    title: str
    body: Optional[str] = None
    data: Optional[Dict[str, Any]] = None
    team_id: Optional[UUID] = None
    tournament_id: Optional[UUID] = None
    match_id: Optional[UUID] = None
    read_at: Optional[datetime] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class NotificationBroadcast(BaseModel):
    """Aviso manual del organizador a los capitanes de un torneo."""

    title: str
    body: Optional[str] = None
    team_ids: Optional[List[UUID]] = None  # vacío o ausente = todos los equipos


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


# Un escudo llega de dos maneras: como enlace (https://…) o como la imagen misma
# en un data URI, que es lo que manda el panel cuando el organizador la sube —el
# navegador la reduce antes de enviarla—. Guardarla así hace que el escudo viaje
# con la base (backup, cambio de servidor) en vez de depender de un sitio ajeno
# que mañana responde 404 o niega CORS justo cuando el acta lo va a dibujar.
# Cualquier otro esquema se rechaza: `logo_url` termina en un `<img src>`.
MAX_IMAGEN = 400_000  # caracteres; ~300 KB de imagen ya codificada
_DATA_URI_IMAGEN = re.compile(
    r"^data:image/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=\s]+$"
)


def validar_imagen(valor: Optional[str]) -> Optional[str]:
    """Acepta enlace http(s) o imagen en base64; vacío se guarda como nada."""
    if valor is None:
        return None
    limpio = valor.strip()
    if not limpio:
        return None
    if len(limpio) > MAX_IMAGEN:
        raise ValueError(
            f"La imagen supera el máximo de {MAX_IMAGEN // 1000} KB; usa una más pequeña"
        )
    if limpio.startswith("data:"):
        if not _DATA_URI_IMAGEN.match(limpio):
            raise ValueError("La imagen debe ser png, jpeg, webp o gif en base64")
        return limpio
    if limpio.startswith("http://") or limpio.startswith("https://"):
        return limpio
    raise ValueError("La imagen debe ser un enlace http(s) o una imagen en base64")


class TeamBase(BaseModel):
    """Campos comunes del equipo. Sin validación de imagen a propósito:
    `TeamResponse` hereda de aquí y lo ya guardado se lee tal cual; quien
    valida es la entrada (`TeamCreate` / `TeamUpdate`)."""

    name: str
    logo_url: Optional[str] = None
    photo_url: Optional[str] = None
    color: Optional[str] = None
    colors: Optional[List[str]] = None


class TeamUpdate(BaseModel):
    """Edición de un equipo; solo se aplica lo que venga.

    A diferencia de `TeamBase`, aquí `name` es opcional: crear un equipo exige
    nombre, pero cambiarle el escudo o los uniformes no puede obligar a
    reenviarlo. Con `TeamBase` en el PUT, el selector de colores del panel
    respondía 422 y no guardaba nada.
    """

    name: Optional[str] = None
    logo_url: Optional[str] = None
    photo_url: Optional[str] = None
    color: Optional[str] = None
    colors: Optional[List[str]] = None

    @field_validator("logo_url", "photo_url")
    @classmethod
    def _validar_imagenes(cls, v: Optional[str]) -> Optional[str]:
        return validar_imagen(v)


class TeamCreate(TeamBase):
    group_name: Optional[str] = None

    @field_validator("logo_url", "photo_url")
    @classmethod
    def _validar_imagenes(cls, v: Optional[str]) -> Optional[str]:
        return validar_imagen(v)


class TeamResponse(TeamBase):
    id: UUID
    group_name: Optional[str] = None
    status: Optional[str] = None
    points_adjustment: Optional[int] = None
    points_adjustment_reason: Optional[str] = None

    class Config:
        from_attributes = True


class GroupAssignment(BaseModel):
    group_name: Optional[str] = None


class PointsAdjustment(BaseModel):
    """Sanción de puntos del reglamento: negativa descuenta, positiva bonifica.

    El motivo viaja con el número porque una tabla con un -3 sin explicación es
    justo lo que hace que el organizador pierda la discusión.
    """

    points_adjustment: int = 0
    points_adjustment_reason: Optional[str] = None

    @field_validator("points_adjustment")
    @classmethod
    def _rango(cls, v: int) -> int:
        # Tope defensivo: un descuento es de unos pocos puntos; más que esto es
        # un dedo pegado en el teclado, no un reglamento.
        if v < -100 or v > 100:
            raise ValueError("El ajuste de puntos debe estar entre -100 y 100")
        return v


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
    owner_id: Optional[UUID] = None
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
    order_index: Optional[int] = None


class StageCreate(StageBase):
    pass


class StageUpdate(BaseModel):
    """Edición de una fase ya creada; solo se aplican los campos enviados."""

    name: Optional[str] = None
    type: Optional[StageType] = None
    config: Optional[Dict[str, Any]] = None
    order_index: Optional[int] = None


class StageReorder(BaseModel):
    """Nuevo orden de las fases del torneo, de la primera a la última."""

    stage_ids: List[UUID]


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
    # Reglamento disciplinario. Ausente = apagado, que es como sigue todo
    # torneo que ya existía (ver services/disciplina.py).
    discipline_config: Optional[Dict[str, Any]] = None


class TournamentCreate(TournamentBase):
    pass


class TournamentResponse(TournamentBase):
    id: UUID
    status: str
    owner_id: Optional[UUID] = None
    visibility: Optional[Dict[str, Any]] = None
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
    # Qué se publica en el marcador público: sanciones, nominas, metricas.
    visibility: Optional[Dict[str, Any]] = None
    discipline_config: Optional[Dict[str, Any]] = None

    @field_validator("discipline_config")
    @classmethod
    def _validar_disciplina(cls, v: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        from app.services.disciplina import validar_config

        return validar_config(v)


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
    referee_id: Optional[UUID] = None


class MatchStatusUpdate(BaseModel):
    status: MatchStatus
    home_score: Optional[int] = None
    away_score: Optional[int] = None
    # W.O.: quién no se presentó. "home", "away", "both" o null para quitarlo.
    # Si no se manda marcador, el endpoint pone el que fija el reglamento de la
    # disciplina (3-0 en fútbol, 20-0 en baloncesto).
    walkover: Optional[str] = None

    @field_validator("walkover")
    @classmethod
    def _validar_walkover(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        if v not in WALKOVER_VALIDOS:
            raise ValueError(
                "walkover debe ser 'home', 'away' o 'both' (quién no se presentó)"
            )
        return v


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
    referee_id: Optional[UUID] = None
    walkover: Optional[str] = None

    class Config:
        from_attributes = True


# --------------------------------------------------------------------------- #
#  Planilla del partido (quiénes jugaron)
# --------------------------------------------------------------------------- #
class LineupEntry(BaseModel):
    player_id: UUID
    is_starter: bool = True
    is_captain: bool = False
    number: Optional[int] = None


class LineupUpdate(BaseModel):
    """Planilla de UN equipo para un partido: reemplaza la que hubiera.

    Va por equipo y no por partido entero porque cada delegado entrega la suya
    y el árbitro las carga cuando llegan, que nunca es al mismo tiempo.
    """

    team_id: UUID
    players: List[LineupEntry] = []


class LineupPlayerResponse(BaseModel):
    id: UUID
    match_id: UUID
    team_id: UUID
    player_id: UUID
    player_name: Optional[str] = None
    is_starter: bool = True
    is_captain: bool = False
    number: Optional[int] = None

    class Config:
        from_attributes = True


class EventCreate(BaseModel):
    match_id: UUID
    player_id: Optional[UUID] = None
    event_type: str
    event_data: Optional[Dict[str, Any]] = None


class EventUpdate(BaseModel):
    """Corrección de un evento ya cargado.

    Todo es opcional: se aplica solo lo que venga (`exclude_unset`), así que
    mandar `player_id: null` sí borra el jugador y omitirlo lo deja como está.
    `event_data` se mezcla con lo que ya había, para no perder `team` o `kind`
    cuando el árbitro solo corrige el minuto.
    """

    player_id: Optional[UUID] = None
    event_type: Optional[str] = None
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
