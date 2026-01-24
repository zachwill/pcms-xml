import useSWR from "swr";
import type { DraftPick } from "../data";

/**
 * Draft pick API response shape (from /api/salary-book/picks?team=:teamCode)
 */
interface PickApiResponse {
  team_code: string;
  year: number;
  round: number;
  asset_slot: number;
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

function parseOriginTeamCode(teamCode: string, rawFragment: string): string {
  // Try to extract origin team from description
  // Common patterns: "LAL 1st", "Own 1st", "From LAL"
  const fromMatch = rawFragment.match(/(?:From|from)\s+([A-Z]{3})/);
  const prefixMatch = rawFragment.match(/^([A-Z]{3})\s+/);

  const from = fromMatch?.[1];
  if (from) return from;

  const prefix = prefixMatch?.[1];
  if (prefix && prefix !== "Own") return prefix;

  return teamCode;
}

function parseProtections(rawFragment: string): string | null {
  // Common patterns: "Top 5 Protected", "Lottery Protected", "Unprotected"
  const protectedMatch = rawFragment.match(
    /(Top\s+\d+|Lottery|Unprotected)[\s-]*(Protected)?/i
  );
  return protectedMatch ? protectedMatch[0] : null;
}

/**
 * Maps API response to DraftPick type
 */
function mapApiToPick(data: PickApiResponse): DraftPick {
  const description = data.description ?? "";

  const originTeamCode = parseOriginTeamCode(data.team_code, description);
  const protections = parseProtections(description);

  // Determine if it's a pick swap based on either asset_type or description.
  const isSwap =
    data.asset_type?.toLowerCase().includes("swap") ??
    description.toLowerCase().includes("swap");

  return {
    // We don't have a stable DB id in this endpoint.
    // Use a deterministic composite key.
    id: `${data.team_code}-${data.year}-${data.round}-${data.asset_slot}`,
    team_code: data.team_code,
    origin_team_code: originTeamCode,
    year: Number(data.year),
    round: data.round === 1 ? 1 : 2,
    protections,
    is_swap: isSwap,
    conveyance_history: null,
  };
}

function sortPicks(picks: DraftPick[]): DraftPick[] {
  return [...picks].sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year;
    if (a.round !== b.round) return a.round - b.round;
    // Keep stable-ish ordering for multiple assets in the same bucket
    return a.origin_team_code.localeCompare(b.origin_team_code);
  });
}

/**
 * SWR fetcher for picks API
 */
async function fetcher(url: string): Promise<DraftPick[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch picks: ${response.status}`);
  }

  const data: PickApiResponse[] = await response.json();
  return sortPicks(data.map(mapApiToPick));
}

/**
 * Hook to fetch draft picks for a specific team
 *
 * Uses SWR for global caching + deduplication.
 */
export function usePicks(teamCode: string | null): UsePicksReturn {
  const { data, error, isLoading, mutate } = useSWR<DraftPick[], Error>(
    teamCode
      ? `/api/salary-book/picks?team=${encodeURIComponent(teamCode)}`
      : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      keepPreviousData: true,
    }
  );

  return {
    picks: data ?? [],
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
