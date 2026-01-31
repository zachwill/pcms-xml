# cover.json — Cover Sheet

## Purpose

A minimal cover/title page for Sean's workbook. Displays the workbook title and current date. Contains no data or logic—purely presentational metadata.

## Key Inputs / Controls

None.

## Key Outputs

| Row | Col | Value/Formula | Purpose |
|-----|-----|---------------|---------|
| 42 | G | `"Data Warehouse"` | Workbook title |
| 46 | G | `=TODAY()` | Last-opened date |

## Layout / Zones

Only two cells populated in the entire sheet:
- G42: static title string
- G46: dynamic date formula

Row/column positioning suggests this is a centered title block in the visual layout (row 42 is well below row 1, column G is offset from left edge).

## Cross-Sheet Dependencies

### References out
None.

### Referenced by
None — no other sheet references `'cover'!`.

## Key Formulas / Logic Patterns

```excel
=TODAY()
```

Simple date function for display purposes.

## Mapping to Our Postgres Model

**Not applicable.** This is purely presentational; no data to model.

## Open Questions / TODO

None — this sheet is complete.
