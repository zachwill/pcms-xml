# PLAYGROUND Sheet Spec

**Status:** TODO  
**Target:** First UI sheet to rebuild

---

## What Sean's Playground does well

Sean's Playground is the core working surface. It's dense, everything visible, no navigation needed.

**Core elements:**
- Team selector + year context (top)
- Player roster sorted by salary descending
- Multi-year salary grid (6 years)
- % of cap column
- Roster fills (rookie mins, vet mins to reach 12/14)
- Team totals vs Cap / Tax / Apron thresholds
- Luxury tax estimate
- Draft pick ownership grid
- Depth chart mini-view (by position)
- Contract calculator (model hypothetical deals)
- Trade matching zone

**What makes it work:**
- Everything on one screen
- Change team → everything updates
- Salary sorted descending (biggest contracts at top)
- Totals always visible
- Scenario modeling inline (not separate sheet)

---

## What we want to improve

### Visual design
- [ ] Aptos Narrow font for data density
- [ ] Proper alignment (numbers right, decimals aligned)
- [ ] Subtle borders (section dividers, not gridlines everywhere)
- [ ] Light yellow input cells (team selector, year, scenario inputs)
- [ ] Conditional formatting for status (over cap → red, etc.)
- [ ] Consistent number formatting (currency with commas, no decimals for large numbers)

### Modern Excel formulas
- [ ] Dynamic arrays (`FILTER`, `SORTBY`) instead of helper columns
- [ ] `XLOOKUP` instead of `INDEX/MATCH`
- [ ] `LET` for readable complex formulas
- [ ] `LAMBDA` defined names for reusable calculations
- [ ] Spill ranges where appropriate

### Data integrity
- [ ] Pull from our `DATA_*` tables (authoritative source)
- [ ] Reconciliation check visible (totals match warehouse)
- [ ] No hardcoded values (thresholds from `tbl_system_values`)
- [ ] Repeater status from data, not hardcoded IF chain

### Reactivity (the core of "playground")
- [ ] Input cells that drive the roster view (Trade Out, Trade In, Waive, Sign)
- [ ] Roster formulas that incorporate inputs (base data + additions - removals)
- [ ] Status column showing what changed (+ADDED, -OUT, WAIVED)
- [ ] Totals that react: Base → Modified with delta shown
- [ ] Conditional formatting: added rows highlighted, removed rows struck/grayed
- [ ] Trade matching rules shown inline near trade inputs

---

## The core insight: REACTIVITY

The Playground isn't "roster + separate scenario inputs." The inputs **drive** the roster.

```
INPUTS (left)              →    ROSTER VIEW (reacts)
─────────────────────────       ─────────────────────
Trade Out: [Anfernee Simons]    # | Player          | Salary
Waive:     [Matisse Thybulle]   1 | Deandre Ayton   | $34.0M
Sign:      [Free Agent X]       2 | Jerami Grant    | $29.0M ← (incoming)
           [$12,000,000]        3 | Free Agent X    | $12.0M ← (added, yellow)
                                4 | ...
                                ✕ | Anfernee Simons | -$25.0M ← (outgoing, red)
                                ✕ | Matisse Thybulle| WAIVED  ← (waived, gray)
```

When you type a player name in "Trade Out", the roster reacts:
- Player appears struck-through or in a different section
- Totals update
- Cap room updates
- Tax payment updates

When you type a name + salary in "Sign", a new row appears in the roster.

**The whole sheet is one reactive surface.** Change an input → roster + totals + KPIs all update.

This is the TUI analogy: it's like `htop` or a dashboard where every value is live-computed from the current state.

---

## Layout ideas

```
┌─────────────────────────────────────────────────────────────────────┐
│ [Team ▼]  [Year ▼]  [As-of]       Cap Room: +$X.XM | Tax: -$X.XM    │
├───────────────────────┬─────────────────────────────────────────────┤
│ INPUTS                │ ROSTER (reactive)                           │
│                       │                                             │
│ Trade Out:            │ # | Player        | 2025   | %  | Status    │
│ [________________]    │ 1 | Star Player   | $45.0M | 32%|           │
│ [________________]    │ 2 | Second Star   | $32.0M | 23%|           │
│                       │ 3 | [Signed FA]   | $12.0M |  9%| +ADDED    │
│ Trade In:             │ 4 | Role Player   | $8.0M  |  6%|           │
│ [________________]    │ ...                                         │
│ [$______________]     │ ✕ | [Traded Out]  | $25.0M | 18%| -OUT      │
│                       │ ✕ | [Waived]      | $5.0M  |  4%| WAIVED    │
│ Waive:                │                                             │
│ [________________]    ├─────────────────────────────────────────────┤
│                       │ TOTALS              │ vs THRESHOLD          │
│ Sign (FA/Min/Exc):    │ Base Roster: $XXX.M │ Cap:  $140.6M (+$X.M) │
│ [________________]    │ + Additions:  $XX.M │ Tax:  $170.8M (-$X.M) │
│ [$______________]     │ - Removals:   $XX.M │ Aprn1:$178.1M (-$X.M) │
│ [years] [type ▼]      │ = Modified:  $XXX.M │ Tax Due: $XX.M        │
│                       │                     │                       │
├───────────────────────┼─────────────────────┴───────────────────────┤
│ Depth Chart           │ Draft Picks                                 │
│ PG: x, y              │ 2026: OWN / OWN                             │
│ SG: x, y              │ 2027: OWN / CHI (top-10 protected)          │
│ ...                   │ 2028: ...                                   │
└───────────────────────┴─────────────────────────────────────────────┘
```

**Key:** The INPUTS on the left drive everything on the right. No "submit" button, no separate scenario sheet. Just type → see results.

---

## Data sources (from DATA_ sheets)

| Need | Source Table | Key Columns |
|------|--------------|-------------|
| Player salaries | `tbl_salary_book_warehouse` | player_name, team_code, cap_y0..cap_y5 |
| Team totals | `tbl_team_salary_warehouse` | cap_total, tax_total, apron_total |
| Cap holds | `tbl_cap_holds_warehouse` | player_name, cap_y0..cap_y5 |
| Dead money | `tbl_dead_money_warehouse` | player_name, cap_y0..cap_y5 |
| System values | `tbl_system_values` | salary_cap, tax_level, first_apron, second_apron |
| Tax rates | `tbl_tax_rates` | brackets for tax calculation |
| Min scale | `tbl_minimum_scale` | minimum salary by YOS |
| Rookie scale | `tbl_rookie_scale` | rookie scale by pick |
| Draft picks | `tbl_draft_picks_warehouse` | ownership grid |

---

## Formula patterns to use

### Base roster (before inputs)
```
=LET(
  _xlpm.team, SelectedTeam,
  _xlpm.data, tbl_salary_book_warehouse,
  _xlpm.filtered, FILTER(_xlpm.data, [team_code]=_xlpm.team),
  _xlpm.sorted, SORTBY(_xlpm.filtered, [cap_y0], -1),
  TAKE(_xlpm.sorted, 20)
)
```

### Reactive roster (base + inputs)

This is the key formula. It needs to:
1. Start with base roster
2. Remove players listed in "Trade Out" and "Waive" inputs
3. Add players from "Trade In" and "Sign" inputs
4. Sort the combined result

```
=LET(
  _xlpm.base, <base roster filtered by team>,
  _xlpm.tradeOut, TradeOutNames,        // named range for trade-out inputs
  _xlpm.waived, WaivedNames,            // named range for waive inputs
  _xlpm.removals, VSTACK(_xlpm.tradeOut, _xlpm.waived),
  _xlpm.kept, FILTER(_xlpm.base, NOT(ISNUMBER(MATCH([player_name], _xlpm.removals, 0)))),
  _xlpm.additions, <trade-ins + signings as rows>,
  _xlpm.combined, VSTACK(_xlpm.kept, _xlpm.additions),
  SORTBY(_xlpm.combined, <salary column>, -1)
)
```

This is complex. May need helper columns or a simpler approach. Open question.

### Threshold lookup
```
=XLOOKUP(SelectedYear, tbl_system_values[salary_year], tbl_system_values[salary_cap])
```

### Reactive total
```
=LET(
  _xlpm.baseTotal, <from warehouse or SUM of base roster>,
  _xlpm.addedSalary, SUM(TradeInSalaries) + SUM(SigningSalaries),
  _xlpm.removedSalary, <lookup salaries of traded-out + waived players>,
  _xlpm.baseTotal + _xlpm.addedSalary - _xlpm.removedSalary
)
```

### Room calculation
```
=LET(
  _xlpm.cap, <cap_threshold>,
  _xlpm.total, <reactive_total>,
  _xlpm.cap - _xlpm.total
)
```

### Tax payment (from brackets)
```
=LET(
  _xlpm.over, <over_tax_amount>,
  _xlpm.rates, FILTER(tbl_tax_rates, [salary_year]=SelectedYear),
  _xlpm.brackets, ... ,
  <SUMPRODUCT over brackets>
)
```

See `excel/XLSXWRITER.md` for XlsxWriter implementation patterns.

---

## Open questions

- [ ] **Input method:** Free text for player names, or dropdowns validated against roster? (Free text is faster but error-prone)
- [ ] **How many input slots?** Trade Out ×3, Trade In ×3, Waive ×2, Sign ×2? What's the right balance?
- [ ] **Trade-in salary:** Manual entry, or lookup from a league-wide player list?
- [ ] **Roster formula complexity:** Can we build one formula that handles base + adds - removes, or do we need helper columns?
- [ ] **Multi-team trades:** Does this sheet handle them, or is that a separate TRADE sheet concern?
- [ ] **Reset:** Clear all inputs = just delete the cell contents? Or a button/macro?
- [ ] **Dead money on waive:** Does waiving a player automatically add dead money, or is that a separate input?
- [ ] **Signing types:** How do we handle MLE vs cap room vs minimum? Dropdown for type?

---

## Implementation plan

### Phase 1: Layout + inputs
- [ ] Sheet layout (input zone left, roster right, totals bottom)
- [ ] Team selector (named range, yellow input cell)
- [ ] Year selector
- [ ] Input cells: Trade Out (2-3 slots), Trade In (2-3 slots + salary), Waive, Sign
- [ ] Basic formatting (Aptos Narrow, alignment, borders, yellow inputs)

### Phase 2: Reactive roster
- [ ] Base roster via FILTER + SORTBY from tbl_salary_book_warehouse
- [ ] Formula that combines: base roster + trade-ins + signings - trade-outs - waives
- [ ] Status column showing +ADDED / -OUT / WAIVED
- [ ] Conditional formatting for added/removed rows
- [ ] Multi-year salary columns
- [ ] % of cap column

### Phase 3: Reactive totals
- [ ] Base total from warehouse
- [ ] + Additions (trade-ins + signings)
- [ ] - Removals (trade-outs + waives)
- [ ] = Modified total
- [ ] Threshold lookups from tbl_system_values
- [ ] Room/over calculations (reactive to modified total)
- [ ] Conditional formatting (green = room, red = over)

### Phase 4: Tax + roster fills
- [ ] Roster fill calculations (rookie/vet mins)
- [ ] Tax payment formula using tbl_tax_rates
- [ ] Repeater flag from tbl_team_salary_warehouse

### Phase 5: Depth chart + picks + trade rules
- [ ] Position-based roster view (mini depth chart)
- [ ] Draft pick ownership grid
- [ ] Trade matching rules inline (near trade inputs)

### Phase 6: Polish
- [ ] Reconciliation check (base totals match warehouse)
- [ ] Final formatting pass
- [ ] Protection (lock non-input cells)

---

## References

- Sean's original: `reference/warehouse/specs/playground.md`
- Design principles: `reference/blueprints/mental-models-and-design-principles.md`
- XlsxWriter patterns: `excel/XLSXWRITER.md`
