# Rails Restructuring Roadmap

MVP is working well — entities, tools, Datastar patches, SSE, sidebar overlays all function. This roadmap captures the structural improvements needed to iterate confidently toward v1.

---

## What we got right in the MVP

- **Datastar + server HTML** pattern is correct and should stay
- **Entity / Tool split** helped MVP move quickly, but cross-surface features now justify flattening this boundary (migrate gradually)
- **SSE controllers** are well-sized (70–130 lines) — good reference pattern
- **Patch boundary IDs** (`#commandbar`, `#maincanvas`, `#rightpanel-base`, `#rightpanel-overlay`) are stable
- **SQL-first business logic** (`pcms.fn_*`, warehouses) keeps CBA math out of Ruby — keep it there
- **Slug model** and entity URL structure (`/players/:slug`, `/teams/:slug`) are clean

---

## What needs restructuring

### 1) Fat controllers → extract query objects + service objects

**Problem:** Most controllers are 600–1,300 lines. They inline SQL query construction, row-level annotation, sorting/filtering logic, and response formatting.

| Controller | Lines | Priority |
|------------|-------|----------|
| `tools/salary_book_controller.rb` | 385 (was 1,293) | ✅ In progress |
| `tools/system_values_controller.rb` | 362 (was 1,240) | ✅ Query + workspace service extraction done |
| `entities/players_controller.rb` | 229 (was 1,196) | ✅ Query + index workspace service extraction done |
| `entities/drafts_controller.rb` | 647 (was 1,018) | ✅ Query extraction done; controller slimming ongoing |
| `entities/transactions_controller.rb` | 500 (was ~951) | ✅ Query extraction done; controller slimming ongoing |
| `entities/teams_controller.rb` | 485 (was 927) | ✅ Query extraction done; controller slimming ongoing |
| `entities/trades_controller.rb` | 295 (was 772) | ✅ Query extraction done; controller slimming ongoing |
| `entities/agents_controller.rb` | 477 (was 874) | ✅ Query extraction done; controller slimming ongoing |
| `tools/two_way_utility_controller.rb` | 422 (was 740) | ✅ Query extraction done; controller slimming ongoing |

**Target:** Controllers should be ≤200 lines. They call into query/service objects and render.

**Pattern:**

```
app/
  queries/                      # SQL query builders (return result sets)
    salary_book_queries.rb
    player_queries.rb
    ...
  services/                     # Multi-step orchestration
    salary_book/
      team_frame_builder.rb
      sidebar_builder.rb
    ...
```

Each query class encapsulates one SQL concern. Controllers become thin orchestration:

```ruby
# Before (inline in controller)
def show
  rows = ActiveRecord::Base.connection.select_all(<<~SQL)
    SELECT ... FROM pcms.salary_book_warehouse ...
  SQL
  # 80 lines of annotation, sorting, grouping
end

# After
def show
  @frame = SalaryBook::TeamFrameBuilder.call(team: params[:team], year: params[:year])
end
```

### 2) Missing model / domain layer

**Problem:** Only `Slug` model exists. All data access is raw SQL in controllers. No place to put shared query logic, computed attributes, or cross-controller reuse.

**Action:** Introduce lightweight read-only models or plain Ruby domain objects for core concepts:

```
app/models/
  salary_entry.rb        # Wraps a salary_book_warehouse row
  team_cap_sheet.rb      # Team-level cap summary
  draft_asset.rb         # Pick ownership record
  trade_record.rb        # Trade with annotations
```

These don't need full ActiveRecord — `Struct`, `Data`, or read-only AR models work fine. The point is a named object with computed methods instead of hash manipulation in controllers.

### 3) Helper bloat → presenters or view models

**Problem:** `salary_book_helper.rb` is 641 lines. `entities_helper.rb` is 336 lines. Helpers are grab-bags of formatting, conditional logic, and HTML generation.

**Action:** Move display logic into presenter objects or view-specific helpers:

```
app/presenters/
  player_row_presenter.rb
  salary_book_sidebar_presenter.rb
  cap_hold_presenter.rb
```

Or, at minimum, split the monolithic helpers:

```
app/helpers/
  salary_book/
    formatting_helper.rb
    sidebar_helper.rb
    filter_helper.rb
```

### 4) View partial decomposition

**Problem:** Several partials are 250–500 lines:

| Partial | Lines |
|---------|-------|
| `salary_book/_sidebar_player.html.erb` | 494 |
| `salary_book/_sidebar_agent.html.erb` | 368 |
| `players/_workspace_main.html.erb` | 345 |
| `salary_book/show.html.erb` | 332 |
| `players/_rightpanel_base.html.erb` | 270 |
| `salary_book/_player_row.html.erb` | 260 |
| `salary_book/_sidebar_team_tab_cap.html.erb` | 256 |
| `salary_book/_team_section.html.erb` | 249 |

**Target:** Partials should be ≤100 lines. Extract sub-partials for logical sections (contract details, guarantee rows, agent info, etc.).

### 5) Test coverage

**Problem:** Only one test exists (`test/models/slug_test.rb`). No controller tests, no integration tests, no system tests.

**Priority tests to add (in order):**

1. **Controller smoke tests** — each action returns 200 (requires DB fixtures or factory setup)
2. **Query object tests** — once extracted, test SQL builders in isolation
3. **Helper / presenter tests** — formatting and display logic
4. **Integration tests** — key user flows (team switch, sidebar drill-in, entity navigation)

Test infrastructure decisions:
- [ ] Decide on fixture strategy (SQL fixtures from warehouse snapshots vs factory_bot)
- [ ] Set up `test/queries/` mirroring `app/queries/`
- [ ] Consider `test/integration/` for Datastar patch flow tests

### 6) Route organization

**Current state:** Routes are well-organized but verbose (160+ lines). As entity count grows, consider:

- [ ] Extract entity routes into a shared concern/helper (`draw :entities`)
- [ ] Use `resources` where the pattern fits (sidebar, SSE, pane are consistent across entities)
- [ ] Add a migration route plan for intentional URL cleanup while flattening `tools/` and `entities/` internals

### 7) Namespace flattening: move beyond `entities/` vs `tools/`

**Problem:** The original split was useful early, but current features increasingly span both surfaces. Keeping strict directory/module boundaries now creates duplication and awkward cross-calls.

**Action:** Gradually lift controllers/views/helpers to a flatter top-level organization, starting with `tools/`, then `entities/`, while preserving behavior and patch boundaries.

Possible target shape:

```
app/controllers/
  salary_book_controller.rb
  system_values_controller.rb
  players_controller.rb
  teams_controller.rb
  ...

app/views/
  salary_book/*
  players/*
  teams/*
  ...
```

Migration guardrails:
- [ ] Prefer correct URL design over legacy compatibility (pre-production)
- [ ] Keep Datastar patch IDs unchanged (`#commandbar`, `#maincanvas`, `#rightpanel-base`, `#rightpanel-overlay`)
- [ ] Avoid big-bang rewrites; move one feature area at a time

### 8) JavaScript organization

**Current state:** JS is minimal and well-scoped (one file per tool/entity workspace). This is fine for now.

**Future:** If JS grows, consider:
- [ ] Shared utility module for common Datastar signal patterns
- [ ] Extract scroll/measure/sync helpers into a shared module

---

## Sequencing (recommended order)

### Phase 1 — Extract query objects from the biggest controllers

Focus on the three 1,000+ line controllers first:

- [x] `SalaryBookQueries` — extracted from `salary_book_controller.rb` (controller now ~385 LOC)
- [x] `SystemValuesQueries` — extracted SQL/data fetches from `system_values_controller.rb` (controller now ~362 LOC)
- [x] `SystemValues::WorkspaceDerivedState` — extracted overlay/metric-finder/quick-card derivation out of controller
- [x] `PlayerQueries` — extracted SQL/data fetches from `players_controller.rb` (controller now ~229 LOC)
- [x] `Players::IndexWorkspaceState` — extracted index filter/urgency/sidebar derivation out of `players_controller.rb`
- [x] `TwoWayUtilityQueries` — extracted SQL/data fetches from `two_way_utility_controller.rb` (controller now ~422 LOC)

**Gate:** Each controller drops below 400 lines. Existing behavior unchanged.

### Phase 2 — Introduce presenters for sidebar/overlay views

- [ ] `PlayerSidebarPresenter` — extract from `_sidebar_player.html.erb` + helper
- [ ] `AgentSidebarPresenter` — extract from `_sidebar_agent.html.erb` + helper
- [ ] `SalaryBookHelper` → split into focused modules

**Gate:** `salary_book_helper.rb` < 200 lines. Sidebar partials < 150 lines each.

### Phase 3 — Add controller smoke tests

- [ ] Set up test fixtures / factory approach
- [ ] Smoke tests for all current controllers/actions

**Gate:** test command passes with coverage of every public action.

### Phase 4 — Flatten namespace for `tools/` first

- [ ] Move `tools/*` internals toward top-level feature namespaces
- [ ] Redesign tool URLs to remove `/tools` prefix where it hurts clarity (no legacy compatibility requirement)
- [ ] Keep Datastar patch boundaries/IDs unchanged

**Gate:** Tool features no longer require `tools/`-specific directory/module boundaries, and URLs reflect final product structure.

### Phase 5 — Flatten namespace for `entities/`

- [ ] Apply the same lift-up pattern used for tools
- [ ] Remove duplicated cross-surface logic introduced by strict split
- [ ] Normalize entity URLs only where it improves correctness/consistency (no compatibility constraints pre-production)

**Gate:** Entity features run from flattened structure with parity and cleaner URL structure.

### Phase 6 — Decompose remaining controllers + view partial cleanup

- [x] Extract query object for drafts (`DraftQueries`)
- [x] Extract query object for transactions (`TransactionQueries`)
- [x] Extract query object for teams (`TeamQueries`)
- [x] Extract query object for agents (`AgentQueries`)
- [x] Extract query object for trades (`TradeQueries`)
- [ ] Break 250+ line partials into sub-partials
- [ ] Establish shared partial library for common row patterns (identity cells, money cells, date cells)

**Gate:** Controllers ≤ 300 lines outside intentional exceptions; large partials decomposed.

---

## What NOT to change

- **Datastar as UI runtime** — no Turbo/Hotwire/Stimulus
- **Server HTML responses** — no JSON API layer
- **SQL-first business logic** — CBA math stays in `pcms.fn_*`
- **Patch boundary IDs** — keep `#commandbar`, `#maincanvas`, `#rightpanel-base`, `#rightpanel-overlay` stable
- **URL quality bar** — prefer clean, final-form URL design over temporary legacy path compatibility
- **SSE controller pattern** — these are already well-structured

---

## Related docs

- `web/REFACTOR.md` — Salary Book "apps can take over" refactor (specific feature)
- `web/AGENTS.md` — hard rules, decision trees, Datastar conventions
- `web/docs/design_guide.md` — visual patterns and shell anatomy
- `web/docs/datastar_sse_playbook.md` — SSE response templates
