# Design Evolution Backlog

## Context
Salary Book + Noah are the quality bar. These tasks converge other surfaces toward that standard.
Each task is one iteration of focused work (~10 min). Commit when done.
**Use agent-browser** for visual evidence on every task (see web/docs/agent_browser_playbook.md).

---

## Browser-evidence visual QA — post-interaction-refactor audit

Recent iterations improved overlay lifecycle, severity lanes, and interaction predictability
across all non-Salary-Book surfaces. None of that work used agent-browser for visual verification.
This round fixes that: open each surface, screenshot, diagnose, fix.

- [x] [P1] [AUDIT] /team-summary — browser-verify stepping controls and position chip render
  Files: web/app/views/team_summary/show.html.erb, web/app/views/team_summary/_rightpanel_overlay_team.html.erb, web/app/views/team_summary/_workspace_main.html.erb
  Why: Stepping loop and "x of y" position chip were added code-only; need visual confirmation that stepper layout, focus state, and position badge render correctly across sort contexts.
  Note: Agent-browser baseline/after passes (default + cap-space sort) confirmed step navigation; overlay now renders consistent position chips and adds focus-visible button treatment for prev/next controls.

- [x] [P1] [AUDIT] /trades — browser-verify inline per-team impact map density and truncation
  Files: web/app/views/trades/index.html.erb, web/app/views/trades/_results.html.erb
  Why: Inline impact maps and +N-more chips were added without visual QA; need to verify row scan density isn't broken on 2-team vs 4+ team deals.
  Note: Agent-browser baseline/after passes (`/trades` + `sort=most_teams&lens=mega`) confirmed 2-team scan rows stay compact while 4+ team truncation now uses compact OUT/IN tokens and a narrow `+NT` tail chip with hidden-team tooltip.

- [ ] [P1] [AUDIT] /transactions — browser-verify scan rail and severity lane rendering
  Files: web/app/views/transactions/index.html.erb, web/app/views/transactions/_results.html.erb
  Why: Severity/route scan rail was compressed from a stacked legend; need visual proof that lane headers + row route cue chips read correctly at scan speed.

- [ ] [P1] [AUDIT] /players index — browser-verify triage-sequenced commandbar and urgency badges
  Files: web/app/views/players/index.html.erb, web/app/views/players/_workspace_main.html.erb
  Why: Commandbar was restructured into scope → urgency → drill-in progression; need visual confirmation that grouping and lane badge alignment match the intended triage flow.

- [ ] [P1] [AUDIT] /teams index — browser-verify row-click overlay + active-row highlight sync
  Files: web/app/views/teams/index.html.erb, web/app/views/teams/_pressure_section.html.erb, web/app/javascript/teams_index.js
  Why: Row click → overlay drill-in and data-team-id active-row sync were wired code-only; need to click a row via agent-browser, verify overlay opens, and confirm active-row highlight stays in sync.

- [ ] [P2] [AUDIT] /agents index — browser-verify agency scope controls and overlay pivot flow
  Files: web/app/views/agents/index.html.erb, web/app/views/agents/_commandbar.html.erb, web/app/views/agents/_rightpanel_overlay_agent.html.erb
  Why: Agency scope state and agent↔agency overlay pivots were added; need visual confirmation that scope chips persist through lens changes and overlay back-navigation feels intentional.

- [ ] [P2] [AUDIT] /drafts — browser-verify unified ownership risk legend across all three views
  Files: web/app/views/drafts/index.html.erb, web/app/views/drafts/_results.html.erb
  Why: Shared legend payload was wired in controller; need visual proof that picks, selections, and grid views all render the same risk rubric tiers.

- [ ] [P2] [AUDIT] /draft-selections — browser-verify severity grouping lanes and contested chip styling
  Files: web/app/views/draft_selections/index.html.erb, web/app/views/draft_selections/_workspace_main.html.erb
  Why: Severity lanes (contested deep-chain, with-trade, clean) and focus chips were added; visual verification needed for lane section stickiness and chip readability.

- [ ] [P2] [AUDIT] /system-values — browser-verify section wayfinding tiles and finder state chips
  Files: web/app/views/system_values/show.html.erb, web/app/views/system_values/_commandbar.html.erb
  Why: Section wayfinding tiles and finder hit/cursor state chips were added; need visual proof that on/off toggle states and active section highlighting are scannable.

## Two-Way Utility convergence

Two-Way Utility hasn't been touched in the recent interaction rounds. It needs
the same overlay-lifecycle and density treatment as the other tools.

- [ ] [P1] [TOOL] /two-way-utility — deterministic overlay lifecycle on filter change
  Files: web/app/views/two_way_utility/_rightpanel_overlay_player.html.erb, web/app/views/two_way_utility/show.html.erb, web/app/controllers/two_way_utility_controller.rb
  Why: Same overlay-clear-on-filter pattern applied to every other tool; Two-Way Utility still has stale overlay state after conference/team/risk filter changes.

- [ ] [P2] [TOOL] /two-way-utility — browser-audit row density and compare against Salary Book scan speed
  Files: web/app/views/two_way_utility/_workspace_main.html.erb, web/app/views/two_way_utility/_player_row.html.erb
  Why: Two-Way player rows may have drifted from the dense row grammar; use agent-browser to compare side-by-side with Salary Book row density.

## Entity show pages — wayfinding convergence

Entity show pages (/players/:slug, /teams/:slug, /trades/:id, /transactions/:id) were
not targeted in the recent interaction pass. They need scroll-first wayfinding checks.

- [ ] [P2] [AUDIT] /players/:slug — browser-verify section stack, scrollspy anchors, and pivot density
  Files: web/app/views/players/show.html.erb, web/app/views/players/_sticky_header.html.erb, web/app/views/players/_section_*.html.erb
  Why: Player entity workspace has many sections; need visual proof that sticky header, section anchors, and inline entity pivots (team links, agent links, contract links) are all working.

- [ ] [P2] [AUDIT] /teams/:slug — browser-verify section ordering and cap horizon table scan
  Files: web/app/views/teams/show.html.erb, web/app/views/teams/_sticky_header.html.erb, web/app/views/teams/_section_*.html.erb
  Why: Team entity workspace stacks vitals, roster, cap horizon, draft assets, constraints, activity, two-way, and apron provenance; visual QA needed for section density and table readability.

- [ ] [P3] [AUDIT] /trades/:id — browser-verify trade detail layout and team impact card density
  Files: web/app/views/trades/show.html.erb
  Why: Trade show pages are large (1010 lines ERB); need visual audit to confirm team-by-team impact sections, player detail rows, and exception accounting render at scan speed.

- [ ] [P3] [AUDIT] /transactions/:id — browser-verify transaction detail and ledger entry layout
  Files: web/app/views/transactions/show.html.erb
  Why: Transaction show pages are 737 lines ERB; need visual confirmation that ledger entries, cap exception usage, dead money, and budget snapshots are scannable.

---

## /teams — interaction predictability

- [x] [P1] [INDEX] /teams — unify row click → overlay drill-in behavior
  Files: web/app/views/teams/index.html.erb, web/app/views/teams/_workspace_main.html.erb, web/app/views/teams/_rightpanel_overlay_team.html.erb, web/app/controllers/teams_controller.rb
  Why: Row click should predictably open the team overlay in #rightpanel-overlay, matching Salary Book's click-row-to-sidebar pattern.
  Note: Team rows now use overlay-open as the primary action, and index boot hydrates/clears overlay state from selected_id deterministically.

- [x] [P1] [INDEX] /teams — sync commandbar lane counts with filtered row set
  Files: web/app/views/teams/_commandbar.html.erb, web/app/views/teams/_pressure_section.html.erb, web/app/controllers/teams_controller.rb
  Why: Lane headers and commandbar counts drift from the visible rows after filter changes.
  Note: Commandbar lane counts now derive from the current filtered rows, and section row badges/KPIs render from each section's live row array.

- [x] [P2] [INDEX] /teams — active-row highlight state when overlay is open
  Files: web/app/views/teams/_workspace_main.html.erb, web/app/javascript/teams_index.js
  Why: When a team overlay is open, the source row should show active state so users know where they are.
  Note: Main canvas now mirrors selectedteamid/overlaytype into data attrs, and teams_index.js reapplies active row + sticky-cell highlight after morphs and signal-driven overlay changes.

## Supervisor corrective tasks (2026-02-20)

- [x] [P1] [INDEX] /teams — restore one-click canonical team pivot while preserving row-click overlay primary action
  Files: web/app/views/teams/_pressure_section.html.erb, web/app/views/teams/_rightpanel_base.html.erb
  Why: Recent drill-in unification removed inline canonical pivots, adding friction to entity navigation from scan rows.
  Note: Team-name anchors are back in both main scan rows and pressure-board quick rows, with click propagation stopped so row-click still opens overlay.

- [x] [P2] [INDEX] /teams — replace selector parsing with explicit row ids for active-row sync
  Files: web/app/views/teams/_pressure_section.html.erb, web/app/javascript/teams_index.js
  Why: Parsing team ids from `data-on:click` strings is brittle; row identity should come from stable `data-team-id` attributes.
  Note: Team rows now emit explicit `data-team-id`, and teams_index active-row sync reads that stable attribute instead of parsing click handler strings.

## /players — triage flow

- [x] [P1] [INDEX] /players — reframe commandbar filters around triage sequence
  Files: web/app/views/players/index.html.erb, web/app/views/players/_workspace_main.html.erb, web/app/controllers/players_controller.rb
  Why: Too many controls with no implied ordering; users need scope → urgency → drill-in progression.
  Note: Commandbar now groups controls into explicit 1) Scope, 2) Urgency triage, 3) Drill-in steps, with mirrored sequence summaries in main-canvas header context.

- [x] [P2] [INDEX] /players — align sidebar quick-feed urgency semantics with row badges
  Files: web/app/views/players/_rightpanel_base.html.erb, web/app/views/players/_workspace_main.html.erb
  Why: Sidebar and row sections use different language for the same urgency concepts.
  Note: Workspace + sidebar urgency chips/headers now use the same lane vocabulary as row badges (Urgent decisions, Upcoming pressure, Stable commitments).

- [x] [P2] [INDEX] /players — deterministic overlay clear on filter refresh
  Files: web/app/views/players/_rightpanel_overlay_player.html.erb, web/app/controllers/players_sse_controller.rb
  Why: Overlay should clear when its player leaves the filtered result set.
  Note: Player overlay now self-gates against live `overlaytype` + `selectedplayerid`, so stale sidebar responses stay hidden after filter-driven clear and refresh keeps selection signals canonical.

## /agents + /agencies — directory coherence

- [x] [P1] [INDEX] /agents — make agency scope state visible and persistent
  Files: web/app/views/agents/index.html.erb, web/app/views/agents/_commandbar.html.erb, web/app/controllers/agents_controller.rb
  Why: Mode/scope feels split; users lose track of whether they're scoped to an agency.
  Note: Added explicit Agent scope controls in commandbar, carried scope params through lens pivots/SSE URLs, and rehydrated scope state in agencies mode so scope context stays visible until cleared.

- [x] [P2] [INDEX] /agents — smooth agent↔agency overlay pivots
  Files: web/app/views/agents/_rightpanel_overlay_agent.html.erb, web/app/views/agents/_rightpanel_overlay_agency.html.erb, web/app/controllers/agents_sse_controller.rb
  Why: Overlay pivots between agent and agency detail should preserve context, not feel like a page reset.
  Note: Agent↔agency pivots now carry one-step return context (including SSE refresh), so Back returns to the prior overlay instead of clearing like a reset.

- [x] [P2] [INDEX] /agencies — make posture lanes first-class row actions
  Files: web/app/views/agencies/index.html.erb, web/app/views/agencies/_workspace_main.html.erb, web/app/controllers/agencies_controller.rb
  Why: Posture risk → agent list pivot is too implicit; should be a direct row action.
  Note: Posture chips now act as direct scoped pivots into agents lens (active, live book, inactive+live, restricted, live risk), with row click overlay behavior preserved.

## /team-summary — stepping loop

- [x] [P1] [TOOL] /team-summary — connect sort/filter state to overlay stepping context
  Files: web/app/views/team_summary/show.html.erb, web/app/views/team_summary/_rightpanel_overlay_team.html.erb, web/app/controllers/team_summary_controller.rb
  Why: Stepping through teams in the overlay should respect current sort order so next/prev is predictable.
  Note: Team Summary now uses one shared signal→query builder for refresh/URL sync/overlay stepping, and step SSE re-emits sort/filter signals so next/prev stays anchored to the active list context.

- [x] [P2] [TOOL] /team-summary — show list position in stepping controls
  Files: web/app/views/team_summary/_rightpanel_overlay_team.html.erb, web/app/javascript/team_summary.js
  Why: Users need "3 of 12" context to know where they are in the filtered set.
  Note: Stepping row now has an always-visible center position chip ("x of y"), and team_summary.js re-syncs it from overlay data attributes after Datastar morphs.

## /system-values — metric wayfinding

- [x] [P1] [TOOL] /system-values — tighten section wayfinding and toggle state
  Files: web/app/views/system_values/show.html.erb, web/app/views/system_values/_commandbar.html.erb, web/app/controllers/system_values_controller.rb
  Why: Section toggles and finder state require too much context switching; which sections are on should be obvious.
  Note: Commandbar now has explicit section-wayfinding tiles (on/off + active + go-to), finder hit/cursor state chips, and show/scroll logic now share one server-defined section map.

- [x] [P2] [TOOL] /system-values — stable metric context across refreshes
  Files: web/app/views/system_values/_rightpanel_overlay_metric.html.erb, web/app/views/system_values/_rightpanel_base.html.erb
  Why: Metric drill-in should maintain section/baseline/row identity when year or section toggles change.
  Note: Sidebar base + overlay now keep pinned drill-in context in human-readable chips/labels and preserve canonical links with overlay params through refresh/apply cycles.

## /trades — team impact scan

- [x] [P1] [TOOL] /trades — surface per-team OUT/IN impact in index rows
  Files: web/app/views/trades/index.html.erb, web/app/views/trades/_results.html.erb, web/app/controllers/trades_controller.rb
  Why: Users bounce between row and overlay to understand team impact; enough context should be in the row.
  Note: Trades rows now render the full per-team impact map (OUT/IN + net chip) inline, with scoped team impacts pinned first for faster scan.

- [x] [P2] [TOOL] /trades — sync overlay and row state on filter refresh
  Files: web/app/views/trades/_rightpanel_overlay_trade.html.erb, web/app/controllers/trades_sse_controller.rb
  Why: Overlay should stay consistent (or clear) when filters change the visible row set, and row highlight should always match active overlay trade id.
  Note: Trades overlay now self-gates with `data-show` against live `overlaytype/overlayid`, and both sidebar + SSE overlay renders stamp explicit `overlay_trade_id` so stale responses cannot desync row highlight from visible detail.

## Supervisor corrective tasks (2026-02-20, review pass)

- [x] [P1] [TOOL] /trades — preserve scan density when per-team impact maps run long
  Files: web/app/views/trades/_results.html.erb, web/app/controllers/trades_controller.rb
  Why: Rendering every team impact line can create tall rows on 4+ team deals, slowing side-by-side scan in explorer mode.
  Note: Trades rows now cap inline impact-map lines to two when a deal has 4+ teams and show a compact +N-more chip on the last visible line.

- [x] [P2] [TOOL] /trades — stabilize non-focus team impact ordering after scope pin
  Files: web/app/controllers/trades_controller.rb, web/app/views/trades/_results.html.erb
  Why: After pinning the selected team first, remaining teams should sort deterministically (e.g., by team code) so refreshes do not reshuffle row interpretation.
  Note: Trade scan impact ordering/truncation now lives in controller state prep (focus team pinned, non-focus codes alphabetized), and the row renderer consumes that canonical payload without recomputing order.

## /transactions — severity lanes

- [x] [P1] [TOOL] /transactions — clarify lane severity and route cues
  Files: web/app/views/transactions/index.html.erb, web/app/views/transactions/_results.html.erb, web/app/controllers/transactions_controller.rb
  Why: Lane labels and severity cues require manual parsing; should communicate "what changed and where" instantly.
  Note: Severity filter labels now carry threshold hints, results add a severity+route cue legend with lane-level route mix, and each row route cell now shows explicit inbound/outbound/team-flow cue chips.

- [x] [P2] [TOOL] /transactions — deterministic overlay lifecycle on filter change
  Files: web/app/views/transactions/_rightpanel_overlay_transaction.html.erb, web/app/controllers/transactions_sse_controller.rb
  Why: Same overlay-clear-on-filter pattern needed here.
  Note: Transaction overlay now self-gates on live `overlaytype/overlayid`, and both sidebar + SSE renders stamp explicit overlay ids so stale responses stay hidden after filter-driven clears.

## Supervisor corrective tasks (2026-02-20, review pass 2)

- [x] [P2] [TOOL] /transactions — consolidate route/severity cue derivation into one server-owned payload contract
  Files: web/app/controllers/transactions_controller.rb, web/app/views/transactions/_results.html.erb, web/test/integration/entities_transactions_index_test.rb
  Why: Route cue derivation and severity rubric fallbacks currently exist in both controller and ERB, which risks semantic drift and harder future edits.
  Note: Transactions controller now emits a single `@transaction_results_payload` (lanes, rubrics, route totals, scope label, row route cues), and results ERB consumes that payload without recomputing route/severity semantics.

## /drafts — cross-view consistency

- [x] [P1] [TOOL] /drafts — unify risk/ownership legend across picks, selections, and grid views
  Files: web/app/views/drafts/index.html.erb, web/app/views/drafts/_results.html.erb, web/app/controllers/drafts_controller.rb
  Why: Risk cues use different language across the three views; one legend, one meaning.
  Note: Drafts controller now emits one shared ownership-risk legend payload, and both main results + sidebar base render the same rubric/counted tiers for picks, selections, and grid.

- [x] [P2] [TOOL] /drafts — consistent overlay selection across all three views
  Files: web/app/views/drafts/_rightpanel_overlay_pick.html.erb, web/app/views/drafts/_rightpanel_overlay_selection.html.erb, web/app/controllers/drafts_sse_controller.rb
  Why: Click-to-overlay should behave identically whether in picks, selections, or grid view.
  Note: Overlay requests now carry/stamp canonical overlay keys, pick/selection overlays self-gate with `data-show` against live signals, and SSE refresh re-renders overlays with explicit type/key locals so stale cross-view responses cannot replace active selection context.

## /draft-selections — provenance triage

- [x] [P1] [INDEX] /draft-selections — severity grouping for contested ownership chains
  Files: web/app/views/draft_selections/index.html.erb, web/app/views/draft_selections/_workspace_main.html.erb, web/app/controllers/draft_selections_controller.rb
  Why: Users need to shortlist contested picks fast; severity lanes should separate clean from contested.
  Note: Added server-owned severity lane payload (contested deep-chain, contested with-trade, clean), grouped maincanvas rows into sticky lane sections, and surfaced contested/clean lane counts directly in commandbar context.

- [x] [P2] [INDEX] /draft-selections — overlay persistence tied to visible result set
  Files: web/app/views/draft_selections/_rightpanel_overlay_selection.html.erb, web/app/controllers/draft_selections_sse_controller.rb
  Why: Same overlay-clear pattern; overlay for a hidden row should auto-clear.
  Note: Selection overlay now self-gates with `data-show` against live `overlaytype/overlayid`, and SSE refresh stamps explicit `overlay_selection_id` locals so stale responses stay hidden when the selected row leaves the visible result set.

## Supervisor corrective tasks (2026-02-20, review pass 3)

- [x] [P2] [TOOL] /transactions — compress pre-table cue stack into one scan-first rail
  Files: web/app/views/transactions/_results.html.erb, web/app/controllers/transactions_controller.rb
  Why: Severity/route guidance is currently repeated in both the pre-table summary block and lane headers, creating avoidable vertical tax before first rows in explorer mode.
  Note: Replaced the stacked pre-table legend block with a single horizontal scan rail (scope + severity lane chips + route totals), and removed duplicate lane-header route chips to keep first-row access tighter.

- [x] [P2] [INDEX] /draft-selections — surface active lens focus in commandbar lane context
  Files: web/app/views/draft_selections/index.html.erb, web/app/controllers/draft_selections_controller.rb
  Why: Lane counts are visible, but active lens intent (all vs contested vs deep-contested) is not explicit in commandbar context, reducing wayfinding predictability after filter pivots.
  Note: Commandbar severity lane rail now shows an explicit Focus chip + scope sentence tied to `draftselectionlens` signals, and controller snapshot payload now emits canonical focus label/note copy.
