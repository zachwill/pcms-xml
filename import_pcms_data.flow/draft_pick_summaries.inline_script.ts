/**
 * Draft Pick Summaries Import
 *
 * Reads clean JSON from lineage step and upserts into:
 * - pcms.draft_pick_summaries
 *
 * Source JSON: draft_pick_summaries.json
 */
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function main(
  dry_run = false,
  extract_dir = "./shared/pcms",
) {
  const startedAt = new Date().toISOString();

  try {
    // Find extract directory
    const entries = await readdir(extract_dir, { withFileTypes: true });
    const subDir = entries.find((e) => e.isDirectory());
    const baseDir = subDir ? `${extract_dir}/${subDir.name}` : extract_dir;

    // Build team_id → team_code lookup map
    const lookups: any = await Bun.file(`${baseDir}/lookups.json`).json();
    const teamsData: any[] = lookups?.lk_teams?.lk_team || [];
    const teamCodeMap = new Map<number, string>();
    for (const t of teamsData) {
      const teamId = t?.team_id;
      const teamCode = t?.team_code ?? t?.team_name_short;
      if (teamId && teamCode) {
        teamCodeMap.set(Number(teamId), String(teamCode));
      }
    }

    // Read clean JSON
    const summaries: any[] = await Bun.file(`${baseDir}/draft_pick_summaries.json`).json();
    console.log(`Found ${summaries.length} draft pick summaries`);

    const ingestedAt = new Date();

    const rows = summaries
      .map((s) => {
        if (s?.team_id == null || s?.draft_year == null) return null;

        const teamId = Number(s.team_id);
        const draftYear = Number(s.draft_year);

        return {
          team_id: teamId,
          draft_year: draftYear,
          first_round: s?.first_round ?? null,
          second_round: s?.second_round ?? null,
          is_active: s?.active_flg ?? null,
          team_code: teamCodeMap.get(teamId) ?? null,
          created_at: s?.create_date ?? null,
          updated_at: s?.last_change_date ?? null,
          record_changed_at: s?.record_change_date ?? null,
          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    if (dry_run) {
      return {
        dry_run: true,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        tables: [{ table: "pcms.draft_pick_summaries", attempted: rows.length, success: true }],
        errors: [],
      };
    }

    await sql`
      INSERT INTO pcms.draft_pick_summaries ${sql(rows)}
      ON CONFLICT (draft_year, team_id) DO UPDATE SET
        team_code = EXCLUDED.team_code,
        first_round = EXCLUDED.first_round,
        second_round = EXCLUDED.second_round,
        is_active = EXCLUDED.is_active,
        updated_at = EXCLUDED.updated_at,
        record_changed_at = EXCLUDED.record_changed_at,
        ingested_at = EXCLUDED.ingested_at
    `;

    console.log(`Upserted ${rows.length} draft pick summaries`);

    return {
      dry_run: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables: [{ table: "pcms.draft_pick_summaries", attempted: rows.length, success: true }],
      errors: [],
    };
  } catch (e: any) {
    return {
      dry_run,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables: [],
      errors: [e?.message ?? String(e)],
    };
  }
}
