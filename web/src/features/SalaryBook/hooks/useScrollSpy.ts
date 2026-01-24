import { useCallback, useEffect, useRef, useState } from "react";

/**
 * useScrollSpy — Tracks which team section header is currently sticky
 *
 * The "active team" is determined by which team's header is currently in the
 * sticky position at the top of the scroll container. This drives:
 * 1. Team Selector Grid highlight (no flicker)
 * 2. Sidebar default mode content (shows active team context)
 *
 * Uses IntersectionObserver to efficiently detect when team sections enter/exit
 * the viewport, with a small root margin to detect the "sticky" threshold.
 */

interface ScrollSpyOptions {
  /** Offset from top where sticky headers attach (accounts for fixed TopCommandBar) */
  topOffset?: number;

  /**
   * Extra pixels BELOW the sticky threshold to switch the active team a bit sooner.
   *
   * This is useful when a team header is approaching the top ("push-off" zone) and
   * we want sidebar/context to update slightly earlier than the exact sticky handoff.
   */
  activationOffset?: number;

  /** Scroll container ref - defaults to document if not provided */
  containerRef?: React.RefObject<HTMLElement | null>;
}

interface ScrollSpyResult {
  /** Currently active team code (team whose header is sticky) */
  activeTeam: string | null;
  /** Register a team section element for observation */
  registerSection: (teamCode: string, element: HTMLElement | null) => void;
  /** Manually set active team (e.g., after jump-to-team navigation) */
  setActiveTeam: (teamCode: string) => void;
  /** Scroll to a specific team section */
  scrollToTeam: (teamCode: string, behavior?: ScrollBehavior) => void;
}

export function useScrollSpy(options: ScrollSpyOptions = {}): ScrollSpyResult {
  const { topOffset = 0, activationOffset = 0, containerRef } = options;

  // Track active team state
  const [activeTeam, setActiveTeam] = useState<string | null>(null);

  // Map of team codes to their section elements
  const sectionsRef = useRef<Map<string, HTMLElement>>(new Map());

  // Track intersection ratios for each team
  const intersectionRatiosRef = useRef<Map<string, number>>(new Map());

  // Observer ref for cleanup
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Pending update timeout for debouncing
  const pendingUpdateRef = useRef<number | null>(null);

  // Flag to suppress scroll-spy during programmatic scrolling
  const isScrollingProgrammaticallyRef = useRef<boolean>(false);

  // Programmatic scroll settle detection (avoids guessing durations for smooth scroll)
  const programmaticScrollSettleTimeoutRef = useRef<number | null>(null);
  const programmaticScrollMaxTimeoutRef = useRef<number | null>(null);
  const removeProgrammaticScrollListenerRef = useRef<(() => void) | null>(null);

  /**
   * Calculate which team should be active based on current scroll position
   * Priority: team whose section top is at or just below the sticky threshold
   */
  const calculateActiveTeam = useCallback(() => {
    const container = containerRef?.current ?? document.documentElement;
    const scrollTop =
      containerRef?.current?.scrollTop ?? window.scrollY ?? document.documentElement.scrollTop;
    const threshold = scrollTop + topOffset + activationOffset + 1; // +1 to handle edge case

    let activeCode: string | null = null;
    let closestDistance = Infinity;

    sectionsRef.current.forEach((element, teamCode) => {
      const rect = element.getBoundingClientRect();
      const containerRect = containerRef?.current?.getBoundingClientRect();
      const elementTop = containerRef?.current
        ? rect.top - (containerRect?.top ?? 0) + (containerRef.current.scrollTop ?? 0)
        : rect.top + scrollTop;

      // A team is "active" if its section top is at or above the threshold
      // and it's the closest one to (but not below) the threshold
      if (elementTop <= threshold) {
        const distance = threshold - elementTop;
        if (distance < closestDistance) {
          closestDistance = distance;
          activeCode = teamCode;
        }
      }
    });

    // If no team is at/above threshold, pick the first one (topmost)
    if (!activeCode && sectionsRef.current.size > 0) {
      let topmostCode: string | null = null;
      let topmostTop = Infinity;
      sectionsRef.current.forEach((element, teamCode) => {
        const rect = element.getBoundingClientRect();
        const elementTop = containerRef?.current
          ? rect.top - (containerRef.current.getBoundingClientRect()?.top ?? 0)
          : rect.top;

        if (elementTop < topmostTop) {
          topmostTop = elementTop;
          topmostCode = teamCode;
        }
      });
      activeCode = topmostCode;
    }

    return activeCode;
  }, [containerRef, topOffset, activationOffset]);

  /**
   * Update active team with debouncing to prevent flicker during fast scrolling
   */
  const updateActiveTeam = useCallback(() => {
    // Skip updates during programmatic scrolling to prevent buttons lighting up along the way
    if (isScrollingProgrammaticallyRef.current) {
      return;
    }

    // Cancel any pending update
    if (pendingUpdateRef.current !== null) {
      cancelAnimationFrame(pendingUpdateRef.current);
    }

    // Schedule update on next frame for smooth updates
    pendingUpdateRef.current = requestAnimationFrame(() => {
      const newActiveTeam = calculateActiveTeam();
      setActiveTeam((prev) => {
        // Only update if different to prevent unnecessary re-renders
        if (prev !== newActiveTeam) {
          return newActiveTeam;
        }
        return prev;
      });
      pendingUpdateRef.current = null;
    });
  }, [calculateActiveTeam]);

  /**
   * Register a team section element for observation
   * Call this from TeamSection component with ref callback
   */
  const registerSection = useCallback(
    (teamCode: string, element: HTMLElement | null) => {
      if (element) {
        sectionsRef.current.set(teamCode, element);

        // Observe this element
        if (observerRef.current) {
          observerRef.current.observe(element);
        }

        // Initial calculation if this is first section
        if (sectionsRef.current.size === 1) {
          updateActiveTeam();
        }
      } else {
        // Cleanup when element unmounts
        const existingElement = sectionsRef.current.get(teamCode);
        if (existingElement && observerRef.current) {
          observerRef.current.unobserve(existingElement);
        }
        sectionsRef.current.delete(teamCode);
        intersectionRatiosRef.current.delete(teamCode);
      }
    },
    [updateActiveTeam]
  );

  /**
   * Scroll to a specific team section
   */
  const scrollToTeam = useCallback(
    (teamCode: string, behavior: ScrollBehavior = "smooth") => {
      const element = sectionsRef.current.get(teamCode);
      if (!element) return;

      // Reflect the click immediately (nav highlight / sidebar context)
      setActiveTeam(teamCode);

      // Suppress scroll-spy updates during programmatic scrolling (prevents oscillation)
      isScrollingProgrammaticallyRef.current = true;

      // Clean up any prior programmatic scroll listeners/timers
      removeProgrammaticScrollListenerRef.current?.();
      removeProgrammaticScrollListenerRef.current = null;

      const scrollTarget: HTMLElement | Window = containerRef?.current ?? window;

      const clearTimers = () => {
        if (programmaticScrollSettleTimeoutRef.current !== null) {
          clearTimeout(programmaticScrollSettleTimeoutRef.current);
          programmaticScrollSettleTimeoutRef.current = null;
        }
        if (programmaticScrollMaxTimeoutRef.current !== null) {
          clearTimeout(programmaticScrollMaxTimeoutRef.current);
          programmaticScrollMaxTimeoutRef.current = null;
        }
      };

      const finish = () => {
        // Idempotent
        if (!isScrollingProgrammaticallyRef.current) return;

        isScrollingProgrammaticallyRef.current = false;

        removeProgrammaticScrollListenerRef.current?.();
        removeProgrammaticScrollListenerRef.current = null;

        clearTimers();

        // Re-sync active team to the actual sticky owner at the end of the scroll.
        updateActiveTeam();
      };

      const scheduleSettleCheck = () => {
        if (programmaticScrollSettleTimeoutRef.current !== null) {
          clearTimeout(programmaticScrollSettleTimeoutRef.current);
        }
        programmaticScrollSettleTimeoutRef.current = window.setTimeout(finish, 120);
      };

      const onProgrammaticScroll = () => {
        scheduleSettleCheck();
      };

      // Listen for scroll events until the scroll settles
      scrollTarget.addEventListener("scroll", onProgrammaticScroll, { passive: true } as any);
      removeProgrammaticScrollListenerRef.current = () => {
        scrollTarget.removeEventListener("scroll", onProgrammaticScroll as any);
        clearTimers();
      };

      // Scroll to the "handoff point": make this section the sticky-header owner.
      // We bias by +1px (unless we're already at the very top) to guarantee the handoff.
      const nudgePx = 1;

      if (scrollTarget === window) {
        const rect = element.getBoundingClientRect();
        const rawBase = window.scrollY + rect.top - topOffset;
        const rawTarget = rawBase <= 0 ? rawBase : rawBase + nudgePx;
        const maxScrollTop = Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight
        );
        const target = Math.min(Math.max(0, rawTarget), maxScrollTop);
        window.scrollTo({ top: target, behavior });
      } else if (containerRef?.current) {
        const containerEl = containerRef.current;
        const containerRect = containerEl.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const rawBase =
          containerEl.scrollTop + (rect.top - containerRect.top) - topOffset;
        const rawTarget = rawBase <= 0 ? rawBase : rawBase + nudgePx;
        const maxScrollTop = Math.max(0, containerEl.scrollHeight - containerEl.clientHeight);
        const target = Math.min(Math.max(0, rawTarget), maxScrollTop);
        containerEl.scrollTo({ top: target, behavior });
      }

      // Kick off settle detection in case the scroll doesn't emit events (rare, but possible)
      scheduleSettleCheck();

      // Safety max timeout so we don't get stuck in "programmatic" mode.
      programmaticScrollMaxTimeoutRef.current = window.setTimeout(
        finish,
        behavior === "smooth" ? 2000 : 250
      );
    },
    [containerRef, topOffset, updateActiveTeam]
  );

  /**
   * Set up IntersectionObserver and scroll listener
   */
  useEffect(() => {
    const container = containerRef?.current ?? document;
    const scrollTarget = containerRef?.current ?? window;

    // Create IntersectionObserver for efficient viewport detection
    // Using a small root margin to detect when sections approach the sticky threshold
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Find which team this element belongs to
          sectionsRef.current.forEach((element, teamCode) => {
            if (element === entry.target) {
              intersectionRatiosRef.current.set(teamCode, entry.intersectionRatio);
            }
          });
        });

        // Trigger active team recalculation
        updateActiveTeam();
      },
      {
        root: containerRef?.current ?? null,
        // Root margin: negative top margin to create a "trigger zone" near the activation threshold
        rootMargin: `-${topOffset + activationOffset}px 0px 0px 0px`,
        threshold: [0, 0.1, 0.5, 0.9, 1],
      }
    );

    // Observe all currently registered sections
    sectionsRef.current.forEach((element) => {
      observerRef.current?.observe(element);
    });

    // Also listen to scroll for more responsive updates
    const handleScroll = () => {
      updateActiveTeam();
    };

    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    // Initial calculation
    updateActiveTeam();

    return () => {
      // Cleanup observer
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }

      // Cleanup scroll listener
      scrollTarget.removeEventListener("scroll", handleScroll);

      // Cancel pending update
      if (pendingUpdateRef.current !== null) {
        cancelAnimationFrame(pendingUpdateRef.current);
      }

      // Cleanup any programmatic-scroll suppression state
      isScrollingProgrammaticallyRef.current = false;

      removeProgrammaticScrollListenerRef.current?.();
      removeProgrammaticScrollListenerRef.current = null;

      if (programmaticScrollSettleTimeoutRef.current !== null) {
        clearTimeout(programmaticScrollSettleTimeoutRef.current);
        programmaticScrollSettleTimeoutRef.current = null;
      }

      if (programmaticScrollMaxTimeoutRef.current !== null) {
        clearTimeout(programmaticScrollMaxTimeoutRef.current);
        programmaticScrollMaxTimeoutRef.current = null;
      }
    };
  }, [containerRef, topOffset, activationOffset, updateActiveTeam]);

  return {
    activeTeam,
    registerSection,
    setActiveTeam,
    scrollToTeam,
  };
}
