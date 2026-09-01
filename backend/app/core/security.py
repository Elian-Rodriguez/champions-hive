import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Optional, Tuple

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> dict:
    """Decodifica y valida un JWT. Lanza JWTError si es inválido o expiró."""
    return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])


def hash_token(token: str) -> str:
    """Huella del token de recuperación, que es lo único que se guarda.

    SHA-256 a secas y no bcrypt como en las contraseñas: el token lo genera el
    servidor con 256 bits de aleatoriedad, así que no hay diccionario que
    probar y el costo de bcrypt solo serviría para hacer lento el canje.
    """
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def generar_token_reseteo() -> Tuple[str, str]:
    """(token para el enlace, huella para la base). El token no se guarda."""
    token = secrets.token_urlsafe(32)
    return token, hash_token(token)
