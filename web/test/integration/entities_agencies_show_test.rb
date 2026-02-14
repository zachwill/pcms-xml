require "test_helper"

class EntitiesAgenciesShowTest < ActionDispatch::IntegrationTest
  parallelize(workers: 1)

  MODERN_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36".freeze

  setup do
    host! "localhost"
  end

  test "agency show renders cohort slices and historical pivots as flex lanes" do
    with_stubbed_agency_show do
      get "/agencies/summit-sports", headers: modern_headers

      assert_response :success

      roster = section_fragment(response.body, "agent-roster")
      historical = section_fragment(response.body, "historical")

      assert roster.present?
      assert historical.present?

      assert_no_match(/<table/i, roster)
      assert_no_match(/<table/i, historical)

      assert_includes roster, "Cohort slices"
      assert_includes roster, "Max-level anchors"
      assert_includes roster, "Expiring through 2027"
      assert_includes roster, "Restricted / no-trade / kicker"
      assert_includes roster, "Option-heavy clients"
      assert_includes roster, "href=\"/agencies/summit-sports?cohorts=max#agent-roster\""
      assert_includes roster, "href=\"/agencies/summit-sports?cohorts=option_heavy#agent-roster\""

      assert_includes historical, "Book by season"
      assert_includes historical, "Top clients by cap (2025)"
      assert_includes historical, "Season 25-26"
      assert_includes historical, "Direct pivots across player, agent, and team context"

      assert_match(%r{href="/agents/11"}, response.body)
      assert_match(%r{href="/players/101"}, response.body)
      assert_match(%r{href="/teams/por"}, response.body)

      assert_includes response.body, "id=\"cohort-max\""
      assert_includes response.body, "id=\"cohort-expiring\""
      assert_includes response.body, "id=\"cohort-restricted\""
      assert_includes response.body, "id=\"cohort-option-heavy\""
    end
  end

  test "agency show applies cohort query filters to roster slices and historical context" do
    with_stubbed_agency_show do
      get "/agencies/summit-sports?cohorts=max,restricted", headers: modern_headers

      assert_response :success

      roster = section_fragment(response.body, "agent-roster")
      historical = section_fragment(response.body, "historical")

      assert roster.present?
      assert historical.present?

      assert_includes roster, "2 of 4 slices"
      assert_includes roster, "2 matching clients"
      assert_includes roster, "Max-level anchors"
      assert_includes roster, "Restricted / no-trade / kicker"
      assert_no_match(/id=\"cohort-expiring\"/, roster)
      assert_no_match(/id=\"cohort-option-heavy\"/, roster)

      assert_includes historical, "Slice context: Max + Restricted"
      assert_includes historical, "Slice clients by cap (2025)"
      assert_includes historical, "href=\"/agencies/summit-sports#historical\""
      assert_no_match(/Gamma Prospect/, "#{roster} #{historical}")
    end
  end

  private

  def section_fragment(body, section_id)
    body[/<section id="#{Regexp.escape(section_id)}"[\s\S]*?<\/section>/]
  end

  def with_stubbed_agency_show
    controller_class = Entities::AgenciesController

    controller_class.class_eval do
      alias_method :__agencies_show_test_original_show__, :show

      define_method :show do
        @agency_id = 501
        @agency_slug = "summit-sports"

        raw_cohorts = Array(params[:cohorts])
        raw_cohorts = [params[:cohorts]] if raw_cohorts.empty?
        @show_cohort_filters = raw_cohorts
          .flat_map { |value| value.to_s.split(",") }
          .map { |value| value.to_s.strip.downcase.tr("-", "_") }
          .select { |value| %w[max expiring restricted option_heavy].include?(value) }
          .uniq

        @agency = {
          "agency_id" => 501,
          "agency_name" => "Summit Sports",
          "is_active" => true
        }

        @agency_rollup = {
          "agent_count" => 3,
          "client_count" => 7,
          "cap_2025_total" => 95_500_000,
          "total_salary_from_2025" => 161_000_000,
          "agent_count_percentile" => 0.67,
          "client_count_percentile" => 0.72,
          "cap_2025_total_percentile" => 0.81
        }

        @agents = [
          {
            "agent_id" => 11,
            "full_name" => "Alpha Agent",
            "is_active" => true,
            "client_count" => 4,
            "cap_2025_total" => 62_500_000,
            "total_salary_from_2025" => 112_000_000
          },
          {
            "agent_id" => 12,
            "full_name" => "Beta Agent",
            "is_active" => false,
            "client_count" => 3,
            "cap_2025_total" => 33_000_000,
            "total_salary_from_2025" => 49_000_000
          }
        ]

        @team_distribution = [
          {
            "team_code" => "POR",
            "team_id" => 1_610_612_757,
            "team_name" => "Portland Trail Blazers",
            "client_count" => 3,
            "cap_2025_total" => 44_000_000
          },
          {
            "team_code" => "LAL",
            "team_id" => 1_610_612_747,
            "team_name" => "Los Angeles Lakers",
            "client_count" => 2,
            "cap_2025_total" => 28_000_000
          }
        ]

        @clients = [
          {
            "player_id" => 101,
            "player_name" => "Alpha Guard",
            "team_code" => "POR",
            "team_id" => 1_610_612_757,
            "team_name" => "Portland Trail Blazers",
            "agent_id" => 11,
            "agent_name" => "Alpha Agent",
            "cap_2025" => 41_500_000,
            "cap_2026" => 44_000_000,
            "cap_2027" => 0,
            "cap_2028" => 0,
            "cap_2029" => 0,
            "cap_2030" => 0,
            "total_salary_from_2025" => 88_000_000,
            "pct_cap_2025" => 0.31,
            "is_two_way" => false,
            "is_no_trade" => false,
            "is_trade_bonus" => false,
            "is_trade_restricted_now" => false,
            "option_2025" => nil,
            "option_2026" => "PLYR",
            "option_2027" => nil,
            "option_2028" => nil
          },
          {
            "player_id" => 102,
            "player_name" => "Beta Wing",
            "team_code" => "LAL",
            "team_id" => 1_610_612_747,
            "team_name" => "Los Angeles Lakers",
            "agent_id" => 12,
            "agent_name" => "Beta Agent",
            "cap_2025" => 22_000_000,
            "cap_2026" => 0,
            "cap_2027" => 0,
            "cap_2028" => 0,
            "cap_2029" => 0,
            "cap_2030" => 0,
            "total_salary_from_2025" => 36_500_000,
            "pct_cap_2025" => 0.13,
            "is_two_way" => false,
            "is_no_trade" => true,
            "is_trade_bonus" => true,
            "is_trade_restricted_now" => true,
            "option_2025" => nil,
            "option_2026" => nil,
            "option_2027" => nil,
            "option_2028" => nil
          },
          {
            "player_id" => 103,
            "player_name" => "Gamma Prospect",
            "team_code" => "BKN",
            "team_id" => 1_610_612_751,
            "team_name" => "Brooklyn Nets",
            "agent_id" => 11,
            "agent_name" => "Alpha Agent",
            "cap_2025" => 12_000_000,
            "cap_2026" => 11_000_000,
            "cap_2027" => 10_000_000,
            "cap_2028" => 0,
            "cap_2029" => 0,
            "cap_2030" => 0,
            "total_salary_from_2025" => 33_000_000,
            "pct_cap_2025" => 0.08,
            "is_two_way" => false,
            "is_no_trade" => false,
            "is_trade_bonus" => false,
            "is_trade_restricted_now" => false,
            "option_2025" => nil,
            "option_2026" => "TEAM",
            "option_2027" => "PLYR",
            "option_2028" => nil
          }
        ]

        @client_yearly_footprint = [
          { "player_id" => 101, "salary_year" => 2025, "cap_amount" => 41_500_000, "tax_amount" => 44_000_000, "apron_amount" => 42_000_000 },
          { "player_id" => 101, "salary_year" => 2026, "cap_amount" => 44_000_000, "tax_amount" => 46_000_000, "apron_amount" => 45_000_000 },
          { "player_id" => 102, "salary_year" => 2025, "cap_amount" => 22_000_000, "tax_amount" => 24_000_000, "apron_amount" => 23_000_000 },
          { "player_id" => 103, "salary_year" => 2025, "cap_amount" => 12_000_000, "tax_amount" => 13_000_000, "apron_amount" => 12_500_000 },
          { "player_id" => 103, "salary_year" => 2026, "cap_amount" => 11_000_000, "tax_amount" => 11_500_000, "apron_amount" => 11_250_000 }
        ]

        render :show, layout: false
      end
    end

    yield
  ensure
    controller_class.class_eval do
      if method_defined?(:__agencies_show_test_original_show__)
        alias_method :show, :__agencies_show_test_original_show__
        remove_method :__agencies_show_test_original_show__
      end
    end
  end

  def modern_headers
    { "User-Agent" => MODERN_USER_AGENT }
  end
end
