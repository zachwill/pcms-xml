require "test_helper"

class EntitiesAgentsShowTest < ActionDispatch::IntegrationTest
  parallelize(workers: 1)

  MODERN_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36".freeze

  setup do
    host! "localhost"
  end

  test "agent show renders client cohorts as dense flex lanes" do
    with_stubbed_agent_workspace do
      get "/agents/alpha-agent", headers: modern_headers

      assert_response :success

      cohorts = section_fragment(response.body, "client-cohorts")
      roster = section_fragment(response.body, "clients")

      assert cohorts.present?
      assert roster.present?

      assert_no_match(/<table/i, cohorts)
      assert_no_match(/<table/i, roster)

      assert_includes cohorts, "Max-level anchors"
      assert_includes cohorts, "Expiring through 2027"
      assert_includes cohorts, "Restricted / no-trade / kicker"
      assert_includes cohorts, "Two-way clients"
      assert_includes cohorts, "Alpha Guard"
      assert_includes cohorts, "POR"
      assert_includes cohorts, "href=\"/agents/alpha-agent?cohorts=max#client-cohorts\""
      assert_includes cohorts, "href=\"/agents/alpha-agent?cohorts=two_way#client-cohorts\""

      assert_match(%r{href="/players/}, cohorts)
      assert_match(%r{href="/teams/}, cohorts)

      assert_includes response.body, "expiring ≤27"
      assert_includes response.body, "id=\"agent-header\""
      assert_includes response.body, "All clients"
    end
  end

  test "agent show applies cohort query filters across cohort lanes and roster" do
    with_stubbed_agent_workspace do
      get "/agents/alpha-agent?cohorts=max,restricted", headers: modern_headers

      assert_response :success

      cohorts = section_fragment(response.body, "client-cohorts")
      roster = section_fragment(response.body, "clients")

      assert cohorts.present?
      assert roster.present?

      assert_includes cohorts, "2 of 4 cohorts"
      assert_includes cohorts, "2 matching clients"
      assert_includes cohorts, "Max-level anchors"
      assert_includes cohorts, "Restricted / no-trade / kicker"
      assert_no_match(/id=\"cohort-expiring\"/, cohorts)
      assert_no_match(/id=\"cohort-two-way\"/, cohorts)

      assert_includes roster, "Filtered clients"
      assert_includes roster, "2 of 3 players"
      assert_includes roster, "Alpha Guard"
      assert_includes roster, "Beta Wing"
      assert_no_match(/Gamma Prospect/, roster)
      assert_includes response.body, "href=\"/agents/alpha-agent#client-cohorts\""
    end
  end

  private

  def section_fragment(body, section_id)
    body[/<section id="#{Regexp.escape(section_id)}"[\s\S]*?<\/section>/]
  end

  def with_stubbed_agent_workspace
    controller_class = Entities::AgentsController

    controller_class.class_eval do
      alias_method :__agents_show_test_original_show__, :show

      define_method :show do
        @agent_id = 11
        @agent_slug = "alpha-agent"

        @agent = {
          "agent_id" => 11,
          "full_name" => "Alpha Agent",
          "agency_id" => 501,
          "agency_name" => "Summit Sports",
          "is_active" => true,
          "is_certified" => true
        }

        raw_cohorts = Array(params[:cohorts])
        raw_cohorts = [params[:cohorts]] if raw_cohorts.empty?
        @show_cohort_filters = raw_cohorts
          .flat_map { |value| value.to_s.split(",") }
          .map { |value| value.to_s.strip.downcase.tr("-", "_") }
          .select { |value| %w[max expiring restricted two_way].include?(value) }
          .uniq

        @clients = [
          {
            "player_id" => 101,
            "player_name" => "Alpha Guard",
            "team_code" => "POR",
            "team_id" => 1_610_612_757,
            "team_name" => "Portland Trail Blazers",
            "age" => 28,
            "years_of_service" => 7,
            "cap_2025" => 49_500_000,
            "cap_2026" => 52_000_000,
            "cap_2027" => 0,
            "cap_2028" => 0,
            "cap_2029" => 0,
            "cap_2030" => 0,
            "total_salary_from_2025" => 101_500_000,
            "pct_cap_2025" => 0.31,
            "is_two_way" => false,
            "is_min_contract" => false,
            "is_no_trade" => false,
            "is_trade_bonus" => false,
            "trade_bonus_percent" => nil,
            "is_trade_restricted_now" => false,
            "option_2026" => "PLYR",
            "option_2027" => nil,
            "option_2028" => nil,
            "contract_type_code" => "MAX"
          },
          {
            "player_id" => 102,
            "player_name" => "Beta Wing",
            "team_code" => "LAL",
            "team_id" => 1_610_612_747,
            "team_name" => "Los Angeles Lakers",
            "age" => 30,
            "years_of_service" => 8,
            "cap_2025" => 18_000_000,
            "cap_2026" => 0,
            "cap_2027" => 0,
            "cap_2028" => 0,
            "cap_2029" => 0,
            "cap_2030" => 0,
            "total_salary_from_2025" => 18_000_000,
            "pct_cap_2025" => 0.12,
            "is_two_way" => false,
            "is_min_contract" => false,
            "is_no_trade" => true,
            "is_trade_bonus" => true,
            "trade_bonus_percent" => 10,
            "is_trade_restricted_now" => true,
            "option_2026" => nil,
            "option_2027" => nil,
            "option_2028" => nil,
            "contract_type_code" => "VET"
          },
          {
            "player_id" => 103,
            "player_name" => "Gamma Prospect",
            "team_code" => "BKN",
            "team_id" => 1_610_612_751,
            "team_name" => "Brooklyn Nets",
            "age" => 22,
            "years_of_service" => 1,
            "cap_2025" => 0,
            "cap_2026" => 0,
            "cap_2027" => 0,
            "cap_2028" => 0,
            "cap_2029" => 0,
            "cap_2030" => 0,
            "total_salary_from_2025" => 0,
            "pct_cap_2025" => 0,
            "is_two_way" => true,
            "is_min_contract" => false,
            "is_no_trade" => false,
            "is_trade_bonus" => false,
            "trade_bonus_percent" => nil,
            "is_trade_restricted_now" => false,
            "option_2026" => nil,
            "option_2027" => nil,
            "option_2028" => nil,
            "contract_type_code" => "2W"
          }
        ]

        @client_rollup = {
          "standard_count" => 2,
          "two_way_count" => 1,
          "client_count" => 3,
          "team_count" => 3,
          "rookie_scale_count" => 0,
          "max_contract_count" => 1,
          "min_contract_count" => 0,
          "no_trade_count" => 1,
          "trade_kicker_count" => 1,
          "restricted_now_count" => 1,
          "expiring_2025" => 1,
          "expiring_2026" => 1,
          "expiring_2027" => 0,
          "player_option_count" => 1,
          "team_option_count" => 0,
          "cap_2025_total" => 67_500_000,
          "total_salary_from_2025" => 119_500_000,
          "cap_2025_total_percentile" => 0.78,
          "client_count_percentile" => 0.61,
          "max_contract_count_percentile" => 0.7
        }

        @team_distribution = [
          {
            "team_code" => "POR",
            "team_id" => 1_610_612_757,
            "team_name" => "Portland Trail Blazers",
            "client_count" => 1,
            "cap_2025_total" => 49_500_000,
            "cap_2026_total" => 52_000_000
          },
          {
            "team_code" => "LAL",
            "team_id" => 1_610_612_747,
            "team_name" => "Los Angeles Lakers",
            "client_count" => 1,
            "cap_2025_total" => 18_000_000,
            "cap_2026_total" => 0
          }
        ]

        @book_by_year = [
          { "salary_year" => 2025, "player_count" => 2, "cap_total" => 67_500_000 },
          { "salary_year" => 2026, "player_count" => 1, "cap_total" => 52_000_000 }
        ]

        @historical_footprint_rollup = {
          "historical_client_count" => 9,
          "contract_count" => 16,
          "version_count" => 24,
          "first_signing_date" => Date.new(2012, 7, 1),
          "last_signing_date" => Date.new(2025, 7, 1),
          "historical_not_current_client_count" => 6
        }

        @historical_signing_trend = [
          { "signing_year" => 2025, "distinct_clients" => 2, "contract_count" => 3, "version_count" => 4 },
          { "signing_year" => 2024, "distinct_clients" => 1, "contract_count" => 2, "version_count" => 2 }
        ]

        render :show, layout: false
      end
    end

    yield
  ensure
    controller_class.class_eval do
      if method_defined?(:__agents_show_test_original_show__)
        alias_method :show, :__agents_show_test_original_show__
        remove_method :__agents_show_test_original_show__
      end
    end
  end

  def modern_headers
    { "User-Agent" => MODERN_USER_AGENT }
  end
end
