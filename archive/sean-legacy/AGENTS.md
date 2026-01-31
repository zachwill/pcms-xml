# AGENTS.md — `reference/sean/`

This folder contains “golden” analyst spreadsheets that were converted into a **JSON-like text representation**.

These files are valuable because they show:
- how a top salary-cap analyst mentally models PCMS/contract data,
- the *interactive* behaviors they expect (filters, lookups, trade simulations, year toggles),
- the messy but information-dense structure that we can eventually reproduce with code.

They are **not clean datasets**. They’re closer to a serialized snapshot of Excel worksheets: values + formulas + sheet-to-sheet references.

## File format (important)

Each file encodes a worksheet as:

- **Row numbers** at the top level (stored as strings like `"1"`, `"2"`, …)
- Each row contains a mapping of **Excel columns** (`A`, `B`, `C`, … `AA`, …) to:
  - literal values (strings/numbers)
  - Excel formulas (strings starting with `=`)

Example:

```yaml
"4":
  B: "Grant, Jerami"
  C: "32000001"
  H: "=IFERROR(IF(INDEX(Y!$C:$C, MATCH(G4, Y!$A:$A, 0)) = \"-\", 0, INDEX(Y!$C:$C, MATCH(G4, Y!$A:$A, 0))), 0)"
```

This structure is designed to preserve spreadsheet intent (and cross-sheet dependencies), not to be a normalized database.

## What’s in here (high level)

### `Playground.txt`
A team-facing “salary book” style sheet:
- team selector in `A1` (e.g. `POR`, `OKC`)
- lots of dynamic formulas: `LET`, `FILTER`, `SORTBY`, `HSTACK`, `INDEX/MATCH`
- looks up player/year salaries from the warehouse sheets (notably `Y`)
- includes a “Depth Chart” block embedded in columns (e.g. `V:Z` in the sample)

**Takeaway:** the analyst expects to be able to *pick a team* and instantly get a sorted roster view by salary and year.

### `Depth Chart.txt`
A classic depth chart worksheet:
- multiple seasons (e.g. `2025-26`, `2026-27`)
- position buckets (PG/SG/SF/PF/C) + grouped rollups (Guards/Wings/Forwards/Bigs)

**Takeaway:** the spreadsheet is not just contracts; it’s roster planning.

### `Give Get.txt`
A trade “give/get” sandbox:
- multiple side-by-side trade blocks on one sheet
- heavy use of `VLOOKUP` into `X` (the contract/salary warehouse)
- toggles for year (`AQ`) and ruleset (“Expanded” vs “Standard”)
- includes repeater-tax checks and team metadata lookup blocks

**Takeaway:** contracts are manipulated as *lego bricks*; trade evaluation drives many derived calculations.

### `Trade Machine.txt`
A more formal trade machine:
- computes incoming/outgoing salary rules
- uses exception lookups (references like `'Exceptions Warehouse - 2024'!…`)
- has explicit rule bands (e.g. `200% + 250K`, `+7.5M`, `125% + 250K`)

**Takeaway:** to reproduce this, we need not only PCMS contract rows, but also exception inventories and CBA rule parameters.

### `Team Master.txt`
Despite the name, this looks like the “main workbook” page for a selected team:
- header metadata (date, repeater flags)
- roster table and multi-year salary columns
- cross-sheet lookups into `Y` for the salary-by-year values

### `X.txt` and `Y.txt`
These appear to be the **data warehouses** that all other sheets reference.

- They are very large.
- Row 1 is a generic `Column1…ColumnN` header row in this export.
- Many formulas in other sheets reference columns like `X!$A:$AI` or `Y!$A:$A`, `Y!$C:$C`, etc.

**Working assumption:**
- `X` is a flattened “player/contract facts” table (used for `VLOOKUP` in trade tools)
- `Y` is a multi-year salary matrix by player/team (used for roster-year views)

## How this can inform our PCMS pipeline

The current repo is doing a strong job with “clean JSON → relational import”. This folder helps answer the next question:

> What derived tables / views do we need so analysts can build interactive tools?

Patterns we should consider supporting (in DB views or code-generated sheets):

- “select team → show roster sorted by salary for year Y”
- multi-year salary matrices
- trade math (incoming/outgoing rules by year and apron status)
- tax/apron projections and repeater flags
- exception inventories (TPEs, MLEs, etc.)

## Suggested next steps (agent-friendly)

- Build a small parser that loads these TXT sheets into a typed structure:
  - `sheet_name` → `{ row: { col: value_or_formula } }`
- Identify stable “warehouse” columns by observing which columns are used in formulas (`VLOOKUP` indices, `INDEX/MATCH` targets).
- Create a mapping document:
  - “Sean sheet concept” → “PCMS table(s)/view(s) needed”

## Caveats

- Expect messiness: ad-hoc naming, embedded constants, and hard-coded ranges.
- These should be treated as **reference artifacts**, not authoritative sources of truth.
- If we operationalize any of this, we’ll want to recreate it from our database (not scrape formulas).
