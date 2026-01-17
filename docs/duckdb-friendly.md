# DuckDB Friendly SQL

## Purpose

Write more concise, readable SQL using DuckDB's "Friendly SQL" extensions. These features reduce boilerplate and make common patterns easier to express.

## Quick Start

```sql
-- FROM-first syntax (SELECT is optional)
FROM my_table;

-- Exclude columns from SELECT *
SELECT * EXCLUDE (internal_id, created_at) FROM users;

-- Auto-detect GROUP BY columns
SELECT region, category, sum(sales) FROM orders GROUP BY ALL;

-- Reuse column aliases
SELECT price * qty AS total, total * 0.1 AS tax FROM line_items;
```

## FROM-First Syntax

DuckDB allows `FROM` to come first, with `SELECT` being optional.

```sql
-- These are equivalent
FROM sales;
SELECT * FROM sales;

-- Chain operations naturally
FROM sales
WHERE year = 2024
ORDER BY amount DESC
LIMIT 10;
```

## Column Selection

### EXCLUDE Clause

Remove columns from `SELECT *`:

```sql
SELECT * EXCLUDE (password, ssn) FROM users;
SELECT * EXCLUDE (created_at, updated_at) FROM orders;
```

### REPLACE Clause

Transform columns in `SELECT *`:

```sql
SELECT * REPLACE (upper(name) AS name) FROM users;
SELECT * REPLACE (amount / 100.0 AS amount) FROM transactions;
```

### COLUMNS Expression

Apply expressions to multiple columns at once:

```sql
-- Sum all numeric columns
SELECT sum(COLUMNS(*)) FROM sales;

-- Apply to columns matching pattern
SELECT min(COLUMNS('.*_at$')) FROM events;  -- all timestamp columns

-- With lambda functions
SELECT COLUMNS(* EXCLUDE id).lower() FROM users;
```

## GROUP BY ALL / ORDER BY ALL

Let DuckDB infer grouping and ordering:

```sql
-- GROUP BY ALL infers non-aggregated columns
SELECT region, product, sum(qty), avg(price)
FROM sales
GROUP BY ALL;

-- ORDER BY ALL orders by all columns (useful for deterministic output)
SELECT * FROM results ORDER BY ALL;
```

## Column Aliases

### Reusable Aliases (Lateral)

Reference earlier aliases in the same SELECT:

```sql
SELECT
    price * quantity AS subtotal,
    subtotal * 0.08 AS tax,
    subtotal + tax AS total
FROM line_items;
```

### Prefix Alias Syntax

Write aliases before expressions for readability:

```sql
SELECT
    full_name: first_name || ' ' || last_name,
    age: date_part('year', age(birth_date))
FROM people;
```

### Aliases in WHERE/GROUP BY/HAVING

Use column aliases in subsequent clauses:

```sql
SELECT
    category,
    sum(amount) AS total
FROM sales
WHERE total > 1000    -- alias works in WHERE
GROUP BY category
HAVING total > 5000;  -- and in HAVING
```

## Table Operations

### CREATE OR REPLACE TABLE

Avoid `DROP IF EXISTS` boilerplate:

```sql
CREATE OR REPLACE TABLE summary AS
SELECT region, sum(sales) AS total
FROM orders
GROUP BY region;
```

### CREATE TABLE AS SELECT (CTAS)

Create tables from queries without defining schema:

```sql
CREATE TABLE active_users AS
SELECT * FROM users WHERE last_login > current_date - 30;
```

### INSERT BY NAME

Match columns by name instead of position:

```sql
INSERT INTO users BY NAME
SELECT name, email, created_at FROM new_users;
```

### INSERT OR REPLACE / INSERT OR IGNORE

Handle conflicts elegantly:

```sql
-- Replace on conflict
INSERT OR REPLACE INTO cache (key, value, updated_at)
VALUES ('config', '{}', now());

-- Skip on conflict
INSERT OR IGNORE INTO users (email, name)
SELECT email, name FROM imports;
```

## UNION BY NAME

Combine tables by column name (not position):

```sql
SELECT name, email FROM users_2023
UNION ALL BY NAME
SELECT email, name, phone FROM users_2024;  -- different column order
```

## Trailing Commas

DuckDB allows trailing commas everywhere:

```sql
SELECT
    id,
    name,
    email,  -- trailing comma OK
FROM users
WHERE active = true;
```

## Numeric Literals

Use underscores for readability:

```sql
SELECT * FROM products WHERE price > 1_000_000;
INSERT INTO config VALUES ('timeout_ms', 30_000);
```

## List and Struct Syntax

### Create lists with brackets

```sql
SELECT [1, 2, 3] AS numbers;
SELECT ['a', 'b', 'c'] AS letters;
```

### Create structs with braces

```sql
SELECT {'name': 'Alice', 'age': 30} AS person;
SELECT {'x': 1, 'y': 2} AS point;
```

### Access struct fields with dot notation

```sql
SELECT person.name, person.age FROM people;
SELECT (data).nested.field FROM json_data;
```

## List Slicing

Python-style list and string slicing:

```sql
SELECT [1, 2, 3, 4, 5][2:4];     -- [2, 3, 4]
SELECT [1, 2, 3, 4, 5][-2:];     -- [4, 5] (from end)
SELECT 'hello'[1:3];             -- 'hel'
```

## PIVOT / UNPIVOT

### PIVOT (long to wide)

```sql
PIVOT sales
ON year
USING sum(amount)
GROUP BY region;
```

### UNPIVOT (wide to long)

```sql
UNPIVOT monthly_sales
ON jan, feb, mar
INTO NAME month VALUE amount;
```

## DESCRIBE / SUMMARIZE

### DESCRIBE

Get schema information:

```sql
DESCRIBE my_table;
DESCRIBE SELECT * FROM my_query;
```

### SUMMARIZE

Get statistics:

```sql
SUMMARIZE my_table;
SUMMARIZE SELECT * FROM large_dataset LIMIT 10000;
```

## Function Chaining (Dot Operator)

Chain function calls naturally:

```sql
-- Traditional
SELECT replace(upper(trim(name)), ' ', '_') FROM users;

-- With chaining
SELECT name.trim().upper().replace(' ', '_') FROM users;

-- For literals, use parentheses
SELECT ('hello world').upper().replace(' ', '_');
```

## Top-N Per Group

Use `arg_max`/`arg_min` instead of window functions:

```sql
-- Get the most recent order per customer
SELECT customer_id, arg_max(order_id, order_date) AS latest_order
FROM orders
GROUP BY customer_id;

-- Get top 3 products per category by sales
SELECT category, max(product_name, 3) AS top_products
FROM sales
GROUP BY category;
```

## QUALIFY Clause

Filter window function results without subqueries:

```sql
-- Get top 3 products per category
SELECT category, product, sales
FROM products
QUALIFY row_number() OVER (PARTITION BY category ORDER BY sales DESC) <= 3;
```

## MERGE INTO

Flexible upserts without requiring primary keys:

```sql
MERGE INTO target
USING source
ON target.id = source.id
WHEN MATCHED THEN UPDATE SET value = source.value
WHEN NOT MATCHED THEN INSERT (id, value) VALUES (source.id, source.value);
```

## References

- https://duckdb.org/docs/sql/dialect/friendly_sql
- https://duckdb.org/docs/sql/statements/pivot
- https://duckdb.org/docs/sql/query_syntax/qualify
