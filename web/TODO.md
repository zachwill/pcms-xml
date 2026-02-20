# web/TODO.md — Post-MVP Rails Restructure Plan

We now have a strong MVP for `web/`.

This TODO is focused on the next pass: reshaping the app so we can iterate quickly toward v1 while staying aligned with Rails + Datastar conventions.

---

## Objectives

- Keep server-rendered HTML as the source of truth.
- Reduce coupling in Salary Book and shared UI surfaces.
- Make page boundaries and partial ownership explicit.
- Make future tool/app additions predictable.

---

## Phase 1 — Clarify architecture boundaries

- [ ] Document canonical patch boundaries (`#commandbar`, `#maincanvas`, `#rightpanel-base`, `#rightpanel-overlay`, `#flash`) per tool.
- [ ] Move view-level orchestration into small, named partials with clear ownership.
- [ ] Ensure multi-region updates use one response (HTML patch set or SSE).

## Phase 2 — Rails controller + view cleanup

- [ ] Keep controllers thin: parameter normalization + query orchestration + render selection.
- [ ] Move repeated formatting/presentation branching into helpers/partials.
- [ ] Standardize naming for partials that map to patch targets.

## Phase 3 — Salary Book app-mode refactor (v1 foundation)

- [ ] Introduce explicit app state (`app` param + `activeapp` signal), defaulting to `salaries`.
- [ ] Separate app-switch behavior from team-switch behavior.
- [ ] Gate salary-only background effects/loaders so they do not run in non-salary modes.
- [ ] Keep existing Salaries behavior unchanged when `app=salaries`.

## Phase 4 — Data and query contracts

- [ ] Define stable query interfaces per page/tool (inputs + expected columns).
- [ ] Keep cap/trade/CBA logic in SQL primitives (`pcms.fn_*` / warehouses), not Ruby/JS.
- [ ] Add lightweight assertions where query shape guarantees are critical.

## Phase 5 — Delivery hygiene for faster iteration

- [ ] Add page-level smoke checks for key tools (render + key patch targets present).
- [ ] Trim dead signals and stale UI toggles that are not wired end-to-end.
- [ ] Keep docs in sync (`web/README.md`, `web/docs/*`) when boundaries or flows change.

---

## Definition of done for the restructure pass

- New contributors can identify where to change command bar, main canvas, and sidebar behavior in minutes.
- Multi-region interactions follow one-response patterns consistently.
- Salary Book supports app-aware orchestration without regressing current salaries workflows.
- The codebase is ready for incremental v1 features without large rewrites.
