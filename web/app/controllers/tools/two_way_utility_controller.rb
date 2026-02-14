module Tools
  class TwoWayUtilityController < ApplicationController
    include Datastar

    RISK_LENSES = %w[all warning critical estimate].freeze
    CONFERENCE_LENSES = ["all", "Eastern", "Western"].freeze

    # GET /tools/two-way-utility
    def show
      load_workspace_state!
    rescue ActiveRecord::StatementInvalid => e
      apply_boot_error!(e)
    end

    # GET /tools/two-way-utility/sidebar/:id
    def sidebar
      load_workspace_state!

      player_id = Integer(params[:id])
      raise ActiveRecord::RecordNotFound if player_id <= 0

      @sidebar_player = @rows.find { |row| row["player_id"].to_i == player_id } || fetch_player_row(player_id)
      raise ActiveRecord::RecordNotFound unless @sidebar_player

      @sidebar_team_meta = @team_meta_by_code[@sidebar_player["team_code"].to_s] || {}

      render partial: "tools/two_way_utility/rightpanel_overlay_player", layout: false
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    rescue ActiveRecord::StatementInvalid => e
      render html: <<~HTML.html_safe, layout: false
        <div id="rightpanel-overlay" class="h-full p-4">
          <div class="rounded border border-border bg-muted/20 p-3">
            <div class="text-sm font-medium text-destructive">Two-Way sidebar failed</div>
            <pre class="mt-2 text-xs text-muted-foreground overflow-x-auto">#{ERB::Util.h(e.message)}</pre>
          </div>
        </div>
      HTML
    end

    # GET /tools/two-way-utility/sidebar/agent/:id
    def sidebar_agent
      load_workspace_state!

      agent_id = Integer(params[:id])
      raise ActiveRecord::RecordNotFound if agent_id <= 0

      source_player_id = normalize_player_id_param(params[:player_id])
      source_player = if source_player_id.present?
        @rows.find { |row| row["player_id"].to_i == source_player_id } || fetch_player_row(source_player_id)
      end

      agent = fetch_agent(agent_id)
      raise ActiveRecord::RecordNotFound unless agent

      clients = fetch_agent_clients(agent_id)
      rollup = fetch_agent_rollup(agent_id)

      render partial: "tools/salary_book/sidebar_agent", locals: {
        agent:,
        clients:,
        rollup:,
        sidebar_back_button_partial: "tools/two_way_utility/sidebar_back_button",
        sidebar_back_button_locals: {
          source_player_id:,
          source_player_name: source_player&.dig("player_name"),
          state_query: @state_query
        }
      }, layout: false
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    rescue ActiveRecord::StatementInvalid => e
      render html: <<~HTML.html_safe, layout: false
        <div id="rightpanel-overlay" class="h-full p-4">
          <div class="rounded border border-border bg-muted/20 p-3">
            <div class="text-sm font-medium text-destructive">Two-Way agent sidebar failed</div>
            <pre class="mt-2 text-xs text-muted-foreground overflow-x-auto">#{ERB::Util.h(e.message)}</pre>
          </div>
        </div>
      HTML
    end

    # GET /tools/two-way-utility/sidebar/clear
    def sidebar_clear
      render partial: "tools/two_way_utility/rightpanel_clear", layout: false
    end

    # GET /tools/two-way-utility/sse/refresh
    # One-request multi-region update for commandbar + board + sidebars.
    # Patches:
    # - #commandbar
    # - #maincanvas
    # - #rightpanel-base
    # - #rightpanel-overlay (preserved when selected row remains visible)
    def refresh
      load_workspace_state!

      requested_overlay_id = requested_overlay_id_param
      overlay_html, resolved_overlay_type, resolved_overlay_id = refreshed_overlay_payload(
        requested_overlay_id: requested_overlay_id
      )

      with_sse_stream do |sse|
        commandbar_html = without_view_annotations do
          render_to_string(partial: "tools/two_way_utility/commandbar", layout: false)
        end

        main_html = without_view_annotations do
          render_to_string(partial: "tools/two_way_utility/workspace_main", layout: false)
        end

        sidebar_html = without_view_annotations do
          render_to_string(partial: "tools/two_way_utility/rightpanel_base", layout: false)
        end

        patch_elements_by_id(sse, commandbar_html)
        patch_elements_by_id(sse, main_html)
        patch_elements_by_id(sse, sidebar_html)
        patch_elements_by_id(sse, overlay_html)
        patch_signals(
          sse,
          twconference: @conference,
          twteam: @team.to_s,
          twrisk: @risk,
          overlaytype: resolved_overlay_type,
          overlayid: resolved_overlay_id
        )
      end
    rescue ActiveRecord::StatementInvalid => e
      with_sse_stream do |sse|
        patch_flash(sse, "Two-Way refresh failed: #{e.message.to_s.truncate(160)}")
      end
    end

    private

    def conn
      ActiveRecord::Base.connection
    end

    def load_workspace_state!
      @conference = resolve_conference(params[:conference])
      @team = resolve_team(params[:team])
      @risk = resolve_risk(params[:risk])

      @rows = fetch_rows(conference: @conference, team: @team, risk: @risk)
      @rows_by_team = @rows.group_by { |row| row["team_code"] }

      @teams_by_conference, @team_meta_by_code = fetch_teams
      @team_capacity_by_code = fetch_team_capacity_by_code
      @team_options = build_team_options(@teams_by_conference, @rows_by_team.keys)
      @team_codes = resolve_team_codes(@team_options, @rows_by_team.keys, @team)
      @team_records_by_code = fetch_team_records_by_code(@rows_by_team.keys)

      @state_query = build_state_query
      @selected_player_id = normalize_selected_player_id_param(params[:selected_id])
      build_sidebar_summary!(selected_player_id: @selected_player_id)
    end

    def apply_boot_error!(error)
      @boot_error = error.message
      @conference = "all"
      @team = nil
      @risk = "all"
      @rows = []
      @rows_by_team = {}
      @teams_by_conference = { "Eastern" => [], "Western" => [] }
      @team_meta_by_code = {}
      @team_capacity_by_code = {}
      @team_options = []
      @team_codes = []
      @team_records_by_code = {}
      @state_query = build_state_query
      @selected_player_id = nil
      build_sidebar_summary!(selected_player_id: @selected_player_id)
    end

    def resolve_conference(value)
      normalized = value.to_s.strip
      CONFERENCE_LENSES.include?(normalized) ? normalized : "all"
    end

    def resolve_team(value)
      code = value.to_s.strip.upcase
      code.match?(/\A[A-Z]{3}\z/) ? code : nil
    end

    def resolve_risk(value)
      normalized = value.to_s.strip
      RISK_LENSES.include?(normalized) ? normalized : "all"
    end

    def normalize_player_id_param(raw)
      player_id = Integer(raw.to_s.strip, 10)
      player_id.positive? ? player_id : nil
    rescue ArgumentError, TypeError
      nil
    end

    def build_state_query
      Rack::Utils.build_query(
        conference: @conference.to_s,
        team: @team.to_s,
        risk: @risk.to_s
      )
    end

    def resolve_team_codes(team_options, rows_team_codes, selected_team)
      options = Array(team_options).map { |row| row[:code] }
      row_codes = Array(rows_team_codes).compact.map(&:to_s)

      if selected_team.present?
        return [ selected_team ]
      end

      (options & row_codes) + (row_codes - options)
    end

    def fetch_rows(conference:, team:, risk:)
      where_clauses = []
      where_clauses << "tw.conference_name = #{conn.quote(conference)}" if conference != "all"
      where_clauses << "tw.team_code = #{conn.quote(team)}" if team.present?

      case risk
      when "critical"
        where_clauses << "COALESCE(tw.remaining_active_list_games, 999) <= 10"
      when "warning"
        where_clauses << "COALESCE(tw.remaining_active_list_games, 999) <= 20"
      when "estimate"
        where_clauses << "COALESCE(tw.active_list_games_limit_is_estimate, false) = true"
      end

      where_sql = where_clauses.any? ? where_clauses.join(" AND ") : "TRUE"

      conn.exec_query(<<~SQL).to_a.map { |row| decorate_row(row) }
        SELECT
          tw.team_code,
          tw.team_name,
          tw.conference_name,
          tw.team_current_contract_count,
          tw.team_games_remaining_context,
          tw.team_is_under_15_contracts,
          tw.team_two_way_contract_count,
          tw.player_id,
          tw.player_name,
          tw.years_of_service,
          tw.games_on_active_list,
          tw.active_list_games_limit,
          tw.remaining_active_list_games,
          tw.active_list_games_limit_is_estimate,
          tw.signing_date,
          tw.last_game_date_est,
          sbw.age,
          sbw.cap_2025,
          sbw.cap_2026,
          sbw.agent_id,
          sbw.agent_name,
          ag.agency_name,
          COALESCE(sbw.is_two_way, true) AS is_two_way,
          COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
          COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now,
          COALESCE(sbw.is_poison_pill, false) AS is_poison_pill,
          COALESCE(sbw.is_no_trade, false) AS is_no_trade,
          COALESCE(sbw.is_trade_bonus, false) AS is_trade_bonus,
          sbw.trade_bonus_percent,
          sbw.option_2026,
          COALESCE(sbw.is_non_guaranteed_2026, false) AS is_non_guaranteed_2026,
          sbw.pct_cap_2025
        FROM pcms.two_way_utility_warehouse tw
        LEFT JOIN LATERAL (
          SELECT
            s.age,
            s.cap_2025,
            s.cap_2026,
            s.agent_id,
            s.agent_name,
            s.is_two_way,
            s.is_trade_consent_required_now,
            s.is_trade_restricted_now,
            s.is_poison_pill,
            s.is_no_trade,
            s.is_trade_bonus,
            s.trade_bonus_percent,
            s.option_2026,
            s.is_non_guaranteed_2026,
            s.pct_cap_2025
          FROM pcms.salary_book_warehouse s
          WHERE s.player_id = tw.player_id
            AND s.team_code = tw.team_code
          ORDER BY s.cap_2025 DESC NULLS LAST
          LIMIT 1
        ) sbw ON true
        LEFT JOIN pcms.agents ag
          ON ag.agent_id = sbw.agent_id
        WHERE #{where_sql}
        ORDER BY
          tw.team_code,
          CASE
            WHEN COALESCE(tw.remaining_active_list_games, 999) <= 10 THEN 0
            WHEN COALESCE(tw.remaining_active_list_games, 999) <= 20 THEN 1
            WHEN COALESCE(tw.active_list_games_limit_is_estimate, false) THEN 2
            ELSE 3
          END,
          COALESCE(tw.remaining_active_list_games, 999),
          tw.games_on_active_list DESC NULLS LAST,
          tw.player_name
      SQL
    end

    def fetch_player_row(player_id)
      id_sql = conn.quote(player_id)

      row = conn.exec_query(<<~SQL).first
        SELECT
          tw.team_code,
          tw.team_name,
          tw.conference_name,
          tw.team_current_contract_count,
          tw.team_games_remaining_context,
          tw.team_is_under_15_contracts,
          tw.team_two_way_contract_count,
          tw.player_id,
          tw.player_name,
          tw.years_of_service,
          tw.games_on_active_list,
          tw.active_list_games_limit,
          tw.remaining_active_list_games,
          tw.active_list_games_limit_is_estimate,
          tw.signing_date,
          tw.last_game_date_est,
          sbw.age,
          sbw.cap_2025,
          sbw.cap_2026,
          sbw.agent_id,
          sbw.agent_name,
          ag.agency_name,
          COALESCE(sbw.is_two_way, true) AS is_two_way,
          COALESCE(sbw.is_trade_consent_required_now, false) AS is_trade_consent_required_now,
          COALESCE(sbw.is_trade_restricted_now, false) AS is_trade_restricted_now,
          COALESCE(sbw.is_poison_pill, false) AS is_poison_pill,
          COALESCE(sbw.is_no_trade, false) AS is_no_trade,
          COALESCE(sbw.is_trade_bonus, false) AS is_trade_bonus,
          sbw.trade_bonus_percent,
          sbw.option_2026,
          COALESCE(sbw.is_non_guaranteed_2026, false) AS is_non_guaranteed_2026,
          sbw.pct_cap_2025
        FROM pcms.two_way_utility_warehouse tw
        LEFT JOIN LATERAL (
          SELECT
            s.age,
            s.cap_2025,
            s.cap_2026,
            s.agent_id,
            s.agent_name,
            s.is_two_way,
            s.is_trade_consent_required_now,
            s.is_trade_restricted_now,
            s.is_poison_pill,
            s.is_no_trade,
            s.is_trade_bonus,
            s.trade_bonus_percent,
            s.option_2026,
            s.is_non_guaranteed_2026,
            s.pct_cap_2025
          FROM pcms.salary_book_warehouse s
          WHERE s.player_id = tw.player_id
            AND s.team_code = tw.team_code
          ORDER BY s.cap_2025 DESC NULLS LAST
          LIMIT 1
        ) sbw ON true
        LEFT JOIN pcms.agents ag
          ON ag.agent_id = sbw.agent_id
        WHERE tw.player_id = #{id_sql}
        LIMIT 1
      SQL

      row.present? ? decorate_row(row) : nil
    end

    def fetch_agent(agent_id)
      id_sql = conn.quote(agent_id)

      conn.exec_query(<<~SQL).first
        SELECT
          agent_id,
          full_name AS name,
          agency_id,
          agency_name
        FROM pcms.agents
        WHERE agent_id = #{id_sql}
        LIMIT 1
      SQL
    end

    def fetch_agent_clients(agent_id)
      id_sql = conn.quote(agent_id)

      conn.exec_query(<<~SQL).to_a
        SELECT
          s.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            s.player_name
          ) AS player_name,
          p.display_first_name,
          p.display_last_name,
          COALESCE(NULLIF(s.person_team_code, ''), s.team_code) AS team_code,
          s.age,
          p.years_of_service,
          s.cap_2025::numeric,
          s.cap_2026::numeric,
          s.cap_2027::numeric,
          s.cap_2028::numeric,
          s.cap_2029::numeric,
          s.cap_2030::numeric,
          COALESCE(s.is_two_way, false)::boolean AS is_two_way,
          COALESCE(s.is_no_trade, false)::boolean AS is_no_trade,
          COALESCE(s.is_trade_bonus, false)::boolean AS is_trade_bonus,
          COALESCE(s.is_min_contract, false)::boolean AS is_min_contract,
          COALESCE(s.is_trade_restricted_now, false)::boolean AS is_trade_restricted_now,
          s.option_2025,
          s.option_2026,
          s.option_2027,
          s.option_2028,
          s.option_2029,
          s.option_2030,
          s.is_non_guaranteed_2025,
          s.is_non_guaranteed_2026,
          s.is_non_guaranteed_2027,
          s.is_non_guaranteed_2028,
          s.is_non_guaranteed_2029,
          s.is_non_guaranteed_2030,
          s.contract_type_code,
          t.team_id,
          t.team_name
        FROM pcms.salary_book_warehouse s
        LEFT JOIN pcms.people p ON s.player_id = p.person_id
        LEFT JOIN pcms.teams t ON s.team_code = t.team_code AND t.league_lk = 'NBA'
        WHERE s.agent_id = #{id_sql}
        ORDER BY s.cap_2025 DESC NULLS LAST, player_name
      SQL
    end

    def fetch_agent_rollup(agent_id)
      id_sql = conn.quote(agent_id)

      conn.exec_query(<<~SQL).first || {}
        SELECT
          standard_count,
          two_way_count,
          client_count AS total_count,
          team_count,

          cap_2025_total AS book_2025,
          cap_2026_total AS book_2026,
          cap_2027_total AS book_2027,

          rookie_scale_count,
          min_contract_count,
          no_trade_count,
          trade_kicker_count,
          trade_restricted_count,

          expiring_2025,
          expiring_2026,
          expiring_2027,

          player_option_count,
          team_option_count,

          max_contract_count,
          prior_year_nba_now_free_agent_count,

          cap_2025_total_percentile,
          cap_2026_total_percentile,
          cap_2027_total_percentile,
          client_count_percentile,
          max_contract_count_percentile,
          team_count_percentile,
          standard_count_percentile,
          two_way_count_percentile
        FROM pcms.agents_warehouse
        WHERE agent_id = #{id_sql}
        LIMIT 1
      SQL
    end

    def decorate_row(row)
      used = row["games_on_active_list"]&.to_f
      limit = row["active_list_games_limit"]&.to_f
      remaining = row["remaining_active_list_games"]&.to_i
      estimate = truthy?(row["active_list_games_limit_is_estimate"])

      row["games_used_pct"] = if used && limit && limit.positive?
        used / limit
      end

      row["limit_status_chip"] = estimate ? "EST" : nil
      row["risk_tier"] = if remaining.present? && remaining <= 10
        "critical"
      elsif remaining.present? && remaining <= 20
        "warning"
      elsif estimate
        "estimate"
      else
        "stable"
      end

      row
    end

    def truthy?(value)
      case value
      when true, 1, "1", "t", "T", "true", "TRUE", "yes", "YES", "y", "Y"
        true
      else
        false
      end
    end

    def fetch_teams
      rows = conn.exec_query(<<~SQL).to_a
        SELECT
          team_id,
          team_code,
          team_name,
          conference_name
        FROM pcms.teams
        WHERE league_lk = 'NBA'
          AND team_name NOT LIKE 'Non-NBA%'
          AND conference_name IS NOT NULL
        ORDER BY team_code
      SQL

      grouped = { "Eastern" => [], "Western" => [] }
      by_code = {}

      rows.each do |row|
        conf = row["conference_name"]
        next unless grouped.key?(conf)

        grouped[conf] << { code: row["team_code"], name: row["team_name"] }
        by_code[row["team_code"]] = row
      end

      [ grouped, by_code ]
    end

    def fetch_team_capacity_by_code
      rows = conn.exec_query(<<~SQL).to_a
        SELECT
          team_code,
          current_contract_count AS team_current_contract_count,
          CASE
            WHEN COALESCE(current_contract_count, 0) < 15 THEN under_15_games_remaining
            ELSE games_remaining
          END AS team_games_remaining_context,
          (COALESCE(current_contract_count, 0) < 15) AS team_is_under_15_contracts
        FROM pcms.team_two_way_capacity
      SQL

      rows.each_with_object({}) { |row, by_code| by_code[row["team_code"]] = row }
    end

    def fetch_team_records_by_code(team_codes)
      codes = Array(team_codes).map(&:to_s).map(&:upcase).select { |code| code.match?(/\A[A-Z]{3}\z/) }.uniq
      return {} if codes.empty?

      codes_sql = codes.map { |code| conn.quote(code) }.join(", ")

      rows = conn.exec_query(<<~SQL).to_a
        WITH target_season AS (
          SELECT MAX(s.season_year) AS season_year
          FROM nba.standings s
          WHERE s.league_id = '00'
            AND s.season_type = 'Regular Season'
        ),
        latest_dates AS (
          SELECT
            s.team_id,
            MAX(s.standing_date) AS standing_date
          FROM nba.standings s
          JOIN target_season ts
            ON ts.season_year = s.season_year
          WHERE s.league_id = '00'
            AND s.season_type = 'Regular Season'
          GROUP BY s.team_id
        )
        SELECT
          COALESCE(t.team_code, s.team_tricode) AS team_code,
          s.record
        FROM nba.standings s
        JOIN target_season ts
          ON ts.season_year = s.season_year
        JOIN latest_dates ld
          ON ld.team_id = s.team_id
         AND ld.standing_date = s.standing_date
        LEFT JOIN pcms.teams t
          ON t.team_id = s.team_id
         AND t.league_lk = 'NBA'
        WHERE s.league_id = '00'
          AND s.season_type = 'Regular Season'
          AND COALESCE(t.team_code, s.team_tricode) IN (#{codes_sql})
      SQL

      rows.each_with_object({}) do |row, map|
        code = row["team_code"].to_s.upcase
        next if code.blank?

        map[code] = row["record"].presence || "—"
      end
    rescue ActiveRecord::StatementInvalid
      {}
    end

    def build_team_options(teams_by_conference, warehouse_team_codes)
      ordered_codes = %w[Eastern Western].flat_map do |conference|
        teams_by_conference.fetch(conference, []).map { |team| team[:code] }
      end

      extras = Array(warehouse_team_codes).compact.uniq - ordered_codes

      (ordered_codes + extras.sort).map do |code|
        meta = @team_meta_by_code[code] || {}
        {
          code:,
          name: meta["team_name"].presence || code,
          conference: meta["conference_name"].presence || "—"
        }
      end
    end

    def build_sidebar_summary!(selected_player_id: nil)
      rows = Array(@rows)
      critical_count = rows.count { |row| row["risk_tier"] == "critical" }
      warning_count = rows.count { |row| row["risk_tier"] == "warning" }
      low_remaining_count = rows.count { |row| row["remaining_active_list_games"].present? && row["remaining_active_list_games"].to_i <= 20 }
      estimate_count = rows.count { |row| truthy?(row["active_list_games_limit_is_estimate"]) }

      quick_rows = rows
        .select { |row| row["risk_tier"] != "stable" }
        .sort_by do |row|
          [
            risk_sort_priority(row["risk_tier"]),
            row["remaining_active_list_games"].presence || 999,
            -(row["games_used_pct"] || 0).to_f,
            row["team_code"].to_s,
            row["player_name"].to_s
          ]
        end
        .first(14)

      selected_id = selected_player_id.to_i
      if selected_id.positive?
        selected_row = rows.find { |row| row["player_id"].to_i == selected_id }
        if selected_row.present? && quick_rows.none? { |row| row["player_id"].to_i == selected_id }
          quick_rows = [selected_row] + quick_rows.first(13)
        end
      end

      active_filters = []
      active_filters << "Conference: #{@conference}" unless @conference == "all"
      active_filters << "Team: #{@team}" if @team.present?
      active_filters << "Risk: #{risk_filter_label(@risk)}" unless @risk == "all"

      @sidebar_summary = {
        row_count: rows.size,
        team_count: @rows_by_team.keys.size,
        critical_count:,
        warning_count:,
        low_remaining_count:,
        estimate_count:,
        active_filters:,
        quick_rows:
      }
    end

    def normalize_selected_player_id_param(raw)
      normalize_player_id_param(raw)
    end

    def requested_overlay_id_param
      @selected_player_id || normalize_selected_player_id_param(params[:selected_id])
    end

    def selected_overlay_visible?(overlay_id:)
      normalized_id = overlay_id.to_i
      return false if normalized_id <= 0

      Array(@rows).any? { |row| row["player_id"].to_i == normalized_id }
    end

    def refreshed_overlay_payload(requested_overlay_id:)
      return [overlay_clear_html, "none", ""] unless selected_overlay_visible?(overlay_id: requested_overlay_id)

      @sidebar_player = @rows.find { |row| row["player_id"].to_i == requested_overlay_id.to_i }
      return [overlay_clear_html, "none", ""] unless @sidebar_player.present?

      @sidebar_team_meta = @team_meta_by_code[@sidebar_player["team_code"].to_s] || {}

      html = without_view_annotations do
        render_to_string(partial: "tools/two_way_utility/rightpanel_overlay_player", layout: false)
      end

      [html, "player", requested_overlay_id.to_s]
    rescue ActiveRecord::RecordNotFound
      [overlay_clear_html, "none", ""]
    end

    def overlay_clear_html
      '<div id="rightpanel-overlay"></div>'
    end

    def risk_sort_priority(tier)
      case tier.to_s
      when "critical" then 0
      when "warning" then 1
      when "estimate" then 2
      else 3
      end
    end

    def risk_filter_label(risk)
      case risk.to_s
      when "critical" then "≤10 games remaining"
      when "warning" then "≤20 games remaining"
      when "estimate" then "Estimated limits"
      else "All"
      end
    end

    def without_view_annotations
      original = ActionView::Base.annotate_rendered_view_with_filenames
      ActionView::Base.annotate_rendered_view_with_filenames = false
      yield
    ensure
      ActionView::Base.annotate_rendered_view_with_filenames = original
    end
  end
end
