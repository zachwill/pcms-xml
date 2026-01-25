import useSWR from "swr";

/**
 * Player API response from /api/salary-book/player/:playerId
 *
 * Keep this aligned with the backend route in:
 *   web/src/api/routes/salary-book.ts (GET /player/:playerId)
 */
export interface PlayerDetailResponse {
  player_id: number;
  player_name: string;
  team_code: string;
  age: number | null;
  years_of_service: number | null;

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

  agent_id: number | null;
  agent_name: string | null;
  agency_id: number | null;
  agency_name: string | null;

  is_two_way: boolean;
  is_poison_pill: boolean;
  poison_pill_amount: number | null;
  is_no_trade: boolean;
  is_trade_bonus: boolean;
  trade_bonus_percent: number | null;

  contract_type_code: string | null;
  contract_type_lookup_value: string | null;

  is_trade_consent_required_now: boolean;
  is_trade_preconsented: boolean;
  player_consent_lk: string | null;
}

export interface UsePlayerReturn {
  player: PlayerDetailResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function normalizePlayer(data: any): PlayerDetailResponse {
  return {
    player_id: Number(data.player_id),
    player_name: String(data.player_name ?? ""),
    team_code: String(data.team_code ?? ""),
    age: asNumberOrNull(data.age),
    years_of_service: asNumberOrNull(data.years_of_service),

    cap_2025: asNumberOrNull(data.cap_2025),
    cap_2026: asNumberOrNull(data.cap_2026),
    cap_2027: asNumberOrNull(data.cap_2027),
    cap_2028: asNumberOrNull(data.cap_2028),
    cap_2029: asNumberOrNull(data.cap_2029),
    cap_2030: asNumberOrNull(data.cap_2030),

    option_2025: data.option_2025 ?? null,
    option_2026: data.option_2026 ?? null,
    option_2027: data.option_2027 ?? null,
    option_2028: data.option_2028 ?? null,
    option_2029: data.option_2029 ?? null,
    option_2030: data.option_2030 ?? null,

    agent_id: asNumberOrNull(data.agent_id),
    agent_name: data.agent_name ?? null,
    agency_id: asNumberOrNull(data.agency_id),
    agency_name: data.agency_name ?? null,

    is_two_way: !!data.is_two_way,
    is_poison_pill: !!data.is_poison_pill,
    poison_pill_amount: asNumberOrNull(data.poison_pill_amount),
    is_no_trade: !!data.is_no_trade,
    is_trade_bonus: !!data.is_trade_bonus,
    trade_bonus_percent: asNumberOrNull(data.trade_bonus_percent),

    contract_type_code: data.contract_type_code ?? null,
    contract_type_lookup_value: data.contract_type_lookup_value ?? null,

    is_trade_consent_required_now: !!data.is_trade_consent_required_now,
    is_trade_preconsented: !!data.is_trade_preconsented,
    player_consent_lk: data.player_consent_lk ?? null,
  };
}

async function fetcher(url: string): Promise<PlayerDetailResponse> {
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Player not found");
    }
    throw new Error(`Failed to fetch player: ${response.status}`);
  }

  const data = await response.json();
  return normalizePlayer(data);
}

/**
 * Fetch a single player's full details.
 */
export function usePlayer(playerId: number | null): UsePlayerReturn {
  const key = playerId ? `/api/salary-book/player/${playerId}` : null;

  const { data, error, isLoading, mutate } = useSWR<PlayerDetailResponse, Error>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5000,
      // For sidebar entity detail views, do NOT keep previous player's data.
      keepPreviousData: false,
    }
  );

  return {
    player: data ?? null,
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
