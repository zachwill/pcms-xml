# web/AGENTS.md

> Notes for AI coding agents working in **web/**.

## What this is

`web/` is a **Bun + React + TypeScript** web app that lives alongside the Python PCMS ingest pipeline.

It exists to provide:

- A UI (currently: **Salary Book**) for browsing NBA PCMS-derived “warehouse” tables.
- A small Bun API layer under `/api/*` (currently: `/api/salary-book/*`) that reads from Postgres (`pcms` schema).

This directory is intentionally isolated from the repo’s Python code. Avoid introducing JS/TS build artifacts or Node dependencies outside of `web/`.

## Dependencies / prerequisites

- **Bun** installed.
- A reachable Postgres instance with the `pcms` schema populated (run the Python import flow in the repo root).
- `POSTGRES_URL` set in the environment (used by `src/api/routes/salary-book.ts`).

## Running locally

```bash
cd web
bun install

# dev server (hot reload)
POSTGRES_URL="$POSTGRES_URL" bun run dev

# optional: override port
PORT=3001 POSTGRES_URL="$POSTGRES_URL" bun run dev
```

Notes:

- `src/server.ts` defaults to **port 3002** if `PORT` is not set.
- `web/tests/api.test.ts` expects the server to be running on **http://localhost:3001**.

## Project structure

```
src/
  server.ts       # Bun server entry point (Bun.serve)
  client.tsx      # React app entry point
  index.html      # HTML shell
  api/
    routes/       # API route handlers (one file per domain)
  components/
    ui/           # Shared UI components
  features/       # Feature modules (pages/views)
  lib/
    server/
      router.ts   # Route registry + Bun.serve route compilation
      utils.ts    # Error handling helpers
    utils.ts      # Client utilities
tests/
  api.test.ts     # API endpoint tests (expects PORT=3001)
```

## Key conventions

- **API routes** are registered via `RouteRegistry` in `src/lib/server/router.ts` and merged in `src/server.ts`.
- Prefer pulling tool-facing UI data from `pcms.*_warehouse` tables.
- Keep this app read-only unless there’s a strong reason to add writes.

## Common pitfalls

- If `/api/salary-book/*` errors on startup, you likely forgot `POSTGRES_URL`.
- If `bun test` fails with connection refused, start the server first with `PORT=3001`.
