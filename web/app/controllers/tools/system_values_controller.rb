module Tools
  class SystemValuesController < ApplicationController
    include Datastar

    CURRENT_SALARY_YEAR = 2025
    DEFAULT_WINDOW_YEARS = 2
    DEFAULT_BASELINE_OFFSET_YEARS = 1

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
    # One-request multi-region refresh for commandbar apply and baseline/range transitions.
    # Patches:
    # - #commandbar
    # - #maincanvas
    # - #rightpanel-base
    # - #rightpanel-overlay
    def refresh
      load_workspace_state!
      resolve_overlay_payload!

      with_sse_stream do |sse|
        commandbar_html = render_to_string(partial: "tools/system_values/commandbar", layout: false)
        main_html = render_to_string(partial: "tools/system_values/workspace_main", layout: false)
        rightpanel_base_html = render_to_string(partial: "tools/system_values/rightpanel_base", layout: false)
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
          svyear: @selected_year.to_s,
          svbaseline: @baseline_year.to_s,
          svfrom: @from_year.to_s,
          svto: @to_year.to_s,
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

    def conn
      ActiveRecord::Base.connection
    end

    def parse_year_param(value)
      Integer(value)
    rescue ArgumentError, TypeError
      nil
    end

    def parse_decimal_param(value)
      raw = value.to_s.strip
      return nil if raw.blank?

      Float(raw)
    rescue ArgumentError, TypeError
      nil
    end

    def fetch_available_years
      conn.exec_query(<<~SQL).rows.flatten.map(&:to_i)
        SELECT DISTINCT salary_year
        FROM (
          SELECT salary_year FROM pcms.league_system_values WHERE league_lk = 'NBA'
          UNION
          SELECT salary_year FROM pcms.league_tax_rates WHERE league_lk = 'NBA'
          UNION
          SELECT salary_year FROM pcms.league_salary_scales WHERE league_lk = 'NBA'
          UNION
          SELECT salary_year FROM pcms.rookie_scale_amounts WHERE league_lk = 'NBA' AND salary_year >= 1900
        ) years
        ORDER BY salary_year
      SQL
    end

    def resolve_selected_year(available_years)
      return CURRENT_SALARY_YEAR if available_years.empty?

      requested = parse_year_param(params[:year])
      return requested if requested && available_years.include?(requested)

      return CURRENT_SALARY_YEAR if available_years.include?(CURRENT_SALARY_YEAR)

      available_years.max
    end

    def resolve_baseline_year(available_years, selected_year)
      return selected_year if available_years.empty?

      requested = parse_year_param(params[:baseline_year])
      return requested if requested && available_years.include?(requested)

      preferred = selected_year - DEFAULT_BASELINE_OFFSET_YEARS
      return preferred if available_years.include?(preferred)

      return selected_year if available_years.include?(selected_year)

      available_years.min
    end

    def resolve_year_range(available_years, selected_year)
      return [ selected_year, selected_year ] if available_years.empty?

      min_year = available_years.min
      max_year = available_years.max

      default_from = [ selected_year - DEFAULT_WINDOW_YEARS, min_year ].max
      default_to = [ selected_year + DEFAULT_WINDOW_YEARS, max_year ].min

      from_year = parse_year_param(params[:from_year]) || default_from
      to_year = parse_year_param(params[:to_year]) || default_to

      from_year = from_year.clamp(min_year, max_year)
      to_year = to_year.clamp(min_year, max_year)

      if from_year > to_year
        from_year, to_year = to_year, from_year
      end

      [ from_year, to_year ]
    end

    def fetch_league_system_values(from_year, to_year)
      conn.exec_query(<<~SQL).to_a
        SELECT
          salary_year,
          salary_cap_amount,
          tax_level_amount,
          tax_apron_amount,
          tax_apron2_amount,
          minimum_team_salary_amount,
          maximum_salary_25_pct,
          maximum_salary_30_pct,
          maximum_salary_35_pct,
          non_taxpayer_mid_level_amount,
          taxpayer_mid_level_amount,
          room_mid_level_amount,
          bi_annual_amount,
          tpe_dollar_allowance,
          max_trade_cash_amount,
          international_player_payment_limit,
          refreshed_at
        FROM (
          SELECT
            salary_year,
            salary_cap_amount,
            tax_level_amount,
            tax_apron_amount,
            tax_apron2_amount,
            minimum_team_salary_amount,
            maximum_salary_25_pct,
            maximum_salary_30_pct,
            maximum_salary_35_pct,
            non_taxpayer_mid_level_amount,
            taxpayer_mid_level_amount,
            room_mid_level_amount,
            bi_annual_amount,
            tpe_dollar_allowance,
            max_trade_cash_amount,
            international_player_payment_limit,
            ingested_at AS refreshed_at
          FROM pcms.league_system_values
          WHERE league_lk = 'NBA'
            AND salary_year BETWEEN #{conn.quote(from_year)} AND #{conn.quote(to_year)}
        ) values_rows
        ORDER BY salary_year
      SQL
    end

    def fetch_league_tax_rates(from_year, to_year)
      conn.exec_query(<<~SQL).to_a
        SELECT
          salary_year,
          lower_limit,
          upper_limit,
          tax_rate_non_repeater,
          tax_rate_repeater,
          base_charge_non_repeater,
          base_charge_repeater
        FROM pcms.league_tax_rates
        WHERE league_lk = 'NBA'
          AND salary_year BETWEEN #{conn.quote(from_year)} AND #{conn.quote(to_year)}
        ORDER BY salary_year, lower_limit
      SQL
    end

    def fetch_league_salary_scales(from_year, to_year)
      conn.exec_query(<<~SQL).to_a
        SELECT
          salary_year,
          years_of_service,
          minimum_salary_amount
        FROM pcms.league_salary_scales
        WHERE league_lk = 'NBA'
          AND salary_year BETWEEN #{conn.quote(from_year)} AND #{conn.quote(to_year)}
        ORDER BY salary_year, years_of_service
      SQL
    end

    def fetch_rookie_scale_amounts(from_year, to_year)
      conn.exec_query(<<~SQL).to_a
        SELECT
          salary_year,
          pick_number,
          salary_year_1,
          salary_year_2,
          option_amount_year_3,
          option_amount_year_4,
          option_pct_year_3,
          option_pct_year_4,
          is_active
        FROM pcms.rookie_scale_amounts
        WHERE league_lk = 'NBA'
          AND salary_year >= 1900
          AND salary_year BETWEEN #{conn.quote(from_year)} AND #{conn.quote(to_year)}
        ORDER BY salary_year, pick_number
      SQL
    end

    def load_workspace_state!
      @available_years = fetch_available_years
      @selected_year = resolve_selected_year(@available_years)
      @baseline_year = resolve_baseline_year(@available_years, @selected_year)
      @from_year, @to_year = resolve_year_range(@available_years, @selected_year)

      @league_system_values = fetch_league_system_values(@from_year, @to_year)
      @league_tax_rates = fetch_league_tax_rates(@from_year, @to_year)
      @league_salary_scales = fetch_league_salary_scales(@from_year, @to_year)
      @rookie_scale_amounts = fetch_rookie_scale_amounts(@from_year, @to_year)

      @selected_system_values_row = fetch_league_system_values(@selected_year, @selected_year).first
      @baseline_system_values_row = fetch_league_system_values(@baseline_year, @baseline_year).first

      @selected_tax_rate_rows = fetch_league_tax_rates(@selected_year, @selected_year)
      @baseline_tax_rate_rows = fetch_league_tax_rates(@baseline_year, @baseline_year)

      @selected_salary_scale_rows = fetch_league_salary_scales(@selected_year, @selected_year)
      @baseline_salary_scale_rows = fetch_league_salary_scales(@baseline_year, @baseline_year)

      @selected_rookie_scale_rows = fetch_rookie_scale_amounts(@selected_year, @selected_year)
      @baseline_rookie_scale_rows = fetch_rookie_scale_amounts(@baseline_year, @baseline_year)

      @section_shift_cards = build_section_shift_cards
      @comparison_label = "Comparing #{helpers.format_year_label(@selected_year)} against #{helpers.format_year_label(@baseline_year)} baseline"
      @quick_metric_cards = build_quick_metric_cards
      @state_params = {
        year: @selected_year,
        baseline_year: @baseline_year,
        from_year: @from_year,
        to_year: @to_year
      }
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
      @section_shift_cards = []
      @quick_metric_cards = []
      @comparison_label = "Comparing #{helpers.format_year_label(@selected_year)} against #{helpers.format_year_label(@baseline_year)} baseline"
      @overlay_payload = nil
      @overlay_signals = empty_overlay_signals
      @state_params = {
        year: @selected_year,
        baseline_year: @baseline_year,
        from_year: @from_year,
        to_year: @to_year
      }
    end

    def resolve_overlay_payload!
      section = resolve_overlay_section(params[:overlay_section])
      metric = resolve_overlay_metric(section, params[:overlay_metric])
      year = parse_year_param(params[:overlay_year]) || @selected_year

      context = case section
      when "system"
        build_system_overlay_context(metric:, year:)
      when "tax"
        lower = parse_decimal_param(params[:overlay_lower])
        upper = parse_decimal_param(params[:overlay_upper])
        upper = nil if params[:overlay_upper].to_s.strip.blank?
        build_tax_overlay_context(metric:, year:, lower:, upper:)
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
        empty_overlay_signals
      end
    end

    def resolve_overlay_section(value)
      normalized = value.to_s.strip
      return normalized if %w[system tax].include?(normalized)

      nil
    end

    def resolve_overlay_metric(section, value)
      metric = value.to_s.strip
      return nil if metric.blank?

      definitions = section == "tax" ? TAX_METRIC_DEFINITIONS : SYSTEM_METRIC_DEFINITIONS
      definitions.key?(metric) ? metric : nil
    end

    def build_system_overlay_context(metric:, year:)
      return nil if metric.blank? || year.blank?

      focus_row = @league_system_values.find { |row| row["salary_year"].to_i == year.to_i }
      return nil unless focus_row

      {
        section: "system",
        metric:,
        metric_definition: SYSTEM_METRIC_DEFINITIONS.fetch(metric),
        focus_year: year.to_i,
        focus_row:
      }
    end

    def build_tax_overlay_context(metric:, year:, lower:, upper:)
      return nil if metric.blank? || year.blank? || lower.nil?

      focus_row = @league_tax_rates.find do |row|
        row["salary_year"].to_i == year.to_i && tax_bracket_match?(row, lower:, upper:)
      end
      return nil unless focus_row

      {
        section: "tax",
        metric:,
        metric_definition: TAX_METRIC_DEFINITIONS.fetch(metric),
        focus_year: year.to_i,
        focus_row:
      }
    end

    def build_overlay_payload(context)
      section = context.fetch(:section)
      metric = context.fetch(:metric)
      metric_definition = context.fetch(:metric_definition)
      focus_row = context.fetch(:focus_row)
      focus_year = context.fetch(:focus_year)
      kind = metric_definition.fetch(:kind)

      selected_value, baseline_value, focus_baseline_value = if section == "tax"
        lower = focus_row["lower_limit"]&.to_f
        upper = focus_row["upper_limit"]&.to_f

        selected_row = tax_row_for_bracket(@selected_tax_rate_rows, lower:, upper:)
        baseline_row = tax_row_for_bracket(@baseline_tax_rate_rows, lower:, upper:)

        [
          selected_row&.[](metric),
          baseline_row&.[](metric),
          baseline_row&.[](metric)
        ]
      else
        [
          @selected_system_values_row&.[](metric),
          @baseline_system_values_row&.[](metric),
          @baseline_system_values_row&.[](metric)
        ]
      end

      focus_value = focus_row[metric]
      selected_delta = numeric_delta(selected_value, baseline_value)
      focus_delta = numeric_delta(focus_value, focus_baseline_value)

      selected_year_label = helpers.format_year_label(@selected_year)
      baseline_year_label = helpers.format_year_label(@baseline_year)
      focus_year_label = helpers.format_year_label(focus_year)

      summary_line = "#{selected_year_label} #{metric_definition.fetch(:label)} is #{format_metric_value(selected_value, kind)} (#{format_metric_delta(selected_delta, kind)} vs #{baseline_year_label})."

      focus_line = if focus_year.to_i == @selected_year.to_i
        "Current focus matches selected season baseline comparison."
      else
        "#{focus_year_label} value: #{format_metric_value(focus_value, kind)} (#{format_metric_delta(focus_delta, kind)} vs #{baseline_year_label})."
      end

      section_title = section == "tax" ? "League Tax Rates" : "League System Values"
      pivot_pressure = section == "tax" ? "over_tax" : "all"

      overlay_lower = ""
      overlay_upper = ""
      bracket_label = nil

      if section == "tax"
        lower = focus_row["lower_limit"]
        upper = focus_row["upper_limit"]
        overlay_lower = lower.present? ? format("%.0f", lower.to_f) : ""
        overlay_upper = upper.present? ? format("%.0f", upper.to_f) : ""

        lower_label = helpers.format_compact_currency(lower)
        upper_label = upper.present? ? helpers.format_compact_currency(upper) : "∞"
        bracket_label = "Bracket #{lower_label} – #{upper_label}"
      end

      {
        section:,
        section_title:,
        metric:,
        metric_label: metric_definition.fetch(:label),
        metric_kind: kind,
        focus_year:,
        focus_year_label:,
        selected_year_label:,
        baseline_year_label:,
        selected_value_label: format_metric_value(selected_value, kind),
        baseline_value_label: format_metric_value(baseline_value, kind),
        focus_value_label: format_metric_value(focus_value, kind),
        selected_delta_label: format_metric_delta(selected_delta, kind),
        selected_delta_variant: delta_variant(selected_delta),
        focus_delta_label: format_metric_delta(focus_delta, kind),
        focus_delta_variant: delta_variant(focus_delta),
        summary_line:,
        focus_line:,
        bracket_label:,
        source_table: section == "tax" ? "pcms.league_tax_rates" : "pcms.league_system_values",
        pivot_links: [
          {
            label: "Open Team Summary (#{selected_year_label})",
            href: tools_team_summary_path(year: @selected_year, conference: "all", pressure: pivot_pressure, sort: "cap_space_desc")
          },
          {
            label: "Open canonical System Values view",
            href: tools_system_values_path(@state_params)
          }
        ],
        overlay_lower:,
        overlay_upper:
      }
    end

    def tax_row_for_bracket(rows, lower:, upper:)
      Array(rows).find { |row| tax_bracket_match?(row, lower:, upper:) }
    end

    def tax_bracket_match?(row, lower:, upper:)
      row_lower = row["lower_limit"]
      row_upper = row["upper_limit"]

      return false if row_lower.nil?
      return false unless row_lower.to_f == lower.to_f

      if upper.nil?
        row_upper.nil?
      else
        row_upper.present? && row_upper.to_f == upper.to_f
      end
    end

    def empty_overlay_signals
      {
        section: "",
        metric: "",
        year: "",
        lower: "",
        upper: ""
      }
    end

    def build_quick_metric_cards
      cards = []

      [
        ["Cap", "salary_cap_amount"],
        ["Tax", "tax_level_amount"],
        ["Apron 1", "tax_apron_amount"],
        ["NT MLE", "non_taxpayer_mid_level_amount"]
      ].each do |label, metric|
        definition = SYSTEM_METRIC_DEFINITIONS.fetch(metric)
        selected_value = @selected_system_values_row&.[](metric)
        baseline_value = @baseline_system_values_row&.[](metric)
        delta = numeric_delta(selected_value, baseline_value)

        cards << {
          section: "system",
          metric:,
          label:,
          year: @selected_year,
          lower: "",
          upper: "",
          value_label: format_metric_value(selected_value, definition.fetch(:kind)),
          delta_label: format_metric_delta(delta, definition.fetch(:kind)),
          delta_variant: delta_variant(delta)
        }
      end

      top_bracket = @selected_tax_rate_rows.max_by { |row| row["lower_limit"].to_f }
      if top_bracket.present?
        metric = "tax_rate_non_repeater"
        definition = TAX_METRIC_DEFINITIONS.fetch(metric)

        lower = top_bracket["lower_limit"]
        upper = top_bracket["upper_limit"]

        baseline_bracket = tax_row_for_bracket(@baseline_tax_rate_rows, lower: lower.to_f, upper: upper&.to_f)
        delta = numeric_delta(top_bracket[metric], baseline_bracket&.[](metric))

        lower_label = helpers.format_compact_currency(lower)
        upper_label = upper.present? ? helpers.format_compact_currency(upper) : "∞"

        cards << {
          section: "tax",
          metric:,
          label: "Top NR #{lower_label}–#{upper_label}",
          year: @selected_year,
          lower: lower.present? ? format("%.0f", lower.to_f) : "",
          upper: upper.present? ? format("%.0f", upper.to_f) : "",
          value_label: format_metric_value(top_bracket[metric], definition.fetch(:kind)),
          delta_label: format_metric_delta(delta, definition.fetch(:kind)),
          delta_variant: delta_variant(delta)
        }
      end

      cards
    end

    def format_metric_value(value, kind)
      return "—" if value.nil?

      case kind
      when :currency
        helpers.format_compact_currency(value)
      when :rate
        "#{format("%.2f", value.to_f)}x"
      else
        value.to_s
      end
    end

    def format_metric_delta(delta, kind)
      return "n/a" if delta.nil?

      case kind
      when :currency
        return "±$0K" if delta.to_f.zero?

        prefix = delta.to_f.positive? ? "+" : "-"
        "#{prefix}#{helpers.format_compact_currency(delta.to_f.abs)}"
      when :rate
        return "±0.00x" if delta.to_f.zero?

        prefix = delta.to_f.positive? ? "+" : ""
        "#{prefix}#{format("%.2f", delta.to_f)}x"
      else
        delta.to_s
      end
    end

    def delta_variant(delta)
      return "muted" if delta.nil?
      return "positive" if delta.to_f.positive?
      return "negative" if delta.to_f.negative?

      "neutral"
    end

    def build_section_shift_cards
      minimum_selected = minimum_salary_row(@selected_salary_scale_rows)
      minimum_baseline = minimum_salary_row(@baseline_salary_scale_rows)
      rookie_selected = rookie_pick_one_row(@selected_rookie_scale_rows)
      rookie_baseline = rookie_pick_one_row(@baseline_rookie_scale_rows)

      [
        build_shift_card(
          key: "system",
          label: "System",
          metric_label: "Cap",
          delta: numeric_delta(@selected_system_values_row&.[]("salary_cap_amount"), @baseline_system_values_row&.[]("salary_cap_amount")),
          formatter: :currency
        ),
        build_shift_card(
          key: "tax",
          label: "Tax",
          metric_label: "Top NR",
          delta: numeric_delta(top_tax_rate(@selected_tax_rate_rows, "tax_rate_non_repeater"), top_tax_rate(@baseline_tax_rate_rows, "tax_rate_non_repeater")),
          formatter: :rate
        ),
        build_shift_card(
          key: "minimum",
          label: "Minimum",
          metric_label: "YOS 0",
          delta: numeric_delta(minimum_selected&.[]("minimum_salary_amount"), minimum_baseline&.[]("minimum_salary_amount")),
          formatter: :currency
        ),
        build_shift_card(
          key: "rookie",
          label: "Rookie",
          metric_label: "Pick 1",
          delta: numeric_delta(rookie_selected&.[]("salary_year_1"), rookie_baseline&.[]("salary_year_1")),
          formatter: :currency
        )
      ]
    end

    def build_shift_card(key:, label:, metric_label:, delta:, formatter:)
      {
        key:,
        label:,
        metric_label:,
        delta_label: format_shift_delta(delta, formatter),
        variant: shift_variant(delta)
      }
    end

    def top_tax_rate(rows, column)
      rows.map { |row| row[column] }.compact.map(&:to_f).max
    end

    def minimum_salary_row(rows)
      rows.min_by { |row| row["years_of_service"].to_i }
    end

    def rookie_pick_one_row(rows)
      rows.find { |row| row["pick_number"].to_i == 1 } || rows.min_by { |row| row["pick_number"].to_i }
    end

    def numeric_delta(selected_value, baseline_value)
      return nil if selected_value.nil? || baseline_value.nil?

      selected_value.to_f - baseline_value.to_f
    end

    def format_shift_delta(delta, formatter)
      return "n/a" if delta.nil?

      case formatter
      when :currency
        return "±$0K" if delta.zero?

        prefix = delta.positive? ? "+" : "-"
        "#{prefix}#{helpers.format_compact_currency(delta.abs)}"
      when :rate
        prefix = delta.positive? ? "+" : ""
        "#{prefix}#{format("%.2f", delta)}x"
      else
        delta.to_s
      end
    end

    def shift_variant(delta)
      return "muted" if delta.nil?
      return "positive" if delta.positive?
      return "negative" if delta.negative?

      "neutral"
    end
  end
end
