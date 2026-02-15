module SystemValuesService
  module_function

  def tax_row_for_bracket(rows, lower:, upper:)
    Array(rows).find { |row| tax_bracket_match?(row, lower:, upper:) }
  end

  def minimum_row_for_yos(rows, yos:)
    Array(rows).find { |row| row["years_of_service"].to_i == yos.to_i }
  end

  def rookie_row_for_pick(rows, pick:)
    Array(rows).find { |row| row["pick_number"].to_i == pick.to_i }
  end

  def build_rookie_overlay_detail_rows(selected_row:, baseline_row:, metric_definitions:, format_value:, format_delta:)
    metric_definitions.map do |metric_key, definition|
      selected_value = selected_row&.[](metric_key)
      baseline_value = baseline_row&.[](metric_key)
      delta = numeric_delta(selected_value, baseline_value)

      {
        metric: metric_key,
        label: definition.fetch(:label),
        selected_value_label: format_value.call(selected_value, definition.fetch(:kind)),
        baseline_value_label: format_value.call(baseline_value, definition.fetch(:kind)),
        delta_label: format_delta.call(delta, definition.fetch(:kind)),
        delta_variant: delta_variant(delta)
      }
    end
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

  def metric_shortlist_match_details(option:, query:)
    metric_label = option[:metric_label].to_s.downcase
    context_label = option[:context_label].to_s.downcase
    full_label = option[:label].to_s.downcase

    return { score: 0, reason: "exact" } if [metric_label, context_label, full_label].include?(query)
    return { score: 1, reason: "prefix" } if metric_label.start_with?(query)

    metric_tokens = metric_label.split(/[^a-z0-9%]+/)
    return { score: 2, reason: "prefix" } if metric_tokens.any? { |token| token.start_with?(query) }
    return { score: 3, reason: "context" } if context_label.start_with?(query)
    return { score: 4, reason: "context" } if [metric_label, context_label, full_label].any? { |value| value.include?(query) }

    nil
  end

  def numeric_delta(selected_value, baseline_value)
    return nil if selected_value.nil? || baseline_value.nil?

    selected_value.to_f - baseline_value.to_f
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

  def delta_variant(delta)
    return "muted" if delta.nil?
    return "positive" if delta.to_f.positive?
    return "negative" if delta.to_f.negative?

    "neutral"
  end

  def shift_variant(delta)
    return "muted" if delta.nil?
    return "positive" if delta.positive?
    return "negative" if delta.negative?

    "neutral"
  end

  def metric_finder_value(section:, metric:, year:, lower:, upper:, anchor_id:)
    [ section, metric, year.to_s, lower.to_s, upper.to_s, anchor_id.to_s ].join("|")
  end

  def system_row_anchor(year)
    "sv-row-system-#{year.to_i}"
  end

  def tax_row_anchor(year, lower:, upper:)
    lower_token = lower.to_s.presence || "0"
    upper_token = upper.to_s.presence || "inf"
    "sv-row-tax-#{year.to_i}-#{lower_token}-#{upper_token}"
  end

  def minimum_row_anchor(year, yos:)
    "sv-row-minimum-#{year.to_i}-yos-#{yos.to_i}"
  end

  def rookie_row_anchor(year, pick:)
    "sv-row-rookie-#{year.to_i}-pick-#{pick.to_i}"
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

  def parse_visibility_param(value)
    normalized = value.to_s.strip.downcase
    return true if normalized.blank?
    return true if %w[1 true yes on].include?(normalized)
    return false if %w[0 false no off].include?(normalized)

    true
  end

  def resolve_selected_year(available_years, requested, current_salary_year)
    return current_salary_year if available_years.empty?
    return requested if requested && available_years.include?(requested)
    return current_salary_year if available_years.include?(current_salary_year)

    available_years.max
  end

  def resolve_baseline_year(available_years, selected_year, requested, default_offset)
    return selected_year if available_years.empty?
    return requested if requested && available_years.include?(requested)

    preferred = selected_year - default_offset
    return preferred if available_years.include?(preferred)
    return selected_year if available_years.include?(selected_year)

    available_years.min
  end

  def resolve_year_range(available_years, selected_year, from_param, to_param, default_window)
    return [ selected_year, selected_year ] if available_years.empty?

    min_year = available_years.min
    max_year = available_years.max

    default_from = [ selected_year - default_window, min_year ].max
    default_to = [ selected_year + default_window, max_year ].min

    from_year = from_param || default_from
    to_year = to_param || default_to

    from_year = from_year.clamp(min_year, max_year)
    to_year = to_year.clamp(min_year, max_year)

    from_year, to_year = to_year, from_year if from_year > to_year

    [ from_year, to_year ]
  end

  def resolve_metric_finder_query(value)
    value.to_s.strip.tr("\u0000", "")[0, 80]
  end

  def resolve_metric_finder_cursor(value)
    value.to_s.strip[0, 240]
  end

  def resolve_overlay_section(value)
    normalized = value.to_s.strip
    return normalized if %w[system tax minimum rookie].include?(normalized)

    nil
  end

  def resolve_overlay_metric(section, value, definitions)
    metric = value.to_s.strip
    return nil if metric.blank?

    definitions.key?(metric) ? metric : nil
  end

  def overlay_metric_definitions(section, system:, tax:, minimum:, rookie:)
    case section
    when "tax" then tax
    when "minimum" then minimum
    when "rookie" then rookie
    else system
    end
  end

  def build_system_overlay_context(metric:, year:, league_system_values:, system_metric_defs:)
    return nil if metric.blank? || year.blank?

    focus_row = league_system_values.find { |row| row["salary_year"].to_i == year.to_i }
    return nil unless focus_row

    { section: "system", metric:, metric_definition: system_metric_defs.fetch(metric), focus_year: year.to_i, focus_row: }
  end

  def build_tax_overlay_context(metric:, year:, lower:, upper:, league_tax_rates:, tax_metric_defs:)
    return nil if metric.blank? || year.blank? || lower.nil?

    focus_row = league_tax_rates.find do |row|
      row["salary_year"].to_i == year.to_i && tax_bracket_match?(row, lower:, upper:)
    end
    return nil unless focus_row

    { section: "tax", metric:, metric_definition: tax_metric_defs.fetch(metric), focus_year: year.to_i, focus_row: }
  end

  def build_minimum_overlay_context(metric:, year:, yos:, league_salary_scales:, minimum_metric_defs:)
    return nil if metric.blank? || year.blank? || yos.nil?

    focus_row = league_salary_scales.find do |row|
      row["salary_year"].to_i == year.to_i && row["years_of_service"].to_i == yos.to_i
    end
    return nil unless focus_row

    { section: "minimum", metric:, metric_definition: minimum_metric_defs.fetch(metric), focus_year: year.to_i, focus_row:, yos: yos.to_i }
  end

  def build_rookie_overlay_context(metric:, year:, pick:, rookie_scale_amounts:, rookie_metric_defs:)
    return nil if metric.blank? || year.blank? || pick.nil?

    focus_row = rookie_scale_amounts.find do |row|
      row["salary_year"].to_i == year.to_i && row["pick_number"].to_i == pick.to_i
    end
    return nil unless focus_row

    { section: "rookie", metric:, metric_definition: rookie_metric_defs.fetch(metric), focus_year: year.to_i, focus_row:, pick: pick.to_i }
  end

  def format_metric_value(value, kind, format_currency:)
    return "—" if value.nil?

    case kind
    when :currency
      format_currency.call(value)
    when :rate
      "#{format("%.2f", value.to_f)}x"
    when :percentage
      "#{format("%.1f", value.to_f * 100.0)}%"
    else
      value.to_s
    end
  end

  def format_metric_delta(delta, kind, format_currency:)
    return "n/a" if delta.nil?

    case kind
    when :currency
      return "±$0K" if delta.to_f.zero?

      prefix = delta.to_f.positive? ? "+" : "-"
      "#{prefix}#{format_currency.call(delta.to_f.abs)}"
    when :rate
      return "±0.00x" if delta.to_f.zero?

      prefix = delta.to_f.positive? ? "+" : ""
      "#{prefix}#{format("%.2f", delta.to_f)}x"
    when :percentage
      return "±0.0pp" if delta.to_f.zero?

      prefix = delta.to_f.positive? ? "+" : ""
      "#{prefix}#{format("%.1f", delta.to_f * 100.0)}pp"
    else
      delta.to_s
    end
  end

  def format_shift_delta(delta, formatter, format_currency:)
    return "n/a" if delta.nil?

    case formatter
    when :currency
      return "±$0K" if delta.zero?

      prefix = delta.positive? ? "+" : "-"
      "#{prefix}#{format_currency.call(delta.abs)}"
    when :rate
      prefix = delta.positive? ? "+" : ""
      "#{prefix}#{format("%.2f", delta)}x"
    else
      delta.to_s
    end
  end

  def build_overlay_payload(context, selected_rows:, baseline_rows:, selected_system_row:, baseline_system_row:, selected_year:, baseline_year:, state_params:, format_currency:, format_year_label:, team_summary_path:, system_values_path:, rookie_metric_definitions:)
    section = context.fetch(:section)
    metric = context.fetch(:metric)
    metric_definition = context.fetch(:metric_definition)
    focus_row = context.fetch(:focus_row)
    focus_year = context.fetch(:focus_year)
    kind = metric_definition.fetch(:kind)

    fmt_val = ->(v, k) { format_metric_value(v, k, format_currency:) }
    fmt_delta = ->(d, k) { format_metric_delta(d, k, format_currency:) }

    rookie_detail_rows = nil

    selected_value, baseline_value, focus_baseline_value, context_label, overlay_lower, overlay_upper =
      case section
      when "tax"
        lower = focus_row["lower_limit"]&.to_f
        upper = focus_row["upper_limit"]&.to_f

        selected_row = tax_row_for_bracket(selected_rows[:tax], lower:, upper:)
        baseline_row = tax_row_for_bracket(baseline_rows[:tax], lower:, upper:)

        lower_raw = focus_row["lower_limit"]
        upper_raw = focus_row["upper_limit"]
        lower_label = format_currency.call(lower_raw)
        upper_label = upper_raw.present? ? format_currency.call(upper_raw) : "∞"

        [
          selected_row&.[](metric),
          baseline_row&.[](metric),
          baseline_row&.[](metric),
          "Bracket #{lower_label} – #{upper_label}",
          lower_raw.present? ? format("%.0f", lower_raw.to_f) : "",
          upper_raw.present? ? format("%.0f", upper_raw.to_f) : ""
        ]
      when "minimum"
        yos = context.fetch(:yos)
        selected_row = minimum_row_for_yos(selected_rows[:minimum], yos:)
        baseline_row = minimum_row_for_yos(baseline_rows[:minimum], yos:)

        [
          selected_row&.[](metric),
          baseline_row&.[](metric),
          baseline_row&.[](metric),
          "YOS #{yos}",
          yos.to_s,
          ""
        ]
      when "rookie"
        pick = context.fetch(:pick)
        selected_row = rookie_row_for_pick(selected_rows[:rookie], pick:)
        baseline_row = rookie_row_for_pick(baseline_rows[:rookie], pick:)

        rookie_detail_rows = build_rookie_overlay_detail_rows(
          selected_row:, baseline_row:,
          metric_definitions: rookie_metric_definitions,
          format_value: fmt_val,
          format_delta: fmt_delta
        )

        [
          selected_row&.[](metric),
          baseline_row&.[](metric),
          baseline_row&.[](metric),
          "Pick #{pick}",
          pick.to_s,
          ""
        ]
      else
        [
          selected_system_row&.[](metric),
          baseline_system_row&.[](metric),
          baseline_system_row&.[](metric),
          nil,
          "",
          ""
        ]
      end

    focus_value = focus_row[metric]
    selected_delta = numeric_delta(selected_value, baseline_value)
    focus_delta = numeric_delta(focus_value, focus_baseline_value)

    selected_year_label = format_year_label.call(selected_year)
    baseline_year_label = format_year_label.call(baseline_year)
    focus_year_label = format_year_label.call(focus_year)

    context_suffix = context_label.present? ? " (#{context_label})" : ""

    summary_line = "#{selected_year_label} #{metric_definition.fetch(:label)}#{context_suffix} is #{fmt_val.call(selected_value, kind)} (#{fmt_delta.call(selected_delta, kind)} vs #{baseline_year_label})."

    focus_line = if focus_year.to_i == selected_year.to_i
      "Current focus matches selected season baseline comparison."
    else
      "#{focus_year_label} value#{context_suffix}: #{fmt_val.call(focus_value, kind)} (#{fmt_delta.call(focus_delta, kind)} vs #{baseline_year_label})."
    end

    section_title = case section
    when "tax"
      "League Tax Rates"
    when "minimum"
      "League Salary Scales"
    when "rookie"
      "Rookie Scale Amounts"
    else
      "League System Values"
    end
    pivot_pressure = section == "tax" ? "over_tax" : "all"

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
      selected_value_label: fmt_val.call(selected_value, kind),
      baseline_value_label: fmt_val.call(baseline_value, kind),
      focus_value_label: fmt_val.call(focus_value, kind),
      selected_delta_label: fmt_delta.call(selected_delta, kind),
      selected_delta_variant: delta_variant(selected_delta),
      focus_delta_label: fmt_delta.call(focus_delta, kind),
      focus_delta_variant: delta_variant(focus_delta),
      summary_line:,
      focus_line:,
      context_label:,
      bracket_label: context_label,
      rookie_detail_rows:,
      source_table: case section
      when "tax"
        "pcms.league_tax_rates"
      when "minimum"
        "pcms.league_salary_scales"
      when "rookie"
        "pcms.rookie_scale_amounts"
      else
        "pcms.league_system_values"
      end,
      pivot_links: [
        {
          label: "Open Team Summary (#{selected_year_label})",
          href: team_summary_path.call(selected_year, pivot_pressure)
        },
        {
          label: "Open canonical System Values view",
          href: system_values_path.call(state_params)
        }
      ],
      overlay_lower:,
      overlay_upper:
    }
  end

  def build_metric_finder_options(selected_year:, selected_system_row:, selected_tax_rows:, selected_salary_rows:, selected_rookie_rows:, format_currency:, format_year_label:, system_metric_defs:, tax_metric_defs:, rookie_metric_defs:, section_labels:)
    options = []
    selected_year_label = format_year_label.call(selected_year)
    fmt_val = ->(v, k) { format_metric_value(v, k, format_currency:) }

    system_metric_defs.each do |metric_key, definition|
      selected_value = selected_system_row&.[](metric_key)
      options << {
        section: "system",
        section_label: section_labels.fetch("system"),
        metric_label: definition.fetch(:label),
        context_label: selected_year_label,
        value: metric_finder_value(
          section: "system",
          metric: metric_key,
          year: selected_year,
          lower: "",
          upper: "",
          anchor_id: system_row_anchor(selected_year)
        ),
        label: "#{definition.fetch(:label)} · #{selected_year_label} · #{fmt_val.call(selected_value, definition.fetch(:kind))}"
      }
    end

    selected_tax_rows.each do |row|
      lower = row["lower_limit"]
      upper = row["upper_limit"]
      lower_token = lower.present? ? format("%.0f", lower.to_f) : ""
      upper_token = upper.present? ? format("%.0f", upper.to_f) : ""

      lower_label = format_currency.call(lower)
      upper_label = upper.present? ? format_currency.call(upper) : "∞"
      bracket_label = "#{lower_label}–#{upper_label}"

      tax_metric_defs.each do |metric_key, definition|
        options << {
          section: "tax",
          section_label: section_labels.fetch("tax"),
          metric_label: definition.fetch(:label),
          context_label: "#{bracket_label} · #{selected_year_label}",
          value: metric_finder_value(
            section: "tax",
            metric: metric_key,
            year: selected_year,
            lower: lower_token,
            upper: upper_token,
            anchor_id: tax_row_anchor(selected_year, lower: lower_token, upper: upper_token)
          ),
          label: "#{definition.fetch(:label)} · #{bracket_label} · #{selected_year_label}"
        }
      end
    end

    selected_salary_rows.each do |row|
      yos = row["years_of_service"].to_i
      value = row["minimum_salary_amount"]

      options << {
        section: "minimum",
        section_label: section_labels.fetch("minimum"),
        metric_label: "Minimum Salary",
        context_label: "YOS #{yos} · #{selected_year_label}",
        value: metric_finder_value(
          section: "minimum",
          metric: "minimum_salary_amount",
          year: selected_year,
          lower: yos,
          upper: "",
          anchor_id: minimum_row_anchor(selected_year, yos:)
        ),
        label: "YOS #{yos} · #{selected_year_label} · #{fmt_val.call(value, :currency)}"
      }
    end

    selected_rookie_rows.each do |row|
      pick = row["pick_number"].to_i

      rookie_metric_defs.each do |metric_key, definition|
        value = row[metric_key]

        options << {
          section: "rookie",
          section_label: section_labels.fetch("rookie"),
          metric_label: definition.fetch(:label),
          context_label: "Pick #{pick} · #{selected_year_label}",
          value: metric_finder_value(
            section: "rookie",
            metric: metric_key,
            year: selected_year,
            lower: pick,
            upper: "",
            anchor_id: rookie_row_anchor(selected_year, pick:)
          ),
          label: "Pick #{pick} · #{definition.fetch(:label)} · #{selected_year_label} · #{fmt_val.call(value, definition.fetch(:kind))}"
        }
      end
    end

    options
  end

  def metric_finder_value_for_overlay(overlay_signals, metric_finder_options)
    section = overlay_signals.fetch(:section, "").to_s
    metric = overlay_signals.fetch(:metric, "").to_s
    year = overlay_signals.fetch(:year, "").to_s
    lower = overlay_signals.fetch(:lower, "").to_s
    upper = overlay_signals.fetch(:upper, "").to_s

    return "" if section.blank? || metric.blank? || year.blank?

    anchor_id = case section
    when "system"
      system_row_anchor(year)
    when "tax"
      tax_row_anchor(year, lower:, upper:)
    when "minimum"
      minimum_row_anchor(year, yos: lower)
    when "rookie"
      rookie_row_anchor(year, pick: lower)
    end

    return "" if anchor_id.blank?

    candidate = metric_finder_value(section:, metric:, year:, lower:, upper:, anchor_id:)
    metric_finder_options.any? { |option| option[:value] == candidate } ? candidate : ""
  end

  def build_quick_metric_cards(selected_system_row:, baseline_system_row:, selected_tax_rows:, baseline_tax_rows:, selected_year:, format_currency:, system_metric_defs:, tax_metric_defs:, **_)
    cards = []
    fmt_val = ->(v, k) { format_metric_value(v, k, format_currency:) }
    fmt_delta = ->(d, k) { format_metric_delta(d, k, format_currency:) }

    [
      ["Cap", "salary_cap_amount"],
      ["Tax", "tax_level_amount"],
      ["Apron 1", "tax_apron_amount"],
      ["NT MLE", "non_taxpayer_mid_level_amount"]
    ].each do |label, metric|
      definition = system_metric_defs.fetch(metric)
      selected_value = selected_system_row&.[](metric)
      baseline_value = baseline_system_row&.[](metric)
      delta = numeric_delta(selected_value, baseline_value)

      cards << {
        section: "system",
        metric:,
        label:,
        year: selected_year,
        lower: "",
        upper: "",
        value_label: fmt_val.call(selected_value, definition.fetch(:kind)),
        delta_label: fmt_delta.call(delta, definition.fetch(:kind)),
        delta_variant: delta_variant(delta)
      }
    end

    top_bracket = selected_tax_rows.max_by { |row| row["lower_limit"].to_f }
    if top_bracket.present?
      metric = "tax_rate_non_repeater"
      definition = tax_metric_defs.fetch(metric)

      lower = top_bracket["lower_limit"]
      upper = top_bracket["upper_limit"]

      baseline_bracket = tax_row_for_bracket(baseline_tax_rows, lower: lower.to_f, upper: upper&.to_f)
      delta = numeric_delta(top_bracket[metric], baseline_bracket&.[](metric))

      lower_label = format_currency.call(lower)
      upper_label = upper.present? ? format_currency.call(upper) : "∞"

      cards << {
        section: "tax",
        metric:,
        label: "Top NR #{lower_label}–#{upper_label}",
        year: selected_year,
        lower: lower.present? ? format("%.0f", lower.to_f) : "",
        upper: upper.present? ? format("%.0f", upper.to_f) : "",
        value_label: fmt_val.call(top_bracket[metric], definition.fetch(:kind)),
        delta_label: fmt_delta.call(delta, definition.fetch(:kind)),
        delta_variant: delta_variant(delta)
      }
    end

    cards
  end

  def build_section_shift_cards(selected_system_row:, baseline_system_row:, selected_tax_rows:, baseline_tax_rows:, selected_salary_rows:, baseline_salary_rows:, selected_rookie_rows:, baseline_rookie_rows:, format_currency:)
    minimum_selected = minimum_salary_row(selected_salary_rows)
    minimum_baseline = minimum_salary_row(baseline_salary_rows)
    rookie_selected = rookie_pick_one_row(selected_rookie_rows)
    rookie_baseline = rookie_pick_one_row(baseline_rookie_rows)

    [
      build_shift_card(
        key: "system",
        label: "System",
        metric_label: "Cap",
        delta: numeric_delta(selected_system_row&.[]("salary_cap_amount"), baseline_system_row&.[]("salary_cap_amount")),
        formatter: :currency,
        format_currency:
      ),
      build_shift_card(
        key: "tax",
        label: "Tax",
        metric_label: "Top NR",
        delta: numeric_delta(top_tax_rate(selected_tax_rows, "tax_rate_non_repeater"), top_tax_rate(baseline_tax_rows, "tax_rate_non_repeater")),
        formatter: :rate,
        format_currency:
      ),
      build_shift_card(
        key: "minimum",
        label: "Minimum",
        metric_label: "YOS 0",
        delta: numeric_delta(minimum_selected&.[]("minimum_salary_amount"), minimum_baseline&.[]("minimum_salary_amount")),
        formatter: :currency,
        format_currency:
      ),
      build_shift_card(
        key: "rookie",
        label: "Rookie",
        metric_label: "Pick 1",
        delta: numeric_delta(rookie_selected&.[]("salary_year_1"), rookie_baseline&.[]("salary_year_1")),
        formatter: :currency,
        format_currency:
      )
    ]
  end

  def build_shift_card(key:, label:, metric_label:, delta:, formatter:, format_currency:)
    {
      key:,
      label:,
      metric_label:,
      delta_label: format_shift_delta(delta, formatter, format_currency:),
      variant: shift_variant(delta)
    }
  end

  def resolve_metric_finder_shortlist(query:, metric_finder_options:, requested_cursor:, active_value:, section_rank:, shortlist_limit:)
    if query.blank?
      return { shortlist: [], cursor_value: "", cursor_index: 0 }
    end

    ranked = metric_finder_options.each_with_index.filter_map do |option, index|
      match = metric_shortlist_match_details(option:, query:)
      next unless match

      [
        match.fetch(:score),
        section_rank.fetch(option[:section].to_s, 99),
        index,
        option.merge(match_reason: match.fetch(:reason))
      ]
    end

    shortlist = ranked
      .sort_by { |entry| entry[0..2] }
      .first(shortlist_limit)
      .map(&:last)

    preferred_cursor = if requested_cursor.present? && shortlist.any? { |option| option[:value] == requested_cursor }
      requested_cursor
    elsif active_value.present? && shortlist.any? { |option| option[:value] == active_value }
      active_value
    else
      shortlist.first&.dig(:value).to_s
    end

    cursor_value = preferred_cursor.to_s
    cursor_index = shortlist.find_index { |option| option[:value] == cursor_value } || 0

    { shortlist:, cursor_value:, cursor_index: }
  end
end
