/**
 * Transaction Waiver Amounts Import
 *
 * Source: transaction_waiver_amounts.json -> pcms.transaction_waiver_amounts
 */
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function toIntOrNull(val: unknown): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function toNumOrNull(val: unknown): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function toBoolOrNull(val: unknown): boolean | null {
  if (val === null || val === undefined || val === "") return null;
  if (typeof val === "boolean") return val;
  if (val === 0 || val === "0" || val === "false") return false;
  if (val === 1 || val === "1" || val === "true") return true;
  return null;
}

async function resolveBaseDir(extractDir: string): Promise<string> {
  const entries = await readdir(extractDir, { withFileTypes: true });
  const subDir = entries.find((e) => e.isDirectory());
  return subDir ? `${extractDir}/${subDir.name}` : extractDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function main(
  dry_run = false,
  extract_dir = "./shared/pcms"
) {
  const startedAt = new Date().toISOString();

  try {
    const baseDir = await resolveBaseDir(extract_dir);

    // Build team_id → team_code lookup map
    const lookups: any = await Bun.file(`${baseDir}/lookups.json`).json();
    const teamsData: any[] = lookups?.lk_teams?.lk_team || [];
    const teamCodeMap = new Map<number, string>();
    for (const t of teamsData) {
      if (t.team_id && t.team_code) {
        teamCodeMap.set(t.team_id, t.team_code);
      }
    }

    const waiverFile = Bun.file(`${baseDir}/transaction_waiver_amounts.json`);
    const waiverAmounts: any[] = (await waiverFile.exists()) ? await waiverFile.json() : [];

    console.log(`Found ${waiverAmounts.length} transaction waiver amounts`);

    const ingestedAt = new Date();

    const rows = waiverAmounts
      .map((w) => {
        const id = toIntOrNull(w?.transaction_waiver_amount_id);
        const transactionId = toIntOrNull(w?.transaction_id);
        const playerId = toIntOrNull(w?.player_id);
        const teamId = toIntOrNull(w?.team_id);
        const salaryYear = toIntOrNull(w?.salary_year);

        // Required columns (per schema)
        if (id === null || transactionId === null || playerId === null || salaryYear === null) return null;

        return {
          transaction_waiver_amount_id: id,
          transaction_id: transactionId,
          player_id: playerId,
          team_id: teamId,
          team_code: teamId !== null ? (teamCodeMap.get(teamId) ?? null) : null,
          contract_id: toIntOrNull(w?.contract_id),
          salary_year: salaryYear,
          version_number: toIntOrNull(w?.version_number),
          waive_date: w?.waive_date ?? null,
          cap_value: toNumOrNull(w?.cap_value),
          cap_change_value: toNumOrNull(w?.cap_change_value),
          is_cap_calculated: toBoolOrNull(w?.cap_calculated),
          tax_value: toNumOrNull(w?.tax_value),
          tax_change_value: toNumOrNull(w?.tax_change_value),
          is_tax_calculated: toBoolOrNull(w?.tax_calculated),
          apron_value: toNumOrNull(w?.apron_value),
          apron_change_value: toNumOrNull(w?.apron_change_value),
          is_apron_calculated: toBoolOrNull(w?.apron_calculated),
          mts_value: toNumOrNull(w?.mts_value),
          mts_change_value: toNumOrNull(w?.mts_change_value),
          two_way_salary: toNumOrNull(w?.two_way_salary),
          two_way_nba_salary: toNumOrNull(w?.two_way_nba_salary),
          two_way_dlg_salary: toNumOrNull(w?.two_way_dlg_salary),
          option_decision_lk: w?.option_decision_lk ?? null,
          wnba_contract_id: toIntOrNull(w?.wnba_contract_id),
          wnba_version_number: w?.wnba_version_number ?? null,
          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    if (dry_run) {
      return {
        dry_run: true,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        tables: [{ table: "pcms.transaction_waiver_amounts", attempted: rows.length, success: true }],
        errors: [],
      };
    }

    const BATCH_SIZE = 100;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);

      await sql`
        INSERT INTO pcms.transaction_waiver_amounts ${sql(batch)}
        ON CONFLICT (transaction_waiver_amount_id) DO UPDATE SET
          transaction_id = EXCLUDED.transaction_id,
          player_id = EXCLUDED.player_id,
          team_id = EXCLUDED.team_id,
          team_code = EXCLUDED.team_code,
          contract_id = EXCLUDED.contract_id,
          salary_year = EXCLUDED.salary_year,
          version_number = EXCLUDED.version_number,
          waive_date = EXCLUDED.waive_date,
          cap_value = EXCLUDED.cap_value,
          cap_change_value = EXCLUDED.cap_change_value,
          is_cap_calculated = EXCLUDED.is_cap_calculated,
          tax_value = EXCLUDED.tax_value,
          tax_change_value = EXCLUDED.tax_change_value,
          is_tax_calculated = EXCLUDED.is_tax_calculated,
          apron_value = EXCLUDED.apron_value,
          apron_change_value = EXCLUDED.apron_change_value,
          is_apron_calculated = EXCLUDED.is_apron_calculated,
          mts_value = EXCLUDED.mts_value,
          mts_change_value = EXCLUDED.mts_change_value,
          two_way_salary = EXCLUDED.two_way_salary,
          two_way_nba_salary = EXCLUDED.two_way_nba_salary,
          two_way_dlg_salary = EXCLUDED.two_way_dlg_salary,
          option_decision_lk = EXCLUDED.option_decision_lk,
          wnba_contract_id = EXCLUDED.wnba_contract_id,
          wnba_version_number = EXCLUDED.wnba_version_number,
          ingested_at = EXCLUDED.ingested_at
      `;
    }

    return {
      dry_run: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables: [{ table: "pcms.transaction_waiver_amounts", attempted: rows.length, success: true }],
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
