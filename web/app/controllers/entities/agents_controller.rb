module Entities
  class AgentsController < ApplicationController
    BOOK_YEARS = [2025, 2026, 2027].freeze
    AGENT_SORT_KEYS = %w[book clients teams max expirings options name].freeze
    AGENCY_SORT_KEYS = %w[book clients agents teams max expirings options name].freeze
    OVERLAY_TYPES = %w[agent agency].freeze
    SHOW_COHORT_FILTERS = %w[max expiring restricted two_way].freeze

    # GET /agents
    def index
      setup_directory_filters!
      load_directory_rows!
      build_sidebar_summary!

      render :index
    end

    # GET /agents/pane
    # Datastar patch target for main canvas only.
    def pane
      setup_directory_filters!
      load_directory_rows!
      build_sidebar_summary!

      render partial: "entities/agents/workspace_main"
    end

    # GET /agents/sidebar/base
    def sidebar_base
      setup_directory_filters!
      load_directory_rows!
      build_sidebar_summary!

      render partial: "entities/agents/rightpanel_base"
    end

    # GET /agents/sidebar/agent/:id
    def sidebar_agent
      agent_id = Integer(params[:id])
      render partial: "entities/agents/rightpanel_overlay_agent", locals: load_sidebar_agent_payload(agent_id)
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    # GET /agents/sidebar/agency/:id
    def sidebar_agency
      agency_id = Integer(params[:id])
      render partial: "entities/agents/rightpanel_overlay_agency", locals: load_sidebar_agency_payload(agency_id)
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    # GET /agents/sidebar/clear
    def sidebar_clear
      render partial: "entities/agents/rightpanel_clear"
    end

    # GET /agents/:slug
    # Canonical route.
    def show
      slug = params[:slug].to_s.strip.downcase
      raise ActiveRecord::RecordNotFound if slug.blank?

      record = Slug.find_by!(entity_type: "agent", slug: slug)

      canonical = Slug.find_by(entity_type: "agent", entity_id: record.entity_id, canonical: true)
      if canonical && canonical.slug != record.slug
        redirect_to agent_path(canonical.slug, **request.query_parameters), status: :moved_permanently
        return
      end

      @agent_id = record.entity_id
      @agent_slug = record.slug
      load_show_cohort_filters!

      @agent = queries.fetch_agent_for_show(@agent_id)
      raise ActiveRecord::RecordNotFound unless @agent

      @agency = queries.fetch_agency(@agent["agency_id"]) if @agent["agency_id"].present?

      @clients = queries.fetch_show_clients(@agent_id)
      @client_rollup = queries.fetch_show_client_rollup(@agent_id)
      @team_distribution = queries.fetch_show_team_distribution(@agent_id)
      @book_by_year = queries.fetch_show_book_by_year(@agent_id)
      @historical_footprint_rollup = queries.fetch_show_historical_footprint_rollup(@agent_id)
      @historical_signing_trend = queries.fetch_show_historical_signing_trend(@agent_id)

      render :show
    end

    # GET /agents/:id (numeric fallback)
    def redirect
      id = Integer(params[:id])

      canonical = Slug.find_by(entity_type: "agent", entity_id: id, canonical: true)
      if canonical
        redirect_to agent_path(canonical.slug), status: :moved_permanently
        return
      end

      row = queries.fetch_agent_name_for_redirect(id)
      raise ActiveRecord::RecordNotFound unless row

      base = row["full_name"].to_s.parameterize
      base = "agent-#{id}" if base.blank?

      slug = base
      i = 2
      while Slug.reserved_slug?(slug) || Slug.exists?(entity_type: "agent", slug: slug)
        slug = "#{base}-#{i}"
        i += 1
      end

      Slug.create!(entity_type: "agent", entity_id: id, slug: slug, canonical: true)

      redirect_to agent_path(slug), status: :moved_permanently
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    private

    def queries
      @queries ||= AgentQueries.new(connection: ActiveRecord::Base.connection)
    end

    def load_show_cohort_filters!
      @show_cohort_filters = normalize_show_cohort_filters(params[:cohorts])
    end

    def normalize_show_cohort_filters(raw_filters)
      tokens = Array(raw_filters)
      tokens = [raw_filters] if tokens.empty?

      tokens
        .flat_map { |value| value.to_s.split(",") }
        .map { |value| value.to_s.strip.downcase.tr("-", "_") }
        .reject(&:blank?)
        .select { |value| SHOW_COHORT_FILTERS.include?(value) }
        .uniq
    end

    def setup_directory_filters!
      @directory_kind = params[:kind].to_s == "agencies" ? "agencies" : "agents"
      @query = params[:q].to_s.strip

      @active_only = cast_bool(params[:active_only])
      @certified_only = cast_bool(params[:certified_only])
      @with_clients = cast_bool(params[:with_clients])
      @with_book = cast_bool(params[:with_book])
      @with_restrictions = cast_bool(params[:with_restrictions])
      @with_expiring = cast_bool(params[:with_expiring])

      year = begin
        Integer(params[:year])
      rescue ArgumentError, TypeError
        nil
      end
      @book_year = BOOK_YEARS.include?(year) ? year : BOOK_YEARS.first

      @sort_dir = params[:dir].to_s == "asc" ? "asc" : "desc"

      allowed_sort_keys = @directory_kind == "agencies" ? AGENCY_SORT_KEYS : AGENT_SORT_KEYS
      @sort_key = params[:sort].to_s
      @sort_key = "book" unless allowed_sort_keys.include?(@sort_key)

      @agency_scope_active = cast_bool(params[:agency_scope])
      @agency_scope_id = parse_positive_integer(params[:agency_scope_id])

      if @agency_scope_active && @directory_kind == "agents"
        @agency_scope_id ||= parse_overlay_agency_id_from_params
        @agency_scope_active = false unless @agency_scope_id.present?
      else
        @agency_scope_active = false
        @agency_scope_id = nil
      end
    end

    def load_directory_rows!
      conn = ActiveRecord::Base.connection
      book_total_sql = sql_book_total("w")
      book_percentile_sql = sql_book_percentile("w")
      expiring_sql = sql_expiring_in_window("w")

      if @directory_kind == "agencies"
        sort_sql = sql_sort_for_agencies(book_total_sql:, expiring_sql:)
        where_clauses = ["1 = 1"]
        where_clauses << "COALESCE(w.is_active, true) = true" if @active_only
        where_clauses << "COALESCE(w.client_count, 0) > 0" if @with_clients
        where_clauses << "COALESCE(#{book_total_sql}, 0) > 0" if @with_book
        where_clauses << "COALESCE(#{expiring_sql}, 0) > 0" if @with_expiring
        where_clauses << "(COALESCE(w.no_trade_count, 0) > 0 OR COALESCE(w.trade_kicker_count, 0) > 0 OR COALESCE(w.trade_restricted_count, 0) > 0)" if @with_restrictions

        if @query.present?
          query_sql = conn.quote("%#{@query}%")
          query_clauses = [
            "w.agency_name ILIKE #{query_sql}",
            "EXISTS (SELECT 1 FROM pcms.agents_warehouse aw WHERE aw.agency_id = w.agency_id AND aw.full_name ILIKE #{query_sql})"
          ]
          if @query.match?(/\A\d+\z/)
            query_id_sql = conn.quote(@query.to_i)
            query_clauses << "w.agency_id = #{query_id_sql}"
            query_clauses << "EXISTS (SELECT 1 FROM pcms.agents_warehouse aw WHERE aw.agency_id = w.agency_id AND aw.agent_id = #{query_id_sql})"
          end

          where_clauses << "(#{query_clauses.join(" OR ")})"
        end

        @agencies = queries.fetch_directory_agencies(
          where_sql: where_clauses.join(" AND "),
          sort_sql: sort_sql,
          sort_direction: sql_sort_direction_for_key,
          book_total_sql: book_total_sql,
          book_percentile_sql: book_percentile_sql,
          expiring_sql: expiring_sql
        )

        @agents = []
      else
        sort_sql = sql_sort_for_agents(book_total_sql:, expiring_sql:)
        where_clauses = ["1 = 1"]
        where_clauses << "COALESCE(w.is_active, true) = true" if @active_only
        where_clauses << "COALESCE(w.is_certified, false) = true" if @certified_only
        where_clauses << "COALESCE(w.client_count, 0) > 0" if @with_clients
        where_clauses << "COALESCE(#{book_total_sql}, 0) > 0" if @with_book
        where_clauses << "COALESCE(#{expiring_sql}, 0) > 0" if @with_expiring
        where_clauses << "(COALESCE(w.no_trade_count, 0) > 0 OR COALESCE(w.trade_kicker_count, 0) > 0 OR COALESCE(w.trade_restricted_count, 0) > 0)" if @with_restrictions
        where_clauses << "w.agency_id = #{conn.quote(@agency_scope_id)}" if @agency_scope_active && @agency_scope_id.present?

        if @query.present?
          query_sql = conn.quote("%#{@query}%")
          query_clauses = [
            "w.full_name ILIKE #{query_sql}",
            "COALESCE(w.agency_name, '') ILIKE #{query_sql}"
          ]
          if @query.match?(/\A\d+\z/)
            query_id_sql = conn.quote(@query.to_i)
            query_clauses << "w.agent_id = #{query_id_sql}"
            query_clauses << "w.agency_id = #{query_id_sql}"
          end

          where_clauses << "(#{query_clauses.join(" OR ")})"
        end

        @agents = queries.fetch_directory_agents(
          where_sql: where_clauses.join(" AND "),
          sort_sql: sort_sql,
          sort_direction: sql_sort_direction_for_key,
          book_total_sql: book_total_sql,
          book_percentile_sql: book_percentile_sql,
          expiring_sql: expiring_sql
        )

        @agencies = []
      end
    end

    def build_sidebar_summary!
      rows = @directory_kind == "agencies" ? @agencies : @agents

      @sidebar_summary = {
        kind: @directory_kind,
        year: @book_year,
        query: @query,
        sort_key: @sort_key,
        sort_dir: @sort_dir,
        row_count: rows.size,
        active_count: rows.count { |row| row["is_active"] != false },
        client_total: rows.sum { |row| row["client_count"].to_i },
        standard_total: rows.sum { |row| row["standard_count"].to_i },
        two_way_total: rows.sum { |row| row["two_way_count"].to_i },
        team_total: rows.sum { |row| row["team_count"].to_i },
        max_total: rows.sum { |row| row["max_contract_count"].to_i },
        expiring_total: rows.sum { |row| row["expiring_in_window"].to_i },
        restricted_total: rows.sum { |row| row["trade_restricted_count"].to_i },
        option_total: rows.sum { |row| row["player_option_count"].to_i + row["team_option_count"].to_i },
        book_total: rows.sum { |row| row["book_total"].to_i },
        agency_scope_active: @agency_scope_active,
        agency_scope_id: @agency_scope_id,
        agency_scope_name: active_agency_scope_name(rows),
        filters: sidebar_filter_labels,
        top_rows: sidebar_top_rows(rows)
      }
    end

    def sidebar_top_rows(rows)
      rows.first(14).map do |row|
        if @directory_kind == "agencies"
          {
            type: "agency",
            id: row["agency_id"],
            title: row["agency_name"],
            subtitle: "#{row['agent_count'].to_i} agents · #{row['client_count'].to_i} clients",
            book_total: row["book_total"].to_i,
            percentile: row["book_total_percentile"]
          }
        else
          {
            type: "agent",
            id: row["agent_id"],
            title: row["full_name"],
            subtitle: "#{row['client_count'].to_i} clients · #{row['team_count'].to_i} teams",
            book_total: row["book_total"].to_i,
            percentile: row["book_total_percentile"]
          }
        end
      end
    end

    def sidebar_filter_labels
      labels = []
      labels << %(Search: "#{@query}") if @query.present?
      labels << "Active only" if @active_only
      labels << "Certified only" if @certified_only && @directory_kind == "agents"
      labels << "With clients" if @with_clients
      labels << "With book" if @with_book
      labels << "With restrictions" if @with_restrictions
      labels << "With expirings" if @with_expiring
      labels << "Scoped to agency ##{@agency_scope_id}" if @agency_scope_active && @agency_scope_id.present?
      labels
    end

    def active_agency_scope_name(rows)
      return nil unless @directory_kind == "agents" && @agency_scope_active && @agency_scope_id.present?

      rows.find { |row| row["agency_id"].to_i == @agency_scope_id }&.dig("agency_name")
    end

    def selected_overlay_visible?(overlay_type:, overlay_id:)
      normalized_type = overlay_type.to_s
      return false unless OVERLAY_TYPES.include?(normalized_type)

      normalized_id = overlay_id.to_i
      return false if normalized_id <= 0

      case normalized_type
      when "agent"
        agent_overlay_visible_in_scope?(normalized_id)
      when "agency"
        agency_overlay_visible_in_scope?(normalized_id)
      else
        false
      end
    end

    def agent_overlay_visible_in_scope?(agent_id)
      if @directory_kind == "agents"
        @agents.any? { |row| row["agent_id"].to_i == agent_id }
      else
        agency_id = agency_id_for_agent(agent_id)
        agency_id.present? && visible_agency_ids.include?(agency_id)
      end
    end

    def agency_overlay_visible_in_scope?(agency_id)
      return true if @directory_kind == "agents" && @agency_scope_active && @agency_scope_id.present? && @agency_scope_id == agency_id

      visible_agency_ids.include?(agency_id)
    end

    def visible_agency_ids
      @visible_agency_ids ||= begin
        rows = @directory_kind == "agencies" ? @agencies : @agents
        rows.map { |row| row["agency_id"].to_i }.select(&:positive?)
      end
    end

    def agency_id_for_agent(agent_id)
      @agency_ids_by_agent_id ||= {}
      return @agency_ids_by_agent_id[agent_id] if @agency_ids_by_agent_id.key?(agent_id)

      row = queries.fetch_agency_id_for_agent(agent_id)
      resolved_id = row&.dig("agency_id").to_i
      @agency_ids_by_agent_id[agent_id] = resolved_id.positive? ? resolved_id : nil
    end

    def load_sidebar_agent_payload(agent_id)
      agent = queries.fetch_sidebar_agent(agent_id)
      raise ActiveRecord::RecordNotFound unless agent

      clients = queries.fetch_sidebar_agent_clients(agent_id)

      {
        agent:,
        clients:
      }
    end

    def load_sidebar_agency_payload(agency_id)
      agency = queries.fetch_sidebar_agency(agency_id)
      raise ActiveRecord::RecordNotFound unless agency

      top_agents = queries.fetch_sidebar_agency_top_agents(agency_id)
      top_clients = queries.fetch_sidebar_agency_top_clients(agency_id)

      {
        agency:,
        top_agents:,
        top_clients:
      }
    end

    def parse_positive_integer(raw_value)
      parsed = Integer(raw_value, 10)
      parsed.positive? ? parsed : nil
    rescue ArgumentError, TypeError
      nil
    end

    def parse_overlay_agency_id_from_params
      return nil unless params[:selected_type].to_s.strip.downcase == "agency"

      parse_positive_integer(params[:selected_id])
    end

    def cast_bool(value)
      ActiveModel::Type::Boolean.new.cast(value)
    end

    def sql_book_total(table_alias)
      case @book_year
      when 2026 then "#{table_alias}.cap_2026_total"
      when 2027 then "#{table_alias}.cap_2027_total"
      else "#{table_alias}.cap_2025_total"
      end
    end

    def sql_book_percentile(table_alias)
      case @book_year
      when 2026 then "#{table_alias}.cap_2026_total_percentile"
      when 2027 then "#{table_alias}.cap_2027_total_percentile"
      else "#{table_alias}.cap_2025_total_percentile"
      end
    end

    def sql_expiring_in_window(table_alias)
      case @book_year
      when 2026 then "#{table_alias}.expiring_2026"
      when 2027 then "#{table_alias}.expiring_2027"
      else "#{table_alias}.expiring_2025"
      end
    end

    def sql_sort_for_agents(book_total_sql:, expiring_sql:)
      case @sort_key
      when "clients" then "w.client_count"
      when "teams" then "w.team_count"
      when "max" then "w.max_contract_count"
      when "expirings" then expiring_sql
      when "options" then "(COALESCE(w.player_option_count, 0) + COALESCE(w.team_option_count, 0))"
      when "name" then "w.full_name"
      else book_total_sql
      end
    end

    def sql_sort_for_agencies(book_total_sql:, expiring_sql:)
      case @sort_key
      when "clients" then "w.client_count"
      when "agents" then "w.agent_count"
      when "teams" then "w.team_count"
      when "max" then "w.max_contract_count"
      when "expirings" then expiring_sql
      when "options" then "(COALESCE(w.player_option_count, 0) + COALESCE(w.team_option_count, 0))"
      when "name" then "w.agency_name"
      else book_total_sql
      end
    end

    def sql_sort_direction_for_key
      if @sort_key == "name"
        @sort_dir == "desc" ? "DESC" : "ASC"
      else
        @sort_dir == "asc" ? "ASC" : "DESC"
      end
    end
  end
end
