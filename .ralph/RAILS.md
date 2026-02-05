# Rails + Datastar Salary Book - Backlog

Goal: port the Bun + React prototype (`prototypes/salary-book-react/`) to Rails + Datastar (`web/`).

Tool URL: `/tools/salary-book`

---

## Context for the coding agent

**Mindset**: Internal tool for ~50 users. Ship fast, refactor later.

**Reference docs** (read before coding):
- `web/AGENTS.md` - Rails app conventions
- `web/specs/01-salary-book.md` - interaction + layout spec
- `reference/datastar/` - Datastar conventions (start with `AGENTS.md`)
- `prototypes/salary-book-react/` - markup/UX reference

**Datastar conventions**:
- Signals are flatcase: `activeteam`, `overlaytype`, `displaycapholds`
- DOM refs are underscore-prefixed: `data-ref="_dialog"`
- Patch stable regions by ID: `#commandbar`, `#maincanvas`, `#rightpanel-base`, `#rightpanel-overlay`, `#teamsection-<TEAM>`
- Response types: `text/html` (default), `application/json` (signal-only), `text/event-stream` (SSE)

**Tailwind conventions** (utility-first in ERB):
- We use `tailwindcss-rails` (compiled), NOT the CDN
- Heavily lean toward utility classes in `.html.erb` partials (avoid custom CSS classes unless needed for Datastar `data-class`, animations, etc.)
- Standard column widths:
  - `w-52` — sticky label column (player name, subsection labels)
  - `w-24` — year cells, total column
  - `w-40` — agent column
- Sticky columns: use `sticky left-0 z-[N]` + `after:` pseudo-element for right border
- Row hover: use `group` on parent + `group-hover:` on children
- Dark mode: include `dark:` variants for backgrounds, text, borders
- Player row height: `h-[40px]` (two 24px + 16px sub-rows)
- Subsection row height: `h-8`
- Font sizes: `text-[14px]` names, `text-[12px]` subsection titles, `text-[10px]` metadata/badges, `text-xs` general small text
- Monospace numbers: `font-mono tabular-nums`

**Hard rules**:
- Do NOT re-implement cap/trade/CBA math in Ruby - use `pcms.*` warehouses + `fn_*`
- Keep tool endpoints under `/tools/salary-book/*`
- Custom JS only when Datastar + CSS can't do it

---

## Tailwind port status

Tailwind port is complete (prototype-style utilities in ERB).

- Tailwind is compiled via `tailwindcss-rails` into `web/app/assets/builds/tailwind.css`.
- The layout loads **only** `stylesheet_link_tag "tailwind"`.
- Global tokens + the small amount of selector-driven CSS live in `web/app/assets/tailwind/application.css`.
- Legacy `web/app/assets/stylesheets/application.css` has been removed.

Salary Book partials ported:
- [x] `show.html.erb` (shell + command bar + tiny JS runtime)
- [x] `_team_section.html.erb`
- [x] `_table_header.html.erb`
- [x] `_player_row.html.erb`
- [x] `_cap_holds_section.html.erb`
- [x] `_exceptions_section.html.erb`
- [x] `_dead_money_section.html.erb`
- [x] `_draft_assets_section.html.erb`
- [x] `_totals_footer.html.erb`
- [x] `_sidebar_team.html.erb`
- [x] `_sidebar_player.html.erb`
- [x] `_sidebar_agent.html.erb`
- [x] `_sidebar_pick.html.erb`
- [x] `_kpi_cell.html.erb`
- [x] `_placeholder_section_row.html.erb`

---

## Backlog

- [ ] Visual QA pass vs prototype (scroll spy + overlay layering + table scroll sync)

---

## Later (after parity)

NOTE: BrickLink-style **entity pages** now have their own backlog + agent:
- Backlog: `.ralph/ENTITIES.md`
- Agent loop: `bun agents/entities.ts`

- [ ] Fragment caching for team sections keyed by `warehouse.refreshed_at`
- [ ] SSE - only if streaming/progress adds real product value
- [ ] Remove/guard debug-only panels (signals + SSE demo) before shipping

---

## Done

- [x] Extract inline Salary Book JS into `app/javascript/tools/salary_book.js`
  - Set up importmap-rails (config/importmap.rb)
  - Created `app/javascript/application.js` (entry point)
  - Created `app/javascript/tools/salary_book.js` (scroll-spy + scroll-sync)
  - Layout now uses `javascript_importmap_tags` + `yield :head_scripts`
  - View uses `content_for :head_scripts` to import the module per-page

- [x] Filter Toggles parity (Financials + Contracts)
  - Added signals: `displaytaxaprons`, `displaycashvscap`, `displayluxurytax`, `displayoptions`, `displayincentives`, `displaytwoway`
  - UI: Financials + Contracts filter groups in command bar
  - Wired `data-show="$displaytaxaprons"` on Tax/Apron KPIs (team header + totals footer)
  - Wired `data-show="$displaytwoway"` on two-way player rows

- [x] Tailwind migration: switched from CDN to `tailwindcss-rails` (compiled)
  - Layout now uses `stylesheet_link_tag "tailwind"`
  - Config in `tailwind.config.js` (not inline script)

- [x] Port core partials to Tailwind utilities
  - `_table_header.html.erb`, `_player_row.html.erb`
  - `_cap_holds_section.html.erb`, `_dead_money_section.html.erb`, `_exceptions_section.html.erb`
  - `show.html.erb` (commandbar, viewport, filters)

- [x] Add Pick overlay endpoint (v1 scaffold + wire click)
  - Route: `GET /tools/salary-book/sidebar/pick?team=:code&year=:year&round=:round` → patches `#rightpanel-overlay`
  - Data: `pcms.draft_pick_summary_assets` (with `endnote_explanation` when present)
  - View: `_sidebar_pick.html.erb` (single stable root: `<div id="rightpanel-overlay">…</div>`)
  - Wired pick pills in `_draft_assets_section.html.erb` via `@get()`

- [x] Add Agent overlay endpoint (v1 scaffold + wire click)
  - Route: `GET /tools/salary-book/sidebar/agent/:id` → patches `#rightpanel-overlay`
  - New partial: `_sidebar_agent.html.erb` (agent header + client roster)
  - Wired agent clicks in `_player_row.html.erb` and `_sidebar_player.html.erb`

- [x] Unify displayed year horizon across table + sub-sections + totals footer
  - Canonical horizon is now **2025–2030** everywhere (table, sub-sections, totals footer).
  - Removed the old subsection-year split; all views use `SALARY_YEARS`.
  - Updated controller SQL pivots (cap_holds, exceptions, dead_money) to include 2030.

- [x] Team section parity: Team Header KPIs + Totals Footer
  - Bulk fetch `pcms.team_salary_warehouse` across the displayed years (don't recompute totals in Ruby).
  - `GET /tools/salary-book/teams/:teamcode/section` renders the full team section (header + players + sub-sections + totals footer).

- [x] Expand team sidebar context (`#rightpanel-base`) to match spec
  - KPI cards + lightweight tabs (Cap Outlook / Team Stats placeholder)
  - Base panel patchable by stable ID (`#rightpanel-base`)

- [x] Expand Player overlay (`#rightpanel-overlay`) to match spec
  - Contract breakdown by year, guarantee structure, options, trade kicker / restrictions
  - Back behaves correctly (returns to current viewport team)

- [x] CSS variables + design tokens in `web/app/assets/tailwind/application.css`
- [x] Tool route: `GET /tools/salary-book`
- [x] Port the real Salary Book table layout (double-row players, years 2025-2030)
- [x] Implement iOS Contacts sticky headers (CSS)
- [x] Fragment endpoints exist (team section, team sidebar, player overlay)
- [x] Scroll spy (v1) → `salarybook-activeteam` CustomEvent → Datastar updates `$activeteam` → sidebar patch loop
- [x] Port the Team Selector Grid to the command bar
- [x] Add Filter Toggles UI (Display group; client-only lenses)
- [x] Filter toggle UX: preserve context after layout changes
  - When toggles hide/show sections, rebuild scroll-spy cache and snap back to current `$activeteam` so the user doesn't "jump teams".
  - Exposed `window.__salaryBookRebuildCache()` and `window.__salaryBookPreserveContext()` from scroll-spy script
  - Filter checkboxes call `__salaryBookPreserveContext()` on change
- [x] Player rows patch overlay on click + keyboard
- [x] Render team sub-sections in the main canvas (toggle-controlled)
  - Cap Holds (`pcms.cap_holds_warehouse`)
  - Exceptions (`pcms.exceptions_warehouse`)
  - Dead Money (`pcms.dead_money_warehouse`)
  - Draft Assets row + pick pills (`pcms.draft_pick_summary_assets`)
  - Bulk fetch per warehouse to avoid N+1
