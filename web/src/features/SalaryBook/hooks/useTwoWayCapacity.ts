import useSWR from "swr";

/**
 * Two-way capacity data from pcms.team_two_way_capacity
 */
export interface TwoWayCapacity {
  team_id: number;
  team_code: string;
  current_contract_count: number | null;
  games_remaining: number | null;
  under_15_games_count: number | null;
  under_15_games_remaining: number | null;
}

/**
 * Return type for useTwoWayCapacity hook
 */
export interface UseTwoWayCapacityReturn {
  /** Two-way capacity data */
  capacity: TwoWayCapacity | null;
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | null;
  /** Refetch data */
  refetch: () => Promise<void>;
}

/**
 * SWR fetcher for two-way capacity API
 */
async function fetcher(url: string): Promise<TwoWayCapacity> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch two-way capacity: ${response.status}`);
  }
  return response.json();
}

/**
 * Hook to fetch team two-way capacity data
 *
 * Uses SWR for automatic caching and deduplication.
 *
 * @param teamCode - 3-letter team code (e.g., "BOS", "LAL")
 *
 * @example
 * ```tsx
 * const { capacity, isLoading, error } = useTwoWayCapacity("BOS");
 *
 * if (capacity) {
 *   // Show games remaining based on contract count
 *   const gamesRemaining = capacity.current_contract_count < 15
 *     ? capacity.under_15_games_remaining
 *     : capacity.games_remaining;
 * }
 * ```
 */
export function useTwoWayCapacity(teamCode: string | null): UseTwoWayCapacityReturn {
  const { data, error, isLoading, mutate } = useSWR<TwoWayCapacity, Error>(
    teamCode ? `/api/salary-book/two-way-capacity?team=${encodeURIComponent(teamCode)}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    capacity: data ?? null,
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
