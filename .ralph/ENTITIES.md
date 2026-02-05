# Rails Entity Explorer (BrickLink-style) — Backlog

Goal: build **link-rich entity pages** in the Rails app (`web/`) so we can explore PCMS/NBA entities like a catalog (BrickLink-style), *alongside* dense tools like Salary Book.

This backlog is intentionally separate from `.ralph/RAILS.md` (Salary Book tool parity).

Primary principles (see `web/specs/00-ui-philosophy.md` + `reference/sites/bricklink.txt`):
- **Everything is linkable** (players ↔ teams ↔ agents ↔ picks ↔ seasons)
- **Data density is good** (tables, tabs, filters)
- **Progressive enhancement**: pages work without JS; Datastar enhances in-page UX

---

## Context for the coding agent

**References (read before coding):**
- `web/AGENTS.md` — canonical Rails + Datastar posture + URL rules
- `reference/sites/bricklink.txt` — information architecture inspiration
- `reference/datastar/basecamp.md` — Rails-first patterns translated to Datastar
- `reference/datastar/insights.md` — signal naming + patching rules (if you add Datastar)

**Hard rules / guardrails**
- Canonical entity routes are **slug-only** (ex: `/teams/bos`, `/agents/rich-paul`).
- Keep a numeric fallback for migration/debug (ex: `/teams/1610612738` → 301 → canonical slug).
- Slugs are managed via `Slug` model/table (aliases allowed; one canonical per entity).
- **Postgres is the product**: read from `pcms.*` warehouses/tables; don’t re-implement cap/CBA logic in Ruby.
- Prefer simple HTML-first pages. Use Datastar only where it clearly improves UX (tabs, in-page filters).

---

## Backlog (ordered)

### Teams

- [ ] Add Teams entity routes + controller (canonical + numeric fallback)
  - Routes:
    - `GET /teams/:slug` → `Entities::TeamsController#show`
    - `GET /teams/:id` (numeric) → `#redirect` (301 → canonical; create default slug on-demand)
  - Slug registry:
    - `Slug.entity_type = 'team'`
    - `Slug.entity_id = pcms.teams.team_id`
    - Default slug should be `team_code.downcase` (ex: `BOS` → `bos`).
  - Data source: `pcms.teams` (NBA only).
  - View: `web/app/views/entities/teams/show.html.erb`
    - Hero: team name, team code, conference/division.
    - Action link: `/tools/salary-book?team=BOS`.
    - “Known slugs” list (like the player page).

- [ ] Add `/teams` index page (conference-grouped)
  - Route: `GET /teams` → `Entities::TeamsController#index`.
  - Query `pcms.teams` and group into Eastern/Western like Salary Book.
  - Links can use numeric fallback (`/teams/:id`) until canonical slugs exist.

### Agents

- [ ] Add Agents entity routes + controller (canonical + numeric fallback)
  - Routes:
    - `GET /agents/:slug` → `Entities::AgentsController#show`
    - `GET /agents/:id` (numeric) → `#redirect` (301 → canonical; create default slug on-demand)
  - Slug registry:
    - `Slug.entity_type = 'agent'`
    - `Slug.entity_id = pcms.agents.agent_id`
    - Default slug: parameterized agent name, fallback `agent-<id>`.
  - Data sources:
    - `pcms.agents` (identity + agency fields if present)
    - `pcms.salary_book_warehouse` (client list via `agent_id`)
  - View: `web/app/views/entities/agents/show.html.erb`
    - Hero: agent name, agency.
    - Client list: group by current team (`team_code`), show counts + cap totals (2025).
    - Cross-links:
      - players → `/players/:id` fallback (301 will create canonical slug)
      - teams → `/teams/:id` fallback

- [ ] Add `/agents` index page with simple search
  - Route: `GET /agents` → `Entities::AgentsController#index`.
  - Query param: `?q=` (case-insensitive match on agent name).
  - Show result list with links (numeric fallback ok).

### Link helpers (reduce redirects, keep pages link-rich)

- [ ] Add helper(s) to generate canonical entity hrefs when available
  - New helper: `web/app/helpers/entity_links_helper.rb` (or similar).
  - For each entity type, return canonical slug path if a canonical `Slug` exists; else return numeric fallback path.
  - Use helper in team/agent pages (and later in Salary Book tool views).

### Upgrade existing Player page toward “explorable”

- [ ] Expand Player entity page (v1) to be link-rich (not just slug debug)
  - Pull a minimal contract snapshot from `pcms.salary_book_warehouse` for this player:
    - current `team_code`, `agent_id`, `agent_name`, `cap_2025..cap_2030`.
  - Add cross-links:
    - team → `/teams/:id` fallback
    - agent → `/agents/:id` fallback
  - Keep “Known slugs” section (still useful).

---

## Later (after teams/agents basics)

- [ ] Decide Pick canonical URL shape (query params vs encoded composite id) and add `/picks/...` page
- [ ] Add breadcrumb primitives + tabbed entity pages (BrickLink-style “Items / Price Guide / Inventory” analogs)
- [ ] Add global scoped search (players/teams/agents) with shareable URLs
- [ ] Add caching for entity submodules keyed by warehouse `refreshed_at`

---

## Done

(Empty — move completed items here as we go.)
