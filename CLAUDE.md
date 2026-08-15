# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Champion Hive** is a multi-sport tournament management platform (football, micro/futsal, basketball). A FastAPI backend exposes a tournament/bracket engine; a React PWA frontend provides a public scoreboard, an admin management panel, and a referee live-scoring panel. **Comments, identifiers, and API messages are in Spanish.**

## ⚠️ Repository state — read first

This checkout does **not contain editable source code**. Verify before assuming you can read or edit `.py`/`.tsx` files:

- **No source files exist.** `backend/app/` contains only `__pycache__/*.pyc` (Python 3.10 bytecode) — every `.py` is gone. `frontend/` contains only `node_modules/` and the built `dist/` — no `src/`, `package.json`, `vite.config`, or `tsconfig`.
- **Source was never committed.** Git tracks only `.gitignore` and a one-line `README.md` (run `git ls-files` — 5 files, all `.gitignore`/README). Nothing is recoverable from git history; the remote (`github.com/Elian-Rodriguez/champions-hive`) has the same tracked set.
- **The venv is broken.** `backend/.venv/bin/*` is hardcoded to an old path (`.../crazy_code/champion_hive/...`), so `pip`/`python3` shims fail. Recreate it before running anything (`python3.10 -m venv backend/.venv && backend/.venv/bin/pip install ...`).
- **`.gitignore` has unresolved merge-conflict markers** (`git status` shows `UU .gitignore`). Resolve before committing.
- A sibling clone `../champions-hive` holds a fuller (older) `CLAUDE.md` but **also has no source**. That doc describes the v1 frontend; this repo is **v2** (frontend now bundles Redux — see below), so treat its frontend section as a reference, not ground truth.

**To work on code here you must first restore source** — decompile the backend `.pyc` files (e.g. `decompyle3`/`uncompyle6` against Python 3.10 bytecode), or obtain the originals from a backup/other machine. The architecture below was reconstructed from the bytecode and built bundle and is accurate for *this* checkout.

To inspect bytecode without decompiling, disassemble constant/name tables:

```python
import marshal
with open("backend/app/db/__pycache__/models.cpython-310.pyc","rb") as f:
    f.read(16); co = marshal.load(f)   # co.co_consts / co.co_names per code object
```

## Commands

Source must be restored first; none of these run against the working tree as-is. The backend entrypoint is confirmed from bytecode (`app.main:app`); other commands are from the original project (`requirements.txt`, `Makefile`, and `docker-compose` are **not** present in this checkout).

### Backend (FastAPI, Python 3.10)

```bash
cd backend
# recreate the broken venv first
python3.10 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt          # requirements.txt must be restored
uvicorn app.main:app --reload            # serves on http://127.0.0.1:8000
```

- API docs: `http://127.0.0.1:8000/docs`
- Default DB: SQLite at `backend/champion_hive_local.db` (already populated, ~143 KB). Set `DATABASE_URL` to a `postgresql://...` URL to use Postgres (`psycopg2-binary` is installed).

### Frontend (React + Vite, TypeScript)

```bash
cd frontend
npm install
npm run dev        # Vite dev server on http://localhost:5173 (CORS-allowed by the backend)
npm run build      # tsc + vite build → dist/
```

The frontend calls the API at a hardcoded `http://127.0.0.1:8000/api/v1` (confirmed in the bundle).

### Tests

No test suite exists.

## Architecture

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app (`title="Champion Hive API"`). On startup runs `Base.metadata.create_all()` + `run_sqlite_migrations()`, installs CORS (allows `localhost:5173`/`127.0.0.1:5173`) and the slowapi rate-limiter, then mounts five routers under `/api/v1`.
- **`db/database.py`** — SQLAlchemy engine/`SessionLocal`/`get_db`. SQLite gets `check_same_thread=False`. `run_sqlite_migrations()` is an ad-hoc migration shim: it reads `PRAGMA table_info(...)` and `ALTER TABLE ... ADD COLUMN` for any model column missing from an existing SQLite table. **There is no Alembic migration history** (alembic is installed but unused — no `alembic/` dir or `alembic.ini`).
- **`db/models.py`** — all 13 ORM models + enums. Defines a custom **`GUID`** `TypeDecorator` storing UUIDs as native Postgres `UUID` or `CHAR(32)` on SQLite — this is what makes the same models run on both backends.
- **`schemas.py`** — Pydantic v2 request/response schemas (`from_attributes=True`) for every resource.
- **`core/config.py`** — pydantic-settings `Settings` loaded from `.env`: `SECRET_KEY` (defaults to the insecure `dev-insecure-key-change-in-production`), `ALGORITHM` (`HS256`), `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`.
- **`core/security.py`** — bcrypt hashing via passlib (`get_password_hash`/`verify_password`) and JWT via python-jose (`create_access_token`/`decode_access_token`).
- **`core/deps.py`** — auth dependencies: `get_current_user` (decodes the Bearer JWT, loads the active `User`), and `require_roles(...)` → `require_admin` / `require_staff` (roles seen: `admin`, `referee`). 401 on bad token, 403 on wrong role.
- **`core/limiter.py`** — shared slowapi `Limiter` keyed by remote address, default `600/minute` (login is further limited to `10/minute`).
- **`services/strategy.py`** — the standings engine, Strategy pattern. `StrategyFactory.get_strategy(sport_type)` returns `BasketballStrategy` (win/loss only, no draw) or `FootballStrategy` (win/draw/loss; also used for `micro` and `banquitas` — see `FOOTBALL_LIKE_SPORTS`); unknown sports raise `ValueError`. `SPORT_DEFAULTS` holds the per-discipline defaults (`points_config`, `match_duration`, `waiting_time`) that `create_tournament` fills in for fields the organizer omits. `calculate_standings(matches, sport_type, tiebreaker_rules)` accumulates per-team points/goals, derives fair-play penalties from card events, then sorts by an **ordered, configurable tiebreaker list**. **Standings are computed on the fly and never persisted.**
- **`api/`** — one router per domain: `auth_routes`, `team_routes`, `tournament_routes` (the largest — holds the fixture/bracket engine), `venue_routes`, `match_routes`.

### Data model (`db/models.py`)

```
Tournament ─┬─ Stage ─── Match ─┬─ MatchStat   (per-event: goals, cards…)
            │                   └─ StageSlot    (unresolved bracket positions)
            ├─ Sponsor
            └─ TournamentPhoto
Tournament ─ TournamentTeam ─ Team ─ TeamPlayer ─ Player   (M2M join tables; TournamentTeam holds group_name + approval status, TeamPlayer holds jersey number)
Venue ─ Court ─ Match                                       (a Match is played on a Court)
User                                                        (email, hashed_password, role)
```

Enums: **SportType** `football|micro|basketball|banquitas` · **StageType** `group|knockout|league|swiss` · **MatchStatus** `scheduled|live|finished` · **SlotType** `team|winner_of|position`.

`Tournament` carries the tournament config as JSON columns: `points_config`, `tiebreaker_rules`, plus `match_duration`/`waiting_time` and branding (`logo_url`/`banner_url`). `Stage` has an `order_index` (its real position in the tournament; named that way because `order` is a reserved word and `run_sqlite_migrations` emits unquoted `ALTER TABLE`) and a JSON `config` holding the per-stage rules: `team_ids` (which teams play this stage — empty means all), `double_round` (ida y vuelta), `qualifiers_per_group` and `best_thirds_count` (`"auto"` completes the bracket to a power of 2). `Match` has `home/away_team_id`, `home/away_score`, `court_id`, `bracket_round`, and scheduling timestamps.

### Bracket / fixture engine (`api/tournament_routes.py`)

This router is the non-obvious core. Key endpoints (paths recovered from bytecode; under `/api/v1/tournaments`):

- `POST /stages/{stage_id}/generate_fixture` — round-robin fixture per stage, assigns courts; honours `config.team_ids` and `config.double_round`; refuses to regenerate if the stage already has live/finished matches.
- `PUT  /stages/{stage_id}` — rename a stage, change its type (blocked once it has live/finished matches) or update its `config`. `POST /{tournament_id}/stages/reorder` takes the ordered `stage_ids` and rewrites `order_index`.
- `GET  /stages/{stage_id}/standings_by_group` — per-group standings (`_build_group_standings`).
- `GET  /stages/{stage_id}/qualifiers` — who advances, per `config.qualifiers_per_group` + `best_thirds_count` (`_compute_qualifiers`). Single source of truth for the public "Clasificados" panel.
- `GET  /stages/{stage_id}/best_thirds` — ranks the teams just below the cut across groups (thirds when 2 qualify, seconds when 1): points → goal diff → goals for → goals against.
- `POST /stages/{stage_id}/advance` — reads real standings and creates next-stage matches from a `pairings` payload (`{h_group, h_pos, a_group, a_pos}`, 1-based; use group `"__all__"` for LEAGUE/SWISS).
- `POST /stages/{stage_id}/seed_bracket` — builds a full knockout tree from a `round1` crossing list.
- `GET  /stages/{stage_id}/bracket_tree`, `POST /stages/{stage_id}/resolve_position_slots` — bracket-tree readout and slot resolution.

**`StageSlot`** is how knockout brackets reference not-yet-known teams: a slot is a literal `TEAM`, the `WINNER_OF` a prior match, or a standings `POSITION` in a group. Slots are resolved (`_auto_resolve_winner_slots`) as upstream results land.

### Other routers (under `/api/v1`)

- **auth** (`/auth`): `register`, `login` (OAuth2 password form, `10/minute`), `list_users`, `delete_user`.
- **teams** (`/`): teams within a tournament, `shuffle_groups` (random group assignment), per-team group reassignment, and players within teams (with jersey numbers).
- **venues** (`/venues`): venue + court CRUD.
- **matches** (`/matches`): `list`, `schedule`, `update_match_status` (scheduled→live→finished), live event recording (`record_event`/`get_match_events`), and a stateless `POST /standings` that computes a table from a posted match list + rules.

### Stage-scoped statistics

`GET /{tournament_id}/player_stats`, `/team_stats` and `/fairplay` accept `stage_id` + `mode`: `from` (default — that stage and every later one, by `order_index`) or `only`. That is what backs the public "Cuentan desde" filter for goleadores, valla menos vencida and sanciones; with no `stage_id` they aggregate the whole tournament as before.

### Tiebreaker rules

`Tournament.tiebreaker_rules` is a JSON array applied in order by `services/strategy.py`. Supported keys: `PUNTOS`, `DIF_GOLES`, `GOLES_FAVOR`, `GOLES_CONTRA` (fewer is better), `FAIR_PLAY` (card penalty, fewer is better), `PARTIDO_DIRECTO` (head-to-head mini-table among tied teams). `GET /api/v1/tournaments/tiebreaker_options` returns the labeled set.

### Frontend (`frontend/`, source absent — from the built bundle)

React 18 + Vite + TypeScript, mounted at `#root`, `lang="es"`, titled "Champion Hive". Built as a **PWA** (`vite-plugin-pwa` + Workbox service worker, web manifest, icons). Stack confirmed in `node_modules`/bundle: **react-redux** for state (v2 addition vs. the sibling doc), **Tailwind CSS**, **Framer Motion** (animations), **jsPDF** (PDF export), **DOMPurify** (HTML sanitization). Role-based UI: an admin management view and a referee live-scoring view, plus a public/landing scoreboard.

### Auth flow

`POST /api/v1/auth/login` (form-encoded) returns a JWT. The frontend stores the token + role and routes the user to the admin or referee experience by role; every subsequent request sends `Authorization: Bearer <token>`.
