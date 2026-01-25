# Inline Editing & Property Patterns — Interaction Specification

> Extracted from reference UI analysis. Describes interaction mechanics, not visual style.

## Core Principle

**Edit where you read.** Properties are both display and edit trigger. No separate "Edit Mode" — clicking a value opens its editor in place.

---

## 1. Inline Property Editor

### Pattern

A property label (e.g., "Status: Backlog") is clickable. Clicking opens a contextual dropdown/popover anchored to the trigger. Selection commits immediately.

### State Machine

```
IDLE --[Click Property]--> EDITOR_OPEN
EDITOR_OPEN --[Select Option]--> IDLE (value updated, side effects fire)
EDITOR_OPEN --[Click Outside]--> IDLE (no change)
EDITOR_OPEN --[Press Escape]--> IDLE (no change)
```

### Behaviors

| Aspect | Behavior |
|--------|----------|
| **Commit model** | Optimistic/instant. No "Save" button. Selection = commit. |
| **Anchoring** | Dropdown aligns `top-left` to `bottom-left` of trigger |
| **Dismiss** | Click outside, Escape, or successful selection |
| **Keyboard** | Arrow keys navigate options; Enter selects; numbers (1-5) as accelerators |
| **Hover state** | Options highlight on hover; keyboard shortcut hints revealed |

### Side Effects

Changing a property can trigger visibility changes elsewhere:
- Example: Setting status to "In Progress" reveals a "Health" badge in another section
- Example: Setting a date range updates a timeline visualization

**Rule:** Side effects are immediate and bidirectional. No confirmation dialogs.

---

## 2. Keyboard Accelerators

### Pattern

Power-user shortcuts are hidden until the context where they apply is active.

### Implementation

```
┌─────────────────────────────────┐
│  ● Backlog                    1 │  ← shortcut revealed on hover/focus
│  ○ Planned                    2 │
│  ○ In Progress                3 │
│  ○ Completed                  4 │
│  ○ Canceled                   5 │
└─────────────────────────────────┘
```

### Behaviors

| Trigger | Result |
|---------|--------|
| Dropdown open + press `1` | Select first option, close dropdown |
| Dropdown open + press `3` | Select third option, close dropdown |
| Hover on option | Reveal shortcut hint (right-aligned) |

**Progressive disclosure:** Shortcuts are invisible in read mode. Only shown when the dropdown is open and the user hovers or focuses an option.

---

## 3. Icon/Asset Picker (Popover with Faceted Selection)

### Pattern

A large library of selectable assets (icons, emojis, images) presented in a constrained popover with:
- Tabs to switch asset categories
- Search to filter
- Faceted controls (e.g., color swatches) to modify the visible set

### State Machine

```
IDLE --[Click Icon Trigger]--> PICKER_OPEN (Icons tab, auto-focus search)

PICKER_OPEN:ICONS --[Click Emojis Tab]--> PICKER_OPEN:EMOJIS
PICKER_OPEN:EMOJIS --[Click Icons Tab]--> PICKER_OPEN:ICONS
PICKER_OPEN:ICONS --[Click Color Swatch]--> PICKER_OPEN:ICONS (grid recolored)
PICKER_OPEN --[Click Asset]--> IDLE (asset selected, picker closes)
PICKER_OPEN --[Click Outside]--> IDLE (no change)
```

### Spatial Layout

```
┌─────────────────────────────────────┐
│  [Icons]  [Emojis]                  │  ← Tabs (fixed)
├─────────────────────────────────────┤
│  🔍 Search...                       │  ← Search (fixed, auto-focused)
│  ● ● ● ● ● ● ● ● ●                  │  ← Color swatches (fixed, Icons only)
├─────────────────────────────────────┤
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │
│  │ ⚡ │ │ 📊 │ │ 🎯 │ │ 💡 │ │ 🔧 │     │  ← Asset grid (scrollable)
│  └───┘ └───┘ └───┘ └───┘ └───┘     │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐     │
│  │...│ │...│ │...│ │...│ │...│     │
│  └───┘ └───┘ └───┘ └───┘ └───┘     │
└─────────────────────────────────────┘
```

### Behaviors

| Aspect | Behavior |
|--------|----------|
| **Auto-focus** | Search input focused on open (anticipate search intent) |
| **Tab persistence** | Switching tabs preserves selected color filter |
| **Color application** | Immediate. Clicking a swatch recolors all icons in grid instantly. |
| **Color tooltip** | Hover on swatch shows HEX code |
| **Contextual controls** | Color swatches hidden on Emojis tab (emojis can't be tinted) |
| **Fixed dimensions** | Picker has fixed width/height; grid scrolls internally |
| **Z-index** | Picker floats above content, casts shadow |

---

## 4. Context Propagation Rules

### Immediate Application (No Save Button)

All edits commit on selection. The UI reflects changes instantly without:
- Confirmation dialogs
- Loading spinners (optimistic UI)
- Explicit "Save" actions

### Side Effect Visibility

Some property changes affect other parts of the UI:

```
STATUS = "In Progress" → HEALTH_BADGE.visible = true
STATUS = "Backlog"     → HEALTH_BADGE.visible = false
```

These transitions are:
- **Immediate** — no delay or animation gate
- **Reversible** — changing back reverts the side effect
- **Local** — contained within the current view (don't affect other pages)

### State Persistence Across Interactions

When a popover/dropdown closes and reopens:
- Selected tab is preserved (or reset to default — pick one)
- Filter state (e.g., selected color) is preserved within session
- Search input is cleared on reopen (fresh start)

---

## 5. Progressive Disclosure Hierarchy

### Level 1: Always Visible
- Property labels and current values
- Primary status indicators

### Level 2: Revealed on Click
- Full option list (dropdown)
- Asset library (picker)
- Keyboard shortcuts (in context)

### Level 3: Revealed on Hover/Focus
- Shortcut hints (right side of option)
- Technical details (HEX codes via tooltip)
- Secondary metadata

### Level 4: Revealed on Deep Interaction
- Nested controls (custom color picker inside icon picker)
- Advanced options (rarely used settings)

---

## 6. Anchoring & Positioning

### Dropdown/Popover Anchoring

| Trigger Position | Popover Position |
|------------------|------------------|
| Inline property | `top-left` of popover → `bottom-left` of trigger |
| Icon/avatar | `top-left` of popover → `bottom-left` of trigger |
| Button | `top-left` of popover → `bottom-left` of trigger |

**Flip behavior:** If popover would overflow viewport, flip to above trigger.

### Z-Index Layering

```
z-0:  Page content
z-10: Sticky headers
z-20: Dropdowns/Popovers (current interaction)
z-30: Modals (if any)
z-40: Toasts/Notifications
```

Popovers cast a subtle shadow on content below but do not shift layout.

---

## 7. Application to Salary Book

### Where These Patterns Apply

| Salary Book Element | Pattern | Notes |
|---------------------|---------|-------|
| **Filter toggles** | Inline property editor | Already implemented as checkboxes; could become dropdowns for multi-select |
| **Player row details** | Progressive disclosure | Hover reveals additional context; click pushes to sidebar |
| **Sidebar entity switching** | Optimistic UI | Click replaces instantly, no loading gate |
| **Draft pick editing** (future) | Inline property editor | Click pick → edit protections/details in popover |
| **Exception management** (future) | Inline property editor | Click exception → edit amount/expiry inline |

### Not Applicable

- **Salary values** — Read-only (source of truth is Postgres)
- **Team totals** — Computed, not editable
- **Historical data** — Immutable

### Potential Additions

1. **Quick status on player rows** — Click a status chip to change player status (e.g., "Injured", "Day-to-Day") if we add that data
2. **Keyboard navigation in sidebar** — `j`/`k` to move between players, `Enter` to select
3. **Search with auto-focus** — Command palette pattern for jumping to players/teams

---

## Summary

| Pattern | Key Behavior |
|---------|--------------|
| **Inline Property Editor** | Click value → dropdown → select → instant commit |
| **Keyboard Accelerators** | Hidden until context active; 1-5 for quick selection |
| **Asset Picker** | Tabs + search + facets; fixed container, scrollable grid |
| **Optimistic UI** | No save buttons, no spinners; changes reflect instantly |
| **Progressive Disclosure** | Shortcuts/details revealed on hover, not always visible |
| **Contextual Anchoring** | Popovers anchor to trigger, flip if needed |
