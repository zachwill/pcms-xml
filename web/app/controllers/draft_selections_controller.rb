class DraftSelectionsController < ApplicationController
  INDEX_ROUNDS = %w[all 1 2].freeze
  INDEX_SORTS = %w[provenance board trade].freeze
  INDEX_LENSES = %w[all with_trade deep_chain].freeze

  # GET /draft-selections
  def index
    load_index_workspace_state!
    hydrate_initial_overlay_from_params!
    render :index
  end

  # GET /draft-selections/pane
  def pane
    load_index_workspace_state!
    render partial: "draft_selections/workspace_main"
  end

  # GET /draft-selections/sidebar/base
  def sidebar_base
    load_index_workspace_state!
    render partial: "draft_selections/rightpanel_base"
  end

  # GET /draft-selections/sidebar/:id
  def sidebar
    transaction_id = Integer(params[:id])
    raise ActiveRecord::RecordNotFound if transaction_id <= 0

    render partial: "draft_selections/rightpanel_overlay_selection", locals: load_sidebar_selection_payload(transaction_id)
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  # GET /draft-selections/sidebar/clear
  def sidebar_clear
    render partial: "draft_selections/rightpanel_clear"
  end

  # GET /draft-selections/:slug
  def show
    slug = params[:slug].to_s.strip.downcase
    raise ActiveRecord::RecordNotFound if slug.blank?

    record = Slug.find_by!(entity_type: "draft_selection", slug: slug)

    canonical = Slug.find_by(entity_type: "draft_selection", entity_id: record.entity_id, canonical: true)
    if canonical && canonical.slug != record.slug
      redirect_to draft_selection_path(canonical.slug), status: :moved_permanently
      return
    end

    @draft_selection_id = record.entity_id
    @draft_selection_slug = record.slug

    conn = ActiveRecord::Base.connection
    id_sql = conn.quote(@draft_selection_id)

    @draft_selection = conn.exec_query(<<~SQL).first
      SELECT
        ds.transaction_id,
        ds.draft_year,
        ds.draft_round,
        ds.pick_number,
        ds.player_id,
        ds.drafting_team_id,
        ds.drafting_team_code,
        ds.draft_amount,
        ds.transaction_date,
        tx.trade_id,
        tx.transaction_type_lk,
        tx.transaction_description_lk,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
          ''
        ) AS player_name,
        t.team_name
      FROM pcms.draft_selections ds
      LEFT JOIN pcms.transactions tx ON tx.transaction_id = ds.transaction_id
      LEFT JOIN pcms.people p ON p.person_id = ds.player_id
      LEFT JOIN pcms.teams t ON t.team_id = ds.drafting_team_id
      WHERE ds.transaction_id = #{id_sql}
      LIMIT 1
    SQL
    raise ActiveRecord::RecordNotFound unless @draft_selection

    player_sql = conn.quote(@draft_selection["player_id"])
    @current_team = conn.exec_query(<<~SQL).first
      SELECT
        sbw.team_code,
        t.team_id,
        t.team_name
      FROM pcms.salary_book_warehouse sbw
      LEFT JOIN pcms.teams t
        ON t.team_code = sbw.team_code
       AND t.league_lk = 'NBA'
      WHERE sbw.player_id = #{player_sql}
      LIMIT 1
    SQL

    year_sql = conn.quote(@draft_selection["draft_year"])
    round_sql = conn.quote(@draft_selection["draft_round"])
    drafting_code_sql = conn.quote(@draft_selection["drafting_team_code"])

    @pick_provenance_rows = conn.exec_query(<<~SQL).to_a
      SELECT
        dpt.id,
        dpt.trade_id,
        tr.trade_date,
        dpt.draft_year,
        dpt.draft_round,
        dpt.from_team_id,
        dpt.from_team_code,
        dpt.to_team_id,
        dpt.to_team_code,
        dpt.original_team_id,
        dpt.original_team_code,
        dpt.is_swap,
        dpt.is_future,
        dpt.is_conditional,
        dpt.conditional_type_lk,
        dpt.is_draft_year_plus_two
      FROM pcms.draft_pick_trades dpt
      LEFT JOIN pcms.trades tr
        ON tr.trade_id = dpt.trade_id
      WHERE dpt.draft_year = #{year_sql}
        AND dpt.draft_round = #{round_sql}
        AND (
          dpt.original_team_code = #{drafting_code_sql}
          OR dpt.from_team_code = #{drafting_code_sql}
          OR dpt.to_team_code = #{drafting_code_sql}
        )
      ORDER BY tr.trade_date NULLS LAST, dpt.id
      LIMIT 120
    SQL

    render :show
  end

  # GET /draft-selections/:id (numeric fallback)
  def redirect
    id = Integer(params[:id])

    canonical = Slug.find_by(entity_type: "draft_selection", entity_id: id, canonical: true)
    if canonical
      redirect_to draft_selection_path(canonical.slug), status: :moved_permanently
      return
    end

    conn = ActiveRecord::Base.connection
    id_sql = conn.quote(id)

    row = conn.exec_query(<<~SQL).first
      SELECT
        ds.draft_year,
        ds.draft_round,
        ds.pick_number,
        ds.player_id,
        COALESCE(
          NULLIF(TRIM(CONCAT_WS(' ', p.display_first_name, p.display_last_name)), ''),
          NULLIF(TRIM(CONCAT_WS(' ', p.first_name, p.last_name)), ''),
          ''
        ) AS player_name
      FROM pcms.draft_selections ds
      LEFT JOIN pcms.people p ON p.person_id = ds.player_id
      WHERE ds.transaction_id = #{id_sql}
      LIMIT 1
    SQL
    raise ActiveRecord::RecordNotFound unless row

    parts = [
      "draft",
      row["draft_year"],
      "r#{row['draft_round']}",
      "p#{row['pick_number']}",
      row["player_name"].to_s.parameterize.presence,
    ].compact

    base = parts.join("-")
    base = "draft-selection-#{id}" if base.blank?

    slug = base
    i = 2
    while Slug.reserved_slug?(slug) || Slug.exists?(entity_type: "draft_selection", slug: slug)
      slug = "#{base}-#{i}"
      i += 1
    end

    Slug.create!(entity_type: "draft_selection", entity_id: id, slug: slug, canonical: true)

    redirect_to draft_selection_path(slug), status: :moved_permanently
  rescue ArgumentError
    raise ActiveRecord::RecordNotFound
  end

  private

  def load_index_workspace_state!
    state = ::DraftSelections::IndexWorkspaceState.new(
      params: params,
      index_rounds: INDEX_ROUNDS,
      index_sorts: INDEX_SORTS,
      index_lenses: INDEX_LENSES
    ).build

    state.each do |key, value|
      instance_variable_set("@#{key}", value)
    end
  end

  def hydrate_initial_overlay_from_params!
    @initial_overlay_type = "none"
    @initial_overlay_id = ""
    @initial_overlay_partial = nil
    @initial_overlay_locals = {}

    requested_overlay_id = requested_overlay_id_param
    return if requested_overlay_id.blank?
    return unless selected_overlay_visible?(overlay_id: requested_overlay_id)

    @initial_overlay_partial = "draft_selections/rightpanel_overlay_selection"
    @initial_overlay_locals = load_sidebar_selection_payload(requested_overlay_id)
    @initial_overlay_type = "selection"
    @initial_overlay_id = requested_overlay_id.to_s
  rescue ActiveRecord::RecordNotFound
    @initial_overlay_type = "none"
    @initial_overlay_id = ""
    @initial_overlay_partial = nil
    @initial_overlay_locals = {}
  end

  def requested_overlay_id_param
    overlay_id = Integer(params[:selected_id], 10)
    overlay_id.positive? ? overlay_id : nil
  rescue ArgumentError, TypeError
    nil
  end

  def load_sidebar_selection_payload(transaction_id)
    conn = ActiveRecord::Base.connection
    tx_sql = conn.quote(transaction_id)

    selection = conn.exec_query(<<~SQL).first
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
        tx.transaction_description_lk
      FROM pcms.draft_selections ds
      LEFT JOIN pcms.transactions tx
        ON tx.transaction_id = ds.transaction_id
      LEFT JOIN pcms.people p
        ON p.person_id = ds.player_id
      LEFT JOIN pcms.teams t
        ON t.team_code = ds.drafting_team_code
       AND t.league_lk = 'NBA'
      WHERE ds.transaction_id = #{tx_sql}
      LIMIT 1
    SQL
    raise ActiveRecord::RecordNotFound unless selection

    current_team = nil
    if selection["player_id"].present?
      player_sql = conn.quote(selection["player_id"])
      current_team = conn.exec_query(<<~SQL).first
        SELECT
          sbw.team_code,
          t.team_id,
          t.team_name
        FROM pcms.salary_book_warehouse sbw
        LEFT JOIN pcms.teams t
          ON t.team_code = sbw.team_code
         AND t.league_lk = 'NBA'
        WHERE sbw.player_id = #{player_sql}
        LIMIT 1
      SQL
    end

    year_sql = conn.quote(selection["draft_year"])
    round_sql = conn.quote(selection["draft_round"])
    team_sql = conn.quote(selection["drafting_team_code"])

    provenance_rows = conn.exec_query(<<~SQL).to_a
      SELECT
        dpt.id,
        dpt.trade_id,
        tr.trade_date,
        dpt.from_team_code,
        dpt.to_team_code,
        dpt.original_team_code,
        dpt.is_swap,
        dpt.is_future,
        dpt.is_conditional,
        dpt.conditional_type_lk
      FROM pcms.draft_pick_trades dpt
      LEFT JOIN pcms.trades tr
        ON tr.trade_id = dpt.trade_id
      WHERE dpt.draft_year = #{year_sql}
        AND dpt.draft_round = #{round_sql}
        AND (
          dpt.original_team_code = #{team_sql}
          OR dpt.from_team_code = #{team_sql}
          OR dpt.to_team_code = #{team_sql}
        )
      ORDER BY tr.trade_date NULLS LAST, dpt.id
      LIMIT 120
    SQL

    {
      selection: selection,
      current_team: current_team,
      provenance_rows: provenance_rows
    }
  end

  def selected_overlay_visible?(overlay_id:)
    normalized_id = overlay_id.to_i
    return false if normalized_id <= 0

    @results.any? { |row| row["transaction_id"].to_i == normalized_id }
  end
end
