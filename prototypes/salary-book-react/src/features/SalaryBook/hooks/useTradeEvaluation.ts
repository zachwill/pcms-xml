import { useMemo } from "react";
import useSWR from "swr";
import type {
  TradeEvaluationRequest,
  TradeEvaluationResponse,
  TradeEvaluationTeam,
  TradeReasonCode,
  TradeState,
} from "../data";

interface TradeEvaluationApiTeam {
  team_code: string;
  outgoing_salary: number | string | null;
  incoming_salary: number | string | null;
  min_incoming: number | string | null;
  max_incoming: number | string | null;
  tpe_type: string | null;
  is_trade_valid: boolean;
  reason_codes: TradeReasonCode[] | string[] | null;
  baseline_apron_total: number | string | null;
  post_trade_apron_total: number | string | null;
  first_apron_amount: number | string | null;
  is_padding_removed: boolean | null;
  tpe_padding_amount: number | string | null;
  tpe_dollar_allowance: number | string | null;
  traded_rows_found: number | null;
  replacement_rows_found: number | null;
}

interface TradeEvaluationApiResponse {
  salary_year: number;
  mode: string;
  league: string;
  teams: TradeEvaluationApiTeam[];
}

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function mapTeam(team: TradeEvaluationApiTeam): TradeEvaluationTeam {
  return {
    team_code: team.team_code,
    outgoing_salary: asNumberOrNull(team.outgoing_salary),
    incoming_salary: asNumberOrNull(team.incoming_salary),
    min_incoming: asNumberOrNull(team.min_incoming),
    max_incoming: asNumberOrNull(team.max_incoming),
    tpe_type: team.tpe_type,
    is_trade_valid: !!team.is_trade_valid,
    reason_codes: (team.reason_codes ?? []) as TradeReasonCode[],
    baseline_apron_total: asNumberOrNull(team.baseline_apron_total),
    post_trade_apron_total: asNumberOrNull(team.post_trade_apron_total),
    first_apron_amount: asNumberOrNull(team.first_apron_amount),
    is_padding_removed: team.is_padding_removed,
    tpe_padding_amount: asNumberOrNull(team.tpe_padding_amount),
    tpe_dollar_allowance: asNumberOrNull(team.tpe_dollar_allowance),
    traded_rows_found: team.traded_rows_found ?? null,
    replacement_rows_found: team.replacement_rows_found ?? null,
  };
}

function buildRequest(trade: TradeState): TradeEvaluationRequest | null {
  const primary = trade.primaryTeamCode;
  const secondary = trade.secondaryTeamCode;
  if (!primary || !secondary) return null;

  if (trade.players.length === 0) return null;

  const primaryOutgoing = trade.players
    .filter((player) => player.teamCode === primary)
    .map((player) => player.playerId);

  const secondaryOutgoing = trade.players
    .filter((player) => player.teamCode === secondary)
    .map((player) => player.playerId);

  const dedupe = (ids: number[]) => Array.from(new Set(ids));

  return {
    salaryYear: trade.salaryYear,
    mode: trade.mode,
    league: "NBA",
    teams: [
      {
        teamCode: primary,
        outgoingPlayerIds: dedupe(primaryOutgoing),
        incomingPlayerIds: dedupe(secondaryOutgoing),
      },
      {
        teamCode: secondary,
        outgoingPlayerIds: dedupe(secondaryOutgoing),
        incomingPlayerIds: dedupe(primaryOutgoing),
      },
    ],
  };
}

async function fetcher([
  url,
  payload,
]: [string, TradeEvaluationRequest]): Promise<TradeEvaluationResponse> {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Failed to evaluate trade: ${response.status}`);
  }

  const data: TradeEvaluationApiResponse = await response.json();

  return {
    salary_year: Number(data.salary_year),
    mode: payload.mode,
    league: data.league ?? payload.league,
    teams: (data.teams ?? []).map(mapTeam),
  };
}

export interface UseTradeEvaluationReturn {
  evaluation: TradeEvaluationResponse | null;
  isLoading: boolean;
  error: Error | null;
  isReady: boolean;
  refetch: () => Promise<void>;
}

export function useTradeEvaluation(trade: TradeState): UseTradeEvaluationReturn {
  const request = useMemo(() => buildRequest(trade), [trade]);

  const { data, error, isLoading, mutate } = useSWR<TradeEvaluationResponse, Error>(
    request ? ["/api/salary-book/trade-evaluate", request] : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 5_000,
    }
  );

  return {
    evaluation: data ?? null,
    isLoading: isLoading && !!request,
    error: error ?? null,
    isReady: !!request,
    refetch: async () => {
      await mutate();
    },
  };
}
