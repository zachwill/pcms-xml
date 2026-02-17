class DraftQueries
  def initialize(connection: ActiveRecord::Base.connection)
    @connection = connection
  end

  private attr_reader :connection

  def conn
    connection
  end

  def fetch_selection_years
    conn.exec_query(<<~SQL).rows.flatten.map(&:to_i)
      SELECT DISTINCT draft_year FROM pcms.draft_selections ORDER BY draft_year DESC
    SQL
  end

  def fetch_team_options
    conn.exec_query(<<~SQL).to_a
      SELECT team_code, team_name
      FROM pcms.teams
      WHERE league_lk = 'NBA'
        AND team_name NOT LIKE 'Non-NBA%'
      ORDER BY team_code
    SQL
  end

  def fetch_picks_rows(year:, round:, team:, lens_sql:, order_sql:)
    year_sql = conn.quote(year.to_i)

    round_filter_sql = if round.present? && round != "all"
      "AND v.draft_round = #{conn.quote(round.to_i)}"
    else
      ""
    end

    team_filter_sql = if team.present?
      "(ranked_picks.original_team_code = #{conn.quote(team)} OR ranked_picks.current_team_code = #{conn.quote(team)})"
    else
      "1=1"
    end

    conn.exec_query(<<~SQL).to_a
      WITH picks AS (
        SELECT
          v.draft_year,
          v.draft_round,
          v.team_code AS original_team_code,
          COALESCE(
            MAX(
              CASE
                WHEN v.asset_type = 'TO' THEN
                  COALESCE(
                    (regexp_match(v.display_text, '^To\\s+([A-Z]{3})\\s*:'))[1],
                    NULLIF(v.counterparty_team_code, '')
                  )
              END
            ),
            v.team_code
          ) AS current_team_code,
          BOOL_OR(v.is_swap) AS is_swap,
          BOOL_OR(v.is_conditional) AS has_conditional,
          BOOL_OR(v.is_forfeited) AS has_forfeited,
          STRING_AGG(DISTINCT v.display_text, '; ')
            FILTER (WHERE v.asset_type <> 'OWN') AS protections_summary,
          CASE
            WHEN BOOL_OR(v.is_forfeited) THEN 'Forfeited'
            WHEN BOOL_OR(v.is_conditional) THEN 'Conditional'
            WHEN BOOL_OR(v.asset_type = 'TO') THEN 'Traded'
            ELSE 'Own'
          END AS pick_status,
          COUNT(*)::integer AS asset_line_count,
          COUNT(*) FILTER (WHERE v.asset_type = 'TO')::integer AS outgoing_line_count,
          COUNT(*) FILTER (WHERE v.is_conditional)::integer AS conditional_line_count
        FROM pcms.vw_draft_pick_assets v
        WHERE v.draft_year = #{year_sql}
          #{round_filter_sql}
        GROUP BY v.draft_year, v.draft_round, v.team_code
      ),
      pick_rank AS (
        SELECT
          picks.*,
          (
            SELECT COUNT(*)::integer
            FROM pcms.draft_pick_trades dpt
            WHERE dpt.draft_year = picks.draft_year
              AND dpt.draft_round = picks.draft_round
              AND (
                dpt.original_team_code = picks.original_team_code
                OR dpt.from_team_code = picks.original_team_code
                OR dpt.to_team_code = picks.original_team_code
              )
          ) AS provenance_trade_count
        FROM picks
      ),
      ranked_picks AS (
        SELECT
          pick_rank.*,
          (
            CASE WHEN pick_rank.has_forfeited THEN 7 ELSE 0 END
            + CASE WHEN pick_rank.has_conditional THEN 4 ELSE 0 END
            + CASE WHEN pick_rank.is_swap THEN 2 ELSE 0 END
            + CASE WHEN pick_rank.pick_status = 'Traded' THEN 2 ELSE 0 END
            + LEAST(COALESCE(pick_rank.provenance_trade_count, 0), 6)
          )::integer AS ownership_risk_score
        FROM pick_rank
      )
      SELECT
        ranked_picks.draft_year,
        ranked_picks.draft_round,
        ranked_picks.original_team_code,
        ranked_picks.current_team_code,
        ot.team_id AS original_team_id,
        ct.team_id AS current_team_id,
        ot.team_name AS original_team_name,
        ct.team_name AS current_team_name,
        ranked_picks.is_swap,
        ranked_picks.has_conditional,
        ranked_picks.has_forfeited,
        ranked_picks.protections_summary,
        ranked_picks.pick_status,
        ranked_picks.asset_line_count,
        ranked_picks.outgoing_line_count,
        ranked_picks.conditional_line_count,
        ranked_picks.provenance_trade_count,
        ranked_picks.ownership_risk_score
      FROM ranked_picks
      LEFT JOIN pcms.teams ot
        ON ot.team_code = ranked_picks.original_team_code
       AND ot.league_lk = 'NBA'
       AND ot.is_active = TRUE
      LEFT JOIN pcms.teams ct
        ON ct.team_code = ranked_picks.current_team_code
       AND ct.league_lk = 'NBA'
       AND ct.is_active = TRUE
      WHERE #{team_filter_sql}
        AND #{lens_sql}
      ORDER BY #{order_sql}
    SQL
  end

  def fetch_selections_rows(year:, round:, team:, lens_sql:, order_sql:)
    year_sql = conn.quote(year.to_i)

    where_clauses = ["ds.draft_year = #{year_sql}"]
    where_clauses << "ds.draft_round = #{conn.quote(round.to_i)}" if round.present? && round != "all"
    where_clauses << "ds.drafting_team_code = #{conn.quote(team)}" if team.present?

    conn.exec_query(<<~SQL).to_a
      WITH selection_rows AS (
        SELECT
          ds.transaction_id,
          ds.draft_year,
          ds.draft_round,
          ds.pick_number,
          ds.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            ds.player_id::text
          ) AS player_name,
          ds.drafting_team_id,
          ds.drafting_team_code,
          t.team_name AS drafting_team_name,
          ds.transaction_date,
          tx.trade_id,
          tx.transaction_type_lk,
          (
            SELECT COUNT(*)::integer
            FROM pcms.draft_pick_trades dpt
            WHERE dpt.draft_year = ds.draft_year
              AND dpt.draft_round = ds.draft_round
              AND (
                dpt.original_team_code = ds.drafting_team_code
                OR dpt.from_team_code = ds.drafting_team_code
                OR dpt.to_team_code = ds.drafting_team_code
              )
          ) AS provenance_trade_count
        FROM pcms.draft_selections ds
        LEFT JOIN pcms.transactions tx
          ON tx.transaction_id = ds.transaction_id
        LEFT JOIN pcms.people p
          ON p.person_id = ds.player_id
        LEFT JOIN pcms.teams t
          ON t.team_code = ds.drafting_team_code
         AND t.league_lk = 'NBA'
        WHERE #{where_clauses.join(" AND ")}
      )
      SELECT
        selection_rows.*,
        (
          COALESCE(selection_rows.provenance_trade_count, 0)
          + CASE WHEN selection_rows.trade_id IS NOT NULL THEN 1 ELSE 0 END
          + CASE WHEN selection_rows.draft_round = 1 THEN 1 ELSE 0 END
        )::integer AS provenance_risk_score
      FROM selection_rows
      WHERE #{lens_sql}
      ORDER BY #{order_sql}
    SQL
  end

  def fetch_grid_rows(year_start:, year_end:, round:, team:)
    round_clauses = []
    round_clauses << "v.draft_round = #{conn.quote(round.to_i)}" if round.present? && round != "all"
    team_clauses = []
    team_clauses << "v.team_code = #{conn.quote(team)}" if team.present?

    where_sql = "v.draft_year BETWEEN #{conn.quote(year_start.to_i)} AND #{conn.quote(year_end.to_i)}"
    where_sql += " AND #{round_clauses.join(' AND ')}" if round_clauses.any?
    where_sql += " AND #{team_clauses.join(' AND ')}" if team_clauses.any?

    conn.exec_query(<<~SQL).to_a
      SELECT
        v.team_code,
        t.team_name,
        v.draft_year,
        v.draft_round,
        STRING_AGG(v.display_text, '; ' ORDER BY v.asset_slot, v.sub_asset_slot) AS cell_text,
        BOOL_OR(v.asset_type = 'TO') AS has_outgoing,
        BOOL_OR(v.is_swap) AS has_swap,
        BOOL_OR(v.is_conditional) AS has_conditional,
        BOOL_OR(v.is_forfeited) AS has_forfeited,
        (
          SELECT COUNT(*)::integer
          FROM pcms.draft_pick_trades dpt
          WHERE dpt.draft_year = v.draft_year
            AND dpt.draft_round = v.draft_round
            AND (
              dpt.original_team_code = v.team_code
              OR dpt.from_team_code = v.team_code
              OR dpt.to_team_code = v.team_code
            )
        ) AS provenance_trade_count
      FROM pcms.vw_draft_pick_assets v
      LEFT JOIN pcms.teams t ON t.team_code = v.team_code AND t.league_lk = 'NBA'
      WHERE #{where_sql}
      GROUP BY v.team_code, t.team_name, v.draft_year, v.draft_round
      ORDER BY v.team_code, v.draft_round, v.draft_year
    SQL
  end

  def fetch_sidebar_pick_payload(team_code:, draft_year:, draft_round:)
    team_sql = conn.quote(team_code)
    year_sql = conn.quote(draft_year)
    round_sql = conn.quote(draft_round)

    pick = conn.exec_query(<<~SQL).first
      WITH pick AS (
        SELECT
          v.draft_year,
          v.draft_round,
          v.team_code AS original_team_code,
          COALESCE(
            MAX(
              CASE
                WHEN v.asset_type = 'TO' THEN
                  COALESCE(
                    (regexp_match(v.display_text, '^To\\s+([A-Z]{3})\\s*:'))[1],
                    NULLIF(v.counterparty_team_code, '')
                  )
              END
            ),
            v.team_code
          ) AS current_team_code,
          BOOL_OR(v.is_swap) AS is_swap,
          BOOL_OR(v.is_conditional) AS has_conditional,
          BOOL_OR(v.is_forfeited) AS has_forfeited,
          STRING_AGG(DISTINCT v.display_text, '; ')
            FILTER (WHERE v.asset_type <> 'OWN') AS protections_summary,
          CASE
            WHEN BOOL_OR(v.is_forfeited) THEN 'Forfeited'
            WHEN BOOL_OR(v.is_conditional) THEN 'Conditional'
            WHEN BOOL_OR(v.asset_type = 'TO') THEN 'Traded'
            ELSE 'Own'
          END AS pick_status
        FROM pcms.vw_draft_pick_assets v
        WHERE v.team_code = #{team_sql}
          AND v.draft_year = #{year_sql}
          AND v.draft_round = #{round_sql}
        GROUP BY v.draft_year, v.draft_round, v.team_code
      )
      SELECT
        pick.*,
        ot.team_name AS original_team_name,
        ct.team_name AS current_team_name
      FROM pick
      LEFT JOIN pcms.teams ot
        ON ot.team_code = pick.original_team_code
       AND ot.league_lk = 'NBA'
      LEFT JOIN pcms.teams ct
        ON ct.team_code = pick.current_team_code
       AND ct.league_lk = 'NBA'
      LIMIT 1
    SQL

    return nil unless pick

    assets = conn.exec_query(<<~SQL).to_a
      SELECT
        asset_slot,
        sub_asset_slot,
        asset_type,
        display_text,
        raw_part,
        counterparty_team_code,
        is_swap,
        is_conditional,
        is_forfeited,
        endnote_explanation,
        trade_id
      FROM pcms.vw_draft_pick_assets
      WHERE team_code = #{team_sql}
        AND draft_year = #{year_sql}
        AND draft_round = #{round_sql}
      ORDER BY asset_slot, sub_asset_slot
    SQL

    provenance_rows = conn.exec_query(<<~SQL).to_a
      SELECT
        dpt.id,
        dpt.trade_id,
        tr.trade_date,
        dpt.from_team_code,
        dpt.to_team_code,
        dpt.original_team_code,
        dpt.is_swap,
        dpt.is_future,
        dpt.is_conditional,
        dpt.conditional_type_lk
      FROM pcms.draft_pick_trades dpt
      LEFT JOIN pcms.trades tr
        ON tr.trade_id = dpt.trade_id
      WHERE dpt.draft_year = #{year_sql}
        AND dpt.draft_round = #{round_sql}
        AND (
          dpt.original_team_code = #{team_sql}
          OR dpt.from_team_code = #{team_sql}
          OR dpt.to_team_code = #{team_sql}
        )
      ORDER BY tr.trade_date NULLS LAST, dpt.id
      LIMIT 80
    SQL

    current_team_sql = conn.quote(pick["current_team_code"])
    related_selection = conn.exec_query(<<~SQL).first
      SELECT
        ds.transaction_id,
        ds.player_id,
        ds.pick_number,
        ds.transaction_date
      FROM pcms.draft_selections ds
      WHERE ds.draft_year = #{year_sql}
        AND ds.draft_round = #{round_sql}
        AND ds.drafting_team_code = #{current_team_sql}
      LIMIT 1
    SQL

    {
      pick: pick,
      assets: assets,
      provenance_rows: provenance_rows,
      related_selection: related_selection
    }
  end

  def fetch_sidebar_selection_payload(transaction_id)
    tx_sql = conn.quote(transaction_id)

    selection = conn.exec_query(<<~SQL).first
      SELECT
        ds.transaction_id,
        ds.draft_year,
        ds.draft_round,
        ds.pick_number,
        ds.player_id,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
          ds.player_id::text
        ) AS player_name,
        ds.drafting_team_id,
        ds.drafting_team_code,
        t.team_name AS drafting_team_name,
        ds.transaction_date,
        tx.trade_id,
        tx.transaction_type_lk
      FROM pcms.draft_selections ds
      LEFT JOIN pcms.transactions tx
        ON tx.transaction_id = ds.transaction_id
      LEFT JOIN pcms.people p
        ON p.person_id = ds.player_id
      LEFT JOIN pcms.teams t
        ON t.team_code = ds.drafting_team_code
       AND t.league_lk = 'NBA'
      WHERE ds.transaction_id = #{tx_sql}
      LIMIT 1
    SQL

    return nil unless selection

    year_sql = conn.quote(selection["draft_year"])
    round_sql = conn.quote(selection["draft_round"])
    team_sql = conn.quote(selection["drafting_team_code"])

    provenance_rows = conn.exec_query(<<~SQL).to_a
      SELECT
        dpt.id,
        dpt.trade_id,
        tr.trade_date,
        dpt.from_team_code,
        dpt.to_team_code,
        dpt.original_team_code,
        dpt.is_swap,
        dpt.is_future,
        dpt.is_conditional,
        dpt.conditional_type_lk
      FROM pcms.draft_pick_trades dpt
      LEFT JOIN pcms.trades tr
        ON tr.trade_id = dpt.trade_id
      WHERE dpt.draft_year = #{year_sql}
        AND dpt.draft_round = #{round_sql}
        AND (
          dpt.original_team_code = #{team_sql}
          OR dpt.from_team_code = #{team_sql}
          OR dpt.to_team_code = #{team_sql}
        )
      ORDER BY tr.trade_date NULLS LAST, dpt.id
      LIMIT 80
    SQL

    {
      selection: selection,
      provenance_rows: provenance_rows
    }
  end
end
