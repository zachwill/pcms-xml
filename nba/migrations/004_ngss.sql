CREATE TABLE IF NOT EXISTS nba.ngss_games (
    game_id text PRIMARY KEY,
    ngss_game_id text UNIQUE,
    league_code text,
    league_name text,
    season_id text,
    season_name text,
    season_type integer,
    game_status integer,
    winner_type integer,
    game_date_local date,
    game_time_local time,
    game_date_time_local timestamptz,
    game_date_time_utc timestamptz,
    game_time_home time,
    game_time_away time,
    game_time_et time,
    time_actual timestamptz,
    time_end_actual timestamptz,
    attendance integer,
    duration_minutes integer,
    home_team_id integer,
    home_score integer,
    away_team_id integer,
    away_score integer,
    arena_id integer,
    arena_name text,
    last_game_data_update timestamptz,
    needs_reprocessing timestamptz,
    is_sold_out boolean,
    memos text[],
    is_target_score_ending boolean,
    target_score_period integer,
    ruleset_id integer,
    ruleset_json jsonb,
    game_json jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    fetched_at timestamptz
);

CREATE INDEX IF NOT EXISTS ngss_games_game_id_idx ON nba.ngss_games (game_id);
CREATE INDEX IF NOT EXISTS ngss_games_game_date_time_utc_idx ON nba.ngss_games (game_date_time_utc);
CREATE INDEX IF NOT EXISTS ngss_games_home_team_id_idx ON nba.ngss_games (home_team_id);
CREATE INDEX IF NOT EXISTS ngss_games_away_team_id_idx ON nba.ngss_games (away_team_id);

CREATE TABLE IF NOT EXISTS nba.ngss_rosters (
    game_id text REFERENCES nba.ngss_games(game_id),
    ngss_game_id text REFERENCES nba.ngss_games(ngss_game_id),
    team_id integer REFERENCES nba.teams(team_id),
    ngss_team_id text,
    nba_id integer REFERENCES nba.players(nba_id),
    ngss_person_id text,
    full_name text,
    first_name text,
    family_name text,
    jersey_number text,
    position text,
    is_player boolean,
    is_official boolean,
    is_team_staff boolean,
    team_role text,
    player_status text,
    not_playing_reason text,
    not_playing_description text,
    created_at timestamptz,
    updated_at timestamptz,
    fetched_at timestamptz,
    PRIMARY KEY (ngss_game_id, ngss_person_id)
);

CREATE INDEX IF NOT EXISTS ngss_rosters_game_id_idx ON nba.ngss_rosters (game_id);
CREATE INDEX IF NOT EXISTS ngss_rosters_nba_id_idx ON nba.ngss_rosters (nba_id);
CREATE INDEX IF NOT EXISTS ngss_rosters_team_id_idx ON nba.ngss_rosters (team_id);

CREATE TABLE IF NOT EXISTS nba.ngss_boxscores (
    game_id text REFERENCES nba.games(game_id),
    ngss_game_id text,
    boxscore_json jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    fetched_at timestamptz,
    PRIMARY KEY (game_id)
);

CREATE INDEX IF NOT EXISTS ngss_boxscores_ngss_game_id_idx ON nba.ngss_boxscores (ngss_game_id);
CREATE INDEX IF NOT EXISTS ngss_boxscores_boxscore_json_gin ON nba.ngss_boxscores USING gin (boxscore_json);

CREATE TABLE IF NOT EXISTS nba.ngss_pbp (
    game_id text REFERENCES nba.games(game_id),
    ngss_game_id text,
    ngss_pbp_json jsonb,
    created_at timestamptz,
    updated_at timestamptz,
    fetched_at timestamptz,
    PRIMARY KEY (game_id)
);

CREATE INDEX IF NOT EXISTS ngss_pbp_ngss_game_id_idx ON nba.ngss_pbp (ngss_game_id);
CREATE INDEX IF NOT EXISTS ngss_pbp_json_gin ON nba.ngss_pbp USING gin (ngss_pbp_json);

CREATE TABLE IF NOT EXISTS nba.ngss_officials (
    game_id text REFERENCES nba.games(game_id),
    ngss_official_id text,
    first_name text,
    last_name text,
    jersey_num text,
    official_type text,
    assignment text,
    created_at timestamptz,
    updated_at timestamptz,
    fetched_at timestamptz,
    PRIMARY KEY (game_id, ngss_official_id)
);

CREATE INDEX IF NOT EXISTS ngss_officials_game_id_idx ON nba.ngss_officials (game_id);
