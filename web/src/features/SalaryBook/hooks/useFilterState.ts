/**
 * useFilterState — Manages filter toggles for the Salary Book
 *
 * Three filter groups per spec:
 * - Display: controls which rows/sections appear
 * - Financials: controls tax/cap-related columns/data
 * - Contracts: controls option badges, incentives, two-way indicators
 */

import { useCallback, useMemo, useState } from "react";

/**
 * Display filter keys
 */
export type DisplayFilter = "capHolds" | "exceptions" | "draftPicks" | "deadMoney";

/**
 * Financials filter keys
 */
export type FinancialsFilter = "taxAprons" | "cashVsCap" | "luxuryTax";

/**
 * Contracts filter keys
 */
export type ContractsFilter = "options" | "incentives" | "twoWay";

/**
 * All possible filter keys
 */
export type FilterKey = DisplayFilter | FinancialsFilter | ContractsFilter;

/**
 * Filter state by group
 */
export interface FilterState {
  display: Record<DisplayFilter, boolean>;
  financials: Record<FinancialsFilter, boolean>;
  contracts: Record<ContractsFilter, boolean>;
}

/**
 * Default filter state (matches spec defaults)
 * Display: Cap Holds ✗, Exceptions ✓, Draft Picks ✓, Dead Money ✗
 * Financials: Tax/Aprons ✓, Cash vs Cap ✗, Luxury Tax ✗
 * Contracts: Options ✓, Incentives ✓, Two-Way ✓
 */
const DEFAULT_FILTER_STATE: FilterState = {
  display: {
    capHolds: false,
    exceptions: true,
    draftPicks: true,
    deadMoney: false,
  },
  financials: {
    taxAprons: true,
    cashVsCap: false,
    luxuryTax: false,
  },
  contracts: {
    options: true,
    incentives: true,
    twoWay: true,
  },
};

/**
 * Filter metadata for rendering
 */
export interface FilterMeta {
  key: FilterKey;
  label: string;
  group: keyof FilterState;
}

/**
 * Filter metadata organized by group
 */
export const FILTER_METADATA: Record<keyof FilterState, FilterMeta[]> = {
  display: [
    { key: "capHolds", label: "Cap Holds", group: "display" },
    { key: "exceptions", label: "Exceptions", group: "display" },
    { key: "draftPicks", label: "Draft Picks", group: "display" },
    { key: "deadMoney", label: "Dead Money", group: "display" },
  ],
  financials: [
    { key: "taxAprons", label: "Tax/Aprons", group: "financials" },
    { key: "cashVsCap", label: "Cash vs Cap", group: "financials" },
    { key: "luxuryTax", label: "Luxury Tax", group: "financials" },
  ],
  contracts: [
    { key: "options", label: "Options", group: "contracts" },
    { key: "incentives", label: "Incentives", group: "contracts" },
    { key: "twoWay", label: "Two-Way", group: "contracts" },
  ],
};

/**
 * Hook return type
 */
export interface UseFilterStateReturn {
  /** Current filter state */
  filters: FilterState;
  /** Toggle a single filter */
  toggleFilter: (group: keyof FilterState, key: FilterKey) => void;
  /** Check if a filter is active */
  isFilterActive: (group: keyof FilterState, key: FilterKey) => boolean;
  /** Reset all filters to defaults */
  resetFilters: () => void;
  /** Set all filters in a group */
  setGroupFilters: (group: keyof FilterState, value: boolean) => void;
  /** Filter metadata for rendering */
  filterMeta: typeof FILTER_METADATA;
}

/**
 * Hook to manage filter toggle state for the Salary Book
 *
 * @param initialState - Optional initial filter state (defaults to spec defaults)
 * @returns Filter state and control functions
 *
 * @example
 * ```tsx
 * const { filters, toggleFilter, isFilterActive } = useFilterState();
 *
 * // Check if draft picks should be shown
 * if (filters.display.draftPicks) {
 *   // render draft picks row
 * }
 *
 * // Toggle a filter
 * <Checkbox
 *   checked={isFilterActive("display", "draftPicks")}
 *   onCheckedChange={() => toggleFilter("display", "draftPicks")}
 * />
 * ```
 */
export function useFilterState(
  initialState: FilterState = DEFAULT_FILTER_STATE
): UseFilterStateReturn {
  const [filters, setFilters] = useState<FilterState>(initialState);

  /**
   * Toggle a single filter value
   */
  const toggleFilter = useCallback(
    (group: keyof FilterState, key: FilterKey) => {
      setFilters((prev) => ({
        ...prev,
        [group]: {
          ...prev[group],
          [key]: !prev[group][key as keyof typeof prev[typeof group]],
        },
      }));
    },
    []
  );

  /**
   * Check if a specific filter is active
   */
  const isFilterActive = useCallback(
    (group: keyof FilterState, key: FilterKey): boolean => {
      return filters[group][key as keyof typeof filters[typeof group]] ?? false;
    },
    [filters]
  );

  /**
   * Reset all filters to default state
   */
  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTER_STATE);
  }, []);

  /**
   * Set all filters in a group to the same value
   */
  const setGroupFilters = useCallback(
    (group: keyof FilterState, value: boolean) => {
      setFilters((prev) => {
        const groupFilters = prev[group];
        const newGroupFilters = Object.keys(groupFilters).reduce(
          (acc, key) => ({ ...acc, [key]: value }),
          {} as typeof groupFilters
        );
        return {
          ...prev,
          [group]: newGroupFilters,
        };
      });
    },
    []
  );

  const result = useMemo(
    () => ({
      filters,
      toggleFilter,
      isFilterActive,
      resetFilters,
      setGroupFilters,
      filterMeta: FILTER_METADATA,
    }),
    [filters, toggleFilter, isFilterActive, resetFilters, setGroupFilters]
  );

  return result;
}
