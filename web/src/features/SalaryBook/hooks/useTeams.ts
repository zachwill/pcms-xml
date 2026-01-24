import { useMemo, useState, useEffect } from "react";
import type { Team, Conference } from "../data";

/**
 * Teams API response shape (from /api/salary-book/teams)
 */
interface TeamApiResponse {
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

/**
 * Hook to fetch and memoize NBA teams from the API
 *
 * Fetches from /api/salary-book/teams and provides:
 * - All teams sorted by conference, then by team code (tricode)
 * - Teams grouped by conference (for Team Selector Grid)
 * - Lookup function by team code
 *
 * @example
 * ```tsx
 * const { teams, teamsByConference, isLoading, getTeam } = useTeams();
 *
 * // Render conference grids
 * teamsByConference.EAST.map(team => <TeamPill key={team.team_code} {...team} />)
 * teamsByConference.WEST.map(team => <TeamPill key={team.team_code} {...team} />)
 *
 * // Look up a specific team
 * const celtics = getTeam("BOS");
 * ```
 */
export function useTeams(): UseTeamsReturn {
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTeams = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/salary-book/teams");
      if (!response.ok) {
        throw new Error(`Failed to fetch teams: ${response.status}`);
      }

      const data: TeamApiResponse[] = await response.json();

      // Sort by conference, then by team code (tricode)
      const sorted = data.sort((a, b) => {
        if (a.conference !== b.conference) {
          return a.conference === "EAST" ? -1 : 1;
        }
        return a.team_code.localeCompare(b.team_code);
      });

      setTeams(sorted);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTeams();
  }, []);

  // Memoize teams grouped by conference
  const teamsByConference = useMemo(() => {
    return {
      EAST: teams.filter((t) => t.conference === "EAST"),
      WEST: teams.filter((t) => t.conference === "WEST"),
    };
  }, [teams]);

  // Memoize team lookup map
  const teamMap = useMemo(() => {
    return new Map(teams.map((t) => [t.team_code, t]));
  }, [teams]);

  // Memoize lookup function
  const getTeam = useMemo(() => {
    return (code: string) => teamMap.get(code);
  }, [teamMap]);

  return {
    teams,
    teamsByConference,
    isLoading,
    error,
    getTeam,
    refetch: fetchTeams,
  };
}
