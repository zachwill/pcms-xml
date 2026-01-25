# web/specs/00 — UI Philosophy & Invariants

> This is not a visual design doc. It is the interaction + information-design contract.
> The Salary Book UI is intentionally **not** a “documentation UI” and should not drift into that.

## Core thesis

This app is a front-office instrument:

- **Rows are the product.** The primary surface is a dense, scrollable, multi-team table.
- **Scroll position drives context.** The app always knows which team you’re “in.”
- **The sidebar is an intelligence panel.** It answers the *next question* without losing place.
- **Navigation is shallow.** One overlay at a time; clicking a new entity replaces the overlay.

This is the opposite of “cards + modals + pages.”

## Non-negotiables

### 1) No documentation UI

- Do not add “rule cards,” long prose blocks, or content-first layouts.
- Rules are expressed as **derived fields + constraints + warnings + badges + tooltips**.
- Full clause text can exist, but should be **collapsed** and secondary.

### 2) Compute in Postgres

- Postgres warehouses/functions are the product API.
- The web app should be a thin consumer.
- Prefer: `pcms.*_warehouse` tables, `pcms.fn_*` functions.
- Avoid re-implementing CBA/Ops math in React.

### 3) Two-level sidebar state machine

The sidebar has a base state (team context) and a single overlay (entity detail).

- Team context updates with scroll-spy.
- Overlay does not change during scroll.
- Clicking another entity replaces the overlay (does not stack).
- Back returns to **current** viewport team, not origin.

### 4) Filters are lenses, not navigation

- Filters reshape what’s visible/badged.
- Filters must not change selection state.
- Toggling filters should preserve scroll position and not “jump the user.”

## Rule-to-UI translation guidelines

When you discover complicated rules (CBA/Ops Manual), translate them into:

1. **Derived attributes** (DB): booleans, classifications, computed amounts, “earliest/latest year,” etc.
2. **Constraint flags** (DB): “blocked because X,” “gated by apron,” “counts as cash now,” etc.
3. **Minimal visual markers** (UI): chips, glyphs, cell tints, hover tooltips.
4. **Sidebar intel modules** (UI): timeline + constraint report + drilldown.

Never translate rules into “read this explanation.” Translate into “here is what it means and what blocks you.”

## Information hierarchy

- The **sticky team header** is for identity + constraint posture (at-a-glance).
- The **table** is for scanning and comparison.
- The **sidebar Tier 0** is for thresholds + restriction state + slots.
- Everything else is drilldown.

## Debugging / correctness

- If a UI element is confusing, the fix is usually a **missing derived field** or a **bad precedence decision**, not more text.
- If a UI query is slow, fix it in SQL (warehouse refresh / indexes / fast refresh functions).

## Related specs

- `web/specs/01-salary-book.md` — main interaction model.
- `web/specs/02-team-header-and-draft-assets.md` — header KPIs + draft assets UI.
- `web/specs/03-trade-machine.md` — trade planning UI + DB primitives.
