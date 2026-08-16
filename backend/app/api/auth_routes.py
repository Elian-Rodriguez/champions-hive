from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.deps import (
    ROL_ADMIN,
    ROL_REFEREE,
    ROL_SUPERADMIN,
    es_superadmin,
    get_current_user,
    get_current_user_optional,
    require_staff,
    require_superadmin,
)
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    get_password_hash,
    verify_password,
)
from app.db.database import get_db
from app.db.models import User
from app.schemas import PasswordChange, Token, UserCreate, UserResponse

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    current=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    # Bootstrap: si aún no hay usuarios, el primero se crea como superadmin.
    # Después, solo el superadmin puede crear usuarios.
    primer_usuario = db.query(User).count() == 0
    if not primer_usuario and not es_superadmin(current):
        raise HTTPException(
            status_code=403, detail="Solo el superadministrador puede crear usuarios"
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    if len(user_in.password) < 6:
        raise HTTPException(
            status_code=400, detail="La contraseña debe tener al menos 6 caracteres"
        )
    rol = ROL_SUPERADMIN if primer_usuario else (user_in.role or ROL_ADMIN)
    if rol not in (ROL_SUPERADMIN, ROL_ADMIN, ROL_REFEREE):
        raise HTTPException(status_code=400, detail=f"Rol no válido: {rol}")
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=rol,
        is_active=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token({"sub": user.email, "role": user.role})
    return Token(
        access_token=token, token_type="bearer", role=user.role, user_id=str(user.id)
    )


@router.post("/change_password")
def change_password(
    payload: PasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Permite al usuario autenticado cambiar su propia contraseña."""
    user = db.query(User).filter(User.id == current_user.id).first()
    if not user or not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Contraseña actual incorrecta")
    if len(payload.new_password) < 4:
        raise HTTPException(
            status_code=400, detail="La nueva contraseña es demasiado corta"
        )
    user.hashed_password = get_password_hash(payload.new_password)
    db.commit()
    return {"message": "Contraseña actualizada"}


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), _: User = Depends(require_superadmin)):
    return db.query(User).all()


@router.get("/referees", response_model=List[UserResponse])
def list_referees(db: Session = Depends(get_db), _: User = Depends(require_staff)):
    """Árbitros disponibles para asignar a un partido.

    Existe aparte de /users porque un admin necesita asignar árbitros pero no
    debe poder listar ni gestionar el resto de usuarios.
    """
    return db.query(User).filter(User.role == ROL_REFEREE, User.is_active).all()


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID, db: Session = Depends(get_db), _: User = Depends(require_superadmin)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    db.delete(user)
    db.commit()
