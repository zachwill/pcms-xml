# XlsxWriter Reference for Coding Agents

## Pre-flight Checklist

Before writing any formula, verify:

- [ ] `Workbook(..., {"use_future_functions": True})` is set
- [ ] Function names are English (`SUM` not `SOMME`)
- [ ] Argument separators are commas (`,` not `;`)
- [ ] A1 refs are uppercase (`A1:D10` not `a1:d10`)
- [ ] Spill formulas use `write_dynamic_array_formula()` (no `{}` braces)
- [ ] Spill columns have `set_column(..., format)` applied (anchor format doesn't propagate)
- [ ] LAMBDA params use `_xlpm.` prefix (`_xlpm.x` not `x`)
- [ ] Spill refs use `ANCHORARRAY(F2)` not `F2#`
- [ ] Complex formulas: closing parens are commented and/or balance is asserted
- [ ] Defined names with dynamic/future functions use cell indirection
- [ ] Conditional formatting formulas use INDEX/MATCH (not XLOOKUP) with absolute sheet refs

---

## 1. Workbook Setup

Always use:
```python
workbook = xlsxwriter.Workbook("out.xlsx", {"use_future_functions": True})
```

---

## 2. Formula API Selection

| Intent | Method | Notes |
|--------|--------|-------|
| Single value | `write_formula(cell, "=A1+B1")` | Default |
| Legacy CSE array | `write_array_formula(range, "{=...}")` | Braces required |
| Dynamic array (spill) | `write_dynamic_array_formula(cell, "=...")` | No braces |

**Decision rule:** If the formula returns multiple values, use `write_dynamic_array_formula()`.

**Spill functions** (always use `write_dynamic_array_formula`):
- `FILTER`, `UNIQUE`, `SORT`, `SORTBY`
- `SEQUENCE`, `RANDARRAY`
- `XLOOKUP` (when returning array/column)
- `DROP`, `TAKE`, `CHOOSECOLS`, `CHOOSEROWS`
- `HSTACK`, `VSTACK`, `TOCOL`, `TOROW`, `WRAPCOLS`, `WRAPROWS`, `EXPAND`
- `TEXTSPLIT`
- Any formula applied to a range that returns multiple values (e.g., `=LEN(A1:A100)`)

---

## 3. Critical Patterns

### 3.1 Spill Formatting

`write_dynamic_array_formula()` only formats the anchor cell. Spilled cells inherit **column format**.

```python
# ❌ BAD: format only applies to anchor
ws.write_dynamic_array_formula("D4", "=UNIQUE(A1:A100)", fmt)

# ✅ GOOD: set column format first
ws.set_column("D:D", 20, fmt)
ws.write_dynamic_array_formula("D4", "=UNIQUE(A1:A100)")
```

For multi-column spill grids:
```python
ws.set_column(COL_RANK, COL_RANK, 8, fmts["rank"])
ws.set_column(COL_NAME, COL_NAME, 20, fmts["name"])
ws.set_column(COL_SAL, COL_SAL, 12, fmts["money"])
ws.write_dynamic_array_formula(...)
```

### 3.2 LAMBDA Parameters

LAMBDA params require `_xlpm.` prefix in stored formulas (Excel hides this in UI):

```python
# ❌ BAD
"=LAMBDA(x, x*2)(5)"

# ✅ GOOD
"=LAMBDA(_xlpm.x, _xlpm.x*2)(5)"
```

Prefer defining as workbook name:
```python
wb.define_name("Double", "=LAMBDA(_xlpm.x, _xlpm.x*2)")
ws.write_formula("A1", "=Double(5)")
```

### 3.3 Spill References

`F2#` syntax doesn't work in stored formulas. Use `ANCHORARRAY()`:

```python
# ❌ BAD
"=COUNTA(F2#)"

# ✅ GOOD
"=COUNTA(ANCHORARRAY(F2))"
```

### 3.4 Defined Names + Dynamic Functions

Avoid future/dynamic functions directly in `define_name()`. Use cell indirection:

```python
# ❌ RISKY: may cause Excel warnings
wb.define_name("UniqueNames", "=UNIQUE(A1:A100)")

# ✅ SAFE: formula in cell, name points to cell
calc_ws.write_dynamic_array_formula("A1", "=UNIQUE(DATA!A1:A100)")
wb.define_name("UniqueNames", "=CALC!$A$1")
```

### 3.5 Parenthesis Balance in Nested Formulas

Complex LET/LAMBDA/MAP/FILTER formulas break silently on paren mismatch.

**Pattern 1:** Comment every closing paren:
```python
formula = (
    "=LET("
    "_xlpm.y,2025,"
    "_xlpm.names,FILTER(tbl[name],tbl[year]=_xlpm.y),"
    "_xlpm.sals,FILTER(tbl[sal],tbl[year]=_xlpm.y),"
    "MAP(InputNames,LAMBDA(_xlpm.p,"
    "IFERROR(XLOOKUP(_xlpm.p,_xlpm.names,_xlpm.sals,0),0)"
    "))"  # close LAMBDA, MAP
    ")"   # close LET
)
```

**Pattern 2:** Assert balance before writing:
```python
assert formula.count("(") == formula.count(")"), "Unbalanced parens"
ws.write_formula("A1", formula)
```

### 3.6 Manual `_xlfn.` Prefix Gotcha

If you manually add `_xlfn.` to ANY function, auto-prefixing is disabled for the ENTIRE formula.

```python
# ❌ BROKEN: LET won't get prefixed
"=LET(x,1,_xlfn.GREATEST(x,0))"

# ✅ WORKS: prefix everything manually
"=_xlfn.LET(_xlpm.x,1,_xlfn.GREATEST(_xlpm.x,0))"
```

Functions commonly needing manual prefix (not in xlsxwriter's list):
- `GREATEST`, `LEAST`
- `VSTACK`, `HSTACK`, `TOCOL`, `TOROW`, `WRAPCOLS`, `WRAPROWS`

### 3.7 Conditional Formatting Formulas

Conditional formatting formulas have two major gotchas:

1. **`use_future_functions` doesn't apply** - must manually prefix with `_xlfn.`
2. **Table structured references can cause repair warnings** - even with correct prefixes

**Recommended pattern:** Use INDEX/MATCH with absolute sheet references instead of XLOOKUP with table references.

```python
# ❌ BAD: XLOOKUP + table refs cause Excel repair warnings
worksheet.conditional_format("F4:F23", {
    "type": "formula",
    "criteria": '=_xlfn.XLOOKUP($E4,tbl_warehouse[name],tbl_warehouse[status])="Active"',
    "format": fmt
})

# ✅ GOOD: INDEX/MATCH with absolute sheet references
worksheet.conditional_format("F4:F23", {
    "type": "formula",
    "criteria": '=INDEX(DATA_warehouse!$C:$C,MATCH($E4,DATA_warehouse!$B:$B,0))="Active"',
    "format": fmt
})
```

Key points:
- Use `$E4` (absolute column, relative row) for the lookup value
- Reference DATA sheets with absolute column refs: `DATA_sheet!$B:$B`
- INDEX/MATCH are legacy functions that work reliably in CF formulas
- Avoid XLOOKUP, FILTER, and other future functions in CF formulas

#### Deep dive: writing CF rules that don’t get “repaired” by Excel

Conditional formatting (CF) is the #1 place Excel will silently drop rules or show a
workbook-repair warning if you use the wrong function family.

**Why CF is different than normal formulas**

- CF formulas are stored inside `<cfRule>` XML and evaluated in a restricted context.
- `Workbook(..., {"use_future_functions": True})` **does not help** CF. If you use
  modern functions (LET/FILTER/XLOOKUP/MAP/etc.) you typically must manually prefix
  with `_xlfn.` *and* even then Excel may still repair/remove the rule.
- Table structured references (`tbl_x[col]`) are a common trigger for repair warnings
  inside CF rules.

**Rule #1: Prefer legacy functions + A1 references**

When you need lookup-like behavior in CF, stick to combinations of:

- `INDEX` / `MATCH`
- `COUNTIF` / `COUNTIFS`
- `SUMPRODUCT`
- `AND` / `OR` / `IF`

…and reference the exported DATA sheets by absolute A1 ranges:

- Good: `DATA_salary_book_yearly!$B$2:$B$20000`
- Risky: `tbl_salary_book_yearly[player_name]`

**Rule #2: Write the formula as-if it’s evaluated for the TOP-LEFT cell**

Excel “fills” a CF rule across the target range the same way it fills normal formulas:
relative references move as the rule applies down the range.

So for a range like `F4:F200`:

- Use **relative row** for the in-range cell reference: `F4` (not `$F$4`)
- Use **absolute column + relative row** for a paired column you want to track:
  `$E4` (locks to Player column, row shifts)

Example pattern:

```text
Applies to:  F4:F200
Criteria:    =AND(F4=0, $E4<>"")
```

**Rule #3: Avoid XLOOKUP in CF; use INDEX/MATCH**

Even if XLOOKUP works in a normal cell formula, it can be unstable in CF.

```python
# ✅ Stable CF lookup
criteria = '=INDEX(DATA_salary_book_warehouse!$AA:$AA, MATCH($E4, DATA_salary_book_warehouse!$B:$B, 0))="TEAM"'
```

**Rule #4: For multi-key lookups, use SUMPRODUCT**

When you need to match multiple columns (team + player + year + flag),
`SUMPRODUCT` is the most reliable CF “join”.

Example: show a gray "Two-Way" pill only when the salary cell is 0 and the player
is a two-way for the selected team/year:

```text
Applies to:  F4:F200
Criteria:    =AND(
               F4=0,
               SUMPRODUCT(
                 (DATA_salary_book_yearly!$C$2:$C$20000=SelectedTeam)*
                 (DATA_salary_book_yearly!$B$2:$B$20000=$E4)*
                 (DATA_salary_book_yearly!$D$2:$D$20000=MetaBaseYear+1)*
                 (DATA_salary_book_yearly!$H$2:$H$20000=TRUE)
               )>0
             )
```

Notes:
- Use a fixed max row (e.g. `20000`) instead of whole-column ranges for performance.
- Prefer `SUMPRODUCT(...)>0` over array formulas; CF is already “array-ish”.

**Rule #5: Ordering + `stop_if_true` matters**

If you layer multiple CF rules (e.g. option coloring + two-way pill + traded-out
strike-through), Excel will apply them in order.

In XlsxWriter you can set:

```python
worksheet.conditional_format(rng, {
  "type": "formula",
  "criteria": "=...",
  "format": fmt,
  "stop_if_true": True,
})
```

Use `stop_if_true` for rules that should “win” and prevent later rules from
overwriting the format.

---

## 4. Error Diagnosis

| Symptom | Cause | Fix |
|---------|-------|-----|
| `#NAME?` | Non-English function name | Use English: `SUM` not `SOMME` |
| `#NAME?` | Semicolon separators | Use commas: `SUM(1,2)` not `SUM(1;2)` |
| `#NAME?` | Missing `_xlfn.` prefix | Enable `use_future_functions` or prefix manually |
| `#NAME?` | Unbalanced parens | Count `(` vs `)`, add comments |
| `#NAME?` | Mixed manual/auto prefixing | If any `_xlfn.`, prefix ALL future functions |
| `@` in formula | Legacy formula, should be dynamic | Use `write_dynamic_array_formula()` |
| Spill cells unformatted | Anchor format doesn't propagate | Use `set_column(..., format)` |
| `0` in non-Excel viewers | No recalc capability | Pass `value=` param with precomputed result |
| Excel warnings on open | Future function in defined name | Use cell indirection pattern |
| CF removed on open | XLOOKUP/table refs in CF formula | Use INDEX/MATCH with sheet refs (§3.7) |

**Debug command** (inspect stored formula):
```bash
unzip -o file.xlsx -d /tmp/x && grep -o '<f>[^<]*</f>' /tmp/x/xl/worksheets/sheet1.xml
```

---

## 5. Quick Recipes

### Basic setup
```python
import xlsxwriter
wb = xlsxwriter.Workbook("out.xlsx", {"use_future_functions": True})
ws = wb.add_worksheet()
```

### Dynamic array with ANCHORARRAY reference
```python
ws.write_dynamic_array_formula("F2", "=FILTER(A:A, B:B>0)")
ws.write_formula("H2", "=COUNTA(ANCHORARRAY(F2))")
```

### XLOOKUP with fallback
```python
ws.write_formula("D1", '=IFNA(XLOOKUP(key, A:A, B:B), "Not found")')
```

### Named LAMBDA
```python
wb.define_name("ToCelsius", "=LAMBDA(_xlpm.f,(5/9)*(_xlpm.f-32))")
ws.write_formula("A1", "=ToCelsius(212)")
```

### Force cached result (for PDF/non-Excel consumers)
```python
ws.write_formula("A1", "=2+2", None, 4)  # 4 is the cached value
```

### Cell indirection for complex defined name
```python
calc = wb.add_worksheet("CALC")
calc.hide()
calc.write_dynamic_array_formula("A1", "=UNIQUE(DATA!A:A)")
wb.define_name("UniqueItems", "=CALC!$A$1")
```

### Formatted spill grid
```python
fmt_name = wb.add_format({"bold": True})
fmt_sal = wb.add_format({"num_format": "#,##0"})

ws.set_column("C:C", 20, fmt_name)
ws.set_column("D:D", 12, fmt_sal)

ws.write_dynamic_array_formula("C3", "=PlayerNames")
ws.write_dynamic_array_formula("D3", "=PlayerSalaries")
```

---

## 6. Formula Building Helper

For complex formulas, use a builder pattern:

```python
def build_formula(*parts: str) -> str:
    """Concatenate formula parts and validate paren balance."""
    formula = "".join(parts)
    opens = formula.count("(")
    closes = formula.count(")")
    if opens != closes:
        raise ValueError(f"Unbalanced: {opens} open, {closes} close\n{formula}")
    return formula

formula = build_formula(
    "=LET(",
    "_xlpm.x,1,",
    "_xlpm.y,2,",
    "_xlpm.x+_xlpm.y",
    ")",  # close LET
)
```
