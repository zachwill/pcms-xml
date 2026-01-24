import { useMemo } from "react";
import useSWR from "swr";
import { NBA_TEAMS } from "../data";
import type { Team, Conference } from "../data";

/**
 * Teams API response shape (from /api/salary-book/teams)
 */
interface TeamApiResponse {
  team_id: number;
  team_code: string;
  name: string;
  nickname: string;
  city: string;
  conference: Conference;
}

/**
 * Return type for useTeams hook
 */
export interface UseTeamsReturn {
  /** All teams, sorted by conference then team code (tricode) */
  teams: Team[];
  /** Teams grouped by conference */
  teamsByConference: {
    EAST: Team[];
    WEST: Team[];
  };
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Lookup team by code */
  getTeam: (code: string) => Team | undefined;
  /** Refetch teams */
  refetch: () => Promise<void>;
}

function sortTeams(teams: Team[]): Team[] {
  return [...teams].sort((a, b) => {
    if (a.conference !== b.conference) {
      return a.conference === "EAST" ? -1 : 1;
    }
    return a.team_code.localeCompare(b.team_code);
  });
}

/**
 * SWR fetcher for teams API
 */
async function fetcher(url: string): Promise<Team[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch teams: ${response.status}`);
  }

  const data: TeamApiResponse[] = await response.json();

  // Normalize + sort
  const normalized: Team[] = data.map((t) => ({
    team_id: Number(t.team_id),
    team_code: t.team_code,
    name: t.name,
    nickname: t.nickname,
    city: t.city,
    conference: t.conference,
  }));

  return sortTeams(normalized);
}

/**
 * Hook to fetch and memoize NBA teams.
 *
 * Important: We provide static `NBA_TEAMS` as `fallbackData` so the UI (TeamSelectorGrid)
 * can render instantly without waiting on the database/API.
 */
export function useTeams(): UseTeamsReturn {
  const fallback = useMemo(() => sortTeams(NBA_TEAMS), []);

  const { data, error, isLoading, mutate } = useSWR<Team[], Error>(
    "/api/salary-book/teams",
    fetcher,
    {
      fallbackData: fallback,
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  const teams = data ?? fallback;

  const teamsByConference = useMemo(() => {
    return {
      EAST: teams.filter((t) => t.conference === "EAST"),
      WEST: teams.filter((t) => t.conference === "WEST"),
    };
  }, [teams]);

  const teamMap = useMemo(() => {
    return new Map(teams.map((t) => [t.team_code, t] as const));
  }, [teams]);

  const getTeam = useMemo(() => {
    return (code: string) => teamMap.get(code);
  }, [teamMap]);

  return {
    teams,
    teamsByConference,
    // Only treat it as loading if we *don't* already have fallback data.
    isLoading: isLoading && !data,
    error: error ?? null,
    getTeam,
    refetch: async () => {
      await mutate();
    },
  };
}
