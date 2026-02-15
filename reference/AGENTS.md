# AGENTS.md — `reference/`

This folder contains **reference materials for understanding PCMS data and analyst workflows**.

## Current Structure

### `blueprints/` — Design Reference (mental models + intended workbook architecture)
These docs capture the *design intent* for Sean-style tooling: how analysts think, what must reconcile, cockpit UX rules, and a proposed from-scratch workbook layout.

Start here when designing new sheets/tools.

- `blueprints/README.md` — Index
- `blueprints/mental-models-and-design-principles.md`
- `blueprints/excel-cap-book-blueprint.md`

### `warehouse/` — Evidence (current workbook export + specs)
Sean's **current Excel workbook** exported as JSON files + detailed specs. Use this to validate outputs, trace formulas, and understand how the current workbook behaves.

- `warehouse/*.json` — Raw Excel sheet exports (one JSON file per worksheet)
- `warehouse/specs/*.md` — Evidence-based spec documents analyzing each sheet
- `warehouse/AGENTS.md` — Guide to the warehouse structure

**Key specs:**
- `warehouse/specs/00-index.md` — Workbook overview + dependency graph
- `warehouse/specs/y.md` — Y Warehouse (central salary matrix)
- `warehouse/specs/fn_luxury_tax_amount.md` — Luxury tax calculation primitive
- `warehouse/specs/machine.md` — Trade Machine logic
- `warehouse/specs/buyout-waiver-math.md` — Buyout/waiver scenario formulas

### `TODO.md`
Tracks validation work comparing our `pcms.*` warehouse tables to Sean's Excel outputs.

### `rails-architecture.md` — Durable Rails Architecture Principles
Tacit knowledge about building long-lived Rails apps: layer collapse, I/O boundary discipline, extracting abstractions from pressure (not theory), keeping ergonomics Rails-like. Applies to the `web/` app and any future Rails work.

### Legacy Files
- `excel-salary-book.txt` — Text-dump of a Python project for generating salary-cap Excel workbooks
- `xpcms.txt` — Text-dump of an alternate PCMS ingestion tool

## Archived

The old `sean/` folder has been moved to `archive/sean-legacy/`. It contained an earlier version of the workbook exports. **Use `warehouse/` instead.**
