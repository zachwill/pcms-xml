/**
 * Waiver Priority & Ranks (plus Tax configuration)
 *
 * Reads pre-parsed JSON from the shared extract dir (created by lineage step),
 * then upserts into:
 * - pcms.waiver_priority
 * - pcms.waiver_priority_ranks
 * - pcms.league_tax_rates
 * - pcms.tax_team_status
 *
 * Source JSON files (if present):
 * - *_waiver-priority-extract.json
 * - *_tax-rates-extract.json
 * - *_tax-teams-extract.json
 *
 * Expected paths:
 *   data["xml-extract"]["waiver-priority-extract"].waiverPriority
 *   data["xml-extract"]["tax-rates-extract"].taxRate
 *   data["xml-extract"]["tax-teams-extract"].taxTeam
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

function safeBool(val: unknown): boolean | null {
  const v = nilSafe(val);
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean") return v;
  if (v === 1 || v === "1" || v === "Y" || v === "true" || v === true) return true;
  if (v === 0 || v === "0" || v === "N" || v === "false" || v === false) return false;
  return null;
}

function safeBigInt(val: unknown): string | null {
  const v = nilSafe(val);
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "object") return null;
  try {
    return BigInt(Math.round(Number(v))).toString();
  } catch {
    return null;
  }
}

function parsePCMSDate(val: unknown): string | null {
  const v = safeStr(val);
  if (!v || v === "0001-01-01") return null;
  return !isNaN(Date.parse(v)) ? v : null;
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

function transformWaiverPriority(wp: any, provenance: Record<string, unknown>) {
  const waiver_priority_id = safeNum(wp?.waiverPriorityId);
  if (waiver_priority_id === null) return null;

  return {
    waiver_priority_id,
    priority_date: parsePCMSDate(wp?.priorityDate),
    seqno: safeNum(wp?.seqno),
    status_lk: safeStr(wp?.recordStatusLk),
    comments: safeStr(wp?.comments),
    created_at: parsePCMSDate(wp?.createDate),
    updated_at: parsePCMSDate(wp?.lastChangeDate),
    record_changed_at: parsePCMSDate(wp?.recordChangeDate),
    ...provenance,
  };
}

function transformWaiverPriorityRank(wpr: any, waiverPriorityId: number, provenance: Record<string, unknown>) {
  const waiver_priority_rank_id = safeNum(wpr?.waiverPriorityDetailId);
  if (waiver_priority_rank_id === null) return null;

  return {
    waiver_priority_rank_id,
    waiver_priority_id: waiverPriorityId,
    team_id: safeNum(wpr?.teamId),
    priority_order: safeNum(wpr?.priorityOrder),
    is_order_priority: safeBool(wpr?.orderPriorityFlg),
    exclusivity_status_lk: safeStr(wpr?.exclusivityStatusLk),
    exclusivity_expiration_date: parsePCMSDate(wpr?.exclusivityExpirationDate),
    status_lk: safeStr(wpr?.recordStatusLk),
    seqno: safeNum(wpr?.seqno),
    comments: safeStr(wpr?.comments),
    created_at: parsePCMSDate(wpr?.createDate),
    updated_at: parsePCMSDate(wpr?.lastChangeDate),
    record_changed_at: parsePCMSDate(wpr?.recordChangeDate),
    ...provenance,
  };
}

function transformTaxRate(tr: any, provenance: Record<string, unknown>) {
  // The tax-rates extract does not include leagueLk; schema expects NBA-only.
  const league_lk = safeStr(tr?.leagueLk) ?? "NBA";

  const salary_year = safeNum(tr?.salaryYear);
  const lower_limit = safeBigInt(tr?.lowerLimit);
  const tax_rate_non_repeater = safeNum(tr?.taxRateNonRepeater);
  const tax_rate_repeater = safeNum(tr?.taxRateRepeater);

  if (salary_year === null || lower_limit === null || tax_rate_non_repeater === null || tax_rate_repeater === null) {
    return null;
  }

  return {
    league_lk,
    salary_year,
    lower_limit,
    upper_limit: safeBigInt(tr?.upperLimit),
    tax_rate_non_repeater,
    tax_rate_repeater,
    base_charge_non_repeater: safeBigInt(tr?.baseChargeNonRepeater),
    base_charge_repeater: safeBigInt(tr?.baseChargeRepeater),
    created_at: parsePCMSDate(tr?.createDate),
    updated_at: parsePCMSDate(tr?.lastChangeDate),
    record_changed_at: parsePCMSDate(tr?.recordChangeDate),
    ...provenance,
  };
}

function transformTaxTeamStatus(tts: any, provenance: Record<string, unknown>) {
  const team_id = safeNum(tts?.teamId);
  const salary_year = safeNum(tts?.salaryYear);
  if (team_id === null || salary_year === null) return null;

  return {
    team_id,
    salary_year,
    is_taxpayer: safeBool(tts?.taxpayerFlg) ?? false,
    is_repeater_taxpayer: safeBool(tts?.taxpayerRepeaterRateFlg) ?? false,
    is_subject_to_apron: safeBool(tts?.subjectToApronFlg) ?? false,
    apron_level_lk: safeStr(tts?.apronLevelLk),
    subject_to_apron_reason_lk: safeStr(tts?.subjectToApronReasonLk),
    apron1_transaction_id: safeNum(tts?.apron1TransactionId),
    apron2_transaction_id: safeNum(tts?.apron2TransactionId),
    created_at: parsePCMSDate(tts?.createDate),
    updated_at: parsePCMSDate(tts?.lastChangeDate),
    record_changed_at: parsePCMSDate(tts?.recordChangeDate),
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
    void effectiveLineageId; // lineage_id not stored on these tables

    const provenanceBase = {
      source_drop_file: effectiveS3Key,
      parser_version: PARSER_VERSION,
      ingested_at: new Date(),
    };

    const allFiles = await readdir(baseDir);
    const waiverJsonFile = allFiles.find((f) => f.includes("waiver-priority") && f.endsWith(".json"));
    const taxRatesJsonFile = allFiles.find((f) => f.includes("tax-rates") && f.endsWith(".json"));
    const taxTeamsJsonFile = allFiles.find((f) => f.includes("tax-teams") && f.endsWith(".json"));

    if (!waiverJsonFile && !taxRatesJsonFile && !taxTeamsJsonFile) {
      throw new Error(`No waiver/tax JSON files found in ${baseDir}`);
    }

    const BATCH_SIZE = 500;

    // -------------------------------------------------------------------------
    // waiver_priority + waiver_priority_ranks
    // -------------------------------------------------------------------------

    if (waiverJsonFile) {
      console.log(`Reading ${waiverJsonFile}...`);
      const data = await Bun.file(`${baseDir}/${waiverJsonFile}`).json();

      const waiverPriorities = asArray<any>(data?.["xml-extract"]?.["waiver-priority-extract"]?.waiverPriority);
      console.log(`Found ${waiverPriorities.length} waiver priorities`);

      const priorityRows: any[] = [];
      const rankRows: any[] = [];

      for (const wp of waiverPriorities) {
        const priorityHash = hash(JSON.stringify(wp));
        const pRow = transformWaiverPriority(wp, { ...provenanceBase, source_hash: priorityHash });
        if (!pRow) continue;
        priorityRows.push(pRow);

        const ranks = asArray<any>(wp?.waiverPriorityRanks?.waiverPriorityRank);
        for (const r of ranks) {
          const rHash = hash(JSON.stringify({ waiverPriorityId: pRow.waiver_priority_id, ...r }));
          const rRow = transformWaiverPriorityRank(r, pRow.waiver_priority_id, { ...provenanceBase, source_hash: rHash });
          if (!rRow) continue;
          rankRows.push(rRow);
        }
      }

      for (let i = 0; i < priorityRows.length; i += BATCH_SIZE) {
        const batch = priorityRows.slice(i, i + BATCH_SIZE);
        if (!dry_run) {
          const result = await upsertBatch("pcms", "waiver_priority", batch, ["waiver_priority_id"]);
          tables.push(result);
          if (!result.success) errors.push(result.error!);
        } else {
          tables.push({ table: "pcms.waiver_priority", attempted: batch.length, success: true });
        }
      }

      for (let i = 0; i < rankRows.length; i += BATCH_SIZE) {
        const batch = rankRows.slice(i, i + BATCH_SIZE);
        if (!dry_run) {
          const result = await upsertBatch("pcms", "waiver_priority_ranks", batch, ["waiver_priority_rank_id"]);
          tables.push(result);
          if (!result.success) errors.push(result.error!);
        } else {
          tables.push({ table: "pcms.waiver_priority_ranks", attempted: batch.length, success: true });
        }
      }
    } else {
      errors.push(`No waiver-priority JSON file found in ${baseDir}`);
    }

    // -------------------------------------------------------------------------
    // league_tax_rates
    // -------------------------------------------------------------------------

    if (taxRatesJsonFile) {
      console.log(`Reading ${taxRatesJsonFile}...`);
      const data = await Bun.file(`${baseDir}/${taxRatesJsonFile}`).json();

      const taxRates = asArray<any>(data?.["xml-extract"]?.["tax-rates-extract"]?.taxRate);
      console.log(`Found ${taxRates.length} tax rates`);

      const rows = taxRates
        .map((tr) => {
          const transformed = transformTaxRate(tr, provenanceBase);
          if (!transformed) return null;
          return { ...transformed, source_hash: hash(JSON.stringify(tr)) };
        })
        .filter(Boolean) as Record<string, unknown>[];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        if (!dry_run) {
          const result = await upsertBatch("pcms", "league_tax_rates", batch, ["league_lk", "salary_year", "lower_limit"]);
          tables.push(result);
          if (!result.success) errors.push(result.error!);
        } else {
          tables.push({ table: "pcms.league_tax_rates", attempted: batch.length, success: true });
        }
      }
    } else {
      errors.push(`No tax-rates JSON file found in ${baseDir}`);
    }

    // -------------------------------------------------------------------------
    // tax_team_status
    // -------------------------------------------------------------------------

    if (taxTeamsJsonFile) {
      console.log(`Reading ${taxTeamsJsonFile}...`);
      const data = await Bun.file(`${baseDir}/${taxTeamsJsonFile}`).json();

      const taxTeams = asArray<any>(data?.["xml-extract"]?.["tax-teams-extract"]?.taxTeam);
      console.log(`Found ${taxTeams.length} tax teams`);

      const rows = taxTeams
        .map((t) => {
          const transformed = transformTaxTeamStatus(t, provenanceBase);
          if (!transformed) return null;
          return { ...transformed, source_hash: hash(JSON.stringify(t)) };
        })
        .filter(Boolean) as Record<string, unknown>[];

      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const batch = rows.slice(i, i + BATCH_SIZE);

        if (!dry_run) {
          const result = await upsertBatch("pcms", "tax_team_status", batch, ["team_id", "salary_year"]);
          tables.push(result);
          if (!result.success) errors.push(result.error!);
        } else {
          tables.push({ table: "pcms.tax_team_status", attempted: batch.length, success: true });
        }
      }
    } else {
      errors.push(`No tax-teams JSON file found in ${baseDir}`);
    }

    return {
      dry_run,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables,
      errors,
    };
  } catch (e: any) {
    errors.push(e?.message ?? String(e));
    return {
      dry_run,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables,
      errors,
    };
  }
}
