# AGENTS.md - NBA (nba)

## Purpose

The `nba/` directory is for working with **official NBA data** (via the NBA Developer Portal APIs in `nba/api/nba-*.txt`) and the legacy **NGSS** feeds (`nba/api/ngss.txt`) when NGSS still provides fields the newer APIs do not.

The intent is to design a Postgres schema named `nba` that supports data-dense, analyst-friendly queries and UIs.

This folder contains:
- `nba/api/` - OpenAPI specs for NBA endpoints
- `nba/schema/` - table specs (design docs, not migrations yet)
- `nba/samples/` - example API payloads
- `nba/inspiration/` - UI patterns from other sites the schema should support

## V1 Scope

Focus on:
- The "new" official NBA APIs in `nba/api/nba-*.txt`
- The legacy NGSS APIs in `nba/api/ngss.txt` (still used when they contain critical missing fields)

## Non-Negotiable Design Principles

1. **Prefer tables + UPSERTs over views**
   - Avoid complicated VIEW stacks.
   - Target stable `PRIMARY KEY` / `UNIQUE` constraints for `ON CONFLICT` UPSERTs.

2. **Prefer wide, analyst-friendly tables over perfect normalization**
   - Duplication is acceptable when it makes querying easier.
   - Don't explode every nested object into its own table by default.

3. **JSONB is allowed when it prevents premature schema explosion**
   - Especially for Play-by-Play / event streams.
   - Default: store one row per game per endpoint-family with a `*_json jsonb` column.

4. **Official NBA identity is the backbone**
   - Players use `nba_id` as the primary identifier.
   - Teams use `team_id` as the primary identifier.
   - Other systems' IDs (including NGSS) should be stored as additional columns when needed (e.g., `ngss_player_id`, `ngss_team_id`).

5. **NGSS tables are explicitly prefixed**
   - If a table's payloads primarily come from NGSS (or exist because NGSS has unique fields), name the table with an `ngss_` prefix.
   - These `ngss_*` tables still live inside the Postgres schema `nba`.

## Schema Naming + Conventions

- Postgres schema name: `nba`
- Table and column names: `snake_case`
- IDs:
  - teams: `team_id`
  - players: `nba_id`
  - games: `game_id` (when provided by official NBA endpoints)
- Booleans: use `is_*`
- Prefer `timestamptz` for timestamps
- Prefer `text` for externally provided IDs unless we standardize on `uuid`

### Statistical Column Naming

Use short, standard abbreviations for statistics to keep wide tables readable:

- **Field Goals:** `fgm`, `fga`, `fg_pct`, `fg3m`, `fg3a`, `fg3_pct`, `fg2m`, `fg2a`, `fg2_pct`
- **Free Throws:** `ftm`, `fta`, `ft_pct`
- **Rebounds:** `oreb`, `dreb`, `reb`
- **Advanced:** `efg_pct`, `ts_pct`, `ts_att`
- **Other:** `ast`, `stl`, `blk`, `tov`, `pf`, `pts`

**Note on Calculated Fields:**
Even if the source API only provides `fgm`/`fga` and `fg3m`/`fg3a`, we should calculate and store:
- `fg2m` (`fgm - fg3m`)
- `fg2a` (`fga - fg3a`)
- `fg2_pct` (`fg2m / fg2a` where `fg2a > 0`)

## Operational Timestamps (Allowed)

We *do* include lightweight operational timestamps on `nba` schema tables to support "always UPSERT" ingestion and freshness checks:

- `created_at timestamptz`
- `updated_at timestamptz`
- `fetched_at timestamptz` (when the upstream payload backing the row was fetched)

We still avoid heavier provenance / dedupe patterns like `source_*` columns or `*_hash` / `source_hash`.

## Play-by-Play (PBP) Guidance

- The new NBA APIs may provide PBP, but NGSS may still have critical additional fields (e.g., challenge context, officials attribution, "who called it" details).
- Default approach:
  - Store **one row per game** for each PBP source (official vs NGSS), using JSONB (e.g., `pbp_json`, `ngss_pbp_json`).
  - Extract commonly queried rollups into scalar columns (period, clock, score, action_type, etc.) only when stable and clearly useful.
  - Only create per-event tables after we're confident we need them.

## Table Spec Format (`nba/schema/*.txt`)

These are design specs (not migrations). Use this format:

- Start with: `### <table_name>`
- Then a bullet list of columns:
  - `- column_name type [constraints/defaults]`
- Explicitly document `PRIMARY KEY` / `UNIQUE` constraints.
- Add short notes at the end for assumptions and mapping decisions.

## Agent

The schema-design agent lives at `agents/nba.ts`.

- Task file: `.ralph/NBA.md`
- Output: `nba/schema/*.txt`

Run it with:
- `bun agents/nba.ts`
- Optional: `bun agents/nba.ts -c "NBA games + boxscore + (NGSS) pbp first"`
