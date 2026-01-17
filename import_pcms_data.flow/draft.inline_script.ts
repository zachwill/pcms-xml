/**
 * Draft Import (Consolidated)
 *
 * Merges:
 * - draft_picks.inline_script.ts (PCMS DLG/WNBA picks)
 * - draft_pick_summaries.inline_script.ts (per-team/year ownership text)
 * - generate_nba_draft_picks.inline_script.ts (synthetic NBA picks from players)
 *
 * Upserts into:
 * - pcms.draft_picks
 * - pcms.draft_pick_summaries
 *
 * Logic:
 * 1) Upsert PCMS draft picks first
 * 2) Upsert draft pick summaries
 * 3) Generate NBA picks from players, dedupe by (draft_year, round, pick_number_int, league_lk), then upsert
 */

import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (inline, Windmill style)
// ─────────────────────────────────────────────────────────────────────────────

function toIntOrNull(val: unknown): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const num = Number(val);
  return Number.isNaN(num) ? null : Math.trunc(num);
}

function asArray<T = any>(val: any): T[] {
  if (val === null || val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

function normalizePick(val: any): { pick_number: string | null; pick_number_int: number | null } {
  if (val === null || val === undefined || val === "") return { pick_number: null, pick_number_int: null };

  if (typeof val === "number") {
    const intVal = Number.isFinite(val) ? Math.trunc(val) : null;
    return {
      pick_number: Number.isFinite(val) ? String(val) : null,
      pick_number_int: intVal,
    };
  }

  const s = String(val).trim();
  if (!s) return { pick_number: null, pick_number_int: null };

  // Some PCMS values can be non-numeric (supplemental picks, etc.). Keep text,
  // and only set the int when it parses cleanly.
  const maybeInt = Number.parseInt(s, 10);
  return {
    pick_number: s,
    pick_number_int: Number.isFinite(maybeInt) && String(maybeInt) === s ? maybeInt : null,
  };
}

function buildTeamCodeMap(lookups: any): Map<number, string> {
  const teamsData: any[] = lookups?.lk_teams?.lk_team || [];
  const teamCodeMap = new Map<number, string>();
  for (const t of teamsData) {
    const teamId = t?.team_id;
    const teamCode = t?.team_code ?? t?.team_name_short;
    if (teamId && teamCode) {
      teamCodeMap.set(Number(teamId), String(teamCode));
    }
  }
  return teamCodeMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function main(dry_run = false, extract_dir = "./shared/pcms") {
  const startedAt = new Date().toISOString();
  const tables: { table: string; attempted: number; success: boolean; error?: string }[] = [];

  try {
    // Find extract directory
    const entries = await readdir(extract_dir, { withFileTypes: true });
    const subDir = entries.find((e) => e.isDirectory());
    const baseDir = subDir ? `${extract_dir}/${subDir.name}` : extract_dir;

    const lookups: any = await Bun.file(`${baseDir}/lookups.json`).json();
    const teamCodeMap = buildTeamCodeMap(lookups);

    // Read clean JSON
    const [draftPicks, summaries, players] = await Promise.all([
      Bun.file(`${baseDir}/draft_picks.json`).json(),
      Bun.file(`${baseDir}/draft_pick_summaries.json`).json(),
      Bun.file(`${baseDir}/players.json`).json(),
    ]);

    console.log(`Found ${draftPicks.length} PCMS draft picks`);
    console.log(`Found ${summaries.length} draft pick summaries`);
    console.log(`Found ${players.length} players (for NBA pick generation)`);

    const ingestedAt = new Date();

    // ─────────────────────────────────────────────────────────────────────────
    // 1) PCMS draft picks → pcms.draft_picks
    // ─────────────────────────────────────────────────────────────────────────

    const pcmsPickRowsRaw = (draftPicks as any[])
      .map((dp) => {
        const draftPickId = toIntOrNull(dp?.draft_pick_id);
        if (draftPickId == null) return null;

        const { pick_number, pick_number_int } = normalizePick(dp?.pick);
        const histories = asArray<any>(dp?.histories);

        const originalTeamId = toIntOrNull(dp?.original_team_id);
        const currentTeamId = toIntOrNull(dp?.current_team_id ?? dp?.team_id);

        return {
          draft_pick_id: draftPickId,
          draft_year: toIntOrNull(dp?.draft_year ?? dp?.year),
          round: toIntOrNull(dp?.round),
          pick_number,
          pick_number_int,

          league_lk: dp?.league_lk ?? null,

          original_team_id: originalTeamId,
          original_team_code: originalTeamId != null ? (teamCodeMap.get(originalTeamId) ?? null) : null,
          current_team_id: currentTeamId,
          current_team_code: currentTeamId != null ? (teamCodeMap.get(currentTeamId) ?? null) : null,

          is_active: dp?.is_active ?? dp?.active_flg ?? null,

          is_protected: dp?.is_protected ?? dp?.protected_flg ?? null,
          protection_description: dp?.protection_description ?? null,
          is_swap: dp?.is_swap ?? dp?.draft_pick_swap_flg ?? dp?.swap_flg ?? null,
          swap_type_lk: dp?.swap_type_lk ?? null,
          conveyance_year_range: dp?.conveyance_year_range ?? null,
          conveyance_trigger_description: dp?.conveyance_trigger_description ?? null,
          first_round_summary: dp?.first_round_summary ?? null,
          second_round_summary: dp?.second_round_summary ?? null,

          player_id: toIntOrNull(dp?.player_id),

          history_json: histories.length > 0 ? { history: histories } : null,
          draft_json: dp ?? null,
          summary_json: dp?.summary_json ?? null,

          created_at: dp?.create_date ?? null,
          updated_at: dp?.last_change_date ?? null,
          record_changed_at: dp?.record_change_date ?? null,

          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    // Upfront dedupe by PK
    const pcmsPickSeen = new Map<number, Record<string, any>>();
    for (const r of pcmsPickRowsRaw) pcmsPickSeen.set(Number(r.draft_pick_id), r);
    const pcmsPickRows = [...pcmsPickSeen.values()];

    // ─────────────────────────────────────────────────────────────────────────
    // 2) Draft pick summaries → pcms.draft_pick_summaries
    // ─────────────────────────────────────────────────────────────────────────

    const summaryRowsRaw = (summaries as any[])
      .map((s) => {
        const teamId = toIntOrNull(s?.team_id);
        const draftYear = toIntOrNull(s?.draft_year);
        if (teamId == null || draftYear == null) return null;

        return {
          team_id: teamId,
          draft_year: draftYear,
          team_code: teamCodeMap.get(teamId) ?? null,
          first_round: s?.first_round ?? null,
          second_round: s?.second_round ?? null,
          is_active: s?.active_flg ?? null,
          created_at: s?.create_date ?? null,
          updated_at: s?.last_change_date ?? null,
          record_changed_at: s?.record_change_date ?? null,
          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    // Upfront dedupe by PK
    const summarySeen = new Map<string, Record<string, any>>();
    for (const r of summaryRowsRaw) summarySeen.set(`${r.draft_year}|${r.team_id}`, r);
    const summaryRows = [...summarySeen.values()];

    // ─────────────────────────────────────────────────────────────────────────
    // 3) Generate NBA draft picks from players → pcms.draft_picks
    // ─────────────────────────────────────────────────────────────────────────

    const generatedNbaRowsRaw = (players as any[])
      .filter((p) => p?.league_lk === "NBA")
      .map((p) => {
        const draftYear = toIntOrNull(p?.draft_year);
        const draftRound = toIntOrNull(p?.draft_round);
        const pickNum = toIntOrNull(Array.isArray(p?.draft_pick) ? p?.draft_pick[0] : p?.draft_pick);

        if (draftYear == null || draftRound == null || pickNum == null) return null;

        const draftTeamId = toIntOrNull(p?.draft_team_id);

        // Synthetic ID: YYYY * 100000 + R * 1000 + PICK
        const syntheticId = draftYear * 100000 + draftRound * 1000 + pickNum;

        return {
          draft_pick_id: syntheticId,
          draft_year: draftYear,
          round: draftRound,
          pick_number: String(pickNum),
          pick_number_int: pickNum,
          league_lk: "NBA",

          original_team_id: draftTeamId,
          original_team_code: draftTeamId != null ? (teamCodeMap.get(draftTeamId) ?? null) : null,
          current_team_id: draftTeamId,
          current_team_code: draftTeamId != null ? (teamCodeMap.get(draftTeamId) ?? null) : null,

          is_active: false,
          player_id: toIntOrNull(p?.player_id),

          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    // Upfront dedupe by unique key we upsert on
    const generatedSeen = new Map<string, Record<string, any>>();
    for (const r of generatedNbaRowsRaw) {
      const key = `${r.draft_year}|${r.round}|${r.pick_number_int}|${r.league_lk}`;
      generatedSeen.set(key, r);
    }
    const generatedNbaRows = [...generatedSeen.values()];

    console.log(`Prepared ${pcmsPickRows.length} PCMS draft pick rows (deduped)`);
    console.log(`Prepared ${summaryRows.length} draft pick summary rows (deduped)`);
    console.log(`Prepared ${generatedNbaRows.length} generated NBA draft pick rows (deduped)`);

    if (dry_run) {
      return {
        dry_run: true,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        tables: [
          { table: "pcms.draft_picks", attempted: pcmsPickRows.length + generatedNbaRows.length, success: true },
          { table: "pcms.draft_pick_summaries", attempted: summaryRows.length, success: true },
        ],
        errors: [],
      };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Upsert PCMS picks first (PK = draft_pick_id)
    // ─────────────────────────────────────────────────────────────────────────

    const DRAFT_PICKS_BATCH = 500;
    for (let i = 0; i < pcmsPickRows.length; i += DRAFT_PICKS_BATCH) {
      const batch = pcmsPickRows.slice(i, i + DRAFT_PICKS_BATCH);

      await sql`
        INSERT INTO pcms.draft_picks ${sql(batch)}
        ON CONFLICT (draft_pick_id) DO UPDATE SET
          draft_year = EXCLUDED.draft_year,
          round = EXCLUDED.round,
          pick_number = EXCLUDED.pick_number,
          pick_number_int = EXCLUDED.pick_number_int,
          league_lk = EXCLUDED.league_lk,
          original_team_id = EXCLUDED.original_team_id,
          original_team_code = EXCLUDED.original_team_code,
          current_team_id = EXCLUDED.current_team_id,
          current_team_code = EXCLUDED.current_team_code,
          is_active = EXCLUDED.is_active,
          is_protected = EXCLUDED.is_protected,
          protection_description = EXCLUDED.protection_description,
          is_swap = EXCLUDED.is_swap,
          swap_type_lk = EXCLUDED.swap_type_lk,
          conveyance_year_range = EXCLUDED.conveyance_year_range,
          conveyance_trigger_description = EXCLUDED.conveyance_trigger_description,
          first_round_summary = EXCLUDED.first_round_summary,
          second_round_summary = EXCLUDED.second_round_summary,
          player_id = EXCLUDED.player_id,
          history_json = EXCLUDED.history_json,
          draft_json = EXCLUDED.draft_json,
          summary_json = EXCLUDED.summary_json,
          updated_at = EXCLUDED.updated_at,
          record_changed_at = EXCLUDED.record_changed_at,
          ingested_at = EXCLUDED.ingested_at
      `;

      console.log(`PCMS picks: upserted ${Math.min(i + batch.length, pcmsPickRows.length)}/${pcmsPickRows.length}`);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Upsert summaries
    // ─────────────────────────────────────────────────────────────────────────

    const SUMMARIES_BATCH = 500;
    for (let i = 0; i < summaryRows.length; i += SUMMARIES_BATCH) {
      const batch = summaryRows.slice(i, i + SUMMARIES_BATCH);

      await sql`
        INSERT INTO pcms.draft_pick_summaries ${sql(batch)}
        ON CONFLICT (draft_year, team_id) DO UPDATE SET
          team_code = EXCLUDED.team_code,
          first_round = EXCLUDED.first_round,
          second_round = EXCLUDED.second_round,
          is_active = EXCLUDED.is_active,
          updated_at = EXCLUDED.updated_at,
          record_changed_at = EXCLUDED.record_changed_at,
          ingested_at = EXCLUDED.ingested_at
      `;
    }

    console.log(`Draft pick summaries: upserted ${summaryRows.length}`);

    // ─────────────────────────────────────────────────────────────────────────
    // Upsert generated NBA picks last
    // ─────────────────────────────────────────────────────────────────────────

    const GENERATED_BATCH = 500;
    for (let i = 0; i < generatedNbaRows.length; i += GENERATED_BATCH) {
      const batch = generatedNbaRows.slice(i, i + GENERATED_BATCH);

      await sql`
        INSERT INTO pcms.draft_picks ${sql(batch)}
        ON CONFLICT (draft_year, round, pick_number_int, league_lk) DO UPDATE SET
          player_id = EXCLUDED.player_id,
          original_team_id = EXCLUDED.original_team_id,
          original_team_code = EXCLUDED.original_team_code,
          current_team_id = EXCLUDED.current_team_id,
          current_team_code = EXCLUDED.current_team_code,
          pick_number = EXCLUDED.pick_number,
          is_active = EXCLUDED.is_active,
          ingested_at = EXCLUDED.ingested_at
      `;

      console.log(
        `Generated NBA picks: upserted ${Math.min(i + batch.length, generatedNbaRows.length)}/${generatedNbaRows.length}`,
      );
    }

    tables.push({ table: "pcms.draft_picks", attempted: pcmsPickRows.length + generatedNbaRows.length, success: true });
    tables.push({ table: "pcms.draft_pick_summaries", attempted: summaryRows.length, success: true });

    return {
      dry_run: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables,
      errors: [],
    };
  } catch (e: any) {
    tables.push({
      table: "pcms.draft",
      attempted: 0,
      success: false,
      error: e?.message ?? String(e),
    });

    return {
      dry_run,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables,
      errors: [e?.message ?? String(e)],
    };
  }
}
