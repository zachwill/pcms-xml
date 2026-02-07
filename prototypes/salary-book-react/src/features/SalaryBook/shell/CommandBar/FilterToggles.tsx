/**
 * FilterToggles — Command bar filter controls
 *
 * Filters are "lenses, not navigation" (see
 * `prototypes/salary-book-react/docs/legacy-web-specs/00-ui-philosophy.md`).
 * They reshape what the Salary Book shows without changing scroll/selection state.
 *
 * Groups:
 * - Display: Cap Holds / Exceptions / Draft Picks / Dead Money
 * - Financials: Tax/Aprons / Cash vs Cap / Luxury Tax
 * - Contracts: Options / Incentives / Two-Way
 * - Rows: placeholder row source selector (only Salary is active for now)
 */

import { useState } from "react";

import { cx, focusRing } from "@/lib/utils";
import { Checkbox, Radio, RadioGroup } from "@/components/ui";
import {
  FILTER_METADATA,
  useFilters,
  type FilterKey,
  type FilterState,
} from "@/state/filters";

// =============================================================================
// Filter checkbox
// =============================================================================

interface FilterCheckboxProps {
  group: keyof FilterState;
  filterKey: FilterKey;
  label: string;
  checked: boolean;
  onChange: () => void;
}

function FilterCheckbox({
  group,
  filterKey,
  label,
  checked,
  onChange,
}: FilterCheckboxProps) {
  const id = `filter-${group}-${filterKey}`;

  return (
    <div className="flex items-center gap-1.5">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className={cx("size-3.5", focusRing())}
      />
      <label
        htmlFor={id}
        className={cx(
          "text-[11px] leading-none cursor-pointer select-none",
          "text-foreground/80 hover:text-foreground transition-colors"
        )}
      >
        {label}
      </label>
    </div>
  );
}

// =============================================================================
// Filter groups
// =============================================================================

function FilterGroup({
  title,
  group,
}: {
  title: string;
  group: keyof FilterState;
}) {
  const { isFilterActive, toggleFilter } = useFilters();
  const filters = FILTER_METADATA[group];

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        {title}
      </div>

      <div className="space-y-1">
        {filters.map((filter) => (
          <FilterCheckbox
            key={filter.key}
            group={group}
            filterKey={filter.key}
            label={filter.label}
            checked={isFilterActive(group, filter.key)}
            onChange={() => toggleFilter(group, filter.key)}
          />
        ))}
      </div>
    </div>
  );
}

// =============================================================================
// Rows group (placeholder)
// =============================================================================

type RowsMode = "ctg" | "epm" | "salary";

const ROWS_OPTIONS: Array<{ value: RowsMode; label: string; disabled?: boolean }> = [
  { value: "ctg", label: "CTG", disabled: true },
  { value: "epm", label: "EPM", disabled: true },
  { value: "salary", label: "Salaries" },
];

interface RowsRadioProps {
  value: RowsMode;
  label: string;
  disabled?: boolean;
}

function RowsRadio({ value, label, disabled }: RowsRadioProps) {
  return (
    <label
      className={cx(
        "flex items-center gap-1.5 select-none",
        disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"
      )}
    >
      <Radio value={value} disabled={disabled} size="sm" />
      <span
        className={cx(
          "text-[11px] leading-none",
          disabled
            ? "text-muted-foreground/80"
            : "text-foreground/80 hover:text-foreground transition-colors"
        )}
      >
        {label}
      </span>
    </label>
  );
}

function RowsGroup() {
  const [rowsMode, setRowsMode] = useState<RowsMode>("salary");

  return (
    <div className="space-y-1">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
        Rows
      </div>

      <RadioGroup
        value={rowsMode}
        onValueChange={(v) => setRowsMode(v as RowsMode)}
        orientation="vertical"
        className="gap-1"
      >
        {ROWS_OPTIONS.map((opt) => (
          <RowsRadio
            key={opt.value}
            value={opt.value}
            label={opt.label}
            disabled={opt.disabled}
          />
        ))}
      </RadioGroup>
    </div>
  );
}

// =============================================================================
// Export
// =============================================================================

export function FilterToggles() {
  return (
    <div className="flex items-start gap-4">
      <div className="min-w-[4.5rem]">
        <FilterGroup title="Display" group="display" />
      </div>
      <div className="min-w-[6.5rem]">
        <FilterGroup title="Financials" group="financials" />
      </div>
      <div className="min-w-[6.5rem]">
        <FilterGroup title="Contracts" group="contracts" />
      </div>
      <div className="min-w-[4.5rem]">
        <RowsGroup />
      </div>
    </div>
  );
}
