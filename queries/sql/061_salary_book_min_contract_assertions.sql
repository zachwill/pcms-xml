-- 061_salary_book_min_contract_assertions.sql
--
-- Ensure 3+ year minimum contracts are not flagged as is_min_contract.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pcms.salary_book_warehouse
    WHERE min_contract_code = '3PLS'
      AND COALESCE(is_min_contract, false) = true
  ) THEN
    RAISE EXCEPTION 'salary_book_warehouse has 3PLS rows marked is_min_contract';
  END IF;
END;
$$;
