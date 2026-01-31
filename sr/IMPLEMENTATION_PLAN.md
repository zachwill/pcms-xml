# SportRadar (sr) — IMPLEMENTATION_PLAN.md

Status: **draft v1 (2026-01-30)**

This document is the **single handoff plan** for implementing:

1) the Postgres schema `sr.*` (via SQL migrations), and
2) Windmill flows (PCMS-style) that fetch SportRadar and UPSERT into `sr.*`.

It is written for a coding agent starting with an empty context window.

---

## 0) First reads / repo context

Read these before coding:

- `sr/AGENTS.md` (design principles + naming)
- `sr/schema/*.txt` (table specs; *design docs*, not migrations)
- `sr/api/*.txt` (Postman exports; endpoint inventory + base URLs)
- `sr/samples/postman.sql.txt` (example payloads; useful for parser dev)
- `../import_pcms_data.flow/*` (the Windmill pattern we are cloning)

---

## 1) Non-negotiable invariants

### 1.1 Python + uv only

- All Windmill inline scripts and local dev scripts are **Python**.
- All runnable scripts must be **uv-compatible** (PEP 723 headers).
- Use the existing PCMS conventions:
  - `# /// script` blocks
  - minimal dependencies
  - deterministic imports

### 1.2 Environment variables

- `POSTGRES_URL` — connection string used by `psycopg`
- `SPORTRADAR_API_KEY` — SportRadar API key; sent as query param `api_key=<key>`

### 1.3 Direct fetch + UPSERT (no staging)

- Each Windmill step fetches the endpoint(s) it needs and UPSERTs directly.
- Shared helpers (`import_sr_data.flow/sr_fetch.py`, `import_sr_data.flow/sr_extract.py`) handle retries + normalization.
- No staged JSON files; raw caching is optional for local dev only.

### 1.4 Multi-league storage strategy (critical)

We are **not** creating separate tables like `sr.nba_games` vs `sr.ncaa_games`.

Instead:

- Use one set of tables (`sr.games`, `sr.players`, …)
- Add `source_api` **and treat it as part of the row identity** (PK/unique keys)

Why:
- Prevent accidental overwrites when the same SportRadar UUID appears in multiple feeds.
- Allow safe ingestion of NBA + NCAA + G League + INTL in one schema.

Implementation rule:
- For any entity table keyed by a SportRadar id, prefer keys like:
  - `PRIMARY KEY (source_api, <sport_radar_id>)`

Convenience:
- If “league-specific names” are desired for analysts/devs, create thin views:
  - `CREATE VIEW sr.nba_games AS SELECT * FROM sr.games WHERE source_api='nba';`

> NOTE: `sr/schema/*.txt` currently lists some PKs without `source_api`. The migrations must implement the **composite key** approach described here.

---

## 2) Postgres schema implementation (migrations)

### 2.1 Folder

- Migrations live in: `sr/migrations/`
- Keep migrations **append-only**.

### 2.2 How to apply migrations (no framework assumed)

We don’t currently have a migration runner. Apply manually:

```bash
psql "$POSTGRES_URL" -f sr/migrations/001_create_schema.sql
psql "$POSTGRES_URL" -f sr/migrations/002_core_tables.sql
# ...
```

(Optionally add a script later, but don’t block P0 on it.)

### 2.3 Suggested migration sequence

Build in phases so the ingest vertical slice can land early.

#### Phase 1 — foundation tables

- `sr.seasons`
- `sr.teams`
- `sr.players`

Keying:
- `sr.seasons`: `PRIMARY KEY (source_api, season_id)`
- `sr.teams`: `PRIMARY KEY (source_api, sr_team_id)`
- `sr.players`: `PRIMARY KEY (source_api, sr_id)`

#### Phase 2 — games registry + boxscore + pbp

- `sr.games`
- `sr.game_team_stats`
- `sr.game_player_stats`
- `sr.game_period_scores`
- `sr.pbp`

Keying examples:
- `sr.games`: `PRIMARY KEY (source_api, game_id)`
- `sr.game_team_stats`: `PRIMARY KEY (source_api, game_id, sr_team_id)`
- `sr.game_player_stats`: `PRIMARY KEY (source_api, game_id, sr_id)`
- `sr.pbp`: `PRIMARY KEY (source_api, game_id)`

#### Phase 3 — standings + injuries

- `sr.standings`
- `sr.rankings`
- `sr.injuries`

#### Phase 4 — season statistics + splits

- `sr.season_team_statistics`
- `sr.season_player_statistics`
- `sr.season_team_splits`
- `sr.season_player_splits`

Important: these require partial unique indexes for `series_id IS NULL` vs `IS NOT NULL`.
Include `source_api` in those indexes.

#### Phase 5 — postseason structures

- `sr.series` (NBA/G League)
- `sr.tournaments`, `sr.tournament_teams` (NCAA)

#### Phase 6 — leaders + draft

- `sr.league_leaders`
- `sr.draft`

#### Phase 7 — INTL hierarchy

- `sr.competitions`
- `sr.season_stages`
- `sr.season_groups`

### 2.4 Indexing guidance (minimum viable)

Create indexes that match likely UI/analyst access:

- `sr.games`:
  - `(source_api, scheduled_at)`
  - `(source_api, season_id)`
  - `(source_api, home_sr_team_id)`
  - `(source_api, away_sr_team_id)`

- `sr.players`:
  - `(source_api, reference)` (NBA id / Elias id joins)
  - `(source_api, sr_team_id)`

- `sr.pbp`:
  - `(source_api, game_id)` is already the PK; consider `BRIN` on scheduled date via join if needed later.

### 2.5 Foreign keys

Because we’re using composite PKs, true FK enforcement becomes heavier (composite FKs everywhere).

Recommendation for v1:
- **Do not enforce FKs initially** (keep the ingest resilient).
- Use indexes + not-null constraints where appropriate.
- Add FKs later once the ingest is stable.

---

## 3) Windmill flow implementation

### 3.1 Target layout (mirror PCMS)

Create at repo root (sibling of `import_pcms_data.flow/`):

```
import_sr_data.flow/
  flow.yaml
  sr_fetch.py                              # shared HTTP helpers
  sr_extract.py                            # shared normalization helpers
  upsert_seasons.inline_script.py
  upsert_teams.inline_script.py
  upsert_players.inline_script.py
  upsert_games.inline_script.py
  upsert_game_stats.inline_script.py
  upsert_pbp.inline_script.py
  ...
scripts/
  test-sr-import.py                        # local runner
```

`flow.yaml` should include:
- `same_worker: true`

### 3.2 Flow inputs (recommended)

- `dry_run: boolean` (default false)
- `source_api: enum('nba','ncaa','gleague','intl')` (default 'nba')
- `mode: enum('daily','backfill')` (default 'daily')
- `date: string` (YYYY-MM-DD; required for daily)
- `season_year: int` + `season_type: string` (required for backfill)
- `include_pbp: boolean` (default true)
- `locale: string` (default 'en')
- `max_concurrency: int` (default ~5–10)

### 3.3 Fetch strategy (per step)

Each upsert script:

1) Build a request plan (what to fetch) based on inputs.
2) Fetch HTTP JSON with:
   - retries for 5xx/timeouts
   - backoff for 429
   - bounded concurrency
3) Normalize payloads into row dicts (snake_case ids, ISO timestamps, etc.).
4) UPSERT directly (no staged JSON files).

Base URLs (from `sr/api/*.txt`):
- nba: `https://api.sportradar.com/nba/trial/v8`
- gleague: `https://api.sportradar.com/nbdl/trial/v8`
- ncaa: `https://api.sportradar.com/ncaamb/trial/v8`
- intl: `https://api.sportradar.com/basketball/trial/v2`

Auth:
- Always pass `api_key=$SPORTRADAR_API_KEY` as a query param.

### 3.4 UPSERT steps

Each step:
- fetches the endpoint(s) it needs
- normalizes lightly (type coercion)
- UPSERTs with conflict targets that include `source_api`

Derived fields (calculate during ingest):
- `fg2m = fgm - fg3m`
- `fg2a = fga - fg3a`
- `fg2_pct = fg2m / NULLIF(fg2a, 0)`
- `seconds_played` from `minutes` (`MM:SS`)

### 3.5 P0 vertical slice (implement first)

Goal: prove the whole pipeline with NBA only.

Daily mode request plan:
1) Daily Schedule: `/en/games/:year/:month/:day/schedule.json`
2) For each `game_id`:
   - Game Summary or Boxscore: `/en/games/:game_id/summary.json` (or boxscore)
   - PBP: `/en/games/:game_id/pbp.json` (if `include_pbp`)

Also fetch once per run:
- Seasons: `/en/league/seasons.json`
- League hierarchy / teams:
  - NBA: `/en/league/hierarchy.json`
  - NCAA/G League: `/en/league/teams.json`

Acceptance:
- Re-running the same day is idempotent.

### 3.6 P1 (incremental updates)

After P0 works:
- Implement Daily Change Log as the driver:
  - NBA: `/en/league/:year/:month/:day/changes.json`
- Convert changed IDs into fetch queues for:
  - game summary/boxscore refresh
  - pbp refresh
  - player/team refresh
  - standings refresh

---

## 4) Local development tooling (copy PCMS ergonomics)

Create `scripts/test-sr-import.py` similar to `../scripts/test-import.py`.

Example CLI:

```bash
# run a single upsert step (fetches directly)
uv run scripts/test-sr-import.py games --dry-run
uv run scripts/test-sr-import.py games --write

# run the whole pipeline
uv run scripts/test-sr-import.py all --write
```

Optional (high leverage):
- Add a script to extract fixtures from `sr/samples/postman.sql.txt` so parsers can be built without live API calls.

---

## 5) Validation queries (post-ingest)

```sql
-- games per source
SELECT source_api, COUNT(*) FROM sr.games GROUP BY 1;

-- sample: today’s games
SELECT source_api, scheduled_at::date, COUNT(*)
FROM sr.games
GROUP BY 1, 2
ORDER BY 2 DESC;

-- pbp coverage
SELECT source_api, COUNT(*) FROM sr.pbp GROUP BY 1;

-- players by source
SELECT source_api, COUNT(*) FROM sr.players GROUP BY 1;
```

---

## 6) Handoff checklist (do these in order)

1) **Write migrations** (Phase 1 + Phase 2 minimum) using composite keys with `source_api`.
2) Create `import_sr_data.flow/flow.yaml` with `same_worker: true`.
3) Implement shared helpers: `sr_fetch.py` (HTTP/retries) + `sr_extract.py` (normalization).
4) Implement upsert steps for: seasons, teams, players, games, game stats, pbp (each fetches directly).
5) Add `scripts/test-sr-import.py` local runner.
6) Run P0 for one date; re-run to ensure idempotency.
7) Only then expand to change log + other tables.

---

## 7) Notes / known tricky parts

- NCAA period semantics (halves vs quarters): store raw in JSON and map period scores carefully.
- PBP payload size: start with JSONB-per-game; do not normalize events until we have real query needs.
- Cross-league identity: the same human can appear in multiple `source_api`s. Keep them separate in v1; add a crosswalk table later if needed.
