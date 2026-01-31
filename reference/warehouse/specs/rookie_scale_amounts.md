# Spec: `rookie_scale_amounts.json`

## 1. Purpose

Lookup table providing **NBA rookie scale salary amounts** by pick number (1–30) and draft year (2025–2031). Used to determine guaranteed contract values for first-round draft picks, plus derived values like Qualifying Offers (QO), FA amounts, and cap holds.

The CBA mandates specific salaries for first-round picks based on draft slot; this sheet is the authoritative reference for those amounts and related CBA calculations.

---

## 2. Key Inputs / Controls

**No user inputs.** This is a reference table. All data is derived from:

- **SystemValues table** (rows 5–12 reference `CapAmounts` which pulls salary cap from `SystemValues`)
- **Hardcoded CBA percentages** (Year 1 % Cap, escalator rates, QO increases by pick)

---

## 3. Key Outputs

### CapAmounts Table (rows 5–12)
Lookup table for salary cap by season:

| Column | Name | Example (row 6) |
|--------|------|-----------------|
| A | Season | `2025` |
| B | Salary Cap | `=INDEX(SystemValues[[#Data],[Salary Cap]], ...)` |
| C | Est. Avg. Salary | `=INDEX(SystemValues[[#Data],[Est. Avg. Salary]], ...)` |
| D | 25% | `=CapAmounts[[#Headers],[25%]]*...` |

### RSC Table (rows 15–225+)
Main rookie scale data. 30 picks × 7 seasons = 210 data rows.

| Column | Name | Description |
|--------|------|-------------|
| A | Pick | e.g. `#1 2025`, `#30 2026` |
| B | Season | Draft year (2025–2031) |
| C | Year 1 | Year 1 salary (literal or formula) |
| D | Year 2 | Year 2 salary (Year 1 × 1.05) |
| E | Year 3 | Year 3 salary (Year 2 × 1.05) |
| F | Year 4 | Year 4 salary (team option, Year 3 × escalator) |
| G | 80–120% | Scale factor (1.2 = 120% of scale) |
| H | Year 1 % Cap | Base percentage of salary cap |
| I | Year 2 ↑ | Year-over-year increase (0.05 = 5%) |
| J | Year 3 ↑ | Year-over-year increase (0.05 = 5%) |
| K | Year 4 ↑ | Team option escalator (varies by pick, 1.261–1.805) |
| L | QO Increase | Qualifying Offer increase percentage (0.40–0.60) |
| M | FA Amount | Estimated FA value (Year 4 × 3, with cap) |
| N | Starter Criteria | `"Yes"` or `"No"` (picks 1–9 = Yes) |
| O | QO | Qualifying Offer amount |
| P | Cap Hold | `MAX(FA Amount, QO)` |

---

## 4. Layout / Zones

```
Row 1:       Title "Rookie Scale Amounts"
Row 3:       Section "Salary Cap Amounts"
Rows 5-12:   CapAmounts table (Season → Cap/Avg Salary/25%)
Row 15:      RSC table headers
Rows 16-45:  Pick #1-#30 for 2025
Rows 46:     (transition row with sparse formulas)
Rows 47-76:  Pick #1-#30 for 2026
...          (continues for 2027-2031)
~Row 225:    End of main RSC data
Rows 226+:   Additional formula rows (sparse)
```

---

## 5. Cross-Sheet Dependencies

### Inbound (this sheet reads from)
- **SystemValues** — salary cap and estimated average salary by season
  - Formula: `=INDEX(SystemValues[[#Data],[Salary Cap]], MATCH(...))`

### Outbound (other sheets read from this)
- **y.json** — references `"Rookie Scale Amounts | Qualifying Offers"` (row 741 header)
  - Used for QO calculations in the Y Warehouse

---

## 6. Key Formulas / Logic

### Year 1 Salary (column C, e.g. row 78 for pick #1 2027)
```excel
=ROUND((_xlfn.XLOOKUP(RSC[[#This Row],[Season]], CapAmounts[Season], CapAmounts[Salary Cap])
        * RSC[[#This Row],[Year 1 % Cap]])
       * RSC[[#This Row],[80 - 120%]], 0)
```
Year 1 = `SalaryCap × Year1%Cap × ScaleFactor`

### Year 2–3 Escalation (columns D, E)
```excel
D: =ROUND(RSC[[#This Row],[Year 1]]*(1+RSC[[#This Row],[Year 2 ↑]]),0)
E: =ROUND(RSC[[#This Row],[Year 2]]*(1+RSC[[#This Row],[Year3 ↑]]),0)
```
Standard 5% annual increase.

### Year 4 Team Option (column F)
```excel
=ROUND(RSC[[#This Row],[Year 3]]*(RSC[[#This Row],[Year 4 ↑]]),0)
```
Year 4 option escalator varies by pick (26.1% for #1 up to 80.5% for #30).

### FA Amount (column M)
```excel
=IF(AND(F16>$C$10, F16*2.5>$D$10), $C$10, F16*3)
```
FA amount = Year 4 × 3, unless capped by average salary thresholds.

For top picks (rows 16–17):
```excel
=RSC[[#This Row],[Year 4]]*3
```
(No cap logic for picks 1–2.)

### Qualifying Offer (column O)
```excel
=ROUND(IF(N16="No", F30*(L30+1), (F16*(1+L16))), 0)
```
- If Starter Criteria = "No": use standard QO formula
- If "Yes" (picks 1–9): Year 4 × (1 + QO Increase)

### Cap Hold (column P)
```excel
=IF(RSC[[#This Row],[FA Amount]]>RSC[[#This Row],[QO]], 
    RSC[[#This Row],[FA Amount]], 
    RSC[[#This Row],[QO]])
```
Cap hold = `MAX(FA Amount, QO)`.

---

## 7. Mapping to Postgres Model

| Sean Concept | Our Table | Notes |
|--------------|-----------|-------|
| Pick + Season → Year 1–4 salaries | `pcms.rookie_scale_amounts` | Table mentioned in AGENTS.md but may not exist yet |
| Salary Cap by season | `pcms.league_system_values` | ✅ Exists |
| QO / Cap Hold amounts | — | May need to add if contract planning tools require |

### Schema Gap
The `pcms.rookie_scale_amounts` table is referenced in `AGENTS.md` mapping section but may not be implemented. If needed, structure would be:

```sql
CREATE TABLE pcms.rookie_scale_amounts (
  pick_number INT NOT NULL,          -- 1-30
  draft_year INT NOT NULL,           -- 2025-2031+
  year_1_salary BIGINT,
  year_2_salary BIGINT,
  year_3_salary BIGINT,
  year_4_salary BIGINT,              -- team option
  year_1_pct_cap NUMERIC(8,6),       -- e.g. 0.074502
  year_4_escalator NUMERIC(5,3),     -- e.g. 1.261
  qo_increase NUMERIC(5,3),          -- e.g. 0.40
  starter_criteria BOOLEAN,
  fa_amount BIGINT,
  qualifying_offer BIGINT,
  cap_hold BIGINT,
  PRIMARY KEY (pick_number, draft_year)
);
```

---

## 8. Open Questions / TODO

1. **Table existence**: Verify if `pcms.rookie_scale_amounts` exists or needs creation.

2. **Future years**: Rows show formulas for 2027–2031 but computed values depend on projected salary caps. Sean has these projected in SystemValues. Do we need to store projected scales or compute on-demand?

3. **Second-round picks**: This sheet only covers picks 1–30 (first round). Second-round picks aren't on the rookie scale—they negotiate freely. No gap.

4. **Scale factor 120%**: All rows show `G = 1.2` (120% of scale). This is the standard "max" for rookie scale contracts. The 80–120% column name suggests flexibility, but all current data uses 120%.
