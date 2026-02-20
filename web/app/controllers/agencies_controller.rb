class AgenciesController < ApplicationController
  BOOK_YEARS = [2025, 2026, 2027].freeze
  ACTIVITY_LENSES = %w[all active inactive inactive_live_book live_book_risk].freeze
  SORT_KEYS = %w[book agents clients max expirings restr options two_ways name].freeze
  AGENT_LENS_SORT_KEYS = %w[book clients teams max expirings options name].freeze
  SHOW_COHORT_FILTERS = %w[max expiring restricted option_heavy].freeze

  helper_method :agents_lens_pivot_href, :agents_lens_pivot_sort_key, :agents_posture_lane_pivot_href

  # GET /agencies
  def index
    load_index_workspace_state!
    render :index
  end

  # GET /agencies/pane
  # Datastar patch target for main canvas only.
  def pane
    load_index_workspace_state!
    render partial: "agencies/workspace_main"
  end

  # GET /agencies/sidebar/base
  def sidebar_base
    load_index_workspace_state!
    render partial: "agencies/rightpanel_base"
  end

  # GET /agencies/sidebar/:id
  def sidebar
    setup_sidebar_pivot_state!

    agency_id = Integer(params[:id])
    render partial: "agencies/rightpanel_overlay_agency", locals: load_sidebar_agency_payload(agency_id)
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  # GET /agencies/sidebar/clear
  def sidebar_clear
    render partial: "agencies/rightpanel_clear"
  end

  # GET /agencies/:slug
  # Canonical route.
  def show
    slug = params[:slug].to_s.strip.downcase
    raise ActiveRecord::RecordNotFound if slug.blank?

    record = Slug.find_by!(entity_type: "agency", slug: slug)

    canonical = Slug.find_by(entity_type: "agency", entity_id: record.entity_id, canonical: true)
    if canonical && canonical.slug != record.slug
      redirect_to agency_path(canonical.slug, **request.query_parameters), status: :moved_permanently
      return
    end

    @agency_id = record.entity_id
    @agency_slug = record.slug
    load_show_cohort_filters!

    state = ::Agencies::ShowWorkspaceData.new(
      queries: queries,
      agency_id: @agency_id
    ).build
    state.each { |key, value| instance_variable_set("@#{key}", value) }

    render :show
  end

  # GET /agencies/:id (numeric fallback)
  def redirect
    id = Integer(params[:id])

    canonical = Slug.find_by(entity_type: "agency", entity_id: id, canonical: true)
    if canonical
      redirect_to agency_path(canonical.slug), status: :moved_permanently
      return
    end

    row = queries.fetch_agency_name_for_redirect(id)
    raise ActiveRecord::RecordNotFound unless row

    base = row["agency_name"].to_s.parameterize
    base = "agency-#{id}" if base.blank?

    slug = base
    i = 2
    while Slug.reserved_slug?(slug) || Slug.exists?(entity_type: "agency", slug: slug)
      slug = "#{base}-#{i}"
      i += 1
    end

    Slug.create!(entity_type: "agency", entity_id: id, slug: slug, canonical: true)

    redirect_to agency_path(slug), status: :moved_permanently
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  def agents_lens_pivot_href(agency_id, active_only: false, with_book: false, with_restrictions: false, with_expiring: false, with_clients: false)
    agency_id = agency_id.to_i
    agency_id = nil unless agency_id.positive?

    query = {
      kind: "agents",
      year: agents_lens_pivot_year,
      sort: agents_lens_pivot_sort_key,
      dir: agents_lens_pivot_sort_dir,
      agency_scope: 1,
      agency_scope_id: agency_id,
      active_only: (active_only ? 1 : nil),
      with_book: (with_book ? 1 : nil),
      with_restrictions: (with_restrictions ? 1 : nil),
      with_expiring: (with_expiring ? 1 : nil),
      with_clients: (with_clients ? 1 : nil)
    }.compact

    "/agents?#{query.to_query}"
  end

  def agents_posture_lane_pivot_href(agency_id, lane:)
    case lane.to_s
    when "active"
      agents_lens_pivot_href(agency_id, active_only: true)
    when "inactive_live_book"
      agents_lens_pivot_href(agency_id, with_book: true)
    when "live_book_risk"
      agents_lens_pivot_href(agency_id, with_book: true, with_restrictions: true)
    when "restricted"
      agents_lens_pivot_href(agency_id, with_restrictions: true)
    else
      agents_lens_pivot_href(agency_id)
    end
  end

  def agents_lens_pivot_sort_key
    sort_key = @sort_key.to_s
    AGENT_LENS_SORT_KEYS.include?(sort_key) ? sort_key : "book"
  end

  private

  def queries
    @queries ||= ::AgencyQueries.new(connection: ActiveRecord::Base.connection)
  end

  def load_show_cohort_filters!
    @show_cohort_filters = normalize_show_cohort_filters(params[:cohorts])
  end

  def normalize_show_cohort_filters(raw_filters)
    tokens = Array(raw_filters)
    tokens = [raw_filters] if tokens.empty?

    tokens
      .flat_map { |value| value.to_s.split(",") }
      .map { |value| value.to_s.strip.downcase.tr("-", "_") }
      .reject(&:blank?)
      .select { |value| SHOW_COHORT_FILTERS.include?(value) }
      .uniq
  end

  def load_index_workspace_state!
    state = ::Agencies::IndexWorkspaceState.new(
      params: params,
      queries: queries,
      book_years: BOOK_YEARS,
      activity_lenses: ACTIVITY_LENSES,
      sort_keys: SORT_KEYS
    ).build

    state.each do |key, value|
      instance_variable_set("@#{key}", value)
    end
  end

  def setup_sidebar_pivot_state!
    year = begin
      Integer(params[:year])
    rescue ArgumentError, TypeError
      nil
    end
    @book_year = BOOK_YEARS.include?(year) ? year : BOOK_YEARS.first

    requested_sort = params[:sort].to_s.strip
    @sort_key = SORT_KEYS.include?(requested_sort) ? requested_sort : "book"

    @sort_dir = params[:dir].to_s == "asc" ? "asc" : "desc"
  end

  def agents_lens_pivot_year
    year = @book_year.to_i
    BOOK_YEARS.include?(year) ? year : BOOK_YEARS.first
  end

  def agents_lens_pivot_sort_dir
    @sort_dir.to_s == "asc" ? "asc" : "desc"
  end

  def selected_overlay_visible?(overlay_id:)
    normalized_id = overlay_id.to_i
    return false if normalized_id <= 0

    @agencies.any? { |row| row["agency_id"].to_i == normalized_id }
  end

  def load_sidebar_agency_payload(agency_id)
    agency = queries.fetch_sidebar_agency(agency_id)
    raise ActiveRecord::RecordNotFound unless agency

    top_agents = queries.fetch_sidebar_top_agents(agency_id)
    top_clients = queries.fetch_sidebar_top_clients(agency_id)

    {
      agency:,
      top_agents:,
      top_clients:
    }
  end
end
