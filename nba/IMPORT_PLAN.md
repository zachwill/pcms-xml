# NBA → Postgres (`nba` schema) — Windmill Import Plan (API-first, no “shared” requirement)

This is a **handoff doc** for implementing Windmill flow(s) similar to `import_pcms_data.flow/`, but for NBA APIs.

The key change vs the PCMS flow:
- **PCMS needed a file lineage step** (ZIP→XML→JSON). NBA is already JSON.
- NBA imports should be **API → transform → UPSERT** (no intermediate `./shared/` cache step).
- Assume we can always re-fetch; idempotent UPSERTs are the safety net.

---

## Goal
Build one Windmill flow (or two, max) that can:
- Fetch NBA Developer Portal endpoints (mostly JSON)
- Normalize lightly (durations, booleans, fg2 fields)
- **UPSERT** into the `nba.*` tables defined by `nba/schema/*.txt`

No “phases” — just one importer that can run “all” or “subset” modes.

---

## Preconditions
### 1) Database migrations
Before any flow runs, the Postgres schema must exist.

**Action:** run the SQL in `nba/migrations/*.sql` (already generated from `nba/schema/*.txt`):
- `CREATE SCHEMA IF NOT EXISTS nba;`
- Create tables + indexes as specified (FK order still matters in SQL, but this is just DDL ordering, not “phasing”).
- Ensure your migration runner/deploy process executes `nba/migrations/*.sql`.

Current migration files (already created in `nba/migrations/`):
- `001_core_entities.sql`
- `002_games_and_game_data.sql`
- `003_aggregates_and_supplemental.sql`
- `004_ngss.sql`

### 2) Secrets / env
- `POSTGRES_URL`
- `NBA_API_KEY` → sent as `X-NBA-Api-Key: <key>`
- (Optional) NGSS: `NGSS_API_KEY` (base host defaults to https://api.ngss.nba.com:10000)

---

## Core implementation idea
### One importer script that does **fetch + upsert**
We’ll do:
- fetch → transform → upsert

No staging step; re-runs are safe because every table is updated via idempotent UPSERT.

---

## Windmill structure (recommended)

### Option A (simplest): **1 flow, 1 rawscript module**
Create:
- `import_nba_data.flow/flow.yaml`
- `import_nba_data.flow/import_nba_data.inline_script.py`

That single script:
1. Connects to Postgres
2. Fetches the needed endpoints
3. Upserts tables in a safe order
4. Returns a small summary object (counts + errors)

This matches “do it all in one go.”

### Option B (still “one go”, but more maintainable): **1 flow, multiple modules**
Same flow, but split by responsibility (each module still fetches + upserts):
- `teams.inline_script.py` (fetch team index → upsert `nba.teams`)
- `players.inline_script.py`
- `schedules.inline_script.py`
- `games.inline_script.py` (scoreboard/date range + playoff series summary)
- `standings.inline_script.py`
- `game_data.inline_script.py` (traditional + advanced boxscore, PBP, POC, hustle stats/events, tracking stats)
- `aggregates.inline_script.py` (player + team aggregates + lineup stats)
- `supplemental.inline_script.py` (injuries/alerts/storylines/tracking_streams)
- `ngss.inline_script.py` (NGSS games/rosters/boxscores/pbp/officials; requires `NGSS_API_KEY`)

No disk passing required; modules can re-query DB for `game_id`s.

---

## Current repo status (already implemented)

### Migrations (created in `nba/migrations/`)
- `001_core_entities.sql`
- `002_games_and_game_data.sql`
- `003_aggregates_and_supplemental.sql`
- `004_ngss.sql`

### Windmill flow + modules
- `import_nba_data.flow/flow.yaml` with modules:
  - `teams.inline_script.py`
  - `players.inline_script.py`
  - `schedules.inline_script.py`
  - `standings.inline_script.py`
  - `games.inline_script.py` (scoreboard + playoff series summary)
  - `game_data.inline_script.py` (traditional + advanced boxscore, PBP, POC, hustle stats/events, tracking stats)
  - `aggregates.inline_script.py` (player + team aggregates + lineup stats)
  - `supplemental.inline_script.py` (injuries + alerts + storylines + tracking_streams)
  - `ngss.inline_script.py` (NGSS games + rosters + boxscores + PBP + officials; requires `NGSS_API_KEY`)

### Implemented coverage
- Teams, players, schedules, standings, games + playoff series
- Boxscore (traditional + team + advanced), PBP, POC, hustle stats/events, tracking stats
- Player/team aggregates + lineup stats
- Injuries (truncate + insert), alerts/storylines, tracking streams
- NGSS games/rosters/boxscores/pbp/officials (requires NGSS_API_KEY)

### Still TODO (finish next in fresh context)
- Confirm `NGSS_API_KEY` in env and validate NGSS mapping output.

---

## Flow inputs (keep it small)
Recommended inputs (whether Option A or B):

- `dry_run: bool` (default false)
- `league_id: str` (default "00")
- `season_label: str` (default current season, e.g. "2024-25")
- `season_type: str` (default "Regular Season")

Run mode:
- `mode: str` enum `"refresh" | "backfill"` (default "refresh")
- `days_back: int` (default 2) — only used when `mode="refresh"`
- `start_date: str` (YYYY-MM-DD)
- `end_date: str` (YYYY-MM-DD)
- `game_ids: str | null` (comma-separated; if set, skip scoreboard/date)

Date behavior:
- If `mode="refresh"` and `start_date/end_date` are not provided:
  - `end_date = today`
  - `start_date = today - days_back`
- If `mode="backfill"`: require explicit `start_date` + `end_date` (or `game_ids`).

Feature toggles (optional but practical):
- `include_reference: bool` (teams + players)
- `include_schedule_and_standings: bool`
- `include_games: bool`
- `include_game_data: bool` (boxscore/pbp/poc/hustle/tracking)
- `include_aggregates: bool` (player/team aggregates + lineups)
- `include_supplemental: bool` (injuries/alerts/storylines/streams)
- `include_ngss: bool` (NGSS games/rosters/boxscores/pbp/officials)
- `only_final_games: bool` (default true) — game_data only for finals unless overridden

Defaults can be “everything true”, but toggles let you schedule lighter runs.

---

## Operating model: backfill + daily refresh

### Daily refresh (scheduled)
- Run on a schedule (daily to start) with `mode="refresh"` and `days_back=2` (or 3).
- Recommended toggles: `include_reference=true`, `include_games=true`, `include_game_data=true`.
- Add `include_schedule_and_standings=true` + `include_supplemental=true` if you want standings/injuries refreshed daily as well.
- Idempotent UPSERT means re-fetching the last 2–3 days is cheap and catches late-posted boxscore/advanced/hustle updates.

### Backfill (manual)
- Run ad-hoc with `mode="backfill"` and explicit `start_date/end_date` (or explicit `game_ids`).
- Expect to chunk large ranges (e.g., 3–7 days per run) to avoid Windmill timeouts / API rate limits.
- Typically set `include_schedule_and_standings=false` and `include_supplemental=false` for backfills (those endpoints are “current snapshot” style, not truly historical).

---

## API client requirements (in-script)
Implement a small helper inside the script(s):
- `request_json(path, params) -> dict`
- retries (429/5xx)
- basic rate limit sleep

Use `httpx` (sync is fine; async optional later).

Headers:
- `X-NBA-Api-Key: $NBA_API_KEY`
- `x-api-key: $NGSS_API_KEY` (NGSS endpoints only)

---

## Upsert conventions
Use the same upsert style as PCMS scripts:
- Generate `INSERT ... ON CONFLICT (...) DO UPDATE SET ...`
- Update `updated_at = now()` on conflict
- Always set `fetched_at` to the fetch timestamp
- Set `created_at = now()` only on insert

Important: for JSONB columns, pass Python dict/list directly (psycopg will adapt) or `json.dumps`.

---

## Table ingest order (within a single run)
This is not “phasing”; it’s just dependency-safe ordering:

1) `nba.teams`
2) `nba.players`
3) `nba.schedules` (optional)
4) `nba.games` (from scoreboard)
5) `nba.playoff_series` (if playoffs)
6) `nba.standings` (optional)
7) Game-level tables (loop games):
   - `nba.boxscores_traditional` (+ derive fg2 fields)
   - `nba.boxscores_traditional_team`
   - `nba.boxscores_advanced`
   - `nba.play_by_play` (1 row per game, jsonb)
   - `nba.players_on_court` (1 row per game, jsonb)
   - `nba.hustle_stats` / `nba.hustle_stats_team` / `nba.hustle_events` (XML endpoints)
   - `nba.tracking_stats`
8) Aggregates:
   - `nba.player_stats_aggregated`
   - `nba.team_stats_aggregated`
   - `nba.lineup_stats_season` / `nba.lineup_stats_game`
9) Supplemental:
   - `nba.injuries`
   - `nba.alerts`
   - `nba.pregame_storylines`
   - `nba.tracking_streams`
10) NGSS tables (optional; requires `NGSS_API_KEY`)

---

## Transformations you actually need
Keep transformations minimal and deterministic:

### 1) ISO duration → Postgres interval
Boxscore minutes often come like `PT34M12.00S`.
Convert to an interval string: `"34 minutes 12 seconds"`.

### 2) Booleans
Normalize `"1"/"0"`, `1/0`, `true/false`.

### 3) Derived shooting stats
Always compute:
- `fg2m = fgm - fg3m`
- `fg2a = fga - fg3a`
- `fg2_pct = fg2m / fg2a` if `fg2a > 0` else null

### 4) Percent scale
If an endpoint returns `45.6` instead of `0.456`, normalize to decimal fraction.
(Confirm per endpoint; don’t blindly divide everything by 100.)

---

## What the code should look like (Option A)

`import_nba_data.inline_script.py` outline:

- constants:
  - `BASE_URL = "https://api.nba.com/v0"`
- helpers:
  - `request_json(...)`
  - `upsert(...)`
  - `parse_duration_to_interval_str(...)`
  - `now_utc()`

- ingest fns:
  - `ingest_teams(conn, league_id, fetched_at)`
  - `ingest_players(...)`
  - `ingest_schedules(...)`
  - `ingest_games_by_date_range(...) -> list[str]  # game_ids`
  - `ingest_standings(...)`
  - `ingest_game_details(conn, game_ids, fetched_at, include_advanced, include_hustle, include_tracking)`
  - `ingest_aggregates(...)`
  - `ingest_supplemental(...)`

- `main(...)`:
  - compute `game_ids` (explicit input OR fetch scoreboard)
  - run ingest fns in the order above
  - return summary counts

---

## Why this matches your concerns
- No `shared/` staging step — everything is API→transform→DB (raw payloads already land in JSONB columns like `nba.games.game_json`, `nba.play_by_play.pbp_json`, etc.).
- No “phases” as a product decision — one importer can run end-to-end.
- Still keeps correct ordering (teams/players before FK tables) without overthinking it.

---

## Open questions to resolve before coding
1) Do we have an expected Windmill timeout / max runtime?
   - impacts backfill chunk size + how much concurrency we can safely use
2) Daily refresh cadence + window?
   - e.g. once per day with `days_back=2` vs `days_back=3`
3) Should game-level endpoints be fetched only for `game_status=3` (Final) by default?
   - recommended: yes (and always re-try finals in the refresh window to catch late updates)

