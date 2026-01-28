/**
 * TotalsFooter — Team salary totals, cap space, and status badges per season.
 *
 * Redesigned to match the KPI styling used in the Team Header, Exceptions,
 * and Draft Assets rows.
 */

import React from "react";
import { Sigma, Wallet, ShieldAlert } from "lucide-react";
import { cx, formatters } from "@/lib/utils";
import { KpiCell } from "./KpiCell";
import type { TeamSalary } from "../../data";

// ============================================================================
// Types
// ============================================================================

export interface TotalsFooterProps {
  /** Team salary data by year (2025-2030) */
  salaryByYear: Map<number, TeamSalary>;
  /** Show tax/apron status row */
  showTaxAprons?: boolean;
  /** Unused in redesigned layout (kept for compatibility). */
  showCashVsCap?: boolean;
  /** Unused in redesigned layout (kept for compatibility). */
  showLuxuryTax?: boolean;
}

const SALARY_YEARS = [2025, 2026, 2027, 2028, 2029] as const;

// ============================================================================
// Helpers
// ============================================================================

function StickyLabelCell({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cx(
        "w-52 pl-4 shrink-0",
        "sticky left-0 z-[1]",
        "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px",
        "after:bg-border/30",
        "relative"
      )}
      style={{ backgroundColor: "var(--muted, #f4f4f5)" }}
    >
      <div className="grid grid-cols-[40px_1fr] items-center h-full">
        <div className="flex items-center justify-start text-muted-foreground">
          {icon}
        </div>
        <div className="pl-1 min-w-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {children}
        </div>
      </div>
    </div>
  );
}

function formatRoomAmount(value: number | null): string {
  if (value === null || value === undefined) return "—";
  if (value >= 0) {
    return `+${formatters.compactCurrency(value)}`;
  }
  return formatters.compactCurrency(value);
}

function buildStatus(yearData?: TeamSalary) {
  if (!yearData) {
    return { label: "—", value: "—", variant: "muted" as const };
  }

  if (yearData.is_over_second_apron) {
    return {
      label: "Apron 2",
      value: formatRoomAmount(yearData.room_under_second_apron),
      variant: "negative" as const,
    };
  }

  if (yearData.is_over_first_apron) {
    return {
      label: "Apron 1",
      value: formatRoomAmount(yearData.room_under_first_apron),
      variant: "negative" as const,
    };
  }

  if (yearData.is_over_tax) {
    return {
      label: "Tax",
      value: formatRoomAmount(yearData.room_under_tax),
      variant: "negative" as const,
    };
  }

  return {
    label: "Under Tax",
    value: formatRoomAmount(yearData.room_under_tax),
    variant: "positive" as const,
  };
}


// ============================================================================
// Main
// ============================================================================

export function TotalsFooter({
  salaryByYear,
  showTaxAprons = true,
}: TotalsFooterProps) {
  return (
    <div style={{ backgroundColor: "var(--muted, #f4f4f5)" }}>
      {/* Roster Cost Row */}
      <div className="h-12 flex items-center text-xs">
        <StickyLabelCell icon={<Sigma className="w-4 h-4" aria-hidden="true" />}>
          Roster Cost
        </StickyLabelCell>

        <div className="flex items-center">
          {SALARY_YEARS.map((year) => {
            const data = salaryByYear.get(year);
            return (
              <div key={year} className="w-24 shrink-0 flex justify-center">
                <KpiCell
                  label={`${String(year).slice(2)}-${String(year + 1).slice(2)}`}
                  value={data ? formatters.compactCurrency(data.cap_total) : "—"}
                />
              </div>
            );
          })}

          <div className="w-24 shrink-0" />
          <div className="w-40 pr-4 shrink-0" />
        </div>
      </div>

      {/* Cap Space Row */}
      <div className="h-12 flex items-center text-xs">
        <StickyLabelCell icon={<Wallet className="w-4 h-4" aria-hidden="true" />}>
          Cap Space
        </StickyLabelCell>

        <div className="flex items-center">
          {SALARY_YEARS.map((year) => {
            const data = salaryByYear.get(year);
            const capSpace = data?.cap_space ?? null;
            return (
              <div key={year} className="w-24 shrink-0 flex justify-center">
                <KpiCell
                  label={`${String(year).slice(2)}-${String(year + 1).slice(2)}`}
                  value={capSpace !== null ? formatRoomAmount(capSpace) : "—"}
                  variant={capSpace !== null && capSpace < 0 ? "negative" : "positive"}
                />
              </div>
            );
          })}

          <div className="w-24 shrink-0" />
          <div className="w-40 pr-4 shrink-0" />
        </div>
      </div>

      {/* Tax Status Row */}
      {showTaxAprons && (
        <div className="h-12 flex items-center text-xs">
          <StickyLabelCell icon={<ShieldAlert className="w-4 h-4" aria-hidden="true" />}>
            Tax Status
          </StickyLabelCell>

          <div className="flex items-center">
            {SALARY_YEARS.map((year) => {
              const status = buildStatus(salaryByYear.get(year));
              return (
                <div key={year} className="w-24 shrink-0 flex justify-center">
                  <KpiCell
                    label={status.label}
                    value={status.value}
                    variant={status.variant}
                  />
                </div>
              );
            })}

            <div className="w-24 shrink-0" />
            <div className="w-40 pr-4 shrink-0" />
          </div>
        </div>
      )}
    </div>
  );
}

export default TotalsFooter;
