# DUCKDB_MIGRATION.md - Migrating `import_pcms_data.flow` to Windmill DuckDB (Consolidated)

## Goal

Keep **Step A (lineage)** exactly as-is (Bun):

> S3 ZIP → extract XML → parse → **clean JSON** (snake_case keys, real nulls, flattened arrays)

Then migrate the JSON→Postgres phase (everything after lineage; i.e. the current set of import steps in `import_pcms_data.flow/flow.yaml`) to **Windmill DuckDB scripts** that:

1. **Read the clean JSON files** produced by Step A (hard-coded paths)
2. Do the *remaining* data munging in SQL (casts, filters, dedupe, joins for `team_code`, flatten nested arrays)
3. **Upsert into Postgres** (idempotent, retryable)
4. Return consistent per-step summaries for the final "Finalize lineage" step.

This document is intentionally pragmatic: it's "how I'd attack it" given what we already learned from the current Bun scripts.

---

## Windmill DuckDB Script Syntax (from `duckdb_test.flow`)

Windmill DuckDB scripts have specific conventions for parameters, resources, and result collection:

```sql
-- result_collection=last_statement_all_rows
-- $name (text) = Ben
-- $age (text) = 20

ATTACH '$res:f/env/postgres' AS db (TYPE postgres);

CREATE TABLE friends (
  name text,
  age int
);

INSERT INTO friends VALUES ($name, $age);

SELECT * FROM friends;

SELECT * FROM db.pcms.lookups LIMIT 5;
```

**Key patterns:**

| Pattern | Example | Notes |
|---------|---------|-------|
| Result collection | `-- result_collection=last_statement_all_rows` | Header directive |
| Parameter declaration | `-- $name (text) = Ben` | Default value after `=` |
| Parameter usage | `$name`, `$age` | Use `$` prefix in SQL |
| Attach Postgres resource | `ATTACH '$res:f/env/postgres' AS db (TYPE postgres);` | Uses Windmill resource path |
| Access attached table | `db.pcms.lookups` | Schema: `alias.schema.table` |

**Note:** We prefer **hard-coded paths** for JSON files (not variables) since the lineage step always writes to the same location.

---

## Why DuckDB for the post-lineage import steps

We've already done the hard part: **clean once** during XML parsing.

The remaining import work is mostly:
- reading large JSON arrays (transactions ~232k)
- type coercion
- occasional filtering (`ledger.team_id IS NOT NULL`)
- dedupe to avoid `ON CONFLICT ... cannot affect row a second time`
- flattening nested arrays (contracts)
- bulk upsert plumbing

DuckDB is a better fit because it:
- streams/parallelizes JSON reads
- does vectorized transforms
- can attach Postgres and bulk insert
- makes "munging" expressible and testable as SQL

---

## Windmill DuckDB constraints / assumptions

These scripts will run as **Windmill DuckDB** steps, meaning:

- **Parameters** are declared in comments and referenced with `$variable_name`:
  ```sql
  -- $dry_run (boolean) = false
  -- $batch_size (integer) = 500
  ```
- **Postgres resources** are attached via Windmill resource paths (not raw connection strings):
  ```sql
  ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);
  ```
- The lineage step uses `same_worker: true` semantics and writes to a shared directory (`./shared/pcms/...`). DuckDB steps must run on the same worker and read from that same filesystem path.
- DuckDB extensions are **auto-loaded** in Windmill-no need for `INSTALL`/`LOAD` statements.
- Use `-- result_collection=last_statement_all_rows` to return all rows from the final SELECT.

---

## Current flow inventory (context)

As of now, the Bun flow has **19 steps** after lineage (A):

| Step | Summary | Source JSON | Tables |
|------|---------|-------------|--------|
| `b` | Players/people | `players.json` | `pcms.people` |
| `r` | Generate NBA draft picks | `players.json` | `pcms.draft_picks` |
| `c` | Contracts (+ versions/bonuses/salaries) | `contracts.json` | `pcms.contracts`, `contract_versions`, `salaries` |
| `d` | Team exceptions | `team_exceptions.json` | `pcms.team_exceptions`, `team_exception_usage` |
| `e` | Trades/transactions/ledger | `trades.json`, `transactions.json`, `ledger.json` | `pcms.trades`, `transactions`, `ledger_entries` |
| `f` | System values / rookie scale / NCA | `yearly_system_values.json`, etc. | `pcms.league_system_values`, `rookie_scale_amounts` |
| `g` | Two-way daily statuses | `two_way.json` | `pcms.two_way_daily_statuses` |
| `h` | Draft picks (DLG/WNBA) | `draft_picks.json` | `pcms.draft_picks` |
| `q` | Draft pick summaries | `draft_pick_summaries.json` | `pcms.draft_pick_summaries` |
| `i` | Team budgets | `team_budgets.json` | `pcms.team_budget_snapshots`, `tax_team_status` |
| `j` | Waiver priority & ranks | `waiver_priority.json` | `pcms.waiver_priority_ranks` |
| `k` | Lookups | `lookups.json` | `pcms.lookups`, `pcms.teams` |
| `m` | Agents/agencies | `lookups.json` | `pcms.agencies`, `pcms.agents` |
| `n` | Transaction waiver amounts | `transaction_waiver_amounts.json` | `pcms.transaction_waiver_amounts` |
| `o` | League salary scales/protections | `yearly_salary_scales.json` | `pcms.league_salary_scales` |
| `p` | Two-way utility | `two_way_utility.json` | `pcms.two_way_contract_utility`, `two_way_game_utility` |
| `s` | Team transactions | `team_transactions.json` | `pcms.team_transactions` (80,130 records) |
| `l` | Finalize lineage | — | Aggregates results from all steps |

For the DuckDB migration we don't need to preserve this exact step granularity—we can consolidate to fewer domain steps.

---

## Proposed "consolidated" DuckDB step layout

We should consolidate by **domain** (same idea as `CONSOLIDATE.md`), but now each domain becomes a **DuckDB SQL script**.

Recommended steps (6 scripts + finalize):

1. **People + identity**
   - Upsert: `pcms.people`, `pcms.agencies`, `pcms.agents`
   - Source: `players.json`, `lookups.json` (and whatever "agents/agencies" JSON the lineage step emits)

2. **Draft assets**
   - Upsert: `pcms.draft_picks`, `pcms.draft_pick_summaries`
   - Includes: generating NBA draft picks from `players.json` (because PCMS `draft_picks.json` is DLG/WNBA only)

3. **Contracts + exceptions**
   - Upsert: `pcms.contracts`, `pcms.contract_versions`, `pcms.salaries`, bonuses, payment schedules, protections
   - Upsert: team exception tables (today's step `d`)
   - Sources: `contracts.json`, `team_exceptions.json`

4. **Transactions / trades / ledger (big tables)**
   - Upsert: `pcms.trades`, `pcms.trade_teams`, `pcms.trade_team_details`, `pcms.trade_groups`, `pcms.transactions`, `pcms.ledger_entries`, `pcms.transaction_waiver_amounts`
   - Sources: `trades.json`, `transactions.json`, `ledger.json`, `transaction_waiver_amounts.json`
   - Note: this becomes the *only* home for waiver amounts (avoid the current duplication across steps).

5. **League configuration (system values / scales / NCA / protections)**
   - Upsert: `pcms.league_system_values`, `pcms.rookie_scale_amounts`, `pcms.non_contract_amounts`, salary scales, cap projections, protections
   - Sources: `yearly_system_values.json`, `rookie_scale_amounts.json`, `non_contract_amounts.json`, `yearly_salary_scales.json`, `cap_projections.json`

6. **Team financials (budgets / tax / waiver priority / transactions)**
   - Upsert: `pcms.team_budget_snapshots`, `pcms.team_tax_summary_snapshots`, `pcms.tax_team_status`, `pcms.league_tax_rates`, `pcms.waiver_priority_ranks`, `pcms.team_transactions`
   - Sources: `team_budgets.json`, `tax_rates.json`, `tax_teams.json`, `waiver_priority.json`, `team_transactions.json`
   - Note: `team_transactions.json` has 80,130 cap hold adjustment records (now imported via step `s`)

7. **Two-way (daily statuses + utility)**
   - Upsert: `pcms.two_way_daily_statuses`, plus utility/capacity tables
   - Sources: `two_way.json`, `two_way_utility.json`

8. **Finalize lineage (optional to migrate)**
   - Either keep the existing Bun `finalize_lineage.inline_script.ts` or replace it with a DuckDB step that aggregates results.

---

## Shared SQL patterns we'll reuse everywhere

### 1) Hard-code the "base dir" convention (don't rediscover it in DuckDB)

For Windmill DuckDB scripts, I would **not** re-implement the Bun "find subdir" logic.

Instead, I would **hard-code the convention** and design the flow around it:

- Step A (lineage) writes the clean JSON outputs into **one fixed folder** on the worker filesystem:
  - `./shared/pcms/current/`
  - (delete/recreate each run)
- All DuckDB steps read from that folder.
- We do **not** pass `extract_dir` around at all.

In SQL, that means every script uses the same base path:

```sql
-- Convention: clean JSON always lives here in Windmill
-- (no directory probing, no subdir logic)
WITH base AS (SELECT './shared/pcms/current' AS base_dir)
SELECT *
FROM base, read_json_auto(base.base_dir || '/players.json');
```

If you want local dev, mirror the same layout (e.g. copy `.shared/nba_pcms_full_extract/*` → `./shared/pcms/current/*`), so scripts run unchanged.

### 2) Standard team_id → team_code mapping

All the current Bun scripts build a team map from `lookups.json`.

In DuckDB we'll do the same once per script (using hard-coded path):

```sql
-- Create team lookup view (hard-coded path to lookups.json)
CREATE OR REPLACE TEMP VIEW v_teams AS
SELECT
  team_id::BIGINT AS team_id,
  COALESCE(team_code, team_name_short)::VARCHAR AS team_code
FROM read_json_auto('./shared/pcms/current/lookups.json')
-- lookups.json is grouped; lk_teams.lk_team is nested
, UNNEST(lk_teams.lk_team) AS t(team)
-- Depending on read_json_auto's inference, you may need json extraction instead.
;
```

Pragmatic alternative (more robust across schema inference changes):
- Read `lookups.json` as JSON
- Use `json_each` / `json_extract` to explicitly pull `lk_teams.lk_team`

(See `docs/duckdb-json.md` for JSON extraction functions.)

### 3) Type coercion rules

Replace TS helpers (`toIntOrNull`, `normalizeVersionNumber`, etc.) with SQL:

- Integers:
  - `TRY_CAST(value AS INTEGER)` (returns NULL instead of error)
  - `NULLIF(value, '')::INTEGER`
- Dates:
  - `TRY_CAST(value AS DATE)` if it's already `YYYY-MM-DD`
  - For timestamps: `TRY_CAST(value AS TIMESTAMP)` then `CAST(... AS DATE)`
- Version numbers like `1.01 → 101`:
  - `CASE WHEN value IS NULL THEN NULL WHEN value = floor(value) THEN value::INTEGER ELSE ROUND(value * 100)::INTEGER END`

### 4) De-dupe before upsert

Any time we might insert duplicates in a single statement (common in lookups, generated picks, ledger batches), dedupe in DuckDB first.

Pattern:

```sql
WITH src AS (
  SELECT * FROM ...
),
ranked AS (
  SELECT
    *,
    ROW_NUMBER() OVER (PARTITION BY conflict_key_1, conflict_key_2 ORDER BY record_changed_at DESC NULLS LAST) AS rn
  FROM src
)
SELECT * FROM ranked WHERE rn = 1;
```

This is the SQL equivalent of "Map keep last occurrence".

---

## Upsert strategy into Postgres (Windmill DuckDB)

There are **two viable approaches**. I'd start with A, and keep B as the fallback if we hit limitations.

### A) Direct `INSERT ... ON CONFLICT` into attached Postgres

This is the cleanest if supported by the postgres extension for your use-case.

```sql
-- Attach using Windmill resource path
ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);

INSERT INTO pg.pcms.people BY NAME (
  SELECT ... FROM read_json_auto('./shared/pcms/current/players.json')
)
ON CONFLICT (person_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = EXCLUDED.updated_at,
  ingested_at = EXCLUDED.ingested_at;
```

Notes:
- Use `BY NAME` to reduce column-order footguns.
- Always include `ingested_at = now()` (or a passed-in `$ingested_at`).
- Resource path format: `$res:f/env/postgres` (or `$res:u/username/resource_name`)

### B) Stage table in Postgres + upsert with `postgres_execute`

If "direct ON CONFLICT" is not supported (or is slow), do:

1. Create a staging table in Postgres (unlogged), load it via DuckDB
2. Execute a native Postgres upsert from stage → target
3. Drop stage

Sketch:

```sql
ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);

-- 1) Stage (created in Postgres)
CREATE TABLE pg.pcms_stage_people AS
SELECT ... FROM read_json_auto('./shared/pcms/current/players.json');

-- 2) Upsert natively in Postgres
SELECT * FROM postgres_execute(
  'pg',
  $$
  INSERT INTO pcms.people ( ... )
  SELECT ... FROM pcms_stage_people
  ON CONFLICT (person_id) DO UPDATE SET ...;
  $$
);

-- 3) Cleanup
DROP TABLE pg.pcms_stage_people;
```

This requires:
- privilege to create/drop tables
- (ideally) a dedicated staging schema like `pcms_stage`

---

## How each consolidated DuckDB script should look (template)

Windmill needs each step to return something consistent. DuckDB scripts can end with a `SELECT` that returns a single row summary.

Recommended "shape" (1 row):
- `dry_run` boolean
- `step` string
- `source_files` list
- `attempted_rows` map-ish (or separate columns)
- `started_at`, `finished_at`
- `errors` list/string

Example skeleton:

```sql
-- result_collection=last_statement_all_rows
-- $dry_run (boolean) = false

-- Attach Postgres via Windmill resource
ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);

-- Set timezone
SET TimeZone='UTC';

-- 1) Read + transform into temp views/tables (hard-coded path)
CREATE OR REPLACE TEMP VIEW v_src AS
SELECT *
FROM read_json_auto('./shared/pcms/current/players.json');

-- 2) Dry run vs write
-- For dry_run, we skip the INSERT and just return counts.
-- DuckDB doesn't have IF/ELSE, so handle via:
--   a) Two separate scripts (dry_run vs import)
--   b) Use CASE or conditional CTEs
--   c) Always insert, but use a staging table that gets rolled back

-- 3) Insert (when not dry_run)
INSERT INTO pg.pcms.people BY NAME (
  SELECT * FROM v_src
)
ON CONFLICT (person_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  updated_at = EXCLUDED.updated_at;

-- 4) Emit summary (this is the result returned to Windmill)
SELECT
  $dry_run AS dry_run,
  'people_identity' AS step,
  (SELECT COUNT(*) FROM v_src) AS attempted_people_rows,
  now() AS finished_at;
```

In practice, if conditional execution is awkward, implement two scripts per step during migration:
- `*_dry_run.duckdb.sql` (read/transform/count)
- `*_import.duckdb.sql` (read/transform/write)

Then merge once stable.

---

## Domain plan details (what to port from existing Bun logic)

This section maps today's "known quirks" to DuckDB SQL solutions.

### 1) People + identity

**Sources**: `players.json`, `lookups.json`

**Munging**:
- `player_id` → `person_id`
- cast numeric types safely
- populate `team_code` fields by joining on `team_id`

**Team code join**:

```sql
SELECT
  p.player_id AS person_id,
  p.team_id::BIGINT AS team_id,
  t.team_code AS team_code,
  ...
FROM read_json_auto('./shared/pcms/current/players.json') p
LEFT JOIN v_teams t ON t.team_id = p.team_id::BIGINT;
```

### 2) Draft assets

**Sources**: `draft_picks.json`, `draft_pick_summaries.json`, `players.json`, `lookups.json`

**Key behavior to keep**:
- PCMS `draft_picks.json` does *not* include NBA picks → generate historical NBA picks from player draft fields.
- Deduplicate generated picks by `(draft_year, round, pick_number_int, league_lk)`.

**NBA pick generation (DuckDB sketch)**:

```sql
WITH nba_players AS (
  SELECT *
  FROM read_json_auto('./shared/pcms/current/players.json')
  WHERE league_lk = 'NBA'
),
generated AS (
  SELECT
    (draft_year::INTEGER * 100000 + draft_round::INTEGER * 1000 + draft_pick::INTEGER) AS draft_pick_id,
    draft_year::INTEGER AS draft_year,
    draft_round::INTEGER AS round,
    CAST(draft_pick AS VARCHAR) AS pick_number,
    draft_pick::INTEGER AS pick_number_int,
    'NBA' AS league_lk,
    draft_team_id::BIGINT AS original_team_id,
    t.team_code AS original_team_code,
    draft_team_id::BIGINT AS current_team_id,
    t.team_code AS current_team_code,
    FALSE AS is_active,
    player_id::BIGINT AS player_id,
    now() AS ingested_at
  FROM nba_players p
  LEFT JOIN v_teams t ON t.team_id = p.draft_team_id::BIGINT
  WHERE draft_year IS NOT NULL AND draft_round IS NOT NULL AND draft_pick IS NOT NULL
),
deduped AS (
  SELECT * EXCLUDE(rn)
  FROM (
    SELECT *, ROW_NUMBER() OVER (
      PARTITION BY draft_year, round, pick_number_int, league_lk
      ORDER BY player_id DESC
    ) AS rn
    FROM generated
  )
  WHERE rn = 1
)
SELECT * FROM deduped;
```

### 3) Contracts

**Source**: `contracts.json` (nested)

**Known complexity**:
- contracts contain nested arrays: versions, salaries, bonuses, payment schedules, protections

**DuckDB approach**:
- read root contracts
- flatten nested arrays via `UNNEST`
- build separate rowsets per target table

Example flatten:

```sql
WITH c AS (
  SELECT * FROM read_json_auto('./shared/pcms/current/contracts.json')
),
versions AS (
  SELECT
    c.contract_id::BIGINT AS contract_id,
    v.version_id::BIGINT AS contract_version_id,
    -- ...
  FROM c
  CROSS JOIN UNNEST(c.versions) AS v
)
SELECT * FROM versions;
```

If `read_json_auto` doesn't infer nested types cleanly, use JSON functions:
- `json_extract` + `json_transform` to coerce nested arrays into `LIST<STRUCT(...)>`

(Reference: `docs/duckdb-json.md`.)

### 4) Trades / transactions / ledger

**Sources**: `trades.json`, `transactions.json`, `ledger.json`, `transaction_waiver_amounts.json`

**Known fixes to preserve**:
- ledger has ~15 rows with `team_id = null` → filter those out
- dedupe ledger by `transaction_ledger_entry_id` (prevents conflict-update double hit)
- join team codes in many places (`from_team_code`, `to_team_code`, etc.)

Ledger filter:

```sql
SELECT *
FROM read_json_auto('./shared/pcms/current/ledger.json')
WHERE team_id IS NOT NULL;
```

Deduping ledger:

```sql
WITH src AS (
  SELECT *
  FROM read_json_auto('./shared/pcms/current/ledger.json')
  WHERE team_id IS NOT NULL
),
deduped AS (
  SELECT * EXCLUDE(rn)
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (PARTITION BY transaction_ledger_entry_id ORDER BY record_change_date DESC NULLS LAST) AS rn
    FROM src
  )
  WHERE rn = 1
)
SELECT * FROM deduped;
```

### 5) Lookups

Even if we don't consolidate "lookups" as its own step, the *problem* remains:
- in-batch duplicates on `(lookup_type, lookup_code)`

In DuckDB, that becomes a simple dedupe with `ROW_NUMBER()` before upsert.

Also: post-migration teams should prefer `team_code` over `team_name_short`.

### 6) Two-way

**Source**: `two_way.json` contains some XML-ish nesting and hyphenated keys.

In Bun we already handle:
- `data.daily_statuses["daily-status"]` etc.

In DuckDB, the easiest path is:
- treat the file as JSON
- use `json_extract` to pull the right array
- `json_each` to turn it into rows
- `json_transform` to a typed struct

Sketch:

```sql
WITH raw AS (
  SELECT * FROM read_json_auto('./shared/pcms/current/two_way.json')
),
statuses_json AS (
  SELECT json_extract(raw.daily_statuses, '$."daily-status"') AS statuses
  FROM raw
),
rows AS (
  SELECT value AS status
  FROM statuses_json, json_each(statuses)
)
SELECT
  status->>'$.player_id' AS player_id,
  status->>'$.status_date' AS status_date,
  status->>'$.two_way_daily_status_lk' AS status_lk
FROM rows;
```

Then cast/clean and upsert.

### 7) Team Transactions (recently added)

**Source**: `team_transactions.json` (80,130 records)

This table was added in the coverage phase. Records are cap hold adjustments by team.

**JSON structure** (already clean):
```json
{
  "team_transaction_id": 11138,
  "team_id": 1610612761,
  "team_transaction_type_lk": "ADJCH",
  "team_ledger_seqno": 2,
  "transaction_date": "2012-07-17",
  "cap_adjustment": null,
  "cap_hold_adjustment": 1,
  "record_status_lk": "DEL",
  "create_date": "2015-01-22T16:18:25.367-05:00",
  "last_change_date": "2015-03-07T03:43:15.927-05:00"
}
```

**DuckDB sketch** (with team_code join):

```sql
SELECT
  t.team_transaction_id::INTEGER AS team_transaction_id,
  t.team_id::INTEGER AS team_id,
  teams.team_code AS team_code,           -- derived from lookups
  t.team_transaction_type_lk,
  t.team_ledger_seqno::INTEGER AS team_ledger_seqno,
  TRY_CAST(t.transaction_date AS DATE) AS transaction_date,
  t.cap_adjustment::BIGINT AS cap_adjustment,
  t.cap_hold_adjustment::INTEGER AS cap_hold_adjustment,
  t.tax_adjustment::BIGINT AS tax_adjustment,
  t.tax_apron_adjustment::BIGINT AS tax_apron_adjustment,
  t.mts_adjustment::BIGINT AS mts_adjustment,
  t.protection_count_flg::BOOLEAN AS protection_count_flg,
  t.comments,
  t.record_status_lk,
  TRY_CAST(t.create_date AS TIMESTAMP) AS created_at,
  TRY_CAST(t.last_change_date AS TIMESTAMP) AS updated_at,
  TRY_CAST(t.record_change_date AS TIMESTAMP) AS record_changed_at,
  now() AS ingested_at
FROM read_json_auto('./shared/pcms/current/team_transactions.json') t
LEFT JOIN v_teams teams ON teams.team_id = t.team_id::BIGINT
WHERE t.team_transaction_id IS NOT NULL;
```

**Note**: This is a good candidate for the "team_financials" consolidated DuckDB script since it relates to cap adjustments.

---

## Testing + validation plan

### 1) Start with "people" as the prototype

It's medium-sized (~14k) and has the team_code join pattern.

Validate:
- row counts
- spot-check a few IDs
- rerun idempotently (no duplicate growth)

### 2) Move to "transactions/ledger" last

That's where performance + conflict edge cases show up.

### 3) Use the existing checklist counts

From the current `.shared/nba_pcms_full_extract/`:

| JSON File | Record Count | Notes |
|-----------|--------------|-------|
| `players.json` | 14,421 | |
| `contracts.json` | 8,071 | Nested versions/salaries |
| `transactions.json` | 232,417 | Largest table |
| `ledger.json` | 50,713 | 15 null-team rows filtered → 50,698 |
| `trades.json` | 1,731 | |
| `draft_pick_summaries.json` | 450 | future >= 2026: 210 |
| `two_way_daily_statuses.json` | 28,659 | |
| `team_transactions.json` | 80,130 | Cap hold adjustments |

---

## Rollout phases (safe + reversible)

1. **Phase 0: add DuckDB scripts without removing Bun scripts**
   - Run DuckDB steps in parallel (dry-run only) to validate counts.

2. **Phase 1: replace small/medium imports**
   - People
   - Draft
   - Lookups (or embed lookups usage)

3. **Phase 2: replace nested imports**
   - Contracts
   - Two-way

4. **Phase 3: replace big imports**
   - Trades / transactions / ledger

5. **Phase 4: remove dead Bun scripts + simplify flow**

---

## Suggested file organization

Keep the current `import_pcms_data.flow/` directory, but add a new folder so the migration doesn't churn existing scripts until we're ready:

```
import_pcms_data_duckdb.flow/
  flow.yaml
  people_identity.inline_script.duckdb.sql      # Windmill naming convention
  draft_assets.inline_script.duckdb.sql
  contracts.inline_script.duckdb.sql
  transactions.inline_script.duckdb.sql
  league_config.inline_script.duckdb.sql
  team_financials.inline_script.duckdb.sql      # includes team_transactions
  two_way.inline_script.duckdb.sql
  finalize.inline_script.duckdb.sql (optional)
```

**Windmill flow.yaml reference (from `duckdb_test.flow`):**

```yaml
value:
  modules:
    - id: a
      summary: People Identity
      value:
        type: rawscript
        content: '!inline people_identity.inline_script.duckdb.sql'
        input_transforms:
          dry_run:
            type: javascript
            expr: flow_input.dry_run
        assets:
          - access_type: r
            kind: resource
            path: f/env/postgres/pcms.lookups    # Postgres resource
        lock: ''
        language: duckdb
```

This makes the migration reversible:
- old flow still exists
- new flow can be tested independently

---

## Open questions / decisions to make early

1. **Do we adopt the fixed base dir convention (`./shared/pcms/current/`) and update Step A to always write there?**
   - Recommended: yes. It removes all downstream path/plumbing complexity.
   - We prefer **hard-coded paths** over passing variables for JSON files.

2. **Which upsert strategy works best in Windmill's DuckDB runtime?**
   - Try direct `INSERT .. ON CONFLICT` first.
   - If it's unsupported, switch to stage+`postgres_execute`.
   - ✅ Confirmed: `ATTACH '$res:f/env/postgres' AS db (TYPE postgres)` works (see `duckdb_test.flow`).

3. **Do we want a "single mega-script" or domain scripts?**
   - Domain scripts are safer (smaller blast radius, easier retries).

4. **Do we keep `finalize_lineage` in Bun?**
   - Keeping it is fine; migrating it is optional.

5. **How do we handle dry_run in DuckDB?**
   - Options: two scripts per domain, or use conditional CTEs.
   - DuckDB doesn't have native IF/ELSE for DDL/DML.

---

## References

- `DUCKDB.md` (project plan + rationale)
- `CONSOLIDATE.md` (domain-based consolidation strategy)
- `docs/duckdb-json.md` (DuckDB JSON extraction + `json_transform` patterns)
- `duckdb_test.flow/` — Working Windmill DuckDB example with:
  - Parameter syntax (`-- $name (text) = Ben`)
  - Postgres attachment (`ATTACH '$res:f/env/postgres'`)
  - Result collection directive
- `.ralph/COVERAGE.md` — Recent coverage additions (team_transactions, etc.)
