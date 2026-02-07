# Patch boundaries (web)

Stable IDs are the patch contract.

## Salary Book boundaries

- `#commandbar`
  - Top controls + nav chrome.
- `#maincanvas`
  - Main scroll container for team sections.
- `#<TEAM_CODE>` (e.g. `#BOS`)
  - Per-team section boundary.
- `#rightpanel-base`
  - Team/system context underlay.
- `#rightpanel-overlay`
  - Entity overlay layer.
- `#flash`
  - Global message region.

## Guidance

- Prefer section-level patches, not tiny leaf patches.
- Keep IDs stable across refactors.
- If interaction patches multiple boundaries, use one-off SSE.
- Protect third-party-managed DOM with `data-ignore-morph`.

## Ownership map

- Salary Book shell: `web/app/views/tools/salary_book/show.html.erb`
- Team section partials: `web/app/views/tools/salary_book/_team_section.html.erb`
- Sidebar partials: `web/app/views/tools/salary_book/_sidebar_*.html.erb`
- SSE template controller: `web/app/controllers/tools/salary_book_sse_controller.rb`
