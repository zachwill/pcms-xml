/**
 * Helper functions for PlayerRow component
 */
import type { SalaryBookPlayer, ContractOption, GuaranteeType } from "../../data";

// Contract years to display (6-year horizon; aligns with salary_book_warehouse cap_2025..cap_2030)
export const SALARY_YEARS = [2025, 2026, 2027, 2028, 2029] as const;

/**
 * Format salary for display with compact notation
 * Uses monospace tabular-nums for alignment
 */
export function formatSalary(amount: number | null): string {
  if (amount === null) return "—";
  if (amount === 0) return "$0K";
  // Convert to millions with 1 decimal
  const millions = amount / 1_000_000;
  if (millions >= 1) {
    return `$${millions.toFixed(1)}M`;
  }
  // For smaller amounts, show in thousands
  const thousands = amount / 1_000;
  return `$${Math.round(thousands)}K`;
}

/**
 * Get salary for a specific year from player data
 */
export function getSalary(player: SalaryBookPlayer, year: number): number | null {
  switch (year) {
    case 2025:
      return player.cap_2025;
    case 2026:
      return player.cap_2026;
    case 2027:
      return player.cap_2027;
    case 2028:
      return player.cap_2028;
    case 2029:
      return player.cap_2029;
    case 2030:
      return player.cap_2030;
    default:
      return null;
  }
}

/**
 * Get total salary across all displayed years
 */
export function getTotalSalary(player: SalaryBookPlayer): number {
  let total = 0;
  for (const year of SALARY_YEARS) {
    const salary = getSalary(player, year);
    if (salary !== null && salary !== undefined) {
      // Ensure we're adding numbers, not concatenating strings
      total += Number(salary) || 0;
    }
  }
  return total;
}

/**
 * Get option type for a specific year from player data
 */
export function getOption(player: SalaryBookPlayer, year: number): ContractOption {
  switch (year) {
    case 2025:
      return player.option_2025;
    case 2026:
      return player.option_2026;
    case 2027:
      return player.option_2027;
    case 2028:
      return player.option_2028;
    case 2029:
      return player.option_2029;
    case 2030:
      return player.option_2030;
    default:
      return null;
  }
}

/**
 * Get guarantee type for a specific year.
 *
 * salary_book_warehouse stores guarantee info as numeric amounts + booleans.
 * For UI coloring/tooltips, we normalize that into a GuaranteeType.
 */
export function getGuarantee(player: SalaryBookPlayer, year: number): GuaranteeType {
  const flags = (() => {
    switch (year) {
      case 2025:
        return {
          full: player.is_fully_guaranteed_2025,
          partial: player.is_partially_guaranteed_2025,
          non: player.is_non_guaranteed_2025,
        };
      case 2026:
        return {
          full: player.is_fully_guaranteed_2026,
          partial: player.is_partially_guaranteed_2026,
          non: player.is_non_guaranteed_2026,
        };
      case 2027:
        return {
          full: player.is_fully_guaranteed_2027,
          partial: player.is_partially_guaranteed_2027,
          non: player.is_non_guaranteed_2027,
        };
      case 2028:
        return {
          full: player.is_fully_guaranteed_2028,
          partial: player.is_partially_guaranteed_2028,
          non: player.is_non_guaranteed_2028,
        };
      case 2029:
        return {
          full: player.is_fully_guaranteed_2029,
          partial: player.is_partially_guaranteed_2029,
          non: player.is_non_guaranteed_2029,
        };
      case 2030:
        return {
          full: player.is_fully_guaranteed_2030,
          partial: player.is_partially_guaranteed_2030,
          non: player.is_non_guaranteed_2030,
        };
      default:
        return { full: null, partial: null, non: null };
    }
  })();

  if (flags.full) return "GTD";
  if (flags.partial) return "PARTIAL";
  if (flags.non) return "NON-GTD";
  return null;
}

/**
 * Get percent of cap for a specific year from player data
 */
export function getPctCap(player: SalaryBookPlayer, year: number): number | null {
  switch (year) {
    case 2025:
      return player.pct_cap_2025;
    case 2026:
      return player.pct_cap_2026;
    case 2027:
      return player.pct_cap_2027;
    case 2028:
      return player.pct_cap_2028;
    case 2029:
      return player.pct_cap_2029;
    case 2030:
      return player.pct_cap_2030;
    default:
      return null;
  }
}

/**
 * Player name formatting for the table row.
 *
 * Requirement: LAST NAME, FIRST NAME (using display_last_name/display_first_name)
 * with a safe fallback to `player_name` if those fields are missing.
 */
export function getPlayerRowName(player: SalaryBookPlayer): string {
  const last = player.display_last_name?.trim() || "";
  const first = player.display_first_name?.trim() || "";

  if (last && first) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return player.player_name;
}

/**
 * Get percentile rank for pct_cap for a specific year from player data
 * Returns a value between 0.0 (lowest) and 1.0 (highest) among all players
 */
export function getPctCapPercentile(player: SalaryBookPlayer, year: number): number | null {
  switch (year) {
    case 2025:
      return player.pct_cap_percentile_2025;
    case 2026:
      return player.pct_cap_percentile_2026;
    case 2027:
      return player.pct_cap_percentile_2027;
    case 2028:
      return player.pct_cap_percentile_2028;
    case 2029:
      return player.pct_cap_percentile_2029;
    case 2030:
      return player.pct_cap_percentile_2030;
    default:
      return null;
  }
}

/**
 * Convert a percentile (0-1) to a bucket index (0-4)
 * Used for the visual block indicator
 *
 * Buckets:
 * - 0: 0-20th percentile (0 filled blocks)
 * - 1: 20-40th percentile (1 filled block)
 * - 2: 40-60th percentile (2 filled blocks)
 * - 3: 60-80th percentile (3 filled blocks)
 * - 4: 80-100th percentile (4 filled blocks)
 */
export function getPercentileBucket(percentile: number | null): number {
  if (percentile === null || percentile < 0) return 0;
  if (percentile >= 1) return 4;
  // Each bucket is 20%, so multiply by 5 and floor
  return Math.floor(percentile * 5);
}

/**
 * Render percentile as unicode block indicator
 * 
 * @param percentile - Value between 0-1
 * @returns String like "▪︎▪︎▫︎▫︎" representing the percentile bucket
 */
export function renderPercentileBlocks(percentile: number | null): string {
  const FILLED = "▪︎";  // U+25AA small black square
  const EMPTY = "▫︎";   // U+25AB small white square
  
  if (percentile === null) return "";
  
  const bucket = getPercentileBucket(percentile);
  const filled = FILLED.repeat(bucket);
  const empty = EMPTY.repeat(4 - bucket);
  
  return filled + empty;
}

/**
 * Format pct cap with optional percentile blocks
 * Handles single-digit padding for alignment
 * 
 * @param pctCap - Percent of cap as decimal (e.g., 0.30 for 30%)
 * @param percentile - Percentile rank (0-1)
 * @returns Formatted string like "30% ▪︎▪︎▫︎▫︎" or " 2% ▫︎▫︎▫︎▫︎"
 */
export function formatPctCapWithBlocks(
  pctCap: number | null,
  percentile: number | null
): { label: string; blocks: string } | null {
  if (pctCap === null) return null;
  
  const pctValue = Math.round(pctCap * 100);
  // Pad single-digit percentages with a non-breaking space for alignment
  const label = pctValue < 10 ? `\u00A0${pctValue}%` : `${pctValue}%`;
  const blocks = renderPercentileBlocks(percentile);
  
  return { label, blocks };
}
