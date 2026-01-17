# DuckDB Lists (LIST)

## Purpose

Use DuckDB’s `LIST` type to represent ordered collections inside a single column (arrays). DuckDB supports convenient list literals, slicing, list comprehensions, and a large set of list functions.

This doc focuses on the day-to-day parts you’ll actually use.

## Quick Start

```sql
-- List literal
SELECT [1, 2, 3] AS nums;

-- Indexing (DuckDB lists are 1-based)
SELECT [10, 20, 30][2] AS second;  -- 20

-- Unnest to rows
SELECT unnest(['duck', 'goose']) AS bird;

-- Transform + filter with lambdas
SELECT
  list_transform([1, 2, 3], x -> x * 10) AS scaled,
  list_filter([1, 2, 3, 4], x -> x % 2 = 0) AS evens;
```

## Creating Lists

### Literals

```sql
SELECT [1, 2, 3] AS a;
SELECT ['a', 'b', 'c'] AS b;
```

### `list_value(...)`

```sql
SELECT list_value(1, 2, 3) AS a;
```

## Indexing (1-based)

DuckDB list indexing starts at **1**.

```sql
SELECT [4, 5, 6][1] AS first;   -- 4
SELECT [4, 5, 6][3] AS third;   -- 6
```

Related functions:

- `list_extract(list, index)` (same behavior)
- `array_extract(list, index)` (same behavior)

> Note
> JSON arrays are 0-based; DuckDB lists are 1-based. Keep this in mind when moving between `JSON` and `LIST`.

## Slicing

DuckDB supports Python-style slicing for lists (and strings):

- `list[begin:end]`
- `list[begin:end:step]`

And function equivalents:

- `list_slice(list, begin, end[, step])`

### Examples

```sql
-- Basic slice: begin=2, end=4 (inclusive in slice conventions)
SELECT ([1, 2, 3, 4, 5])[2:4];
-- [2, 3, 4]

-- Step
SELECT ([1, 2, 3, 4, 5])[2:4:2];
-- [2, 4]

-- Negative indices count from the end
SELECT ([1, 2, 3, 4, 5])[-2:];
-- [4, 5]

-- Negative step reverses; begin/end are interpreted accordingly
SELECT ([1, 2, 3, 4, 5])[4:2:-2];
-- [4, 2]

-- Full slice
SELECT ([1, 2, 3, 4, 5])[:];
-- [1, 2, 3, 4, 5]
```

## Common Operations

### Concatenation

```sql
-- NULL-sensitive operator
SELECT [1, 2] || [3, 4] AS joined;  -- [1, 2, 3, 4]

-- NULL-skipping function
SELECT list_concat([1, 2], NULL, [3, 4]) AS joined;  -- [1, 2, 3, 4]
```

### Membership

```sql
SELECT list_contains(['duck', 'goose'], 'duck') AS has_duck; -- true
```

### Distinct / sort

```sql
SELECT list_distinct([1, 1, NULL, 2, 2]) AS d; -- [2, 1] (order not preserved)
SELECT list_sort([3, 1, 2]) AS s;              -- [1, 2, 3]
```

### Filter / transform

```sql
SELECT
  list_filter([1, 2, 3, 4], x -> x > 2) AS gt2,
  list_transform([1, 2, 3], x -> x + 1) AS plus_one;
```

### Reduce

```sql
SELECT list_reduce([1, 2, 3], (x, y) -> x + y) AS sum; -- 6
```

## Unnesting to Rows

`unnest(list)` expands one list into multiple rows.

```sql
SELECT unnest([10, 20, 30]) AS x;
```

When you have a list column:

```sql
SELECT id, unnest(tags) AS tag
FROM items;
```

## List Comprehensions

DuckDB supports Python-style list comprehensions.

```sql
SELECT [upper(x) FOR x IN ['duck', 'goose']] AS loud;
-- [DUCK, GOOSE]

SELECT [x FOR x IN [1, 2, 3, 4] IF x % 2 = 0] AS evens;
-- [2, 4]
```

Under the hood, comprehensions are rewritten to `list_filter` + `list_transform`.

## Range Helpers

DuckDB provides two handy functions that return lists:

- `range(start, stop[, step])` → **stop is exclusive**
- `generate_series(start, stop[, step])` → **stop is inclusive**

```sql
SELECT range(0, 5) AS a;           -- [0, 1, 2, 3, 4]
SELECT generate_series(0, 5) AS b; -- [0, 1, 2, 3, 4, 5]
```

## References

- DuckDB list functions: https://duckdb.org/docs/sql/functions/list
- DuckDB lambda functions (for `x -> ...`): https://duckdb.org/docs/sql/functions/lambda
- DuckDB `UNNEST`: https://duckdb.org/docs/sql/query_syntax/unnest
