module DraftSelections
  class IndexWorkspaceState
    def initialize(params:, index_rounds:, index_sorts:, index_lenses:)
      @params = params
      @index_rounds = index_rounds
      @index_sorts = index_sorts
      @index_lenses = index_lenses
    end

    def build
      setup_index_filters!
      load_index_dimensions!
      load_index_rows!
      build_sidebar_summary!

      {
        query: @query,
        round_lens: @round_lens,
        team_lens: @team_lens,
        sort: @sort,
        lens: @lens,
        sort_label: @sort_label,
        lens_label: @lens_label,
        year_options: @year_options,
        year_lens: @year_lens,
        team_options: @team_options,
        results: @results,
        sidebar_summary: @sidebar_summary
      }
    end

    private

    attr_reader :params, :index_rounds, :index_sorts, :index_lenses

    def load_index_dimensions!
      conn = ActiveRecord::Base.connection

      @year_options = conn.exec_query(<<~SQL).rows.flatten.map(&:to_i)
        SELECT DISTINCT draft_year
        FROM pcms.draft_selections
        ORDER BY draft_year DESC
      SQL

      requested_year = normalize_year_param(params[:year])
      @year_lens = if requested_year.present? && @year_options.include?(requested_year)
        requested_year.to_s
      elsif @year_options.any?
        @year_options.first.to_s
      else
        Date.today.year.to_s
      end

      @team_options = conn.exec_query(<<~SQL).to_a
        SELECT team_code, team_name
        FROM pcms.teams
        WHERE league_lk = 'NBA'
          AND team_name NOT LIKE 'Non-NBA%'
        ORDER BY team_code
      SQL
    end

    def load_index_rows!
      conn = ActiveRecord::Base.connection

      where_clauses = ["ds.draft_year = #{conn.quote(@year_lens.to_i)}"]
      where_clauses << "ds.draft_round = #{conn.quote(@round_lens.to_i)}" if @round_lens != "all"
      where_clauses << "ds.drafting_team_code = #{conn.quote(@team_lens)}" if @team_lens.present?

      if @query.present?
        if @query.match?(/\A\d+\z/)
          query_value = @query.to_i
          where_clauses << <<~SQL.squish
            (
              ds.player_id = #{conn.quote(query_value)}
              OR ds.transaction_id = #{conn.quote(query_value)}
              OR ds.pick_number = #{conn.quote(query_value)}
            )
          SQL
        else
          query_sql = conn.quote("%#{@query}%")
          where_clauses << <<~SQL.squish
            (
              COALESCE(NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''), NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), '')) ILIKE #{query_sql}
              OR ds.drafting_team_code ILIKE #{query_sql}
              OR COALESCE(t.team_name, '') ILIKE #{query_sql}
            )
          SQL
        end
      end

      rows = conn.exec_query(<<~SQL).to_a
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
          LEFT JOIN pcms.people p
            ON p.person_id = ds.player_id
          LEFT JOIN pcms.transactions tx
            ON tx.transaction_id = ds.transaction_id
          LEFT JOIN pcms.teams t
            ON t.team_code = ds.drafting_team_code
           AND t.league_lk = 'NBA'
          WHERE #{where_clauses.join(" AND ")}
        )
        SELECT
          selection_rows.*,
          (CASE WHEN selection_rows.trade_id IS NOT NULL THEN 1 ELSE 0 END)::integer AS has_trade,
          (
            COALESCE(selection_rows.provenance_trade_count, 0)
            + CASE WHEN selection_rows.trade_id IS NOT NULL THEN 1 ELSE 0 END
          )::integer AS provenance_priority_score
        FROM selection_rows
        WHERE #{selections_lens_sql(alias_name: "selection_rows")}
        ORDER BY #{selections_order_sql}
        LIMIT 260
      SQL

      @results = rows.map do |row|
        severity = draft_selection_provenance_severity(row)
        row.merge(
          "provenance_severity" => severity,
          "provenance_severity_label" => draft_selection_provenance_severity_label(severity)
        )
      end
    end

    def build_sidebar_summary!
      rows = Array(@results)
      severity_counts = draft_selection_provenance_counts(rows)
      trade_active_count = severity_counts["with_trade"] + severity_counts["deep_chain"]

      filters = ["Year: #{@year_lens}"]
      filters << "Round: R#{@round_lens}" if @round_lens != "all"
      filters << "Team: #{@team_lens}" if @team_lens.present?
      filters << %(Search: "#{@query}") if @query.present?
      filters << "Sort: #{@sort_label}"
      filters << "Lens: #{@lens_label}" unless @lens == "all"

      @sidebar_summary = {
        year: @year_lens,
        round: @round_lens,
        team: @team_lens,
        query: @query,
        sort: @sort,
        sort_label: @sort_label,
        lens: @lens,
        lens_label: @lens_label,
        row_count: rows.size,
        first_round_count: rows.count { |row| row["draft_round"].to_i == 1 },
        clean_count: severity_counts["clean"],
        with_trade_count: severity_counts["with_trade"],
        deep_chain_count: severity_counts["deep_chain"],
        trade_active_count: trade_active_count,
        severity_counts: severity_counts,
        known_player_count: rows.count { |row| row["player_id"].present? },
        unique_team_count: rows.map { |row| row["drafting_team_code"].presence }.compact.uniq.size,
        provenance_trade_total: rows.sum { |row| row["provenance_trade_count"].to_i },
        filters: filters,
        top_rows: rows.first(14)
      }
    end

    def setup_index_filters!
      @query = params[:q].to_s.strip
      @round_lens = normalize_round_param(params[:round]) || "all"
      @team_lens = normalize_team_code_param(params[:team]) || ""
      @sort = normalize_sort_param(params[:sort]) || "provenance"
      @lens = normalize_lens_param(params[:lens]) || "all"
      @sort_label = draft_selections_sort_label(@sort)
      @lens_label = draft_selections_lens_label(@lens)
    end

    def selections_order_sql
      case @sort
      when "trade"
        "(CASE WHEN selection_rows.trade_id IS NOT NULL THEN 1 ELSE 0 END) DESC, selection_rows.provenance_trade_count DESC, selection_rows.draft_round ASC, selection_rows.pick_number ASC"
      when "board"
        "selection_rows.draft_round ASC, selection_rows.pick_number ASC"
      else
        "selection_rows.provenance_trade_count DESC, (CASE WHEN selection_rows.trade_id IS NOT NULL THEN 1 ELSE 0 END) DESC, selection_rows.draft_round ASC, selection_rows.pick_number ASC"
      end
    end

    def selections_lens_sql(alias_name:)
      case @lens
      when "with_trade"
        "(#{alias_name}.trade_id IS NOT NULL OR #{alias_name}.provenance_trade_count > 0)"
      when "deep_chain"
        "#{alias_name}.provenance_trade_count >= 2"
      else
        "1=1"
      end
    end

    def draft_selections_sort_label(sort)
      case sort.to_s
      when "provenance"
        "Deepest provenance chain"
      when "trade"
        "With trade first"
      else
        "Board order"
      end
    end

    def draft_selections_lens_label(lens)
      case lens.to_s
      when "with_trade"
        "Trade-active only"
      when "deep_chain"
        "Deep chain only"
      else
        "All rows"
      end
    end

    def draft_selection_provenance_severity(row)
      provenance_count = row["provenance_trade_count"].to_i
      return "deep_chain" if provenance_count >= 2
      return "with_trade" if row["trade_id"].present? || provenance_count.positive?

      "clean"
    end

    def draft_selection_provenance_severity_label(severity)
      case severity.to_s
      when "deep_chain"
        "Deep chain"
      when "with_trade"
        "With trade"
      else
        "Clean"
      end
    end

    def draft_selection_provenance_counts(rows)
      counts = {
        "clean" => 0,
        "with_trade" => 0,
        "deep_chain" => 0
      }

      rows.each do |row|
        severity = row["provenance_severity"].presence || draft_selection_provenance_severity(row)
        counts[severity] += 1 if counts.key?(severity)
      end

      counts
    end

    def normalize_team_code_param(raw)
      code = raw.to_s.strip.upcase
      return nil if code.blank?
      return nil unless code.match?(/\A[A-Z]{3}\z/)

      code
    end

    def normalize_year_param(raw)
      year = Integer(raw.to_s.strip)
      return nil if year <= 0

      year
    rescue ArgumentError, TypeError
      nil
    end

    def normalize_round_param(raw)
      round = raw.to_s.strip
      round = "all" if round.blank?
      return round if index_rounds.include?(round)

      nil
    end

    def normalize_sort_param(raw)
      sort = raw.to_s.strip
      sort = "board" if sort.blank?
      return sort if index_sorts.include?(sort)

      nil
    end

    def normalize_lens_param(raw)
      lens = raw.to_s.strip
      lens = "all" if lens.blank?
      return lens if index_lenses.include?(lens)

      nil
    end
  end
end
