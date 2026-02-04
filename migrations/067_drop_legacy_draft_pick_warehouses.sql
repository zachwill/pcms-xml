-- 067_drop_legacy_draft_pick_warehouses.sql
--
-- Preproduction cleanup: remove legacy draft pick summary/trade warehouses.
--
-- Replaced by:
-- - pcms.draft_pick_summary_assets (summary-derived, endnote-aligned, splits on | and ;)
--
-- Drops:
-- - pcms.draft_picks_warehouse + refresh function
-- - pcms.draft_assets_warehouse + refresh function
-- - pcms.draft_pick_trade_claims_warehouse + refresh function

begin;

drop function if exists pcms.refresh_draft_assets_warehouse();
drop table if exists pcms.draft_assets_warehouse;

drop function if exists pcms.refresh_draft_picks_warehouse();
drop table if exists pcms.draft_picks_warehouse;

drop function if exists pcms.refresh_draft_pick_trade_claims_warehouse();
drop table if exists pcms.draft_pick_trade_claims_warehouse;

commit;
