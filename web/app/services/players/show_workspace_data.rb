module Players
  class ShowWorkspaceData
    def initialize(queries:, player_id:)
      @queries = queries
      @player_id = player_id
    end

    def build(defer_heavy_load:)
      player = queries.fetch_player_header(player_id)
      raise ActiveRecord::RecordNotFound unless player

      salary_book_row = queries.fetch_salary_book_row(player_id)
      draft_selection = queries.fetch_draft_selection(player_id)

      if defer_heavy_load
        return {
          player:,
          salary_book_row:,
          draft_selection:,
          team_history_rows: [],
          salary_book_yearly_rows: [],
          contract_chronology_rows: [],
          contract_version_rows: [],
          salary_rows: [],
          protection_rows: [],
          protection_condition_rows: [],
          bonus_rows: [],
          bonus_max_rows: [],
          payment_schedule_rows: [],
          ledger_entries: []
        }
      end

      team_history_rows = queries.fetch_team_history(player_id)
      salary_book_yearly_rows = queries.fetch_salary_book_yearly(player_id)
      contract_chronology_rows = queries.fetch_contract_chronology(player_id)
      contract_version_rows = queries.fetch_contract_versions(player_id)

      salary_rows = []
      protection_rows = []
      protection_condition_rows = []
      bonus_rows = []
      bonus_max_rows = []
      payment_schedule_rows = []

      if salary_book_row.present? && salary_book_row["contract_id"].present? && salary_book_row["version_number"].present?
        contract_id = salary_book_row["contract_id"]
        version_number = salary_book_row["version_number"]

        salary_rows = queries.fetch_salaries(contract_id:, version_number:)
        protection_rows = queries.fetch_protections(contract_id:, version_number:)
        protection_condition_rows = queries.fetch_protection_conditions(contract_id:, version_number:)
        bonus_rows = queries.fetch_bonuses(contract_id:, version_number:)
        bonus_max_rows = queries.fetch_bonus_maximums(contract_id:, version_number:)
        payment_schedule_rows = queries.fetch_payment_schedules(contract_id:, version_number:)
      end

      ledger_entries = queries.fetch_ledger_entries(player_id)

      {
        player:,
        salary_book_row:,
        draft_selection:,
        team_history_rows:,
        salary_book_yearly_rows:,
        contract_chronology_rows:,
        contract_version_rows:,
        salary_rows:,
        protection_rows:,
        protection_condition_rows:,
        bonus_rows:,
        bonus_max_rows:,
        payment_schedule_rows:,
        ledger_entries:
      }
    end

    private

    attr_reader :queries, :player_id
  end
end
