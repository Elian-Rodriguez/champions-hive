# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Champion Hive** is a multi-sport tournament management platform (football, micro/futsal, basketball, banquitas). A FastAPI backend exposes a tournament/bracket engine; a React PWA frontend provides a public scoreboard, an admin management panel, a referee live-scoring panel and a team-captain panel. Four roles: **superadmin** (runs the platform, sells and supports), **admin** (organizer, owns their own tournaments), **referee** (loads results for assigned matches) and **captain** (sees only their own team). **Comments, identifiers, and API messages are in Spanish** — keep writing them in Spanish.

## Commands

### Backend (FastAPI, Python 3.10)

```bash
cd backend
source .venv/bin/activate                # o usa .venv/bin/python directamente
pip install -r requirements.txt
uvicorn app.main:app --reload            # http://127.0.0.1:8000
```

- API docs: `http://127.0.0.1:8000/docs`
- Default DB: SQLite at `backend/champion_hive_local.db`. Set `DATABASE_URL` to a `postgresql://...` URL to use Postgres (`psycopg2-binary` is installed).
- On startup the app runs `create_all()` + `run_sqlite_migrations()` and seeds the `.env` admin as **superadmin** (promoting it if the DB predates the role).

### Frontend (React + Vite, TypeScript)

```bash
cd frontend
npm install
npm run dev        # Vite dev server on http://localhost:5173 (CORS-allowed by the backend)
npm run build      # tsc + vite build → dist/
```

The API base URL comes from `VITE_API_URL` (see `frontend/.env.example`), defaulting to `/api/v1` for the combined nginx image. For a separate backend use `VITE_API_URL=http://127.0.0.1:8000/api/v1`.

### Tests

```bash
cd backend && .venv/bin/python -m pytest
```

`backend/tests/` covers the parts that are easy to break silently: role/ownership rules, referee scope, public visibility switches, stage ordering and fixtures, qualification systems and stage-scoped statistics. `test_validacion_calendario.py` covers the calendar validator (court, team, referee and rest conflicts, and that it never blocks). `test_roles_y_cupos.py` covers the commercial layer: tournament quota, support password resets, what an organizer may and may not do with accounts, the captain's scope, the reschedule notifications and the cross-organizer isolation of venues and users. `conftest.py` points `DATABASE_URL` at a temp SQLite file **before importing the app** (config and the admin seed run at import time) and disables the slowapi limiter, since the login route is capped at 10/minute and the fixtures log in far more often. There are no frontend tests.

## Architecture

### Backend (`backend/app/`)

- **`main.py`** — FastAPI app (`title="Champion Hive API"`). On startup runs `Base.metadata.create_all()` + `run_sqlite_migrations()`, installs CORS (allows `localhost:5173`/`127.0.0.1:5173`) and the slowapi rate-limiter, then mounts seven routers under `/api/v1`.
- **`db/database.py`** — SQLAlchemy engine/`SessionLocal`/`get_db`. SQLite gets `check_same_thread=False`. `run_sqlite_migrations()` is an ad-hoc migration shim: it reads `PRAGMA table_info(...)` and `ALTER TABLE ... ADD COLUMN` for any model column missing from an existing SQLite table. **There is no Alembic migration history** (alembic is installed but unused — no `alembic/` dir or `alembic.ini`).
- **`db/models.py`** — all 16 ORM models + enums. Defines a custom **`GUID`** `TypeDecorator` storing UUIDs as native Postgres `UUID` or `CHAR(32)` on SQLite — this is what makes the same models run on both backends.
- **`schemas.py`** — Pydantic v2 request/response schemas (`from_attributes=True`) for every resource.
- **`core/config.py`** — pydantic-settings `Settings` loaded from `.env`: `SECRET_KEY` (defaults to the insecure `dev-insecure-key-change-in-production`), `ALGORITHM` (`HS256`), `ACCESS_TOKEN_EXPIRE_MINUTES`, `DATABASE_URL`, and `TIMEZONE_OFFSET_MINUTES` (default `-300`, UTC-5) — timestamps are stored in UTC and converted client-side, but the notification texts the server writes have no device to read the zone from, so they use this offset.
- **`core/security.py`** — bcrypt hashing via passlib (`get_password_hash`/`verify_password`) and JWT via python-jose (`create_access_token`/`decode_access_token`).
- **`core/deps.py`** — auth dependencies and the **permission model**. Roles (`ROLES_VALIDOS`, labeled in `ROL_LABELS`): `superadmin` (sees/administers everything, the only one who creates organizers, assigns their quota and can `reset_all`), `admin` (organizer; owns the tournaments they create and the accounts they open), `referee` (only loads results for matches assigned to them), `captain` (only reads their own team). `require_staff` means *can administer a tournament* and is `admin`+`superadmin` — **referees and captains are not staff**. `puede_gestionar_usuario(actor, objetivo)` is the account-level ownership check: superadmin over everyone, an organizer only over themselves and the captains/referees they created (`created_by_id`). `puede_administrar(user, tournament)` is the ownership check: superadmin always, admin only for their own; a tournament with `owner_id IS NULL` is legacy (created before ownership existed) and stays editable by any admin so nothing is orphaned. 401 on bad token, 403 on wrong role or another admin's tournament.
- **`core/limiter.py`** — shared slowapi `Limiter` keyed by remote address, default `600/minute` (login is further limited to `10/minute`).
- **`services/strategy.py`** — the standings engine, Strategy pattern. `StrategyFactory.get_strategy(sport_type)` returns `BasketballStrategy` (win/loss only, no draw) or `FootballStrategy` (win/draw/loss; also used for `micro` and `banquitas` — see `FOOTBALL_LIKE_SPORTS`); unknown sports raise `ValueError`. `SPORT_DEFAULTS` holds the per-discipline defaults (`points_config`, `match_duration`, `waiting_time`) that `create_tournament` fills in for fields the organizer omits. `calculate_standings(matches, sport_type, tiebreaker_rules)` accumulates per-team points/goals, derives fair-play penalties from card events, then sorts by an **ordered, configurable tiebreaker list**. **Standings are computed on the fly and never persisted.** Only **finished** matches accumulate (`cuenta_para_la_tabla`): `Match.home/away_score` default to `0`, so a freshly generated fixture is full of 0-0 `scheduled` matches that would otherwise count as draws and inflate everyone's PJ. Teams still register in the table from any match, so they show up with PJ 0 as soon as there's a fixture. Callers must therefore include `status` in each match dict — `_matches_to_dicts` does; a dict without `status` falls back to counting whenever both scores are set, which is what keeps the external payloads of `POST /matches/standings` working.
- **`api/`** — one router per domain: `auth_routes`, `team_routes`, `tournament_routes` (the largest — holds the fixture/bracket engine), `venue_routes`, `match_routes`, `notification_routes`, `captain_routes`.
- **`services/notifications.py`** — turns a match change into avisos for the captains of both teams (see *Notifications* below).
- **`services/validacion_calendario.py`** — reads the whole calendar back and reports what is crossed (see *Calendar validation* below).

### Data model (`db/models.py`)

```
Tournament ─┬─ Stage ─── Match ─┬─ MatchStat   (per-event: goals, cards…)
            │                   └─ StageSlot    (unresolved bracket positions)
            ├─ Sponsor
            └─ TournamentPhoto
Tournament ─ TournamentTeam ─ Team ─ TeamPlayer ─ Player   (M2M join tables; TournamentTeam holds group_name + approval status, TeamPlayer holds jersey number)
Venue ─ Court ─ Match                                       (a Match is played on a Court)
User ─ TeamManager ─ Team                                   (who captains which team; the captain's whole scope)
User ─ Notification                                         (inbox: reschedules, venue changes, results)
User                                                        (email, hashed_password, role, name, phone,
                                                             max_tournaments, created_by_id,
                                                             must_change_password, created_at, last_login_at)
```

Enums: **SportType** `football|micro|basketball|banquitas` · **StageType** `group|knockout|league|swiss` · **MatchStatus** `scheduled|live|finished` · **SlotType** `team|winner_of|position`.

`Tournament` carries the tournament config as JSON columns: `points_config`, `tiebreaker_rules`, plus `match_duration`/`waiting_time` and branding (`logo_url`/`banner_url`). `Stage` has an `order_index` (its real position in the tournament; named that way because `order` is a reserved word and `run_sqlite_migrations` emits unquoted `ALTER TABLE`) and a JSON `config` holding the per-stage rules: `team_ids` (which teams play this stage — empty means all), `double_round` (ida y vuelta), `qualifiers_per_group` and `best_thirds_count` (`"auto"` completes the bracket to a power of 2). `Match` has `home/away_team_id`, `home/away_score`, `court_id`, `bracket_round`, and scheduling timestamps.

### Bracket / fixture engine (`api/tournament_routes.py`)

This router is the non-obvious core. Key endpoints (under `/api/v1/tournaments`):

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

- **auth** (`/auth`): `register`, `login` (OAuth2 password form, `10/minute`, returns `must_change_password`), `me`, `roles`, `change_password`, `list_users` (scoped: superadmin sees all, an organizer only the accounts they created), `update_user` (role/estado/cupo), `reset_password` (support reset — returns a one-time temp password and forces a change on next login), `list_referees`, `delete_user`.
- **teams** (`/`): teams within a tournament, `shuffle_groups` (random group assignment), per-team group reassignment, and players within teams (with jersey numbers).
- **venues** (`/venues`): venue + court CRUD.
- **matches** (`/matches`): `list`, `schedule`, `update_match_status` (scheduled→live→finished), live event recording (`record_event`/`get_match_events`), and a stateless `POST /standings` that computes a table from a posted match list + rules. `update_match_schedule` and `update_match_status` take a `snapshot_partido` before writing and hand it to `services/notifications.py`, which is what turns a reschedule into an aviso.
- **teams** also holds the captains of a team: `GET/POST /teams/{id}/managers` and `DELETE /teams/{id}/managers/{user_id}`. The POST is the only user creation an organizer can do — it opens a `captain` account (with a generated temp password if none is given) and links it to the team; without it a 20-team tournament would need the superadmin for every captain.
- **notifications** (`/notifications`): the authenticated user's inbox — `list`, `unread_count`, `{id}/read`, `read_all`, `delete`, plus `POST /broadcast/{tournament_id}` for the organizer's manual notice to the captains of their tournament.
- **captain** (`/captain`): `teams` (teams they run, with tournament and group), `matches` (upcoming / played / live, each with rival, date, court and venue) and `teams/{id}/summary` (record, form, position per stage, per-player goals and cards). Every endpoint starts from `_equipos_del_usuario`: a team that isn't there is a 403.

### Ownership, roles and public visibility

`Tournament.owner_id` is the admin who created it; `GET /tournaments` returns only your own when authenticated as admin (all of them to superadmin, and all of them unauthenticated — the public scoreboard needs them). Every write path goes through `_torneo_administrable` / `_fase_administrable` in `tournament_routes.py` (and the equivalents in `team_routes.py` / `match_routes.py`). Referees write only through `_asegurar_puede_dirigir`, which requires `Match.referee_id == user.id`; `GET /auth/referees` exists so an admin can assign referees without being able to list or manage the rest of the users.

**No organizer sees another organizer's setup.** Beyond the tournaments themselves, that means: `GET /venues` filters through `sedes_visibles` (own + legacy `owner_id IS NULL`), `_canchas_disponibles` restricts every court assignment (fixture, swiss, advance, seed_bracket and the bulk calendar) to those same venues, the dashboard's venue count uses the same list, `GET /auth/users` only returns accounts with `created_by_id == me`, and `GET /auth/referees` adds the platform's referees (created by a superadmin, or legacy) but never another organizer's. The superadmin bypasses all of it on purpose — that is what makes support possible.

`Tournament.visibility` is a JSON of publish switches — `sanciones`, `nominas`, `metricas` — checked by `_asegurar_visible`. A missing key means public, so existing tournaments keep publishing everything. Positions, calendar, goleadores and valla are always public by design. Hidden sections return 403 to the public and 200 to the owner/superadmin; the frontend catches the 403 and just omits the section.

### Plans and quota (`User.max_tournaments`)

The commercial lever. NULL means unlimited, which is how every existing account stays after the update; a number caps how many tournaments that organizer can own. `_asegurar_cupo_disponible` (in `tournament_routes.py`) counts `Tournament.owner_id == user.id` and returns 403 when the quota is spent — legacy tournaments (`owner_id IS NULL`) do not consume it. Only the superadmin can set it (`POST /auth/register`, `PUT /auth/users/{id}`); an organizer trying to raise their own gets a 403. `GET /auth/me` reports `max_tournaments` + `tournaments_count`, which is what paints the "1 de 2 campeonatos" badge and disables the create form.

### Notifications (`services/notifications.py`)

Captains have to find out when a match moves. `snapshot_partido(match)` is taken **before** the write, and `notificar_cambio_de_partido(db, match, antes)` compares it with the result: first time it gets a date → `partido_programado`; date changed → `partido_reprogramado` (the title says *aplazado* or *adelantado*, and the body carries both dates); only the court changed → `partido_cancha`. `notificar_estado_de_partido` covers `partido_en_vivo` and `partido_resultado`. Every aviso is written for the captains of **both** teams (`capitanes_de_equipos`), the helper never commits (the endpoint does), and it returns how many it created — that is where the `notifications` field of the bulk calendar response comes from. Adding push or WhatsApp means touching only this module.

### Calendar validation (`services/validacion_calendario.py`)

The auto-scheduler never overlaps its own slots, but the moment the organizer edits an hour by hand nothing stops two matches sharing a court. `detectar_conflictos(db, tournament)` re-reads the calendar and reports, split into `error` (impossible to play) and `aviso` (worth a look): `cancha_ocupada` (same court, overlapping times — including a match from **another** tournament on that court, named only if the caller may see it), `equipo_solapado`, `arbitro_ocupado`, `orden_de_llave` (a knockout match starting before the match that feeds it ends, via `StageSlot.source_match_id`), `equipo_sin_descanso` (gap below `min_rest_minutes`, defaulting to one match duration), `sin_fecha` and `sin_cancha`. Exposed as `GET /tournaments/{id}/schedule_conflicts`; **it never blocks or fixes anything** — the organizer sometimes knows something the system doesn't, so the panel warns and they decide. A match's window is `scheduled_start` → `scheduled_end`, falling back to `match_duration` when the end is missing or stale; `update_match_schedule` now recomputes `scheduled_end` whenever the start moves, which is what keeps those windows honest.

### Qualification systems

`QUALIFICATION_PRESETS` (in `tournament_routes.py`, exposed by `GET /tournaments/qualification_presets`) names the common systems; `stage.config["preset"]` selects one and any explicit `qualifiers_per_group` / `best_thirds_count` in the config overrides it (`_reglas_clasificacion`). `stage.config["cross_tiebreakers"]` orders the comparison between teams from different groups (`cross_group_sort_key` in `strategy.py`; `PARTIDO_DIRECTO` is excluded because they never met). `GET /stages/{id}/bracket_preview` shows the crossings that the current configuration would produce — seeded by merit, best vs worst — without creating anything.

### Stage-scoped statistics

`GET /{tournament_id}/player_stats`, `/team_stats` and `/fairplay` accept `stage_id` + `mode`: `from` (default — that stage and every later one, by `order_index`) or `only`. That is what backs the public "Cuentan desde" filter for goleadores, valla menos vencida and sanciones; with no `stage_id` they aggregate the whole tournament as before.

### Tiebreaker rules

`Tournament.tiebreaker_rules` is a JSON array applied in order by `services/strategy.py`. Supported keys: `PUNTOS`, `DIF_GOLES`, `GOLES_FAVOR`, `GOLES_CONTRA` (fewer is better), `FAIR_PLAY` (card penalty, fewer is better), `PARTIDO_DIRECTO` (head-to-head mini-table among tied teams). `GET /api/v1/tournaments/tiebreaker_options` returns the labeled set.

### Frontend (`frontend/src/`)

React 18 + Vite + TypeScript, built as a **PWA** (`vite-plugin-pwa` + Workbox). Stack: **react-redux** (only `authSlice` — token, role, user id, mirrored to `localStorage`), **Tailwind CSS**, **Framer Motion**, **jsPDF**, **DOMPurify**, **qrcode**.

`App.tsx` routes by role: `referee` → `RefereeView`, `captain` → `CaptainView`, anything else → `AdminView`; without a token it shows `LandingView`/`PublicView`. The views are large and self-contained: `AdminView.tsx` holds every admin tab (torneos, equipos, fases, calendario, config) plus `DashboardView`, `VenuesPanel` and `UsersPanel`; `PublicView.tsx` is the whole public scoreboard.

- **`CaptainView.tsx`** is the captain's whole app: team picker (if they run more than one), a "próximo partido" card with date, court and venue, calendar (upcoming / played) and a team tab with record, form, position per stage and per-player stats. It only calls `/captain/*`.
- **`NotificationsBell.tsx`** lives in the `Layout` header for every role: unread badge polled every 60 s, dropdown with the avisos, click marks read.
- **`UsersPanel.tsx`** is the account panel for superadmin *and* organizer — the same screen, scoped by what the backend returns. It creates accounts, edits role/quota/name, toggles active, and shows the temp password from a reset once, with a copy button.
- `Layout.tsx` opens the password modal by itself and refuses to close it while `auth.mustChangePassword` is set (the flag comes from the login response and is cleared by `passwordChanged`).
- `ValidacionCalendario` (in `AdminView.tsx`) sits on top of the calendar tab: it re-checks after every manual edit, auto-schedule or draw, lists each conflict with its reason, and marks the offending rows with a red (error) or amber (aviso) left border.

- **`src/sports.ts`** is the single source of truth for disciplines: label, icon, gradient, score unit, the referee's discipline buttons and the public table's card columns. Adding a sport = one entry here plus the `SportType` value in the backend. Never re-introduce `sport_type === 'micro'` checks in components — use `sportOf()` / `hasBlueCard()`.
- **`src/services/api.ts`** wraps every endpoint and handles the offline outbox (`services/offline.ts`) so referees can load results without connectivity. `StatScope` (`{stageId, mode}`) is what powers the "Cuentan desde" filter.
- Sections the organizer hid return 403; the frontend catches it and omits the section rather than showing an empty table.

### Auth flow

`POST /api/v1/auth/login` (form-encoded) returns a JWT plus role and user id. The frontend stores them and routes by role; every subsequent request sends `Authorization: Bearer <token>`. A 401 on any call clears the session and reloads.
