# UI invariants (web)

These are **non-negotiables**. If current behavior and your implementation differ, align to these.

## Product shape

- Rows are the product.
- Scroll position is primary state.
- Sidebar is a 2-level state machine: base + single overlay.
- Filters are lenses, not navigation.

## Surface model

- Tools/workbenches (`/tools/*`): dense, scroll-driven, stateful.
- Entity workspaces: scroll-first module stacks + pivots.
- Catalog/inbox: row/event-driven browsing, not thumbnail grids.

Reference: `reference/sites/INTERACTION_MODELS.md`

## Datastar posture

- Server renders HTML; Datastar patches stable IDs.
- Signals are ephemeral UI state, not business authority.
- Keep client JS minimal (scroll/measure/sync/transition glue).

## Anti-patterns (do not)

- Do not use Turbo/Hotwire/Stimulus (Turbo Frames/Streams, Stimulus controllers, etc.). Datastar is the UI runtime.
- Do not orchestrate multi-region updates in custom client JS.
- Do not switch to JSON + client rendering to avoid server HTML.
- Do not avoid SSE just because the response is short-lived.
- Do not re-implement cap/trade/CBA math in Ruby/JS.
