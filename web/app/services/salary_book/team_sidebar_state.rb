module SalaryBook
  class TeamSidebarState
    def initialize(queries:)
      @queries = queries
    end

    def build(team_code:, year:)
      summaries_by_year = fetch_summaries_by_year(team_code)

      {
        team_code: team_code,
        summary: summaries_by_year[year] || {},
        team_meta: queries.fetch_team_meta(team_code),
        summaries_by_year: summaries_by_year,
        year: year
      }
    end

    def cap_tab(team_code:, year:)
      summaries_by_year = fetch_summaries_by_year(team_code)

      {
        summary: summaries_by_year[year] || {},
        summaries_by_year: summaries_by_year,
        year: year
      }
    end

    def draft_tab(team_code:, year:)
      draft_start_year = year + 1

      {
        team_code: team_code,
        year: year,
        draft_start_year: draft_start_year,
        draft_assets: queries.fetch_sidebar_draft_assets(team_code, start_year: draft_start_year),
        draft_loaded: true
      }
    end

    def rights_tab(team_code:)
      {
        rights_by_kind: queries.fetch_sidebar_rights_by_kind(team_code),
        rights_loaded: true
      }
    end

    private

    attr_reader :queries

    def fetch_summaries_by_year(team_code)
      queries.fetch_all_team_summaries([team_code])[team_code] || {}
    end
  end
end
