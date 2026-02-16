class SalaryBookController < ApplicationController
  CURRENT_SALARY_YEAR = 2025
  # Canonical year horizon for the salary book (keep in sync with SalaryBookHelper::SALARY_YEARS).
  SALARY_YEARS = (2025..2030).to_a.freeze
  AVAILABLE_VIEWS = %w[injuries salary-book tankathon].freeze
  DEFAULT_VIEW = "salary-book"

  delegate :fetch_team_index_rows,
    :build_team_maps,
    :fetch_team_players,
    :fetch_team_support_payload,
    :fetch_tankathon_payload,
    to: :queries

  # GET /salary-book
  def show
    assign_state!(workspace_state.build)
  rescue ActiveRecord::StatementInvalid => e
    assign_state!(workspace_state.fallback(error: e))
  end

  # GET /salary-book/frame?view=tankathon&team=BOS&year=2025
  # Patchable main frame used by view switches.
  def frame
    payload = frame_state.build
    render partial: payload.fetch(:partial), locals: payload.fetch(:locals), layout: false
  rescue ActiveRecord::StatementInvalid => e
    payload = frame_state.fallback(error: e)
    render partial: payload.fetch(:partial), locals: payload.fetch(:locals), layout: false
  end

  # GET /salary-book/sidebar/team?team=BOS
  # Base team sidebar shell (header + tabs + cap/stats payload).
  # Draft/Rights tabs are lazy-loaded via dedicated endpoints.
  def sidebar_team
    team_code = normalize_team_code(params[:team])
    year = salary_year_param

    render partial: "salary_book/sidebar_team", locals: team_sidebar_state.build(team_code:, year:), layout: false
  end

  # GET /salary-book/sidebar/team/cap?team=BOS&year=2026
  # Lightweight hover/year patch: only updates the Cap tab content.
  def sidebar_team_cap
    team_code = normalize_team_code(params[:team])
    year = salary_year_param

    render partial: "salary_book/sidebar_team_tab_cap", locals: team_sidebar_state.cap_tab(team_code:, year:), layout: false
  end

  # GET /salary-book/sidebar/team/draft?team=BOS&year=2025
  # Lazy-loaded Draft tab payload (future years only, starting after selected year).
  def sidebar_team_draft
    team_code = normalize_team_code(params[:team])
    year = salary_year_param

    render partial: "salary_book/sidebar_team_tab_draft", locals: team_sidebar_state.draft_tab(team_code:, year:), layout: false
  end

  # GET /salary-book/sidebar/team/rights?team=BOS
  # Lazy-loaded Rights tab payload.
  def sidebar_team_rights
    team_code = normalize_team_code(params[:team])

    render partial: "salary_book/sidebar_team_tab_rights", locals: team_sidebar_state.rights_tab(team_code:), layout: false
  end

  # GET /salary-book/sidebar/player/:id
  def sidebar_player
    player_id = Integer(params[:id])
    player = queries.fetch_player(player_id)
    raise ActiveRecord::RecordNotFound unless player

    render partial: "salary_book/sidebar_player", locals: { player: }, layout: false
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  # GET /salary-book/sidebar/clear
  def sidebar_clear
    render partial: "salary_book/sidebar_clear", layout: false
  end

  # GET /salary-book/combobox/players/search?team=BOS&q=jay&limit=12&seq=3
  # Returns server-rendered popup/list HTML for the Salary Book player combobox.
  def combobox_players_search
    locals = combobox_players_state.build
    render partial: "salary_book/combobox_players_popup", locals:, layout: false
  rescue ActiveRecord::StatementInvalid => e
    locals = combobox_players_state.fallback(error: e)
    render partial: "salary_book/combobox_players_popup", locals:, layout: false
  end

  # GET /salary-book/sidebar/agent/:id
  def sidebar_agent
    agent_id = Integer(params[:id])
    agent = queries.fetch_agent(agent_id)
    raise ActiveRecord::RecordNotFound unless agent

    clients = queries.fetch_agent_clients(agent_id)
    rollup = queries.fetch_agent_rollup(agent_id)

    render partial: "salary_book/sidebar_agent", locals: { agent:, clients:, rollup: }, layout: false
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  # GET /salary-book/sidebar/pick?team=BOS&year=2025&round=1
  def sidebar_pick
    render partial: "salary_book/sidebar_pick", locals: sidebar_pick_state.build, layout: false
  end

  private

  def assign_state!(state)
    state.each do |key, value|
      instance_variable_set("@#{key}", value)
    end
  end

  def salary_year_param
    raw = params[:year].presence
    return CURRENT_SALARY_YEAR unless raw

    year = Integer(raw)
    SALARY_YEARS.include?(year) ? year : CURRENT_SALARY_YEAR
  rescue ArgumentError, TypeError
    CURRENT_SALARY_YEAR
  end

  def salary_book_view_param
    raw = params[:view].to_s.strip.downcase
    AVAILABLE_VIEWS.include?(raw) ? raw : DEFAULT_VIEW
  end

  def valid_team_code?(raw)
    raw.to_s.strip.upcase.match?(/\A[A-Z]{3}\z/)
  end

  def normalize_team_code(raw)
    team = raw.to_s.strip.upcase
    raise ActiveRecord::RecordNotFound unless valid_team_code?(team)

    team
  end

  def workspace_state
    @workspace_state ||= ::SalaryBook::WorkspaceState.new(
      params: params,
      queries: queries,
      salary_years: SALARY_YEARS,
      current_salary_year: CURRENT_SALARY_YEAR,
      available_views: AVAILABLE_VIEWS,
      default_view: DEFAULT_VIEW,
      default_team_code: "POR"
    )
  end

  def frame_state
    @frame_state ||= ::SalaryBook::FrameState.new(
      params: params,
      queries: queries,
      salary_years: SALARY_YEARS,
      current_salary_year: CURRENT_SALARY_YEAR,
      available_views: AVAILABLE_VIEWS,
      default_view: DEFAULT_VIEW
    )
  end

  def team_sidebar_state
    @team_sidebar_state ||= ::SalaryBook::TeamSidebarState.new(queries: queries)
  end

  def combobox_players_state
    @combobox_players_state ||= ::SalaryBook::ComboboxPlayersState.new(params: params, queries: queries)
  end

  def sidebar_pick_state
    @sidebar_pick_state ||= ::SalaryBook::SidebarPickState.new(
      params: params,
      queries: queries,
      current_salary_year: CURRENT_SALARY_YEAR
    )
  end

  def queries
    @queries ||= ::SalaryBookQueries.new(
      connection: ActiveRecord::Base.connection,
      salary_years: SALARY_YEARS,
      current_salary_year: CURRENT_SALARY_YEAR
    )
  end
end
