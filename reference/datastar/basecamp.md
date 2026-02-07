# Basecamp-style Rails apps with Datastar (spec)

Purpose: capture “portable Basecamp patterns” (from `reference/basecamp/specs/*`) and translate them into a **Datastar-first** UI architecture.

This is a thought experiment + design memo.

**Important:** We do **not** use Turbo/Hotwire/Stimulus in `web/`. Any Hotwire mentions below are comparative context only.

- Basecamp/Fizzy/Campfire posture: **Rails omakase**, server-rendered HTML, small JS, strong request context (`Current`), and real-time UX.
- Datastar posture: **hypermedia-first** + “in morph we trust” + signals for ephemeral UI + SSE for streaming.

If Basecamp had picked Datastar as their client runtime (instead of Turbo Streams/Stimulus-style JS), this is what the resulting patterns would likely look like.

Relevant source notes:
- Basecamp patterns: `reference/basecamp/specs/*`
- Datastar conventions: `reference/datastar/insights.md`, `reference/datastar/rails.md`, `reference/datastar/docs.md`
- SSE framing example: `prototypes/salary-book-react/docs/bun-sse.md`

---

## 1) What stays the same (Basecamp’s server-first “shape”)

Even with Datastar, the highest-leverage Basecamp patterns remain:

- **`Current` request context** (user/account/session/request metadata)
  - Still the backbone for auth, audit logging, and tenancy.
  - See: `reference/basecamp/specs/03-current-authentication-authorization.md`

- **Controller concerns + macros** (`require_authentication`, `allow_unauthenticated_access`, etc.)
  - Datastar doesn’t change Rails composition; it changes how HTML updates flow.

- **Routes stay boring** (REST + namespacing, “action as resource”)
  - Datastar works best when endpoints return HTML fragments with stable IDs.
  - See: `reference/basecamp/specs/04-routes-and-resource-shapes.md`

- **Ops posture**: `bin/setup`, security checks in CI, structured error context
  - SSE adds a few production headers + thread-count concerns, but otherwise same.
  - See: `reference/basecamp/specs/05-ops-jobs-telemetry-deploy.md`

- **“Patch whole sections” philosophy**
  - Basecamp already leans into updating cohesive UI regions (cards/panels).
  - Datastar explicitly rewards this (morphing preserves state).

---

## 2) What changes (Hotwire primitives → Datastar primitives)

Datastar replaces most of the “small JS runtime” that Hotwire/Stimulus provides.

### 2.1 Mapping table

| Basecamp / Hotwire pattern | Datastar equivalent | Notes |
|---|---|---|
| Turbo Frames | Patch stable element IDs (HTML response) | Treat a frame like `#todo_list_123` and patch that region. |
| Turbo Streams (broadcast) | SSE `datastar-patch-elements` events | Unidirectional stream; writes stay HTTP POST/PATCH. |
| Turbo Stream flash | Patch `#flash` via HTML or SSE | Default: return `<div id="flash">…</div>`; for targeted patching use `datastar-selector: #flash` + `datastar-mode`. |
| Stimulus controllers | `data-on:*`, `data-show`, `data-class`, `data-bind`, signals | Keep custom JS only for hard UX edges. |
| ActionCable channels | Persistent SSE streams (CQRS-style) | You’ll need a fanout/backplane; SSE consumes threads. |
| View transitions | `__viewtransition` modifiers and/or `datastar-use-view-transition` | Basecamp already enables view transitions in layouts. |

Key point: Datastar prefers **plain navigation** (`<a href>`) for page-to-page moves and uses Datastar requests for *in-page* interactivity.

---

## 3) Page composition: stable IDs and patch boundaries

Datastar’s happiest path is:

1) server renders HTML with **stable IDs**
2) backend actions fetch updated HTML
3) Datastar morphs patches into the DOM

### 3.1 Recommended “Basecamp shell” IDs

Give every major UI region an ID so the server can patch it without being clever:

- `#flash` — notices/errors
- `#topbar` — account switcher, search, profile
- `#sidebar` — project navigation
- `#content` — main page body
- `#tray` — right-side inspector / details drawer (Basecamp-y)
- `#modal_root` — dialogs

Then adopt a simple rule:

- Small interactions patch a **single region** (`#tray`, a single card, etc.)
- “Commits” patch **`#content`** (and maybe `#sidebar` counts)

### 3.2 Third-party widgets

Same advice as our Datastar notes:

- Mark complex widget roots with `data-ignore-morph`
- Patch around them, not inside them

(See: `reference/datastar/insights.md`.)

---

## 4) Signals: what Basecamp would store client-side

Datastar signals are great for the kind of ephemeral UI state Basecamp often models in Stimulus.

### 4.1 Naming conventions (hard rules)

From `reference/datastar/insights.md`:

- **Global signals are flatcase**: `projectid`, `search`, `cmdkactive`
- **Local-only signals start with `_`**
- **DOM refs must be underscore-prefixed**:
  - `data-ref="_dialog"` → `$_dialog`

### 4.2 Durable vs ephemeral state

Use signals for:

- open/closed state (`trayopen`, `cmdkactive`)
- local selection/highlight (`selectedmessageid`)
- “draft” form input bindings (`newcommentbody`)

Avoid signals for:

- permissions, roles, “can the user do X?”
- authoritative counts
- business objects (projects, todos, messages)

That state should come from the server as HTML.

---

## 5) Backend responses: use the simplest thing first

Datastar behavior is driven by `Content-Type`.

- `text/html` → morph patched elements (best default)
- `application/json` → JSON Merge Patch into signals (use sparingly)
- `text/event-stream` → stream `datastar-patch-elements` / `datastar-patch-signals`

Practical Basecamp-style guideline:

- Prefer `text/html` for single-region CRUD-style patches.
  - For “target + mode” control (without SSE), set Datastar response headers on the backend-action response:
    - `datastar-selector: #tray` (optional; default is morph-by-id)
    - `datastar-mode: inner|outer|replace|append|prepend|before|after|remove`
    - `datastar-use-view-transition: true` (optional)
    - (`datastar-namespace` exists too, but is rarely needed)
- Prefer short-lived SSE (`text/event-stream`) when one interaction must patch **multiple disjoint regions** or apply ordered patch steps.
- Use `application/json` only for true “signal-only” updates. Optional header:
  - `datastar-only-if-missing: true`
- Use long-lived SSE streams for:
  - progress / streaming updates (uploads, exports)
  - live feeds (chat room, notifications)

How to think about patching:

- `text/html` backend-action responses are effectively a one-off `datastar-patch-elements`:
  - response body supplies the `elements`
  - headers (above) supply `selector` / `mode` / `useViewTransition`
- `text/event-stream` does the same thing, but repeatedly.

(See: `reference/datastar/docs.md` for the patch semantics; `reference/datastar/rails.md` + `prototypes/salary-book-react/docs/bun-sse.md` for SSE framing helpers.)

---

## 6) “Basecamp interactions” as Datastar patterns

### 6.1 Create a comment (patch the thread + clear the form)

Basecamp-ish UI:
- comment form at bottom
- new comment appears in list
- flash or inline validation error

Datastar version:

- bind inputs to signals (`newcommentbody`)
- on submit, `@post('/comments')`
- server responds with:
  - HTML patch for `#comments` (whole thread region)
  - signal patch to reset `newcommentbody` (optional)

Why patch whole `#comments`?
- stable
- avoids “append-only drift” when edits/deletes happen

### 6.2 Toggle a to-do (patch the list section)

- click checkbox triggers `@patch('/todos/:id')`
- server returns HTML for `#todo_list_123` (or just `#todo_456` if the row is fully self-contained)

A Basecamp-style principle here:
- use server render to re-derive:
  - completion counts
  - “completed today” groupings
  - permissions

### 6.3 Search (shareable URLs + Datastar as enhancement)

Basecamp frequently treats search as first-class navigation.

Recommended shape:

- canonical query param: `?q=...`
- `data-bind="search"` updates the input
- on input debounce:
  - update the URL (optional; Datastar Pro has `data-query-string`)
  - `@get('/search?q=' + encodeURIComponent($search))`
- server returns HTML patch for `#content`

This keeps:
- no-JS baseline working
- URLs shareable
- Datastar only adds “typeahead-like” speed

---

## 7) Real-time: replacing Turbo Streams / ActionCable with SSE

Basecamp apps use broadcast patterns (Campfire messages, Fizzy board updates).

Datastar alternative:

- **writes**: standard HTTP (`@post`, `@patch`)
- **reads/live updates**: persistent SSE stream(s)

### 7.1 Suggested stream taxonomy

- User stream: `/events` or `/users/:id/events`
  - inbox count
  - notification list
  - “you were mentioned” toasts

- Project stream: `/projects/:id/events`
  - new/edited messages
  - todo changes
  - activity timeline

- Room stream (Campfire): `/rooms/:id/events`
  - append messages into `#room_messages`

Each stream emits `datastar-patch-elements` events targeting stable regions.

### 7.2 Fanout/backplane

SSE is “dumb pipe”; you still need server-side fanout.

Options (in increasing complexity):

1) process-local pub/sub (single node only)
2) Redis pub/sub
3) Postgres LISTEN/NOTIFY
4) DB outbox table + poller (easiest to make reliable + replayable)

Basecamp-ish bias:
- start with the simplest thing that works
- add a backplane once you go multi-node

### 7.3 SSE production hygiene (carry-over from `rails.md`)

- `Cache-Control: no-cache, no-transform`
- `X-Accel-Buffering: no`
- send `retry: 5000` and keepalive comments every ~15s
- stop work on disconnect (`ActionController::Live::ClientDisconnected`)

See: `reference/datastar/rails.md`.

### 7.4 Live stream UX invariants (Basecamp lessons)

Campfire’s Hotwire codebase has small JS helpers to avoid “stream jank” (scroll jumps, edits getting clobbered, response/stream races). Datastar needs the same care; the knobs just move.

Practical rules:

- **Never patch the user’s composer** (message box, comment textarea) from a live stream.
  - Keep it in its own stable region and don’t target it from SSE patches.
  - If needed, protect it with `data-ignore-morph` while focused.

- **Use `append` only for truly append-only timelines** (e.g., chat).
  - Everything else should usually patch the whole list region so edits/deletes stay consistent.

- **Scroll is state.** Track “stick to bottom” as a local signal (e.g. `_sticktobottom`) and only auto-scroll when that’s true.
  - Datastar Pro has `data-scroll-into-view`; otherwise a tiny custom JS helper is fine.

- **Editing takes precedence.** If a row/card is being edited, avoid patching it from the stream.
  - Prefer per-row stable IDs so only changed rows morph.
  - Or temporarily remove the row’s `id` while editing (Campfire uses this trick to unsubscribe from live updates).

---

## 8) Multi-tenancy via `SCRIPT_NAME` + Datastar

Fizzy’s tenancy trick (mount app under `/<account_slug>` by rewriting Rack `SCRIPT_NAME`) is extremely compatible with Datastar.

(See: `reference/basecamp/specs/08-multi-tenancy-script-name.md`.)

Datastar-specific gotcha:

- Any HTML you render **outside** the request cycle (jobs, broadcast workers, stream renderers) must use a renderer configured with the tenant `script_name`, otherwise generated URLs will be wrong.

Basecamp solved this for Turbo Streams by rendering with:

- `ApplicationController.renderer.new(script_name: Current.account.slug)`

Same idea applies when building Datastar SSE patches.

Also carry over the job-context pattern:

- serialize `Current.account` into the job payload
- rehydrate + wrap execution in `Current.with_account(account)`

---

## 9) Security + correctness (signals are params)

Datastar signals are user-controlled input.

Basecamp-ish rules still apply:

- authenticate/authorize every endpoint (including SSE)
- never trust a signal just because it “came from the UI”
- allowlist keys from `params[:datastar]`
- apply the same `rate_limit` macros to sensitive endpoints (login, magic links)

---

## 10) “If we were actually building it” starter checklist

- Layout with stable patch boundaries: `#flash`, `#sidebar`, `#content`, `#tray`
- Adopt flatcase signal naming + underscore refs
- Make CRUD endpoints return `text/html` patches (not JSON)
- Add one persistent SSE stream for notifications first
- Add a second stream for “room/project” live updates only when needed
- Bake in Basecamp ops patterns (`bin/setup`, CI security, error context)

---

## Appendix: where this doc came from

Basecamp extraction docs (this repo):
- `reference/basecamp/specs/03-current-authentication-authorization.md`
- `reference/basecamp/specs/06-ui-hotwire-patterns.md`
- `reference/basecamp/specs/08-multi-tenancy-script-name.md`

Datastar docs (this repo):
- `reference/datastar/insights.md`
- `reference/datastar/rails.md`
- `reference/datastar/docs.md`
- `prototypes/salary-book-react/docs/bun-sse.md`
