require "test_helper"

class SalaryBookContractsHelperTest < ActiveSupport::TestCase
  class DummyContractsHelper
    include SalaryBook::ContractsHelper
  end

  setup do
    @helper = DummyContractsHelper.new
    @salary_years = [2025, 2026, 2027]
  end

  test "prioritizes current-year trade restriction and trade kicker over next-year option" do
    player = {
      "years_of_service" => 17,
      "is_trade_consent_required_now" => true,
      "is_trade_restricted_now" => false,
      "is_trade_bonus" => true,
      "trade_bonus_percent" => 15,
      "cap_2025" => 10_000_000,
      "pct_cap_2025" => 0.10,
      "option_2026" => "TEAM"
    }

    tokens = @helper.player_status_tokens_for_year(
      player,
      season_year: 2025,
      salary_years: @salary_years
    )

    assert_equal ["TR", "TK"], tokens.map { |token| token[:label] }
  end

  test "poison pill token only appears in current season context" do
    player = {
      "years_of_service" => 3,
      "is_poison_pill" => true
    }

    tokens_2025 = @helper.player_status_tokens_for_year(
      player,
      season_year: 2025,
      salary_years: @salary_years
    )
    tokens_2026 = @helper.player_status_tokens_for_year(
      player,
      season_year: 2026,
      salary_years: @salary_years
    )

    assert_equal ["PP"], tokens_2025.map { |token| token[:label] }
    assert_empty tokens_2026
  end

  test "season option outranks trade kicker in forward-year context" do
    player = {
      "years_of_service" => 17,
      "is_trade_bonus" => true,
      "trade_bonus_percent" => 15,
      "cap_2025" => 9_000_000,
      "cap_2026" => 10_000_000,
      "pct_cap_2026" => 0.10,
      "option_2026" => "TEAM"
    }

    tokens = @helper.player_status_tokens_for_year(
      player,
      season_year: 2026,
      salary_years: @salary_years
    )

    assert_equal ["TO", "TK"], tokens.map { |token| token[:label] }
  end
end
