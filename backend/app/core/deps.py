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


require_admin = require_roles("admin")
require_staff = require_roles("admin", "referee")
