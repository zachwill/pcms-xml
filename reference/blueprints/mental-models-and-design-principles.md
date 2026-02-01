# Mental Models & Design Principles

**Updated:** 2026-02-01

This document captures the foundational thinking behind our cap tooling.

---

## 1) Trust is the product

NBA cap work is fundamentally ledger work.

Analysts need a snapshot that is:
- **Authoritative** — "this is what counts"
- **Reconcilable** — "show me the contributing rows"
- **Defensible** — "show me which assumptions/rules were applied"

### The core trap: "rows that exist" vs "rows that count"

Cap tools fail when:
- Detail tables contain rights/holds/artifacts that *exist* but *don't count*
- Totals are computed from a different definition than the drilldown

**Non-negotiable rule:** All displayed totals must be sourced from (or reconcile to) the authoritative counting ledger.

### Every headline number needs an audit path

For any primary readout (cap total, tax total, apron room, roster count), the system must expose:
- Contributing rows
- Assumptions applied
- Delta vs baseline

If that's missing, the tool will eventually lose trust.

---

## 2) Dense AND beautiful

Cap analysts live in spreadsheets. They read dense grids all day. They don't need:
- Padding and whitespace
- Step-by-step instructions
- "User-friendly" empty rows
- Pretty charts and dashboards

They need **walls of relevant numbers** — but that doesn't mean ugly.

### Dense with careful visual design

- **Typography:** Aptos Narrow (compact, modern, legible). Consistent sizes.
- **Alignment:** Numbers right-aligned. Text left-aligned. Decimal points line up.
- **Borders:** Subtle section dividers, not a grid of heavy boxes.
- **Color:** Meaningful (alerts, status, input zones) — not decorative.
- **Conditional formatting:** Reactive feedback, not Christmas lights.
- **Row/column sizing:** Tuned for scannability. No wasted space, no cramped text.

### The TUI analogy

Think of each worksheet as a well-designed terminal UI — `lazygit`, not raw `git log`. Information-dense, reactive to inputs, everything visible at once, but with care taken on typography and visual hierarchy.

A good cap worksheet is closer to Bloomberg than to PowerPoint.

---

## 3) Everything visible, nothing hidden

Analysts don't want to navigate between sheets to see cause and effect.

### The "Playground" is adjacent

Scenario modeling ("what if we trade X?") should happen *next to* the roster view, not in a separate sheet. The analyst should see:
- Base case
- Modified case
- Delta

All at once. No clicking.

### No scattered context

If team/year/mode selectors exist, they should be visible and consistent. No hidden cells driving formulas.

---

## 4) Recognition over recall

Don't make analysts memorize rules. Show them.

### Adjacent context

- Salary matching tiers displayed *next to* trade inputs
- Minimum scale displayed *next to* roster
- Apron gates displayed *where exceptions are chosen*

### Inline references

Rules that govern a calculation should be visible near that calculation — not buried in a separate reference sheet.

---

## 5) Policies must be explicit

Most "complexity" comes from invisible defaults.

Examples:
- Fill-to-12 vs fill-to-14 vs fill-to-15
- Rookie minimum vs veteran minimum assumptions
- Whether two-ways count toward roster size (CBA: they don't)
- How partial guarantees are treated

### Generated rows must be visible

If you auto-fill roster spots or generate charges:
- They must appear as **generated rows**
- They must be visually distinct (e.g., amber background)
- They must be toggleable
- They must be labeled as assumptions, not facts

Otherwise: "spooky action at a distance" (numbers change without visible cause).

---

## 6) Time is a first-class input

Date is not metadata.

The same move on a different date can change:
- Proration
- Guarantee status
- Waiver clearance timing
- Eligibility windows

**Design rule:** As-of date is part of the context and must be visible.

---

## 7) Reactive feedback via formatting

When state changes, the UI should react visually:
- Over cap → color shift
- Hard-capped → alert styling
- Trade illegal → red indicator
- Reconciliation failed → loud warning

Conditional formatting is the "reactivity" of Excel. Use it.

---

## 8) Excel conventions matter

### Input cells are light yellow

This is the universal Excel convention. If a cell is meant to be edited, it has a light yellow background. Everything else is computed or locked.

### Consistent visual hierarchy

- Bold for totals and headers
- Subtle gridlines (not heavy borders everywhere)
- Consistent number formatting (currency, percentages)
- Monospace or tabular fonts for numbers that need to align

### Protection for non-input cells

Users shouldn't accidentally overwrite formulas. Lock everything except designated input areas.

---

## 9) Modern Excel unlocks new patterns

Sean built his workbooks over decades with older Excel. We have:

- **Dynamic arrays** — `FILTER`, `SORTBY`, `UNIQUE` eliminate helper columns
- **XLOOKUP** — cleaner than `INDEX/MATCH`
- **LET** — readable complex formulas with named intermediate values
- **LAMBDA** — reusable calculations defined as workbook names
- **Spill ranges** — formulas that expand automatically

These aren't just conveniences. They enable layouts and calculations that weren't possible before.

---

## 10) Improve on Sean, don't copy him

Sean's workbooks encode decades of domain insight. But he was constrained by:
- Older Excel features
- Manual construction (copy-paste errors accumulate)
- No code generation (inconsistent formatting)
- No version control (hard to iterate)

We can take his *concepts* and rebuild them with:
- Modern Excel formulas
- Code-generated consistency
- Proper input cell conventions
- Conditional formatting at scale
- Reconciliation built into the structure

The result should be cleaner, more reliable, and more powerful.

---

## 11) Row taxonomy (shared language)

A tool needs an explicit taxonomy for what a row represents:

| Bucket | Meaning | Counts toward total? | Counts toward roster? |
|--------|---------|---------------------|----------------------|
| ROST | Active roster contracts | Yes | Yes |
| FA | Holds/rights | Yes | No |
| TERM | Dead money | Yes | No |
| 2WAY | Two-way contracts | Yes | No |
| GEN | Generated assumption rows | Yes (policy) | Yes (policy) |
| EXISTS | Future-year only (reference) | No | No |

This taxonomy must be consistent across all views.

---

## 12) The goal state

A great cap workbook has:
- **Warehouse-backed truth** — authoritative data layer
- **Dense UI** — walls of numbers with clear hierarchy
- **Visible scenarios** — playground adjacent to roster
- **Explicit policies** — generated rows labeled as assumptions
- **Audit paths** — every number explainable
- **Modern formulas** — dynamic arrays, XLOOKUP, LET, LAMBDA
- **Excel conventions** — yellow inputs, protection, consistent formatting

When in doubt: optimize for reconciliation and density. Speed comes from trust.
