-- Q4 late-game threshold validation (post-COVID NBA regular season)
--
-- Reproduces the findings documented in:
--   reference/nba-q4-threshold-validation/README.md
--
-- Run:
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 \
--     -f reference/nba-q4-threshold-validation/sql/q4_threshold_validation.sql

\set season_min 2021
\set t_up6 9
\set t_up10 49
\set win_threshold 0.99
\set min_samples 50

\echo ---
\echo Q4 late-game threshold validation
\echo season_min = :season_min
\echo t_up6_seconds = :t_up6
\echo t_up10_seconds = :t_up10
\echo win_threshold = :win_threshold
\echo min_samples = :min_samples
\echo ---

-- ----------------------------
-- 0) Sanity checks / coverage
-- ----------------------------

\echo ''
\echo '0A) Finished regular season games (season >= :season_min)'
SELECT
  count(*) AS n_games_finished,
  count(*) FILTER (WHERE b.game_id IS NULL) AS n_missing_box,
  count(*) FILTER (WHERE b.game_id IS NOT NULL AND (b.home_pts <> g.score_home OR b.away_pts <> g.score_away)) AS n_box_score_mismatches
FROM public.nba_games g
LEFT JOIN public.nba_box b USING (game_id)
WHERE g.season >= :season_min
  AND g.is_regular_season = TRUE
  AND g.game_status = 3;

\echo ''
\echo '0B) Close finished regular season games (final margin <= 10) + pbp coverage'
WITH close_games AS (
  SELECT game_id
  FROM public.nba_games
  WHERE season >= :season_min
    AND is_regular_season = TRUE
    AND game_status = 3
    AND abs(score_home - score_away) <= 10
)
SELECT
  (SELECT count(*) FROM close_games) AS n_close_games,
  (SELECT count(*) FROM close_games cg JOIN public.nba_pbp p USING (game_id)) AS n_close_games_with_pbp,
  (SELECT count(*) FROM close_games cg WHERE NOT EXISTS (SELECT 1 FROM public.nba_pbp p WHERE p.game_id = cg.game_id)) AS n_close_games_missing_pbp;

-- -------------------------------------------------------------
-- 1) Primary cohort: close games (final margin <= 10)
-- -------------------------------------------------------------

\echo ''
\echo '1) Build temp tables for close-games cohort (final margin <= 10)'

DROP TABLE IF EXISTS tmp_close_games;
CREATE TEMP TABLE tmp_close_games AS
SELECT
  game_id,
  season,
  game_date,
  home_team,
  away_team,
  score_home,
  score_away,
  abs(score_home - score_away) AS final_margin,
  (score_home > score_away) AS home_won
FROM public.nba_games
WHERE season >= :season_min
  AND is_regular_season = TRUE
  AND game_status = 3
  AND abs(score_home - score_away) <= 10;

CREATE INDEX tmp_close_games_game_id_idx ON tmp_close_games (game_id);
ANALYZE tmp_close_games;

DROP TABLE IF EXISTS tmp_q4_pbp;
CREATE TEMP TABLE tmp_q4_pbp AS
SELECT
  g.game_id,
  -- seconds remaining in Q4 (numeric because clock contains decimals)
  (split_part(replace(replace(e->>'clock','PT',''),'S',''),'M',1)::int * 60
   + split_part(replace(replace(e->>'clock','PT',''),'S',''),'M',2)::numeric) AS clock_sec,
  (e->>'scoreHome')::int AS score_home,
  (e->>'scoreAway')::int AS score_away,
  ordinality AS idx
FROM tmp_close_games g
JOIN public.nba_pbp p ON p.game_id = g.game_id
CROSS JOIN LATERAL jsonb_array_elements(p.data) WITH ORDINALITY AS x(e, ordinality)
WHERE (e->>'period') ~ '^[0-9]+$'
  AND (e->>'period')::int = 4
  AND (e->>'clock') ~ '^PT'
  AND (e->>'scoreHome') ~ '^[0-9]+$'
  AND (e->>'scoreAway') ~ '^[0-9]+$';

CREATE INDEX tmp_q4_pbp_lookup_idx ON tmp_q4_pbp (game_id, clock_sec, idx DESC);
ANALYZE tmp_q4_pbp;

\echo ''
\echo '1A) Win rates at t=:t_up6 and t=:t_up10 (close games cohort)'
WITH times(t_sec) AS (
  VALUES (:t_up6::numeric), (:t_up10::numeric)
),
snaps AS (
  SELECT
    g.game_id,
    t.t_sec,
    s.score_home,
    s.score_away,
    abs(s.score_home - s.score_away) AS lead,
    CASE
      WHEN s.score_home > s.score_away THEN 'home'
      WHEN s.score_away > s.score_home THEN 'away'
      ELSE 'tie'
    END AS leader,
    g.home_won
  FROM tmp_close_games g
  CROSS JOIN times t
  JOIN LATERAL (
    -- snapshot at time t: first event at/above t (clock_sec >= t)
    -- if multiple at same clock, take last recorded event at that clock
    SELECT e.score_home, e.score_away
    FROM tmp_q4_pbp e
    WHERE e.game_id = g.game_id
      AND e.clock_sec >= t.t_sec
    ORDER BY e.clock_sec ASC, e.idx DESC
    LIMIT 1
  ) s ON TRUE
),
eval AS (
  SELECT
    t_sec,
    lead,
    leader,
    CASE
      WHEN leader = 'home' AND home_won THEN 1
      WHEN leader = 'away' AND NOT home_won THEN 1
      WHEN leader = 'tie' THEN NULL
      ELSE 0
    END AS leader_won
  FROM snaps
)
SELECT
  t_sec,
  count(*) FILTER (WHERE leader <> 'tie') AS n_non_tie,

  count(*) FILTER (WHERE leader <> 'tie' AND lead >= 6) AS n_lead_ge_6,
  round(avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead >= 6), 6) AS win_rate_lead_ge_6,
  count(*) FILTER (WHERE leader <> 'tie' AND lead = 6) AS n_lead_eq_6,
  round(avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead = 6), 6) AS win_rate_lead_eq_6,

  count(*) FILTER (WHERE leader <> 'tie' AND lead >= 10) AS n_lead_ge_10,
  round(avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead >= 10), 6) AS win_rate_lead_ge_10,
  count(*) FILTER (WHERE leader <> 'tie' AND lead = 10) AS n_lead_eq_10,
  round(avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead = 10), 6) AS win_rate_lead_eq_10
FROM eval
GROUP BY 1
ORDER BY 1;

\echo ''
\echo '1B) 99% cutoff: latest t (seconds remaining) where win_rate >= :win_threshold (close games cohort)'
WITH times AS (
  SELECT generate_series(0, 180) AS t_sec
),
state AS (
  SELECT
    g.game_id,
    t.t_sec,
    abs(s.score_home - s.score_away) AS lead,
    CASE
      WHEN s.score_home > s.score_away THEN 'home'
      WHEN s.score_away > s.score_home THEN 'away'
      ELSE 'tie'
    END AS leader,
    g.home_won
  FROM tmp_close_games g
  CROSS JOIN times t
  JOIN LATERAL (
    SELECT e.score_home, e.score_away
    FROM tmp_q4_pbp e
    WHERE e.game_id = g.game_id
      AND e.clock_sec >= t.t_sec
    ORDER BY e.clock_sec ASC, e.idx DESC
    LIMIT 1
  ) s ON TRUE
),
eval AS (
  SELECT
    t_sec,
    lead,
    leader,
    CASE
      WHEN leader = 'home' AND home_won THEN 1
      WHEN leader = 'away' AND NOT home_won THEN 1
      WHEN leader = 'tie' THEN NULL
      ELSE 0
    END AS leader_won
  FROM state
),
agg AS (
  SELECT
    t_sec,

    count(*) FILTER (WHERE leader <> 'tie' AND lead >= 6)  AS n_ge6,
    avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead >= 6)  AS win_ge6,

    count(*) FILTER (WHERE leader <> 'tie' AND lead = 6)   AS n_eq6,
    avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead = 6)   AS win_eq6,

    count(*) FILTER (WHERE leader <> 'tie' AND lead >= 10) AS n_ge10,
    avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead >= 10) AS win_ge10,

    count(*) FILTER (WHERE leader <> 'tie' AND lead = 10)  AS n_eq10,
    avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead = 10)  AS win_eq10
  FROM eval
  GROUP BY 1
)
SELECT
  max(t_sec) FILTER (WHERE n_ge6  >= :min_samples AND win_ge6  >= :win_threshold) AS latest_t_ge6_at_threshold,
  max(t_sec) FILTER (WHERE n_eq6  >= :min_samples AND win_eq6  >= :win_threshold) AS latest_t_eq6_at_threshold,
  max(t_sec) FILTER (WHERE n_ge10 >= :min_samples AND win_ge10 >= :win_threshold) AS latest_t_ge10_at_threshold,
  max(t_sec) FILTER (WHERE n_eq10 >= :min_samples AND win_eq10 >= :win_threshold) AS latest_t_eq10_at_threshold
FROM agg;

\echo ''
\echo '1C) Exception games: lead=6 at ~t=:t_up10 and leader loses (close games cohort)'
WITH snap AS (
  SELECT
    g.game_id,
    g.game_date,
    g.season,
    g.away_team,
    g.home_team,
    g.score_away,
    g.score_home,
    s.score_away AS sa,
    s.score_home AS sh,
    abs(s.score_home - s.score_away) AS lead,
    CASE
      WHEN s.score_home > s.score_away THEN 'home'
      WHEN s.score_away > s.score_home THEN 'away'
      ELSE 'tie'
    END AS leader,
    g.home_won
  FROM tmp_close_games g
  JOIN LATERAL (
    SELECT e.score_home, e.score_away
    FROM tmp_q4_pbp e
    WHERE e.game_id = g.game_id
      AND e.clock_sec >= :t_up10::numeric
    ORDER BY e.clock_sec ASC, e.idx DESC
    LIMIT 1
  ) s ON TRUE
),
eval AS (
  SELECT
    *,
    CASE
      WHEN leader = 'home' AND home_won THEN 1
      WHEN leader = 'away' AND NOT home_won THEN 1
      WHEN leader = 'tie' THEN NULL
      ELSE 0
    END AS leader_won
  FROM snap
)
SELECT
  game_id,
  game_date,
  away_team,
  home_team,
  (sa::text || '-' || sh::text) AS score_at_t,
  leader,
  lead,
  (score_away::text || '-' || score_home::text) AS final_score
FROM eval
WHERE leader <> 'tie'
  AND lead = 6
  AND leader_won = 0
ORDER BY game_date DESC;

-- -------------------------------------------------------------
-- 2) Secondary cohort: all finished regular season games
--    (check key claim: up 10 at ~49s)
-- -------------------------------------------------------------

\echo ''
\echo '2) All-games cohort: lead>=10 at ~t=:t_up10 (season >= :season_min, regular season, finished)'

DROP TABLE IF EXISTS tmp_all_games;
CREATE TEMP TABLE tmp_all_games AS
SELECT
  game_id,
  (score_home > score_away) AS home_won
FROM public.nba_games
WHERE season >= :season_min
  AND is_regular_season = TRUE
  AND game_status = 3;

CREATE INDEX tmp_all_games_game_id_idx ON tmp_all_games (game_id);
ANALYZE tmp_all_games;

DROP TABLE IF EXISTS tmp_all_q4_pbp;
CREATE TEMP TABLE tmp_all_q4_pbp AS
SELECT
  g.game_id,
  (split_part(replace(replace(e->>'clock','PT',''),'S',''),'M',1)::int * 60
   + split_part(replace(replace(e->>'clock','PT',''),'S',''),'M',2)::numeric) AS clock_sec,
  (e->>'scoreHome')::int AS score_home,
  (e->>'scoreAway')::int AS score_away,
  ordinality AS idx
FROM tmp_all_games g
JOIN public.nba_pbp p ON p.game_id = g.game_id
CROSS JOIN LATERAL jsonb_array_elements(p.data) WITH ORDINALITY AS x(e, ordinality)
WHERE (e->>'period') ~ '^[0-9]+$'
  AND (e->>'period')::int = 4
  AND (e->>'clock') ~ '^PT'
  AND (e->>'scoreHome') ~ '^[0-9]+$'
  AND (e->>'scoreAway') ~ '^[0-9]+$';

CREATE INDEX tmp_all_q4_pbp_lookup_idx ON tmp_all_q4_pbp (game_id, clock_sec, idx DESC);
ANALYZE tmp_all_q4_pbp;

WITH snap AS (
  SELECT
    g.game_id,
    abs(s.score_home - s.score_away) AS lead,
    CASE
      WHEN s.score_home > s.score_away THEN 'home'
      WHEN s.score_away > s.score_home THEN 'away'
      ELSE 'tie'
    END AS leader,
    g.home_won
  FROM tmp_all_games g
  JOIN LATERAL (
    SELECT score_home, score_away
    FROM tmp_all_q4_pbp e
    WHERE e.game_id = g.game_id
      AND e.clock_sec >= :t_up10::numeric
    ORDER BY e.clock_sec ASC, e.idx DESC
    LIMIT 1
  ) s ON TRUE
),
eval AS (
  SELECT
    lead,
    leader,
    CASE
      WHEN leader = 'home' AND home_won THEN 1
      WHEN leader = 'away' AND NOT home_won THEN 1
      WHEN leader = 'tie' THEN NULL
      ELSE 0
    END AS leader_won
  FROM snap
)
SELECT
  count(*) FILTER (WHERE leader <> 'tie' AND lead >= 10) AS n_lead_ge_10,
  sum(1 - leader_won) FILTER (WHERE leader <> 'tie' AND lead >= 10) AS n_losses_ge_10,
  round(avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead >= 10), 6) AS win_rate_ge_10
FROM eval;
