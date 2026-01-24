/**
 * TableHeader — Two-row header for the salary table
 *
 * Designed to be part of the iOS Contacts-style sticky header group
 * along with TeamHeader. This header sticks below the team header.
 *
 * Row 1: Category groups (PLAYER INFO | CONTRACT YEARS | MANAGEMENT)
 * Row 2: Column labels (Name | year columns | Agent)
 *
 * Features:
 * - Opaque background to prevent content bleed-through
 * - Monospace formatting for year columns
 * - Compact, spreadsheet-like aesthetic
 */

import React from "react";
import { cx } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface TableHeaderProps {
  /** Years to display as columns (default: 2025-2030) */
  years?: readonly number[];
}

// Default contract years to display
const DEFAULT_YEARS = [2025, 2026, 2027, 2028, 2029, 2030] as const;

// ============================================================================
// Component
// ============================================================================

export function TableHeader({ years = DEFAULT_YEARS }: TableHeaderProps) {
  return (
    // Fully opaque background - no bleed-through
    <div className="border-b border-border bg-background">
      {/* Row 1: Category groups */}
      <div
        className={cx(
          "h-6 flex items-center",
          "text-[10px] font-medium uppercase tracking-wide",
          "text-muted-foreground",
          "border-b border-border/30"
        )}
      >
        {/* Player column (STICKY LEFT COLUMN) */}
        <div
          className={cx(
            "w-52 shrink-0",
            "sticky left-0 z-[2]",
            "bg-background",
            // Visual separator shadow on right edge
            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px",
            "after:bg-border/50",
            "relative",
            "text-center"
          )}
        >
          Player Info
        </div>

        {/* Contract Years group - spans all year columns + Total */}
        <div
          className="text-center"
          style={{ width: `${(years.length + 1) * 96}px` }}
        >
          Contract Years
        </div>

        {/* Management group */}
        <div className="w-40 text-center">Management</div>
      </div>

      {/* Row 2: Column labels */}
      <div
        className={cx(
          "h-8 flex items-center",
          "text-xs font-medium",
          "text-muted-foreground"
        )}
      >
        {/* Player column (STICKY LEFT COLUMN) */}
        <div
          className={cx(
            "w-52 shrink-0 pl-4",
            "sticky left-0 z-[2]",
            "bg-background",
            // Visual separator shadow on right edge
            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px",
            "after:bg-border/50",
            "relative"
          )}
        >
          <div className="grid grid-cols-[40px_1fr] items-center h-full">
            <div />
            <div className="pl-1">Name / Details</div>
          </div>
        </div>

        {/* Year columns */}
        {years.map((year) => (
          <div key={year} className="w-24 tabular-nums text-center">
            {formatYearLabel(year)}
          </div>
        ))}

        {/* Total column */}
        <div className="w-24 tabular-nums text-center font-semibold">Total</div>

        {/* Agent column */}
        <div className="w-40 text-center">Agent</div>
      </div>
    </div>
  );
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format year as "YY-YY" label (e.g., 2025 → "25-26")
 */
function formatYearLabel(year: number): string {
  const startYear = String(year).slice(2);
  const endYear = String(year + 1).slice(2);
  return `${startYear}-${endYear}`;
}
