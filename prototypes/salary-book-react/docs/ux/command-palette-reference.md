# Command Palette / Omnibar — UX Reference Analysis

> Captured interaction patterns from a search/command palette UI (GitHub-style). This demonstrates keyboard-first navigation, type-ahead filtering, and focus-driven state management.

## Why This Reference Exists

Command palettes are the gold standard for:
- Keyboard-first interaction
- Fast navigation across heterogeneous content types
- Progressive disclosure without spatial overhead

---

## 1. Core State Machine

```
IDLE
    --[Click Input / Keyboard Shortcut]--> OPEN_DEFAULT

OPEN_DEFAULT (shows recent/suggested items)
    --[Arrow Down/Up]--> OPEN_NAVIGATING
    --[Character Input]--> OPEN_FILTERING
    --[Esc / Click Outside]--> IDLE

OPEN_NAVIGATING (keyboard selection active)
    --[Character Input]--> OPEN_FILTERING
    --[Enter]--> ACTION_EXECUTED
    --[Esc]--> IDLE

OPEN_FILTERING (search query active)
    --[Character Input / Backspace]--> OPEN_FILTERING (re-filter)
    --[Arrow Down/Up]--> OPEN_FILTERING (move selection)
    --[Enter]--> ACTION_EXECUTED
    --[Esc]--> IDLE

ACTION_EXECUTED (terminal)
    → Navigate to entity / Execute command / Close palette
```

### Key Insight
Three sub-states within "open": default (no query), navigating (keyboard moving), filtering (query active). All three support the same exit paths (Esc, Enter, click outside).

---

## 2. Keyboard-First Navigation

### Input Mapping
| Key | Behavior |
| :--- | :--- |
| `Cmd+F` (or similar) | Open palette from anywhere |
| `Arrow Down` | Move selection to next item |
| `Arrow Up` | Move selection to previous item |
| `Enter` | Execute selected item's action |
| `Esc` | Close palette, return to previous context |
| `Backspace` | Remove character, re-filter (may expand results) |
| Any character | Append to query, filter results |

### Selection Model
- Exactly one item is "active" at any time
- Keyboard arrows move selection sequentially
- Mouse hover ALSO moves selection (overrides keyboard position)
- Selection is visual only until Enter/Click commits

### Keyboard + Mouse Coexistence
```
User presses Arrow Down → Item 2 selected
User presses Arrow Down → Item 3 selected
User hovers Item 1      → Item 1 selected (mouse overrides)
User presses Arrow Down → Item 2 selected (keyboard resumes from mouse position)
```

This prevents the jarring experience of keyboard and mouse fighting for control.

---

## 3. Type-Ahead Filtering

### Behavior
```
Query: ""      → Show default/recent items
Query: "f"     → Filter to items containing "f"
Query: "fin"   → Filter to items containing "fin"
Query: "fi"    → (Backspace) Re-expand to items containing "fi"
```

### Characteristics
- **Immediate**: No debounce visible; results update on every keystroke
- **Substring match**: Not just prefix; "fin" matches "Define" and "Finish"
- **Case insensitive**: Standard for search UX
- **No "search" button**: Pure type-ahead, no submit action

---

## 4. Heterogeneous Result Types

### Pattern
A single search returns multiple entity types, visually distinguished by icons/gutters.

### Visual Guttering
- Left-aligned icons in fixed-width column
- User scans icons to identify category before reading text
- Reduces cognitive load when results are mixed

### Item Anatomy
```
┌──────┬────────────────────────────┬──────┐
│ Icon │ Primary Text               │ Hint │
│      │ Secondary Text (metadata)  │      │
└──────┴────────────────────────────┴──────┘
```

- **Icon**: Category indicator (in the video: GitHub logo, project circles, cogwheels)
- **Primary**: Entity name or action label
- **Secondary**: Context/metadata (paths like "Team / Build and Deployment / Settings")
- **Hint**: Keyboard shortcut if applicable (right-aligned, e.g., "Esc")

---

## 5. Spatial Layout Rules

### Positioning
```
┌─────────────────────────────────────────┐
│                                         │
│         ┌───────────────────┐           │
│         │ 🔍  Find...       │  ← Input (fixed at top)
│         ├───────────────────┤           │
│         │ Result 1          │           │
│         │ Result 2          │  ← Dropdown expands DOWN
│         │ Result 3          │           │
│         └───────────────────┘           │
│                                         │
└─────────────────────────────────────────┘
```

### Rules
| Aspect | Rule |
| :--- | :--- |
| Horizontal | Centered in viewport |
| Vertical | Centered (observed) |
| Expansion | Downward only; input stays at top of stack |
| Width | Fixed; dropdown matches input width exactly |
| Z-index | Above all other content |

---

## 6. Context Propagation

### Immediate Feedback
As user types, list content updates instantly without a submission step.

### Focus-Driven Selection
Only one item holds "active" state. Mouse hover overrides keyboard position; keyboard overrides mouse position. They coexist without conflict.

### Search-Term Sync
The "Navigation Assistant" item at the bottom dynamically quotes the current query string (e.g., showing `"fin"` or `"de"`). This provides a fallback action when no exact match exists.

---

## 7. Progressive Disclosure

### Initial Hidden State
The list of results (projects, settings, branches) is completely hidden until input receives focus.

### Secondary Information
Item metadata (e.g., "folio-v2", "pull request #1234") only appears within the expanded state.

### Contextual Actions
The "Navigation Assistant" only becomes prominent when user input doesn't perfectly match a primary object — offers an alternative path rather than a dead-end.

---

## 8. Key UX Patterns Observed

| Pattern | Implementation |
| :--- | :--- |
| Command Palette / Omnibar | Single entry point for various data types (Projects, Branches, Settings, Help) |
| Type-ahead Filtering | Results narrow based on string matching as user types |
| Keyboard-First Navigation | Explicit affordances (Esc hint, selection highlights) for mouse-free use |
| Ghost/Placeholder Text | "Find..." communicates function before interaction |
| Visual Guttering | Distinct icons allow scanning categories before reading text |

---

## 9. Interaction Inventory

| Trigger | Target | Result |
| :--- | :--- | :--- |
| Click input | Search bar | Focus, expand dropdown, show defaults |
| Keyboard shortcut | Global | Open palette, focus input |
| `Arrow Down` | List | Move selection down |
| `Arrow Up` | List | Move selection up |
| `Esc` | Palette | Dismiss, return to idle |
| Character input | Input | Filter list in real-time, update Navigation Assistant |
| `Backspace` | Input | Re-filter, may expand to broader results |
| Mouse hover | List item | Move selection to hovered item |
| `Enter` / Click | Selected item | Execute action |

---

## References

- Source: Gemini analysis of GitHub-style command palette video
- Related: `prototypes/salary-book-react/docs/ux/anime-docs-reference.md`
- Related: `prototypes/salary-book-react/docs/ux/iconsax-reference.md`
