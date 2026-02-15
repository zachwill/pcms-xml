module Teams
  class IndexWorkspaceState
    def initialize(
      params:,
      request_query_parameters:,
      queries:,
      index_salary_year:,
      conference_lenses:,
      pressure_lenses:,
      pressure_section_definitions:,
      sort_sql:
    )
      @params = params
      @request_query_parameters = request_query_parameters || {}
      @queries = queries
      @index_salary_year = index_salary_year
      @conference_lenses = conference_lenses
      @pressure_lenses = pressure_lenses
      @pressure_section_definitions = pressure_section_definitions
      @sort_sql = sort_sql
    end

    def build(apply_compare_action: false)
      setup_index_filters!
      apply_index_compare_action! if apply_compare_action
      load_index_teams!
      build_index_pressure_sections!
      build_index_compare_state!
      build_index_sidebar_summary!(selected_team_id: @selected_team_id)

      {
        conference_lens: @conference_lens,
        pressure_lens: @pressure_lens,
        sort_lens: @sort_lens,
        query: @query,
        selected_team_id: @selected_team_id,
        compare_a_id: @compare_a_id,
        compare_b_id: @compare_b_id,
        teams_scope_rows: @teams_scope_rows,
        pressure_counts: @pressure_counts,
        teams: @teams,
        team_sections: @team_sections,
        compare_a_row: @compare_a_row,
        compare_b_row: @compare_b_row,
        sidebar_summary: @sidebar_summary
      }
    end

    private

    attr_reader :params, :request_query_parameters, :queries, :index_salary_year, :conference_lenses,
      :pressure_lenses, :pressure_section_definitions, :sort_sql

    def setup_index_filters!
      requested_conference = params[:conference].to_s.strip
      @conference_lens = conference_lenses.key?(requested_conference) ? requested_conference : "ALL"

      requested_pressure = params[:pressure].to_s.strip
      @pressure_lens = pressure_lenses.include?(requested_pressure) ? requested_pressure : "all"

      requested_sort = params[:sort].to_s.strip
      @sort_lens = sort_sql.key?(requested_sort) ? requested_sort : "pressure_desc"

      @query = params[:q].to_s.strip
      @selected_team_id = normalize_selected_team_id_param(params[:selected_id])
      @compare_a_id = normalize_selected_team_id_param(params[:compare_a])
      @compare_b_id = normalize_selected_team_id_param(params[:compare_b])
      normalize_compare_slots!
    end

    def apply_index_compare_action!
      compare_action_param = params[:compare_action].presence || request_query_parameters["action"]
      compare_slot_param = params[:compare_slot].presence || request_query_parameters["slot"]

      action = resolve_compare_action(compare_action_param)
      slot = resolve_compare_slot(compare_slot_param)
      team_id = normalize_selected_team_id_param(params[:team_id])

      case action
      when "pin"
        return if slot.blank? || team_id.blank?

        if slot == "a"
          @compare_a_id = (@compare_a_id == team_id ? nil : team_id)
          @compare_b_id = nil if @compare_b_id == @compare_a_id
        else
          @compare_b_id = (@compare_b_id == team_id ? nil : team_id)
          @compare_a_id = nil if @compare_a_id == @compare_b_id
        end
      when "clear_slot"
        return if slot.blank?

        if slot == "a"
          @compare_a_id = nil
        else
          @compare_b_id = nil
        end
      when "clear_all"
        @compare_a_id = nil
        @compare_b_id = nil
      end

      normalize_compare_slots!
    end

    def load_index_teams!
      conn = ActiveRecord::Base.connection
      where_clauses = [
        "t.league_lk = 'NBA'",
        "t.team_name NOT LIKE 'Non-NBA%'"
      ]

      conference_name = conference_lenses.fetch(@conference_lens)
      where_clauses << "t.conference_name = #{conn.quote(conference_name)}" if conference_name.present?

      if @query.present?
        query_sql = conn.quote("%#{@query}%")
        where_clauses << <<~SQL.squish
          (
            t.team_code ILIKE #{query_sql}
            OR t.team_name ILIKE #{query_sql}
            OR t.city ILIKE #{query_sql}
            OR t.conference_name ILIKE #{query_sql}
            OR t.division_name ILIKE #{query_sql}
          )
        SQL
      end

      order_sql = sort_sql.fetch(@sort_lens)

      @teams_scope_rows = queries.fetch_index_teams(
        year: index_salary_year,
        where_sql: where_clauses.join(" AND "),
        order_sql:
      )

      @pressure_counts = build_pressure_counts(@teams_scope_rows)
      @teams = @teams_scope_rows.select { |row| pressure_row_matches_lens?(row, @pressure_lens) }
    end

    def build_index_pressure_sections!
      rows = Array(@teams)

      @team_sections = pressure_section_definitions.filter_map do |definition|
        section_rows = rows.select { |row| row["pressure_bucket"].to_s == definition[:key] }
        next if section_rows.empty?

        {
          key: definition[:key],
          title: definition[:title],
          subtitle: definition[:subtitle],
          row_count: section_rows.size,
          taxpayer_count: section_rows.count { |row| row["is_taxpayer"] },
          repeater_count: section_rows.count { |row| row["is_repeater_taxpayer"] },
          cap_space_total: section_rows.sum { |row| row["cap_space"].to_f },
          room_under_tax_total: section_rows.sum { |row| row["room_under_tax"].to_f },
          room_under_apron1_total: section_rows.sum { |row| row["room_under_apron1"].to_f },
          room_under_apron2_total: section_rows.sum { |row| row["room_under_apron2"].to_f },
          luxury_tax_total: section_rows.sum { |row| row["luxury_tax_owed"].to_f },
          roster_total: section_rows.sum { |row| row["roster_row_count"].to_i },
          two_way_total: section_rows.sum { |row| row["two_way_row_count"].to_i },
          rows: section_rows
        }
      end
    end

    def build_index_compare_state!
      @teams_by_id = Array(@teams).index_by { |row| row["team_id"].to_i }

      @compare_a_row = compare_row_from_workspace_or_lookup(@compare_a_id)
      @compare_b_row = compare_row_from_workspace_or_lookup(@compare_b_id)

      @compare_a_id = nil if @compare_a_id.present? && @compare_a_row.blank?
      @compare_b_id = nil if @compare_b_id.present? && @compare_b_row.blank?
      normalize_compare_slots!
    end

    def build_index_sidebar_summary!(selected_team_id: nil)
      rows = Array(@teams)
      active_filters = []
      active_filters << %(Search: "#{@query}") if @query.present?
      active_filters << "Conference: #{@conference_lens}" unless @conference_lens == "ALL"
      active_filters << "Pressure: #{pressure_lens_label(@pressure_lens)}" unless @pressure_lens == "all"
      active_filters << "Sort: #{sort_lens_label(@sort_lens)}" unless @sort_lens == "pressure_desc"

      top_rows = rows.first(14)
      selected_id = selected_team_id.to_i
      if selected_id.positive?
        selected_row = rows.find { |row| row["team_id"].to_i == selected_id }
        if selected_row.present? && top_rows.none? { |row| row["team_id"].to_i == selected_id }
          top_rows = [selected_row] + top_rows.first(13)
        end
      end

      pressure_counts = @pressure_counts || build_pressure_counts(@teams_scope_rows || rows)

      @sidebar_summary = {
        row_count: rows.size,
        eastern_count: rows.count { |row| row["conference_name"] == "Eastern" },
        western_count: rows.count { |row| row["conference_name"] == "Western" },
        over_cap_count: pressure_counts["over_cap"],
        over_tax_count: pressure_counts["over_tax"],
        over_apron1_count: pressure_counts["over_apron1"],
        over_apron2_count: pressure_counts["over_apron2"],
        pressure_counts: pressure_counts,
        section_counts: Array(@team_sections).to_h { |section| [section[:key], section[:row_count]] },
        active_pressure_lens: @pressure_lens,
        active_pressure_label: pressure_lens_label(@pressure_lens),
        active_pressure_count: pressure_counts[@pressure_lens],
        luxury_tax_total: rows.sum { |row| row["luxury_tax_owed"].to_f },
        filters: active_filters,
        top_rows: top_rows,
        compare_a_id: @compare_a_id,
        compare_b_id: @compare_b_id,
        compare_a_row: @compare_a_row,
        compare_b_row: @compare_b_row
      }
    end

    def fetch_index_team_row(team_id)
      queries.fetch_index_team_row(team_id: team_id, year: index_salary_year)
    end

    def compare_row_from_workspace_or_lookup(team_id)
      normalized_id = team_id.to_i
      return nil if normalized_id <= 0

      workspace_row = @teams_by_id[normalized_id]
      return workspace_row if workspace_row.present?

      fetch_index_team_row(normalized_id)
    end

    def pressure_lens_label(lens)
      case lens
      when "over_cap" then "Over cap"
      when "over_tax" then "Over tax"
      when "over_apron1" then "Over Apron 1"
      when "over_apron2" then "Over Apron 2"
      else "All teams"
      end
    end

    def build_pressure_counts(rows)
      scoped_rows = Array(rows)

      {
        "all" => scoped_rows.size,
        "over_cap" => scoped_rows.count { |row| pressure_rank_for_row(row) >= 1 },
        "over_tax" => scoped_rows.count { |row| pressure_rank_for_row(row) >= 2 },
        "over_apron1" => scoped_rows.count { |row| pressure_rank_for_row(row) >= 3 },
        "over_apron2" => scoped_rows.count { |row| pressure_rank_for_row(row) >= 4 }
      }
    end

    def pressure_row_matches_lens?(row, lens)
      threshold = pressure_threshold_for_lens(lens)
      return true if threshold.zero?

      pressure_rank_for_row(row) >= threshold
    end

    def pressure_threshold_for_lens(lens)
      case lens
      when "over_cap" then 1
      when "over_tax" then 2
      when "over_apron1" then 3
      when "over_apron2" then 4
      else 0
      end
    end

    def pressure_rank_for_row(row)
      row["pressure_rank"].to_i
    end

    def sort_lens_label(lens)
      case lens
      when "cap_space_asc" then "Cap space (tightest first)"
      when "tax_room_asc" then "Tax room (tightest first)"
      when "team_asc" then "Team A→Z"
      else "Pressure first"
      end
    end

    def resolve_compare_action(raw)
      action = raw.to_s.strip
      %w[pin clear_slot clear_all].include?(action) ? action : nil
    end

    def resolve_compare_slot(raw)
      slot = raw.to_s.strip.downcase
      %w[a b].include?(slot) ? slot : nil
    end

    def normalize_compare_slots!
      if @compare_a_id.present? && @compare_b_id.present? && @compare_a_id == @compare_b_id
        @compare_b_id = nil
      end
    end

    def normalize_selected_team_id_param(raw)
      selected_id = Integer(raw.to_s.strip, 10)
      selected_id.positive? ? selected_id : nil
    rescue ArgumentError, TypeError
      nil
    end
  end
end
