# syntax=docker/dockerfile:1
# =====================================================================
#  Champion Hive — imagen ÚNICA (frontend + backend)
#  Stage 1: compila el frontend (React/Vite) -> dist/
#  Stage 2: backend FastAPI (uvicorn) + Nginx (sirve SPA y proxy /api)
#           ambos procesos gestionados por supervisor.
# =====================================================================

# ---------- Stage 1: build del frontend ----------
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend

# En la imagen combinada el frontend habla con el backend en el MISMO origen.
ARG VITE_API_URL=/api/v1
ENV VITE_API_URL=${VITE_API_URL}

COPY frontend/package*.json ./
RUN npm ci || npm install
COPY frontend/ ./
RUN npm run build          # genera /app/frontend/dist

# ---------- Stage 2: runtime (backend + nginx) ----------
FROM python:3.10-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

# nginx (sirve la SPA + proxy reverso) y supervisor (corre nginx + uvicorn)
RUN apt-get update \
    && apt-get install -y --no-install-recommends nginx supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Dependencias del backend
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install -r backend/requirements.txt

# Código del backend (paquete app/ -> uvicorn app.main:app)
COPY backend/app ./backend/app

# SPA compilada -> raíz que sirve nginx
COPY --from=frontend-build /app/frontend/dist /usr/share/nginx/html

# Configuración de nginx y supervisor
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/supervisord.conf /etc/supervisor/conf.d/champion-hive.conf
# Elimina el sitio por defecto de Debian (la página "Welcome to nginx!")
RUN rm -f /etc/nginx/sites-enabled/default /etc/nginx/sites-available/default

# Valores por defecto (sobreescribibles con -e / env_file en tiempo de ejecución).
# pydantic-settings los lee del entorno del proceso.
ENV ALGORITHM=HS256 \
    ACCESS_TOKEN_EXPIRE_MINUTES=60 \
    DATABASE_URL=sqlite:////data/champion_hive.db

# Persistencia para SQLite (si no se usa PostgreSQL)
VOLUME ["/data"]

EXPOSE 80

# Comprueba que el backend responde a través de nginx (openapi siempre existe, sin auth)
HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1/openapi.json').status==200 else 1)" || exit 1

CMD ["supervisord", "-c", "/etc/supervisor/conf.d/champion-hive.conf"]
