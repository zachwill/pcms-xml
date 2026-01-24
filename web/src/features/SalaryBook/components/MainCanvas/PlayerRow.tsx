/**
 * PlayerRow — Double-row player design
 *
 * Each player occupies TWO visual rows that behave as ONE unit:
 * - Primary Row (Row A): Name, salary per year (monospace), agent name
 * - Metadata Row (Row B): Position chip, experience, age, guarantee, options, bird rights
 *
 * Interactions:
 * - Hover highlights BOTH rows as one unit
 * - Click anywhere → opens Player entity in sidebar
 * - Click agent/agency name → opens Agent entity (stopPropagation)
 */

import React from "react";
import { cx } from "@/lib/utils";
import type { SalaryBookPlayer, ContractOption, GuaranteeType } from "../../data";
import { PlayerSalary } from "./PlayerSalary";

// ============================================================================
// Types
// ============================================================================

export interface PlayerRowProps {
  /** Player data from salary_book_warehouse */
  player: SalaryBookPlayer;
  /** Called when the row is clicked (opens player detail) */
  onClick: () => void;
  /** Called when agent name is clicked (opens agent detail) */
  onAgentClick: (e: React.MouseEvent) => void;
  /** Whether to show option badges (PO, TO, ETO) */
  showOptions?: boolean;
  /** Whether to show two-way contract badges */
  showTwoWay?: boolean;
}

// Contract years to display (5-year horizon)
const SALARY_YEARS = [2025, 2026, 2027, 2028, 2029] as const;

// ============================================================================
// Helpers
// ============================================================================

/**
 * Format salary for display with compact notation
 * Uses monospace tabular-nums for alignment
 */
function formatSalary(amount: number | null): string {
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
function getSalary(player: SalaryBookPlayer, year: number): number | null {
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
function getTotalSalary(player: SalaryBookPlayer): number {
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
function getOption(player: SalaryBookPlayer, year: number): ContractOption {
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
 * Get guarantee type for a specific year from player data
 */
function getGuarantee(player: SalaryBookPlayer, year: number): GuaranteeType {
  switch (year) {
    case 2025:
      return player.guarantee_2025;
    case 2026:
      return player.guarantee_2026;
    case 2027:
      return player.guarantee_2027;
    case 2028:
      return player.guarantee_2028;
    case 2029:
      return player.guarantee_2029;
    case 2030:
      return player.guarantee_2030;
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
function getPlayerRowName(player: SalaryBookPlayer): string {
  const last = player.display_last_name?.trim() || "";
  const first = player.display_first_name?.trim() || "";

  if (last && first) return `${last}, ${first}`;
  if (last) return last;
  if (first) return first;
  return player.player_name;
}

// ============================================================================
// Sub-components
// ============================================================================

/** Two-way badge for salary columns (sized to match salary amounts) */
function TwoWaySalaryBadge() {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center",
        "text-[10px] px-1.5 py-0.5 rounded",
        "bg-amber-100 dark:bg-amber-900/50",
        "text-amber-700 dark:text-amber-300",
        "font-medium"
      )}
    >
      Two-Way
    </span>
  );
}

/** Position chip (e.g., PG, SG, SF, PF, C) */
function PositionChip({ position }: { position: string }) {
  return (
    <span
      className={cx(
        "inline-flex items-center justify-center",
        "px-1.5 py-0.5 rounded",
        "bg-muted text-muted-foreground",
        "text-[10px] font-medium uppercase tracking-wide",
        "min-w-[28px]"
      )}
    >
      {position}
    </span>
  );
}

/** Contract option badge (PO, TO, ETO) */
function OptionBadge({ option }: { option: ContractOption }) {
  if (!option) return null;

  const colorClasses = {
    PO: "bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300",
    TO: "bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300",
    ETO: "bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center",
        "px-1 py-0.5 rounded",
        "text-[9px] font-semibold uppercase tracking-wide",
        colorClasses[option]
      )}
      title={
        option === "PO"
          ? "Player Option"
          : option === "TO"
            ? "Team Option"
            : "Early Termination Option"
      }
    >
      {option}
    </span>
  );
}

/** Guarantee type indicator (shown below salary) */
function GuaranteeBadge({ guarantee }: { guarantee: GuaranteeType }) {
  if (!guarantee) return null;

  const labels: Record<NonNullable<GuaranteeType>, string> = {
    GTD: "GTD",
    PARTIAL: "PRT",
    "NON-GTD": "NG",
  };

  const colorClasses: Record<NonNullable<GuaranteeType>, string> = {
    GTD: "text-green-600 dark:text-green-400",
    PARTIAL: "text-yellow-600 dark:text-yellow-400",
    "NON-GTD": "text-red-500 dark:text-red-400",
  };

  return (
    <span
      className={cx("text-[9px] font-medium", colorClasses[guarantee])}
      title={
        guarantee === "GTD"
          ? "Fully Guaranteed"
          : guarantee === "PARTIAL"
            ? "Partially Guaranteed"
            : "Non-Guaranteed"
      }
    >
      {labels[guarantee]}
    </span>
  );
}

/** Bird rights indicator */
function BirdRightsBadge({
  birdRights,
}: {
  birdRights: SalaryBookPlayer["bird_rights"];
}) {
  if (!birdRights) return null;

  const labels = {
    BIRD: "Bird",
    EARLY_BIRD: "E-Bird",
    NON_BIRD: "Non-Bird",
  };

  return (
    <span
      className={cx(
        "inline-flex items-center",
        "px-1 py-0.5 rounded",
        "bg-teal-100 dark:bg-teal-900/50",
        "text-teal-700 dark:text-teal-300",
        "text-[9px] font-medium"
      )}
    >
      {labels[birdRights]}
    </span>
  );
}

/** Free agency type and year indicator */
function FreeAgencyBadge({
  type,
  year,
}: {
  type: SalaryBookPlayer["free_agency_type"];
  year: number | null;
}) {
  if (!type || !year) return null;

  return (
    <span
      className={cx(
        "inline-flex items-center",
        "px-1 py-0.5 rounded",
        type === "UFA"
          ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300"
          : "bg-sky-100 dark:bg-sky-900/50 text-sky-700 dark:text-sky-300",
        "text-[9px] font-medium"
      )}
      title={type === "UFA" ? "Unrestricted Free Agent" : "Restricted Free Agent"}
    >
      {type} {year.toString().slice(-2)}
    </span>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function PlayerRow({
  player,
  onClick,
  onAgentClick,
  showOptions = true,
  showTwoWay = true,
}: PlayerRowProps) {
  const headshotUrl = `https://cdn.nba.com/headshots/nba/latest/1040x760/${player.player_id}.png`;
  // Simple inline SVG fallback so we don't collapse layout on 404s.
  const fallbackHeadshot =
    "data:image/svg+xml;utf8," +
    "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'>" +
    "<rect width='100%25' height='100%25' fill='%23e5e7eb'/>" +
    "<text x='50%25' y='52%25' dominant-baseline='middle' text-anchor='middle' " +
    "fill='%239ca3af' font-family='ui-sans-serif,system-ui' font-size='10'>" +
    "NBA" +
    "</text>" +
    "</svg>";

  const rowName = getPlayerRowName(player);

  return (
    <div
      onClick={onClick}
      className={cx(
        // Group for hover state coordination
        "group cursor-pointer",
        // Border between rows
        "border-b border-border/50",
        // Hover highlights BOTH rows as one unit
        "hover:bg-muted/40 dark:hover:bg-muted/20",
        // Smooth transition for hover
        "transition-colors duration-75"
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {/*
        Layout note:
        Keep the entire "Player" area as ONE sticky column (w-52).
        Headshot is part of that sticky cell (not its own column), so the sticky
        area doesn't encroach into the first salary year when horizontally scrolling.
      */}
      <div className="flex">
        {/* Sticky Player column (Headshot + Name + Details) */}
        <div
          className={cx(
            "w-52 shrink-0 pl-4",
            "sticky left-0 z-20",
            "relative",
            // Opaque background to prevent bleed-through while scrolling
            "bg-background",
            // Match row hover/transition
            "group-hover:bg-muted/40 dark:group-hover:bg-muted/20",
            "transition-colors duration-75",
            // Separator on the right edge of the sticky column
            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px",
            "after:bg-border/30"
          )}
        >
          <div
            className="grid grid-cols-[40px_1fr] grid-rows-[32px_24px]"
            aria-label={`${rowName} player info`}
          >
            {/* Headshot spans both sub-rows */}
            <div className="row-span-2 flex items-center justify-start">
              <div className="w-8 h-8 rounded border border-border bg-background overflow-hidden">
                <img
                  src={headshotUrl}
                  alt={rowName}
                  className="w-full h-full object-cover object-top bg-muted"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    // Avoid infinite loop if fallback fails for some reason
                    if (e.currentTarget.src !== fallbackHeadshot) {
                      e.currentTarget.src = fallbackHeadshot;
                    }
                  }}
                />
              </div>
            </div>

            {/* Row A: Name */}
            <div className="h-8 flex items-end min-w-0 pl-1 pr-2 pb-0.5">
              <span className="truncate font-medium text-[14px] group-hover:text-primary transition-colors">
                {rowName}
              </span>

            </div>

            {/* Row B: Details */}
            <div className="h-6 -mt-0.5 flex items-start gap-2 min-w-0 pl-1 pr-2 pt-0 leading-none text-xs text-muted-foreground">
              {player.position && <PositionChip position={player.position} />}
              {player.experience !== null && player.experience !== undefined && (
                <span>
                  {player.experience} yr{player.experience !== 1 ? "s" : ""}
                </span>
              )}
              {player.age !== null && <span>• {Math.floor(player.age)} y/o</span>}
            </div>
          </div>
        </div>

        {/* Non-sticky columns (Contract Years + Management) */}
        <div className="min-w-0">
          {/* Row A: Salaries + Agent */}
          <div className="h-8 flex items-end text-sm pb-0">
            {SALARY_YEARS.map((year) => {
              const salary = getSalary(player, year);
              const showTwoWayBadge = showTwoWay && player.is_two_way && salary == 0;

              return (
                <div
                  key={year}
                  className={cx(
                    "w-24 shrink-0",
                    "grid place-items-center",
                    !showTwoWayBadge && salary === null && "text-muted-foreground/50"
                  )}
                >
                  <PlayerSalary amount={salary} showTwoWayBadge={showTwoWayBadge} slotWidthCh={7} />
                </div>
              );
            })}

            {/* Total salary column */}
            <div className="w-24 shrink-0 grid place-items-center">
              <PlayerSalary
                amount={getTotalSalary(player)}
                showTwoWayBadge={showTwoWay && player.is_two_way && getTotalSalary(player) === 0}
                slotWidthCh={7}
                className="font-semibold"
              />
            </div>

            {/* Agent name (clickable → opens agent detail) */}
            <div className="w-40 pr-4 text-right truncate">
              {player.agent_name ? (
                <button
                  onClick={onAgentClick}
                  className={cx(
                    "text-xs text-muted-foreground",
                    "hover:text-primary hover:underline",
                    "focus:outline-none focus-visible:underline focus-visible:text-primary",
                    "transition-colors"
                  )}
                >
                  {player.agent_name}
                </button>
              ) : (
                <span className="text-xs text-muted-foreground/50">—</span>
              )}
            </div>
          </div>

          {/* Row B: Guarantees + Options + Bird/FA */}
          <div className="h-6 -mt-1 flex items-start text-xs text-muted-foreground">
            {SALARY_YEARS.map((year) => {
              const salary = getSalary(player, year);
              const option = getOption(player, year);
              const guarantee = getGuarantee(player, year);

              // Only show indicators if there's a salary for this year
              if (salary === null) {
                return <div key={year} className="w-24 shrink-0 text-center" />;
              }

              return (
                <div
                  key={year}
                  className="w-24 shrink-0 flex flex-col items-center justify-start gap-0.5"
                >
                  {guarantee && <GuaranteeBadge guarantee={guarantee} />}
                  {/* Don't show options for the current season (25-26 / cap_2025) */}
                  {showOptions && option && year !== SALARY_YEARS[0] && (
                    <OptionBadge option={option} />
                  )}
                </div>
              );
            })}

            {/* Empty cell for Total column alignment */}
            <div className="w-24 shrink-0" />

            {/* Agency name + Bird rights + Free agency (right column) */}
            <div className="w-40 pr-4 flex items-start justify-end gap-1.5 pt-0 truncate">
              {player.bird_rights && <BirdRightsBadge birdRights={player.bird_rights} />}
              {player.free_agency_type && (
                <FreeAgencyBadge
                  type={player.free_agency_type}
                  year={player.free_agency_year}
                />
              )}
              {player.agency_name && (
                <span className="text-muted-foreground/70 truncate max-w-[80px]">
                  {player.agency_name}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PlayerRow;
