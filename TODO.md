# TODO: PCMS Data Import Issues

Last updated: 2026-01-16

This document catalogs all known issues with the PCMS data import flow. A coding agent should address these in priority order.

---

## ✅ DONE: Schema Migration for `team_code`

**Migration created:** `migrations/003_team_code_and_draft_picks.sql`

This migration:
- Renames `team_name_short` → `team_code` in `pcms.teams`
- Adds `team_code` columns to 22 tables (see migration for full list)
- Adds `player_id` to `draft_picks` for linking picks to players
- Backfills existing data from `pcms.teams`
- Creates indexes on frequently-queried `team_code` columns

**Run with:** `psql $POSTGRES_URL -f migrations/003_team_code_and_draft_picks.sql`

---

## 🔴 CRITICAL: Update Import Scripts to Populate `team_code`

**Problem:** After running migration 003, the `team_code` columns exist and are backfilled for existing data. But import scripts need to be updated to populate `team_code` on NEW inserts, otherwise future imports will have NULL team_codes.

**Solution:** Each script needs to look up `team_code` from a teams map and include it in the insert.

### Helper Pattern (add to each script)

```typescript
// Build team_id → team_code lookup map
const teamsData: any[] = await Bun.file(`${baseDir}/lookups.json`).json()
  .then((l: any) => l.lk_teams?.lk_team || []);
const teamCodeMap = new Map<number, string>();
for (const t of teamsData) {
  if (t.team_id && t.team_code) {
    teamCodeMap.set(t.team_id, t.team_code);
  }
}

// Usage in row mapping:
const row = {
  team_id: record.team_id,
  team_code: teamCodeMap.get(record.team_id) ?? null,
  // ...
};
```

### Scripts to Update

| Script | Tables | Columns to Add |
|--------|--------|----------------|
| `players_&_people.inline_script.ts` | `people` | `team_code`, `draft_team_code`, `dlg_returning_rights_team_code`, `dlg_team_code` |
| `contracts,_versions,_bonuses_&_salaries.inline_script.ts` | `contracts` | `team_code`, `sign_and_trade_to_team_code` |
| `trades,_transactions_&_ledger.inline_script.ts` | `transactions` | `from_team_code`, `to_team_code`, `rights_team_code`, `sign_and_trade_team_code` |
| `trades,_transactions_&_ledger.inline_script.ts` | `ledger_entries` | `team_code` |
| `trades,_transactions_&_ledger.inline_script.ts` | `trade_groups` | `team_code` |
| `trades,_transactions_&_ledger.inline_script.ts` | `trade_team_details` | `team_code` |
| `trades,_transactions_&_ledger.inline_script.ts` | `trade_teams` | `team_code` |
| `draft_picks.inline_script.ts` | `draft_picks` | `original_team_code`, `current_team_code` |
| `team_exceptions_&_usage.inline_script.ts` | `team_exceptions` | `team_code` |
| `team_budgets.inline_script.ts` | `team_budget_snapshots` | `team_code` |
| `team_budgets.inline_script.ts` | `tax_team_status` | `team_code` |
| `team_budgets.inline_script.ts` | `team_tax_summary_snapshots` | `team_code` |
| `system_values,_rookie_scale_&_nca.inline_script.ts` | `non_contract_amounts` | `team_code` |
| `transaction_waiver_amounts.inline_script.ts` | `transaction_waiver_amounts` | `team_code` |
| `two-way_daily_statuses.inline_script.ts` | `two_way_daily_statuses` | `status_team_code`, `contract_team_code`, `signing_team_code` |
| `two-way_utility.inline_script.ts` | `two_way_contract_utility` | `contract_team_code`, `signing_team_code` |
| `two-way_utility.inline_script.ts` | `two_way_game_utility` | `team_code`, `opposition_team_code` |
| `waiver_priority_&_ranks.inline_script.ts` | `waiver_priority_ranks` | `team_code` |
| `lookups.inline_script.ts` | `teams` | Update to use `team_code` instead of `team_name_short` |

**Note:** `depth_charts` is not populated from PCMS, so no script update needed.

---

## 🔴 CRITICAL: Generate NBA Draft Picks for `pcms.draft_picks`

**Problem:** The `pcms.draft_picks` table contains only DLG/WNBA records. We need NBA draft picks too!

**Why it matters:** Analysts expect `draft_picks` to have NBA data for querying draft history, pick trades, etc.

### Solution: Generate NBA Draft Picks from Player Data

**Create new script:** `import_pcms_data.flow/generate_nba_draft_picks.inline_script.ts`

```typescript
// Read players with draft info
const players = await Bun.file(`${baseDir}/players.json`).json();

// Build team code map
const teamsData = await Bun.file(`${baseDir}/lookups.json`).json()
  .then((l: any) => l.lk_teams?.lk_team || []);
const teamCodeMap = new Map<number, string>();
for (const t of teamsData) {
  if (t.team_id && t.team_code) teamCodeMap.set(t.team_id, t.team_code);
}

const nbaDraftPicks = players
  .filter(p => p.draft_year && p.draft_round && p.league_lk === "NBA")
  .map(p => {
    const pickNum = Array.isArray(p.draft_pick) ? p.draft_pick[0] : p.draft_pick;
    return {
      // Generate synthetic ID: YYYY0R0PP format
      draft_pick_id: p.draft_year * 100000 + p.draft_round * 1000 + pickNum,
      draft_year: p.draft_year,
      round: p.draft_round,
      pick_number: String(pickNum),
      pick_number_int: pickNum,
      league_lk: "NBA",
      original_team_id: p.draft_team_id,
      original_team_code: teamCodeMap.get(p.draft_team_id) ?? null,
      current_team_id: p.draft_team_id,
      current_team_code: teamCodeMap.get(p.draft_team_id) ?? null,
      is_active: false,
      player_id: p.player_id,
    };
  });

await sql`INSERT INTO pcms.draft_picks ${sql(nbaDraftPicks)} 
  ON CONFLICT (draft_year, round, pick_number_int, league_lk) DO UPDATE SET
    player_id = EXCLUDED.player_id,
    original_team_code = EXCLUDED.original_team_code,
    current_team_code = EXCLUDED.current_team_code`;
```

### Data Available

```bash
# ~3,664 NBA players with draft info
jq '[.[] | select(.draft_year != null and .draft_round != null and .league_lk == "NBA")] | length' players.json
```

### Files to Create/Modify

| File | Action |
|------|--------|
| `generate_nba_draft_picks.inline_script.ts` | **CREATE** - New script |
| `flow.yaml` | Add new step after players import |

---

## 🔴 CRITICAL: Ledger Entries Import Fails

**Problem:** Import fails with errors:
- `null value in column "team_id" of relation "ledger_entries" violates not-null constraint`
- `ON CONFLICT DO UPDATE command cannot affect row a second time`

**Root cause 1:** 15 records in `ledger.json` have `team_id: null`. These are WNBA "WREN" (WNBA Renounce) transactions.

**Root cause 2:** Possible duplicate `transaction_ledger_entry_id` values in the same batch.

**Fix needed in:** `import_pcms_data.flow/trades,_transactions_&_ledger.inline_script.ts`

**Solution:**
```typescript
// Filter out records with null team_id
const rows = batch
  .filter((le) => 
    le?.transaction_ledger_entry_id !== null && 
    le?.transaction_ledger_entry_id !== undefined &&
    le?.team_id !== null &&  // ADD THIS
    le?.team_id !== undefined  // ADD THIS
  )
  .map((le) => ({
    // ... existing mapping
    team_code: teamCodeMap.get(le.team_id) ?? null,  // ADD THIS
  }));
```

---

## 🟡 Two-Way Daily Statuses: Only 158 Rows (Should be ~28,000)

**Problem:** Database has only 158 rows, but source has 28,659 records spanning 2017-2025.

**Evidence:**
```bash
jq '.daily_statuses["daily-status"] | length' .shared/nba_pcms_full_extract/two_way.json
# Returns: 28659
```

**Possible causes:**
1. Records being filtered out due to missing required fields
2. Import script ran but only partially completed
3. Error in a previous run

**File to check:** `import_pcms_data.flow/two-way_daily_statuses.inline_script.ts`

**Debug step:** Add logging to see how many records pass the filter:
```typescript
console.log(`Source records: ${statuses.length}`);
const rows = statuses.map((s) => {...}).filter(Boolean);
console.log(`After filter: ${rows.length}`);
```

---

## 🟡 Lookups: ON CONFLICT Issue with Duplicates

**Problem:** Had to use `BATCH_SIZE = 10` due to `ON CONFLICT DO UPDATE command cannot affect row a second time`

**Root cause:** Multiple lookup records with the same `(lookup_type, lookup_code)` in a single batch.

**Current workaround:** Using `BATCH_SIZE = 10` in `lookups.inline_script.ts`

**Better fix:** Deduplicate before insert:
```typescript
// Dedupe by (lookup_type, lookup_code) - keep last occurrence
const seen = new Map<string, any>();
for (const row of transformed) {
  seen.set(`${row.lookup_type}|${row.lookup_code}`, row);
}
const deduped = Array.from(seen.values());
```

---

## 🟡 Teams Data: NULL Values for NBA Teams

**Problem:** In `pcms.teams`, these columns are NULL for ALL NBA teams:
- `city`
- `state_lk`
- `country_lk`
- `division_name`
- `conference_name`
- `first_game_date`

**Root cause:** This is a data quality issue in the PCMS source. The XML doesn't have this data.

**Options:**
1. **Accept as-is** - This is the source data
2. **Enrich from another source** - Create a seed file or use NBA API to populate
3. **Create reference table** - Separate `teams_metadata` table with city/state/conference

---

## 🟢 Empty Tables (Acceptable - Source Data Issue)

These tables are empty because the PCMS extract doesn't contain this data:

| Table | Reason |
|-------|--------|
| `apron_constraints` | Not in extract |
| `contract_bonus_criteria` | Nested in contracts, needs extraction |
| `contract_bonus_maximums` | Nested in contracts, needs extraction |
| `contract_protection_conditions` | Nested in contracts, needs extraction |
| `depth_charts` | Not PCMS data - populated elsewhere |
| `lk_subject_to_apron_reasons` | Not in lookups extract |
| `payment_schedule_details` | Nested in contracts, needs extraction |
| `two_way_contract_utility` | Check `two_way_utility.json` extraction |
| `waiver_priority` | Source file is empty (`""`) |
| `waiver_priority_ranks` | Source file is empty |

---

## 🟢 League System Values: Always-NULL Columns

**Problem:** These columns are always NULL in `pcms.league_system_values`:
- `rsa_from_year`, `rsa_to_year`
- `yss_from_year`, `yss_to_year`
- `ysv_from_year`, `ysv_to_year`
- `rsa_league_lk`, `yss_league_lk`, `ysv_league_lk`

**Root cause:** These fields don't exist in the source XML. They may be legacy columns or planned for future data.

---

## 📋 Testing Checklist

After fixes, verify:

- [ ] Migration 003 runs successfully
- [ ] `SELECT COUNT(*) FROM pcms.draft_picks WHERE league_lk = 'NBA'` ≈ 3,664
- [ ] `SELECT COUNT(*) FROM pcms.draft_picks WHERE league_lk IN ('DLG', 'WNBA')` ≈ 1,169
- [ ] `SELECT COUNT(*) FROM pcms.ledger_entries` ≈ 50,698
- [ ] `SELECT COUNT(*) FROM pcms.two_way_daily_statuses` ≈ 28,000
- [ ] All `team_code` columns are populated (no NULLs where team_id exists)
- [ ] Full flow completes end-to-end with no errors

**Verify team_code backfill:**
```sql
-- Should return 0 rows (no missing team_codes where team_id exists)
SELECT 'contracts' as tbl, COUNT(*) FROM pcms.contracts WHERE signing_team_id IS NOT NULL AND team_code IS NULL
UNION ALL
SELECT 'transactions', COUNT(*) FROM pcms.transactions WHERE to_team_id IS NOT NULL AND to_team_code IS NULL
UNION ALL
SELECT 'people', COUNT(*) FROM pcms.people WHERE team_id IS NOT NULL AND team_code IS NULL
UNION ALL
SELECT 'ledger_entries', COUNT(*) FROM pcms.ledger_entries WHERE team_id IS NOT NULL AND team_code IS NULL;
```

**Draft picks spot check:**
```sql
SELECT draft_year, round, pick_number_int, p.first_name, p.last_name, dp.original_team_code
FROM pcms.draft_picks dp
JOIN pcms.people p ON dp.player_id = p.person_id
WHERE dp.draft_year = 2024 AND dp.round = 1 AND dp.league_lk = 'NBA'
ORDER BY dp.pick_number_int;
```

---

## 📋 File Reference

| Issue | Primary File(s) |
|-------|-----------------|
| Schema migration | `migrations/003_team_code_and_draft_picks.sql` ✅ |
| People team_code | `players_&_people.inline_script.ts` |
| Contracts team_code | `contracts,_versions,_bonuses_&_salaries.inline_script.ts` |
| Trades/Txn/Ledger team_code | `trades,_transactions_&_ledger.inline_script.ts` |
| Draft picks team_code + player_id | `draft_picks.inline_script.ts` |
| **NBA draft picks** | **CREATE:** `generate_nba_draft_picks.inline_script.ts` |
| Team exceptions team_code | `team_exceptions_&_usage.inline_script.ts` |
| Team budgets team_code | `team_budgets.inline_script.ts` |
| NCA team_code | `system_values,_rookie_scale_&_nca.inline_script.ts` |
| Waiver amounts team_code | `transaction_waiver_amounts.inline_script.ts` |
| Two-way statuses team_code | `two-way_daily_statuses.inline_script.ts` |
| Two-way utility team_code | `two-way_utility.inline_script.ts` |
| Waiver priority team_code | `waiver_priority_&_ranks.inline_script.ts` |
| Lookups (teams) | `lookups.inline_script.ts` |
| Flow definition | `flow.yaml` |
