# Luxury Tax Primitive Spec

**Source analysis:** `reference/warehouse/tax_array.json`, `team_summary.json`, `playground.json`  
**Implementation:** `migrations/057_fn_luxury_tax_amount.sql`

---

## 1. Purpose

Provide a Postgres function to calculate luxury tax owed, replicating Sean's workbook "Tax Payment" SUMPRODUCT formula without requiring Excel-style array calculation.

---

## 2. Sean's Excel Formula

From `team_summary.json` (row 77, col AB) and multiple other sheets:

```excel
=IF(
  K3="Yes",  -- is repeater taxpayer?
  SUMPRODUCT(
    (AA3>'Tax Array'!$M$4:$M$200) *
    ('Tax Array'!$K$4:$K$200=$E$1) *
    (AA3 - 'Tax Array'!$M$4:$M$200) *
    ('Tax Array'!$O$4:$O$200)
  ),
  SUMPRODUCT(
    (AA3>'Tax Array'!$G$4:$G$200) *
    ('Tax Array'!$E$4:$E$200=$E$1) *
    (AA3 - 'Tax Array'!$G$4:$G$200) *
    ('Tax Array'!$I$4:$I$200)
  )
)
```

Where:
- `AA3` = amount over tax line (team tax salary − tax level)
- Cols G/M = cumulative bracket thresholds
- Cols I/O = marginal rate increments per bracket
- Col K/E = season filter

This SUMPRODUCT iterates through all brackets, summing `(amount_in_bracket × marginal_increment)`.

---

## 3. Tax Array Structure (from `tax_array.json`)

### Tax brackets (21 per season)

| Index | 2024 Threshold | Non-Repeater Rate | Repeater Rate | Increment |
|-------|----------------|-------------------|---------------|-----------|
| 1 | $0 | 1.50 | 2.50 | — |
| 2 | $5,168,000 | 1.75 | 2.75 | 0.25 |
| 3 | $10,336,000 | 2.50 | 3.50 | 0.75 |
| 4 | $15,504,000 | 3.25 | 4.25 | 0.75 |
| 5 | $20,672,000 | 3.75 | 4.75 | 0.50 |
| 6+ | +$5,168,000 each | +0.50 each | +0.50 each | 0.50 |

### 2025 CBA changes (row 25)

Starting 2025, bracket 1 rates changed:
- Non-repeater: **1.0** (was 1.5)
- Repeater: **3.0** (was 2.5)

Bracket width for 2025: **$5,685,000** (from `system_values.json` col L)

---

## 4. Implementation Approach

Instead of emulating SUMPRODUCT, we leverage `pcms.league_tax_rates` which has:
- `lower_limit`, `upper_limit` — bracket boundaries
- `tax_rate_non_repeater`, `tax_rate_repeater` — marginal rates
- `base_charge_non_repeater`, `base_charge_repeater` — **precomputed cumulative tax up to this bracket**

This allows O(1) calculation:

```sql
tax_owed = base_charge + (over_tax - lower_limit) × rate
```

---

## 5. Functions Implemented

### `pcms.fn_luxury_tax_amount(salary_year, over_tax_amount, is_repeater)`

Core primitive. Takes:
- `p_salary_year` (integer) — e.g., 2025
- `p_over_tax_amount` (bigint) — `GREATEST(0, tax_salary - tax_level)`
- `p_is_repeater` (boolean) — repeater taxpayer flag

Returns: luxury tax owed (bigint)

```sql
SELECT pcms.fn_luxury_tax_amount(2025, 50000000, true);
-- Returns tax owed for $50M over tax line as a repeater
```

### `pcms.fn_team_luxury_tax(team_code, salary_year)`

Convenience wrapper that looks up team's data automatically:

```sql
SELECT * FROM pcms.fn_team_luxury_tax('BOS', 2025);
```

Returns:
| Column | Description |
|--------|-------------|
| team_code | Team code |
| salary_year | Year |
| tax_salary | Team's tax salary (from warehouse) |
| tax_level | Tax level threshold (from system values) |
| over_tax_amount | Amount exceeding tax level |
| is_repeater | Repeater taxpayer flag |
| luxury_tax_owed | Calculated tax payment |

### `pcms.fn_all_teams_luxury_tax(salary_year)`

Returns luxury tax for ALL teams in a year, ordered by tax owed DESC:

```sql
SELECT * FROM pcms.fn_all_teams_luxury_tax(2025);
```

---

## 6. Data Dependencies

| Source | Table | Columns Used |
|--------|-------|--------------|
| Tax brackets/rates | `pcms.league_tax_rates` | `salary_year`, `lower_limit`, `upper_limit`, `tax_rate_*`, `base_charge_*` |
| Tax level threshold | `pcms.league_system_values` | `tax_level_amount` |
| Team tax salary | `pcms.team_salary_warehouse` | `tax_amount`, `is_repeater_taxpayer` |

---

## 7. Validation

To validate against Sean's outputs, run:

```sql
-- Check a known team's tax payment
SELECT * FROM pcms.fn_team_luxury_tax('BOS', 2025);

-- Compare all teams
SELECT 
    team_code,
    over_tax_amount,
    luxury_tax_owed,
    is_repeater
FROM pcms.fn_all_teams_luxury_tax(2025)
WHERE luxury_tax_owed > 0;
```

Compare results to Sean's `team_summary.json` col AB values.

---

## 8. Edge Cases Handled

- **Under tax line**: Returns 0 if `over_tax_amount <= 0`
- **NULL inputs**: Returns 0 if amount is NULL
- **Missing bracket**: Returns 0 if no matching bracket found (shouldn't happen with valid data)
- **Top bracket**: Handles `upper_limit IS NULL` for the highest tier

---

## 9. Related Specs

- `reference/warehouse/specs/tax_array.md` — Full tax array worksheet analysis
- `reference/warehouse/specs/team_summary.md` — Team summary outputs (includes Tax Payment)

---

## 10. TODO / Follow-ups

- [ ] Validate 2025 rates reflect new CBA (1.0 non-repeater, 3.0 repeater for bracket 1)
- [ ] Add unit tests in `queries/sql/` for tax calculation edge cases
- [ ] Consider adding `fn_luxury_tax_from_salary(salary_year, team_tax_salary, is_repeater)` that auto-subtracts tax level
