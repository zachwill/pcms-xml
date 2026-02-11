-- 077_agents_warehouse_additional_percentiles.sql
--
-- Persist additional representation percentiles in pcms.agents_warehouse
-- for Salary Book agent sidebar KPI cells (Teams / Std / 2W).

BEGIN;

ALTER TABLE pcms.agents_warehouse
  ADD COLUMN IF NOT EXISTS team_count_percentile numeric,
  ADD COLUMN IF NOT EXISTS standard_count_percentile numeric,
  ADD COLUMN IF NOT EXISTS two_way_count_percentile numeric;


CREATE OR REPLACE FUNCTION pcms.refresh_agents_warehouse_percentiles()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  WITH ranked AS (
    SELECT
      agent_id,
      PERCENT_RANK() OVER (ORDER BY cap_2025_total) AS p25,
      PERCENT_RANK() OVER (ORDER BY cap_2026_total) AS p26,
      PERCENT_RANK() OVER (ORDER BY cap_2027_total) AS p27,
      PERCENT_RANK() OVER (ORDER BY client_count) AS p_clients,
      PERCENT_RANK() OVER (ORDER BY max_contract_count) AS p_max,
      PERCENT_RANK() OVER (ORDER BY team_count) AS p_teams,
      PERCENT_RANK() OVER (ORDER BY standard_count) AS p_standard,
      PERCENT_RANK() OVER (ORDER BY two_way_count) AS p_two_way
    FROM pcms.agents_warehouse
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

-- Backfill now so new columns are populated immediately.
SELECT pcms.refresh_agents_warehouse_percentiles();

COMMIT;
