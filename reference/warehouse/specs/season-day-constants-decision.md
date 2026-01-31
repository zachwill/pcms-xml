# Season-Day Constants: Hardcode vs System Table

**Decision Task:** How to represent `174` (regular season days) and `+2` (waiver clearance) for buyout/stretch tooling.

---

## 1. Current State

### What Sean uses (buyout_calculator.json)

```excel
C2: 2025-10-20 00:00:00     -- season start (literal)
C4: =C3+2                   -- clears waivers = waive_date + 2
C5: =C4-C2                  -- day of season
C6: =174-C5                 -- days remaining
B17: =(C6/174)*B11          -- pro-rata salary
```

Both constants are **hardcoded literals** in Sean's formulas — not referencing any system table.

### What we already have in Postgres

| Column | Source | Status |
|--------|--------|--------|
| `pcms.league_system_values.days_in_season` | PCMS (`yearly_system_values.json`) | ✅ Ingested, per-year |
| `pcms.league_system_values.season_start_at` | PCMS (`first_day_of_season`) | ✅ Ingested, per-year |
| Waiver clearance period (2 days) | — | ❌ Not stored |

Evidence from `import_pcms_data.flow/league_config.inline_script.py`:
```python
"days_in_season": to_int(sv.get("days_in_season")),
"season_start_at": sv.get("first_day_of_season"),
```

Evidence from `migrations/042_exceptions_warehouse_proration.sql`:
```sql
-- days_in_season (NBA=174)
SELECT lsv.salary_year, lsv.days_in_season, ...
FROM pcms.league_system_values lsv
WHERE lsv.league_lk = 'NBA'
```

---

## 2. Decision

### `174` (days in regular season): **Use system table**

**Recommendation:** Continue using `pcms.league_system_values.days_in_season`.

**Rationale:**
- Already ingested per-year from PCMS source
- Already used in `pcms.refresh_exceptions_warehouse()` for proration
- Allows flexibility if CBA changes season length
- Year-scoped (important: buyouts for 2025 vs 2026 season could differ)

### `+2` (waiver clearance period): **Hardcode in SQL functions**

**Recommendation:** Hardcode `2` in buyout/stretch functions.

**Rationale:**
1. **CBA stability**: The 48-hour (2-day) waiver clearance is a core CBA rule unchanged for decades
2. **Not in PCMS source**: There is no `waiver_clearance_days` field in PCMS yearly_system_values
3. **Implementation simplicity**: Adding a column for a constant that never changes adds unnecessary complexity
4. **Sean's approach**: He hardcodes it too (`=C3+2`)

**If this changes in a future CBA:**
- Add `waiver_clearance_days` column to `league_system_values`
- Update PCMS ingest (if source adds it) or seed manually
- Update affected functions to read from table

---

## 3. Proposed Implementation

### For `fn_buyout_scenario()` (future)

```sql
CREATE OR REPLACE FUNCTION pcms.fn_buyout_proration(
  p_salary_year integer,
  p_waive_date date
)
RETURNS TABLE (
  days_remaining integer,
  proration_factor numeric
)
LANGUAGE sql STABLE
AS $$
  WITH cal AS (
    SELECT
      days_in_season,
      (season_start_at AT TIME ZONE 'UTC')::date AS season_start
    FROM pcms.league_system_values
    WHERE league_lk = 'NBA'
      AND salary_year = p_salary_year
  )
  SELECT
    -- clearance = waive_date + 2 (48-hour rule, hardcoded)
    GREATEST(0, cal.days_in_season - ((p_waive_date + 2) - cal.season_start)::int) AS days_remaining,
    GREATEST(0::numeric, 
      (cal.days_in_season - ((p_waive_date + 2) - cal.season_start)::int)::numeric 
      / cal.days_in_season::numeric
    ) AS proration_factor
  FROM cal;
$$;
```

### Pattern

```sql
-- days_in_season: from system table
cal.days_in_season

-- waiver clearance: hardcoded constant (48 hours = 2 days)
p_waive_date + 2  -- or: INTERVAL '2 days'
```

---

## 4. Summary

| Constant | Value | Storage | Justification |
|----------|-------|---------|---------------|
| Regular season days | 174 | `pcms.league_system_values.days_in_season` | Already exists, per-year, from PCMS |
| Waiver clearance | +2 days | Hardcode in SQL | Stable CBA rule, not in source |
| Season start | date | `pcms.league_system_values.season_start_at` | Already exists, per-year, from PCMS |

---

## 5. Related

- `reference/warehouse/specs/buyout-waiver-math.md` — full buyout/stretch scenario math
- `migrations/042_exceptions_warehouse_proration.sql` — existing use of `days_in_season`
