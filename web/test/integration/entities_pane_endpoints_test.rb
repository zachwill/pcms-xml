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
        ActiveRecord::Result.new([ "draft_year" ], [ [ 2027 ], [ 2026 ], [ 2025 ] ])
      elsif sql.include?("FROM pcms.teams") && sql.include?("team_name NOT LIKE 'Non-NBA%'")
        ActiveRecord::Result.new(
          [ "team_code", "team_name" ],
          [
            [ "BOS", "Boston Celtics" ],
            [ "POR", "Portland Trail Blazers" ],
            [ "LAL", "Los Angeles Lakers" ]
          ]
        )
      elsif sql.include?("WITH picks AS") && sql.include?("FROM pcms.vw_draft_pick_assets v")
        ActiveRecord::Result.new(
          [
            "draft_year", "draft_round", "original_team_code", "current_team_code",
            "original_team_name", "current_team_name", "is_swap", "has_conditional",
            "has_forfeited", "protections_summary", "pick_status"
          ],
          [
            [ 2027, 1, "BOS", "POR", "Boston Celtics", "Portland Trail Blazers", false, true, false, "Top-4 protected to POR", "Conditional" ],
            [ 2027, 2, "LAL", "LAL", "Los Angeles Lakers", "Los Angeles Lakers", true, false, false, nil, "Own" ]
          ]
        )
      elsif sql.include?("FROM pcms.draft_selections ds") && sql.include?("WHERE ds.transaction_id = 777001")
        ActiveRecord::Result.new(
          [
            "transaction_id", "draft_year", "draft_round", "pick_number", "player_id",
            "player_name", "drafting_team_id", "drafting_team_code", "drafting_team_name",
            "transaction_date", "trade_id", "transaction_type_lk"
          ],
          [
            [ 777001, 2026, 1, 12, 203507, "Prospect One", 1610612738, "BOS", "Boston Celtics", "2026-06-25", 88001, "DDRFT" ]
          ]
        )
      elsif sql.include?("FROM pcms.draft_selections ds") && sql.include?("WHERE ds.draft_year = 2027") && sql.include?("AND ds.draft_round = 1")
        ActiveRecord::Result.new(
          [ "transaction_id", "player_id", "pick_number", "transaction_date" ],
          [ [ 777001, 203507, 12, "2026-06-25" ] ]
        )
      elsif sql.include?("FROM pcms.draft_selections ds")
        ActiveRecord::Result.new(
          [
            "transaction_id", "draft_year", "draft_round", "pick_number", "player_id",
            "player_name", "drafting_team_id", "drafting_team_code", "drafting_team_name",
            "transaction_date", "trade_id", "transaction_type_lk"
          ],
          [
            [ 777001, 2026, 1, 12, 203507, "Prospect One", 1610612738, "BOS", "Boston Celtics", "2026-06-25", 88001, "DDRFT" ]
          ]
        )
      elsif sql.include?("WITH pick AS") && sql.include?("FROM pcms.vw_draft_pick_assets v")
        ActiveRecord::Result.new(
          [
            "draft_year", "draft_round", "original_team_code", "current_team_code",
            "is_swap", "has_conditional", "has_forfeited", "protections_summary",
            "pick_status", "original_team_name", "current_team_name"
          ],
          [
            [ 2027, 1, "BOS", "POR", false, true, false, "Top-4 protected to POR", "Conditional", "Boston Celtics", "Portland Trail Blazers" ]
          ]
        )
      elsif sql.include?("FROM pcms.vw_draft_pick_assets") && sql.include?("ORDER BY asset_slot, sub_asset_slot")
        ActiveRecord::Result.new(
          [
            "asset_slot", "sub_asset_slot", "asset_type", "display_text", "raw_part",
            "counterparty_team_code", "is_swap", "is_conditional", "is_forfeited",
            "endnote_explanation", "trade_id"
          ],
          [
            [ 1, 1, "TO", "To POR: top-4 protected", "To POR", "POR", false, true, false, "Conveys if outside top four", 88001 ],
            [ 2, 1, "OWN", "Own if not conveyed", "Own", nil, false, false, false, nil, nil ]
          ]
        )
      elsif sql.include?("FROM pcms.draft_pick_trades dpt")
        ActiveRecord::Result.new(
          [
            "id", "trade_id", "trade_date", "from_team_code", "to_team_code",
            "original_team_code", "is_swap", "is_future", "is_conditional", "conditional_type_lk"
          ],
          [
            [ 91001, 88001, "2025-02-07", "BOS", "POR", "BOS", false, true, true, "TOP4" ]
          ]
        )
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
      get "/drafts/pane", params: { view: "picks", year: "2027", round: "all", team: "" }, headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="drafts-results"'
      assert_not_includes response.body, "DoubleRenderError"
    end
  end

  test "drafts index exposes commandbar ownership controls and sidebar base" do
    with_fake_connection do
      get "/drafts", params: { view: "picks", year: "2027", round: "all", team: "" }, headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="draft-team-select"'
      assert_includes response.body, 'id="draft-year-select"'
      assert_includes response.body, 'id="rightpanel-base"'
    end
  end

  test "drafts refresh uses one sse response for multi-region patches" do
    with_fake_connection do
      get "/drafts/sse/refresh", params: { view: "picks", year: "2027", round: "all", team: "" }, headers: modern_headers

      assert_response :success
      assert_includes response.media_type, "text/event-stream"
      assert_includes response.body, "event: datastar-patch-elements"
      assert_includes response.body, 'id="drafts-results"'
      assert_includes response.body, 'id="rightpanel-base"'
      assert_includes response.body, 'id="rightpanel-overlay"'
      assert_includes response.body, "event: datastar-patch-signals"
    end
  end

  test "drafts sidebar pick and selection endpoints return overlays and clear works" do
    with_fake_connection do
      get "/drafts/sidebar/pick", params: { team: "BOS", year: "2027", round: "1" }, headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="rightpanel-overlay"'
      assert_includes response.body, "Open canonical draft-pick page"

      get "/drafts/sidebar/selection/777001", headers: modern_headers

      assert_response :success
      assert_includes response.body, 'id="rightpanel-overlay"'
      assert_includes response.body, "Open canonical draft-selection page"

      get "/drafts/sidebar/clear", headers: modern_headers

      assert_response :success
      assert_equal '<div id="rightpanel-overlay"></div>', response.body.strip
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
