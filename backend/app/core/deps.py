"""Dependencias de autenticación y autorización para los endpoints."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.database import get_db
from app.db.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login")
oauth2_optional = OAuth2PasswordBearer(tokenUrl="api/v1/auth/login", auto_error=False)

_credentials_exception = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="No se pudieron validar las credenciales",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    """Resuelve el usuario autenticado a partir del JWT del header Authorization."""
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if email is None:
            raise _credentials_exception
    except JWTError:
        raise _credentials_exception

    user = db.query(User).filter(User.email == email).first()
    if user is None or not user.is_active:
        raise _credentials_exception
    return user


def get_current_user_optional(
    token: str = Depends(oauth2_optional), db: Session = Depends(get_db)
):
    """Devuelve el usuario autenticado si hay token válido, o None (sin error)."""
    if not token:
        return None
    try:
        payload = decode_access_token(token)
        email = payload.get("sub")
        if not email:
            return None
    except JWTError:
        return None
    return db.query(User).filter(User.email == email).first()


def require_roles(*roles: str):
    """Crea una dependencia que exige que el usuario tenga uno de los roles dados."""

    def checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No tienes permisos para realizar esta acción",
            )
        return current_user

    return checker


ROL_SUPERADMIN = "superadmin"
ROL_ADMIN = "admin"
ROL_REFEREE = "referee"
ROL_CAPTAIN = "captain"

ROLES_VALIDOS = (ROL_SUPERADMIN, ROL_ADMIN, ROL_REFEREE, ROL_CAPTAIN)

# Etiquetas para el panel (el rol viaja en inglés, se muestra en español).
ROL_LABELS = {
    ROL_SUPERADMIN: "Superadministrador",
    ROL_ADMIN: "Organizador",
    ROL_REFEREE: "Árbitro",
    ROL_CAPTAIN: "Capitán",
}

# Solo el superadmin gestiona la plataforma entera y ve todos los torneos.
require_superadmin = require_roles(ROL_SUPERADMIN)
require_admin = require_roles(ROL_ADMIN, ROL_SUPERADMIN)
# require_staff = quien puede administrar un torneo. Los árbitros y los
# capitanes NO entran aquí: el árbitro solo carga los partidos que tiene
# asignados (ver require_referee_or_admin en match_routes) y el capitán solo
# consulta lo de su equipo.
require_staff = require_roles(ROL_ADMIN, ROL_SUPERADMIN)
require_captain = require_roles(ROL_CAPTAIN, ROL_ADMIN, ROL_SUPERADMIN)
# Cualquier usuario autenticado (endpoints de lectura y notificaciones).
require_authenticated = require_roles(*ROLES_VALIDOS)


def es_superadmin(user: User) -> bool:
    return user is not None and user.role == ROL_SUPERADMIN


def puede_gestionar_usuario(actor: User, objetivo: User) -> bool:
    """Quién puede tocar la cuenta de quién.

    El superadmin gestiona a todos: es el soporte de la plataforma. Un
    organizador solo gestiona las cuentas que él mismo dio de alta (los
    capitanes de sus equipos y sus árbitros), nunca las de otro organizador ni
    las heredadas (`created_by_id` NULL), que son de la plataforma.
    """
    if actor is None or objetivo is None:
        return False
    if es_superadmin(actor):
        return True
    if actor.role != ROL_ADMIN:
        return False
    if str(objetivo.id) == str(actor.id):
        return True
    return (
        objetivo.created_by_id is not None
        and str(objetivo.created_by_id) == str(actor.id)
        and objetivo.role in (ROL_CAPTAIN, ROL_REFEREE)
    )


def _es_duenio(user: User, recurso) -> bool:
    """Regla común de propiedad: superadmin siempre; admin si es suyo o si el
    recurso es heredado (`owner_id` NULL, de antes de que existiera el dueño)."""
    if user is None or recurso is None:
        return False
    if es_superadmin(user):
        return True
    if user.role != ROL_ADMIN:
        return False
    return recurso.owner_id is None or str(recurso.owner_id) == str(user.id)


def puede_administrar_sede(user: User, venue) -> bool:
    """Editar o borrar una sede. Consultarla y usar sus canchas es libre."""
    return _es_duenio(user, venue)


def puede_administrar(user: User, tournament) -> bool:
    """True si el usuario puede administrar ese torneo.

    El superadmin puede con todos. Un admin solo con los suyos; los torneos
    sin `owner_id` (creados antes de que existiera la propiedad) quedan
    accesibles para cualquier admin para no perderlos.
    """
    if user is None or tournament is None:
        return False
    if es_superadmin(user):
        return True
    if user.role != ROL_ADMIN:
        return False
    return tournament.owner_id is None or str(tournament.owner_id) == str(user.id)
