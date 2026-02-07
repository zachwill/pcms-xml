-- 072_people_team_from_transactions.sql
--
-- Derive current player team assignment from latest approved NBA transactions,
-- then sync pcms.people.team_id/team_code (and player_status_lk) from that source.
--
-- Why:
-- - players.xml teamId can lag behind approved trade/waive transactions.
-- - transaction feed carries the most current roster movement semantics.
--
-- Notes:
-- - We use latest APPR NBA transaction per player by:
--     transaction_date DESC, seqno DESC, transaction_id DESC
-- - Team is forced NULL for statuses that are not on-team roster states
--   (e.g. WAV/UFA), even if to_team_id is populated on the transaction row.

BEGIN;

CREATE OR REPLACE FUNCTION pcms.fn_player_current_team_from_transactions()
RETURNS TABLE (
  player_id integer,
  team_id integer,
  player_status_lk text,
  transaction_id integer,
  transaction_date date,
  record_changed_at timestamp with time zone
)
LANGUAGE sql
AS $$
WITH latest_tx AS (
  SELECT DISTINCT ON (t.player_id)
    t.player_id,
    t.to_team_id,
    t.to_player_status_lk,
    t.transaction_id,
    t.transaction_date,
    t.record_changed_at,
    t.seqno
  FROM pcms.transactions t
  WHERE t.player_id IS NOT NULL
    AND t.league_lk = 'NBA'
    AND t.record_status_lk = 'APPR'
  ORDER BY
    t.player_id,
    t.transaction_date DESC NULLS LAST,
    t.seqno DESC NULLS LAST,
    t.transaction_id DESC
)
SELECT
  l.player_id,
  CASE
    WHEN l.to_player_status_lk IN ('WAV', 'UFA', 'PRE', 'NOTM', 'VRET', 'RET') THEN NULL
    WHEN l.to_team_id IS NULL THEN NULL
    ELSE l.to_team_id
  END AS team_id,
  l.to_player_status_lk AS player_status_lk,
  l.transaction_id,
  l.transaction_date,
  l.record_changed_at
FROM latest_tx l;
$$;


CREATE OR REPLACE FUNCTION pcms.refresh_people_team_from_transactions()
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  v_updated integer := 0;
BEGIN
  WITH src AS (
    SELECT *
    FROM pcms.fn_player_current_team_from_transactions()
  ),
  updates AS (
    UPDATE pcms.people p
    SET
      team_id = s.team_id,
      team_code = t.team_code,
      player_status_lk = COALESCE(s.player_status_lk, p.player_status_lk),
      updated_at = COALESCE(
        GREATEST(p.updated_at, s.record_changed_at),
        p.updated_at,
        s.record_changed_at
      ),
      record_changed_at = COALESCE(
        GREATEST(p.record_changed_at, s.record_changed_at),
        p.record_changed_at,
        s.record_changed_at
      )
    FROM src s
    LEFT JOIN pcms.teams t
      ON t.team_id = s.team_id
    WHERE p.person_id = s.player_id
      AND p.person_type_lk = 'PLYR'
      AND (
        p.team_id IS DISTINCT FROM s.team_id
        OR p.team_code IS DISTINCT FROM t.team_code
        OR p.player_status_lk IS DISTINCT FROM COALESCE(s.player_status_lk, p.player_status_lk)
      )
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_updated FROM updates;

  RETURN v_updated;
END;
$$;

COMMIT;
