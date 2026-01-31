import { useCallback, useMemo } from "react";
import useSWR from "swr";
import type { LeagueSystemValues } from "../data";

interface LeagueSystemValuesApiRow {
  year: number;

  salary_cap_amount: number | string | null;
  tax_level_amount: number | string | null;
  first_apron_amount: number | string | null;
  second_apron_amount: number | string | null;
  minimum_team_salary_amount: number | string | null;
  tax_bracket_amount: number | string | null;

  non_taxpayer_mid_level_amount: number | string | null;
  taxpayer_mid_level_amount: number | string | null;
  room_mid_level_amount: number | string | null;
  bi_annual_amount: number | string | null;
  two_way_salary_amount: number | string | null;
  tpe_dollar_allowance: number | string | null;
  max_trade_cash_amount: number | string | null;
  international_player_payment_limit: number | string | null;

  maximum_salary_25_pct: number | string | null;
  maximum_salary_30_pct: number | string | null;
  maximum_salary_35_pct: number | string | null;

  scale_raise_rate: number | string | null;
  days_in_season: number | null;

  season_start_at: string | null;
  season_end_at: string | null;
  moratorium_start_at: string | null;
  moratorium_end_at: string | null;
  trade_deadline_at: string | null;
  dec_15_trade_lift_at: string | null;
  jan_15_trade_lift_at: string | null;
  jan_10_guarantee_at: string | null;
}

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function mapRow(row: LeagueSystemValuesApiRow): LeagueSystemValues {
  return {
    year: Number(row.year),

    salary_cap_amount: asNumberOrNull(row.salary_cap_amount),
    tax_level_amount: asNumberOrNull(row.tax_level_amount),
    first_apron_amount: asNumberOrNull(row.first_apron_amount),
    second_apron_amount: asNumberOrNull(row.second_apron_amount),
    minimum_team_salary_amount: asNumberOrNull(row.minimum_team_salary_amount),
    tax_bracket_amount: asNumberOrNull(row.tax_bracket_amount),

    non_taxpayer_mid_level_amount: asNumberOrNull(row.non_taxpayer_mid_level_amount),
    taxpayer_mid_level_amount: asNumberOrNull(row.taxpayer_mid_level_amount),
    room_mid_level_amount: asNumberOrNull(row.room_mid_level_amount),
    bi_annual_amount: asNumberOrNull(row.bi_annual_amount),
    two_way_salary_amount: asNumberOrNull(row.two_way_salary_amount),
    tpe_dollar_allowance: asNumberOrNull(row.tpe_dollar_allowance),
    max_trade_cash_amount: asNumberOrNull(row.max_trade_cash_amount),
    international_player_payment_limit: asNumberOrNull(row.international_player_payment_limit),

    maximum_salary_25_pct: asNumberOrNull(row.maximum_salary_25_pct),
    maximum_salary_30_pct: asNumberOrNull(row.maximum_salary_30_pct),
    maximum_salary_35_pct: asNumberOrNull(row.maximum_salary_35_pct),

    scale_raise_rate: asNumberOrNull(row.scale_raise_rate),
    days_in_season: row.days_in_season,

    season_start_at: row.season_start_at,
    season_end_at: row.season_end_at,
    moratorium_start_at: row.moratorium_start_at,
    moratorium_end_at: row.moratorium_end_at,
    trade_deadline_at: row.trade_deadline_at,
    dec_15_trade_lift_at: row.dec_15_trade_lift_at,
    jan_15_trade_lift_at: row.jan_15_trade_lift_at,
    jan_10_guarantee_at: row.jan_10_guarantee_at,
  };
}

async function fetcher(url: string): Promise<LeagueSystemValues[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch system values: ${response.status}`);
  }

  const data: LeagueSystemValuesApiRow[] = await response.json();
  return data.map(mapRow);
}

export interface UseSystemValuesReturn {
  systemValues: LeagueSystemValues[];
  systemValuesByYear: Map<number, LeagueSystemValues>;
  years: number[];
  getForYear: (year: number) => LeagueSystemValues | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch NBA league system values (cap/tax/apron lines, exception constants, key dates).
 */
export function useSystemValues(): UseSystemValuesReturn {
  const { data, error, isLoading, mutate } = useSWR<LeagueSystemValues[], Error>(
    "/api/salary-book/system-values?from=2025&to=2030",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  const systemValues = data ?? [];

  const systemValuesByYear = useMemo(() => {
    return new Map(systemValues.map((row) => [row.year, row]));
  }, [systemValues]);

  const years = useMemo(() => {
    return systemValues.map((row) => row.year).sort((a, b) => a - b);
  }, [systemValues]);

  const getForYear = useCallback(
    (year: number) => systemValuesByYear.get(year),
    [systemValuesByYear]
  );

  return {
    systemValues,
    systemValuesByYear,
    years,
    getForYear,
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: async () => {
      await mutate();
    },
  };
}
