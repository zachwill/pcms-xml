# AGENTS.md — `queries/`

This directory contains **runnable SQL checks** for this repo.

The goal is to keep a growing suite of **assertion-style Postgres tests** that validate:
- `pcms.*_warehouse` cache invariants
- trade/cap primitives (`pcms.fn_*`)
- critical schema expectations after migrations

Think of it as: “unit tests for SQL + data invariants”.

---

## Where things live

- `queries/sql/` — runnable SQL files (these should work with plain `psql`)
- `queries/sql/run_all.sql` — master runner that includes (`\ir`) the suite
- `queries/README.md` — conventions and philosophy

---

## Running tests

Run everything:

```bash
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f queries/sql/run_all.sql
```

Run a single file:

```bash
psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 -f queries/sql/056_can_bring_back_assertions.sql
```

---

## Conventions (important)

- Prefer **fail-fast** assertions:
  - `DO $$ ... RAISE EXCEPTION ... $$;`
- Avoid hardcoding brittle IDs unless the test itself seeds fixtures.
- When you add a new migration that changes behavior, add a new assertions file and wire it into `run_all.sql`.

---

## What to test

Good candidates:
- “This warehouse table should never have duplicates on its logical key”
- “This function should return the known boundary values at tier cutoffs”
- “This refresh function should populate all teams for a season”

See also:
- `migrations/AGENTS.md` (what the SQL primitives/warehouses are for)
- `SALARY_BOOK.md` and `reference/warehouse/specs/` (business rules + evidence)
