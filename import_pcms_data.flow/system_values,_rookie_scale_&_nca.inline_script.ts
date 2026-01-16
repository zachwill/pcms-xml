/**
 * System Values, Rookie Scale & Non-Contract Amounts Import
 *
 * Reads pre-parsed JSON from shared extract dir (created by lineage step), then
 * upserts into:
 * - pcms.league_system_values
 * - pcms.rookie_scale_amounts
 * - pcms.non_contract_amounts
 *
 * Source JSON files:
 * - *_yearly-system-values.json
 *   Path: data["xml-extract"]["yearly-system-values-extract"]["yearlySystemValue"]
 * - *_rookie-scale-amounts.json
 *   Path: data["xml-extract"]["rookie-scale-amounts-extract"]["rookieScaleAmount"]
 * - *_nca-extract.json
 *   Path: data["xml-extract"]["nca-extract"]["nonContractAmount"]
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

function transformLeagueSystemValue(sv: any, provenance: any) {
  return {
    league_lk: safeStr(sv?.leagueLk),
    salary_year: safeNum(sv?.systemYear),

    // Amounts
    salary_cap_amount: safeBigInt(sv?.capAmount),
    tax_level_amount: safeBigInt(sv?.taxLevel),
    tax_apron_amount: safeBigInt(sv?.taxApron),
    tax_apron2_amount: safeBigInt(sv?.taxApron2),
    tax_bracket_amount: safeBigInt(sv?.taxBracketAmount),
    minimum_team_salary_amount: safeBigInt(sv?.minTeamSalary),

    maximum_salary_25_pct: safeBigInt(sv?.maximumSalary25),
    maximum_salary_30_pct: safeBigInt(sv?.maximumSalary30),
    maximum_salary_35_pct: safeBigInt(sv?.maximumSalary35),

    average_salary_amount: safeBigInt(sv?.averageSalary),
    estimated_average_salary_amount: safeBigInt(sv?.estimatedAverageSalary),

    non_taxpayer_mid_level_amount: safeBigInt(sv?.nonTaxpayerMidLevelAmount),
    taxpayer_mid_level_amount: safeBigInt(sv?.taxpayerMidLevelAmount),
    room_mid_level_amount: safeBigInt(sv?.roomMidLevelAmount),
    bi_annual_amount: safeBigInt(sv?.biAnnualAmount),

    two_way_salary_amount: safeBigInt(sv?.twoWaySalaryAmount),
    two_way_dlg_salary_amount: safeBigInt(sv?.twoWayDlgSalaryAmount),

    tpe_dollar_allowance: safeBigInt(sv?.tpeDollarAllowance),
    max_trade_cash_amount: safeBigInt(sv?.maxTradeCashAmount),
    international_player_payment_limit: safeBigInt(sv?.internationalPlayerPayment),

    scale_raise_rate: safeNum(sv?.scaleRaiseRate),

    // Dates
    days_in_season: safeNum(sv?.daysInSeason),
    season_start_at: parsePCMSDate(sv?.firstDayOfSeason),
    season_end_at: parsePCMSDate(sv?.lastDayOfSeason),
    playing_start_at: parsePCMSDate(sv?.playingStartDate),
    playing_end_at: parsePCMSDate(sv?.playingEndDate),
    finals_end_at: parsePCMSDate(sv?.lastDayOfFinals),

    training_camp_start_at: parsePCMSDate(sv?.trainingCampStartDate),
    training_camp_end_at: parsePCMSDate(sv?.trainingCampEndDate),
    rookie_camp_start_at: parsePCMSDate(sv?.rookieCampStartDate),
    rookie_camp_end_at: parsePCMSDate(sv?.rookieCampEndDate),
    draft_at: parsePCMSDate(sv?.draftDate),
    moratorium_end_at: parsePCMSDate(sv?.moratoriumEndDate),
    trade_deadline_at: parsePCMSDate(sv?.tradeDeadlineDate),

    cut_down_at: parsePCMSDate(sv?.cutDownDate),
    two_way_cut_down_at: parsePCMSDate(sv?.twoWayCutDownDate),

    notification_start_at: parsePCMSDate(sv?.notificationStartDate),
    notification_end_at: parsePCMSDate(sv?.notificationEndDate),

    exception_start_at: parsePCMSDate(sv?.exceptionStartDate),
    exception_prorate_at: parsePCMSDate(sv?.exceptionProrateStartDate),
    exceptions_added_at: parsePCMSDate(sv?.exceptionsAddedDate),
    rnd2_pick_exc_zero_cap_end_at: parsePCMSDate(sv?.rnd2PickExcZeroCapEndDate),

    // Flags
    bonuses_finalized_at: parsePCMSDate(sv?.bonusesFinalizedDate),
    is_bonuses_finalized: safeBool(sv?.bonusesFinalizedFlg),
    is_cap_projection_generated: safeBool(sv?.capProjectionGeneratedFlg),
    is_exceptions_added: safeBool(sv?.exceptionsAddedFlg),

    free_agent_status_finalized_at: parsePCMSDate(sv?.freeAgentAmountsFinalizedDate),
    is_free_agent_amounts_finalized: safeBool(sv?.freeAgentAmountsFinalizedFlg),

    wnba_offseason_end_at: parsePCMSDate(sv?.wnbaOffseasonEnd),
    wnba_season_finalized_at: parsePCMSDate(sv?.wnbaSeasonFinalizedDate),
    is_wnba_season_finalized: safeBool(sv?.wnbaSeasonFinalizedFlg),

    // D-League fields
    dlg_countable_roster_moves: safeNum(sv?.dlgCountableRosterMoves),
    dlg_max_level_a_salary_players: safeNum(sv?.dlgMaxLevelASalaryPlayers),
    dlg_salary_level_a: safeNum(sv?.dlgSalaryLevelA),
    dlg_salary_level_b: safeNum(sv?.dlgSalaryLevelB),
    dlg_salary_level_c: safeNum(sv?.dlgSalaryLevelC),
    dlg_team_salary_budget: safeBigInt(sv?.dlgTeamSalaryBudget),

    created_at: parsePCMSDate(sv?.createDate),
    updated_at: parsePCMSDate(sv?.lastChangeDate),
    record_changed_at: parsePCMSDate(sv?.recordChangeDate),

    ...provenance,
  };
}

function transformRookieScaleAmount(rs: any, provenance: any) {
  return {
    salary_year: safeNum(rs?.season),
    pick_number: safeNum(rs?.pick),
    league_lk: safeStr(rs?.leagueLk) ?? "NBA",

    salary_year_1: safeBigInt(rs?.salaryYear1),
    salary_year_2: safeBigInt(rs?.salaryYear2),
    salary_year_3: safeBigInt(rs?.salaryYear3),
    salary_year_4: safeBigInt(rs?.salaryYear4),

    option_amount_year_3: safeBigInt(rs?.optionYear3),
    option_amount_year_4: safeBigInt(rs?.optionYear4),
    option_pct_year_3: safeNum(rs?.percentYear3),
    option_pct_year_4: safeNum(rs?.percentYear4),

    is_baseline_scale: safeBool(rs?.baselineScaleFlg),
    is_active: safeBool(rs?.activeFlg),

    created_at: parsePCMSDate(rs?.createDate),
    updated_at: parsePCMSDate(rs?.lastChangeDate),
    record_changed_at: parsePCMSDate(rs?.recordChangeDate),

    ...provenance,
  };
}

function transformNonContractAmount(nca: any, provenance: any) {
  const rookieScaleAmount = asArray<any>(nca?.rookieScaleAmount);

  return {
    non_contract_amount_id: safeBigInt(nca?.nonContractAmountId),

    player_id: safeNum(nca?.playerId),
    team_id: safeNum(nca?.teamId),
    salary_year: safeNum(nca?.nonContractYear),
    amount_type_lk: safeStr(nca?.nonContractAmountTypeLk ?? nca?.amountTypeLk),

    cap_amount: safeBigInt(nca?.capAmount) ?? "0",
    tax_amount: safeBigInt(nca?.taxAmount) ?? "0",
    apron_amount: safeBigInt(nca?.apronAmount) ?? "0",
    fa_amount: safeBigInt(nca?.faAmount) ?? "0",
    fa_amount_calc: safeBigInt(nca?.faAmountCalc) ?? "0",
    salary_fa_amount: safeBigInt(nca?.salaryFaAmount) ?? "0",

    qo_amount: safeBigInt(nca?.qoAmount),
    rofr_amount: safeBigInt(nca?.rofrAmount),
    rookie_scale_amount: safeBigInt(rookieScaleAmount[0]),

    carry_over_fa_flg: safeBool(nca?.carryOverFaFlg),
    fa_amount_type_lk: safeStr(nca?.freeAgentAmountTypeLk),
    fa_amount_type_lk_calc: safeStr(nca?.freeAgentAmountTypeLkCalc),
    free_agent_designation_lk: safeStr(nca?.freeAgentDesignationLk),
    free_agent_status_lk: safeStr(nca?.freeAgentStatusLk),
    min_contract_lk: safeStr(nca?.minContractLk),

    contract_id: safeNum(nca?.contractId),
    contract_type_lk: safeStr(nca?.contractTypeLk),
    transaction_id: safeNum(nca?.transactionId),

    version_number: safeStr(nca?.versionNumber),
    years_of_service: safeNum(nca?.yearsOfService),

    created_at: parsePCMSDate(nca?.createDate),
    updated_at: parsePCMSDate(nca?.lastChangeDate),
    record_changed_at: parsePCMSDate(nca?.recordChangeDate),

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
    void effectiveLineageId; // lineage_id is currently only used for consistency across scripts

    // Find JSON files
    const allFiles = await readdir(baseDir);
    const sysJsonFile = allFiles.find((f) => f.includes("yearly-system-values") && f.endsWith(".json"));
    const rookieJsonFile = allFiles.find((f) => f.includes("rookie-scale-amounts") && f.endsWith(".json"));
    const ncaJsonFile = allFiles.find((f) => (f.includes("nca-extract") || f.includes("_nca")) && f.endsWith(".json"));

    if (!sysJsonFile && !rookieJsonFile && !ncaJsonFile) {
      throw new Error(`No system-values/rookie-scale/nca JSON files found in ${baseDir}`);
    }

    const provenanceBase = {
      source_drop_file: effectiveS3Key,
      parser_version: PARSER_VERSION,
      ingested_at: new Date(),
    };

    const BATCH_SIZE = 500;

    // ── league_system_values ────────────────────────────────────────────────

    if (sysJsonFile) {
      console.log(`Reading ${sysJsonFile}...`);
      const sysData = await Bun.file(`${baseDir}/${sysJsonFile}`).json();
      const systemValues = asArray<any>(sysData?.["xml-extract"]?.["yearly-system-values-extract"]?.yearlySystemValue);

      console.log(`Found ${systemValues.length} yearly system values`);

      for (let i = 0; i < systemValues.length; i += BATCH_SIZE) {
        const batch = systemValues.slice(i, i + BATCH_SIZE);
        const rows = batch.map((sv) =>
          transformLeagueSystemValue(sv, {
            ...provenanceBase,
            source_hash: hash(JSON.stringify(sv)),
          })
        );

        if (!dry_run) {
          const result = await upsertBatch("pcms", "league_system_values", rows, ["league_lk", "salary_year"]);
          tables.push(result);
          if (!result.success) errors.push(result.error!);
        } else {
          tables.push({ table: "pcms.league_system_values", attempted: rows.length, success: true });
        }
      }
    }

    // ── rookie_scale_amounts ────────────────────────────────────────────────

    if (rookieJsonFile) {
      console.log(`Reading ${rookieJsonFile}...`);
      const rookieData = await Bun.file(`${baseDir}/${rookieJsonFile}`).json();
      const rookieScale = asArray<any>(
        rookieData?.["xml-extract"]?.["rookie-scale-amounts-extract"]?.rookieScaleAmount
      );

      console.log(`Found ${rookieScale.length} rookie scale amounts`);

      for (let i = 0; i < rookieScale.length; i += BATCH_SIZE) {
        const batch = rookieScale.slice(i, i + BATCH_SIZE);
        const rows = batch.map((rs) =>
          transformRookieScaleAmount(rs, {
            ...provenanceBase,
            source_hash: hash(JSON.stringify(rs)),
          })
        );

        if (!dry_run) {
          const result = await upsertBatch("pcms", "rookie_scale_amounts", rows, ["salary_year", "pick_number", "league_lk"]);
          tables.push(result);
          if (!result.success) errors.push(result.error!);
        } else {
          tables.push({ table: "pcms.rookie_scale_amounts", attempted: rows.length, success: true });
        }
      }
    }

    // ── non_contract_amounts ────────────────────────────────────────────────

    if (ncaJsonFile) {
      console.log(`Reading ${ncaJsonFile}...`);
      const ncaData = await Bun.file(`${baseDir}/${ncaJsonFile}`).json();
      const ncas = asArray<any>(ncaData?.["xml-extract"]?.["nca-extract"]?.nonContractAmount);

      console.log(`Found ${ncas.length} non-contract amounts`);

      for (let i = 0; i < ncas.length; i += BATCH_SIZE) {
        const batch = ncas.slice(i, i + BATCH_SIZE);
        const rows = batch.map((nca) =>
          transformNonContractAmount(nca, {
            ...provenanceBase,
            source_hash: hash(JSON.stringify(nca)),
          })
        );

        if (!dry_run) {
          const result = await upsertBatch("pcms", "non_contract_amounts", rows, ["non_contract_amount_id"]);
          tables.push(result);
          if (!result.success) errors.push(result.error!);
        } else {
          tables.push({ table: "pcms.non_contract_amounts", attempted: rows.length, success: true });
        }
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
