module Agencies
  class ShowWorkspaceData
    def initialize(queries:, agency_id:)
      @queries = queries
      @agency_id = agency_id
    end

    def build
      agency = queries.fetch_agency_for_show(agency_id)
      raise ActiveRecord::RecordNotFound unless agency

      {
        agency:,
        agents: queries.fetch_show_agents(agency_id),
        agency_rollup: queries.fetch_show_rollup(agency_id),
        team_distribution: queries.fetch_show_team_distribution(agency_id),
        clients: queries.fetch_show_clients(agency_id),
        client_yearly_footprint: queries.fetch_show_client_yearly_footprint(agency_id)
      }
    end

    private

    attr_reader :queries, :agency_id
  end
end
