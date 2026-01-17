-- result_collection=last_statement_all_rows

ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);
SET TimeZone='UTC';

--
-- team_financials.inline_script.duckdb.sql
--
-- Imports:
--   - pg.pcms.team_budget_snapshots        (from team_budgets.json)
--   - pg.pcms.team_tax_summary_snapshots   (from team_budgets.json: tax_teams.tax_team[])
--   - pg.pcms.tax_team_status              (from team_budgets.json: tax_teams.tax_team[])
--   - pg.pcms.waiver_priority              (from waiver_priority.json)
--   - pg.pcms.waiver_priority_ranks        (from waiver_priority.json)
--   - pg.pcms.team_transactions            (from team_transactions.json)
--
-- Source files (hard-coded):
--   ./shared/pcms/nba_pcms_full_extract/lookups.json
--   ./shared/pcms/nba_pcms_full_extract/team_budgets.json
--   ./shared/pcms/nba_pcms_full_extract/waiver_priority.json
--   ./shared/pcms/nba_pcms_full_extract/team_transactions.json
--
-- Notes:
--   - team_budgets.json contains hyphenated keys ("budget-entries", "budget-entry"); we use json_extract paths.
--   - Deduplication is mandatory to avoid Postgres "ON CONFLICT cannot affect row a second time" errors.
--   - For team_budget_snapshots, we dedupe using COALESCE markers to treat NULL key parts as equal (matches prior TS behavior).
--

-- 1) Team lookup (shared)
CREATE OR REPLACE TEMP VIEW v_teams AS
SELECT
  TRY_CAST(team_json->>'$.team_id' AS BIGINT) AS team_id,
  COALESCE(team_json->>'$.team_code', team_json->>'$.team_name_short') AS team_code,
FROM (
  SELECT
    to_json(r) AS team_json,
  FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/lookups.json') AS lookups,
  UNNEST(lookups.lk_teams.lk_team) AS t(r)
)
WHERE team_json->>'$.team_id' IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Team budget snapshots (team_budgets.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_team_budgets_raw AS
SELECT
  j AS root_json,
FROM read_json('./shared/pcms/nba_pcms_full_extract/team_budgets.json', format = 'unstructured') AS t(j);

CREATE OR REPLACE TEMP VIEW v_budget_teams AS
SELECT
  value AS budget_team_json,
FROM v_team_budgets_raw,
json_each(json_extract(root_json, '$.budget_teams.budget_team'));

CREATE OR REPLACE TEMP VIEW v_budget_entries AS
SELECT
  TRY_CAST(budget_team_json->>'$.team_id' AS INTEGER) AS team_id,
  value AS entry_json,
FROM v_budget_teams,
json_each(json_extract(budget_team_json, '$."budget-entries"."budget-entry"'));

CREATE OR REPLACE TEMP VIEW v_budget_amounts AS
SELECT
  team_id,
  entry_json,
  value AS amount_json,
FROM v_budget_entries,
json_each(json_extract(entry_json, '$.budget_amounts_per_year.budget_amount'));

CREATE OR REPLACE TEMP VIEW v_team_budget_snapshots_source AS
SELECT
  b.team_id,
  teams.team_code AS team_code,
  TRY_CAST(b.amount_json->>'$.year' AS INTEGER) AS salary_year,

  TRY_CAST(b.entry_json->>'$.player_id' AS INTEGER) AS player_id,
  TRY_CAST(b.entry_json->>'$.contract_id' AS INTEGER) AS contract_id,
  TRY_CAST(b.entry_json->>'$.transaction_id' AS INTEGER) AS transaction_id,
  NULLIF(trim(b.entry_json->>'$.transaction_type_lk'), '') AS transaction_type_lk,
  NULLIF(trim(b.entry_json->>'$.transaction_description_lk'), '') AS transaction_description_lk,

  NULLIF(trim(b.entry_json->>'$.budget_group_lk'), '') AS budget_group_lk,
  NULLIF(trim(b.entry_json->>'$.contract_type_lk'), '') AS contract_type_lk,
  NULLIF(trim(b.entry_json->>'$.free_agent_designation_lk'), '') AS free_agent_designation_lk,
  NULLIF(trim(b.entry_json->>'$.free_agent_status_lk'), '') AS free_agent_status_lk,
  NULLIF(trim(b.entry_json->>'$.signed_method_lk'), '') AS signing_method_lk,
  NULLIF(trim(b.entry_json->>'$.overall_contract_bonus_type_lk'), '') AS overall_contract_bonus_type_lk,
  NULLIF(trim(b.entry_json->>'$.overall_protection_coverage_lk'), '') AS overall_protection_coverage_lk,
  NULLIF(trim(b.entry_json->>'$.max_contract_lk'), '') AS max_contract_lk,

  TRY_CAST(b.entry_json->>'$.year_of_service' AS INTEGER) AS years_of_service,
  TRY_CAST(b.entry_json->>'$.ledger_date' AS DATE) AS ledger_date,
  TRY_CAST(b.entry_json->>'$.signing_date' AS DATE) AS signing_date,

  -- PCMS sometimes represents version_number as a decimal like 1.01; schema expects INTEGER (1.01 -> 101)
  CASE
    WHEN b.entry_json->>'$.version_number' IS NULL OR b.entry_json->>'$.version_number' = '' THEN NULL
    WHEN TRY_CAST(b.entry_json->>'$.version_number' AS DOUBLE) IS NULL THEN NULL
    WHEN TRY_CAST(b.entry_json->>'$.version_number' AS DOUBLE) = floor(TRY_CAST(b.entry_json->>'$.version_number' AS DOUBLE))
      THEN TRY_CAST(b.entry_json->>'$.version_number' AS INTEGER)
    ELSE round(TRY_CAST(b.entry_json->>'$.version_number' AS DOUBLE) * 100)::INTEGER
  END AS version_number,

  TRY_CAST(b.amount_json->>'$.cap_amount' AS BIGINT) AS cap_amount,
  TRY_CAST(b.amount_json->>'$.tax_amount' AS BIGINT) AS tax_amount,
  TRY_CAST(b.amount_json->>'$.mts_amount' AS BIGINT) AS mts_amount,
  TRY_CAST(b.amount_json->>'$.apron_amount' AS BIGINT) AS apron_amount,

  CASE
    WHEN b.amount_json->>'$.fa_amount_flg' IS NULL OR b.amount_json->>'$.fa_amount_flg' = '' THEN NULL
    WHEN lower(b.amount_json->>'$.fa_amount_flg') IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
    WHEN lower(b.amount_json->>'$.fa_amount_flg') IN ('0', 'false', 'f', 'no', 'n') THEN FALSE
    ELSE TRY_CAST(b.amount_json->>'$.fa_amount_flg' AS BOOLEAN)
  END AS is_fa_amount,

  NULLIF(trim(b.amount_json->>'$.option_lk'), '') AS option_lk,
  NULLIF(trim(b.amount_json->>'$.option_decision_lk'), '') AS option_decision_lk,

  -- Internal only (for dedupe ordering)
  COALESCE(
    TRY_CAST(b.amount_json->>'$.record_change_date' AS TIMESTAMPTZ),
    TRY_CAST(b.entry_json->>'$.record_change_date' AS TIMESTAMPTZ),
    TRY_CAST(b.entry_json->>'$.last_change_date' AS TIMESTAMPTZ),
    TRY_CAST(b.entry_json->>'$.create_date' AS TIMESTAMPTZ)
  ) AS internal_record_changed_at,

  now() AS ingested_at,
FROM v_budget_amounts AS b
LEFT JOIN v_teams AS teams ON teams.team_id = b.team_id::BIGINT
WHERE b.team_id IS NOT NULL
  AND b.amount_json->>'$.year' IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_team_budget_snapshots_deduped AS
SELECT * EXCLUDE (rn, internal_record_changed_at)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY
        team_id,
        salary_year,
        COALESCE(transaction_id, -1),
        COALESCE(budget_group_lk, '∅'),
        COALESCE(player_id, -1),
        COALESCE(contract_id, -1),
        COALESCE(version_number, -1)
      ORDER BY internal_record_changed_at DESC NULLS LAST
    ) AS rn,
  FROM v_team_budget_snapshots_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.team_budget_snapshots BY NAME (
  SELECT
    team_id,
    salary_year,
    player_id,
    contract_id,
    transaction_id,
    transaction_type_lk,
    transaction_description_lk,
    budget_group_lk,
    contract_type_lk,
    free_agent_designation_lk,
    free_agent_status_lk,
    signing_method_lk,
    overall_contract_bonus_type_lk,
    overall_protection_coverage_lk,
    max_contract_lk,
    years_of_service,
    ledger_date,
    signing_date,
    version_number,
    cap_amount,
    tax_amount,
    mts_amount,
    apron_amount,
    is_fa_amount,
    option_lk,
    option_decision_lk,
    ingested_at,
    team_code,
  FROM v_team_budget_snapshots_deduped
)
ON CONFLICT (team_id, salary_year, transaction_id, budget_group_lk, player_id, contract_id, version_number) DO UPDATE SET
  team_code = EXCLUDED.team_code,
  transaction_type_lk = EXCLUDED.transaction_type_lk,
  transaction_description_lk = EXCLUDED.transaction_description_lk,
  contract_type_lk = EXCLUDED.contract_type_lk,
  free_agent_designation_lk = EXCLUDED.free_agent_designation_lk,
  free_agent_status_lk = EXCLUDED.free_agent_status_lk,
  signing_method_lk = EXCLUDED.signing_method_lk,
  overall_contract_bonus_type_lk = EXCLUDED.overall_contract_bonus_type_lk,
  overall_protection_coverage_lk = EXCLUDED.overall_protection_coverage_lk,
  max_contract_lk = EXCLUDED.max_contract_lk,
  years_of_service = EXCLUDED.years_of_service,
  ledger_date = EXCLUDED.ledger_date,
  signing_date = EXCLUDED.signing_date,
  cap_amount = EXCLUDED.cap_amount,
  tax_amount = EXCLUDED.tax_amount,
  mts_amount = EXCLUDED.mts_amount,
  apron_amount = EXCLUDED.apron_amount,
  is_fa_amount = EXCLUDED.is_fa_amount,
  option_lk = EXCLUDED.option_lk,
  option_decision_lk = EXCLUDED.option_decision_lk,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Tax snapshots + tax team status (from team_budgets.json: tax_teams.tax_team[])
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_tax_teams AS
SELECT
  value AS tax_team_json,
FROM v_team_budgets_raw,
json_each(json_extract(root_json, '$.tax_teams.tax_team'));

CREATE OR REPLACE TEMP VIEW v_tax_teams_source AS
SELECT
  TRY_CAST(tax_team_json->>'$.team_id' AS INTEGER) AS team_id,
  teams.team_code AS team_code,
  TRY_CAST(tax_team_json->>'$.salary_year' AS INTEGER) AS salary_year,

  CASE
    WHEN tax_team_json->>'$.taxpayer_flg' IS NULL OR tax_team_json->>'$.taxpayer_flg' = '' THEN NULL
    WHEN lower(tax_team_json->>'$.taxpayer_flg') IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
    WHEN lower(tax_team_json->>'$.taxpayer_flg') IN ('0', 'false', 'f', 'no', 'n') THEN FALSE
    ELSE TRY_CAST(tax_team_json->>'$.taxpayer_flg' AS BOOLEAN)
  END AS is_taxpayer,

  CASE
    WHEN tax_team_json->>'$.taxpayer_repeater_rate_flg' IS NULL OR tax_team_json->>'$.taxpayer_repeater_rate_flg' = '' THEN NULL
    WHEN lower(tax_team_json->>'$.taxpayer_repeater_rate_flg') IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
    WHEN lower(tax_team_json->>'$.taxpayer_repeater_rate_flg') IN ('0', 'false', 'f', 'no', 'n') THEN FALSE
    ELSE TRY_CAST(tax_team_json->>'$.taxpayer_repeater_rate_flg' AS BOOLEAN)
  END AS is_repeater_taxpayer,

  CASE
    WHEN tax_team_json->>'$.subject_to_apron_flg' IS NULL OR tax_team_json->>'$.subject_to_apron_flg' = '' THEN NULL
    WHEN lower(tax_team_json->>'$.subject_to_apron_flg') IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
    WHEN lower(tax_team_json->>'$.subject_to_apron_flg') IN ('0', 'false', 'f', 'no', 'n') THEN FALSE
    ELSE TRY_CAST(tax_team_json->>'$.subject_to_apron_flg' AS BOOLEAN)
  END AS is_subject_to_apron,

  NULLIF(trim(tax_team_json->>'$.subject_to_apron_reason_lk'), '') AS subject_to_apron_reason_lk,
  NULLIF(trim(tax_team_json->>'$.apron_level_lk'), '') AS apron_level_lk,
  TRY_CAST(tax_team_json->>'$.apron1_transaction_id' AS INTEGER) AS apron1_transaction_id,
  TRY_CAST(tax_team_json->>'$.apron2_transaction_id' AS INTEGER) AS apron2_transaction_id,

  TRY_CAST(tax_team_json->>'$.record_change_date' AS TIMESTAMPTZ) AS record_changed_at,
  TRY_CAST(tax_team_json->>'$.create_date' AS TIMESTAMPTZ) AS created_at,
  TRY_CAST(tax_team_json->>'$.last_change_date' AS TIMESTAMPTZ) AS updated_at,
  now() AS ingested_at,
FROM v_tax_teams
LEFT JOIN v_teams AS teams ON teams.team_id = TRY_CAST(tax_team_json->>'$.team_id' AS BIGINT)
WHERE tax_team_json->>'$.team_id' IS NOT NULL
  AND tax_team_json->>'$.salary_year' IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_tax_teams_deduped AS
SELECT * EXCLUDE (rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY team_id, salary_year
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_tax_teams_source
)
QUALIFY rn = 1;

-- 3a) team_tax_summary_snapshots
INSERT INTO pg.pcms.team_tax_summary_snapshots BY NAME (
  SELECT
    team_id,
    salary_year,
    is_taxpayer,
    is_repeater_taxpayer,
    is_subject_to_apron,
    subject_to_apron_reason_lk,
    apron_level_lk,
    apron1_transaction_id,
    apron2_transaction_id,
    record_changed_at,
    created_at,
    updated_at,
    ingested_at,
    team_code,
  FROM v_tax_teams_deduped
)
ON CONFLICT (team_id, salary_year) DO UPDATE SET
  team_code = EXCLUDED.team_code,
  is_taxpayer = EXCLUDED.is_taxpayer,
  is_repeater_taxpayer = EXCLUDED.is_repeater_taxpayer,
  is_subject_to_apron = EXCLUDED.is_subject_to_apron,
  subject_to_apron_reason_lk = EXCLUDED.subject_to_apron_reason_lk,
  apron_level_lk = EXCLUDED.apron_level_lk,
  apron1_transaction_id = EXCLUDED.apron1_transaction_id,
  apron2_transaction_id = EXCLUDED.apron2_transaction_id,
  record_changed_at = EXCLUDED.record_changed_at,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at,
  ingested_at = EXCLUDED.ingested_at;

-- 3b) tax_team_status
INSERT INTO pg.pcms.tax_team_status BY NAME (
  SELECT
    team_id,
    salary_year,
    is_taxpayer,
    is_repeater_taxpayer,
    is_subject_to_apron,
    apron_level_lk,
    subject_to_apron_reason_lk,
    apron1_transaction_id,
    apron2_transaction_id,
    created_at,
    updated_at,
    record_changed_at,
    ingested_at,
    team_code,
  FROM v_tax_teams_deduped
)
ON CONFLICT (team_id, salary_year) DO UPDATE SET
  team_code = EXCLUDED.team_code,
  is_taxpayer = EXCLUDED.is_taxpayer,
  is_repeater_taxpayer = EXCLUDED.is_repeater_taxpayer,
  is_subject_to_apron = EXCLUDED.is_subject_to_apron,
  apron_level_lk = EXCLUDED.apron_level_lk,
  subject_to_apron_reason_lk = EXCLUDED.subject_to_apron_reason_lk,
  apron1_transaction_id = EXCLUDED.apron1_transaction_id,
  apron2_transaction_id = EXCLUDED.apron2_transaction_id,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Waiver priority + ranks (waiver_priority.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_waiver_raw AS
SELECT
  COALESCE(j->'$.waiver_priority', j) AS waiver_priority_arr,
FROM read_json('./shared/pcms/nba_pcms_full_extract/waiver_priority.json', format = 'unstructured') AS t(j);

CREATE OR REPLACE TEMP VIEW v_waiver_priority_source AS
SELECT
  TRY_CAST(value->>'$.waiver_priority_id' AS INTEGER) AS waiver_priority_id,
  TRY_CAST(value->>'$.priority_date' AS DATE) AS priority_date,
  TRY_CAST(value->>'$.seqno' AS INTEGER) AS seqno,
  COALESCE(NULLIF(trim(value->>'$.record_status_lk'), ''), NULLIF(trim(value->>'$.status_lk'), '')) AS status_lk,
  NULLIF(trim(value->>'$.comments'), '') AS comments,
  TRY_CAST(value->>'$.create_date' AS TIMESTAMPTZ) AS created_at,
  TRY_CAST(value->>'$.last_change_date' AS TIMESTAMPTZ) AS updated_at,
  TRY_CAST(value->>'$.record_change_date' AS TIMESTAMPTZ) AS record_changed_at,
  now() AS ingested_at,
  value AS waiver_json,
FROM v_waiver_raw,
json_each(waiver_priority_arr)
WHERE value->>'$.waiver_priority_id' IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_waiver_priority_deduped AS
SELECT * EXCLUDE (rn, waiver_json)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY waiver_priority_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_waiver_priority_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.waiver_priority BY NAME (
  SELECT
    waiver_priority_id,
    priority_date,
    seqno,
    status_lk,
    comments,
    created_at,
    updated_at,
    record_changed_at,
    ingested_at,
  FROM v_waiver_priority_deduped
)
ON CONFLICT (waiver_priority_id) DO UPDATE SET
  priority_date = EXCLUDED.priority_date,
  seqno = EXCLUDED.seqno,
  status_lk = EXCLUDED.status_lk,
  comments = EXCLUDED.comments,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

CREATE OR REPLACE TEMP VIEW v_waiver_priority_ranks_source AS
SELECT
  TRY_CAST(wp.value->>'$.waiver_priority_id' AS INTEGER) AS waiver_priority_id,
  rank.value AS rank_json,
FROM v_waiver_raw AS wr,
json_each(wr.waiver_priority_arr) AS wp,
json_each(json_extract(wp.value, '$.waiver_priority_ranks.waiver_priority_rank')) AS rank
WHERE wp.value->>'$.waiver_priority_id' IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_waiver_priority_ranks_typed AS
SELECT
  COALESCE(
    TRY_CAST(rank_json->>'$.waiver_priority_detail_id' AS INTEGER),
    TRY_CAST(rank_json->>'$.waiver_priority_rank_id' AS INTEGER)
  ) AS waiver_priority_rank_id,
  waiver_priority_id,

  TRY_CAST(rank_json->>'$.team_id' AS INTEGER) AS team_id,
  teams.team_code AS team_code,

  TRY_CAST(rank_json->>'$.priority_order' AS INTEGER) AS priority_order,
  CASE
    WHEN rank_json->>'$.order_priority_flg' IS NULL OR rank_json->>'$.order_priority_flg' = '' THEN NULL
    WHEN lower(rank_json->>'$.order_priority_flg') IN ('1', 'true', 't', 'yes', 'y') THEN TRUE
    WHEN lower(rank_json->>'$.order_priority_flg') IN ('0', 'false', 'f', 'no', 'n') THEN FALSE
    ELSE TRY_CAST(rank_json->>'$.order_priority_flg' AS BOOLEAN)
  END AS is_order_priority,

  NULLIF(trim(rank_json->>'$.exclusivity_status_lk'), '') AS exclusivity_status_lk,
  TRY_CAST(rank_json->>'$.exclusivity_expiration_date' AS DATE) AS exclusivity_expiration_date,
  COALESCE(NULLIF(trim(rank_json->>'$.record_status_lk'), ''), NULLIF(trim(rank_json->>'$.status_lk'), '')) AS status_lk,
  TRY_CAST(rank_json->>'$.seqno' AS INTEGER) AS seqno,
  NULLIF(trim(rank_json->>'$.comments'), '') AS comments,
  TRY_CAST(rank_json->>'$.create_date' AS TIMESTAMPTZ) AS created_at,
  TRY_CAST(rank_json->>'$.last_change_date' AS TIMESTAMPTZ) AS updated_at,
  TRY_CAST(rank_json->>'$.record_change_date' AS TIMESTAMPTZ) AS record_changed_at,
  now() AS ingested_at,
FROM v_waiver_priority_ranks_source
LEFT JOIN v_teams AS teams ON teams.team_id = TRY_CAST(rank_json->>'$.team_id' AS BIGINT)
WHERE COALESCE(rank_json->>'$.waiver_priority_detail_id', rank_json->>'$.waiver_priority_rank_id') IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_waiver_priority_ranks_deduped AS
SELECT * EXCLUDE (rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY waiver_priority_rank_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_waiver_priority_ranks_typed
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.waiver_priority_ranks BY NAME (
  SELECT
    waiver_priority_rank_id,
    waiver_priority_id,
    team_id,
    team_code,
    priority_order,
    is_order_priority,
    exclusivity_status_lk,
    exclusivity_expiration_date,
    status_lk,
    seqno,
    comments,
    created_at,
    updated_at,
    record_changed_at,
    ingested_at,
  FROM v_waiver_priority_ranks_deduped
)
ON CONFLICT (waiver_priority_rank_id) DO UPDATE SET
  waiver_priority_id = EXCLUDED.waiver_priority_id,
  team_id = EXCLUDED.team_id,
  team_code = EXCLUDED.team_code,
  priority_order = EXCLUDED.priority_order,
  is_order_priority = EXCLUDED.is_order_priority,
  exclusivity_status_lk = EXCLUDED.exclusivity_status_lk,
  exclusivity_expiration_date = EXCLUDED.exclusivity_expiration_date,
  status_lk = EXCLUDED.status_lk,
  seqno = EXCLUDED.seqno,
  comments = EXCLUDED.comments,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Team transactions (team_transactions.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_team_transactions_source AS
SELECT
  TRY_CAST(tx_json->>'$.team_transaction_id' AS INTEGER) AS team_transaction_id,
  TRY_CAST(tx_json->>'$.team_id' AS INTEGER) AS team_id,
  teams.team_code AS team_code,

  NULLIF(trim(tx_json->>'$.team_transaction_type_lk'), '') AS team_transaction_type_lk,
  TRY_CAST(tx_json->>'$.team_ledger_seqno' AS INTEGER) AS team_ledger_seqno,
  TRY_CAST(tx_json->>'$.transaction_date' AS DATE) AS transaction_date,

  TRY_CAST(tx_json->>'$.cap_adjustment' AS BIGINT) AS cap_adjustment,
  TRY_CAST(tx_json->>'$.cap_hold_adjustment' AS INTEGER) AS cap_hold_adjustment,
  TRY_CAST(tx_json->>'$.tax_adjustment' AS BIGINT) AS tax_adjustment,
  TRY_CAST(tx_json->>'$.tax_apron_adjustment' AS BIGINT) AS tax_apron_adjustment,
  TRY_CAST(tx_json->>'$.mts_adjustment' AS BIGINT) AS mts_adjustment,
  TRY_CAST(tx_json->>'$.protection_count_flg' AS BOOLEAN) AS protection_count_flg,

  NULLIF(trim(tx_json->>'$.comments'), '') AS comments,
  NULLIF(trim(tx_json->>'$.record_status_lk'), '') AS record_status_lk,

  TRY_CAST(tx_json->>'$.create_date' AS TIMESTAMPTZ) AS created_at,
  TRY_CAST(tx_json->>'$.last_change_date' AS TIMESTAMPTZ) AS updated_at,
  TRY_CAST(tx_json->>'$.record_change_date' AS TIMESTAMPTZ) AS record_changed_at,

  now() AS ingested_at,
FROM (
  SELECT
    to_json(t) AS tx_json,
  FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/team_transactions.json') AS t
) AS src
LEFT JOIN v_teams AS teams ON teams.team_id = TRY_CAST(tx_json->>'$.team_id' AS BIGINT)
WHERE tx_json->>'$.team_transaction_id' IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_team_transactions_deduped AS
SELECT * EXCLUDE (rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY team_transaction_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_team_transactions_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.team_transactions BY NAME (
  SELECT
    team_transaction_id,
    team_id,
    team_code,
    team_transaction_type_lk,
    team_ledger_seqno,
    transaction_date,
    cap_adjustment,
    cap_hold_adjustment,
    tax_adjustment,
    tax_apron_adjustment,
    mts_adjustment,
    protection_count_flg,
    comments,
    record_status_lk,
    created_at,
    updated_at,
    record_changed_at,
    ingested_at,
  FROM v_team_transactions_deduped
)
ON CONFLICT (team_transaction_id) DO UPDATE SET
  team_id = EXCLUDED.team_id,
  team_code = EXCLUDED.team_code,
  team_transaction_type_lk = EXCLUDED.team_transaction_type_lk,
  team_ledger_seqno = EXCLUDED.team_ledger_seqno,
  transaction_date = EXCLUDED.transaction_date,
  cap_adjustment = EXCLUDED.cap_adjustment,
  cap_hold_adjustment = EXCLUDED.cap_hold_adjustment,
  tax_adjustment = EXCLUDED.tax_adjustment,
  tax_apron_adjustment = EXCLUDED.tax_apron_adjustment,
  mts_adjustment = EXCLUDED.mts_adjustment,
  protection_count_flg = EXCLUDED.protection_count_flg,
  comments = EXCLUDED.comments,
  record_status_lk = EXCLUDED.record_status_lk,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- 6) Summary
SELECT
  'team_financials' AS step,
  (SELECT count(*) FROM v_team_budget_snapshots_deduped) AS team_budget_snapshots_rows_upserted,
  (SELECT count(*) FROM v_tax_teams_deduped) AS team_tax_summary_rows_upserted,
  (SELECT count(*) FROM v_tax_teams_deduped) AS tax_team_status_rows_upserted,
  (SELECT count(*) FROM v_waiver_priority_deduped) AS waiver_priority_rows_upserted,
  (SELECT count(*) FROM v_waiver_priority_ranks_deduped) AS waiver_priority_ranks_rows_upserted,
  (SELECT count(*) FROM v_team_transactions_deduped) AS team_transactions_rows_upserted,
  now() AS finished_at,
;