# AGENTS.md — `import_sr_data.flow/`

This directory is the **Windmill flow** that imports **SportRadar** data into Postgres (schema: `sr`).

It contains:
- Windmill inline scripts (`upsert_*.inline_script.py`)
- Shared helpers used by those scripts:
  - `sr_fetch.py` (HTTP + retry/concurrency + URL builders)
  - `sr_extract.py` (payload → row extraction helpers)

---

## Requirements

Environment variables:
- `POSTGRES_URL` — destination database
- `SPORTRADAR_API_KEY` — required; used as the `api_key` query param

SportRadar base URLs are defined in `sr_fetch.py`:
- `nba`, `ncaa`, `gleague`, `intl` (note the different API versions)

---

## Flow structure (`flow.yaml`)

All steps are raw Python inline scripts. The major ones:

- `upsert_seasons.inline_script.py` → `sr.seasons`
- `upsert_teams.inline_script.py` → `sr.teams` (or hierarchy payloads)
- `upsert_players.inline_script.py` → `sr.players`
- `upsert_games.inline_script.py` → `sr.games` (schedule + per-game summary)
- `upsert_game_stats.inline_script.py` → `sr.game_team_stats`, `sr.game_player_stats`, `sr.game_period_scores`
- `upsert_pbp.inline_script.py` → `sr.pbp`
- `upsert_standings.inline_script.py` → `sr.standings`
- `upsert_rankings.inline_script.py` → `sr.rankings`
- `upsert_injuries.inline_script.py` → `sr.injuries`
- `upsert_season_stats.inline_script.py` → `sr.season_team_statistics`, `sr.season_player_statistics`
- `upsert_season_splits.inline_script.py` → `sr.season_team_splits`, `sr.season_player_splits`
- `upsert_series.inline_script.py` → `sr.series`
- `upsert_tournaments.inline_script.py` → `sr.tournaments`, `sr.tournament_teams`
- `upsert_leaders.inline_script.py` → `sr.league_leaders`
- `upsert_draft.inline_script.py` → draft-related tables (SportRadar draft API)
- `upsert_intl_hierarchy.inline_script.py` → intl competition/stage/group tables

Common parameters:
- `source_api`: `nba` (default), `ncaa`, `gleague`, `intl`
- `mode`: `daily` (by date) or `backfill` (by season)
- `date` (YYYY-MM-DD) for daily
- `season_year` + `season_type` for backfill
- `locale` (default `en`)
- `max_concurrency` (default 6)

---

## Running locally

Use the dedicated local runner:

```bash
# default is dry-run
uv run scripts/test-sr-import.py games --source-api nba --date 2026-01-28

# run everything (writes)
uv run scripts/test-sr-import.py all --write

# backfill by season
uv run scripts/test-sr-import.py standings \
  --mode backfill \
  --season-year 2025 \
  --season-type REG \
  --write
```

Notes:
- `scripts/test-sr-import.py` adds `import_sr_data.flow/` to `sys.path` so inline scripts can import `sr_fetch` / `sr_extract`.

---

## Debugging tips

- If you see errors about missing params, check `sr_fetch.build_schedule_url()` — daily vs backfill have different required inputs.
- `429` rate limits are retried using `Retry-After` when present.
- When payload shapes differ across `source_api` variants, prefer fixing the extractor functions in `sr_extract.py`.

See also:
- `sr/AGENTS.md` — schema design + implementation plan
