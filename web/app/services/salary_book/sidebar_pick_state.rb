module SalaryBook
  class SidebarPickState
    def initialize(params:, queries:, current_salary_year:)
      @params = params
      @queries = queries
      @current_salary_year = current_salary_year
    end

    def build
      team_code = resolve_required_team_code(params[:team])
      year = Integer(params[:year])
      round = Integer(params[:round])
      salary_year = parse_salary_year_param(params[:salary_year])

      picks = queries.fetch_pick_assets(team_code, year, round)
      raise ActiveRecord::RecordNotFound if picks.empty?

      team_meta = queries.fetch_team_meta(team_code)

      related_team_codes = queries.extract_pick_related_team_codes(picks)
      related_team_codes << team_code

      {
        team_code: team_code,
        year: year,
        round: round,
        salary_year: salary_year,
        picks: picks,
        team_meta: team_meta,
        team_meta_by_code: queries.fetch_team_meta_by_codes(related_team_codes)
      }
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    private

    attr_reader :params, :queries, :current_salary_year

    def normalize_team_code(raw)
      code = raw.to_s.strip.upcase
      return nil unless code.match?(/\A[A-Z]{3}\z/)

      code
    end

    def resolve_required_team_code(raw)
      code = normalize_team_code(raw)
      raise ActiveRecord::RecordNotFound unless code.present?

      code
    end

    def parse_salary_year_param(raw)
      Integer(raw)
    rescue ArgumentError, TypeError
      current_salary_year
    end
  end
end
