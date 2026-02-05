module Entities
  class TradesController < ApplicationController
    # GET /trades/:id
    def show
      id = Integer(params[:id])
      conn = ActiveRecord::Base.connection
      id_sql = conn.quote(id)

      @trade = conn.exec_query(<<~SQL).first
        SELECT
          tr.trade_id,
          tr.trade_date,
          tr.trade_finalized_date,
          tr.league_lk,
          tr.record_status_lk,
          tr.trade_comments
        FROM pcms.trades tr
        WHERE tr.trade_id = #{id_sql}
        LIMIT 1
      SQL
      raise ActiveRecord::RecordNotFound unless @trade

      @trade_teams = conn.exec_query(<<~SQL).to_a
        SELECT
          tt.trade_team_id,
          tt.team_id,
          tt.team_code,
          t.team_name,
          tt.seqno,
          tt.team_salary_change,
          tt.total_cash_received,
          tt.total_cash_sent,
          COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.player_id IS NOT NULL)::integer AS player_line_item_count,
          COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.draft_pick_year IS NOT NULL)::integer AS pick_line_item_count,
          COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.trade_entry_lk = 'TREX')::integer AS tpe_line_item_count,
          COUNT(ttd.trade_team_detail_id) FILTER (WHERE ttd.trade_entry_lk = 'CASH' OR COALESCE(ttd.cash_amount, 0) <> 0)::integer AS cash_line_item_count
        FROM pcms.trade_teams tt
        LEFT JOIN pcms.teams t
          ON t.team_id = tt.team_id
        LEFT JOIN pcms.trade_team_details ttd
          ON ttd.trade_id = tt.trade_id
         AND ttd.team_id = tt.team_id
        WHERE tt.trade_id = #{id_sql}
        GROUP BY
          tt.trade_team_id,
          tt.team_id,
          tt.team_code,
          t.team_name,
          tt.seqno,
          tt.team_salary_change,
          tt.total_cash_received,
          tt.total_cash_sent
        ORDER BY tt.seqno, tt.team_code
      SQL

      @player_details = conn.exec_query(<<~SQL).to_a
        SELECT
          ttd.trade_team_detail_id,
          ttd.team_id,
          ttd.team_code,
          t.team_name,
          ttd.seqno,
          ttd.group_number,
          ttd.is_sent,
          ttd.player_id,
          COALESCE(
            NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
            NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
            ttd.player_id::text
          ) AS player_name,
          ttd.contract_id,
          ttd.version_number,
          ttd.is_sign_and_trade,
          ttd.is_trade_bonus,
          ttd.is_no_trade,
          ttd.is_player_consent,
          ttd.is_poison_pill,
          ttd.base_year_amount,
          ttd.is_base_year,
          ttd.trade_entry_lk
        FROM pcms.trade_team_details ttd
        LEFT JOIN pcms.people p
          ON p.person_id = ttd.player_id
        LEFT JOIN pcms.teams t
          ON t.team_id = ttd.team_id
        WHERE ttd.trade_id = #{id_sql}
          AND ttd.player_id IS NOT NULL
        ORDER BY ttd.team_code, ttd.seqno, player_name
        LIMIT 400
      SQL

      @pick_details = conn.exec_query(<<~SQL).to_a
        SELECT
          ttd.trade_team_detail_id,
          ttd.team_id,
          ttd.team_code,
          t.team_name,
          ttd.seqno,
          ttd.group_number,
          ttd.is_sent,
          ttd.draft_pick_year,
          ttd.draft_pick_round,
          ttd.is_draft_pick_future,
          ttd.is_draft_pick_swap,
          ttd.draft_pick_conditional_lk,
          ttd.is_draft_year_plus_two,
          ttd.trade_entry_lk
        FROM pcms.trade_team_details ttd
        LEFT JOIN pcms.teams t
          ON t.team_id = ttd.team_id
        WHERE ttd.trade_id = #{id_sql}
          AND ttd.draft_pick_year IS NOT NULL
        ORDER BY ttd.team_code, ttd.seqno, ttd.draft_pick_year, ttd.draft_pick_round
      SQL

      @cash_details = conn.exec_query(<<~SQL).to_a
        SELECT
          ttd.trade_team_detail_id,
          ttd.team_id,
          ttd.team_code,
          t.team_name,
          ttd.seqno,
          ttd.group_number,
          ttd.is_sent,
          ttd.trade_entry_lk,
          ttd.cash_amount
        FROM pcms.trade_team_details ttd
        LEFT JOIN pcms.teams t
          ON t.team_id = ttd.team_id
        WHERE ttd.trade_id = #{id_sql}
          AND (ttd.trade_entry_lk = 'CASH' OR COALESCE(ttd.cash_amount, 0) <> 0)
        ORDER BY ttd.team_code, ttd.seqno
      SQL

      @draft_pick_trades = conn.exec_query(<<~SQL).to_a
        SELECT
          id,
          draft_year,
          draft_round,
          from_team_id,
          from_team_code,
          to_team_id,
          to_team_code,
          original_team_id,
          original_team_code,
          is_swap,
          is_future,
          is_conditional,
          conditional_type_lk,
          is_draft_year_plus_two
        FROM pcms.draft_pick_trades
        WHERE trade_id = #{id_sql}
        ORDER BY draft_year, draft_round, id
      SQL

      @transactions = conn.exec_query(<<~SQL).to_a
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
          t.from_team_id,
          t.from_team_code,
          from_team.team_name AS from_team_name,
          t.to_team_id,
          t.to_team_code,
          to_team.team_name AS to_team_name,
          t.contract_id,
          t.version_number,
          t.signed_method_lk
        FROM pcms.transactions t
        LEFT JOIN pcms.people p ON p.person_id = t.player_id
        LEFT JOIN pcms.teams from_team ON from_team.team_id = t.from_team_id
        LEFT JOIN pcms.teams to_team ON to_team.team_id = t.to_team_id
        WHERE t.trade_id = #{id_sql}
        ORDER BY t.transaction_date, t.transaction_id
        LIMIT 300
      SQL

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
          is_conditional,
          from_team_code,
          to_team_code,
          draft_year_start,
          draft_year_end,
          draft_rounds
        FROM pcms.endnotes
        WHERE trade_id = #{id_sql}
           OR trade_ids @> ARRAY[#{id_sql}]::integer[]
        ORDER BY endnote_id
        LIMIT 200
      SQL

      render :show
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end
  end
end
