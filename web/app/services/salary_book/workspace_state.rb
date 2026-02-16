module SalaryBook
  class WorkspaceState
    def initialize(
      params:,
      queries:,
      salary_years:,
      current_salary_year:,
      available_views:,
      default_view:,
      default_team_code:
    )
      @params = params
      @queries = queries
      @salary_years = salary_years
      @current_salary_year = current_salary_year
      @available_views = available_views
      @default_view = default_view
      @default_team_code = default_team_code
    end

    def build
      salary_year = resolve_salary_year(params[:year])
      initial_view = resolve_view(params[:view])

      team_rows = queries.fetch_team_index_rows(salary_year)
      team_codes = team_rows.map { |row| row["team_code"] }.compact
      teams_by_conference, team_meta_by_code = queries.build_team_maps(team_rows)

      initial_team = resolve_initial_team(requested: params[:team], team_codes: team_codes)
      initial_team_meta = initial_team.present? ? (team_meta_by_code[initial_team] || {}) : {}

      state = build_base_state(
        boot_error: nil,
        salary_year: salary_year,
        initial_view: initial_view,
        team_codes: team_codes,
        teams_by_conference: teams_by_conference,
        team_meta_by_code: team_meta_by_code,
        initial_team: initial_team,
        initial_team_meta: initial_team_meta
      )

      hydrate_initial_team_payload!(state) if initial_team.present?
      hydrate_tankathon_payload!(state) if initial_view == "tankathon"

      state
    end

    def fallback(error:)
      salary_year = resolve_salary_year(params[:year])
      initial_view = resolve_view(params[:view])

      build_base_state(
        boot_error: error.to_s,
        salary_year: salary_year,
        initial_view: initial_view,
        team_codes: [],
        teams_by_conference: empty_teams_by_conference,
        team_meta_by_code: {},
        initial_team: nil,
        initial_team_meta: {}
      )
    end

    private

    attr_reader :params, :queries, :salary_years, :current_salary_year, :available_views, :default_view, :default_team_code

    def resolve_salary_year(raw)
      year = Integer(raw)
      salary_years.include?(year) ? year : current_salary_year
    rescue ArgumentError, TypeError
      current_salary_year
    end

    def resolve_view(raw)
      view = raw.to_s.strip.downcase
      available_views.include?(view) ? view : default_view
    end

    def valid_team_code?(raw)
      raw.to_s.strip.upcase.match?(/\A[A-Z]{3}\z/)
    end

    def resolve_initial_team(requested:, team_codes:)
      requested_code = requested.to_s.strip.upcase

      if requested_code.present? && valid_team_code?(requested_code)
        requested_code
      elsif team_codes.include?(default_team_code)
        default_team_code
      else
        team_codes.first
      end
    end

    def empty_teams_by_conference
      {
        "Eastern" => [],
        "Western" => []
      }
    end

    def build_base_state(
      boot_error:,
      salary_year:,
      initial_view:,
      team_codes:,
      teams_by_conference:,
      team_meta_by_code:,
      initial_team:,
      initial_team_meta:
    )
      {
        boot_error: boot_error,
        salary_year: salary_year,
        salary_years: salary_years,
        initial_view: initial_view,
        team_codes: team_codes,
        teams_by_conference: teams_by_conference,
        team_meta_by_code: team_meta_by_code,
        initial_team: initial_team,
        initial_team_meta: initial_team_meta,
        initial_team_summary: nil,
        initial_team_summaries_by_year: {},
        initial_players: [],
        initial_cap_holds: [],
        initial_exceptions: [],
        initial_dead_money: [],
        initial_picks: [],
        initial_tankathon_rows: [],
        initial_tankathon_standing_date: nil,
        initial_tankathon_season_year: nil,
        initial_tankathon_season_label: nil
      }
    end

    def hydrate_initial_team_payload!(state)
      initial_team = state.fetch(:initial_team)
      salary_year = state.fetch(:salary_year)

      state[:initial_players] = queries.fetch_team_players(initial_team)

      payload = queries.fetch_team_support_payload(initial_team, base_year: salary_year)
      state[:initial_cap_holds] = payload[:cap_holds]
      state[:initial_exceptions] = payload[:exceptions]
      state[:initial_dead_money] = payload[:dead_money]
      state[:initial_picks] = payload[:picks]
      state[:initial_team_summaries_by_year] = payload[:team_summaries]
      state[:initial_team_meta] = payload[:team_meta].presence || state.fetch(:initial_team_meta)
      state[:initial_team_summary] = state[:initial_team_summaries_by_year][salary_year] || state[:initial_team_summaries_by_year][salary_years.first]
    end

    def hydrate_tankathon_payload!(state)
      tankathon_payload = queries.fetch_tankathon_payload(state.fetch(:salary_year))
      state[:initial_tankathon_rows] = tankathon_payload[:rows]
      state[:initial_tankathon_standing_date] = tankathon_payload[:standing_date]
      state[:initial_tankathon_season_year] = tankathon_payload[:season_year]
      state[:initial_tankathon_season_label] = tankathon_payload[:season_label]
    end
  end
end
