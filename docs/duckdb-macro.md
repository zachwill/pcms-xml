# DuckDB Macros (CREATE MACRO)

## Purpose

Use DuckDB macros to create reusable SQL snippets (scalar expressions or full table-producing queries) without leaving SQL.

Macros are expanded inline (think: parameterized text substitution with SQL-aware binding), which makes them great for:

- readable aliases for repeated expressions
- standardizing common filters/transforms
- reusable table-shaped subqueries

## Quick Start

### Scalar macro

```sql
CREATE OR REPLACE MACRO add(a, b) AS a + b;
SELECT add(40, 2) AS x; -- 42
```

### Table macro

```sql
CREATE OR REPLACE MACRO top_n(tbl, n) AS TABLE
  SELECT * FROM query_table(tbl)
  ORDER BY 1
  LIMIT n;

-- Usage
SELECT * FROM top_n('my_table', 10);
```

## Scalar vs Table Macros

- **Scalar macro**: returns a single value (usable anywhere an expression is valid).
- **Table macro**: returns a relation (usable in `FROM` like a table function).

```sql
-- Scalar
CREATE MACRO tax(subtotal) AS subtotal * 0.08;

-- Table
CREATE MACRO recent_orders(days) AS TABLE
  SELECT *
  FROM orders
  WHERE created_at >= now() - (days * INTERVAL 1 DAY);
```

## Create / Replace / If Not Exists

```sql
CREATE MACRO add(a, b) AS a + b;
CREATE OR REPLACE MACRO add(a, b) AS a + b;
CREATE MACRO IF NOT EXISTS add(a, b) AS a + b;
```

DuckDB also supports `CREATE FUNCTION ... AS ...` as an alias for scalar macros (macros are schema-scoped).

```sql
CREATE FUNCTION main.my_avg(x) AS sum(x) / count(x);
```

## Parameters

### Default parameters

```sql
CREATE MACRO add_default(a, b := 5) AS a + b;
SELECT add_default(37) AS x; -- 42
```

### Named parameters

```sql
CREATE MACRO triple_add(a, b := 5, c := 10) AS a + b + c;
SELECT triple_add(40, c := 1, b := 1) AS x; -- 42
```

### Typed parameters

Typed parameters are useful when overload resolution is ambiguous.

```sql
CREATE MACRO is_maximal(a INTEGER) AS a = 2^31 - 1;
```

### How expansion works

When you run:

```sql
SELECT add(40, 2) AS x;
```

DuckDB expands it conceptually like:

```sql
SELECT 40 + 2 AS x;
```

Because macros expand inline, they can be very fast and easy to reason about, but they also inherit the limitations of the context they expand into.

## Table Macros Patterns

### Return a static table

```sql
CREATE MACRO static_table() AS TABLE
  SELECT 'Hello' AS col1, 'World' AS col2;

SELECT * FROM static_table();
```

### Pass lists (via `unnest`)

```sql
CREATE MACRO get_users(ids) AS TABLE
  SELECT *
  FROM users
  WHERE uid IN (SELECT unnest(ids));

SELECT * FROM get_users([1, 5]);
```

### Operate on arbitrary tables

Use `query_table(tbl_name)` to treat a table name string as a relation.

```sql
CREATE MACRO checksum(tbl) AS TABLE
  SELECT bit_xor(md5_number(COLUMNS(*)::VARCHAR)) AS checksum
  FROM query_table(tbl);

SELECT * FROM checksum('users');
```

## Overloading

Macros can be overloaded by:

- number of parameters
- parameter types

Overloads must be defined **in a single CREATE statement**.

```sql
CREATE MACRO add_x
  (a, b) AS a + b,
  (a, b, c) AS a + b + c;

SELECT add_x(21, 42) AS two_args, add_x(21, 42, 21) AS three_args;
```

Typed overloads:

```sql
CREATE OR REPLACE MACRO is_maximal
  (a TINYINT) AS a = 2^7 - 1,
  (a INT) AS a = 2^31 - 1;
```

## Temporary Macros

```sql
CREATE OR REPLACE TEMP MACRO m(x) AS x + 1;
```

A TEMP macro is scoped to the current connection and disappears when the connection closes.

## Gotchas and Limitations

### Subquery macros inside table functions

Table macros and scalar macros defined using scalar subqueries cannot be used inside the arguments to table functions. You may see errors like:

```text
Binder Error: Table function cannot contain subqueries
```

### Overloads are not incremental

You can’t "add another overload" later with a second `CREATE MACRO ...` statement of the same name.
Define all overloads together (or drop/replace the macro).

### Recursive macros are not supported

Recursive definitions will eventually hit the expression depth limit.

### Function chaining (dot operator) on the first function

In macros, rewriting the *first* function call using the dot operator can fail because the macro parameter may be interpreted as a column reference.

Works:

```sql
CREATE OR REPLACE MACRO low(s) AS lower(s);
SELECT low('AA');
```

May fail:

```sql
CREATE OR REPLACE MACRO low(s) AS s.lower();
SELECT low('AA');
```

## References

- DuckDB CREATE MACRO: https://duckdb.org/docs/sql/statements/create_macro
- DuckDB query_table function: https://duckdb.org/docs/guides/sql_features/query_and_query_table_functions
