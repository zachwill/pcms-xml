-- Speed up Rails transactions workspace and transaction detail drilldowns.
-- Idempotent for environments where these indexes were already created manually.

CREATE INDEX IF NOT EXISTS idx_transactions_non_trade_feed
ON pcms.transactions (transaction_date DESC, transaction_id DESC)
INCLUDE (
  transaction_type_lk,
  transaction_description_lk,
  player_id,
  from_team_code,
  to_team_code,
  signed_method_lk,
  contract_type_lk
)
WHERE trade_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_non_trade_from_team_feed
ON pcms.transactions (from_team_code, transaction_date DESC, transaction_id DESC)
WHERE trade_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_non_trade_to_team_feed
ON pcms.transactions (to_team_code, transaction_date DESC, transaction_id DESC)
WHERE trade_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_exception_usage_transaction_id_date
ON pcms.team_exception_usage (transaction_id, effective_date DESC, seqno DESC);

CREATE INDEX IF NOT EXISTS idx_team_budget_snapshots_transaction_id_sort
ON pcms.team_budget_snapshots (transaction_id, salary_year, team_code, player_id, team_budget_snapshot_id);

CREATE INDEX IF NOT EXISTS idx_dead_money_warehouse_transaction_id_sort
ON pcms.dead_money_warehouse (transaction_id, salary_year, team_code, player_name);

CREATE INDEX IF NOT EXISTS idx_ledger_entries_transaction_id_date
ON pcms.ledger_entries (transaction_id, ledger_date DESC, transaction_ledger_entry_id DESC);
