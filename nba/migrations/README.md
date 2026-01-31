# nba/migrations

SQL migrations for the `nba` Postgres schema.

Notes:
- These are separate from the repo-root `migrations/` directory (which is currently PCMS-focused).
- Ensure whatever migration runner/deploy process you use also executes the SQL files in this directory.
