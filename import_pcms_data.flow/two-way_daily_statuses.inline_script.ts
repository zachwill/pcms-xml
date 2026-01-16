/**
 * Two-Way Daily Statuses Import
 *
 * Reads pre-parsed JSON from shared extract dir (created by lineage step) and
 * upserts into:
 * - pcms.two_way_daily_statuses
 *
 * Source JSON: *_two-way.json
 * Path:
 *   data["xml-extract"]["two-way-extract"]["daily-statuses"]["daily-status"]
 */
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });
const PARSER_VERSION = "2.1.0";
const SHARED_DIR = "./shared/pcms";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface LineageContext {
  lineage_id: number;
  s3_key: string;
  source_hash: string;
}

interface UpsertResult {
  table: string;
  attempted: number;
  success: boolean;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function hash(data: string): string {
  return new Bun.CryptoHasher("sha256").update(data).digest("hex");
}

function nilSafe(val: unknown): unknown {
  if (val && typeof val === "object" && "@_xsi:nil" in val) return null;
  return val;
}

function safeNum(val: unknown): number | null {
  const v = nilSafe(val);
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function safeStr(val: unknown): string | null {
  const v = nilSafe(val);
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") return null;
  return String(v);
}

function parsePCMSDateTime(val: unknown): string | null {
  const v = safeStr(val);
  if (!v || v === "0001-01-01") return null;
  return !isNaN(Date.parse(v)) ? v : null;
}

function parsePCMSDateOnly(val: unknown): string | null {
  const v = safeStr(val);
  if (!v || v === "0001-01-01") return null;
  // Most PCMS date/time strings are ISO-ish; date portion is stable.
  // Example: 2017-10-17T00:00:00-04:00 -> 2017-10-17
  if (v.length >= 10) return v.slice(0, 10);
  return null;
}

function asArray<T = any>(val: unknown): T[] {
  const v = nilSafe(val);
  if (v === null || v === undefined) return [];
  return Array.isArray(v) ? (v as T[]) : ([v] as T[]);
}

async function getLineageContext(extractDir: string): Promise<LineageContext> {
  const lineageFile = `${extractDir}/lineage.json`;
  const file = Bun.file(lineageFile);
  if (await file.exists()) {
    return await file.json();
  }
  throw new Error(`Lineage file not found: ${lineageFile}`);
}

async function upsertBatch<T extends Record<string, unknown>>(
  schema: string,
  table: string,
  rows: T[],
  conflictColumns: string[]
): Promise<UpsertResult> {
  const fullTable = `${schema}.${table}`;
  if (rows.length === 0) {
    return { table: fullTable, attempted: 0, success: true };
  }

  try {
    const allColumns = Object.keys(rows[0]);
    const updateColumns = allColumns.filter((col) => !conflictColumns.includes(col));
    const setClauses = updateColumns.map((col) => `${col} = EXCLUDED.${col}`).join(", ");
    const conflictTarget = conflictColumns.join(", ");

    const query = `
      INSERT INTO ${fullTable} (${allColumns.join(", ")})
      SELECT * FROM jsonb_populate_recordset(null::${fullTable}, $1::jsonb)
      ON CONFLICT (${conflictTarget}) DO UPDATE SET ${setClauses}
      WHERE ${fullTable}.source_hash IS DISTINCT FROM EXCLUDED.source_hash
    `;

    await sql.unsafe(query, [JSON.stringify(rows)]);
    return { table: fullTable, attempted: rows.length, success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { table: fullTable, attempted: rows.length, success: false, error: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Transformers
// ─────────────────────────────────────────────────────────────────────────────

function transformTwoWayDailyStatus(s: any, provenance: any) {
  const playerId = safeNum(s?.playerId);
  const statusDate = parsePCMSDateOnly(s?.statusDate);
  const salaryYear = safeNum(s?.seasonYear) ?? (statusDate ? safeNum(statusDate.slice(0, 4)) : null);
  const statusLk = safeStr(s?.twoWayDailyStatusLk);

  // Required by schema
  if (playerId === null || statusDate === null || salaryYear === null || statusLk === null) return null;

  return {
    player_id: playerId,
    status_date: statusDate,
    salary_year: salaryYear,

    // Optional
    day_of_season: safeNum(s?.dayOfSeason),
    status_lk: statusLk,
    status_team_id: safeNum(s?.teamId),
    contract_id: safeNum(s?.contractId),
    contract_team_id: safeNum(s?.contractTeamId),
    signing_team_id: safeNum(s?.signingTeamId),

    nba_service_days: safeNum(s?.nbaServiceDays),
    nba_service_limit: safeNum(s?.nbaServiceLimit),
    nba_days_remaining: safeNum(s?.nbaDaysRemaining),
    nba_earned_salary: safeNum(s?.nbaEarnedSalary),
    glg_earned_salary: safeNum(s?.glgEarnedSalary),
    nba_salary_days: safeNum(s?.nbaSalaryDays),
    glg_salary_days: safeNum(s?.glgSalaryDays),
    unreported_days: safeNum(s?.unreportedDays),

    season_active_nba_game_days: safeNum(s?.seasonActiveNbaGameDays),
    season_with_nba_days: safeNum(s?.seasonWithNbaDays),
    season_travel_with_nba_days: safeNum(s?.seasonTravelWithNbaDays),
    season_non_nba_days: safeNum(s?.seasonNonNbaDays),
    season_non_nba_glg_days: safeNum(s?.seasonNonNbaGlgDays),
    season_total_days: safeNum(s?.seasonTotalDays),

    created_at: parsePCMSDateTime(s?.createDate),
    updated_at: parsePCMSDateTime(s?.lastChangeDate),
    record_changed_at: parsePCMSDateTime(s?.recordChangeDate),

    ...provenance,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function main(
  dry_run = false,
  lineage_id?: number,
  s3_key?: string,
  extract_dir: string = SHARED_DIR
) {
  const startedAt = new Date().toISOString();
  const tables: UpsertResult[] = [];
  const errors: string[] = [];

  try {
    // Find the actual extract directory
    const entries = await readdir(extract_dir, { withFileTypes: true });
    const subDir = entries.find((e) => e.isDirectory());
    const baseDir = subDir ? `${extract_dir}/${subDir.name}` : extract_dir;

    // Get lineage context
    const ctx = await getLineageContext(baseDir);
    const effectiveLineageId = lineage_id ?? ctx.lineage_id;
    const effectiveS3Key = s3_key ?? ctx.s3_key;

    // Find JSON file
    const allFiles = await readdir(baseDir);
    const twoWayJsonFile = allFiles.find(
      (f) => f.includes("two-way") && !f.includes("utility") && f.endsWith(".json")
    );

    if (!twoWayJsonFile) {
      throw new Error(`No two-way JSON file found in ${baseDir}`);
    }

    // Read pre-parsed JSON
    console.log(`Reading ${twoWayJsonFile}...`);
    const data = await Bun.file(`${baseDir}/${twoWayJsonFile}`).json();

    const statuses = asArray<any>(
      data?.["xml-extract"]?.["two-way-extract"]?.["daily-statuses"]?.["daily-status"]
    );

    console.log(`Found ${statuses.length} two-way daily statuses`);

    const provenanceBase = {
      source_drop_file: effectiveS3Key,
      parser_version: PARSER_VERSION,
      ingested_at: new Date(),
    };

    const BATCH_SIZE = 500;
    for (let i = 0; i < statuses.length; i += BATCH_SIZE) {
      const batch = statuses.slice(i, i + BATCH_SIZE);

      const rows = batch
        .map((s) => {
          const transformed = transformTwoWayDailyStatus(s, provenanceBase);
          if (!transformed) return null;
          return {
            ...transformed,
            source_hash: hash(JSON.stringify(s)),
          };
        })
        .filter(Boolean) as any[];

      if (rows.length === 0) continue;

      if (!dry_run) {
        const result = await upsertBatch("pcms", "two_way_daily_statuses", rows, [
          "player_id",
          "status_date",
        ]);
        tables.push(result);
        if (!result.success) errors.push(result.error!);
      } else {
        tables.push({ table: "pcms.two_way_daily_statuses", attempted: rows.length, success: true });
      }
    }

    return {
      dry_run,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables,
      errors,
    };
  } catch (e: any) {
    errors.push(e.message);
    return {
      dry_run,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables,
      errors,
    };
  }
}
