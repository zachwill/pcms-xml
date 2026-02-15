module Tools
  class SystemValuesController < ApplicationController
    include Datastar

    CURRENT_SALARY_YEAR = 2025
    DEFAULT_WINDOW_YEARS = 2
    DEFAULT_BASELINE_OFFSET_YEARS = 1

    SECTION_VISIBILITY_PARAM_DEFINITIONS = {
      showsystemvalues: "show_system_values",
      showtaxrates: "show_tax_rates",
      showsalaryscales: "show_salary_scales",
      showrookiescales: "show_rookie_scales"
    }.freeze

    SYSTEM_METRIC_DEFINITIONS = {
      "salary_cap_amount" => { label: "Salary Cap", kind: :currency },
      "tax_level_amount" => { label: "Tax Level", kind: :currency },
      "tax_apron_amount" => { label: "Apron 1", kind: :currency },
      "tax_apron2_amount" => { label: "Apron 2", kind: :currency },
      "maximum_salary_25_pct" => { label: "Max Salary 25%", kind: :currency },
      "maximum_salary_30_pct" => { label: "Max Salary 30%", kind: :currency },
      "maximum_salary_35_pct" => { label: "Max Salary 35%", kind: :currency },
      "non_taxpayer_mid_level_amount" => { label: "Non-Taxpayer MLE", kind: :currency },
      "taxpayer_mid_level_amount" => { label: "Taxpayer MLE", kind: :currency },
      "room_mid_level_amount" => { label: "Room MLE", kind: :currency },
      "bi_annual_amount" => { label: "Bi-Annual Exception", kind: :currency },
      "tpe_dollar_allowance" => { label: "Trade Exception Allowance", kind: :currency },
      "max_trade_cash_amount" => { label: "Max Trade Cash", kind: :currency }
    }.freeze

    TAX_METRIC_DEFINITIONS = {
      "tax_rate_non_repeater" => { label: "Tax Rate (Non-Repeater)", kind: :rate },
      "tax_rate_repeater" => { label: "Tax Rate (Repeater)", kind: :rate },
      "base_charge_non_repeater" => { label: "Base Charge (Non-Repeater)", kind: :currency },
      "base_charge_repeater" => { label: "Base Charge (Repeater)", kind: :currency }
    }.freeze

    MINIMUM_METRIC_DEFINITIONS = {
      "minimum_salary_amount" => { label: "Minimum Salary", kind: :currency }
    }.freeze

    ROOKIE_METRIC_DEFINITIONS = {
      "salary_year_1" => { label: "Year 1 Salary", kind: :currency },
      "salary_year_2" => { label: "Year 2 Salary", kind: :currency },
      "option_amount_year_3" => { label: "Option Year 3 Amount", kind: :currency },
      "option_amount_year_4" => { label: "Option Year 4 Amount", kind: :currency },
      "option_pct_year_3" => { label: "Option Year 3 %", kind: :percentage },
      "option_pct_year_4" => { label: "Option Year 4 %", kind: :percentage }
    }.freeze

    METRIC_FINDER_SECTION_LABELS = {
      "system" => "System",
      "tax" => "Tax",
      "minimum" => "Minimum",
      "rookie" => "Rookie"
    }.freeze
    METRIC_FINDER_SECTION_RANK = {
      "system" => 0,
      "tax" => 1,
      "minimum" => 2,
      "rookie" => 3
    }.freeze
    METRIC_SHORTLIST_LIMIT = 6

    # GET /tools/system-values
    def show
      load_workspace_state!
      resolve_overlay_payload!
    rescue ActiveRecord::StatementInvalid => e
      apply_boot_error!(e)
    end

    # GET /tools/system-values/sidebar/metric
    def sidebar_metric
      load_workspace_state!
      resolve_overlay_payload!

      if @overlay_payload.present?
        render partial: "tools/system_values/rightpanel_overlay_metric", layout: false
      else
        render partial: "tools/system_values/rightpanel_clear", layout: false
      end
    rescue ActiveRecord::StatementInvalid => e
      render html: <<~HTML.html_safe, layout: false
        <div id="rightpanel-overlay" class="h-full p-4">
          <div class="rounded border border-border bg-muted/20 p-3">
            <div class="text-sm font-medium text-destructive">System Values sidebar failed</div>
            <pre class="mt-2 text-xs text-muted-foreground overflow-x-auto">#{ERB::Util.h(e.message)}</pre>
          </div>
        </div>
      HTML
    end

    # GET /tools/system-values/sidebar/clear
    def sidebar_clear
      render partial: "tools/system_values/rightpanel_clear", layout: false
    end

    # GET /tools/system-values/sse/refresh
    def refresh
      load_workspace_state!
      resolve_overlay_payload!

      with_sse_stream do |sse|
        commandbar_html = render_to_string(
          partial: "tools/system_values/commandbar",
          layout: false,
          locals: { state_query_expr:, overlay_query_expr: }
        )
        main_html = render_to_string(
          partial: "tools/system_values/workspace_main",
          layout: false,
          locals: { overlay_query_expr: }
        )
        rightpanel_base_html = render_to_string(
          partial: "tools/system_values/rightpanel_base",
          layout: false,
          locals: { overlay_query_expr: }
        )
        rightpanel_overlay_html = if @overlay_payload.present?
          render_to_string(partial: "tools/system_values/rightpanel_overlay_metric", layout: false)
        else
          render_to_string(partial: "tools/system_values/rightpanel_clear", layout: false)
        end

        patch_elements(sse, selector: "#commandbar", mode: "inner", html: commandbar_html)
        patch_elements(sse, selector: "#maincanvas", mode: "inner", html: main_html)
        patch_elements_by_id(sse, rightpanel_base_html)
        patch_elements_by_id(sse, rightpanel_overlay_html)
        patch_signals(
          sse,
          showsystemvalues: @show_system_values,
          showtaxrates: @show_tax_rates,
          showsalaryscales: @show_salary_scales,
          showrookiescales: @show_rookie_scales,
          svyear: @selected_year.to_s,
          svbaseline: @baseline_year.to_s,
          svfrom: @from_year.to_s,
          svto: @to_year.to_s,
          svmetricfinder: @active_metric_finder_value.to_s,
          svmetricfinderquery: @metric_finder_query.to_s,
          svmetricfindercursor: @metric_finder_cursor_value.to_s,
          svmetricfindercursorindex: @metric_finder_cursor_index.to_i,
          svoverlaysection: @overlay_signals.fetch(:section),
          svoverlaymetric: @overlay_signals.fetch(:metric),
          svoverlayyear: @overlay_signals.fetch(:year),
          svoverlaylower: @overlay_signals.fetch(:lower),
          svoverlayupper: @overlay_signals.fetch(:upper)
        )
      end
    rescue ActiveRecord::StatementInvalid => e
      with_sse_stream do |sse|
        patch_flash(sse, "System Values refresh failed: #{e.message.to_s.truncate(160)}")
      end
    end

    private

    def state_query_expr
      "'year=' + encodeURIComponent($svyear) + " \
        "'&baseline_year=' + encodeURIComponent($svbaseline) + " \
        "'&from_year=' + encodeURIComponent($svfrom) + " \
        "'&to_year=' + encodeURIComponent($svto) + " \
        "'&show_system_values=' + encodeURIComponent($showsystemvalues ? '1' : '0') + " \
        "'&show_tax_rates=' + encodeURIComponent($showtaxrates ? '1' : '0') + " \
        "'&show_salary_scales=' + encodeURIComponent($showsalaryscales ? '1' : '0') + " \
        "'&show_rookie_scales=' + encodeURIComponent($showrookiescales ? '1' : '0') + " \
        "'&metric_finder_query=' + encodeURIComponent($svmetricfinderquery || '') + " \
        "'&metric_finder_cursor=' + encodeURIComponent($svmetricfindercursor || '')"
    end

    def overlay_query_expr
      "(#{state_query_expr}) + " \
        "'&overlay_section=' + encodeURIComponent($svoverlaysection || '') + " \
        "'&overlay_metric=' + encodeURIComponent($svoverlaymetric || '') + " \
        "'&overlay_year=' + encodeURIComponent($svoverlayyear || '') + " \
        "'&overlay_lower=' + encodeURIComponent($svoverlaylower || '') + " \
        "'&overlay_upper=' + encodeURIComponent($svoverlayupper || '')"
    end

    def parse_year_param(value) = SystemValuesService.parse_year_param(value)
    def parse_decimal_param(value) = SystemValuesService.parse_decimal_param(value)

    def resolve_section_visibility!
      @show_system_values = SystemValuesService.parse_visibility_param(params[SECTION_VISIBILITY_PARAM_DEFINITIONS.fetch(:showsystemvalues)])
      @show_tax_rates = SystemValuesService.parse_visibility_param(params[SECTION_VISIBILITY_PARAM_DEFINITIONS.fetch(:showtaxrates)])
      @show_salary_scales = SystemValuesService.parse_visibility_param(params[SECTION_VISIBILITY_PARAM_DEFINITIONS.fetch(:showsalaryscales)])
      @show_rookie_scales = SystemValuesService.parse_visibility_param(params[SECTION_VISIBILITY_PARAM_DEFINITIONS.fetch(:showrookiescales)])
    end

    def visibility_state_params
      {
        show_system_values: @show_system_values ? "1" : "0",
        show_tax_rates: @show_tax_rates ? "1" : "0",
        show_salary_scales: @show_salary_scales ? "1" : "0",
        show_rookie_scales: @show_rookie_scales ? "1" : "0"
      }
    end

    def fetch_league_system_values(from_year, to_year) = SystemValuesQueries.fetch_league_system_values(from_year, to_year)
    def fetch_league_tax_rates(from_year, to_year) = SystemValuesQueries.fetch_league_tax_rates(from_year, to_year)
    def fetch_league_salary_scales(from_year, to_year) = SystemValuesQueries.fetch_league_salary_scales(from_year, to_year)
    def fetch_rookie_scale_amounts(from_year, to_year) = SystemValuesQueries.fetch_rookie_scale_amounts(from_year, to_year)

    def format_currency = (@format_currency ||= helpers.method(:format_compact_currency))
    def format_year = (@format_year ||= helpers.method(:format_year_label))

    def load_workspace_state!
      @available_years = SystemValuesQueries.fetch_available_years
      @selected_year = SystemValuesService.resolve_selected_year(@available_years, parse_year_param(params[:year]), CURRENT_SALARY_YEAR)
      @baseline_year = SystemValuesService.resolve_baseline_year(@available_years, @selected_year, parse_year_param(params[:baseline_year]), DEFAULT_BASELINE_OFFSET_YEARS)
      @from_year, @to_year = SystemValuesService.resolve_year_range(@available_years, @selected_year, parse_year_param(params[:from_year]), parse_year_param(params[:to_year]), DEFAULT_WINDOW_YEARS)

      @league_system_values = fetch_league_system_values(@from_year, @to_year)
      @league_tax_rates = fetch_league_tax_rates(@from_year, @to_year)
      @league_salary_scales = fetch_league_salary_scales(@from_year, @to_year)
      @rookie_scale_amounts = fetch_rookie_scale_amounts(@from_year, @to_year)

      @selected_system_values_row = @league_system_values.find { |row| row["salary_year"].to_i == @selected_year.to_i }
      @baseline_system_values_row = @league_system_values.find { |row| row["salary_year"].to_i == @baseline_year.to_i }

      @selected_tax_rate_rows = @league_tax_rates.select { |row| row["salary_year"].to_i == @selected_year.to_i }
      @baseline_tax_rate_rows = @league_tax_rates.select { |row| row["salary_year"].to_i == @baseline_year.to_i }

      @selected_salary_scale_rows = @league_salary_scales.select { |row| row["salary_year"].to_i == @selected_year.to_i }
      @baseline_salary_scale_rows = @league_salary_scales.select { |row| row["salary_year"].to_i == @baseline_year.to_i }

      @selected_rookie_scale_rows = @rookie_scale_amounts.select { |row| row["salary_year"].to_i == @selected_year.to_i }
      @baseline_rookie_scale_rows = @rookie_scale_amounts.select { |row| row["salary_year"].to_i == @baseline_year.to_i }

      # Fallback queries only when selected/baseline years were intentionally excluded by range.
      @selected_system_values_row ||= fetch_league_system_values(@selected_year, @selected_year).first
      @baseline_system_values_row ||= fetch_league_system_values(@baseline_year, @baseline_year).first
      @selected_tax_rate_rows = fetch_league_tax_rates(@selected_year, @selected_year) if @selected_tax_rate_rows.empty?
      @baseline_tax_rate_rows = fetch_league_tax_rates(@baseline_year, @baseline_year) if @baseline_tax_rate_rows.empty?
      @selected_salary_scale_rows = fetch_league_salary_scales(@selected_year, @selected_year) if @selected_salary_scale_rows.empty?
      @baseline_salary_scale_rows = fetch_league_salary_scales(@baseline_year, @baseline_year) if @baseline_salary_scale_rows.empty?
      @selected_rookie_scale_rows = fetch_rookie_scale_amounts(@selected_year, @selected_year) if @selected_rookie_scale_rows.empty?
      @baseline_rookie_scale_rows = fetch_rookie_scale_amounts(@baseline_year, @baseline_year) if @baseline_rookie_scale_rows.empty?

      resolve_section_visibility!

      @metric_finder_query = SystemValuesService.resolve_metric_finder_query(params[:metric_finder_query])
      @requested_metric_finder_cursor = SystemValuesService.resolve_metric_finder_cursor(params[:metric_finder_cursor])

      @section_shift_cards = SystemValuesService.build_section_shift_cards(**shared_row_args, format_currency:)
      @comparison_label = "Comparing #{format_year.call(@selected_year)} against #{format_year.call(@baseline_year)} baseline"
      @quick_metric_cards = SystemValuesService.build_quick_metric_cards(**shared_row_args, selected_year: @selected_year, format_currency:, system_metric_defs: SYSTEM_METRIC_DEFINITIONS, tax_metric_defs: TAX_METRIC_DEFINITIONS)
      @metric_finder_options = SystemValuesService.build_metric_finder_options(
        selected_year: @selected_year, selected_system_row: @selected_system_values_row,
        selected_tax_rows: @selected_tax_rate_rows, selected_salary_rows: @selected_salary_scale_rows,
        selected_rookie_rows: @selected_rookie_scale_rows, format_currency:, format_year_label: format_year,
        system_metric_defs: SYSTEM_METRIC_DEFINITIONS, tax_metric_defs: TAX_METRIC_DEFINITIONS,
        rookie_metric_defs: ROOKIE_METRIC_DEFINITIONS, section_labels: METRIC_FINDER_SECTION_LABELS
      )
      @active_metric_finder_value = ""
      @active_metric_finder_option = nil
      @metric_finder_shortlist = []
      @metric_finder_cursor_value = ""
      @metric_finder_cursor_index = 0
      @state_params = {
        year: @selected_year, baseline_year: @baseline_year,
        from_year: @from_year, to_year: @to_year
      }.merge(visibility_state_params)
    end

    def apply_boot_error!(error)
      @boot_error = error.message
      @available_years = []
      @selected_year = CURRENT_SALARY_YEAR
      @baseline_year = CURRENT_SALARY_YEAR
      @from_year = CURRENT_SALARY_YEAR
      @to_year = CURRENT_SALARY_YEAR
      @league_system_values = []
      @league_tax_rates = []
      @league_salary_scales = []
      @rookie_scale_amounts = []
      @selected_system_values_row = nil
      @baseline_system_values_row = nil
      @selected_tax_rate_rows = []
      @baseline_tax_rate_rows = []
      @selected_salary_scale_rows = []
      @baseline_salary_scale_rows = []
      @selected_rookie_scale_rows = []
      @baseline_rookie_scale_rows = []
      resolve_section_visibility!

      @section_shift_cards = []
      @quick_metric_cards = []
      @metric_finder_options = []
      @active_metric_finder_value = ""
      @active_metric_finder_option = nil
      @metric_finder_query = ""
      @requested_metric_finder_cursor = ""
      @metric_finder_shortlist = []
      @metric_finder_cursor_value = ""
      @metric_finder_cursor_index = 0
      @comparison_label = "Comparing #{format_year.call(@selected_year)} against #{format_year.call(@baseline_year)} baseline"
      @overlay_payload = nil
      @overlay_signals = SystemValuesService.empty_overlay_signals
      @state_params = {
        year: @selected_year, baseline_year: @baseline_year,
        from_year: @from_year, to_year: @to_year
      }.merge(visibility_state_params)
    end

    def resolve_overlay_payload!
      section = SystemValuesService.resolve_overlay_section(params[:overlay_section])
      defs = SystemValuesService.overlay_metric_definitions(section, system: SYSTEM_METRIC_DEFINITIONS, tax: TAX_METRIC_DEFINITIONS, minimum: MINIMUM_METRIC_DEFINITIONS, rookie: ROOKIE_METRIC_DEFINITIONS)
      metric = SystemValuesService.resolve_overlay_metric(section, params[:overlay_metric], defs)
      year = parse_year_param(params[:overlay_year]) || @selected_year

      context = case section
      when "system"
        SystemValuesService.build_system_overlay_context(metric:, year:, league_system_values: @league_system_values, system_metric_defs: SYSTEM_METRIC_DEFINITIONS)
      when "tax"
        lower = parse_decimal_param(params[:overlay_lower])
        upper = parse_decimal_param(params[:overlay_upper])
        upper = nil if params[:overlay_upper].to_s.strip.blank?
        SystemValuesService.build_tax_overlay_context(metric:, year:, lower:, upper:, league_tax_rates: @league_tax_rates, tax_metric_defs: TAX_METRIC_DEFINITIONS)
      when "minimum"
        yos = parse_year_param(params[:overlay_lower])
        SystemValuesService.build_minimum_overlay_context(metric:, year:, yos:, league_salary_scales: @league_salary_scales, minimum_metric_defs: MINIMUM_METRIC_DEFINITIONS)
      when "rookie"
        pick = parse_year_param(params[:overlay_lower])
        SystemValuesService.build_rookie_overlay_context(metric:, year:, pick:, rookie_scale_amounts: @rookie_scale_amounts, rookie_metric_defs: ROOKIE_METRIC_DEFINITIONS)
      end

      @overlay_payload = context.present? ? build_overlay_payload(context) : nil
      @overlay_signals = if @overlay_payload.present?
        {
          section: @overlay_payload.fetch(:section),
          metric: @overlay_payload.fetch(:metric),
          year: @overlay_payload.fetch(:focus_year).to_s,
          lower: @overlay_payload.fetch(:overlay_lower),
          upper: @overlay_payload.fetch(:overlay_upper)
        }
      else
        SystemValuesService.empty_overlay_signals
      end

      @active_metric_finder_value = SystemValuesService.metric_finder_value_for_overlay(@overlay_signals, @metric_finder_options)
      @active_metric_finder_option = @metric_finder_options.find { |option| option[:value] == @active_metric_finder_value }
      resolve_metric_finder_shortlist!
    end

    def build_overlay_payload(context)
      SystemValuesService.build_overlay_payload(
        context,
        selected_rows: { tax: @selected_tax_rate_rows, minimum: @selected_salary_scale_rows, rookie: @selected_rookie_scale_rows },
        baseline_rows: { tax: @baseline_tax_rate_rows, minimum: @baseline_salary_scale_rows, rookie: @baseline_rookie_scale_rows },
        selected_system_row: @selected_system_values_row,
        baseline_system_row: @baseline_system_values_row,
        selected_year: @selected_year,
        baseline_year: @baseline_year,
        state_params: @state_params,
        format_currency:,
        format_year_label: format_year,
        team_summary_path: ->(year, pressure) { tools_team_summary_path(year:, conference: "all", pressure:, sort: "cap_space_desc") },
        system_values_path: ->(sp) { tools_system_values_path(sp) },
        rookie_metric_definitions: ROOKIE_METRIC_DEFINITIONS
      )
    end

    def resolve_metric_finder_shortlist!
      query = @metric_finder_query.to_s.downcase
      result = SystemValuesService.resolve_metric_finder_shortlist(
        query:,
        metric_finder_options: @metric_finder_options,
        requested_cursor: @requested_metric_finder_cursor,
        active_value: @active_metric_finder_value,
        section_rank: METRIC_FINDER_SECTION_RANK,
        shortlist_limit: METRIC_SHORTLIST_LIMIT
      )
      @metric_finder_shortlist = result[:shortlist]
      @metric_finder_cursor_value = result[:cursor_value]
      @metric_finder_cursor_index = result[:cursor_index]
    end

    def shared_row_args
      {
        selected_system_row: @selected_system_values_row,
        baseline_system_row: @baseline_system_values_row,
        selected_tax_rows: @selected_tax_rate_rows,
        baseline_tax_rows: @baseline_tax_rate_rows,
        selected_salary_rows: @selected_salary_scale_rows,
        baseline_salary_rows: @baseline_salary_scale_rows,
        selected_rookie_rows: @selected_rookie_scale_rows,
        baseline_rookie_rows: @baseline_rookie_scale_rows
      }
    end
  end
end
