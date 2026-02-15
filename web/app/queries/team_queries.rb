class TeamQueries
  def initialize(connection: ActiveRecord::Base.connection)
    @connection = connection
  end

  private attr_reader :connection

  def conn
    connection
  end

  def fetch_team_for_redirect(team_id)
    id_sql = conn.quote(team_id)

    conn.exec_query(<<~SQL).first
      SELECT team_code, team_name
      FROM pcms.teams
      WHERE team_id = #{id_sql}
      LIMIT 1
    SQL
  end

  def fetch_index_teams(year:, where_sql:, order_sql:)
    year_sql = conn.quote(year)

    conn.exec_query(<<~SQL).to_a
      SELECT
        t.team_id,
        t.team_code,
        t.team_name,
        t.city,
        t.conference_name,
        t.division_name,
        tsw.salary_year,
        tsw.cap_total,
        tsw.cap_total_hold,
        tsw.tax_total,
        tsw.apron_total,
        tsw.salary_cap_amount,
        tsw.tax_level_amount,
        tsw.tax_apron_amount,
        tsw.tax_apron2_amount,
        (COALESCE(tsw.salary_cap_amount, 0) - COALESCE(tsw.cap_total_hold, 0))::numeric AS cap_space,
        tsw.room_under_tax,
        tsw.room_under_apron1,
        tsw.room_under_apron2,
        COALESCE(tsw.is_taxpayer, false) AS is_taxpayer,
        COALESCE(tsw.is_repeater_taxpayer, false) AS is_repeater_taxpayer,
        COALESCE(tsw.is_subject_to_apron, false) AS is_subject_to_apron,
        tsw.apron_level_lk,
        tsw.roster_row_count,
        tsw.two_way_row_count,
        COALESCE(tax_calc.luxury_tax_owed, 0)::numeric AS luxury_tax_owed,
        CASE
          WHEN COALESCE(tsw.room_under_apron2, 0) < 0 THEN 'over_apron2'
          WHEN COALESCE(tsw.room_under_apron1, 0) < 0 THEN 'over_apron1'
          WHEN COALESCE(tsw.room_under_tax, 0) < 0 THEN 'over_tax'
          WHEN (COALESCE(tsw.salary_cap_amount, 0) - COALESCE(tsw.cap_total_hold, 0)) < 0 THEN 'over_cap'
          ELSE 'under_cap'
        END AS pressure_bucket,
        CASE
          WHEN COALESCE(tsw.room_under_apron2, 0) < 0 THEN 4
          WHEN COALESCE(tsw.room_under_apron1, 0) < 0 THEN 3
          WHEN COALESCE(tsw.room_under_tax, 0) < 0 THEN 2
          WHEN (COALESCE(tsw.salary_cap_amount, 0) - COALESCE(tsw.cap_total_hold, 0)) < 0 THEN 1
          ELSE 0
        END AS pressure_rank
      FROM pcms.teams t
      LEFT JOIN pcms.team_salary_warehouse tsw
        ON tsw.team_code = t.team_code
       AND tsw.salary_year = #{year_sql}
      LEFT JOIN LATERAL pcms.fn_team_luxury_tax(t.team_code, #{year_sql}) tax_calc
        ON true
      WHERE #{where_sql}
      ORDER BY #{order_sql}
    SQL
  end

  def fetch_index_team_row(team_id:, year:)
    year_sql = conn.quote(year)
    id_sql = conn.quote(team_id)

    conn.exec_query(<<~SQL).first
      SELECT
        t.team_id,
        t.team_code,
        t.team_name,
        t.city,
        t.conference_name,
        t.division_name,
        tsw.salary_year,
        tsw.cap_total,
        tsw.cap_total_hold,
        tsw.tax_total,
        tsw.apron_total,
        tsw.salary_cap_amount,
        tsw.tax_level_amount,
        tsw.tax_apron_amount,
        tsw.tax_apron2_amount,
        (COALESCE(tsw.salary_cap_amount, 0) - COALESCE(tsw.cap_total_hold, 0))::numeric AS cap_space,
        tsw.room_under_tax,
        tsw.room_under_apron1,
        tsw.room_under_apron2,
        COALESCE(tsw.is_taxpayer, false) AS is_taxpayer,
        COALESCE(tsw.is_repeater_taxpayer, false) AS is_repeater_taxpayer,
        COALESCE(tsw.is_subject_to_apron, false) AS is_subject_to_apron,
        tsw.apron_level_lk,
        tsw.roster_row_count,
        tsw.two_way_row_count,
        COALESCE(tax_calc.luxury_tax_owed, 0)::numeric AS luxury_tax_owed,
        CASE
          WHEN COALESCE(tsw.room_under_apron2, 0) < 0 THEN 'over_apron2'
          WHEN COALESCE(tsw.room_under_apron1, 0) < 0 THEN 'over_apron1'
          WHEN COALESCE(tsw.room_under_tax, 0) < 0 THEN 'over_tax'
          WHEN (COALESCE(tsw.salary_cap_amount, 0) - COALESCE(tsw.cap_total_hold, 0)) < 0 THEN 'over_cap'
          ELSE 'under_cap'
        END AS pressure_bucket,
        CASE
          WHEN COALESCE(tsw.room_under_apron2, 0) < 0 THEN 4
          WHEN COALESCE(tsw.room_under_apron1, 0) < 0 THEN 3
          WHEN COALESCE(tsw.room_under_tax, 0) < 0 THEN 2
          WHEN (COALESCE(tsw.salary_cap_amount, 0) - COALESCE(tsw.cap_total_hold, 0)) < 0 THEN 1
          ELSE 0
        END AS pressure_rank
      FROM pcms.teams t
      LEFT JOIN pcms.team_salary_warehouse tsw
        ON tsw.team_code = t.team_code
       AND tsw.salary_year = #{year_sql}
      LEFT JOIN LATERAL pcms.fn_team_luxury_tax(t.team_code, #{year_sql}) tax_calc
        ON true
      WHERE t.team_id = #{id_sql}
        AND t.league_lk = 'NBA'
        AND t.team_name NOT LIKE 'Non-NBA%'
      LIMIT 1
    SQL
  end

  def fetch_team_by_id(team_id)
    id_sql = conn.quote(team_id)

    conn.exec_query(<<~SQL).first
      SELECT team_id, team_code, team_name, conference_name, city, division_name
      FROM pcms.teams
      WHERE team_id = #{id_sql}
      LIMIT 1
    SQL
  end

  def fetch_team_salary_snapshot(team_code, salary_year: 2025)
    code_sql = conn.quote(team_code)
    year_sql = conn.quote(salary_year)

    conn.exec_query(<<~SQL).first
      SELECT
        tsw.salary_year,
        tsw.room_under_tax,
        tsw.room_under_apron1,
        tsw.room_under_apron2,
        tsw.is_taxpayer,
        tsw.is_repeater_taxpayer,
        tsw.apron_level_lk,
        tsw.roster_row_count,
        tsw.two_way_row_count
      FROM pcms.team_salary_warehouse tsw
      WHERE tsw.team_code = #{code_sql}
        AND tsw.salary_year = #{year_sql}
      LIMIT 1
    SQL
  end

  def fetch_roster(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).to_a
      SELECT
        sbw.player_id,
        sbw.player_name,
        sbw.team_code,
        sbw.agent_id,
        sbw.agent_name,
        sbw.is_two_way,
        sbw.is_min_contract,
        sbw.is_trade_restricted_now,
        sbw.cap_2025::numeric AS cap_2025,
        sbw.total_salary_from_2025::numeric AS total_salary_from_2025
      FROM pcms.salary_book_warehouse sbw
      WHERE sbw.team_code = #{code_sql}
      ORDER BY sbw.cap_2025 DESC NULLS LAST, sbw.total_salary_from_2025 DESC NULLS LAST, sbw.player_name
    SQL
  end

  def fetch_team_salary_rows(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).to_a
      SELECT
        tsw.salary_year,
        tsw.cap_total,
        tsw.cap_total_hold,
        tsw.tax_total,
        tsw.apron_total,
        tsw.mts_total,
        tsw.salary_cap_amount,
        tsw.tax_level_amount,
        tsw.tax_apron_amount,
        tsw.tax_apron2_amount,
        tsw.over_cap,
        tsw.room_under_tax,
        tsw.room_under_apron1,
        tsw.room_under_apron2,
        tsw.is_taxpayer,
        tsw.is_repeater_taxpayer,
        tsw.is_subject_to_apron,
        tsw.apron_level_lk,
        tsw.roster_row_count,
        tsw.fa_row_count,
        tsw.term_row_count,
        tsw.two_way_row_count,
        pcms.fn_luxury_tax_amount(
          tsw.salary_year,
          GREATEST(COALESCE(tsw.tax_total, 0) - COALESCE(tsw.tax_level_amount, 0), 0),
          COALESCE(tsw.is_repeater_taxpayer, false)
        ) AS luxury_tax_owed,
        tsw.refreshed_at
      FROM pcms.team_salary_warehouse tsw
      WHERE tsw.team_code = #{code_sql}
        AND tsw.salary_year BETWEEN 2025 AND 2031
      ORDER BY tsw.salary_year
    SQL
  end

  def fetch_cap_holds(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).to_a
      SELECT
        non_contract_amount_id AS id,
        player_id,
        player_name,
        amount_type_lk,
        MAX(cap_amount) FILTER (WHERE salary_year = 2025)::numeric AS cap_2025,
        MAX(cap_amount) FILTER (WHERE salary_year = 2026)::numeric AS cap_2026,
        MAX(cap_amount) FILTER (WHERE salary_year = 2027)::numeric AS cap_2027,
        MAX(cap_amount) FILTER (WHERE salary_year = 2028)::numeric AS cap_2028,
        MAX(cap_amount) FILTER (WHERE salary_year = 2029)::numeric AS cap_2029,
        MAX(cap_amount) FILTER (WHERE salary_year = 2030)::numeric AS cap_2030
      FROM pcms.cap_holds_warehouse
      WHERE team_code = #{code_sql}
        AND salary_year BETWEEN 2025 AND 2030
      GROUP BY non_contract_amount_id, player_id, player_name, amount_type_lk
      ORDER BY cap_2025 DESC NULLS LAST, player_name ASC NULLS LAST
    SQL
  end

  def fetch_exceptions(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).to_a
      SELECT
        team_exception_id AS id,
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
        MAX(remaining_amount) FILTER (WHERE salary_year = 2029)::numeric AS remaining_2029,
        MAX(remaining_amount) FILTER (WHERE salary_year = 2030)::numeric AS remaining_2030
      FROM pcms.exceptions_warehouse
      WHERE team_code = #{code_sql}
        AND salary_year BETWEEN 2025 AND 2030
        AND COALESCE(is_expired, false) = false
      GROUP BY
        team_exception_id,
        exception_type_lk,
        exception_type_name,
        trade_exception_player_id,
        trade_exception_player_name,
        expiration_date,
        is_expired
      ORDER BY remaining_2025 DESC NULLS LAST, exception_type_name ASC NULLS LAST
    SQL
  end

  def fetch_dead_money(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).to_a
      SELECT
        MIN(transaction_waiver_amount_id) AS id,
        player_id,
        MAX(player_name) AS player_name,
        MAX(waive_date) AS waive_date,
        SUM(cap_value) FILTER (WHERE salary_year = 2025)::numeric AS cap_2025,
        SUM(cap_value) FILTER (WHERE salary_year = 2026)::numeric AS cap_2026,
        SUM(cap_value) FILTER (WHERE salary_year = 2027)::numeric AS cap_2027,
        SUM(cap_value) FILTER (WHERE salary_year = 2028)::numeric AS cap_2028,
        SUM(cap_value) FILTER (WHERE salary_year = 2029)::numeric AS cap_2029,
        SUM(cap_value) FILTER (WHERE salary_year = 2030)::numeric AS cap_2030
      FROM pcms.dead_money_warehouse
      WHERE team_code = #{code_sql}
        AND salary_year BETWEEN 2025 AND 2030
      GROUP BY player_id
      HAVING BOOL_OR(COALESCE(cap_value, 0) <> 0)
      ORDER BY cap_2025 DESC NULLS LAST, player_name ASC NULLS LAST
    SQL
  end

  def fetch_draft_assets(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).to_a
      SELECT
        team_code,
        draft_year,
        draft_round,
        asset_slot,
        sub_asset_slot,
        asset_type,
        is_swap,
        is_conditional,
        counterparty_team_code,
        raw_part,
        endnote_explanation,
        refreshed_at
      FROM pcms.draft_pick_summary_assets
      WHERE team_code = #{code_sql}
        AND draft_year BETWEEN 2025 AND 2030
      ORDER BY draft_year, draft_round, asset_slot, sub_asset_slot
    SQL
  end

  def fetch_recent_ledger_entries(team_id)
    id_sql = conn.quote(team_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        le.ledger_date,
        le.salary_year,
        le.transaction_id,
        tx.trade_id,
        le.player_id,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
          le.player_id::text
        ) AS player_name,
        le.transaction_type_lk,
        le.transaction_description_lk,
        le.cap_amount,
        le.cap_change,
        le.tax_change,
        le.apron_change,
        le.mts_change
      FROM pcms.ledger_entries le
      LEFT JOIN pcms.transactions tx ON tx.transaction_id = le.transaction_id
      LEFT JOIN pcms.people p ON p.person_id = le.player_id
      WHERE le.team_id = #{id_sql}
        AND le.league_lk = 'NBA'
      ORDER BY le.ledger_date DESC, le.transaction_ledger_entry_id DESC
      LIMIT 80
    SQL
  end

  def fetch_exception_usage_rows(team_id)
    id_sql = conn.quote(team_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        teu.effective_date,
        teu.exception_action_lk,
        teu.transaction_type_lk,
        teu.transaction_id,
        tx.trade_id,
        teu.player_id,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
          teu.player_id::text
        ) AS player_name,
        te.exception_type_lk,
        teu.change_amount,
        teu.remaining_exception_amount
      FROM pcms.team_exception_usage teu
      JOIN pcms.team_exceptions te
        ON te.team_exception_id = teu.team_exception_id
      LEFT JOIN pcms.transactions tx
        ON tx.transaction_id = teu.transaction_id
      LEFT JOIN pcms.people p
        ON p.person_id = teu.player_id
      WHERE te.team_id = #{id_sql}
      ORDER BY teu.effective_date DESC NULLS LAST, teu.seqno DESC NULLS LAST
      LIMIT 80
    SQL
  end

  def fetch_apron_provenance_rows(team_id)
    id_sql = conn.quote(team_id)

    conn.exec_query(<<~SQL).to_a
      SELECT
        tts.salary_year,
        tts.is_subject_to_apron,
        tts.subject_to_apron_reason_lk,
        COALESCE(reason_lk.short_description, reason_lk.description) AS subject_to_apron_reason_label,
        tts.apron_level_lk,
        tts.apron1_transaction_id,
        tts.apron2_transaction_id,
        COUNT(DISTINCT ac.constraint_code)::integer AS constraint_count,
        STRING_AGG(
          DISTINCT CASE
            WHEN ac.constraint_code IS NULL THEN NULL
            WHEN ac.description IS NULL OR ac.description = '' THEN ac.constraint_code
            ELSE ac.constraint_code || ' — ' || ac.description
          END,
          E'\n'
          ORDER BY CASE
            WHEN ac.constraint_code IS NULL THEN NULL
            WHEN ac.description IS NULL OR ac.description = '' THEN ac.constraint_code
            ELSE ac.constraint_code || ' — ' || ac.description
          END
        ) AS constraint_lines
      FROM pcms.team_tax_summary_snapshots tts
      LEFT JOIN pcms.lookups reason_lk
        ON reason_lk.lookup_type = 'lk_subject_to_apron_reasons'
       AND reason_lk.lookup_code = tts.subject_to_apron_reason_lk
      LEFT JOIN pcms.apron_constraints ac
        ON ac.effective_salary_year = tts.salary_year
       AND ac.apron_level_lk = tts.apron_level_lk
      WHERE tts.team_id = #{id_sql}
        AND tts.salary_year BETWEEN 2025 AND 2031
      GROUP BY
        tts.salary_year,
        tts.is_subject_to_apron,
        tts.subject_to_apron_reason_lk,
        reason_lk.short_description,
        reason_lk.description,
        tts.apron_level_lk,
        tts.apron1_transaction_id,
        tts.apron2_transaction_id
      ORDER BY tts.salary_year
    SQL
  end

  def fetch_two_way_capacity_row(team_id:, team_code:)
    id_sql = conn.quote(team_id)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).first
      SELECT
        cap.team_id,
        cap.team_code,
        cap.current_contract_count,
        cap.games_remaining,
        cap.under_15_games_count,
        cap.under_15_games_remaining,
        GREATEST(15 - COALESCE(cap.current_contract_count, 0), 0) AS open_standard_slots,
        CASE
          WHEN COALESCE(cap.current_contract_count, 0) < 15 THEN cap.under_15_games_remaining
          ELSE cap.games_remaining
        END AS context_games_remaining,
        cap.ingested_at
      FROM pcms.team_two_way_capacity cap
      WHERE cap.team_id = #{id_sql}
         OR cap.team_code = #{code_sql}
      ORDER BY
        CASE WHEN cap.team_id = #{id_sql} THEN 0 ELSE 1 END,
        cap.ingested_at DESC NULLS LAST
      LIMIT 1
    SQL
  end

  def fetch_two_way_watchlist_rows(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).to_a
      WITH latest AS (
        SELECT DISTINCT ON (g.player_id)
          g.player_id,
          g.game_date_est,
          g.games_on_active_list,
          g.active_list_games_limit,
          g.standard_nba_contracts_on_team,
          g.display_first_name,
          g.display_last_name,
          g.roster_first_name,
          g.roster_last_name
        FROM pcms.two_way_game_utility g
        WHERE g.team_code = #{code_sql}
        ORDER BY g.player_id, g.game_date_est DESC, g.game_id DESC
      )
      SELECT
        l.player_id,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', l.display_first_name, l.display_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', l.roster_first_name, l.roster_last_name)), ''),
          l.player_id::text
        ) AS player_name,
        l.game_date_est,
        l.games_on_active_list,
        l.active_list_games_limit,
        CASE
          WHEN l.active_list_games_limit IS NULL THEN NULL
          ELSE GREATEST(l.active_list_games_limit - COALESCE(l.games_on_active_list, 0), 0)
        END AS remaining_games,
        l.standard_nba_contracts_on_team
      FROM latest l
      LEFT JOIN pcms.people p
        ON p.person_id = l.player_id
      ORDER BY remaining_games ASC NULLS LAST, l.games_on_active_list DESC NULLS LAST, player_name
    SQL
  end

  def fetch_team_id_by_code(team_code)
    code_sql = conn.quote(team_code)

    conn.exec_query(<<~SQL).first
      SELECT team_id
      FROM pcms.teams
      WHERE team_code = #{code_sql}
        AND league_lk = 'NBA'
      LIMIT 1
    SQL
  end
end
