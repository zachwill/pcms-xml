-- 064_people_team_from_transactions_assertions.sql
-- Validate transaction-derived team snapshot + people sync refresh.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'pcms'
      AND p.proname = 'fn_player_current_team_from_transactions'
  ) THEN
    RAISE EXCEPTION 'missing function: pcms.fn_player_current_team_from_transactions';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'pcms'
      AND p.proname = 'refresh_people_team_from_transactions'
  ) THEN
    RAISE EXCEPTION 'missing function: pcms.refresh_people_team_from_transactions';
  END IF;
END
$$;

DO $$
DECLARE c int;
BEGIN
  SELECT COUNT(*) INTO c
  FROM pcms.fn_player_current_team_from_transactions()
  WHERE player_status_lk IN ('WAV', 'UFA', 'PRE', 'NOTM', 'VRET', 'RET')
    AND team_id IS NOT NULL;

  IF c > 0 THEN
    RAISE EXCEPTION
      'transaction snapshot produced non-null team_id for off-team statuses; rows=%',
      c;
  END IF;
END
$$;

-- Run refresh in a transaction and roll back, then assert alignment.
BEGIN;

SELECT pcms.refresh_people_team_from_transactions();

DO $$
DECLARE c int;
BEGIN
  WITH snapshot AS (
    SELECT *
    FROM pcms.fn_player_current_team_from_transactions()
  )
  SELECT COUNT(*) INTO c
  FROM snapshot s
  JOIN pcms.people p
    ON p.person_id = s.player_id
  WHERE p.person_type_lk = 'PLYR'
    AND (
      p.team_id IS DISTINCT FROM s.team_id
      OR p.player_status_lk IS DISTINCT FROM COALESCE(s.player_status_lk, p.player_status_lk)
    );

  IF c > 0 THEN
    RAISE EXCEPTION
      'people not aligned with transaction-derived snapshot after refresh; mismatches=%',
      c;
  END IF;
END
$$;

ROLLBACK;
