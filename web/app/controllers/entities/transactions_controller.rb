module Entities
  class TransactionsController < ApplicationController
    # GET /transactions
    def index
      load_index_state!
      render :index
    end

    # GET /transactions/pane (Datastar partial refresh)
    def pane
      load_index_state!
      render partial: "entities/transactions/results"
    end

    # GET /transactions/sidebar/base
    def sidebar_base
      load_index_state!
      render partial: "entities/transactions/rightpanel_base"
    end

    # GET /transactions/sidebar/:id
    def sidebar
      transaction_id = Integer(params[:id])
      raise ActiveRecord::RecordNotFound if transaction_id <= 0

      render partial: "entities/transactions/rightpanel_overlay_transaction", locals: load_sidebar_transaction_payload(transaction_id)
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    # GET /transactions/sidebar/clear
    def sidebar_clear
      render partial: "entities/transactions/rightpanel_clear"
    end

    # GET /transactions/:id
    def show
      id = Integer(params[:id])

      @transaction = queries.fetch_transaction(id)
      raise ActiveRecord::RecordNotFound unless @transaction

      @ledger_entries = queries.fetch_ledger_entries(id)
      @draft_selection = queries.fetch_draft_selection(id)

      @trade = nil
      @trade_transactions = []
      @endnotes = []

      if @transaction["trade_id"].present?
        trade_id = @transaction["trade_id"]
        @trade = queries.fetch_trade_summary(trade_id)
        @trade_transactions = queries.fetch_trade_transactions(trade_id)
        @endnotes = queries.fetch_endnotes(trade_id)
      end

      @cap_exception_usage_rows = queries.fetch_cap_exception_usage_rows(id)
      @cap_dead_money_rows = queries.fetch_cap_dead_money_rows(id)
      @cap_budget_snapshot_rows = queries.fetch_cap_budget_snapshot_rows(id)

      render :show
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    private

    def queries
      @queries ||= TransactionQueries.new(connection: ActiveRecord::Base.connection)
    end

    def load_index_state!
      conn = ActiveRecord::Base.connection

      @daterange = params[:daterange].to_s.strip.presence || "season"
      @team = params[:team].to_s.strip.upcase.presence
      @team = nil unless @team&.match?(/\A[A-Z]{3}\z/)
      @query = params[:q].to_s.strip.gsub(/\s+/, " ").presence
      @signings = params[:signings] != "0"
      @waivers = params[:waivers] != "0"
      @extensions = params[:extensions] != "0"
      @other = params[:other] == "1"
      @impact = params[:impact].to_s.strip.presence || "all"
      @impact = "all" unless %w[all critical high medium low].include?(@impact)
      @selected_transaction_id = normalize_selected_transaction_id_param(params[:selected_id])

      @team_options = queries.fetch_team_options

      # Calculate date filters
      today = Date.today
      season_start = today.month >= 7 ? Date.new(today.year, 7, 1) : Date.new(today.year - 1, 7, 1)

      where_clauses = ["t.trade_id IS NULL"] # trades have their own workspace

      case @daterange
      when "today"
        where_clauses << "t.transaction_date = #{conn.quote(today)}"
      when "week"
        where_clauses << "t.transaction_date >= #{conn.quote(today - 7)}"
      when "month"
        where_clauses << "t.transaction_date >= #{conn.quote(today - 30)}"
      when "season"
        where_clauses << "t.transaction_date >= #{conn.quote(season_start)}"
      end

      selected_types = []
      selected_types.concat(%w[SIGN RSIGN]) if @signings
      selected_types.concat(%w[WAIVE WAIVR]) if @waivers
      selected_types << "EXTSN" if @extensions
      selected_types.uniq!

      if @other
        excluded = %w[SIGN RSIGN EXTSN WAIVE WAIVR TRADE]
        excluded_sql = excluded.map { |c| conn.quote(c) }.join(", ")

        if selected_types.any?
          selected_sql = selected_types.map { |c| conn.quote(c) }.join(", ")
          where_clauses << "(t.transaction_type_lk IN (#{selected_sql}) OR t.transaction_type_lk NOT IN (#{excluded_sql}))"
        else
          where_clauses << "t.transaction_type_lk NOT IN (#{excluded_sql})"
        end
      elsif selected_types.any?
        selected_sql = selected_types.map { |c| conn.quote(c) }.join(", ")
        where_clauses << "t.transaction_type_lk IN (#{selected_sql})"
      end

      if @team.present?
        where_clauses << "(t.from_team_code = #{conn.quote(@team)} OR t.to_team_code = #{conn.quote(@team)})"
      end

      if @query.present?
        query_like_sql = conn.quote("%#{@query}%")
        where_clauses << <<~SQL
          (
            t.transaction_id::text ILIKE #{query_like_sql}
            OR COALESCE(t.transaction_description_lk, '') ILIKE #{query_like_sql}
            OR COALESCE(t.transaction_type_lk, '') ILIKE #{query_like_sql}
            OR COALESCE(t.from_team_code, '') ILIKE #{query_like_sql}
            OR COALESCE(t.to_team_code, '') ILIKE #{query_like_sql}
            OR COALESCE(t.signed_method_lk, '') ILIKE #{query_like_sql}
            OR COALESCE(t.contract_type_lk, '') ILIKE #{query_like_sql}
            OR EXISTS (
              SELECT 1
              FROM pcms.people search_player
              WHERE search_player.person_id = t.player_id
                AND COALESCE(
                  NULLIF(TRIM(CONCAT_WS(' ', search_player.display_first_name, search_player.display_last_name)), ''),
                  NULLIF(TRIM(CONCAT_WS(' ', search_player.first_name, search_player.last_name)), ''),
                  ''
                ) ILIKE #{query_like_sql}
            )
            OR EXISTS (
              SELECT 1
              FROM pcms.teams search_from_team
              WHERE search_from_team.team_id = t.from_team_id
                AND search_from_team.team_name ILIKE #{query_like_sql}
            )
            OR EXISTS (
              SELECT 1
              FROM pcms.teams search_to_team
              WHERE search_to_team.team_id = t.to_team_id
                AND search_to_team.team_name ILIKE #{query_like_sql}
            )
          )
        SQL
      end

      @transactions = queries.fetch_index_transactions(where_sql: where_clauses.join(" AND "))

      annotate_intent_match_provenance!(query: @query)
      annotate_transaction_severity!(rows: @transactions)
      apply_impact_filter!
      @transactions = Array(@transactions).first(200)
      build_transaction_date_groups!
      build_transaction_severity_lanes!
      build_sidebar_summary!(selected_transaction_id: @selected_transaction_id)
    end

    def build_sidebar_summary!(selected_transaction_id: nil)
      rows = Array(@transactions)
      bucket_counts = {
        signings: rows.count { |row| transaction_bucket(row["transaction_type_lk"]) == :signings },
        waivers: rows.count { |row| transaction_bucket(row["transaction_type_lk"]) == :waivers },
        extensions: rows.count { |row| transaction_bucket(row["transaction_type_lk"]) == :extensions },
        other: rows.count { |row| transaction_bucket(row["transaction_type_lk"]) == :other }
      }

      severity_counts = {
        critical: rows.count { |row| row["severity_key"] == "critical" },
        high: rows.count { |row| row["severity_key"] == "high" },
        medium: rows.count { |row| row["severity_key"] == "medium" },
        low: rows.count { |row| row["severity_key"] == "low" }
      }

      active_type_filters = []
      active_type_filters << "Signings" if @signings
      active_type_filters << "Waivers" if @waivers
      active_type_filters << "Extensions" if @extensions
      active_type_filters << "Other" if @other

      filters = ["Date: #{daterange_label(@daterange)}"]
      filters << "Intent: #{@query}" if @query.present?
      filters << "Team: #{@team}" if @team.present?
      filters << "Types: #{active_type_filters.join(', ')}" if active_type_filters.any?
      filters << "Impact: #{impact_label(@impact)}" unless @impact == "all"

      top_rows = rows.sort_by do |row|
        [
          severity_rank(row["severity_key"]),
          -(normalize_transaction_date(row["transaction_date"])&.jd || 0),
          -row["transaction_id"].to_i
        ]
      end.first(14)

      selected_id = selected_transaction_id.to_i
      if selected_id.positive?
        selected_row = rows.find { |row| row["transaction_id"].to_i == selected_id }
        if selected_row.present? && top_rows.none? { |row| row["transaction_id"].to_i == selected_id }
          top_rows = (top_rows + [selected_row]).uniq { |row| row["transaction_id"].to_i }
            .sort_by do |row|
              [
                severity_rank(row["severity_key"]),
                -(normalize_transaction_date(row["transaction_date"])&.jd || 0),
                -row["transaction_id"].to_i
              ]
            end
            .first(14)
        end
      end

      top_row_lanes = build_transaction_severity_lanes!(rows: top_rows, assign: false)

      @sidebar_summary = {
        row_count: rows.size,
        daterange_label: daterange_label(@daterange),
        impact_label: impact_label(@impact),
        filters:,
        signings_count: bucket_counts[:signings],
        waivers_count: bucket_counts[:waivers],
        extensions_count: bucket_counts[:extensions],
        other_count: bucket_counts[:other],
        critical_count: severity_counts[:critical],
        high_count: severity_counts[:high],
        medium_count: severity_counts[:medium],
        low_count: severity_counts[:low],
        date_group_count: Array(@transaction_date_groups).size,
        severity_lane_count: Array(@transaction_severity_lanes).size,
        top_rows:,
        top_row_lanes:
      }
    end

    def annotate_transaction_severity!(rows:)
      Array(rows).each do |row|
        cap_abs = row["cap_change_total"].to_f.abs
        tax_abs = row["tax_change_total"].to_f.abs
        apron_abs = row["apron_change_total"].to_f.abs
        max_delta = [cap_abs, tax_abs, apron_abs].max

        exception_count = row["exception_usage_count"].to_i
        dead_money_count = row["dead_money_count"].to_i
        budget_snapshot_count = row["budget_snapshot_count"].to_i

        severity_key = if dead_money_count.positive? || max_delta >= 20_000_000 || apron_abs >= 8_000_000
          "critical"
        elsif exception_count.positive? || max_delta >= 10_000_000 || apron_abs >= 4_000_000
          "high"
        elsif row["ledger_row_count"].to_i.positive? || budget_snapshot_count.positive? || max_delta >= 2_000_000
          "medium"
        else
          "low"
        end

        row["severity_key"] = severity_key
        row["severity_rank"] = severity_rank(severity_key)
        row["severity_label"] = severity_label(severity_key)
        row["impact_max_delta"] = max_delta
      end
    end

    def apply_impact_filter!
      return if @impact == "all"

      @transactions = Array(@transactions).select do |row|
        row["severity_key"].to_s == @impact
      end
    end

    def build_transaction_severity_lanes!(rows: Array(@transactions), assign: true)
      grouped = Array(rows).group_by { |row| row["severity_key"].to_s.presence || "low" }

      lanes = %w[critical high medium low].filter_map do |severity_key|
        lane_rows = Array(grouped[severity_key])
        next if lane_rows.empty?

        {
          key: severity_key,
          headline: severity_label(severity_key),
          subline: severity_subline(severity_key),
          row_count: lane_rows.size,
          date_groups: build_transaction_date_groups!(rows: lane_rows, assign: false)
        }
      end

      @transaction_severity_lanes = lanes if assign
      lanes
    end

    def build_transaction_date_groups!(rows: Array(@transactions), assign: true)
      grouped = Array(rows).group_by do |row|
        normalize_transaction_date(row["transaction_date"])
      end

      today = Date.current
      groups = grouped.map do |date_value, date_rows|
        if date_value.present?
          relative_label = if date_value == today
            "Today"
          elsif date_value == today - 1
            "Yesterday"
          elsif date_value < today
            "#{(today - date_value).to_i}d ago"
          else
            "In #{(date_value - today).to_i}d"
          end

          {
            key: date_value.iso8601,
            date: date_value,
            headline: date_value.strftime("%a, %b %-d"),
            subline: date_value.strftime("%Y"),
            relative_label:,
            row_count: date_rows.size,
            rows: date_rows
          }
        else
          {
            key: "undated",
            date: nil,
            headline: "Undated",
            subline: nil,
            relative_label: "Date missing",
            row_count: date_rows.size,
            rows: date_rows
          }
        end
      end

      groups.sort_by! do |group|
        [group[:date] || Date.new(1900, 1, 1), group[:rows].map { |row| row["transaction_id"].to_i }.max.to_i]
      end
      groups.reverse!

      @transaction_date_groups = groups if assign
      groups
    end

    def normalize_transaction_date(value)
      return value if value.is_a?(Date)

      Date.parse(value.to_s)
    rescue ArgumentError, TypeError
      nil
    end

    def annotate_intent_match_provenance!(query:)
      normalized_query = query.to_s.strip.downcase
      return if normalized_query.blank?

      Array(@transactions).each do |row|
        labels = []

        labels << "player" if intent_match?(row["player_name"], normalized_query)

        team_fields = [
          row["from_team_code"],
          row["to_team_code"],
          row["from_team_name"],
          row["to_team_name"]
        ]
        labels << "team" if team_fields.any? { |value| intent_match?(value, normalized_query) }

        labels << "type" if intent_match?(row["transaction_type_lk"], normalized_query)
        labels << "description" if intent_match?(row["transaction_description_lk"], normalized_query)
        labels << "id" if intent_match?(row["transaction_id"], normalized_query)

        method_fields = [row["signed_method_lk"], row["contract_type_lk"]]
        labels << "method" if method_fields.any? { |value| intent_match?(value, normalized_query) }

        labels = ["other"] if labels.empty?

        cue_labels = labels.first(2)
        overflow_count = [labels.size - cue_labels.size, 0].max

        row["intent_match_labels"] = labels
        row["intent_match_cue"] = [cue_labels.join(" · "), (overflow_count.positive? ? "+#{overflow_count}" : nil)].compact.join(" ")
        row["intent_match_title"] = "Matched on: #{labels.join(', ')}"
      end
    end

    def intent_match?(value, normalized_query)
      value.to_s.downcase.include?(normalized_query)
    end

    def load_sidebar_transaction_payload(transaction_id)
      transaction = queries.fetch_sidebar_transaction(transaction_id)
      raise ActiveRecord::RecordNotFound unless transaction

      ledger_summary = queries.fetch_sidebar_ledger_summary(transaction_id)
      artifact_summary = queries.fetch_sidebar_artifact_summary(transaction_id)

      trade_summary = if transaction["trade_id"].present?
        queries.fetch_sidebar_trade_summary(transaction["trade_id"])
      end

      {
        transaction:,
        ledger_summary:,
        artifact_summary:,
        trade_summary:
      }
    end

    def normalize_selected_transaction_id_param(raw)
      selected_id = Integer(raw.to_s.strip, 10)
      selected_id.positive? ? selected_id : nil
    rescue ArgumentError, TypeError
      nil
    end

    def selected_overlay_visible?(overlay_type:, overlay_id:)
      return false unless overlay_type.to_s == "transaction"

      normalized_id = overlay_id.to_i
      return false if normalized_id <= 0

      Array(@transactions).any? { |row| row["transaction_id"].to_i == normalized_id }
    end

    def transaction_bucket(type_code)
      code = type_code.to_s.upcase
      return :signings if %w[SIGN RSIGN].include?(code)
      return :waivers if %w[WAIVE WAIVR].include?(code)
      return :extensions if code == "EXTSN"

      :other
    end

    def severity_rank(key)
      case key.to_s
      when "critical" then 0
      when "high" then 1
      when "medium" then 2
      else 3
      end
    end

    def severity_label(key)
      case key.to_s
      when "critical" then "Critical impact"
      when "high" then "High impact"
      when "medium" then "Medium impact"
      else "Low impact"
      end
    end

    def severity_subline(key)
      case key.to_s
      when "critical"
        "Dead-money or very large cap/tax/apron deltas"
      when "high"
        "Material deltas or exception/deadline artifacts"
      when "medium"
        "Visible ledger movement, usually planning-relevant"
      else
        "Low/no immediate financial movement"
      end
    end

    def impact_label(value)
      case value.to_s
      when "critical" then "Critical impact"
      when "high" then "High impact"
      when "medium" then "Medium impact"
      when "low" then "Low impact"
      else "All impact lanes"
      end
    end

    def daterange_label(value)
      case value.to_s
      when "today" then "Today"
      when "week" then "This week"
      when "month" then "This month"
      when "season" then "This season"
      else "All dates"
      end
    end
  end
end
