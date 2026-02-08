-- Q4 closeout-table counts for overview.md
--
-- Computes exact game counts/wins/losses at these closeout pairs:
--   4@00:01, 5@00:04, 6@00:09, 7@00:16, 8@00:25, 9@00:36, 10@00:49
--
-- Run:
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 \
--     -f reference/nba-q4-threshold-validation/sql/q4_closeout_table_counts.sql

\set season_min 2021

\echo ---
\echo Q4 closeout-table counts
\echo season_min = :season_min
\echo ---

DROP TABLE IF EXISTS tmp_close_games;
CREATE TEMP TABLE tmp_close_games AS
SELECT
  game_id,
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
\echo 'Counts at closeout thresholds (lead >= L at t seconds remaining)'
WITH closeout_pairs(lead_threshold, t_sec, closeout_mmss) AS (
  VALUES
    (4,  1::numeric, '00:01'),
    (5,  4::numeric, '00:04'),
    (6,  9::numeric, '00:09'),
    (7, 16::numeric, '00:16'),
    (8, 25::numeric, '00:25'),
    (9, 36::numeric, '00:36'),
    (10,49::numeric, '00:49')
),
snaps AS (
  SELECT
    p.lead_threshold,
    p.t_sec,
    p.closeout_mmss,
    g.game_id,
    abs(s.score_home - s.score_away) AS lead,
    CASE
      WHEN s.score_home > s.score_away THEN 'home'
      WHEN s.score_away > s.score_home THEN 'away'
      ELSE 'tie'
    END AS leader,
    CASE
      WHEN s.score_home > s.score_away AND g.home_won THEN 1
      WHEN s.score_away > s.score_home AND NOT g.home_won THEN 1
      WHEN s.score_home = s.score_away THEN NULL
      ELSE 0
    END AS leader_won
  FROM closeout_pairs p
  CROSS JOIN tmp_close_games g
  JOIN LATERAL (
    SELECT e.score_home, e.score_away
    FROM tmp_q4_pbp e
    WHERE e.game_id = g.game_id
      AND e.clock_sec >= p.t_sec
    ORDER BY e.clock_sec ASC, e.idx DESC
    LIMIT 1
  ) s ON TRUE
)
SELECT
  lead_threshold,
  closeout_mmss,
  COUNT(*) FILTER (WHERE leader <> 'tie' AND lead >= lead_threshold) AS games,
  SUM(leader_won) FILTER (WHERE leader <> 'tie' AND lead >= lead_threshold) AS wins,
  COUNT(*) FILTER (WHERE leader <> 'tie' AND lead >= lead_threshold AND leader_won = 0) AS losses,
  ROUND(AVG(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead >= lead_threshold) * 100, 4) AS win_pct
FROM snaps
GROUP BY lead_threshold, closeout_mmss
ORDER BY lead_threshold;
