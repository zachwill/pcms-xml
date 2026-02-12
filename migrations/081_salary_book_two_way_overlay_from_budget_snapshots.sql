-- 081_salary_book_two_way_overlay_from_budget_snapshots.sql
--
-- Reconcile salary_book_warehouse.is_two_way against the authoritative
-- current-year team budget snapshot when available.
--
-- Why:
-- - salary_book_warehouse is contract-driven (contracts/versions), and can lag when
--   a newly signed/converted contract exists in team_budget_snapshots/transactions
--   before the contracts extract is updated.
-- - This can surface impossible states (e.g. >3 two-way players on a team) in the
--   tool-facing player warehouse.
--
-- Rule:
-- - For rows that have a current-year team_budget_snapshots row (same team_code + player_id),
--   set is_two_way from the latest snapshot budget_group_lk:
--     budget_group_lk = '2WAY' -> true
--     otherwise            -> false
-- - For rows without a matching snapshot row, keep the existing contract-type-derived value.

BEGIN;

CREATE OR REPLACE FUNCTION pcms.refresh_salary_book_two_way_overlay()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_current_year integer;
BEGIN
  PERFORM set_config('statement_timeout', '0', true);
  PERFORM set_config('lock_timeout', '5s', true);

  SELECT MIN(salary_year)
    INTO v_current_year
  FROM pcms.team_budget_snapshots;

  IF v_current_year IS NULL THEN
    RETURN;
  END IF;

  WITH latest_budget_group AS (
    SELECT
      x.team_code,
      x.player_id,
      x.budget_group_lk
    FROM (
      SELECT
        tbs.team_code,
        tbs.player_id,
        tbs.budget_group_lk,
        ROW_NUMBER() OVER (
          PARTITION BY tbs.team_code, tbs.player_id
          ORDER BY
            COALESCE(tbs.ledger_date, tbs.signing_date) DESC NULLS LAST,
            tbs.transaction_id DESC NULLS LAST,
            tbs.contract_id DESC NULLS LAST,
            tbs.version_number DESC NULLS LAST
        ) AS rn
      FROM pcms.team_budget_snapshots tbs
      WHERE tbs.salary_year = v_current_year
        AND tbs.team_code IS NOT NULL
        AND tbs.player_id IS NOT NULL
    ) x
    WHERE x.rn = 1
  )
  UPDATE pcms.salary_book_warehouse sbw
  SET is_two_way = (lbg.budget_group_lk = '2WAY')
  FROM latest_budget_group lbg
  WHERE sbw.team_code = lbg.team_code
    AND sbw.player_id = lbg.player_id
    AND sbw.is_two_way IS DISTINCT FROM (lbg.budget_group_lk = '2WAY');
END;
$$;

CREATE OR REPLACE FUNCTION pcms.refresh_salary_book_warehouse()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  PERFORM pcms.refresh_salary_book_warehouse_core();
  PERFORM pcms.refresh_salary_book_option_decisions_overlay();
  PERFORM pcms.refresh_salary_book_cap_holds_overlay();
  PERFORM pcms.refresh_salary_book_two_way_overlay();
END;
$$;

-- Backfill current rows in-place so the change is visible immediately.
SELECT pcms.refresh_salary_book_two_way_overlay();

COMMIT;
