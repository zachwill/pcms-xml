/**
 * TeamHeader — Sticky team header with name, logo, and mini-totals
 *
 * Part of the iOS Contacts-style sticky behavior. This header sticks to
 * the top while scrolling within a team section and gets pushed off by
 * the next team's header.
 *
 * Features:
 * - Team logo placeholder (3-letter code)
 * - Team name (clickable to push Team entity)
 * - Conference label
 * - Mini-totals: current year salary + cap space
 * - Opaque background to prevent content bleed-through
 */

import React from "react";
import { cx, formatters } from "@/lib/utils";
import { useSalaryBookContext } from "../../SalaryBook";
import type { TeamEntity } from "../../hooks";

// ============================================================================
// Types
// ============================================================================

export interface TeamHeaderProps {
  /** 3-letter team code (e.g., "BOS", "LAL") */
  teamCode: string;
  /** NBA team_id used by official CDN assets (logos, etc.) */
  teamId?: number | null;
  /** Full team name (e.g., "Boston Celtics") */
  teamName: string;
  /** Conference display text (e.g., "Eastern Conference") */
  conference: string;
  /** Current year total salary (for mini-totals) */
  currentYearTotal: number | null;
  /** Current year cap space (for mini-totals) */
  currentYearCapSpace: number | null;
  /** Whether this team is currently active (scroll-spy) */
  isActive?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export function TeamHeader({
  teamCode,
  teamId,
  teamName,
  conference,
  currentYearTotal,
  currentYearCapSpace,
  isActive = false,
}: TeamHeaderProps) {
  const { pushEntity } = useSalaryBookContext();

  const [logoErrored, setLogoErrored] = React.useState(false);

  const logoUrl = teamId
    ? `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`
    : null;

  React.useEffect(() => {
    // Reset error state when switching teams so we retry loading the logo.
    setLogoErrored(false);
  }, [teamId]);

  // Handle team name click → push Team entity to sidebar
  const handleTeamClick = () => {
    const entity: TeamEntity = {
      type: "team",
      teamCode,
      teamName,
    };
    pushEntity(entity);
  };

  return (
    <div
      className={cx(
        // Layout
        "h-12 px-4 flex items-center gap-3",
        // Border
        "border-b border-border"
      )}
      style={{ backgroundColor: "var(--muted, #f4f4f5)" }}
    >
      {/* Team logo */}
      <div
        className={cx(
          // Match player headshot size (w-8 h-8)
          "w-8 h-8 rounded flex items-center justify-center flex-shrink-0",
          "bg-background border border-border",
          // Prevent SVGs from overflowing and keep things centered
          "overflow-hidden"
        )}
      >
        {logoUrl && !logoErrored ? (
          <img
            src={logoUrl}
            alt={`${teamName} logo`}
            className="w-full h-full object-contain"
            onError={() => setLogoErrored(true)}
          />
        ) : (
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-tight"
            aria-hidden="true"
            title="Team logo unavailable"
          >
            {teamCode}
          </span>
        )}
      </div>

      {/* Team name + Conference (aligned on baseline) */}
      <div className="flex items-baseline gap-2">
        <button
          onClick={handleTeamClick}
          className={cx(
            "font-semibold text-sm",
            "hover:text-primary transition-colors",
            "focus:outline-none focus-visible:underline focus-visible:text-primary"
          )}
        >
          {teamName}
        </button>

        {/* Conference label */}
        <span className="text-xs text-muted-foreground">{conference}</span>
      </div>

      {/* Mini-totals (right-aligned) */}
      <div className="ml-auto flex items-center gap-4 text-xs">
        {/* Current year total salary */}
        {currentYearTotal !== null && (
          <span
            className="font-mono tabular-nums"
            title="Current year salary"
          >
            {formatters.compactCurrency(currentYearTotal)}
          </span>
        )}

        {/* Current year cap space (green if positive, red if negative) */}
        {currentYearCapSpace !== null && (
          <span
            className={cx(
              "font-mono tabular-nums",
              currentYearCapSpace >= 0
                ? "text-green-600 dark:text-green-400"
                : "text-red-500"
            )}
            title="Cap space"
          >
            {currentYearCapSpace >= 0 ? "+" : ""}
            {formatters.compactCurrency(currentYearCapSpace)} space
          </span>
        )}

      </div>
    </div>
  );
}
