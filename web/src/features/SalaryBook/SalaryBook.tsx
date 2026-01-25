/**
 * SalaryBook — Main Orchestrator Component
 *
 * A scroll-driven front-office tool where scroll position drives context.
 * Layout: Fixed TopCommandBar at top, MainCanvas (~70%), Sidebar (~30%)
 *
 * The main canvas has a single vertical scroll for all team sections.
 * The sidebar has independent scroll and responds to scroll-spy active team.
 */

import React, { createContext, useContext, useRef, useState, useCallback, type ReactNode } from "react";
import { cx } from "@/lib/utils";
import {
  useScrollSpy,
  useSidebarStack,
  useFilterState,
  type SidebarEntity,
  type SidebarMode,
  type FilterState,
  type FilterKey,
} from "./hooks";
import { TopCommandBar } from "./components/TopCommandBar";
import { MainCanvas, TeamSection } from "./components/MainCanvas";
import { SidebarPanel } from "./components/Sidebar";

// ============================================================================
// Context
// ============================================================================

interface SalaryBookContextValue {
  // Canvas ref
  canvasRef: React.RefObject<HTMLDivElement | null>;

  // Scroll-spy state
  activeTeam: string | null;
  registerSection: (teamCode: string, element: HTMLElement | null) => void;
  scrollToTeam: (teamCode: string, behavior?: ScrollBehavior) => void;

  // Sidebar stack state
  sidebarMode: SidebarMode;
  currentEntity: SidebarEntity | null;
  pushEntity: (entity: SidebarEntity) => void;
  popEntity: () => void;
  clearStack: () => void;
  canGoBack: boolean;

  // Filter state
  filters: FilterState;
  toggleFilter: (group: keyof FilterState, key: FilterKey) => void;
  isFilterActive: (group: keyof FilterState, key: FilterKey) => boolean;
  resetFilters: () => void;

  // Loaded teams
  loadedTeams: string[];
  setLoadedTeams: (teams: string[]) => void;
}

const SalaryBookContext = createContext<SalaryBookContextValue | null>(null);

export function useSalaryBookContext() {
  const ctx = useContext(SalaryBookContext);
  if (!ctx) {
    throw new Error("useSalaryBookContext must be used within SalaryBookProvider");
  }
  return ctx;
}

// ============================================================================
// Provider
// ============================================================================

interface SalaryBookProviderProps {
  children: ReactNode;
  /**
   * Sticky threshold offset INSIDE the MainCanvas scroll container.
   *
   * NOTE: MainCanvas already sits below TopCommandBar (via layout margin), and
   * team headers use `sticky top-0`, so the correct threshold here is 0.
   */
  topOffset?: number;

  /**
   * Switch sidebar / scroll-spy context a bit sooner than the exact sticky handoff.
   * Tune this to taste.
   */
  activationOffset?: number;
}

function SalaryBookProvider({
  children,
  topOffset = 0,
  activationOffset = 160,
}: SalaryBookProviderProps) {
  // Ref for the main canvas scroll container
  const canvasRef = useRef<HTMLDivElement>(null);

  // Scroll-spy for tracking active team
  const { activeTeam, registerSection, scrollToTeam } = useScrollSpy({
    topOffset,
    activationOffset,
    containerRef: canvasRef,
  });

  // Ref to capture active team before filter changes (for scroll preservation)
  const activeTeamBeforeFilterChangeRef = useRef<string | null>(null);

  // Map of registered section elements (mirrors sectionsRef in useScrollSpy)
  // We need this to scroll back to the active team after filter changes
  const sectionElementsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Wrapper around registerSection that also tracks elements locally
  const registerSectionWithTracking = useCallback(
    (teamCode: string, element: HTMLElement | null) => {
      if (element) {
        sectionElementsRef.current.set(teamCode, element);
      } else {
        sectionElementsRef.current.delete(teamCode);
      }
      registerSection(teamCode, element);
    },
    [registerSection]
  );

  // Callback before filter change: capture current active team
  const handleBeforeFilterChange = useCallback(() => {
    activeTeamBeforeFilterChangeRef.current = activeTeam;
  }, [activeTeam]);

  // Callback after filter change: scroll back to the captured active team
  const handleAfterFilterChange = useCallback(() => {
    const teamToRestore = activeTeamBeforeFilterChangeRef.current;
    if (!teamToRestore) return;

    // Check if the team section still exists (might be filtered out)
    const element = sectionElementsRef.current.get(teamToRestore);
    if (!element) {
      // Team section no longer exists after filtering
      // Stay at current scroll position (don't do anything)
      activeTeamBeforeFilterChangeRef.current = null;
      return;
    }

    // Use instant scroll to avoid animation during filter toggle
    scrollToTeam(teamToRestore, "instant");
    activeTeamBeforeFilterChangeRef.current = null;
  }, [scrollToTeam]);

  // Sidebar entity navigation stack
  const { mode: sidebarMode, currentEntity, push, pop, clear, canGoBack } = useSidebarStack();

  // Filter toggle state with scroll preservation callbacks
  const { filters, toggleFilter, isFilterActive, resetFilters } = useFilterState({
    onBeforeChange: handleBeforeFilterChange,
    onAfterChange: handleAfterFilterChange,
  });

  // Loaded teams state (which teams are rendered in the canvas)
  // Default to all 30 teams in alphabetical order
  const [loadedTeams, setLoadedTeams] = useState<string[]>([
    "ATL",
    "BKN",
    "BOS",
    "CHA",
    "CHI",
    "CLE",
    "DAL",
    "DEN",
    "DET",
    "GSW",
    "HOU",
    "IND",
    "LAC",
    "LAL",
    "MEM",
    "MIA",
    "MIL",
    "MIN",
    "NOP",
    "NYK",
    "OKC",
    "ORL",
    "PHI",
    "PHX",
    "POR",
    "SAC",
    "SAS",
    "TOR",
    "UTA",
    "WAS",
  ]);

  const value: SalaryBookContextValue = {
    canvasRef,
    activeTeam,
    registerSection: registerSectionWithTracking,
    scrollToTeam,
    sidebarMode,
    currentEntity,
    pushEntity: push,
    popEntity: pop,
    clearStack: clear,
    canGoBack,
    filters,
    toggleFilter,
    isFilterActive,
    resetFilters,
    loadedTeams,
    setLoadedTeams,
  };

  return (
    <SalaryBookContext.Provider value={value}>
      {children}
    </SalaryBookContext.Provider>
  );
}

// ============================================================================
// Main Export
// ============================================================================

/**
 * SalaryBook — The main salary book page component
 *
 * Renders a full-page layout with:
 * - Fixed TopCommandBar (team selector + filters)
 * - MainCanvas (scrollable team sections, ~70% width)
 * - Sidebar (context panel, ~30% width)
 */
export function SalaryBook() {
  return (
    <SalaryBookProvider topOffset={0}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background">
        {/* Fixed top bar - MUST be above everything */}
        <TopCommandBar />

        {/* Main content area below the fixed top bar */}
        <div
          className="flex flex-1 overflow-hidden relative"
          style={{ marginTop: "130px", zIndex: 0 }}
        >
          {/* Main canvas - ~70% */}
          <MainCanvas />

          {/* Sidebar - ~30% */}
          <SidebarPanel />
        </div>
      </div>
    </SalaryBookProvider>
  );
}
