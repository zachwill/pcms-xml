-- 060_draft_pick_summary_assets_assertions.sql
--
-- Assertions for pcms.draft_pick_summary_assets (summary-derived, endnote-aligned).

begin;

-- table exists + non-empty
select 1 as ok
where to_regclass('pcms.draft_pick_summary_assets') is not null;

select 1 as ok
from pcms.draft_pick_summary_assets
limit 1;

-- Key invariant: endnote refs are extracted per raw_part (NOT inherited from parent fragment)
-- Fixture: ATL 2018 FRP includes two acquired picks in one pipe fragment.
-- We expect the second part (Has MIN(19)) to have endnote_refs={19} (not {81,78,19}).
do $$
declare c int;
begin
  select count(*) into c
  from pcms.draft_pick_summary_assets
  where team_code='ATL'
    and draft_year=2018
    and draft_round=1
    and asset_slot=2
    and sub_asset_slot=2
    and raw_part='Has MIN(19)'
    and endnote_refs = array[19]::int[];

  if c <> 1 then
    raise exception 'Expected ATL 2018 R1 asset_slot=2 sub_asset_slot=2 Has MIN(19) endnote_refs={19}; got % rows', c;
  end if;
end $$;

-- Fixture: BKN 2018 SRP includes a via-chain in the first acquired pick, and a second acquired pick.
-- The MIL part should have only {104}.
do $$
declare c int;
begin
  select count(*) into c
  from pcms.draft_pick_summary_assets
  where team_code='BKN'
    and draft_year=2018
    and draft_round=2
    and asset_slot=2
    and sub_asset_slot=2
    and raw_part='Has MIL(104)'
    and endnote_refs = array[104]::int[];

  if c <> 1 then
    raise exception 'Expected BKN 2018 R2 asset_slot=2 sub_asset_slot=2 Has MIL(104) endnote_refs={104}; got % rows', c;
  end if;
end $$;

-- Sanity: pipe splitting should be <= 2 fragments for current PCMS NBA summaries.
do $$
declare max_slot int;
begin
  select max(asset_slot) into max_slot
  from pcms.draft_pick_summary_assets;

  if max_slot is null or max_slot > 2 then
    raise exception 'Unexpected asset_slot max=% (expected <=2 for current PCMS NBA summaries)', max_slot;
  end if;
end $$;

-- Endnote match rate: allow a small number of missing endnotes (recent/ingest gaps).
do $$
declare with_refs bigint;
declare missing bigint;
declare ratio numeric;
begin
  select
    count(*) filter (where cardinality(endnote_refs) > 0),
    count(*) filter (where cardinality(missing_endnote_refs) > 0)
  into with_refs, missing
  from pcms.draft_pick_summary_assets;

  if with_refs = 0 then
    return;
  end if;

  ratio := (with_refs - missing)::numeric / with_refs;
  if ratio < 0.95 then
    raise exception 'draft_pick_summary_assets endnote coverage too low: with_refs=% missing=% ratio=%', with_refs, missing, ratio;
  end if;
end $$;

commit;
