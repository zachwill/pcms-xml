import useSWR from "swr";
import type { CapHold } from "../data";

/**
 * API response shape from /api/salary-book/cap-holds
 */
interface CapHoldApiResponse {
  id: string | number;
  team_code: string;
  player_id: number | string | null;
  player_name: string | null;
  amount_type_lk: string | null;

  cap_2025: number | string | null;
  cap_2026: number | string | null;
  cap_2027: number | string | null;
  cap_2028: number | string | null;
  cap_2029: number | string | null;
}

export interface UseCapHoldsReturn {
  capHolds: CapHold[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function mapApiToCapHold(row: CapHoldApiResponse): CapHold {
  return {
    id: String(row.id),
    team_code: String(row.team_code ?? ""),
    player_id: row.player_id === null ? null : (Number(row.player_id) || null),
    player_name: row.player_name ?? null,
    amount_type_lk: row.amount_type_lk ?? null,

    cap_2025: asNumberOrNull(row.cap_2025),
    cap_2026: asNumberOrNull(row.cap_2026),
    cap_2027: asNumberOrNull(row.cap_2027),
    cap_2028: asNumberOrNull(row.cap_2028),
    cap_2029: asNumberOrNull(row.cap_2029),
  };
}

async function fetcher(url: string): Promise<CapHold[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch cap holds: ${response.status}`);
  }
  const data: CapHoldApiResponse[] = await response.json();
  return data.map(mapApiToCapHold);
}

/**
 * Hook to fetch cap holds for a team.
 *
 * Pass enabled=false to skip the request (useful because these sections are toggleable).
 */
export function useCapHolds(teamCode: string | null, enabled = true): UseCapHoldsReturn {
  const key = teamCode && enabled
    ? `/api/salary-book/cap-holds?team=${encodeURIComponent(teamCode)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<CapHold[], Error>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  });

  return {
    capHolds: data ?? [],
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
