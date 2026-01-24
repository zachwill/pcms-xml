import { useState, useEffect, useCallback } from "react";
import type { DraftPick } from "../data";

/**
 * Draft pick API response shape (from /api/salary-book/picks?team=:teamCode)
 */
interface PickApiResponse {
  id: string;
  team_code: string;
  origin_team_code: string | null;
  year: number;
  round: number;
  asset_type: string | null;
  description: string | null;
}

/**
 * Return type for usePicks hook
 */
export interface UsePicksReturn {
  /** Draft picks for the given team */
  picks: DraftPick[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch picks */
  refetch: () => Promise<void>;
}

/**
 * Maps API response to DraftPick type
 */
function mapApiToPick(data: PickApiResponse): DraftPick {
  // Determine if it's a pick swap based on asset_type
  const isSwap = data.asset_type?.toLowerCase().includes("swap") ?? false;

  return {
    id: data.id,
    team_code: data.team_code,
    origin_team_code: data.origin_team_code ?? data.team_code,
    year: data.year,
    round: data.round === 1 ? 1 : 2,
    protections: data.description ?? null,
    is_swap: isSwap,
    conveyance_history: null,
  };
}

/**
 * Hook to fetch draft picks for a specific team
 *
 * Fetches from /api/salary-book/picks?team=:teamCode and provides:
 * - Picks sorted by year and round
 * - Loading and error states
 * - Refetch function
 *
 * @param teamCode - 3-letter team code (e.g., "BOS", "LAL"). Pass null to skip fetch.
 *
 * @example
 * ```tsx
 * const { picks, isLoading, error } = usePicks("BOS");
 *
 * if (isLoading) return <Skeleton />;
 * if (error) return <Error message={error.message} />;
 *
 * return picks.map(pick => (
 *   <PickPill key={pick.id} pick={pick} />
 * ));
 * ```
 */
export function usePicks(teamCode: string | null): UsePicksReturn {
  const [picks, setPicks] = useState<DraftPick[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPicks = useCallback(async () => {
    if (!teamCode) {
      setPicks([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/salary-book/picks?team=${encodeURIComponent(teamCode)}`
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch picks: ${response.status}`);
      }

      const data: PickApiResponse[] = await response.json();
      const mapped = data.map(mapApiToPick);

      setPicks(mapped);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setPicks([]);
    } finally {
      setIsLoading(false);
    }
  }, [teamCode]);

  useEffect(() => {
    fetchPicks();
  }, [fetchPicks]);

  return {
    picks,
    isLoading,
    error,
    refetch: fetchPicks,
  };
}
