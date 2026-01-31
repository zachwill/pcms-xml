-- 055_luxury_tax_assertions.sql
-- Assertion tests for pcms.fn_luxury_tax_amount, pcms.fn_team_luxury_tax, pcms.fn_all_teams_luxury_tax.
--
-- Tests cover:
--   1. Edge cases (zero, negative, NULL inputs)
--   2. 2025 CBA bracket 1 rate validation (1.0 non-repeater, 3.0 repeater)
--   3. Progressive bracket math (verify base_charge + marginal calculation)
--   4. fn_team_luxury_tax wrapper (uses warehouse data)
--   5. fn_all_teams_luxury_tax (returns all teams)

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Edge case: zero over-tax amount should return 0
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE tax_owed bigint;
BEGIN
  SELECT pcms.fn_luxury_tax_amount(2025, 0, false) INTO tax_owed;
  IF tax_owed IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'fn_luxury_tax_amount(2025, 0, false): expected 0, got %', tax_owed;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Edge case: negative over-tax amount should return 0
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE tax_owed bigint;
BEGIN
  SELECT pcms.fn_luxury_tax_amount(2025, -1000000, false) INTO tax_owed;
  IF tax_owed IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'fn_luxury_tax_amount(2025, -1M, false): expected 0, got %', tax_owed;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Edge case: NULL over-tax amount should return 0
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE tax_owed bigint;
BEGIN
  SELECT pcms.fn_luxury_tax_amount(2025, NULL, false) INTO tax_owed;
  IF tax_owed IS DISTINCT FROM 0 THEN
    RAISE EXCEPTION 'fn_luxury_tax_amount(2025, NULL, false): expected 0, got %', tax_owed;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. 2025 CBA rate validation: bracket 1 should have rate 1.0 (non-repeater), 3.0 (repeater)
--    (per Sean's tax_array.json row 25: H=1, N=3)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  rate_non numeric;
  rate_rep numeric;
BEGIN
  SELECT tax_rate_non_repeater, tax_rate_repeater INTO rate_non, rate_rep
  FROM pcms.league_tax_rates
  WHERE salary_year = 2025 AND league_lk = 'NBA' AND lower_limit = 0;

  IF rate_non IS NULL THEN
    RAISE EXCEPTION 'No 2025 bracket 1 (lower_limit=0) found in pcms.league_tax_rates';
  END IF;

  IF rate_non IS DISTINCT FROM 1.0 THEN
    RAISE EXCEPTION '2025 bracket 1 non-repeater rate: expected 1.0, got %', rate_non;
  END IF;

  IF rate_rep IS DISTINCT FROM 3.0 THEN
    RAISE EXCEPTION '2025 bracket 1 repeater rate: expected 3.0, got %', rate_rep;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Progressive tax math: $1M over tax line (bracket 1)
--    Non-repeater: $1M × 1.0 = $1M
--    Repeater: $1M × 3.0 = $3M
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  tax_non bigint;
  tax_rep bigint;
BEGIN
  SELECT pcms.fn_luxury_tax_amount(2025, 1000000, false) INTO tax_non;
  SELECT pcms.fn_luxury_tax_amount(2025, 1000000, true) INTO tax_rep;

  IF tax_non IS DISTINCT FROM 1000000 THEN
    RAISE EXCEPTION '2025 $1M over tax (non-repeater): expected 1000000, got %', tax_non;
  END IF;

  IF tax_rep IS DISTINCT FROM 3000000 THEN
    RAISE EXCEPTION '2025 $1M over tax (repeater): expected 3000000, got %', tax_rep;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Bracket math: test that bracket 2 applies above bracket 1 threshold
--    For 2025, bracket width is ~$5.685M.
--    If over_tax = exactly bracket width, should be taxed entirely at bracket 1 rate.
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  bracket_width bigint;
  tax_at_threshold bigint;
  expected_tax bigint;
BEGIN
  -- Get the 2025 bracket width (upper_limit of bracket 1)
  SELECT upper_limit INTO bracket_width
  FROM pcms.league_tax_rates
  WHERE salary_year = 2025 AND league_lk = 'NBA' AND lower_limit = 0;

  IF bracket_width IS NULL THEN
    RAISE EXCEPTION '2025 bracket 1 upper_limit not found';
  END IF;

  -- Tax on exactly (bracket_width - 1) should be all in bracket 1
  -- Non-repeater: (bracket_width - 1) × 1.0
  expected_tax := bracket_width - 1;
  SELECT pcms.fn_luxury_tax_amount(2025, bracket_width - 1, false) INTO tax_at_threshold;

  IF tax_at_threshold IS DISTINCT FROM expected_tax THEN
    RAISE EXCEPTION 'Tax at bracket width - 1: expected %, got %', expected_tax, tax_at_threshold;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 7. Bracket transition: crossing into bracket 2 uses different rate
--    bracket 2 has rate 1.5 for non-repeater (per standard CBA tiers)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  bracket_width bigint;
  over_tax bigint;
  tax_owed bigint;
  bracket2_rate numeric;
  base_charge_1 bigint;
  expected_tax bigint;
BEGIN
  -- Get bracket 1 ceiling and bracket 2 rate
  SELECT upper_limit INTO bracket_width
  FROM pcms.league_tax_rates
  WHERE salary_year = 2025 AND league_lk = 'NBA' AND lower_limit = 0;

  SELECT tax_rate_non_repeater, base_charge_non_repeater INTO bracket2_rate, base_charge_1
  FROM pcms.league_tax_rates
  WHERE salary_year = 2025 AND league_lk = 'NBA' AND lower_limit = bracket_width + 1;

  IF bracket2_rate IS NULL THEN
    RAISE EXCEPTION 'Bracket 2 (lower_limit=%) not found for 2025', bracket_width;
  END IF;

  -- Test $1M into bracket 2 (bracket 2 starts at upper_limit + 1)
  over_tax := bracket_width + 1 + 1000000;

  -- Expected: base_charge_1 + $1M × bracket2_rate
  expected_tax := base_charge_1 + (1000000 * bracket2_rate)::bigint;

  SELECT pcms.fn_luxury_tax_amount(2025, over_tax, false) INTO tax_owed;

  -- Allow $1 rounding tolerance
  IF ABS(tax_owed - expected_tax) > 1 THEN
    RAISE EXCEPTION 'Tax %M over (bracket 2): expected %, got %', (over_tax/1000000.0)::numeric(10,2), expected_tax, tax_owed;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 8. fn_team_luxury_tax wrapper: should return a row for any valid team/year
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  any_team text;
  r record;
BEGIN
  -- Get any team from team_salary_warehouse for 2025
  SELECT team_code INTO any_team
  FROM pcms.team_salary_warehouse
  WHERE salary_year = 2025
  LIMIT 1;

  IF any_team IS NULL THEN
    RAISE EXCEPTION 'No teams found in team_salary_warehouse for 2025';
  END IF;

  SELECT * INTO r FROM pcms.fn_team_luxury_tax(any_team, 2025);

  IF r.team_code IS DISTINCT FROM any_team THEN
    RAISE EXCEPTION 'fn_team_luxury_tax: team_code mismatch (expected %, got %)', any_team, r.team_code;
  END IF;

  IF r.salary_year IS DISTINCT FROM 2025 THEN
    RAISE EXCEPTION 'fn_team_luxury_tax: salary_year mismatch';
  END IF;

  IF r.luxury_tax_owed IS NULL THEN
    RAISE EXCEPTION 'fn_team_luxury_tax: luxury_tax_owed should not be NULL';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 9. fn_all_teams_luxury_tax: should return rows for all teams in the year
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  total_teams int;
  tax_result_count int;
BEGIN
  SELECT COUNT(DISTINCT team_code) INTO total_teams
  FROM pcms.team_salary_warehouse
  WHERE salary_year = 2025;

  SELECT COUNT(*) INTO tax_result_count
  FROM pcms.fn_all_teams_luxury_tax(2025);

  IF tax_result_count IS DISTINCT FROM total_teams THEN
    RAISE EXCEPTION 'fn_all_teams_luxury_tax(2025): expected % teams, got %', total_teams, tax_result_count;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 10. Ordering: fn_all_teams_luxury_tax should return rows ordered by tax DESC
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  prev_tax bigint := NULL;
  r record;
  is_ordered boolean := true;
BEGIN
  FOR r IN SELECT luxury_tax_owed FROM pcms.fn_all_teams_luxury_tax(2025) LOOP
    IF prev_tax IS NOT NULL AND r.luxury_tax_owed > prev_tax THEN
      is_ordered := false;
      EXIT;
    END IF;
    prev_tax := r.luxury_tax_owed;
  END LOOP;

  IF NOT is_ordered THEN
    RAISE EXCEPTION 'fn_all_teams_luxury_tax: results not ordered by luxury_tax_owed DESC';
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 11. Consistency: fn_team_luxury_tax result matches fn_all_teams_luxury_tax
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  any_team text;
  single_tax bigint;
  all_tax bigint;
BEGIN
  -- Get a team that is over the tax line (has luxury_tax_owed > 0)
  SELECT team_code INTO any_team
  FROM pcms.fn_all_teams_luxury_tax(2025)
  WHERE luxury_tax_owed > 0
  LIMIT 1;

  IF any_team IS NOT NULL THEN
    SELECT luxury_tax_owed INTO single_tax FROM pcms.fn_team_luxury_tax(any_team, 2025);
    SELECT luxury_tax_owed INTO all_tax FROM pcms.fn_all_teams_luxury_tax(2025) WHERE team_code = any_team;

    IF single_tax IS DISTINCT FROM all_tax THEN
      RAISE EXCEPTION 'Tax mismatch for %: fn_team_luxury_tax=%, fn_all_teams_luxury_tax=%', any_team, single_tax, all_tax;
    END IF;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 12. Under-tax teams should have luxury_tax_owed = 0
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  under_tax_team text;
  r record;
BEGIN
  -- Find a team under the tax line
  SELECT team_code INTO under_tax_team
  FROM pcms.fn_all_teams_luxury_tax(2025)
  WHERE over_tax_amount <= 0
  LIMIT 1;

  IF under_tax_team IS NOT NULL THEN
    SELECT * INTO r FROM pcms.fn_team_luxury_tax(under_tax_team, 2025);
    IF r.luxury_tax_owed IS DISTINCT FROM 0 THEN
      RAISE EXCEPTION 'Under-tax team % has luxury_tax_owed = % (expected 0)', under_tax_team, r.luxury_tax_owed;
    END IF;
  END IF;
END
$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 13. Multiple years: function should work for 2024 if data exists
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
DECLARE
  has_2024 boolean;
  c int;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pcms.league_tax_rates WHERE salary_year = 2024 AND league_lk = 'NBA'
  ) INTO has_2024;

  IF has_2024 THEN
    SELECT COUNT(*) INTO c FROM pcms.fn_all_teams_luxury_tax(2024);
    -- Just verify it doesn't error; count may be 0 if no team data
  END IF;
END
$$;
