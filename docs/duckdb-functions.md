# DuckDB Functions

## Purpose

Reference for commonly used DuckDB functions: window functions for row-level analytics, aggregate functions for summarization, and utility functions for data transformation.

## Quick Start

```sql
-- Window function: row number per group
SELECT *, row_number() OVER (PARTITION BY category ORDER BY date) AS rn FROM sales;

-- Aggregate with filter
SELECT count(*) FILTER (WHERE status = 'active') AS active_count FROM users;

-- String formatting
SELECT format('Hello, {}!', name) FROM users;
```

## Window Functions

Window functions compute values across rows related to the current row without collapsing them.

### Basic Syntax

```sql
function() OVER (
    PARTITION BY column       -- optional: group rows
    ORDER BY column           -- optional: order within partition
    ROWS/RANGE frame_spec     -- optional: define window frame
)
```

### Ranking Functions

| Function | Description |
|----------|-------------|
| `row_number()` | Unique sequential number (1, 2, 3, ...) |
| `rank()` | Rank with gaps for ties (1, 2, 2, 4) |
| `dense_rank()` | Rank without gaps (1, 2, 2, 3) |
| `ntile(n)` | Divide into n buckets |
| `percent_rank()` | Relative rank as percentage (0 to 1) |
| `cume_dist()` | Cumulative distribution (0 to 1) |

```sql
SELECT
    name,
    score,
    row_number() OVER (ORDER BY score DESC) AS position,
    rank() OVER (ORDER BY score DESC) AS rank,
    dense_rank() OVER (ORDER BY score DESC) AS dense_rank,
    ntile(4) OVER (ORDER BY score DESC) AS quartile
FROM players;
```

### Value Functions

| Function | Description |
|----------|-------------|
| `lag(expr, n, default)` | Value from n rows before |
| `lead(expr, n, default)` | Value from n rows after |
| `first_value(expr)` | First value in frame |
| `last_value(expr)` | Last value in frame |
| `nth_value(expr, n)` | Nth value in frame |

```sql
SELECT
    date,
    amount,
    lag(amount, 1, 0) OVER (ORDER BY date) AS prev_amount,
    amount - lag(amount) OVER (ORDER BY date) AS change,
    first_value(amount) OVER (ORDER BY date) AS first_amount
FROM daily_sales;
```

### Handling NULLs

Use `IGNORE NULLS` to skip NULL values:

```sql
SELECT
    date,
    value,
    last_value(value IGNORE NULLS) OVER (ORDER BY date) AS last_known_value
FROM sensor_data;
```

### Frame Specifications

Control which rows are included in calculations:

```sql
-- Default: all rows from start to current row
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW

-- Fixed window: 3 rows before and after
ROWS BETWEEN 3 PRECEDING AND 3 FOLLOWING

-- Range-based: time window
RANGE BETWEEN INTERVAL 7 DAYS PRECEDING AND CURRENT ROW
```

Example: 7-day moving average

```sql
SELECT
    date,
    amount,
    avg(amount) OVER (
        ORDER BY date
        RANGE BETWEEN INTERVAL 6 DAYS PRECEDING AND CURRENT ROW
    ) AS moving_avg_7d
FROM daily_sales;
```

### Named Windows

Share window definitions across functions:

```sql
SELECT
    date,
    amount,
    min(amount) OVER w AS min_7d,
    avg(amount) OVER w AS avg_7d,
    max(amount) OVER w AS max_7d
FROM daily_sales
WINDOW w AS (
    ORDER BY date
    RANGE BETWEEN INTERVAL 6 DAYS PRECEDING AND CURRENT ROW
);
```

## Aggregate Functions

### Common Aggregates

| Function | Description |
|----------|-------------|
| `count(*)` / `count()` | Count rows |
| `count(DISTINCT x)` | Count unique values |
| `sum(x)` | Sum of values |
| `avg(x)` | Average |
| `min(x)` / `max(x)` | Minimum / Maximum |
| `string_agg(x, sep)` | Concatenate strings |
| `list(x)` / `array_agg(x)` | Collect into list |

### FILTER Clause

Apply conditions to aggregates:

```sql
SELECT
    count(*) AS total,
    count(*) FILTER (WHERE status = 'active') AS active,
    count(*) FILTER (WHERE status = 'pending') AS pending,
    sum(amount) FILTER (WHERE type = 'credit') AS total_credits
FROM transactions;
```

### ORDER BY in Aggregates

Control order for order-sensitive aggregates:

```sql
SELECT
    customer_id,
    string_agg(product ORDER BY purchase_date) AS purchase_history,
    list(product ORDER BY purchase_date DESC) AS recent_purchases
FROM orders
GROUP BY customer_id;
```

### Top-N Aggregates

Get top N values per group efficiently:

```sql
SELECT
    category,
    max(product, 3) AS top_3_products,        -- top 3 by product name
    arg_max(product, sales, 3) AS best_sellers -- top 3 by sales
FROM products
GROUP BY category;
```

### Statistical Functions

| Function | Description |
|----------|-------------|
| `stddev(x)` / `stddev_samp(x)` | Sample standard deviation |
| `stddev_pop(x)` | Population standard deviation |
| `variance(x)` / `var_samp(x)` | Sample variance |
| `var_pop(x)` | Population variance |
| `median(x)` | Median value |
| `quantile_cont(x, p)` | Continuous percentile |
| `quantile_disc(x, p)` | Discrete percentile |
| `mode(x)` | Most frequent value |

```sql
SELECT
    category,
    avg(price) AS mean,
    median(price) AS median,
    stddev(price) AS std_dev,
    quantile_cont(price, [0.25, 0.5, 0.75]) AS quartiles
FROM products
GROUP BY category;
```

## String Functions

| Function | Description |
|----------|-------------|
| `length(s)` | String length |
| `lower(s)` / `upper(s)` | Change case |
| `trim(s)` / `ltrim(s)` / `rtrim(s)` | Remove whitespace |
| `left(s, n)` / `right(s, n)` | Extract n characters |
| `substr(s, start, len)` | Extract substring |
| `replace(s, from, to)` | Replace occurrences |
| `split_part(s, delim, n)` | Split and get nth part |
| `regexp_extract(s, pattern)` | Extract regex match |
| `regexp_replace(s, pattern, repl)` | Regex replace |

```sql
SELECT
    lower(trim(email)) AS clean_email,
    split_part(email, '@', 2) AS domain,
    regexp_extract(phone, '\d{3}-\d{4}') AS last_seven
FROM contacts;
```

### String Formatting

```sql
-- format() with {} placeholders
SELECT format('Order #{}: {} items, ${}', order_id, qty, amount) FROM orders;

-- printf() with % placeholders
SELECT printf('%.2f%%', rate * 100) FROM rates;

-- concat() / || operator
SELECT first_name || ' ' || last_name AS full_name FROM users;
```

## Date/Time Functions

| Function | Description |
|----------|-------------|
| `current_date` / `today()` | Current date |
| `current_timestamp` / `now()` | Current timestamp |
| `date_part(part, date)` | Extract component |
| `date_trunc(part, date)` | Truncate to precision |
| `date_diff(part, start, end)` | Difference between dates |
| `date_add(date, interval)` | Add interval |
| `strftime(format, date)` | Format as string |
| `strptime(str, format)` | Parse from string |

```sql
SELECT
    order_date,
    date_part('year', order_date) AS year,
    date_part('month', order_date) AS month,
    date_trunc('month', order_date) AS month_start,
    date_diff('day', order_date, ship_date) AS days_to_ship,
    strftime(order_date, '%Y-%m-%d') AS formatted
FROM orders;
```

### Interval Arithmetic

```sql
SELECT
    current_date AS today,
    current_date + INTERVAL 7 DAY AS next_week,
    current_date - INTERVAL 1 MONTH AS last_month,
    current_timestamp + INTERVAL '2 hours 30 minutes' AS later
;
```

## List Functions

| Function | Description |
|----------|-------------|
| `list_value(...)` / `[...]` | Create list |
| `list_concat(l1, l2)` | Concatenate lists |
| `list_contains(list, elem)` | Check membership |
| `list_distinct(list)` | Remove duplicates |
| `list_filter(list, lambda)` | Filter elements |
| `list_transform(list, lambda)` | Transform elements |
| `list_sort(list)` | Sort list |
| `unnest(list)` | Expand to rows |

```sql
SELECT
    tags,
    list_contains(tags, 'urgent') AS is_urgent,
    list_filter(tags, x -> x LIKE 'priority_%') AS priority_tags,
    list_transform(tags, x -> upper(x)) AS upper_tags
FROM items;

-- Unnest to rows
SELECT id, unnest(tags) AS tag FROM items;
```

## Struct/Map Functions

| Function | Description |
|----------|-------------|
| `struct_pack(...)` / `{...}` | Create struct |
| `struct_extract(s, key)` / `s.key` | Get field |
| `map(keys, values)` | Create map |
| `map_keys(map)` | Get all keys |
| `map_values(map)` | Get all values |
| `element_at(map, key)` | Get value by key |

```sql
SELECT
    {'name': 'Alice', 'age': 30} AS person,
    person.name AS name,
    map(['a', 'b'], [1, 2]) AS lookup,
    element_at(lookup, 'a') AS value_a
;
```

## Type Conversion

| Function | Description |
|----------|-------------|
| `cast(x AS type)` / `x::type` | Convert type |
| `try_cast(x AS type)` | Convert or NULL on failure |
| `typeof(x)` | Get type name |

```sql
SELECT
    '123'::INTEGER AS int_val,
    cast('2024-01-15' AS DATE) AS date_val,
    try_cast('invalid' AS INTEGER) AS safe_int  -- returns NULL
;
```

## Conditional Functions

| Function | Description |
|----------|-------------|
| `coalesce(a, b, ...)` | First non-NULL value |
| `nullif(a, b)` | NULL if a = b |
| `ifnull(a, b)` | b if a is NULL |
| `if(cond, then, else)` | Conditional expression |
| `CASE WHEN ... END` | Multi-branch conditional |

```sql
SELECT
    coalesce(nickname, first_name, 'Anonymous') AS display_name,
    nullif(status, 'unknown') AS clean_status,
    if(amount > 100, 'large', 'small') AS size,
    CASE
        WHEN score >= 90 THEN 'A'
        WHEN score >= 80 THEN 'B'
        ELSE 'C'
    END AS grade
FROM records;
```

## Query Functions

List available functions:

```sql
-- All functions
SELECT * FROM duckdb_functions();

-- Filter by name
SELECT function_name, function_type, return_type, parameters
FROM duckdb_functions()
WHERE function_name LIKE 'list_%';
```

## References

- https://duckdb.org/docs/sql/functions/overview
- https://duckdb.org/docs/sql/functions/window_functions
- https://duckdb.org/docs/sql/functions/aggregates
- https://duckdb.org/docs/sql/functions/text
- https://duckdb.org/docs/sql/functions/date
