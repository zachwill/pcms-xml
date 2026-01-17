# DuckDB ASOF JOIN

## Purpose

Use `ASOF JOIN` to match time-series rows to the *nearest preceding* row in another table ("as of" a timestamp). This is a common pattern for joining events to the latest known state (prices, FX rates, sensor readings, feature flags, etc.) without writing a window-function subquery.

## Quick Start

```sql
-- Two ordered tables (example data hosted by DuckDB)
CREATE TABLE prices   AS FROM 'https://duckdb.org/data/prices.csv';
CREATE TABLE holdings AS FROM 'https://duckdb.org/data/holdings.csv';

-- For each holding timestamp, find the most recent price at/before that time
SELECT
  h.ticker,
  h.when AS holdings_when,
  p.when AS price_when,
  h.shares,
  p.price,
  h.shares * p.price AS value
FROM holdings h
ASOF JOIN prices p
  ON h.ticker = p.ticker
 AND h.when >= p.when
ORDER BY ALL;
```

## How ASOF JOIN Works

An ASOF join:

- behaves like a join on one or more **equality keys** (e.g. `ticker`) plus a final **time inequality**;
- returns **at most one match** from the right-hand side for each left-hand row;
- picks the row on the right with the **largest timestamp that is still `<=` the left timestamp** (for the common `>=` form).

This is especially useful when the two tables are sampled at different rates.

## Inner vs LEFT ASOF JOIN

### Inner ASOF JOIN

Rows on the left are dropped when no match exists on the right.

```sql
SELECT h.ticker, h.when, h.shares * p.price AS value
FROM holdings h
ASOF JOIN prices p
  ON h.ticker = p.ticker
 AND h.when >= p.when;
```

### LEFT ASOF JOIN

Preserves all left rows; unmatched right values become `NULL`.

```sql
SELECT h.ticker, h.when, h.shares * p.price AS value
FROM holdings h
ASOF LEFT JOIN prices p
  ON h.ticker = p.ticker
 AND h.when >= p.when
ORDER BY ALL;
```

## ASOF JOIN with `USING`

When the join keys have the same names, you can use `USING`. For ASOF joins:

- all but the last column in `USING(...)` are equality keys
- the **last** column is the timestamp key and uses the implicit inequality `>=`

```sql
SELECT ticker, h.when, p.price, h.shares, h.shares * p.price AS value
FROM holdings h
ASOF JOIN prices p USING (ticker, "when");
```

### Gotcha: column merging with `USING`

Like standard SQL joins, `USING` **merges** the join columns in the result.

That’s fine for equality keys like `ticker`, but the timestamp column is special in an ASOF join: `h.when` and `p.when` are often *different*.

If you want both timestamps, select them explicitly:

```sql
SELECT
  h.ticker,
  h.when AS holdings_when,
  p.when AS price_when,
  h.shares,
  p.price
FROM holdings h
ASOF JOIN prices p USING (ticker, "when");
```

## Common Patterns

### Join events to latest known state

```sql
SELECT
  e.user_id,
  e.ts,
  s.state,
  s.ts AS state_ts
FROM events e
ASOF LEFT JOIN user_state s
  ON e.user_id = s.user_id
 AND e.ts >= s.ts;
```

### Multiple equality keys

```sql
SELECT *
FROM trades t
ASOF JOIN fx_rates r
  ON t.currency = r.currency
 AND t.venue    = r.venue
 AND t.ts >= r.ts;
```

## References

- DuckDB ASOF join documentation: https://duckdb.org/docs/sql/query_syntax/asof_join.html
- Blog post (background + implementation): https://duckdb.org/2023/09/15/asof-joins-fuzzy-temporal-lookups.html
