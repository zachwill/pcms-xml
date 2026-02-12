require "test_helper"

class SalaryBookViewsTest < ActionDispatch::IntegrationTest
  parallelize(workers: 1)

  MODERN_USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36".freeze

  class FakeConnection
    TEAM_ROWS = [
      ["ATL", "Atlanta Hawks", "Eastern", 1],
      ["BOS", "Boston Celtics", "Eastern", 2],
      ["BKN", "Brooklyn Nets", "Eastern", 3],
      ["CHA", "Charlotte Hornets", "Eastern", 4],
      ["CHI", "Chicago Bulls", "Eastern", 5],
      ["CLE", "Cleveland Cavaliers", "Eastern", 6],
      ["DAL", "Dallas Mavericks", "Western", 7],
      ["DEN", "Denver Nuggets", "Western", 8],
      ["DET", "Detroit Pistons", "Eastern", 9],
      ["GSW", "Golden State Warriors", "Western", 10],
      ["HOU", "Houston Rockets", "Western", 11],
      ["IND", "Indiana Pacers", "Eastern", 12],
      ["LAC", "LA Clippers", "Western", 13],
      ["LAL", "Los Angeles Lakers", "Western", 14],
      ["MEM", "Memphis Grizzlies", "Western", 15],
      ["MIA", "Miami Heat", "Eastern", 16],
      ["MIL", "Milwaukee Bucks", "Eastern", 17],
      ["MIN", "Minnesota Timberwolves", "Western", 18],
      ["NOP", "New Orleans Pelicans", "Western", 19],
      ["NYK", "New York Knicks", "Eastern", 20],
      ["OKC", "Oklahoma City Thunder", "Western", 21],
      ["ORL", "Orlando Magic", "Eastern", 22],
      ["PHI", "Philadelphia 76ers", "Eastern", 23],
      ["PHX", "Phoenix Suns", "Western", 24],
      ["POR", "Portland Trail Blazers", "Western", 25],
      ["SAC", "Sacramento Kings", "Western", 26],
      ["SAS", "San Antonio Spurs", "Western", 27],
      ["TOR", "Toronto Raptors", "Eastern", 28],
      ["UTA", "Utah Jazz", "Western", 29],
      ["WAS", "Washington Wizards", "Eastern", 30]
    ].freeze

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
      if sql.include?("FROM pcms.team_salary_warehouse tsw")
        return ActiveRecord::Result.new(%w[team_code team_name conference_name team_id], TEAM_ROWS)
      end

      # Salary Book player queries can safely return empty rows for these tests.
      if sql.include?("FROM pcms.salary_book_warehouse sbw")
        return ActiveRecord::Result.new([], [])
      end

      ActiveRecord::Result.new([], [])
    end
  end

  setup do
    host! "localhost"
  end

  test "salary book page can boot directly into tankathon view" do
    with_fake_connection do
      get "/tools/salary-book", params: { view: "tankathon", team: "POR", year: "2025" }, headers: modern_headers

      assert_response :success
      assert_includes response.body, "activeview: 'tankathon'"
      assert_includes response.body, 'id="salarybook-team-frame"'
      assert_includes response.body, "salarybook-sand-loader"
      assert_includes response.body, "salarybook-sand-grid"
      assert_includes response.body, 'id="view-tankathon"'
      assert_includes response.body, 'value="tankathon"'
    end
  end

  test "tankathon frame endpoint returns patchable team frame" do
    with_fake_connection do
      get "/tools/salary-book/frame", params: { view: "tankathon", team: "POR", year: "2025" }, headers: modern_headers

      assert_response :success
      assert_equal "text/html", response.media_type
      assert_includes response.body, 'id="salarybook-team-frame"'
      assert_includes response.body, "salarybook-sand-loader"
      assert_includes response.body, "salarybook-sand-grid"
      assert_includes response.body, "salarybook-sand-dot-16"
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
