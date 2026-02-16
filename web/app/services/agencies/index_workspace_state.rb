module Agencies
  class IndexWorkspaceState
    def initialize(params:, queries:, book_years:, activity_lenses:, sort_keys:)
      @params = params
      @queries = queries
      @book_years = book_years
      @activity_lenses = activity_lenses
      @sort_keys = sort_keys
    end

    def build
      setup_filters!
      load_rows!
      build_sidebar_summary!

      {
        query: @query,
        activity_lens: @activity_lens,
        book_year: @book_year,
        sort_key: @sort_key,
        sort_dir: @sort_dir,
        agencies: @agencies,
        sidebar_summary: @sidebar_summary
      }
    end

    private

    attr_reader :params, :queries, :book_years, :activity_lenses, :sort_keys

    def setup_filters!
      @query = params[:q].to_s.strip

      requested_activity = params[:activity].to_s.strip
      @activity_lens = activity_lenses.include?(requested_activity) ? requested_activity : "all"

      year = begin
        Integer(params[:year])
      rescue ArgumentError, TypeError
        nil
      end
      @book_year = book_years.include?(year) ? year : book_years.first

      requested_sort = params[:sort].to_s.strip
      @sort_key = sort_keys.include?(requested_sort) ? requested_sort : "book"

      @sort_dir = params[:dir].to_s == "asc" ? "asc" : "desc"
    end

    def load_rows!
      conn = ActiveRecord::Base.connection
      book_total_sql = sql_book_total("w")
      book_percentile_sql = sql_book_percentile("w")
      expiring_sql = sql_expiring_in_window("w")
      where_clauses = ["1 = 1"]

      case @activity_lens
      when "active"
        where_clauses << "COALESCE(w.is_active, true) = true"
      when "inactive"
        where_clauses << "COALESCE(w.is_active, true) = false"
      when "inactive_live_book"
        where_clauses << "COALESCE(w.is_active, true) = false"
        where_clauses << "COALESCE(#{book_total_sql}, 0) > 0"
      when "live_book_risk"
        where_clauses << "COALESCE(#{book_total_sql}, 0) > 0"
        where_clauses << "#{sql_restrictions_total('w')} > 0"
      end

      if @query.present?
        query_sql = conn.quote("%#{@query}%")
        if @query.match?(/\A\d+\z/)
          where_clauses << "(w.agency_name ILIKE #{query_sql} OR w.agency_id = #{conn.quote(@query.to_i)})"
        else
          where_clauses << "w.agency_name ILIKE #{query_sql}"
        end
      end

      @agencies = queries.fetch_index_agencies(
        where_sql: where_clauses.join(" AND "),
        sort_sql: sql_sort_for_agencies(book_total_sql:, expiring_sql:),
        sort_direction: sql_sort_direction_for_key,
        book_total_sql:,
        book_percentile_sql:,
        expiring_sql:
      )
    end

    def build_sidebar_summary!
      rows = Array(@agencies)

      @sidebar_summary = {
        year: @book_year,
        query: @query,
        activity_lens: @activity_lens,
        sort_key: @sort_key,
        sort_dir: @sort_dir,
        row_count: rows.size,
        active_count: rows.count { |row| row["is_active"] != false },
        inactive_count: rows.count { |row| row["is_active"] == false },
        live_book_count: rows.count { |row| row["book_total"].to_i.positive? },
        inactive_live_book_count: rows.count { |row| row["is_active"] == false && row["book_total"].to_i.positive? },
        live_book_risk_count: rows.count { |row| row["book_total"].to_i.positive? && row_restrictions_total(row).positive? },
        agent_total: rows.sum { |row| row["agent_count"].to_i },
        client_total: rows.sum { |row| row["client_count"].to_i },
        team_total: rows.sum { |row| row["team_count"].to_i },
        max_total: rows.sum { |row| row["max_contract_count"].to_i },
        expiring_total: rows.sum { |row| row["expiring_in_window"].to_i },
        restricted_total: rows.sum { |row| row_restrictions_total(row) },
        option_total: rows.sum { |row| row["player_option_count"].to_i + row["team_option_count"].to_i },
        book_total: rows.sum { |row| row["book_total"].to_i },
        filters: sidebar_filter_labels,
        top_rows: sidebar_top_rows(rows)
      }
    end

    def sidebar_filter_labels
      labels = []
      labels << %(Search: "#{@query}") if @query.present?
      labels << "Posture: #{activity_lens_label(@activity_lens)}" unless @activity_lens == "all"
      labels << "Sort: #{@sort_key.humanize} #{@sort_dir.upcase}" unless @sort_key == "book" && @sort_dir == "desc"
      labels
    end

    def sidebar_top_rows(rows)
      rows.first(14).map do |row|
        posture_tokens = []
        posture_tokens << "inactive + live" if row["is_active"] == false && row["book_total"].to_i.positive?
        posture_tokens << "#{row_restrictions_total(row)} restrictions" if row_restrictions_total(row).positive?

        {
          id: row["agency_id"],
          title: row["agency_name"],
          subtitle: [
            "#{row['agent_count'].to_i} agents · #{row['client_count'].to_i} clients",
            posture_tokens.join(" · ").presence
          ].compact.join(" · "),
          book_total: row["book_total"].to_i,
          percentile: row["book_total_percentile"]
        }
      end
    end

    def sql_restrictions_total(table_alias)
      "(COALESCE(#{table_alias}.no_trade_count, 0) + " \
        "COALESCE(#{table_alias}.trade_kicker_count, 0) + " \
        "COALESCE(#{table_alias}.trade_restricted_count, 0))"
    end

    def row_restrictions_total(row)
      row["no_trade_count"].to_i + row["trade_kicker_count"].to_i + row["trade_restricted_count"].to_i
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

    def activity_lens_label(activity_lens)
      case activity_lens
      when "active"
        "Active"
      when "inactive"
        "Inactive"
      when "inactive_live_book"
        "Inactive + live book"
      when "live_book_risk"
        "Live book risk"
      else
        "All"
      end
    end
  end
end
