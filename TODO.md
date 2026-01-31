# TODO.md — Next Implementation Priorities

**Updated:** 2026-01-31

This document tracks the next primitives needed to achieve full parity with Sean's analyst tooling.

---

## Overview

We've built the foundation:
- ✅ **Salary Book** (`salary_book_warehouse`) — player salaries by year
- ✅ **Team Totals** (`team_salary_warehouse`) — team cap/tax/apron by year
- ✅ **Trade Math** (`fn_tpe_trade_math`, `fn_post_trade_apron`, `fn_trade_plan_tpe`)
- ✅ **Luxury Tax** (`fn_luxury_tax_amount`, `fn_team_luxury_tax`, `fn_all_teams_luxury_tax`)
- ✅ **Exceptions** (`exceptions_warehouse`) — TPE/MLE/BAE by team
- ✅ **Dead Money** (`dead_money_warehouse`) — waiver/buyout cap charges
- ✅ **Cap Holds** (`cap_holds_warehouse`) — FA holds by team

Three focused primitives will close most remaining gaps:

| Priority | Primitive | Spec | Use Case |
|----------|-----------|------|----------|
| **1** | `fn_can_bring_back` | Complete | Inverse trade matching: "what can I acquire for this player?" |
| **2** | `fn_minimum_salary` | Complete | Multi-year minimum escalators (Years 2-5) |
| **3** | Buyout/waiver primitives | Complete | Buyout scenarios, stretch provisions, set-off calculations |

---

## Priority 1: `fn_can_bring_back` (Inverse Trade Matching)

**Spec:** `reference/warehouse/specs/fn_can_bring_back.md`

### What it does

Given a player's salary, compute the **minimum incoming salary** the other team must send to match.

This is the inverse of `fn_tpe_trade_math()` which computes *outgoing → max incoming*.

### Use case

"Can Bring Back" tables: for each player on a roster, show what salary range they can acquire in return.

### Formula (from Sean's machine.json E5)

```python
def can_bring_back(incoming_salary, tpe_allowance, mode='expanded'):
    """Given incoming salary (the player you'd trade away), return minimum outgoing needed."""
    if mode == 'standard':
        return incoming_salary - tpe_allowance
    
    # Expanded mode (2025 thresholds)
    low_tier = 8_277_000
    high_tier = 33_208_000
    
    net = incoming_salary - tpe_allowance
    if net <= low_tier:
        return (incoming_salary - 250_000) / 2        # invert 200% + 250K
    elif net > high_tier:
        return (incoming_salary - 250_000) / 1.25     # invert 125% + 250K
    else:
        return incoming_salary - tpe_allowance        # invert 100% + TPE
```

### Implementation plan

1. Add thresholds to `pcms.league_system_values` (or use constants):
   - `tpe_dollar_allowance` (2025: $8,527,000)
   - `low_tier_threshold` (2025: $8,277,000)  
   - `high_tier_inverse` (2025: $33,208,000)

2. Create function:
```sql
CREATE OR REPLACE FUNCTION pcms.fn_can_bring_back(
    p_salary_year integer,
    p_outgoing_salary bigint,
    p_mode text DEFAULT 'expanded'
) RETURNS bigint
```

3. Add wrapper for player lookup:
```sql
CREATE OR REPLACE FUNCTION pcms.fn_player_can_bring_back(
    p_player_id integer,
    p_salary_year integer,
    p_mode text DEFAULT 'expanded'
) RETURNS bigint
```

### Validation

Compare to Sean's Trade Machine "Can Bring Back" zone (rows 32+).

---

## Priority 2: `fn_minimum_salary` (Multi-Year Escalators)

**Spec:** `reference/warehouse/specs/minimum-salary-parity.md`

### What it does

PCMS only provides Year 1 minimums. Sean derives Years 2-5 using CBA escalator percentages.

### Escalator constants

| Contract Year | Escalator | Notes |
|---------------|-----------|-------|
| Year 1 | — | From `pcms.league_salary_scales` |
| Year 2 | +5.0% | All YOS |
| Year 3 | +4.7% | All YOS |
| Year 4 | +4.5% or +4.7% | 4.5% for YOS=3, 4.7% for YOS≥4 |
| Year 5 | +4.3% | All YOS |

### Implementation

```sql
CREATE OR REPLACE FUNCTION pcms.fn_minimum_salary(
    p_salary_year integer,       -- e.g., 2025
    p_years_of_service integer,  -- 0-10
    p_contract_year integer      -- 1, 2, 3, 4, or 5
) RETURNS bigint
LANGUAGE plpgsql STABLE AS $$
DECLARE
    v_base bigint;
    v_result bigint;
BEGIN
    -- Get Year 1 from table
    SELECT minimum_salary_amount INTO v_base
    FROM pcms.league_salary_scales
    WHERE salary_year = p_salary_year
      AND league_lk = 'NBA'
      AND years_of_service = p_years_of_service;
    
    IF v_base IS NULL OR p_contract_year = 1 THEN
        RETURN v_base;
    END IF;
    
    -- Year 2: +5%
    v_result := ROUND(v_base * 1.05);
    IF p_contract_year = 2 THEN RETURN v_result; END IF;
    
    -- Year 3: +4.7%
    v_result := ROUND(v_result * 1.047);
    IF p_contract_year = 3 THEN RETURN v_result; END IF;
    
    -- Year 4: +4.5% for YOS=3, +4.7% for YOS>=4
    v_result := ROUND(v_result * CASE WHEN p_years_of_service = 3 THEN 1.045 ELSE 1.047 END);
    IF p_contract_year = 4 THEN RETURN v_result; END IF;
    
    -- Year 5: +4.3%
    RETURN ROUND(v_result * 1.043);
END;
$$;
```

### Validation

Compare output to Sean's `minimum_salary_scale.json` rows 16-50 for 2025/2026.

---

## Priority 3: Buyout & Waiver Primitives

**Spec:** `reference/warehouse/specs/buyout-waiver-math.md`

### Overview

Three related functions for buyout/waiver scenario modeling:

| Function | Purpose |
|----------|---------|
| `fn_buyout_scenario` | Calculate dead money from a buyout |
| `fn_stretch_waiver` | Calculate stretched dead money |
| `fn_setoff_amount` | Calculate set-off when waived player signs elsewhere |

### Core constants

```sql
-- Should add to pcms.league_system_values or create constants table
REGULAR_SEASON_DAYS = 174
WAIVER_CLEARANCE_DAYS = 2
```

### 3a. `fn_days_remaining(waive_date, season_start)`

```sql
CREATE OR REPLACE FUNCTION pcms.fn_days_remaining(
    p_waive_date date,
    p_season_start date DEFAULT '2025-10-20'::date
) RETURNS integer AS $$
    SELECT GREATEST(0, 174 - ((p_waive_date + 2) - p_season_start)::integer);
$$ LANGUAGE sql IMMUTABLE;
```

### 3b. `fn_buyout_scenario(player_id, waive_date, give_back_amount)`

Returns per-year breakdown:
- `guaranteed_remaining` — prorated for current year, full for future years
- `give_back_allocation` — proportional split of player concession
- `dead_money` — guaranteed minus give-back

```sql
CREATE OR REPLACE FUNCTION pcms.fn_buyout_scenario(
    p_player_id integer,
    p_waive_date date,
    p_give_back_amount bigint DEFAULT 0
) RETURNS TABLE (
    salary_year integer,
    cap_salary bigint,
    days_remaining integer,
    proration_factor numeric,
    guaranteed_remaining bigint,
    give_back_pct numeric,
    give_back_amount bigint,
    dead_money bigint
)
```

### 3c. `fn_stretch_waiver(total_dead_money, remaining_years)`

```sql
CREATE OR REPLACE FUNCTION pcms.fn_stretch_waiver(
    p_total_dead_money bigint,
    p_remaining_years integer
) RETURNS TABLE (
    stretch_years integer,
    annual_amount bigint
) AS $$
    SELECT 
        2 * p_remaining_years + 1 AS stretch_years,
        p_total_dead_money / (2 * p_remaining_years + 1) AS annual_amount;
$$ LANGUAGE sql IMMUTABLE;
```

### 3d. `fn_setoff_amount(new_salary, years_of_service, salary_year)`

```sql
CREATE OR REPLACE FUNCTION pcms.fn_setoff_amount(
    p_new_salary bigint,
    p_years_of_service integer DEFAULT 1,
    p_salary_year integer DEFAULT 2025
) RETURNS bigint AS $$
    SELECT GREATEST(0, 
        (p_new_salary - pcms.fn_minimum_salary(p_salary_year, p_years_of_service, 1)) / 2
    );
$$ LANGUAGE sql STABLE;
```

### Validation

Compare to Sean's `buyout_calculator.json` and `kuzma_buyout.json` examples.

---

## Implementation Order

```
┌─────────────────────────────────────────────────────────────┐
│  Week 1: fn_can_bring_back                                  │
│  - Add threshold constants to league_system_values          │
│  - Implement inverse trade matching function                │
│  - Add assertion tests comparing to machine.json            │
├─────────────────────────────────────────────────────────────┤
│  Week 2: fn_minimum_salary                                  │
│  - Implement escalator function                             │
│  - Add assertion tests vs minimum_salary_scale.json         │
│  - Consider: add min salary flag to salary_book_warehouse   │
├─────────────────────────────────────────────────────────────┤
│  Week 3: Buyout primitives                                  │
│  - Implement fn_days_remaining, fn_stretch_waiver           │
│  - Implement fn_buyout_scenario                             │
│  - Implement fn_setoff_amount                               │
│  - Add assertion tests vs buyout examples                   │
└─────────────────────────────────────────────────────────────┘
```

---

## After These Priorities

Once these three are done, remaining gaps are lower priority:

| Gap | Sean Source | Notes |
|-----|-------------|-------|
| Extension calculator | `the_matrix.json` | CBA algebra for max extensions (8% raises, 120%/140% starting max) |
| High/Low projections | `high_low.json` | Best/worst case outcomes based on options/incentives |
| Roster charge penalties | `team_summary.json` | <12 or <14 roster charge (uses `/174` proration) |
| Multi-team trade scenarios | `the_matrix.json` | Complex, builds on existing primitives |

---

## Related Files

- `SALARY_BOOK.md` — Guide to using warehouse tables
- `reference/warehouse/AGENTS.md` — Sean workbook overview
- `reference/warehouse/specs/` — Detailed specs for all Sean sheets
- `queries/sql/` — Assertion tests
