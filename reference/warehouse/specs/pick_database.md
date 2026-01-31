# Spec: `pick_database.json`

**Status:** 2026-01-31

---

## 1. Purpose

The **Pick Database** sheet is a **summary matrix** showing all 30 NBA teams' draft pick assets (1st and 2nd rounds) across 8 future years (2026–2033). It aggregates data from the raw `Draft Picks` sheet into a quick-reference grid.

Use case: "At a glance, what picks does Boston own in 2027?"

---

## 2. Key Inputs / Controls

This sheet has **no user inputs**. It's a read-only pivot view of `Draft Picks`.

---

## 3. Key Outputs

| Zone | Rows | Columns | Description |
|------|------|---------|-------------|
| **Title** | 1 | A | "Draft Pick Database" |
| **Header** | 2 | A-K | Column labels: Team, Tm., Rd., 2026-2033, (K = "Own" column indicator) |
| **1st Round picks** | 3-32 | A-K | 30 teams × 1st round ownership |
| **2nd Round picks** | 33-62 | A-K | 30 teams × 2nd round ownership |

**62 total rows** (1 title + 1 header + 60 team-round rows).

---

## 4. Layout / Zones

### Columns

| Column | Header (Row 2) | Meaning |
|--------|----------------|---------|
| A | Team | Full team name (e.g., "Atlanta Hawks") |
| B | Tm. | Team code (e.g., "ATL") |
| C | Rd. | Round label ("1st Round" or "2nd Round") |
| D | 2026 | Picks owned for 2026 draft |
| E | 2027 | Picks owned for 2027 draft |
| F | 2028 | Picks owned for 2028 draft |
| G | 2029 | Picks owned for 2029 draft |
| H | 2030 | Picks owned for 2030 draft |
| I | 2031 | Picks owned for 2031 draft |
| J | 2032 | Picks owned for 2032 draft |
| K | 2033 | Static label "Own" (or picks for 2033 in some formulas) |

### Data Rows

- **Rows 3-32**: 1st Round (one row per team, alphabetically ATL→WAS)
- **Rows 33-62**: 2nd Round (same team order)

Cell values are semicolon-separated lists of pick shorthand (e.g., `"Own"`, `"MF [Own,PHX]"`, `"Own to NYK (p. 1-8)"`).

---

## 5. Cross-Sheet Dependencies

### Sheets that Pick Database references

**`Draft Picks`** — all data comes from FILTER lookups:

```
=IFERROR(
  _xlfn.TEXTJOIN("; ", TRUE,
    _xlfn._xlws.FILTER(
      'Draft Picks'!$G$3:$G$1149,
      ('Draft Picks'!$B$3:$B$1149=$B3)*
      ('Draft Picks'!$E$3:$E$1149=D$2)*
      ('Draft Picks'!$C$3:$C$1149=1)*
      ('Draft Picks'!$G$3:$G$1149<>"")
    )
  ),
  ""
)
```

References:
- `$B` — team code from Draft Picks
- `$E` — year from Draft Picks
- `$C` — round (1 or 2)
- `$G` — shorthand text (computed column)

### Sheets that reference Pick Database

Multiple presentation sheets use XLOOKUP to pull pick summaries:

| Sheet | Usage |
|-------|-------|
| `team.json` | Team roster view shows pick assets |
| `playground.json` | Salary Book view shows pick assets |
| `finance.json` | Finance view includes pick info |
| `ga.json` | G-League affiliate view includes picks |
| `por.json` | Portland-specific playground |
| `2025.json` | Season snapshot includes picks |
| `the_matrix.json` | Extension matrix may reference picks |

Example XLOOKUP from `team.json`:
```
=_xlfn.XLOOKUP($D$1,'Pick Database'!$B$3:$B$33,'Pick Database'!$D$3:$D$33)
```
(Looks up team code in column B, returns 2026 picks from column D)

---

## 6. Key Formulas / Logic Patterns

### 1st Round formula (rows 3-32, columns D-J)

```
=IFERROR(
  _xlfn.TEXTJOIN("; ", TRUE,
    _xlfn._xlws.FILTER(
      'Draft Picks'!$G$3:$G$1149,
      ('Draft Picks'!$B$3:$B$1149=$B3)*
      ('Draft Picks'!$E$3:$E$1149=D$2)*
      ('Draft Picks'!$C$3:$C$1149=1)*
      ('Draft Picks'!$G$3:$G$1149<>"")
    )
  ),
  ""
)
```

**Logic:**
1. FILTER `Draft Picks` rows where team matches `$B3`, year matches header year, round = 1
2. Grab column G (shorthand text)
3. Join with semicolons if multiple picks
4. IFERROR returns blank if no matches

### 2nd Round formula (rows 33-62, columns D-J)

Same pattern but filters on round = 2:
```
('Draft Picks'!$C$3:$C$1149=2)
```

Also uses `--` coercion and `VALUE()` for type safety:
```
(--'Draft Picks'!$C$3:$C$1149=2)
(VALUE('Draft Picks'!$E$3:$E$1149)=VALUE(D$2))
```

### Column K

Static value `"Own"` — appears to be a placeholder/label, not a formula.

---

## 7. Mapping to Our Postgres Model

### Current table

`pcms.draft_picks` — raw pick records.

### To replicate this matrix view

Build a SQL pivot/crosstab query grouping by `(team_code, round)` and pivoting on `draft_year`.

Example approach:
```sql
SELECT 
  team_code,
  round,
  string_agg(ownership_shorthand, '; ') FILTER (WHERE draft_year = 2026) AS picks_2026,
  string_agg(ownership_shorthand, '; ') FILTER (WHERE draft_year = 2027) AS picks_2027,
  -- ...
FROM pcms.draft_picks
GROUP BY team_code, round
ORDER BY team_code, round;
```

### What's needed

1. An `ownership_shorthand` column (or computed view) with the shorthand text
2. Proper parsing of the `Draft Picks` DSL into structured fields (see `draft_picks.md` spec)

---

## 8. Open Questions / TODO

- [ ] **Parse Draft Picks DSL**: The shorthand in column G depends on parsing complex notation (MF/LF pools, protections)
- [ ] **Team ordering**: Sheet uses alphabetical team name order — should we match this for UX consistency?
- [ ] **2033 column**: Appears static as "Own" — unclear if Sean tracks 2033 picks yet
- [ ] **Pick Database warehouse view**: Consider creating `pcms.pick_matrix_warehouse` for API consumption

---

## 9. Sample Data

### Row 3 (ATL 1st Round)
```json
{
  "A": "Atlanta Hawks",
  "B": "ATL",
  "C": "1st Round",
  "D": "=IFERROR(TEXTJOIN(\"; \", TRUE, FILTER(...)), \"\")",
  "E": "<formula>",
  "...": "...",
  "K": "Own"
}
```

### Row 2 (Header)
```json
{
  "A": "Team",
  "B": "Tm.",
  "C": "Rd.",
  "D": "2026",
  "E": "2027",
  "F": "2028",
  "G": "2029",
  "H": "2030",
  "I": "2031",
  "J": "2032",
  "K": "2033"
}
```

### Example evaluated cell values (conceptual)

| Team | Round | 2026 | 2027 | 2028 |
|------|-------|------|------|------|
| BOS | 1st | Own | Own | Own |
| OKC | 1st | Own; HOU; MF [LAC,DEN] | Own; PHX | Own |
| WAS | 1st | Own to NYK (p. 1-8) | Own | Own |
