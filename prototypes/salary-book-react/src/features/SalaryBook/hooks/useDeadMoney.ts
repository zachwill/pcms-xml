import useSWR from "swr";
import type { DeadMoney } from "../data";

/**
 * API response shape from /api/salary-book/dead-money
 */
interface DeadMoneyApiResponse {
  id: string | number;
  team_code: string;
  player_id: number | string | null;
  player_name: string | null;
  waive_date: string | null;

  cap_2025: number | string | null;
  cap_2026: number | string | null;
  cap_2027: number | string | null;
  cap_2028: number | string | null;
  cap_2029: number | string | null;
}

export interface UseDeadMoneyReturn {
  deadMoney: DeadMoney[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function mapApiToDeadMoney(row: DeadMoneyApiResponse): DeadMoney {
  return {
    id: String(row.id),
    team_code: String(row.team_code ?? ""),
    player_id: row.player_id === null ? null : (Number(row.player_id) || null),
    player_name: row.player_name ?? null,
    waive_date: row.waive_date ?? null,

    cap_2025: asNumberOrNull(row.cap_2025),
    cap_2026: asNumberOrNull(row.cap_2026),
    cap_2027: asNumberOrNull(row.cap_2027),
    cap_2028: asNumberOrNull(row.cap_2028),
    cap_2029: asNumberOrNull(row.cap_2029),
  };
}

async function fetcher(url: string): Promise<DeadMoney[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch dead money: ${response.status}`);
  }
  const data: DeadMoneyApiResponse[] = await response.json();
  return data.map(mapApiToDeadMoney);
}

/**
 * Hook to fetch dead money for a team.
 *
 * Pass enabled=false to skip the request.
 */
export function useDeadMoney(teamCode: string | null, enabled = true): UseDeadMoneyReturn {
  const key = teamCode && enabled
    ? `/api/salary-book/dead-money?team=${encodeURIComponent(teamCode)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<DeadMoney[], Error>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  });

  return {
    deadMoney: data ?? [],
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
