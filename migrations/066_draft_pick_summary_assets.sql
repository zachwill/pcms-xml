-- 066_draft_pick_summary_assets.sql
--
-- Replace the draft pick summary-derived warehouses with a single, correctly-aligned
-- "summary assets" table.
--
-- Goals:
-- - Split pcms.draft_pick_summaries.{first_round,second_round} by "|" (asset_slot)
--   and then by ";" (sub_asset_slot).
-- - Keep each resulting piece intact.
-- - Extract endnote refs per-piece (NOT inherited from the parent fragment).
-- - Provide the same ergonomics as the old draft_assets_warehouse (counterparty/via,
--   endnote join helpers), but with correct endnote alignment.
--
-- Notes:
-- - In practice, PCMS uses at most 2 pipe fragments: (1) this team's own pick status,
--   (2) other teams' picks this team owns/controls.
-- - We do not attempt to resolve conveyance here; this is still provenance-first.

begin;

-- -----------------------------------------------------------------------------
-- Table
-- -----------------------------------------------------------------------------

do $$
begin
  if to_regclass('pcms.draft_pick_summary_assets') is null then
    create table pcms.draft_pick_summary_assets (
      team_id int not null,
      team_code text not null,

      draft_year int not null,
      draft_round int not null,

      -- asset_slot: 1..N from splitting on "|" (PCMS uses max 2 today)
      asset_slot int not null,
      -- sub_asset_slot: 1..N from splitting each fragment on ";"
      sub_asset_slot int not null,

      asset_type text not null,

      is_forfeited boolean not null default false,
      is_conditional_text boolean not null default false,
      is_swap_text boolean not null default false,

      -- convenience booleans, combining summary text + primary endnote flags
      is_conditional boolean not null default false,
      is_swap boolean not null default false,

      counterparty_team_code text,
      counterparty_team_codes text[] not null default '{}'::text[],
      via_team_codes text[] not null default '{}'::text[],

      raw_round_text text,
      raw_fragment text not null,
      raw_part text not null,

      numeric_paren_refs int[] not null default '{}'::int[],
      endnote_refs int[] not null default '{}'::int[],
      missing_endnote_refs int[] not null default '{}'::int[],

      primary_endnote_id int,
      has_primary_endnote_match boolean not null default false,

      endnote_trade_date date,
      endnote_is_swap boolean,
      endnote_is_conditional boolean,
      endnote_depends_on int[] not null default '{}'::int[],
      endnote_explanation text,

      needs_review boolean not null default false,
      refreshed_at timestamptz not null default now(),

      primary key (team_code, draft_year, draft_round, asset_slot, sub_asset_slot),

      constraint draft_pick_summary_assets_round_chk
        check (draft_round in (1, 2)),
      constraint draft_pick_summary_assets_team_code_chk
        check (team_code ~ '^[A-Z]{3}$'),
      constraint draft_pick_summary_assets_asset_slot_chk
        check (asset_slot > 0),
      constraint draft_pick_summary_assets_sub_asset_slot_chk
        check (sub_asset_slot > 0)
    );

    create index draft_pick_summary_assets_team_year_idx
      on pcms.draft_pick_summary_assets (team_code, draft_year);

    create index draft_pick_summary_assets_year_round_idx
      on pcms.draft_pick_summary_assets (draft_year, draft_round);

    create index draft_pick_summary_assets_endnote_refs_gin_idx
      on pcms.draft_pick_summary_assets using gin (endnote_refs);

    create index draft_pick_summary_assets_counterparty_team_codes_gin_idx
      on pcms.draft_pick_summary_assets using gin (counterparty_team_codes);

    create index draft_pick_summary_assets_via_team_codes_gin_idx
      on pcms.draft_pick_summary_assets using gin (via_team_codes);
  end if;
end $$;


-- -----------------------------------------------------------------------------
-- Refresh function
-- -----------------------------------------------------------------------------

create or replace function pcms.refresh_draft_pick_summary_assets()
returns void
language sql
as $$
  truncate pcms.draft_pick_summary_assets;

  with base as (
    select
      dps.team_id,
      dps.team_code,
      dps.draft_year,
      1 as draft_round,
      dps.first_round as raw_round_text
    from pcms.draft_pick_summaries dps

    union all

    select
      dps.team_id,
      dps.team_code,
      dps.draft_year,
      2 as draft_round,
      dps.second_round as raw_round_text
    from pcms.draft_pick_summaries dps
  ), pipes as (
    select
      b.*,
      t.ordinality::int as asset_slot,
      btrim(t.frag) as raw_fragment
    from base b
    cross join lateral regexp_split_to_table(coalesce(b.raw_round_text, ''), '\s*\|\s*')
      with ordinality as t(frag, ordinality)
    where btrim(coalesce(t.frag, '')) <> ''
  ), parts as (
    select
      p.*,
      t.ordinality::int as sub_asset_slot,
      btrim(t.part) as raw_part
    from pipes p
    cross join lateral regexp_split_to_table(p.raw_fragment, '\s*;\s*')
      with ordinality as t(part, ordinality)
    where btrim(coalesce(t.part, '')) <> ''
  ), parsed as (
    select
      prt.*,

      -- Normalize for classification (keep raw_part intact for display)
      regexp_replace(prt.raw_part, '^(?:or|and)\s+', '', 'i') as norm_part,

      -- Extract numeric refs (in text order) from THIS part only
      coalesce(
        (
          select array_agg((m[1])::int)
          from regexp_matches(prt.raw_part, '\((\d+)\)', 'g') as m
        ),
        '{}'::int[]
      ) as numeric_paren_refs

    from parts prt
  ), parsed2 as (
    select
      p.*,

      -- Filter numeric refs into plausible endnote range
      coalesce(
        (
          select array_agg(x order by x)
          from unnest(p.numeric_paren_refs) as x
          where x between 1 and 999
        ),
        '{}'::int[]
      ) as endnote_refs,

      -- Primary endnote id: first ref in the part (usually the "main" trade note)
      (case when cardinality(p.numeric_paren_refs) > 0 then p.numeric_paren_refs[1] else null end) as primary_endnote_id,

      case
        when p.norm_part ~* '^own' then 'OWN'
        when p.norm_part ~* '^to\s+' then 'TO'
        when p.norm_part ~* '^has\s+' then 'HAS'
        when p.norm_part ~* '^may\s+have\s+' then 'MAY_HAVE'
        when p.norm_part ~* '^forfeited' then 'FORFEITED'
        else 'OTHER'
      end as asset_type,

      -- Single "headline" counterparty, when present
      nullif(
        coalesce(
          (regexp_match(p.norm_part, '^(?:To|Has)\s+([A-Z]{2,3})\(\d+\)', 'i'))[1],
          (regexp_match(p.norm_part, '^May\s+have\s+([A-Z]{2,3})\(\d+\)', 'i'))[1]
        ),
        ''
      ) as counterparty_team_code,

      -- Counterparties (multi): collect all recipient team codes mentioned in this part
      coalesce(
        (
          select array_agg(distinct x order by x)
          from (
            select m[1] as x from regexp_matches(p.raw_part, 'to\s+([A-Z]{2,3})\(\d+\)', 'gi') as m
            union
            select m[1] as x from regexp_matches(p.raw_part, 'has\s+([A-Z]{2,3})\(\d+\)', 'gi') as m
            union
            select m[1] as x from regexp_matches(p.raw_part, 'may\s+have\s+([A-Z]{2,3})\(\d+\)', 'gi') as m
          ) u
        ),
        '{}'::text[]
      ) as counterparty_team_codes,

      -- Via chain codes
      coalesce(
        (
          select array_agg(distinct m[1] order by m[1])
          from regexp_matches(p.raw_part, 'via\s+([A-Z]{2,3})\(\d+\)', 'gi') as m
        ),
        '{}'::text[]
      ) as via_team_codes,

      (p.norm_part ~* '^forfeited') as is_forfeited,

      (
        p.norm_part ~* '^may\s+have'
        or p.raw_part ~* '\yor\s+to\s+[A-Z]{2,3}\(\d+\)'
        or p.raw_part ~* '\yor\s+own'
        or p.raw_part ~* '\yif\y'
        or p.raw_part ~* '\yunless\y'
        or p.raw_part ~* '\yprovided\y'
        or p.raw_part ~* '\yconverts\y'
        or p.raw_part ~* 'more\s+favorable'
        or p.raw_part ~* 'less\s+favorable'
      ) as is_conditional_text,

      (p.raw_part ~* '\yswap\y') as is_swap_text

    from parsed p
  ), missing as (
    select
      p2.*,
      coalesce(
        (
          select array_agg(x order by x)
          from unnest(p2.endnote_refs) as x
          where not exists (
            select 1 from pcms.endnotes en where en.endnote_id = x
          )
        ),
        '{}'::int[]
      ) as missing_endnote_refs
    from parsed2 p2
  ), joined as (
    select
      m.*,
      (en.endnote_id is not null) as has_primary_endnote_match,
      en.trade_date as endnote_trade_date,
      en.is_swap as endnote_is_swap,
      en.is_conditional as endnote_is_conditional,
      coalesce(en.depends_on_endnotes, '{}'::int[]) as endnote_depends_on,
      en.explanation as endnote_explanation
    from missing m
    left join pcms.endnotes en
      on en.endnote_id = m.primary_endnote_id
  )
  insert into pcms.draft_pick_summary_assets (
    team_id,
    team_code,
    draft_year,
    draft_round,
    asset_slot,
    sub_asset_slot,
    asset_type,
    is_forfeited,
    is_conditional_text,
    is_swap_text,
    is_conditional,
    is_swap,
    counterparty_team_code,
    counterparty_team_codes,
    via_team_codes,
    raw_round_text,
    raw_fragment,
    raw_part,
    numeric_paren_refs,
    endnote_refs,
    missing_endnote_refs,
    primary_endnote_id,
    has_primary_endnote_match,
    endnote_trade_date,
    endnote_is_swap,
    endnote_is_conditional,
    endnote_depends_on,
    endnote_explanation,
    needs_review,
    refreshed_at
  )
  select
    team_id,
    team_code,
    draft_year,
    draft_round,
    asset_slot,
    sub_asset_slot,
    asset_type,
    is_forfeited,
    is_conditional_text,
    is_swap_text,
    (coalesce(is_conditional_text,false) or coalesce(endnote_is_conditional,false)) as is_conditional,
    (coalesce(is_swap_text,false) or coalesce(endnote_is_swap,false)) as is_swap,
    counterparty_team_code,
    counterparty_team_codes,
    via_team_codes,
    raw_round_text,
    raw_fragment,
    raw_part,
    numeric_paren_refs,
    endnote_refs,
    missing_endnote_refs,
    primary_endnote_id,
    has_primary_endnote_match,
    endnote_trade_date,
    endnote_is_swap,
    endnote_is_conditional,
    endnote_depends_on,
    endnote_explanation,
    (
      is_forfeited
      or coalesce(is_conditional_text,false)
      or coalesce(is_swap_text,false)
      or cardinality(missing_endnote_refs) > 0
      or (asset_type in ('TO','HAS','MAY_HAVE') and cardinality(counterparty_team_codes)=0 and counterparty_team_code is null)
      or (asset_type = 'OTHER')
    ) as needs_review,
    now() as refreshed_at
  from joined;
$$;

commit;
