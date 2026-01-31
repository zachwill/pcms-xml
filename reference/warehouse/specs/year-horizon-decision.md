# Year Horizon Decision: Keep 2025–2030 vs Extend to 2031

**Source files analyzed:**
- `reference/warehouse/y.json` (Y Warehouse)
- `reference/warehouse/dynamic_contracts.json`
- `reference/warehouse/system_values.json`

**Date:** 2026-01-31

---

## 1. Summary / Recommendation

**Decision: Keep 2025–2030 for now.**

Sean's workbook has columns through 2031, but:
- **Zero actual player contracts extend to 2031**
- The 2031 column is only used for hypothetical/projection rows and formula-based lookups
- PCMS max `salary_year` = 2030

Extending to 2031 would add complexity with no immediate benefit. Revisit in 2026–27 offseason when contracts may start to reach 2031.

---

## 2. Evidence: Actual Contract Data

### dynamic_contracts.json (raw contract rows)

Distribution of `Salary Year` (column J):

| Year | Count |
|------|-------|
| 2025 | 446 |
| 2026 | 333 |
| 2027 | 208 |
| 2028 | 105 |
| 2029 | 28 |
| 2030 | 7 |
| 2031 | **0** |

**Max salary_year = 2030** (7 contracts reach 2030).

### y.json (pivoted salary matrix)

Player rows 3–612 with team assignment:
- 457 players: no 2030 or 2031 salary
- 8 players: have 2030 salary, no 2031
- **0 players: have actual 2031 salary**

The only 2031 values in y.json column J are:
1. Header formula: `=I2+1` (generates "2031" label)
2. Hypothetical projection rows (e.g., "Clingan 5 125" = rookie extension scenario)
3. MLE/BAE/Rookie Scale lookup rows (e.g., "MLE 2031", "25% 2031")

Example hypothetical row (not a real contract):
```json
"599": {
  "B": "Clingan 4 100",
  "C": "-",              // no team = hypothetical
  "J": "27678571.428"    // 2031 projection
}
```

---

## 3. Evidence: System Values

Sean's `system_values.json` row 11 (2031):

```json
{
  "A": "2031",
  "B": "1.07",  // growth rate assumption
  "G": "=INDEX(GrowthRate[...], ...)*G10",  // cap = formula, not actual
  "H": "=INDEX(GrowthRate[...], ...)*H10"   // tax = formula, not actual
}
```

2031 system values are **projected via 7% growth**, not official NBA values.

Our `pcms.league_system_values` comes from PCMS and likely only has through 2026 (official) with 2027+ as projections.

---

## 4. Current Warehouse Schema (2025–2030)

From `migrations/013_salary_book_warehouse.sql`:

```sql
cap_2025 bigint,
cap_2026 bigint,
cap_2027 bigint,
cap_2028 bigint,
cap_2029 bigint,
cap_2030 bigint,
-- no cap_2031

option_2025 text,
...
option_2030 text,
-- no option_2031
```

This matches the **actual data range** from PCMS.

---

## 5. Why Sean Has 2031 Columns

Sean's workbook is designed for:
1. **Scenario planning** — what if a rookie signs a max extension?
2. **Exception projections** — what will BAE/MLE be in 2031?
3. **Multi-year trade impact** — how does a max contract affect future years?

These use-cases need a 7-year horizon (6 years forward from 2025), but the 2031 column:
- Contains only formulas/projections
- Has no underlying contract data
- Derives from system values that are themselves projected

---

## 6. Implementation Cost to Extend

Adding 2031 would require:

1. **Schema migration** — add `cap_2031`, `tax_2031`, `apron_2031`, `option_2031`, etc.
2. **Refresh function** — extend SELECT/CASE statements
3. **salary_book_yearly view** — add 2031 to UNION
4. **league_system_values** — add projected 2031 row (7% growth)
5. **All downstream caches** — team_salary_warehouse, etc.

This is ~2 hours of work, but adds maintenance burden with no data benefit.

---

## 7. When to Revisit

Extend to 2031 when:
- **PCMS starts including 2031 salary data** (likely 2026–27 offseason after extensions)
- **NBA publishes official 2027+ cap projections** (currently estimated)
- **Tool requirements change** — e.g., UI needs to show 7-year contract horizon

Suggested trigger: when `pcms.salaries` has >10 contracts with `salary_year = 2031`.

---

## 8. Mapping Summary

| Sheet Column | Our Schema | Status |
|--------------|------------|--------|
| D (2025) | `cap_2025` | ✅ |
| E (2026) | `cap_2026` | ✅ |
| F (2027) | `cap_2027` | ✅ |
| G (2028) | `cap_2028` | ✅ |
| H (2029) | `cap_2029` | ✅ |
| I (2030) | `cap_2030` | ✅ |
| J (2031) | — | ❌ Not needed (no data) |

Same pattern for `tax_20XX`, `apron_20XX`, `option_20XX`.

---

## 9. Open Questions

None — decision is clear.

---

## 10. Related Docs

- `reference/warehouse/specs/y.md` — Y Warehouse spec (notes 2031 gap)
- `reference/warehouse/specs/system_values.md` — CBA constants spec
- `SALARY_BOOK.md` — warehouse usage guide
