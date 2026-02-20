class PlayersController < ApplicationController
  INDEX_CAP_HORIZONS = [2025, 2026, 2027].freeze

  PLAYER_STATUS_LENSES = %w[all two_way restricted no_trade].freeze
  PLAYER_STATUS_LENS_LABELS = {
    "all" => "All statuses",
    "two_way" => "Two-Way",
    "restricted" => "Trade restricted",
    "no_trade" => "No-trade"
  }.freeze

  PLAYER_CONSTRAINT_LENSES = %w[all lock_now options non_guaranteed trade_kicker expiring].freeze
  PLAYER_CONSTRAINT_LENS_LABELS = {
    "all" => "All commitments",
    "lock_now" => "Lock now",
    "options" => "Options ahead",
    "non_guaranteed" => "Non-guaranteed",
    "trade_kicker" => "Trade kicker",
    "expiring" => "Expiring after horizon"
  }.freeze

  PLAYER_URGENCY_LENSES = %w[all urgent upcoming stable].freeze
  PLAYER_URGENCY_SUB_LENSES = %w[all option_only expiring_only non_guaranteed_only].freeze
  PLAYER_URGENCY_SUB_LENS_LABELS = {
    "all" => "All triggers",
    "option_only" => "Option-only",
    "expiring_only" => "Expiring-only",
    "non_guaranteed_only" => "Non-guaranteed-only"
  }.freeze

  PLAYER_SORT_LENSES = %w[cap_desc cap_asc name_asc name_desc].freeze
  PLAYER_SORT_LENS_LABELS = {
    "cap_desc" => "Cap ↓",
    "cap_asc" => "Cap ↑",
    "name_asc" => "Name A→Z",
    "name_desc" => "Name Z→A"
  }.freeze

  PLAYER_DECISION_LENSES = %w[all urgent upcoming later].freeze

  PLAYER_URGENCY_DEFINITIONS = {
    "urgent" => {
      title: "Urgent decisions",
      subtitle: "Lock-now posture or immediate horizon triggers"
    },
    "upcoming" => {
      title: "Upcoming pressure",
      subtitle: "Future options/guarantees or pathway pressure"
    },
    "stable" => {
      title: "Stable commitments",
      subtitle: "No immediate option/expiry pressure"
    }
  }.freeze

  PLAYER_URGENCY_ORDER = %w[urgent upcoming stable].freeze

  # GET /players
  def index
    load_index_workspace_state!
    render :index
  end

  # GET /players/pane
  def pane
    load_index_workspace_state!
    render partial: "players/workspace_main"
  end

  # GET /players/sidebar/:id
  def sidebar
    player_id = Integer(params[:id])
    player = load_sidebar_player_payload(player_id)

    render partial: "players/rightpanel_overlay_player", locals: { player: player }
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  # GET /players/sidebar/clear
  def sidebar_clear
    render partial: "players/rightpanel_clear"
  end

  # GET /players/:slug
  # Canonical route.
  def show
    @defer_heavy_load = params[:full].to_s != "1"
    load_player_decision_lens!

    resolve_player_from_slug!(params[:slug])
    return if performed?

    load_player_show_workspace_data!

    render :show
  end

  # GET /players/:id (numeric fallback)
  def redirect
    id = Integer(params[:id])

    canonical = Slug.find_by(entity_type: "player", entity_id: id, canonical: true)
    if canonical
      redirect_to player_path(canonical.slug), status: :moved_permanently
      return
    end

    # Create a default canonical slug on-demand, using PCMS name.
    row = queries.fetch_player_name_for_slug_seed(id)

    raise ActiveRecord::RecordNotFound unless row

    base = [row["first_name"], row["last_name"]].compact.join(" ").parameterize
    base = "player-#{id}" if base.blank?

    slug = base
    i = 2
    while Slug.reserved_slug?(slug) || Slug.exists?(entity_type: "player", slug: slug)
      slug = "#{base}-#{i}"
      i += 1
    end

    Slug.create!(entity_type: "player", entity_id: id, slug: slug, canonical: true)

    redirect_to player_path(slug), status: :moved_permanently
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  private

  def queries
    @queries ||= ::PlayerQueries.new(connection: ActiveRecord::Base.connection)
  end

  def load_index_workspace_state!(apply_compare_action: false)
    state = ::Players::IndexWorkspaceState.new(
      params: params,
      queries: queries,
      index_cap_horizons: INDEX_CAP_HORIZONS,
      status_lenses: PLAYER_STATUS_LENSES,
      constraint_lenses: PLAYER_CONSTRAINT_LENSES,
      urgency_lenses: PLAYER_URGENCY_LENSES,
      urgency_sub_lenses: PLAYER_URGENCY_SUB_LENSES,
      sort_lenses: PLAYER_SORT_LENSES,
      urgency_definitions: PLAYER_URGENCY_DEFINITIONS,
      urgency_order: PLAYER_URGENCY_ORDER
    ).build(apply_compare_action: apply_compare_action)

    state.each do |key, value|
      instance_variable_set("@#{key}", value)
    end

    build_index_triage_sequence!
  end

  def load_player_decision_lens!
    requested_lens = params[:decision_lens].to_s.strip.downcase
    @decision_lens = PLAYER_DECISION_LENSES.include?(requested_lens) ? requested_lens : "all"
  end

  def build_index_triage_sequence!
    @team_lens_label = team_lens_label_for(@team_lens)
    @status_lens_label = PLAYER_STATUS_LENS_LABELS.fetch(@status_lens.to_s, PLAYER_STATUS_LENS_LABELS.fetch("all"))
    @constraint_lens_label = PLAYER_CONSTRAINT_LENS_LABELS.fetch(@constraint_lens.to_s, PLAYER_CONSTRAINT_LENS_LABELS.fetch("all"))
    @urgency_lens_label = urgency_lens_label_for(@urgency_lens)
    @urgency_sub_lens_label = PLAYER_URGENCY_SUB_LENS_LABELS.fetch(@urgency_sub_lens.to_s, PLAYER_URGENCY_SUB_LENS_LABELS.fetch("all"))
    @sort_lens_label = PLAYER_SORT_LENS_LABELS.fetch(@sort_lens.to_s, PLAYER_SORT_LENS_LABELS.fetch("cap_desc"))

    @scope_sequence_label = "#{@team_lens_label} · #{@status_lens_label} · Cap #{helpers.format_year_label(@cap_horizon)}"

    urgency_tokens = [@urgency_lens_label]
    urgency_tokens << "Focus #{@urgency_sub_lens_label}" if @urgency_sub_lens.to_s != "all"
    urgency_tokens << @constraint_lens_label if @constraint_lens.to_s != "all"
    @urgency_sequence_label = urgency_tokens.join(" · ")

    @drill_in_sequence_label = "Sort #{@sort_lens_label}"
  end

  def team_lens_label_for(team_lens)
    return "All teams" if team_lens.to_s == "ALL"
    return "Free agents" if team_lens.to_s == "FA"

    team = Array(@team_options).find { |row| row["team_code"].to_s.upcase == team_lens.to_s.upcase }
    return team_lens.to_s if team.blank?

    "#{team['team_code']} · #{team['team_name']}"
  end

  def urgency_lens_label_for(urgency_lens)
    return "All urgency lanes" if urgency_lens.to_s == "all"

    PLAYER_URGENCY_DEFINITIONS.dig(urgency_lens.to_s, :title) || PLAYER_URGENCY_DEFINITIONS.dig("stable", :title)
  end

  def selected_overlay_visible?(overlay_id:)
    normalized_id = overlay_id.to_i
    return false if normalized_id <= 0

    Array(@players).any? { |row| row["player_id"].to_i == normalized_id }
  end

  def load_sidebar_player_payload(player_id)
    normalized_id = Integer(player_id)
    raise ActiveRecord::RecordNotFound if normalized_id <= 0

    player = queries.fetch_sidebar_player(normalized_id)
    raise ActiveRecord::RecordNotFound unless player

    player
  end

  def resolve_player_from_slug!(raw_slug, redirect_on_canonical_miss: true)
    slug = raw_slug.to_s.strip.downcase
    raise ActiveRecord::RecordNotFound if slug.empty?

    record = Slug.find_by!(entity_type: "player", slug: slug)

    canonical = Slug.find_by(entity_type: "player", entity_id: record.entity_id, canonical: true)
    if canonical && canonical.slug != record.slug
      if redirect_on_canonical_miss
        redirect_to player_path(canonical.slug), status: :moved_permanently
        return
      end

      record = canonical
    end

    @player_id = record.entity_id
    @player_slug = record.slug
  end

  def load_player_show_workspace_data!
    state = ::Players::ShowWorkspaceData.new(
      queries: queries,
      player_id: @player_id
    ).build(defer_heavy_load: @defer_heavy_load)

    state.each do |key, value|
      instance_variable_set("@#{key}", value)
    end
  end
end
