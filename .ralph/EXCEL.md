# Excel Workbook Progress

Tracking the Excel cap workbook build.

**Last updated:** 2026-02-01

---

## The three pillars

1. **Correct data** — Authoritative Postgres data into `DATA_*` sheets ✅
2. **Modern Excel** — `FILTER`, `XLOOKUP`, `LET`, `LAMBDA` via XlsxWriter
3. **Dense, beautiful, reactive UI** — Inputs drive the view, everything reacts

---

## Status

| Layer | Status |
|-------|--------|
| DATA_ sheets | ✅ Done |
| META sheet | ✅ Done |
| PLAYGROUND sheet | 🚧 Next |

---

## Next: PLAYGROUND

The first UI sheet. See `reference/blueprints/specs/playground.md`.

**Core idea:** Inputs (Trade Out, Waive, Sign) drive the roster view. Change an input → roster + totals react. One reactive surface.

**Phases:**
- [ ] Phase 1: Layout + inputs (team selector, input cells)
- [ ] Phase 2: Reactive roster (base + adds - removes)
- [ ] Phase 3: Reactive totals (base → modified with delta)
- [ ] Phase 4: Tax + roster fills
- [ ] Phase 5: Depth chart + picks + trade rules
- [ ] Phase 6: Polish (formatting, protection)

---

## References

| Doc | Purpose |
|-----|---------|
| `reference/blueprints/specs/playground.md` | PLAYGROUND spec + phases |
| `reference/blueprints/excel-cap-book-blueprint.md` | Design vision |
| `reference/blueprints/data-contract.md` | DATA_ sheet specs |
| `excel/XLSXWRITER.md` | XlsxWriter patterns |
| `excel/AGENTS.md` | Folder context |

---

## XlsxWriter quick reference

```python
workbook = xlsxwriter.Workbook("out.xlsx", {"use_future_functions": True})

# LET/LAMBDA variables need _xlpm. prefix
ws.write_formula("A1", "=LET(_xlpm.x,1,_xlpm.x+1)")

# Spill formulas need write_dynamic_array_formula()
ws.write_dynamic_array_formula("A1", "=FILTER(data, condition)")

# Spill references need ANCHORARRAY()
ws.write_formula("B1", "=SUM(ANCHORARRAY(A1))")
```

See `excel/XLSXWRITER.md` for full patterns.
