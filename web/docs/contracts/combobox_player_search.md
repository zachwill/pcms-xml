# Contract — Salary Book player combobox (v1)

Status: implemented

Scope: team-scoped player search in Salary Book command bar.

## Patch + DOM contract

Stable IDs:

- `#sbplayercb-root`
- `#sbplayercb-input`
- `#sbplayercb-loader`
- `#sbplayercb-popup`
- `#sbplayercb-list`
- `#sbplayercb-status`

Search requests patch a **single region**: `#sbplayercb-popup` (`text/html`).

## Signal contract

Local-only signals on `#sbplayercb-root`:

- `$_sbplayercbopen`
- `$_sbplayercbquery`
- `$_sbplayercbactiveindex`
- `$_sbplayercbloading`
- `$_sbplayercbcomposing`
- `$_sbplayercbrequestseq`
- `$_sbplayercblastdispatchedseq`
- `$_sbplayercbechoseq`
- `$_sbplayercbresultscount`

Global signal dependency:

- `$activeteam` (search scope)

## Endpoint contract

### Search

`GET /tools/salary-book/combobox/players/search`

Params:

- `team` (optional, NBA team code)
- `q` (query string)
- `limit` (max 50; defaults to 12)
- `seq` (client request sequence echo)

Response:

- `text/html`
- renders `tools/salary_book/_combobox_players_popup`

Ranking:

1. prefix match (`player_name` starts with query)
2. token prefix match (`" <query>"`)
3. infix contains
4. tie-break: `cap_2025 DESC`, then `player_name ASC`, `player_id ASC`

## Interaction contract (v1)

- Focus input opens popup and dispatches search.
- Typing dispatches debounced search (120ms).
- IME composition suppresses mid-composition dispatch.
- ArrowUp/ArrowDown moves active option.
- Enter commits active option.
- Escape closes popup; second Escape clears query.
- Tab closes popup.
- Option click patches `#rightpanel-overlay` via existing endpoint:
  - `GET /tools/salary-book/sidebar/player/:id`

## Cancellation guardrail

Search dispatches from dedicated `#sbplayercb-loader` element.
Datastar cancellation remains per-element, so combobox search does not share cancellation with team switch SSE requests.

## Future hooks

- `Cmd/Ctrl + K` focuses `#sbplayercb-input` (shared JS glue in `app/javascript/shared/combobox.js`).
- Multi-region commit (`team switch + overlay`) can be added as SSE endpoint in a later phase.
