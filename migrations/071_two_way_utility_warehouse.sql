-- 071_two_way_utility_warehouse.sql
--
-- Tool-facing cache for Two-Way Utility.
--
-- Why:
-- - pcms.two_way_contract_utility is populated from two_way.json -> two_way_seasons, but
--   upstream currently provides NULLs for games_on_active_list / remaining_* fields.
-- - The authoritative per-player usage counters live in pcms.two_way_game_utility
--   (two_way_utility.json -> active_list_by_team).
--
-- This migration:
-- 1) Creates pcms.two_way_utility_warehouse (one row per ACTIVE two-way contract)
-- 2) Adds pcms.refresh_two_way_utility_warehouse()
-- 3) Drops deprecated pcms.two_way_contract_utility (optional, but requested)
--
-- Sources:
-- - pcms.contracts + pcms.contract_versions (active two-way contract identity)
-- - pcms.people (names)
-- - pcms.two_way_game_utility (games used + game limit)
-- - pcms.team_two_way_capacity (team posture: standard contracts, games remaining)

BEGIN;

CREATE TABLE IF NOT EXISTS pcms.two_way_utility_warehouse (
  contract_id integer PRIMARY KEY,

  -- Identity
  salary_year integer NOT NULL,

  team_id integer,
  team_code text NOT NULL,
  team_name text,
  conference_name text,

  player_id integer NOT NULL,
  player_name text,
  display_first_name text,
  display_last_name text,
  years_of_service integer,

  -- Contract
  contract_type_code text,
  contract_type_lookup_value text,
  record_status_lk text,

  signing_date date,
  contract_end_date date,
  convert_date date,

  -- PCMS contract field (used as a fallback to estimate game limit when game utility has no rows)
  two_way_service_limit integer,

  -- Player-level utility (game-based)
  games_on_active_list integer,
  active_list_games_limit integer,
  remaining_active_list_games integer,
  active_list_games_limit_is_estimate boolean,

  first_game_date_est date,
  last_game_date_est date,

  -- Team-level posture (from pcms.team_two_way_capacity)
  team_current_contract_count integer,
  team_games_remaining integer,
  team_under_15_games_count integer,
  team_under_15_games_remaining integer,
  team_games_remaining_context integer,
  team_is_under_15_contracts boolean,

  -- Convenience: how many active two-way contracts this team currently has
  team_two_way_contract_count integer,

  refreshed_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_two_way_utility_warehouse_team
  ON pcms.two_way_utility_warehouse (team_code);

CREATE INDEX IF NOT EXISTS idx_two_way_utility_warehouse_player
  ON pcms.two_way_utility_warehouse (player_id);

CREATE INDEX IF NOT EXISTS idx_two_way_utility_warehouse_team_player
  ON pcms.two_way_utility_warehouse (team_code, player_id);


CREATE OR REPLACE FUNCTION pcms.refresh_two_way_utility_warehouse()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_year integer;
BEGIN
  PERFORM set_config('statement_timeout', '0', true);
  PERFORM set_config('lock_timeout', '5s', true);

  -- Keep in sync with other warehouses: “current year” is the minimum year present in team_budget_snapshots.
  SELECT MIN(salary_year) INTO v_current_year FROM pcms.team_budget_snapshots;

  TRUNCATE TABLE pcms.two_way_utility_warehouse;

  INSERT INTO pcms.two_way_utility_warehouse (
    contract_id,

    salary_year,

    team_id,
    team_code,
    team_name,
    conference_name,

    player_id,
    player_name,
    display_first_name,
    display_last_name,
    years_of_service,

    contract_type_code,
    contract_type_lookup_value,
    record_status_lk,

    signing_date,
    contract_end_date,
    convert_date,

    two_way_service_limit,

    games_on_active_list,
    active_list_games_limit,
    remaining_active_list_games,
    active_list_games_limit_is_estimate,

    first_game_date_est,
    last_game_date_est,

    team_current_contract_count,
    team_games_remaining,
    team_under_15_games_count,
    team_under_15_games_remaining,
    team_games_remaining_context,
    team_is_under_15_contracts,

    team_two_way_contract_count,

    refreshed_at
  )
  WITH latest_version AS (
    SELECT DISTINCT ON (cv.contract_id)
      cv.contract_id,
      cv.version_number,
      cv.contract_type_lk AS contract_type_code,
      lkt.description AS contract_type_lookup_value
    FROM pcms.contract_versions cv
    LEFT JOIN pcms.lookups lkt
      ON lkt.lookup_type = 'lk_contract_types'
     AND lkt.lookup_code = cv.contract_type_lk
    ORDER BY cv.contract_id, cv.version_number DESC
  ),
  active_tw_contracts AS (
    SELECT
      c.contract_id,
      c.player_id,
      c.team_code,
      c.record_status_lk,
      c.signing_date,
      c.contract_end_date,
      c.convert_date,
      c.two_way_service_limit,
      v.contract_type_code,
      v.contract_type_lookup_value
    FROM pcms.contracts c
    JOIN latest_version v
      ON v.contract_id = c.contract_id
    WHERE c.team_code IS NOT NULL
      AND c.record_status_lk = 'APPR'
      AND v.contract_type_code IN ('2WCT', 'REGCV')
  ),
  game_agg AS (
    SELECT
      a.contract_id,
      MAX(g.games_on_active_list)::int AS games_on_active_list,
      MAX(g.active_list_games_limit)::int AS active_list_games_limit,
      MIN(g.game_date_est) AS first_game_date_est,
      MAX(g.game_date_est) AS last_game_date_est
    FROM active_tw_contracts a
    LEFT JOIN pcms.two_way_game_utility g
      ON g.player_id = a.player_id
     AND g.team_code = a.team_code
     AND (a.signing_date IS NULL OR g.game_date_est >= a.signing_date)
     AND (a.contract_end_date IS NULL OR g.game_date_est <= a.contract_end_date)
    GROUP BY a.contract_id
  ),
  base AS (
    SELECT
      a.contract_id,
      v_current_year AS salary_year,

      t.team_id,
      a.team_code,
      t.team_name,
      t.conference_name,

      a.player_id,
      COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
        NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
        a.player_id::text
      ) AS player_name,
      p.display_first_name,
      p.display_last_name,
      p.years_of_service,

      a.contract_type_code,
      a.contract_type_lookup_value,
      a.record_status_lk,

      a.signing_date,
      a.contract_end_date,
      a.convert_date,

      a.two_way_service_limit,

      COALESCE(g.games_on_active_list, 0)::int AS games_on_active_list,
      g.active_list_games_limit AS util_active_list_games_limit,
      g.first_game_date_est,
      g.last_game_date_est,

      cap.current_contract_count AS team_current_contract_count,
      cap.games_remaining AS team_games_remaining,
      cap.under_15_games_count AS team_under_15_games_count,
      cap.under_15_games_remaining AS team_under_15_games_remaining

    FROM active_tw_contracts a
    LEFT JOIN game_agg g
      ON g.contract_id = a.contract_id
    LEFT JOIN pcms.people p
      ON p.person_id = a.player_id
    LEFT JOIN pcms.teams t
      ON t.team_code = a.team_code
     AND t.league_lk = 'NBA'
    LEFT JOIN pcms.team_two_way_capacity cap
      ON cap.team_code = a.team_code
  ),
  computed AS (
    SELECT
      b.*,

      CASE
        WHEN b.util_active_list_games_limit IS NOT NULL THEN b.util_active_list_games_limit::int
        WHEN b.two_way_service_limit IS NOT NULL THEN floor((b.two_way_service_limit::numeric * 50) / 45)::int
        ELSE NULL
      END AS active_list_games_limit,

      (b.util_active_list_games_limit IS NULL AND b.two_way_service_limit IS NOT NULL) AS active_list_games_limit_is_estimate,

      CASE
        WHEN COALESCE(b.team_current_contract_count, 0) < 15 THEN b.team_under_15_games_remaining
        ELSE b.team_games_remaining
      END AS team_games_remaining_context,

      (COALESCE(b.team_current_contract_count, 0) < 15) AS team_is_under_15_contracts

    FROM base b
  )
  SELECT
    c.contract_id,

    c.salary_year,

    c.team_id,
    c.team_code,
    c.team_name,
    c.conference_name,

    c.player_id,
    c.player_name,
    c.display_first_name,
    c.display_last_name,
    c.years_of_service,

    c.contract_type_code,
    c.contract_type_lookup_value,
    c.record_status_lk,

    c.signing_date,
    c.contract_end_date,
    c.convert_date,

    c.two_way_service_limit,

    c.games_on_active_list,
    c.active_list_games_limit,
    CASE
      WHEN c.active_list_games_limit IS NULL THEN NULL
      ELSE GREATEST((c.active_list_games_limit - c.games_on_active_list)::int, 0)
    END AS remaining_active_list_games,
    c.active_list_games_limit_is_estimate,

    c.first_game_date_est,
    c.last_game_date_est,

    c.team_current_contract_count,
    c.team_games_remaining,
    c.team_under_15_games_count,
    c.team_under_15_games_remaining,
    c.team_games_remaining_context,
    c.team_is_under_15_contracts,

    COUNT(*) OVER (PARTITION BY c.team_code)::int AS team_two_way_contract_count,

    now() AS refreshed_at
  FROM computed c
  ORDER BY c.team_code, c.player_name;
END;
$$;

-- Deprecation cleanup (table contains only NULL usage fields upstream)
DROP TABLE IF EXISTS pcms.two_way_contract_utility;

COMMIT;
