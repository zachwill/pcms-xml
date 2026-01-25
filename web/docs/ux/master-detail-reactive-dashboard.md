# Master-Detail Reactive Dashboard — Interaction Specification

> A three-column layout where selection in a sidebar drives synchronized visualization across multiple representations, with localized parameter controls that update in real-time.

**Source:** Anime.js easing curve editor (UX analysis via Gemini)

## Core Principle

**Selection propagates left-to-right; parameter edits are local and immediate.** The sidebar owns "what", the detail panels own "how to display it."

---

## 1. Sidebar Selection

### Pattern
A scrollable list of selectable items grouped by category. Clicking an item updates all downstream panels instantly.

### State Machine
```
IDLE --[hover item]--> HOVER
HOVER --[mouseout]--> IDLE
HOVER --[click]--> SELECTED (item becomes active, context propagates right)
SELECTED --[click other item]--> SELECTED (new item)
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Click | Immediate hard cut — no transitions, no confirmation. Downstream panels update synchronously. |
| Hover | Visual highlight on row. No tooltip, no delay. |
| Active state | Single-selection. Active item has distinct visual treatment (text/icon color change). |
| Scroll | Sidebar scrolls independently of main content. |
| Keyboard | `↑`/`↓` moves selection. `Enter` commits (if keyboard nav is active). |

---

## 2. Context Propagation

### Pattern
Selection in Column 1 (sidebar) immediately updates Columns 2 and 3. There is no "Apply" step.

### Data Flow
```
Sidebar Selection
    ├──> Center Panel (visualization/main content)
    └──> Right Panel (detail view + controls + export)
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Direction | Strictly left-to-right. Right panel changes do NOT affect sidebar or center panel state. |
| Timing | Synchronous. All panels update on the same tick. |
| Independence | Right panel parameters (e.g., display toggles) are local mutations — they don't modify the selected entity. |

---

## 3. Inline Parameter Controls

### Pattern
Sliders (or equivalent controls) in the detail panel modify display/simulation parameters. Changes are reflected immediately in sibling views.

### State Machine
```
IDLE --[mousedown on control]--> MODIFYING
MODIFYING --[mousemove]--> MODIFYING (value updates continuously)
MODIFYING --[mouseup]--> IDLE
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Commit model | Continuous — no Save button. Value is committed on every change event. |
| Bidirectional binding | Control (slider) and display (input field) stay in sync. |
| Animation | Running animations consume new values in real-time — no pause required. |
| Scope | Parameter changes affect only the local panel (preview + code output), not the selected entity itself. |

---

## 4. Synchronized Representations

### Pattern
The same data object is displayed simultaneously in multiple forms that stay in sync:
1. **Abstract** — graph, summary, or aggregate view
2. **Concrete** — live preview or simulation
3. **Technical** — exportable code, raw values, or formula

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Update trigger | Any change to source data updates all three representations. |
| No disclosure | All representations are always visible. No "Show Code" toggle. |
| Read-only vs. editable | Some representations are read-only (abstract), others are editable (concrete controls). |

---

## 5. Mode-Dependent Affordances

### Pattern
Certain selections reveal additional UI complexity (e.g., editable handles appear only when a custom/editable item is selected).

### State Machine
```
STATE_READONLY --[select editable item]--> STATE_EDITABLE
STATE_EDITABLE --[select readonly item]--> STATE_READONLY
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Visual change | Editable state reveals handles, controls, or input affordances. |
| Transition | Hard cut — no animation between modes. |
| Scope | Mode is determined by selection type, not a global toggle. |

---

## 6. Spatial Layout Rules

### Pattern
Fixed three-column layout. No global scroll. Columns may scroll independently.

### Layout
```
┌──────────┬──────────────────┬──────────────┐
│ Sidebar  │   Main Stage     │   Detail     │
│ (scroll) │   (fixed)        │   (fixed)    │
│          │                  │   [controls] │
│          │                  │   [output]   │
└──────────┴──────────────────┴──────────────┘
```

### Behaviors
| Aspect | Behavior |
| :--- | :--- |
| Sidebar | Scrollable if content exceeds height. Sticky position. |
| Main stage | Fixed center. Content swaps on selection (no scroll). |
| Detail panel | Fixed right. Contains controls (top) and output (bottom). |
| Z-index | Overlays (tooltips, handles) appear above main content. |

---

## 7. Application to Salary Book

### Where These Patterns Apply

| Element | Pattern | Notes |
| :--- | :--- | :--- |
| Team list (sidebar) | Sidebar Selection | Click team → salary table + summary update. Single-selection. |
| Salary table (main) | Synchronized Representations | Table is "abstract", totals bar is "concrete", export is "technical". |
| Year selector | Inline Parameter Controls | Change year → all views update immediately. No Save. |
| Contract row expansion | Mode-Dependent Affordances | Clicking a row reveals season-by-season breakdown (progressive disclosure). |
| Scroll-driven sidebar | Context Propagation (modified) | As user scrolls main content, sidebar highlights current team. Reverse of reference pattern. |

### Not Applicable

| Pattern | Why |
| :--- | :--- |
| Fixed main stage (no scroll) | Salary Book is scroll-driven. Main content scrolls; sidebar responds. |
| Three simultaneous representations | We don't have a "preview animation" equivalent. Code export may apply to trade scenarios later. |
| Continuous slider controls | No sliders in current scope. Future: exception slider for trade tool. |

### Potential Additions

| Feature | Pattern Used |
| :--- | :--- |
| Exception allocation | Inline Parameter Controls — slider with bidirectional binding to amount field. |
| Scenario export | Technical representation always visible (SQL or JSON output). |

---

## Summary

| Pattern | Key Behavior |
| :--- | :--- |
| Sidebar Selection | Click = immediate context switch. No confirmation. |
| Context Propagation | Left-to-right. Sidebar drives, panels consume. |
| Inline Parameter Controls | Continuous commit. No Save button. |
| Synchronized Representations | One data object, multiple views, always in sync. |
| Mode-Dependent Affordances | Selection type determines what's editable. |
| Spatial Layout | Three-column, independent scroll zones, fixed structure. |

---

**Key takeaway for Salary Book:** The reference UI's "instant state switching" and "edit where you read" patterns align directly with our philosophy. The main adaptation is inverting the context propagation for scroll-driven navigation — instead of sidebar driving scroll position, scroll position drives sidebar highlighting.
