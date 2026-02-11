# NBA (`nba`)

This folder supports ingesting **official NBA API** data plus legacy **NGSS** data (where NGSS still provides required fields).

Target database schema: `nba`.

## What’s Here

- `nba/api/` — API reference specs (official NBA + NGSS)
- `nba/samples/` — sample payloads
- `nba/inspiration/` — product/UI inspiration
- `nba/migrations/` — SQL migrations for `nba.*`

## Canonical Sources of Truth

For current implementation details, use:

1. `import_nba_data.flow/` (what is fetched + written)
2. `nba/migrations/` (actual DDL)

`nba/schema/` has been removed.

## Where to Look Next

- `nba/AGENTS.md` — working conventions for this lane
- `import_nba_data.flow/AGENTS.md` — flow behavior + local run guidance
- `nba/migrations/README.md` — migration scope notes
