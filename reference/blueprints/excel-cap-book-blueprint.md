# Excel Cap Book Blueprint

**Updated:** 2026-02-01

---

## Vision

We're building a **best-in-class Excel workbook** for NBA salary cap analysts using Python and XlsxWriter.

The workbook should feel like a **dense, reactive TUI** — not a marketing spreadsheet. Every pixel earns its place. Information density is a feature, not a bug.

**Core belief:** Coding agents are more than capable of building Excel workbooks that surpass what humans can build by hand — if we follow best practices and have a clear guiding vision.

---

## What we learned (the hard way)

### What we got right ✅

- **DATA_ sheets are solid.** The data extraction and embedding layer works. Excel Tables with clean column names, proper types, authoritative sources.
- **Modern Excel features.** Using `FILTER`, `XLOOKUP`, `LET`, `LAMBDA`, dynamic arrays — this is the right call.
- **Code-generated workbook.** No hand-authored template. The workbook is a build artifact.
- **Reconciliation mindset.** Trust requires that numbers tie out.

### What we got wrong ❌

- **Too many sheets.** We designed 13+ tabs with navigation workflows. Analysts don't want to click around. They want everything visible.
- **Over-engineered scenarios.** "Publish to journal" workflows, plan managers, subsystem sheets — way too much ceremony.
- **Wrong mental model.** We designed for how we *thought* analysts should work, not how they actually work.
- **Marketing spreadsheet aesthetics.** We didn't commit to density. Real cap workbooks are walls of numbers.

---

## The new mental model

### Dense reactive TUI

Think of each worksheet as a **terminal UI panel** — dense, information-rich, reactive to inputs.

- **Everything visible.** No scrolling to find critical info. No clicking through tabs to see cause and effect.
- **Reactive.** Change an input, see the impact immediately via conditional formatting, color shifts, delta columns.
- **Proper visual hierarchy.** Light yellow input cells (Excel convention). Bold totals. Subtle gridlines. Consistent fonts.
- **Recognition over recall.** Rules and references adjacent to where they're needed, not buried in a separate sheet.

### 4-7 dense sheets (not 13+)

The final workbook will probably have 4-7 functional sheets, each a self-contained dense UI:

1. **Team view** — the main cockpit (roster + KPIs + depth chart + playground)
2. **Trade workspace** — side-by-side trade construction with matching rules visible
3. **League view** — all 30 teams at a glance (cap positions, tax status, exceptions)
4. **Draft assets** — pick ownership grid with encumbrances
5. Maybe 2-3 others as patterns emerge

Plus the DATA_ sheets (hidden, locked) and META sheet.

### Improve on Sean, don't copy him

Sean's workbooks have decades of insight baked in. But he built what he was capable of building incrementally over time. He didn't have:

- Modern Excel (dynamic arrays, XLOOKUP, LAMBDA)
- Code generation (consistent formatting, no copy-paste errors)
- Defined names and structured references
- Proper input cell conventions (light yellow backgrounds)
- Conditional formatting at scale

We can take his *concepts* (the information he shows, the workflows he supports) and rebuild them with proper patterns. The result should be:

- **Cleaner** — consistent formatting, no visual noise
- **More reliable** — formulas that don't break, reconciliation built-in
- **More powerful** — modern Excel features unlock things he couldn't do
- **More maintainable** — code-generated means we can iterate

---

## Design principles

### 1. Dense AND beautiful

Cap analysts live in spreadsheets. They can read dense grids. Don't waste space with padding, instructions, or "user-friendly" empty rows.

But dense doesn't mean ugly. It means **information-rich with careful visual design**:

- **Typography:** Aptos Narrow for data (compact but legible), consistent font sizes
- **Alignment:** Numbers right-aligned, text left-aligned, headers centered where appropriate
- **Borders:** Subtle and purposeful — section dividers, not a grid of boxes
- **Color:** Communicates meaning (status, alerts, input zones), not decoration
- **Whitespace:** Minimal but intentional — row height and column width tuned for scannability

Think Bloomberg terminal, not clip-art spreadsheet. Think well-designed TUI, not ASCII dump.

### 2. Inputs are light yellow

This is the Excel convention. If a cell is meant to be edited, it has a light yellow background. Everything else is computed or locked.

### 3. Reactive feedback via conditional formatting

When something changes state (over cap, hard-capped, trade illegal), the UI should react visually. Color shifts, icons, bold text.

### 4. Adjacent context

Don't make analysts remember rules. Show the salary matching tiers *next to* the trade inputs. Show minimum scale *next to* the roster.

### 5. Formulas use modern Excel

- `FILTER` + `SORTBY` instead of helper columns
- `XLOOKUP` instead of `INDEX/MATCH`
- `LET` for readable complex formulas
- `LAMBDA` for reusable calculations (defined as workbook names)
- Dynamic arrays that spill

### 6. Reconciliation is non-negotiable

Every total must tie to an authoritative source. If there's a discrepancy, it should be visible and loud.

### 7. The "Playground" is adjacent, not separate

Scenario modeling ("what if we trade X?") should happen *next to* the roster, not in a separate sheet. The analyst should see the base case and the delta simultaneously.

---

## What we're NOT building

- **A CBA reference manual.** Rules are shown in context, not dumped into a reference sheet.
- **A step-by-step wizard.** Analysts know what they're doing. Give them tools, not training wheels.
- **A pretty dashboard for executives.** This is a working tool for practitioners.
- **A web app in Excel.** We're not fighting Excel — we're using it as intended.

---

## Technical foundations

### Code generation via XlsxWriter

See `excel/XLSXWRITER.md` for patterns. Key points:

- `use_future_functions: True` for modern Excel
- `write_dynamic_array_formula()` for spill formulas
- `ANCHORARRAY()` instead of `#` operator
- `_xlpm.` prefix for LAMBDA parameters
- Defined names for reusable formulas

### Data layer (DATA_ sheets)

The DATA_ sheets are solid and don't need redesign. See `excel-workbook-data-contract.md`.

| Sheet | Table | Purpose |
|-------|-------|---------|
| DATA_system_values | tbl_system_values | Cap/tax/apron thresholds |
| DATA_tax_rates | tbl_tax_rates | Luxury tax brackets |
| DATA_rookie_scale | tbl_rookie_scale | Rookie scale amounts |
| DATA_minimum_scale | tbl_minimum_scale | Min salary by years of service |
| DATA_team_salary_warehouse | tbl_team_salary_warehouse | Authoritative team totals |
| DATA_salary_book_warehouse | tbl_salary_book_warehouse | Wide salary book |
| DATA_salary_book_yearly | tbl_salary_book_yearly | Tall salary book |
| DATA_cap_holds_warehouse | tbl_cap_holds_warehouse | Cap holds/rights |
| DATA_dead_money_warehouse | tbl_dead_money_warehouse | Dead money |
| DATA_exceptions_warehouse | tbl_exceptions_warehouse | Exception inventory |
| DATA_draft_picks_warehouse | tbl_draft_picks_warehouse | Draft pick ownership |

### META sheet

Build metadata: timestamp, base year, as-of date, git SHA, validation status.

---

## Next steps

Before building more UI sheets, we need to:

1. **Study Sean's actual layouts.** Screenshot them. Understand what information he shows and where.
2. **Talk to more analysts.** What do they actually look at? What workflows matter?
3. **Prototype on paper first.** Sketch the dense layouts before writing code.
4. **Start with one sheet.** Get the Team view right before building others.

The goal is not to ship fast. The goal is to ship something analysts actually want to use.

---

## Success criteria

A cap analyst should be able to:

1. Open the workbook and immediately see their team's cap position
2. Model a trade and see the salary matching math without leaving the view
3. Trust that every number reconciles to authoritative sources
4. Explain any number by drilling into the contributing rows
5. Work faster than they could in Sean's workbook (eventually)

If we achieve this, we win.
