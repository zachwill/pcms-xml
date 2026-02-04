# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_04_194255) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "fuzzystrmatch"
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pg_trgm"

  create_table "artificial_analysis", id: :text, force: :cascade do |t|
    t.text "creator_id"
    t.text "creator_name"
    t.text "creator_slug"
    t.jsonb "evaluations"
    t.timestamptz "fetched_at", default: -> { "now()" }
    t.decimal "median_first_token_seconds"
    t.decimal "median_output_tps"
    t.text "model"
    t.jsonb "pricing"
    t.date "release_date"
    t.text "slug"
  end

  create_table "bref_team_codes", primary_key: "team_code", id: :text, force: :cascade do |t|
    t.text "nba_team_code"
    t.integer "nba_team_id"
  end

  create_table "bref_team_html", primary_key: "season", id: :integer, default: nil, force: :cascade do |t|
    t.integer "bref_season"
    t.text "html"
    t.text "season_code"
  end

  create_table "bref_team_stats", primary_key: ["season", "team_code"], force: :cascade do |t|
    t.jsonb "data"
    t.text "nba_team_code"
    t.integer "nba_team_id"
    t.integer "season", null: false
    t.text "team_code", null: false
    t.index ["season"], name: "idx_bref_team_stats_season"
    t.index ["team_code"], name: "idx_bref_team_stats_team"
  end

  create_table "bri", primary_key: "season", id: :integer, default: nil, force: :cascade do |t|
    t.decimal "bri"
    t.decimal "bri_pct_revenue"
    t.boolean "escrow_adjustment"
    t.text "notes"
    t.decimal "overage_shortfall"
    t.decimal "player_share"
    t.decimal "player_share_pct"
    t.decimal "revenue"
    t.decimal "revenue_concessions_and_parking"
    t.decimal "revenue_concessions_and_parking_pct"
    t.decimal "revenue_local_media"
    t.decimal "revenue_local_media_pct"
    t.decimal "revenue_national_revenue_pct"
    t.decimal "revenue_national_tv"
    t.decimal "revenue_seating_and_suites"
    t.decimal "revenue_seating_and_suites_pct"
    t.decimal "revenue_team_sponsorships"
    t.decimal "revenue_team_sponsorships_pct"
    t.bigint "salary_cap"
    t.decimal "salary_cap_pct_change"
    t.text "season_formatted"
    t.decimal "total_benefits"
    t.decimal "total_salaries"
    t.decimal "total_salaries_and_benefits"
    t.decimal "total_salary_and_benefits_as_pct"
    t.text "tv_deal"
    t.decimal "tv_deal_avg"
    t.text "tv_deal_notes"
    t.jsonb "tv_deal_partners"
    t.decimal "tv_deal_rolling_total"
    t.integer "tv_deal_year"
  end

  create_table "cba", primary_key: ["article_id", "section_id"], force: :cascade do |t|
    t.text "article"
    t.integer "article_id", null: false
    t.text "cap_machine"
    t.text "markdown"
    t.text "section"
    t.integer "section_id", null: false
    t.text "simplified"
    t.index "to_tsvector('english'::regconfig, ((COALESCE(markdown, ''::text) || ' '::text) || COALESCE(simplified, ''::text)))", name: "cba_ft_idx", using: :gin
  end

  create_table "crafted_historical", primary_key: "craft_id", id: :text, force: :cascade do |t|
    t.integer "age"
    t.decimal "ast"
    t.decimal "ast_75"
    t.decimal "blk"
    t.decimal "blk_75"
    t.decimal "blk_pct"
    t.decimal "box_creation"
    t.decimal "crafted_dpm"
    t.decimal "crafted_opm"
    t.decimal "crafted_pm"
    t.timestamptz "created_at", default: -> { "now()" }
    t.decimal "drb_75"
    t.decimal "dreb"
    t.decimal "dreb_pct"
    t.decimal "dreb_pct_rel"
    t.decimal "fg3_pct"
    t.decimal "fg3_rate"
    t.decimal "fg3_rate_rel"
    t.decimal "fg3a"
    t.decimal "fg3a_75"
    t.decimal "fg3m"
    t.decimal "fg_pct"
    t.decimal "fga"
    t.decimal "fga_75"
    t.decimal "fgm"
    t.decimal "ft_pct"
    t.decimal "ft_rate"
    t.decimal "fta"
    t.decimal "fta_75"
    t.decimal "ftm"
    t.integer "g"
    t.boolean "is_rookie", default: false
    t.integer "mp"
    t.decimal "mpg"
    t.integer "nba_id"
    t.decimal "offensive_load"
    t.decimal "orb_75"
    t.decimal "oreb"
    t.decimal "oreb_pct"
    t.decimal "oreb_pct_rel"
    t.decimal "passer_rating"
    t.decimal "pf_rel"
    t.text "player", null: false
    t.decimal "portability"
    t.text "position"
    t.decimal "pts"
    t.decimal "pts_75"
    t.decimal "reb"
    t.decimal "reb_75"
    t.integer "season"
    t.decimal "shot_quality"
    t.decimal "stl"
    t.decimal "stl_75"
    t.decimal "stl_pct"
    t.text "team"
    t.decimal "tov"
    t.decimal "tov_75"
    t.decimal "tov_pct"
    t.decimal "tov_pct_creation"
    t.decimal "ts"
    t.decimal "ts_rel"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "crafted_nba", primary_key: ["season", "nba_id"], force: :cascade do |t|
    t.decimal "age"
    t.decimal "ast"
    t.decimal "ast_75"
    t.decimal "bball_iq"
    t.decimal "blk"
    t.decimal "blk_75"
    t.decimal "blk_pct"
    t.decimal "box_creation"
    t.decimal "bpm"
    t.decimal "c_pct"
    t.decimal "crafted_dpm"
    t.decimal "crafted_dpm_pctl"
    t.decimal "crafted_opm"
    t.decimal "crafted_opm_pctl"
    t.decimal "crafted_peak_pm"
    t.decimal "crafted_pm"
    t.decimal "crafted_pm_pctl"
    t.decimal "crafted_warp"
    t.decimal "darko"
    t.decimal "darko_d"
    t.decimal "darko_o"
    t.decimal "dbpm"
    t.decimal "def_vs_c_pct"
    t.decimal "def_vs_pf_pct"
    t.decimal "def_vs_pg_pct"
    t.decimal "def_vs_sf_pct"
    t.decimal "def_vs_sg_pct"
    t.decimal "deflections"
    t.date "dob"
    t.decimal "drb_75"
    t.decimal "dreb"
    t.decimal "dreb_pct"
    t.decimal "dreb_pct_rel"
    t.decimal "drip"
    t.decimal "drip_d"
    t.decimal "drip_o"
    t.decimal "fg3_pct"
    t.decimal "fg3_rate"
    t.decimal "fg3_rate_rel"
    t.decimal "fg3a"
    t.decimal "fg3a_75"
    t.decimal "fg3m"
    t.decimal "fg_pct"
    t.decimal "fga"
    t.decimal "fga_75"
    t.decimal "fgm"
    t.decimal "ft_pct"
    t.decimal "ft_rate"
    t.decimal "fta"
    t.decimal "fta_75"
    t.decimal "ftm"
    t.integer "g"
    t.decimal "game_score_avg"
    t.integer "gs"
    t.decimal "height"
    t.text "hometown"
    t.boolean "is_out_for_season"
    t.boolean "is_rookie"
    t.decimal "latitude"
    t.decimal "lebron"
    t.decimal "lebron_d"
    t.decimal "lebron_o"
    t.decimal "length_diff"
    t.decimal "lineup_value"
    t.decimal "longitude"
    t.decimal "matchup_difficulty"
    t.decimal "minutes_2025"
    t.decimal "minutes_2yr"
    t.decimal "mp"
    t.decimal "mpg"
    t.decimal "my_crafted_pm"
    t.decimal "my_crafted_pm_pctl"
    t.text "nba_id", null: false
    t.decimal "obpm"
    t.decimal "offensive_load"
    t.decimal "orb_75"
    t.decimal "oreb"
    t.decimal "oreb_pct"
    t.decimal "oreb_pct_rel"
    t.decimal "passer_rating"
    t.decimal "passer_rating_added"
    t.decimal "passes_made"
    t.decimal "passes_received"
    t.decimal "pct_fair_game"
    t.decimal "pct_good_game"
    t.decimal "pct_great_game"
    t.decimal "pct_poor_game"
    t.decimal "peak_war"
    t.decimal "pf"
    t.decimal "pf_pct"
    t.decimal "pf_rel"
    t.decimal "pg_pct"
    t.decimal "play_cut_freq"
    t.decimal "play_cut_ppp"
    t.decimal "play_handoff_freq"
    t.decimal "play_handoff_ppp"
    t.decimal "play_iso_freq"
    t.decimal "play_iso_ppp"
    t.decimal "play_offscreen_freq"
    t.decimal "play_offscreen_ppp"
    t.decimal "play_pnr_ball_freq"
    t.decimal "play_pnr_ball_ppp"
    t.decimal "play_pnr_roll_freq"
    t.decimal "play_pnr_roll_ppp"
    t.decimal "play_post_freq"
    t.decimal "play_post_ppp"
    t.decimal "play_putback_freq"
    t.decimal "play_putback_ppp"
    t.decimal "play_spotup_freq"
    t.decimal "play_spotup_ppp"
    t.decimal "play_transition_freq"
    t.decimal "play_transition_ppp"
    t.text "player"
    t.decimal "plus_minus"
    t.decimal "points_added"
    t.decimal "portability"
    t.text "position"
    t.text "position_combo"
    t.text "position_group"
    t.decimal "proj_crafted_dpm"
    t.decimal "proj_crafted_opm"
    t.decimal "proj_crafted_pm"
    t.decimal "proj_warp"
    t.decimal "pts"
    t.decimal "pts_75"
    t.decimal "ra_drb"
    t.decimal "ra_dtov"
    t.decimal "ra_orb"
    t.decimal "reb"
    t.decimal "reb_75"
    t.text "region"
    t.decimal "rim_freq"
    t.text "role_defense"
    t.text "role_offense_archetype"
    t.text "role_offense_primary"
    t.text "role_offense_secondary"
    t.integer "season", null: false
    t.decimal "sf_pct"
    t.decimal "sg_pct"
    t.decimal "shot_quality"
    t.text "size_grade"
    t.text "slug"
    t.decimal "stl"
    t.decimal "stl_75"
    t.decimal "stl_pct"
    t.decimal "talent_level"
    t.text "team"
    t.decimal "team_dreb"
    t.decimal "touches"
    t.decimal "tov"
    t.decimal "tov_75"
    t.decimal "tov_pct"
    t.decimal "tov_pct_creation"
    t.decimal "ts"
    t.decimal "ts_rel"
    t.decimal "usg"
    t.decimal "value_a"
    t.decimal "value_freq"
    t.decimal "value_gr"
    t.decimal "versatility_rating"
    t.decimal "vorp"
    t.decimal "weight"
    t.decimal "wingspan"
    t.decimal "ws"
  end

  create_table "delancey_place", id: :integer, default: nil, force: :cascade do |t|
    t.timestamptz "ai_last_judged_at"
    t.integer "ai_last_score"
    t.integer "ai_score_count", default: 0, null: false
    t.virtual "ai_score_mean", type: :decimal, as: "\nCASE\n    WHEN (ai_score_count > 0) THEN round((ai_score_sum / (ai_score_count)::numeric), 2)\n    ELSE NULL::numeric\nEND", stored: true
    t.decimal "ai_score_sum", default: "0.0", null: false
    t.date "blog_date"
    t.text "body"
    t.text "book_author"
    t.text "book_date"
    t.text "book_pages"
    t.text "book_publisher"
    t.text "book_title"
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "tags", default: [], null: false, array: true
    t.text "title"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "documents", primary_key: "title", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "notes"
    t.jsonb "pages"
    t.jsonb "tags"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "dx_mock_drafts", primary_key: "draft_year", id: :integer, default: nil, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.timestamptz "updated_at"
  end

  create_table "dx_mock_snapshots", id: :serial, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.integer "draft_year"
    t.date "snapshot_date", default: -> { "CURRENT_DATE" }
    t.index ["created_at"], name: "idx_mock_snapshots_created_at"
    t.index ["data"], name: "idx_mock_snapshots_data", using: :gin
    t.index ["draft_year"], name: "idx_mock_snapshots_draft_year"
    t.index ["snapshot_date"], name: "idx_mock_snapshots_date"
  end

  create_table "dx_top_100", primary_key: "draft_year", id: :integer, default: nil, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.timestamptz "updated_at"
  end

  create_table "fanduel_draft", id: false, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.integer "draft"
    t.serial "id", null: false
  end

  create_table "github", id: :serial, force: :cascade do |t|
    t.text "code"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.text "file_name"
    t.text "file_path"
    t.text "final_draft"
    t.text "insights"
    t.integer "interesting", default: [], null: false, array: true
    t.decimal "interesting_score", precision: 10, scale: 2
    t.text "notes"
    t.text "repo"
    t.text "revised_draft"
    t.text "rough_draft"
    t.timestamptz "updated_at", default: -> { "now()" }, null: false

    t.unique_constraint ["repo", "file_path"], name: "github_repo_file_path_key"
  end

  create_table "github_data_grid", id: :serial, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "insights"
    t.text "notes"
    t.jsonb "rank_code"
    t.decimal "rank_code_avg"
    t.text "repo"
    t.text "revised_code"
    t.text "rough_code"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "github_interesting", primary_key: "repo", id: :text, force: :cascade do |t|
    t.text "blurb"
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "data_grid"
    t.text "file_names"
    t.text "glob_path"
    t.text "interesting"
    t.text "repomix"
    t.jsonb "tags"
    t.timestamptz "updated_at"
  end

  create_table "github_railway", primary_key: ["repo", "file_name"], force: :cascade do |t|
    t.boolean "archived"
    t.text "branch"
    t.text "content"
    t.timestamptz "created_at"
    t.text "description"
    t.text "file_name", null: false
    t.integer "forks"
    t.text "git_url"
    t.text "language"
    t.integer "open_issues"
    t.timestamptz "pushed_at"
    t.text "repo", null: false
    t.text "repo_name"
    t.integer "stargazers"
    t.timestamptz "updated_at"
    t.text "url"
    t.text "user_name"
    t.integer "watchers"
  end

  create_table "gleague_schedule", primary_key: "season_id", id: :text, force: :cascade do |t|
    t.timestamptz "created_at"
    t.jsonb "data"
    t.bigint "year"
  end

  create_table "gm_to_nba", primary_key: "nba_id", id: :integer, default: nil, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.integer "gm_id"
    t.text "notes"
    t.index ["gm_id"], name: "idx_nba_realgm_id"
  end

  create_table "gm_trade_deadline_model", primary_key: "gm_id", id: :integer, default: nil, force: :cascade do |t|
    t.decimal "gm_age"
    t.text "gm_player"
    t.text "gm_team"
    t.decimal "model"
  end

  create_table "gsoc", id: :serial, force: :cascade do |t|
    t.text "category"
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.text "description"
    t.decimal "lat"
    t.text "location"
    t.decimal "lon"
    t.timestamptz "occurred_at"
    t.text "severity"
    t.text "source"
    t.text "source_id"
    t.text "title"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.text "url"
  end

  create_table "kagi", primary_key: "search_term", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.timestamptz "updated_at"
  end

  create_table "nba_all_games", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.text "arena_city"
    t.text "arena_name"
    t.text "arena_state"
    t.integer "away_id"
    t.integer "away_losses"
    t.text "away_team"
    t.decimal "away_win_pct"
    t.integer "away_wins"
    t.jsonb "data"
    t.text "game_code"
    t.date "game_date"
    t.timestamptz "game_start_time"
    t.integer "game_status_code"
    t.text "game_status_text"
    t.integer "home_id"
    t.integer "home_losses"
    t.text "home_team"
    t.decimal "home_win_pct"
    t.integer "home_wins"
    t.integer "score_away"
    t.integer "score_diff"
    t.integer "score_home"
    t.integer "season_id"
    t.text "season_type"
    t.text "season_year"
    t.integer "year"
    t.index ["away_id"], name: "idx_nba_all_games_by_away_id"
    t.index ["game_date"], name: "idx_nba_all_games_by_date"
    t.index ["home_id"], name: "idx_nba_all_games_by_home_id"
    t.index ["season_id"], name: "idx_nba_all_games_by_season_id"
    t.index ["season_type"], name: "idx_nba_all_games_by_season_type"
    t.index ["year"], name: "idx_nba_all_games_by_year"
  end

  create_table "nba_arenas", primary_key: "arena_id", id: :bigint, default: nil, force: :cascade do |t|
    t.text "arena_name"
    t.text "city"
    t.text "country"
    t.text "league_code"
    t.text "state"
    t.text "timezone"
  end

  create_table "nba_box", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.integer "arena_id"
    t.text "arena_name"
    t.integer "attendance"
    t.integer "away_ast"
    t.decimal "away_ast_tov"
    t.integer "away_bench_pts"
    t.integer "away_biggest_lead"
    t.integer "away_biggest_run"
    t.integer "away_blk"
    t.integer "away_blkd"
    t.jsonb "away_dnp"
    t.integer "away_dreb"
    t.virtual "away_efg", type: :decimal, as: "\nCASE\n    WHEN (away_fga = 0) THEN NULL::numeric\n    ELSE round((((away_fgm)::numeric + (0.5 * (away_fg3m)::numeric)) / (away_fga)::numeric), 4)\nEND", stored: true
    t.integer "away_fast_break_pts"
    t.virtual "away_fg2_pct", type: :decimal, as: "\nCASE\n    WHEN ((away_fga - away_fg3a) = 0) THEN NULL::numeric\n    ELSE round((((away_fgm - away_fg3m))::numeric / (NULLIF((away_fga - away_fg3a), 0))::numeric), 4)\nEND", stored: true
    t.virtual "away_fg2a", type: :integer, as: "\nCASE\n    WHEN ((away_fga IS NULL) OR (away_fg3a IS NULL)) THEN NULL::integer\n    ELSE (away_fga - away_fg3a)\nEND", stored: true
    t.virtual "away_fg2m", type: :integer, as: "\nCASE\n    WHEN ((away_fgm IS NULL) OR (away_fg3m IS NULL)) THEN NULL::integer\n    ELSE (away_fgm - away_fg3m)\nEND", stored: true
    t.decimal "away_fg3_pct"
    t.decimal "away_fg3_rate"
    t.integer "away_fg3a"
    t.integer "away_fg3m"
    t.decimal "away_fg_pct"
    t.integer "away_fga"
    t.integer "away_fgm"
    t.integer "away_fouls"
    t.integer "away_fouls_drawn"
    t.decimal "away_ft_pct"
    t.integer "away_fta"
    t.integer "away_ftm"
    t.decimal "away_gfg"
    t.integer "away_id"
    t.integer "away_in_paint_pts"
    t.integer "away_lead_changes"
    t.integer "away_minutes"
    t.integer "away_oreb"
    t.integer "away_plus_minus"
    t.integer "away_pts"
    t.integer "away_pts_off_tov"
    t.integer "away_reb"
    t.integer "away_reb_personal"
    t.integer "away_reb_team"
    t.integer "away_second_chance_pts"
    t.integer "away_stl"
    t.text "away_team"
    t.integer "away_tied"
    t.integer "away_tov"
    t.integer "away_tov_team"
    t.integer "away_tov_total"
    t.virtual "away_ts", type: :decimal, as: "\nCASE\n    WHEN (((away_fga)::numeric + (0.44 * (away_fta)::numeric)) = (0)::numeric) THEN NULL::numeric\n    ELSE round(((away_pts)::numeric / ((2)::numeric * ((away_fga)::numeric + (0.44 * (away_fta)::numeric)))), 4)\nEND", stored: true
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.jsonb "end_of_quarter"
    t.date "game_date"
    t.integer "home_ast"
    t.decimal "home_ast_tov"
    t.integer "home_bench_pts"
    t.integer "home_biggest_lead"
    t.integer "home_biggest_run"
    t.integer "home_blk"
    t.integer "home_blkd"
    t.jsonb "home_dnp"
    t.integer "home_dreb"
    t.virtual "home_efg", type: :decimal, as: "\nCASE\n    WHEN (home_fga = 0) THEN NULL::numeric\n    ELSE round((((home_fgm)::numeric + (0.5 * (home_fg3m)::numeric)) / (home_fga)::numeric), 4)\nEND", stored: true
    t.integer "home_fast_break_pts"
    t.virtual "home_fg2_pct", type: :decimal, as: "\nCASE\n    WHEN ((home_fga - home_fg3a) = 0) THEN NULL::numeric\n    ELSE round((((home_fgm - home_fg3m))::numeric / (NULLIF((home_fga - home_fg3a), 0))::numeric), 4)\nEND", stored: true
    t.virtual "home_fg2a", type: :integer, as: "\nCASE\n    WHEN ((home_fga IS NULL) OR (home_fg3a IS NULL)) THEN NULL::integer\n    ELSE (home_fga - home_fg3a)\nEND", stored: true
    t.virtual "home_fg2m", type: :integer, as: "\nCASE\n    WHEN ((home_fgm IS NULL) OR (home_fg3m IS NULL)) THEN NULL::integer\n    ELSE (home_fgm - home_fg3m)\nEND", stored: true
    t.decimal "home_fg3_pct"
    t.decimal "home_fg3_rate"
    t.integer "home_fg3a"
    t.integer "home_fg3m"
    t.decimal "home_fg_pct"
    t.integer "home_fga"
    t.integer "home_fgm"
    t.integer "home_fouls"
    t.integer "home_fouls_drawn"
    t.decimal "home_ft_pct"
    t.integer "home_fta"
    t.integer "home_ftm"
    t.decimal "home_gfg"
    t.integer "home_id"
    t.integer "home_in_paint_pts"
    t.integer "home_lead_changes"
    t.integer "home_minutes"
    t.integer "home_oreb"
    t.integer "home_plus_minus"
    t.integer "home_pts"
    t.integer "home_pts_off_tov"
    t.integer "home_reb"
    t.integer "home_reb_personal"
    t.integer "home_reb_team"
    t.integer "home_second_chance_pts"
    t.integer "home_stl"
    t.text "home_team"
    t.integer "home_tied"
    t.integer "home_tov"
    t.integer "home_tov_team"
    t.integer "home_tov_total"
    t.virtual "home_ts", type: :decimal, as: "\nCASE\n    WHEN (((home_fga)::numeric + (0.44 * (home_fta)::numeric)) = (0)::numeric) THEN NULL::numeric\n    ELSE round(((home_pts)::numeric / ((2)::numeric * ((home_fga)::numeric + (0.44 * (home_fta)::numeric)))), 4)\nEND", stored: true
    t.boolean "is_sellout"
    t.jsonb "officials"
    t.integer "periods"
    t.integer "season"
    t.text "season_id"
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
  end

  create_table "nba_box_advanced", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.integer "attendance"
    t.decimal "away_ast_pct"
    t.decimal "away_ast_ratio"
    t.decimal "away_ast_tov"
    t.integer "away_bench_pts"
    t.integer "away_biggest_lead"
    t.integer "away_biggest_run"
    t.decimal "away_dreb_pct"
    t.decimal "away_drtg"
    t.decimal "away_efg"
    t.integer "away_fast_break_pts"
    t.integer "away_id"
    t.integer "away_lead_changes"
    t.decimal "away_net"
    t.decimal "away_oreb_pct"
    t.decimal "away_ortg"
    t.integer "away_paint_pts"
    t.integer "away_poss"
    t.integer "away_pts_off_tov"
    t.decimal "away_reb_pct"
    t.integer "away_reb_total"
    t.integer "away_second_chance_pts"
    t.text "away_team"
    t.integer "away_tied"
    t.decimal "away_tov_pct"
    t.decimal "away_ts"
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.date "game_date"
    t.decimal "home_ast_pct"
    t.decimal "home_ast_ratio"
    t.decimal "home_ast_tov"
    t.integer "home_bench_pts"
    t.integer "home_biggest_lead"
    t.integer "home_biggest_run"
    t.decimal "home_dreb_pct"
    t.decimal "home_drtg"
    t.decimal "home_efg"
    t.integer "home_fast_break_pts"
    t.integer "home_id"
    t.integer "home_lead_changes"
    t.decimal "home_net"
    t.decimal "home_oreb_pct"
    t.decimal "home_ortg"
    t.integer "home_paint_pts"
    t.integer "home_poss"
    t.integer "home_pts_off_tov"
    t.decimal "home_reb_pct"
    t.integer "home_reb_total"
    t.integer "home_second_chance_pts"
    t.text "home_team"
    t.integer "home_tied"
    t.decimal "home_tov_pct"
    t.decimal "home_ts"
    t.integer "periods"
    t.integer "season"
    t.text "season_id"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index ["game_date"], name: "idx_nba_box_advanced_date"
  end

  create_table "nba_coach_assoc", id: :text, force: :cascade do |t|
    t.text "bad_intel"
    t.text "biography"
    t.date "birthday"
    t.text "claude_v3"
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }
    t.jsonb "data", null: false
    t.jsonb "education"
    t.text "experience"
    t.text "full_name"
    t.text "hometown"
    t.boolean "is_front_bench"
    t.integer "nba_id"
    t.text "position"
    t.text "team"
    t.jsonb "teams"
    t.timestamptz "updated_at", default: -> { "CURRENT_TIMESTAMP" }
    t.text "web_search"
  end

  create_table "nba_day_in_history", id: :integer, default: nil, force: :cascade do |t|
    t.text "content"
    t.date "date"
    t.date "history"
    t.boolean "is_portland"
    t.boolean "is_timeless"
    t.text "link"
    t.text "month_day"
  end

  create_table "nba_dev_team_stats", primary_key: ["season", "team_id", "per_mode"], force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }
    t.jsonb "data", null: false
    t.virtual "league_id", type: :text, as: "(data ->> 'leagueId'::text)", stored: true
    t.virtual "per_mode", type: :text, null: false, as: "(data ->> 'perMode'::text)", stored: true
    t.virtual "season", type: :text, null: false, as: "(data ->> 'season'::text)", stored: true
    t.integer "season_id"
    t.virtual "season_type", type: :text, as: "(data ->> 'seasonType'::text)", stored: true
    t.virtual "team_code", type: :text, as: "(data ->> 'teamAbbreviation'::text)", stored: true
    t.virtual "team_id", type: :integer, null: false, as: "((data ->> 'teamId'::text))::integer", stored: true
    t.timestamptz "updated_at"
  end

  create_table "nba_dnp", primary_key: ["game_id", "nba_id"], force: :cascade do |t|
    t.text "active_status"
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "dnp_category"
    t.text "dnp_description"
    t.text "dnp_reason"
    t.text "first_name"
    t.date "game_date", null: false
    t.text "game_id", null: false
    t.boolean "is_away", null: false
    t.boolean "is_home", null: false
    t.text "jersey_num"
    t.text "last_name"
    t.integer "nba_id", null: false
    t.text "player"
    t.integer "season", null: false
    t.text "season_id", null: false
    t.text "team_code", null: false
    t.integer "team_id", null: false
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index ["dnp_category"], name: "idx_nba_dnp_reason_category"
    t.index ["game_date"], name: "idx_nba_dnp_game_date"
    t.index ["nba_id"], name: "idx_nba_dnp_nba_id"
    t.index ["season", "nba_id"], name: "idx_nba_dnp_season_player"
    t.index ["season", "team_id"], name: "idx_nba_dnp_season_team"
    t.index ["season"], name: "idx_nba_dnp_season"
    t.index ["team_id"], name: "idx_nba_dnp_team_id"
  end

  create_table "nba_games", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.text "arena_city"
    t.text "arena_name"
    t.text "arena_state"
    t.text "away_city"
    t.integer "away_id"
    t.integer "away_losses"
    t.text "away_name"
    t.integer "away_seed"
    t.text "away_team"
    t.integer "away_wins"
    t.jsonb "broadcasters"
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "day_of_week"
    t.text "game_code"
    t.date "game_date"
    t.timestamptz "game_date_est"
    t.timestamptz "game_date_utc"
    t.integer "game_duration_seconds"
    t.timestamptz "game_end_actual"
    t.text "game_label"
    t.integer "game_sequence"
    t.timestamptz "game_start_actual"
    t.integer "game_status"
    t.text "game_status_text"
    t.text "game_sublabel"
    t.text "game_subtype"
    t.text "game_type"
    t.text "home_city"
    t.integer "home_id"
    t.integer "home_losses"
    t.text "home_name"
    t.integer "home_seed"
    t.text "home_team"
    t.integer "home_wins"
    t.boolean "if_necessary"
    t.boolean "is_home_winner"
    t.boolean "is_neutral_site"
    t.boolean "is_postseason"
    t.boolean "is_regular_season"
    t.integer "month_num"
    t.jsonb "points_leaders"
    t.text "postponed_status"
    t.integer "score_away"
    t.integer "score_home"
    t.integer "season"
    t.text "season_id"
    t.text "series_conference"
    t.text "series_game_number"
    t.text "series_text"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.integer "week_number"
    t.text "winner"
    t.integer "winner_id"
    t.index ["away_id"], name: "idx_nba_games_away_id"
    t.index ["away_team"], name: "idx_nba_games_away_team"
    t.index ["game_date"], name: "idx_nba_games_game_date"
    t.index ["game_status"], name: "idx_nba_games_status"
    t.index ["game_status_text"], name: "idx_nba_games_status_text"
    t.index ["home_id"], name: "idx_nba_games_home_id"
    t.index ["home_team"], name: "idx_nba_games_home_team"
    t.index ["is_regular_season"], name: "idx_nba_games_regular_season"
    t.index ["season"], name: "idx_nba_games_season"
    t.index ["season_id"], name: "idx_nba_games_season_id"
    t.index ["winner"], name: "idx_nba_games_winner"
    t.index ["winner_id"], name: "idx_nba_games_winner_id"
  end

  create_table "nba_injury_snapshots", primary_key: "snapshot_id", id: :bigint, default: nil, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.text "error_details"
    t.boolean "success"
    t.index ["data"], name: "idx_injury_data", using: :gin
  end

  create_table "nba_live_stats", primary_key: ["game_id", "segment"], force: :cascade do |t|
    t.text "arena_city"
    t.text "arena_name"
    t.text "arena_state"
    t.integer "away_arc_att"
    t.integer "away_arc_made"
    t.decimal "away_arc_pct"
    t.decimal "away_arc_rate"
    t.decimal "away_bench_minutes"
    t.decimal "away_bench_net"
    t.integer "away_bench_pts"
    t.integer "away_biggest_run_net"
    t.integer "away_clutch_fga"
    t.integer "away_clutch_fgm"
    t.decimal "away_clutch_ortg"
    t.integer "away_clutch_poss"
    t.integer "away_clutch_pts"
    t.integer "away_clutch_shots"
    t.integer "away_clutch_stops"
    t.integer "away_clutch_tov"
    t.text "away_code"
    t.integer "away_corner_att"
    t.integer "away_corner_made"
    t.decimal "away_corner_pct"
    t.decimal "away_corner_rate"
    t.integer "away_dreb"
    t.decimal "away_drtg"
    t.decimal "away_fg2_pct"
    t.integer "away_fg2a"
    t.integer "away_fg2m"
    t.integer "away_fg3_oreb"
    t.integer "away_fg3_oreb_opps"
    t.decimal "away_fg3_pct"
    t.integer "away_fg3a"
    t.decimal "away_fg3a_rate"
    t.integer "away_fg3m"
    t.integer "away_floater_att"
    t.integer "away_floater_made"
    t.decimal "away_floater_pct"
    t.decimal "away_floater_rate"
    t.decimal "away_ft_pct"
    t.integer "away_fta"
    t.integer "away_ftm"
    t.decimal "away_ftr"
    t.integer "away_id"
    t.integer "away_kills_3"
    t.integer "away_kills_4"
    t.integer "away_kills_5"
    t.integer "away_kills_6"
    t.integer "away_kills_7"
    t.integer "away_kills_8_plus"
    t.integer "away_kills_delta"
    t.integer "away_kills_pi"
    t.text "away_largest_lead_clock"
    t.integer "away_largest_lead_period"
    t.integer "away_largest_lead_pts"
    t.integer "away_losses"
    t.integer "away_mid_att"
    t.integer "away_mid_made"
    t.decimal "away_mid_pct"
    t.decimal "away_mid_rate"
    t.decimal "away_net"
    t.integer "away_oreb"
    t.decimal "away_ortg"
    t.integer "away_poss"
    t.integer "away_pts"
    t.integer "away_rim_att"
    t.integer "away_rim_made"
    t.decimal "away_rim_pct"
    t.decimal "away_rim_rate"
    t.integer "away_runs_count"
    t.integer "away_score"
    t.integer "away_second_chance_pts"
    t.decimal "away_starter_minutes"
    t.decimal "away_starter_net"
    t.integer "away_starter_pts"
    t.decimal "away_time_leading"
    t.integer "away_tov"
    t.decimal "away_tov_pct"
    t.integer "away_transition_poss"
    t.integer "away_transition_pts"
    t.integer "away_transition_tov"
    t.decimal "away_win_pct"
    t.integer "away_wins"
    t.text "clock"
    t.jsonb "clutch_player_onoff"
    t.text "clutch_start_clock"
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "game_code"
    t.date "game_date"
    t.text "game_id", null: false
    t.timestamptz "game_start_time"
    t.integer "home_arc_att"
    t.integer "home_arc_made"
    t.decimal "home_arc_pct"
    t.decimal "home_arc_rate"
    t.decimal "home_bench_minutes"
    t.decimal "home_bench_net"
    t.integer "home_bench_pts"
    t.integer "home_biggest_run_net"
    t.integer "home_clutch_fga"
    t.integer "home_clutch_fgm"
    t.decimal "home_clutch_ortg"
    t.integer "home_clutch_poss"
    t.integer "home_clutch_pts"
    t.integer "home_clutch_shots"
    t.integer "home_clutch_stops"
    t.integer "home_clutch_tov"
    t.text "home_code"
    t.integer "home_corner_att"
    t.integer "home_corner_made"
    t.decimal "home_corner_pct"
    t.decimal "home_corner_rate"
    t.integer "home_dreb"
    t.decimal "home_drtg"
    t.decimal "home_fg2_pct"
    t.integer "home_fg2a"
    t.integer "home_fg2m"
    t.integer "home_fg3_oreb"
    t.integer "home_fg3_oreb_opps"
    t.decimal "home_fg3_pct"
    t.integer "home_fg3a"
    t.decimal "home_fg3a_rate"
    t.integer "home_fg3m"
    t.integer "home_floater_att"
    t.integer "home_floater_made"
    t.decimal "home_floater_pct"
    t.decimal "home_floater_rate"
    t.decimal "home_ft_pct"
    t.integer "home_fta"
    t.integer "home_ftm"
    t.decimal "home_ftr"
    t.integer "home_id"
    t.integer "home_kills_3"
    t.integer "home_kills_4"
    t.integer "home_kills_5"
    t.integer "home_kills_6"
    t.integer "home_kills_7"
    t.integer "home_kills_8_plus"
    t.integer "home_kills_delta"
    t.integer "home_kills_pi"
    t.text "home_largest_lead_clock"
    t.integer "home_largest_lead_period"
    t.integer "home_largest_lead_pts"
    t.integer "home_losses"
    t.integer "home_mid_att"
    t.integer "home_mid_made"
    t.decimal "home_mid_pct"
    t.decimal "home_mid_rate"
    t.decimal "home_net"
    t.integer "home_oreb"
    t.decimal "home_ortg"
    t.integer "home_poss"
    t.integer "home_pts"
    t.integer "home_rim_att"
    t.integer "home_rim_made"
    t.decimal "home_rim_pct"
    t.decimal "home_rim_rate"
    t.integer "home_runs_count"
    t.integer "home_score"
    t.integer "home_second_chance_pts"
    t.decimal "home_starter_minutes"
    t.decimal "home_starter_net"
    t.integer "home_starter_pts"
    t.decimal "home_time_leading"
    t.integer "home_tov"
    t.decimal "home_tov_pct"
    t.integer "home_transition_poss"
    t.integer "home_transition_pts"
    t.integer "home_transition_tov"
    t.decimal "home_win_pct"
    t.integer "home_wins"
    t.boolean "is_clutch"
    t.integer "lead_changes"
    t.jsonb "lead_history"
    t.text "league_id"
    t.jsonb "lineup_stints"
    t.jsonb "officials"
    t.decimal "pace_avg_poss_seconds"
    t.decimal "pace_fastbreak_rate"
    t.decimal "pace_poss_per_48"
    t.decimal "pace_poss_per_minute"
    t.integer "periods"
    t.jsonb "player_minutes"
    t.jsonb "player_onoff"
    t.jsonb "rotation_patterns"
    t.jsonb "runs"
    t.jsonb "runs_with_timeout"
    t.integer "season"
    t.text "season_formatted"
    t.text "season_id"
    t.text "season_type"
    t.text "segment", default: "FULL", null: false
    t.text "status"
    t.jsonb "timeouts"
    t.integer "times_tied"
    t.decimal "times_tied_minutes"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.jsonb "validation"
  end

  create_table "nba_media_guide_staff", primary_key: ["season", "team_code"], force: :cascade do |t|
    t.jsonb "coaches"
    t.timestamptz "created_at", default: -> { "now()" }
    t.integer "is_alphabetical", limit: 2
    t.text "raw_text"
    t.integer "season", null: false
    t.jsonb "staff"
    t.text "team_code", null: false
  end

  create_table "nba_media_guides", primary_key: ["team", "season"], force: :cascade do |t|
    t.jsonb "biographies"
    t.jsonb "coaches"
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "markdown"
    t.integer "season", null: false
    t.text "team", null: false
    t.text "url"
  end

  create_table "nba_on_court", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.jsonb "data"
    t.index ["data"], name: "idx_nba_on_court_data", using: :gin
  end

  create_table "nba_pbp", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.jsonb "data"
  end

  create_table "nba_personnel", primary_key: "nba_id", id: :integer, default: nil, force: :cascade do |t|
    t.text "bio"
    t.text "birthday"
    t.timestamptz "created_at"
    t.jsonb "data"
    t.text "first_name"
    t.text "full_name"
    t.text "hometown"
    t.text "last_name"
    t.text "league"
    t.jsonb "on_roster"
    t.text "person_type"
    t.integer "recent_season"
    t.text "team"
    t.integer "team_id"
    t.timestamptz "updated_at"
    t.jsonb "wikipedia"
  end

  create_table "nba_personnel_games", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.decimal "absolute_spread"
    t.integer "actual_margin"
    t.decimal "actual_total_score"
    t.integer "attendance"
    t.decimal "away_ast_pct"
    t.decimal "away_ast_ratio"
    t.decimal "away_ast_to"
    t.integer "away_bench_pts"
    t.jsonb "away_coaches"
    t.decimal "away_cover_margin"
    t.decimal "away_dreb_pct"
    t.decimal "away_drtg"
    t.decimal "away_efg"
    t.integer "away_fast_break_pts"
    t.decimal "away_implied_total"
    t.integer "away_max_lead"
    t.decimal "away_net"
    t.decimal "away_oreb_pct"
    t.decimal "away_ortg"
    t.decimal "away_over_under_margin"
    t.integer "away_paint_pts"
    t.jsonb "away_players"
    t.integer "away_possessions"
    t.integer "away_pts_off_tov"
    t.decimal "away_reb_pct"
    t.integer "away_second_chance_pts"
    t.text "away_team"
    t.decimal "away_team_line"
    t.integer "away_team_score"
    t.integer "away_team_won", limit: 2
    t.decimal "away_tov_pct"
    t.decimal "away_ts"
    t.text "favorite"
    t.integer "favorite_covered", limit: 2
    t.date "game_date"
    t.decimal "game_over_under"
    t.decimal "home_ast_pct"
    t.decimal "home_ast_ratio"
    t.decimal "home_ast_to"
    t.integer "home_bench_pts"
    t.jsonb "home_coaches"
    t.decimal "home_cover_margin"
    t.decimal "home_dreb_pct"
    t.decimal "home_drtg"
    t.decimal "home_efg"
    t.integer "home_fast_break_pts"
    t.decimal "home_implied_total"
    t.integer "home_max_lead"
    t.decimal "home_net"
    t.decimal "home_oreb_pct"
    t.decimal "home_ortg"
    t.decimal "home_over_under_margin"
    t.integer "home_paint_pts"
    t.jsonb "home_players"
    t.integer "home_possessions"
    t.integer "home_pts_off_tov"
    t.decimal "home_reb_pct"
    t.integer "home_second_chance_pts"
    t.text "home_team"
    t.decimal "home_team_line"
    t.integer "home_team_score"
    t.integer "home_team_won", limit: 2
    t.decimal "home_tov_pct"
    t.decimal "home_ts"
    t.integer "over_hit", limit: 2
    t.integer "periods"
    t.decimal "total_over_under_margin"
    t.integer "under_hit", limit: 2
    t.integer "underdog_covered", limit: 2
    t.decimal "vegas_line"
    t.index ["game_date"], name: "idx_nba_personnel_games_date"
  end

  create_table "nba_personnel_metrics", primary_key: ["metric", "half_life"], force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }
    t.jsonb "data", null: false
    t.virtual "half_life", type: :decimal, null: false, as: "(((data -> 'parameters'::text) ->> 'half_life'::text))::numeric", stored: true
    t.virtual "metric", type: :text, null: false, as: "(data ->> 'metric'::text)", stored: true
    t.virtual "model_r2", type: :decimal, as: "((data ->> 'model_r2'::text))::numeric", stored: true
    t.timestamptz "updated_at"
  end

  create_table "nba_personnel_metrics_v2", primary_key: ["metric", "half_life"], force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "CURRENT_TIMESTAMP" }
    t.jsonb "data", null: false
    t.virtual "half_life", type: :decimal, null: false, as: "(((data -> 'parameters'::text) ->> 'half_life'::text))::numeric", stored: true
    t.virtual "metric", type: :text, null: false, as: "(data ->> 'metric'::text)", stored: true
    t.virtual "model_r2", type: :decimal, as: "((data ->> 'model_r2'::text))::numeric", stored: true
    t.timestamptz "updated_at"
  end

  create_table "nba_player_minutes", id: false, force: :cascade do |t|
    t.integer "minutes"
    t.integer "nba_id", null: false
    t.text "player_name"
    t.integer "season", null: false
    t.index ["nba_id", "season"], name: "idx_nba_season", unique: true
  end

  create_table "nba_players", primary_key: "nba_id", id: :integer, default: nil, force: :cascade do |t|
    t.decimal "age"
    t.text "blitz_id"
    t.timestamptz "created_at", default: -> { "now()" }
    t.integer "ctg_id"
    t.text "ctg_pro_id"
    t.date "dob"
    t.integer "draft_pick"
    t.integer "draft_round"
    t.integer "draft_team_id"
    t.integer "draft_year"
    t.text "first_name"
    t.text "full_name"
    t.integer "gm_id"
    t.decimal "height"
    t.text "height_formatted"
    t.integer "hp_id"
    t.text "initials"
    t.boolean "is_early_entry"
    t.boolean "is_two_way"
    t.text "last_name"
    t.text "player_status"
    t.text "primary_position"
    t.text "record_status"
    t.text "roster_name"
    t.integer "roto_id"
    t.integer "school_id"
    t.text "school_name"
    t.text "sr_id"
    t.text "stats_name"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.integer "weight"
    t.integer "yos"
  end

  create_table "nba_preseason_odds", primary_key: ["season", "team_code"], force: :cascade do |t|
    t.text "bucket"
    t.decimal "implied_prob"
    t.boolean "is_over"
    t.boolean "is_under"
    t.integer "losses"
    t.decimal "losses_82"
    t.decimal "market_share"
    t.integer "odds"
    t.decimal "over_under"
    t.integer "season", null: false
    t.text "season_code"
    t.text "source_url"
    t.text "team_code", null: false
    t.text "team_name"
    t.integer "wins"
    t.decimal "wins_82"
  end

  create_table "nba_rapm_current", primary_key: "nba_id", id: :integer, default: nil, force: :cascade do |t|
    t.decimal "drapm_darko"
    t.decimal "drapm_rank_darko"
    t.decimal "drapm_rank_timedecay"
    t.decimal "drapm_timedecay"
    t.decimal "five_year_drapm"
    t.decimal "five_year_drapm_rank"
    t.decimal "five_year_orapm"
    t.decimal "five_year_orapm_rank"
    t.decimal "five_year_rapm"
    t.decimal "five_year_rapm_rank"
    t.decimal "four_year_drapm"
    t.decimal "four_year_drapm_rank"
    t.decimal "four_year_orapm"
    t.decimal "four_year_orapm_rank"
    t.decimal "four_year_rapm"
    t.decimal "four_year_rapm_rank"
    t.decimal "orapm_darko"
    t.decimal "orapm_rank_darko"
    t.decimal "orapm_rank_timedecay"
    t.decimal "orapm_timedecay"
    t.text "player"
    t.text "position"
    t.decimal "rapm_darko"
    t.decimal "rapm_rank_darko"
    t.decimal "rapm_rank_timedecay"
    t.decimal "rapm_timedecay"
    t.text "team"
    t.decimal "three_year_drapm"
    t.decimal "three_year_drapm_rank"
    t.decimal "three_year_orapm"
    t.decimal "three_year_orapm_rank"
    t.decimal "three_year_rapm"
    t.decimal "three_year_rapm_rank"
    t.decimal "two_year_drapm"
    t.decimal "two_year_drapm_rank"
    t.decimal "two_year_orapm"
    t.decimal "two_year_orapm_rank"
    t.decimal "two_year_rapm"
    t.decimal "two_year_rapm_rank"
  end

  create_table "nba_raptor", primary_key: ["raptor_id", "season"], force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.integer "mp"
    t.integer "nba_id"
    t.text "player"
    t.text "position"
    t.integer "poss"
    t.decimal "raptor"
    t.decimal "raptor_defense"
    t.decimal "raptor_defense_pctl"
    t.decimal "raptor_defense_rank"
    t.text "raptor_id", null: false
    t.decimal "raptor_offense"
    t.decimal "raptor_offense_pctl"
    t.decimal "raptor_offense_rank"
    t.decimal "raptor_pctl"
    t.decimal "raptor_rank"
    t.integer "season", null: false
    t.timestamptz "updated_at", default: -> { "now()" }
    t.decimal "war"
    t.decimal "war_pctl"
    t.decimal "war_rank"
  end

  create_table "nba_referees", primary_key: "referee", id: :text, force: :cascade do |t|
    t.integer "actual_game_count"
    t.integer "experience"
    t.text "favorite"
    t.integer "games"
    t.integer "is_active", limit: 2, default: 0
    t.integer "nba_id"
    t.jsonb "nbra_data"
    t.text "photo"
    t.text "pronunciation"
    t.text "write_up"
    t.index ["nba_id"], name: "nba_referees_nba_id"
  end

  create_table "nba_roster_lineups", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
  end

  create_table "nba_rosters", primary_key: ["season", "team_id"], force: :cascade do |t|
    t.jsonb "coaches"
    t.timestamptz "created_at"
    t.jsonb "players"
    t.integer "season", null: false
    t.integer "season_id"
    t.text "team_code"
    t.integer "team_id", null: false
  end

  create_table "nba_schedule", primary_key: "season_id", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.bigint "year"
  end

  create_table "nba_season_types", primary_key: "season_id", id: :text, force: :cascade do |t|
    t.text "league_code"
    t.text "season_name", null: false
    t.text "season_type"
    t.bigint "year"
  end

  create_table "nba_staff", primary_key: ["season", "team", "full_name", "title"], force: :cascade do |t|
    t.text "email"
    t.text "first_name"
    t.text "full_name", null: false
    t.text "last_name"
    t.text "mobile_phone"
    t.text "office_phone"
    t.integer "season", null: false
    t.text "season_formatted"
    t.text "team", null: false
    t.text "team_code"
    t.text "title", null: false
    t.index ["last_name"], name: "idx_nba_staff_last_name"
    t.index ["season"], name: "idx_nba_staff_season"
    t.index ["team_code"], name: "idx_nba_staff_team"
  end

  create_table "nba_standings", primary_key: ["season_id", "team_id"], force: :cascade do |t|
    t.text "ahead_at_half"
    t.text "ahead_at_third"
    t.text "apr"
    t.text "aug"
    t.text "behind_at_half"
    t.text "behind_at_third"
    t.text "clinch_indicator"
    t.integer "clinched_conference"
    t.integer "clinched_division"
    t.integer "clinched_play_in"
    t.integer "clinched_playoffs"
    t.text "conference"
    t.decimal "conference_games_back"
    t.text "conference_record"
    t.datetime "created_at", precision: nil
    t.integer "current_home_streak"
    t.text "current_home_streak_text"
    t.integer "current_road_streak"
    t.text "current_road_streak_text"
    t.integer "current_streak"
    t.text "current_streak_text"
    t.text "dec"
    t.decimal "diff_pts_pg"
    t.text "division"
    t.decimal "division_games_back"
    t.integer "division_rank"
    t.text "division_record"
    t.integer "eliminated_conference"
    t.integer "eliminated_division"
    t.integer "eliminated_playoffs"
    t.integer "eliminated_postseason"
    t.text "feb"
    t.text "fewer_turnovers"
    t.text "home"
    t.text "jan"
    t.text "jul"
    t.text "jun"
    t.text "last_10"
    t.text "last_10_home"
    t.text "last_10_road"
    t.text "lead_in_fg_pct"
    t.text "lead_in_reb"
    t.decimal "league_games_back"
    t.integer "league_rank"
    t.integer "long_home_streak"
    t.text "long_home_streak_text"
    t.integer "long_loss_streak"
    t.integer "long_road_streak"
    t.text "long_road_streak_text"
    t.integer "long_win_streak"
    t.integer "losses"
    t.text "mar"
    t.text "may"
    t.text "neutral"
    t.text "nov"
    t.text "oct"
    t.text "opp_over_500"
    t.decimal "opp_points_pg"
    t.text "opp_score_100_pts"
    t.integer "playoff_rank"
    t.integer "playoff_seeding"
    t.decimal "points_pg"
    t.text "record"
    t.text "road"
    t.text "score_100_pts"
    t.text "season_id", null: false
    t.text "sep"
    t.integer "sort_order"
    t.text "team"
    t.text "team_city"
    t.integer "team_id", null: false
    t.text "team_name"
    t.text "team_slug"
    t.text "ten_pts_or_more"
    t.text "three_pts_or_less"
    t.text "tied_at_half"
    t.text "tied_at_third"
    t.text "vs_atlantic"
    t.text "vs_central"
    t.text "vs_east"
    t.text "vs_northwest"
    t.text "vs_pacific"
    t.text "vs_southeast"
    t.text "vs_southwest"
    t.text "vs_west"
    t.decimal "win_pct"
    t.integer "wins"
    t.integer "year"
  end

  create_table "nba_team_colors", primary_key: "team_id", id: :integer, default: nil, force: :cascade do |t|
    t.integer "established"
    t.text "primary_color"
    t.text "secondary_color"
    t.text "team_code"
  end

  create_table "nba_team_staff", primary_key: ["season", "team", "full_name", "title"], force: :cascade do |t|
    t.text "background"
    t.timestamptz "created_at", default: -> { "now()" }
    t.date "dob"
    t.text "email"
    t.text "first_name"
    t.text "full_name", null: false
    t.text "hometown"
    t.text "last_name"
    t.text "mobile_phone"
    t.integer "nba_id"
    t.text "notes"
    t.text "office_phone"
    t.integer "season", null: false
    t.text "season_formatted"
    t.jsonb "tags"
    t.text "team", null: false
    t.text "team_code"
    t.text "title", null: false
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index ["first_name"], name: "idx_nba_team_staff_first_name"
    t.index ["full_name"], name: "idx_nba_team_staff_full_name"
    t.index ["last_name"], name: "idx_nba_team_staff_last_name"
    t.index ["season"], name: "idx_nba_team_staff_season"
    t.index ["team_code"], name: "idx_nba_team_staff_team_code"
    t.index ["title"], name: "idx_nba_team_staff_title"
  end

  create_table "nba_teams", primary_key: "team_id", id: :integer, default: nil, force: :cascade do |t|
    t.integer "is_nba", limit: 2
    t.text "team_city"
    t.text "team_code"
    t.text "team_mascot"
  end

  create_table "nba_tidbits", id: :integer, default: nil, force: :cascade do |t|
    t.text "content"
    t.date "date"
    t.text "description"
    t.text "link"
  end

  create_table "nba_trade_deadline_dates", primary_key: "season_id", id: :text, force: :cascade do |t|
    t.integer "season"
    t.date "trade_deadline"
  end

  create_table "ncaa_247sports", id: :integer, default: nil, force: :cascade do |t|
    t.text "alternate_logo_url"
    t.integer "asset_key"
    t.text "author"
    t.text "author_url"
    t.text "content"
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.text "image_url"
    t.text "label"
    t.text "logo_url"
    t.timestamptz "post_date"
    t.timestamptz "slack_at"
    t.text "slack_channel"
    t.text "slack_message"
    t.text "slug"
    t.text "sport"
    t.integer "sport_key"
    t.text "summary"
    t.text "title"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.boolean "vip"
    t.index ["post_date"], name: "idx_ncaa_247sports_post_date"
  end

  create_table "ncaa_rivals_news", id: :integer, default: nil, force: :cascade do |t|
    t.text "author"
    t.text "content"
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.text "featured_image"
    t.text "full_url"
    t.timestamptz "modified_date"
    t.timestamptz "post_date"
    t.text "primary_category"
    t.timestamptz "slack_at"
    t.text "slack_channel"
    t.text "slack_message"
    t.text "slug"
    t.text "summary"
    t.text "title"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index ["post_date"], name: "idx_ncaa_rivals_news_post_date"
  end

  create_table "ncaa_watchlist", primary_key: "player_id", id: :text, force: :cascade do |t|
    t.boolean "active", default: true
    t.timestamptz "created_at", default: -> { "now()" }
    t.date "dob"
    t.text "full_name"
    t.integer "gm_id"
    t.text "position"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "ngss_boxscores", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.date "game_date"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index "(((data -> 'awayTeam'::text) ->> 'teamTricode'::text))", name: "idx_ngss_boxscores_away_team"
    t.index "(((data -> 'homeTeam'::text) ->> 'teamTricode'::text))", name: "idx_ngss_boxscores_home_team"
    t.index ["game_date"], name: "idx_ngss_game_date"
  end

  create_table "ngss_challenges", primary_key: ["game_id", "action_number"], force: :cascade do |t|
    t.integer "action_number", null: false
    t.text "action_type"
    t.text "challenge_note"
    t.text "clock"
    t.text "description"
    t.text "descriptor"
    t.datetime "edited", precision: nil
    t.text "game_id", null: false
    t.boolean "is_target_score_last_period"
    t.integer "order_number"
    t.integer "period"
    t.integer "period_number"
    t.text "period_type"
    t.integer "possession"
    t.integer "previous_action"
    t.jsonb "qualifiers"
    t.integer "score_away"
    t.integer "score_home"
    t.text "season_id"
    t.text "shot_clock"
    t.text "sub_type"
    t.integer "success"
    t.text "team_code"
    t.integer "team_id"
    t.datetime "time_actual", precision: nil
    t.text "value"
    t.float "x"
    t.float "y"
    t.index ["season_id"], name: "idx_ngss_challenges_season_id"
    t.index ["team_code"], name: "idx_ngss_challenges_team_code"
    t.index ["team_id"], name: "idx_ngss_challenges_team_id"
  end

  create_table "ngss_pbp", primary_key: "game_id", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.timestamptz "updated_at", default: -> { "now()" }
    t.index "((data @? '$.\"actions\"[*]?(@.\"subType\" == \"challenge\" && @.\"actionType\" == \"instantreplay\")'::jsonpath))", name: "idx_ngss_pbp_has_challenge"
    t.index "jsonb_array_length((data -> 'actions'::text))", name: "idx_ngss_pbp_actions_count"
    t.index "jsonb_path_query_array(data, '$.\"actions\"[*]?(@.\"subType\" == \"challenge\" && @.\"actionType\" == \"instantreplay\")'::jsonpath)", name: "idx_ngss_pbp_challenges", using: :gin
    t.index ["created_at"], name: "idx_ngss_pbp_created_at"
    t.index ["updated_at"], name: "idx_ngss_pbp_updated_at"
  end

  create_table "ngss_persons", primary_key: "season_id", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.bigint "year"
    t.index ["data"], name: "idx_ngss_persons", using: :gin
  end

  create_table "ngss_standings", primary_key: ["league_code", "season_id", "team_id"], force: :cascade do |t|
    t.text "conference"
    t.decimal "conference_games_behind"
    t.integer "conference_losses"
    t.integer "conference_rank"
    t.integer "conference_wins"
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "division"
    t.integer "division_losses"
    t.integer "division_rank"
    t.integer "division_wins"
    t.integer "games"
    t.decimal "games_behind"
    t.integer "home_losses"
    t.integer "home_wins"
    t.integer "last10_losses"
    t.integer "last10_wins"
    t.text "league_code", null: false
    t.integer "league_rank"
    t.integer "losses"
    t.integer "road_losses"
    t.integer "road_wins"
    t.text "season_id", null: false
    t.integer "streak"
    t.text "team_city", null: false
    t.integer "team_id", null: false
    t.text "team_name", null: false
    t.text "team_status"
    t.text "team_tricode", null: false
    t.text "timezone"
    t.integer "wins"
  end

  create_table "ngss_teams", primary_key: "team_id", id: :integer, default: nil, force: :cascade do |t|
    t.integer "is_gleague", limit: 2, default: 0
    t.integer "is_nba", limit: 2, default: 0
    t.text "team_city"
    t.text "team_code"
    t.text "team_mascot"
  end

  create_table "nightly_emails", primary_key: "email", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "name"
    t.text "notes"
    t.jsonb "tags", default: []
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "pcms_contracts", primary_key: "contract_id", id: :bigint, default: nil, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.bigint "nba_id"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "pcms_player_data", primary_key: "nba_id", id: :bigint, default: nil, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "postgame_players", primary_key: ["game_id", "nba_id"], force: :cascade do |t|
    t.integer "ast"
    t.decimal "ast_pct"
    t.decimal "ast_pct_ptile"
    t.decimal "ast_ptile"
    t.integer "blk"
    t.decimal "blk_pct"
    t.decimal "blk_pct_ptile"
    t.decimal "blk_ptile"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.text "dnp"
    t.integer "dreb"
    t.decimal "dreb_pct"
    t.decimal "dreb_pct_ptile"
    t.decimal "dreb_ptile"
    t.decimal "efg"
    t.decimal "efg_ptile"
    t.integer "fg2a"
    t.decimal "fg2a_ptile"
    t.integer "fg2m"
    t.decimal "fg2m_ptile"
    t.integer "fg3a"
    t.decimal "fg3a_ptile"
    t.integer "fg3m"
    t.decimal "fg3m_ptile"
    t.integer "fga"
    t.decimal "fga_ptile"
    t.integer "fgm"
    t.decimal "fgm_ptile"
    t.decimal "fic"
    t.decimal "fic_ptile"
    t.decimal "ft_fga"
    t.decimal "ft_fga_ptile"
    t.integer "fta"
    t.decimal "fta_ptile"
    t.integer "ftm"
    t.decimal "ftm_ptile"
    t.date "game_date", null: false
    t.text "game_id", null: false
    t.boolean "is_away", null: false
    t.boolean "is_home", null: false
    t.integer "minutes"
    t.text "minutes_formatted"
    t.decimal "minutes_ptile"
    t.text "nba_id", null: false
    t.text "opp", null: false
    t.integer "opp_team_id", null: false
    t.integer "oreb"
    t.decimal "oreb_pct"
    t.decimal "oreb_pct_ptile"
    t.decimal "oreb_ptile"
    t.integer "periods", null: false
    t.integer "pf"
    t.decimal "pf_ptile"
    t.boolean "played", null: false
    t.text "player", null: false
    t.integer "plus_minus"
    t.decimal "plus_minus_ptile"
    t.text "position"
    t.decimal "poss"
    t.decimal "poss_ptile"
    t.decimal "ppp"
    t.decimal "ppp_ptile"
    t.integer "pts"
    t.decimal "pts_ptile"
    t.integer "reb"
    t.decimal "reb_pct"
    t.decimal "reb_pct_ptile"
    t.decimal "reb_ptile"
    t.text "rotation"
    t.integer "season", null: false
    t.text "season_type", null: false
    t.integer "seconds"
    t.decimal "seconds_ptile"
    t.boolean "starter", null: false
    t.integer "stl"
    t.decimal "stl_pct"
    t.decimal "stl_pct_ptile"
    t.decimal "stl_ptile"
    t.text "team", null: false
    t.integer "team_id", null: false
    t.integer "tov"
    t.decimal "tov_pct"
    t.decimal "tov_pct_ptile"
    t.decimal "tov_ptile"
    t.decimal "ts"
    t.decimal "ts_ptile"
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.decimal "usage"
    t.decimal "usage_ptile"
    t.index ["game_date"], name: "idx_postgame_players_game_date"
    t.index ["nba_id"], name: "idx_postgame_players_nba_id"
    t.index ["opp_team_id"], name: "idx_postgame_players_opp_id"
    t.index ["season"], name: "idx_postgame_players_season"
    t.index ["team_id"], name: "idx_postgame_players_team_id"
  end

  create_table "postgame_teams", primary_key: ["game_id", "team_id"], force: :cascade do |t|
    t.integer "ast"
    t.decimal "ast_ptile"
    t.integer "bench_pts"
    t.decimal "bench_pts_ptile"
    t.integer "blk"
    t.decimal "blk_ptile"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.integer "dreb"
    t.decimal "dreb_ptile"
    t.decimal "efg"
    t.decimal "efg_ptile"
    t.integer "fast_break_pts"
    t.decimal "fast_break_pts_ptile"
    t.integer "fg2a"
    t.decimal "fg2a_ptile"
    t.integer "fg2m"
    t.decimal "fg2m_ptile"
    t.integer "fg3a"
    t.decimal "fg3a_ptile"
    t.integer "fg3m"
    t.decimal "fg3m_ptile"
    t.integer "fga"
    t.decimal "fga_ptile"
    t.integer "fgm"
    t.decimal "fgm_ptile"
    t.decimal "ft_fga"
    t.decimal "ft_fga_ptile"
    t.integer "fta"
    t.decimal "fta_ptile"
    t.integer "ftm"
    t.decimal "ftm_ptile"
    t.date "game_date", null: false
    t.text "game_id", null: false
    t.boolean "is_away", null: false
    t.boolean "is_home", null: false
    t.text "opp", null: false
    t.integer "opp_ast"
    t.decimal "opp_ast_ptile"
    t.integer "opp_bench_pts"
    t.decimal "opp_bench_pts_ptile"
    t.integer "opp_blk"
    t.decimal "opp_blk_ptile"
    t.integer "opp_dreb"
    t.decimal "opp_dreb_ptile"
    t.decimal "opp_efg"
    t.decimal "opp_efg_ptile"
    t.integer "opp_fast_break_pts"
    t.decimal "opp_fast_break_pts_ptile"
    t.integer "opp_fg2a"
    t.decimal "opp_fg2a_ptile"
    t.integer "opp_fg2m"
    t.decimal "opp_fg2m_ptile"
    t.integer "opp_fg3a"
    t.decimal "opp_fg3a_ptile"
    t.integer "opp_fg3m"
    t.decimal "opp_fg3m_ptile"
    t.integer "opp_fga"
    t.decimal "opp_fga_ptile"
    t.integer "opp_fgm"
    t.decimal "opp_fgm_ptile"
    t.decimal "opp_ft_fga"
    t.decimal "opp_ft_fga_ptile"
    t.integer "opp_fta"
    t.decimal "opp_fta_ptile"
    t.integer "opp_ftm"
    t.decimal "opp_ftm_ptile"
    t.integer "opp_oreb"
    t.decimal "opp_oreb_pct"
    t.decimal "opp_oreb_pct_ptile"
    t.decimal "opp_oreb_ptile"
    t.integer "opp_ot2_pts"
    t.decimal "opp_ot2_pts_ptile"
    t.integer "opp_ot_pts"
    t.decimal "opp_ot_pts_ptile"
    t.integer "opp_paint_pts"
    t.decimal "opp_paint_pts_ptile"
    t.integer "opp_pf"
    t.decimal "opp_pf_ptile"
    t.decimal "opp_poss"
    t.decimal "opp_poss_ptile"
    t.decimal "opp_ppp"
    t.decimal "opp_ppp_ptile"
    t.integer "opp_pts"
    t.integer "opp_pts_off_tov"
    t.decimal "opp_pts_off_tov_ptile"
    t.decimal "opp_pts_ptile"
    t.integer "opp_q1_pts"
    t.decimal "opp_q1_pts_ptile"
    t.integer "opp_q2_pts"
    t.decimal "opp_q2_pts_ptile"
    t.integer "opp_q3_pts"
    t.decimal "opp_q3_pts_ptile"
    t.integer "opp_q4_pts"
    t.decimal "opp_q4_pts_ptile"
    t.integer "opp_reb"
    t.decimal "opp_reb_ptile"
    t.integer "opp_second_chance_pts"
    t.decimal "opp_second_chance_pts_ptile"
    t.integer "opp_stl"
    t.decimal "opp_stl_ptile"
    t.integer "opp_team_id", null: false
    t.integer "opp_tov"
    t.decimal "opp_tov_pct"
    t.decimal "opp_tov_pct_ptile"
    t.decimal "opp_tov_ptile"
    t.decimal "opp_ts"
    t.decimal "opp_ts_ptile"
    t.integer "oreb"
    t.decimal "oreb_pct"
    t.decimal "oreb_pct_ptile"
    t.decimal "oreb_ptile"
    t.integer "ot2_pts"
    t.decimal "ot2_pts_ptile"
    t.integer "ot_pts"
    t.decimal "ot_pts_ptile"
    t.integer "paint_pts"
    t.decimal "paint_pts_ptile"
    t.integer "periods", null: false
    t.integer "pf"
    t.decimal "pf_ptile"
    t.integer "plus_minus"
    t.decimal "plus_minus_ptile"
    t.decimal "poss"
    t.decimal "poss_ptile"
    t.decimal "ppp"
    t.decimal "ppp_ptile"
    t.integer "pts"
    t.integer "pts_off_tov"
    t.decimal "pts_off_tov_ptile"
    t.decimal "pts_ptile"
    t.integer "q1_pts"
    t.decimal "q1_pts_ptile"
    t.integer "q2_pts"
    t.decimal "q2_pts_ptile"
    t.integer "q3_pts"
    t.decimal "q3_pts_ptile"
    t.integer "q4_pts"
    t.decimal "q4_pts_ptile"
    t.integer "reb"
    t.decimal "reb_ptile"
    t.integer "season", null: false
    t.text "season_type", null: false
    t.integer "second_chance_pts"
    t.decimal "second_chance_pts_ptile"
    t.integer "stl"
    t.decimal "stl_ptile"
    t.text "team", null: false
    t.integer "team_id", null: false
    t.integer "tov"
    t.decimal "tov_pct"
    t.decimal "tov_pct_ptile"
    t.decimal "tov_ptile"
    t.decimal "ts"
    t.decimal "ts_ptile"
    t.timestamptz "updated_at", default: -> { "now()" }, null: false
    t.index ["game_date"], name: "idx_postgame_game_date"
    t.index ["opp"], name: "idx_postgame_team_opp"
    t.index ["opp_team_id"], name: "idx_postgame_team_opp_id"
    t.index ["season"], name: "idx_postgame_season"
    t.index ["season_type"], name: "idx_postgame_season_type"
    t.index ["team"], name: "idx_postgame_team"
    t.index ["team_id"], name: "idx_postgame_team_id"
  end

  create_table "s2", primary_key: ["s2_id", "report_date"], force: :cascade do |t|
    t.integer "decision_complexity"
    t.integer "distraction_control"
    t.integer "draft"
    t.text "full_name"
    t.integer "gm_id"
    t.integer "improvisation"
    t.integer "impulse_control"
    t.integer "instinctive_learning"
    t.integer "perception_speed"
    t.integer "reaction_accuracy"
    t.integer "reaction_speed"
    t.date "report_date", null: false
    t.time "report_time"
    t.integer "s2_id", null: false
    t.integer "score"
    t.integer "search_efficiency"
    t.integer "spatial_awareness"
    t.integer "tracking_capacity"
  end

  create_table "slugs", force: :cascade do |t|
    t.boolean "canonical", default: false, null: false
    t.datetime "created_at", null: false
    t.bigint "entity_id", null: false
    t.string "entity_type", null: false
    t.string "slug", null: false
    t.datetime "updated_at", null: false
    t.index ["entity_type", "entity_id"], name: "index_slugs_on_entity_type_and_entity_id"
    t.index ["entity_type", "entity_id"], name: "index_slugs_on_entity_type_and_entity_id_canonical", unique: true, where: "canonical"
    t.index ["entity_type", "slug"], name: "index_slugs_on_entity_type_and_slug", unique: true
  end

  create_table "sportradar_nba_injuries", primary_key: "game_date", id: :date, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.jsonb "data"
    t.integer "season"
    t.integer "season_id"
    t.timestamptz "updated_at", default: -> { "now()" }
  end

  create_table "sports_jobs", id: :serial, force: :cascade do |t|
    t.text "apply_url"
    t.text "company"
    t.timestamptz "created_at", default: -> { "now()" }
    t.date "date_listed"
    t.text "discipline"
    t.text "role"
    t.text "sport"
    t.index ["role", "company", "date_listed"], name: "idx_sports_jobs", unique: true
  end

  create_table "spotrac_transactions", id: :text, force: :cascade do |t|
    t.text "action"
    t.timestamptz "created_at", default: -> { "now()" }
    t.date "date"
    t.text "description"
    t.text "full_name"
    t.text "position"
    t.timestamptz "slack_at"
    t.text "slack_channel"
    t.text "slack_message"
    t.integer "spotrac_id"
    t.text "team"
  end

  create_table "youtube", primary_key: "youtube_id", id: :text, comment: "YouTube transcripts", force: :cascade do |t|
    t.text "channel"
    t.timestamptz "created_at", default: -> { "now()" }, null: false
    t.jsonb "data"
    t.text "description"
    t.boolean "do_not_scrape"
    t.bigint "duration"
    t.boolean "is_revised"
    t.datetime "slack_at", precision: nil
    t.text "slack_channel"
    t.text "slack_message"
    t.text "title"
    t.text "transcript"
    t.text "transcript_tldr"
    t.date "upload_date"
    t.bigint "view_count"
    t.index ["do_not_scrape"], name: "idx_youtube_do_not_scrape"
    t.index ["slack_channel"], name: "idx_youtube_slack_channel"
    t.index ["upload_date"], name: "idx_youtube_upload_date"
  end

  create_table "youtube_channels", primary_key: "channel", id: :text, force: :cascade do |t|
    t.timestamptz "created_at", default: -> { "now()" }
    t.text "notes"
    t.jsonb "tags"
    t.text "url"
  end
end
