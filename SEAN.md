# SEAN.md — Analyst Tooling Requirements & Implementation Plan

Last updated: 2026-01-17

This document captures what salary cap analysts (like Sean) need from the PCMS database to build interactive tools (trade machines, salary books, team projections), and maps those requirements to our schema.

---

## 1. What Analysts Actually Build

From `reference/sean/`:

| Sheet | Purpose | Key Data Needs |
|-------|---------|----------------|
| **X.txt** | Salary warehouse (~800 players × 170 cols) | Player name, team, multi-year salaries, % of cap, trade kicker, agent, options |
| **Y.txt** | Year-pivoted salary lookup | Player → salary by year (for VLOOKUP) |
| **Playground.txt** | Team salary book | Team selector → roster sorted by salary, depth chart |
| **Trade Machine.txt** | Trade legality checker | Salary matching rules, cap/tax/apron levels |
| **Give Get.txt** | Multi-team trade sandbox | Same as Trade Machine + exceptions warehouse |
| **Team Master.txt** | Team overview | Roster, tax status, repeater flags |
| **Depth Chart.txt** | Position-based roster | Player → position → salary by year |

---

## 2. Data Requirements Deep Dive

### 2.1 Salary Warehouse (X sheet columns)

The X sheet is the **master lookup table** — every other sheet references it.

| Col | Field | Source | Status |
|-----|-------|--------|--------|
| A | Player name "Last, First" | `people.last_name \|\| ', ' \|\| first_name` | ✅ Have |
| B | Team code | `people.team_code` | ✅ Have |
| C | 2024/25 cap salary | `salaries.contract_cap_salary WHERE salary_year=2025` | ✅ Have (needs pivot) |
| D | % of cap | `salary / league_system_values.salary_cap_amount` | 🔧 Computed |
| E | 2025/26 cap salary | `salaries WHERE salary_year=2026` | ✅ Have (needs pivot) |
| F | % of cap | Computed | 🔧 Computed |
| G-N | Salaries 2027-2034 | `salaries` | ✅ Have (needs pivot) |
| O | Total contract value | `SUM(salaries.total_salary)` | 🔧 Computed |
| P | Trade kicker % / flags | `contract_versions.trade_bonus_percent`, also "PP" (poison pill), "NT" (no trade), "PO" (player option) | ✅ Have |
| Q | Birth date (as number) | `people.birth_date` | ✅ Have |
| R | Age | `DATE_PART('year', AGE(birth_date))` | 🔧 Computed |
| S | Agent name | `agents.full_name` via `people.agent_id` | ✅ Have |
| T-Y | Option status by year | `salaries.option_lk` ("PO", "TO", "ETO", etc.) | ✅ Have |
| Z-AF | Tax salary by year | `salaries.contract_tax_salary` | ✅ Have (needs pivot) |
| AG | Likely bonus adjustment | `salaries.likely_bonus` | ✅ Have |
| AH-AI | More tax values | `salaries.contract_tax_salary` | ✅ Have |
| AN-AR | Cap/Tax/Apron levels | `league_system_values.salary_cap_amount`, `tax_level_amount`, `tax_apron_amount` | ✅ Have |
| DQ+ | Rookie scale by pick | `rookie_scale_amounts` | ✅ Have |

**Gap:** Data exists but no **pivoted view** — analysts need one row per player with columns for each year.

### 2.2 Trade Matching Rules

The Trade Machine has hardcoded CBA salary matching rules:

```
2024 Season:
┌─────────────────────┬────────────────────────────┐
│ Outgoing Salary     │ Can Receive                │
├─────────────────────┼────────────────────────────┤
│ $0 - $7,493,424     │ 200% + $250,000            │
│ $7,493,424 - $29.97M│ Salary + $7,752,000        │
│ > $29,973,695       │ 125% + $250,000            │
└─────────────────────┴────────────────────────────┘

2025 Season:
┌─────────────────────┬────────────────────────────┐
│ Outgoing Salary     │ Can Receive                │
├─────────────────────┼────────────────────────────┤
│ $0 - $8,277,000     │ 200% + $250,000            │
│ $8,277,000 - $33.2M │ Salary + $8,527,000        │
│ > $33,208,000       │ 125% + $250,000            │
└─────────────────────┴────────────────────────────┘
```

Also: "Expanded" vs "Standard" trade rules (for taxpayer/non-taxpayer teams).

**Gap:** These parameters are **not stored anywhere** in our schema.

### 2.3 Exceptions Warehouse

Trade tools look up team exceptions:
```
=FILTER('Exceptions Warehouse - 2024'!$C$4:$C$70, ... = team_code)
```

Columns needed:
- Team code
- Exception type (TPE, MLE, BAE, etc.)
- Original amount
- Remaining amount
- Expiration date

**Status:** We have `team_exceptions` + `team_exception_usage` — just need a **view**.

### 2.4 Tax/Repeater Status

Hardcoded in sheets:
```
Repeater in 2024: {BRK, LAL, MIL, LAC, GSW}
Repeater in 2025: {BOS, PHX, DEN, LAL, MIL, LAC}
```

**Status:** We have `tax_team_status.is_repeater_taxpayer` ✅

### 2.5 Cap Hold Adjustments

The `team_transactions.json` file (80,130 records) contains:
```json
{
  "team_transaction_id": 11138,
  "team_id": 1610612761,
  "team_transaction_type_lk": "ADJCH",
  "cap_hold_adjustment": 1,
  "tax_adjustment": null,
  ...
}
```

This is used to track cap hold changes (renouncing rights, adjustments, etc.).

**Gap:** File exists but **NOT IMPORTED** — this is the #1 missing piece.

---

## 3. Gap Summary

| Gap | Priority | Records | Description |
|-----|----------|---------|-------------|
| `team_transactions` table | 🔴 P0 | 80,130 | Cap hold adjustments not imported |
| `vw_salary_warehouse` view | 🔴 P0 | — | Pivoted salary matrix for lookups |
| `trade_rules` table | 🟡 P1 | ~20 | CBA trade matching parameters |
| `vw_exceptions_warehouse` view | 🟡 P1 | — | Pre-joined exceptions for lookup |
| Contract sub-tables | 🟡 P1 | ~21K | `contract_bonus_maximums`, `contract_protections`, etc. |
| `vw_team_tax_status` view | 🟢 P2 | — | Repeater/taxpayer quick lookup |

---

## 4. Implementation Plan

### Phase 1: Core Data Gaps (P0)

#### Task 1.1: Import `team_transactions`

**Migration:** `migrations/006_team_transactions.sql`
```sql
-- Team transactions (cap hold adjustments, manual overrides)
CREATE TABLE IF NOT EXISTS pcms.team_transactions (
  team_transaction_id integer PRIMARY KEY,
  team_id integer,
  team_code text,
  team_transaction_type_lk text,
  team_ledger_seqno integer,
  transaction_date date,
  cap_adjustment bigint,
  cap_hold_adjustment integer,
  tax_adjustment bigint,
  tax_apron_adjustment bigint,
  mts_adjustment bigint,
  protection_count_flg boolean,
  comments text,
  record_status_lk text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  record_changed_at timestamp with time zone,
  ingested_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_transactions_team_date 
  ON pcms.team_transactions (team_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_team_transactions_type 
  ON pcms.team_transactions (team_transaction_type_lk);
```

**Import script:** `import_pcms_data.flow/team_transactions.inline_script.ts`
- Read `team_transactions.json`
- Build team_code map from lookups
- Batch upsert with ON CONFLICT

**Flow update:** Add step 's' before finalize

**Validation:**
```sql
SELECT COUNT(*) FROM pcms.team_transactions; -- Expected: ~80,130
SELECT team_transaction_type_lk, COUNT(*) 
FROM pcms.team_transactions 
GROUP BY 1 ORDER BY 2 DESC;
```

---

#### Task 1.2: Create `vw_salary_warehouse`

**Migration:** `migrations/007_analyst_views.sql`
```sql
-- Salary warehouse view (pivoted for analyst lookups)
CREATE OR REPLACE VIEW pcms.vw_salary_warehouse AS
WITH current_contracts AS (
  -- Get the latest active contract version for each player
  SELECT DISTINCT ON (c.player_id)
    c.contract_id,
    c.player_id,
    c.signing_team_id,
    c.team_code,
    cv.version_number,
    cv.trade_bonus_percent,
    cv.is_no_trade,
    cv.is_poison_pill,
    cv.is_two_way
  FROM pcms.contracts c
  JOIN pcms.contract_versions cv ON cv.contract_id = c.contract_id
  WHERE c.record_status_lk = 'ACT'
  ORDER BY c.player_id, cv.version_number DESC
),
salary_pivot AS (
  SELECT
    s.contract_id,
    s.version_number,
    -- Cap salaries by year
    MAX(CASE WHEN s.salary_year = 2025 THEN s.contract_cap_salary END) as cap_2025,
    MAX(CASE WHEN s.salary_year = 2026 THEN s.contract_cap_salary END) as cap_2026,
    MAX(CASE WHEN s.salary_year = 2027 THEN s.contract_cap_salary END) as cap_2027,
    MAX(CASE WHEN s.salary_year = 2028 THEN s.contract_cap_salary END) as cap_2028,
    MAX(CASE WHEN s.salary_year = 2029 THEN s.contract_cap_salary END) as cap_2029,
    MAX(CASE WHEN s.salary_year = 2030 THEN s.contract_cap_salary END) as cap_2030,
    -- Tax salaries by year
    MAX(CASE WHEN s.salary_year = 2025 THEN s.contract_tax_salary END) as tax_2025,
    MAX(CASE WHEN s.salary_year = 2026 THEN s.contract_tax_salary END) as tax_2026,
    MAX(CASE WHEN s.salary_year = 2027 THEN s.contract_tax_salary END) as tax_2027,
    MAX(CASE WHEN s.salary_year = 2028 THEN s.contract_tax_salary END) as tax_2028,
    MAX(CASE WHEN s.salary_year = 2029 THEN s.contract_tax_salary END) as tax_2029,
    MAX(CASE WHEN s.salary_year = 2030 THEN s.contract_tax_salary END) as tax_2030,
    -- Option status by year
    MAX(CASE WHEN s.salary_year = 2025 THEN s.option_lk END) as option_2025,
    MAX(CASE WHEN s.salary_year = 2026 THEN s.option_lk END) as option_2026,
    MAX(CASE WHEN s.salary_year = 2027 THEN s.option_lk END) as option_2027,
    MAX(CASE WHEN s.salary_year = 2028 THEN s.option_lk END) as option_2028,
    MAX(CASE WHEN s.salary_year = 2029 THEN s.option_lk END) as option_2029,
    MAX(CASE WHEN s.salary_year = 2030 THEN s.option_lk END) as option_2030,
    -- Total contract value
    SUM(s.total_salary) as total_contract_value
  FROM pcms.salaries s
  GROUP BY s.contract_id, s.version_number
)
SELECT
  p.person_id,
  p.last_name || ', ' || p.first_name as player_name,
  p.team_code,
  p.birth_date,
  DATE_PART('year', AGE(p.birth_date))::int as age,
  a.full_name as agent_name,
  -- Contract flags
  cc.trade_bonus_percent,
  CASE 
    WHEN cc.is_poison_pill THEN 'PP'
    WHEN cc.is_no_trade THEN 'NT'
    WHEN cc.trade_bonus_percent > 0 THEN cc.trade_bonus_percent::text || '%'
    ELSE NULL
  END as trade_flag,
  cc.is_two_way,
  -- Cap salaries
  sp.cap_2025, sp.cap_2026, sp.cap_2027, sp.cap_2028, sp.cap_2029, sp.cap_2030,
  -- Tax salaries  
  sp.tax_2025, sp.tax_2026, sp.tax_2027, sp.tax_2028, sp.tax_2029, sp.tax_2030,
  -- Options
  sp.option_2025, sp.option_2026, sp.option_2027, sp.option_2028, sp.option_2029, sp.option_2030,
  -- Total
  sp.total_contract_value,
  -- IDs for joins
  cc.contract_id,
  p.person_id as player_id
FROM pcms.people p
LEFT JOIN current_contracts cc ON cc.player_id = p.person_id
LEFT JOIN salary_pivot sp ON sp.contract_id = cc.contract_id AND sp.version_number = cc.version_number
LEFT JOIN pcms.agents a ON a.agent_id = p.agent_id
WHERE p.person_type_lk = 'PLYR'
  AND p.league_lk = 'NBA';

-- Index the underlying tables for view performance
CREATE INDEX IF NOT EXISTS idx_salaries_contract_year 
  ON pcms.salaries (contract_id, version_number, salary_year);
```

**Validation:**
```sql
SELECT COUNT(*) FROM pcms.vw_salary_warehouse; -- Should be ~500-600 active NBA players
SELECT * FROM pcms.vw_salary_warehouse WHERE player_name LIKE 'Curry%';
```

---

### Phase 2: Trade Tools Support (P1)

#### Task 2.1: Create `trade_rules` table

**Migration:** (add to `007_analyst_views.sql`)
```sql
-- CBA trade matching rules by season
CREATE TABLE IF NOT EXISTS pcms.trade_rules (
  rule_id serial PRIMARY KEY,
  salary_year integer NOT NULL,
  rule_type text NOT NULL DEFAULT 'EXPANDED', -- 'EXPANDED' or 'STANDARD'
  threshold_low bigint NOT NULL,
  threshold_high bigint, -- NULL means no upper limit
  multiplier numeric(5,4), -- e.g., 2.0 for 200%, 1.25 for 125%
  flat_adder bigint, -- e.g., 250000, 7752000
  description text,
  UNIQUE (salary_year, rule_type, threshold_low)
);

-- Seed with known rules
INSERT INTO pcms.trade_rules (salary_year, rule_type, threshold_low, threshold_high, multiplier, flat_adder, description)
VALUES
  -- 2024 Expanded
  (2024, 'EXPANDED', 0, 7493424, 2.0, 250000, '200% + $250K'),
  (2024, 'EXPANDED', 7493424, 29973695, 1.0, 7752000, 'Salary + $7.752M'),
  (2024, 'EXPANDED', 29973695, NULL, 1.25, 250000, '125% + $250K'),
  -- 2025 Expanded  
  (2025, 'EXPANDED', 0, 8277000, 2.0, 250000, '200% + $250K'),
  (2025, 'EXPANDED', 8277000, 33208000, 1.0, 8527000, 'Salary + $8.527M'),
  (2025, 'EXPANDED', 33208000, NULL, 1.25, 250000, '125% + $250K'),
  -- 2024 Standard (taxpayer)
  (2024, 'STANDARD', 0, NULL, 1.0, 7752000, 'Salary + $7.752M (flat)'),
  -- 2025 Standard (taxpayer)
  (2025, 'STANDARD', 0, NULL, 1.0, 8527000, 'Salary + $8.527M (flat)')
ON CONFLICT DO NOTHING;
```

**Usage:**
```sql
-- Calculate max incoming salary for a $20M outgoing in 2025
SELECT 
  CASE 
    WHEN multiplier IS NOT NULL THEN (20000000 * multiplier + flat_adder)::bigint
    ELSE (20000000 + flat_adder)::bigint
  END as max_incoming
FROM pcms.trade_rules
WHERE salary_year = 2025 
  AND rule_type = 'EXPANDED'
  AND 20000000 >= threshold_low 
  AND (threshold_high IS NULL OR 20000000 < threshold_high);
```

---

#### Task 2.2: Create `vw_exceptions_warehouse`

```sql
-- Exceptions warehouse view (for trade tools)
CREATE OR REPLACE VIEW pcms.vw_exceptions_warehouse AS
SELECT
  te.team_exception_id,
  te.team_code,
  t.team_name,
  te.salary_year,
  te.exception_type_lk,
  l.description as exception_type_name,
  te.original_amount,
  te.remaining_amount,
  te.effective_date,
  te.expiration_date,
  te.trade_exception_player_id,
  p.last_name || ', ' || p.first_name as trade_exception_player_name
FROM pcms.team_exceptions te
LEFT JOIN pcms.teams t ON t.team_id = te.team_id
LEFT JOIN pcms.lookups l ON l.lookup_type = 'EXCEPTION_TYPE' AND l.lookup_code = te.exception_type_lk
LEFT JOIN pcms.people p ON p.person_id = te.trade_exception_player_id
WHERE te.record_status_lk = 'ACT'
  AND te.remaining_amount > 0
ORDER BY te.team_code, te.remaining_amount DESC;
```

---

#### Task 2.3: Populate contract sub-tables

These tables exist in SCHEMA.md but aren't populated:

| Table | Source in contracts.json | Est. Records |
|-------|--------------------------|--------------|
| `contract_bonus_maximums` | `versions[].bonus_maximums.bonus_maximum[]` | ~159 |
| `contract_protections` | `versions[].protections.protection[]` | ~8,000 |
| `contract_protection_conditions` | `protection.protection_conditions[]` | ~12,000 |
| `payment_schedule_details` | `salaries[].payment_schedules[].schedule_details[]` | ~20,000 |

**Import script:** `import_pcms_data.flow/contract_details.inline_script.ts`
- Read `contracts.json`
- Extract nested structures
- Batch insert to each table

---

### Phase 3: Convenience Views (P2)

#### Task 3.1: Create `vw_team_tax_status`

```sql
CREATE OR REPLACE VIEW pcms.vw_team_tax_status AS
SELECT
  t.team_code,
  t.team_name,
  tts.salary_year,
  tts.is_taxpayer,
  tts.is_repeater_taxpayer,
  tts.is_subject_to_apron,
  tts.apron_level_lk,
  lsv.salary_cap_amount,
  lsv.tax_level_amount,
  lsv.tax_apron_amount,
  lsv.tax_apron2_amount
FROM pcms.tax_team_status tts
JOIN pcms.teams t ON t.team_id = tts.team_id
JOIN pcms.league_system_values lsv ON lsv.salary_year = tts.salary_year AND lsv.league_lk = 'NBA';
```

#### Task 3.2: Create `vw_team_roster_summary`

```sql
CREATE OR REPLACE VIEW pcms.vw_team_roster_summary AS
SELECT
  sw.team_code,
  sw.salary_year,
  COUNT(*) as roster_count,
  SUM(sw.cap_salary) as total_cap_salary,
  SUM(sw.tax_salary) as total_tax_salary
FROM pcms.vw_salary_warehouse sw
GROUP BY sw.team_code, sw.salary_year;
```

---

## 5. Task Checklist

### Phase 1 (P0) — Core Data
- [ ] Create `migrations/006_team_transactions.sql`
- [ ] Create `import_pcms_data.flow/team_transactions.inline_script.ts`
- [ ] Create `import_pcms_data.flow/team_transactions.inline_script.lock`
- [ ] Update `flow.yaml` with step 's' for team_transactions
- [ ] Create `migrations/007_analyst_views.sql` with `vw_salary_warehouse`
- [ ] Validate: `SELECT COUNT(*) FROM pcms.team_transactions` = ~80,130
- [ ] Validate: `SELECT COUNT(*) FROM pcms.vw_salary_warehouse` = ~500-600

### Phase 2 (P1) — Trade Tools
- [ ] Add `trade_rules` table to migration 007
- [ ] Seed trade rules with 2024/2025 CBA parameters
- [ ] Add `vw_exceptions_warehouse` view
- [ ] Create `import_pcms_data.flow/contract_details.inline_script.ts`
- [ ] Populate `contract_bonus_maximums`
- [ ] Populate `contract_protections` + `contract_protection_conditions`
- [ ] Populate `payment_schedule_details`

### Phase 3 (P2) — Convenience
- [ ] Add `vw_team_tax_status` view
- [ ] Add `vw_team_roster_summary` view
- [ ] Document views in SCHEMA.md

---

## 6. Testing the Analyst Interface

Once implemented, these queries should work:

```sql
-- "Show me Portland's roster sorted by 2025 salary"
SELECT player_name, cap_2025, cap_2026, trade_flag, agent_name
FROM pcms.vw_salary_warehouse
WHERE team_code = 'POR'
ORDER BY cap_2025 DESC NULLS LAST;

-- "What TPEs does Boston have?"
SELECT exception_type_lk, remaining_amount, expiration_date, trade_exception_player_name
FROM pcms.vw_exceptions_warehouse
WHERE team_code = 'BOS';

-- "Is Phoenix a repeater taxpayer in 2025?"
SELECT is_repeater_taxpayer, tax_level_amount
FROM pcms.vw_team_tax_status
WHERE team_code = 'PHX' AND salary_year = 2025;

-- "Can I trade $25M outgoing and receive $35M incoming?"
SELECT description, 
       (25000000 * COALESCE(multiplier, 1) + flat_adder)::bigint as max_incoming
FROM pcms.trade_rules
WHERE salary_year = 2025 
  AND rule_type = 'EXPANDED'
  AND 25000000 >= threshold_low 
  AND (threshold_high IS NULL OR 25000000 < threshold_high);
```

---

## 7. Future Considerations

### Materialized Views
If `vw_salary_warehouse` is slow, convert to materialized view with refresh:
```sql
CREATE MATERIALIZED VIEW pcms.mv_salary_warehouse AS ...;
CREATE UNIQUE INDEX ON pcms.mv_salary_warehouse (person_id);
-- Refresh after each import
REFRESH MATERIALIZED VIEW CONCURRENTLY pcms.mv_salary_warehouse;
```

### API Layer
The views are designed to be API-friendly:
- `vw_salary_warehouse` → `/api/players?team=POR`
- `vw_exceptions_warehouse` → `/api/exceptions?team=BOS`
- `vw_team_tax_status` → `/api/teams/PHX/tax-status`

### UI Projections
The existing `ui_projections` / `ui_projected_salaries` tables could be enhanced to:
- Store "what-if" scenarios (waive player, stretch, trade)
- Track user overrides vs PCMS baseline
- Support multi-user collaboration
