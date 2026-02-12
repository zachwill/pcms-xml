# Contract — Salary Book player command palette (v1)

Status: implemented

Scope: global player search (across `pcms.salary_book_warehouse`) opened via `Cmd/Ctrl + K`.

## Patch + DOM contract

Stable IDs:

- `#sbplayercmdk` (palette root/backdrop)
- `#sbplayercb-input`
- `#sbplayercb-loader`
- `#sbplayercb-popup`
- `#sbplayercb-list`
- `#sbplayercb-status`

Search requests patch a **single region**: `#sbplayercb-popup` (`text/html`).

## Signal contract

Local-only signals on `#sbplayercmdk`:

- `$_sbplayercmdkopen`
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

- none

## Endpoint contract

### Search

`GET /tools/salary-book/combobox/players/search`

Params:

- `team` (optional, NBA team code; supported but not used by default palette wiring)
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

- `Cmd/Ctrl + K` opens command palette with backdrop and focuses input.
- Typing dispatches debounced search (120ms).
- IME composition suppresses mid-composition dispatch.
- ArrowUp/ArrowDown moves active option.
- Enter commits active option (or first option if no explicit active index yet).
- Escape closes palette.
- Backdrop click closes palette.
- Option click closes palette and patches `#rightpanel-overlay` via:
  - `GET /tools/salary-book/sidebar/player/:id`
- Selection does **not** switch active team in v1.

## Cancellation guardrail

Search dispatches from dedicated `#sbplayercb-loader` element.
Datastar cancellation remains per-element, so palette search does not collide with team switch SSE requests.
