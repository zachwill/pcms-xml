# Mental Models & Design Principles

**Updated:** 2026-02-01

Foundational thinking for the Excel cap workbook.

---

## 1. Trust is the product

Analysts need numbers they can defend. Every total must be:
- **Authoritative** — sourced from the counting ledger
- **Reconcilable** — show me the contributing rows
- **Explainable** — show me the assumptions

If a number can't be explained, it can't be trusted.

---

## 2. Dense AND beautiful

Cap analysts read dense grids all day. They don't need padding or hand-holding.

But dense ≠ ugly:
- **Aptos Narrow** — compact, modern, legible
- **Alignment** — numbers right, decimals aligned
- **Borders** — subtle section dividers
- **Color** — meaningful, not decorative
- **Conditional formatting** — reactive feedback

Think Bloomberg terminal. Think `lazygit`. Dense but designed.

---

## 3. Reactivity

Inputs drive the view. Type a player name → roster updates. Change a salary → totals react.

The whole sheet is one reactive surface. No separate "scenario mode." No "submit" button.

This is the TUI analogy: live-computed state from current inputs.

---

## 4. Everything visible

Analysts don't want to navigate between sheets to see cause and effect.

- Scenario inputs *next to* the roster they affect
- Totals always visible
- Rules shown where they're needed

Minimize clicks. Maximize information density.

---

## 5. Explicit policies

Generated rows (roster fills, assumptions) must be:
- Visible
- Labeled
- Distinguishable from authoritative data

No "spooky action at a distance" where numbers change without visible cause.

---

## 6. Modern Excel

Use the tools:
- `FILTER`, `SORTBY` — no helper columns
- `XLOOKUP` — no INDEX/MATCH gymnastics
- `LET` — readable complex formulas
- `LAMBDA` — reusable calculations
- Conditional formatting — reactive visual feedback

Sean didn't have these. We do.

---

## 7. Inputs are light yellow

Universal Excel convention. Yellow = editable. Everything else = computed or locked.

---

## 8. Improve on Sean, don't copy him

Sean's workbooks encode decades of insight. But he built incrementally with older Excel.

We take his *concepts* and rebuild with:
- Modern formulas
- Code-generated consistency
- Proper conventions
- Reactivity at scale

The result: cleaner, more reliable, more powerful.
