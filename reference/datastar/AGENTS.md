# AGENTS.md — `reference/datastar/`

This folder is a **Datastar reference pack** for this repo.

Datastar is a hypermedia-first runtime: the backend streams HTML / signal patches (often over SSE) and Datastar morphs them into the DOM. The goal here is to keep the “how we use Datastar” knowledge close at hand.

---

## What’s in here

- `docs.md`
  - Vendor docs snapshot (large, LLM-ingestible).
  - Use when you need the full attribute/action reference.

- `insights.md`
  - **Curated “field notes”** pulled from ZachBase conventions.
  - Focuses on naming rules, SSE ergonomics, patching strategy, and common gotchas.

- `rails.md`
  - Rails-specific notes: ActionController::Live, Datastar SSE event framing, and production checklists.
  - Use when you’re pairing Datastar with a Rails backend.

- `basecamp.md`
  - A synthesis spec: **Basecamp-style Rails patterns** translated into a Datastar-first UI architecture.
  - Use when you want “how would Basecamp/Campfire feel built on Datastar?” guidance.

---

## Reading order (fastest path)

1) `reference/datastar/insights.md` (project-style conventions + gotchas)
2) `reference/datastar/docs.md` (deep reference)
3) `reference/datastar/rails.md` (Rails SSE + Datastar framing + deployment gotchas)
4) `reference/datastar/basecamp.md` (synthesis: Basecamp patterns → Datastar patterns)
5) `prototypes/salary-book-react/docs/bun-sse.md` (repo-local SSE framing helpers + generator pattern; Bun implementation, but the framing applies everywhere)

If you’re integrating charts/widgets, also remember:
- Protect widget roots with `data-ignore-morph` and patch around them.

---

## Repo context

This repo is primarily **PCMS ingestion + Postgres warehouses**. Datastar is the intended UI runtime going forward (Rails + Datastar), and we keep these references because:

- Datastar is a strong fit for **server-driven dashboards** over our warehouses.
- The SSE patch framing (`datastar-patch-elements` / `datastar-patch-signals`) is documented in `prototypes/salary-book-react/docs/bun-sse.md` (Bun implementation) and summarized in `reference/datastar/rails.md` (Rails).

---

## “Do this, not that” (agent guardrails)

- Prefer **stable IDs** and patch whole sections; don’t try to hand-diff tiny fragments.
- Use **flatcase** signal names (all-lowercase, no-separator): `teamname`, not `teamName` / `team-name`.
- DOM refs must be underscore-prefixed (`data-ref="_dialog"` → `$_dialog`).
- Avoid mixing static attributes with bindings (`value="..."` + `data-bind`, `style="display:none"` + `data-show`, etc.).
- Expressions need **semicolons** between statements.
- Don’t `await` inside expressions; bridge async flows via **CustomEvent** patterns.

---

## When adding new Datastar material

- Keep vendor snapshots as plain-text `.md` (easy to grep / ingest).
- Put repo-specific patterns and opinions in `insights.md` (short, high-signal).
- If you add new helpers (SSE framing, signal parsing, etc.), link them here.
