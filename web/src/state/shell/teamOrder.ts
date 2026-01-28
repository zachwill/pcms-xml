import { NBA_TEAMS } from "@/features/SalaryBook/data";

export const TEAM_ORDER = NBA_TEAMS.map((team) => team.team_code);

const TEAM_INDEX = new Map(TEAM_ORDER.map((code, index) => [code, index]));

export function sortTeamsByOrder(teams: string[]): string[] {
  return [...teams].sort((a, b) => {
    const indexA = TEAM_INDEX.get(a) ?? Number.MAX_SAFE_INTEGER;
    const indexB = TEAM_INDEX.get(b) ?? Number.MAX_SAFE_INTEGER;
    return indexA - indexB;
  });
}
