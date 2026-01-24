import useSWR from "swr";

export interface PickDetailParams {
  teamCode: string;
  year: number;
  round: number;
}

/**
 * Pick API response from /api/salary-book/pick
 */
export interface PickDetailResponse {
  team_code: string;
  year: number;
  round: number;
  asset_type: string | null;
  description: string | null;
  origin_team_code: string;
  origin_team: {
    team_code: string;
    team_name: string;
    team_nickname: string;
  } | null;
  destination_team: {
    team_code: string;
    team_name: string;
    team_nickname: string;
  } | null;
  protections: string | null;
  is_swap: boolean;
  all_slots: Array<{
    asset_slot: number;
    asset_type: string;
    description: string;
  }>;
}

export interface UsePickDetailReturn {
  pick: PickDetailResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

async function fetcher(url: string): Promise<PickDetailResponse | null> {
  const response = await fetch(url);

  if (response.status === 404) {
    // Treat "not found" as a non-error so the UI can show a friendly empty state.
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch pick: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch a single pick detail record.
 */
export function usePickDetail(params: PickDetailParams | null): UsePickDetailReturn {
  const key = params
    ? `/api/salary-book/pick?${new URLSearchParams({
        team: params.teamCode,
        year: String(params.year),
        round: String(params.round),
      })}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<PickDetailResponse | null, Error>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      // For sidebar entity detail views, do NOT keep previous pick's data.
      keepPreviousData: false,
    }
  );

  return {
    pick: data ?? null,
    isLoading: isLoading && data === undefined,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
