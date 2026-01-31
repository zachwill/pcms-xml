# Spec: `high_low.json`

## Purpose

**Salary ranking & comparison tool.** This sheet displays all NBA players sorted by salary (highest to lowest) with multi-year projections and % of cap calculations. Also includes a "salary search" feature to find players in a specific salary range.

Use case: quickly identify players at similar salary levels for trade matching or market comparisons.

---

## Key Inputs / Controls

| Cell | Description |
|------|-------------|
| `V3` | **Salary target** — user-entered salary value (e.g., `32000000`) |
| `V2` | "Up to:" — computed as `V3 + 1,000,000` |
| `V4` | "Down to:" — computed as `V3 - 1,000,000` |

The V2:V4 block creates a $2M salary band (±$1M from target) for the FILTER in column X.

---

## Key Outputs

### Main Table (A–S)

| Column | Header | Content |
|--------|--------|---------|
| A | (sorted names) | Player names sorted by salary (via SORTBY) |
| B | `#` | Rank (1, 2, 3…) |
| C | `Tier` | Salary book tier from `Y!AM` ("SB" column) |
| D | `Player` | `=A{row}` (mirrored name) |
| E | `Age` | Looked up from Y sheet |
| F | `Team` | Looked up from Y sheet |
| G | `2025` | 2025 salary (cap amount) |
| H | (%) | 2025 salary ÷ 2025 cap (% of cap) |
| I | `2026` | 2026 salary |
| J | (%) | 2026 salary ÷ 2026 cap |
| K–R | `2027`–`2030` | Alternating salary / % of cap pairs |
| S | `Total` | Sum of salary columns where value > 1 |

### Salary Search Zone (U–AK)

| Column | Purpose |
|--------|---------|
| U2:V4 | Labels + salary range controls |
| X:AK | Filtered results — players with 2025 salary within ±$1M of V3 |

The FILTER in X2:
```excel
=FILTER(D:Q, (G:G<>"") * (G:G >= $V$3 - 1000000) * (G:G <= $V$3 + 1000000), "")
```

---

## Layout / Zones

```
Row 1: Headers (#, Tier, Player, Age, Team, 2025, 2026, …, Total)
Row 2: First player (rank #1 = highest salary)
       Also: Salary search controls in U2:V4, Filter results in X2+
Row 3–451: Remaining players (≈450 total)
```

---

## Cross-Sheet Dependencies

### References TO this sheet
- None found — appears to be a standalone tool.

### References FROM this sheet
| Sheet | Usage |
|-------|-------|
| **Y** | Primary data source — player names (`Y!B`), salaries (`Y!D`), tier (`Y!AM`), and dynamic lookups via INDEX/MATCH into `Y!C:AJ` |
| **SystemValues** | Cap values for % of cap calculations via `XLOOKUP(year, SystemValues[Season], SystemValues[Salary Cap])` |

---

## Key Formulas / Logic Patterns

### A2: Player name list sorted by salary (highest first)
```excel
=LET(
  names,    Y!$B$3:$B$530,
  salaries, Y!$D$3:$D$530,
  keep,     (salaries<>"")*(salaries<>"-")*ISNUMBER(salaries),
  SORTBY( FILTER(names, keep), FILTER(salaries, keep), -1 )
)
```
- Filters Y warehouse to players with valid salaries
- Sorts descending by 2025 salary

### C2: Tier lookup
```excel
=XLOOKUP(D2, Y!B:B, Y!AM:AM)
```
- Looks up player name → returns "SB" (Salary Book tier)

### E2, F2, G2, I2, etc: Dynamic attribute/salary lookup
```excel
=IFERROR(
  LET(
    r, MATCH($D2, Y!$B:$B, 0),
    c, MATCH($E$1, Y!$C$2:$AJ$2, 0),
    v, INDEX(Y!$C:$AJ, r, c),
    IF(v=0, "-", v)
  ),
  "-"
)
```
- Matches player name to row in Y
- Matches column header (Age/Team/Year) to column in Y's C:AJ range
- Returns the value, or "-" if zero/error

### H2: Percent of cap calculation
```excel
=IFERROR(G2 / XLOOKUP(G$1, SystemValues[Season], SystemValues[Salary Cap]), "-")
```
- Divides salary by the cap for that year

### S2: Total salary across years
```excel
=SUMIF(G2:R2, ">1")
```
- Sums salary cells where value > 1 (filters out "-" and zeros)

---

## Mapping to Our Postgres Model

| High_Low Concept | Our Table/View |
|------------------|----------------|
| Player list + salaries | `pcms.salary_book_warehouse` |
| Tier / SB category | Not currently in warehouse (would need to add) |
| Cap by year | `pcms.league_system_values` |
| Age | `pcms.salary_book_warehouse.age` |
| Team | `pcms.salary_book_warehouse.team_code` |
| Multi-year salaries | `pcms.salary_book_warehouse.cap_20xx` columns |

### Gaps
- **Tier/SB column** — the Y sheet has an "SB" tier classification (column AM) that categorizes players. We don't have a direct equivalent tier field in our warehouse.
- **Percent of cap** — trivially computable but not pre-materialized.

---

## Open Questions / TODO

1. What are the possible values for the "Tier" / "SB" column? Need to inspect Y sheet column AM to document the tier classification system.
2. The salary search feature (columns X+) is a simple FILTER — this could be a SQL query rather than a dedicated cache.
