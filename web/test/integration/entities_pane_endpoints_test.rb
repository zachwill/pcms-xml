require "test_helper"

class EntitiesPaneEndpointsTest < ActionDispatch::IntegrationTest
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
      if sql.include?("SELECT DISTINCT draft_year FROM pcms.draft_selections")
        ActiveRecord::Result.new([ "draft_year" ], [ [ 2025 ], [ 2024 ] ])
      else
        ActiveRecord::Result.new([], [])
      end
    end
  end

  setup do
    host! "localhost"
  end

  test "drafts pane responds successfully without double render" do
    with_fake_connection do
      get "/drafts/pane", params: { view: "picks", year: "2025", round: "all", team: "" }, headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="drafts-results"'
      assert_not_includes response.body, "DoubleRenderError"
    end
  end

  test "trades pane responds successfully without double render" do
    with_fake_connection do
      get "/trades/pane", params: { daterange: "season", team: "" }, headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="trades-results"'
      assert_not_includes response.body, "DoubleRenderError"
    end
  end

  test "transactions pane responds successfully without double render" do
    with_fake_connection do
      get "/transactions/pane", params: {
        daterange: "season",
        team: "",
        signings: "1",
        waivers: "1",
        extensions: "1",
        other: "0"
      }, headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="transactions-results"'
      assert_not_includes response.body, "DoubleRenderError"
    end
  end

  test "trades index safely encodes team signal interpolation" do
    with_fake_connection do
      get "/trades", params: { daterange: "season", team: %q(AAA" onmouseover="X) }, headers: modern_headers

      assert_response :success

      root = css_select("#entity-directory").first
      refute_nil root
      assert_nil root["onmouseover"]

      signals = root["data-signals"]
      assert_includes signals, "tradedaterange: \"season\""
      assert_includes signals, 'tradeteam: "AAA\\" ONMOUSEOVER=\\"X"'
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
