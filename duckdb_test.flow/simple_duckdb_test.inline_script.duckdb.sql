-- result_collection=last_statement_all_rows
-- $name (text) = Ben
-- $age (text) = 20

ATTACH '$res:f/env/postgres' AS db (TYPE postgres);

CREATE TABLE friends (
  name text,
  age int
);

INSERT INTO friends VALUES ($name, $age);

SELECT * FROM friends;

SELECT * FROM db.pcms.lookups LIMIT 5;
