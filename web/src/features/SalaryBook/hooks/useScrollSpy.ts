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
  const { topOffset = 0, containerRef } = options;

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
  const scrollTimeoutRef = useRef<number | null>(null);

  /**
   * Calculate which team should be active based on current scroll position
   * Priority: team whose section top is at or just below the sticky threshold
   */
  const calculateActiveTeam = useCallback(() => {
    const container = containerRef?.current ?? document.documentElement;
    const scrollTop =
      containerRef?.current?.scrollTop ?? window.scrollY ?? document.documentElement.scrollTop;
    const threshold = scrollTop + topOffset + 1; // +1 to handle edge case

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
  }, [containerRef, topOffset]);

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

      // Immediately set active team to prevent lag
      setActiveTeam(teamCode);

      // Suppress scroll-spy updates during programmatic scrolling
      isScrollingProgrammaticallyRef.current = true;
      
      // Clear any existing timeout
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }

      const container = containerRef?.current ?? window;

      if (container === window) {
        const rect = element.getBoundingClientRect();
        const scrollTop = window.scrollY + rect.top - topOffset;
        window.scrollTo({ top: scrollTop, behavior });
      } else if (containerRef?.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const scrollTop =
          containerRef.current.scrollTop + (rect.top - containerRect.top) - topOffset;
        containerRef.current.scrollTo({ top: scrollTop, behavior });
      }

      // Re-enable scroll-spy after scroll animation completes
      // Use a timeout since there's no reliable scroll-end event for smooth scrolling
      const scrollDuration = behavior === "smooth" ? 500 : 50;
      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingProgrammaticallyRef.current = false;
        scrollTimeoutRef.current = null;
      }, scrollDuration);
    },
    [containerRef, topOffset]
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
        // Root margin: negative top margin to create a "trigger zone" at the sticky position
        rootMargin: `-${topOffset}px 0px 0px 0px`,
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

      // Cancel scroll timeout
      if (scrollTimeoutRef.current !== null) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [containerRef, topOffset, updateActiveTeam]);

  return {
    activeTeam,
    registerSection,
    setActiveTeam,
    scrollToTeam,
  };
}
