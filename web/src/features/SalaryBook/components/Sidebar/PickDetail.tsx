/**
 * PickDetail — Sidebar entity view for a selected draft pick
 *
 * Shows detailed pick information when a pick pill is clicked from DraftAssetsRow.
 *
 * Sections:
 * 1. Pick header (year, round, team badge)
 * 2. Pick metadata (asset type, origin/destination)
 * 3. Protections (if any)
 * 4. Conveyance history (timeline of how pick moved)
 * 5. AI insights placeholder
 */

import { useState, useEffect } from "react";
import { cx, focusRing } from "@/lib/utils";
import { useTeams } from "../../hooks";
import type { PickEntity } from "../../hooks";

// ============================================================================
// Types
// ============================================================================

export interface PickDetailProps {
  /** Pick entity from sidebar stack */
  entity: PickEntity;
  /** Additional className */
  className?: string;
}

/**
 * Pick API response from /api/salary-book/pick
 */
interface PickApiResponse {
  team_code: string;
  year: number;
  round: number;
  asset_type: string | null;
  description: string | null;
  origin_team_code: string;
  origin_team: {
    team_code: string;
    team_name: string;
    team_nickname: string;
  } | null;
  destination_team: {
    team_code: string;
    team_name: string;
    team_nickname: string;
  } | null;
  protections: string | null;
  is_swap: boolean;
  all_slots: Array<{
    asset_slot: number;
    asset_type: string;
    description: string;
  }>;
}

// ============================================================================
// Icon Components
// ============================================================================

function PickIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function ArrowRightIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M14 5l7 7m0 0l-7 7m7-7H3"
      />
    </svg>
  );
}

function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function SwapIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
      />
    </svg>
  );
}

// ============================================================================
// Subcomponents
// ============================================================================

/**
 * Round badge with visual styling
 */
function RoundBadge({
  round,
  className,
}: {
  round: number;
  className?: string;
}) {
  const isFirst = round === 1;
  return (
    <div
      className={cx(
        "w-16 h-16 rounded-xl",
        "flex flex-col items-center justify-center",
        "font-bold",
        isFirst
          ? "bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950"
          : "bg-gradient-to-br from-slate-400 to-slate-600 text-slate-950",
        className
      )}
    >
      <span className="text-2xl tabular-nums">{round}</span>
      <span className="text-[10px] uppercase tracking-wide opacity-80">
        {isFirst ? "1st" : "2nd"}
      </span>
    </div>
  );
}

/**
 * Pick header section with year, round badge, team info
 */
function PickHeader({
  year,
  round,
  teamCode,
  teamName,
  isSwap,
}: {
  year: number;
  round: number;
  teamCode: string;
  teamName: string;
  isSwap: boolean;
}) {
  return (
    <div className="flex items-start gap-4">
      <RoundBadge round={round} />
      <div className="flex-1 space-y-1">
        <h2 className="text-xl font-semibold text-foreground">
          {year} Draft Pick
        </h2>
        <div className="text-sm text-muted-foreground">
          Round {round} • {teamName || teamCode}
        </div>
        {isSwap && (
          <div className="flex items-center gap-1.5 mt-2">
            <SwapIcon className="w-4 h-4 text-purple-500" />
            <span
              className={cx(
                "inline-flex px-2 py-0.5 rounded text-xs font-medium",
                "bg-purple-100 text-purple-800",
                "dark:bg-purple-900/30 dark:text-purple-400"
              )}
            >
              Pick Swap
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Team card for origin/destination
 */
function TeamCard({
  label,
  teamCode,
  teamName,
  isOrigin,
}: {
  label: string;
  teamCode: string;
  teamName: string | null;
  isOrigin?: boolean;
}) {
  return (
    <div
      className={cx(
        "flex-1 p-3 rounded-lg",
        "border border-border/50",
        isOrigin ? "bg-muted/20" : "bg-muted/40"
      )}
    >
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1.5">
        {label}
      </div>
      <div className="flex items-center gap-2">
        <div
          className={cx(
            "w-8 h-8 rounded flex items-center justify-center",
            "text-xs font-bold font-mono",
            "bg-muted text-muted-foreground"
          )}
        >
          {teamCode}
        </div>
        <span className="text-sm font-medium truncate">
          {teamName || teamCode}
        </span>
      </div>
    </div>
  );
}

/**
 * Origin/Destination transfer display
 */
function PickTransfer({
  originTeamCode,
  originTeamName,
  destinationTeamCode,
  destinationTeamName,
}: {
  originTeamCode: string;
  originTeamName: string | null;
  destinationTeamCode: string;
  destinationTeamName: string | null;
}) {
  const isSameTeam = originTeamCode === destinationTeamCode;

  if (isSameTeam) {
    return (
      <div className="space-y-2">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Ownership
        </div>
        <TeamCard
          label="Own Pick"
          teamCode={originTeamCode}
          teamName={originTeamName}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Transfer
      </div>
      <div className="flex items-center gap-2">
        <TeamCard
          label="From"
          teamCode={originTeamCode}
          teamName={originTeamName}
          isOrigin
        />
        <ArrowRightIcon className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        <TeamCard
          label="To"
          teamCode={destinationTeamCode}
          teamName={destinationTeamName}
        />
      </div>
    </div>
  );
}

/**
 * Protections display
 */
function ProtectionsSection({ protections }: { protections: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <ShieldIcon className="w-4 h-4 text-amber-500" />
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Protections
        </span>
      </div>
      <div
        className={cx(
          "p-3 rounded-lg",
          "bg-amber-50 border border-amber-200",
          "dark:bg-amber-900/20 dark:border-amber-800"
        )}
      >
        <span className="text-sm font-medium text-amber-800 dark:text-amber-400">
          {protections}
        </span>
      </div>
    </div>
  );
}

/**
 * Raw pick description
 */
function PickDescription({ description }: { description: string }) {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Pick Details
      </div>
      <div
        className={cx(
          "p-3 rounded-lg",
          "bg-muted/30 border border-border/50"
        )}
      >
        <p className="text-sm text-foreground">{description}</p>
      </div>
    </div>
  );
}

/**
 * Asset type badge
 */
function AssetTypeBadge({ assetType }: { assetType: string }) {
  const colorMap: Record<string, string> = {
    OWN: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    HAS: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
    TO: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
    OTHER:
      "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  };

  const labelMap: Record<string, string> = {
    OWN: "Own Pick",
    HAS: "Acquired",
    TO: "Traded Away",
    OTHER: "Conditional",
  };

  return (
    <span
      className={cx(
        "inline-flex px-2 py-1 rounded text-xs font-medium",
        colorMap[assetType] ?? "bg-muted text-muted-foreground"
      )}
    >
      {labelMap[assetType] ?? assetType}
    </span>
  );
}

/**
 * Conveyance history placeholder
 */
function ConveyanceHistory() {
  return (
    <div className="space-y-2">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Conveyance History
      </div>
      <div
        className={cx(
          "p-3 rounded-lg",
          "bg-muted/20 border border-dashed border-border"
        )}
      >
        <p className="text-sm text-muted-foreground italic">
          Pick transaction history will be displayed here when available.
        </p>
      </div>
    </div>
  );
}

/**
 * AI insights placeholder
 */
function AIInsightsPlaceholder() {
  return (
    <div className="space-y-2">
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
        AI-powered pick valuation, protection analysis, and trade scenario
        modeling coming soon.
      </div>
    </div>
  );
}

/**
 * Loading skeleton
 */
function PickDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-start gap-4">
        <div className="w-16 h-16 rounded-xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-4 w-28 bg-muted rounded" />
        </div>
      </div>

      {/* Transfer skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-20 bg-muted rounded" />
        <div className="flex gap-2">
          <div className="flex-1 h-20 bg-muted/30 rounded-lg" />
          <div className="w-5 h-5 bg-muted rounded self-center" />
          <div className="flex-1 h-20 bg-muted/30 rounded-lg" />
        </div>
      </div>

      {/* Description skeleton */}
      <div className="space-y-2">
        <div className="h-3 w-24 bg-muted rounded" />
        <div className="h-16 bg-muted/30 rounded-lg" />
      </div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

/**
 * PickDetail — Full pick detail view for sidebar
 *
 * Fetches pick data from API to ensure complete information.
 * Shows pick metadata, origin/destination, protections, and conveyance history.
 */
export function PickDetail({ entity, className }: PickDetailProps) {
  const { getTeam } = useTeams();

  // State for fetched pick data
  const [pick, setPick] = useState<PickApiResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch pick data
  useEffect(() => {
    async function fetchPick() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          team: entity.teamCode,
          year: String(entity.draftYear),
          round: String(entity.draftRound),
        });

        const response = await fetch(`/api/salary-book/pick?${params}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch pick: ${response.status}`);
        }

        const data = await response.json();
        setPick(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }

    fetchPick();
  }, [entity.teamCode, entity.draftYear, entity.draftRound]);

  // Get team info from local data as fallback
  const team = getTeam(entity.teamCode);
  const teamName = team?.name ?? entity.teamCode;

  // Show skeleton while loading
  if (isLoading) {
    return <PickDetailSkeleton />;
  }

  // Show error state
  if (error) {
    return (
      <div className={cx("space-y-4", className)}>
        <PickHeader
          year={entity.draftYear}
          round={entity.draftRound}
          teamCode={entity.teamCode}
          teamName={teamName}
          isSwap={false}
        />
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <div className="text-sm text-red-700 dark:text-red-400">
            {error.message}
          </div>
        </div>

        {/* Still show entity raw data */}
        {entity.rawFragment && (
          <PickDescription description={entity.rawFragment} />
        )}
      </div>
    );
  }

  // No data returned
  if (!pick) {
    return (
      <div className={cx("space-y-4", className)}>
        <PickHeader
          year={entity.draftYear}
          round={entity.draftRound}
          teamCode={entity.teamCode}
          teamName={teamName}
          isSwap={false}
        />
        <div className="p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="text-sm text-amber-700 dark:text-amber-400">
            Pick data not found in database
          </div>
        </div>

        {/* Show entity raw data as fallback */}
        {entity.rawFragment && (
          <PickDescription description={entity.rawFragment} />
        )}
      </div>
    );
  }

  // Derive display values
  const originTeamName =
    pick.origin_team?.team_name ?? getTeam(pick.origin_team_code)?.name ?? null;
  const destinationTeamName =
    pick.destination_team?.team_name ?? team?.name ?? null;

  return (
    <div className={cx("space-y-6", className)}>
      {/* Pick Header */}
      <PickHeader
        year={pick.year}
        round={pick.round}
        teamCode={pick.team_code}
        teamName={destinationTeamName ?? pick.team_code}
        isSwap={pick.is_swap}
      />

      {/* Asset Type */}
      {pick.asset_type && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Status:</span>
          <AssetTypeBadge assetType={pick.asset_type} />
        </div>
      )}

      {/* Origin/Destination Transfer */}
      <PickTransfer
        originTeamCode={pick.origin_team_code}
        originTeamName={originTeamName}
        destinationTeamCode={pick.team_code}
        destinationTeamName={destinationTeamName}
      />

      {/* Protections */}
      {pick.protections && <ProtectionsSection protections={pick.protections} />}

      {/* Pick Description */}
      {pick.description && <PickDescription description={pick.description} />}

      {/* Conveyance History */}
      <ConveyanceHistory />

      {/* AI Insights Placeholder */}
      <AIInsightsPlaceholder />
    </div>
  );
}
