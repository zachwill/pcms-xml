/**
 * People & Identity Import (consolidated)
 *
 * Merges:
 * - players_&_people.inline_script.ts   -> pcms.people
 * - agents_&_agencies.inline_script.ts -> pcms.agencies, pcms.agents
 *
 * Order (FK-safe): agencies → agents → people
 */
import { SQL } from "bun";
import { readdir } from "node:fs/promises";

const sql = new SQL({ url: Bun.env.POSTGRES_URL!, prepare: false });

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (inline, self-contained)
// ─────────────────────────────────────────────────────────────────────────────

function asArray<T = any>(val: any): T[] {
  if (val === null || val === undefined) return [];
  return Array.isArray(val) ? val : [val];
}

function toIntOrNull(val: unknown): number | null {
  if (val === "" || val === null || val === undefined) return null;
  const n = Number(val);
  return Number.isFinite(n) ? n : null;
}

function buildFullName(firstName: unknown, lastName: unknown): string | null {
  const f = (firstName ?? "").toString().trim();
  const l = (lastName ?? "").toString().trim();
  const full = `${f} ${l}`.trim();
  return full.length ? full : null;
}

async function resolveBaseDir(extractDir: string): Promise<string> {
  const entries = await readdir(extractDir, { withFileTypes: true });
  const subDir = entries.find((e) => e.isDirectory());
  return subDir ? `${extractDir}/${subDir.name}` : extractDir;
}

function buildTeamCodeMap(lookups: any): Map<number, string> {
  const teamsData: any[] = lookups?.lk_teams?.lk_team || [];
  const teamCodeMap = new Map<number, string>();
  for (const t of teamsData) {
    const teamId = t?.team_id;
    const teamCode = t?.team_code ?? t?.team_name_short;
    if (teamId && teamCode) teamCodeMap.set(Number(teamId), String(teamCode));
  }
  return teamCodeMap;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

export async function main(dry_run = false, extract_dir = "./shared/pcms") {
  const startedAt = new Date().toISOString();
  const tables: { table: string; attempted: number; success: boolean }[] = [];

  try {
    const baseDir = await resolveBaseDir(extract_dir);

    const lookups: any = await Bun.file(`${baseDir}/lookups.json`).json();
    const players: any[] = await Bun.file(`${baseDir}/players.json`).json();

    const teamCodeMap = buildTeamCodeMap(lookups);
    const ingestedAt = new Date();

    // ─────────────────────────────────────────────────────────────────────────
    // Agencies
    // ─────────────────────────────────────────────────────────────────────────

    const agenciesRaw = asArray<any>(lookups?.lk_agencies?.lk_agency);
    const agencyRows = agenciesRaw
      .map((a) => {
        const agencyId = toIntOrNull(a?.agency_id);
        if (agencyId === null) return null;

        return {
          agency_id: agencyId,
          agency_name: a?.agency_name ?? null,
          is_active: a?.active_flg ?? null,
          created_at: a?.create_date ?? null,
          updated_at: a?.last_change_date ?? null,
          record_changed_at: a?.record_change_date ?? null,
          agency_json: a ?? null,
          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    // Upfront dedupe
    const agenciesSeen = new Map<number, any>();
    for (const r of agencyRows) agenciesSeen.set(r.agency_id, r);
    const agencies = [...agenciesSeen.values()];

    const agencyNameById = new Map<number, string>();
    for (const a of agencies) {
      if (a.agency_id !== null && a.agency_name) agencyNameById.set(a.agency_id, a.agency_name);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Agents (subset of players.json)
    // ─────────────────────────────────────────────────────────────────────────

    const agentsRaw = players.filter((p) => p?.person_type_lk === "AGENT");

    const agentRows = agentsRaw
      .map((p) => {
        const agentId = toIntOrNull(p?.player_id);
        if (agentId === null) return null;

        const agencyId = toIntOrNull(p?.agency_id);

        return {
          agent_id: agentId,
          agency_id: agencyId,
          agency_name: agencyId !== null ? agencyNameById.get(agencyId) ?? null : null,
          first_name: p?.first_name ?? null,
          last_name: p?.last_name ?? null,
          full_name: buildFullName(p?.first_name, p?.last_name),
          is_active: p?.record_status_lk ? p.record_status_lk === "ACT" : null,
          is_certified: true,
          person_type_lk: p?.person_type_lk ?? null,
          created_at: p?.create_date ?? null,
          updated_at: p?.last_change_date ?? null,
          record_changed_at: p?.record_change_date ?? null,
          agent_json: p ?? null,
          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    // Upfront dedupe
    const agentsSeen = new Map<number, any>();
    for (const r of agentRows) agentsSeen.set(r.agent_id, r);
    const agents = [...agentsSeen.values()];

    // ─────────────────────────────────────────────────────────────────────────
    // People (all records in players.json)
    // ─────────────────────────────────────────────────────────────────────────

    const peopleRows = players
      .map((p) => {
        const personId = toIntOrNull(p?.player_id);
        if (personId === null) return null;

        const teamId = toIntOrNull(p.team_id);
        const draftTeamId = toIntOrNull(p.draft_team_id);
        const dlgReturningRightsTeamId = toIntOrNull(p.dlg_returning_rights_team_id);
        const dlgTeamId = toIntOrNull(p.dlg_team_id);

        return {
          // NOTE: players.json uses player_id as the person identifier
          person_id: personId,
          first_name: p.first_name ?? null,
          last_name: p.last_name ?? null,
          middle_name: p.middle_name || null,
          display_first_name: p.display_first_name ?? null,
          display_last_name: p.display_last_name ?? null,
          roster_first_name: p.roster_first_name ?? null,
          roster_last_name: p.roster_last_name ?? null,
          birth_date: p.birth_date || null,
          birth_country_lk: p.birth_country_lk ?? null,
          gender: p.gender ?? null,
          height: toIntOrNull(p.height),
          weight: toIntOrNull(p.weight),
          person_type_lk: p.person_type_lk ?? null,
          player_status_lk: p.player_status_lk ?? null,
          record_status_lk: p.record_status_lk ?? null,
          league_lk: p.league_lk ?? null,

          team_id: teamId,
          team_code: teamId ? (teamCodeMap.get(teamId) ?? null) : null,

          draft_team_id: draftTeamId,
          draft_team_code: draftTeamId ? (teamCodeMap.get(draftTeamId) ?? null) : null,

          dlg_returning_rights_team_id: dlgReturningRightsTeamId,
          dlg_returning_rights_team_code: dlgReturningRightsTeamId
            ? (teamCodeMap.get(dlgReturningRightsTeamId) ?? null)
            : null,

          dlg_team_id: dlgTeamId,
          dlg_team_code: dlgTeamId ? (teamCodeMap.get(dlgTeamId) ?? null) : null,

          // Identity links (available in PCMS extract)
          agency_id: toIntOrNull(p.agency_id),
          agent_id: toIntOrNull(p.agent_id),

          school_id: toIntOrNull(p.school_id),
          draft_year: toIntOrNull(p.draft_year),
          draft_round: toIntOrNull(p.draft_round),
          draft_pick: toIntOrNull(Array.isArray(p.draft_pick) ? p.draft_pick[0] : p.draft_pick),
          years_of_service: toIntOrNull(p.years_of_service),
          service_years_json: p.player_service_years ?? null,
          created_at: p.create_date || null,
          updated_at: p.last_change_date || null,
          record_changed_at: p.record_change_date || null,
          poison_pill_amt: toIntOrNull(p.poison_pill_amt),
          is_two_way: p.two_way_flg ?? false,
          is_flex: p.flex_flg ?? false,
          ingested_at: ingestedAt,
        };
      })
      .filter(Boolean) as Record<string, any>[];

    // Upfront dedupe
    const peopleSeen = new Map<number, any>();
    for (const r of peopleRows) peopleSeen.set(r.person_id, r);
    const people = [...peopleSeen.values()];

    console.log(`Found ${agencies.length} agencies`);
    console.log(`Found ${agents.length} agents`);
    console.log(`Found ${people.length} people`);

    if (dry_run) {
      return {
        dry_run: true,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        tables: [
          { table: "pcms.agencies", attempted: agencies.length, success: true },
          { table: "pcms.agents", attempted: agents.length, success: true },
          { table: "pcms.people", attempted: people.length, success: true },
        ],
        errors: [],
      };
    }

    const BATCH_SIZE = 100;

    // ─────────────────────────────────────────────────────────────────────────
    // Upsert agencies (FK base)
    // ─────────────────────────────────────────────────────────────────────────

    for (let i = 0; i < agencies.length; i += BATCH_SIZE) {
      const batch = agencies.slice(i, i + BATCH_SIZE);

      await sql`
        INSERT INTO pcms.agencies ${sql(batch)}
        ON CONFLICT (agency_id) DO UPDATE SET
          agency_name = EXCLUDED.agency_name,
          is_active = EXCLUDED.is_active,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          record_changed_at = EXCLUDED.record_changed_at,
          agency_json = EXCLUDED.agency_json,
          ingested_at = EXCLUDED.ingested_at
      `;
    }
    tables.push({ table: "pcms.agencies", attempted: agencies.length, success: true });

    // ─────────────────────────────────────────────────────────────────────────
    // Upsert agents
    // ─────────────────────────────────────────────────────────────────────────

    for (let i = 0; i < agents.length; i += BATCH_SIZE) {
      const batch = agents.slice(i, i + BATCH_SIZE);

      await sql`
        INSERT INTO pcms.agents ${sql(batch)}
        ON CONFLICT (agent_id) DO UPDATE SET
          agency_id = EXCLUDED.agency_id,
          agency_name = EXCLUDED.agency_name,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          full_name = EXCLUDED.full_name,
          is_active = EXCLUDED.is_active,
          is_certified = EXCLUDED.is_certified,
          person_type_lk = EXCLUDED.person_type_lk,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          record_changed_at = EXCLUDED.record_changed_at,
          agent_json = EXCLUDED.agent_json,
          ingested_at = EXCLUDED.ingested_at
      `;
    }
    tables.push({ table: "pcms.agents", attempted: agents.length, success: true });

    // ─────────────────────────────────────────────────────────────────────────
    // Upsert people
    // ─────────────────────────────────────────────────────────────────────────

    for (let i = 0; i < people.length; i += BATCH_SIZE) {
      const batch = people.slice(i, i + BATCH_SIZE);

      await sql`
        INSERT INTO pcms.people ${sql(batch)}
        ON CONFLICT (person_id) DO UPDATE SET
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          middle_name = EXCLUDED.middle_name,
          display_first_name = EXCLUDED.display_first_name,
          display_last_name = EXCLUDED.display_last_name,
          roster_first_name = EXCLUDED.roster_first_name,
          roster_last_name = EXCLUDED.roster_last_name,
          birth_date = EXCLUDED.birth_date,
          birth_country_lk = EXCLUDED.birth_country_lk,
          gender = EXCLUDED.gender,
          height = EXCLUDED.height,
          weight = EXCLUDED.weight,
          person_type_lk = EXCLUDED.person_type_lk,
          player_status_lk = EXCLUDED.player_status_lk,
          record_status_lk = EXCLUDED.record_status_lk,
          league_lk = EXCLUDED.league_lk,
          team_id = EXCLUDED.team_id,
          team_code = EXCLUDED.team_code,
          draft_team_id = EXCLUDED.draft_team_id,
          draft_team_code = EXCLUDED.draft_team_code,
          dlg_returning_rights_team_id = EXCLUDED.dlg_returning_rights_team_id,
          dlg_returning_rights_team_code = EXCLUDED.dlg_returning_rights_team_code,
          dlg_team_id = EXCLUDED.dlg_team_id,
          dlg_team_code = EXCLUDED.dlg_team_code,
          agency_id = EXCLUDED.agency_id,
          agent_id = EXCLUDED.agent_id,
          school_id = EXCLUDED.school_id,
          draft_year = EXCLUDED.draft_year,
          draft_round = EXCLUDED.draft_round,
          draft_pick = EXCLUDED.draft_pick,
          years_of_service = EXCLUDED.years_of_service,
          service_years_json = EXCLUDED.service_years_json,
          poison_pill_amt = EXCLUDED.poison_pill_amt,
          is_two_way = EXCLUDED.is_two_way,
          is_flex = EXCLUDED.is_flex,
          updated_at = EXCLUDED.updated_at,
          record_changed_at = EXCLUDED.record_changed_at,
          ingested_at = EXCLUDED.ingested_at
      `;
    }
    tables.push({ table: "pcms.people", attempted: people.length, success: true });

    return {
      dry_run: false,
      started_at: startedAt,
      finished_at: new Date().toISOString(),
      tables,
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
