# AGENTS.md — `reference/`

This folder is an **archive of external / legacy PCMS-adjacent projects** that are useful for cross-checking ideas, terminology, and downstream “what do teams actually *do* with PCMS?” workflows.

Nothing in here is wired into the current Bun/Windmill flow. Treat these as **read-only reference artifacts**.

## What’s in here

### `xpcms.txt`
A text-dump of a separate Python-based PCMS ingestion tool (“XPCMS”). It’s useful as an alternate mental model:

- **Goal:** convert PCMS XML extracts → JSON and load to Postgres.
- **Storage model:** appears to favor **JSONB/variant blobs** per record (keep the raw-ish payload + metadata), instead of fully-normalized relational tables.
- **Key implementation ideas worth cross-checking:**
  - explicit handling of `xsi:nil` (see `XSI_NIL_VAL = {"@xsi:nil": "true"}` in `src/xpcms/extract.py`).
  - a central `snake_case()` helper used during load/parse.
  - extract name → xpath logic (`get_xpath_for_extract`, `extract_key_map`, `xpath_suffixes`).
  - “latest record” pattern via views (e.g. `create_view_cap_projection_meta.sql` selects the most recent `lastChangeDate`).

**How this can inform this repo:**
- sanity check our extract coverage and naming.
- compare their xpath/extract routing vs our lineage parser.
- note the JSONB-blob approach as a fallback/diagnostic layer (useful for debugging or audit trails).

### `excel-salary-book.txt`
A text-dump of a Python project that uses a PCMS database to generate **salary-cap Excel workbooks**.

- **Goal:** produce analyst-facing sheets (Excel/HTML) from database queries.
- **Shape:**
  - `queries/*.sql` that look like “report queries” (budget, cap projections, bonuses, trade exceptions, offer sheets, etc.)
  - `generate_excel.py` (OpenPyXL) and `generate_sheets.py` (Jinja templates)
  - `sheets.py` that encodes tax/apron logic and report structure
  - `notes.md` describing the “Salary Book” information requirements

**How this can inform this repo:**
- provides a concrete example of the *outputs analysts expect* from PCMS-derived data.
- a checklist of derived concepts we may eventually want to compute (options/guarantees, bonus likely/unlikely, trade kicker handling, cap/tax/apron variance, etc.).

## Practical tips when reading these dumps

- These are **not runnable codebases here**—they’re captured as text for reference.
- When cross-checking behavior, focus on:
  - key-field identifiers (what they treat as primary keys)
  - nil/null semantics
  - how “latest” records are selected
  - the reporting queries (what downstream consumers actually ask the DB)

## Suggested follow-up questions (for us / the agent)

- Do any of the `excel-salary-book` SQL queries map cleanly onto tables we’re loading (e.g. what joins/keys are assumed)?
- Are there derived entities we should add to our pipeline (cap projections “latest”, team budgets “latest”, exceptions warehouse views, etc.)?
- Would it be useful to keep a minimal **raw JSONB landing table** for audits, alongside the clean relational schema?
