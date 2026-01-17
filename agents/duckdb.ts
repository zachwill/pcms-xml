#!/usr/bin/env bun
import { loop, work, halt } from "./core";

/**
 * DuckDB Migration Agent
 * 
 * Creates DuckDB scripts to replace TypeScript import scripts.
 * Task list in .ralph/DUCKDB.md
 */

const WORK_PROMPT = `
You are migrating PCMS import scripts from TypeScript to Windmill DuckDB.

## Your Task
1. Read .ralph/DUCKDB.md for the current task
2. Pick the FIRST unchecked item and create that script

## Reference Files (READ THESE)

**Must read:**
- \`.ralph/DUCKDB.md\` — Task checklist with table/source mappings
- \`DUCKDB_MIGRATION.md\` — Migration plan, domain sketches
- \`SCHEMA.md\` — Postgres table definitions (columns, types, PKs)

**DuckDB patterns:**
- \`docs/duckdb-friendly.md\` — QUALIFY, FROM-first, EXCLUDE, trailing commas
- \`docs/duckdb-functions.md\` — Window functions, aggregates, date/string
- \`docs/duckdb-json.md\` — JSON reading, extraction, UNNEST

**Reference:**
- \`duckdb_test.flow/simple_duckdb_test.inline_script.duckdb.sql\` — Working example
- \`.shared/nba_pcms_full_extract/\` — Sample JSON data
- \`import_pcms_data.flow/*.ts\` — Existing TypeScript logic

## Script Template

\`\`\`sql
-- result_collection=last_statement_all_rows

ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);
SET TimeZone='UTC';

-- 1) Team lookup (reuse across scripts)
CREATE OR REPLACE TEMP VIEW v_teams AS
SELECT
  t.team_id::BIGINT AS team_id,
  COALESCE(t.team_code, t.team_name_short) AS team_code,
FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/lookups.json') AS lookups,
UNNEST(lookups.lk_teams.lk_team) AS t;

-- 2) Read + transform source JSON
CREATE OR REPLACE TEMP VIEW v_source AS
SELECT
  col::INTEGER AS col,
  TRY_CAST(date_col AS DATE) AS date_col,
  now() AS ingested_at,
FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/<file>.json');

-- 3) Dedupe with QUALIFY (prevents ON CONFLICT double-hit)
CREATE OR REPLACE TEMP VIEW v_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT *, ROW_NUMBER() OVER (
    PARTITION BY pk_col ORDER BY record_changed_at DESC NULLS LAST
  ) AS rn
  FROM v_source
)
QUALIFY rn = 1;

-- 4) Upsert into Postgres
INSERT INTO pg.pcms.table_name BY NAME (
  SELECT * FROM v_deduped
)
ON CONFLICT (pk_col) DO UPDATE SET
  col1 = EXCLUDED.col1,
  ingested_at = EXCLUDED.ingested_at;

-- 5) Return summary
SELECT
  'script_name' AS step,
  (SELECT count(*) FROM v_deduped) AS rows_upserted,
  now() AS finished_at;
\`\`\`

## Key Rules

### 1. Hard-coded JSON path
\`\`\`sql
'./shared/pcms/nba_pcms_full_extract/<file>.json'
\`\`\`
Do NOT use variables. Lineage always writes here.

### 2. Postgres resource
\`\`\`sql
ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);
-- Access tables as: pg.pcms.table_name
\`\`\`

### 3. Deduplication is mandatory
Use \`ROW_NUMBER() OVER (PARTITION BY pk ORDER BY record_changed_at DESC NULLS LAST)\`
This prevents "ON CONFLICT cannot affect row a second time" errors.

### 4. Team code joins
\`\`\`sql
LEFT JOIN v_teams t ON t.team_id = src.team_id::BIGINT
-- Select: t.team_code AS team_code
\`\`\`

### 5. Type casting
\`\`\`sql
-- Safe (returns NULL on failure)
TRY_CAST(col AS INTEGER)
TRY_CAST(col AS DATE)
TRY_CAST(col AS TIMESTAMP)

-- Direct (errors on failure)
col::INTEGER
col::BIGINT
col::VARCHAR
\`\`\`

### 6. Nested JSON with UNNEST
\`\`\`sql
-- Single level
SELECT c.contract_id, v.version_number
FROM read_json_auto('contracts.json') c,
UNNEST(c.versions) AS v;

-- Multiple levels
SELECT c.contract_id, v.version_id, s.salary_id
FROM read_json_auto('contracts.json') c,
UNNEST(c.versions) AS v,
UNNEST(v.salaries) AS s;
\`\`\`

### 7. DuckDB Friendly SQL

\`\`\`sql
-- Trailing commas allowed (use them!)
SELECT col1, col2, col3, FROM table;

-- EXCLUDE columns
SELECT * EXCLUDE (internal_col, rn) FROM my_cte;

-- QUALIFY for post-window filtering
SELECT * FROM src QUALIFY ROW_NUMBER() OVER (...) = 1;

-- Reuse aliases in same SELECT
SELECT price * qty AS subtotal, subtotal * 0.1 AS tax;

-- FILTER clause for conditional counts
SELECT count(*) FILTER (WHERE status = 'active') AS active_count;
\`\`\`

### 8. JSON extraction fallback
If \`read_json_auto\` doesn't infer structure correctly:
\`\`\`sql
-- Use json_extract with path
SELECT j->>'$.field_name' FROM read_json('file.json');

-- Or json_transform for explicit types
SELECT json_transform(j, '{"id": "INTEGER", "name": "VARCHAR"}') FROM data;
\`\`\`

## Inspecting JSON

\`\`\`bash
# Top-level keys
bun -e "console.log(Object.keys(await Bun.file('.shared/nba_pcms_full_extract/lookups.json').json()))"

# Sample record
bun -e "const d = await Bun.file('.shared/nba_pcms_full_extract/players.json').json(); console.log(d[0])"

# Nested structure
bun -e "const d = await Bun.file('.shared/nba_pcms_full_extract/contracts.json').json(); console.log(Object.keys(d[0].versions?.[0] || {}))"
\`\`\`

## File Naming

\`<name>.inline_script.duckdb.sql\` in \`duckdb_test.flow/\`

## After Creating Each Script

1. Check off the task in .ralph/DUCKDB.md
2. Commit: \`git add -A && git commit -m "feat(duckdb): add <script name>"\`

## Script Size

- Target: 200-600 lines
- Complex scripts (contracts, transactions): up to 800 lines
- If exceeding 800, consider splitting by table
`;

loop({
  name: "duckdb",
  taskFile: ".ralph/DUCKDB.md",
  timeout: "10m",
  pushEvery: 4,
  maxIterations: 20,

  run(state) {
    if (state.hasTodos) {
      return work(WORK_PROMPT, { thinking: "high" });
    }
    return halt("All DuckDB scripts created");
  },
});
