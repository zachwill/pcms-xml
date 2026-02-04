-- 068_draft_pick_shorthand_assets_sub_asset_slot.sql
--
-- Align curated shorthand storage with summary parsing granularity.
--
-- pcms.draft_pick_summary_assets produces rows keyed by:
--   (team_code, draft_year, draft_round, asset_slot, sub_asset_slot)
-- where asset_slot comes from "|" and sub_asset_slot comes from ";".
--
-- This migration updates pcms.draft_pick_shorthand_assets to include sub_asset_slot
-- in its primary key so shorthand can be attached to individual summary pieces.

begin;

alter table pcms.draft_pick_shorthand_assets
  add column if not exists sub_asset_slot int not null default 1;

-- Replace PK
alter table pcms.draft_pick_shorthand_assets
  drop constraint if exists draft_pick_shorthand_assets_pkey;

alter table pcms.draft_pick_shorthand_assets
  add primary key (team_code, draft_year, draft_round, asset_slot, sub_asset_slot);

-- Add check constraint
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'draft_pick_shorthand_assets_sub_asset_slot_chk'
      and conrelid = 'pcms.draft_pick_shorthand_assets'::regclass
  ) then
    alter table pcms.draft_pick_shorthand_assets
      add constraint draft_pick_shorthand_assets_sub_asset_slot_chk
        check (sub_asset_slot > 0);
  end if;
end $$;

commit;
