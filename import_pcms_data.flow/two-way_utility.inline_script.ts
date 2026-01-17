/**
 * Two-Way Utility Import
 *
 * Sources:
 * - two_way_utility.json
 *   - active_list_by_team.two_way_util_game[*].two_way_util_players -> pcms.two_way_game_utility
 *   - under15_games.under15_team_budget[*]                         -> pcms.team_two_way_capacity
 *
 * - two_way.json
 *   - two_way_seasons -> contracts -> pcms.two_way_contract_utility
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
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function toBoolOrNull(val: unknown): boolean | null {
  if (val === "" || val === null || val === undefined) return null;
  if (typeof val === "boolean") return val;
  const s = String(val).toLowerCase();
  if (s === "true" || s === "t" || s === "1" || s === "y" || s === "yes") return true;
  if (s === "false" || s === "f" || s === "0" || s === "n" || s === "no") return false;
  return null;
}

function toDateOrNull(val: unknown): string | null {
  if (val === "" || val === null || val === undefined) return null;
  const s = String(val);
  // PCMS uses ISO timestamps with TZ offsets; the schema expects a date.
  return s.length >= 10 ? s.slice(0, 10) : null;
}

function asArray<T = any>(val: any): T[] {
  if (val === null || val === undefined || val === "") return [];
  return Array.isArray(val) ? val : [val];
}

async function resolveBaseDir(extractDir: string): Promise<string> {
  const entries = await readdir(extractDir, { withFileTypes: true });
  const subDir = entries.find((e) => e.isDirectory());
  return subDir ? `${extractDir}/${subDir.name}` : extractDir;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function main(dry_run = false, extract_dir = "./shared/pcms") {
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

    const utilFile = Bun.file(`${baseDir}/two_way_utility.json`);
    const util = (await utilFile.exists()) ? await utilFile.json() : null;

    const games = asArray(util?.active_list_by_team?.two_way_util_game);
    const budgets = asArray(util?.under15_games?.under15_team_budget);

    // two_way.json includes contract-level utility data.
    const twoWayFile = Bun.file(`${baseDir}/two_way.json`);
    const twoWay = (await twoWayFile.exists()) ? await twoWayFile.json() : null;

    console.log(`Found ${games.length} two-way utility games`);
    console.log(`Found ${budgets.length} team two-way capacity rows`);

    const ingestedAt = new Date();

    const gameRows = games
      .flatMap((g: any) => {
        const gameId = toIntOrNull(g?.game_id);
        const teamId = toIntOrNull(g?.team_id);
        const oppositionTeamId = toIntOrNull(g?.opposition_team_id);
        const gameDate = toDateOrNull(g?.date_est);
        const standardContractsOnTeam = toIntOrNull(g?.number_of_standard_nba_contracts);

        if (gameId === null || teamId === null) return [];

        const players = asArray(g?.two_way_util_players?.two_way_util_player);

        return players
          .map((p: any) => {
            const playerId = toIntOrNull(p?.player_id);
            if (playerId === null) return null;

            return {
              game_id: gameId,
              team_id: teamId,
              team_code: teamCodeMap.get(teamId) ?? null,

              player_id: playerId,
              game_date_est: gameDate,

              opposition_team_id: oppositionTeamId,
              opposition_team_code:
                oppositionTeamId !== null ? (teamCodeMap.get(oppositionTeamId) ?? null) : null,

              roster_first_name: p?.roster_first_name ?? null,
              roster_last_name: p?.roster_last_name ?? null,
              display_first_name: p?.display_first_name ?? null,
              display_last_name: p?.display_last_name ?? null,
              games_on_active_list: toIntOrNull(p?.number_of_games_on_active_list),
              active_list_games_limit: toIntOrNull(p?.active_list_games_limit),
              standard_nba_contracts_on_team: standardContractsOnTeam,
              ingested_at: ingestedAt,
            };
          })
          .filter(Boolean);
      })
      .filter(Boolean) as Record<string, any>[];

    const capacityRows = budgets
      .map((b: any) => {
        const teamId = toIntOrNull(b?.team_id);
        if (teamId === null) return null;

        return {
          team_id: teamId,
          current_contract_count: toIntOrNull(b?.current_contract_count),
          games_remaining: toIntOrNull(b?.games_remaining),
          under_15_games_count: toIntOrNull(b?.under15_games_count),
          under_15_games_remaining: toIntOrNull(b?.under15_games_remaining),
          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    // two_way_contract_utility
    const seasons = asArray<any>(
      twoWay?.two_way_seasons?.["two-way-season"] ??
        twoWay?.two_way_seasons?.two_way_season ??
        twoWay?.two_way_seasons
    );

    const contractRowMap = new Map<number, Record<string, any>>();

    for (const s of seasons) {
      const players = asArray<any>(
        s?.["two-way-players"]?.["two-way-player"] ?? s?.two_way_players?.two_way_player
      );

      for (const p of players) {
        const contracts = asArray<any>(
          p?.["two-way-contracts"]?.["two-way-contract"] ?? p?.two_way_contracts?.two_way_contract
        );

        for (const c of contracts) {
          const contractId = toIntOrNull(c?.contract_id);
          const playerId = toIntOrNull(c?.player_id ?? p?.player_id);
          if (contractId === null || playerId === null) continue;

          const contractTeamId = toIntOrNull(c?.contract_team_id);
          const signingTeamId = toIntOrNull(c?.signing_team_id);

          const row = {
            contract_id: contractId,
            player_id: playerId,

            contract_team_id: contractTeamId,
            contract_team_code:
              contractTeamId !== null ? (teamCodeMap.get(contractTeamId) ?? null) : null,

            signing_team_id: signingTeamId,
            signing_team_code:
              signingTeamId !== null ? (teamCodeMap.get(signingTeamId) ?? null) : null,

            is_active_two_way_contract: toBoolOrNull(c?.is_active_two_way_contract),
            games_on_active_list: toIntOrNull(c?.number_of_games_on_active_list),
            active_list_games_limit: toIntOrNull(c?.active_list_games_limit),
            remaining_active_list_games: toIntOrNull(c?.remaining_active_list_games),

            ingested_at: ingestedAt,
          };

          // Dedupe by contract_id to avoid batch-level ON CONFLICT duplicates.
          contractRowMap.set(contractId, row);
        }
      }
    }

    const contractRows = Array.from(contractRowMap.values());
    console.log(`Found ${contractRows.length} two-way contract utility rows`);

    if (dry_run) {
      return {
        dry_run: true,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        tables: [
          {
            table: "pcms.two_way_game_utility",
            attempted: gameRows.length,
            success: true,
          },
          {
            table: "pcms.two_way_contract_utility",
            attempted: contractRows.length,
            success: true,
          },
          {
            table: "pcms.team_two_way_capacity",
            attempted: capacityRows.length,
            success: true,
          },
        ],
        errors: [],
      };
    }

    const BATCH_SIZE = 100;

    // pcms.two_way_game_utility
    for (let i = 0; i < gameRows.length; i += BATCH_SIZE) {
      const batch = gameRows.slice(i, i + BATCH_SIZE);

      await sql`
        INSERT INTO pcms.two_way_game_utility ${sql(batch)}
        ON CONFLICT (game_id, player_id) DO UPDATE SET
          team_id = EXCLUDED.team_id,
          team_code = EXCLUDED.team_code,
          game_date_est = EXCLUDED.game_date_est,
          opposition_team_id = EXCLUDED.opposition_team_id,
          opposition_team_code = EXCLUDED.opposition_team_code,
          roster_first_name = EXCLUDED.roster_first_name,
          roster_last_name = EXCLUDED.roster_last_name,
          display_first_name = EXCLUDED.display_first_name,
          display_last_name = EXCLUDED.display_last_name,
          games_on_active_list = EXCLUDED.games_on_active_list,
          active_list_games_limit = EXCLUDED.active_list_games_limit,
          standard_nba_contracts_on_team = EXCLUDED.standard_nba_contracts_on_team,
          ingested_at = EXCLUDED.ingested_at
      `;
    }

    // pcms.two_way_contract_utility
    for (let i = 0; i < contractRows.length; i += BATCH_SIZE) {
      const batch = contractRows.slice(i, i + BATCH_SIZE);

      await sql`
        INSERT INTO pcms.two_way_contract_utility ${sql(batch)}
        ON CONFLICT (contract_id) DO UPDATE SET
          player_id = EXCLUDED.player_id,
          contract_team_id = EXCLUDED.contract_team_id,
          contract_team_code = EXCLUDED.contract_team_code,
          signing_team_id = EXCLUDED.signing_team_id,
          signing_team_code = EXCLUDED.signing_team_code,
          is_active_two_way_contract = EXCLUDED.is_active_two_way_contract,
          games_on_active_list = EXCLUDED.games_on_active_list,
          active_list_games_limit = EXCLUDED.active_list_games_limit,
          remaining_active_list_games = EXCLUDED.remaining_active_list_games,
          ingested_at = EXCLUDED.ingested_at
      `;
    }

    // pcms.team_two_way_capacity
    for (let i = 0; i < capacityRows.length; i += BATCH_SIZE) {
      const batch = capacityRows.slice(i, i + BATCH_SIZE);

      await sql`
        INSERT INTO pcms.team_two_way_capacity ${sql(batch)}
        ON CONFLICT (team_id) DO UPDATE SET
          current_contract_count = EXCLUDED.current_contract_count,
          games_remaining = EXCLUDED.games_remaining,
          under_15_games_count = EXCLUDED.under_15_games_count,
          under_15_games_remaining = EXCLUDED.under_15_games_remaining,
          ingested_at = EXCLUDED.ingested_at
      `;
    }

    return {
      dry_run: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables: [
        { table: "pcms.two_way_game_utility", attempted: gameRows.length, success: true },
        { table: "pcms.two_way_contract_utility", attempted: contractRows.length, success: true },
        { table: "pcms.team_two_way_capacity", attempted: capacityRows.length, success: true },
      ],
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
