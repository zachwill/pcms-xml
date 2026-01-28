/**
 * DraftAssetsRow — Draft assets aligned under year columns
 *
 * Displays draft picks owned by the team, organized by year.
 * Each year column stacks pick cards vertically (FRP/SRP).
 */

import React from "react";
import { FileText } from "lucide-react";
import { cx, focusRing } from "@/lib/utils";
import { KpiCell } from "./KpiCell";
import type { DraftPick } from "../../data";

export interface DraftAssetsRowProps {
  picks: DraftPick[];
  onPickClick: (pick: DraftPick) => void;
}

const SALARY_YEARS = [2025, 2026, 2027, 2028, 2029] as const;

function DraftAssetsIcon() {
  return (
    <div
      className={cx(
        "w-7 h-7 rounded border border-border",
        "bg-background flex items-center justify-center",
        "text-muted-foreground"
      )}
    >
      <FileText className="w-4 h-4" aria-hidden="true" />
    </div>
  );
}

function getRoundLabel(round: DraftPick["round"]): string {
  return round === 1 ? "FRP" : "SRP";
}

function isFrozenPick(pick: DraftPick): boolean {
  return pick.description?.toLowerCase().includes("frozen") ?? false;
}

function getPickStatus(pick: DraftPick): string {
  if (isFrozenPick(pick)) return "Frozen";
  if (pick.is_swap) return "Swap";
  if (pick.is_conditional) return "Conditional";
  if (pick.protections) return "Protected";
  if (pick.description?.toLowerCase().includes("conditional")) return "Conditional";
  return getRoundLabel(pick.round);
}

function buildPickLabel(pick: DraftPick): string {
  const status = getPickStatus(pick);
  if (status === "FRP" || status === "SRP") {
    return `${pick.year + 1} ${status}`;
  }
  return status;
}

function getPickCardClasses(pick: DraftPick): {
  className: string;
  labelClassName: string;
  valueClassName: string;
} {
  if (isFrozenPick(pick)) {
    return {
      className: "bg-slate-950/90 border border-blue-500/40",
      labelClassName: "text-blue-200",
      valueClassName: "text-blue-100",
    };
  }

  if (pick.round === 1) {
    return {
      className: "bg-amber-200/80 dark:bg-amber-700/70",
      labelClassName: "",
      valueClassName: "",
    };
  }

  return {
    className: "bg-slate-200/80 dark:bg-slate-700/70",
    labelClassName: "",
    valueClassName: "",
  };
}

function buildPickValue(pick: DraftPick): string {
  if (pick.asset_type === "TO") {
    return `To ${pick.origin_team_code}`;
  }

  if (pick.origin_team_code === pick.team_code) {
    return "Own";
  }

  return pick.origin_team_code;
}

function buildPickTitle(pick: DraftPick): string {
  const roundLabel = pick.round === 1 ? "1st Round" : "2nd Round";
  const swapLabel = pick.is_swap ? " (Swap)" : "";
  const protectionLabel = pick.protections ? ` - ${pick.protections}` : "";
  return `${pick.year} ${roundLabel} pick from ${pick.origin_team_code}${swapLabel}${protectionLabel}`;
}

export function DraftAssetsRow({ picks, onPickClick }: DraftAssetsRowProps) {
  if (picks.length === 0) return null;

  const picksByYear = picks.reduce<Record<number, DraftPick[]>>((acc, pick) => {
    (acc[pick.year] ||= []).push(pick);
    return acc;
  }, {});

  for (const year of Object.keys(picksByYear)) {
    picksByYear[Number(year)]!.sort((a, b) => {
      if (a.round !== b.round) return a.round - b.round;
      return a.origin_team_code.localeCompare(b.origin_team_code);
    });
  }

  return (
    <div
      className={cx(
        "bg-muted/10 dark:bg-muted/5",
        "border-b border-border/50",
        // Silk pattern: disable pointer events during active scroll
        "[[data-scroll-state=scrolling]_&]:pointer-events-none"
      )}
    >
      <div className="flex items-start text-xs py-2">
        {/* Label column (STICKY LEFT COLUMN) */}
        <div
          className={cx(
            "w-52 shrink-0 pl-4",
            "sticky left-0 z-[2]",
            "bg-muted/10 dark:bg-muted/5",
            "after:absolute after:right-0 after:top-0 after:bottom-0 after:w-px",
            "after:bg-border/30",
            "relative"
          )}
        >
          <div className="grid grid-cols-[40px_1fr] items-center h-full">
            <div className="flex items-center justify-start">
              <DraftAssetsIcon />
            </div>
            <div className="pl-1 flex items-center gap-2 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Draft Assets
              </span>
              <span
                className={cx(
                  "inline-flex items-center justify-center",
                  "min-w-[16px] h-4 px-1 rounded-full",
                  "bg-muted text-muted-foreground",
                  "text-[9px] font-medium"
                )}
              >
                {picks.length}
              </span>
            </div>
          </div>
        </div>

        {/* Year columns */}
        <div className="flex items-start">
          {SALARY_YEARS.map((year) => {
            const yearPicks = picksByYear[year] || [];
            const hasPicks = yearPicks.length > 0;

            return (
              <div
                key={year}
                className="w-24 shrink-0 flex flex-col items-center gap-1"
              >
                {hasPicks
                  ? yearPicks.map((pick) => {
                      const label = buildPickLabel(pick);
                      const value = buildPickValue(pick);
                      const cardClasses = getPickCardClasses(pick);
                      return (
                        <button
                          key={pick.id}
                          onClick={(event) => {
                            event.stopPropagation();
                            onPickClick(pick);
                          }}
                          className={cx("rounded", focusRing())}
                        >
                          <KpiCell
                            label={label}
                            value={value}
                            title={buildPickTitle(pick)}
                            className={cardClasses.className}
                            labelClassName={cx("w-full truncate", cardClasses.labelClassName)}
                            valueClassName={cx("truncate", cardClasses.valueClassName)}
                          />
                        </button>
                      );
                    })
                  : (
                      <KpiCell value="—" variant="muted" />
                    )}
              </div>
            );
          })}

          {/* Total spacer column */}
          <div className="w-24 shrink-0" />

          {/* Management spacer */}
          <div className="w-40 pr-4 shrink-0" />
        </div>
      </div>
    </div>
  );
}

export default DraftAssetsRow;
