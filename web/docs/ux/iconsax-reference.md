# Iconsax Icon Library — UX Reference Analysis

> Captured interaction patterns from an icon library UI (likely Iconsax or similar). This demonstrates Master-Detail with global/local control scoping and real-time direct manipulation.

## Why This Reference Exists

This UI demonstrates patterns relevant to tools with:
- A browsable collection (grid) with global filters
- Detail views for individual items
- Real-time preview updates (no "Apply" button)
- Scoped configuration (global vs. local controls)

---

## 1. Master-Detail with Modal Overlay

### Pattern
Two distinct view states:
1. **Library State (Master)**: Grid of items with global controls
2. **Editor State (Detail)**: Single item with granular controls

The Editor appears as a modal overlay — the Library remains visible (dimmed) behind it.

### State Machine
```
LIBRARY_STATE
    --[Adjust Global Controls]--> LIBRARY_STATE (grid updates immediately)
    --[Hover Grid Item]--> ITEM_HOVER (reveals metadata)
    --[Click Grid Item]--> EDITOR_STATE (modal opens)

EDITOR_STATE
    --[Adjust Local Controls]--> EDITOR_STATE (preview updates)
    --[Click Download]--> EDITOR_STATE (toast appears)
    --[Close/Back]--> LIBRARY_STATE
```

### Key Insight
The modal overlay preserves context — user sees where they came from. This is different from full page navigation where context is lost.

---

## 2. Global vs. Local Control Scoping

### Pattern
The same control types appear in two contexts with different scopes:

| Context | Scope | Example Controls |
| :--- | :--- | :--- |
| Library Sidebar | All items in grid | Direction, Fill, Edge, Stroke |
| Editor Modal | Single selected item | Direction, Fill, Edge, Stroke, Size, Color |

### Propagation Rules
```
Global Control Change → Updates ALL visible grid items (immediate)
Local Control Change  → Updates ONLY the selected item (immediate)
```

### Inheritance Model
When entering Editor State:
1. Item inherits current global settings
2. Editor allows local overrides
3. Local overrides do NOT propagate back to global

```
Library: Fill=ON, Stroke=2px
    │
    ▼ (click item)
Editor: Fill=ON, Stroke=2px (inherited)
    │
    ▼ (user changes Stroke to 3px)
Editor: Fill=ON, Stroke=3px (local override)
    │
    ▼ (close editor)
Library: Fill=ON, Stroke=2px (unchanged)
```

### Key Insight
Same UI components (toggles, sliders) used in both contexts. User learns the control once, applies it everywhere. The only difference is scope.

---

## 3. Direct Manipulation (Real-Time Updates)

### Pattern
Controls update the UI immediately (<100ms). No "Apply" button, no confirmation.

| Control Type | Behavior |
| :--- | :--- |
| Toggle/Switch | Instant state flip |
| Segmented Control | Instant selection |
| Slider | Continuous update while dragging |

### Slider Behavior Detail
```
STATE_IDLE
    --[MouseDown on handle]--> STATE_DRAGGING
    
STATE_DRAGGING
    --[MouseMove]--> STATE_DRAGGING (value updates continuously, UI reflects)
    --[MouseUp]--> STATE_IDLE (final value committed)
```

### Key Insight
No abstraction between control and result. The control IS the preview.

---

## 4. Hover-Reveal for Metadata

### Pattern
Grid items show minimal information by default. Additional metadata reveals on hover.

```
DEFAULT STATE:
┌─────────┐
│  [icon] │  ← Shape only, no text
└─────────┘

HOVER STATE:
┌─────────┐
│  [icon] │
│   [+]   │  ← Action button appears
│ "Name"  │  ← Text label appears
└─────────┘
```

### Why It Works
- Reduces visual noise in browse mode
- User scans by shape/pattern first
- Details available on demand without click

---

## 5. Sticky Sidebar with Scroll Independence

### Pattern
```
┌────────────────────────────────────────────┐
│ Header (fixed)                             │
├────────────┬───────────────────────────────┤
│            │                               │
│  Sidebar   │   Grid (scrollable)           │
│  (sticky)  │                               │
│            │   ┌───┐ ┌───┐ ┌───┐          │
│  Controls  │   │   │ │   │ │   │          │
│  always    │   └───┘ └───┘ └───┘          │
│  visible   │   ┌───┐ ┌───┐ ┌───┐          │
│            │   │   │ │   │ │   │          │
│            │   └───┘ └───┘ └───┘          │
│            │         ▼ (scroll)            │
└────────────┴───────────────────────────────┘
```

### Key Behavior
- Sidebar does not scroll with grid
- User can change global settings at any scroll depth
- Scroll position preserved when changing settings

---

## 6. Toast Notifications (Non-Blocking Feedback)

### Pattern
Actions that complete (like downloads) show peripheral confirmation without interrupting workflow.

```
ACTION_TRIGGERED
    --[Success]--> TOAST_APPEARS (slides in from right)
    --[2-3 seconds]--> TOAST_DISMISSES (auto)

Multiple actions → Toasts stack vertically
```

### Spatial Rules
- Fixed position: top-right
- Highest z-index (above modals)
- Does not block interaction with underlying UI

### Key Insight
User can trigger multiple actions rapidly without waiting for confirmation dialogs.

---

## 7. Progressive Disclosure Layers

### Layer Model
```
L1 (Always Visible):
    - Icon shapes in grid
    - Global controls in sidebar

L2 (On Click):
    - Editor modal with granular controls
    - Export options (SVG/PNG)

L3 (On Hover):
    - Icon names
    - Quick-action buttons (+)
```

### Configuration Complexity Gradient
```
Library View          →  Editor View
─────────────────────────────────────
High-level style         Granular config
(Stroke/Fill/Direction)  (Size/Color/Format)

Browse-oriented          Task-oriented
(scan many items)        (configure one item)
```

---

## 8. Interaction Inventory

| Element | Trigger | Result |
| :--- | :--- | :--- |
| Global Direction tabs | Click | All grid icons rotate to angle |
| Global Fill toggle | Click | All icons fill/unfill |
| Global Edge toggle | Click | All icons sharp/rounded corners |
| Global Stroke slider | Drag | All icons stroke width updates continuously |
| Grid item | Hover | Reveals name + action button |
| Grid item | Click | Opens Editor modal |
| Editor Direction tabs | Click | Single icon rotates |
| Editor Fill toggle | Click | Single icon fills/unfills |
| Editor Duotone toggle | Click | Single icon gets secondary shading |
| Editor Edge toggle | Click | Single icon corners change |
| Editor Stroke slider | Drag | Single icon stroke updates |
| Editor Size slider | Drag | Single icon scales |
| Color swatch | Click | Single icon color changes |
| Download button | Click | File downloads, toast appears |
| Toast | Auto | Slides in, stacks, auto-dismisses |

---

## Key Takeaway: Scoped Configuration with Inheritance

The most notable pattern is **scoped configuration**:

1. Global settings provide defaults
2. Local context can override
3. Same control patterns in both scopes
4. Changes are immediate (no Apply/Save)

---

## References

- Source: Gemini analysis of icon library UI video
- Related: `web/docs/ux/anime-docs-reference.md`
