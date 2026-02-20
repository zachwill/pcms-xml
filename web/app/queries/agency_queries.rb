class AgencyQueries
  def initialize(connection: ActiveRecord::Base.connection)
    @connection = connection
  end

  private attr_reader :connection

  def conn
    connection
  end

  def fetch_index_agencies(where_sql:, sort_sql:, sort_direction:, book_total_sql:, book_percentile_sql:, expiring_sql:)
    conn.exec_query(<<~SQL).to_a
      SELECT
        w.agency_id,
        w.agency_name,
        w.is_active,

        COALESCE(w.agent_count, 0)::integer AS agent_count,
        COALESCE(w.client_count, 0)::integer AS client_count,
        COALESCE(w.standard_count, 0)::integer AS standard_count,
        COALESCE(w.two_way_count, 0)::integer AS two_way_count,
        COALESCE(w.team_count, 0)::integer AS team_count,

        COALESCE(#{book_total_sql}, 0)::bigint AS book_total,
        #{book_percentile_sql} AS book_total_percentile,
        COALESCE(w.cap_2025_total, 0)::bigint AS cap_2025_total,
        COALESCE(w.cap_2026_total, 0)::bigint AS cap_2026_total,
        COALESCE(w.cap_2027_total, 0)::bigint AS cap_2027_total,
        COALESCE(w.total_salary_from_2025, 0)::bigint AS total_salary_from_2025,

        COALESCE(w.max_contract_count, 0)::integer AS max_contract_count,
        COALESCE(w.rookie_scale_count, 0)::integer AS rookie_scale_count,
        COALESCE(w.min_contract_count, 0)::integer AS min_contract_count,

        COALESCE(w.no_trade_count, 0)::integer AS no_trade_count,
        COALESCE(w.trade_kicker_count, 0)::integer AS trade_kicker_count,
        COALESCE(w.trade_restricted_count, 0)::integer AS trade_restricted_count,

        COALESCE(#{expiring_sql}, 0)::integer AS expiring_in_window,
        COALESCE(w.expiring_2025, 0)::integer AS expiring_2025,
        COALESCE(w.expiring_2026, 0)::integer AS expiring_2026,
        COALESCE(w.expiring_2027, 0)::integer AS expiring_2027,

        COALESCE(w.player_option_count, 0)::integer AS player_option_count,
        COALESCE(w.team_option_count, 0)::integer AS team_option_count,

        w.agent_count_percentile,
        w.client_count_percentile,
        w.max_contract_count_percentile
      FROM pcms.agencies_warehouse w
      WHERE #{where_sql}
      ORDER BY #{sort_sql} #{sort_direction} NULLS LAST,
               w.agency_name ASC
      LIMIT 260
    SQL
  end

  def fetch_index_top_agents_for_agencies(agency_ids, limit_per_agency: 3, book_total_sql: "w.cap_2025_total")
    ids = Array(agency_ids).map(&:to_i).select(&:positive?).uniq
    return [] if ids.empty?

    limit = limit_per_agency.to_i
    limit = 3 if limit <= 0

    conn.exec_query(<<~SQL).to_a
      WITH ranked AS (
        SELECT
          w.agency_id,
          w.agent_id,
          w.full_name,
          COALESCE(#{book_total_sql}, 0)::bigint AS book_total,
          ROW_NUMBER() OVER (
            PARTITION BY w.agency_id
            ORDER BY #{book_total_sql} DESC NULLS LAST, w.full_name ASC
          ) AS row_num
        FROM pcms.agents_warehouse w
        WHERE w.agency_id IN (#{ids.join(',')})
          AND COALESCE(#{book_total_sql}, 0) > 0
      )
      SELECT
        ranked.agency_id,
        ranked.agent_id,
        ranked.full_name,
        ranked.book_total
      FROM ranked
      WHERE ranked.row_num <= #{limit}
      ORDER BY ranked.agency_id ASC, ranked.row_num ASC
    SQL
  end

  def fetch_index_top_clients_for_agencies(agency_ids, limit_per_agency: 3, book_total_sql: "sbw.cap_2025")
    ids = Array(agency_ids).map(&:to_i).select(&:positive?).uniq
    return [] if ids.empty?

    limit = limit_per_agency.to_i
    limit = 3 if limit <= 0

    conn.exec_query(<<~SQL).to_a
      WITH ranked AS (
        SELECT
          ag.agency_id,
          sbw.player_id,
          sbw.player_name,
          sbw.team_code,
          COALESCE(sbw.is_two_way, false)::boolean AS is_two_way,
          COALESCE(#{book_total_sql}, 0)::bigint AS book_total,
          ROW_NUMBER() OVER (
            PARTITION BY ag.agency_id
            ORDER BY #{book_total_sql} DESC NULLS LAST, sbw.player_name ASC
          ) AS row_num
        FROM pcms.agents ag
        JOIN pcms.salary_book_warehouse sbw
          ON sbw.agent_id = ag.agent_id
        WHERE ag.agency_id IN (#{ids.join(',')})
      )
      SELECT
        ranked.agency_id,
        ranked.player_id,
        ranked.player_name,
        ranked.team_code,
        ranked.is_two_way,
        ranked.book_total
      FROM ranked
      WHERE ranked.row_num <= #{limit}
      ORDER BY ranked.agency_id ASC, ranked.row_num ASC
    SQL
  end

  def fetch_index_top_teams_for_agencies(agency_ids, limit_per_agency: 3)
    ids = Array(agency_ids).map(&:to_i).select(&:positive?).uniq
    return [] if ids.empty?

    limit = limit_per_agency.to_i
    limit = 3 if limit <= 0

    conn.exec_query(<<~SQL).to_a
      WITH grouped AS (
        SELECT
          ag.agency_id,
          sbw.team_code,
          t.team_id,
          COUNT(*)::integer AS player_count,
          COALESCE(SUM(sbw.cap_2025), 0)::bigint AS book_total
        FROM pcms.agents ag
        JOIN pcms.salary_book_warehouse sbw
          ON sbw.agent_id = ag.agent_id
        LEFT JOIN pcms.teams t
          ON t.team_code = sbw.team_code
         AND t.league_lk = 'NBA'
        WHERE ag.agency_id IN (#{ids.join(',')})
          AND sbw.team_code IS NOT NULL
        GROUP BY ag.agency_id, sbw.team_code, t.team_id
      ), ranked AS (
        SELECT
          grouped.*,
          ROW_NUMBER() OVER (
            PARTITION BY grouped.agency_id
            ORDER BY grouped.player_count DESC, grouped.book_total DESC, grouped.team_code ASC
          ) AS row_num
        FROM grouped
      )
      SELECT
        ranked.agency_id,
        ranked.team_code,
        ranked.team_id,
        ranked.player_count,
        ranked.book_total
      FROM ranked
      WHERE ranked.row_num <= #{limit}
      ORDER BY ranked.agency_id ASC, ranked.row_num ASC
    SQL
  end

  def fetch_sidebar_agency(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).first
      SELECT
        w.agency_id,
        w.agency_name,
        w.is_active,
        w.agent_count,
        w.client_count,
        w.standard_count,
        w.two_way_count,
        w.team_count,
        w.cap_2025_total,
        w.cap_2026_total,
        w.cap_2027_total,
        w.total_salary_from_2025,
        w.max_contract_count,
        w.rookie_scale_count,
        w.min_contract_count,
        w.no_trade_count,
        w.trade_kicker_count,
        w.trade_restricted_count,
        w.expiring_2025,
        w.expiring_2026,
        w.expiring_2027,
        w.player_option_count,
        w.team_option_count,
        w.prior_year_nba_now_free_agent_count,
        w.cap_2025_total_percentile,
        w.cap_2026_total_percentile,
        w.cap_2027_total_percentile,
        w.client_count_percentile,
        w.max_contract_count_percentile,
        w.agent_count_percentile
      FROM pcms.agencies_warehouse w
      WHERE w.agency_id = #{id_sql}
      LIMIT 1
    SQL
  end

  def fetch_sidebar_top_agents(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        w.agent_id,
        w.full_name,
        w.client_count,
        w.team_count,
        w.cap_2025_total,
        w.cap_2025_total_percentile,
        w.client_count_percentile,
        w.max_contract_count,
        w.expiring_2025
      FROM pcms.agents_warehouse w
      WHERE w.agency_id = #{id_sql}
      ORDER BY w.cap_2025_total DESC NULLS LAST, w.full_name
      LIMIT 60
    SQL
  end

  def fetch_sidebar_top_clients(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        sbw.player_id,
        sbw.player_name,
        sbw.team_code,
        t.team_id,
        t.team_name,
        sbw.agent_id,
        a.full_name AS agent_name,
        sbw.cap_2025::numeric AS cap_2025,
        sbw.total_salary_from_2025::numeric AS total_salary_from_2025,
        COALESCE(sbw.is_two_way, false)::boolean AS is_two_way
      FROM pcms.agents a
      JOIN pcms.salary_book_warehouse sbw
        ON sbw.agent_id = a.agent_id
      LEFT JOIN pcms.teams t
        ON t.team_code = sbw.team_code
       AND t.league_lk = 'NBA'
      WHERE a.agency_id = #{id_sql}
      ORDER BY sbw.cap_2025 DESC NULLS LAST, sbw.player_name
      LIMIT 80
    SQL
  end

  def fetch_agency_for_show(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).first
      SELECT agency_id, agency_name, is_active
      FROM pcms.agencies
      WHERE agency_id = #{id_sql}
      LIMIT 1
    SQL
  end

  def fetch_show_agents(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        ag.agent_id,
        ag.full_name,
        ag.is_active,
        COALESCE(w.client_count, 0)::integer AS client_count,
        COALESCE(w.cap_2025_total, 0)::bigint AS cap_2025_total,
        COALESCE(w.total_salary_from_2025, 0)::bigint AS total_salary_from_2025
      FROM pcms.agents ag
      LEFT JOIN pcms.agents_warehouse w
        ON w.agent_id = ag.agent_id
      WHERE ag.agency_id = #{id_sql}
      ORDER BY w.cap_2025_total DESC NULLS LAST, ag.full_name
    SQL
  end

  def fetch_show_rollup(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).first || {}
      SELECT
        agent_count,
        client_count,
        team_count,
        cap_2025_total,
        total_salary_from_2025,
        two_way_count,
        min_contract_count,
        max_contract_count,
        rookie_scale_count,
        no_trade_count,
        trade_kicker_count,
        trade_restricted_count,
        expiring_2025,
        expiring_2026,
        expiring_2027,
        player_option_count,
        team_option_count,
        prior_year_nba_now_free_agent_count,
        agent_count_percentile,
        client_count_percentile,
        cap_2025_total_percentile
      FROM pcms.agencies_warehouse
      WHERE agency_id = #{id_sql}
      LIMIT 1
    SQL
  end

  def fetch_show_team_distribution(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        sbw.team_code,
        t.team_id,
        t.team_name,
        COUNT(sbw.player_id)::integer AS client_count,
        COALESCE(SUM(sbw.cap_2025), 0)::bigint AS cap_2025_total
      FROM pcms.agents ag
      JOIN pcms.salary_book_warehouse sbw
        ON sbw.agent_id = ag.agent_id
      LEFT JOIN pcms.teams t
        ON t.team_code = sbw.team_code
       AND t.league_lk = 'NBA'
      WHERE ag.agency_id = #{id_sql}
      GROUP BY sbw.team_code, t.team_id, t.team_name
      ORDER BY cap_2025_total DESC NULLS LAST, sbw.team_code
      LIMIT 12
    SQL
  end

  def fetch_show_clients(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        sbw.player_id,
        sbw.player_name,
        sbw.team_code,
        t.team_id,
        t.team_name,
        sbw.agent_id,
        ag.full_name AS agent_name,
        sbw.cap_2025::numeric AS cap_2025,
        sbw.cap_2026::numeric AS cap_2026,
        sbw.cap_2027::numeric AS cap_2027,
        sbw.cap_2028::numeric AS cap_2028,
        sbw.cap_2029::numeric AS cap_2029,
        sbw.cap_2030::numeric AS cap_2030,
        sbw.total_salary_from_2025::numeric AS total_salary_from_2025,
        sbw.pct_cap_2025,
        COALESCE(sbw.is_two_way, false)::boolean AS is_two_way,
        COALESCE(sbw.is_no_trade, false)::boolean AS is_no_trade,
        COALESCE(sbw.is_trade_bonus, false)::boolean AS is_trade_bonus,
        COALESCE(sbw.is_trade_restricted_now, false)::boolean AS is_trade_restricted_now,
        sbw.option_2025,
        sbw.option_2026,
        sbw.option_2027,
        sbw.option_2028
      FROM pcms.agents ag
      JOIN pcms.salary_book_warehouse sbw
        ON sbw.agent_id = ag.agent_id
      LEFT JOIN pcms.teams t
        ON t.team_code = sbw.team_code
       AND t.league_lk = 'NBA'
      WHERE ag.agency_id = #{id_sql}
      ORDER BY sbw.cap_2025 DESC NULLS LAST, sbw.player_name
    SQL
  end

  def fetch_show_client_yearly_footprint(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        sbw.player_id,
        sby.salary_year,
        sby.cap_amount::numeric AS cap_amount,
        sby.tax_amount::numeric AS tax_amount,
        sby.apron_amount::numeric AS apron_amount
      FROM pcms.agents ag
      JOIN pcms.salary_book_warehouse sbw
        ON sbw.agent_id = ag.agent_id
      JOIN pcms.salary_book_yearly sby
        ON sby.player_id = sbw.player_id
      WHERE ag.agency_id = #{id_sql}
        AND sby.salary_year BETWEEN 2025 AND 2030
      ORDER BY sby.salary_year, sbw.player_id
    SQL
  end

  def fetch_agency_name_for_redirect(agency_id)
    id_sql = conn.quote(agency_id)

    conn.exec_query(<<~SQL).first
      SELECT agency_name
      FROM pcms.agencies
      WHERE agency_id = #{id_sql}
      LIMIT 1
    SQL
  end
end
