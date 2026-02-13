require "test_helper"
require "uri"

class EntitiesAgenciesEntrypointTest < ActionDispatch::IntegrationTest
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
      if sql.include?("FROM pcms.agents_warehouse w")
        ActiveRecord::Result.new(agent_columns, [agent_row])
      elsif sql.include?("FROM pcms.agencies_warehouse w")
        ActiveRecord::Result.new(agency_columns, [agency_row])
      elsif sql.include?("FROM \"slugs\"")
        slug_columns = sql.include?("\"slugs\".\"entity_id\"") ? ["entity_id", "slug"] : ["slug"]
        ActiveRecord::Result.new(slug_columns, [])
      else
        ActiveRecord::Result.new([], [])
      end
    end

    private

    def agent_columns
      [
        "agent_id", "full_name", "agency_id", "agency_name", "is_active", "is_certified",
        "client_count", "standard_count", "two_way_count", "team_count",
        "book_total", "book_total_percentile", "max_contract_count", "max_contract_count_percentile",
        "expiring_in_window", "no_trade_count", "trade_kicker_count", "trade_restricted_count",
        "player_option_count", "team_option_count", "client_count_percentile", "team_count_percentile"
      ]
    end

    def agent_row
      [
        11, "Alpha Agent", 501, "Summit Sports", true, true,
        3, 2, 1, 2,
        45_000_000, 0.88, 1, 0.62,
        1, 1, 0, 1,
        1, 0, 0.86, 0.55
      ]
    end

    def agency_columns
      [
        "agency_id", "agency_name", "is_active", "agent_count", "client_count", "standard_count", "two_way_count", "team_count",
        "book_total", "book_total_percentile", "max_contract_count", "max_contract_count_percentile",
        "expiring_in_window", "no_trade_count", "trade_kicker_count", "trade_restricted_count",
        "player_option_count", "team_option_count", "agent_count_percentile", "client_count_percentile"
      ]
    end

    def agency_row
      [
        501, "Summit Sports", true, 2, 4, 3, 1, 3,
        52_000_000, 0.7, 1, 0.4,
        1, 1, 0, 1,
        1, 0, 0.5, 0.75
      ]
    end
  end

  setup do
    host! "localhost"
  end

  test "/agencies entry redirects to agencies lens and preserves query state" do
    get "/agencies", params: {
      active_only: "1",
      certified_only: "1",
      with_clients: "1",
      with_book: "1",
      with_restrictions: "1",
      with_expiring: "1",
      year: "2027",
      sort: "max",
      dir: "asc"
    }, headers: modern_headers

    assert_response :moved_permanently

    uri = URI.parse(response.location)
    query = Rack::Utils.parse_nested_query(uri.query)

    assert_equal "/agents", uri.path
    assert_equal "agencies", query["kind"]
    assert_equal "1", query["active_only"]
    assert_equal "1", query["certified_only"]
    assert_equal "1", query["with_clients"]
    assert_equal "1", query["with_book"]
    assert_equal "1", query["with_restrictions"]
    assert_equal "1", query["with_expiring"]
    assert_equal "2027", query["year"]
    assert_equal "max", query["sort"]
    assert_equal "asc", query["dir"]
  end

  test "agents commandbar exposes agencies entry path" do
    with_fake_connection do
      get "/agents", headers: modern_headers

      assert_response :success
      assert_select "#entity-nav-agencies[href='/agencies']", 1
    end
  end

  test "agencies lens marks agencies as active and keeps dense interactive rows" do
    with_fake_connection do
      get "/agents", params: { kind: "agencies" }, headers: modern_headers

      assert_response :success
      assert_select "#entity-nav-agencies.bg-primary", 1
      assert_select "#entity-nav-agents.bg-primary", 0
      assert_select "input#agent-directory-kind-agencies[checked]", 1
      assert_includes response.body, "Agency directory"
      assert_includes response.body, "@get('/agents/sidebar/agency/501')"
      assert_includes response.body, "/agencies/501"
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
