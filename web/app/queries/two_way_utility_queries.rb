class TwoWayUtilityQueries
  def initialize(connection: ActiveRecord::Base.connection)
    @connection = connection
  end

  private attr_reader :connection

  def conn
    connection
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

    conn.exec_query(<<~SQL).to_a
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

    conn.exec_query(<<~SQL).first
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

  def fetch_teams
    conn.exec_query(<<~SQL).to_a
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
end
