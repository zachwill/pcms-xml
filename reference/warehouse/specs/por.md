# POR Spec

**Source:** `reference/warehouse/por.json`  
**Rows:** 70

---

## 1. Purpose

The **POR** sheet is a **frozen snapshot** of the Playground sheet with team selector set to Portland Trail Blazers (`D1 = "POR"`).

---

## 2. Relationship to Playground

**`por.json` is byte-for-byte identical to `playground.json`.**

Evidence:
- Same file size: 97,834 bytes
- Same MD5 hash: `6117c9f053cef95efcb58d575762526f`
- Same row count: 70
- Same structure when normalized with `jq -S`

Both sheets have `D1 = "POR"` as the team selector, indicating this is the same worksheet exported twice (or symlinked during export).

---

## 3. Why Does This Exist?

Sean's Excel workbook likely has multiple worksheet tabs that are clones of Playground with different team selectors frozen in. This allows quick access to specific team views without changing the dropdown.

In the export process, these appear as separate JSON files even though they share the same structure and formulas.

---

## 4. Recommendation

For implementation purposes:
- Treat `por.json` as a **duplicate** of `playground.json`
- Use the full **Playground spec** (`reference/warehouse/specs/playground.md`) for understanding the sheet logic
- No separate implementation needed — Playground with `team_code = 'POR'` filter produces the same output

---

## 5. Mapping to Postgres

Same as Playground:

| Concept | Our Table(s) |
|---------|--------------|
| Player salaries by year | `pcms.salary_book_warehouse WHERE team_code = 'POR'` |
| Cap/Tax/Apron levels | `pcms.league_system_values` |
| Team totals | `pcms.team_salary_warehouse WHERE team_code = 'POR'` |
| Dead money | `pcms.dead_money_warehouse WHERE team_code = 'POR'` |

---

## 6. Open Questions

- [ ] Confirm if other team-specific snapshots exist in the workbook (e.g., `bos.json`, `lal.json`)
- [ ] If Sean frequently uses team-specific tabs, consider adding a "saved team views" feature to our tooling
