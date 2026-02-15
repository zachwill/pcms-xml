module Teams
  class ShowWorkspaceData
    def initialize(queries:, team:, team_id:, index_salary_year:)
      @queries = queries
      @team = team
      @team_id = team_id
      @index_salary_year = index_salary_year
    end

    def build(defer_heavy_load:)
      team_salary_rows = initial_team_salary_rows

      if defer_heavy_load
        return {
          team_salary_rows:,
          roster: [],
          cap_holds: [],
          exceptions: [],
          dead_money: [],
          draft_assets: [],
          recent_ledger_entries: [],
          exception_usage_rows: [],
          apron_provenance_rows: [],
          two_way_capacity_row: nil,
          two_way_watchlist_rows: []
        }
      end

      {
        roster: queries.fetch_roster(team["team_code"]),
        team_salary_rows: queries.fetch_team_salary_rows(team["team_code"]),
        cap_holds: queries.fetch_cap_holds(team["team_code"]),
        exceptions: queries.fetch_exceptions(team["team_code"]),
        dead_money: queries.fetch_dead_money(team["team_code"]),
        draft_assets: queries.fetch_draft_assets(team["team_code"]),
        recent_ledger_entries: queries.fetch_recent_ledger_entries(team_id),
        exception_usage_rows: queries.fetch_exception_usage_rows(team_id),
        apron_provenance_rows: queries.fetch_apron_provenance_rows(team_id),
        two_way_capacity_row: queries.fetch_two_way_capacity_row(team_id: team_id, team_code: team["team_code"]),
        two_way_watchlist_rows: queries.fetch_two_way_watchlist_rows(team["team_code"])
      }
    end

    private

    attr_reader :queries, :team, :team_id, :index_salary_year

    def initial_team_salary_rows
      row = queries.fetch_team_salary_snapshot(team["team_code"], salary_year: index_salary_year)
      row ? [row] : []
    end
  end
end
