# UI patterns: Hotwire-first Rails

Goal: extract portable patterns for building fast, modern, server-rendered Rails UIs that still feel “app-like”.

---

## Layout + meta conventions

### Campfire
Source: `campfire.txt` → `app/views/layouts/application.html.erb`

Notables:
- View Transitions enabled:
  - `<meta name="view-transition" content="same-origin">`
- `turbo-prefetch` enabled.
- ActionCable mount path is **script-name aware**:
  - `campfire.txt` → `app/helpers/cable_helper.rb`

### Fizzy
Sources:
- `fizzy.txt` → `app/views/layouts/application.html.erb`
- `fizzy.txt` → `app/views/layouts/shared/_head.html.erb`

Notables:
- Turbo refresh via morph + scroll preservation:
  - `turbo_refreshes_with method: :morph, scroll: :preserve`
- View Transitions enabled by default:
  - `<meta name="view-transition" content="same-origin">` (unless `@disable_view_transition`)
  - `fizzy.txt` → `app/controllers/concerns/view_transitions.rb`
- Uses `data-turbo-permanent="true"` for persistent UI frames (footer trays).
- ActionCable URL meta tag:
  - `fizzy.txt` → `app/helpers/tenanting_helper.rb`

---

## Fizzy: controller-level UX + caching helpers

Sources:
- `fizzy.txt` → `app/controllers/application_controller.rb`
- `fizzy.txt` → `app/controllers/concerns/turbo_flash.rb`
- `fizzy.txt` → `app/controllers/concerns/view_transitions.rb`
- `fizzy.txt` → `app/views/layouts/shared/_head.html.erb`
- `fizzy.txt` → `app/views/layouts/shared/_flash.html.erb`
- `fizzy.txt` → `app/views/boards/entropies/update.turbo_stream.erb` (example `turbo_stream_flash` usage)

Patterns:
- **Turbo Stream flash updates**: render the flash in a `turbo_frame_tag :flash`, then update it from stream responses with `turbo_stream_flash(notice: "...")`.
- **View transition guard**: disables view transitions when the browser is doing a hard refresh of the same URL (`request.referrer == request.url`). Marked “FIXME: Upstream this fix to turbo-rails”.
- **Cache busting for importmap**: `stale_when_importmap_changes` in `ApplicationController` so HTTP caches invalidate when pinned JS changes (paired with a manual `etag { "v1" }` version).

---

## Turbo Streams + broadcasting patterns

### Campfire: model-driven broadcast helpers
Source: `campfire.txt` → `app/models/message/broadcasts.rb`
- `Message#broadcast_create` appends to the room stream and also sends an ActionCable broadcast (`unread_rooms`).

In controllers:
- `campfire.txt` → `app/controllers/messages_controller.rb`
  - `broadcast_replace_to ... partial: "messages/presentation" ... attributes: { maintain_scroll: true }`
- `campfire.txt` → `app/controllers/messages/boosts_controller.rb`
  - `broadcast_append_to ... attributes: { maintain_scroll: true }`

### Maintaining scroll on stream updates
Source: `campfire.txt` → `app/javascript/controllers/maintain_scroll_controller.js`
- Hooks `turbo:before-stream-render` and uses a `maintain_scroll` attribute on the stream element to decide when to preserve scroll.

### Avoiding stream/response race jank
Source: `campfire.txt` → `app/javascript/controllers/turbo_streaming_controller.js`
- Removes the container’s `id` to unsubscribe it from streaming updates during a form submit.

---

## Multi-tenant Turbo streams (Fizzy)

Source: `fizzy.txt` → `config/initializers/tenanting/turbo.rb`

Problem:
- When you mount the app under `/<account_slug>`, Turbo Streams need to render using that same `script_name`.

Solution:
- Patch `Turbo::StreamsChannel.render_format` to use:
  - `ApplicationController.renderer.new(script_name: Current.account.slug)`

---

## Stimulus organization

Both apps:
- `controllers/index.js` eager-loads controllers from importmap:
  - `eagerLoadControllersFrom("controllers", application)`
- Rely on importmap pinning to avoid a bundler.

---

## Rich text + sanitization

### Campfire
- Uses ActionText + Trix.
- Adds custom ActionText filters (sanitize + unfurl tweaks):
  - `campfire.txt` → `app/helpers/content_filters/*.rb`

### Fizzy
- Uses ActionText, but with Lexxy + prompts:
  - `fizzy.txt` → `app/helpers/rich_text_helper.rb`
- Extends sanitization whitelist:
  - `fizzy.txt` → `config/initializers/sanitization.rb`
- Customizes ActionText embeds/variants:
  - `fizzy.txt` → `config/initializers/action_text.rb`

---

## What we should steal for our app

- Layout-level defaults:
  - view transitions
  - turbo morph refresh + scroll preservation
  - action-cable-url meta tag that respects `script_name`

- Turbo Streams usage patterns:
  - broadcast helpers on models
  - `maintain_scroll` as an explicit contract

- A small set of Stimulus controllers to preserve UX invariants (scroll stability, keyboard shortcuts, etc.)

And for replacing `web/`:
- keep “scroll is state” and “sidebar overlay” ideas, but implement incrementally with Turbo + Stimulus first.
