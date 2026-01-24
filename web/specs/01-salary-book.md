# NBA Salary Book — Unified Interface Specification (Revised)

## Core Thesis

A front-office tool where **scroll position drives context**. The main view is a continuous scroll of team salary tables; a contextual sidebar responds to both viewport position and explicit entity selection. The top bar serves as navigation, filtering, and scroll-spy indicator.

### Three Pillars

1. **Rows are the product** — The salary table is the primary surface: dense, scannable, spreadsheet-like with thoughtful UX affordances (sticky headers, grouping, sub-rows, tags)
2. **Context follows the user** — The system always knows which team you're "in" based on scroll position; the sidebar reflects this automatically
3. **Navigation is never modal** — You can keep scrolling while viewing entity details; Back returns to *current* context, not where you started

### The Job To Be Done

Enable a front office user to **scan multi-team cap sheets quickly**, then **drill into any entity** (player/pick/agent/team) without losing their place.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       TOP COMMAND BAR (Fixed)                           │
│  ┌───────────────────────────────┐  ┌─────────────────────────────────┐ │
│  │   Team Selector Grid          │  │   Filter Toggles                │ │
│  │   (Nav + Scroll-spy status)   │  │   (Display / Financial / Etc)  │ │
│  └───────────────────────────────┘  └─────────────────────────────────┘ │
├─────────────────────────────────────────────┬───────────────────────────┤
│                                             │                           │
│      MAIN CANVAS (~70%)                     │    SIDEBAR (~30%)         │
│      Single vertical scroll                 │    Independent scroll     │
│                                             │                           │
│  ┌───────────────────────────────────────┐  │  ┌─────────────────────┐  │
│  │ ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓ │  │  │                     │  │
│  │ ┃ TEAM A HEADER (sticky)            ┃ │  │  │  DEFAULT MODE:      │  │
│  │ ┃ ┌───────────────────────────────┐ ┃ │  │  │  Team context from  │  │
│  │ ┃ │ Table Header Row 1 (groups)   │ ┃ │  │  │  scroll position    │  │
│  │ ┃ │ Table Header Row 2 (columns)  │ ┃ │  │  │                     │  │
│  │ ┃ └───────────────────────────────┘ ┃ │  │  │  ─────────────────  │  │
│  │ ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛ │  │  │                     │  │
│  │   │ Player Row (double-height)    │   │  │  │  ENTITY MODE:       │  │
│  │   │ Player Row (double-height)    │   │  │  │  Pushed detail view │  │
│  │   │ ...                           │   │  │  │  with [Back] button │  │
│  │   │ Draft Assets Row              │   │  │  │                     │  │
│  │   │ Totals Footer                 │   │  │  │  Back → returns to  │  │
│  │   └───────────────────────────────┘   │  │  │  CURRENT team, not  │  │
│  │                                       │  │  │  where you started  │  │
│  │  ┌────────────────────────────────┐   │  │  │                     │  │
│  │  │ TEAM B HEADER (pushes A off)   │   │  │  └─────────────────────┘  │
│  │  │ ...                            │   │  │                           │
│  └──┴────────────────────────────────┴───┘  │                           │
│                                             │                           │
└─────────────────────────────────────────────┴───────────────────────────┘
```

**Key constraint:** One primary vertical scroll for all teams in the main canvas. No nested vertical scroll areas.

---

## 1. Top Command Bar

### 1.1 Team Selector Grid

**Purpose:** Navigate to teams + see current scroll position at a glance

**Layout:** Two conference blocks, each with **3 rows of 5 teams, sorted alphabetically**

```
┌─────────────────────────────────────────────────────────────────────────┐
│  EASTERN                                                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │ ATL │ │ BKN │ │ BOS │ │ CHA │ │ CHI │                               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │ CLE │ │ DET │ │ IND │ │ MIA │ │ MIL │                               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │ NYK │ │ ORL │ │ PHI │ │ TOR │ │ WAS │                               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                               │
│                                                                         │
│  WESTERN                                                                │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │ DAL │ │ DEN │ │ GSW │ │ HOU │ │ LAC │                               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │ LAL │ │ MEM │ │ MIN │ │ NOP │ │ OKC │                               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                               │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐                               │
│  │ PHX │ │ POR │ │ SAC │ │ SAS │ │ UTA │                               │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘                               │
└─────────────────────────────────────────────────────────────────────────┘
```

**Visual States:**

| State | Visual Treatment | Meaning |
|-------|------------------|---------|
| **Active** | Strong highlight (filled background) | Currently in viewport (scroll-spy) |
| **Loaded** | Subtle indicator (e.g., dot, border) | Team is in the scrollable canvas |
| **Unloaded** | Muted/dimmed | Team not currently loaded |

**Interactions:**

| Action | Result |
|--------|--------|
| **Click** | Jump/scroll to team (adds to canvas if not loaded) |
| **Shift+Click** | Toggle team in/out of loaded canvas without scrolling |
| **Alt+Click** | "Only this team" — isolate single team view |

**Acceptance Criteria:**
- Clicking a team always results in that team becoming visible and the active section
- If the team is not currently loaded, it gets added and then scrolled to
- Active team highlight updates smoothly during scroll (no flicker)
- Alphabetical order is consistent: reading left-to-right, top-to-bottom spells out teams A→Z within each conference

### 1.2 Filter Toggles

**Purpose:** Shape table content without changing navigation state

**Filter Groups:**

```
┌──────────────────────────────────────────────────────────────┐
│  Display           │  Financials        │  Contracts         │
│  ☑ Cap Holds       │  ☑ Tax/Aprons      │  ☑ Options         │
│  ☑ Exceptions      │  ☐ Cash vs Cap     │  ☑ Incentives      │
│  ☑ Draft Picks     │  ☐ Luxury Tax      │  ☐ Kickers         │
│  ☐ Dead Money      │                    │  ☑ Two-Way         │
└──────────────────────────────────────────────────────────────┘
```

**Behavior:**
- Filters affect:
  - Which rows appear (e.g., show/hide cap holds)
  - Which tags/metadata are displayed (e.g., option badges)
  - Which table sections appear (e.g., draft picks row)
- Filters do **NOT** change sidebar state or navigation
- Future: Presets ("Trade Deadline View", "Offseason View") + Save/Reset

---

## 2. Main Canvas — Team Salary Books

Each team renders as a **section** containing:
1. Team Header (sticky)
2. Table Header (sticky, attached to team header)
3. Player Rows (double-height)
4. Draft Assets Row
5. Totals Footer

### 2.1 Section Header Sticky Behavior (iOS Contacts Pattern)

**Goal:** The team header behaves like iOS Contacts letter headers—it "sticks" to the top while you're within that team's section. When the next team arrives, it **pushes the previous header off**.

```
SCROLLING DOWN...

┌─────────────────────────────┐
│ ████ CELTICS ██████████████ │ ← Team A header stuck at top
│ ┌─────────────────────────┐ │
│ │ Player Info │ Contract  │ │ ← Table header stuck below
│ └─────────────────────────┘ │
│   Marcus Smart  │ $12M ... │
│   Jaylen Brown  │ $28M ... │
│                             │
│ ████ LAKERS ███████████████ │ ← Team B header PUSHES Team A off
│ ┌─────────────────────────┐ │
│ │ Player Info │ Contract  │ │
└─────────────────────────────┘
```

**The Sticky Stack (while viewing a team section):**
1. Team Header
2. Table Header Row 1 (category band)
3. Table Header Row 2 (column labels)

**Critical Requirements:**
- Team header + table header are **ONE sticky group** (not separate layers)
- Headers have opaque backgrounds — no content visible "behind" them
- No dead space/gap appears when headers become sticky
- Transition between teams is smooth push (outgoing slides up as incoming arrives)
- No remnants of the previous team's header left on screen

### 2.2 Table Structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│                              TABLE HEADER                                 │
├────────────────────┬─────────────────────────────────┬───────────────────┤
│   PLAYER INFO      │        CONTRACT YEARS           │    MANAGEMENT     │  ← Row 1: Groups
├──────┬─────┬───────┼───────┬───────┬───────┬─────────┼─────────┬─────────┤
│ Name │ Pos │ Exp   │ 24-25 │ 25-26 │ 26-27 │ 27-28   │ Agent   │ Agency  │  ← Row 2: Columns
├──────┴─────┴───────┼───────┴───────┴───────┴─────────┼─────────┴─────────┤
│      STICKY        │          SCROLLS HORIZONTALLY   │      SCROLLS      │
│     (left edge)    │                                 │                   │
└────────────────────┴─────────────────────────────────┴───────────────────┘
```

**Column Groups:**

| Group | Columns | Behavior |
|-------|---------|----------|
| **Player Info** | Name, Pos, Exp/Age | Sticky on left during horizontal scroll |
| **Contract Years** | 5-year horizon (e.g., 24-25 through 28-29) | Scrollable center |
| **Management** | Agent, Agency | Scrollable right |

**Horizontal Scroll:**
- Left columns remain fixed during horizontal scroll
- Visual separator (shadow or border) indicates sticky edge
- Sticky left columns remain aligned across both sub-rows of each player

### 2.3 The Double-Row Player Design

Each player occupies **TWO visual rows that behave as ONE unit**:

```
┌────────────────────┬───────────────────────────────────┬─────────────────┐
│ LeBron James       │  $47.6M  │  $50.4M  │  —   │  —   │ Rich Paul       │  ← PRIMARY ROW
│ SF • 21 yrs • 39   │  GTD     │  PO      │      │      │ Klutch Sports   │  ← METADATA ROW
├────────────────────┼───────────────────────────────────┼─────────────────┤
│ Anthony Davis      │  $40.6M  │  $43.2M  │ $46M │  —   │ Rich Paul       │
│ PF • 11 yrs • 31   │  GTD     │  GTD     │  ETO │      │ Klutch Sports   │
└────────────────────┴───────────────────────────────────┴─────────────────┘
```

**Primary Row (Row A) — High contrast, primary scan:**
- Player name (prominent weight)
- Salary figures per year (monospace for alignment)
- Agent name (clickable)

**Metadata Row (Row B) — Lower contrast, supporting info:**
- Position chip + Experience + Age
- Guarantee structure per year (GTD, partial %, non-gtd)
- Free agency type + year (UFA, RFA)
- Option flags per year (PO = Player Option, TO = Team Option, ETO = Early Termination)
- Bird rights status (Bird / Early Bird / Non-Bird)
- Agency name (clickable, may differ from agent if needed)

**Interaction:**
- Hover highlights **BOTH rows** as one unit
- Click anywhere on either row → opens Player entity in sidebar
- Click agent/agency name specifically → opens Agent entity (stop propagation)

**Acceptance Criteria:**
- The double-row reads as a single unit visually
- Horizontal sticky columns remain perfectly aligned across both sub-rows

### 2.4 Draft Assets Row

```
┌──────────────────────────────────────────────────────────────────────────┐
│  DRAFT ASSETS                                                            │
├────────────────────┬───────────────────────────────────┬─────────────────┤
│                    │  2025   │  2026   │  2027  │ 2028 │                 │
│  Incoming Picks    │ [LAL 1] │ [--]    │ [BOS 2]│ [--] │                 │
│                    │ [MIA 2] │         │        │      │                 │
└────────────────────┴───────────────────────────────────┴─────────────────┘
```

**Spec:**
- Pick "pills" aligned under corresponding year columns
- Each pill shows origin team + round (e.g., "LAL 1" = Lakers 1st round pick)
- Each pill is clickable → opens Pick entity in sidebar
- Visibility controlled by "Draft Picks" filter toggle
- Can show multiple picks per year (stacked vertically within the cell)

### 2.5 Totals Footer

```
┌──────────────────────────────────────────────────────────────────────────┐
│  TOTALS            │ $142.3M │ $138.7M │ $89.2M │ $45M │                 │
│  Cap Space         │  -$12M  │  +$2.1M │ +$51M  │      │                 │
│  Tax Line          │  $17.8M │  $8.2M  │ UNDER  │      │                 │
└──────────────────────────────────────────────────────────────────────────┘
```

**Design Decision:** Non-sticky totals row at section bottom.

**Rationale:** Sticky footers create significant complexity when combined with sticky headers and the section-pushing behavior. Instead:
- Non-sticky totals row always visible at the end of each team section
- **Optional:** Mini-totals line in the team header (current year salary + cap space) for at-a-glance reference while scrolling through players

---

## 3. Scroll-Spy System

### Definition: "Active Team"

The team whose section header is currently stuck at the top, OR (if no header is stuck) whose section top is closest to the viewport top.

**Recommended Rule:** Active = the team whose section header is currently in the "sticky" position. This is more stable than intersection ratio sorting.

### Scroll-Spy Outputs

| Output | Behavior |
|--------|----------|
| **Top Bar** | Active team is highlighted in selector grid |
| **Sidebar** | If in default mode, shows active team's context |

### Rules

- Active team updates during scroll with **no flicker**
- When multiple teams partially visible, prioritize the one whose header is stuck
- Jump-to-team (via top bar click) triggers immediate active team update once scroll settles
- Scroll-spy does **not** change sidebar state if an entity detail view is open

**Acceptance Criteria:**
- Active team changes predictably during scroll
- Jumping to a team updates active team and sidebar base context accordingly

---

## 4. Sidebar — Intelligence Panel

### State Machine

```
                         ┌──────────────────┐
                         │   DEFAULT MODE   │
           ┌────────────▶│  (Team Context)  │◀────────────┐
           │             └────────┬─────────┘             │
           │                      │                       │
     scroll to new          click entity             [Back] from
     team (updates               │                   last entity
      default view)              ▼                       │
           │             ┌──────────────────┐             │
           │             │   ENTITY MODE    │─────────────┘
           └─────────────│  (Detail View)   │
             (no change) └────────┬─────────┘
                                  │ click deeper entity
                                  ▼
                         ┌──────────────────┐
                         │  DEEPER ENTITY   │───┐
                         │   (Stack +1)     │   │ [Back]
                         └──────────────────┘◀──┘
```

### 4.1 Default Mode (Team Context)

When no entity is selected, sidebar shows the **active team from scroll-spy**:

```
┌─────────────────────────────────┐
│  [LOGO]  BOSTON CELTICS         │
│  Eastern Conference             │
│                                 │
│  ┌─────────────┬─────────────┐  │
│  │ Cap Outlook │ Team Stats  │  │  ← Tab toggle
│  └─────────────┴─────────────┘  │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Total Salary    $192.4M    ││
│  │ Cap Space       -$22.1M    ││
│  │ Tax Apron       $11.2M over││
│  │ Luxury Tax Bill $48.3M     ││
│  │ ...                        ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🤖 AI Analysis             ││
│  │ "Cap flexibility limited   ││
│  │  until 2026 when Brown's   ││
│  │  extension kicks in..."    ││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

**Tabs:**
- **Cap Outlook:** Financial health, cap space projections, tax thresholds, exception availability
- **Team Stats:** Record, standings, efficiency metrics (future)

### 4.2 Entity Mode (Pushed Detail)

When user clicks an entity, detail view **pushes** onto sidebar stack:

```
┌─────────────────────────────────┐
│  ← Back                         │  ← Returns to CURRENT viewport team
├─────────────────────────────────┤
│                                 │
│  [PLAYER PHOTO]                 │
│                                 │
│  JAYLEN BROWN                   │
│  SG/SF • Boston Celtics         │
│                                 │
│  Contract: 5yr / $285M          │
│  Through: 2028-29               │
│  Bird Rights: Yes               │
│                                 │
│  ┌─────────────────────────────┐│
│  │ Year-by-Year Breakdown     ││
│  │ 24-25: $49.2M (GTD)        ││
│  │ 25-26: $52.4M (GTD)        ││
│  │ ...                        ││
│  └─────────────────────────────┘│
│                                 │
│  ┌─────────────────────────────┐│
│  │ 🤖 AI Analysis             ││
│  │ "Extension-eligible in     ││
│  │  2026. Trade value high..."││
│  └─────────────────────────────┘│
└─────────────────────────────────┘
```

### 4.3 Entity Types

| Entity | Triggered By | Detail Content |
|--------|--------------|----------------|
| **PLAYER** | Click player row | Photo, contract breakdown, guarantee structure, extension eligibility, AI insights |
| **TEAM** | Click team name in section header | Same as default view, but "pinned" — doesn't change on scroll. Header should indicate "TEAM REPORT" vs default mode |
| **AGENT** | Click agent/agency name | Agency info, client list with links back to players |
| **PICK** | Click draft pick pill | Pick metadata, protections, origin team, destination team, conveyance history |

### 4.4 Back Navigation (Critical Behavior)

**The key insight:** Back returns to the *current* viewport team, not where you started.

**Scenario:**
1. User scrolled to Celtics, clicks Jaylen Brown
2. Sidebar shows Jaylen Brown detail
3. While viewing, user scrolls main canvas to Lakers
4. User clicks Back
5. **Result:** Sidebar shows Lakers team context (not Celtics)

**Rationale:** The sidebar should stay grounded in what you're currently looking at. If you've scrolled away, you care about your new position, not your origin.

**Stack Behavior:**
- Clicking entity → **pushes** view onto sidebar stack
- Back button → **pops** stack
- Empty stack → return to **default mode** (showing current active team from scroll-spy)

**Acceptance Criteria:**
- You can open Player A, scroll to another team, press Back → you land in default mode for the *new* active team
- Deep navigation works: Player → Agent → Back → Back → default mode (current team)

---

## 5. Interaction Catalog

| Surface | Click Action | Sidebar Result |
|---------|--------------|----------------|
| **Team name** in section header | Push Team entity | Entity mode: team pinned (won't change on scroll) |
| **Player row** (either sub-row) | Push Player entity | Entity mode: player detail |
| **Agent name** | Push Agent entity | Entity mode: agent detail |
| **Agency name** | Push Agent entity | Entity mode: agency/agent detail |
| **Draft pick pill** | Push Pick entity | Entity mode: pick detail |
| **Top bar team abbreviation** | Jump scroll to team | No sidebar change if entity mode; updates default view via scroll-spy |
| **Sidebar Back button** | Pop entity stack | Previous entity, or default mode (current team) |

---

## 6. Sticky Behavior Requirements

Because sticky headers are the hardest part to get right:

### Sticky Layers (Z-Order, top to bottom)

1. **Top Command Bar** — Fixed to viewport top, highest z-index
2. **Team Header + Table Header** — Sticky to main canvas scroll container top, ONE combined group
3. **Sticky Left Columns** — Sticky horizontally, below headers in z-order
4. **Regular table cells** — Lowest z-order

### Visual Requirements

| Requirement | Acceptance Criteria |
|-------------|---------------------|
| **Opaque backgrounds** | Table rows never visible "through" sticky elements |
| **No phantom spacing** | When header becomes sticky, no blank strip appears above |
| **Clean transitions** | Next team's header pushes previous smoothly off-screen |
| **Horizontal alignment** | Sticky left columns align perfectly across both sub-rows |
| **Correct z-order** | Sticky left columns appear above scrolling cells but below sticky headers and top command bar |

### Implementation Guidance

Treat team header + table header as a **single sticky unit**. Splitting them into separate sticky layers is the source of most gap/bleed-through bugs. The "sticky stack" for a team section should behave as one cohesive block.

---

## Summary

| Concept | Description |
|---------|-------------|
| **Scroll-Driven Context** | Sidebar reflects what's visible; active team determined by scroll-spy |
| **Alphabetical Team Grid** | 3 rows × 5 teams per conference, sorted A→Z |
| **Pushable Entity Details** | Clicking entities pushes detail views onto sidebar stack |
| **Smart Back Navigation** | Returns to current viewport team, not origin |
| **Contact-Style Headers** | Team + table header stick together, pushed off by next team |
| **Double-Row Players** | Two rows per player for density without sacrificing information |
| **Top Bar Dual Purpose** | Team grid shows scroll position AND enables navigation |
| **Filters Without Navigation** | Toggles shape content but don't affect sidebar state |
