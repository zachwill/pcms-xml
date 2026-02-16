# Rails Restructuring Roadmap (Current)

This file tracks what is **actually left** after the namespace flattening work.

_Last updated: 2026-02-11_

---

## Current architecture snapshot

The app is now flattened at the top level:

- Controllers live in `app/controllers/*` (no `tools/` or `entities/` controller namespaces)
- Views live in `app/views/<feature>/*` (no `app/views/tools/*` or `app/views/entities/*` roots)
- Shared entity/tool partials are under `app/views/shared/*`
- Routes are top-level (no `scope module: :entities`, no `namespace :tools`)
- Salary Book canonical path is `/` (`salary_book_path`)

Important invariants remain unchanged:

- Datastar runtime + server-rendered HTML
- SQL-first business logic (`pcms.fn_*`, warehouses)
- Stable patch boundary IDs (`#commandbar`, `#maincanvas`, `#rightpanel-base`, `#rightpanel-overlay`, `#flash`)

---

## Completed milestones

### ✅ Namespace flattening

- `tools/*` internals moved up and de-namespaced
- `entities/*` internals moved up and de-namespaced
- JS entry modules moved to top-level (`salary_book`, `system_values`, `team_summary`, `two_way_utility`, `workspace`)
- Route helpers and render partial paths updated to flattened structure

### ✅ URL cleanup

- Salary Book canonical URL is `/`
- `/salary-book` remains available as a direct route
- `/tools/*` prefix removed from active app navigation and internal links

### ✅ Query/service extraction foundation

Query objects/services exist for the key feature areas (`app/queries`, `app/services`) and are actively used by controllers.

### ✅ Agencies controller extraction pass

`agencies_controller.rb` has been slimmed to orchestration-only shape with:

- `AgencyQueries` for SQL access
- `Agencies::IndexWorkspaceState` for index filters/rows/sidebar summary
- `Agencies::ShowWorkspaceData` for show-page hydration

### ✅ Draft selections index extraction pass

`draft_selections_controller.rb` now delegates index workspace assembly to `DraftSelections::IndexWorkspaceState`, reducing controller-level filter/query/sidebar derivation bloat while keeping existing Datastar behavior and patch IDs unchanged.

### ✅ Team Summary controller extraction pass

`team_summary_controller.rb` now delegates workspace assembly to:

- `TeamSummaryQueries` for SQL access
- `TeamSummary::WorkspaceState` for filter parsing, compare/step orchestration state, sidebar hydration, and state params

### ✅ System Values workspace extraction pass

`system_values_controller.rb` now delegates base workspace loading/state params to `SystemValues::WorkspaceState` (while keeping overlay derivation in `SystemValues::WorkspaceDerivedState`).

### ✅ Salary Book controller extraction pass

`salary_book_controller.rb` now delegates major request assembly to focused services under `app/services/salary_book/*`:

- `SalaryBook::WorkspaceState` (show bootstrap + boot-error fallback)
- `SalaryBook::FrameState` (main frame payloads + frame error payloads)
- `SalaryBook::TeamSidebarState` (team/cap/draft/rights sidebar hydration)
- `SalaryBook::ComboboxPlayersState` (combobox request param normalization + payload)
- `SalaryBook::SidebarPickState` (pick overlay hydration)

Additional cleanup:

- Added query delegation from controller to `SalaryBookQueries` so `SalaryBookSwitchController` can safely reuse shared query calls.
- Updated Salary Book integration tests to current URLs (`/salary-book*`) and added switch-team patch-payload coverage.

### ✅ Baseline integration tests exist

`test/integration/` now has broad coverage across major surfaces (entities + tools), instead of only a single model test.

---

## What still needs restructuring

## 1) Finish controller slimming (highest priority)

Controllers still over target size:

| Controller | LOC |
|---|---:|
| `draft_selections_controller.rb` | 336 |
| `system_values_controller.rb` | 279 |
| `two_way_utility_controller.rb` | 247 |
| `drafts_controller.rb` | 238 |
| `team_summary_controller.rb` | 217 |
| `agents_controller.rb` | 217 |
| `teams_controller.rb` | 215 |
| `draft_picks_controller.rb` | 213 |
| `agencies_controller.rb` | 201 |

Target:

- Index/overlay orchestration in controllers
- SQL and derivation moved to queries/services
- Bring controllers toward ≤200 LOC where practical

## 2) Helper bloat → presenters / focused helper modules

Current helper sizes:

- `app/helpers/salary_book_helper.rb` ~805 LOC
- `app/helpers/entities_helper.rb` ~336 LOC

Action:

- Extract presenter/view-model objects for sidebar-heavy rendering
- Split helper responsibilities by concern (`formatting`, `badges`, `rows`, etc.)

## 3) Partial decomposition (large ERB files)

Largest files still need decomposition:

- `salary_book/_sidebar_player.html.erb` (550)
- `salary_book/_sidebar_agent.html.erb` (427)
- `players/_workspace_main.html.erb` (381)
- `salary_book/show.html.erb` (362)
- `salary_book/_sidebar_pick.html.erb` (361)
- `teams/_workspace_main.html.erb` (352)

Target:

- Keep most partials ≤100–150 LOC
- Extract repeatable row/cell units into shared partials under `app/views/shared/*`

## 4) Introduce lightweight domain objects

Still heavily hash-based in render paths.

Action:

- Add plain Ruby read models/value objects for repeated concepts (cap sheet rows, draft assets, trade summaries, etc.)
- Keep these lightweight and read-oriented

## 5) Test strategy: deepen from integration-only baseline

Current state is better (integration tests exist), but still missing layered confidence.

Next additions:

1. Controller smoke matrix (all public actions)
2. Query object tests under `test/queries/*`
3. Service tests under `test/services/*`
4. Presenter/helper unit tests for formatting and conditional display logic

## 6) Route file ergonomics

Behavior is correct, but route file is large.

Optional cleanup:

- Extract route groups via `draw`/concerns for readability
- Keep current URL contracts unchanged while reorganizing declarations

---

## Recommended sequencing from here

### Phase A — Controller extraction pass

Focus in order:

1. `draft_selections_controller.rb` (show/sidebar extraction remains)
2. `system_values_controller.rb` (final extraction + error-path cleanup)
3. `two_way_utility_controller.rb`
4. `drafts_controller.rb`
5. `team_summary_controller.rb` (final extraction + error-path cleanup)

(`salary_book_controller.rb` and `agencies_controller.rb` extraction passes completed.)

Gate: no controller >400 LOC; top 3 materially reduced. ✅ (current max: `draft_selections_controller.rb` at 336 LOC)

### Phase B — Sidebar presenter extraction

- `PlayerSidebarPresenter`
- `AgentSidebarPresenter`
- helper split for `salary_book_helper`

Gate: `salary_book_helper.rb` reduced substantially (<300 first checkpoint).

### Phase C — Partial decomposition + shared row library

Start with Salary Book sidebar + Teams/Players workspace partials.

Gate: no partial >250 LOC in the targeted surfaces.

### Phase D — Test deepening

Add query/service/controller tests around the newly extracted units.

Gate: integration + unit layers both green in CI/local.

---

## What not to change

- Do not introduce Turbo/Hotwire/Stimulus
- Do not move business logic into JS
- Do not reimplement cap/CBA math in Ruby
- Do not change Datastar patch boundary IDs

---

## Related docs

- `web/AGENTS.md` (hard rules + patch boundaries)
- `web/docs/design_guide.md`
- `web/docs/datastar_sse_playbook.md`
