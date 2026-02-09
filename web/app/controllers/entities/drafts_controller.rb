module Entities
  class DraftsController < ApplicationController
    # GET /drafts
    # Unified workspace for draft picks (future assets), draft selections (historical),
    # and pick grid (team × year × round ownership matrix).
    def index
      conn = ActiveRecord::Base.connection

      @view = params[:view].to_s.strip.presence || "picks"
      @view = "picks" unless %w[picks selections grid].include?(@view)

      @year = params[:year].to_s.strip.presence
      @round = params[:round].to_s.strip.presence
      @team = params[:team].to_s.strip.upcase.presence

      # Default year: current season for picks, most recent completed for selections
      current_year = Date.today.year
      default_picks_year = Date.today.month >= 7 ? current_year + 1 : current_year
      default_selections_year = Date.today.month >= 7 ? current_year : current_year - 1

      if @view == "grid"
        load_grid(conn)
      elsif @view == "picks"
        @year ||= default_picks_year.to_s
        load_picks(conn)
      else
        @year ||= default_selections_year.to_s
        load_selections(conn)
      end

      # Available years for the year selector (not used in grid mode)
      @available_years = if @view == "grid"
        []
      elsif @view == "picks"
        (current_year..(current_year + 7)).to_a
      else
        conn.exec_query(<<~SQL).rows.flatten
          SELECT DISTINCT draft_year FROM pcms.draft_selections ORDER BY draft_year DESC
        SQL
      end

      render :index
    end

    # GET /drafts/pane (Datastar partial refresh)
    def pane
      index
      render partial: "entities/drafts/results"
    end

    private

    def load_picks(conn)
      year_sql = conn.quote(@year.to_i)

      round_filter_sql = if @round.present? && @round != "all"
        "AND v.draft_round = #{conn.quote(@round.to_i)}"
      else
        ""
      end

      team_filter_sql = if @team.present?
        "WHERE picks.current_team_code = #{conn.quote(@team)}"
      else
        ""
      end

      @results = conn.exec_query(<<~SQL).to_a
        WITH picks AS (
          SELECT
            v.draft_year,
            v.draft_round,
            v.team_code AS original_team_code,
            COALESCE(
              MAX(
                CASE
                  WHEN v.asset_type = 'TO' THEN
                    COALESCE(
                      (regexp_match(v.display_text, '^To\\s+([A-Z]{3})\\s*:'))[1],
                      NULLIF(v.counterparty_team_code, '')
                    )
                END
              ),
              v.team_code
            ) AS current_team_code,
            BOOL_OR(v.is_swap) AS is_swap,
            STRING_AGG(DISTINCT v.display_text, '; ')
              FILTER (WHERE v.asset_type <> 'OWN') AS protections_summary,
            CASE
              WHEN BOOL_OR(v.is_forfeited) THEN 'Forfeited'
              WHEN BOOL_OR(v.is_conditional) THEN 'Conditional'
              WHEN BOOL_OR(v.asset_type = 'TO') THEN 'Traded'
              ELSE 'Own'
            END AS pick_status
          FROM pcms.vw_draft_pick_assets v
          WHERE v.draft_year = #{year_sql}
            #{round_filter_sql}
          GROUP BY v.draft_year, v.draft_round, v.team_code
        )
        SELECT
          picks.draft_year,
          picks.draft_round,
          picks.original_team_code,
          picks.current_team_code,
          ot.team_name AS original_team_name,
          ct.team_name AS current_team_name,
          picks.is_swap,
          picks.protections_summary,
          picks.pick_status
        FROM picks
        LEFT JOIN pcms.teams ot
          ON ot.team_code = picks.original_team_code
         AND ot.league_lk = 'NBA'
         AND ot.is_active = TRUE
        LEFT JOIN pcms.teams ct
          ON ct.team_code = picks.current_team_code
         AND ct.league_lk = 'NBA'
         AND ct.is_active = TRUE
        #{team_filter_sql}
        ORDER BY picks.draft_round, picks.original_team_code
      SQL
    end

    def load_selections(conn)
      year_sql = conn.quote(@year.to_i)

      where_clauses = ["ds.draft_year = #{year_sql}"]
      where_clauses << "ds.draft_round = #{conn.quote(@round.to_i)}" if @round.present? && @round != "all"
      where_clauses << "ds.drafting_team_code = #{conn.quote(@team)}" if @team.present?

      @results = conn.exec_query(<<~SQL).to_a
        SELECT
          ds.transaction_id,
          ds.draft_year,
          ds.draft_round,
          ds.pick_number,
          ds.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            ds.player_id::text
          ) AS player_name,
          ds.drafting_team_code,
          t.team_name AS drafting_team_name,
          ds.transaction_date
        FROM pcms.draft_selections ds
        LEFT JOIN pcms.people p ON p.person_id = ds.player_id
        LEFT JOIN pcms.teams t ON t.team_code = ds.drafting_team_code AND t.league_lk = 'NBA'
        WHERE #{where_clauses.join(" AND ")}
        ORDER BY ds.draft_round ASC, ds.pick_number ASC
      SQL
    end

    def load_grid(conn)
      current_year = Date.today.year

      round_clauses = []
      round_clauses << "v.draft_round = #{conn.quote(@round.to_i)}" if @round.present? && @round != "all"
      team_clauses = []
      team_clauses << "v.team_code = #{conn.quote(@team)}" if @team.present?

      where_sql = "v.draft_year >= #{conn.quote(current_year)}"
      where_sql += " AND #{round_clauses.join(' AND ')}" if round_clauses.any?
      where_sql += " AND #{team_clauses.join(' AND ')}" if team_clauses.any?

      rows = conn.exec_query(<<~SQL).to_a
        SELECT
          v.team_code,
          t.team_name,
          v.draft_year,
          v.draft_round,
          STRING_AGG(v.display_text, '; ' ORDER BY v.asset_slot, v.sub_asset_slot) AS cell_text,
          BOOL_OR(v.asset_type = 'TO') AS has_outgoing,
          BOOL_OR(v.is_swap) AS has_swap,
          BOOL_OR(v.is_conditional) AS has_conditional,
          BOOL_OR(v.is_forfeited) AS has_forfeited
        FROM pcms.vw_draft_pick_assets v
        LEFT JOIN pcms.teams t ON t.team_code = v.team_code AND t.league_lk = 'NBA'
        WHERE #{where_sql}
        GROUP BY v.team_code, t.team_name, v.draft_year, v.draft_round
        ORDER BY v.team_code, v.draft_round, v.draft_year
      SQL

      # Build grid structure: { team_code => { round => { year => cell_hash } } }
      @grid_data = {}
      @grid_teams = {}
      grid_years = Set.new

      rows.each do |row|
        team = row["team_code"]
        year = row["draft_year"]
        round = row["draft_round"]

        @grid_teams[team] ||= row["team_name"]
        grid_years << year

        @grid_data[team] ||= {}
        @grid_data[team][round] ||= {}
        @grid_data[team][round][year] = {
          text: row["cell_text"],
          has_outgoing: row["has_outgoing"],
          has_swap: row["has_swap"],
          has_conditional: row["has_conditional"],
          has_forfeited: row["has_forfeited"]
        }
      end

      @grid_years = grid_years.sort
      @grid_teams = @grid_teams.sort_by { |code, _| code }
    end
  end
end
