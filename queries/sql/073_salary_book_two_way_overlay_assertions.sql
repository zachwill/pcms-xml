-- 073_salary_book_two_way_overlay_assertions.sql
--
-- Ensure salary_book_warehouse.is_two_way aligns with the latest current-year
-- team_budget_snapshots budget_group_lk when a player/team snapshot row exists.

DO $$
DECLARE
  c bigint;
BEGIN
  WITH current_year AS (
    SELECT MIN(salary_year) AS salary_year
    FROM pcms.team_budget_snapshots
  ),
  latest_budget_group AS (
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
      JOIN current_year cy
        ON cy.salary_year = tbs.salary_year
      WHERE tbs.team_code IS NOT NULL
        AND tbs.player_id IS NOT NULL
    ) x
    WHERE x.rn = 1
  )
  SELECT COUNT(*)
    INTO c
  FROM pcms.salary_book_warehouse sbw
  JOIN latest_budget_group lbg
    ON lbg.team_code = sbw.team_code
   AND lbg.player_id = sbw.player_id
  WHERE COALESCE(sbw.is_two_way, false)
        IS DISTINCT FROM (lbg.budget_group_lk = '2WAY');

  IF c > 0 THEN
    RAISE EXCEPTION
      'salary_book_warehouse is_two_way mismatch vs latest current-year team_budget_snapshots budget_group_lk; rows=%',
      c;
  END IF;
END;
$$;
