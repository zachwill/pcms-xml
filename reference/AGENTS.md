# AGENTS.md — `reference/`

This folder contains **reference materials for understanding PCMS data and analyst workflows**.

## Current Structure

### `warehouse/` — **Primary Reference (use this)**
Sean's **current Excel workbook** exported as JSON files + detailed specs. This is the canonical source for understanding how a salary-cap analyst models contracts, trades, and team financials.

- `warehouse/*.json` — Raw Excel sheet exports (one JSON file per worksheet)
- `warehouse/specs/*.md` — 36 evidence-based spec documents analyzing each sheet
- `warehouse/AGENTS.md` — Guide to the warehouse structure

**Key specs:**
- `specs/00-index.md` — Workbook overview + dependency graph
- `specs/y.md` — Y Warehouse (central salary matrix)
- `specs/fn_luxury_tax_amount.md` — Luxury tax calculation primitive
- `specs/machine.md` — Trade Machine logic
- `specs/buyout-waiver-math.md` — Buyout/waiver scenario formulas

### `TODO.md`
Tracks validation work comparing our `pcms.*` warehouse tables to Sean's Excel outputs.

### Legacy Files
- `excel-salary-book.txt` — Text-dump of a Python project for generating salary-cap Excel workbooks
- `xpcms.txt` — Text-dump of an alternate PCMS ingestion tool

## Archived

The old `sean/` folder has been moved to `archive/sean-legacy/`. It contained an earlier version of the workbook exports. **Use `warehouse/` instead.**
