require "test_helper"

class EntitiesAgenciesShowTest < ActionDispatch::IntegrationTest
  parallelize(workers: 1)

  MODERN_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36".freeze

  setup do
    host! "localhost"
  end

  test "agency show renders roster distribution and historical sections as flex lanes" do
    with_stubbed_agency_show do
      get "/agencies/summit-sports", headers: modern_headers

      assert_response :success

      roster = section_fragment(response.body, "agent-roster")
      distribution = section_fragment(response.body, "team-distribution")
      historical = section_fragment(response.body, "historical")

      assert roster.present?
      assert distribution.present?
      assert historical.present?

      assert_no_match(/<table/i, roster)
      assert_no_match(/<table/i, distribution)
      assert_no_match(/<table/i, historical)

      assert_includes roster, "Agent roster lanes"
      assert_includes roster, "active"
      assert_includes roster, "inactive"
      assert_includes roster, "Book '25"

      assert_includes distribution, "Team distribution lanes"
      assert_includes distribution, "% clients"
      assert_includes distribution, "% agency cap"

      assert_includes historical, "Book by season"
      assert_includes historical, "Top clients by cap (2025)"
      assert_includes historical, "Season 25-26"
      assert_includes historical, "Direct pivots across player, agent, and team context"

      assert_match(%r{href="/agents/11"}, response.body)
      assert_match(%r{href="/players/101"}, response.body)
      assert_match(%r{href="/teams/por"}, response.body)

      assert_includes response.body, "id=\"agent-roster\""
      assert_includes response.body, "id=\"team-distribution\""
      assert_includes response.body, "id=\"historical\""
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

        @book_by_year = [
          {
            "salary_year" => 2025,
            "player_count" => 7,
            "cap_total" => 95_500_000,
            "tax_total" => 102_000_000,
            "apron_total" => 97_000_000
          },
          {
            "salary_year" => 2026,
            "player_count" => 5,
            "cap_total" => 71_000_000,
            "tax_total" => 74_500_000,
            "apron_total" => 72_000_000
          }
        ]

        @top_clients = [
          {
            "player_id" => 101,
            "player_name" => "Alpha Guard",
            "team_code" => "POR",
            "team_id" => 1_610_612_757,
            "team_name" => "Portland Trail Blazers",
            "agent_id" => 11,
            "agent_name" => "Alpha Agent",
            "cap_2025" => 41_500_000,
            "total_salary_from_2025" => 88_000_000
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
            "total_salary_from_2025" => 36_500_000
          }
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
