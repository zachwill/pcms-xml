# SportRadar (sr)

This folder is the workspace for integrating **SportRadar APIs** and designing a new Postgres schema named `sr`.

## What's Here

- `sr/api/` — Postman exports of SportRadar API collections (endpoint inventory)
- `sr/schema/` — table specs (design docs; not migrations yet)
- `sr/samples/` — example payloads + legacy SQL dump (SportRadar JSON examples)
- `sr/inspiration/` — exemplary data-dense UI patterns we want to support
- `sr/data/` — ingestion + parsing utilities (bun/TS)
- `sr/.archive/` — stale audit / gap notes

## V1 Scope

Focus on:
- NBA
- NCAA
- G League
- INTL

## Design Philosophy (Short)

- Prefer **wide, useful tables** over perfect normalization.
- Prefer **UPSERTs into tables** over complicated VIEW stacks.
- Use JSONB when it prevents schema explosion, especially for **Play-by-Play (PBP)**.
- Default to **one table per endpoint family** (schedule, boxscore, summary, injuries, etc.).

See `sr/AGENTS.md` for the full agent-facing rules.

## Implementation

- **Implementation handoff plan:** `sr/IMPLEMENTATION_PLAN.md`
- Required env vars:
  - `POSTGRES_URL`
  - `SPORTRADAR_API_KEY`

## Agent: Schema Design

We use an agent loop (modeled after `agents/pcms.ts`) to iteratively design the `sr` schema as specs under `sr/schema/`.

- Agent: `agents/sr.ts`
- Task file: `.ralph/SR.md`
- Output: `sr/schema/*.txt`

Run:
- `bun agents/sr.ts`
- With focus: `bun agents/sr.ts -c "Prioritize NBA boxscore + PBP"`

## Notes on Legacy / Reference Material

`sr/samples/postman.sql.txt` includes an example table in a schema named `sportradar`.

That is **not** the target going forward — the new schema name is `sr`.
