module SalaryBook
  class ComboboxPlayersState
    DEFAULT_LIMIT = 12
    MAX_LIMIT = 50

    def initialize(params:, queries:)
      @params = params
      @queries = queries
    end

    def build
      query = normalized_query
      seq = parse_integer(params[:seq], default: 0)
      limit = normalized_limit
      team_code = normalize_team_code(params[:team])

      players = queries.fetch_combobox_players(team_code: team_code, query: query, limit: limit)

      render_locals(
        players: players,
        query: query,
        seq: seq,
        team_code: team_code,
        error_message: nil
      )
    end

    def fallback(error:)
      render_locals(
        players: [],
        query: normalized_query,
        seq: parse_integer(params[:seq], default: 0),
        team_code: normalize_team_code(params[:team]),
        error_message: error.to_s
      )
    end

    private

    attr_reader :params, :queries

    def normalized_query
      params[:q].to_s.strip
    end

    def normalized_limit
      raw_limit = params[:limit].to_i
      raw_limit = DEFAULT_LIMIT if raw_limit <= 0

      [raw_limit, MAX_LIMIT].min
    end

    def parse_integer(value, default:)
      Integer(value)
    rescue ArgumentError, TypeError
      default
    end

    def normalize_team_code(raw)
      code = raw.to_s.strip.upcase
      return nil unless code.match?(/\A[A-Z]{3}\z/)

      code
    end

    def render_locals(players:, query:, seq:, team_code:, error_message:)
      {
        players: players,
        query: query,
        seq: seq,
        team_code: team_code,
        error_message: error_message
      }
    end
  end
end
