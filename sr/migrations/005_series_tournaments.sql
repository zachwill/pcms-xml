BEGIN;

CREATE TABLE IF NOT EXISTS sr.series (
  source_api text NOT NULL,
  series_id text NOT NULL,
  season_id text NOT NULL,
  title text,
  round text,
  round_number integer,
  status text,
  start_date date,
  end_date date,
  best_of integer DEFAULT 7,
  team1_sr_team_id text,
  team1_seed integer,
  team1_wins integer DEFAULT 0,
  team2_sr_team_id text,
  team2_seed integer,
  team2_wins integer DEFAULT 0,
  winner_sr_team_id text,
  conference text,
  bracket text,
  PRIMARY KEY (source_api, series_id)
);

CREATE TABLE IF NOT EXISTS sr.tournaments (
  source_api text NOT NULL,
  tournament_id text NOT NULL,
  season_id text NOT NULL,
  name text NOT NULL,
  alias text,
  type text,
  gender text,
  division text,
  status text,
  location text,
  start_date date,
  end_date date,
  bracket_size integer,
  PRIMARY KEY (source_api, tournament_id)
);

CREATE TABLE IF NOT EXISTS sr.tournament_teams (
  source_api text NOT NULL,
  tournament_id text NOT NULL,
  sr_team_id text NOT NULL,
  seed integer,
  region text,
  eliminated boolean DEFAULT false,
  eliminated_round text,
  final_rank integer,
  PRIMARY KEY (source_api, tournament_id, sr_team_id)
);

CREATE INDEX IF NOT EXISTS series_source_season_idx
  ON sr.series (source_api, season_id);

CREATE INDEX IF NOT EXISTS series_source_teams_idx
  ON sr.series (source_api, team1_sr_team_id, team2_sr_team_id);

CREATE INDEX IF NOT EXISTS tournaments_source_season_idx
  ON sr.tournaments (source_api, season_id);

CREATE INDEX IF NOT EXISTS tournaments_source_type_idx
  ON sr.tournaments (source_api, type);

CREATE INDEX IF NOT EXISTS tournament_teams_source_team_idx
  ON sr.tournament_teams (source_api, sr_team_id);

COMMIT;
