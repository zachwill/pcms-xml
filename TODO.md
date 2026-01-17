# PCMS XML Flow — Project Primer + TODO / Known Issues

Last updated: 2026-01-17

This file is intentionally written as the **single handoff document** for a brand new coding model/agent.

If you only read one file before making changes, read this.

---

## 0) What this repo does (high-level)

Windmill flow (Bun runtime) that imports **NBA PCMS (Player Contract Management System)** XML extracts into PostgreSQL.

### Core design principle

> **Clean once, use everywhere.**

We do all XML weirdness handling (xsi:nil, nested wrappers, camelCase keys) **once** during the lineage step.

All downstream import steps are “dumb”:

- read clean JSON arrays from `.shared/…/*.json`
- insert/upsert directly into `pcms.*` tables

---

## 1) Architecture (v3)

```
S3 ZIP → Extract → XML → CLEAN JSON → PostgreSQL
                          ↑
                    snake_case keys
                    null (not xsi:nil)
                    flat arrays (no XML wrappers)
```

### Step A: Lineage
- Downloads zip, extracts XML
- Parses XML → **clean JSON files** in `.shared/nba_pcms_full_extract/`

### Steps B-P: Import scripts (+ Step L: Finalize)
- 17 import scripts read clean JSON files and insert to Postgres
- Scripts should not need `safeNum()` / `nilSafe()` / per-field transformation
- See `flow.yaml` for full step list (a, b, r, c, d, e, f, g, h, q, i, j, k, m, n, o, p, l)

---

## 2) Repo map (where things live)

- `import_pcms_data.flow/`
  - `flow.yaml` — flow definition
  - `lineage_management_*.ts` — XML → clean JSON
  - `*.inline_script.ts` — import steps

- `migrations/` — SQL migrations for `pcms` schema

- `scripts/` — local dev tooling
  - `parse-xml-to-json.ts` — mirrors lineage step, local runs
  - `show-all-paths.ts` — path discovery/debug

- `.shared/`
  - `.shared/nba_pcms_full_extract/` — **clean JSON output** (HUGE)
  - `.shared/nba_pcms_full_extract_xml/` — source XML (HUGE)

- `SCHEMA.md` — the intended target schema (tables/columns)

- `reference/` — archived external projects and analyst sheets
  - `reference/AGENTS.md` — what’s in `reference/` and why it matters
  - `reference/sean/AGENTS.md` — how the analyst spreadsheets are structured + what they imply

---

## 3) The `.shared/` footgun (common failure mode)

Some import scripts accept an `extract_dir` and will choose the first subdirectory found.

If you pass `extract_dir = ".shared"`, it may pick:
- `.shared/nba_pcms_full_extract_xml` (wrong; XML)

Instead always use:
- `extract_dir = ".shared/nba_pcms_full_extract"` (right; clean JSON)

---

## 4) The current “clean JSON” file set (what lineage outputs)

In the current `.shared/nba_pcms_full_extract/` directory, the lineage step outputs these **clean** JSON files:

- `players.json`
- `contracts.json`
- `transactions.json`
- `ledger.json`
- `trades.json`
- `draft_picks.json`
- `draft_pick_summaries.json`
- `team_exceptions.json`
- `team_budgets.json` (note: still nested)
- `lookups.json`
- `cap_projections.json`
- `yearly_system_values.json`
- `yearly_salary_scales.json`
- `non_contract_amounts.json`
- `rookie_scale_amounts.json`
- `team_transactions.json`
- `tax_rates.json`
- `tax_teams.json`
- `transaction_waiver_amounts.json`
- `two_way.json`
- `two_way_utility.json`

**Important:** `team_transactions.json` is produced but currently not imported (see Section 8).

---

## 5) What “clean JSON” means in practice

Clean JSON files should be:
- arrays of records (not nested under XML wrapper objects)
- snake_case keys
- `null` for missing values (not `{ "@_xsi:nil": "true" }`)

If a file is still nested (example: `team_budgets.json` appears nested under `budget_teams/budget_team/...`), you can:
- either fix the lineage parser to flatten it
- or write an importer that navigates the nested shape (less ideal; prefer flattening once)

---

## 6) Schema reality check: how to think about SCHEMA.md

`SCHEMA.md` is a practical “destination spec”:
- It includes tables that map to PCMS extracts.
- It also includes some tables that may be empty for a given extract run.
- It includes a few “UI projection” helper tables that are not strictly sourced from PCMS.

When something seems missing, ask:
1) Is there a `.shared/*.json` file that has no import + no table?
2) Is there a table in SCHEMA.md that has no corresponding extract or the extract is empty?

---

## 7) Current known gaps / next priorities (the real TODO)

These are the “if we had another week” items that most improve correctness and analyst usefulness.

### (A) Add ingestion for **Team Transactions** (team-tr-extract)

There is a large clean JSON file:
- `.shared/nba_pcms_full_extract/team_transactions.json`

Sample fields include:
- `team_transaction_id`, `team_id`, `team_transaction_type_lk`, `team_ledger_seqno`, `transaction_date`
- adjustment fields like `cap_adjustment`, `tax_adjustment`, **`cap_hold_adjustment`**, `tax_apron_adjustment`, `mts_adjustment`

But SCHEMA.md does **not** appear to have a table for this extract.

Why this matters:
- It likely contains the adjustments/overrides that affect cap holds and team ledgers.
- It’s important for reproducing “salary book” type outputs.

Action:
- Add a `pcms.team_transactions` table (or equivalent)
- Add an import step to load it
- Include `team_code` mapping like other tables

### (B) Make “cap hold” a first-class concept (or persist the adjustments)

Sean’s / analyst tooling expects cap-hold math to be stable and explainable.

Evidence:
- `team_transactions.json` includes `cap_hold_adjustment`.
- We do not currently have clear cap-hold tables/columns beyond what might be implied by `non_contract_amounts.amount_type_lk`.

Action options:
- Persist `cap_hold_adjustment` via (A) and compute cap-hold views downstream.
- Or introduce explicit cap-hold snapshot/view tables.

### (C) Team budget “assumption” fields

The team budget extract contains fields like:
- `apron_assumption_amount`
- `qo_assumption_amount`

These appear useful for what-if planning.

Action:
- Extend `team_budget_snapshots` (or add a related table) to preserve these assumption fields.

### (D) Analyst-facing “warehouse” views/materializations

The schema is normalized; analysts often want denormalized matrices.

From `reference/sean/*` patterns (FILTER/SORTBY/VLOOKUP into warehouse sheets), we should consider creating DB views/materialized views:

- `vw_salary_warehouse` (player/team/year salary facts)
  - join `salaries`, `contracts`, `people`, `non_contract_amounts` (as needed)

- `vw_exceptions_warehouse` (team exceptions inventory by year)
  - join `team_exceptions` + `team_exception_usage`

- `vw_team_tax_context` (apron/taxpayer/repeater status by year)
  - join `tax_team_status` + `league_system_values`

These do not need to be perfect initially; even partial views unlock downstream work.

### (E) Extract/table crosswalk (prevent silent coverage gaps)

We should maintain a simple mapping document or script:
- `.shared/nba_pcms_full_extract/*.json` → importer step → destination table(s)

Reason:
- avoids “we have the file but never loaded it” situations.

---

## 8) Coverage audit: missing tables / missing imports (actionable)

This section is based on three concrete checks:

1) `ls .shared/nba_pcms_full_extract/*.json` (clean JSON files lineage outputs)
2) `rg`/parsing `import_pcms_data.flow/*.ts` for `Bun.file(`${baseDir}/*.json`)`
3) parsing `import_pcms_data.flow/*.ts` for `INSERT INTO pcms.*` and comparing against `SCHEMA.md`

### 8.1 Clean JSON produced but not imported

Exactly one clean JSON file is currently “dangling”:

- **`team_transactions.json`**
  - ✅ lineage outputs it
  - ❌ no importer reads it
  - ❌ no `INSERT INTO pcms.*` for it
  - ❌ no module step in `import_pcms_data.flow/flow.yaml`

This is the top missing ingestion piece.

### 8.2 SCHEMA tables that are not populated by import scripts (but data exists in extracts)

These tables exist in `SCHEMA.md` but are not inserted into by any import script, even though the nested data exists inside `contracts.json`:

- `pcms.contract_bonus_criteria`
  - present in `contracts.json` as nested bonus criteria structures
  - currently stored only as `contract_bonuses.criteria_json` (not normalized)

- `pcms.contract_bonus_maximums`
  - present in `contracts.json` as `bonus_maximums.bonus_maximum[]`

- `pcms.contract_protections`
  - present in `contracts.json` as `protections.protection[]`

- `pcms.contract_protection_conditions`
  - present in `contracts.json` as `protection_conditions` + nested `criteria`

- `pcms.payment_schedule_details`
  - present in `contracts.json` as `payment_schedules.payment_schedule[].schedule_details.schedule_detail[]`

If the goal is parity with analyst tooling / “salary book” outputs, these normalized child tables are likely worth importing.

### 8.3 SCHEMA tables not populated by scripts (may be optional / lookup-derived / future)

These tables exist in `SCHEMA.md` but are not populated by import scripts today. Some may be intentionally “future” or not present in PCMS extracts:

- `pcms.teams`
  - teams are currently derived from `lookups.json` for `team_code` mapping, but not inserted into `pcms.teams`

- `pcms.lk_subject_to_apron_reasons`
  - likely could be covered by the generic `pcms.lookups` table

- `pcms.draft_pick_ownership`
  - known TODO: would need parsing of free-text draft pick summaries

- `pcms.apron_constraints`
- `pcms.depth_charts`

- UI-only tables (not PCMS ingestion targets):
  - `pcms.ui_projections`
  - `pcms.ui_projection_overrides`
  - `pcms.ui_projected_salaries`

### 8.4 “waiver_priority.json” nuance

- Import scripts reference `waiver_priority.json` and handle it as optional.
- In this dataset, `.shared/nba_pcms_full_extract/` does not contain `waiver_priority.json`.
- There is a raw-ish `nba_pcms_full_extract_waiver-priority-extract.json`, and in this run it appears empty.

So this is not a bug; it’s a source-data limitation in this specific extract.

---

## ✅ Completed (no longer TODO)

### Team Code migration + imports
- **Migration:** `migrations/003_team_code_and_draft_picks.sql`
  - Renamed `pcms.teams.team_name_short` → `team_code`
  - Added `team_code` columns to many tables + indexes
  - Added `player_id` to `pcms.draft_picks`
- **Import scripts updated to populate `team_code` on new inserts** (team_id → team_code map from `lookups.json`)
  - `import_pcms_data.flow/players_&_people.inline_script.ts`
  - `import_pcms_data.flow/contracts,_versions,_bonuses_&_salaries.inline_script.ts`
  - `import_pcms_data.flow/trades,_transactions_&_ledger.inline_script.ts`
  - `import_pcms_data.flow/draft_picks.inline_script.ts`
  - `import_pcms_data.flow/team_exceptions_&_usage.inline_script.ts`
  - `import_pcms_data.flow/team_budgets.inline_script.ts`
  - `import_pcms_data.flow/system_values,_rookie_scale_&_nca.inline_script.ts`
  - `import_pcms_data.flow/transaction_waiver_amounts.inline_script.ts`
  - `import_pcms_data.flow/two-way_daily_statuses.inline_script.ts`
  - `import_pcms_data.flow/two-way_utility.inline_script.ts`
  - `import_pcms_data.flow/waiver_priority_&_ranks.inline_script.ts`
  - `import_pcms_data.flow/lookups.inline_script.ts` (teams now prefer `team_code`)

### NBA draft picks generation
- **Problem:** PCMS `draft_picks.json` currently contains DLG/WNBA picks only.
- **Fix:** `import_pcms_data.flow/generate_nba_draft_picks.inline_script.ts`
  - Generates historical NBA picks from `players.json` draft fields
  - Upserts into `pcms.draft_picks`
- **Flow step added:** `import_pcms_data.flow/flow.yaml` (step “Generate NBA Draft Picks”)

### Draft pick summaries (future picks)
- **Migration:** `migrations/004_draft_pick_tables.sql`
  - Creates `pcms.draft_pick_summaries` (raw PCMS text)
  - Creates `pcms.draft_pick_ownership` (normalized/enriched table; currently not populated)
- **Import script:** `import_pcms_data.flow/draft_pick_summaries.inline_script.ts`
- **Flow step added:** `import_pcms_data.flow/flow.yaml` (step “Draft Pick Summaries”)

### Ledger entries import failures
- **Problem:** a small number of ledger rows have `team_id = null` (WNBA “WREN” rows), plus occasional in-batch duplicates can trigger `ON CONFLICT ... cannot affect row a second time`.
- **Fix implemented in:** `import_pcms_data.flow/trades,_transactions_&_ledger.inline_script.ts`
  - Filters out `team_id == null`
  - Dedupes by `transaction_ledger_entry_id` within each batch

### Two-way daily statuses row-count issue
- The importer now processes the full extract (≈28,659 records in current `.shared/nba_pcms_full_extract/two_way.json`) and populates team codes.
  - File: `import_pcms_data.flow/two-way_daily_statuses.inline_script.ts`

---

## 🟡 Optional improvements (nice-to-have)

### Lookups import batching / dedupe
- Current script uses a very small batch size to avoid in-batch duplicate conflicts.
- Improvement: dedupe transformed rows by `(lookup_type, lookup_code)` before insert, then increase batch size.
  - File: `import_pcms_data.flow/lookups.inline_script.ts`

### Draft pick ownership parsing
- `pcms.draft_pick_ownership` exists (migration 004) but isn’t populated yet.
- If/when needed: write a parser that converts the free-text summaries (“To SAS(58) | may have …”) into structured rows.

### Teams metadata enrichment (source limitation)
- In the PCMS extract, many NBA teams have NULLs for:
  - `city`, `state_lk`, `country_lk`, `division_name`, `conference_name`, `first_game_date`
- Options if analysts need it: seed/enrich from another source (NBA API, curated CSV, etc.).

---

## 🟢 Accepted source-data limitations

These are expected to remain empty/NULL because the PCMS extract doesn’t contain the data (or contains an empty payload in this run):

- Empty/unused tables in some datasets: `apron_constraints`, `depth_charts`, etc.
- `waiver_priority`: the source extract file may be empty in this dataset.
- Always-NULL columns in `pcms.league_system_values`: `rsa_from_year`, `rsa_to_year`, `yss_from_year`, `yss_to_year`, `ysv_from_year`, `ysv_to_year`, plus related league fields.

---

## 📋 Validation checklist (current expected counts)

These counts come from the current clean JSON in `.shared/nba_pcms_full_extract/` and dry-run execution of the import scripts.

### Draft pick summaries
- [ ] `SELECT COUNT(*) FROM pcms.draft_pick_summaries;` = **450**
- [ ] `SELECT COUNT(*) FROM pcms.draft_pick_summaries WHERE draft_year >= 2026;` = **210**

### Two-way daily statuses
- [ ] `SELECT COUNT(*) FROM pcms.two_way_daily_statuses;` ≈ **28,659**

### Ledger entries
- Source `ledger.json` length: **50,713**
- Rows filtered out due to `team_id IS NULL`: **15**
- [ ] `SELECT COUNT(*) FROM pcms.ledger_entries;` = **50,698**

### Draft picks
- Source `draft_picks.json` (DLG + WNBA only): **1,169** (944 DLG + 225 WNBA)
- Generated NBA picks (from player draft info): **~1,831** (varies with dedupe / missing pick numbers)
- [ ] `SELECT COUNT(*) FROM pcms.draft_picks WHERE league_lk = 'NBA';` ≈ **1,831**
- [ ] `SELECT COUNT(*) FROM pcms.draft_picks WHERE league_lk IN ('DLG','WNBA');` = **1,169**

### Team code completeness (spot checks)
- [ ] No missing codes where a team id exists:

```sql
SELECT 'people' as tbl, COUNT(*) FROM pcms.people WHERE team_id IS NOT NULL AND team_code IS NULL
UNION ALL
SELECT 'contracts', COUNT(*) FROM pcms.contracts WHERE signing_team_id IS NOT NULL AND team_code IS NULL
UNION ALL
SELECT 'transactions', COUNT(*) FROM pcms.transactions WHERE to_team_id IS NOT NULL AND to_team_code IS NULL
UNION ALL
SELECT 'ledger_entries', COUNT(*) FROM pcms.ledger_entries WHERE team_id IS NOT NULL AND team_code IS NULL
UNION ALL
SELECT 'draft_pick_summaries', COUNT(*) FROM pcms.draft_pick_summaries WHERE team_id IS NOT NULL AND team_code IS NULL;
```

---

## 9) Reference material (why it matters)

- `reference/xpcms.txt`: another team’s Python-based ingestion approach (JSONB-ish storage, xsi:nil handling, “latest record” view patterns).
- `reference/excel-salary-book.txt`: a “salary book” generator using SQL queries + OpenPyXL/Jinja; shows what outputs analysts want.
- `reference/sean/*`: analyst spreadsheets encoded as JSON-like rows/cols/formulas; shows the interactive behaviors (team pickers, year toggles, trade machine logic).

If you’re designing new DB views or filling schema gaps (like team transactions / cap holds), these references provide strong hints about what matters downstream.
