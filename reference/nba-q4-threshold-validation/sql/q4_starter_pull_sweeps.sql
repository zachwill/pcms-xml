-- Q4 starter-pull sweep vs closeout table (post-COVID regular season)
--
-- Goal:
--   For close games (final margin <= 10), estimate when coaches start pulling starters
--   and compare that timing to closeout thresholds.
--
-- Definitions:
--   - Starter = player flagged starter='1' in nba_box team player arrays.
--   - Pull event = substitution action with subType='out' for a starter.
--   - Wave = >= min_wave_starters_out starters pulled at the same game clock.
--   - first_wave_sec = earliest wave in the window (max sec_left within window).
--
-- Run:
--   psql "$POSTGRES_URL" -v ON_ERROR_STOP=1 \
--     -f reference/nba-q4-threshold-validation/sql/q4_starter_pull_sweeps.sql

\set season_min 2021
\set window_sec 180
\set min_wave_starters_out 2

\echo ---
\echo Q4 starter-pull sweep vs closeout table
\echo season_min = :season_min
\echo window_sec = :window_sec
\echo min_wave_starters_out = :min_wave_starters_out
\echo ---

-- ----------------------------
-- 0) Cohort
-- ----------------------------

DROP TABLE IF EXISTS tmp_games;
CREATE TEMP TABLE tmp_games AS
SELECT
  g.game_id,
  g.game_date,
  g.home_id,
  g.away_id,
  g.home_team,
  g.away_team,
  g.score_home,
  g.score_away,
  abs(g.score_home - g.score_away) AS final_margin
FROM public.nba_games g
WHERE g.season >= :season_min
  AND g.is_regular_season = TRUE
  AND g.game_status = 3
  AND g.score_home IS NOT NULL
  AND g.score_away IS NOT NULL
  AND abs(g.score_home - g.score_away) <= 10;

CREATE INDEX tmp_games_game_id_idx ON tmp_games (game_id);
ANALYZE tmp_games;

\echo ''
\echo '0A) Cohort counts'
SELECT count(*) AS n_close_games FROM tmp_games;

-- ----------------------------
-- 1) Starters from nba_box
-- ----------------------------

DROP TABLE IF EXISTS tmp_starters;
CREATE TEMP TABLE tmp_starters AS
SELECT DISTINCT
  b.game_id,
  (b.data->'homeTeam'->>'teamId')::int AS team_id,
  (pl->>'personId')::int AS person_id
FROM public.nba_box b
JOIN tmp_games g ON g.game_id = b.game_id
CROSS JOIN LATERAL jsonb_array_elements(b.data->'homeTeam'->'players') pl
WHERE pl->>'starter' = '1'
  AND (pl->>'personId') ~ '^[0-9]+$'

UNION ALL

SELECT DISTINCT
  b.game_id,
  (b.data->'awayTeam'->>'teamId')::int AS team_id,
  (pl->>'personId')::int AS person_id
FROM public.nba_box b
JOIN tmp_games g ON g.game_id = b.game_id
CROSS JOIN LATERAL jsonb_array_elements(b.data->'awayTeam'->'players') pl
WHERE pl->>'starter' = '1'
  AND (pl->>'personId') ~ '^[0-9]+$';

CREATE INDEX tmp_starters_lookup_idx ON tmp_starters (game_id, team_id, person_id);
ANALYZE tmp_starters;

\echo ''
\echo '1A) Starter coverage'
SELECT
  count(*) AS starter_rows,
  count(DISTINCT game_id) AS games_with_box
FROM tmp_starters;

-- ----------------------------
-- 2) Q4 pbp materialization (one pass)
-- ----------------------------

DROP TABLE IF EXISTS tmp_q4_events;
CREATE TEMP TABLE tmp_q4_events AS
SELECT
  g.game_id,
  e.ordinality AS idx,
  (split_part(split_part(e.value->>'clock','PT',2),'M',1)::numeric * 60
   + split_part(split_part(e.value->>'clock','M',2),'S',1)::numeric) AS sec_left,
  (e.value->>'scoreHome')::int AS sh,
  (e.value->>'scoreAway')::int AS sa,
  e.value->>'actionType' AS action_type,
  e.value->>'subType' AS sub_type,
  CASE WHEN (e.value->>'teamId') ~ '^[0-9]+$' THEN (e.value->>'teamId')::int END AS team_id,
  CASE WHEN (e.value->>'personId') ~ '^[0-9]+$' THEN (e.value->>'personId')::int END AS person_id
FROM tmp_games g
JOIN public.nba_pbp p ON p.game_id = g.game_id
CROSS JOIN LATERAL jsonb_array_elements(p.data) WITH ORDINALITY AS e(value, ordinality)
WHERE (e.value->>'period') ~ '^[0-9]+$'
  AND (e.value->>'period')::int = 4
  AND (e.value->>'clock') ~ '^PT'
  AND (e.value->>'scoreHome') ~ '^[0-9]+$'
  AND (e.value->>'scoreAway') ~ '^[0-9]+$';

CREATE INDEX tmp_q4_events_lookup_idx ON tmp_q4_events (game_id, sec_left, idx DESC);
ANALYZE tmp_q4_events;

\echo ''
\echo '2A) Q4 event coverage'
SELECT
  count(*) AS q4_events,
  count(DISTINCT game_id) AS games_with_q4_pbp
FROM tmp_q4_events;

-- ----------------------------
-- 3) Team state timeline + starter substitutions
-- ----------------------------

DROP TABLE IF EXISTS tmp_team_states;
CREATE TEMP TABLE tmp_team_states AS
SELECT
  e.game_id,
  g.home_id AS team_id,
  e.sec_left,
  (e.sh - e.sa) AS team_margin
FROM tmp_q4_events e
JOIN tmp_games g USING (game_id)

UNION ALL

SELECT
  e.game_id,
  g.away_id AS team_id,
  e.sec_left,
  (e.sa - e.sh) AS team_margin
FROM tmp_q4_events e
JOIN tmp_games g USING (game_id);

CREATE INDEX tmp_team_states_lookup_idx ON tmp_team_states (game_id, team_id, sec_left, team_margin);
ANALYZE tmp_team_states;

DROP TABLE IF EXISTS tmp_starter_subs;
CREATE TEMP TABLE tmp_starter_subs AS
SELECT
  e.game_id,
  e.idx,
  e.sec_left,
  e.sub_type,
  e.team_id,
  e.person_id,
  e.sh,
  e.sa,
  CASE
    WHEN e.team_id = g.home_id THEN e.sh - e.sa
    WHEN e.team_id = g.away_id THEN e.sa - e.sh
    ELSE NULL
  END AS team_margin
FROM tmp_q4_events e
JOIN tmp_games g USING (game_id)
JOIN tmp_starters st
  ON st.game_id = e.game_id
 AND st.team_id = e.team_id
 AND st.person_id = e.person_id
WHERE e.action_type = 'substitution'
  AND e.sub_type IN ('in', 'out')
  AND e.team_id IS NOT NULL
  AND e.person_id IS NOT NULL;

CREATE INDEX tmp_starter_subs_lookup_idx ON tmp_starter_subs (game_id, team_id, sec_left, sub_type, team_margin);
ANALYZE tmp_starter_subs;

\echo ''
\echo '3A) Starter substitution coverage'
SELECT
  count(*) AS starter_sub_events,
  count(*) FILTER (WHERE sub_type='out') AS starter_out_events,
  count(DISTINCT game_id) AS games_with_starter_subs
FROM tmp_starter_subs;

-- ----------------------------
-- 4) Sweep vs closeout table (lead >= L)
-- ----------------------------

\echo ''
\echo '4) Sweep vs closeout table (lead >= L), using first wave of >= :min_wave_starters_out starters in final :window_sec seconds'
WITH closeout_table(lead_threshold, closeout_sec) AS (
  VALUES
    (4, 1::numeric),
    (5, 4::numeric),
    (6, 9::numeric),
    (7, 16::numeric),
    (8, 25::numeric),
    (9, 36::numeric),
    (10,49::numeric)
),
wave_events AS (
  SELECT
    ss.game_id,
    ss.team_id,
    ss.sec_left,
    ss.team_margin,
    count(DISTINCT ss.person_id) AS n_starters_out_same_clock
  FROM tmp_starter_subs ss
  WHERE ss.sub_type = 'out'
    AND ss.sec_left <= :window_sec::numeric
  GROUP BY 1,2,3,4
),
opportunities AS (
  SELECT
    c.lead_threshold,
    ts.game_id,
    ts.team_id
  FROM closeout_table c
  JOIN tmp_team_states ts
    ON ts.team_margin >= c.lead_threshold
   AND ts.sec_left <= :window_sec::numeric
  GROUP BY 1,2,3
),
first_wave AS (
  SELECT
    c.lead_threshold,
    w.game_id,
    w.team_id,
    max(w.sec_left) AS first_wave_sec
  FROM closeout_table c
  JOIN wave_events w
    ON w.team_margin >= c.lead_threshold
   AND w.n_starters_out_same_clock >= :min_wave_starters_out
  GROUP BY 1,2,3
)
SELECT
  c.lead_threshold,
  c.closeout_sec,
  count(o.*) AS opportunity_game_teams,
  count(fw.*) AS pulled_game_teams,
  count(o.*) - count(fw.*) AS no_pull_game_teams,
  round(count(fw.*)::numeric / nullif(count(o.*),0), 4) AS pct_with_pull,
  round(percentile_cont(0.5) WITHIN GROUP (ORDER BY fw.first_wave_sec)::numeric, 2) AS median_first_wave_sec,
  round(percentile_cont(0.25) WITHIN GROUP (ORDER BY fw.first_wave_sec)::numeric, 2) AS p25_first_wave_sec,
  round(percentile_cont(0.75) WITHIN GROUP (ORDER BY fw.first_wave_sec)::numeric, 2) AS p75_first_wave_sec,
  count(*) FILTER (WHERE fw.first_wave_sec > c.closeout_sec) AS pulled_earlier_than_closeout,
  count(*) FILTER (WHERE fw.first_wave_sec <= c.closeout_sec) AS pulled_on_or_later_than_closeout,
  round((count(*) FILTER (WHERE fw.first_wave_sec <= c.closeout_sec))::numeric / nullif(count(fw.*),0), 4) AS pct_pulled_on_or_later
FROM closeout_table c
LEFT JOIN opportunities o
  ON o.lead_threshold = c.lead_threshold
LEFT JOIN first_wave fw
  ON fw.lead_threshold = o.lead_threshold
 AND fw.game_id = o.game_id
 AND fw.team_id = o.team_id
GROUP BY 1,2
ORDER BY 1;

-- ----------------------------
-- 5) Focus rows for reporting (lead 6 and 10)
-- ----------------------------

\echo ''
\echo '5) Focus detail (lead 6 and 10): first wave timing vs closeout'
WITH closeout_table(lead_threshold, closeout_sec) AS (
  VALUES (6, 9::numeric), (10,49::numeric)
),
wave_events AS (
  SELECT
    ss.game_id,
    ss.team_id,
    ss.sec_left,
    ss.team_margin,
    count(DISTINCT ss.person_id) AS n_starters_out_same_clock
  FROM tmp_starter_subs ss
  WHERE ss.sub_type = 'out'
    AND ss.sec_left <= :window_sec::numeric
  GROUP BY 1,2,3,4
),
first_wave AS (
  SELECT
    c.lead_threshold,
    c.closeout_sec,
    w.game_id,
    w.team_id,
    max(w.sec_left) AS first_wave_sec
  FROM closeout_table c
  JOIN wave_events w
    ON w.team_margin >= c.lead_threshold
   AND w.n_starters_out_same_clock >= :min_wave_starters_out
  GROUP BY 1,2,3,4
)
SELECT
  fw.lead_threshold,
  fw.game_id,
  g.game_date,
  CASE WHEN fw.team_id = g.home_id THEN g.home_team ELSE g.away_team END AS team,
  fw.first_wave_sec,
  fw.closeout_sec,
  round(fw.first_wave_sec - fw.closeout_sec, 2) AS sec_earlier_than_closeout
FROM first_wave fw
JOIN tmp_games g USING (game_id)
ORDER BY fw.lead_threshold, sec_earlier_than_closeout DESC, fw.game_id
LIMIT 40;
