module Agents
  class ShowWorkspaceData
    def initialize(queries:, agent_id:)
      @queries = queries
      @agent_id = agent_id
    end

    def build
      agent = queries.fetch_agent_for_show(agent_id)
      raise ActiveRecord::RecordNotFound unless agent

      {
        agent:,
        agency: agent["agency_id"].present? ? queries.fetch_agency(agent["agency_id"]) : nil,
        clients: queries.fetch_show_clients(agent_id),
        client_rollup: queries.fetch_show_client_rollup(agent_id),
        team_distribution: queries.fetch_show_team_distribution(agent_id),
        book_by_year: queries.fetch_show_book_by_year(agent_id),
        historical_footprint_rollup: queries.fetch_show_historical_footprint_rollup(agent_id),
        historical_signing_trend: queries.fetch_show_historical_signing_trend(agent_id)
      }
    end

    private

    attr_reader :queries, :agent_id
  end
end
