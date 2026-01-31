BEGIN;

CREATE TABLE IF NOT EXISTS sr.season_team_statistics (
  source_api text NOT NULL,
  season_id text NOT NULL,
  sr_team_id text NOT NULL,
  series_id text,
  tournament_id text,
  is_opponent boolean DEFAULT false,
  games_played integer,
  minutes text,
  fgm integer,
  fga integer,
  fg_pct numeric(5,2),
  fg3m integer,
  fg3a integer,
  fg3_pct numeric(5,2),
  fg2m integer,
  fg2a integer,
  fg2_pct numeric(5,2),
  ftm integer,
  fta integer,
  ft_pct numeric(5,2),
  oreb integer,
  dreb integer,
  reb integer,
  ast integer,
  stl integer,
  blk integer,
  tov integer,
  pf integer,
  tech_fouls integer,
  flagrant_fouls integer,
  pts integer,
  pts_avg numeric(5,2),
  efficiency numeric(5,2),
  ts_att numeric(7,2),
  ts_pct numeric(5,2),
  efg_pct numeric(5,2),
  pts_in_paint integer,
  fast_break_pts integer,
  second_chance_pts integer,
  pts_off_turnovers integer,
  statistics_json jsonb
);

CREATE TABLE IF NOT EXISTS sr.season_player_statistics (
  source_api text NOT NULL,
  season_id text NOT NULL,
  sr_team_id text NOT NULL,
  sr_id text NOT NULL,
  series_id text,
  tournament_id text,
  games_played integer,
  games_started integer,
  minutes text,
  minutes_avg numeric,
  fgm integer,
  fga integer,
  fg_pct numeric(5,2),
  fg3m integer,
  fg3a integer,
  fg3_pct numeric(5,2),
  fg2m integer,
  fg2a integer,
  fg2_pct numeric(5,2),
  ftm integer,
  fta integer,
  ft_pct numeric(5,2),
  oreb integer,
  dreb integer,
  reb integer,
  reb_avg numeric(5,2),
  ast integer,
  ast_avg numeric(5,2),
  stl integer,
  stl_avg numeric(5,2),
  blk integer,
  blk_avg numeric(5,2),
  tov integer,
  tov_avg numeric(5,2),
  pf integer,
  tech_fouls integer,
  pts integer,
  pts_avg numeric(5,2),
  efficiency numeric(5,2),
  ts_att numeric(7,2),
  ts_pct numeric(5,2),
  efg_pct numeric(5,2),
  double_doubles integer,
  triple_doubles integer,
  statistics_json jsonb
);

CREATE TABLE IF NOT EXISTS sr.season_team_splits (
  source_api text NOT NULL,
  season_id text NOT NULL,
  sr_team_id text NOT NULL,
  split_type text NOT NULL,
  split_value text NOT NULL,
  is_opponent boolean DEFAULT false,
  games_played integer,
  wins integer,
  losses integer,
  win_pct numeric(5,3),
  pts integer,
  pts_avg numeric(5,2),
  fgm integer,
  fga integer,
  fg_pct numeric(5,2),
  fg3m integer,
  fg3a integer,
  fg3_pct numeric(5,2),
  fg2m integer,
  fg2a integer,
  fg2_pct numeric(5,2),
  reb_avg numeric(5,2),
  ast_avg numeric(5,2),
  tov_avg numeric(5,2),
  statistics_json jsonb,
  PRIMARY KEY (source_api, season_id, sr_team_id, split_type, split_value, is_opponent)
);

CREATE TABLE IF NOT EXISTS sr.season_player_splits (
  source_api text NOT NULL,
  season_id text NOT NULL,
  sr_team_id text NOT NULL,
  sr_id text NOT NULL,
  split_type text NOT NULL,
  split_value text NOT NULL,
  games_played integer,
  games_started integer,
  minutes_avg numeric(5,2),
  pts_avg numeric(5,2),
  fgm integer,
  fga integer,
  fg_pct numeric(5,2),
  fg3m integer,
  fg3a integer,
  fg3_pct numeric(5,2),
  fg2m integer,
  fg2a integer,
  fg2_pct numeric(5,2),
  reb_avg numeric(5,2),
  ast_avg numeric(5,2),
  statistics_json jsonb,
  PRIMARY KEY (source_api, season_id, sr_team_id, sr_id, split_type, split_value)
);

CREATE UNIQUE INDEX IF NOT EXISTS season_team_stats_season_unique
  ON sr.season_team_statistics (source_api, season_id, sr_team_id, is_opponent)
  WHERE series_id IS NULL AND tournament_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS season_team_stats_series_unique
  ON sr.season_team_statistics (source_api, season_id, sr_team_id, series_id, is_opponent)
  WHERE series_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS season_team_stats_tournament_unique
  ON sr.season_team_statistics (source_api, season_id, sr_team_id, tournament_id, is_opponent)
  WHERE tournament_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS season_player_stats_season_unique
  ON sr.season_player_statistics (source_api, season_id, sr_team_id, sr_id)
  WHERE series_id IS NULL AND tournament_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS season_player_stats_series_unique
  ON sr.season_player_statistics (source_api, season_id, sr_team_id, sr_id, series_id)
  WHERE series_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS season_player_stats_tournament_unique
  ON sr.season_player_statistics (source_api, season_id, sr_team_id, sr_id, tournament_id)
  WHERE tournament_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS season_team_stats_season_idx
  ON sr.season_team_statistics (source_api, season_id);

CREATE INDEX IF NOT EXISTS season_team_stats_team_idx
  ON sr.season_team_statistics (source_api, sr_team_id);

CREATE INDEX IF NOT EXISTS season_player_stats_season_idx
  ON sr.season_player_statistics (source_api, season_id);

CREATE INDEX IF NOT EXISTS season_player_stats_team_idx
  ON sr.season_player_statistics (source_api, sr_team_id);

CREATE INDEX IF NOT EXISTS season_team_splits_season_idx
  ON sr.season_team_splits (source_api, season_id);

CREATE INDEX IF NOT EXISTS season_team_splits_team_idx
  ON sr.season_team_splits (source_api, sr_team_id);

CREATE INDEX IF NOT EXISTS season_player_splits_season_idx
  ON sr.season_player_splits (source_api, season_id);

CREATE INDEX IF NOT EXISTS season_player_splits_team_idx
  ON sr.season_player_splits (source_api, sr_team_id);

COMMIT;
