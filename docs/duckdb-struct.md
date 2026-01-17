# DuckDB Structs (STRUCT)

## Purpose

Use `STRUCT` to store a fixed set of named fields inside a single column.

A `STRUCT` is like a row/record:

- each struct value has the same field names (the field names are part of the schema)
- fields can be any type, including nested `STRUCT` and `LIST`
- field names are case-insensitive

Structs are commonly used to:

- keep related attributes together (e.g. `address`, `box_score`, `metadata`)
- model nested data efficiently (especially after ingest from JSON)

## Quick Start

```sql
-- Create
SELECT {'name': 'Alice', 'age': 30} AS person;

-- Read
SELECT ({'name': 'Alice', 'age': 30}).name AS name;  -- Alice

-- Update / add fields
SELECT struct_update({'a': 1, 'b': 2}, b := 3, c := 4) AS s;

-- Expand to columns
SELECT p.*
FROM (SELECT {'x': 1, 'y': 2, 'z': 3} AS p);
```

## Creating Structs

### Literal notation

```sql
SELECT {'x': 1, 'y': 2} AS point;
SELECT {'yes': 'duck', 'no': NULL} AS choices;
```

### `struct_pack(name := expr, ...)`

`struct_pack` is convenient when you want identifiers as keys (no quotes) and to keep expressions readable.

```sql
SELECT struct_pack(x := 1, y := 2) AS point;
```

### From a SELECT row

```sql
SELECT d AS s
FROM (SELECT 'value1' AS key1, 42 AS key2) d;
```

### `row(...)` / tuple syntax

`row(...)` returns an unnamed struct-like value and is often used for inserting into a typed `STRUCT` column.

```sql
CREATE TABLE t1 (s STRUCT(v VARCHAR, i INTEGER));
INSERT INTO t1 VALUES (row('a', 42));
FROM t1;
```

You can also use tuple syntax in a `SELECT`:

```sql
SELECT (x, x + 1, y) AS s
FROM (SELECT 1 AS x, 'a' AS y);
```

> Note
> Creating a table from an unnamed struct without a target type fails, because DuckDB can’t name the fields automatically.

## Reading Fields

### Dot notation

```sql
SELECT ({'x': 1, 'y': 2}).x AS x;
```

If a field name contains spaces or special characters, quote it with double quotes:

```sql
SELECT ({'x space': 1})."x space" AS v;
```

### Bracket notation

Bracket access uses a *string literal* key (single quotes). Only constant keys are allowed.

```sql
SELECT ({'x space': 1})['x space'] AS v;
```

### `struct_extract(struct, key)`

```sql
SELECT struct_extract({'x': 1, 'y': 2}, 'x') AS x;
```

## Expanding Structs to Columns (`s.*` / `unnest(s)`)

### `s.*`

```sql
SELECT s.* EXCLUDE ('y')
FROM (SELECT {'x': 1, 'y': 2, 'z': 3} AS s);
```

> Warning
> `s.*` is currently limited to top-level struct columns and non-aggregate expressions.

### `unnest(s)`

`unnest` can also expand a struct into columns:

```sql
SELECT unnest(s)
FROM (SELECT {'x': 1, 'y': 2, 'z': 3} AS s);
```

## Updating Structs

### Update existing fields / add new fields

```sql
SELECT struct_update({'a': 1, 'b': 2}, b := 3, c := 4) AS s;
```

### Insert only (error if field exists)

Use `struct_insert` when you want to ensure you’re not overwriting existing keys.

## Dot Notation: Order of Resolution

`a.b` can mean either:

- `table.column` (standard SQL)
- `struct_field` access (`struct_column.field`)

DuckDB resolves ambiguities in this order:

- for `part1.part2`: first try `part1` as a table and `part2` as a column; otherwise try `part1` as a column and `part2` as a struct field
- for `schema.table.column`: first try schema/table/column; then fall back to column/field/field

Practical takeaway: if you have naming conflicts, qualify table/column names explicitly (aliases help).

## Comparison and Ordering

Structs support standard comparisons (`=`, `<`, `>`, etc.) using lexicographic ordering across fields.

- comparisons check the first differing field in schema order
- `NULL` values are treated as larger than non-`NULL` values during ordering
- when comparing different struct types, DuckDB can cast to a union of keys (see DuckDB typecasting docs)

## Updating Struct Schema (ALTER TABLE)

DuckDB supports altering nested struct fields (DuckDB v1.3.0+):

```sql
CREATE TABLE test (s STRUCT(i INTEGER, j INTEGER));
INSERT INTO test VALUES (ROW(1, 1)), (ROW(2, 2));

ALTER TABLE test ADD COLUMN s.k INTEGER;
ALTER TABLE test DROP COLUMN s.i;
ALTER TABLE test RENAME s.j TO v1;
```

## References

- DuckDB struct data type: https://duckdb.org/docs/sql/data_types/struct
- DuckDB struct functions: https://duckdb.org/docs/sql/functions/struct
- DuckDB star expression (`s.*`): https://duckdb.org/docs/sql/expressions/star
