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
      conn = ActiveRecord::Base.connection
      id_sql = conn.quote(id)

      @transaction = conn.exec_query(<<~SQL).first
        SELECT
          t.transaction_id,
          t.transaction_date,
          t.trade_finalized_date,
          t.transaction_type_lk,
          t.transaction_description_lk,
          t.record_status_lk,
          t.league_lk,
          t.salary_year,
          t.is_in_season,
          t.seqno,
          t.trade_id,
          t.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            t.player_id::text
          ) AS player_name,
          t.from_team_id,
          t.from_team_code,
          from_team.team_name AS from_team_name,
          t.to_team_id,
          t.to_team_code,
          to_team.team_name AS to_team_name,
          t.rights_team_id,
          t.rights_team_code,
          rights_team.team_name AS rights_team_name,
          t.sign_and_trade_team_id,
          t.sign_and_trade_team_code,
          sat_team.team_name AS sign_and_trade_team_name,
          t.contract_id,
          t.version_number,
          t.contract_type_lk,
          t.min_contract_lk,
          t.signed_method_lk,
          t.team_exception_id,
          t.free_agent_status_lk,
          t.free_agent_designation_lk,
          t.from_player_status_lk,
          t.to_player_status_lk,
          t.option_year,
          t.adjustment_amount,
          t.bonus_true_up_amount,
          t.draft_amount,
          t.draft_year,
          t.draft_round,
          t.draft_pick,
          t.comments
        FROM pcms.transactions t
        LEFT JOIN pcms.people p ON p.person_id = t.player_id
        LEFT JOIN pcms.teams from_team ON from_team.team_id = t.from_team_id
        LEFT JOIN pcms.teams to_team ON to_team.team_id = t.to_team_id
        LEFT JOIN pcms.teams rights_team ON rights_team.team_id = t.rights_team_id
        LEFT JOIN pcms.teams sat_team ON sat_team.team_id = t.sign_and_trade_team_id
        WHERE t.transaction_id = #{id_sql}
        LIMIT 1
      SQL
      raise ActiveRecord::RecordNotFound unless @transaction

      @ledger_entries = conn.exec_query(<<~SQL).to_a
        SELECT
          le.transaction_ledger_entry_id,
          le.ledger_date,
          le.salary_year,
          le.team_id,
          team.team_code,
          team.team_name,
          le.transaction_type_lk,
          le.transaction_description_lk,
          le.cap_amount,
          le.cap_change,
          le.cap_value,
          le.tax_amount,
          le.tax_change,
          le.tax_value,
          le.apron_amount,
          le.apron_change,
          le.apron_value,
          le.mts_amount,
          le.mts_change,
          le.mts_value,
          le.trade_bonus_amount
        FROM pcms.ledger_entries le
        LEFT JOIN pcms.teams team
          ON team.team_id = le.team_id
        WHERE le.transaction_id = #{id_sql}
        ORDER BY le.ledger_date DESC, le.transaction_ledger_entry_id DESC
      SQL

      @draft_selection = conn.exec_query(<<~SQL).first
        SELECT
          ds.transaction_id,
          ds.draft_year,
          ds.draft_round,
          ds.pick_number,
          ds.player_id,
          ds.drafting_team_id,
          ds.drafting_team_code,
          ds.transaction_date
        FROM pcms.draft_selections ds
        WHERE ds.transaction_id = #{id_sql}
        LIMIT 1
      SQL

      @trade = nil
      @trade_transactions = []
      if @transaction["trade_id"].present?
        trade_sql = conn.quote(@transaction["trade_id"])

        @trade = conn.exec_query(<<~SQL).first
          SELECT
            tr.trade_id,
            tr.trade_date,
            tr.trade_finalized_date,
            tr.record_status_lk,
            COUNT(DISTINCT tt.team_id)::integer AS team_count,
            COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.player_id IS NOT NULL)::integer AS player_line_item_count,
            COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.draft_pick_year IS NOT NULL)::integer AS pick_line_item_count
          FROM pcms.trades tr
          LEFT JOIN pcms.trade_teams tt
            ON tt.trade_id = tr.trade_id
          LEFT JOIN pcms.trade_team_details ttd
            ON ttd.trade_id = tr.trade_id
          WHERE tr.trade_id = #{trade_sql}
          GROUP BY tr.trade_id, tr.trade_date, tr.trade_finalized_date, tr.record_status_lk
          LIMIT 1
        SQL

        @trade_transactions = conn.exec_query(<<~SQL).to_a
          SELECT
            t.transaction_id,
            t.transaction_date,
            t.transaction_type_lk,
            t.transaction_description_lk,
            t.player_id,
            COALESCE(
              NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
              NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
              t.player_id::text
            ) AS player_name,
            t.from_team_code,
            t.to_team_code
          FROM pcms.transactions t
          LEFT JOIN pcms.people p ON p.person_id = t.player_id
          WHERE t.trade_id = #{trade_sql}
          ORDER BY t.transaction_date, t.transaction_id
          LIMIT 80
        SQL
      end

      @endnotes = []
      if @transaction["trade_id"].present?
        trade_sql = conn.quote(@transaction["trade_id"])
        @endnotes = conn.exec_query(<<~SQL).to_a
          SELECT
            endnote_id,
            trade_id,
            trade_date,
            status_lk,
            explanation,
            conveyance_text,
            protections_text,
            contingency_text,
            exercise_text,
            is_swap,
            is_conditional
          FROM pcms.endnotes
          WHERE trade_id = #{trade_sql}
             OR trade_ids @> ARRAY[#{trade_sql}]::integer[]
          ORDER BY endnote_id
          LIMIT 50
        SQL
      end

      @cap_exception_usage_rows = conn.exec_query(<<~SQL).to_a
        SELECT
          teu.team_exception_detail_id,
          teu.effective_date,
          teu.exception_action_lk,
          COALESCE(action_lk.short_description, action_lk.description) AS exception_action_label,
          teu.transaction_type_lk,
          COALESCE(tx_type_lk.short_description, tx_type_lk.description) AS transaction_type_label,
          teu.transaction_id,
          teu.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            teu.player_id::text
          ) AS player_name,
          teu.contract_id,
          teu.change_amount,
          teu.remaining_exception_amount,
          te.team_exception_id,
          te.team_id,
          team.team_code,
          team.team_name,
          te.exception_type_lk,
          COALESCE(exc_lk.short_description, exc_lk.description) AS exception_type_label,
          te.trade_id
        FROM pcms.team_exception_usage teu
        JOIN pcms.team_exceptions te
          ON te.team_exception_id = teu.team_exception_id
        LEFT JOIN pcms.teams team
          ON team.team_id = te.team_id
        LEFT JOIN pcms.people p
          ON p.person_id = teu.player_id
        LEFT JOIN pcms.lookups action_lk
          ON action_lk.lookup_type = 'lk_exception_actions'
         AND action_lk.lookup_code = teu.exception_action_lk
        LEFT JOIN pcms.lookups tx_type_lk
          ON tx_type_lk.lookup_type = 'lk_transaction_types'
         AND tx_type_lk.lookup_code = teu.transaction_type_lk
        LEFT JOIN pcms.lookups exc_lk
          ON exc_lk.lookup_type = 'lk_exception_types'
         AND exc_lk.lookup_code = te.exception_type_lk
        WHERE teu.transaction_id = #{id_sql}
        ORDER BY teu.effective_date DESC NULLS LAST, teu.seqno DESC NULLS LAST
        LIMIT 250
      SQL

      @cap_dead_money_rows = conn.exec_query(<<~SQL).to_a
        SELECT
          twa.transaction_waiver_amount_id,
          twa.salary_year,
          twa.team_id,
          COALESCE(team.team_code, twa.team_code) AS team_code,
          team.team_name,
          twa.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            twa.player_id::text
          ) AS player_name,
          twa.contract_id,
          twa.version_number,
          twa.waive_date,
          twa.cap_value,
          twa.tax_value,
          twa.apron_value,
          twa.mts_value
        FROM pcms.transaction_waiver_amounts twa
        LEFT JOIN pcms.teams team
          ON team.team_id = twa.team_id
        LEFT JOIN pcms.people p
          ON p.person_id = twa.player_id
        WHERE twa.transaction_id = #{id_sql}
        ORDER BY twa.salary_year, COALESCE(team.team_code, twa.team_code), player_name
      SQL

      @cap_budget_snapshot_rows = conn.exec_query(<<~SQL).to_a
        SELECT
          tbs.team_budget_snapshot_id,
          tbs.salary_year,
          tbs.team_id,
          COALESCE(team.team_code, tbs.team_code) AS team_code,
          team.team_name,
          tbs.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            tbs.player_id::text
          ) AS player_name,
          tbs.contract_id,
          tbs.version_number,
          tbs.transaction_type_lk,
          tbs.transaction_description_lk,
          tbs.budget_group_lk,
          COALESCE(group_lk.short_description, group_lk.description) AS budget_group_label,
          tbs.signing_method_lk,
          COALESCE(signing_lk.short_description, signing_lk.description) AS signing_method_label,
          tbs.option_lk,
          COALESCE(option_lk.short_description, option_lk.description) AS option_label,
          tbs.option_decision_lk,
          COALESCE(option_decision_lk.short_description, option_decision_lk.description) AS option_decision_label,
          tbs.cap_amount,
          tbs.tax_amount,
          tbs.apron_amount,
          tbs.mts_amount
        FROM pcms.team_budget_snapshots tbs
        LEFT JOIN pcms.teams team
          ON team.team_id = tbs.team_id
        LEFT JOIN pcms.people p
          ON p.person_id = tbs.player_id
        LEFT JOIN pcms.lookups group_lk
          ON group_lk.lookup_type = 'lk_budget_groups'
         AND group_lk.lookup_code = tbs.budget_group_lk
        LEFT JOIN pcms.lookups signing_lk
          ON signing_lk.lookup_type = 'lk_signed_methods'
         AND signing_lk.lookup_code = tbs.signing_method_lk
        LEFT JOIN pcms.lookups option_lk
          ON option_lk.lookup_type = 'lk_options'
         AND option_lk.lookup_code = tbs.option_lk
        LEFT JOIN pcms.lookups option_decision_lk
          ON option_decision_lk.lookup_type = 'lk_option_decisions'
         AND option_decision_lk.lookup_code = tbs.option_decision_lk
        WHERE tbs.transaction_id = #{id_sql}
        ORDER BY
          tbs.salary_year,
          COALESCE(team.team_code, tbs.team_code),
          tbs.player_id NULLS LAST,
          tbs.team_budget_snapshot_id
        LIMIT 300
      SQL

      render :show
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    private

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

      @team_options = conn.exec_query(<<~SQL).to_a
        SELECT team_code, team_name
        FROM pcms.teams
        WHERE league_lk = 'NBA'
          AND team_name NOT LIKE 'Non-NBA%'
        ORDER BY team_code
      SQL

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

      @transactions = conn.exec_query(<<~SQL).to_a
        WITH candidate_transactions AS (
          SELECT
            t.transaction_id,
            t.transaction_date,
            t.transaction_type_lk,
            t.transaction_description_lk,
            t.trade_id,
            t.player_id,
            t.from_team_id,
            t.from_team_code,
            t.to_team_id,
            t.to_team_code,
            t.signed_method_lk,
            t.contract_type_lk
          FROM pcms.transactions t
          WHERE #{where_clauses.join(" AND ")}
          ORDER BY t.transaction_date DESC, t.transaction_id DESC
          LIMIT 800
        ),
        ledger_agg AS (
          SELECT
            le.transaction_id,
            COUNT(*)::integer AS ledger_row_count,
            SUM(COALESCE(le.cap_change, 0)) AS cap_change_total,
            SUM(COALESCE(le.tax_change, 0)) AS tax_change_total,
            SUM(COALESCE(le.apron_change, 0)) AS apron_change_total
          FROM pcms.ledger_entries le
          WHERE le.transaction_id IN (SELECT transaction_id FROM candidate_transactions)
          GROUP BY le.transaction_id
        ),
        exception_counts AS (
          SELECT
            teu.transaction_id,
            COUNT(*)::integer AS exception_usage_count
          FROM pcms.team_exception_usage teu
          WHERE teu.transaction_id IN (SELECT transaction_id FROM candidate_transactions)
          GROUP BY teu.transaction_id
        ),
        dead_money_counts AS (
          SELECT
            twa.transaction_id,
            COUNT(*)::integer AS dead_money_count
          FROM pcms.transaction_waiver_amounts twa
          WHERE twa.transaction_id IN (SELECT transaction_id FROM candidate_transactions)
          GROUP BY twa.transaction_id
        ),
        budget_snapshot_counts AS (
          SELECT
            tbs.transaction_id,
            COUNT(*)::integer AS budget_snapshot_count
          FROM pcms.team_budget_snapshots tbs
          WHERE tbs.transaction_id IN (SELECT transaction_id FROM candidate_transactions)
          GROUP BY tbs.transaction_id
        )
        SELECT
          t.transaction_id,
          t.transaction_date,
          t.transaction_type_lk,
          t.transaction_description_lk,
          t.trade_id,
          t.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            t.player_id::text
          ) AS player_name,
          t.from_team_id,
          t.from_team_code,
          from_team.team_name AS from_team_name,
          t.to_team_id,
          t.to_team_code,
          to_team.team_name AS to_team_name,
          t.signed_method_lk,
          t.contract_type_lk,
          COALESCE(la.ledger_row_count, 0) AS ledger_row_count,
          COALESCE(la.cap_change_total, 0) AS cap_change_total,
          COALESCE(la.tax_change_total, 0) AS tax_change_total,
          COALESCE(la.apron_change_total, 0) AS apron_change_total,
          COALESCE(ec.exception_usage_count, 0) AS exception_usage_count,
          COALESCE(dc.dead_money_count, 0) AS dead_money_count,
          COALESCE(bc.budget_snapshot_count, 0) AS budget_snapshot_count
        FROM candidate_transactions t
        LEFT JOIN pcms.people p
          ON p.person_id = t.player_id
        LEFT JOIN pcms.teams from_team
          ON from_team.team_id = t.from_team_id
        LEFT JOIN pcms.teams to_team
          ON to_team.team_id = t.to_team_id
        LEFT JOIN ledger_agg la
          ON la.transaction_id = t.transaction_id
        LEFT JOIN exception_counts ec
          ON ec.transaction_id = t.transaction_id
        LEFT JOIN dead_money_counts dc
          ON dc.transaction_id = t.transaction_id
        LEFT JOIN budget_snapshot_counts bc
          ON bc.transaction_id = t.transaction_id
        ORDER BY t.transaction_date DESC, t.transaction_id DESC
      SQL

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
      conn = ActiveRecord::Base.connection
      id_sql = conn.quote(transaction_id)

      transaction = conn.exec_query(<<~SQL).first
        SELECT
          t.transaction_id,
          t.transaction_date,
          t.transaction_type_lk,
          t.transaction_description_lk,
          t.salary_year,
          t.trade_id,
          t.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            t.player_id::text
          ) AS player_name,
          t.from_team_id,
          t.from_team_code,
          from_team.team_name AS from_team_name,
          t.to_team_id,
          t.to_team_code,
          to_team.team_name AS to_team_name,
          t.signed_method_lk,
          t.contract_type_lk
        FROM pcms.transactions t
        LEFT JOIN pcms.people p
          ON p.person_id = t.player_id
        LEFT JOIN pcms.teams from_team
          ON from_team.team_id = t.from_team_id
        LEFT JOIN pcms.teams to_team
          ON to_team.team_id = t.to_team_id
        WHERE t.transaction_id = #{id_sql}
        LIMIT 1
      SQL
      raise ActiveRecord::RecordNotFound unless transaction

      ledger_summary = conn.exec_query(<<~SQL).first || {}
        SELECT
          COUNT(*)::integer AS ledger_row_count,
          SUM(COALESCE(le.cap_change, 0)) AS cap_change_total,
          SUM(COALESCE(le.tax_change, 0)) AS tax_change_total,
          SUM(COALESCE(le.apron_change, 0)) AS apron_change_total
        FROM pcms.ledger_entries le
        WHERE le.transaction_id = #{id_sql}
      SQL

      artifact_summary = conn.exec_query(<<~SQL).first || {}
        SELECT
          (SELECT COUNT(*)::integer FROM pcms.team_exception_usage teu WHERE teu.transaction_id = #{id_sql}) AS exception_usage_count,
          (SELECT COUNT(*)::integer FROM pcms.transaction_waiver_amounts twa WHERE twa.transaction_id = #{id_sql}) AS dead_money_count,
          (SELECT COUNT(*)::integer FROM pcms.team_budget_snapshots tbs WHERE tbs.transaction_id = #{id_sql}) AS budget_snapshot_count
      SQL

      trade_summary = nil
      if transaction["trade_id"].present?
        trade_sql = conn.quote(transaction["trade_id"])
        trade_summary = conn.exec_query(<<~SQL).first
          SELECT
            tr.trade_id,
            tr.trade_date,
            COUNT(DISTINCT tt.team_id)::integer AS team_count,
            COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.player_id IS NOT NULL)::integer AS player_line_item_count,
            COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.draft_pick_year IS NOT NULL)::integer AS pick_line_item_count
          FROM pcms.trades tr
          LEFT JOIN pcms.trade_teams tt
            ON tt.trade_id = tr.trade_id
          LEFT JOIN pcms.trade_team_details ttd
            ON ttd.trade_id = tr.trade_id
          WHERE tr.trade_id = #{trade_sql}
          GROUP BY tr.trade_id, tr.trade_date
          LIMIT 1
        SQL
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
