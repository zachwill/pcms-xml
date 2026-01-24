/**
 * PlayerDetail — Sidebar entity view for a selected player
 *
 * Shows detailed player contract information when a player is pushed
 * onto the sidebar stack (clicked from PlayerRow).
 *
 * Sections:
 * 1. Player header (photo placeholder, name, team, position)
 * 2. Contract summary (total value, years, bird rights)
 * 3. Year-by-year breakdown (salary, guarantee, option per year)
 * 4. Trade restrictions (if any)
 * 5. AI insights placeholder
 */

import { useState, useEffect } from "react";
import { cx, formatters, focusRing } from "@/lib/utils";
import { useSalaryBookContext } from "../../SalaryBook";
import { useTeams } from "../../hooks";
import type { PlayerEntity } from "../../hooks";

// ============================================================================
// Types
// ============================================================================

export interface PlayerDetailProps {
  /** Player entity from sidebar stack */
  entity: PlayerEntity;
  /** Additional className */
  className?: string;
}

/**
 * Player API response from /api/salary-book/player/:playerId
 */
interface PlayerApiResponse {
  player_id: number;
  player_name: string;
  team_code: string;
  age: number | null;
  years_of_service: number | null;
  cap_2025: number | null;
  cap_2026: number | null;
  cap_2027: number | null;
  cap_2028: number | null;
  cap_2029: number | null;
  cap_2030: number | null;
  option_2025: string | null;
  option_2026: string | null;
  option_2027: string | null;
  option_2028: string | null;
  option_2029: string | null;
  option_2030: string | null;
  agent_id: number | null;
  agent_name: string | null;
  agency_id: number | null;
  agency_name: string | null;
  is_two_way: boolean;
  is_no_trade: boolean;
  is_trade_bonus: boolean;
  is_trade_consent_required_now: boolean;
  is_trade_preconsented: boolean;
  player_consent_lk: string | null;
}

interface YearData {
  year: number;
  salary: number | null;
  option: string | null;
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Photo placeholder with player initials
 */
function PlayerPhoto({
  playerName,
  className,
}: {
  playerName: string;
  className?: string;
}) {
  // Get initials from player name
  const initials = playerName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className={cx(
        "w-20 h-20 rounded-full",
        "bg-gradient-to-br from-muted to-muted/50",
        "flex items-center justify-center",
        "text-2xl font-bold text-muted-foreground",
        "ring-2 ring-border",
        className
      )}
    >
      {initials}
    </div>
  );
}

/**
 * Player header section with photo, name, team info
 */
function PlayerHeader({
  playerName,
  teamCode,
  teamName,
  position,
  age,
  experience,
}: {
  playerName: string;
  teamCode: string;
  teamName: string;
  position?: string | null;
  age?: number | null;
  experience?: number | null;
}) {
  // Build metadata line
  const metaParts: string[] = [];
  if (position) metaParts.push(position);
  if (age) metaParts.push(`${age} yrs old`);
  if (experience !== null && experience !== undefined)
    metaParts.push(`${experience} yr${experience !== 1 ? "s" : ""} exp`);

  return (
    <div className="flex flex-col items-center text-center space-y-3">
      <PlayerPhoto playerName={playerName} />
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-foreground">{playerName}</h2>
        <div className="text-sm text-muted-foreground">{teamName}</div>
        {metaParts.length > 0 && (
          <div className="text-xs text-muted-foreground/80">
            {metaParts.join(" • ")}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Contract summary card
 */
function ContractSummary({
  totalValue,
  contractYears,
  isTwoWay,
  agentName,
  agencyName,
  onAgentClick,
}: {
  totalValue: number;
  contractYears: number;
  isTwoWay: boolean;
  agentName: string | null;
  agencyName: string | null;
  onAgentClick?: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Contract
      </div>
      <div
        className={cx(
          "p-4 rounded-lg",
          "bg-muted/30 border border-border/50",
          "space-y-3"
        )}
      >
        {/* Contract value headline */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Total Value</span>
          <span className="font-mono tabular-nums text-lg font-semibold">
            {formatters.compactCurrency(totalValue)}
          </span>
        </div>

        {/* Years */}
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Years</span>
          <span className="text-sm font-medium">
            {contractYears} yr{contractYears !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Two-Way Badge */}
        {isTwoWay && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Contract Type</span>
            <span
              className={cx(
                "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                "bg-amber-100 text-amber-800",
                "dark:bg-amber-900/30 dark:text-amber-400"
              )}
            >
              Two-Way
            </span>
          </div>
        )}

        {/* Agent */}
        {agentName && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Agent</span>
            {onAgentClick ? (
              <button
                type="button"
                onClick={onAgentClick}
                className={cx(
                  "text-sm font-medium text-blue-600 dark:text-blue-400",
                  "hover:underline",
                  focusRing()
                )}
              >
                {agentName}
              </button>
            ) : (
              <span className="text-sm font-medium">{agentName}</span>
            )}
          </div>
        )}

        {/* Agency */}
        {agencyName && (
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">Agency</span>
            <span className="text-sm">{agencyName}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Option badge component
 */
function OptionBadge({ option }: { option: string }) {
  const colorMap: Record<string, string> = {
    PO: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    TO: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    ETO: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <span
      className={cx(
        "inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium",
        colorMap[option] ?? "bg-muted text-muted-foreground"
      )}
    >
      {option}
    </span>
  );
}

/**
 * Year-by-year breakdown table
 */
function YearByYearBreakdown({ years }: { years: YearData[] }) {
  // Filter to only years with salary
  const activeYears = years.filter((y) => y.salary !== null && y.salary > 0);

  if (activeYears.length === 0) {
    return (
      <div className="space-y-3">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Year-by-Year
        </div>
        <div className="p-3 rounded-lg bg-muted/30 text-sm text-muted-foreground italic">
          No salary data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Year-by-Year
      </div>
      <div className="space-y-1">
        {activeYears.map((yearData) => (
          <div
            key={yearData.year}
            className={cx(
              "flex items-center justify-between",
              "py-2 px-3 rounded",
              "hover:bg-muted/30 transition-colors"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground tabular-nums">
                {yearData.year - 1}-{String(yearData.year).slice(-2)}
              </span>
              {/* Don't show options for the current season (25-26 / cap_2025) */}
              {yearData.option && yearData.year !== 2025 && (
                <OptionBadge option={yearData.option} />
              )}
            </div>
            <span className="font-mono tabular-nums text-sm font-medium">
              {formatters.compactCurrency(yearData.salary!)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Trade restrictions section
 */
function TradeRestrictions({
  isNoTrade,
  isTradeBonus,
  isConsentRequired,
  isPreconsented,
}: {
  isNoTrade: boolean;
  isTradeBonus: boolean;
  isConsentRequired: boolean;
  isPreconsented: boolean;
}) {
  const restrictions: { label: string; active: boolean }[] = [
    { label: "No-Trade Clause", active: isNoTrade },
    { label: "Trade Bonus", active: isTradeBonus },
    { label: "Consent Required", active: isConsentRequired },
    { label: "Pre-consented", active: isPreconsented },
  ];

  const activeRestrictions = restrictions.filter((r) => r.active);

  if (activeRestrictions.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Trade Restrictions
      </div>
      <div className="flex flex-wrap gap-2">
        {activeRestrictions.map((restriction) => (
          <span
            key={restriction.label}
            className={cx(
              "inline-flex px-2 py-1 rounded text-xs font-medium",
              "bg-red-100 text-red-800",
              "dark:bg-red-900/30 dark:text-red-400"
            )}
          >
            {restriction.label}
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * AI insights placeholder
 */
function AIInsightsPlaceholder() {
  return (
    <div className="space-y-3">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        🤖 AI Analysis
      </div>
      <div
        className={cx(
          "p-4 rounded-lg",
          "bg-muted/30 border border-border/50",
          "text-sm text-muted-foreground italic"
        )}
      >
        AI-powered contract analysis, extension eligibility, trade value
        assessment, and cap impact projections coming soon.
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function PlayerDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col items-center space-y-3">
        <div className="w-20 h-20 rounded-full bg-muted" />
        <div className="space-y-2 text-center">
          <div className="h-6 w-40 bg-muted rounded mx-auto" />
          <div className="h-4 w-32 bg-muted rounded mx-auto" />
        </div>
      </div>

      {/* Contract skeleton */}
      <div className="space-y-3">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="p-4 rounded-lg bg-muted/30 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-24 bg-muted rounded" />
              <div className="h-4 w-16 bg-muted rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Year-by-year skeleton */}
      <div className="space-y-3">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-10 bg-muted/30 rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PlayerDetail — Full player contract view for sidebar
 *
 * Fetches fresh player data from API to ensure we have complete information.
 * Shows contract breakdown, year-by-year salary, trade restrictions, and
 * an AI insights placeholder.
 */
export function PlayerDetail({ entity, className }: PlayerDetailProps) {
  const { pushEntity } = useSalaryBookContext();
  const { getTeam } = useTeams();

  // State for fetched player data
  const [player, setPlayer] = useState<PlayerApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch player data
  useEffect(() => {
    async function fetchPlayer() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/salary-book/player/${entity.playerId}`
        );
        if (!response.ok) {
          throw new Error(`Failed to fetch player: ${response.status}`);
        }
        const data = await response.json();
        setPlayer(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPlayer();
  }, [entity.playerId]);

  // Get team info
  const team = getTeam(entity.teamCode);
  const teamName = team?.name ?? entity.teamCode;

  // Handle agent click — push agent entity onto stack
  const handleAgentClick = () => {
    if (player?.agent_id && player?.agent_name) {
      pushEntity({
        type: "agent",
        agentId: player.agent_id,
        agentName: player.agent_name,
      });
    }
  };

  // Show skeleton while loading
  if (isLoading) {
    return <PlayerDetailSkeleton />;
  }

  // Show error state
  if (error || !player) {
    return (
      <div className={cx("space-y-4", className)}>
        <PlayerHeader
          playerName={entity.playerName}
          teamCode={entity.teamCode}
          teamName={teamName}
        />
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-700 dark:text-red-400">
            {error?.message ?? "Failed to load player data"}
          </div>
        </div>
      </div>
    );
  }

  // Bun SQL can return Postgres `numeric` values as strings.
  // Coerce to numbers here so we don't accidentally string-concatenate when summing.
  const asNumber = (value: unknown): number | null => {
    if (value === null || value === undefined) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };

  // Build year-by-year data
  const years: YearData[] = [
    { year: 2025, salary: asNumber(player.cap_2025), option: player.option_2025 },
    { year: 2026, salary: asNumber(player.cap_2026), option: player.option_2026 },
    { year: 2027, salary: asNumber(player.cap_2027), option: player.option_2027 },
    { year: 2028, salary: asNumber(player.cap_2028), option: player.option_2028 },
    { year: 2029, salary: asNumber(player.cap_2029), option: player.option_2029 },
    { year: 2030, salary: asNumber(player.cap_2030), option: player.option_2030 },
  ];

  // Calculate contract totals
  const totalValue = years.reduce((sum, y) => sum + Number(y.salary ?? 0), 0);
  const contractYears = years.filter(
    (y) => y.salary !== null && y.salary > 0
  ).length;

  return (
    <div className={cx("space-y-6", className)}>
      {/* Player Header */}
      <PlayerHeader
        playerName={player.player_name}
        teamCode={player.team_code}
        teamName={teamName}
        age={player.age}
        experience={player.years_of_service}
      />

      {/* Contract Summary */}
      <ContractSummary
        totalValue={totalValue}
        contractYears={contractYears}
        isTwoWay={player.is_two_way}
        agentName={player.agent_name}
        agencyName={player.agency_name}
        onAgentClick={player.agent_id ? handleAgentClick : undefined}
      />

      {/* Year-by-Year Breakdown */}
      <YearByYearBreakdown years={years} />

      {/* Trade Restrictions */}
      <TradeRestrictions
        isNoTrade={player.is_no_trade}
        isTradeBonus={player.is_trade_bonus}
        isConsentRequired={player.is_trade_consent_required_now}
        isPreconsented={player.is_trade_preconsented}
      />

      {/* AI Insights Placeholder */}
      <AIInsightsPlaceholder />
    </div>
  );
}
