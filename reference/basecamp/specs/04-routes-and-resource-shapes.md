# Routes + resource shapes

Goal: learn how these apps structure URLs, namespaces, and REST resources in a way that stays coherent as the app grows.

---

## Campfire
Source: `campfire.txt` → `config/routes.rb`

Patterns worth copying:

### Domain grouping
- Keeps top-level resource count small:
  - sessions, account, rooms/messages, searches, PWA

### “Action as resource” style
- Bot message ingestion is treated as a nested endpoint:
  - `post ":bot_key/messages", to: "messages/by_bots#create"`

### Per-user default scoping
- Uses route defaults to express "me":
  - `scope defaults: { user_id: "me" } do ... end`

### `direct` helpers for cache-busting assets
- Example:
  - `direct :fresh_user_avatar do |user, options| ... v: user.updated_at.to_fs(:number) ... end`

### Nice UX routes
- Message anchor inside rooms:
  - `get "@:message_id", to: "rooms#show"`

### PWA + health endpoints
- `webmanifest` + `service-worker`
- `up` health check

---

## Fizzy
Source: `fizzy.txt` → `config/routes.rb`

Patterns worth copying:

### Deep namespacing without custom member routes
- Heavy use of:
  - `namespace` + `scope module:`
  - singleton `resource` controllers (instead of `member do ...`)

### Public vs private partition
- A dedicated `namespace :public` with its own resources.

### `direct` helpers + `resolve` blocks
- `direct :published_board` / `direct :published_card` for public-sharing URLs.
- `resolve` customizes polymorphic URLs for:
  - `Comment` (anchor to comment DOM id)
  - `Mention`, `Notification`, `Event`, `Webhook`

### Legacy URL support
- Uses redirect blocks that preserve tenant prefix via `request.script_name`.

### Admin mounts
- Mounts `MissionControl::Jobs::Engine` under `/admin/jobs`.

---

## What this suggests for our app

For a Rails UI on top of Postgres warehouses:
- Keep top-level resources small:
  - teams, players, contracts, picks, transactions, scenarios, exports
- Prefer “action as nested resource/controller” over giant controllers.
- Use `direct` helpers when we need stable cache-busted URLs.
- Consider `resolve` blocks for our most common “deep links”:
  - player detail, contract row, draft asset, etc.
