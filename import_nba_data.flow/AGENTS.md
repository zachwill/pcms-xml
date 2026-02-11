# AGENTS.md — `import_nba_data.flow/`

This directory is the **Windmill flow** that imports data from the **official NBA API** (`https://api.nba.com/v0`) into Postgres (schema: `nba`).

This is separate from:
- `import_pcms_data.flow/` (PCMS XML ingest)
- `nba/` (schema design docs + API specs)

---

## Requirements

Environment variables:
- `POSTGRES_URL` — destination database
- `NBA_API_KEY` — sent as an `X-NBA-Api-Key` header on every request

Python dependencies are embedded per-script (via `# /// script` blocks), typically:
- `httpx`
- `psycopg[binary]`

---

## Flow structure (`flow.yaml`)

All steps are raw Python inline scripts:

- `teams.inline_script.py` → `nba.teams`
- `players.inline_script.py` → `nba.players`
- `schedules.inline_script.py` → `nba.schedules`
- `standings.inline_script.py` → `nba.standings`
- `games.inline_script.py` → `nba.games`, `nba.playoff_series`
- `game_data.inline_script.py` → per-game detail tables (boxscore/pbp/hustle/tracking/etc.)
- `aggregates.inline_script.py` → aggregated stats + lineup rollups
- `supplemental.inline_script.py` → injuries, alerts, pregame storylines, tracking streams
- `ngss.inline_script.py` → legacy NGSS endpoints (stored as `nba.ngss_*` tables)

Most scripts share the same parameter set (passed through from `flow_input`):
- `league_id` (default `00`)
- `season_label` (e.g. `2024-25`)
- `season_type` (e.g. `Regular Season`)
- `mode`: `refresh` (last N days) or `backfill` (explicit date range)
- `days_back`, `start_date`, `end_date`, `game_ids`
- `only_final_games`

The flow is intentionally configured to run the full pipeline (reference + games + game data + aggregates + supplemental + NGSS) each run.

---

## Running locally

Use the dedicated local runner:

```bash
# default is dry-run (no DB writes)
uv run scripts/test-nba-import.py teams

# backfill a small range (writes)
uv run scripts/test-nba-import.py games \
  --mode backfill \
  --start-date 2024-10-01 \
  --end-date 2024-10-02 \
  --write

# run everything (writes)
uv run scripts/test-nba-import.py all --write
```

Notes:
- The runner defaults to dry-run unless you pass `--write`.
- `mode=refresh` defaults to `--days-back 2`.

---

## Debugging tips

- Most fetch helpers retry on `429` and `5xx` responses.
- Many endpoints legitimately return `404` for missing game/date payloads; the scripts usually treat `404` as "no data".
- Before changing DB schema, confirm the upstream payload shape (log keys/sample rows).

See also:
- `nba/AGENTS.md` — schema design conventions + where the API specs live
- `scripts/test-nba-import.py` — canonical local invocation + flags
