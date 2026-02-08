# Design guide — visual vocabulary for `web/`

> This is the concrete pattern reference. If you're building a new page or modifying an existing one, this doc tells you *what classes to use, what heights to target, and what the expected output looks like*.

Salary Book is the gold standard. Every pattern documented here is extracted from working code in the repo. When in doubt, open the Salary Book templates and match them.

---

## Quality ladder (current pages, ranked)

Know where the bar is before you start.

| Rank | Page | Status | Notes |
|------|------|--------|-------|
| ★★★★★ | Salary Book | Gold standard | Full viewport, scroll-driven, sidebar overlay, KPI header, dense rows, horizontal scroll sync, filter toggles |
| ★★★★☆ | Player workspace | Strong | Deferred bootstrap, entity header, scrollspy local nav, section modules, rightpanel overlay |
| ★★★★☆ | Team workspace | Strong | Same architecture as Player — local nav, deferred bootstrap, section modules |
| ★★★★☆ | Player index | Strong | Full viewport catalog, headshot+name grid cells, team/agent columns, sticky header |
| ★★★☆☆ | Two-Way Utility | Good | Command bar correct, team grid, dense rows. Missing: sidebar, filter toggles, interactive drill-in |
| ★★★☆☆ | Team Summary | Good | Sticky column header, sortable columns, flags. Missing: sidebar, interactive row drill-in |
| ★★★☆☆ | Trades index | Good | Datastar signal-driven filters, pane refresh. Missing: richer row density |
| ★★☆☆☆ | System Values | OK | Correct layout shell. Multiple tables with toggle visibility. Missing: denser row treatment, sticky headers per table |
| ★★☆☆☆ | Agent show | OK | Entity header, sections, tables. Missing: local nav scrollspy, deferred bootstrap |
| ★★☆☆☆ | Agency show | OK | Same gaps as Agent show |
| ★★☆☆☆ | Trade show | OK | Workspace header, local nav, good table structure. Missing: entity header (uses workspace_header instead), deferred bootstrap |

**When building a new page, target ★★★★★.**

---

## Page shell patterns

### Pattern A: Full-viewport tool (Salary Book, Player Index)

For scroll-driven tools and master-list catalogs. The page owns the entire viewport — no body scroll.

```erb
<div id="<tool-name>" class="h-screen w-screen flex flex-col overflow-hidden bg-background"
     data-signals="{ ... }">
  <div id="flash"></div>

  <header id="commandbar"
          class="shrink-0 h-[130px] border-b border-border bg-background flex items-start px-4 pt-3 gap-4">
    <%# Team grid / entity grid / filter groups / global nav %>
  </header>

  <div id="viewport" class="flex flex-1 overflow-hidden relative">
    <%# Main canvas (scrollable) %>
    <div id="maincanvas" class="flex-1 min-w-0 overflow-y-auto overflow-x-auto ...">
      <%# Content %>
    </div>

    <%# Right panel (optional) %>
    <aside id="rightpanel"
           class="w-[30%] min-w-[320px] max-w-[480px] border-l border-border bg-background overflow-hidden relative">
      <div id="rightpanel-base-layer" class="absolute inset-0 overflow-y-auto ...">
        <div id="rightpanel-base"><%# Team/context underlay %></div>
      </div>
      <div id="rightpanel-overlay"><%# Entity detail overlay %></div>
    </aside>
  </div>
</div>
```

Key rules:
- `h-screen flex flex-col overflow-hidden` on root — page owns the viewport.
- Command bar is `shrink-0 h-[130px]` — fixed, never scrolls.
- Viewport fills remaining space with `flex flex-1 overflow-hidden`.
- If a sidebar exists, it's always the right panel pattern above.

### Pattern B: Scrolling page (Team Summary, Two-Way Utility, System Values)

For pages that scroll naturally. Still full-width, still has the command bar.

```erb
<div class="min-h-screen bg-background">
  <header id="commandbar"
          class="sticky top-0 z-40 border-b border-border bg-background h-[130px] px-4 pt-3 flex items-start gap-4">
    <%# Content %>
  </header>

  <main class="pb-8">
    <%# Page content — edge-to-edge, no max-w %>
  </main>
</div>
```

Key rules:
- `min-h-screen bg-background` on root.
- Command bar is `sticky top-0 z-40 h-[130px]`.
- `<main>` uses `pb-8` — NO `max-w-*` or `mx-auto`.
- Some pages add `px-4` on main; others put padding on child elements.

### Pattern C: Entity workspace (Player, Team, Agent, Trade)

Single-entity pages with section modules and optional scrollspy.

```erb
<div id="<entity>-show" class="min-h-screen w-full bg-background">
  <%# Shared entity commandbar (entities/shared/_commandbar.html.erb) %>
  <%= render partial: "entities/shared/commandbar", locals: { active_entity_scope: "<entity_type>" } %>

  <%# Optional deferred bootstrap %>
  <% if @defer_heavy_load %>
    <div id="<entity>-bootstrap" class="hidden" aria-hidden="true"
         data-init="@get('/<entities>/<%= @slug %>/sse/bootstrap')"></div>
  <% end %>

  <main id="maincanvas" class="px-4 pb-8" data-entity-workspace>
    <%# Entity header (image, title, badges, meta, links) %>
    <%= render partial: "entities/shared/entity_header", locals: { ... } %>

    <div class="lg:flex lg:gap-8">
      <%# Scrollspy local nav (hidden on mobile) %>
      <%= render partial: "entities/shared/local_nav", locals: { sections: [...] } %>

      <%# Section stack %>
      <div class="min-w-0 flex-1 space-y-8">
        <%# Skeleton or real sections %>
      </div>
    </div>

    <%# Rightpanel slots (even if unused, keep them for Datastar patching) %>
    <div id="rightpanel-overlay"></div>
  </main>
</div>
```

Key rules:
- Use `entities/shared/entity_header` — not a custom hero.
- Use `entities/shared/local_nav` for scrollspy.
- Use `entities/shared/section_skeleton` for deferred loading.
- Each section: `<section id="<name>" class="scroll-mt-24 space-y-3">` with heading `<h2 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">`.
- Layout uses `lg:flex lg:gap-8` — local nav on left, content stack on right.

---

## Command bar anatomy

The command bar is 130px tall, always. It contains (left to right):

1. **Selector grid** — team pills (tools) or entity nav pills (entity pages)
2. **Vertical divider** — `<div class="h-20 w-px bg-border self-center"></div>`
3. **Filter/knob groups** (optional) — checkbox or radio groups
4. **Spacer + divider** — `ml-auto` pushes global nav to the right
5. **Global navigation** — `shared/commandbar_navigation`

### Pill buttons (team grid, entity grid)

```erb
<a href="#<%= code %>"
   class="relative h-7 px-2 rounded text-xs font-medium transition-all duration-150
          border outline-none inline-flex items-center justify-center
          no-underline hover:no-underline"
   <%# Active/inactive via data-class or static classes %>
>
  <%= code %>
</a>
```

Active state: `bg-primary text-primary-foreground border-primary shadow-sm`
Inactive state: `bg-muted/50 text-foreground border-border hover:bg-muted hover:border-foreground/20`

### Filter toggle (checkbox)

```erb
<div class="flex items-center gap-1.5">
  <input type="checkbox" id="filter-<name>" class="size-3.5 accent-primary"
         data-bind="<signalname>" />
  <label for="filter-<name>"
         class="text-[11px] leading-none cursor-pointer select-none
                text-foreground/80 hover:text-foreground transition-colors">
    Label Text
  </label>
</div>
```

Group them under a heading: `<div class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">Display</div>`

---

## Row patterns (the core of the design)

### The double-row grid cell (identity cells)

Used everywhere: player rows, team cells in lists, agent columns. This is the fundamental unit of density.

```erb
<%# Grid: image column + text column, 2 rows (24px name + 16px meta) %>
<div class="grid grid-cols-[40px_1fr] grid-rows-[24px_16px]">
  <%# Image spans both rows %>
  <div class="row-span-2 flex items-center justify-start">
    <div class="w-7 h-7 rounded border border-border bg-background overflow-hidden">
      <img src="<%= url %>" alt="<%= name %>"
           class="w-full h-full object-cover object-top bg-muted"
           loading="lazy" decoding="async"
           onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" />
      <span class="hidden text-[9px] font-semibold text-muted-foreground"><%= fallback %></span>
    </div>
  </div>

  <%# Row A: Name (24px) %>
  <div class="h-[24px] flex items-end min-w-0 pl-1 pr-2">
    <span class="truncate font-medium text-[14px] group-hover:text-primary transition-colors">
      <%= name %>
    </span>
  </div>

  <%# Row B: Meta (16px) %>
  <div class="h-[16px] -mt-px flex items-start gap-2 min-w-0 pl-1 pr-2
              leading-none text-[10px] text-muted-foreground/80 tabular-nums">
    <span><%= meta_item_1 %></span>
    <span><%= meta_item_2 %></span>
  </div>
</div>
```

Dimensions:
- Image: `w-7 h-7` (28px) for rows, `w-8 h-8` (32px) for index/header contexts
- Grid: `grid-cols-[40px_1fr]` (40px image gutter + flex text)
- Row A height: `24px` — primary name, `text-[14px]`, `font-medium`
- Row B height: `16px` — meta, `text-[10px]`, `text-muted-foreground/80`
- `-mt-px` on Row B tightens the gap

### The entity-cell-two-line (data cells)

Defined in CSS (`application.css`). Used for numeric/data columns in tables.

```erb
<div class="entity-cell-two-line">
  <div class="entity-cell-primary justify-end font-mono tabular-nums">
    <%= format_compact_currency(value) %>
  </div>
  <div class="entity-cell-secondary justify-end font-mono tabular-nums">
    under cap
  </div>
</div>
```

CSS definitions:
- `.entity-cell-two-line` → `grid grid-rows-[20px_14px] min-h-[34px] leading-none`
- `.entity-cell-primary` → `h-[20px] flex items-end text-[13px] min-w-0`
- `.entity-cell-secondary` → `h-[14px] -mt-px flex items-start text-[10px] text-muted-foreground/80 min-w-0`

Common modifiers on primary/secondary:
- `justify-end` — right-align numbers
- `font-mono tabular-nums` — monospace for financial data
- Color overrides: `text-emerald-600 dark:text-emerald-400` (positive), `text-red-500` (negative/over)

### Row container and hover

```erb
<div class="group cursor-pointer transition-colors duration-75
            hover:bg-yellow-50/70 dark:hover:bg-yellow-900/10"
     role="button" tabindex="0"
     data-on:click="..."
     data-on:keydown="if (evt.key === 'Enter' || evt.key === ' ') { evt.preventDefault(); ... }">
  <div class="flex items-center px-4 min-h-[48px]">
    <%# Columns %>
  </div>
</div>
```

For table rows (`<tr>`):
```erb
<tr class="hover:bg-yellow-50/70 dark:hover:bg-yellow-900/10 transition-colors duration-75">
```

Key rule: **`hover:bg-yellow-50/70 dark:hover:bg-yellow-900/10`** is the universal row hover. Don't invent another.

### Sticky left column (horizontal scroll context)

```erb
<div class="w-52 shrink-0 pl-4 sticky left-0 z-20 relative
            bg-background transition-colors duration-75
            group-hover:bg-yellow-50/70 dark:group-hover:bg-yellow-900/10
            after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px after:bg-border/30">
  <%# Identity cell content %>
</div>
```

Key: sticky columns must carry their own background + hover state (via `group-hover:`) and a right border pseudo-element.

---

## Table patterns

### Standard entity table

```erb
<div class="overflow-x-auto rounded-lg border border-border">
  <table class="entity-table min-w-full text-xs">
    <thead class="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground/90">
      <tr>
        <th class="text-left px-3 py-2 font-medium">Column</th>
        <th class="text-right px-3 py-2 font-medium">Numeric</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-border">
      <% rows.each do |row| %>
        <tr class="hover:bg-yellow-50/70 dark:hover:bg-yellow-900/10 transition-colors duration-75">
          <td class="px-3 py-2"><%# Content %></td>
          <td class="px-3 py-2 text-right font-mono tabular-nums"><%# Number %></td>
        </tr>
      <% end %>
    </tbody>
  </table>
</div>
```

### Sticky column header (scrolling pages)

For pages like Team Summary where the table header sticks below the command bar:

```erb
<div class="sticky top-[130px] z-30 bg-background will-change-transform
            shadow-[0_1px_3px_0_rgb(0_0_0/0.08),0_1px_2px_-1px_rgb(0_0_0/0.08)]">
  <div class="h-10 flex items-center border-b border-border bg-muted
              text-[10px] uppercase tracking-wide font-medium text-muted-foreground/90
              select-none cursor-default">
    <%# Column cells with fixed widths %>
  </div>
</div>
```

The `top-[130px]` matches the command bar height.

---

## Badge / chip patterns

Defined in CSS. Use the correct variant.

```erb
<span class="entity-chip entity-chip--muted">Status</span>
<span class="entity-chip entity-chip--warning">Repeater</span>
<span class="entity-chip entity-chip--danger">Taxpayer</span>
<span class="entity-chip entity-chip--success">Under tax</span>
<span class="entity-chip entity-chip--accent">Apron</span>
```

CSS base: `inline-flex items-center rounded px-1.5 py-0.5 text-[10px] leading-none font-medium`

---

## Section patterns (entity workspaces)

### Section with heading

```erb
<section id="<section-id>" class="scroll-mt-24 space-y-3">
  <h2 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
    Section Title
  </h2>
  <%# Content: table, grid, cards, etc. %>
</section>
```

- `scroll-mt-24` accounts for sticky command bar + workspace header.
- `space-y-3` between heading and content.

### Vitals grid (KPI cards)

```erb
<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
  <div class="rounded-lg border border-border bg-background p-3">
    <div class="text-xs text-muted-foreground">Label</div>
    <div class="mt-1 text-lg font-semibold font-mono tabular-nums"><%= value %></div>
  </div>
</div>
```

### Empty state

```erb
<div class="p-4 rounded-lg bg-muted/30 border border-border/50 text-sm text-muted-foreground italic">
  No data found.
</div>
```

### Error state

```erb
<div class="p-4 rounded-lg border border-border bg-muted/20">
  <div class="text-sm font-medium text-destructive">Warehouse query failed</div>
  <pre class="mt-2 text-xs text-muted-foreground overflow-x-auto"><%= @boot_error %></pre>
</div>
```

---

## Typography scale

These are the sizes used across the app. Don't invent new ones.

| Purpose | Size | Weight | Color | Example |
|---------|------|--------|-------|---------|
| Row primary name | `text-[14px]` | `font-medium` | `text-foreground` | Player name in row |
| Row secondary / meta | `text-[10px]` | normal | `text-muted-foreground/80` | Age, YOS, id below name |
| Cell primary value | `text-[13px]` | normal | `text-foreground` | Salary amount |
| Cell secondary label | `text-[10px]` | normal | `text-muted-foreground/80` | "under cap" |
| Table header | `text-[10px]` | `font-medium` | `text-muted-foreground/90` | Column headers |
| Group heading | `text-[10px]` | `font-semibold` | `text-muted-foreground/70` | "Display", "Eastern" |
| Section heading | `text-xs` | `font-medium` | `text-muted-foreground` | "Vitals", "Roster" |
| Filter label | `text-[11px]` | normal | `text-foreground/80` | Checkbox labels |
| Badge / chip | `text-[10px]` | `font-medium` | variant-specific | Status chips |
| Page title | `text-lg` | `font-semibold` | `text-foreground` | Entity name |
| KPI card value | `text-lg` | `font-semibold` | `text-foreground` | "24", "$142.3M" |
| KPI card label | `text-xs` | normal | `text-muted-foreground` | "Clients", "Cap total" |

---

## Number formatting

All financial data uses `font-mono tabular-nums`.

- Salary amounts: helper formats (e.g. `$12.5M`, `$1,234,567`)
- Percentages: `font-mono tabular-nums`
- Positive room: `text-emerald-600 dark:text-emerald-400`
- Negative/over: `text-red-500`
- Neutral/nil: `text-muted-foreground` or `—`

---

## New page checklist

Before writing any ERB, answer these:

- [ ] **Which shell pattern?** (A: full-viewport tool, B: scrolling page, C: entity workspace)
- [ ] **Command bar content?** What goes in the team/entity grid? What filters/knobs?
- [ ] **Sidebar?** If yes, use rightpanel-base + rightpanel-overlay pattern.
- [ ] **Row structure?** Use double-row grid cells for identity, entity-cell-two-line for data.
- [ ] **Tables?** Use `entity-table` with standard thead/tbody patterns.
- [ ] **Row hover?** `hover:bg-yellow-50/70 dark:hover:bg-yellow-900/10` — always.
- [ ] **Row click action?** Overlay in tools (sidebar), navigation in entity/catalog pages.
- [ ] **Numbers?** `font-mono tabular-nums` — always.
- [ ] **Dark mode?** Include `dark:` variants on any color overrides.
- [ ] **Edge-to-edge?** No `max-w-*` or `mx-auto` on main content areas.
- [ ] **Deferred load?** Entity workspaces should use shell → bootstrap for heavy data.

---

## Anti-patterns (things that will get your PR rejected)

- ❌ Cards with lots of whitespace instead of dense rows
- ❌ `max-w-5xl mx-auto` centering on content areas
- ❌ Custom hover colors (not yellow-50/70)
- ❌ JSON APIs with client-side rendering
- ❌ Turbo/Hotwire/Stimulus controllers
- ❌ New CSS classes when Tailwind utilities or existing component classes work
- ❌ `<table>` elements where you need sticky column headers (use flex layouts)
- ❌ Business logic (cap math, trade rules) in Ruby or JavaScript
- ❌ Tabs that hide content instead of scroll sections
- ❌ Thumbnail grids or card layouts for entity browsing
