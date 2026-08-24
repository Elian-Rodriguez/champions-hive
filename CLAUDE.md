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

`backend/tests/` covers the parts that are easy to break silently: role/ownership rules, referee scope, public visibility switches, stage ordering and fixtures, qualification systems and stage-scoped statistics. `test_escudos.py` covers the team crest (what `logo_url` accepts, the size cap, and the partial edit that used to 422). `test_eventos.py` covers correcting and deleting a loaded event (the merge of `event_data`, the goal that stops counting in goleadores, and that corregir has exactly the scope of cargar). `test_validacion_calendario.py` covers the calendar validator (court, team, referee and rest conflicts, and that it never blocks). `test_cuadro.py` covers the bracket re-resolving itself when a result is corrected (the finalist that changes, the cross that empties when the match stops being finished, the cascade down the rounds and the repair of a tournament left crooked by the old behaviour). `test_walkover.py` covers the matches that are not played: the W.O. score each discipline's rulebook fixes, the double W.O. that is a loss for both, the postponed match that neither counts for the table nor collides in the calendar and comes back when it gets a new date, and the point sanction (that it moves the table and the group table, who may load it and its cap). `test_planilla.py` covers the match sheet: who may load it, that it replaces one team's without touching the other's and that a player who is not on the team's roster is rejected. `test_roles_y_cupos.py` covers the commercial layer: tournament quota, support password resets, what an organizer may and may not do with accounts, the captain's scope, the reschedule notifications and the cross-organizer isolation of venues and users. `conftest.py` points `DATABASE_URL` at a temp SQLite file **before importing the app** (config and the admin seed run at import time) and disables the slowapi limiter, since the login route is capped at 10/minute and the fixtures log in far more often. There are no frontend tests.

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
- **`services/bracket.py`** — writes the result of a match into the crossings that depend on it, and **rewrites** them when it changes (see *Bracket propagation* below).
- **`services/notifications.py`** — turns a match change into avisos for the captains of both teams (see *Notifications* below).
- **`services/validacion_calendario.py`** — reads the whole calendar back and reports what is crossed (see *Calendar validation* below).

### Data model (`db/models.py`)

```
Tournament ─┬─ Stage ─── Match ─┬─ MatchStat   (per-event: goals, cards…)
            │                   ├─ MatchLineup  (who actually played that match)
            │                   └─ StageSlot    (unresolved bracket positions)
            ├─ Sponsor
            └─ TournamentPhoto
Tournament ─ TournamentTeam ─ Team ─ TeamPlayer ─ Player   (M2M join tables; TournamentTeam holds group_name, approval status and the points sanction, TeamPlayer holds jersey number)
Venue ─ Court ─ Match                                       (a Match is played on a Court)
User ─ TeamManager ─ Team                                   (who captains which team; the captain's whole scope)
User ─ Notification                                         (inbox: reschedules, venue changes, results)
User                                                        (email, hashed_password, role, name, phone,
                                                             max_tournaments, created_by_id,
                                                             must_change_password, created_at, last_login_at)
```

Enums: **SportType** `football|micro|basketball|banquitas` · **StageType** `group|knockout|league|swiss` · **MatchStatus** `scheduled|live|finished|postponed` · **SlotType** `team|winner_of|position`.

`Tournament` carries the tournament config as JSON columns: `points_config`, `tiebreaker_rules`, plus `match_duration`/`waiting_time` and branding (`logo_url`/`banner_url`). `Stage` has an `order_index` (its real position in the tournament; named that way because `order` is a reserved word and `run_sqlite_migrations` emits unquoted `ALTER TABLE`) and a JSON `config` holding the per-stage rules: `team_ids` (which teams play this stage — empty means all), `double_round` (ida y vuelta), `qualifiers_per_group` and `best_thirds_count` (`"auto"` completes the bracket to a power of 2). `Match` has `home/away_team_id`, `home/away_score`, `court_id`, `bracket_round`, scheduling timestamps and `walkover` (see *Matches that are not played* below).

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
- **teams** (`/`): teams within a tournament, `shuffle_groups` (random group assignment), per-team group reassignment, the points sanction (`PUT /tournaments/{tid}/teams/{team_id}/points_adjustment`) and players within teams (with jersey numbers). `PUT /teams/{id}` takes **`TeamUpdate`** (every field optional) — with `TeamBase` there, changing only the uniforms or only the crest answered 422 because `name` was required.
- **venues** (`/venues`): venue + court CRUD.
- **matches** (`/matches`): `list`, `schedule`, `update_match_status` (scheduled→live→finished, plus `postponed` and the `walkover` flag), live event recording (`record_event`/`get_match_events`) plus the corrections the referee makes in the field — `PUT /matches/events/{id}` (`event_data` is **merged**, not replaced, so fixing the minute never drops the team) and `DELETE /matches/events/{id}`, both gated by the same `_asegurar_puede_dirigir` as recording — the match sheet (`GET /matches/{id}/lineup`, public, and `PUT /matches/{id}/lineup`, same scope as recording) and a stateless `POST /standings` that computes a table from a posted match list + rules. `update_match_schedule` and `update_match_status` take a `snapshot_partido` before writing and hand it to `services/notifications.py`, which is what turns a reschedule into an aviso; `update_match_status` also calls `propagar_resultado` so the bracket follows the result.
- **teams** also holds the captains of a team: `GET/POST /teams/{id}/managers` and `DELETE /teams/{id}/managers/{user_id}`. The POST is the only user creation an organizer can do — it opens a `captain` account (with a generated temp password if none is given) and links it to the team; without it a 20-team tournament would need the superadmin for every captain.
- **notifications** (`/notifications`): the authenticated user's inbox — `list`, `unread_count`, `{id}/read`, `read_all`, `delete`, plus `POST /broadcast/{tournament_id}` for the organizer's manual notice to the captains of their tournament.
- **captain** (`/captain`): `teams` (teams they run, with tournament and group), `matches` (upcoming / played / live, each with rival, date, court and venue) and `teams/{id}/summary` (record, form, position per stage, per-player goals and cards). Every endpoint starts from `_equipos_del_usuario`: a team that isn't there is a 403.

### Ownership, roles and public visibility

`Tournament.owner_id` is the admin who created it; `GET /tournaments` returns only your own when authenticated as admin (all of them to superadmin, and all of them unauthenticated — the public scoreboard needs them). Every write path goes through `_torneo_administrable` / `_fase_administrable` in `tournament_routes.py` (and the equivalents in `team_routes.py` / `match_routes.py`). Referees write only through `_asegurar_puede_dirigir`, which requires `Match.referee_id == user.id`; `GET /auth/referees` exists so an admin can assign referees without being able to list or manage the rest of the users.

**No organizer sees another organizer's setup.** Beyond the tournaments themselves, that means: `GET /venues` filters through `sedes_visibles` (own + legacy `owner_id IS NULL`), `_canchas_disponibles` restricts every court assignment (fixture, swiss, advance, seed_bracket and the bulk calendar) to those same venues, the dashboard's venue count uses the same list, `GET /auth/users` only returns accounts with `created_by_id == me`, and `GET /auth/referees` adds the platform's referees (created by a superadmin, or legacy) but never another organizer's. The superadmin bypasses all of it on purpose — that is what makes support possible.

`Tournament.visibility` is a JSON of publish switches — `sanciones`, `nominas`, `metricas` — checked by `_asegurar_visible`. A missing key means public, so existing tournaments keep publishing everything. Positions, calendar, goleadores and valla are always public by design. Hidden sections return 403 to the public and 200 to the owner/superadmin; the frontend catches the 403 and just omits the section.

### Plans and quota (`User.max_tournaments`)

The commercial lever. NULL means unlimited, which is how every existing account stays after the update; a number caps how many tournaments that organizer can own. `_asegurar_cupo_disponible` (in `tournament_routes.py`) counts `Tournament.owner_id == user.id` and returns 403 when the quota is spent — legacy tournaments (`owner_id IS NULL`) do not consume it. Only the superadmin can set it (`POST /auth/register`, `PUT /auth/users/{id}`); an organizer trying to raise their own gets a 403. `GET /auth/me` reports `max_tournaments` + `tournaments_count`, which is what paints the "1 de 2 campeonatos" badge and disables the create form.

### Team crests (`logo_url` as a data URI)

`Team.logo_url` takes either a link or **the image itself** as a `data:image/...;base64,` URI, which is what the panel sends when the organizer uploads one. It is stored in the DB rather than as a file on disk on purpose: the crest then travels with the backup, survives a move between SQLite and Postgres or a redeploy without a `/data` volume, and — the reason that decides it — loads into a canvas without CORS, which is what the acta and the PNG exports of standings, calendar and bracket do with it. `schemas.validar_imagen` is the gate: http(s) or a png/jpeg/webp/gif data URI, nothing else (`logo_url` ends up in an `<img src>`), capped at `MAX_IMAGEN` (400 000 chars). It runs on the way **in** (`TeamCreate`/`TeamUpdate`) and deliberately not on `TeamBase`, since `TeamResponse` inherits from it and old rows must stay readable. The frontend never sends a raw file: `utils/imagen.ts` (`escudoDesdeArchivo`) draws it into a canvas at 256 px and encodes webp (png where webp is unsupported), which lands a normal crest at 2-10 KB. Sending `logo_url: null` clears it.

### Bracket propagation (`services/bracket.py`)

A `WINNER_OF` / `LOSER_OF` slot used to be resolved **once**: the team went up and the slot was marked resolved for good, so when the referee corrected the score of a semifinal the team already in the final stayed there and there was no way to fix it from the app. `propagar_resultado(db, match)` now syncs every slot fed by that match with the result it has **right now** — and follows the cascade forward, because a new finalist can mean a new winner of the final. A match that stops being `finished` (corrected to live, or postponed) empties the slot it had filled: a blank box beats a team that won nothing. `_auto_resolve_winner_slots` (behind `POST /stages/{id}/resolve_position_slots`) does the same sweep over a whole stage, which is what repairs the tournaments left crooked by the old behaviour. The tie still goes to the home team, as before — a knockout decided on penalties is loaded with the winner on top.

### Matches that are not played: postponed, W.O. and point sanctions

Three things the rulebook has and the app did not:

- **`MatchStatus.POSTPONED`** — it rained, the round moves. It does not count for the table (only `finished` accumulates), `detectar_conflictos` skips it entirely (a postponed match collides with no one and its missing date is the point), and giving it a new `scheduled_start` through `update_match_schedule` puts it back to `scheduled` — otherwise it would stay postponed forever, outside the table and outside the validator.
- **`Match.walkover`** (`home` / `away` / `both`) — who did not show up. The match stays `finished` **with** a score, so everything downstream keeps working, but it is on the record that it was not played. Sending no score fills in the one the discipline's rulebook fixes (`marcador_walkover` in `strategy.py`: 3-0 for football and its variants, 20-0 for basketball as in FIBA). `both` is 0-0 and `calculate_standings` counts it as a **loss for both**, not the draw a 0-0 would suggest. `walkover: null` clears it.
- **`TournamentTeam.points_adjustment`** (+ `_reason`) — the point sanction. Punishing a team used to mean touching its results, which is lying to the table; this adds points (negative to deduct) without touching a single match, and travels with its reason because a -3 with no explanation is what makes the organizer lose the argument. `PUT /tournaments/{tid}/teams/{team_id}/points_adjustment` (staff, own tournament, capped at ±100); `_ajustes_de_puntos` feeds it to `calculate_standings`, which applies it **before sorting** — a deduction that does not move the team is not a sanction — and leaves it on the row as `points_adjustment` so the table can show it.

### Match sheet (`MatchLineup`)

The acta is signed at the field to leave a record of who was on the pitch, and it used to print the team's whole roster, which proves nothing. `MatchLineup` holds who played that match (`is_starter`, `is_captain`, and the `number` they wore that day, copied so a later change of jersey does not rewrite history). It is loaded per team — each delegate hands their list in when they arrive, never both at once — replacing whatever that team had; the other team's is untouched. A player who is not on the team's roster is rejected with their name, which is where eligibility control starts. Reading it is public (the acta circulates around the league); writing it takes the same `_asegurar_puede_dirigir` as loading the result, and the referee panel queues it offline like everything else in the field.

### Notifications (`services/notifications.py`)

Captains have to find out when a match moves. `snapshot_partido(match)` is taken **before** the write, and `notificar_cambio_de_partido(db, match, antes)` compares it with the result: first time it gets a date → `partido_programado`; date changed → `partido_reprogramado` (the title says *aplazado* or *adelantado*, and the body carries both dates); only the court changed → `partido_cancha`. `notificar_estado_de_partido` covers `partido_en_vivo`, `partido_aplazado` (there is no new date yet, and for the captain the difference is whether they play on Sunday) and `partido_resultado`, whose body says who did not show up when the match was a W.O. Every aviso is written for the captains of **both** teams (`capitanes_de_equipos`), the helper never commits (the endpoint does), and it returns how many it created — that is where the `notifications` field of the bulk calendar response comes from. Adding push or WhatsApp means touching only this module.

### Calendar validation (`services/validacion_calendario.py`)

The auto-scheduler never overlaps its own slots, but the moment the organizer edits an hour by hand nothing stops two matches sharing a court. `detectar_conflictos(db, tournament)` re-reads the calendar and reports, split into `error` (impossible to play) and `aviso` (worth a look): `cancha_ocupada` (same court, overlapping times — including a match from **another** tournament on that court, named only if the caller may see it), `equipo_solapado`, `arbitro_ocupado`, `orden_de_llave` (a knockout match starting before the match that feeds it ends, via `StageSlot.source_match_id`), `equipo_sin_descanso` (gap below `min_rest_minutes`, defaulting to one match duration), `sin_fecha` and `sin_cancha`. **Postponed matches are dropped before anything is checked** (their own and other tournaments'): a suspended round must not fill the panel with errors, and a match without a date is exactly what postponed means. Exposed as `GET /tournaments/{id}/schedule_conflicts`; **it never blocks or fixes anything** — the organizer sometimes knows something the system doesn't, so the panel warns and they decide. A match's window is `scheduled_start` → `scheduled_end`, falling back to `match_duration` when the end is missing or stale; `update_match_schedule` now recomputes `scheduled_end` whenever the start moves, which is what keeps those windows honest.

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
- **`RefereeView.tsx`**'s "Registro en vivo" corrects and deletes what was already loaded: the pencil turns the row into an inline editor (equipo, tipo, jugador, minuto — and "sale" when it is a CAMBIO) and the trash asks for a second tap before deleting, because in the field the thumb wanders. The controls only appear for a match the user can actually direct (`role !== 'referee' || match.referee_id === userId`), mirroring the backend. **The score is not derived from the events** — the referee also moves it by hand — so correcting or deleting a GOL moves the counter the same way the "Gol" button moved it (`ajustarMarcador`), and the aviso says to save. The **"No se jugó"** button opens the panel for the match that does not happen: *Aplazar*, or *No llegó X* for either team or neither (W.O., with the score `marcadorWalkover` fixes so the number is right even with no signal). The **"Planilla del partido"** card under the board is where the referee marks who played: a checkbox per rostered player, a T/S toggle for titular/suplente, a star for the captain, "todos titulares", and one save per team — the same `readOnly` gate as the rest, so a referee who is not on that match sees it but cannot touch it.
- **`NotificationsBell.tsx`** lives in the `Layout` header for every role: unread badge polled every 60 s, dropdown with the avisos, click marks read.
- **`UsersPanel.tsx`** is the account panel for superadmin *and* organizer — the same screen, scoped by what the backend returns. It creates accounts, edits role/quota/name, toggles active, and shows the temp password from a reset once, with a copy button.
- `Layout.tsx` opens the password modal by itself and refuses to close it while `auth.mustChangePassword` is set (the flag comes from the login response and is cleared by `passwordChanged`).
- `ValidacionCalendario` (in `AdminView.tsx`) sits on top of the calendar tab: it re-checks after every manual edit, auto-schedule or draw, lists each conflict with its reason, and marks the offending rows with a red (error) or amber (aviso) left border.

- **`src/utils/imagen.ts`** turns the file the organizer picks into a small crest (256 px, webp with a png fallback) before anything leaves the browser — see *Team crests* above. `TeamLogo` (in `AdminView.tsx`, next to `TeamColors`) is the control: preview, upload, and an × to remove.
- **`src/sports.ts`** is the single source of truth for disciplines: label, icon, gradient, score unit, the referee's discipline buttons, the public table's card columns and the W.O. score (`walkoverScore` / `marcadorWalkover`, the same the backend applies). Adding a sport = one entry here plus the `SportType` value in the backend. Never re-introduce `sport_type === 'micro'` checks in components — use `sportOf()` / `hasBlueCard()`.
- **`src/utils/partido.ts`** holds the labels of a match that is not played (`ESTADO_LABEL` with *Aplazado*, `woLabel`, `woDetalle`). It exists because those strings are painted by the public scoreboard, the organizer's calendar, the referee panel, the bracket and the captain's app: a raw `postponed` on screen is one error visible to the public in five places at once.
- **`src/utils/socialImage.ts`** draws the share images on a canvas (resultado, próximo partido, posiciones, calendario, cuadros de estadísticas and bracket). **Long lists are never truncated**: `makeStandingsImage`, `makeCalendarImage` and `makeStatsImage` return a `Blob[]` — one image per page, split evenly by `paginar()` so 22 matches go 8/7/7 and not 9/9/4, with the same row height on every page and a "2 / 3" chip under the wordmark — and `shareImages` / `downloadImages` post them as a carousel or save them all. The index handed to `TableCol.cell(r, i)` is the global one, so the "#" column keeps counting 11, 12, 13 on the second image. Sponsors (max 5) are redrawn on every page.
- **`src/utils/pdf.ts`** holds the **acta del partido** (`exportMatchReportPDF`), the document the organizer prints, signs at the field and hands to the club — see *Acta del partido* below. Same file: the standings PDF and `exportImagePDF` (a ready PNG, e.g. the bracket, dropped into a page).
- **`src/services/api.ts`** wraps every endpoint and handles the offline outbox (`services/offline.ts`) so referees can load results without connectivity. An event created without signal only lives in the queue, so its optimistic id **is** its outbox id (`tmp_…`): correcting it rewrites that pending POST (`patchQueuedEvent`) and deleting it cancels the send (`dropQueuedEvent`), instead of firing a PUT/DELETE for an id the server never saw. `StatScope` (`{stageId, mode}`) is what powers the "Cuentan desde" filter.
- Sections the organizer hid return 403; the frontend catches it and omits the section rather than showing an empty table.

### Acta del partido (`src/utils/pdf.ts`)

`exportMatchReportPDF(match, events, playerName, opts)` builds an A4 document, not a data dump: navy header with the tournament logo, the discipline and an acta code derived from the match id (`ACT-XXXXXX`), a scoreboard card with both crests, the status pill and a four-cell strip (fecha/hora, sede/cancha, fase, árbitro), then the planillas — goles, disciplina (the sanción cell is painted with the card's own colour), sustituciones and a per-team summary whose columns come from `sportOf(sport_type).events`, never from an `if` per sport — the planteles side by side with dorsal, documento, goles and sanciones — **the match sheet when there is one**: only who played, split into TITULARES and SUPLENTES with the captain marked `(C)`, since that is what the signature is attesting to; without a sheet it falls back to the full roster as before — an elastic *Observaciones* box that stretches to fill whatever is left, and the **firmas**: three boxes (delegado local, árbitro, delegado visitante) pinned to the bottom of the last page with a ruled line and a `C.C.` line. Under them a dark strip with a **QR to the public scoreboard** (`/?t=<tournament_id>`), because the printed acta circulates around the league and is the cheapest advertising there is.

It is `async` (crests and QR), and everything optional degrades: a logo whose server denies CORS or takes over 4 s is dropped and the team shows its initials over its uniform colours; without rosters the planteles say so; the *Parcial* column only appears when the goals loaded add up to the final score, since the referee also moves the scoreboard by hand. A match that is not `finished` gets a diagonal **PROVISIONAL / EN JUEGO / APLAZADO** watermark, which is also what makes the empty acta of a scheduled match a useful thing to print and fill in by hand; a W.O. is finished but stamped **NO JUGADO**, and the line under the score reads `GANA X POR W.O.` — that is what explains a 3-0 to whoever reads the acta weeks later. Images are embedded with `'FAST'` compression and capped at 360 px — a single logo took the file from 77 kB to 750 kB, and it is downloaded from the field on mobile data. Both the referee (match panel) and the organizer (each row of the calendar tab) can download it.

### Auth flow

`POST /api/v1/auth/login` (form-encoded) returns a JWT plus role and user id. The frontend stores them and routes by role; every subsequent request sends `Authorization: Bearer <token>`. A 401 on any call clears the session and reloads.
