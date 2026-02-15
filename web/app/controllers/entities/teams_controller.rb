module Entities
  class TeamsController < ApplicationController
    INDEX_SALARY_YEAR = 2025

    INDEX_CONFERENCE_LENSES = {
      "ALL" => nil,
      "Eastern" => "Eastern",
      "Western" => "Western"
    }.freeze

    INDEX_PRESSURE_LENSES = %w[all over_cap over_tax over_apron1 over_apron2].freeze

    INDEX_PRESSURE_SECTION_DEFINITIONS = [
      {
        key: "over_apron2",
        title: "Apron 2 red zone",
        subtitle: "Most restrictive pressure posture"
      },
      {
        key: "over_apron1",
        title: "Apron 1 pressure",
        subtitle: "Above apron line, below second apron"
      },
      {
        key: "over_tax",
        title: "Tax pressure",
        subtitle: "Taxpayer but under apron lines"
      },
      {
        key: "over_cap",
        title: "Over cap runway",
        subtitle: "Over cap, under tax"
      },
      {
        key: "under_cap",
        title: "Under cap flex",
        subtitle: "Cap-space preserving posture"
      }
    ].freeze

    INDEX_SORT_SQL = {
      "pressure_desc" => "pressure_rank DESC, COALESCE(tsw.room_under_apron2, 0) ASC, COALESCE(tsw.room_under_apron1, 0) ASC, COALESCE(tsw.room_under_tax, 0) ASC, t.team_code ASC",
      "cap_space_asc" => "(COALESCE(tsw.salary_cap_amount, 0) - COALESCE(tsw.cap_total_hold, 0)) ASC, t.team_code ASC",
      "tax_room_asc" => "COALESCE(tsw.room_under_tax, 0) ASC, t.team_code ASC",
      "team_asc" => "t.team_code ASC"
    }.freeze

    # GET /teams
    def index
      load_index_workspace_state!
      render :index
    end

    # GET /teams/pane
    def pane
      load_index_workspace_state!
      render partial: "entities/teams/workspace_main"
    end

    # GET /teams/sidebar/:id
    def sidebar
      team_id = Integer(params[:id])
      load_index_team_row!(team_id)

      render partial: "entities/teams/rightpanel_overlay_team", locals: { team_row: @sidebar_team_row }
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    # GET /teams/sidebar/clear
    def sidebar_clear
      render partial: "entities/teams/rightpanel_clear"
    end

    # GET /teams/:slug
    # Canonical route.
    def show
      @defer_heavy_load = params[:full].to_s != "1"

      resolve_team_from_slug!(params[:slug])
      return if performed?

      if @defer_heavy_load
        load_team_header_snapshot!
        seed_empty_team_workspace!
      else
        load_team_workspace_data!
      end

      render :show
    end

    # GET /teams/:id (numeric fallback)
    def redirect
      id = Integer(params[:id])

      canonical = Slug.find_by(entity_type: "team", entity_id: id, canonical: true)
      if canonical
        redirect_to team_path(canonical.slug), status: :moved_permanently
        return
      end

      row = queries.fetch_team_for_redirect(id)
      raise ActiveRecord::RecordNotFound unless row

      base = row["team_code"].to_s.strip.downcase
      base = row["team_name"].to_s.parameterize if base.blank?
      base = "team-#{id}" if base.blank?

      slug = base
      i = 2
      while Slug.reserved_slug?(slug) || Slug.exists?(entity_type: "team", slug: slug)
        slug = "#{base}-#{i}"
        i += 1
      end

      Slug.create!(entity_type: "team", entity_id: id, slug: slug, canonical: true)

      redirect_to team_path(slug), status: :moved_permanently
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    private

    def queries
      @queries ||= TeamQueries.new(connection: ActiveRecord::Base.connection)
    end

    def load_index_workspace_state!(apply_compare_action: false)
      setup_index_filters!
      apply_index_compare_action! if apply_compare_action
      load_index_teams!
      build_index_pressure_sections!
      build_index_compare_state!
      build_index_sidebar_summary!(selected_team_id: @selected_team_id)
    end

    def setup_index_filters!
      requested_conference = params[:conference].to_s.strip
      @conference_lens = INDEX_CONFERENCE_LENSES.key?(requested_conference) ? requested_conference : "ALL"

      requested_pressure = params[:pressure].to_s.strip
      @pressure_lens = INDEX_PRESSURE_LENSES.include?(requested_pressure) ? requested_pressure : "all"

      requested_sort = params[:sort].to_s.strip
      @sort_lens = INDEX_SORT_SQL.key?(requested_sort) ? requested_sort : "pressure_desc"

      @query = params[:q].to_s.strip
      @selected_team_id = normalize_selected_team_id_param(params[:selected_id])
      @compare_a_id = normalize_selected_team_id_param(params[:compare_a])
      @compare_b_id = normalize_selected_team_id_param(params[:compare_b])
      normalize_compare_slots!
    end

    def apply_index_compare_action!
      compare_action_param = params[:compare_action].presence || request.query_parameters["action"]
      compare_slot_param = params[:compare_slot].presence || request.query_parameters["slot"]

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

      conference_name = INDEX_CONFERENCE_LENSES.fetch(@conference_lens)
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

      order_sql = INDEX_SORT_SQL.fetch(@sort_lens)

      @teams_scope_rows = queries.fetch_index_teams(
        year: INDEX_SALARY_YEAR,
        where_sql: where_clauses.join(" AND "),
        order_sql: order_sql
      )

      @pressure_counts = build_pressure_counts(@teams_scope_rows)
      @teams = @teams_scope_rows.select { |row| pressure_row_matches_lens?(row, @pressure_lens) }
    end

    def build_index_pressure_sections!
      rows = Array(@teams)

      @team_sections = INDEX_PRESSURE_SECTION_DEFINITIONS.filter_map do |definition|
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

    def load_index_team_row!(team_id)
      @sidebar_team_row = fetch_index_team_row(team_id)
      raise ActiveRecord::RecordNotFound unless @sidebar_team_row
    end

    def fetch_index_team_row(team_id)
      queries.fetch_index_team_row(team_id: team_id, year: INDEX_SALARY_YEAR)
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

    def selected_overlay_visible?(overlay_id:)
      normalized_id = overlay_id.to_i
      return false if normalized_id <= 0

      Array(@teams).any? { |row| row["team_id"].to_i == normalized_id }
    end

    def resolve_team_from_slug!(raw_slug, redirect_on_canonical_miss: true)
      slug = raw_slug.to_s.strip.downcase
      raise ActiveRecord::RecordNotFound if slug.blank?

      # Teams are special: team_code is stable + guessable.
      # If we don't have a slug record yet, try to bootstrap it from pcms.teams.
      record = Slug.find_by(entity_type: "team", slug: slug)
      record ||= bootstrap_team_slug_from_code!(slug)

      canonical = Slug.find_by(entity_type: "team", entity_id: record.entity_id, canonical: true)
      if canonical && canonical.slug != record.slug
        if redirect_on_canonical_miss
          redirect_to team_path(canonical.slug), status: :moved_permanently
          return
        end

        record = canonical
      end

      @team_id = record.entity_id
      @team_slug = record.slug

      @team = queries.fetch_team_by_id(@team_id)
      raise ActiveRecord::RecordNotFound unless @team
    end

    def load_team_header_snapshot!
      row = queries.fetch_team_salary_snapshot(@team["team_code"], salary_year: INDEX_SALARY_YEAR)
      @team_salary_rows = row ? [row] : []
    end

    def seed_empty_team_workspace!
      @roster = []
      @cap_holds = []
      @exceptions = []
      @dead_money = []
      @draft_assets = []
      @recent_ledger_entries = []
      @exception_usage_rows = []
      @apron_provenance_rows = []
      @two_way_capacity_row = nil
      @two_way_watchlist_rows = []
      @team_salary_rows ||= []
    end

    def load_team_workspace_data!
      @roster = queries.fetch_roster(@team["team_code"])
      @team_salary_rows = queries.fetch_team_salary_rows(@team["team_code"])
      @cap_holds = queries.fetch_cap_holds(@team["team_code"])
      @exceptions = queries.fetch_exceptions(@team["team_code"])
      @dead_money = queries.fetch_dead_money(@team["team_code"])
      @draft_assets = queries.fetch_draft_assets(@team["team_code"])
      @recent_ledger_entries = queries.fetch_recent_ledger_entries(@team_id)
      @exception_usage_rows = queries.fetch_exception_usage_rows(@team_id)
      @apron_provenance_rows = queries.fetch_apron_provenance_rows(@team_id)
      @two_way_capacity_row = queries.fetch_two_way_capacity_row(team_id: @team_id, team_code: @team["team_code"])
      @two_way_watchlist_rows = queries.fetch_two_way_watchlist_rows(@team["team_code"])
    end

    def bootstrap_team_slug_from_code!(slug)
      code = slug.to_s.strip.upcase
      raise ActiveRecord::RecordNotFound if Slug.reserved_slug?(slug)
      raise ActiveRecord::RecordNotFound unless code.match?(/\A[A-Z]{3}\z/)

      row = queries.fetch_team_id_by_code(code)
      raise ActiveRecord::RecordNotFound unless row

      team_id = row["team_id"]

      # If another team already owns this slug, don't overwrite.
      existing = Slug.find_by(entity_type: "team", slug: slug)
      return existing if existing

      canonical = Slug.find_by(entity_type: "team", entity_id: team_id, canonical: true)
      return canonical if canonical

      Slug.create!(entity_type: "team", entity_id: team_id, slug: slug, canonical: true)
    end
  end
end
