# TODO (next steps)

This file is the “hit the ground running” checklist to get from **PCMS ingestion** → **Sean-style tooling** (Salary Book / Playground, Team Master, Trade Machine, Give/Get).

As of **2026-01-22** we are now firmly **table-first** for tool performance.

---

## ✅ Current tool-facing cache tables (already implemented)

Player-level:
- `pcms.salary_book_warehouse`
  - one row per active player
  - cap/tax/apron grids (2025–2030)
  - % of cap, decimal age, agent name
  - option fields normalized (`'NONE'` → `NULL`)
  - best-effort trade-math columns
- refresh: `SELECT pcms.refresh_salary_book_warehouse();`

Team-level totals:
- `pcms.team_salary_warehouse`
  - one row per `team_code, salary_year`
  - totals + budget group buckets (ROST / FA+QO+DRFPK+PR10D / TERM / 2WAY)
  - joins year constants from `pcms.league_system_values`
  - tax flags with explicit source/missingness tracking
- refresh: `SELECT pcms.refresh_team_salary_warehouse();`

Exceptions:
- `pcms.exceptions_warehouse`
  - one row per exception instance (`team_exception_id`)
  - filtered to usable-ish: `record_status_lk = 'APPR'` and `remaining_amount > 0`
- refresh: `SELECT pcms.refresh_exceptions_warehouse();`

Detail drilldowns (for Team Master fidelity):
- `pcms.dead_money_warehouse`
  - sourced from `pcms.transaction_waiver_amounts`
  - resolves team via `pcms.teams` (filters to `teams.league_lk = 'NBA'`)
- refresh: `SELECT pcms.refresh_dead_money_warehouse();`

- `pcms.cap_holds_warehouse`
  - sourced from `pcms.non_contract_amounts`
  - **filtered to holds that actually contribute to team totals** by requiring a matching `pcms.team_budget_snapshots` row in the FA bucket (`budget_group_lk IN ('FA','QO','DRFPK','PR10D')`)
- refresh: `SELECT pcms.refresh_cap_holds_warehouse();`

Flow integration:
- a Windmill step exists to refresh caches post-import: `import_pcms_data.flow/refresh_caches.inline_script.py`

---

## P1 — Trade matching rules (current season + future seasons)

### Why
Trade Machine / Give-Get need the CBA band table (max incoming by outgoing salary). Sean hardcoded it; we should store it.

### Scope
Only seed for **2025 and forward** (and keep adding as needed).

### Proposed table
`pcms.trade_rules`

Suggested columns:
- `salary_year`
- `rule_type` (e.g. 'STANDARD', 'EXPANDED' — we can keep this even if the rules converge)
- `threshold_low`, `threshold_high`
- `multiplier`, `flat_adder`
- `description`

Optional helper:
- `pcms.fn_trade_max_incoming(outgoing bigint, salary_year int, rule_type text)`

Acceptance tests:
- for a few known outgoing salaries, the function matches the expected band result

---

## P1 — Fidelity / reconciliation (make debugging easy)

### Goal
When someone asks “why don’t my roster totals match Team Master totals?”, we want a single query that answers it.

Recommended artifacts:

1) **Team totals vs roster totals (anchor year = 2025)**
- Compare:
  - `team_salary_warehouse.cap_rost`
  - vs `SUM(salary_book_warehouse.cap_2025)` for that team
- Output:
  - roster_sum, roster_bucket_total, delta

2) **Explain the delta by budget group**
For a team/year, show `SUM(cap_amount)` by `budget_group_lk` out of `pcms.team_budget_snapshots`, so the tool can show:
- roster
- FA/holds
- TERM/dead
- 2WAY
- other odd buckets (PR10D, DRFPK, etc)

3) **Drilldown detail queries**
- dead money detail: `dead_money_warehouse where team_code=? and salary_year=?`
- cap holds detail: `cap_holds_warehouse where team_code=? and salary_year=?`

---

## P2 — Tool-facing exports (Team Master / Playground / Give-Get)

Now that caches exist, implement stable “tool queries” (views or stored SQL) with an intentionally boring contract.

### Playground / Salary Book
- roster grid: `salary_book_warehouse where team_code=? order by cap_2025 desc nulls last`

### Team Master
- header row: `team_salary_warehouse where team_code=? and salary_year=?`
- roster block: `salary_book_warehouse where team_code=?` (plus totals)
- dead money: `dead_money_warehouse`
- cap holds: `cap_holds_warehouse`

### Give/Get / Trade Machine
- roster export (per team): salary_book rows + per-row max incoming computed using `trade_rules`
- exceptions export: `exceptions_warehouse where team_code=? and salary_year=?`

---

## P3 — Performance / operational hardening

- if TRUNCATE locks become annoying: switch to swap-table refresh pattern
- incremental refresh by salary_year if needed
- optional fuzzy search:
  - `CREATE EXTENSION IF NOT EXISTS pg_trgm;`
  - trigram gin index on `salary_book_warehouse.player_name`

---

## Notes / gotchas

- Team assignment: prefer `contracts.team_code` over `people.team_code`.
- Active player population includes `people.league_lk IN ('NBA','DLG')`.
- `SUM(bigint)` returns `numeric` in Postgres; cast back if you need bigint.
