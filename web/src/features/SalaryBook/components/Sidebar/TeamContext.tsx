/**
 * TeamContext — Default sidebar view showing active team from scroll-spy
 *
 * Displays when no entity is pushed onto the sidebar stack.
 * Shows team info with cap outlook (financial health) data.
 * Updates automatically as user scrolls to different teams.
 *
 * Two tabs:
 * - Cap Outlook: financial health, cap space projections, tax thresholds
 * - Team Stats: record, standings, efficiency metrics (future phase)
 */

import { useState } from "react";
import { cx, formatters, focusRing } from "@/lib/utils";
import { useSalaryBookContext } from "../../SalaryBook";
import { useTeamSalary, useTeams } from "../../hooks";

// ============================================================================
// Types
// ============================================================================

export interface TeamContextProps {
  /** Optional: override the team code (otherwise uses activeTeam from scroll-spy) */
  teamCode?: string | null;
  /** Additional className */
  className?: string;
}

type TabId = "cap-outlook" | "team-stats";

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Team header with logo placeholder and team name
 */
function TeamHeader({
  teamCode,
  teamName,
  conference,
}: {
  teamCode: string;
  teamName: string;
  conference: string;
}) {
  return (
    <div className="flex items-center gap-3">
      {/* Team logo placeholder */}
      <div
        className={cx(
          "w-14 h-14 rounded-lg",
          "bg-muted",
          "flex items-center justify-center",
          "text-lg font-mono font-bold text-muted-foreground"
        )}
      >
        {teamCode}
      </div>
      <div>
        <div className="font-semibold text-lg">{teamName}</div>
        <div className="text-sm text-muted-foreground">
          {conference === "EAST" ? "Eastern" : "Western"} Conference
        </div>
      </div>
    </div>
  );
}

/**
 * Single financial stat row
 */
function StatRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number | null;
  valueClassName?: string;
}) {
  const displayValue =
    value === null ? "—" : typeof value === "number" ? formatters.compactCurrency(value) : value;

  return (
    <div className="flex justify-between items-baseline py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span
        className={cx(
          "font-mono tabular-nums text-sm font-medium",
          valueClassName
        )}
      >
        {displayValue}
      </span>
    </div>
  );
}

/**
 * Cap space display with color coding
 */
function CapSpaceStat({
  label,
  value,
}: {
  label: string;
  value: number | null;
}) {
  if (value === null) {
    return <StatRow label={label} value="—" />;
  }

  const isPositive = value >= 0;
  const displayValue = isPositive
    ? `+${formatters.compactCurrency(value)}`
    : formatters.compactCurrency(value);

  return (
    <StatRow
      label={label}
      value={displayValue}
      valueClassName={isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500"}
    />
  );
}

/**
 * Tax status indicator badge
 */
function TaxStatusBadge({
  isOverTax,
  isOverFirstApron,
  isOverSecondApron,
}: {
  isOverTax: boolean;
  isOverFirstApron: boolean;
  isOverSecondApron: boolean;
}) {
  let status = "Under Tax";
  let colorClass = "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";

  if (isOverSecondApron) {
    status = "2nd Apron";
    colorClass = "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
  } else if (isOverFirstApron) {
    status = "1st Apron";
    colorClass = "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
  } else if (isOverTax) {
    status = "Tax Payer";
    colorClass = "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
  }

  return (
    <span
      className={cx(
        "inline-flex px-2 py-0.5 rounded text-xs font-medium",
        colorClass
      )}
    >
      {status}
    </span>
  );
}

/**
 * Tab toggle for switching between Cap Outlook and Team Stats
 */
function TabToggle({
  activeTab,
  onTabChange,
}: {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}) {
  const tabs: { id: TabId; label: string }[] = [
    { id: "cap-outlook", label: "Cap Outlook" },
    { id: "team-stats", label: "Team Stats" },
  ];

  return (
    <div className="flex gap-1 p-1 rounded-lg bg-muted/50">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={cx(
            "flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition-all",
            focusRing(),
            activeTab === tab.id
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background/50"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Team Stats placeholder for future phase
 * Will include: record, standings, efficiency metrics
 */
function TeamStatsPlaceholder({ teamCode }: { teamCode: string }) {
  return (
    <div className="space-y-4">
      {/* Coming Soon Notice */}
      <div
        className={cx(
          "p-4 rounded-lg",
          "bg-muted/30 border border-border/50",
          "text-center"
        )}
      >
        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
          <svg
            className="w-5 h-5 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <div className="text-sm font-medium text-foreground mb-1">
          Team Stats Coming Soon
        </div>
        <div className="text-xs text-muted-foreground">
          Record, standings, and efficiency metrics will be available in a future update.
        </div>
      </div>

      {/* Placeholder Stats Preview */}
      <div className="space-y-3 opacity-50 pointer-events-none">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Preview
        </div>
        <div className="space-y-2">
          {[
            { label: "Record", value: "— — —" },
            { label: "Conference Rank", value: "—" },
            { label: "Offensive Rating", value: "—" },
            { label: "Defensive Rating", value: "—" },
            { label: "Net Rating", value: "—" },
          ].map((stat) => (
            <div key={stat.label} className="flex justify-between items-baseline py-1">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span className="font-mono text-sm text-muted-foreground/50">
                {stat.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Year-by-year salary projections mini-chart
 */
function SalaryProjections({
  salaryByYear,
}: {
  salaryByYear: Map<number, { cap_total: number; cap_space: number }>;
}) {
  const years = [2025, 2026, 2027, 2028, 2029, 2030];

  // Get max salary for scaling bars
  const values = years.map((y) => salaryByYear.get(y)?.cap_total ?? 0);
  const maxValue = Math.max(...values, 1);

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Salary Projection
      </div>
      <div className="flex items-end gap-1 h-20">
        {years.map((year) => {
          const salary = salaryByYear.get(year);
          const value = salary?.cap_total ?? 0;
          const heightPercent = (value / maxValue) * 100;

          return (
            <div key={year} className="flex-1 flex flex-col items-center gap-1">
              <div
                className={cx(
                  "w-full rounded-t transition-all",
                  value > 0 ? "bg-blue-500/80" : "bg-muted"
                )}
                style={{ height: `${Math.max(heightPercent, 4)}%` }}
              />
              <span className="text-[10px] text-muted-foreground tabular-nums">
                {year.toString().slice(-2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for team context
 */
function TeamContextSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-14 h-14 rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
      <div className="border-t border-border pt-4 space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex justify-between">
            <div className="h-4 w-24 bg-muted rounded" />
            <div className="h-4 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state when no team is active
 */
function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
        <svg
          className="w-6 h-6 text-muted-foreground"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      </div>
      <div className="text-sm text-muted-foreground">
        Scroll to view team details
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * TeamContext — Shows active team's financial overview
 *
 * Content:
 * - Team header (logo, name, conference)
 * - Tab toggle (Cap Outlook / Team Stats)
 * - Cap Outlook: total salary, cap space, tax status, room under thresholds, projections
 * - Team Stats: placeholder for future phase (record, standings, efficiency)
 *
 * Future additions:
 * - AI Analysis insights
 */
export function TeamContext({ teamCode: teamCodeProp, className }: TeamContextProps) {
  const { activeTeam } = useSalaryBookContext();
  const { getTeam, isLoading: teamsLoading } = useTeams();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>("cap-outlook");

  // Use prop if provided, otherwise fall back to scroll-spy active team
  const teamCode = teamCodeProp ?? activeTeam;

  // Fetch team salary data
  const {
    salaryByYear,
    currentYearTotal,
    currentYearCapSpace,
    isLoading: salaryLoading,
  } = useTeamSalary(teamCode);

  // Get team metadata
  const team = teamCode ? getTeam(teamCode) : undefined;

  // Handle no active team
  if (!teamCode) {
    return <EmptyState />;
  }

  // Show skeleton while loading
  if (teamsLoading || (salaryLoading && !currentYearTotal)) {
    return <TeamContextSkeleton />;
  }

  // Get current year salary data for detailed display
  const currentSalary = salaryByYear.get(2025);

  return (
    <div className={cx("space-y-4", className)}>
      {/* Team Header */}
      <TeamHeader
        teamCode={teamCode}
        teamName={team?.name ?? `Team ${teamCode}`}
        conference={team?.conference ?? "EAST"}
      />

      {/* Tab Toggle */}
      <TabToggle activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Content */}
      {activeTab === "cap-outlook" ? (
        <>
          {/* Cap Outlook Section */}
          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                2024-25 Cap Outlook
              </div>
              {currentSalary && (
                <TaxStatusBadge
                  isOverTax={currentSalary.is_over_tax}
                  isOverFirstApron={currentSalary.is_over_first_apron}
                  isOverSecondApron={currentSalary.is_over_second_apron}
                />
              )}
            </div>

            <div className="space-y-0.5">
              <StatRow label="Total Salary" value={currentYearTotal} />
              <CapSpaceStat label="Cap Space" value={currentYearCapSpace} />

              {currentSalary && (
                <>
                  <StatRow
                    label="Room Under Tax"
                    value={currentSalary.room_under_tax}
                    valueClassName={
                      currentSalary.room_under_tax >= 0
                        ? "text-foreground"
                        : "text-red-500"
                    }
                  />
                  <StatRow
                    label="Room Under 1st Apron"
                    value={currentSalary.room_under_first_apron}
                    valueClassName={
                      currentSalary.room_under_first_apron >= 0
                        ? "text-foreground"
                        : "text-red-500"
                    }
                  />
                </>
              )}
            </div>
          </div>

          {/* Salary Projections */}
          {salaryByYear.size > 0 && (
            <div className="border-t border-border pt-4">
              <SalaryProjections salaryByYear={salaryByYear} />
            </div>
          )}

          {/* AI Analysis Placeholder */}
          <div className="border-t border-border pt-4">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
              🤖 AI Analysis
            </div>
            <div
              className={cx(
                "p-3 rounded-lg",
                "bg-muted/30 border border-border/50",
                "text-sm text-muted-foreground italic"
              )}
            >
              AI-powered cap analysis and trade insights coming soon.
            </div>
          </div>
        </>
      ) : (
        /* Team Stats Placeholder */
        <TeamStatsPlaceholder teamCode={teamCode} />
      )}
    </div>
  );
}
