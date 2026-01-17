# PCMS Import - Empty Tables TODO

**Generated:** 2026-01-16

## Summary

Analysis of empty tables vs available PCMS data. Tables are categorized by data availability and required action.

---

## ✅ HIGH PRIORITY - Data Available, Script Missing/Incomplete

### 1. `agencies` (150 records)
- **Source:** `lookups.json` → `lk_agencies.lk_agency`
- **Status:** Data goes to generic `pcms.lookups` instead of dedicated `pcms.agencies` table
- **Action:** Create `agencies.inline_script.ts` or modify lookups script to also populate `agencies` table
- **Sample:**
  ```json
  { "agency_id": 1, "agency_name": "24/7 Sports Management", "active_flg": true }
  ```

### 2. `transaction_waiver_amounts` (8,868 records)
- **Source:** `transaction_waiver_amounts.json`
- **Status:** NOT imported anywhere
- **Action:** Add to `trades,_transactions_&_ledger.inline_script.ts` or create new script
- **Sample:**
  ```json
  { "transaction_waiver_amount_id": 73956, "transaction_id": 1132196, "player_id": 1631115, 
    "cap_value": 491887, "tax_value": 491887, "apron_value": 491887 }
  ```

### 3. `league_salary_scales` (440 records)
- **Source:** `yearly_salary_scales.json`
- **Status:** NOT imported
- **Action:** Add to `system_values,_rookie_scale_&_nca.inline_script.ts`
- **Sample:**
  ```json
  { "salary_year": 2005, "years_of_service": 0, "league_lk": "NBA", "minimum_salary_year1": 398762 }
  ```

### 4. `league_salary_cap_projections` (138 records)
- **Source:** `cap_projections.json`
- **Status:** NOT imported
- **Action:** Add to `system_values,_rookie_scale_&_nca.inline_script.ts`
- **Sample:**
  ```json
  { "salary_cap_projection_id": 7, "season_year": 2018, "cap_amount": 102000000, "tax_level": 123000000 }
  ```

### 5. `contract_protections` + `contract_protection_conditions`
- **Source:** `contracts.json` → `versions.version[].protections.protection[]`
- **Status:** NOT imported (contracts script deletes protections from version_json)
- **Action:** Update `contracts,_versions,_bonuses_&_salaries.inline_script.ts`
- **Note:** Protections have nested `protection_conditions` and `protection_types`
- **Sample:**
  ```json
  { "contract_protection_id": 21, "contract_year": 1993, "protection_amount": 650000,
    "protection_coverage_lk": "FULL", "protection_types": { "protection_type": ["DEATH", "INJIL"] } }
  ```

### 6. `contract_bonus_maximums`
- **Source:** `contracts.json` → `versions.version[].bonus_maximums.bonus_maximum[]`
- **Status:** NOT imported (contracts script deletes bonus_maximums)
- **Action:** Update `contracts,_versions,_bonuses_&_salaries.inline_script.ts`
- **Sample:**
  ```json
  { "bonus_max_id": 1000, "salary_year": 2008, "bonus_max_amount": 2000000, "seqno": 1000 }
  ```

### 7. `contract_bonus_criteria`
- **Source:** `contracts.json` → `versions.version[].bonuses.bonus[].bonus_criteria[].bonus_criterium[]`
- **Status:** Currently stored as `criteria_json` JSONB but NOT unpacked to dedicated table
- **Action:** Update contracts script to extract to `contract_bonus_criteria` table
- **Note:** Has real IDs (`bonus_criteria_id`) and structured data
- **Sample:**
  ```json
  { "bonus_criteria_id": 1, "criteria_lk": "PTS", "criteria_operator_lk": null, 
    "modifier_lk": "PERGM", "season_type_lk": "REG", "player_criteria_flg": true }
  ```

### 8. `payment_schedule_details`
- **Source:** `contracts.json` → `salaries.salary[].payment_schedules.payment_schedule[].schedule_details.schedule_detail[]`
- **Status:** NOT imported - contracts script imports payment_schedules but misses nested details
- **Action:** Update contracts script to extract `payment_schedule_details`
- **Sample:**
  ```json
  { "contract_payment_schedule_detail_id": 12164774, "payment_amount": 52812, 
    "payment_date": "1995-11-15", "contract_payment_type_lk": "BASE", "scheduled_payment_flg": true }
  ```

### 9. `two_way_game_utility` + `team_two_way_capacity`
- **Source:** `two_way_utility.json`
- **Status:** NOT imported (separate from two_way_daily_statuses)
- **Action:** Create `two_way_utility.inline_script.ts` OR add to existing two-way script
- **Data structure:**
  - Root has teams with game data containing nested `two_way_util_players`
  - `under15_games.under15_team_budget[]` has 30 team capacity records
- **Sample (team_two_way_capacity):**
  ```json
  { "team_id": 1610612737, "current_contract_count": 15, "games_remaining": 41, 
    "under15_games_count": 36, "under15_games_remaining": 54 }
  ```

---

## 🟡 MEDIUM PRIORITY - Needs Investigation

### 10. `two_way_contract_utility`
- **Source:** May be derivable from `two_way.json` player data
- **Status:** Need to investigate if this data exists or should be derived
- **Action:** Check if contract-level utility stats exist in two_way extract

---

## ⚪ LOW PRIORITY - No PCMS Data Available

### 11. `agents` ✅ ACTUALLY HAS DATA (935 records)
- **Source:** `players.json` filtered by `person_type_lk == "AGENT"`
- **Status:** NOT imported - agents are stored as person records, need extraction
- **Action:** Add to `players_&_people.inline_script.ts` or create separate script
- **Note:** 203 agents have `agency_id` linking to agencies
- **Sample:**
  ```json
  { "player_id": 1628862, "person_type_lk": "AGENT", "first_name": "Matt", 
    "last_name": "Laczkowski", "agency_id": 65, "record_status_lk": "ACT" }
  ```
- **Mapping:** `agent_id` = `player_id`, derive `full_name`, `is_active` from `record_status_lk`

### 12. `apron_constraints`
- **Status:** May be static/reference data, not in PCMS extract
- **Note:** `lk_apron_levels` and `lk_subject_to_apron_reasons` exist in lookups
- **Action:** Determine if this is manually maintained reference data

### 13. `depth_charts`
- **Status:** No PCMS data for this - confirmed
- **Action:** Would need separate data source

### 14. `waiver_priority` + `waiver_priority_ranks`
- **Status:** `waiver-priority-extract` XML is EMPTY (no records)
- **Note:** Script exists but data isn't in current PCMS extract
- **Action:** None - wait for populated extract

---

## Implementation Plan

### Phase 1 - Quick Wins (modify existing scripts)
1. [ ] Add `league_salary_scales` to system_values script
2. [ ] Add `league_salary_cap_projections` to system_values script  
3. [ ] Add `transaction_waiver_amounts` to trades/transactions script
4. [ ] Extract `agencies` from lookups to dedicated table
5. [ ] Extract `agents` from players (filter `person_type_lk == "AGENT"`)

### Phase 2 - Contract Script Enhancement
5. [ ] Add `contract_protections` extraction
6. [ ] Add `contract_protection_conditions` extraction (nested in protections)
7. [ ] Add `contract_bonus_maximums` extraction
8. [ ] Add `contract_bonus_criteria` extraction (from bonuses)
9. [ ] Add `payment_schedule_details` extraction (from payment_schedules)

### Phase 3 - Two-Way Utility
10. [ ] Create new script or extend two-way script for:
    - `two_way_game_utility` (per-game player utility data)
    - `team_two_way_capacity` (under-15 games tracking)
11. [ ] Investigate `two_way_contract_utility` data availability

### Phase 4 - Cleanup & Validation
12. [ ] Add row counts to flow summary output
13. [ ] Verify all tables have data after full import
14. [ ] Document any tables that remain empty (no PCMS source)

---

## Files to Modify

| Script | Tables to Add |
|--------|---------------|
| `system_values,_rookie_scale_&_nca.inline_script.ts` | `league_salary_scales`, `league_salary_cap_projections` |
| `trades,_transactions_&_ledger.inline_script.ts` | `transaction_waiver_amounts` |
| `contracts,_versions,_bonuses_&_salaries.inline_script.ts` | `contract_protections`, `contract_protection_conditions`, `contract_bonus_maximums`, `contract_bonus_criteria`, `payment_schedule_details` |
| `lookups.inline_script.ts` | Also populate `agencies` |
| `players_&_people.inline_script.ts` | Also populate `agents` (filter by person_type_lk=AGENT) |
| **NEW** `two_way_utility.inline_script.ts` | `two_way_game_utility`, `team_two_way_capacity` |

---

## Data Availability Summary

| Table | Records | Source File | Status |
|-------|---------|-------------|--------|
| `agencies` | 150 | lookups.json | ✅ Has data |
| `transaction_waiver_amounts` | 8,868 | transaction_waiver_amounts.json | ✅ Has data |
| `league_salary_scales` | 440 | yearly_salary_scales.json | ✅ Has data |
| `league_salary_cap_projections` | 138 | cap_projections.json | ✅ Has data |
| `contract_protections` | Many | contracts.json (nested) | ✅ Has data |
| `contract_protection_conditions` | Some | contracts.json (nested) | ✅ Has data |
| `contract_bonus_maximums` | Some | contracts.json (nested) | ✅ Has data |
| `contract_bonus_criteria` | Some | contracts.json (nested) | ✅ Has data |
| `payment_schedule_details` | Many | contracts.json (nested) | ✅ Has data |
| `two_way_game_utility` | ~50+ | two_way_utility.json | ✅ Has data |
| `team_two_way_capacity` | 30 | two_way_utility.json | ✅ Has data |
| `two_way_contract_utility` | ? | two_way.json? | 🟡 Investigate |
| `agents` | 935 | players.json (person_type_lk=AGENT) | ✅ Has data |
| `apron_constraints` | 0 | N/A | ❌ No source |
| `depth_charts` | 0 | N/A | ❌ No source |
| `waiver_priority` | 0 | Empty extract | ❌ Empty |
| `waiver_priority_ranks` | 0 | Empty extract | ❌ Empty |

---

## Notes

- All JSON files are already clean (snake_case, proper nulls) from lineage step
- Use existing script patterns: read JSON → transform → batch upsert
- `lk_subject_to_apron_reasons` is already going to `lookups` table - confirm if dedicated table needed
- Contracts script will become larger - consider breaking out protections/bonuses to separate script if needed
