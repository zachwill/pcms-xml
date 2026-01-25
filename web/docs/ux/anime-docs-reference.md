# Anime.js Documentation — UX Reference Analysis

> Captured interaction patterns from Anime.js docs (https://animejs.com/documentation/). This demonstrates scroll-driven navigation, isolated demo states, and dual-purpose sidebar.

## Why This Reference Exists

The Anime.js documentation site represents one of the best current examples of:
- Scroll-driven navigation with sidebar synchronization
- Isolated interactive demos that don't pollute global state
- Master-detail layout with dual-purpose sidebar (navigation + TOC)
- Progressive disclosure through hierarchy expansion

---

## 1. Dual-Purpose Sidebar Navigation

### Pattern
A single left sidebar serves two distinct functions:
1. **Module switching** (replaces main content entirely)
2. **Anchor navigation** (scrolls within current content)

### How It Works
```
Sidebar Item Types:
├── Primary Links (e.g., "Animation", "Draggable")
│   └── Click → Full content replacement + page transition
│   └── Expands to reveal sub-sections
│
└── Sub-section Links (e.g., "Targets", "Methods")
    └── Click → Smooth scroll to anchor
    └── Updates URL hash
```

### State Machine
```
STATE_MODULE_A
    --[Click Primary Link B]--> TRANSITION (content fades)
    --[Load Complete]--> STATE_MODULE_B

STATE_MODULE_B
    --[Click Sub-link "Methods"]--> SCROLLING
    --[Scroll Complete]--> ANCHOR_FOCUSED (viewport aligned)
```

### Key Insight
The sidebar collapses/expands sub-sections based on active module. When viewing "Animation", you see its sub-links. Switch to "Draggable", and those disappear — replaced by "Axes parameters", "Snap", etc.

---

## 2. Scrollspy — Sidebar Reflects Scroll Position

### Pattern
As the user scrolls the main content, the sidebar automatically highlights the corresponding section. The user never manually selects "I'm reading this section" — the UI infers it.

### Mechanics
1. Section headings act as scroll anchors
2. Intersection Observer (or scroll listener) detects which heading is in viewport
3. Sidebar updates highlighted item to match
4. URL hash may update silently (for deep linking)

### Bidirectional Flow
```
User scrolls main content → Sidebar highlight updates (passive)
User clicks sidebar link  → Main content scrolls (active)
```

### Why It Matters
- Maintains orientation in long documents
- No cognitive load — user doesn't manage "where am I"
- Enables deep linking without user action

---

## 3. Isolated Demo State Machines

### Pattern
Interactive demos embedded in content are self-contained. Their internal state (animations, toggles, drag positions) does NOT affect:
- Global page state
- URL
- Sidebar
- Other demos

### Example: Stagger Animation Demo
```
STATE_IDLE
    --[Click "Stagger Animation"]--> STATE_ANIMATING
    --[Animation End]--> STATE_IDLE (new positions)
```

### Example: Draggable Demo
```
STATE_STATIC
    --[MouseDown]--> STATE_DRAGGING (element follows cursor)
    --[MouseMove]--> STATE_DRAGGING (coordinates update)
    --[MouseUp]--> STATE_SNAPPING (animates to grid)
    --[Animation End]--> STATE_STATIC
```

### Example: Toggle in Demo
```
STATE_FADE_OFF
    --[Click Toggle]--> STATE_FADE_ON
    (Subsequent animations now include opacity)
```

### Key Insight
Demos are "playgrounds" — users can experiment without consequences. Reset is implicit (run it again). No save, no undo, no confirmation.

---

## 4. Spatial Layout Rules

### Fixed Regions
| Region | Behavior |
| :--- | :--- |
| Top Bar | Fixed at viewport top, z-index above content |
| Left Sidebar | Fixed height, scrolls independently if content exceeds viewport |

### Scrollable Regions
| Region | Behavior |
| :--- | :--- |
| Main Content | Scrolls vertically, passes under top bar |

### Container Relationships
```
┌─────────────────────────────────────────────┐
│ Top Bar (fixed)                             │
├──────────────┬──────────────────────────────┤
│              │                              │
│   Sidebar    │      Main Content            │
│   (fixed)    │      (scrollable)            │
│              │                              │
│   - Master   │      - Detail                │
│   - Controls │      - Responds to sidebar   │
│              │                              │
└──────────────┴──────────────────────────────┘
```

### Demo Containers
- Stay within document flow (no floating/breakout)
- Fixed internal aspect ratios to prevent layout shift during animation
- Self-contained scroll contexts (if needed)

---

## 5. Progressive Disclosure Hierarchy

### Navigation Hierarchy
```
Level 1: Module names (always visible)
    └── Level 2: Section anchors (visible when parent active)
```

### Content Hierarchy
```
Level 1: Visual Demo (always visible)
    └── Level 2: Code Implementation (visible by default, not hidden)
```

### "Show, then Tell" Pattern
The Anime.js docs show the **result first** (interactive demo), then the **implementation** (code). This is intentional — users understand what they're building before seeing how.

---

## 6. Context Propagation Rules

### Unidirectional (Sidebar → Main)
- Selecting a module forces full context switch in main view
- Selecting a sub-item forces scroll adjustment

### Isolated (Demos)
- Demo interactions do NOT propagate to sidebar, URL, or other demos
- Toggle state is local to that demo instance

### Reflective (Scrollspy)
- Main content scroll position reflects back to sidebar highlight
- This is the only "upward" propagation

### Diagram
```
Sidebar ──────────────► Main Content
   │                         │
   │    (scrollspy)          │
   ◄─────────────────────────┘
   
Demo A ──X──► Demo B (no propagation)
Demo A ──X──► Sidebar (no propagation)
Demo A ──X──► URL (no propagation)
```

---

## 7. Interaction Inventory

| Region | Element | Interaction | Result |
| :--- | :--- | :--- | :--- |
| Sidebar | Primary Link | Click | Replace main content, expand sub-nav |
| Sidebar | Sub-link | Click | Smooth scroll to anchor, update hash |
| Sidebar | Any item | Hover | Visual highlight only |
| Main | Demo button | Click | Trigger localized animation |
| Main | Draggable element | Drag | Element follows cursor, snaps on release |
| Main | Toggle switch | Click | Change demo behavior state |
| Main | Demo item | Hover | Show tooltip (duration, property) |
| Main | Code snippet | — | Read-only, syntax highlighted |
| Top Bar | Search icon | Click | Open search input |
| Top Bar | Theme toggle | Click | Switch light/dark mode |

---

## 8. State Machine Notation

The analysis uses a clean ASCII notation for state machines:

```
STATE_NAME
    --[Trigger Event]--> NEXT_STATE (side effects)
    --[Other Event]--> OTHER_STATE
```

This notation is useful for speccing interaction flows.

---

## References

- Source: Gemini analysis of `anime-docs-01.mp4` and `anime-docs-02.mp4`
- Anime.js docs: https://animejs.com/documentation/
