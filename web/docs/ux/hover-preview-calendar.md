# Hover-Preview Calendar — Interaction Specification

> A calendar grid where hovering previews content in a detail panel while maintaining a persistent "anchor" selection.

**Source:** Calendar app (UX analysis via Gemini)

## Core Principle

**Hover previews, click commits.** The detail panel responds to mouse position instantly, but selection state persists independently — users can explore without losing their place.

---

## 1. Decoupled Selection/Preview Model

### Pattern
Two independent states operate simultaneously:
- **Selection (persistent):** The currently "open" or committed item. Survives hover.
- **Preview (transient):** Temporarily shown content based on hover position. Disappears when mouse leaves.

### State Machine
```
SELECTED --[mouse enter cell]--> SELECTED + PREVIEWING
SELECTED + PREVIEWING --[mouse move to new cell]--> SELECTED + PREVIEWING (new target)
SELECTED + PREVIEWING --[mouse leave grid]--> SELECTED
SELECTED + PREVIEWING --[click cell]--> SELECTED (new anchor)
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Selection visual | Solid background (white). Persists regardless of hover. |
| Hover visual | Lighter background (grey). Coexists with selection visual. |
| Detail panel | Shows preview content on hover; reverts to selection content on mouse leave. |
| Transition speed | Instant (0ms delay observed). No debounce. |

---

## 2. Ghost Selection

### Pattern
The anchor selection remains visually distinct while the user explores other items. This prevents "losing your place" during exploration.

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Visual persistence | Selected item keeps its highlight even when another item is hovered. |
| Cognitive benefit | User can peek at many items without losing context of where they started. |
| Click to change | Clicking a hovered item makes it the new anchor. |

---

## 3. Hover-Driven Context Propagation

### Pattern
Mouse position drives detail panel content. No click required to preview.

### Data Flow
```
Mouse Position (Grid Cell)
    └──> Detail Panel (immediate update)
         ├── Date header
         ├── Relative time ("2 days ago")
         └── Content preview
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Driver | Mouse hover position |
| Receiver | Detail panel |
| Commit | None required for preview. Click required for selection change. |
| Scope | Hover affects only the detail panel, not the grid state. |

---

## 4. Data Density Indicators

### Pattern
Visual indicators (dots) on grid cells signal presence/quantity of content without revealing what it is.

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Indicator | Small dots below the cell label |
| Meaning | Existence of content (1 dot, 2 dots, etc.) |
| No hover change | Dots themselves don't animate or change on hover |
| Progressive disclosure | Dots signal "something here"; hover reveals what |

---

## 5. Progressive Disclosure Stages

| Stage | Mechanism | What's Revealed |
| :--- | :--- | :--- |
| 1. Existence | Static dots on grid | Whether content exists (not what) |
| 2. Preview | Hover (zero-click) | Full date, relative time, content summary |
| 3. Selection | Click | Persistent focus, likely navigation to full view |

---

## 6. Spatial Layout Rules

### Layout
```
┌─────────────────────────────────┐
│  Header (fixed)                 │
│  [filename] [breadcrumbs]       │
├─────────────────────────────────┤
│                                 │
│  Calendar Grid (static)         │
│  7 cols × 6 rows                │
│  No scroll; shows full month    │
│                                 │
├─────────────────────────────────┤
│  Detail Panel (fixed height)    │
│  [date] [relative time]         │
│  [content preview]              │
└─────────────────────────────────┘
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Header | Fixed top. Contains file context. |
| Grid | Static. No scroll. Entire month visible including overflow from adjacent months. |
| Detail panel | Fixed height at bottom. Content replaces in place; panel doesn't resize. |

---

## 7. Temporal Context Labels

### Pattern
Relative timestamps ("2 days ago", "in 4 days") alongside or instead of absolute dates.

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Calculation | Dynamic, based on current system date vs. hovered date |
| Display | Natural language in detail panel |
| Benefit | Reduces cognitive load for temporal orientation |

---

## 8. Application to Salary Book

### Where These Patterns Apply

| Element | Pattern | Notes |
| :--- | :--- | :--- |
| Team grid/sidebar | Ghost Selection | Scroll to explore teams while maintaining current selection highlight. |
| Contract row hover | Hover-Driven Context | Preview contract details in sidebar without clicking. |
| Year columns | Data Density Indicators | Show presence of options/guarantees without cluttering cells. |
| Transaction history | Temporal Context Labels | "3 months ago" vs. "2024-10-15" for recent transactions. |

### Not Applicable

| Pattern | Why |
| :--- | :--- |
| Fixed grid (no scroll) | Salary Book is scroll-driven; can't fit all teams in viewport. |
| Calendar-specific layout | 7×6 grid structure is domain-specific. |

### Potential Additions

| Feature | Pattern Used |
| :--- | :--- |
| Player card hover | Hover-Driven Context — show contract summary without leaving current view. |
| Trade date picker | Ghost Selection — explore dates while keeping current selection visible. |
| Cap timeline | Data Density Indicators — dots showing transactions per season. |

---

## Summary

| Pattern | Key Behavior |
| :--- | :--- |
| Decoupled Selection/Preview | Two independent states: persistent anchor + transient hover preview. |
| Ghost Selection | Anchor stays visible while exploring other items. |
| Hover-Driven Context | Detail panel updates on hover, no click required. |
| Data Density Indicators | Dots signal existence without revealing content. |
| Progressive Disclosure | Existence → Preview → Selection (3 stages). |
| Temporal Context Labels | Relative time reduces cognitive load. |

---

**Key takeaway for Salary Book:** The hover-preview pattern is powerful for dense data exploration. Users can scan many items quickly without committing to each one. The "ghost selection" concept directly applies to our scroll-driven sidebar — the current team stays highlighted even as you explore others.
