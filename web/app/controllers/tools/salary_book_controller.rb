module Tools
  class SalaryBookController < ApplicationController
    CURRENT_SALARY_YEAR = 2025
    SALARY_YEARS = (2025..2030).to_a.freeze

    # GET /tools/salary-book
    def show
      @salary_year = salary_year_param
      @salary_years = SALARY_YEARS

      @team_codes = fetch_team_codes(@salary_year)
      @teams_by_conference = fetch_teams_by_conference
      @players_by_team = fetch_players_by_team(@team_codes)

      # Bulk fetch sub-section data (avoids N+1)
      @cap_holds_by_team = fetch_cap_holds_by_team(@team_codes)
      @exceptions_by_team = fetch_exceptions_by_team(@team_codes)
      @dead_money_by_team = fetch_dead_money_by_team(@team_codes)
      @picks_by_team = fetch_picks_by_team(@team_codes)

      requested = params[:team]
      @initial_team = if requested.present? && valid_team_code?(requested)
        requested.to_s.strip.upcase
      else
        @team_codes.first
      end

      @initial_team_summary = @initial_team ? fetch_team_summary(@initial_team, @salary_year) : nil
    rescue ActiveRecord::StatementInvalid => e
      # Useful when a dev DB hasn't been hydrated with the pcms.* schema yet.
      @boot_error = e.message
      @salary_year = salary_year_param
      @salary_years = SALARY_YEARS
      @team_codes = []
      @teams_by_conference = { "Eastern" => [], "Western" => [] }
      @players_by_team = {}
      @cap_holds_by_team = {}
      @exceptions_by_team = {}
      @dead_money_by_team = {}
      @picks_by_team = {}
      @initial_team = nil
      @initial_team_summary = nil
    end

    # GET /tools/salary-book/teams/:teamcode/section
    def team_section
      team_code = normalize_team_code(params[:teamcode])
      year = salary_year_param
      players = fetch_team_players(team_code)

      render partial: "tools/salary_book/team_section", locals: { team_code:, players:, year:, salary_years: SALARY_YEARS }, layout: false
    end

    # GET /tools/salary-book/sidebar/team?team=BOS
    def sidebar_team
      team_code = normalize_team_code(params[:team])
      year = salary_year_param

      summary = fetch_team_summary(team_code, year)

      render partial: "tools/salary_book/sidebar_team", locals: { team_code:, summary:, year: }, layout: false
    end

    # GET /tools/salary-book/sidebar/player/:id
    def sidebar_player
      player_id = Integer(params[:id])
      player = fetch_player(player_id)
      raise ActiveRecord::RecordNotFound unless player

      render partial: "tools/salary_book/sidebar_player", locals: { player: }, layout: false
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    # GET /tools/salary-book/sidebar/clear
    def sidebar_clear
      render partial: "tools/salary_book/sidebar_clear", layout: false
    end

    private

    def conn
      ActiveRecord::Base.connection
    end

    def salary_year_param
      raw = params[:year].presence
      return CURRENT_SALARY_YEAR unless raw

      Integer(raw)
    rescue ArgumentError
      CURRENT_SALARY_YEAR
    end

    def valid_team_code?(raw)
      raw.to_s.strip.upcase.match?(/\A[A-Z]{3}\z/)
    end

    def normalize_team_code(raw)
      team = raw.to_s.strip.upcase
      raise ActiveRecord::RecordNotFound unless team.match?(/\A[A-Z]{3}\z/)

      team
    end

    def fetch_team_codes(year)
      year_sql = conn.quote(year)

      conn.exec_query(
        "SELECT team_code FROM pcms.team_salary_warehouse WHERE salary_year = #{year_sql} ORDER BY team_code"
      ).rows.flatten.compact
    end

    def fetch_teams_by_conference
      rows = conn.exec_query(<<~SQL).to_a
        SELECT team_code, team_name, conference_name
        FROM pcms.teams
        WHERE league_lk = 'NBA'
          AND team_name NOT LIKE 'Non-NBA%'
          AND conference_name IS NOT NULL
        ORDER BY team_code
      SQL

      result = { "Eastern" => [], "Western" => [] }
      rows.each do |row|
        conf = row["conference_name"]
        next unless result.key?(conf)

        result[conf] << { code: row["team_code"], name: row["team_name"] }
      end

      result
    end

    def fetch_players_by_team(team_codes)
      return {} if team_codes.empty?

      in_list = team_codes.map { |c| conn.quote(c) }.join(",")

      rows = conn.exec_query(player_columns_sql("team_code IN (#{in_list})")).to_a

      rows.group_by { |r| r["team_code"] }
    end

    def fetch_team_players(team_code)
      team_sql = conn.quote(team_code)

      conn.exec_query(player_columns_sql("team_code = #{team_sql}")).to_a
    end

    def player_columns_sql(where_clause)
      <<~SQL
        SELECT
          player_id,
          player_name,
          team_code,
          age,
          agent_name,
          agent_id,
          cap_2025, cap_2026, cap_2027, cap_2028, cap_2029, cap_2030,
          pct_cap_2025, pct_cap_2026, pct_cap_2027, pct_cap_2028, pct_cap_2029, pct_cap_2030,
          total_salary_from_2025,
          option_2025, option_2026, option_2027, option_2028, option_2029, option_2030,
          is_two_way,
          is_no_trade,
          is_trade_bonus,
          trade_bonus_percent,
          trade_kicker_display,
          is_trade_consent_required_now,
          is_trade_restricted_now,
          is_poison_pill,
          is_min_contract,
          is_fully_guaranteed_2025, is_fully_guaranteed_2026, is_fully_guaranteed_2027,
          is_fully_guaranteed_2028, is_fully_guaranteed_2029, is_fully_guaranteed_2030,
          is_partially_guaranteed_2025, is_partially_guaranteed_2026, is_partially_guaranteed_2027,
          is_partially_guaranteed_2028, is_partially_guaranteed_2029, is_partially_guaranteed_2030,
          is_non_guaranteed_2025, is_non_guaranteed_2026, is_non_guaranteed_2027,
          is_non_guaranteed_2028, is_non_guaranteed_2029, is_non_guaranteed_2030,
          pct_cap_percentile_2025, pct_cap_percentile_2026, pct_cap_percentile_2027,
          pct_cap_percentile_2028, pct_cap_percentile_2029, pct_cap_percentile_2030,
          contract_type_code,
          contract_type_lookup_value
        FROM pcms.salary_book_warehouse
        WHERE #{where_clause}
        ORDER BY team_code, total_salary_from_2025 DESC NULLS LAST, player_name
      SQL
    end

    def fetch_team_summary(team_code, year)
      team_sql = conn.quote(team_code)
      year_sql = conn.quote(year)

      conn.exec_query(
        <<~SQL
          SELECT *
          FROM pcms.team_salary_warehouse
          WHERE team_code = #{team_sql}
            AND salary_year = #{year_sql}
          LIMIT 1
        SQL
      ).first
    end

    def fetch_player(player_id)
      id_sql = conn.quote(player_id)

      conn.exec_query(
        <<~SQL
          SELECT
            sbw.player_id,
            sbw.player_name,
            sbw.team_code,
            sbw.agent_name,
            sbw.age,
            sbw.cap_2025,
            sbw.cap_2026,
            sbw.cap_2027,
            sbw.cap_2028,
            sbw.cap_2029,
            sbw.cap_2030,
            sbw.total_salary_from_2025,
            sbw.option_2025,
            sbw.option_2026,
            sbw.option_2027,
            sbw.option_2028,
            sbw.option_2029,
            sbw.option_2030,
            sbw.is_two_way,
            sbw.is_no_trade,
            sbw.trade_kicker_display,
            sbw.contract_type_code,
            sbw.contract_type_lookup_value,
            sbw.refreshed_at
          FROM pcms.salary_book_warehouse sbw
          WHERE sbw.player_id = #{id_sql}
          LIMIT 1
        SQL
      ).first
    end

    # -------------------------------------------------------------------------
    # Bulk fetch sub-section data (avoids N+1 per team)
    # -------------------------------------------------------------------------

    def fetch_cap_holds_by_team(team_codes)
      return {} if team_codes.empty?

      in_list = team_codes.map { |c| conn.quote(c) }.join(",")

      rows = conn.exec_query(<<~SQL).to_a
        SELECT
          non_contract_amount_id AS id,
          team_code,
          player_id,
          player_name,
          amount_type_lk,
          MAX(cap_amount) FILTER (WHERE salary_year = 2025)::numeric AS cap_2025,
          MAX(cap_amount) FILTER (WHERE salary_year = 2026)::numeric AS cap_2026,
          MAX(cap_amount) FILTER (WHERE salary_year = 2027)::numeric AS cap_2027,
          MAX(cap_amount) FILTER (WHERE salary_year = 2028)::numeric AS cap_2028,
          MAX(cap_amount) FILTER (WHERE salary_year = 2029)::numeric AS cap_2029
        FROM pcms.cap_holds_warehouse
        WHERE team_code IN (#{in_list})
          AND salary_year BETWEEN 2025 AND 2029
        GROUP BY non_contract_amount_id, team_code, player_id, player_name, amount_type_lk
        ORDER BY team_code, cap_2025 DESC NULLS LAST, player_name ASC NULLS LAST
      SQL

      rows.group_by { |r| r["team_code"] }
    end

    def fetch_exceptions_by_team(team_codes)
      return {} if team_codes.empty?

      in_list = team_codes.map { |c| conn.quote(c) }.join(",")

      rows = conn.exec_query(<<~SQL).to_a
        SELECT
          team_exception_id AS id,
          team_code,
          exception_type_lk,
          exception_type_name,
          trade_exception_player_id,
          trade_exception_player_name,
          expiration_date,
          is_expired,
          MAX(remaining_amount) FILTER (WHERE salary_year = 2025)::numeric AS remaining_2025,
          MAX(remaining_amount) FILTER (WHERE salary_year = 2026)::numeric AS remaining_2026,
          MAX(remaining_amount) FILTER (WHERE salary_year = 2027)::numeric AS remaining_2027,
          MAX(remaining_amount) FILTER (WHERE salary_year = 2028)::numeric AS remaining_2028,
          MAX(remaining_amount) FILTER (WHERE salary_year = 2029)::numeric AS remaining_2029
        FROM pcms.exceptions_warehouse
        WHERE team_code IN (#{in_list})
          AND salary_year BETWEEN 2025 AND 2029
          AND COALESCE(is_expired, false) = false
        GROUP BY
          team_exception_id,
          team_code,
          exception_type_lk,
          exception_type_name,
          trade_exception_player_id,
          trade_exception_player_name,
          expiration_date,
          is_expired
        ORDER BY team_code, remaining_2025 DESC NULLS LAST, exception_type_name ASC NULLS LAST
      SQL

      rows.group_by { |r| r["team_code"] }
    end

    def fetch_dead_money_by_team(team_codes)
      return {} if team_codes.empty?

      in_list = team_codes.map { |c| conn.quote(c) }.join(",")

      rows = conn.exec_query(<<~SQL).to_a
        SELECT
          transaction_waiver_amount_id AS id,
          team_code,
          player_id,
          player_name,
          waive_date,
          MAX(cap_value) FILTER (WHERE salary_year = 2025)::numeric AS cap_2025,
          MAX(cap_value) FILTER (WHERE salary_year = 2026)::numeric AS cap_2026,
          MAX(cap_value) FILTER (WHERE salary_year = 2027)::numeric AS cap_2027,
          MAX(cap_value) FILTER (WHERE salary_year = 2028)::numeric AS cap_2028,
          MAX(cap_value) FILTER (WHERE salary_year = 2029)::numeric AS cap_2029
        FROM pcms.dead_money_warehouse
        WHERE team_code IN (#{in_list})
          AND salary_year BETWEEN 2025 AND 2029
        GROUP BY transaction_waiver_amount_id, team_code, player_id, player_name, waive_date
        ORDER BY team_code, cap_2025 DESC NULLS LAST, player_name ASC NULLS LAST
      SQL

      rows.group_by { |r| r["team_code"] }
    end

    def fetch_picks_by_team(team_codes)
      return {} if team_codes.empty?

      in_list = team_codes.map { |c| conn.quote(c) }.join(",")

      rows = conn.exec_query(<<~SQL).to_a
        SELECT
          team_code,
          draft_year AS year,
          draft_round AS round,
          asset_slot,
          sub_asset_slot,
          asset_type,
          is_conditional,
          is_swap,
          counterparty_team_code AS origin_team_code,
          raw_part AS description
        FROM pcms.draft_pick_summary_assets
        WHERE team_code IN (#{in_list})
          AND draft_year BETWEEN 2025 AND 2030
        ORDER BY team_code, draft_year, draft_round, asset_slot, sub_asset_slot
      SQL

      # Generate unique ID for each pick
      rows.each_with_index do |row, idx|
        row["id"] = "#{row['team_code']}-#{row['year']}-#{row['round']}-#{row['asset_slot']}-#{row['sub_asset_slot']}"
      end

      rows.group_by { |r| r["team_code"] }
    end
  end
end
