# Spec 02 — Sticky Team Header + Draft Assets (Table + Sidebar)

> Builds on `web/specs/01-salary-book.md`.
> Goal: lock the UI grammar for (a) the sticky team header and (b) draft assets, without drifting into documentation UI.

---

## A. Sticky Team Header

### A.1 Job to be done

While scanning 30 teams, the header must answer in <1s:

- Where am I?
- What are this team’s **hard constraints** right now?
- What’s the “can we do anything?” posture (aprons, hard-cap triggers, slots)?

The header is **identity + constraint posture**, not a team profile.

### A.2 Layout (within the existing iOS-contacts sticky group)

**Left cluster (identity)**
- Team logo + `TEAM` code
- Team name (click → push Team entity overlay)
- Optional micro-label: conference

**Right cluster (KPI strip)**
- 4–6 compact KPIs max.
- KPI cards should be consistent width, monospaced numbers, color only for semantics.

### A.3 KPI set (recommended)

Ordered by “how often a cap analyst needs it while scrolling”:

1) **Threshold rooms (current year)**
- `Tax Room`
- `1st Apron Room`
- `2nd Apron Room`

These should display as signed values and color-coded (green >= 0, red < 0).

2) **Roster slots**
- `Std: 14/15`
- `2W: 2/3`

3) **Restriction posture chips** (only when applicable)
- `Hard-capped (1st)` / `Hard-capped (2nd)`
- `Above 1st Apron` / `Above 2nd Apron` (if you want explicitness)
- `Frozen 1st (YYYY)` (second apron 7-years-out restriction)

4) **Trade flexibility (optional, but high leverage)**
A single chip + number that summarizes “incoming salary mode” for *this cap year*:

- Chip: `Trade: Standard / Aggregated / Expanded / Room`
- Number: `Max Incoming (best legal path)`

Rationale: the CBA trade matching rules + apron gating are a primary GM question and can be summarized without opening the trade machine.

### A.4 Header behavior

- Header + table header remain one sticky unit.
- Next team pushes previous team header off.
- No translucency/content bleed-through.
- No phantom spacing during sticky transitions.

---

## B. Draft Assets in the scrolling table

### B.1 Job to be done

In the main canvas, picks must be:

- scannable in a dense sheet
- comparable across teams
- clickable for full detail
- expressive enough to represent conditionality without becoming prose

### B.2 Pick “pill” grammar (strict, minimal)

A pick pill is a compact token aligned under a year column.

**Base text**
- `ORIGIN ROUND` (e.g., `LAL 1`, `BOS 2`)

**One protection/structure marker** (glyph)
- `Ⓟ` protected by draft position (top-14, 1–10, 31–45, etc.)
- `↺` swap rights
- `⇄` rolling / “first allowable draft” / multi-year conveyance window
- `$` cash fallback exists
- `Δ` one-time deferral option exists
- `⏳` “waiting period” / “second draft following…” constructs

**Optional tiny suffix** (only if it fits):
- `Top-14`, `1–10`, `31–45` (one range only)

Examples:
- `LAL 1` (clean/unconditional)
- `LAL 1 Ⓟ Top-14`
- `ATL 2 ⇄`
- `PHI 1 $`
- `BKN 1 ⏳`

### B.3 Anchoring picks to year columns

Some pick clauses don’t specify a single year (“first draft in which…”).

**Rule:** anchor the pill under the **earliest possible** conveyance year and add `⇄`.

The sidebar conveys the full timeline.

### B.4 Hover and click

- Hover tooltip: one-line clause summary (no paragraphs).
- Click: push Pick entity overlay in sidebar.

---

## C. Pick detail in the sidebar (entity overlay)

### C.1 Job to be done

Turn legal language into:

- what this pick *is*
- how it resolves over time
- what constraints it triggers

Without asking the user to read the CBA.

### C.2 Sidebar layout (Pick overlay)

**1) Identity header**
- “2028 1st (LAL)” (or best canonical label)
- Ownership chain (original → current holder → owed to)
- Small chips: `Ⓟ`, `↺`, `$`, `Δ`, `⏳` as applicable

**2) Conveyance timeline (primary module)**
A vertical timeline showing each draft year involved:

- Year
- Condition for conveyance
- If not conveyed → next year / alternative consideration

This is the core representation for:
- protection windows
- rolling “first allowable draft” constructs
- Stepien-driven “waiting period” conveyances
- conversions (e.g., “becomes two 2nds”)

**3) Constraint report (GM-facing, short)**
A tight list of flags. Example:

- `7-Year Rule: OK / At Risk`
- `Stepien (Bylaws 7.03): blocks trading YYYY`
- `Protection + Deferral combo: NOT ALLOWED` (when present)
- `Cash fallback: counts as cash now ($X) → apron/cash-limit implications`
- `Frozen pick restriction: applies` (second apron penalty)

**4) Raw clause text (collapsed)**
- Keep accessible, but secondary.

---

## D. Data contracts (what the DB must provide)

The table + sidebar should not parse clause text client-side.

### D.1 Minimal fields for pick pills (table)

From a pick warehouse (`pcms.draft_assets_warehouse` or a dedicated view), per team/year:

- `team_code`
- `salary_year` or `draft_year_anchor`
- `origin_team_code`
- `round`
- `is_swap` (bool)
- `has_cash_fallback` (bool)
- `cash_fallback_amount` (numeric, nullable)
- `has_deferral_option` (bool)
- `has_waiting_period` (bool)
- `protection_range_label` (text, nullable; e.g., `Top-14`, `1–10`, `31–45`)
- `pill_summary` (short text; one line)

### D.2 Minimal fields for pick overlay (sidebar)

- `pick_id` (stable)
- `canonical_label`
- `ownership_chain_json`
- `timeline_json` (array of steps: year, condition, fallback)
- `constraint_flags_json` (array of typed flags + severity)
- `raw_clause_text` (optional)
- `endnote_refs` + `endnote_text` (optional, but excellent for provenance)

### D.3 Where rules come from

The sidebar constraints map directly to the extracted examples:

- Ops: protection/deferral/Stepien constructs, later-acquired pick restriction, amendment constraints
- Ops: cash fallback counted as cash now, persists through subsequent trades
- CBA: second apron frozen pick rules

---

## E. Validation / assertions (future)

- Ensure every pick shown in the UI has a non-empty `pill_summary`.
- Ensure pick classifications don’t fall into “OTHER” at high rates.
- Ensure cash fallback picks always surface `$` and amount in sidebar.
