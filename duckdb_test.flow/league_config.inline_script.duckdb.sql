-- result_collection=last_statement_all_rows

ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);
SET TimeZone='UTC';

--
-- league_config.inline_script.duckdb.sql
--
-- Imports (upserts):
--   - pg.pcms.league_system_values          (yearly_system_values.json)
--   - pg.pcms.rookie_scale_amounts          (rookie_scale_amounts.json)
--   - pg.pcms.non_contract_amounts          (non_contract_amounts.json)
--   - pg.pcms.league_salary_scales          (yearly_salary_scales.json)
--   - pg.pcms.league_salary_cap_projections (cap_projections.json)
--   - pg.pcms.league_tax_rates              (tax_rates.json)
--   - pg.pcms.apron_constraints             (currently no JSON source; no-op)
--
-- Source base dir (hard-coded):
--   ./shared/nba_pcms_full_extract/
--
-- Notes:
--   - Dedupe is mandatory prior to each upsert to avoid Postgres
--     "ON CONFLICT cannot affect row a second time" errors.
--   - Keys are already snake_case and nils are already real NULLs.
--

-- 1) Team lookup (used for non_contract_amounts.team_code)
CREATE OR REPLACE TEMP VIEW v_teams AS
SELECT
  t.team_id::BIGINT AS team_id,
  COALESCE(t.team_code, t.team_name_short) AS team_code,
FROM read_json_auto('./shared/nba_pcms_full_extract/lookups.json') AS lookups,
UNNEST(lookups.lk_teams.lk_team) AS t;

-- ─────────────────────────────────────────────────────────────────────────────
-- league_system_values (yearly_system_values.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_league_system_values_source AS
SELECT
  sv.league_lk::VARCHAR AS league_lk,
  TRY_CAST(sv.system_year AS INTEGER) AS salary_year,

  TRY_CAST(sv.cap_amount AS BIGINT) AS salary_cap_amount,
  TRY_CAST(sv.tax_level AS BIGINT) AS tax_level_amount,
  TRY_CAST(sv.tax_apron AS BIGINT) AS tax_apron_amount,
  TRY_CAST(sv.tax_apron2 AS BIGINT) AS tax_apron2_amount,
  TRY_CAST(sv.tax_bracket_amount AS BIGINT) AS tax_bracket_amount,
  TRY_CAST(sv.minimum_team_salary AS BIGINT) AS minimum_team_salary_amount,

  TRY_CAST(sv.maximum_salary25 AS BIGINT) AS maximum_salary_25_pct,
  TRY_CAST(sv.maximum_salary30 AS BIGINT) AS maximum_salary_30_pct,
  TRY_CAST(sv.maximum_salary35 AS BIGINT) AS maximum_salary_35_pct,

  TRY_CAST(sv.average_salary AS BIGINT) AS average_salary_amount,
  TRY_CAST(sv.estimated_average_salary AS BIGINT) AS estimated_average_salary_amount,

  TRY_CAST(sv.non_taxpayer_mid_level_amount AS BIGINT) AS non_taxpayer_mid_level_amount,
  TRY_CAST(sv.taxpayer_mid_level_amount AS BIGINT) AS taxpayer_mid_level_amount,
  TRY_CAST(sv.room_mid_level_amount AS BIGINT) AS room_mid_level_amount,
  TRY_CAST(sv.bi_annual_amount AS BIGINT) AS bi_annual_amount,

  TRY_CAST(sv.two_way_salary_amount AS BIGINT) AS two_way_salary_amount,
  TRY_CAST(sv.two_way_dlg_salary_amount AS BIGINT) AS two_way_dlg_salary_amount,

  TRY_CAST(sv.tpe_dollar_allowance AS BIGINT) AS tpe_dollar_allowance,
  TRY_CAST(sv.max_trade_cash_amount AS BIGINT) AS max_trade_cash_amount,
  TRY_CAST(sv.international_player_payment AS BIGINT) AS international_player_payment_limit,

  TRY_CAST(sv.scale_raise_rate AS DOUBLE) AS scale_raise_rate,

  TRY_CAST(sv.days_in_season AS INTEGER) AS days_in_season,
  TRY_CAST(sv.first_day_of_season AS TIMESTAMP) AS season_start_at,
  TRY_CAST(sv.last_day_of_season AS TIMESTAMP) AS season_end_at,
  TRY_CAST(sv.playing_start_date AS TIMESTAMP) AS playing_start_at,
  TRY_CAST(sv.playing_end_date AS TIMESTAMP) AS playing_end_at,
  TRY_CAST(sv.last_day_of_finals AS TIMESTAMP) AS finals_end_at,

  TRY_CAST(sv.training_camp_start_date AS TIMESTAMP) AS training_camp_start_at,
  TRY_CAST(sv.training_camp_end_date AS TIMESTAMP) AS training_camp_end_at,
  TRY_CAST(sv.rookie_camp_start_date AS TIMESTAMP) AS rookie_camp_start_at,
  TRY_CAST(sv.rookie_camp_end_date AS TIMESTAMP) AS rookie_camp_end_at,
  TRY_CAST(sv.draft_date AS TIMESTAMP) AS draft_at,
  TRY_CAST(sv.moratorium_end_date AS TIMESTAMP) AS moratorium_end_at,
  TRY_CAST(sv.trade_deadline_date AS TIMESTAMP) AS trade_deadline_at,
  TRY_CAST(sv.cut_down_date AS TIMESTAMP) AS cut_down_at,
  TRY_CAST(sv.two_way_cut_down_date AS TIMESTAMP) AS two_way_cut_down_at,
  TRY_CAST(sv.notification_start_date AS TIMESTAMP) AS notification_start_at,
  TRY_CAST(sv.notification_end_date AS TIMESTAMP) AS notification_end_at,
  TRY_CAST(sv.exception_start_date AS TIMESTAMP) AS exception_start_at,
  TRY_CAST(sv.exception_prorate_start_date AS TIMESTAMP) AS exception_prorate_at,
  TRY_CAST(sv.exceptions_added_date AS TIMESTAMP) AS exceptions_added_at,
  TRY_CAST(sv.rnd2_pick_exc_zero_cap_end_date AS TIMESTAMP) AS rnd2_pick_exc_zero_cap_end_at,

  TRY_CAST(sv.bonuses_finalized_date AS TIMESTAMP) AS bonuses_finalized_at,
  TRY_CAST(sv.bonuses_finalized_flg AS BOOLEAN) AS is_bonuses_finalized,
  TRY_CAST(sv.cap_projection_generated_flg AS BOOLEAN) AS is_cap_projection_generated,
  TRY_CAST(sv.exceptions_added_flg AS BOOLEAN) AS is_exceptions_added,

  TRY_CAST(sv.free_agent_amounts_finalized_date AS TIMESTAMP) AS free_agent_status_finalized_at,
  TRY_CAST(sv.free_agent_amounts_finalized_flg AS BOOLEAN) AS is_free_agent_amounts_finalized,

  TRY_CAST(sv.wnba_offseason_end AS TIMESTAMP) AS wnba_offseason_end_at,
  TRY_CAST(sv.wnba_season_finalized_date AS TIMESTAMP) AS wnba_season_finalized_at,
  TRY_CAST(sv.wnba_season_finalized_flg AS BOOLEAN) AS is_wnba_season_finalized,

  TRY_CAST(sv.dlg_countable_roster_moves AS INTEGER) AS dlg_countable_roster_moves,
  TRY_CAST(sv.dlg_max_level_a_salary_players AS INTEGER) AS dlg_max_level_a_salary_players,
  TRY_CAST(sv.dlg_salary_level_a AS INTEGER) AS dlg_salary_level_a,
  TRY_CAST(sv.dlg_salary_level_b AS INTEGER) AS dlg_salary_level_b,
  TRY_CAST(sv.dlg_salary_level_c AS INTEGER) AS dlg_salary_level_c,
  TRY_CAST(sv.dlg_team_salary_budget AS BIGINT) AS dlg_team_salary_budget,

  TRY_CAST(sv.create_date AS TIMESTAMP) AS created_at,
  TRY_CAST(sv.last_change_date AS TIMESTAMP) AS updated_at,
  TRY_CAST(sv.record_change_date AS TIMESTAMP) AS record_changed_at,
  now() AS ingested_at,
FROM read_json_auto('./shared/nba_pcms_full_extract/yearly_system_values.json') AS sv
WHERE sv.league_lk IS NOT NULL
  AND sv.system_year IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_league_system_values_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY league_lk, salary_year
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_league_system_values_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.league_system_values BY NAME (
  SELECT * FROM v_league_system_values_deduped
)
ON CONFLICT (league_lk, salary_year) DO UPDATE SET
  salary_cap_amount = EXCLUDED.salary_cap_amount,
  tax_level_amount = EXCLUDED.tax_level_amount,
  tax_apron_amount = EXCLUDED.tax_apron_amount,
  tax_apron2_amount = EXCLUDED.tax_apron2_amount,
  tax_bracket_amount = EXCLUDED.tax_bracket_amount,
  minimum_team_salary_amount = EXCLUDED.minimum_team_salary_amount,
  maximum_salary_25_pct = EXCLUDED.maximum_salary_25_pct,
  maximum_salary_30_pct = EXCLUDED.maximum_salary_30_pct,
  maximum_salary_35_pct = EXCLUDED.maximum_salary_35_pct,
  average_salary_amount = EXCLUDED.average_salary_amount,
  estimated_average_salary_amount = EXCLUDED.estimated_average_salary_amount,
  non_taxpayer_mid_level_amount = EXCLUDED.non_taxpayer_mid_level_amount,
  taxpayer_mid_level_amount = EXCLUDED.taxpayer_mid_level_amount,
  room_mid_level_amount = EXCLUDED.room_mid_level_amount,
  bi_annual_amount = EXCLUDED.bi_annual_amount,
  two_way_salary_amount = EXCLUDED.two_way_salary_amount,
  two_way_dlg_salary_amount = EXCLUDED.two_way_dlg_salary_amount,
  tpe_dollar_allowance = EXCLUDED.tpe_dollar_allowance,
  max_trade_cash_amount = EXCLUDED.max_trade_cash_amount,
  international_player_payment_limit = EXCLUDED.international_player_payment_limit,
  scale_raise_rate = EXCLUDED.scale_raise_rate,
  days_in_season = EXCLUDED.days_in_season,
  season_start_at = EXCLUDED.season_start_at,
  season_end_at = EXCLUDED.season_end_at,
  playing_start_at = EXCLUDED.playing_start_at,
  playing_end_at = EXCLUDED.playing_end_at,
  finals_end_at = EXCLUDED.finals_end_at,
  training_camp_start_at = EXCLUDED.training_camp_start_at,
  training_camp_end_at = EXCLUDED.training_camp_end_at,
  rookie_camp_start_at = EXCLUDED.rookie_camp_start_at,
  rookie_camp_end_at = EXCLUDED.rookie_camp_end_at,
  draft_at = EXCLUDED.draft_at,
  moratorium_end_at = EXCLUDED.moratorium_end_at,
  trade_deadline_at = EXCLUDED.trade_deadline_at,
  cut_down_at = EXCLUDED.cut_down_at,
  two_way_cut_down_at = EXCLUDED.two_way_cut_down_at,
  notification_start_at = EXCLUDED.notification_start_at,
  notification_end_at = EXCLUDED.notification_end_at,
  exception_start_at = EXCLUDED.exception_start_at,
  exception_prorate_at = EXCLUDED.exception_prorate_at,
  exceptions_added_at = EXCLUDED.exceptions_added_at,
  rnd2_pick_exc_zero_cap_end_at = EXCLUDED.rnd2_pick_exc_zero_cap_end_at,
  bonuses_finalized_at = EXCLUDED.bonuses_finalized_at,
  is_bonuses_finalized = EXCLUDED.is_bonuses_finalized,
  is_cap_projection_generated = EXCLUDED.is_cap_projection_generated,
  is_exceptions_added = EXCLUDED.is_exceptions_added,
  free_agent_status_finalized_at = EXCLUDED.free_agent_status_finalized_at,
  is_free_agent_amounts_finalized = EXCLUDED.is_free_agent_amounts_finalized,
  wnba_offseason_end_at = EXCLUDED.wnba_offseason_end_at,
  wnba_season_finalized_at = EXCLUDED.wnba_season_finalized_at,
  is_wnba_season_finalized = EXCLUDED.is_wnba_season_finalized,
  dlg_countable_roster_moves = EXCLUDED.dlg_countable_roster_moves,
  dlg_max_level_a_salary_players = EXCLUDED.dlg_max_level_a_salary_players,
  dlg_salary_level_a = EXCLUDED.dlg_salary_level_a,
  dlg_salary_level_b = EXCLUDED.dlg_salary_level_b,
  dlg_salary_level_c = EXCLUDED.dlg_salary_level_c,
  dlg_team_salary_budget = EXCLUDED.dlg_team_salary_budget,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- rookie_scale_amounts (rookie_scale_amounts.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_rookie_scale_amounts_source AS
SELECT
  TRY_CAST(rs.season AS INTEGER) AS salary_year,
  TRY_CAST(rs.pick AS INTEGER) AS pick_number,
  COALESCE(rs.league_lk, 'NBA')::VARCHAR AS league_lk,

  TRY_CAST(rs.salary_year1 AS BIGINT) AS salary_year_1,
  TRY_CAST(rs.salary_year2 AS BIGINT) AS salary_year_2,
  TRY_CAST(rs.salary_year3 AS BIGINT) AS salary_year_3,
  TRY_CAST(rs.salary_year4 AS BIGINT) AS salary_year_4,

  TRY_CAST(rs.option_year3 AS BIGINT) AS option_amount_year_3,
  TRY_CAST(rs.option_year4 AS BIGINT) AS option_amount_year_4,
  TRY_CAST(rs.percent_year3 AS DOUBLE) AS option_pct_year_3,
  TRY_CAST(rs.percent_year4 AS DOUBLE) AS option_pct_year_4,

  TRY_CAST(rs.baseline_scale_flg AS BOOLEAN) AS is_baseline_scale,
  TRY_CAST(rs.active_flg AS BOOLEAN) AS is_active,

  TRY_CAST(rs.create_date AS TIMESTAMP) AS created_at,
  TRY_CAST(rs.last_change_date AS TIMESTAMP) AS updated_at,
  TRY_CAST(rs.record_change_date AS TIMESTAMP) AS record_changed_at,
  now() AS ingested_at,
FROM read_json_auto('./shared/nba_pcms_full_extract/rookie_scale_amounts.json') AS rs
WHERE rs.season IS NOT NULL
  AND rs.pick IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_rookie_scale_amounts_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY salary_year, pick_number, league_lk
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_rookie_scale_amounts_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.rookie_scale_amounts BY NAME (
  SELECT * FROM v_rookie_scale_amounts_deduped
)
ON CONFLICT (salary_year, pick_number, league_lk) DO UPDATE SET
  salary_year_1 = EXCLUDED.salary_year_1,
  salary_year_2 = EXCLUDED.salary_year_2,
  salary_year_3 = EXCLUDED.salary_year_3,
  salary_year_4 = EXCLUDED.salary_year_4,
  option_amount_year_3 = EXCLUDED.option_amount_year_3,
  option_amount_year_4 = EXCLUDED.option_amount_year_4,
  option_pct_year_3 = EXCLUDED.option_pct_year_3,
  option_pct_year_4 = EXCLUDED.option_pct_year_4,
  is_baseline_scale = EXCLUDED.is_baseline_scale,
  is_active = EXCLUDED.is_active,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- non_contract_amounts (non_contract_amounts.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_non_contract_amounts_source AS
SELECT
  TRY_CAST(nca.non_contract_amount_id AS BIGINT) AS non_contract_amount_id,
  TRY_CAST(nca.player_id AS INTEGER) AS player_id,
  TRY_CAST(nca.team_id AS INTEGER) AS team_id,
  teams.team_code AS team_code,
  TRY_CAST(nca.non_contract_year AS INTEGER) AS salary_year,
  COALESCE(nca.non_contract_amount_type_lk, nca.amount_type_lk)::VARCHAR AS amount_type_lk,

  TRY_CAST(nca.cap_amount AS BIGINT) AS cap_amount,
  TRY_CAST(nca.tax_amount AS BIGINT) AS tax_amount,
  TRY_CAST(nca.apron_amount AS BIGINT) AS apron_amount,
  TRY_CAST(nca.fa_amount AS BIGINT) AS fa_amount,
  TRY_CAST(nca.fa_amount_calc AS BIGINT) AS fa_amount_calc,
  TRY_CAST(nca.salary_fa_amount AS BIGINT) AS salary_fa_amount,

  TRY_CAST(nca.qo_amount AS BIGINT) AS qo_amount,
  TRY_CAST(nca.rofr_amount AS BIGINT) AS rofr_amount,
  CASE
    WHEN nca.rookie_scale_amount IS NULL THEN NULL
    WHEN json_type(to_json(nca.rookie_scale_amount)) = 'ARRAY'
      THEN TRY_CAST(json_extract_string(to_json(nca.rookie_scale_amount), '$[0]') AS BIGINT)
    ELSE TRY_CAST(nca.rookie_scale_amount AS BIGINT)
  END AS rookie_scale_amount,

  TRY_CAST(nca.carry_over_fa_flg AS BOOLEAN) AS carry_over_fa_flg,
  nca.free_agent_amount_type_lk::VARCHAR AS fa_amount_type_lk,
  nca.free_agent_amount_type_lk_calc::VARCHAR AS fa_amount_type_lk_calc,
  nca.free_agent_designation_lk::VARCHAR AS free_agent_designation_lk,
  nca.free_agent_status_lk::VARCHAR AS free_agent_status_lk,
  nca.min_contract_lk::VARCHAR AS min_contract_lk,

  TRY_CAST(nca.contract_id AS INTEGER) AS contract_id,
  nca.contract_type_lk::VARCHAR AS contract_type_lk,
  TRY_CAST(nca.transaction_id AS INTEGER) AS transaction_id,
  nca.version_number::VARCHAR AS version_number,
  TRY_CAST(nca.years_of_service AS INTEGER) AS years_of_service,

  TRY_CAST(nca.create_date AS TIMESTAMP) AS created_at,
  TRY_CAST(nca.last_change_date AS TIMESTAMP) AS updated_at,
  TRY_CAST(nca.record_change_date AS TIMESTAMP) AS record_changed_at,
  now() AS ingested_at,
FROM read_json_auto('./shared/nba_pcms_full_extract/non_contract_amounts.json') AS nca
LEFT JOIN v_teams AS teams
  ON teams.team_id = TRY_CAST(nca.team_id AS BIGINT)
WHERE nca.non_contract_amount_id IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_non_contract_amounts_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY non_contract_amount_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_non_contract_amounts_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.non_contract_amounts BY NAME (
  SELECT * FROM v_non_contract_amounts_deduped
)
ON CONFLICT (non_contract_amount_id) DO UPDATE SET
  player_id = EXCLUDED.player_id,
  team_id = EXCLUDED.team_id,
  team_code = EXCLUDED.team_code,
  salary_year = EXCLUDED.salary_year,
  amount_type_lk = EXCLUDED.amount_type_lk,
  cap_amount = EXCLUDED.cap_amount,
  tax_amount = EXCLUDED.tax_amount,
  apron_amount = EXCLUDED.apron_amount,
  fa_amount = EXCLUDED.fa_amount,
  fa_amount_calc = EXCLUDED.fa_amount_calc,
  salary_fa_amount = EXCLUDED.salary_fa_amount,
  qo_amount = EXCLUDED.qo_amount,
  rofr_amount = EXCLUDED.rofr_amount,
  rookie_scale_amount = EXCLUDED.rookie_scale_amount,
  carry_over_fa_flg = EXCLUDED.carry_over_fa_flg,
  fa_amount_type_lk = EXCLUDED.fa_amount_type_lk,
  fa_amount_type_lk_calc = EXCLUDED.fa_amount_type_lk_calc,
  free_agent_designation_lk = EXCLUDED.free_agent_designation_lk,
  free_agent_status_lk = EXCLUDED.free_agent_status_lk,
  min_contract_lk = EXCLUDED.min_contract_lk,
  contract_id = EXCLUDED.contract_id,
  contract_type_lk = EXCLUDED.contract_type_lk,
  transaction_id = EXCLUDED.transaction_id,
  version_number = EXCLUDED.version_number,
  years_of_service = EXCLUDED.years_of_service,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- league_salary_scales (yearly_salary_scales.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_league_salary_scales_source AS
SELECT
  TRY_CAST(s.salary_year AS INTEGER) AS salary_year,
  s.league_lk::VARCHAR AS league_lk,
  TRY_CAST(s.years_of_service AS INTEGER) AS years_of_service,

  -- Extract provides minimum_salary_year1..year5; schema stores a single minimum.
  TRY_CAST(s.minimum_salary_year1 AS BIGINT) AS minimum_salary_amount,

  TRY_CAST(s.create_date AS TIMESTAMP) AS created_at,
  TRY_CAST(s.last_change_date AS TIMESTAMP) AS updated_at,
  TRY_CAST(s.record_change_date AS TIMESTAMP) AS record_changed_at,
  now() AS ingested_at,
FROM read_json_auto('./shared/nba_pcms_full_extract/yearly_salary_scales.json') AS s
WHERE s.salary_year IS NOT NULL
  AND s.league_lk IS NOT NULL
  AND s.years_of_service IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_league_salary_scales_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY salary_year, league_lk, years_of_service
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_league_salary_scales_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.league_salary_scales BY NAME (
  SELECT * FROM v_league_salary_scales_deduped
)
ON CONFLICT (salary_year, league_lk, years_of_service) DO UPDATE SET
  minimum_salary_amount = EXCLUDED.minimum_salary_amount,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- league_salary_cap_projections (cap_projections.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_league_salary_cap_projections_source AS
SELECT
  TRY_CAST(p.salary_cap_projection_id AS INTEGER) AS projection_id,
  TRY_CAST(p.season_year AS INTEGER) AS salary_year,
  TRY_CAST(p.cap_amount AS BIGINT) AS cap_amount,
  TRY_CAST(p.tax_level AS BIGINT) AS tax_level_amount,
  TRY_CAST(p.estimated_average_player_salary AS BIGINT) AS estimated_average_player_salary,
  TRY_CAST(p.growth_rate AS DOUBLE) AS growth_rate,
  TRY_CAST(p.effective_date AS TIMESTAMP) AS effective_date,
  TRY_CAST(p.generated_flg AS BOOLEAN) AS is_generated,
  TRY_CAST(p.create_date AS TIMESTAMP) AS created_at,
  TRY_CAST(p.last_change_date AS TIMESTAMP) AS updated_at,
  TRY_CAST(p.record_change_date AS TIMESTAMP) AS record_changed_at,
  now() AS ingested_at,
FROM read_json_auto('./shared/nba_pcms_full_extract/cap_projections.json') AS p
WHERE p.salary_cap_projection_id IS NOT NULL
  AND p.season_year IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_league_salary_cap_projections_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY projection_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_league_salary_cap_projections_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.league_salary_cap_projections BY NAME (
  SELECT * FROM v_league_salary_cap_projections_deduped
)
ON CONFLICT (projection_id) DO UPDATE SET
  salary_year = EXCLUDED.salary_year,
  cap_amount = EXCLUDED.cap_amount,
  tax_level_amount = EXCLUDED.tax_level_amount,
  estimated_average_player_salary = EXCLUDED.estimated_average_player_salary,
  growth_rate = EXCLUDED.growth_rate,
  effective_date = EXCLUDED.effective_date,
  is_generated = EXCLUDED.is_generated,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- league_tax_rates (tax_rates.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_league_tax_rates_source AS
SELECT
  COALESCE(tr.league_lk, 'NBA')::VARCHAR AS league_lk,
  TRY_CAST(tr.salary_year AS INTEGER) AS salary_year,
  TRY_CAST(tr.lower_limit AS BIGINT) AS lower_limit,

  TRY_CAST(tr.upper_limit AS BIGINT) AS upper_limit,
  TRY_CAST(tr.tax_rate_non_repeater AS DOUBLE) AS tax_rate_non_repeater,
  TRY_CAST(tr.tax_rate_repeater AS DOUBLE) AS tax_rate_repeater,
  TRY_CAST(tr.base_charge_non_repeater AS BIGINT) AS base_charge_non_repeater,
  TRY_CAST(tr.base_charge_repeater AS BIGINT) AS base_charge_repeater,

  TRY_CAST(tr.create_date AS TIMESTAMP) AS created_at,
  TRY_CAST(tr.last_change_date AS TIMESTAMP) AS updated_at,
  TRY_CAST(tr.record_change_date AS TIMESTAMP) AS record_changed_at,
  now() AS ingested_at,
FROM read_json_auto('./shared/nba_pcms_full_extract/tax_rates.json') AS tr
WHERE tr.salary_year IS NOT NULL
  AND tr.lower_limit IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_league_tax_rates_deduped AS
SELECT * EXCLUDE(rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY league_lk, salary_year, lower_limit
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_league_tax_rates_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.league_tax_rates BY NAME (
  SELECT * FROM v_league_tax_rates_deduped
)
ON CONFLICT (league_lk, salary_year, lower_limit) DO UPDATE SET
  upper_limit = EXCLUDED.upper_limit,
  tax_rate_non_repeater = EXCLUDED.tax_rate_non_repeater,
  tax_rate_repeater = EXCLUDED.tax_rate_repeater,
  base_charge_non_repeater = EXCLUDED.base_charge_non_repeater,
  base_charge_repeater = EXCLUDED.base_charge_repeater,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- ─────────────────────────────────────────────────────────────────────────────
-- apron_constraints (no source yet)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_apron_constraints_deduped AS
SELECT
  NULL::VARCHAR AS apron_level_lk,
  NULL::VARCHAR AS constraint_code,
  NULL::INTEGER AS effective_salary_year,
  NULL::VARCHAR AS description,
  NULL::TIMESTAMP AS created_at,
  NULL::TIMESTAMP AS updated_at,
  NULL::TIMESTAMP AS record_changed_at,
  now() AS ingested_at,
WHERE false;

-- No-op upsert (keeps script shape stable; inserts 0 rows)
INSERT INTO pg.pcms.apron_constraints BY NAME (
  SELECT * FROM v_apron_constraints_deduped
)
ON CONFLICT (apron_level_lk, constraint_code, effective_salary_year) DO UPDATE SET
  description = EXCLUDED.description,
  updated_at = EXCLUDED.updated_at,
  record_changed_at = EXCLUDED.record_changed_at,
  ingested_at = EXCLUDED.ingested_at;

-- 5) Summary
SELECT
  'league_config' AS step,
  (SELECT count(*) FROM v_league_system_values_deduped) AS league_system_values_rows_upserted,
  (SELECT count(*) FROM v_rookie_scale_amounts_deduped) AS rookie_scale_amounts_rows_upserted,
  (SELECT count(*) FROM v_non_contract_amounts_deduped) AS non_contract_amounts_rows_upserted,
  (SELECT count(*) FROM v_league_salary_scales_deduped) AS league_salary_scales_rows_upserted,
  (SELECT count(*) FROM v_league_salary_cap_projections_deduped) AS league_salary_cap_projections_rows_upserted,
  (SELECT count(*) FROM v_league_tax_rates_deduped) AS league_tax_rates_rows_upserted,
  (SELECT count(*) FROM v_apron_constraints_deduped) AS apron_constraints_rows_upserted,
  now() AS finished_at,
;