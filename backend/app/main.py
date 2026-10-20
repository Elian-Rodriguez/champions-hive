from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import (
    auth_routes,
    captain_routes,
    highlight_routes,
    match_routes,
    notification_routes,
    team_routes,
    tournament_routes,
    venue_routes,
)
from app.core.config import settings
from app.core.limiter import limiter
from app.core.log import configurar_logging, logger
from app.core.security import get_password_hash
from app.db import models  # noqa: F401  (registra los modelos en Base.metadata)
from app.db.database import Base, SessionLocal, engine, run_sqlite_migrations
from app.db.models import User
from app.services import media
from app.services.contentful import contentful_configurado
from app.services.correo import correo_configurado

# Lo primero: el log, para que lo que pase al arrancar (migraciones, siembra
# del superadministrador) tenga dónde contarse.
configurar_logging(settings.LOG_LEVEL)

# Crea las tablas y aplica las migraciones ligeras de SQLite al arrancar.
Base.metadata.create_all(bind=engine)
run_sqlite_migrations()


def seed_admin():
    """Crea el superadministrador definido en el .env si aún no existe.

    Si la base viene de una versión anterior (donde el rol máximo era `admin`),
    promueve a ese usuario a superadmin: de lo contrario nadie podría gestionar
    usuarios después de actualizar.
    """
    if not settings.ADMIN_EMAIL or not settings.ADMIN_PASSWORD:
        return
    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
        if not user:
            db.add(
                User(
                    email=settings.ADMIN_EMAIL,
                    hashed_password=get_password_hash(settings.ADMIN_PASSWORD),
                    role="superadmin",
                    is_active=True,
                )
            )
            db.commit()
        elif not db.query(User).filter(User.role == "superadmin").first():
            user.role = "superadmin"
            db.commit()
    finally:
        db.close()


seed_admin()

# Una línea al arrancar que responde las tres preguntas de soporte: contra qué
# base corre, si el correo saliente está configurado y en qué huso escribe los
# avisos. Sin esto, un despliegue mal configurado solo se descubre fallando.
logger.info(
    "Champion Hive arriba | base=%s | correo=%s | huso=%+d min | "
    "archivos=%s (hasta %d MB) | contentful=%s",
    settings.DATABASE_URL.split("://", 1)[0],
    "configurado" if correo_configurado() else "sin configurar (reseteo manual)",
    settings.TIMEZONE_OFFSET_MINUTES,
    media.raiz(),
    settings.MAX_VIDEO_MB,
    "encendido" if contentful_configurado() else "apagado (el video se sirve local)",
)

app = FastAPI(
    title="Champion Hive API",
    description="Backend Multi-Deporte para Gestión de Torneos",
    version="1.0.0",
)

# Rate limiting (slowapi)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)

# CORS — frontend de desarrollo (Vite)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_routes.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(team_routes.router, prefix="/api/v1", tags=["Teams & Players"])
app.include_router(
    tournament_routes.router, prefix="/api/v1/tournaments", tags=["Tournaments"]
)
app.include_router(venue_routes.router, prefix="/api/v1/venues", tags=["Venues"])
app.include_router(match_routes.router, prefix="/api/v1/matches", tags=["Matches"])
app.include_router(
    notification_routes.router, prefix="/api/v1/notifications", tags=["Notifications"]
)
app.include_router(captain_routes.router, prefix="/api/v1/captain", tags=["Captain"])
# Mejores jugadas: va en /api/v1 (como teams) porque tiene rutas colgadas de
# /tournaments/{id}/highlights y de /highlights/{id}.
app.include_router(highlight_routes.router, prefix="/api/v1", tags=["Highlights"])

# Los clips de las mejores jugadas, servidos desde disco. Cuelga de /api/v1 a
# propósito: así lo cubre el mismo `location /api/` que ya tiene nginx delante
# (ver deploy/nginx.conf) y el mismo origen del servidor de desarrollo, sin una
# regla de configuración más que alguien tenga que recordar al desplegar.
# StaticFiles responde peticiones Range, que es lo que necesita un <video> para
# que el usuario pueda adelantar el clip.
app.mount("/api/v1/media", StaticFiles(directory=str(media.raiz())), name="media")


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Bienvenido al motor de Champion Hive API",
    }
