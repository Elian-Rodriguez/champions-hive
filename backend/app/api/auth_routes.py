import secrets
import string
from datetime import datetime, timedelta
from typing import List, Optional
from uuid import UUID

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    HTTPException,
    Request,
    status,
)
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.log import logger
from app.core.deps import (
    ROL_ADMIN,
    ROL_CAPTAIN,
    ROL_LABELS,
    ROL_REFEREE,
    ROL_SUPERADMIN,
    ROLES_VALIDOS,
    es_superadmin,
    get_current_user,
    get_current_user_optional,
    puede_gestionar_usuario,
    require_staff,
    require_superadmin,
)
from app.core.limiter import limiter
from app.core.security import (
    create_access_token,
    generar_token_reseteo,
    get_password_hash,
    hash_token,
    verify_password,
)
from app.db.database import get_db
from app.db.models import (
    Notification,
    PasswordResetToken,
    TeamManager,
    Tournament,
    User,
)
from app.schemas import (
    AuditEntry,
    ForgotPassword,
    PasswordChange,
    PasswordReset,
    PasswordResetWithToken,
    Token,
    UserCreate,
    UserResponse,
    UserUpdate,
)
from app.services import auditoria, correo

router = APIRouter()

# Longitud mínima de contraseña al crear o resetear una cuenta.
MIN_PASSWORD = 6

# Cómo se nombra cada campo de la cuenta en el historial: "cambió el rol" se
# entiende, "cambió role" no.
CAMPOS_CUENTA = {
    "role": "rol",
    "is_active": "estado",
    "max_tournaments": "cupo de campeonatos",
    "name": "nombre",
    "phone": "teléfono",
}


def generar_password(largo: int = 10) -> str:
    """Contraseña temporal legible para dictarla por teléfono o WhatsApp.

    Sin caracteres ambiguos (0/O, 1/l/I) porque quien la recibe la teclea a
    mano, y con `secrets` en vez de `random` porque es una credencial.
    """
    alfabeto = "".join(
        c for c in string.ascii_letters + string.digits if c not in "0O1lI"
    )
    return "".join(secrets.choice(alfabeto) for _ in range(largo))


def _roles_que_puede_crear(actor: Optional[User]) -> tuple:
    """Qué cuentas puede dar de alta cada quién.

    El superadministrador crea de todo: es quien vende y da soporte. El
    organizador solo crea las cuentas de su propia operación —capitanes de sus
    equipos y árbitros de sus partidos— y nunca otro organizador, para que no
    pueda repartir cupo ni ver la configuración de un colega.
    """
    if es_superadmin(actor):
        return ROLES_VALIDOS
    if actor is not None and actor.role == ROL_ADMIN:
        return (ROL_CAPTAIN, ROL_REFEREE)
    return ()


def _perfil(db: Session, user: User) -> dict:
    """Usuario + su uso real de la plataforma (cupo consumido, equipos)."""
    data = UserResponse.model_validate(user).model_dump()
    data["tournaments_count"] = (
        db.query(Tournament).filter(Tournament.owner_id == user.id).count()
    )
    data["teams_count"] = (
        db.query(TeamManager).filter(TeamManager.user_id == user.id).count()
    )
    return data


def _usuario_gestionable(db: Session, user_id, actor: User) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    if not puede_gestionar_usuario(actor, user):
        raise HTTPException(
            status_code=403, detail="Esta cuenta la gestiona otro administrador"
        )
    return user


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(
    user_in: UserCreate,
    current=Depends(get_current_user_optional),
    db: Session = Depends(get_db),
):
    # Bootstrap: si aún no hay usuarios, el primero se crea como superadmin.
    primer_usuario = db.query(User).count() == 0
    permitidos = ROLES_VALIDOS if primer_usuario else _roles_que_puede_crear(current)
    if not permitidos:
        raise HTTPException(
            status_code=403, detail="No tienes permisos para crear usuarios"
        )
    if db.query(User).filter(User.email == user_in.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    if len(user_in.password) < MIN_PASSWORD:
        raise HTTPException(
            status_code=400,
            detail=f"La contraseña debe tener al menos {MIN_PASSWORD} caracteres",
        )
    rol = ROL_SUPERADMIN if primer_usuario else (user_in.role or ROL_ADMIN)
    if rol not in ROLES_VALIDOS:
        raise HTTPException(status_code=400, detail=f"Rol no válido: {rol}")
    if rol not in permitidos:
        raise HTTPException(
            status_code=403,
            detail=f"Solo el superadministrador puede crear cuentas de "
            f"{ROL_LABELS.get(rol, rol)}",
        )
    # El cupo de campeonatos es una condición comercial: solo el superadmin.
    cupo = user_in.max_tournaments if es_superadmin(current) else None
    user = User(
        email=user_in.email,
        hashed_password=get_password_hash(user_in.password),
        role=rol,
        is_active=True,
        name=user_in.name,
        phone=user_in.phone,
        max_tournaments=cupo if rol == ROL_ADMIN else None,
        created_by_id=current.id if current else None,
        must_change_password=False,
        created_at=datetime.utcnow(),
    )
    db.add(user)
    db.flush()
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_CUENTA,
        resumen=f"Creó la cuenta {user.email} ({ROL_LABELS.get(rol, rol)})",
        datos={"email": user.email, "rol": rol, "cupo": user.max_tournaments},
    )
    db.commit()
    db.refresh(user)
    return _perfil(db, user)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Al log, no a la auditoría: los intentos fallidos son ruido en el
        # historial del campeonato, pero son justo lo que se mira cuando
        # alguien dice que no puede entrar (o cuando prueban claves).
        logger.warning("login fallido para %s", form_data.username)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        logger.warning("login de cuenta desactivada: %s", user.email)
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tu cuenta está desactivada. Contacta al administrador.",
        )
    user.last_login_at = datetime.utcnow()
    db.commit()
    logger.info("login de %s (%s)", user.email, user.role)
    token = create_access_token({"sub": user.email, "role": user.role})
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role,
        user_id=str(user.id),
        must_change_password=bool(user.must_change_password),
    )


@router.get("/me", response_model=UserResponse)
def me(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Perfil del usuario autenticado, con su cupo y su uso."""
    return _perfil(db, current)


@router.get("/roles")
def roles(_: User = Depends(get_current_user)):
    """Roles de la plataforma con su etiqueta, para los selectores del panel."""
    return [{"value": r, "label": ROL_LABELS[r]} for r in ROLES_VALIDOS]


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
    if len(payload.new_password) < MIN_PASSWORD:
        raise HTTPException(
            status_code=400,
            detail=f"La nueva contraseña debe tener al menos {MIN_PASSWORD} caracteres",
        )
    user.hashed_password = get_password_hash(payload.new_password)
    # Si la clave venía de un reseteo de soporte, ya cumplió: se levanta la
    # obligación de cambiarla.
    user.must_change_password = False
    db.commit()
    return {"message": "Contraseña actualizada"}


# --------------------------------------------------------------------------- #
#  Recuperación de contraseña por correo
# --------------------------------------------------------------------------- #
# El reseteo de soporte (más abajo) resuelve el caso puntual, pero no escala:
# cada capitán que pierde la clave es una llamada al organizador. Esto lo
# resuelve solo, y sin SMTP configurado la plataforma sigue funcionando igual
# que antes —el endpoint responde lo mismo y el enlace simplemente no sale—.
MENSAJE_RECUPERACION = (
    "Si esa cuenta existe, te enviamos un correo con el enlace para poner una "
    "contraseña nueva. Revisa también la carpeta de spam."
)


def _usuario_por_correo(db: Session, email: str) -> Optional[User]:
    """Busca por correo exacto y, si no, sin distinguir mayúsculas.

    El login compara exacto; aquí se es más flexible a propósito, porque quien
    perdió la contraseña también se equivoca escribiendo su propio correo.
    """
    limpio = (email or "").strip()
    user = db.query(User).filter(User.email == limpio).first()
    if user:
        return user
    return db.query(User).filter(func.lower(User.email) == limpio.lower()).first()


@router.post("/forgot_password")
@limiter.limit("5/hour")
def forgot_password(
    request: Request,
    payload: ForgotPassword,
    tareas: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """Envía el enlace para poner una contraseña nueva.

    **Responde siempre lo mismo**, exista o no la cuenta: si dijera «ese correo
    no está registrado» sería una forma cómoda de averiguar quién tiene cuenta
    en la plataforma. Por eso también el envío va en segundo plano — así el
    tiempo de respuesta tampoco delata nada.
    """
    user = _usuario_por_correo(db, payload.email)
    if not user or not user.is_active:
        logger.info(
            "recuperacion pedida para %s (sin cuenta activa)", payload.email
        )
        return {"message": MENSAJE_RECUPERACION}

    # Un enlace nuevo invalida los anteriores: si el usuario pidió tres, solo
    # el último sirve, y los otros dejan de estar vivos en su bandeja.
    ahora = datetime.utcnow()
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": ahora}, synchronize_session=False)

    token, huella = generar_token_reseteo()
    db.add(
        PasswordResetToken(
            user_id=user.id,
            token_hash=huella,
            created_at=ahora,
            expires_at=ahora + timedelta(minutes=settings.RESET_TOKEN_MINUTES),
        )
    )
    auditoria.registrar(
        db,
        None,
        auditoria.ACCION_CUENTA,
        resumen=f"Se pidió un enlace de recuperación para {user.email}",
        datos={"email": user.email},
    )
    db.commit()

    enlace = f"{settings.APP_BASE_URL.rstrip('/')}/?reset={token}"
    tareas.add_task(correo.enviar_recuperacion, user.email, user.name, enlace)
    return {"message": MENSAJE_RECUPERACION}


@router.post("/reset_password_confirm")
@limiter.limit("10/hour")
def reset_password_confirm(
    request: Request,
    payload: PasswordResetWithToken,
    db: Session = Depends(get_db),
):
    """Canjea el enlace del correo por una contraseña nueva.

    El token es de un solo uso y vence: el enlace se queda en el buzón para
    siempre, así que lo que no puede quedarse es su poder.
    """
    fila = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == hash_token(payload.token))
        .first()
    )
    ahora = datetime.utcnow()
    if not fila or fila.used_at or fila.expires_at < ahora:
        raise HTTPException(
            status_code=400,
            detail="El enlace ya no sirve (se usó o venció). Pide uno nuevo.",
        )
    if len(payload.new_password) < MIN_PASSWORD:
        raise HTTPException(
            status_code=400,
            detail=f"La contraseña debe tener al menos {MIN_PASSWORD} caracteres",
        )
    user = db.query(User).filter(User.id == fila.user_id).first()
    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="La cuenta ya no está activa")

    user.hashed_password = get_password_hash(payload.new_password)
    # La eligió el dueño de la cuenta: no hay nada que obligarlo a cambiar.
    user.must_change_password = False
    fila.used_at = ahora
    auditoria.registrar(
        db,
        user,
        auditoria.ACCION_CUENTA,
        resumen=f"{user.email} recuperó su contraseña con el enlace del correo",
        datos={"email": user.email},
    )
    db.commit()
    return {
        "message": "Contraseña actualizada. Ya puedes iniciar sesión.",
        "email": user.email,
    }


@router.get("/audit", response_model=List[AuditEntry])
def platform_audit(
    limit: int = 200,
    db: Session = Depends(get_db),
    current: User = Depends(require_superadmin),
):
    """Historial de la plataforma: altas de cuentas, reseteos, recuperaciones.

    Lo que cuelga de un torneo se lee desde el torneo; esto es lo que no tiene
    campeonato detrás y solo mira quien da soporte.
    """
    return auditoria.historial(db, solo_plataforma=True, limite=limit)


@router.get("/users", response_model=List[UserResponse])
def list_users(db: Session = Depends(get_db), current: User = Depends(require_staff)):
    """Cuentas que el solicitante puede gestionar.

    El superadministrador ve toda la plataforma (es el soporte); un organizador
    ve únicamente las cuentas que él dio de alta, nunca las de otro organizador.
    """
    if es_superadmin(current):
        usuarios = db.query(User).all()
    else:
        usuarios = (
            db.query(User)
            .filter(
                (User.created_by_id == current.id) | (User.id == current.id)
            )
            .all()
        )
    return [_perfil(db, u) for u in usuarios]


@router.get("/referees", response_model=List[UserResponse])
def list_referees(db: Session = Depends(get_db), current: User = Depends(require_staff)):
    """Árbitros asignables a un partido.

    Existe aparte de /users porque un admin necesita asignar árbitros pero no
    debe poder listar ni gestionar el resto de usuarios. El organizador ve los
    árbitros que él creó más los de la plataforma (los que dio de alta el
    superadmin o los heredados); nunca los de otro organizador.
    """
    q = db.query(User).filter(User.role == ROL_REFEREE, User.is_active)
    if es_superadmin(current):
        return [_perfil(db, u) for u in q.all()]
    ids_plataforma = {
        str(u.id) for u in db.query(User).filter(User.role == ROL_SUPERADMIN).all()
    }
    return [
        _perfil(db, u)
        for u in q.all()
        if u.created_by_id is None
        or str(u.created_by_id) == str(current.id)
        or str(u.created_by_id) in ids_plataforma
    ]


@router.put("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: UUID,
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Edita rol, estado, datos de contacto y cupo de campeonatos."""
    user = _usuario_gestionable(db, user_id, current)
    cambios = payload.model_dump(exclude_unset=True)

    if "role" in cambios and cambios["role"] != user.role:
        if not es_superadmin(current):
            raise HTTPException(
                status_code=403, detail="Solo el superadministrador cambia el rol"
            )
        if cambios["role"] not in ROLES_VALIDOS:
            raise HTTPException(
                status_code=400, detail=f"Rol no válido: {cambios['role']}"
            )
        if (
            user.role == ROL_SUPERADMIN
            and cambios["role"] != ROL_SUPERADMIN
            and db.query(User).filter(User.role == ROL_SUPERADMIN).count() <= 1
        ):
            raise HTTPException(
                status_code=400,
                detail="Debe quedar al menos un superadministrador en la plataforma",
            )
    if "max_tournaments" in cambios and not es_superadmin(current):
        raise HTTPException(
            status_code=403,
            detail="Solo el superadministrador asigna el cupo de campeonatos",
        )
    if "is_active" in cambios and str(user.id) == str(current.id):
        raise HTTPException(
            status_code=400, detail="No puedes desactivar tu propia cuenta"
        )
    antes = {campo: getattr(user, campo, None) for campo in cambios}
    for campo, valor in cambios.items():
        setattr(user, campo, valor)
    detalle = auditoria.diferencias(antes, cambios)
    if detalle:
        auditoria.registrar(
            db,
            current,
            auditoria.ACCION_CUENTA,
            resumen=(
                f"Editó la cuenta {user.email}: "
                + ", ".join(CAMPOS_CUENTA.get(c, c) for c in detalle)
            ),
            datos=detalle,
        )
    db.commit()
    db.refresh(user)
    return _perfil(db, user)


@router.post("/users/{user_id}/reset_password")
def reset_password(
    user_id: UUID,
    payload: PasswordReset,
    db: Session = Depends(get_db),
    current: User = Depends(require_staff),
):
    """Reseteo de contraseña por soporte, sin conocer la actual.

    Devuelve la contraseña resultante UNA sola vez para poder entregársela al
    usuario, y lo marca para que la cambie en cuanto entre.
    """
    user = _usuario_gestionable(db, user_id, current)
    nueva = payload.new_password or generar_password()
    if len(nueva) < MIN_PASSWORD:
        raise HTTPException(
            status_code=400,
            detail=f"La contraseña debe tener al menos {MIN_PASSWORD} caracteres",
        )
    user.hashed_password = get_password_hash(nueva)
    user.must_change_password = True
    # Queda quién la restableció y a quién, nunca la contraseña.
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_CUENTA,
        resumen=f"Restableció la contraseña de {user.email}",
        datos={"email": user.email},
    )
    db.commit()
    return {
        "message": f"Contraseña restablecida para {user.email}",
        "email": user.email,
        "temp_password": nueva,
        "must_change_password": True,
    }


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    user_id: UUID, db: Session = Depends(get_db), current: User = Depends(require_staff)
):
    user = _usuario_gestionable(db, user_id, current)
    if str(user.id) == str(current.id):
        raise HTTPException(
            status_code=400, detail="No puedes eliminar tu propia cuenta"
        )
    if (
        user.role == ROL_SUPERADMIN
        and db.query(User).filter(User.role == ROL_SUPERADMIN).count() <= 1
    ):
        raise HTTPException(
            status_code=400,
            detail="Debe quedar al menos un superadministrador en la plataforma",
        )
    # Los equipos que dirigía quedan sin capitán, no se borran; su bandeja de
    # avisos sí se va con la cuenta (apunta a ella por clave foránea).
    db.query(TeamManager).filter(TeamManager.user_id == user.id).delete(
        synchronize_session=False
    )
    db.query(Notification).filter(Notification.user_id == user.id).delete(
        synchronize_session=False
    )
    # Los enlaces de recuperación pendientes se van con la cuenta: son claves
    # vivas de algo que ya no existe.
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id
    ).delete(synchronize_session=False)
    # El rastro NO se borra: `user_email` es una copia justamente para que
    # eliminar la cuenta no borre lo que hizo.
    auditoria.registrar(
        db,
        current,
        auditoria.ACCION_CUENTA,
        resumen=(
            f"Eliminó la cuenta {user.email} "
            f"({ROL_LABELS.get(user.role, user.role)})"
        ),
        datos={"email": user.email, "rol": user.role},
    )
    db.delete(user)
    db.commit()
