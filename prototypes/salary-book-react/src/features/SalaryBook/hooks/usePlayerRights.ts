import useSWR from "swr";
import type { PlayerRight, PlayerRightsKind } from "../data";

/**
 * API response shape from /api/salary-book/player-rights
 */
interface PlayerRightApiResponse {
  player_id: number | string;
  player_name: string | null;
  league_lk: string | null;
  rights_team_id: number | string | null;
  rights_team_code: string | null;
  rights_kind: string | null;
  rights_source: string | null;
  source_trade_id: number | string | null;
  source_trade_date: string | null;
  draft_year: number | string | null;
  draft_round: number | string | null;
  draft_pick: number | string | null;
  draft_team_id: number | string | null;
  draft_team_code: string | null;
  has_active_nba_contract: boolean | null;
  needs_review: boolean | null;
}

export interface UsePlayerRightsReturn {
  rights: PlayerRight[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const asBooleanOrNull = (value: unknown): boolean | null => {
  if (value === null || value === undefined) return null;
  return Boolean(value);
};

function mapApiToPlayerRight(row: PlayerRightApiResponse): PlayerRight {
  const playerId = asNumberOrNull(row.player_id) ?? 0;

  return {
    id: String(row.player_id ?? ""),
    player_id: playerId,
    player_name: row.player_name ?? null,
    league_lk: row.league_lk ?? null,
    rights_team_id: asNumberOrNull(row.rights_team_id),
    rights_team_code: row.rights_team_code ?? null,
    rights_kind: (row.rights_kind ?? "NBA_DRAFT_RIGHTS") as PlayerRightsKind,
    rights_source: row.rights_source ?? null,
    source_trade_id: asNumberOrNull(row.source_trade_id),
    source_trade_date: row.source_trade_date ?? null,
    draft_year: asNumberOrNull(row.draft_year),
    draft_round: asNumberOrNull(row.draft_round),
    draft_pick: asNumberOrNull(row.draft_pick),
    draft_team_id: asNumberOrNull(row.draft_team_id),
    draft_team_code: row.draft_team_code ?? null,
    has_active_nba_contract: asBooleanOrNull(row.has_active_nba_contract),
    needs_review: asBooleanOrNull(row.needs_review),
  };
}

async function fetcher(url: string): Promise<PlayerRight[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch player rights: ${response.status}`);
  }
  const data: PlayerRightApiResponse[] = await response.json();
  return data.map(mapApiToPlayerRight);
}

/**
 * Hook to fetch player rights for a team.
 */
export function usePlayerRights(teamCode: string | null, enabled = true): UsePlayerRightsReturn {
  const key = teamCode && enabled
    ? `/api/salary-book/player-rights?team=${encodeURIComponent(teamCode)}`
    : null;

  const { data, error, isLoading, mutate } = useSWR<PlayerRight[], Error>(key, fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: true,
    dedupingInterval: 5000,
    keepPreviousData: true,
  });

  return {
    rights: data ?? [],
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
