# TODO.md — `reference/` Next Steps

**Created: 2026-01-30**

This document tracks work to do with the reference materials, particularly validating our `pcms.*` warehouse tables against Sean's new Excel exports in `reference/warehouse/`.

---

## Priority 1: Validation (Compare Our Output to Sean's)

The most immediate value — confirm our warehouse tables match what Sean sees.

### Player-Level Spot Checks

Compare `pcms.salary_book_warehouse` to `reference/warehouse/y.json`:

```bash
# Find a player in Sean's data
jq 'to_entries[] | select(.value.B == "James, LeBron")' reference/warehouse/y.json

# Compare to our DB
psql "$POSTGRES_URL" -c "
  SELECT player_id, display_name, team_code,
         cap_2025, cap_2026, cap_2027,
         tax_2025, tax_2026, tax_2027
  FROM pcms.salary_book_warehouse
  WHERE display_name ILIKE '%james%lebron%';
"
```

**Players to spot-check:**
- [ ] LeBron James (max contract, older player)
- [ ] Victor Wembanyama (rookie scale)
- [ ] A player with a team option
- [ ] A player with a player option
- [ ] A player on a two-way contract

**What to compare:**
- Salary amounts by year (cap/tax/apron)
- Team assignment
- Option flags
- Agent name

### Team-Level Spot Checks

Compare `pcms.team_salary_warehouse` to `reference/warehouse/team_summary.json`:

```bash
# Check team_summary structure
jq '."5", ."6", ."7"' reference/warehouse/team_summary.json

# Compare to our DB
psql "$POSTGRES_URL" -c "
  SELECT team_code, salary_year, total_cap, total_tax, total_apron
  FROM pcms.team_salary_warehouse
  WHERE team_code = 'BOS' AND salary_year = 2025;
"
```

**Teams to spot-check:**
- [ ] BOS (tax team, repeater)
- [ ] OKC (young team, lots of rookie scale)
- [ ] POR (rebuilding, cap space)

### System Values Cross-Check

Compare `pcms.league_system_values` to `reference/warehouse/system_values.json`:

```bash
# Sean's 2025 constants (row 8 based on earlier inspection)
jq '."8"' reference/warehouse/system_values.json

# Our constants
psql "$POSTGRES_URL" -c "
  SELECT salary_year, salary_cap, tax_level, first_apron, second_apron
  FROM pcms.league_system_values
  WHERE salary_year IN (2025, 2026, 2027)
  ORDER BY salary_year;
"
```

- [ ] Verify cap/tax/apron match for 2025, 2026, 2027
- [ ] Check if Sean has projected values we're missing (2028+)

### Exceptions Cross-Check

Compare `pcms.exceptions_warehouse` to `reference/warehouse/exceptions.json`:

```bash
# Sample from Sean's exceptions
jq '."10", ."20", ."30"' reference/warehouse/exceptions.json

# Our exceptions
psql "$POSTGRES_URL" -c "
  SELECT team_code, exception_type, remaining_amount, expiration_date
  FROM pcms.exceptions_warehouse
  WHERE team_code = 'CLE'
  ORDER BY remaining_amount DESC;
"
```

- [ ] Verify TPE amounts match
- [ ] Verify MLE/BAE assignments
- [ ] Check expiration dates

---

## Priority 2: Gap Analysis

Things Sean has that we haven't built yet.

### Not Started

| Sean File | Concept | Notes |
|-----------|---------|-------|
| `the_matrix.json` | Extension calculator | CBA algebra for extension scenarios (8% raises, 120%/140% starting max) |
| `buyout_calculator.json` | Buyout scenarios | Calculate buyout amounts and cap implications |
| `set-off.json` | Waiver set-off math | How much a waiving team saves when player signs elsewhere |
| `high_low.json` | High/low salary projections | Best/worst case contract outcomes based on options/incentives |

### Partial

| Sean File | Concept | Our Status | Gap |
|-----------|---------|------------|-----|
| `machine.json` | Trade machine | Have primitives (`fn_post_trade_apron`, etc.) | Need full trade validation logic |
| `tax_array.json` | Tax bracket calculations | Have constants | Need incremental tax calc function |
| `draft_picks.json` | Draft pick tracking | Have `pcms.draft_picks` table | May need ownership chain / trade tracking |

### Probably Complete

| Sean File | Concept | Our Table |
|-----------|---------|-----------|
| `y.json` | Player salary matrix | `pcms.salary_book_warehouse` |
| `team_summary.json` | Team totals | `pcms.team_salary_warehouse` |
| `exceptions.json` | Trade exceptions | `pcms.exceptions_warehouse` |
| `system_values.json` | CBA constants | `pcms.league_system_values` |
| `rookie_scale_amounts.json` | Rookie scale | `pcms.rookie_scale` |

---

## Priority 3: Tooling

### Lightweight Parser (optional)

If validation becomes tedious, build a small Python script:

```python
# scripts/load_warehouse_json.py
import json
from pathlib import Path

def load_sheet(name: str) -> dict:
    """Load a warehouse JSON file, return as {row_num: {col: value}}."""
    path = Path(f"reference/warehouse/{name}.json")
    return json.loads(path.read_text())

def get_player_row(sheet: dict, name: str, name_col: str = "B") -> dict | None:
    """Find a player by name in a sheet."""
    for row_num, row in sheet.items():
        if row.get(name_col) == name:
            return {"row": row_num, **row}
    return None
```

### Comparison Script (if needed)

```python
# scripts/compare_to_sean.py
# Takes a player name, fetches from both sources, shows diff
```

---

## Priority 4: Documentation Maintenance

- [ ] Update `reference/sean/specs/` if we find the concepts have drifted significantly
- [ ] Consider consolidating specs into `reference/warehouse/` if we rewrite them
- [ ] Keep `reference/warehouse/AGENTS.md` updated as we learn more about column meanings

---

## Questions to Answer

1. **Year alignment**: Is Sean's Y warehouse now 2025-26 base, or has it shifted to 2026-27?
2. **Hypothetical rows**: How many rows in `y.json` are real players vs. scenario placeholders?
3. **Formula-only columns**: Which columns in `dynamic_contracts.json` are computed vs. raw data?
4. **Trade bonus handling**: Does Sean's `trade_bonus_amounts.json` match our `pcms.contract_amounts.trade_bonus_*` fields?

---

## Quick Reference: Key File Mappings

| Sean File | Row Key | Name Column | Salary Columns | Team Column |
|-----------|---------|-------------|----------------|-------------|
| `y.json` | row num | B | D (2025), E (?), F (?)... | C |
| `dynamic_contracts.json` | row num | D+E (first+last) | K, L, M... | G |
| `exceptions.json` | row num | C (type) | F (amount) | B |
| `team_summary.json` | row num | ? | ? | ? |

(Fill in as we learn more from validation)
