# AGENTS.md — SportRadar (sr)

## Purpose

The `sr/` directory is for working with **SportRadar APIs** and designing a new Postgres schema named `sr`.

This folder contains:
- `sr/api/` — Postman-exported API collections (endpoint inventory)
- `sr/samples/` — legacy SQL dump showing example SportRadar JSON payloads
- `sr/schema/` — table specs (design docs, not migrations yet)
- `sr/inspiration/` — exemplary data-dense UI patterns (the schema should make building these easy)
- `sr/gaps/` — audit / gap notes

The intent is to build **wide, useful, UPSERT-friendly tables** that make it trivial to power data-dense UIs like the examples in `sr/inspiration/`.

## V1 Scope

Focus only on these SportRadar basketball collections:
- `nba`
- `ncaa`
- `gleague`
- `intl`

Other collections may exist in `sr/api/`, but they are out of scope unless explicitly promoted.

## Non-Negotiable Design Principles

1. **Prefer tables + UPSERTs over views**
   - Avoid complicated VIEW stacks.
   - Target stable `PRIMARY KEY` / `UNIQUE` constraints for `ON CONFLICT` UPSERTs.
   - Tables unlock indexing and predictable performance.

2. **Prefer wide, analyst-friendly tables over perfect normalization**
   - Duplication is acceptable when it makes querying easier.
   - Don’t explode every nested object into its own table by default.

3. **JSONB is allowed when it prevents premature schema explosion**
   - Especially for Play-by-Play (PBP) / event streams.
   - Store PBP per game as JSONB first, then derive additional tables later if/when needed.

4. **One table per endpoint family (by default)**
   - Examples: schedule, boxscore, game summary, injuries, standings, draft.
   - Don’t create a new table for every micro-variant of an endpoint unless it’s truly different.

## Schema Naming + Conventions

- Postgres schema name: `sr`
- Table and column names: `snake_case`
- IDs: use `*_id` (e.g., `team_id`, `game_id`)
- **SportRadar IDs:** use `sr_id` as the primary identifier for SportRadar's internal UUIDs for players, and `sr_team_id` for teams. 
  - In the `players` table: `player_id` becomes `sr_id`.
  - In the `teams` table: `team_id` becomes `sr_team_id`.
  - Foreign keys should follow this: e.g., `sr_team_id` in the `players` table.
- Booleans: use `is_*`
- Prefer `timestamptz` for timestamps
- Prefer `text` for SportRadar UUIDs unless we standardize on `uuid`

### Multi-league keying (important)

SportRadar identifiers are *usually* globally unique, but to keep ingestion safe across
NBA/NCAA/G League/INTL we treat `source_api` as part of identity:

- Prefer composite primary keys like `PRIMARY KEY (source_api, sr_id)` / `PRIMARY KEY (source_api, game_id)`.
- Use conflict targets that include `source_api` in all UPSERTs.
- If league-specific names are desired, add thin views like `sr.nba_games`.

### Statistical Column Naming

Use short, standard abbreviations for statistics to keep wide tables readable:

- **Field Goals:** `fgm`, `fga`, `fg_pct`, `fg3m`, `fg3a`, `fg3_pct`, `fg2m`, `fg2a`, `fg2_pct`
- **Free Throws:** `ftm`, `fta`, `ft_pct`
- **Rebounds:** `oreb`, `dreb`, `reb`
- **Advanced:** `efg_pct`, `ts_pct`, `ts_att`
- **Other:** `ast`, `stl`, `blk`, `tov`, `pf`, `pts`

**Note on Calculated Fields:**
Even if the SportRadar API only provides `fgm`/`fga` and `fg3m`/`fg3a`, we should calculate and store:
- `fg2m` (`fgm - fg3m`)
- `fg2a` (`fga - fg3a`)
- `fg2_pct` (`fg2m / fg2a` where `fg2a > 0`)

## PBP (Play-by-Play) Guidance

PBP/event endpoints can produce massive data. The default approach:
- Store **one row per game per endpoint-family** with a `pbp_json jsonb` column.
- Extract commonly queried rollups into scalar columns (game_id, status, updated timestamps, etc.).
- Only create per-event tables after we’re confident we need them.

## Table Spec Format (`sr/schema/*.txt`)

These are design specs (not migrations). Use this format:

- Start with: `### <table_name>`
- Then a bullet list of columns:
  - `- column_name type [constraints/defaults]`
- Explicitly document `PRIMARY KEY` / `UNIQUE` constraints.
- Add short notes at the end for assumptions and mapping decisions.

## Agent

The schema-design agent lives at `agents/sr.ts`.

- Task file: `.ralph/SR.md`
- Output: `sr/schema/*.txt`

Run it with:
- `bun agents/sr.ts`
- Optional: `bun agents/sr.ts -c "NBA schedule + boxscore first"`
