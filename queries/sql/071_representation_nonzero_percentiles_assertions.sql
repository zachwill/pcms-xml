-- 071_representation_nonzero_percentiles_assertions.sql
--
-- Representation percentiles should use non-zero cohorts for count metrics.
-- Zero-valued rows are baseline percentile 0.

DO $$
DECLARE
  mismatch_count int;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM pcms.agents_warehouse w
  WHERE (w.client_count = 0 AND COALESCE(w.client_count_percentile, 0) <> 0)
     OR (w.max_contract_count = 0 AND COALESCE(w.max_contract_count_percentile, 0) <> 0)
     OR (w.team_count = 0 AND COALESCE(w.team_count_percentile, 0) <> 0)
     OR (w.standard_count = 0 AND COALESCE(w.standard_count_percentile, 0) <> 0)
     OR (w.two_way_count = 0 AND COALESCE(w.two_way_count_percentile, 0) <> 0);

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'agents_warehouse zero-baseline percentile mismatch rows=%',
      mismatch_count;
  END IF;
END;
$$;

DO $$
DECLARE
  mismatch_count int;
BEGIN
  WITH expected AS (
    SELECT
      agent_id,
      PERCENT_RANK() OVER (ORDER BY client_count) AS expected_pct
    FROM pcms.agents_warehouse
    WHERE client_count > 0
  )
  SELECT COUNT(*) INTO mismatch_count
  FROM expected e
  JOIN pcms.agents_warehouse w
    ON w.agent_id = e.agent_id
  WHERE ABS(COALESCE(w.client_count_percentile, 0)::double precision - e.expected_pct) > 1e-12;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'agents_warehouse client_count_percentile non-zero cohort mismatch rows=%',
      mismatch_count;
  END IF;
END;
$$;

DO $$
DECLARE
  mismatch_count int;
BEGIN
  SELECT COUNT(*) INTO mismatch_count
  FROM pcms.agencies_warehouse w
  WHERE (w.client_count = 0 AND COALESCE(w.client_count_percentile, 0) <> 0)
     OR (w.max_contract_count = 0 AND COALESCE(w.max_contract_count_percentile, 0) <> 0)
     OR (w.agent_count = 0 AND COALESCE(w.agent_count_percentile, 0) <> 0);

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'agencies_warehouse zero-baseline percentile mismatch rows=%',
      mismatch_count;
  END IF;
END;
$$;

DO $$
DECLARE
  mismatch_count int;
BEGIN
  WITH expected AS (
    SELECT
      agency_id,
      PERCENT_RANK() OVER (ORDER BY client_count) AS expected_pct
    FROM pcms.agencies_warehouse
    WHERE client_count > 0
  )
  SELECT COUNT(*) INTO mismatch_count
  FROM expected e
  JOIN pcms.agencies_warehouse w
    ON w.agency_id = e.agency_id
  WHERE ABS(COALESCE(w.client_count_percentile, 0)::double precision - e.expected_pct) > 1e-12;

  IF mismatch_count > 0 THEN
    RAISE EXCEPTION
      'agencies_warehouse client_count_percentile non-zero cohort mismatch rows=%',
      mismatch_count;
  END IF;
END;
$$;
