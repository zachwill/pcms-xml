-- 055_salary_book_yearly_contract_metadata.sql
--
-- Extend pcms.salary_book_yearly (adapter over salary_book_warehouse) with
-- contract + trade metadata columns so yearly tooling queries do not need to
-- join back to salary_book_warehouse.
--
-- Also fixes a correctness issue: outgoing_apron_amount should be derived from
-- apron salary, not cap salary.
--
-- Important Postgres note:
-- CREATE OR REPLACE VIEW cannot reorder/rename existing columns. So we keep the
-- original column order and append new columns at the end.

BEGIN;

CREATE OR REPLACE VIEW pcms.salary_book_yearly AS
SELECT
  -- ---------------------------------------------------------------------------
  -- Original columns (keep order stable)
  -- ---------------------------------------------------------------------------
  sbw.player_id,
  sbw.player_name,
  sbw.league_lk,

  sbw.team_code,
  sbw.contract_team_code,
  sbw.person_team_code,

  sbw.contract_id,
  sbw.version_number,

  2025 AS salary_year,

  sbw.cap_2025   AS cap_amount,
  sbw.tax_2025   AS tax_amount,
  sbw.apron_2025 AS apron_amount,

  -- Fix: apron delta math should use apron amounts (not cap)
  sbw.apron_2025 AS outgoing_apron_amount,
  COALESCE(sbw.incoming_apron_2025, sbw.apron_2025) AS incoming_apron_amount,

  -- Trade-context cap/tax amounts (only present for 2025 today; fall back to cap/tax)
  COALESCE(sbw.incoming_salary_2025, sbw.cap_2025) AS incoming_cap_amount,
  COALESCE(sbw.incoming_tax_2025, sbw.tax_2025)    AS incoming_tax_amount,

  sbw.is_two_way,
  sbw.is_poison_pill,
  sbw.poison_pill_amount,

  sbw.is_trade_bonus,
  sbw.trade_bonus_percent,
  sbw.trade_kicker_amount_2025 AS trade_kicker_amount,

  -- Player consent / trade-consent-ish
  NULLIF(sbw.player_consent_lk, 'NONE') AS player_consent_lk,
  sbw.player_consent_end_date,
  COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
  COALESCE(sbw.is_trade_preconsented, false) AS is_trade_preconsented,

  sbw.refreshed_at,

  -- ---------------------------------------------------------------------------
  -- Appended columns (new)
  -- ---------------------------------------------------------------------------
  sbw.is_no_trade,

  sbw.contract_type_code,
  sbw.contract_type_lookup_value,

  sbw.signed_method_code,
  sbw.signed_method_lookup_value,
  sbw.team_exception_id,
  sbw.exception_type_code,
  sbw.exception_type_lookup_value,
  sbw.min_contract_code,
  sbw.min_contract_lookup_value,

  sbw.trade_restriction_code,
  sbw.trade_restriction_lookup_value,
  sbw.trade_restriction_end_date,
  COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now
FROM pcms.salary_book_warehouse sbw

UNION ALL

SELECT
  sbw.player_id,
  sbw.player_name,
  sbw.league_lk,

  sbw.team_code,
  sbw.contract_team_code,
  sbw.person_team_code,

  sbw.contract_id,
  sbw.version_number,

  2026 AS salary_year,

  sbw.cap_2026   AS cap_amount,
  sbw.tax_2026   AS tax_amount,
  sbw.apron_2026 AS apron_amount,

  sbw.apron_2026 AS outgoing_apron_amount,
  sbw.apron_2026 AS incoming_apron_amount,

  sbw.cap_2026 AS incoming_cap_amount,
  sbw.tax_2026 AS incoming_tax_amount,

  sbw.is_two_way,
  sbw.is_poison_pill,
  sbw.poison_pill_amount,

  sbw.is_trade_bonus,
  sbw.trade_bonus_percent,
  NULL::bigint AS trade_kicker_amount,

  NULLIF(sbw.player_consent_lk, 'NONE') AS player_consent_lk,
  sbw.player_consent_end_date,
  COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
  COALESCE(sbw.is_trade_preconsented, false) AS is_trade_preconsented,

  sbw.refreshed_at,

  sbw.is_no_trade,

  sbw.contract_type_code,
  sbw.contract_type_lookup_value,

  sbw.signed_method_code,
  sbw.signed_method_lookup_value,
  sbw.team_exception_id,
  sbw.exception_type_code,
  sbw.exception_type_lookup_value,
  sbw.min_contract_code,
  sbw.min_contract_lookup_value,

  sbw.trade_restriction_code,
  sbw.trade_restriction_lookup_value,
  sbw.trade_restriction_end_date,
  COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now
FROM pcms.salary_book_warehouse sbw

UNION ALL

SELECT
  sbw.player_id,
  sbw.player_name,
  sbw.league_lk,

  sbw.team_code,
  sbw.contract_team_code,
  sbw.person_team_code,

  sbw.contract_id,
  sbw.version_number,

  2027 AS salary_year,

  sbw.cap_2027   AS cap_amount,
  sbw.tax_2027   AS tax_amount,
  sbw.apron_2027 AS apron_amount,

  sbw.apron_2027 AS outgoing_apron_amount,
  sbw.apron_2027 AS incoming_apron_amount,

  sbw.cap_2027 AS incoming_cap_amount,
  sbw.tax_2027 AS incoming_tax_amount,

  sbw.is_two_way,
  sbw.is_poison_pill,
  sbw.poison_pill_amount,

  sbw.is_trade_bonus,
  sbw.trade_bonus_percent,
  NULL::bigint AS trade_kicker_amount,

  NULLIF(sbw.player_consent_lk, 'NONE') AS player_consent_lk,
  sbw.player_consent_end_date,
  COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
  COALESCE(sbw.is_trade_preconsented, false) AS is_trade_preconsented,

  sbw.refreshed_at,

  sbw.is_no_trade,

  sbw.contract_type_code,
  sbw.contract_type_lookup_value,

  sbw.signed_method_code,
  sbw.signed_method_lookup_value,
  sbw.team_exception_id,
  sbw.exception_type_code,
  sbw.exception_type_lookup_value,
  sbw.min_contract_code,
  sbw.min_contract_lookup_value,

  sbw.trade_restriction_code,
  sbw.trade_restriction_lookup_value,
  sbw.trade_restriction_end_date,
  COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now
FROM pcms.salary_book_warehouse sbw

UNION ALL

SELECT
  sbw.player_id,
  sbw.player_name,
  sbw.league_lk,

  sbw.team_code,
  sbw.contract_team_code,
  sbw.person_team_code,

  sbw.contract_id,
  sbw.version_number,

  2028 AS salary_year,

  sbw.cap_2028   AS cap_amount,
  sbw.tax_2028   AS tax_amount,
  sbw.apron_2028 AS apron_amount,

  sbw.apron_2028 AS outgoing_apron_amount,
  sbw.apron_2028 AS incoming_apron_amount,

  sbw.cap_2028 AS incoming_cap_amount,
  sbw.tax_2028 AS incoming_tax_amount,

  sbw.is_two_way,
  sbw.is_poison_pill,
  sbw.poison_pill_amount,

  sbw.is_trade_bonus,
  sbw.trade_bonus_percent,
  NULL::bigint AS trade_kicker_amount,

  NULLIF(sbw.player_consent_lk, 'NONE') AS player_consent_lk,
  sbw.player_consent_end_date,
  COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
  COALESCE(sbw.is_trade_preconsented, false) AS is_trade_preconsented,

  sbw.refreshed_at,

  sbw.is_no_trade,

  sbw.contract_type_code,
  sbw.contract_type_lookup_value,

  sbw.signed_method_code,
  sbw.signed_method_lookup_value,
  sbw.team_exception_id,
  sbw.exception_type_code,
  sbw.exception_type_lookup_value,
  sbw.min_contract_code,
  sbw.min_contract_lookup_value,

  sbw.trade_restriction_code,
  sbw.trade_restriction_lookup_value,
  sbw.trade_restriction_end_date,
  COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now
FROM pcms.salary_book_warehouse sbw

UNION ALL

SELECT
  sbw.player_id,
  sbw.player_name,
  sbw.league_lk,

  sbw.team_code,
  sbw.contract_team_code,
  sbw.person_team_code,

  sbw.contract_id,
  sbw.version_number,

  2029 AS salary_year,

  sbw.cap_2029   AS cap_amount,
  sbw.tax_2029   AS tax_amount,
  sbw.apron_2029 AS apron_amount,

  sbw.apron_2029 AS outgoing_apron_amount,
  sbw.apron_2029 AS incoming_apron_amount,

  sbw.cap_2029 AS incoming_cap_amount,
  sbw.tax_2029 AS incoming_tax_amount,

  sbw.is_two_way,
  sbw.is_poison_pill,
  sbw.poison_pill_amount,

  sbw.is_trade_bonus,
  sbw.trade_bonus_percent,
  NULL::bigint AS trade_kicker_amount,

  NULLIF(sbw.player_consent_lk, 'NONE') AS player_consent_lk,
  sbw.player_consent_end_date,
  COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
  COALESCE(sbw.is_trade_preconsented, false) AS is_trade_preconsented,

  sbw.refreshed_at,

  sbw.is_no_trade,

  sbw.contract_type_code,
  sbw.contract_type_lookup_value,

  sbw.signed_method_code,
  sbw.signed_method_lookup_value,
  sbw.team_exception_id,
  sbw.exception_type_code,
  sbw.exception_type_lookup_value,
  sbw.min_contract_code,
  sbw.min_contract_lookup_value,

  sbw.trade_restriction_code,
  sbw.trade_restriction_lookup_value,
  sbw.trade_restriction_end_date,
  COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now
FROM pcms.salary_book_warehouse sbw

UNION ALL

SELECT
  sbw.player_id,
  sbw.player_name,
  sbw.league_lk,

  sbw.team_code,
  sbw.contract_team_code,
  sbw.person_team_code,

  sbw.contract_id,
  sbw.version_number,

  2030 AS salary_year,

  sbw.cap_2030   AS cap_amount,
  sbw.tax_2030   AS tax_amount,
  sbw.apron_2030 AS apron_amount,

  sbw.apron_2030 AS outgoing_apron_amount,
  sbw.apron_2030 AS incoming_apron_amount,

  sbw.cap_2030 AS incoming_cap_amount,
  sbw.tax_2030 AS incoming_tax_amount,

  sbw.is_two_way,
  sbw.is_poison_pill,
  sbw.poison_pill_amount,

  sbw.is_trade_bonus,
  sbw.trade_bonus_percent,
  NULL::bigint AS trade_kicker_amount,

  NULLIF(sbw.player_consent_lk, 'NONE') AS player_consent_lk,
  sbw.player_consent_end_date,
  COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
  COALESCE(sbw.is_trade_preconsented, false) AS is_trade_preconsented,

  sbw.refreshed_at,

  sbw.is_no_trade,

  sbw.contract_type_code,
  sbw.contract_type_lookup_value,

  sbw.signed_method_code,
  sbw.signed_method_lookup_value,
  sbw.team_exception_id,
  sbw.exception_type_code,
  sbw.exception_type_lookup_value,
  sbw.min_contract_code,
  sbw.min_contract_lookup_value,

  sbw.trade_restriction_code,
  sbw.trade_restriction_lookup_value,
  sbw.trade_restriction_end_date,
  COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now
FROM pcms.salary_book_warehouse sbw;

COMMIT;
