require "test_helper"

class EntitiesTeamsIndexTest < ActionDispatch::IntegrationTest
  parallelize(workers: 1)

  MODERN_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36".freeze

  class FakeConnection
    def quote(value)
      case value
      when nil
        "NULL"
      when Numeric
        value.to_s
      when true
        "TRUE"
      when false
        "FALSE"
      else
        "'#{value.to_s.gsub("'", "''")}'"
      end
    end

    def exec_query(sql)
      if sql.include?("FROM pcms.teams t") && sql.include?("LEFT JOIN pcms.team_salary_warehouse tsw")
        if sql.include?("t.team_id = 1610612738")
          ActiveRecord::Result.new(team_columns, [bos_row])
        else
          ActiveRecord::Result.new(team_columns, [bos_row, por_row])
        end
      else
        ActiveRecord::Result.new([], [])
      end
    end

    private

    def team_columns
      [
        "team_id", "team_code", "team_name", "city", "conference_name", "division_name",
        "salary_year", "cap_total", "cap_total_hold", "tax_total", "apron_total",
        "salary_cap_amount", "tax_level_amount", "tax_apron_amount", "tax_apron2_amount",
        "cap_space", "room_under_tax", "room_under_apron1", "room_under_apron2",
        "is_taxpayer", "is_repeater_taxpayer", "is_subject_to_apron", "apron_level_lk",
        "roster_row_count", "two_way_row_count", "luxury_tax_owed", "pressure_bucket", "pressure_rank"
      ]
    end

    def bos_row
      [
        1610612738, "BOS", "Boston Celtics", "Boston", "Eastern", "Atlantic",
        2025, 192_000_000, 195_000_000, 210_000_000, 210_000_000,
        141_000_000, 172_000_000, 179_000_000, 190_000_000,
        -54_000_000, -38_000_000, -31_000_000, -19_000_000,
        true, true, true, "APRON2",
        15, 2, 82_000_000, "over_apron2", 4
      ]
    end

    def por_row
      [
        1610612757, "POR", "Portland Trail Blazers", "Portland", "Western", "Northwest",
        2025, 128_000_000, 129_000_000, 132_000_000, 132_000_000,
        141_000_000, 172_000_000, 179_000_000, 190_000_000,
        12_000_000, 40_000_000, 47_000_000, 58_000_000,
        false, false, false, "NONE",
        14, 3, 0, "under_cap", 0
      ]
    end
  end

  setup do
    host! "localhost"
  end

  test "teams index renders pressure commandbar knobs and sidebar base" do
    with_fake_connection do
      get "/teams", headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="teams-pressure-over-tax"'
      assert_includes response.body, 'id="teams-conference-eastern"'
      assert_includes response.body, 'id="maincanvas"'
      assert_includes response.body, 'id="rightpanel-base"'
    end
  end

  test "teams refresh uses one sse response for multi-region patches" do
    with_fake_connection do
      get "/teams/sse/refresh", params: {
        q: "",
        conference: "ALL",
        pressure: "all",
        sort: "pressure_desc"
      }, headers: modern_headers

      assert_response :success
      assert_includes response.media_type, "text/event-stream"
      assert_includes response.body, "event: datastar-patch-elements"
      assert_includes response.body, "id=\"maincanvas\""
      assert_includes response.body, "id=\"rightpanel-base\""
      assert_includes response.body, "id=\"rightpanel-overlay\""
      assert_includes response.body, "event: datastar-patch-signals"
    end
  end

  test "teams sidebar returns overlay and clear endpoint empties overlay" do
    with_fake_connection do
      get "/teams/sidebar/1610612738", headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="rightpanel-overlay"'
      assert_includes response.body, "Open Team Summary at this team"

      get "/teams/sidebar/clear", headers: modern_headers

      assert_response :success
      assert_equal '<div id="rightpanel-overlay"></div>', response.body.strip
    end
  end

  private

  def with_fake_connection
    fake_connection = FakeConnection.new
    singleton = class << ActiveRecord::Base; self; end

    singleton.alias_method :__test_original_connection__, :connection
    singleton.define_method(:connection) { fake_connection }

    yield
  ensure
    if singleton.method_defined?(:__test_original_connection__)
      singleton.alias_method :connection, :__test_original_connection__
      singleton.remove_method :__test_original_connection__
    end
  end

  def modern_headers
    { "User-Agent" => MODERN_USER_AGENT }
  end
end
