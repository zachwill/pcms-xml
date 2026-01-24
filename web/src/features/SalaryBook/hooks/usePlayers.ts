import { useState, useEffect, useCallback } from "react";
import type { SalaryBookPlayer, ContractOption } from "../data";

/**
 * Player API response shape (from /api/salary-book/players?team=:teamCode)
 */
interface PlayerApiResponse {
  id: string;
  player_id: string;
  player_name: string;
  display_first_name: string | null;
  display_last_name: string | null;
  team_code: string;
  position: string | null;
  years_of_service: number | null;
  age: number | null;
  cap_2025: number | null;
  cap_2026: number | null;
  cap_2027: number | null;
  cap_2028: number | null;
  cap_2029: number | null;
  cap_2030: number | null;
  option_2025: string | null;
  option_2026: string | null;
  option_2027: string | null;
  option_2028: string | null;
  option_2029: string | null;
  option_2030: string | null;
  agent_id: string | null;
  agent_name: string | null;
  agency_id: string | null;
  agency_name: string | null;
  is_two_way: boolean;
}

/**
 * Return type for usePlayers hook
 */
export interface UsePlayersReturn {
  /** Players for the given team */
  players: SalaryBookPlayer[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch players */
  refetch: () => Promise<void>;
}

/**
 * Normalize option values coming from `pcms.salary_book_warehouse`.
 *
 * Current warehouse values observed:
 * - "NONE" / "" / null
 * - "TEAM" (team option)
 * - "PLYR" (player option)
 * - "PLYTF" (player termination / early termination)
 */
function normalizeOption(value: string | null): ContractOption {
  if (value === null) return null;
  const v = value.trim().toUpperCase();
  if (!v || v === "NONE") return null;
  if (v === "TEAM") return "TO";
  if (v === "PLYR") return "PO";
  if (v === "PLYTF") return "ETO";
  // Unknown value: hide rather than render random text
  return null;
}

/**
 * Maps API response to SalaryBookPlayer type
 */
function mapApiToPlayer(data: PlayerApiResponse): SalaryBookPlayer {
  return {
    id: data.id,
    player_id: data.player_id,
    player_name: data.player_name,
    display_first_name: data.display_first_name,
    display_last_name: data.display_last_name,
    team_code: data.team_code,
    position: data.position,
    experience: data.years_of_service,
    age: data.age,
    cap_2025: data.cap_2025,
    cap_2026: data.cap_2026,
    cap_2027: data.cap_2027,
    cap_2028: data.cap_2028,
    cap_2029: data.cap_2029,
    cap_2030: data.cap_2030,
    option_2025: normalizeOption(data.option_2025),
    option_2026: normalizeOption(data.option_2026),
    option_2027: normalizeOption(data.option_2027),
    option_2028: normalizeOption(data.option_2028),
    option_2029: normalizeOption(data.option_2029),
    option_2030: normalizeOption(data.option_2030),
    // Guarantee fields not returned by API yet — set to null
    guarantee_2025: null,
    guarantee_2026: null,
    guarantee_2027: null,
    guarantee_2028: null,
    guarantee_2029: null,
    guarantee_2030: null,
    agent_id: data.agent_id,
    agent_name: data.agent_name,
    agency_id: data.agency_id,
    agency_name: data.agency_name,
    is_two_way: data.is_two_way,
    // Fields not returned by current API — set to null
    bird_rights: null,
    free_agency_type: null,
    free_agency_year: null,
    contract_years: null,
    contract_total: null,
  };
}

/**
 * Hook to fetch players for a specific team
 *
 * Fetches from /api/salary-book/players?team=:teamCode and provides:
 * - Players sorted by salary (highest first)
 * - Loading and error states
 * - Refetch function
 *
 * @param teamCode - 3-letter team code (e.g., "BOS", "LAL"). Pass null to skip fetch.
 *
 * @example
 * ```tsx
 * const { players, isLoading, error } = usePlayers("BOS");
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 *
 * return players.map(player => (
 *   <PlayerRow key={player.id} player={player} />
 * ));
 * ```
 */
export function usePlayers(teamCode: string | null): UsePlayersReturn {
  const [players, setPlayers] = useState<SalaryBookPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPlayers = useCallback(async () => {
    if (!teamCode) {
      setPlayers([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/salary-book/players?team=${encodeURIComponent(teamCode)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch players: ${response.status}`);
      }

      const data: PlayerApiResponse[] = await response.json();
      const mapped = data.map(mapApiToPlayer);

      setPlayers(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setPlayers([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamCode]);

  useEffect(() => {
    fetchPlayers();
  }, [fetchPlayers]);

  return {
    players,
    isLoading,
    error,
    refetch: fetchPlayers,
  };
}
