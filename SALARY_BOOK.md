# Salary Book / Playground Data Guide

Status: **2026-01-22**

This repo is moving toward **Sean-style tooling powered by Postgres tables** (fast, indexed, refreshable) rather than giant ad-hoc pivots.

## Canonical source for tooling

### `pcms.salary_book_warehouse` (table)

For almost all “Salary Book / Playground” style queries, use:

- **Table:** `pcms.salary_book_warehouse`
- **Refresh function:** `SELECT pcms.refresh_salary_book_warehouse();`
- **Grids:** cap/tax/apron 2025–2030 (today)
- **Normalized fields:**
  - `age` is **decimal years** (numeric(4,1))
  - `option_20xx`: `'NONE'` is normalized to `NULL`

This table is intentionally **wide** and **one-row-per-active-player** so it can back UI queries directly.

Example (team roster):
```sql
SELECT player_name, cap_2025, cap_2026, trade_kicker_display, agent_name
FROM pcms.salary_book_warehouse
WHERE team_code = 'BOS'
ORDER BY cap_2025 DESC NULLS LAST;
```

Example (name search):
```sql
SELECT player_name, team_code, cap_2025
FROM pcms.salary_book_warehouse
WHERE lower(player_name) LIKE '%curry%'
ORDER BY cap_2025 DESC NULLS LAST;
```

### How “active player” is chosen (warehouse refresh logic)

The refresh function selects **one contract per player** from `pcms.contracts` where:

- `contracts.record_status_lk IN ('APPR','FUTR')`
- prefer `APPR` over `FUTR`, then newest `signing_date`, then newest `contract_id`
- choose latest `contract_versions.version_number` within that contract

Important:
- Team assignment prefers `contracts.team_code` (falls back to `people.team_code`).
- Population includes `people.league_lk IN ('NBA','DLG')` (two-way / G League-linked players are often `DLG`).

## Raw model (for debugging / extending the warehouse)

If you need to validate a number or add a new derived column, these are the underlying tables:

```
pcms.contracts (1 per contract)
  └── pcms.contract_versions (1+ per contract, amendments)
        └── pcms.salaries (1 per version per year)
pcms.people (player identity)
pcms.agents (agent identity)
pcms.league_system_values (cap/tax constants by year)
```

### Key salary fields (from `pcms.salaries`)

| Field | Meaning |
|------|---------|
| `contract_cap_salary` | cap hit (Salary Book “cap” grid) |
| `contract_tax_salary` | tax salary |
| `contract_tax_apron_salary` | apron salary |
| `total_salary` | actual paid salary |
| `likely_bonus` / `unlikely_bonus` | incentives |
| `option_lk` | option type (PLYR/TEAM/etc; warehouse normalizes NONE→NULL) |
| `option_decision_lk` | option decision (picked up/declined/pending) |

### Contract / version flags (from `pcms.contract_versions`)

| Field | Meaning |
|------|---------|
| `is_two_way` | two-way contract flag |
| `is_poison_pill` / `poison_pill_amount` | poison pill mechanics |
| `is_no_trade` | no-trade clause |
| `is_trade_bonus` / `trade_bonus_percent` | trade kicker |

## Notes on views

There are also “warehouse-ish” views used as scaffolding / debugging:

- `migrations/012_analyst_views.sql` creates:
  - `pcms.vw_active_contract_versions`
  - `pcms.vw_salary_pivot_2024_2030`
  - `pcms.vw_y_warehouse`

The current direction is **table-first** (use `salary_book_warehouse`), so treat views as optional.

## Related docs

- `TODO.md` — current roadmap toward Team Master / Trade Machine / Give-Get
- `queries/AGENTS.md` — handoff doc for agents working in `queries/`
- `SCHEMA.md` — schema reference
- `import_pcms_data.flow/contracts.inline_script.py` — how contracts/salaries are imported
