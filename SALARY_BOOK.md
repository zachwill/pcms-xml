# Salary Book / Playground Data Guide

**Updated:** 2026-01-31

This repo implements **Sean-style salary cap tooling powered by Postgres**: fast, indexed, refreshable **warehouse tables** + a complete set of **trade-math and tax primitives**.

---

## How Close Are We to Sean's Workbook?

We have **near-complete parity** with Sean's Excel workbook for the core analyst use cases.

### ✅ What We Have (matches Sean's functionality)

| Sean Concept | Our Implementation | Status |
|--------------|-------------------|--------|
| **Y Warehouse** (player salary matrix) | `pcms.salary_book_warehouse` | ✅ Complete |
| **Team Summary** (team totals vs cap/tax/apron) | `pcms.team_salary_warehouse` | ✅ Complete |
| **Exceptions** (TPE/MLE/BAE by team) | `pcms.exceptions_warehouse` | ✅ Complete |
| **Tax Array** (luxury tax brackets) | `pcms.league_tax_rates` | ✅ Complete |
| **Tax Payment** (luxury tax calculation) | `pcms.fn_luxury_tax_amount()` | ✅ Complete |
| **System Values** (cap/tax/apron thresholds) | `pcms.league_system_values` | ✅ Complete |
| **Trade Machine** (forward salary matching) | `pcms.fn_tpe_trade_math()` | ✅ Complete |
| **TPE Absorption** (multi-leg trades) | `pcms.fn_trade_plan_tpe()` | ✅ Complete |
| **Rookie Scale** | `pcms.rookie_scale_amounts` | ✅ Complete |
| **Draft Picks** | `pcms.draft_picks_warehouse` | ✅ Complete |
| **Dead Money** (waiver charges) | `pcms.dead_money_warehouse` | ✅ Complete |
| **Cap Holds** (FA holds) | `pcms.cap_holds_warehouse` | ✅ Complete |
| **Repeater Tax Status** | `pcms.team_salary_warehouse.is_repeater_taxpayer` | ✅ Complete |
| **Apron Status** | `pcms.team_salary_warehouse.apron_level_lk` | ✅ Complete |
| **Contract Protections** | `pcms.contract_protections` | ✅ Complete |
| **Trade Kickers** | `salary_book_warehouse.trade_kicker_display` | ✅ Complete |
| **Option Types** | `salary_book_warehouse.option_20xx` | ✅ Complete |
| **Player Consent Flags** | `salary_book_warehouse.can_be_traded_*` | ✅ Complete |
| **Min Contract Detection** | `salary_book_warehouse.is_min_contract_*` | ✅ Complete |

### 🔧 Three Primitives Remaining (specs complete, ready to implement)

| Sean Concept | Primitive Needed | Spec |
|--------------|------------------|------|
| **Can Bring Back** (inverse trade matching) | `fn_can_bring_back()` | `specs/fn_can_bring_back.md` |
| **Multi-Year Minimums** (Years 2-5 escalators) | `fn_minimum_salary()` | `specs/minimum-salary-parity.md` |
| **Buyout Calculator** (stretch/set-off) | `fn_buyout_scenario()` | `specs/buyout-waiver-math.md` |

### ⏳ Lower Priority (not blocking core use cases)

| Sean Concept | Notes |
|--------------|-------|
| Extension calculator (`the_matrix.json`) | CBA algebra for max extensions |
| High/Low projections (`high_low.json`) | Best/worst case contract outcomes |
| Roster charge penalties | Uses `/174` proration constant |

---

## Key Insight: Sean's Reactive Logic

Sean's workbook is powerful because of its **reactive formulas** — change a team selector or trade inputs, and everything recalculates.

Our Postgres approach delivers the same behavior:
- **Team rosters**: `WHERE team_code = 'BOS'`
- **Trade scenarios**: `fn_trade_plan_tpe('BOS', 2025, ARRAY[player_ids], ...)`
- **Tax projections**: `fn_team_luxury_tax('BOS', 2025)`
- **Multi-year views**: `salary_book_yearly` pivots wide → tall

The warehouse tables are pre-aggregated for fast queries. The primitives compose for scenario modeling.

---

## Canonical Tables for Tooling

### Player-Level: `pcms.salary_book_warehouse`

One row per active player. The primary source for Salary Book / Playground queries.

```sql
SELECT player_name, team_code, 
       cap_2025, cap_2026, cap_2027,
       option_2025, option_2026,
       trade_kicker_display, agent_name
FROM pcms.salary_book_warehouse
WHERE team_code = 'BOS'
ORDER BY cap_2025 DESC NULLS LAST;
```

Key columns:
- `cap_20xx`, `tax_20xx`, `apron_20xx` — salary grids (2025–2030)
- `pct_cap_20xx` — salary as % of salary cap (percentile ranking)
- `option_20xx` — option types (TO, PO, NULL for none)
- `option_decision_20xx` — option decisions (picked up/declined/pending)
- `is_two_way`, `is_no_trade`, `is_trade_bonus`, `trade_bonus_percent`
- `trade_kicker_display` — human-readable trade kicker status
- `can_be_traded`, `veto_type`, `consent_type` — trade eligibility
- `is_min_contract`, `is_min_contract_20xx` — minimum salary detection
- `contract_type_lk`, `contract_type_display` — contract classification

### Player-Level (Yearly): `pcms.salary_book_yearly`

One row per (player, year). For trade math that needs consistent per-year shape.

```sql
SELECT salary_year, team_code, cap_amount, tax_amount, apron_amount
FROM pcms.salary_book_yearly
WHERE player_id = 201566
ORDER BY salary_year;
```

### Team-Level: `pcms.team_salary_warehouse`

One row per (team, year). Team totals with cap/tax/apron room calculations.

```sql
SELECT team_code, 
       cap_total, tax_total, apron_total,
       salary_cap_amount, tax_level_amount,
       over_cap, room_under_tax, room_under_apron1,
       is_taxpayer, is_repeater_taxpayer, apron_level_lk
FROM pcms.team_salary_warehouse
WHERE salary_year = 2025
ORDER BY tax_total DESC;
```

### Exceptions: `pcms.exceptions_warehouse`

Trade exceptions by team with proration and usability info.

```sql
SELECT team_code, exception_type_lk, exception_name,
       remaining_amount, prorated_amount,
       expiration_date, can_acquire_player
FROM pcms.exceptions_warehouse
WHERE team_code = 'CLE' AND salary_year = 2025
ORDER BY remaining_amount DESC;
```

---

## Trade Primitives

### Forward Trade Matching: `fn_tpe_trade_math()`

Given outgoing players, compute max incoming salary under CBA rules.

```sql
SELECT * FROM pcms.fn_tpe_trade_math(
    'BOS',                    -- team_code
    2025,                     -- salary_year
    ARRAY[1628369],           -- traded_player_ids (Jaylen Brown)
    ARRAY[]::integer[],       -- replacement_player_ids
    'expanded'                -- tpe_type ('standard' or 'expanded')
);
```

### Trade Planner: `fn_trade_plan_tpe()`

Full trade scenario with multi-leg absorption. Returns JSON with `absorption_legs`, `main_leg`, `summary`.

```sql
SELECT pcms.fn_trade_plan_tpe(
    'BOS', 2025,
    ARRAY[player1, player2],  -- outgoing
    ARRAY[player3],           -- incoming
    ARRAY[exception_id]       -- TPE to use
);
```

### Luxury Tax: `fn_luxury_tax_amount()`

Calculate luxury tax owed given amount over tax line.

```sql
-- For a specific team
SELECT * FROM pcms.fn_team_luxury_tax('BOS', 2025);

-- All taxpayers
SELECT * FROM pcms.fn_all_teams_luxury_tax(2025) 
WHERE luxury_tax_owed > 0;
```

---

## Differences from Sean's Workbook

### Things We Handle Better

1. **Normalized option types**: Sean uses strings like `'NONE'`, we normalize to `NULL`
2. **Decimal ages**: We compute `age` as decimal years, not integer
3. **Trade kicker states**: We handle `'Used'`, expiration dates, and vesting conditions
4. **Repeater status**: We pull from PCMS `tax_team_status`, not hardcoded IF-chains
5. **Multi-year consistency**: Our yearly view guarantees consistent shape for trade math

### Known Sean Workbook Issues (from our spec analysis)

1. **Hardcoded repeater flags**: Sean's `playground.json` uses IF-chains for 8 teams only
2. **External workbook refs**: Some formulas reference `[2]` (prior-year workbook)
3. **Stale cap holds**: Some cap holds appear for teams that renounced them
4. **Manual overrides**: Some salary values appear manually adjusted

---

## Refresh Functions

Warehouse tables are materialized and need refresh after PCMS imports:

```sql
-- Refresh all caches (run after import)
SELECT pcms.refresh_salary_book_warehouse();
SELECT pcms.refresh_team_salary_warehouse();
SELECT pcms.refresh_exceptions_warehouse();
```

The Windmill flow runs these automatically in step H (`refresh_caches`).

---

## Raw Model (for debugging)

If you need to trace a number back to source:

```
pcms.contracts (1 per contract)
  └── pcms.contract_versions (1+ per contract, amendments)
        └── pcms.salaries (1 per version per year)
pcms.people (player identity)
pcms.agents (agent identity)
pcms.league_system_values (cap/tax constants by year)
pcms.league_tax_rates (tax brackets with base charges)
```

### Key salary fields (from `pcms.salaries`)

| Field | Meaning |
|-------|---------|
| `contract_cap_salary` | Cap hit (Salary Book "cap" grid) |
| `contract_tax_salary` | Tax salary |
| `contract_tax_apron_salary` | Apron salary |
| `total_salary` | Actual paid salary |
| `likely_bonus` / `unlikely_bonus` | Incentives |
| `option_lk` | Option type (PLYR/TEAM/etc) |

---

## Validation

Run assertion tests to verify warehouse correctness:

```bash
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f queries/sql/run_all.sql
```

Compare spot-checks to Sean's data:
```bash
# Find a player in Sean's Y warehouse
jq 'to_entries[] | select(.value.B | test("James.*LeBron"; "i"))' reference/warehouse/y.json

# Compare to our DB
psql "$POSTGRES_URL" -c "
  SELECT player_name, team_code, cap_2025, cap_2026, cap_2027
  FROM pcms.salary_book_warehouse
  WHERE player_name ILIKE '%james%lebron%';
"
```

---

## Related Documentation

| Doc | Purpose |
|-----|---------|
| `TODO.md` | Next implementation priorities |
| `AGENTS.md` | Pipeline architecture + "what counts" rules |
| `reference/warehouse/AGENTS.md` | Sean workbook file guide |
| `reference/warehouse/specs/` | 36 detailed specs for Sean's sheets |
| `queries/README.md` | How we structure SQL assertion tests |
