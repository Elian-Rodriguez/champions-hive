from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from app.api import (
    auth_routes,
    match_routes,
    team_routes,
    tournament_routes,
    venue_routes,
)
from app.core.limiter import limiter
from app.db import models  # noqa: F401  (registra los modelos en Base.metadata)
from app.db.database import Base, engine, run_sqlite_migrations

# Crea las tablas y aplica las migraciones ligeras de SQLite al arrancar.
Base.metadata.create_all(bind=engine)
run_sqlite_migrations()

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


@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Bienvenido al motor de Champion Hive API",
    }
