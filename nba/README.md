# NBA (nba)

This folder is the workspace for integrating **official NBA data** (new NBA Developer Portal APIs) plus the legacy **NGSS** feeds when they still provide important missing fields (e.g., certain Play-by-Play details).

The output target is a new Postgres schema named `nba`.

## What's Here

- `nba/api/` — OpenAPI specs (NBA Developer Portal + `ngss.txt`)
- `nba/schema/` — table specs (design docs; not migrations yet)
- `nba/samples/` — example API payloads
- `nba/inspiration/` — UI patterns from other sites we want the schema to support

## Design Philosophy (Short)

- Prefer **wide, useful tables** over perfect normalization.
- Prefer **UPSERTs into tables** over complicated VIEW stacks.
- Use JSONB when it prevents schema explosion, especially for **Play-by-Play (PBP)**.
- Official NBA data is the backbone for identity:
  - players use `nba_id`
  - teams use `team_id`
- When NGSS is required, store it in `ngss_*` tables (within the same `nba` schema).

See `nba/AGENTS.md` for the full agent-facing rules.

## Agent: Schema Design

We use an agent loop to iteratively design the `nba` schema as specs under `nba/schema/`.

- Agent: `agents/nba.ts`
- Task file: `.ralph/NBA.md`
- Output: `nba/schema/*.txt`

Run:
- `bun agents/nba.ts`
- With focus: `bun agents/nba.ts -c "Start with games + boxscore + pbp"`
