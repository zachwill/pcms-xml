import useSWR from "swr";
import type { TeamException } from "../data";

/**
 * API response shape from /api/salary-book/exceptions
 */
interface ExceptionApiResponse {
  id: string | number;
  team_code: string;
  exception_type_lk: string | null;
  exception_type_name: string | null;
  trade_exception_player_id: number | string | null;
  trade_exception_player_name: string | null;
  expiration_date: string | null;
  is_expired: boolean | null;

  remaining_2025: number | string | null;
  remaining_2026: number | string | null;
  remaining_2027: number | string | null;
  remaining_2028: number | string | null;
  remaining_2029: number | string | null;
}

export interface UseExceptionsReturn {
  exceptions: TeamException[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function mapApiToException(row: ExceptionApiResponse): TeamException {
  return {
    id: String(row.id),
    team_code: String(row.team_code ?? ""),
    exception_type_lk: row.exception_type_lk ?? null,
    exception_type_name: row.exception_type_name ?? null,
    trade_exception_player_id:
      row.trade_exception_player_id === null
        ? null
        : (Number(row.trade_exception_player_id) || null),
    trade_exception_player_name: row.trade_exception_player_name ?? null,
    expiration_date: row.expiration_date ?? null,
    is_expired: row.is_expired ?? null,

    remaining_2025: asNumberOrNull(row.remaining_2025),
    remaining_2026: asNumberOrNull(row.remaining_2026),
    remaining_2027: asNumberOrNull(row.remaining_2027),
    remaining_2028: asNumberOrNull(row.remaining_2028),
    remaining_2029: asNumberOrNull(row.remaining_2029),
  };
}

async function fetcher(url: string): Promise<TeamException[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch exceptions: ${response.status}`);
  }
  const data: ExceptionApiResponse[] = await response.json();
  return data.map(mapApiToException);
}

/**
 * Hook to fetch exceptions for a team.
 *
 * Pass enabled=false to skip the request.
 */
export function useExceptions(teamCode: string | null, enabled = true): UseExceptionsReturn {
  const key = teamCode && enabled
    ? `/api/salary-book/exceptions?team=${encodeURIComponent(teamCode)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<TeamException[], Error>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  });

  return {
    exceptions: data ?? [],
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
