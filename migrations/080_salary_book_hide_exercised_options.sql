-- 080_salary_book_hide_exercised_options.sql
--
-- Hide exercised option flags in salary_book_warehouse while preserving
-- option_decision_20xx for audit/history.
--
-- Example regression: Jakob Poeltl (1627751) exercised his 2026 option (POE)
-- before signing extension contract 99586; that season should not still render
-- as a pending player option in Salary Book tooling.

BEGIN;

CREATE OR REPLACE FUNCTION pcms.refresh_salary_book_option_decisions_overlay()
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  exercised_codes text[];
BEGIN
  PERFORM set_config('statement_timeout', '0', true);
  PERFORM set_config('lock_timeout', '5s', true);

  SELECT COALESCE(array_agg(l.lookup_code), ARRAY[]::text[])
    INTO exercised_codes
  FROM pcms.lookups l
  WHERE l.lookup_type = 'lk_option_decisions'
    AND l.description ILIKE '%Exercised%';

  UPDATE pcms.salary_book_warehouse sbw
  SET
    option_2025 = CASE
      WHEN NULLIF(BTRIM(sbw.option_decision_2025), '') = ANY(exercised_codes) THEN NULL
      ELSE NULLIF(NULLIF(BTRIM(sbw.option_2025), ''), 'NONE')
    END,
    option_2026 = CASE
      WHEN NULLIF(BTRIM(sbw.option_decision_2026), '') = ANY(exercised_codes) THEN NULL
      ELSE NULLIF(NULLIF(BTRIM(sbw.option_2026), ''), 'NONE')
    END,
    option_2027 = CASE
      WHEN NULLIF(BTRIM(sbw.option_decision_2027), '') = ANY(exercised_codes) THEN NULL
      ELSE NULLIF(NULLIF(BTRIM(sbw.option_2027), ''), 'NONE')
    END,
    option_2028 = CASE
      WHEN NULLIF(BTRIM(sbw.option_decision_2028), '') = ANY(exercised_codes) THEN NULL
      ELSE NULLIF(NULLIF(BTRIM(sbw.option_2028), ''), 'NONE')
    END,
    option_2029 = CASE
      WHEN NULLIF(BTRIM(sbw.option_decision_2029), '') = ANY(exercised_codes) THEN NULL
      ELSE NULLIF(NULLIF(BTRIM(sbw.option_2029), ''), 'NONE')
    END,
    option_2030 = CASE
      WHEN NULLIF(BTRIM(sbw.option_decision_2030), '') = ANY(exercised_codes) THEN NULL
      ELSE NULLIF(NULLIF(BTRIM(sbw.option_2030), ''), 'NONE')
    END;
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
END;
$$;

-- Backfill current rows in-place so the change is visible immediately.
SELECT pcms.refresh_salary_book_option_decisions_overlay();

COMMIT;
