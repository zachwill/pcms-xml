-- result_collection=last_statement_all_rows

ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);
SET TimeZone='UTC';

--
-- lookups.inline_script.duckdb.sql
--
-- Imports:
--   - pg.pcms.lookups
--   - pg.pcms.teams
--
-- Source:
--   ./shared/nba_pcms_full_extract/lookups.json
--
-- Notes:
--   - lookups.json is grouped by lookup type (43 groups)
--   - we first explode all groups into a generic (lookup_type, record_json) stream
--   - then we infer (lookup_code, description, etc.) from JSON keys (mirrors TS logic)
--   - dedupe is mandatory to prevent Postgres "ON CONFLICT cannot affect row a second time" errors.
--

-- 1) Read once (single-row, nested structs)
CREATE OR REPLACE TEMP VIEW v_lookups_struct AS
SELECT
  *,
FROM read_json_auto('./shared/nba_pcms_full_extract/lookups.json');

-- 2) Flatten all lookup groups into one stream of JSON records
CREATE OR REPLACE TEMP VIEW v_lookup_records AS
SELECT 'lk_agencies' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_agencies.lk_agency) AS t(r)

UNION ALL
SELECT 'lk_apron_levels' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_apron_levels.lk_w_apron_level) AS t(r)

UNION ALL
SELECT 'lk_budget_groups' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_budget_groups.lk_budget_group) AS t(r)

UNION ALL
SELECT 'lk_contract_bonus_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_contract_bonus_types.lk_contract_bonus_type) AS t(r)

UNION ALL
SELECT 'lk_contract_payment_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_contract_payment_types.lk_contract_payment_type) AS t(r)

UNION ALL
SELECT 'lk_contract_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_contract_types.lk_contract_type) AS t(r)

UNION ALL
SELECT 'lk_criteria' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_criteria.lk_criterium) AS t(r)

UNION ALL
SELECT 'lk_criteria_operators' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_criteria_operators.lk_criteria_operator) AS t(r)

UNION ALL
SELECT 'lk_dlg_experience_levels' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_dlg_experience_levels.lk_dlg_experience_level) AS t(r)

UNION ALL
SELECT 'lk_dlg_salary_levels' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_dlg_salary_levels.lk_dlg_salary_level) AS t(r)

UNION ALL
SELECT 'lk_draft_pick_conditionals' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_draft_pick_conditionals.lk_draft_pick_conditional) AS t(r)

UNION ALL
SELECT 'lk_earned_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_earned_types.lk_earned_type) AS t(r)

UNION ALL
SELECT 'lk_exception_actions' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_exception_actions.lk_exception_action) AS t(r)

UNION ALL
SELECT 'lk_exception_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_exception_types.lk_exception_type) AS t(r)

UNION ALL
-- Special case: outer list wrapper: lk_exclusivity_statuses = [ { lk_exclusivity_statuses: [...] } ]
SELECT 'lk_exclusivity_statuses' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_exclusivity_statuses) AS owrap(o),
UNNEST(o.lk_exclusivity_statuses) AS t(r)

UNION ALL
SELECT 'lk_free_agent_designations' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_free_agent_designations.lk_free_agent_designation) AS t(r)

UNION ALL
SELECT 'lk_free_agent_statuses' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_free_agent_statuses.lk_free_agent_status) AS t(r)

UNION ALL
SELECT 'lk_leagues' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_leagues.lk_league) AS t(r)

UNION ALL
SELECT 'lk_max_contracts' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_max_contracts.lk_max_contract) AS t(r)

UNION ALL
SELECT 'lk_min_contracts' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_min_contracts.lk_min_contract) AS t(r)

UNION ALL
SELECT 'lk_modifiers' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_modifiers.lk_modifier) AS t(r)

UNION ALL
SELECT 'lk_option_decisions' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_option_decisions.lk_option_decision) AS t(r)

UNION ALL
SELECT 'lk_options' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_options.lk_option) AS t(r)

UNION ALL
SELECT 'lk_payment_schedule_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_payment_schedule_types.lk_payment_schedule_type) AS t(r)

UNION ALL
SELECT 'lk_person_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_person_types.lk_person_type) AS t(r)

UNION ALL
SELECT 'lk_player_consents' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_player_consents.lk_player_consent) AS t(r)

UNION ALL
SELECT 'lk_player_statuses' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_player_statuses.lk_player_status) AS t(r)

UNION ALL
SELECT 'lk_positions' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_positions.lk_position) AS t(r)

UNION ALL
SELECT 'lk_protection_coverages' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_protection_coverages.lk_protection_coverage) AS t(r)

UNION ALL
SELECT 'lk_protection_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_protection_types.lk_protection_type) AS t(r)

UNION ALL
SELECT 'lk_record_statuses' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_record_statuses.lk_record_status) AS t(r)

UNION ALL
SELECT 'lk_salary_override_reasons' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_salary_override_reasons.lk_salary_override_reason) AS t(r)

UNION ALL
SELECT 'lk_season_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_season_types.lk_season_type) AS t(r)

UNION ALL
SELECT 'lk_signed_methods' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_signed_methods.lk_signed_method) AS t(r)

UNION ALL
SELECT 'lk_subject_to_apron_reasons' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_subject_to_apron_reasons.lk_subject_to_apron_reason) AS t(r)

UNION ALL
SELECT 'lk_trade_entries' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_trade_entries.lk_trade_entry) AS t(r)

UNION ALL
SELECT 'lk_trade_restrictions' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_trade_restrictions.lk_trade_restriction) AS t(r)

UNION ALL
SELECT 'lk_transaction_descriptions' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_transaction_descriptions.lk_transaction_description) AS t(r)

UNION ALL
SELECT 'lk_transaction_types' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_transaction_types.lk_transaction_type) AS t(r)

UNION ALL
SELECT 'lk_two_way_daily_statuses' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_two_way_daily_statuses.lk_two_way_daily_status) AS t(r)

UNION ALL
SELECT 'lk_within_days' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_within_days.lk_within_day) AS t(r)

UNION ALL
SELECT 'lk_schools' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_schools.lk_school) AS t(r)

UNION ALL
SELECT 'lk_teams' AS lookup_type, to_json(r) AS record_json,
FROM v_lookups_struct AS l,
UNNEST(l.lk_teams.lk_team) AS t(r)
;

-- 3) Transform generic records into pcms.lookups row shape
CREATE OR REPLACE TEMP VIEW v_lookups_source AS
SELECT
  lookup_type,
  lookup_code,
  description,
  short_description,
  is_active,
  seqno,
  record_json AS properties_json,
  created_at,
  updated_at,
  record_changed_at,
  now() AS ingested_at,
FROM (
  SELECT
    lookup_type,

    CASE
      WHEN code_key IS NULL THEN NULL
      ELSE json_extract_string(record_json, '$.' || code_key)
    END AS lookup_code,

    COALESCE(
      record_json->>'$.description',
      record_json->>'$.name',
      record_json->>'$.agency_name',
      record_json->>'$.team_name',
      record_json->>'$.school_name',
      record_json->>'$.transaction_name',
      record_json->>'$.brief_description',
      NULL
    ) AS description,

    COALESCE(
      record_json->>'$.short_description',
      record_json->>'$.abbreviation',
      record_json->>'$.team_code',
      record_json->>'$.team_name_short',
      record_json->>'$.action_short_description',
      NULL
    ) AS short_description,

    TRY_CAST(record_json->>'$.active_flg' AS BOOLEAN) AS is_active,
    TRY_CAST(record_json->>'$.seqno' AS INTEGER) AS seqno,

    TRY_CAST(record_json->>'$.create_date' AS TIMESTAMP) AS created_at,
    TRY_CAST(record_json->>'$.last_change_date' AS TIMESTAMP) AS updated_at,
    TRY_CAST(record_json->>'$.record_change_date' AS TIMESTAMP) AS record_changed_at,

    record_json,
  FROM (
    SELECT
      lookup_type,
      record_json,
      CASE
        -- Some lookup groups have multiple *_lk fields; for these, the *_id is the true stable code.
        WHEN lookup_type = 'lk_teams' THEN 'team_id'
        WHEN lookup_type = 'lk_schools' THEN 'school_id'
        ELSE COALESCE(
          list_filter(
            json_keys(record_json),
            k ->
              k LIKE '%_lk'
              AND k NOT IN ('record_status_lk', 'league_lk')
              AND COALESCE(json_extract_string(record_json, '$.' || k), '') <> ''
          )[1],
          list_filter(
            json_keys(record_json),
            k ->
              k LIKE '%_id'
              AND COALESCE(json_extract_string(record_json, '$.' || k), '') <> ''
          )[1],
          list_filter(
            json_keys(record_json),
            k ->
              (k = 'code' OR k LIKE '%_code' OR k LIKE '%_cd')
              AND COALESCE(json_extract_string(record_json, '$.' || k), '') <> ''
          )[1]
        )
      END AS code_key,
    FROM v_lookup_records
  ) AS inferred
) AS x
WHERE lookup_code IS NOT NULL
  AND lookup_code <> '';

-- 4) Deduplicate before upsert
CREATE OR REPLACE TEMP VIEW v_lookups_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY lookup_type, lookup_code
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_lookups_source
)
QUALIFY rn = 1;

-- 5) Upsert lookups into Postgres
INSERT INTO pg.pcms.lookups BY NAME (
  SELECT
    lookup_type,
    lookup_code,
    description,
    short_description,
    is_active,
    seqno,
    properties_json,
    created_at,
    updated_at,
    record_changed_at,
    ingested_at,
  FROM v_lookups_deduped
)
ON CONFLICT (lookup_type, lookup_code) DO UPDATE SET
  description = EXCLUDED.description,
  short_description = EXCLUDED.short_description,
  is_active = EXCLUDED.is_active,
  seqno = EXCLUDED.seqno,
  properties_json = EXCLUDED.properties_json,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- 6) Teams (subset of v_lookup_records)
CREATE OR REPLACE TEMP VIEW v_teams_source AS
SELECT
  TRY_CAST(record_json->>'$.team_id' AS INTEGER) AS team_id,
  record_json->>'$.team_name' AS team_name,
  COALESCE(record_json->>'$.team_code', record_json->>'$.team_name_short') AS team_code,
  record_json->>'$.team_nickname' AS team_nickname,
  record_json->>'$.city' AS city,
  record_json->>'$.state_lk' AS state_lk,
  record_json->>'$.country_lk' AS country_lk,
  record_json->>'$.division_name' AS division_name,
  record_json->>'$.conference_name' AS conference_name,
  record_json->>'$.league_lk' AS league_lk,
  TRY_CAST(record_json->>'$.active_flg' AS BOOLEAN) AS is_active,
  record_json->>'$.record_status_lk' AS record_status_lk,
  TRY_CAST(record_json->>'$.first_game_date' AS DATE) AS first_game_date,
  TRY_CAST(record_json->>'$.create_date' AS TIMESTAMP) AS created_at,
  TRY_CAST(record_json->>'$.last_change_date' AS TIMESTAMP) AS updated_at,
  TRY_CAST(record_json->>'$.record_change_date' AS TIMESTAMP) AS record_changed_at,
  record_json AS metadata_json,
  now() AS ingested_at,
FROM v_lookup_records
WHERE lookup_type = 'lk_teams'
  AND record_json->>'$.team_id' IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_teams_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY team_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_teams_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.teams BY NAME (
  SELECT
    team_id,
    team_name,
    team_code,
    team_nickname,
    city,
    state_lk,
    country_lk,
    division_name,
    conference_name,
    league_lk,
    is_active,
    record_status_lk,
    first_game_date,
    created_at,
    updated_at,
    record_changed_at,
    metadata_json,
    ingested_at,
  FROM v_teams_deduped
)
ON CONFLICT (team_id) DO UPDATE SET
  team_name = EXCLUDED.team_name,
  team_code = EXCLUDED.team_code,
  team_nickname = EXCLUDED.team_nickname,
  city = EXCLUDED.city,
  state_lk = EXCLUDED.state_lk,
  country_lk = EXCLUDED.country_lk,
  division_name = EXCLUDED.division_name,
  conference_name = EXCLUDED.conference_name,
  league_lk = EXCLUDED.league_lk,
  is_active = EXCLUDED.is_active,
  record_status_lk = EXCLUDED.record_status_lk,
  first_game_date = EXCLUDED.first_game_date,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  metadata_json = EXCLUDED.metadata_json,
  ingested_at = EXCLUDED.ingested_at;

-- 7) Summary
SELECT
  'lookups' AS step,
  (SELECT count(*) FROM v_lookups_deduped) AS lookups_rows_upserted,
  (SELECT count(*) FROM v_teams_deduped) AS teams_rows_upserted,
  now() AS finished_at,
;