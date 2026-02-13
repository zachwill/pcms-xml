# Design Evolution Backlog (`web/`)

North star:
- Entity index pages should behave like explorer workbenches (Salary Book-like interaction grammar, not clones).
- Fast scan, meaningful filters/knobs, dense interactive rows, and sidebar drill-ins.
- Canonical shell: `#commandbar` + `#maincanvas` + `#rightpanel-base` + `#rightpanel-overlay`.
- Salary Book is read-only and remains the interaction quality bar.
- Team Summary, System Values, and Two-Way Utility should continue converging toward stronger workbench UX.

Rubric (1-5):
1) Scan speed
2) Information hierarchy
3) Interaction predictability
4) Density/readability balance
5) Navigation/pivots

Audit reset — 2026-02-13:
- Completed tasks were reviewed and remain shipped.
- No new regressions found in Datastar patch-boundary/SSE contract on audited surfaces.
- Remaining work is flow-level parity/trust polish (not class-only churn).
- This file is reset to only actionable unchecked design tasks.

- [x] [P1] [TOOL] /tools/system-values — make Rookie Scale drill-ins metric-cell specific
  - What changed (files):
    - web/app/views/tools/system_values/_rookie_scale_amounts_table.html.erb
      - Converted Rookie drill-ins from row-level default (`salary_year_1`) to per-metric cell actions for all six rookie metrics.
      - Added metric-specific active-cell styling (while preserving row-level context highlight) so clicked context is unambiguous.
    - web/app/views/tools/system_values/_rightpanel_overlay_metric.html.erb
      - Highlighted the active metric inside “Pick scale detail” to mirror the clicked Rookie cell.
    - web/app/views/tools/system_values/_rightpanel_base.html.erb
      - Updated sidebar helper copy to match new interaction grammar (Rookie now metric-cell drill-in).
    - web/test/integration/tools_system_values_test.rb
      - Expanded wiring assertions to cover multiple rookie metric targets.
      - Updated rookie overlay and SSE preserve assertions to validate non-default rookie metrics are retained.
  - Why this improves the flow:
    - Users can now open the exact rookie metric they are scanning (Option Y3/Y4 and option-% included) in one click.
    - Active state now communicates both the focused row and the exact focused metric cell, reducing ambiguity and backtracking.
    - Overlay metric state persists through `/tools/system-values/sse/refresh` for non-default rookie metrics, preserving context during baseline/range changes.
  - Rubric (before → after):
    - Scan speed: 5 → 5
    - Information hierarchy: 5 → 5
    - Interaction predictability: 4 → 5
    - Density/readability: 4 → 4
    - Navigation/pivots: 5 → 5
  - Follow-up tasks discovered:
    - Consider matching this metric-cell focus cue style on other multi-metric detail tables where row-level drill-ins still mask exact metric origin.

- [x] [P1] [INDEX] /agencies — define restriction composition where posture controls are used
  - What changed (files):
    - web/app/views/entities/agencies/index.html.erb
      - Added explicit posture helper definition text: `Restrictions: no-trade + trade kicker + trade-restricted`.
      - Kept existing year-aware threshold copy for `Inactive + live` and `Live risk` unchanged in behavior.
    - web/app/views/entities/agencies/_rightpanel_base.html.erb
      - Mirrored the same restrictions definition text in the sidebar snapshot helper box.
      - Preserved the same year-aware threshold grammar used in the commandbar.
    - web/test/integration/entities_agencies_index_test.rb
      - Extended the index shell assertion to verify both threshold copy and restrictions-composition copy appear in both regions.
  - Why this improves the flow:
    - Posture controls now define exactly what `restrictions` means at the point of filtering, removing guesswork.
    - Commandbar and sidebar now share one posture grammar, improving trust when users scan and then validate context in the right panel.
    - Year-aware threshold language remains intact, so users still understand the active Book-year condition while gaining composition clarity.
  - Rubric (before → after):
    - Scan speed: 5 → 5
    - Information hierarchy: 5 → 5
    - Interaction predictability: 4 → 5
    - Density/readability: 4 → 4
    - Navigation/pivots: 5 → 5
  - Follow-up tasks discovered:
    - Consider reusing this exact restrictions-definition line in `/agents` and overlay-level agency summaries for posture-language parity.

- [x] [P1] [INDEX] /teams — add compare pin/unpin controls in overlay header for parity
  - What changed (files):
    - web/app/views/entities/teams/_rightpanel_overlay_team.html.erb
      - Added overlay-level compare actions directly in the team identity header block: Pin A, Pin B, Clear A, and Clear B.
      - Wired overlay controls to the same `/teams/sse/refresh` compare action path used by row controls (`pin` and `clear_slot`).
      - Added active-slot visual states driven by `$comparea` / `$compareb` and conditional Clear A / Clear B affordances.
      - Ensured compare actions keep overlay context by always sending `selected_id` for the currently open overlay team.
    - web/test/integration/entities_teams_index_test.rb
      - Expanded overlay endpoint assertions to verify Pin A / Pin B and Clear slot control wiring in the teams overlay payload.
  - Why this improves the flow:
    - Compare workflows now continue inside drill-in mode without forcing users back to row-level controls.
    - Overlay triage keeps context while pinning/unpinning, reducing mode-switch friction and preserving wayfinding continuity.
    - Active-slot button states and conditional clear affordances make compare slot ownership explicit at the point of decision.
  - Rubric (before → after):
    - Scan speed: 5 → 5
    - Information hierarchy: 5 → 5
    - Interaction predictability: 4 → 5
    - Density/readability: 5 → 5
    - Navigation/pivots: 5 → 5
  - Follow-up tasks discovered:
    - Investigate and stabilize broader teams-index integration suite setup (asset/test-env drift surfaced during full-file test run), while keeping this overlay flow coverage focused and passing.

- [ ] [P2] [INDEX] /agents — improve agency-overlay tie-back in agent directory rows
  - Problem: Opening an agency overlay from the agents directory does not strongly tie back to all affected agent rows, weakening scan context.
  - Hypothesis: Agency-context tie-back cues in the row list will reduce disorientation during agent⇄agency pivot loops.
  - Scope (files):
    - web/app/views/entities/agents/_workspace_main.html.erb
    - web/test/integration/entities_agents_index_test.rb
  - Acceptance criteria:
    - When an agency overlay is active, agent rows represented by that agency show a clear but lightweight tie-back cue.
    - Existing agent-row selected highlighting behavior remains intact.
    - No extra requests are introduced; behavior remains in current `/agents/sse/refresh` interaction model.
  - Rubric (before → target):
    - Scan speed: 5 → 5
    - Information hierarchy: 5 → 5
    - Interaction predictability: 4 → 5
    - Density/readability: 4 → 4
    - Navigation/pivots: 5 → 5
  - Guardrails:
    - Do not modify Salary Book files.

- [ ] [P2] [INDEX] /players — surface “why matched” emphasis for active constraint lens
  - Problem: Constraint chips are present, but active lens reason is not visually prioritized, making filtered states less self-explanatory.
  - Hypothesis: Lens-matched chip emphasis will improve trust and reduce second-guessing when scanning filtered player lists.
  - Scope (files):
    - web/app/views/entities/players/_workspace_main.html.erb
    - web/app/views/entities/players/_rightpanel_base.html.erb
    - web/test/integration/entities_players_index_test.rb
  - Acceptance criteria:
    - Active constraint lens has a clear in-row match emphasis without increasing row height.
    - Sidebar quick/snapshot modules use the same lens explanation language.
    - No business logic is moved to JS; emphasis is rendered from existing server state.
  - Rubric (before → target):
    - Scan speed: 5 → 5
    - Information hierarchy: 5 → 5
    - Interaction predictability: 4 → 5
    - Density/readability: 5 → 5
    - Navigation/pivots: 5 → 5
  - Guardrails:
    - Do not modify Salary Book files.

- [ ] [P2] [INDEX] /transactions — show intent-search match provenance in rows
  - Problem: Intent search filters rows, but users can’t quickly tell whether the match came from player name, team, transaction type, or description.
  - Hypothesis: Match-provenance cues in row secondary lines will improve trust and reduce re-scanning.
  - Scope (files):
    - web/app/controllers/entities/transactions_controller.rb
    - web/app/views/entities/transactions/_results.html.erb
    - web/test/integration/entities_pane_endpoints_test.rb
  - Acceptance criteria:
    - Intent-filtered rows display a concise match provenance cue.
    - Cue is compact and compatible with existing dense row layout.
    - Overlay preserve/clear behavior under query changes remains unchanged.
  - Rubric (before → target):
    - Scan speed: 5 → 5
    - Information hierarchy: 4 → 5
    - Interaction predictability: 5 → 5
    - Density/readability: 4 → 4
    - Navigation/pivots: 5 → 5
  - Guardrails:
    - Do not modify Salary Book files.

- [ ] [P2] [TOOL] /tools/two-way-utility — strengthen compare-card risk explanations
  - Problem: Compare board shows deltas, but “why risky” context (hard limit vs estimated limit, threshold posture) is still implicit.
  - Hypothesis: Compact risk-source annotations in compare cards will improve decision confidence without extra drill-ins.
  - Scope (files):
    - web/app/views/tools/two_way_utility/_rightpanel_base.html.erb
    - web/test/integration/tools_two_way_utility_test.rb
  - Acceptance criteria:
    - Compare cards surface concise risk-source context for each pinned player.
    - Delta module language reflects whether signals are estimate-based or hard-limit based.
    - Existing compare actions (`pin`, `clear_slot`, `clear_all`) and overlay preserve behavior remain unchanged.
  - Rubric (before → target):
    - Scan speed: 5 → 5
    - Information hierarchy: 5 → 5
    - Interaction predictability: 5 → 5
    - Density/readability: 5 → 5
    - Navigation/pivots: 5 → 5
  - Guardrails:
    - Do not modify Salary Book files.

- [ ] [P3] [TOOL] /tools/system-values — add tax-bracket step interpretation notes in overlay
  - Problem: Tax bracket overlays show values/deltas but not a quick reminder of incremental step interpretation for first-pass readers.
  - Hypothesis: A compact overlay note for tax-step interpretation will improve readability/trust without changing data density.
  - Scope (files):
    - web/app/views/tools/system_values/_rightpanel_overlay_metric.html.erb
    - web/test/integration/tools_system_values_test.rb
  - Acceptance criteria:
    - Tax-section overlays include concise, non-intrusive interpretation copy specific to bracketed tax rates.
    - Note appears only for tax overlays (not system/minimum/rookie).
    - Existing selected-vs-baseline and focused-row context remains unchanged.
  - Rubric (before → target):
    - Scan speed: 5 → 5
    - Information hierarchy: 5 → 5
    - Interaction predictability: 5 → 5
    - Density/readability: 4 → 4
    - Navigation/pivots: 5 → 5
  - Guardrails:
    - Do not modify Salary Book files.
