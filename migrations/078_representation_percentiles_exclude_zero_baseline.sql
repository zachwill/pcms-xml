-- 078_representation_percentiles_exclude_zero_baseline.sql
--
-- Recompute representation percentiles against non-zero cohorts for each metric.
--
-- Why:
-- - Most agents/agencies have zero represented clients.
-- - Ranking against all rows makes small non-zero values look artificially elite.
-- - For count/book metrics, treat zero as the baseline percentile (0), and rank only
--   rows with positive values against one another.

BEGIN;

CREATE OR REPLACE FUNCTION pcms.refresh_agents_warehouse_percentiles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH
  p25 AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY cap_2025_total) AS p
    FROM pcms.agents_warehouse
    WHERE cap_2025_total > 0
  ),
  p26 AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY cap_2026_total) AS p
    FROM pcms.agents_warehouse
    WHERE cap_2026_total > 0
  ),
  p27 AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY cap_2027_total) AS p
    FROM pcms.agents_warehouse
    WHERE cap_2027_total > 0
  ),
  p_clients AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY client_count) AS p
    FROM pcms.agents_warehouse
    WHERE client_count > 0
  ),
  p_max AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY max_contract_count) AS p
    FROM pcms.agents_warehouse
    WHERE max_contract_count > 0
  ),
  p_teams AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY team_count) AS p
    FROM pcms.agents_warehouse
    WHERE team_count > 0
  ),
  p_standard AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY standard_count) AS p
    FROM pcms.agents_warehouse
    WHERE standard_count > 0
  ),
  p_two_way AS (
    SELECT agent_id, PERCENT_RANK() OVER (ORDER BY two_way_count) AS p
    FROM pcms.agents_warehouse
    WHERE two_way_count > 0
  ),
  ranked AS (
    SELECT
      w.agent_id,
      COALESCE(p25.p, 0)::numeric AS p25,
      COALESCE(p26.p, 0)::numeric AS p26,
      COALESCE(p27.p, 0)::numeric AS p27,
      COALESCE(p_clients.p, 0)::numeric AS p_clients,
      COALESCE(p_max.p, 0)::numeric AS p_max,
      COALESCE(p_teams.p, 0)::numeric AS p_teams,
      COALESCE(p_standard.p, 0)::numeric AS p_standard,
      COALESCE(p_two_way.p, 0)::numeric AS p_two_way
    FROM pcms.agents_warehouse w
    LEFT JOIN p25 ON p25.agent_id = w.agent_id
    LEFT JOIN p26 ON p26.agent_id = w.agent_id
    LEFT JOIN p27 ON p27.agent_id = w.agent_id
    LEFT JOIN p_clients ON p_clients.agent_id = w.agent_id
    LEFT JOIN p_max ON p_max.agent_id = w.agent_id
    LEFT JOIN p_teams ON p_teams.agent_id = w.agent_id
    LEFT JOIN p_standard ON p_standard.agent_id = w.agent_id
    LEFT JOIN p_two_way ON p_two_way.agent_id = w.agent_id
  )
  UPDATE pcms.agents_warehouse w
  SET
    cap_2025_total_percentile = r.p25,
    cap_2026_total_percentile = r.p26,
    cap_2027_total_percentile = r.p27,
    client_count_percentile = r.p_clients,
    max_contract_count_percentile = r.p_max,
    team_count_percentile = r.p_teams,
    standard_count_percentile = r.p_standard,
    two_way_count_percentile = r.p_two_way
  FROM ranked r
  WHERE w.agent_id = r.agent_id;
END;
$$;


CREATE OR REPLACE FUNCTION pcms.refresh_agencies_warehouse_percentiles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH
  p25 AS (
    SELECT agency_id, PERCENT_RANK() OVER (ORDER BY cap_2025_total) AS p
    FROM pcms.agencies_warehouse
    WHERE cap_2025_total > 0
  ),
  p26 AS (
    SELECT agency_id, PERCENT_RANK() OVER (ORDER BY cap_2026_total) AS p
    FROM pcms.agencies_warehouse
    WHERE cap_2026_total > 0
  ),
  p27 AS (
    SELECT agency_id, PERCENT_RANK() OVER (ORDER BY cap_2027_total) AS p
    FROM pcms.agencies_warehouse
    WHERE cap_2027_total > 0
  ),
  p_clients AS (
    SELECT agency_id, PERCENT_RANK() OVER (ORDER BY client_count) AS p
    FROM pcms.agencies_warehouse
    WHERE client_count > 0
  ),
  p_max AS (
    SELECT agency_id, PERCENT_RANK() OVER (ORDER BY max_contract_count) AS p
    FROM pcms.agencies_warehouse
    WHERE max_contract_count > 0
  ),
  p_agents AS (
    SELECT agency_id, PERCENT_RANK() OVER (ORDER BY agent_count) AS p
    FROM pcms.agencies_warehouse
    WHERE agent_count > 0
  ),
  ranked AS (
    SELECT
      w.agency_id,
      COALESCE(p25.p, 0)::numeric AS p25,
      COALESCE(p26.p, 0)::numeric AS p26,
      COALESCE(p27.p, 0)::numeric AS p27,
      COALESCE(p_clients.p, 0)::numeric AS p_clients,
      COALESCE(p_max.p, 0)::numeric AS p_max,
      COALESCE(p_agents.p, 0)::numeric AS p_agents
    FROM pcms.agencies_warehouse w
    LEFT JOIN p25 ON p25.agency_id = w.agency_id
    LEFT JOIN p26 ON p26.agency_id = w.agency_id
    LEFT JOIN p27 ON p27.agency_id = w.agency_id
    LEFT JOIN p_clients ON p_clients.agency_id = w.agency_id
    LEFT JOIN p_max ON p_max.agency_id = w.agency_id
    LEFT JOIN p_agents ON p_agents.agency_id = w.agency_id
  )
  UPDATE pcms.agencies_warehouse w
  SET
    cap_2025_total_percentile = r.p25,
    cap_2026_total_percentile = r.p26,
    cap_2027_total_percentile = r.p27,
    client_count_percentile = r.p_clients,
    max_contract_count_percentile = r.p_max,
    agent_count_percentile = r.p_agents
  FROM ranked r
  WHERE w.agency_id = r.agency_id;
END;
$$;

-- Backfill immediately.
SELECT pcms.refresh_agents_warehouse_percentiles();
SELECT pcms.refresh_agencies_warehouse_percentiles();

COMMIT;
