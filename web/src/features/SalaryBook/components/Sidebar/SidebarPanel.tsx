/**
 * SidebarPanel — Main sidebar container with intentionally-shallow navigation
 *
 * Modes:
 * - DEFAULT MODE: Shows team context from scroll-spy active team
 * - ENTITY MODE: Shows a single detail view (player/agent/pick/team)
 *
 * Key behavior:
 * - Clicking around swaps the detail view; it does NOT build up a deep "back" history.
 * - Back returns to the team context in a single step (except when a team is pinned).
 *
 * Animation pattern (from Silk):
 * - Uses safeToUnmount lifecycle to keep entity visible during exit animation
 * - Entity animates out before unmounting, preventing content flash
 * - TeamContext always renders as base layer — entity overlays on top
 * - All animations are WAAPI-coordinated (no CSS transitions)
 */

import React, { useRef, useEffect, useState } from "react";
import { cx, focusRing } from "@/lib/utils";
import { useShellContext, useSidebarTransition, type SidebarEntity } from "@/state/shell";
import { useTeams } from "../../hooks";
import { animate, durations, easings } from "@/lib/animate";
import { TeamContext } from "./TeamContext";
import { PlayerDetail } from "./PlayerDetail";
import { AgentDetail } from "./AgentDetail";
import { PickDetail } from "./PickDetail";
import { BackButtonTeamBadge } from "./BackButtonTeamBadge";

// ============================================================================
// Constants
// ============================================================================

/** Height of the back button header in pixels */
const HEADER_HEIGHT = 40;

// ============================================================================
// Icon Components
// ============================================================================

function ChevronLeftIcon({ className }: { className?: string }) {
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
        d="M15 19l-7-7 7-7"
      />
    </svg>
  );
}

// ============================================================================
// Placeholder Detail Components
// ============================================================================

/**
 * Placeholder for team entity detail view (pinned team)
 * Will be replaced by TeamDetail.tsx
 */
function TeamDetailPlaceholder({ entity }: { entity: Extract<SidebarEntity, { type: "team" }> }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center text-lg font-mono font-bold">
          {entity.teamCode}
        </div>
        <div>
          <div className="font-semibold">{entity.teamName}</div>
          <div className="text-sm text-muted-foreground">Team Report (Pinned)</div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
          Team Overview
        </div>
        <div className="p-3 bg-muted/30 rounded-lg text-sm text-muted-foreground">
          Full team report will be displayed here. This view is pinned and won't change on scroll.
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Entity Detail Router
// ============================================================================

/**
 * Routes to the correct entity detail component based on entity type
 */
function EntityDetail({ entity }: { entity: SidebarEntity }) {
  switch (entity.type) {
    case "player":
      return <PlayerDetail entity={entity} />;
    case "agent":
      return <AgentDetail entity={entity} />;
    case "pick":
      return <PickDetail entity={entity} />;
    case "team":
      return <TeamDetailPlaceholder entity={entity} />;
    default:
      // TypeScript exhaustiveness check
      const _exhaustive: never = entity;
      return null;
  }
}

// ============================================================================
// SidebarPanel
// ============================================================================

export interface SidebarPanelProps {
  /** Additional className for the panel container */
  className?: string;
}

/**
 * SidebarPanel — Intelligence panel with stack-based entity navigation
 *
 * State Machine:
 * - Empty stack (default mode): Shows scroll-spy active team context
 * - Stack has items (entity mode): Shows top entity detail with Back button
 *
 * Back navigation returns to CURRENT viewport team via scroll-spy,
 * not the team where you originally started browsing.
 *
 * Animation pattern (Silk-inspired):
 * - All transitions use coordinated WAAPI animations
 * - Header slides left, entity slides right, TeamContext slides up — all together
 * - No CSS transitions that fight with WAAPI
 */
export function SidebarPanel({ className }: SidebarPanelProps) {
  const {
    currentEntity,
    popEntity,
    canGoBack,
    activeTeam,
  } = useShellContext();

  // Transition hook manages staged entity and animations
  const {
    stagedEntity,
    transitionState,
    containerRef,
    safeToUnmount,
  } = useSidebarTransition(currentEntity);

  // Render entity if we have a staged entity OR exit animation is running
  const showEntity = stagedEntity !== null || !safeToUnmount;

  // Whether we're in "entity mode" (for crossfade logic)
  const isEntityMode = showEntity;

  // Track if we're exiting to team context (for crossfade)
  const isExitingToTeam = transitionState === "exiting" && currentEntity === null;

  const { getTeam } = useTeams();

  // Get team info for the back button
  const team = activeTeam ? getTeam(activeTeam) : null;
  const teamId = team?.team_id ?? null;

  // Use the active team code for the back button, fallback to "Back"
  const backLabel = activeTeam || "Back";

  // Show back button if we can go back OR if entity is still animating out
  const showBackButton = canGoBack || (transitionState === "exiting");

  // -------------------------------------------------------------------------
  // Refs for coordinated animations
  // -------------------------------------------------------------------------
  const headerButtonRef = useRef<HTMLButtonElement>(null);
  const teamContextRef = useRef<HTMLDivElement>(null);
  
  // Track header mount state for conditional rendering
  const [headerMounted, setHeaderMounted] = useState(showBackButton);
  
  // Track previous entity to detect enter/exit transitions
  const prevEntityRef = useRef(currentEntity);

  // -------------------------------------------------------------------------
  // Coordinated WAAPI animations (Silk-style)
  // 
  // Key insight: We trigger exit animations when currentEntity becomes null,
  // NOT when showBackButton changes. This lets header/TeamContext/entity
  // all animate out in parallel instead of sequentially.
  // -------------------------------------------------------------------------
  useEffect(() => {
    const prevEntity = prevEntityRef.current;
    prevEntityRef.current = currentEntity;

    const teamEl = teamContextRef.current;
    const headerEl = headerButtonRef.current;

    // Case 1: ENTERING entity mode (null -> entity)
    // - Header button slides in from left
    // - TeamContext slides down to make room
    if (currentEntity !== null && prevEntity === null) {
      setHeaderMounted(true);
      
      requestAnimationFrame(() => {
        // Animate header button in from left
        if (headerEl) {
          animate(headerEl, [
            { opacity: 0, transform: "translateX(-8px)" },
            { opacity: 1, transform: "translateX(0)" },
          ], {
            duration: durations.normal,
            easing: easings.easeOut,
          });
        }

        // TeamContext slides down from natural position
        if (teamEl) {
          animate(teamEl, [
            { transform: "translateY(0)" },
            { transform: `translateY(${HEADER_HEIGHT}px)` },
          ], {
            duration: durations.normal,
            easing: easings.easeOut,
          });
        }
      });
    }

    // Case 2: EXITING entity mode (entity -> null)
    // - Header button slides out to left
    // - TeamContext slides up to natural position
    // This runs IN PARALLEL with useSidebarTransition's entity exit animation
    if (currentEntity === null && prevEntity !== null) {
      // Run animations in parallel
      const animations: Promise<unknown>[] = [];

      // Header slides out to left
      if (headerEl) {
        animations.push(
          animate(headerEl, [
            { opacity: 1, transform: "translateX(0)" },
            { opacity: 0, transform: "translateX(-8px)" },
          ], {
            duration: durations.fast,
            easing: easings.easeIn,
          })
        );
      }

      // TeamContext slides up to natural position
      if (teamEl) {
        animations.push(
          animate(teamEl, [
            { transform: `translateY(${HEADER_HEIGHT}px)` },
            { transform: "translateY(0)" },
          ], {
            duration: durations.fast,
            easing: easings.easeIn,
          })
        );
      }

      // After all animations complete, unmount header
      Promise.all(animations).then(() => {
        setHeaderMounted(false);
      });
    }
  }, [currentEntity]);

  return (
    <div
      className={cx(
        "w-[30%] min-w-[320px] max-w-[480px]",
        "border-l border-border",
        "bg-background",
        "overflow-hidden relative",
        className
      )}
    >
      {/* Sidebar content - fills entire sidebar */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Base layer: TeamContext (always rendered, revealed during exit) */}
        {/* Transform is controlled entirely by WAAPI, not React's style prop */}
        <div
          ref={teamContextRef}
          className={cx(
            "absolute inset-0 overflow-y-auto",
            "pt-4 px-4 pb-4",
            // Hide when entity fully covers it (not during exit)
            showEntity && !isExitingToTeam ? "invisible" : "visible"
          )}
        >
          <TeamContext />
        </div>

        {/* Overlay layer: Entity detail */}
        {/* Uses top offset instead of transform so WAAPI animations don't conflict */}
        {showEntity && stagedEntity && (
          <div
            ref={containerRef}
            className="absolute left-0 right-0 bottom-0 overflow-y-auto bg-background z-10 pt-4 px-4 pb-4"
            style={{
              // Static offset for header — use top, not transform
              // Transform is reserved for WAAPI animations (translateX for enter/exit)
              top: HEADER_HEIGHT,
            }}
            data-transition-state={transitionState}
          >
            <EntityDetail entity={stagedEntity} />
          </div>
        )}
      </div>

      {/* Back button header - overlays content */}
      {(showBackButton || headerMounted) && (
        <div
          className={cx(
            "absolute top-0 left-0 right-0 z-20",
            "h-10 px-4 flex items-center",
            "bg-background border-b border-border"
          )}
        >
          <button
            ref={headerButtonRef}
            type="button"
            onClick={popEntity}
            disabled={transitionState === "exiting"}
            className={cx(
              "flex items-center gap-1.5 text-sm",
              "text-muted-foreground hover:text-foreground",
              "transition-colors duration-150",
              "disabled:opacity-50 disabled:cursor-default",
              focusRing()
            )}
          >
            <ChevronLeftIcon className="w-4 h-4" />
            {/* Team logo avatar with crossfade animation */}
            <BackButtonTeamBadge
              teamCode={activeTeam}
              teamId={teamId}
              isEntityMode={isEntityMode}
            />
            <span>{backLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
