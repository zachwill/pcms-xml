# Entity Workspaces — Interface Specification

> Feb 2026 — Design spec for entity pages (`/players/*`, `/teams/*`, `/agents/*`, etc.)

## Problem Statement

The current entity pages are sprawling, section-heavy vertical scrolls with:
- No clear information hierarchy
- Heavy reliance on `<details>` to hide complexity instead of organizing it
- No consistent structure across entity types
- No scrollspy/wayfinding for long pages
- Missing the "answer first, proof second" pattern that makes Salary Book scannable

They read like **database dumps**, not **front-office instruments**.

---

## Core Thesis

An entity page is a **mini-workbench** — not a documentation page, not a form, not a card grid.

### Three Pillars (borrowed from Salary Book)

1. **Answer first, proof second** — Lead with derived facts and constraint state, then show the supporting tables.
2. **Scroll is the navigation** — One primary scroll with scrollspy-highlighted local nav; avoid hidden tabs.
3. **Everything pivots** — Every datum should link to a related entity or filtered view.

### The Job To Be Done

Enable a front office user to **understand an entity's current state and constraints at a glance**, then **drill into provenance and history** without losing context.

---

## Entity Type → Primary Job

Each entity type answers a distinct question:

| Entity | Primary Question | Secondary Questions |
|--------|------------------|---------------------|
| **Player** | "What's this player's contract situation?" | Trade restrictions? Options? Guarantees? History? |
| **Team** | "What's this team's cap posture?" | Roster composition? Exceptions? Pick assets? |
| **Agent** | "Who does this agent represent, and what's the book worth?" | Historical signings? Team distribution? |
| **Agency** | "What's this agency's roster and footprint?" | Agent roster? Historical trends? |
| **Transaction** | "What happened in this transaction?" | Cap impact? Parties involved? |
| **Trade** | "What assets moved, between whom?" | Leg breakdown? Cap math? |
| **Draft Selection** | "Who was picked, when, where?" | Pick provenance? Trade history? |
| **Draft Pick** | "Who owns this pick, what's the protection?" | Trade chain? Swap rights? |

---

## Layout Structure (All Entity Types)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                       ENTITY HEADER (Sticky, ~80px)                     │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │ Breadcrumb · Scoped Search                                          ││
│  │ H1 Entity Name + Type Badge              [Open in Salary Book]      ││
│  │ Subtitle (context line: team, status, key dates)                    ││
│  └─────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌───────────────┐  ┌─────────────────────────────────────────────────┐ │
│  │ LOCAL NAV     │  │  MAIN CONTENT                                   │ │
│  │ (scrollspy)   │  │                                                 │ │
│  │               │  │  ┌───────────────────────────────────────────┐  │ │
│  │ ● Vitals      │  │  │ VITALS (KPI strip, constraint posture)   │  │ │
│  │ ○ Connections │  │  └───────────────────────────────────────────┘  │ │
│  │ ○ Contract    │  │                                                 │ │
│  │ ○ History     │  │  ┌───────────────────────────────────────────┐  │ │
│  │ ○ Ledger      │  │  │ CONNECTIONS (pivots to related entities) │  │ │
│  │               │  │  └───────────────────────────────────────────┘  │ │
│  │ w-48          │  │                                                 │ │
│  │ sticky        │  │  ┌───────────────────────────────────────────┐  │ │
│  │ top-[header]  │  │  │ PRIMARY TABLE (contract, roster, etc.)   │  │ │
│  └───────────────┘  │  └───────────────────────────────────────────┘  │ │
│                     │                                                 │ │
│                     │  ┌───────────────────────────────────────────┐  │ │
│                     │  │ HISTORY / LEDGER / AUDIT                  │  │ │
│                     │  └───────────────────────────────────────────┘  │ │
│                     │                                                 │ │
│                     └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘
```

**Key constraints:**
- **Local nav is sticky** and uses scrollspy (not tabs that hide content)
- **Vitals are always visible** at the top of the scroll
- **Connections come early** — pivots are how users navigate
- **Tables/audit at the bottom** — proof follows assertion

---

## Module Vocabulary

All entity pages share a common module vocabulary. Not every entity needs every module.

### 1. Vitals (KPI Strip)

**Purpose:** Answer the primary question in 2–4 numbers.

**Layout:** Horizontal strip of 3–6 compact cards, each showing:
- Label (10px uppercase muted)
- Value (16–20px bold mono)
- Optional: delta indicator, warning chip

**Examples by entity:**
- **Player:** Cap 2025, Total from 2025, Years remaining, Trade restriction status
- **Team:** Cap space, Room under tax, Room under 1st apron, Roster count
- **Agent:** Client count, Cap 2025 total, Team count

**Rules:**
- Numbers are `font-mono tabular-nums`
- Negative values are red, positive green (where semantics apply)
- Vitals do NOT expand into tables — they link to the proof section

### 2. Constraint Posture

**Purpose:** Show blocking conditions and restrictions at a glance.

**Layout:** Chip row below vitals, showing active constraints.

**Examples:**
- **Player:** `Trade restricted until Jan 15` · `No-trade clause` · `PO 2027`
- **Team:** `Above 1st apron` · `Hardcapped` · `No MLE available`
- **Agent:** (rarely needed — client-level constraints instead)

**Rules:**
- Chips link to the relevant proof (e.g., constraint → transaction that triggered it)
- Use semantic colors: muted (info), warning (partial restriction), danger (hard block)
- Empty state: "No active restrictions" (muted, not prominent)

### 3. Connections

**Purpose:** Pivot to related entities.

**Layout:** 2–3 column grid of connection cards.

**Card anatomy:**
- Entity type label (10px uppercase muted)
- Entity name (linked, bold)
- Context line (optional: role, date range, status)

**Examples by entity:**
- **Player:** Team (current), Agent, Agency, Draft selection
- **Team:** (skip — connections are the roster)
- **Agent:** Agency
- **Trade:** Teams involved (as a row of logos/codes)

**Rules:**
- Every connection is a link
- Show "Unknown" or "—" for missing data (not empty cards)
- Connection cards do NOT show salary — that's for Vitals/tables

### 4. Primary Table

**Purpose:** The authoritative proof for the entity's current state.

**Examples by entity:**
- **Player:** Contract horizon (year × salary/guarantee/option grid)
- **Team:** Roster breakdown (players grouped by cap status)
- **Agent:** Client list (player × team × cap 2025)
- **Transaction:** Parties table (team × player × cap change)

**Layout:**
- Uses `.entity-table` class (dense, monospace numbers, yellow hover)
- Sticky left column for identity
- Horizontal scroll if needed

**Rules:**
- Show the primary table *above* the ledger/history tables
- Primary table should answer: "What is the current state?"

### 5. Provenance Tables (Collapsed)

**Purpose:** Audit trail and supporting detail.

**Examples:**
- **Player:** Contract chronology, version rollup, protection conditions, bonus details
- **Team:** Exception usage, ledger entries, apron provenance
- **Agent:** Historical signing trend, historical footprint rollup

**Layout:**
- Wrapped in `<details>` with summary count
- Opens to a dense table

**Rules:**
- Collapsed by default
- Summary shows row count
- Tables use same styling as primary tables
- These are "proof" — they back up Vitals/Primary Table assertions

### 6. Ledger / Timeline

**Purpose:** Show what happened, in order.

**Layout:**
- Dense table: Date | Event type | Amount/Delta | Link to transaction
- Most recent first (reverse chronological)

**Rules:**
- Ledger is *not* the primary table (it's proof)
- Limit to 30 rows visible; show "Show all" link if more
- Every row links to the underlying transaction

---

## Entity-Specific Layouts

### Player (`/players/:slug`)

**Sections (in order):**

1. **Vitals**
   - Cap 2025 | Total from 2025 | Years remaining | Trade status chip
   
2. **Constraint Posture**
   - Trade restriction chips, no-trade clause, option indicators

3. **Connections**
   - Team (current) | Agent | Agency | Draft selection

4. **Contract Horizon** (Primary Table)
   - Year × (Cap | Option | Guarantee status)
   - Horizontal strip layout (current) is good
   - Add year-column clickability (filter Salary Book to that year?)

5. **Contract History** (Collapsed)
   - Contract chronology table
   - Version rollup table

6. **Guarantees + Protections** (Collapsed)
   - Guarantee matrix table
   - Protection conditions table

7. **Incentives** (Collapsed)
   - Bonus rows table
   - Bonus maximums

8. **Ledger Timeline** (Collapsed)
   - Recent ledger entries table

9. **Team History**
   - Pill row (current implementation is fine, but move below ledger)

---

### Team (`/teams/:slug`)

**Sections (in order):**

1. **Vitals** (Cap Vitals partial — already exists, refine)
   - Cap space | Room under tax | Room under 1st apron | Room under 2nd apron | Roster count

2. **Constraint Posture**
   - Apron status chips, hardcap indicator, MLE availability

3. **Roster Breakdown** (Primary Table)
   - Standard roster
   - Two-way roster
   - Cap holds subsection
   - Exceptions subsection
   - Dead money subsection
   - (Current partial is good — densify further)

4. **Draft Pick Assets**
   - Year-by-year pick grid (current partial is good)

5. **Cap Horizon Table**
   - Multi-year salary totals (current partial is good)

6. **Apron Provenance** (Collapsed)
   - Year × apron status × reason × constraint lines

7. **Two-Way Capacity** (Collapsed)
   - Capacity KPIs + watchlist table

8. **Transaction Activity** (Collapsed)
   - Recent ledger table
   - Exception usage table

---

### Agent (`/agents/:slug`)

**Sections (in order):**

1. **Vitals**
   - Client count | Teams represented | Cap 2025 total | Total from 2025

2. **Connections**
   - Agency (single card)

3. **Team Distribution** (Primary Table)
   - Team × client count × cap total
   - Sorted by cap total desc

4. **Client List**
   - Player × team × cap 2025 × total × flags

5. **Book by Season** (Collapsed)
   - Year × player count × cap total × tax total

6. **Historical Footprint** (Collapsed)
   - Signing trend table
   - Footprint rollup KPIs

---

### Agency (`/agencies/:slug`)

**Sections (in order):**

1. **Vitals**
   - Agent count | Client count | Cap 2025 total

2. **Agent Roster** (Primary Table)
   - Agent × client count × cap 2025 total

3. **Team Distribution**
   - Team × client count × cap total

4. **Historical Footprint** (Collapsed)

---

### Transaction (`/transactions/:id`)

**Sections (in order):**

1. **Vitals**
   - Transaction date | Type | Description

2. **Constraint Posture**
   - Apron impact, trade restriction trigger

3. **Parties** (Primary Table)
   - Team × player × cap change × tax change

4. **Trade Context** (if trade_id present)
   - Link to trade page, leg position

5. **Ledger Impact**
   - Ledger rows created by this transaction

---

### Trade (`/trades/:id`)

**Sections (in order):**

1. **Vitals**
   - Trade date | Leg count | Teams involved (logo strip)

2. **Leg Breakdown** (Primary Table)
   - Leg × team → team × assets (players, picks)

3. **Cap Math Summary**
   - Per-team: outgoing salary, incoming salary, cap impact

4. **Transactions** (Collapsed)
   - All transactions in this trade

---

### Draft Selection (`/draft-selections/:slug`)

**Sections (in order):**

1. **Vitals**
   - Draft year | Round | Pick number | Drafting team

2. **Connections**
   - Player (drafted) | Team (drafting) | Team (current)

3. **Pick Provenance**
   - Trade history of this pick before draft

---

### Draft Pick (`/draft-picks/:team/:year/:round`)

**Sections (in order):**

1. **Vitals**
   - Year | Round | Current owner | Original owner

2. **Protection Details**
   - Protection type, conditions, fallback

3. **Trade Chain**
   - Chronological list of trades involving this pick

4. **Swap Rights** (if applicable)
   - Teams with swap rights, conditions

---

## Scrollspy Implementation

### Local Nav

**Position:** Sticky left sidebar, `w-48`, `top-[header-height]`

**Content:** List of section anchors:
```html
<nav class="sticky top-[80px] w-48 shrink-0 hidden lg:block">
  <ul class="space-y-1 text-xs">
    <li><a href="#vitals" class="block px-3 py-1.5 rounded hover:bg-muted/50" 
           data-scrollspy-active="bg-primary/10 text-primary font-medium">Vitals</a></li>
    <li><a href="#connections" ...>Connections</a></li>
    <!-- etc -->
  </ul>
</nav>
```

**Behavior:**
- Scrollspy highlights the link whose section is in view
- Click scrolls to section with `scroll-margin-top` to clear sticky header
- On mobile (`< lg`): local nav hidden; section headers are the nav

### Section Anchors

Each section has an `id` for deep linking:
```html
<section id="vitals" class="scroll-mt-24">
  <h2 class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Vitals</h2>
  ...
</section>
```

**URL pattern:** `/players/lebron#contract` deep-links to contract section.

---

## Interaction Primitives

### Row → Pivot

Every table row should pivot to a related entity:
- **Player row in roster** → `/players/:slug`
- **Team cell** → `/teams/:slug`
- **Agent cell** → `/agents/:slug`
- **Transaction ID** → `/transactions/:id`

### Salary Book Escape Hatch

Every entity page should have a clear "Open in Salary Book" link:
- **Player:** Opens Salary Book scrolled to player's team
- **Team:** Opens Salary Book scrolled to team section
- **Agent:** Opens Salary Book (no specific scroll target)

### Datastar Patch Boundaries

If entity pages need live updates (unlikely for MVP), define stable patch regions:
- `#vitals` — refresh KPI strip
- `#roster` — refresh roster table
- `#ledger` — append new entries

For now, entity pages can be static HTML (no Datastar reactivity needed in MVP).

---

## Design Tokens

Reuse Salary Book tokens:

| Element | Class |
|---------|-------|
| Section header | `text-xs font-medium uppercase tracking-wide text-muted-foreground` |
| KPI card | `rounded-lg border border-border bg-background p-3` |
| KPI label | `text-xs text-muted-foreground` |
| KPI value | `text-lg font-semibold font-mono tabular-nums` |
| Table | `.entity-table` (defined in `application.css`) |
| Row hover | `hover:bg-yellow-50/70 dark:hover:bg-yellow-900/10 transition-colors duration-75` |
| Chip | `.entity-chip`, `.entity-chip--muted/warning/danger/success/accent` |

---

## Migration Path

### Phase 1: Vitals + Connections (high impact, low effort)

1. Add Vitals strip to all entity show pages (extract key numbers to top)
2. Move Connections section above tables
3. Remove redundant inline stats from Connections cards

### Phase 2: Scrollspy + Local Nav

1. Add section anchors to all entity pages
2. Add sticky local nav sidebar (desktop only)
3. Add `scroll-mt-24` to all sections

### Phase 3: Table Consolidation

1. Identify primary table per entity
2. Move audit/ledger tables into collapsed `<details>`
3. Ensure all tables use shared `.entity-table` styling

### Phase 4: Constraint Posture

1. Add derived constraint chips below Vitals
2. Link chips to proof (transaction, contract clause, etc.)

---

## Anti-Patterns (Do Not)

1. **Do not hide the primary content behind tabs.** Tabs fragment context. Use scroll.
2. **Do not show raw database columns.** Translate to derived facts + constraints.
3. **Do not nest modals or drawers.** Entity pages are canonical; link away.
4. **Do not duplicate Salary Book.** Entity pages show *this entity's* story; Salary Book shows *team context*.
5. **Do not inline long prose.** If a rule needs explanation, use a tooltip or external doc link.

---

## Summary

| Concept | Description |
|---------|-------------|
| **Vitals First** | KPI strip + constraint posture answer the primary question |
| **Connections Early** | Pivots live near the top, not buried in tables |
| **Primary Table** | One authoritative table per entity type |
| **Proof Collapsed** | Ledger, audit, history tables are collapsed by default |
| **Scrollspy Nav** | Sticky local nav with section highlights (desktop) |
| **Everything Pivots** | Every datum is a link to a related entity or view |
| **No Tabs** | Scroll + sections, not hidden content panels |
