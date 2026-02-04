# AGENTS.md — `migrations/` (PCMS)

This directory contains **Postgres SQL migrations** for the `pcms` schema:
- base ingest tables (`pcms.*`) that mirror PCMS JSON keys
- tool-facing **warehouse/cache tables** (`pcms.*_warehouse`)
- composable **cap/trade primitives** (`pcms.fn_*`)

Other schemas have their own migration folders:
- `nba/migrations/` (official NBA API schema)
- `sr/migrations/` (SportRadar schema)

---

## Workflow expectations

### Adding/changing DB behavior
1) Implement the change as a new migration: `NNN_some_description.sql`
2) Add/extend an assertion query in `queries/sql/`
3) Run tests:
   ```bash
   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f queries/sql/run_all.sql
   ```
4) If the change affects Salary Book / trade rules, update:
   - `SALARY_BOOK.md`
   - relevant `reference/warehouse/specs/*.md` (if you’re encoding new evidence)

### Applying migrations
There isn’t a repo-level migration runner baked in here; use whatever your deployment uses.
For local testing you can apply a specific migration with:

```bash
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f migrations/060_fn_buyout_primitives.sql
```

(Or run them sequentially if you’re bootstrapping a fresh DB.)

---

## Important mental model: “what exists” vs “what counts”

When building Sean-style tooling (Salary Book / Team Master / Trade tools), distinguish:

### What counts (authoritative team totals)
- **`pcms.team_budget_snapshots`** is the canonical source for team-year amounts that actually count toward:
  - cap (`cap_amount`)
  - tax (`tax_amount`)
  - apron (`apron_amount`)
  - MTS (`mts_amount`)
- This is the source for the team totals cache **`pcms.team_salary_warehouse`**.

### Detail tables can include “phantom” rows
Some detail tables represent a superset (rights/holds/history), and may include rows that do **not** currently count.

Examples:
- `pcms.non_contract_amounts` (cap holds / rights) can include holds for a team even if the player signed elsewhere.
  - Tool-facing: `pcms.cap_holds_warehouse` is filtered down to what `team_budget_snapshots` says counts.

- `pcms.transaction_waiver_amounts` is drilldown detail; `team_code` can be NULL.
  - Resolve via `team_id → pcms.teams` when needed.

### Tool-facing caches (warehouse tables)
These tables should be the first stop for UI/tool output:
- `pcms.salary_book_warehouse`
- `pcms.team_salary_warehouse`
- `pcms.exceptions_warehouse`
- `pcms.dead_money_warehouse`
- `pcms.cap_holds_warehouse`
- draft caches (`pcms.draft_pick_summary_assets`)

Refresh happens via DB functions, called by `import_pcms_data.flow/refresh_caches.inline_script.py`.

---

## Recently added “primitives” (see `TODO.md`)

The current batch of core CBA primitives live here:
- `057_fn_luxury_tax_amount.sql`
- `058_fn_can_bring_back.sql`
- `059_fn_minimum_salary.sql`
- `060_fn_buyout_primitives.sql`

These should have matching assertion files in `queries/sql/` and be listed in `queries/sql/run_all.sql`.

---

## Postgres regex gotcha (important)

When writing `LANGUAGE sql` functions using `$$ ... $$` bodies, **backslashes are literal**.
That means regex escapes like `\s`, `\b`, `\d` should generally be written as **single-backslash** (`\s`, `\b`, `\d`) inside the function body.

Symptoms when you get this wrong:
- regex `~* '^to\\s+'` appears to work in some ad-hoc contexts, but inside the function all matches fail
- CASE expressions fall through and everything becomes `'OTHER'`
- `regexp_matches()` extraction returns empty arrays unexpectedly

Fix:
- Prefer `~* '^to\s+'` (single backslash) inside `$$`-quoted SQL function bodies.
- Validate patterns with a tiny `SELECT` inside psql before baking into a migration.
