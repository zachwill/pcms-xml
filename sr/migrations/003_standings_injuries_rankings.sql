BEGIN;

CREATE TABLE IF NOT EXISTS sr.standings (
  source_api text NOT NULL,
  season_id text NOT NULL,
  sr_team_id text NOT NULL,
  conference_id text,
  conference_name text,
  conference_rank integer,
  conference_wins integer,
  conference_losses integer,
  division_id text,
  division_name text,
  division_rank integer,
  division_wins integer,
  division_losses integer,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  win_pct numeric(5,3),
  games_behind numeric(4,1),
  conference_games_behind numeric(4,1),
  clinching_status text,
  streak text,
  home_wins integer,
  home_losses integer,
  road_wins integer,
  road_losses integer,
  last_10_wins integer,
  last_10_losses integer,
  pts_for numeric(7,2),
  pts_against numeric(7,2),
  pts_diff numeric(6,2),
  records_json jsonb,
  PRIMARY KEY (source_api, season_id, sr_team_id)
);

CREATE TABLE IF NOT EXISTS sr.rankings (
  source_api text NOT NULL,
  season_id text NOT NULL,
  sr_team_id text NOT NULL,
  type text NOT NULL,
  name text NOT NULL,
  week text NOT NULL,
  season_year integer,
  season_type text,
  rank integer,
  prev_rank integer,
  pts integer,
  first_place_votes integer,
  rating numeric(7,3),
  strength_of_schedule numeric(7,3),
  PRIMARY KEY (source_api, season_id, type, name, week, sr_team_id)
);

CREATE TABLE IF NOT EXISTS sr.injuries (
  source_api text NOT NULL,
  injury_id text NOT NULL,
  sr_id text NOT NULL,
  sr_team_id text NOT NULL,
  status text,
  description text,
  comment text,
  start_date date,
  update_date date,
  is_active boolean DEFAULT true,
  PRIMARY KEY (source_api, injury_id)
);

CREATE INDEX IF NOT EXISTS standings_source_season_idx ON sr.standings (source_api, season_id);
CREATE INDEX IF NOT EXISTS standings_source_team_idx ON sr.standings (source_api, sr_team_id);

CREATE INDEX IF NOT EXISTS rankings_source_season_idx ON sr.rankings (source_api, season_id);
CREATE INDEX IF NOT EXISTS rankings_source_team_idx ON sr.rankings (source_api, sr_team_id);

CREATE INDEX IF NOT EXISTS injuries_source_player_idx ON sr.injuries (source_api, sr_id);
CREATE INDEX IF NOT EXISTS injuries_source_team_idx ON sr.injuries (source_api, sr_team_id);
CREATE INDEX IF NOT EXISTS injuries_source_active_idx ON sr.injuries (source_api, is_active);

COMMIT;
