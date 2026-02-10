# TODO_UI — Align tools/entities with `reference/ui.md`

## Why
`tools/salary_book` is the strongest implementation of the intended interaction model (dense, stateful, scroll-first, base+overlay sidebar). Several other tools and entity pages are functional but less aligned with that model.

This doc captures concrete ideas to align `web/` with:
- `reference/ui.md`
- `reference/ferrari.md` (state/coupling/contracts/snapshots patterns)
- `web/docs/design_guide.md`

---

## Core alignment principles

1. **State machine first, page second**
   - Explicitly define page states (loading/ready/empty/error + lens states).
   - Define valid/invalid inputs per state.

2. **Rows over cards**
   - Prefer dense, two-line row patterns and table/flex row strips.
   - Keep cards only where narrative context is truly needed.

3. **Couplings, not isolated modules**
   - User actions in one module should update related modules (filters/highlights/context).
   - Avoid sections that feel independent and disconnected.

4. **Semantic color, not decorative color**
   - Green = safe/under, Red = risk/over, Yellow = active/default, Gray = inactive.

5. **Deliberate absence**
   - Hide/suppress non-relevant content in high-focus states.
   - Avoid showing every box all the time.

6. **Base + overlay sidebar as a shared primitive**
   - Reuse `#rightpanel-base` + `#rightpanel-overlay` beyond Salary Book where useful.

---

## Current strong references in `web/`

- `web/app/views/tools/salary_book/*`
- `web/app/views/entities/players/show.html.erb`
- `web/app/views/entities/teams/show.html.erb`

These should be treated as canonical interaction references.

---

## High-priority pages to improve

### Entity pages (most card-heavy / least coupled)
- `web/app/views/entities/agents/show.html.erb`
- `web/app/views/entities/agencies/show.html.erb`
- `web/app/views/entities/trades/show.html.erb`
- `web/app/views/entities/transactions/show.html.erb`
- `web/app/views/entities/draft_selections/show.html.erb`
- `web/app/views/entities/draft_picks/show.html.erb`

### Tools (already dense, but less explicit state/coupling)
- `web/app/views/tools/system_values/show.html.erb`
- `web/app/views/tools/team_summary/show.html.erb`
- `web/app/views/tools/two_way_utility/show.html.erb`

---

## Concrete ideas by theme

### A) Add rendering/state contracts (Ferrari-style)
For each major page, add a small contract doc in `web/docs/contracts/`:
- states
- transitions
- valid inputs by state
- what each region should render

Examples to add:
- `web/docs/contracts/trades_show.md`
- `web/docs/contracts/transactions_show.md`
- `web/docs/contracts/team_summary.md`

### B) Add coupling maps per page
For each surface, list "when X changes, Y/Z update".

Example (`transactions/show`):
- Focus team changes -> parties/ledger/artifacts filter together.
- Click trade context -> related transaction rows highlighted.
- Lens toggle -> numeric columns reframe across all sections.

### C) Expand base+overlay sidebar pattern
Adopt `#rightpanel-base` + `#rightpanel-overlay` where it adds drill-in clarity:
- `tools/team_summary` (team row -> rightpanel context)
- `tools/two_way_utility` (player row -> overlay details)
- optionally trades/transactions entity pages for linked entity quick look

### D) Replace card grids with dense row strips
In pages above, migrate KPI card clusters to:
- compact KPI strips
- table/flex rows with two-line cells
- consistent hover + mono/tabular numeric styling

### E) Add system-driven overrides
Examples:
- If risk lens is active, auto-expand risk-relevant sections.
- If no linked trade/player context exists, suppress that module.
- If exception rows exist, auto-open artifacts/details module.

### F) Add snapshot fixtures (test/design)
Define 3–5 snapshots per major page:
- populated normal
- empty
- high-risk/edge
- error
- filtered subset

Use these as review fixtures for UI + behavior consistency.

---

## Page-specific ideas

### `tools/team_summary/show.html.erb`
- Add active-row state and keyboard navigation.
- Add rightpanel team context (mini salary summary + quick pivots).
- Keep URL/deep-link behavior tied to active team + filters.

### `tools/two_way_utility/show.html.erb`
- Add risk lens (`all | warning | critical`) tied to remaining-games thresholds.
- Couple lens -> sorting -> row highlighting.
- Add optional player overlay for quick context.

### `tools/system_values/show.html.erb`
- Add lens modes: `absolute | YoY delta | % delta`.
- Add threshold-change markers for cap/tax/apron transitions.
- Keep dense table layout; avoid adding card chrome.

### `entities/trades/show.html.erb` and `entities/transactions/show.html.erb`
- Add shared “focus team” state that filters all modules consistently.
- Tighten section coupling (leg breakdown <-> ledger <-> artifacts).
- Reduce card-style vitals in favor of denser strips.

### `entities/agents/show.html.erb` and `entities/agencies/show.html.erb`
- Convert vitals/connections card grids to denser, row-first modules.
- Keep historical/detail blocks as collapsible drill-ins.
- Add stronger linked pivots and optional contextual overlay behavior.

---

## Migration order (recommended)

### P1 (high impact, low-medium risk)
1. `tools/team_summary/show.html.erb` rightpanel + active-row state
2. `tools/two_way_utility/show.html.erb` risk lens + coupled sorting/highlighting
3. `entities/agents/show.html.erb` density refactor (remove excess cards)
4. `entities/agencies/show.html.erb` density refactor

### P2 (higher complexity)
5. `entities/trades/show.html.erb` focus-team coupling model
6. `entities/transactions/show.html.erb` focus-team coupling model
7. `tools/system_values/show.html.erb` delta lenses + threshold highlights

### P3 (consistency/cleanup)
8. `entities/draft_selections/show.html.erb` density + coupling polish
9. `entities/draft_picks/show.html.erb` density + coupling polish
10. Add/standardize contract docs + snapshot fixtures

---

## Definition of done (per page)

- Uses correct shell pattern from `web/docs/design_guide.md`.
- Has explicit state/lens model (even if small).
- Uses dense row-first treatment where data is primary.
- Numeric cells use `font-mono tabular-nums` consistently.
- Row hover follows shared yellow pattern.
- Cross-module couplings are intentional and visible.
- URL/deep link captures key context (where relevant).
- Optional: contract + snapshot docs added for complex pages.
