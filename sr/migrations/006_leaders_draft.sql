BEGIN;

CREATE TABLE IF NOT EXISTS sr.league_leaders (
  source_api text NOT NULL,
  leader_id text NOT NULL,
  season_id text NOT NULL,
  season_year integer,
  season_type text,
  category text NOT NULL,
  rank integer NOT NULL,
  sr_id text NOT NULL,
  sr_team_id text,
  player_name text,
  team_alias text,
  value numeric(10,3),
  games_played integer,
  is_tied boolean DEFAULT false,
  PRIMARY KEY (source_api, leader_id)
);

CREATE TABLE IF NOT EXISTS sr.draft (
  source_api text NOT NULL,
  draft_id text NOT NULL,
  draft_year integer NOT NULL,
  round integer,
  pick integer,
  overall_pick integer,
  sr_team_id text,
  original_sr_team_id text,
  sr_id text,
  prospect_id text,
  first_name text,
  last_name text,
  full_name text,
  position text,
  primary_position text,
  height integer,
  weight integer,
  experience text,
  birthdate date,
  birth_place text,
  high_school text,
  college text,
  country text,
  rank integer,
  status text,
  trade_id text,
  trades_json jsonb,
  PRIMARY KEY (source_api, draft_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS league_leaders_unique
  ON sr.league_leaders (source_api, season_id, category, rank, sr_id);

CREATE INDEX IF NOT EXISTS league_leaders_season_category_idx
  ON sr.league_leaders (source_api, season_id, category);

CREATE INDEX IF NOT EXISTS league_leaders_player_idx
  ON sr.league_leaders (source_api, sr_id);

CREATE UNIQUE INDEX IF NOT EXISTS draft_year_round_pick_unique
  ON sr.draft (source_api, draft_year, round, pick);

CREATE INDEX IF NOT EXISTS draft_year_idx
  ON sr.draft (source_api, draft_year);

CREATE INDEX IF NOT EXISTS draft_team_idx
  ON sr.draft (source_api, sr_team_id);

COMMIT;
