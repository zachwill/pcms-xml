-- result_collection=last_statement_all_rows

ATTACH '$res:f/env/postgres' AS pg (TYPE postgres);
SET TimeZone='UTC';

--
-- draft_assets.inline_script.duckdb.sql
--
-- Imports:
--   - pg.pcms.draft_picks
--   - pg.pcms.draft_pick_summaries
--
-- Sources (hard-coded):
--   ./shared/pcms/nba_pcms_full_extract/lookups.json
--   ./shared/pcms/nba_pcms_full_extract/draft_picks.json
--   ./shared/pcms/nba_pcms_full_extract/draft_pick_summaries.json
--   ./shared/pcms/nba_pcms_full_extract/players.json
--
-- Key logic:
--   - PCMS draft_picks.json contains DLG/WNBA picks only.
--   - NBA picks are generated from players.json draft fields.
--   - Team code joins via lookups.json.
--   - Dedupe via QUALIFY to avoid Postgres "ON CONFLICT cannot affect row a second time".
--

-- 1) Team lookup (shared)
CREATE OR REPLACE TEMP VIEW v_teams AS
SELECT
  TRY_CAST(team_json->>'$.team_id' AS BIGINT) AS team_id,
  COALESCE(team_json->>'$.team_code', team_json->>'$.team_name_short') AS team_code,
FROM (
  SELECT
    to_json(r) AS team_json,
  FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/lookups.json') AS lookups,
  UNNEST(lookups.lk_teams.lk_team) AS t(r)
)
WHERE team_json->>'$.team_id' IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2) Draft Picks (PCMS extract: DLG/WNBA)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_draft_picks_pcms_source AS
SELECT
  TRY_CAST(dp_json->>'$.draft_pick_id' AS INTEGER) AS draft_pick_id,

  COALESCE(
    TRY_CAST(dp_json->>'$.draft_year' AS INTEGER),
    TRY_CAST(dp_json->>'$.year' AS INTEGER)
  ) AS draft_year,

  TRY_CAST(dp_json->>'$.round' AS INTEGER) AS round,

  -- Keep the raw text pick number. Populate the int column only when it's a strict integer.
  NULLIF(trim(dp_json->>'$.pick'), '') AS pick_number,
  CASE
    WHEN NULLIF(trim(dp_json->>'$.pick'), '') IS NULL THEN NULL
    WHEN regexp_matches(trim(dp_json->>'$.pick'), '^[0-9]+$') THEN TRY_CAST(trim(dp_json->>'$.pick') AS INTEGER)
    ELSE NULL
  END AS pick_number_int,

  NULLIF(trim(dp_json->>'$.league_lk'), '') AS league_lk,

  TRY_CAST(dp_json->>'$.original_team_id' AS INTEGER) AS original_team_id,
  orig.team_code AS original_team_code,

  TRY_CAST(COALESCE(dp_json->>'$.current_team_id', dp_json->>'$.team_id') AS INTEGER) AS current_team_id,
  cur.team_code AS current_team_code,

  COALESCE(
    TRY_CAST(dp_json->>'$.is_active' AS BOOLEAN),
    TRY_CAST(dp_json->>'$.active_flg' AS BOOLEAN)
  ) AS is_active,

  COALESCE(
    TRY_CAST(dp_json->>'$.is_protected' AS BOOLEAN),
    TRY_CAST(dp_json->>'$.protected_flg' AS BOOLEAN)
  ) AS is_protected,

  NULLIF(trim(dp_json->>'$.protection_description'), '') AS protection_description,

  COALESCE(
    TRY_CAST(dp_json->>'$.is_swap' AS BOOLEAN),
    TRY_CAST(dp_json->>'$.draft_pick_swap_flg' AS BOOLEAN),
    TRY_CAST(dp_json->>'$.swap_flg' AS BOOLEAN)
  ) AS is_swap,

  NULLIF(trim(dp_json->>'$.swap_type_lk'), '') AS swap_type_lk,
  NULLIF(trim(dp_json->>'$.conveyance_year_range'), '') AS conveyance_year_range,
  NULLIF(trim(dp_json->>'$.conveyance_trigger_description'), '') AS conveyance_trigger_description,
  NULLIF(trim(dp_json->>'$.first_round_summary'), '') AS first_round_summary,
  NULLIF(trim(dp_json->>'$.second_round_summary'), '') AS second_round_summary,

  CASE
    WHEN dp_json->'$.histories' IS NULL THEN NULL
    WHEN json_array_length(dp_json->'$.histories') IS NULL THEN dp_json->'$.histories'
    WHEN json_array_length(dp_json->'$.histories') = 0 THEN NULL
    ELSE to_json({'history': dp_json->'$.histories'})
  END AS history_json,

  dp_json AS draft_json,
  dp_json->'$.summary_json' AS summary_json,

  TRY_CAST(dp_json->>'$.create_date' AS TIMESTAMPTZ) AS created_at,
  TRY_CAST(dp_json->>'$.last_change_date' AS TIMESTAMPTZ) AS updated_at,
  TRY_CAST(dp_json->>'$.record_change_date' AS TIMESTAMPTZ) AS record_changed_at,

  now() AS ingested_at,

  NULL::INTEGER AS player_id,
FROM (
  SELECT
    to_json(dp) AS dp_json,
  FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/draft_picks.json') AS dp
) AS src
LEFT JOIN v_teams AS orig ON orig.team_id = TRY_CAST(dp_json->>'$.original_team_id' AS BIGINT)
LEFT JOIN v_teams AS cur ON cur.team_id = TRY_CAST(COALESCE(dp_json->>'$.current_team_id', dp_json->>'$.team_id') AS BIGINT)
WHERE dp_json->>'$.draft_pick_id' IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3) Draft Picks (Generated NBA picks from players.json)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_draft_picks_generated_source AS
SELECT
  (
    TRY_CAST(p_json->>'$.draft_year' AS INTEGER) * 100000
    + TRY_CAST(p_json->>'$.draft_round' AS INTEGER) * 1000
    + TRY_CAST(p_json->>'$.draft_pick[0]' AS INTEGER)
  ) AS draft_pick_id,

  TRY_CAST(p_json->>'$.draft_year' AS INTEGER) AS draft_year,
  TRY_CAST(p_json->>'$.draft_round' AS INTEGER) AS round,

  CAST(TRY_CAST(p_json->>'$.draft_pick[0]' AS INTEGER) AS VARCHAR) AS pick_number,
  TRY_CAST(p_json->>'$.draft_pick[0]' AS INTEGER) AS pick_number_int,

  'NBA' AS league_lk,

  TRY_CAST(p_json->>'$.draft_team_id' AS INTEGER) AS original_team_id,
  t.team_code AS original_team_code,

  TRY_CAST(p_json->>'$.draft_team_id' AS INTEGER) AS current_team_id,
  t.team_code AS current_team_code,

  FALSE AS is_active,

  NULL::BOOLEAN AS is_protected,
  NULL::VARCHAR AS protection_description,
  NULL::BOOLEAN AS is_swap,
  NULL::VARCHAR AS swap_type_lk,
  NULL::VARCHAR AS conveyance_year_range,
  NULL::VARCHAR AS conveyance_trigger_description,
  NULL::VARCHAR AS first_round_summary,
  NULL::VARCHAR AS second_round_summary,

  NULL::JSON AS history_json,

  to_json({
    'source': 'generated_nba_from_players',
    'player_id': TRY_CAST(p_json->>'$.player_id' AS INTEGER),
    'draft_year': TRY_CAST(p_json->>'$.draft_year' AS INTEGER),
    'draft_round': TRY_CAST(p_json->>'$.draft_round' AS INTEGER),
    'draft_pick': TRY_CAST(p_json->>'$.draft_pick[0]' AS INTEGER),
    'draft_team_id': TRY_CAST(p_json->>'$.draft_team_id' AS INTEGER),
  }) AS draft_json,

  NULL::JSON AS summary_json,

  TRY_CAST(p_json->>'$.create_date' AS TIMESTAMPTZ) AS created_at,
  TRY_CAST(p_json->>'$.last_change_date' AS TIMESTAMPTZ) AS updated_at,
  TRY_CAST(p_json->>'$.record_change_date' AS TIMESTAMPTZ) AS record_changed_at,

  now() AS ingested_at,

  TRY_CAST(p_json->>'$.player_id' AS INTEGER) AS player_id,
FROM (
  SELECT
    to_json(p) AS p_json,
  FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/players.json') AS p
) AS src
LEFT JOIN v_teams AS t ON t.team_id = TRY_CAST(p_json->>'$.draft_team_id' AS BIGINT)
WHERE p_json->>'$.league_lk' = 'NBA'
  AND p_json->>'$.draft_year' IS NOT NULL
  AND p_json->>'$.draft_round' IS NOT NULL
  AND p_json->>'$.draft_pick[0]' IS NOT NULL;

-- Dedupe generated picks by natural pick identity (avoids multi-hit on unique indexes)
CREATE OR REPLACE TEMP VIEW v_draft_picks_generated_deduped AS
SELECT * EXCLUDE (rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY draft_year, round, pick_number_int, league_lk
      ORDER BY record_changed_at DESC NULLS LAST, player_id DESC NULLS LAST
    ) AS rn,
  FROM v_draft_picks_generated_source
)
QUALIFY rn = 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) Draft Picks union + PK dedupe
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_draft_picks_union AS
SELECT * FROM v_draft_picks_pcms_source
UNION ALL
SELECT * FROM v_draft_picks_generated_deduped;

CREATE OR REPLACE TEMP VIEW v_draft_picks_deduped AS
SELECT * EXCLUDE (rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY draft_pick_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_draft_picks_union
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.draft_picks BY NAME (
  SELECT
    draft_pick_id,
    draft_year,
    round,
    pick_number,
    pick_number_int,
    league_lk,
    original_team_id,
    original_team_code,
    current_team_id,
    current_team_code,
    is_active,
    is_protected,
    protection_description,
    is_swap,
    swap_type_lk,
    conveyance_year_range,
    conveyance_trigger_description,
    first_round_summary,
    second_round_summary,
    history_json,
    draft_json,
    summary_json,
    created_at,
    updated_at,
    record_changed_at,
    ingested_at,
    player_id,
  FROM v_draft_picks_deduped
)
ON CONFLICT (draft_pick_id) DO UPDATE SET
  draft_year = EXCLUDED.draft_year,
  round = EXCLUDED.round,
  pick_number = EXCLUDED.pick_number,
  pick_number_int = EXCLUDED.pick_number_int,
  league_lk = EXCLUDED.league_lk,
  original_team_id = EXCLUDED.original_team_id,
  original_team_code = EXCLUDED.original_team_code,
  current_team_id = EXCLUDED.current_team_id,
  current_team_code = EXCLUDED.current_team_code,
  is_active = EXCLUDED.is_active,
  is_protected = EXCLUDED.is_protected,
  protection_description = EXCLUDED.protection_description,
  is_swap = EXCLUDED.is_swap,
  swap_type_lk = EXCLUDED.swap_type_lk,
  conveyance_year_range = EXCLUDED.conveyance_year_range,
  conveyance_trigger_description = EXCLUDED.conveyance_trigger_description,
  first_round_summary = EXCLUDED.first_round_summary,
  second_round_summary = EXCLUDED.second_round_summary,
  history_json = EXCLUDED.history_json,
  draft_json = EXCLUDED.draft_json,
  summary_json = EXCLUDED.summary_json,
  updated_at = COALESCE(EXCLUDED.updated_at, pg.pcms.draft_picks.updated_at),
  record_changed_at = COALESCE(EXCLUDED.record_changed_at, pg.pcms.draft_picks.record_changed_at),
  ingested_at = EXCLUDED.ingested_at,
  player_id = EXCLUDED.player_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5) Draft Pick Summaries
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE TEMP VIEW v_draft_pick_summaries_source AS
SELECT
  TRY_CAST(s_json->>'$.draft_year' AS INTEGER) AS draft_year,
  TRY_CAST(s_json->>'$.team_id' AS INTEGER) AS team_id,
  team.team_code AS team_code,
  NULLIF(trim(s_json->>'$.first_round'), '') AS first_round,
  NULLIF(trim(s_json->>'$.second_round'), '') AS second_round,
  TRY_CAST(s_json->>'$.active_flg' AS BOOLEAN) AS is_active,
  TRY_CAST(s_json->>'$.create_date' AS TIMESTAMPTZ) AS created_at,
  TRY_CAST(s_json->>'$.last_change_date' AS TIMESTAMPTZ) AS updated_at,
  TRY_CAST(s_json->>'$.record_change_date' AS TIMESTAMPTZ) AS record_changed_at,
  now() AS ingested_at,
FROM (
  SELECT
    to_json(s) AS s_json,
  FROM read_json_auto('./shared/pcms/nba_pcms_full_extract/draft_pick_summaries.json') AS s
) AS src
LEFT JOIN v_teams AS team ON team.team_id = TRY_CAST(s_json->>'$.team_id' AS BIGINT)
WHERE s_json->>'$.draft_year' IS NOT NULL
  AND s_json->>'$.team_id' IS NOT NULL;

CREATE OR REPLACE TEMP VIEW v_draft_pick_summaries_deduped AS
SELECT * EXCLUDE (rn)
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER (
      PARTITION BY draft_year, team_id
      ORDER BY record_changed_at DESC NULLS LAST, updated_at DESC NULLS LAST, created_at DESC NULLS LAST
    ) AS rn,
  FROM v_draft_pick_summaries_source
)
QUALIFY rn = 1;

INSERT INTO pg.pcms.draft_pick_summaries BY NAME (
  SELECT
    draft_year,
    team_id,
    team_code,
    first_round,
    second_round,
    is_active,
    created_at,
    updated_at,
    record_changed_at,
    ingested_at,
  FROM v_draft_pick_summaries_deduped
)
ON CONFLICT (draft_year, team_id) DO UPDATE SET
  team_code = EXCLUDED.team_code,
  first_round = EXCLUDED.first_round,
  second_round = EXCLUDED.second_round,
  is_active = EXCLUDED.is_active,
  updated_at = COALESCE(EXCLUDED.updated_at, pg.pcms.draft_pick_summaries.updated_at),
  record_changed_at = COALESCE(EXCLUDED.record_changed_at, pg.pcms.draft_pick_summaries.record_changed_at),
  ingested_at = EXCLUDED.ingested_at;

-- 6) Summary
SELECT
  'draft_assets' AS step,
  (SELECT count(*) FROM v_draft_picks_deduped) AS draft_picks_rows_upserted,
  (SELECT count(*) FILTER (WHERE league_lk = 'NBA') FROM v_draft_picks_deduped) AS generated_nba_picks,
  (SELECT count(*) FILTER (WHERE league_lk <> 'NBA') FROM v_draft_picks_deduped) AS pcms_picks,
  (SELECT count(*) FROM v_draft_pick_summaries_deduped) AS draft_pick_summaries_rows_upserted,
  now() AS finished_at,
;