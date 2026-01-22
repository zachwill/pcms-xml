# SEAN.md — Sean-style Analyst Tooling: Current State + Roadmap

Status: **2026-01-22**

We are creating Postgres tables/functions that let us build **Sean-style tooling** (Salary Book / Playground, Team Master, Trade Machine, Give/Get) on top of the PCMS ingest.

Important context: the `reference/sean/` spreadsheets/specs are **directional** and may be ~12 months stale. Treat them as *shape + intent*, not authoritative truth.

---

## 0) What exists today (reality check)

### Ingestion flow

This repo’s import flow is **Python-only** (`import_pcms_data.flow/*.inline_script.py`).

Notable: `pcms.team_transactions` is **already imported** (it is handled in `import_pcms_data.flow/team_financials.inline_script.py`).

### The primary analyst artifact: `pcms.salary_book_warehouse`

We already have a working “player-level cache” table:

- **Table:** `pcms.salary_book_warehouse`
- **Refresh:** `SELECT pcms.refresh_salary_book_warehouse();`
- **Rows:** ~528 active players (NBA + DLG)
- **Grids:** cap/tax/apron 2025–2030
- **Includes:** agent, decimal age, options (NONE→NULL), trade flags, best-effort trade-math columns

Migrations involved:

- `migrations/012_analyst_views.sql` (optional scaffolding views)
- `migrations/013_salary_book_warehouse.sql` (table + initial refresh)
- `migrations/016_refresh_salary_book_warehouse_fast.sql` (view-independent refresh)
- `migrations/017_salary_book_age_and_option_normalization.sql` (decimal age + option normalization)

### The “active player” definition we currently use

Used by the warehouse refresh:

- pick one contract per player where `contracts.record_status_lk IN ('APPR','FUTR')`
- prefer `APPR` over `FUTR`, then newest `signing_date`, then newest `contract_id`
- pick latest `contract_versions.version_number` within that contract
- include `people.league_lk IN ('NBA','DLG')` to avoid dropping two-way players

---

## 1) What Sean-style tools need (high level)

From `reference/sean/` (conceptually):

| Tool | Purpose | Primary inputs |
|------|---------|----------------|
| Salary Book / Playground | team roster view, sorted by salary | **player cache** (`salary_book_warehouse`) + optional depth chart |
| Team Master | one-page team cap sheet | **team totals cache** + roster + tax status |
| Trade Machine | check legality of a trade | trade rules table + team status (cap/tax/apron) + outgoing/incoming salary bases |
| Give/Get | multi-team sandbox | Trade Machine inputs + **exceptions warehouse** |

---

## 2) Current gaps (what’s confusing agents)

These are the main mismatches between older “Sean doc” assumptions and the current implementation:

1) **We are table-first now.** Older plans focused on a giant pivoted view (`vw_salary_warehouse`). The canonical artifact is now `pcms.salary_book_warehouse`.

2) **`team_transactions` is not a missing gap anymore.** It exists (`migrations/006_team_transactions.sql`) and is imported in `team_financials.inline_script.py`.

3) **Contract status code mismatch.** Use `record_status_lk IN ('APPR','FUTR')` for “active-ish” contracts (not `'ACT'`).

4) **Reference specs may be stale.** We should treat them as “what the tool wants to look like” rather than “what the data must be called”.

---

## 3) Roadmap (aligned with TODO.md)

### P0 — Team totals cache: `pcms.team_salary_warehouse`

Goal: create **one row per (team_code, salary_year)** capturing totals + subtotals by budget group, with joins to cap/tax constants and tax team status.

Recommended source of truth:
- `pcms.team_budget_snapshots` (already imported)

Also join:
- `pcms.league_system_values` (cap/tax/apron constants)
- `pcms.tax_team_status` (taxpayer/repeater/apron flags)

Deliverables:
- table: `pcms.team_salary_warehouse`
- refresh fn: `pcms.refresh_team_salary_warehouse()`

### P0 — Exceptions cache: `pcms.exceptions_warehouse`

Goal: fast lookup of usable TPE/MLE/BAE/etc by team/year.

Source tables:
- `pcms.team_exceptions`
- optional: `pcms.team_exception_usage`

Deliverables:
- table: `pcms.exceptions_warehouse`
- refresh fn: `pcms.refresh_exceptions_warehouse()`

### P1 — Trade matching parameters: `pcms.trade_rules`

Goal: store the CBA “bands” (expanded vs standard) in Postgres rather than hardcoding them.

Deliverables:
- `pcms.trade_rules` table
- seed rows for at least 2024/2025 (and then extend)
- optional helper function: `pcms.fn_trade_max_incoming(outgoing bigint, salary_year int, rule_type text)`

### Hook refresh into ingest flow

After all PCMS imports complete:

```sql
SELECT pcms.refresh_salary_book_warehouse();
SELECT pcms.refresh_team_salary_warehouse();
SELECT pcms.refresh_exceptions_warehouse();
```

---

## 4) Recommended “source of truth” docs for agents

If agents are confused, point them here first:

- `TODO.md` — what we’re building next (team totals, exceptions, trade rules)
- `queries/AGENTS.md` — what already exists + how to query it
- `SALARY_BOOK.md` — how to interpret contracts/versions/salaries (and the warehouse table)
- `SCHEMA.md` — column names + tables

---

## 5) Small repo hygiene note

Migration filenames should be strictly increasing; we had two `017_...` files previously. The two-way daily statuses cleanup migration has been renumbered to:

- `migrations/018_remove_unused_two_way_daily_statuses_columns.sql`
