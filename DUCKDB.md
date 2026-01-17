# DuckDB Migration Plan

## Summary

After evaluating the current Bun-based import scripts (Steps B-K), **DuckDB is the better tool** for the JSON → Postgres bulk import phase. The lineage step (Step A) should remain in Bun for XML parsing.

## Current Architecture (Bun)

```
Step A (Bun):     S3 → ZIP → XML → Clean JSON
Steps B-K (Bun):  Clean JSON → JavaScript loops → Postgres
Step L (Bun):     Finalize lineage
```

**Pain points with Bun for Steps B-K:**
- Manual batch loops (`for i += BATCH_SIZE`)
- Loads entire JSON arrays into memory
- Verbose field mapping with helper functions (`toIntOrNull()`)
- Single-threaded processing
- 100-200 lines per import script

## Proposed Architecture (Hybrid)

```
Step A (Bun):       S3 → ZIP → XML → Clean JSON   ← Keep (XML parsing)
Steps B-K (DuckDB): Clean JSON → Postgres          ← Migrate
Step L (DuckDB):    Finalize lineage               ← Migrate
```

## Why DuckDB Wins for Steps B-K

| Aspect | Bun | DuckDB |
|--------|-----|--------|
| 232K transactions | Loop in batches of 100 | Single vectorized operation |
| Memory | Load entire JSON array | Streams automatically |
| Batching | Manual | Automatic & optimal |
| Type coercion | `toIntOrNull()` helpers | `::INTEGER`, `NULLIF()` |
| Parallelism | Single-threaded | Automatic |
| Code volume | ~100-200 lines/step | ~15-30 lines/step |

## Example: Players Import

### Current Bun (~130 lines)

```typescript
const players = await Bun.file(`${baseDir}/players.json`).json();

for (let i = 0; i < players.length; i += BATCH_SIZE) {
  const batch = players.slice(i, i + BATCH_SIZE);
  const rows = batch.map(p => ({
    person_id: p.player_id,
    first_name: p.first_name,
    last_name: p.last_name,
    team_id: toIntOrNull(p.team_id),
    // ... 25 more field mappings
  }));
  await sql`INSERT INTO pcms.people ${sql(rows)} ON CONFLICT ...`;
}
```

### Proposed DuckDB (~20 lines)

```sql
ATTACH $POSTGRES_URL AS pg (TYPE postgres);

INSERT INTO pg.pcms.people BY NAME (
  SELECT 
    player_id AS person_id,
    first_name,
    last_name,
    middle_name,
    display_first_name,
    display_last_name,
    roster_first_name,
    roster_last_name,
    birth_date::DATE,
    birth_country_lk,
    gender,
    height::INTEGER,
    weight::INTEGER,
    person_type_lk,
    player_status_lk,
    record_status_lk,
    league_lk,
    team_id::BIGINT,
    school_id::BIGINT,
    draft_year::INTEGER,
    draft_round::INTEGER,
    draft_pick::INTEGER,
    years_of_service::INTEGER,
    player_service_years AS service_years_json,
    create_date AS created_at,
    last_change_date AS updated_at,
    record_change_date AS record_changed_at,
    poison_pill_amt::BIGINT,
    two_way_flg AS is_two_way,
    flex_flg AS is_flex,
    $s3_key AS source_drop_file,
    now() AS ingested_at
  FROM read_json_auto($json_path)
)
ON CONFLICT (person_id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  updated_at = EXCLUDED.updated_at,
  ingested_at = EXCLUDED.ingested_at;
  -- ... etc
```

## DuckDB Features We'll Use

### 1. Native JSON Reading
```sql
-- Reads JSON array, infers schema
FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/players.json')

-- Or explicit schema for control
FROM read_json('./file.json', columns={player_id: 'BIGINT', name: 'VARCHAR'})
```

### 2. Postgres Extension
```sql
INSTALL postgres;
LOAD postgres;
ATTACH 'postgres://user:pass@host:5432/db' AS pg (TYPE postgres);

-- Direct insert to Postgres
INSERT INTO pg.pcms.people SELECT * FROM read_json_auto('players.json');
```

### 3. Type Coercion
```sql
-- DuckDB handles nulls and type casting cleanly
NULLIF(team_id, '')::BIGINT    -- empty string → null → bigint
TRY_CAST(value AS INTEGER)      -- returns null on failure instead of error
```

### 4. Nested JSON (Contracts)
```sql
-- Unnest nested arrays
SELECT 
  c.contract_id,
  v.version_id,
  s.salary_id,
  s.amount
FROM read_json_auto('contracts.json') c,
UNNEST(c.versions) AS v,
UNNEST(v.salaries) AS s
```

## Data Volumes

| File | Records | Current (Bun) | Expected (DuckDB) |
|------|---------|---------------|-------------------|
| players.json | 14,421 | ~5s | <1s |
| contracts.json | 8,071 | ~10s | <1s |
| transactions.json | 232,417 | ~60s | ~3s |
| ledger.json | 50,713 | ~15s | <1s |
| trades.json | 1,731 | ~2s | <1s |
| lookups.json | 43 tables | ~5s | <1s |

## Migration Plan

### Phase 1: Prototype
- [ ] Convert `players_&_people` to DuckDB
- [ ] Benchmark against Bun version
- [ ] Verify data integrity

### Phase 2: Simple Tables
- [ ] `draft_picks`
- [ ] `lookups`
- [ ] `trades`

### Phase 3: Complex Tables
- [ ] `contracts` (nested versions/salaries)
- [ ] `transactions` + `ledger`
- [ ] `team_budgets` (nested structure)

### Phase 4: Cleanup
- [ ] Remove Bun import scripts
- [ ] Update flow.yaml for DuckDB steps
- [ ] Update documentation

## Windmill DuckDB Notes

DuckDB is available as a native language in Windmill. Scripts use:

```sql
-- Windmill DuckDB script
-- Access resources via $RESOURCE_NAME syntax
ATTACH $pg_connection AS pg (TYPE postgres);

-- Access flow inputs via $variable_name
SELECT * FROM read_json_auto($extract_dir || '/players.json');
```

## Decision Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-16 | Keep Step A in Bun | XML parsing with fast-xml-parser works well, DuckDB XML support is limited |
| 2026-01-16 | Migrate Steps B-K to DuckDB | Bulk JSON→Postgres is DuckDB's sweet spot; 10x less code, faster execution |
| 2026-01-16 | Use `read_json_auto` | Clean JSON from lineage step has consistent schema |
