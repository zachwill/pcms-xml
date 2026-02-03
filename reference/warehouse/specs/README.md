# Specs — `reference/warehouse/specs/`

This directory contains **evidence-based mental model specs** for Sean’s current Excel workbook exports in `reference/warehouse/*.json`.

- Start with: `00-index.md` (workbook overview + dependency graph)
- Then: one spec per worksheet export (usually named after the JSON file, e.g. `y.md`, `dynamic_contracts.md`, etc.)

## Analysis / decision memos (not tied to a single worksheet)

- `minimum-salary-parity.md` — PCMS vs workbook minimum salary scale (Years 2–5 derivation)
- `season-day-constants-decision.md` — how to source day-count + calendar fields for proration
- `roster_fill_logic.md` — consolidated “fill to 12/14” + proration + **The Matrix +14 days** nuance

> Note: `reference/sean/` is legacy (older workbook version). Prefer `reference/warehouse/` + specs here.
