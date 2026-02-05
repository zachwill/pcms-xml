module Entities
  class TransactionsController < ApplicationController
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

      render :show
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end
  end
end
