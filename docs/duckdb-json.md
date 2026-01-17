# DuckDB JSON

## Purpose

Work with JSON data in DuckDB using the built-in `json` extension. Read JSON files, extract values, transform JSON to native types, and create JSON output.

## Quick Start

```sql
-- Read JSON file (auto-detect schema)
SELECT * FROM 'data.json';

-- Extract from JSON column
SELECT j->'$.name' FROM my_table;

-- Transform JSON to struct
SELECT json_transform(j, '{"id": "INTEGER", "name": "VARCHAR"}') FROM my_table;
```

## Reading JSON Files

### Auto-detect (simplest)

```sql
SELECT * FROM 'todos.json';
SELECT * FROM '*.json';           -- glob pattern
SELECT * FROM 'data/*.json.gz';   -- compressed
```

### With `read_json`

```sql
SELECT *
FROM read_json('todos.json',
    format = 'array',             -- array | newline_delimited | unstructured | auto
    columns = {
        userId: 'UBIGINT',
        id: 'UBIGINT',
        title: 'VARCHAR',
        completed: 'BOOLEAN'
    }
);
```

### Create table from JSON

```sql
CREATE TABLE todos AS SELECT * FROM 'todos.json';
```

### Common parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `format` | `auto`, `array`, `newline_delimited`, `unstructured` | `array` |
| `columns` | Struct of column names and types | auto-detect |
| `auto_detect` | Auto-detect schema | `true` |
| `maximum_depth` | Nesting depth for schema detection (-1 = unlimited) | `-1` |
| `ignore_errors` | Skip malformed records (NDJSON only) | `false` |
| `compression` | `auto_detect`, `none`, `gzip`, `zstd` | `auto_detect` |

## JSON Extraction

DuckDB supports JSONPath (`$.key`) and JSON Pointer (`/key`) syntax.

> **Note:** JSON uses 0-based indexing (unlike DuckDB arrays which are 1-based).

### Operators

| Operator | Returns | Example |
|----------|---------|---------|
| `->` | `JSON` | `j->'$.name'` returns `"Alice"` |
| `->>` | `VARCHAR` | `j->>'$.name'` returns `Alice` |

### Extraction functions

| Function | Description |
|----------|-------------|
| `json_extract(json, path)` | Extract as JSON (alias: `->`) |
| `json_extract_string(json, path)` | Extract as VARCHAR (alias: `->>`) |
| `json_exists(json, path)` | Returns true if path exists |
| `json_value(json, path)` | Extract scalar only (NULL for arrays/objects) |

### Examples

```sql
CREATE TABLE example (j JSON);
INSERT INTO example VALUES
    ('{"family": "anatidae", "species": ["duck", "goose", "swan"]}');

-- JSONPath syntax
SELECT j->'$.family' FROM example;           -- "anatidae"
SELECT j->>'$.family' FROM example;          -- anatidae (no quotes)
SELECT j->'$.species[0]' FROM example;       -- "duck"
SELECT j->'$.species[#-1]' FROM example;     -- "swan" (last element)
SELECT j->'$.species[*]' FROM example;       -- ["duck", "goose", "swan"]

-- JSON Pointer syntax
SELECT j->'/family' FROM example;            -- "anatidae"
SELECT j->'/species/0' FROM example;         -- "duck"

-- Dot notation (shorthand)
SELECT j.family FROM example;                -- "anatidae"
SELECT j.species[0] FROM example;            -- "duck"

-- Extract multiple paths at once (more efficient)
SELECT json_extract(j, ['$.family', '$.species']) FROM example;
```

### Escaping special characters

```sql
SELECT '{"d[u].ck": 42}'->'$."d[u].ck"';     -- 42
```

## JSON Scalar Functions

| Function | Description |
|----------|-------------|
| `json_type(json[, path])` | Returns type: `OBJECT`, `ARRAY`, `VARCHAR`, `BIGINT`, `DOUBLE`, `BOOLEAN`, `NULL` |
| `json_valid(json)` | Returns true if valid JSON |
| `json_keys(json[, path])` | Returns keys as `LIST<VARCHAR>` |
| `json_array_length(json[, path])` | Length of JSON array |
| `json_structure(json)` | Infer structure/types |
| `json_contains(haystack, needle)` | Check if needle is contained in haystack |
| `json(json)` | Parse and minify |

```sql
SELECT json_type('{"a": 1}');                -- OBJECT
SELECT json_keys('{"a": 1, "b": 2}');        -- [a, b]
SELECT json_array_length('[1, 2, 3]');       -- 3
SELECT json_structure('{"id": 1, "name": "test"}');  -- {"id":"UBIGINT","name":"VARCHAR"}
SELECT json_contains('{"key": "value"}', '"value"'); -- true
```

## Transforming JSON to Native Types

Convert JSON to DuckDB `STRUCT` and `LIST` types for efficient processing.

| Function | Description |
|----------|-------------|
| `json_transform(json, structure)` | Transform JSON according to structure |
| `from_json(json, structure)` | Alias for `json_transform` |
| `json_transform_strict(json, structure)` | Throws error on type cast failure |

```sql
SELECT json_transform(
    '{"id": 1, "name": "Alice", "scores": [95, 87, 92]}',
    '{"id": "INTEGER", "name": "VARCHAR", "scores": ["INTEGER"]}'
);
-- {'id': 1, 'name': Alice, 'scores': [95, 87, 92]}

-- Missing keys become NULL
SELECT json_transform(
    '{"id": 1}',
    '{"id": "INTEGER", "name": "VARCHAR"}'
);
-- {'id': 1, 'name': NULL}
```

## JSON Aggregate Functions

| Function | Description |
|----------|-------------|
| `json_group_array(value)` | Aggregate values into JSON array |
| `json_group_object(key, value)` | Aggregate key-value pairs into JSON object |
| `json_group_structure(json)` | Combined structure of all JSON values |

```sql
CREATE TABLE kv (k VARCHAR, v INTEGER);
INSERT INTO kv VALUES ('duck', 42), ('goose', 7);

SELECT json_group_array(v) FROM kv;          -- [42, 7]
SELECT json_group_object(k, v) FROM kv;      -- {"duck":42,"goose":7}
```

## JSON Table Functions

Flatten JSON into rows:

| Function | Description |
|----------|-------------|
| `json_each(json[, path])` | One row per top-level element |
| `json_tree(json[, path])` | One row per element (depth-first traversal) |

```sql
SELECT key, value, type
FROM json_each('{"a": 1, "b": [2, 3]}');
```

| key | value | type |
|-----|-------|------|
| a | 1 | UBIGINT |
| b | [2,3] | ARRAY |

## Writing JSON

```sql
-- Write query result to JSON file
COPY (SELECT * FROM my_table) TO 'output.json';

-- Write as JSON array (not newline-delimited)
COPY (SELECT * FROM my_table) TO 'output.json' (ARRAY true);
```

## Common Patterns

### Read NDJSON (newline-delimited)

```sql
SELECT * FROM read_ndjson('events.ndjson');
-- or
SELECT * FROM read_json('events.ndjson', format = 'newline_delimited');
```

### Handle inconsistent schemas

```sql
SELECT * FROM read_json('*.json', union_by_name = true);
```

### Extract nested data

```sql
-- Given: {"user": {"profile": {"name": "Alice"}}}
SELECT j->'$.user.profile.name' AS name FROM data;
```

### Unnest JSON arrays

```sql
-- Given: {"tags": ["a", "b", "c"]}
SELECT unnest(json_transform(j->'$.tags', '["VARCHAR"]')) AS tag
FROM data;
```

### Convert JSON column to struct

```sql
ALTER TABLE my_table
ADD COLUMN data_struct STRUCT(id INTEGER, name VARCHAR);

UPDATE my_table
SET data_struct = json_transform(json_col, '{"id": "INTEGER", "name": "VARCHAR"}');
```

## References

- https://duckdb.org/docs/data/json/overview
- https://duckdb.org/docs/data/json/json_functions
- https://duckdb.org/docs/data/json/loading_json
