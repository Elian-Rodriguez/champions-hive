# 🏆 Champion Hive

Plataforma de gestión de torneos deportivos **multideporte** (fútbol, microfútbol y baloncesto), con backend en **FastAPI** y frontend **PWA** en **React**. Permite administrar torneos completos —equipos, jugadores, sedes, fixtures, fases de grupos y eliminatorias (brackets)— con registro de resultados en vivo y tablas de posiciones calculadas automáticamente según criterios de desempate configurables.

## ✨ Características

- **Multideporte**: fútbol, microfútbol y baloncesto, cada uno con su propia lógica de puntuación.
- **Formatos de competición**: liga (todos contra todos), fase de grupos, sistema suizo y eliminación directa (knockout).
- **Motor de fixtures y brackets**: generación automática del calendario, avance entre fases, siembra de cuadros eliminatorios y resolución de cruces (*ganador de* / *posición de grupo*).
- **Tabla de posiciones configurable**: criterios de desempate ordenables — puntos, diferencia de goles, goles a favor/en contra, fair play y enfrentamiento directo.
- **Roles**: administrador (gestión completa) y árbitro (registro de eventos en vivo).
- **En vivo**: registro de eventos del partido (goles, tarjetas) y estados (programado → en vivo → finalizado).
- **Gestión integral**: sedes y canchas, patrocinadores, galería de fotos y branding por torneo.
- **PWA** instalable, con service worker y soporte offline, y **exportación a PDF**.

## 🧱 Stack tecnológico

**Backend**
- FastAPI + Uvicorn
- SQLAlchemy (tipo `GUID` propio, compatible con SQLite y PostgreSQL)
- Pydantic / pydantic-settings
- Autenticación JWT (python-jose) + hashing bcrypt (passlib)
- Rate limiting con slowapi
- SQLite por defecto; PostgreSQL en producción (psycopg2)

**Frontend**
- React + Vite + TypeScript
- Redux (react-redux) para el estado global
- Tailwind CSS + Framer Motion
- PWA con vite-plugin-pwa
- Exportación a PDF con jsPDF

## 📦 Estructura

```
champions-hive/
├── backend/
│   └── app/
│       ├── main.py        # App FastAPI y registro de routers
│       ├── schemas.py     # Esquemas Pydantic
│       ├── api/           # Routers: auth, teams, tournaments, venues, matches
│       ├── core/          # Config, seguridad (JWT/bcrypt), dependencias, rate limiter
│       ├── db/            # Modelos SQLAlchemy y configuración de la base de datos
│       └── services/      # strategy.py: puntuación por deporte y tabla de posiciones
└── frontend/              # Aplicación React (PWA)
```

## 🚀 Puesta en marcha

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API en `http://127.0.0.1:8000` · documentación interactiva en `http://127.0.0.1:8000/docs`.

Variables de entorno (`backend/.env`):

```env
SECRET_KEY=<clave-secreta>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
DATABASE_URL=sqlite:///./champion_hive_local.db   # o postgresql://usuario:clave@host/bd
```

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
npm run build    # build de producción
```

URL del API (`frontend/.env`):

```env
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

## 🗃️ Modelo de datos (resumen)

```
Tournament → Stage → Match → MatchStat (eventos: goles, tarjetas)
                          └→ StageSlot (cruces de eliminatoria por resolver)
Tournament → Sponsor, TournamentPhoto
Team ↔ Tournament  (TournamentTeam: grupo + estado)
Team ↔ Player      (TeamPlayer: dorsal)
Venue → Court → Match
User  (autenticación y roles)
```

Las posiciones no se almacenan: se calculan al vuelo en `services/strategy.py` aplicando los criterios de desempate definidos por torneo.

## 👤 Autor

**Elian Eduardo Rodríguez Benítez** — [@Elian-Rodriguez](https://github.com/Elian-Rodriguez)
