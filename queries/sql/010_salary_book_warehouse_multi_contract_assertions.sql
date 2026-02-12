-- 010_salary_book_warehouse_multi_contract_assertions.sql
--
-- Salary book invariants around multi-contract situations.
--
-- Key example: Joel Embiid (203954)
-- - Has an older APPR contract with a declined player option year (POD).
-- - Has a newer FUTR contract supplying future-year salaries.
-- The warehouse should:
-- - NOT show declined option decision codes
-- - Show future-year salary from the newer contract where applicable

-- 1) Warehouse should not surface *declined* option decisions in its year grid.
-- (If an option is declined, that year should be superseded by another contract or removed.)
DO $$
DECLARE c int;
BEGIN
  SELECT COUNT(*) INTO c
  FROM pcms.salary_book_warehouse sbw
  WHERE sbw.option_decision_2025 IN ('POD','TOD')
     OR sbw.option_decision_2026 IN ('POD','TOD')
     OR sbw.option_decision_2027 IN ('POD','TOD')
     OR sbw.option_decision_2028 IN ('POD','TOD')
     OR sbw.option_decision_2029 IN ('POD','TOD')
     OR sbw.option_decision_2030 IN ('POD','TOD');

  IF c > 0 THEN
    RAISE EXCEPTION 'salary_book_warehouse surfaces declined option decisions (POD/TOD) in % rows', c;
  END IF;
END
$$;

-- 2) Exercised options should not still surface as pending option flags.
--    (Keep option_decision_20xx for audit/history, but option_20xx should clear.)
DO $$
DECLARE c int;
BEGIN
  WITH exercised_decisions AS (
    SELECT l.lookup_code
    FROM pcms.lookups l
    WHERE l.lookup_type = 'lk_option_decisions'
      AND l.description ILIKE '%Exercised%'
  )
  SELECT COUNT(*) INTO c
  FROM pcms.salary_book_warehouse sbw
  WHERE (sbw.option_2025 IS NOT NULL AND sbw.option_decision_2025 IN (SELECT lookup_code FROM exercised_decisions))
     OR (sbw.option_2026 IS NOT NULL AND sbw.option_decision_2026 IN (SELECT lookup_code FROM exercised_decisions))
     OR (sbw.option_2027 IS NOT NULL AND sbw.option_decision_2027 IN (SELECT lookup_code FROM exercised_decisions))
     OR (sbw.option_2028 IS NOT NULL AND sbw.option_decision_2028 IN (SELECT lookup_code FROM exercised_decisions))
     OR (sbw.option_2029 IS NOT NULL AND sbw.option_decision_2029 IN (SELECT lookup_code FROM exercised_decisions))
     OR (sbw.option_2030 IS NOT NULL AND sbw.option_decision_2030 IN (SELECT lookup_code FROM exercised_decisions));

  IF c > 0 THEN
    RAISE EXCEPTION 'salary_book_warehouse surfaces exercised option flags in % rows', c;
  END IF;
END
$$;

-- 3) Concrete regression test: Joel Embiid future years should come from contract 99163.
-- Expected cap hits from pcms.salaries for contract_id=99163:
--   2026: 58,100,000
--   2027: 62,748,000
--   2028: 67,396,000
DO $$
DECLARE r record;
BEGIN
  SELECT cap_2026, cap_2027, cap_2028
    INTO r
  FROM pcms.salary_book_warehouse
  WHERE player_id = 203954;

  IF r.cap_2026 IS DISTINCT FROM 58100000 THEN
    RAISE EXCEPTION 'Embiid cap_2026 expected 58100000, got %', r.cap_2026;
  END IF;

  IF r.cap_2027 IS DISTINCT FROM 62748000 THEN
    RAISE EXCEPTION 'Embiid cap_2027 expected 62748000, got %', r.cap_2027;
  END IF;

  IF r.cap_2028 IS DISTINCT FROM 67396000 THEN
    RAISE EXCEPTION 'Embiid cap_2028 expected 67396000, got %', r.cap_2028;
  END IF;
END
$$;

-- 4) Concrete regression test: Jakob Poeltl's exercised 2026 PO should not
--    still surface as a pending option flag in Salary Book.
DO $$
DECLARE r record;
BEGIN
  SELECT option_2026, option_decision_2026
    INTO r
  FROM pcms.salary_book_warehouse
  WHERE player_id = 1627751;

  IF FOUND AND r.option_decision_2026 = 'POE' AND r.option_2026 IS NOT NULL THEN
    RAISE EXCEPTION 'Poeltl 2026 option should be NULL when POE is present, got %', r.option_2026;
  END IF;
END
$$;
