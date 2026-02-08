-- Q4 late-game threshold sweep (post-COVID NBA regular season)
--
-- Companion to:
--   reference/nba-q4-threshold-validation/README.md
--
-- Focus:
--   For close games (final margin <= 10), inspect leads 4..10 at key times,
--   plus the "latest time remaining" where win% stays above a threshold.
--
-- Run:
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 \
--     -f reference/nba-q4-threshold-validation/sql/q4_threshold_sweep_4_10.sql

\set season_min 2021
\set lead_min 4
\set lead_max 10
\set t1 9
\set t2 49
\set win_threshold 0.99
\set min_samples 50

\echo ---
\echo Q4 threshold sweep: leads :lead_min..:lead_max (close games cohort)
\echo season_min    = :season_min
\echo t1 (seconds)  = :t1
\echo t2 (seconds)  = :t2
\echo win_threshold = :win_threshold
\echo min_samples   = :min_samples
\echo ---

-- ----------------------------
-- Cohort + Q4 pbp materialization
-- ----------------------------

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
\echo A) Win rates at t=:t1 and t=:t2 for lead thresholds :lead_min..:lead_max
WITH thresholds AS (
  SELECT generate_series(:lead_min, :lead_max) AS lead_threshold
),
times(t_sec) AS (
  VALUES (:t1::numeric), (:t2::numeric)
),
snaps AS (
  SELECT
    g.game_id,
    t.t_sec,
    th.lead_threshold,
    abs(s.score_home - s.score_away) AS lead,
    CASE
      WHEN s.score_home > s.score_away THEN 'home'
      WHEN s.score_away > s.score_home THEN 'away'
      ELSE 'tie'
    END AS leader,
    CASE
      WHEN (s.score_home > s.score_away) AND g.home_won THEN 1
      WHEN (s.score_away > s.score_home) AND NOT g.home_won THEN 1
      WHEN (s.score_home = s.score_away) THEN NULL
      ELSE 0
    END AS leader_won
  FROM tmp_close_games g
  CROSS JOIN times t
  CROSS JOIN thresholds th
  JOIN LATERAL (
    SELECT e.score_home, e.score_away
    FROM tmp_q4_pbp e
    WHERE e.game_id = g.game_id
      AND e.clock_sec >= t.t_sec
    ORDER BY e.clock_sec ASC, e.idx DESC
    LIMIT 1
  ) s ON TRUE
)
SELECT
  t_sec,
  lead_threshold,

  count(*) FILTER (WHERE leader <> 'tie' AND lead >= lead_threshold) AS n_ge,
  count(*) FILTER (WHERE leader <> 'tie' AND lead >= lead_threshold AND leader_won = 0) AS losses_ge,
  round(avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead >= lead_threshold), 6) AS win_ge,

  count(*) FILTER (WHERE leader <> 'tie' AND lead = lead_threshold) AS n_eq,
  count(*) FILTER (WHERE leader <> 'tie' AND lead = lead_threshold AND leader_won = 0) AS losses_eq,
  round(avg(leader_won::numeric) FILTER (WHERE leader <> 'tie' AND lead = lead_threshold), 6) AS win_eq
FROM snaps
GROUP BY 1,2
ORDER BY t_sec, lead_threshold;

\echo ''
\echo B) "99% line": latest time remaining where win% >= :win_threshold (>=L and =L)
WITH thresholds AS (
  SELECT generate_series(:lead_min, :lead_max) AS lead_threshold
),
times AS (
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
    CASE
      WHEN (s.score_home > s.score_away) AND g.home_won THEN 1
      WHEN (s.score_away > s.score_home) AND NOT g.home_won THEN 1
      WHEN (s.score_home = s.score_away) THEN NULL
      ELSE 0
    END AS leader_won
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
filtered AS (
  SELECT * FROM state WHERE leader <> 'tie'
),
agg_exact AS (
  SELECT
    t_sec,
    lead,
    count(*) AS n,
    sum(leader_won) AS wins
  FROM filtered
  GROUP BY 1,2
),
-- cumulative sums by lead (descending), so row at lead=L contains totals for lead>=L
cum_ge AS (
  SELECT
    t_sec,
    lead AS lead_threshold,
    sum(n)    OVER (PARTITION BY t_sec ORDER BY lead DESC) AS n_ge,
    sum(wins) OVER (PARTITION BY t_sec ORDER BY lead DESC) AS wins_ge
  FROM agg_exact
),
latest_ge AS (
  SELECT
    th.lead_threshold,
    max(c.t_sec) AS latest_t_sec_ge
  FROM thresholds th
  JOIN cum_ge c
    ON c.lead_threshold = th.lead_threshold
  WHERE c.n_ge >= :min_samples
    AND (c.wins_ge::numeric / c.n_ge::numeric) >= :win_threshold
  GROUP BY 1
),
latest_eq AS (
  SELECT
    th.lead_threshold,
    max(a.t_sec) AS latest_t_sec_eq
  FROM thresholds th
  JOIN agg_exact a
    ON a.lead = th.lead_threshold
  WHERE a.n >= :min_samples
    AND (a.wins::numeric / a.n::numeric) >= :win_threshold
  GROUP BY 1
)
SELECT
  th.lead_threshold,
  lg.latest_t_sec_ge,
  (lpad((lg.latest_t_sec_ge/60)::text,2,'0') || ':' || lpad((lg.latest_t_sec_ge%60)::text,2,'0')) AS latest_ge_mmss,
  le.latest_t_sec_eq,
  (lpad((le.latest_t_sec_eq/60)::text,2,'0') || ':' || lpad((le.latest_t_sec_eq%60)::text,2,'0')) AS latest_eq_mmss
FROM thresholds th
LEFT JOIN latest_ge lg USING (lead_threshold)
LEFT JOIN latest_eq le USING (lead_threshold)
ORDER BY th.lead_threshold;

\echo ''
\echo C) First-loss time remaining (earliest second where at least one loss is observed)
WITH thresholds AS (
  SELECT generate_series(:lead_min, :lead_max) AS lead_threshold
),
times AS (
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
    CASE
      WHEN (s.score_home > s.score_away) AND g.home_won THEN 1
      WHEN (s.score_away > s.score_home) AND NOT g.home_won THEN 1
      WHEN (s.score_home = s.score_away) THEN NULL
      ELSE 0
    END AS leader_won
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
first_loss_ge AS (
  SELECT
    th.lead_threshold,
    min(st.t_sec) AS first_loss_t_ge
  FROM thresholds th
  JOIN state st ON TRUE
  WHERE st.leader <> 'tie'
    AND st.lead >= th.lead_threshold
    AND st.leader_won = 0
  GROUP BY 1
),
first_loss_eq AS (
  SELECT
    th.lead_threshold,
    min(st.t_sec) AS first_loss_t_eq
  FROM thresholds th
  JOIN state st
    ON st.lead = th.lead_threshold
  WHERE st.leader <> 'tie'
    AND st.leader_won = 0
  GROUP BY 1
)
SELECT
  th.lead_threshold,
  flg.first_loss_t_ge,
  (lpad((flg.first_loss_t_ge/60)::text,2,'0') || ':' || lpad((flg.first_loss_t_ge%60)::text,2,'0')) AS first_loss_ge_mmss,
  fle.first_loss_t_eq,
  (lpad((fle.first_loss_t_eq/60)::text,2,'0') || ':' || lpad((fle.first_loss_t_eq%60)::text,2,'0')) AS first_loss_eq_mmss
FROM thresholds th
LEFT JOIN first_loss_ge flg USING (lead_threshold)
LEFT JOIN first_loss_eq fle USING (lead_threshold)
ORDER BY th.lead_threshold;
