module Entities
  class PlayersController < ApplicationController
    INDEX_CAP_HORIZONS = [2025, 2026, 2027].freeze

    PLAYER_STATUS_LENSES = %w[all two_way restricted no_trade].freeze
    PLAYER_CONSTRAINT_LENSES = %w[all lock_now options non_guaranteed trade_kicker expiring].freeze
    PLAYER_URGENCY_LENSES = %w[all urgent upcoming stable].freeze
    PLAYER_URGENCY_SUB_LENSES = %w[all option_only expiring_only non_guaranteed_only].freeze
    PLAYER_SORT_LENSES = %w[cap_desc cap_asc name_asc name_desc].freeze
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
      render partial: "entities/players/workspace_main"
    end

    # GET /players/sidebar/:id
    def sidebar
      player_id = Integer(params[:id])
      player = load_sidebar_player_payload(player_id)

      render partial: "entities/players/rightpanel_overlay_player", locals: { player: player }
    rescue ArgumentError
      raise ActiveRecord::RecordNotFound
    end

    # GET /players/sidebar/clear
    def sidebar_clear
      render partial: "entities/players/rightpanel_clear"
    end

    # GET /players/:slug
    # Canonical route.
    def show
      @defer_heavy_load = params[:full].to_s != "1"
      load_player_decision_lens!

      resolve_player_from_slug!(params[:slug])
      return if performed?

      if @defer_heavy_load
        load_player_header_snapshot!
        seed_empty_player_workspace!
      else
        load_player_workspace_data!
      end

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
      @queries ||= PlayerQueries.new(connection: ActiveRecord::Base.connection)
    end

    def load_index_workspace_state!(apply_compare_action: false)
      state = Players::IndexWorkspaceState.new(
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
    end

    def load_player_decision_lens!
      requested_lens = params[:decision_lens].to_s.strip.downcase
      @decision_lens = PLAYER_DECISION_LENSES.include?(requested_lens) ? requested_lens : "all"
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

    def load_player_header_snapshot!
      @player = queries.fetch_player_header(@player_id)
      raise ActiveRecord::RecordNotFound unless @player

      # Salary-book context (team + agent + contract flags) to enable link graph pivots.
      @salary_book_row = queries.fetch_salary_book_row(@player_id)

      # Draft selection (historical) — player → draft → team link.
      @draft_selection = queries.fetch_draft_selection(@player_id)
    end

    def seed_empty_player_workspace!
      @team_history_rows = []
      @salary_book_yearly_rows = []
      @contract_chronology_rows = []
      @contract_version_rows = []
      @salary_rows = []
      @protection_rows = []
      @protection_condition_rows = []
      @bonus_rows = []
      @bonus_max_rows = []
      @payment_schedule_rows = []
      @ledger_entries = []
    end

    def load_player_workspace_data!
      load_player_header_snapshot!

      @team_history_rows = queries.fetch_team_history(@player_id)
      @salary_book_yearly_rows = queries.fetch_salary_book_yearly(@player_id)
      @contract_chronology_rows = queries.fetch_contract_chronology(@player_id)
      @contract_version_rows = queries.fetch_contract_versions(@player_id)

      @salary_rows = []
      @protection_rows = []
      @protection_condition_rows = []
      @bonus_rows = []
      @bonus_max_rows = []
      @payment_schedule_rows = []

      if @salary_book_row.present? && @salary_book_row["contract_id"].present? && @salary_book_row["version_number"].present?
        contract_id = @salary_book_row["contract_id"]
        version_number = @salary_book_row["version_number"]

        @salary_rows = queries.fetch_salaries(contract_id:, version_number:)
        @protection_rows = queries.fetch_protections(contract_id:, version_number:)
        @protection_condition_rows = queries.fetch_protection_conditions(contract_id:, version_number:)
        @bonus_rows = queries.fetch_bonuses(contract_id:, version_number:)
        @bonus_max_rows = queries.fetch_bonus_maximums(contract_id:, version_number:)
        @payment_schedule_rows = queries.fetch_payment_schedules(contract_id:, version_number:)
      end

      @ledger_entries = queries.fetch_ledger_entries(@player_id)
    end
  end
end
