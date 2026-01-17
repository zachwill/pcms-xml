# TODO: Remove Lineage Tracking Columns

**Goal:** Simplify the import flow by removing per-row lineage tracking. Just use `ingested_at` timestamp.

## Status: ✅ COMPLETE

All scripts have been updated and the flow.yaml has been simplified.

## What Was Done

### 1. SQL Migration Created ✅
**File:** `migrations/002_remove_lineage_columns.sql`

Drops `source_drop_file`, `source_hash`, `parser_version` from 47 tables and simplifies `pcms_lineage`.

### 2. All Scripts Updated ✅

| Script | Status |
|--------|--------|
| `players_&_people.inline_script.ts` | ✅ Done |
| `agents_&_agencies.inline_script.ts` | ✅ Done |
| `lookups.inline_script.ts` | ✅ Done |
| `draft_picks.inline_script.ts` | ✅ Done |
| `team_exceptions_&_usage.inline_script.ts` | ✅ Done |
| `two-way_daily_statuses.inline_script.ts` | ✅ Done |
| `two-way_utility.inline_script.ts` | ✅ Done |
| `transaction_waiver_amounts.inline_script.ts` | ✅ Done |
| `league_salary_scales_&_protections.inline_script.ts` | ✅ Done |
| `contracts,_versions,_bonuses_&_salaries.inline_script.ts` | ✅ Done |
| `trades,_transactions_&_ledger.inline_script.ts` | ✅ Done |
| `system_values,_rookie_scale_&_nca.inline_script.ts` | ✅ Done |
| `team_budgets.inline_script.ts` | ✅ Done |
| `waiver_priority_&_ranks.inline_script.ts` | ✅ Done |
| `lineage_management_(s3_&_state_tracking).inline_script.ts` | ✅ Simplified |
| `finalize_lineage.inline_script.ts` | ✅ Simplified |

### 3. flow.yaml Updated ✅

Removed `lineage_id` and `s3_key` from input_transforms for all steps. Now only passes:
- `dry_run`
- `extract_dir`

### 4. Duplicate Files Deleted ✅

- ~~`league_salary_scales_&_projections.inline_script.ts`~~ (removed)
- ~~`two_way_utility.inline_script.ts`~~ (removed - underscore version)

---

## Run Migration

After deploying, run:

```bash
psql $POSTGRES_URL -f migrations/002_remove_lineage_columns.sql
```

---

## Script Pattern (for reference)

All import scripts now follow this simplified pattern:

```typescript
export async function main(
  dry_run = false,
  extract_dir = "./shared/pcms"
) {
  // ...
  const ingestedAt = new Date();
  
  // Row objects just have ingested_at
  const rows = data.map(d => ({
    ...fields,
    ingested_at: ingestedAt,
  }));
  
  // ON CONFLICT only updates ingested_at
  await sql`
    INSERT INTO pcms.table ${sql(rows)}
    ON CONFLICT (id) DO UPDATE SET
      ...,
      ingested_at = EXCLUDED.ingested_at
  `;
}
```
