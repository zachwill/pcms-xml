module Entities
  class DraftsController < ApplicationController
    INDEX_VIEWS = %w[picks selections grid].freeze
    INDEX_ROUNDS = %w[all 1 2].freeze
    INDEX_SORTS = %w[board risk provenance].freeze
    INDEX_LENSES = %w[all at_risk critical].freeze

    # GET /drafts
    # Unified workspace for draft picks (future assets), draft selections (historical),
    # and pick grid (team × year × round ownership matrix).
    def index
      load_index_state!
      hydrate_initial_overlay_from_params!
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

    def queries
      @queries ||= DraftQueries.new(connection: ActiveRecord::Base.connection)
    end

    def load_index_state!
      @view = params[:view].to_s.strip
      @view = "picks" unless INDEX_VIEWS.include?(@view)

      @round = normalize_round_param(params[:round])&.to_s || "all"
      @team = normalize_team_code_param(params[:team])
      @sort = normalize_sort_param(params[:sort]) || "board"
      @lens = normalize_lens_param(params[:lens]) || "all"

      @sort_label = drafts_sort_label(view: @view, sort: @sort)
      @lens_label = drafts_lens_label(@lens)

      current_year = Date.today.year
      default_picks_year = Date.today.month >= 7 ? current_year + 1 : current_year
      default_selections_year = Date.today.month >= 7 ? current_year : current_year - 1

      requested_year = normalize_year_param(params[:year])
      @year = (requested_year || (@view == "selections" ? default_selections_year : default_picks_year)).to_s

      case @view
      when "grid"
        load_grid
      when "picks"
        load_picks
      else
        load_selections
      end

      selection_years = queries.fetch_selection_years
      base_years = ((current_year - 5)..(current_year + 7)).to_a
      @available_years = (selection_years + base_years + [@year.to_i]).uniq.sort.reverse

      @team_options = queries.fetch_team_options

      build_sidebar_summary!
    end

    def load_picks
      rows = queries.fetch_picks_rows(
        year: @year.to_i,
        round: @round,
        team: @team,
        lens_sql: picks_lens_sql(alias_name: "ranked_picks"),
        order_sql: picks_order_sql
      )

      @results = rows.map do |row|
        risk_tier = picks_risk_tier(row)
        row.merge(
          "risk_tier" => risk_tier,
          "risk_tier_label" => risk_tier_label(risk_tier)
        )
      end
    end

    def load_selections
      rows = queries.fetch_selections_rows(
        year: @year.to_i,
        round: @round,
        team: @team,
        lens_sql: selections_lens_sql(alias_name: "selection_rows"),
        order_sql: selections_order_sql
      )

      @results = rows.map do |row|
        risk_tier = selections_risk_tier(row)
        row.merge(
          "risk_tier" => risk_tier,
          "risk_tier_label" => risk_tier_label(risk_tier)
        )
      end
    end

    def load_grid
      year_start = @year.to_i
      year_end = year_start + 6

      rows = queries.fetch_grid_rows(
        year_start: year_start,
        year_end: year_end,
        round: @round,
        team: @team
      )

      rows = apply_grid_lens(rows)

      @grid_rows = rows
      @grid_data = {}
      @grid_teams = {}

      rows.each do |row|
        team = row["team_code"]
        year = row["draft_year"]
        round = row["draft_round"]
        risk_tier = grid_risk_tier(row)

        @grid_teams[team] ||= row["team_name"]

        @grid_data[team] ||= {}
        @grid_data[team][round] ||= {}
        @grid_data[team][round][year] = {
          text: row["cell_text"],
          has_outgoing: row["has_outgoing"],
          has_swap: row["has_swap"],
          has_conditional: row["has_conditional"],
          has_forfeited: row["has_forfeited"],
          provenance_trade_count: row["provenance_trade_count"],
          ownership_risk_score: grid_cell_risk_score(row),
          risk_tier: risk_tier,
          risk_tier_label: grid_risk_tier_label(risk_tier)
        }
      end

      @grid_years = (year_start..year_end).to_a
      @grid_teams = sort_grid_teams(@grid_teams, rows)
    end

    def build_sidebar_summary!
      filters = []
      filters << "View: #{@view.titleize}"
      filters << "Year: #{@year}"
      filters << "Round: #{@round == 'all' ? 'All' : "R#{@round}"}"
      filters << "Team: #{@team}" if @team.present?
      filters << "Sort: #{@sort_label}"
      filters << "Lens: #{@lens_label}" unless @lens == "all"

      case @view
      when "picks"
        rows = Array(@results)
        severity_counts = risk_tier_counts(rows) { |row| picks_risk_tier(row) }

        @sidebar_summary = {
          view: "picks",
          sort_label: @sort_label,
          lens_label: @lens_label,
          row_count: rows.size,
          traded_count: rows.count { |row| row["pick_status"].to_s == "Traded" },
          conditional_count: rows.count { |row| truthy?(row["has_conditional"]) },
          swap_count: rows.count { |row| truthy?(row["is_swap"]) },
          forfeited_count: rows.count { |row| truthy?(row["has_forfeited"]) },
          at_risk_count: severity_counts["at_risk"],
          critical_count: severity_counts["critical"],
          normal_count: severity_counts["normal"],
          severity_counts:,
          provenance_trade_total: rows.sum { |row| row["provenance_trade_count"].to_i },
          filters:,
          top_rows: rows.first(12)
        }
      when "selections"
        rows = Array(@results)
        severity_counts = risk_tier_counts(rows) { |row| selections_risk_tier(row) }

        @sidebar_summary = {
          view: "selections",
          sort_label: @sort_label,
          lens_label: @lens_label,
          row_count: rows.size,
          first_round_count: rows.count { |row| row["draft_round"].to_i == 1 },
          with_trade_count: rows.count { |row| row["trade_id"].present? },
          with_player_count: rows.count { |row| row["player_id"].present? },
          at_risk_count: severity_counts["at_risk"],
          critical_count: severity_counts["critical"],
          normal_count: severity_counts["normal"],
          severity_counts:,
          provenance_trade_total: rows.sum { |row| row["provenance_trade_count"].to_i },
          filters:,
          top_rows: rows.first(12)
        }
      else
        rows = Array(@grid_rows)
        severity_counts = grid_risk_counts(rows)

        @sidebar_summary = {
          view: "grid",
          sort_label: @sort_label,
          lens_label: @lens_label,
          team_count: @grid_teams.size,
          year_count: @grid_years.size,
          cell_count: rows.size,
          outgoing_count: rows.count { |row| truthy?(row["has_outgoing"]) },
          conditional_count: rows.count { |row| truthy?(row["has_conditional"]) },
          swap_count: rows.count { |row| truthy?(row["has_swap"]) },
          at_risk_count: rows.count { |row| grid_row_at_risk?(row) },
          critical_count: rows.count { |row| grid_row_critical?(row) },
          normal_count: severity_counts["normal"],
          severity_counts:,
          provenance_trade_total: rows.sum { |row| row["provenance_trade_count"].to_i },
          filters:
        }
      end
    end

    def load_sidebar_pick_payload(team_code:, draft_year:, draft_round:)
      payload = queries.fetch_sidebar_pick_payload(team_code:, draft_year:, draft_round:)
      raise ActiveRecord::RecordNotFound unless payload

      payload
    end

    def load_sidebar_selection_payload(transaction_id)
      payload = queries.fetch_sidebar_selection_payload(transaction_id)
      raise ActiveRecord::RecordNotFound unless payload

      payload
    end

    def picks_order_sql
      case @sort
      when "risk"
        "ranked_picks.ownership_risk_score DESC, ranked_picks.provenance_trade_count DESC, ranked_picks.outgoing_line_count DESC, ranked_picks.draft_round ASC, ranked_picks.original_team_code ASC"
      when "provenance"
        "ranked_picks.provenance_trade_count DESC, ranked_picks.ownership_risk_score DESC, ranked_picks.draft_round ASC, ranked_picks.original_team_code ASC"
      else
        "ranked_picks.draft_round ASC, ranked_picks.original_team_code ASC"
      end
    end

    def picks_lens_sql(alias_name:)
      case @lens
      when "at_risk"
        "(#{alias_name}.has_conditional OR #{alias_name}.is_swap OR #{alias_name}.has_forfeited OR #{alias_name}.pick_status = 'Traded' OR #{alias_name}.provenance_trade_count > 0)"
      when "critical"
        "(#{alias_name}.has_forfeited OR #{alias_name}.conditional_line_count >= 1 OR #{alias_name}.provenance_trade_count >= 2)"
      else
        "1=1"
      end
    end

    def selections_order_sql
      case @sort
      when "risk"
        "provenance_risk_score DESC, selection_rows.provenance_trade_count DESC, selection_rows.draft_round ASC, selection_rows.pick_number ASC"
      when "provenance"
        "selection_rows.provenance_trade_count DESC, provenance_risk_score DESC, selection_rows.draft_round ASC, selection_rows.pick_number ASC"
      else
        "selection_rows.draft_round ASC, selection_rows.pick_number ASC"
      end
    end

    def selections_lens_sql(alias_name:)
      case @lens
      when "at_risk"
        "(#{alias_name}.provenance_trade_count > 0 OR #{alias_name}.trade_id IS NOT NULL)"
      when "critical"
        "(#{alias_name}.provenance_trade_count >= 2)"
      else
        "1=1"
      end
    end

    def apply_grid_lens(rows)
      case @lens
      when "at_risk"
        rows.select { |row| grid_row_at_risk?(row) }
      when "critical"
        rows.select { |row| grid_row_critical?(row) }
      else
        rows
      end
    end

    def grid_row_at_risk?(row)
      truthy?(row["has_outgoing"]) || truthy?(row["has_conditional"]) || truthy?(row["has_swap"]) || row["provenance_trade_count"].to_i.positive?
    end

    def grid_row_critical?(row)
      truthy?(row["has_forfeited"]) || truthy?(row["has_conditional"]) || row["provenance_trade_count"].to_i >= 2
    end

    def grid_risk_tier(row)
      return "critical" if grid_row_critical?(row)
      return "at_risk" if grid_row_at_risk?(row)

      "normal"
    end

    def grid_risk_tier_label(tier)
      risk_tier_label(tier)
    end

    def risk_tier_label(tier)
      case tier.to_s
      when "critical"
        "Critical"
      when "at_risk"
        "At risk"
      else
        "Normal"
      end
    end

    def grid_risk_counts(rows)
      risk_tier_counts(rows) { |row| grid_risk_tier(row) }
    end

    def risk_tier_counts(rows)
      counts = {
        "normal" => 0,
        "at_risk" => 0,
        "critical" => 0
      }

      rows.each do |row|
        counts[yield(row)] += 1
      end

      counts
    end

    def picks_row_at_risk?(row)
      truthy?(row["has_conditional"]) || truthy?(row["is_swap"]) || truthy?(row["has_forfeited"]) || row["pick_status"].to_s == "Traded" || row["provenance_trade_count"].to_i.positive?
    end

    def picks_row_critical?(row)
      truthy?(row["has_forfeited"]) || truthy?(row["has_conditional"]) || row["provenance_trade_count"].to_i >= 2
    end

    def picks_risk_tier(row)
      return "critical" if picks_row_critical?(row)
      return "at_risk" if picks_row_at_risk?(row)

      "normal"
    end

    def selections_row_at_risk?(row)
      row["provenance_trade_count"].to_i.positive? || row["trade_id"].present?
    end

    def selections_row_critical?(row)
      row["provenance_trade_count"].to_i >= 2
    end

    def selections_risk_tier(row)
      return "critical" if selections_row_critical?(row)
      return "at_risk" if selections_row_at_risk?(row)

      "normal"
    end

    def grid_cell_risk_score(row)
      (
        (truthy?(row["has_forfeited"]) ? 7 : 0) +
        (truthy?(row["has_conditional"]) ? 4 : 0) +
        (truthy?(row["has_swap"]) ? 2 : 0) +
        (truthy?(row["has_outgoing"]) ? 2 : 0) +
        [row["provenance_trade_count"].to_i, 6].min
      ).to_i
    end

    def sort_grid_teams(team_map, rows)
      return [] if team_map.blank?

      grouped = rows.group_by { |row| row["team_code"].to_s }

      ranked = team_map.map do |team_code, team_name|
        team_rows = grouped[team_code.to_s] || []

        risk_total = team_rows.sum { |row| grid_cell_risk_score(row) }
        provenance_total = team_rows.sum { |row| row["provenance_trade_count"].to_i }
        outgoing_count = team_rows.count { |row| truthy?(row["has_outgoing"]) }

        {
          team_code: team_code.to_s,
          team_name: team_name,
          risk_total:,
          provenance_total:,
          outgoing_count:
        }
      end

      sorted = case @sort
      when "risk"
        ranked.sort_by { |row| [-row[:risk_total], -row[:outgoing_count], -row[:provenance_total], row[:team_code]] }
      when "provenance"
        ranked.sort_by { |row| [-row[:provenance_total], -row[:risk_total], -row[:outgoing_count], row[:team_code]] }
      else
        ranked.sort_by { |row| row[:team_code] }
      end

      sorted.map { |row| [row[:team_code], row[:team_name]] }
    end

    def drafts_sort_label(view:, sort:)
      case view.to_s
      when "grid"
        case sort.to_s
        when "risk" then "Most encumbered teams"
        when "provenance" then "Most provenance-active teams"
        else "Team code"
        end
      when "selections"
        case sort.to_s
        when "risk" then "Highest contest risk"
        when "provenance" then "Deepest provenance chain"
        else "Board order"
        end
      else
        case sort.to_s
        when "risk" then "Ownership risk first"
        when "provenance" then "Deepest provenance chain"
        else "Board order"
        end
      end
    end

    def drafts_lens_label(lens)
      case lens.to_s
      when "at_risk"
        "At-risk only"
      when "critical"
        "Critical only"
      else
        "All rows"
      end
    end

    def hydrate_initial_overlay_from_params!
      @initial_overlay_type = "none"
      @initial_overlay_key = ""
      @initial_overlay_partial = nil
      @initial_overlay_locals = {}

      context = requested_overlay_context
      return if context.blank?
      return unless selected_overlay_visible?(context: context)

      case context[:type]
      when "pick"
        @initial_overlay_partial = "entities/drafts/rightpanel_overlay_pick"
        @initial_overlay_locals = load_sidebar_pick_payload(
          team_code: context[:team_code],
          draft_year: context[:draft_year],
          draft_round: context[:draft_round]
        )
        @initial_overlay_type = "pick"
        @initial_overlay_key = overlay_key_for_pick(
          team_code: context[:team_code],
          draft_year: context[:draft_year],
          draft_round: context[:draft_round]
        )
      when "selection"
        transaction_id = context[:transaction_id].to_i
        @initial_overlay_partial = "entities/drafts/rightpanel_overlay_selection"
        @initial_overlay_locals = load_sidebar_selection_payload(transaction_id)
        @initial_overlay_type = "selection"
        @initial_overlay_key = "selection-#{transaction_id}"
      end
    rescue ActiveRecord::RecordNotFound
      @initial_overlay_type = "none"
      @initial_overlay_key = ""
      @initial_overlay_partial = nil
      @initial_overlay_locals = {}
    end

    def requested_overlay_context
      overlay_type = params[:selected_type].to_s.strip.downcase
      overlay_key = params[:selected_key].to_s.strip

      case overlay_type
      when "pick"
        parse_pick_overlay_key(overlay_key)
      when "selection"
        parse_selection_overlay_key(overlay_key)
      else
        nil
      end
    end

    def selected_overlay_visible?(context:)
      return false if context.blank?

      case context[:type]
      when "pick"
        return false unless %w[picks grid].include?(@view)

        selected_pick_visible?(
          team_code: context[:team_code],
          draft_year: context[:draft_year],
          draft_round: context[:draft_round]
        )
      when "selection"
        return false unless @view == "selections"

        Array(@results).any? { |row| row["transaction_id"].to_i == context[:transaction_id].to_i }
      else
        false
      end
    end

    def overlay_key_for_pick(team_code:, draft_year:, draft_round:)
      key_prefix = @view == "grid" ? "grid" : "pick"
      "#{key_prefix}-#{team_code}-#{draft_year}-#{draft_round}"
    end

    def parse_pick_overlay_key(raw_key)
      match = raw_key.match(/\A(?:pick|grid)-([A-Za-z]{3})-(\d{4})-(\d+)\z/)
      return nil unless match

      team_code = match[1].to_s.upcase
      draft_year = match[2].to_i
      draft_round = match[3].to_i

      return nil if team_code.blank? || draft_year <= 0 || draft_round <= 0

      {
        type: "pick",
        team_code:,
        draft_year:,
        draft_round:
      }
    end

    def parse_selection_overlay_key(raw_key)
      match = raw_key.match(/\Aselection-(\d+)\z/)
      return nil unless match

      transaction_id = match[1].to_i
      return nil if transaction_id <= 0

      {
        type: "selection",
        transaction_id:
      }
    end

    def selected_pick_visible?(team_code:, draft_year:, draft_round:)
      if @view == "grid"
        @grid_data.dig(team_code, draft_round.to_i, draft_year.to_i).present?
      else
        Array(@results).any? do |row|
          row["original_team_code"].to_s.upcase == team_code.to_s.upcase &&
            row["draft_year"].to_i == draft_year.to_i &&
            row["draft_round"].to_i == draft_round.to_i
        end
      end
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

    def normalize_sort_param(raw)
      sort = raw.to_s.strip
      sort = "board" if sort.blank?
      return sort if INDEX_SORTS.include?(sort)

      nil
    end

    def normalize_lens_param(raw)
      lens = raw.to_s.strip
      lens = "all" if lens.blank?
      return lens if INDEX_LENSES.include?(lens)

      nil
    end

    def truthy?(value)
      ActiveModel::Type::Boolean.new.cast(value)
    end
  end
end
