module Entities
  class DraftsController < ApplicationController
    INDEX_VIEWS = %w[picks selections grid].freeze
    INDEX_ROUNDS = %w[all 1 2].freeze

    # GET /drafts
    # Unified workspace for draft picks (future assets), draft selections (historical),
    # and pick grid (team × year × round ownership matrix).
    def index
      load_index_state!
      render :index
    end

    # GET /drafts/pane (Datastar partial refresh)
    def pane
      load_index_state!
      render partial: "entities/drafts/results"
    end

    # GET /drafts/sidebar/base
    def sidebar_base
      load_index_state!
      render partial: "entities/drafts/rightpanel_base"
    end

    # GET /drafts/sidebar/pick?team=XXX&year=YYYY&round=R
    def sidebar_pick
      team_code = normalize_team_code_param(params[:team])
      year = normalize_year_param(params[:year])
      round = normalize_round_param(params[:round])

      raise ActiveRecord::RecordNotFound if team_code.blank? || year.nil? || round.nil?

      render partial: "entities/drafts/rightpanel_overlay_pick", locals: load_sidebar_pick_payload(
        team_code:,
        draft_year: year,
        draft_round: round
      )
    end

    # GET /drafts/sidebar/selection/:id
    def sidebar_selection
      transaction_id = Integer(params[:id])
      raise ActiveRecord::RecordNotFound if transaction_id <= 0

      render partial: "entities/drafts/rightpanel_overlay_selection", locals: load_sidebar_selection_payload(transaction_id)
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    # GET /drafts/sidebar/clear
    def sidebar_clear
      render partial: "entities/drafts/rightpanel_clear"
    end

    private

    def load_index_state!
      conn = ActiveRecord::Base.connection

      @view = params[:view].to_s.strip
      @view = "picks" unless INDEX_VIEWS.include?(@view)

      @round = normalize_round_param(params[:round])&.to_s || "all"
      @team = normalize_team_code_param(params[:team])

      current_year = Date.today.year
      default_picks_year = Date.today.month >= 7 ? current_year + 1 : current_year
      default_selections_year = Date.today.month >= 7 ? current_year : current_year - 1

      requested_year = normalize_year_param(params[:year])
      @year = (requested_year || (@view == "selections" ? default_selections_year : default_picks_year)).to_s

      case @view
      when "grid"
        load_grid(conn)
      when "picks"
        load_picks(conn)
      else
        load_selections(conn)
      end

      selection_years = conn.exec_query(<<~SQL).rows.flatten.map(&:to_i)
        SELECT DISTINCT draft_year FROM pcms.draft_selections ORDER BY draft_year DESC
      SQL

      base_years = ((current_year - 5)..(current_year + 7)).to_a
      @available_years = (selection_years + base_years + [@year.to_i]).uniq.sort.reverse

      @team_options = conn.exec_query(<<~SQL).to_a
        SELECT team_code, team_name
        FROM pcms.teams
        WHERE league_lk = 'NBA'
          AND team_name NOT LIKE 'Non-NBA%'
        ORDER BY team_code
      SQL

      build_sidebar_summary!
    end

    def load_picks(conn)
      year_sql = conn.quote(@year.to_i)

      round_filter_sql = if @round.present? && @round != "all"
        "AND v.draft_round = #{conn.quote(@round.to_i)}"
      else
        ""
      end

      team_filter_sql = if @team.present?
        "WHERE picks.original_team_code = #{conn.quote(@team)} OR picks.current_team_code = #{conn.quote(@team)}"
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
            BOOL_OR(v.is_conditional) AS has_conditional,
            BOOL_OR(v.is_forfeited) AS has_forfeited,
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
          picks.has_conditional,
          picks.has_forfeited,
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
          ds.drafting_team_id,
          ds.drafting_team_code,
          t.team_name AS drafting_team_name,
          ds.transaction_date,
          tx.trade_id,
          tx.transaction_type_lk
        FROM pcms.draft_selections ds
        LEFT JOIN pcms.transactions tx
          ON tx.transaction_id = ds.transaction_id
        LEFT JOIN pcms.people p
          ON p.person_id = ds.player_id
        LEFT JOIN pcms.teams t
          ON t.team_code = ds.drafting_team_code
         AND t.league_lk = 'NBA'
        WHERE #{where_clauses.join(" AND ")}
        ORDER BY ds.draft_round ASC, ds.pick_number ASC
      SQL
    end

    def load_grid(conn)
      year_start = @year.to_i
      year_end = year_start + 6

      round_clauses = []
      round_clauses << "v.draft_round = #{conn.quote(@round.to_i)}" if @round.present? && @round != "all"
      team_clauses = []
      team_clauses << "v.team_code = #{conn.quote(@team)}" if @team.present?

      where_sql = "v.draft_year BETWEEN #{conn.quote(year_start)} AND #{conn.quote(year_end)}"
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

      @grid_rows = rows
      @grid_data = {}
      @grid_teams = {}

      rows.each do |row|
        team = row["team_code"]
        year = row["draft_year"]
        round = row["draft_round"]

        @grid_teams[team] ||= row["team_name"]

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

      @grid_years = (year_start..year_end).to_a
      @grid_teams = @grid_teams.sort_by { |code, _| code }
    end

    def build_sidebar_summary!
      filters = []
      filters << "View: #{@view.titleize}"
      filters << "Year: #{@year}"
      filters << "Round: #{@round == 'all' ? 'All' : "R#{@round}"}"
      filters << "Team: #{@team}" if @team.present?

      case @view
      when "picks"
        rows = Array(@results)
        @sidebar_summary = {
          view: "picks",
          row_count: rows.size,
          traded_count: rows.count { |row| row["pick_status"].to_s == "Traded" },
          conditional_count: rows.count { |row| truthy?(row["has_conditional"]) },
          swap_count: rows.count { |row| truthy?(row["is_swap"]) },
          forfeited_count: rows.count { |row| truthy?(row["has_forfeited"]) },
          filters:,
          top_rows: rows.first(12)
        }
      when "selections"
        rows = Array(@results)
        @sidebar_summary = {
          view: "selections",
          row_count: rows.size,
          first_round_count: rows.count { |row| row["draft_round"].to_i == 1 },
          with_trade_count: rows.count { |row| row["trade_id"].present? },
          with_player_count: rows.count { |row| row["player_id"].present? },
          filters:,
          top_rows: rows.first(12)
        }
      else
        rows = Array(@grid_rows)
        @sidebar_summary = {
          view: "grid",
          team_count: @grid_teams.size,
          year_count: @grid_years.size,
          cell_count: rows.size,
          outgoing_count: rows.count { |row| truthy?(row["has_outgoing"]) },
          conditional_count: rows.count { |row| truthy?(row["has_conditional"]) },
          swap_count: rows.count { |row| truthy?(row["has_swap"]) },
          filters:
        }
      end
    end

    def load_sidebar_pick_payload(team_code:, draft_year:, draft_round:)
      conn = ActiveRecord::Base.connection
      team_sql = conn.quote(team_code)
      year_sql = conn.quote(draft_year)
      round_sql = conn.quote(draft_round)

      pick = conn.exec_query(<<~SQL).first
        WITH pick AS (
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
            BOOL_OR(v.is_conditional) AS has_conditional,
            BOOL_OR(v.is_forfeited) AS has_forfeited,
            STRING_AGG(DISTINCT v.display_text, '; ')
              FILTER (WHERE v.asset_type <> 'OWN') AS protections_summary,
            CASE
              WHEN BOOL_OR(v.is_forfeited) THEN 'Forfeited'
              WHEN BOOL_OR(v.is_conditional) THEN 'Conditional'
              WHEN BOOL_OR(v.asset_type = 'TO') THEN 'Traded'
              ELSE 'Own'
            END AS pick_status
          FROM pcms.vw_draft_pick_assets v
          WHERE v.team_code = #{team_sql}
            AND v.draft_year = #{year_sql}
            AND v.draft_round = #{round_sql}
          GROUP BY v.draft_year, v.draft_round, v.team_code
        )
        SELECT
          pick.*,
          ot.team_name AS original_team_name,
          ct.team_name AS current_team_name
        FROM pick
        LEFT JOIN pcms.teams ot
          ON ot.team_code = pick.original_team_code
         AND ot.league_lk = 'NBA'
        LEFT JOIN pcms.teams ct
          ON ct.team_code = pick.current_team_code
         AND ct.league_lk = 'NBA'
        LIMIT 1
      SQL
      raise ActiveRecord::RecordNotFound unless pick

      assets = conn.exec_query(<<~SQL).to_a
        SELECT
          asset_slot,
          sub_asset_slot,
          asset_type,
          display_text,
          raw_part,
          counterparty_team_code,
          is_swap,
          is_conditional,
          is_forfeited,
          endnote_explanation,
          trade_id
        FROM pcms.vw_draft_pick_assets
        WHERE team_code = #{team_sql}
          AND draft_year = #{year_sql}
          AND draft_round = #{round_sql}
        ORDER BY asset_slot, sub_asset_slot
      SQL

      provenance_rows = conn.exec_query(<<~SQL).to_a
        SELECT
          dpt.id,
          dpt.trade_id,
          tr.trade_date,
          dpt.from_team_code,
          dpt.to_team_code,
          dpt.original_team_code,
          dpt.is_swap,
          dpt.is_future,
          dpt.is_conditional,
          dpt.conditional_type_lk
        FROM pcms.draft_pick_trades dpt
        LEFT JOIN pcms.trades tr
          ON tr.trade_id = dpt.trade_id
        WHERE dpt.draft_year = #{year_sql}
          AND dpt.draft_round = #{round_sql}
          AND (
            dpt.original_team_code = #{team_sql}
            OR dpt.from_team_code = #{team_sql}
            OR dpt.to_team_code = #{team_sql}
          )
        ORDER BY tr.trade_date NULLS LAST, dpt.id
        LIMIT 80
      SQL

      current_team_sql = conn.quote(pick["current_team_code"])
      related_selection = conn.exec_query(<<~SQL).first
        SELECT
          ds.transaction_id,
          ds.player_id,
          ds.pick_number,
          ds.transaction_date
        FROM pcms.draft_selections ds
        WHERE ds.draft_year = #{year_sql}
          AND ds.draft_round = #{round_sql}
          AND ds.drafting_team_code = #{current_team_sql}
        LIMIT 1
      SQL

      {
        pick:,
        assets:,
        provenance_rows:,
        related_selection:
      }
    end

    def load_sidebar_selection_payload(transaction_id)
      conn = ActiveRecord::Base.connection
      tx_sql = conn.quote(transaction_id)

      selection = conn.exec_query(<<~SQL).first
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
          ds.drafting_team_id,
          ds.drafting_team_code,
          t.team_name AS drafting_team_name,
          ds.transaction_date,
          tx.trade_id,
          tx.transaction_type_lk
        FROM pcms.draft_selections ds
        LEFT JOIN pcms.transactions tx
          ON tx.transaction_id = ds.transaction_id
        LEFT JOIN pcms.people p
          ON p.person_id = ds.player_id
        LEFT JOIN pcms.teams t
          ON t.team_code = ds.drafting_team_code
         AND t.league_lk = 'NBA'
        WHERE ds.transaction_id = #{tx_sql}
        LIMIT 1
      SQL
      raise ActiveRecord::RecordNotFound unless selection

      year_sql = conn.quote(selection["draft_year"])
      round_sql = conn.quote(selection["draft_round"])
      team_sql = conn.quote(selection["drafting_team_code"])

      provenance_rows = conn.exec_query(<<~SQL).to_a
        SELECT
          dpt.id,
          dpt.trade_id,
          tr.trade_date,
          dpt.from_team_code,
          dpt.to_team_code,
          dpt.original_team_code,
          dpt.is_swap,
          dpt.is_future,
          dpt.is_conditional,
          dpt.conditional_type_lk
        FROM pcms.draft_pick_trades dpt
        LEFT JOIN pcms.trades tr
          ON tr.trade_id = dpt.trade_id
        WHERE dpt.draft_year = #{year_sql}
          AND dpt.draft_round = #{round_sql}
          AND (
            dpt.original_team_code = #{team_sql}
            OR dpt.from_team_code = #{team_sql}
            OR dpt.to_team_code = #{team_sql}
          )
        ORDER BY tr.trade_date NULLS LAST, dpt.id
        LIMIT 80
      SQL

      {
        selection:,
        provenance_rows:
      }
    end

    def normalize_team_code_param(raw)
      code = raw.to_s.strip.upcase
      return nil if code.blank?
      return nil unless code.match?(/\A[A-Z]{3}\z/)

      code
    end

    def normalize_year_param(raw)
      year = Integer(raw.to_s.strip)
      return nil if year <= 0

      year
    rescue ArgumentError, TypeError
      nil
    end

    def normalize_round_param(raw)
      round = raw.to_s.strip
      round = "all" if round.blank?
      return round if INDEX_ROUNDS.include?(round)

      nil
    end

    def truthy?(value)
      ActiveModel::Type::Boolean.new.cast(value)
    end
  end
end
