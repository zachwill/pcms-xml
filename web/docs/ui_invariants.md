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

## Page layout pattern (mandatory)

Every page follows this three-layer structure. No exceptions.

1. **Command Bar** — `sticky top-0 z-40 h-[130px]` with `border-b border-border bg-background`. Houses navigation, filters, and the global nav dropdown.
2. **Sticky Header(s)** (if applicable) — `sticky top-[130px] z-30` for column headers on data-dense pages (e.g., Team Summary column header, Salary Book table header).
3. **Edge-to-edge flex layout** — Content fills the full viewport width. No `max-w-*` constraints or `mx-auto` centering on `<main>`. Use `px-4 pb-8` for padding.

Best examples (in order of quality):
- **Salary Book** (`tools/salary_book/show.html.erb`) — `h-screen flex flex-col`, command bar as `shrink-0`, viewport with `flex-1`
- **Two-Way Utility** (`tools/two_way_utility/show.html.erb`) — `min-h-screen bg-background`, `<main class="pb-8">`
- **Team Summary** (`tools/team_summary/show.html.erb`) — `min-h-screen bg-background`, sticky column header + `<main class="pb-8">`

### Anti-patterns (do not)

- Do not use `max-w-5xl mx-auto` or any max-width centering on `<main>` content areas.
- Do not wrap content in a centered container that prevents edge-to-edge flow.
- Do not use `<table>` elements for primary data layouts that need sticky headers (tables inside `overflow-x-auto` break `position: sticky`).

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

---

## Design vocabulary (concrete patterns)

These are the building blocks of every page. They're fully documented with copy-paste ERB in `web/docs/design_guide.md`. Summary here for quick reference.

### Row density patterns

Every data row uses one of these structures:

- **Double-row grid cell** (identity): `grid grid-cols-[40px_1fr] grid-rows-[24px_16px]` — image + name (14px medium) + meta (10px muted). Used for player/team/agent identity columns.
- **entity-cell-two-line** (data): CSS component with `grid-rows-[20px_14px]` — primary value (13px) + secondary label (10px muted). Used for financial/numeric columns.
- Both patterns produce exactly 34–40px row height. This density is intentional. Don't add padding.

### Universal row hover

```
hover:bg-yellow-50/70 dark:hover:bg-yellow-900/10 transition-colors duration-75
```

This is the only row hover treatment. Sticky columns carry their own hover via `group-hover:`.

### Financial numbers

All money and numeric data: `font-mono tabular-nums`. Positive room values: `text-emerald-600 dark:text-emerald-400`. Negative/over values: `text-red-500`. Nil: `—`.

### Chips / badges

Use the CSS classes: `entity-chip entity-chip--{muted|warning|danger|success|accent}`.

### Tables

Wrap in `overflow-x-auto rounded-lg border border-border`. Use `entity-table min-w-full text-xs`. Header: `bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground/90`. Body: `divide-y divide-border`.

For full details with copy-paste ERB, see `web/docs/design_guide.md`.

