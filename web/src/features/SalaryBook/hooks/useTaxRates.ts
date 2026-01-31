import { useCallback } from "react";
import useSWR from "swr";
import type { LeagueTaxRate } from "../data";

interface LeagueTaxRateApiRow {
  year: number;
  lower_limit: number | string;
  upper_limit: number | string | null;
  tax_rate_non_repeater: number | string | null;
  tax_rate_repeater: number | string | null;
  base_charge_non_repeater: number | string | null;
  base_charge_repeater: number | string | null;
}

const asNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const asNumberOrNull = (value: unknown): number | null => {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

function mapRow(row: LeagueTaxRateApiRow): LeagueTaxRate {
  return {
    year: Number(row.year),
    lower_limit: asNumber(row.lower_limit, 0),
    upper_limit: row.upper_limit === null ? null : asNumber(row.upper_limit, 0),
    tax_rate_non_repeater: asNumberOrNull(row.tax_rate_non_repeater),
    tax_rate_repeater: asNumberOrNull(row.tax_rate_repeater),
    base_charge_non_repeater: asNumberOrNull(row.base_charge_non_repeater),
    base_charge_repeater: asNumberOrNull(row.base_charge_repeater),
  };
}

async function fetcher(url: string): Promise<LeagueTaxRate[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch tax rates: ${response.status}`);
  }

  const data: LeagueTaxRateApiRow[] = await response.json();
  return data.map(mapRow);
}

export interface UseTaxRatesReturn {
  taxRates: LeagueTaxRate[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Fetch NBA luxury tax brackets for a given year (amount-over-tax → marginal rates).
 */
export function useTaxRates(year: number | null): UseTaxRatesReturn {
  const key = year ? `/api/salary-book/tax-rates?year=${encodeURIComponent(String(year))}` : null;

  const { data, error, isLoading, mutate } = useSWR<LeagueTaxRate[], Error>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 60_000,
      keepPreviousData: true,
    }
  );

  return {
    taxRates: data ?? [],
    isLoading: isLoading && !data,
    error: error ?? null,
    refetch: useCallback(async () => {
      await mutate();
    }, [mutate]),
  };
}
