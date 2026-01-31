-- Migration: 057_fn_luxury_tax_amount.sql
-- Purpose: Implement luxury tax calculation primitive
--
-- This function replicates Sean's workbook "Tax Payment" SUMPRODUCT formula using
-- pcms.league_tax_rates (which includes pre-computed base_charge_* columns).
--
-- Sean's formula (from team_summary.json, playground.json, etc.):
--   =IF(
--     $J$1="Yes",  -- is repeater?
--     SUMPRODUCT(
--       (over_tax > Tax_Array_M$4:$M$200) *
--       (Tax_Array_K$4:$K$200 = $Year) *
--       (over_tax - Tax_Array_M$4:$M$200) *
--       (Tax_Array_O$4:$O$200)
--     ),
--     SUMPRODUCT(
--       (over_tax > Tax_Array_G$4:$G$200) *
--       (Tax_Array_E$4:$E$200 = $Year) *
--       (over_tax - Tax_Array_G$4:$G$200) *
--       (Tax_Array_I$4:$I$200)
--     )
--   )
--
-- Our function uses the base_charge_* columns to compute this in O(1) via:
--   tax_owed = base_charge + (over_tax - lower_limit) * rate
--
-- where we find the single bracket row where:
--   lower_limit <= over_tax_amount < upper_limit (or upper_limit IS NULL for top bracket)

-- ─────────────────────────────────────────────────────────────────────────────
-- fn_luxury_tax_amount(salary_year, over_tax_amount, is_repeater)
-- ─────────────────────────────────────────────────────────────────────────────
-- Inputs:
--   p_salary_year      - The salary year (e.g., 2025)
--   p_over_tax_amount  - Amount by which team exceeds tax level (must be >= 0)
--                        (i.e., GREATEST(0, team_tax_salary - tax_level_amount))
--   p_is_repeater      - TRUE if team is a repeater taxpayer
--
-- Returns: total luxury tax owed (bigint, in dollars)
--
-- Note: If over_tax_amount <= 0 or no matching bracket found, returns 0.

CREATE OR REPLACE FUNCTION pcms.fn_luxury_tax_amount(
    p_salary_year integer,
    p_over_tax_amount bigint,
    p_is_repeater boolean DEFAULT false
)
RETURNS bigint
LANGUAGE sql
STABLE
AS $$
    SELECT
        CASE
            WHEN p_over_tax_amount IS NULL OR p_over_tax_amount <= 0 THEN 0::bigint
            WHEN p_is_repeater THEN
                COALESCE(
                    (
                        SELECT
                            base_charge_repeater + 
                            ((p_over_tax_amount - lower_limit) * tax_rate_repeater)::bigint
                        FROM pcms.league_tax_rates
                        WHERE salary_year = p_salary_year
                          AND league_lk = 'NBA'
                          AND lower_limit <= p_over_tax_amount
                          AND (upper_limit IS NULL OR p_over_tax_amount < upper_limit)
                        LIMIT 1
                    ),
                    0::bigint
                )
            ELSE
                COALESCE(
                    (
                        SELECT
                            base_charge_non_repeater + 
                            ((p_over_tax_amount - lower_limit) * tax_rate_non_repeater)::bigint
                        FROM pcms.league_tax_rates
                        WHERE salary_year = p_salary_year
                          AND league_lk = 'NBA'
                          AND lower_limit <= p_over_tax_amount
                          AND (upper_limit IS NULL OR p_over_tax_amount < upper_limit)
                        LIMIT 1
                    ),
                    0::bigint
                )
        END
$$;

COMMENT ON FUNCTION pcms.fn_luxury_tax_amount(integer, bigint, boolean) IS
'Calculate luxury tax payment given the amount over the tax line.

Arguments:
  p_salary_year      - Salary year (e.g., 2025)
  p_over_tax_amount  - Amount above tax level: GREATEST(0, tax_salary - tax_level)
  p_is_repeater      - True if team is a repeater taxpayer

Returns the total luxury tax owed in dollars.

Uses the progressive bracket structure from pcms.league_tax_rates, which has
pre-computed base_charge_* columns for O(1) lookup.

Example:
  SELECT pcms.fn_luxury_tax_amount(
      2025,
      GREATEST(0, team_tax_salary - (SELECT tax_level_amount FROM pcms.league_system_values WHERE salary_year = 2025 AND league_lk = ''NBA'')),
      true  -- repeater
  );
';


-- ─────────────────────────────────────────────────────────────────────────────
-- fn_team_luxury_tax(team_code, salary_year)
-- ─────────────────────────────────────────────────────────────────────────────
-- Convenience wrapper that looks up team's tax salary, tax level, and repeater
-- status automatically from warehouse tables.
--
-- Uses:
--   - pcms.team_salary_warehouse for tax_salary and is_repeater_taxpayer
--   - pcms.league_system_values for tax_level_amount

CREATE OR REPLACE FUNCTION pcms.fn_team_luxury_tax(
    p_team_code text,
    p_salary_year integer
)
RETURNS TABLE (
    team_code text,
    salary_year integer,
    tax_salary bigint,
    tax_level bigint,
    over_tax_amount bigint,
    is_repeater boolean,
    luxury_tax_owed bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        tsw.team_code,
        tsw.salary_year,
        tsw.tax_amount AS tax_salary,
        lsv.tax_level_amount AS tax_level,
        GREATEST(0, tsw.tax_amount - lsv.tax_level_amount) AS over_tax_amount,
        tsw.is_repeater_taxpayer AS is_repeater,
        pcms.fn_luxury_tax_amount(
            tsw.salary_year,
            GREATEST(0, tsw.tax_amount - lsv.tax_level_amount),
            tsw.is_repeater_taxpayer
        ) AS luxury_tax_owed
    FROM pcms.team_salary_warehouse tsw
    JOIN pcms.league_system_values lsv
        ON lsv.salary_year = tsw.salary_year
        AND lsv.league_lk = 'NBA'
    WHERE tsw.team_code = p_team_code
      AND tsw.salary_year = p_salary_year
$$;

COMMENT ON FUNCTION pcms.fn_team_luxury_tax(text, integer) IS
'Get luxury tax details for a specific team and year.

Returns a single row with:
  - team_code, salary_year
  - tax_salary (from team_salary_warehouse)
  - tax_level (from league_system_values)
  - over_tax_amount (tax_salary - tax_level, floored at 0)
  - is_repeater (from team_salary_warehouse)
  - luxury_tax_owed (computed via fn_luxury_tax_amount)

Example:
  SELECT * FROM pcms.fn_team_luxury_tax(''BOS'', 2025);
';


-- ─────────────────────────────────────────────────────────────────────────────
-- fn_all_teams_luxury_tax(salary_year)
-- ─────────────────────────────────────────────────────────────────────────────
-- Returns luxury tax info for ALL teams in a given year.

CREATE OR REPLACE FUNCTION pcms.fn_all_teams_luxury_tax(
    p_salary_year integer
)
RETURNS TABLE (
    team_code text,
    salary_year integer,
    tax_salary bigint,
    tax_level bigint,
    over_tax_amount bigint,
    is_repeater boolean,
    luxury_tax_owed bigint
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        tsw.team_code,
        tsw.salary_year,
        tsw.tax_amount AS tax_salary,
        lsv.tax_level_amount AS tax_level,
        GREATEST(0, tsw.tax_amount - lsv.tax_level_amount) AS over_tax_amount,
        tsw.is_repeater_taxpayer AS is_repeater,
        pcms.fn_luxury_tax_amount(
            tsw.salary_year,
            GREATEST(0, tsw.tax_amount - lsv.tax_level_amount),
            tsw.is_repeater_taxpayer
        ) AS luxury_tax_owed
    FROM pcms.team_salary_warehouse tsw
    JOIN pcms.league_system_values lsv
        ON lsv.salary_year = tsw.salary_year
        AND lsv.league_lk = 'NBA'
    WHERE tsw.salary_year = p_salary_year
    ORDER BY luxury_tax_owed DESC
$$;

COMMENT ON FUNCTION pcms.fn_all_teams_luxury_tax(integer) IS
'Get luxury tax details for all teams in a given salary year.

Returns rows ordered by luxury_tax_owed DESC (highest payers first).

Example:
  SELECT * FROM pcms.fn_all_teams_luxury_tax(2025);
';
