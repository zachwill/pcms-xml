BEGIN;

CREATE TABLE IF NOT EXISTS sr.competitions (
  source_api text NOT NULL,
  competition_id text NOT NULL,
  name text NOT NULL,
  alias text,
  gender text,
  type text,
  parent_id text,
  category_id text,
  category_name text,
  PRIMARY KEY (source_api, competition_id)
);

CREATE TABLE IF NOT EXISTS sr.season_stages (
  source_api text NOT NULL,
  stage_id text NOT NULL,
  season_id text NOT NULL,
  competition_id text,
  name text,
  type text,
  phase text,
  order_num integer,
  start_date date,
  end_date date,
  PRIMARY KEY (source_api, stage_id)
);

CREATE TABLE IF NOT EXISTS sr.season_groups (
  source_api text NOT NULL,
  group_id text NOT NULL,
  stage_id text NOT NULL,
  season_id text NOT NULL,
  name text,
  order_num integer,
  PRIMARY KEY (source_api, group_id)
);

CREATE INDEX IF NOT EXISTS competitions_category_idx
  ON sr.competitions (source_api, category_id);

CREATE INDEX IF NOT EXISTS competitions_parent_idx
  ON sr.competitions (source_api, parent_id);

CREATE INDEX IF NOT EXISTS season_stages_season_idx
  ON sr.season_stages (source_api, season_id);

CREATE INDEX IF NOT EXISTS season_groups_stage_idx
  ON sr.season_groups (source_api, stage_id);

COMMIT;
