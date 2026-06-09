# 🚀 Despliegue de Champion Hive (imagen única)

Esta carpeta contiene todo lo necesario para construir y ejecutar **Champion Hive** como una **sola imagen Docker** que incluye el **frontend** (React/Vite, ya compilado) y el **backend** (FastAPI).

Dentro del contenedor:

- **Nginx** sirve la SPA y hace de *reverse proxy* de `/api`, `/docs`, `/redoc` y `/openapi.json` hacia el backend.
- **Uvicorn** ejecuta la API FastAPI en `127.0.0.1:8000` (no se expone directamente).
- **Supervisor** mantiene ambos procesos vivos.

Solo se publica el **puerto 80**. El frontend llama al backend en el **mismo origen** (`/api/v1`), por lo que no hay problemas de CORS.

```
        ┌──────────────── contenedor (puerto 80) ────────────────┐
 :8080  │  Nginx ──/ , /assets ─────────────►  SPA (React build)  │
 host ──┼─────────►  Nginx ──/api , /docs ──►  Uvicorn :8000 (API) │
        │                         supervisor: nginx + uvicorn      │
        └──────────────────────────────────────────────────────────┘
```

## 📁 Contenido

| Archivo | Descripción |
|---|---|
| `Dockerfile` | Build multi-stage: compila el frontend y lo empaqueta junto al backend. |
| `nginx.conf` | Sirve la SPA + proxy reverso de la API. |
| `supervisord.conf` | Arranca Nginx + Uvicorn dentro del contenedor. |
| `docker-compose.yml` | App + PostgreSQL, con volúmenes y variables de entorno. |
| `.env.example` | Plantilla de variables de entorno. |

## ✅ Requisitos

- **Docker 24+** (y opcionalmente **Docker Compose v2**).
- El **código fuente** debe estar versionado en el repositorio para que el build funcione:
  - `backend/app/` y `backend/requirements.txt`
  - `frontend/` completo (con `package.json` y, si es posible, `package-lock.json`)

## 🔧 Variables de entorno

| Variable | Ámbito | Por defecto | Descripción |
|---|---|---|---|
| `SECRET_KEY` | backend | *(clave de dev insegura)* | Firma de los JWT. **Obligatoria en producción.** |
| `ALGORITHM` | backend | `HS256` | Algoritmo de firma JWT. |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | backend | `60` | Expiración del token. |
| `DATABASE_URL` | backend | `sqlite:////data/champion_hive.db` | Conexión a BD. PostgreSQL: `postgresql+psycopg2://user:pass@db:5432/champion_hive`. |
| `VITE_API_URL` | frontend (build) | `/api/v1` | Base del API horneada en el frontend. |
| `APP_PORT` | compose | `8080` | Puerto del host → 80 del contenedor. |
| `POSTGRES_USER` / `_PASSWORD` / `_DB` | compose (db) | `champion` | Credenciales del PostgreSQL del compose. |

## 🏗️ Construir y ejecutar con Docker

Desde la **raíz del repositorio**:

```bash
# Construir la imagen única (frontend + backend)
docker build -f deploy/Dockerfile -t champion-hive:latest .

# Ejecutar con SQLite en un volumen persistente
docker run -d --name champion-hive \
  -p 8080:80 \
  -e SECRET_KEY="$(openssl rand -hex 32)" \
  -e DATABASE_URL="sqlite:////data/champion_hive.db" \
  -v champion_data:/data \
  champion-hive:latest
```

- App: `http://localhost:8080`
- Documentación de la API: `http://localhost:8080/docs`

## 🐳 Ejecutar con Docker Compose (App + PostgreSQL)

```bash
cd deploy
cp .env.example .env        # edita SECRET_KEY y credenciales
docker compose up -d --build
```

Levanta el contenedor de la app y un **PostgreSQL** con datos persistentes.

```bash
docker compose logs -f app   # ver logs
docker compose down          # detener (añade -v para borrar volúmenes/datos)
```

## 📦 Imagen publicada (GitHub Container Registry)

El workflow [`.github/workflows/docker-image.yml`](../.github/workflows/docker-image.yml) construye y publica la imagen en **GHCR** en cada push a `main` y en cada tag `v*`:

```bash
docker pull ghcr.io/elian-rodriguez/champions-hive:latest

docker run -d -p 8080:80 \
  -e SECRET_KEY="$(openssl rand -hex 32)" \
  ghcr.io/elian-rodriguez/champions-hive:latest
```

- Autentica con el `GITHUB_TOKEN` integrado (no requiere secretos adicionales).
- El build-arg `VITE_API_URL` se toma de la *Variable* de repositorio `VITE_API_URL`
  (**Settings → Secrets and variables → Actions → Variables**), con `/api/v1` por defecto.
- Para `docker pull` sin autenticación, marca el paquete del contenedor como **público** en GHCR.

## 🗄️ Persistencia y base de datos

- **SQLite**: archivo en el volumen `/data` (`DATABASE_URL=sqlite:////data/champion_hive.db`).
- **PostgreSQL**: datos en el volumen `champion_db` del compose.

El backend **crea las tablas automáticamente** al arrancar (`Base.metadata.create_all()` + migraciones ligeras para SQLite); no hay paso de migración manual.

## ⚠️ Notas

- Define **siempre** `SECRET_KEY` en producción; sin ella el backend usa una clave de desarrollo insegura.
- La imagen expone solo el puerto **80**; Uvicorn queda interno tras Nginx.
- Si el workflow de Actions falla por archivos ausentes, verifica que el código fuente del backend y del frontend esté versionado en el repositorio (hoy el repo solo versiona documentación y configuración).
