/**
 * Salary Book UI glue (vanilla JS)
 *
 * 1) Scroll-spy (active team) using IntersectionObserver
 * 2) Salary table horizontal scroll sync (header <-> body)
 *
 * Public API (exposed on window):
 * - __salaryBookScrollToTeam(teamCode, behavior = "smooth")
 * - __salaryBookRebuildCache()
 * - __salaryBookPreserveContext()
 */

let main = null;
let observer = null;
let lastActiveTeam = null;
let lastActiveIndex = -1;

// Programmatic scroll lock - ignore observer updates during programmatic scroll
let isScrollingProgrammatically = false;
let scrollLockTimer = null;

// Track which content sentinels are currently intersecting (in the adjusted viewport)
const intersectingSentinels = new Set();

// Sorted team codes (for fading logic)
let teamCodeOrder = [];

// -------------------------------------------------------------------------
// SalaryTable horizontal scroll sync (per team section)
// -------------------------------------------------------------------------

const initSalaryTableSync = (tableEl) => {
  if (!tableEl) return;
  if (tableEl.dataset.salarytableInit === "true") return;

  const headerEl = tableEl.querySelector("[data-salarytable-header-scroll]");
  const bodyEl = tableEl.querySelector("[data-salarytable-body-scroll]");
  const shadowEl = tableEl.querySelector("[data-salarytable-sticky-shadow]");

  if (!headerEl || !bodyEl) return;

  tableEl.dataset.salarytableInit = "true";

  let syncing = null;

  const setShadow = (scrollLeft) => {
    if (!shadowEl) return;
    if (scrollLeft > 2) {
      shadowEl.classList.add("opacity-100");
      shadowEl.classList.remove("opacity-0");
    } else {
      shadowEl.classList.add("opacity-0");
      shadowEl.classList.remove("opacity-100");
    }
  };

  const syncScroll = (source) => {
    if (syncing && syncing !== source) return;
    syncing = source;

    if (source === "body") {
      headerEl.scrollLeft = bodyEl.scrollLeft;
      setShadow(bodyEl.scrollLeft);
    } else {
      bodyEl.scrollLeft = headerEl.scrollLeft;
      setShadow(headerEl.scrollLeft);
    }

    requestAnimationFrame(() => {
      syncing = null;
    });
  };

  headerEl.addEventListener("scroll", () => syncScroll("header"), { passive: true });
  bodyEl.addEventListener("scroll", () => syncScroll("body"), { passive: true });

  // Initial state
  setShadow(bodyEl.scrollLeft);
};

const initAllSalaryTables = () => {
  if (!main) return;
  const tables = main.querySelectorAll("[data-salarytable]");
  tables.forEach(initSalaryTableSync);
};

// -------------------------------------------------------------------------
// Scroll-spy using IntersectionObserver
// -------------------------------------------------------------------------

// Sticky header height (TeamHeader ~56px + TableHeader ~40px)
// Using slightly less than actual height so ATL sentinel is clearly "intersecting" at scroll=0
const STICKY_HEADER_HEIGHT = 90;

const applyFadedSections = (activeTeam) => {
  if (!activeTeam) return;

  const activeIndex = teamCodeOrder.indexOf(activeTeam);
  if (activeIndex === lastActiveIndex) return;
  lastActiveIndex = activeIndex;

  teamCodeOrder.forEach((code, idx) => {
    const section = main?.querySelector(`section[data-teamcode="${code}"]`);
    if (!section) return;

    if (idx < activeIndex) {
      section.setAttribute("data-faded", "true");
    } else {
      section.removeAttribute("data-faded");
    }
  });
};

const dispatchActiveTeam = (team) => {
  if (!main) return;
  if (team && team !== lastActiveTeam) {
    lastActiveTeam = team;
    main.dispatchEvent(
      new CustomEvent("salarybook-activeteam", {
        detail: { team },
        bubbles: true,
      })
    );
  }
};

const setActiveTeam = (team) => {
  applyFadedSections(team);
  dispatchActiveTeam(team);
};

/**
 * Calculate active team from current intersection state.
 * 
 * Model:
 * - Content sentinels are placed just after each team's sticky header
 * - With rootMargin=-96px, the adjusted viewport excludes the sticky header area
 * - A sentinel is "intersecting" when it's IN the adjusted viewport (visible below sticky headers)
 * - A sentinel "exits" when it scrolls UP past the threshold (header becomes sticky)
 * 
 * Active team = the LAST team (in document order) whose sentinel has exited.
 * If all sentinels are intersecting (at top of page), first team is active.
 */
const calculateActiveTeam = () => {
  let activeTeam = teamCodeOrder[0] || null; // Default to first team

  for (const code of teamCodeOrder) {
    if (!intersectingSentinels.has(code)) {
      // This sentinel has exited (scrolled past threshold)
      // → This team's header is sticky, this team is active
      activeTeam = code;
    } else {
      // This sentinel is still intersecting (in viewport below threshold)
      // → This team's header is not yet sticky
      // Stop here - we've found the boundary
      break;
    }
  }

  return activeTeam;
};

/**
 * IntersectionObserver callback.
 * Updates intersection state and recalculates active team.
 */
const handleIntersection = (entries) => {
  if (isScrollingProgrammatically) return;

  // Update intersection state for all reported entries
  for (const entry of entries) {
    const teamCode = entry.target.dataset.teamcode;
    if (!teamCode) continue;

    if (entry.isIntersecting) {
      intersectingSentinels.add(teamCode);
    } else {
      intersectingSentinels.delete(teamCode);
    }
  }

  // Debug: log detailed state
  const firstFew = teamCodeOrder.slice(0, 3);
  const inSet = firstFew.map(code => `${code}:${intersectingSentinels.has(code)}`);
  console.debug("[scroll-spy] first 3 teams in set?", inSet.join(", "), "| total intersecting:", intersectingSentinels.size, "| total teams:", teamCodeOrder.length);

  // Calculate active team from overall state (not from individual events)
  const activeTeam = calculateActiveTeam();
  console.debug("[scroll-spy] activeTeam:", activeTeam);
  setActiveTeam(activeTeam);
};

const setupIntersectionObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  // Clear intersection state
  intersectingSentinels.clear();

  // rootMargin: shrink viewport from top by sticky header height
  // Sentinels "exit" (stop intersecting) when they cross this line going up
  observer = new IntersectionObserver(handleIntersection, {
    root: main,
    rootMargin: `-${STICKY_HEADER_HEIGHT}px 0px 0px 0px`,
    threshold: 0,
  });

  // Observe all content sentinels
  const sentinels = main?.querySelectorAll("[data-team-content-sentinel]");
  sentinels?.forEach((sentinel) => {
    observer.observe(sentinel);
  });
};

const rebuildCache = () => {
  if (!main) return;

  // Build ordered team code list
  const sections = Array.from(main.querySelectorAll("section[data-teamcode]"));
  teamCodeOrder = sections.map((el) => el.dataset.teamcode);

  // Re-setup observer (this will trigger initial intersection callbacks)
  setupIntersectionObserver();
};

// -------------------------------------------------------------------------
// Programmatic navigation API (used by command bar)
// -------------------------------------------------------------------------

const scrollToTeam = (teamCode, behavior = "smooth") => {
  const section = main?.querySelector(`section[data-teamcode="${teamCode}"]`);
  if (!section) return;

  // Lock to prevent observer updates during scroll animation
  isScrollingProgrammatically = true;
  if (scrollLockTimer) clearTimeout(scrollLockTimer);

  // Immediately set as active to prevent flicker
  setActiveTeam(teamCode);

  const maxScroll = main.scrollHeight - main.clientHeight;
  const targetTop = section.offsetTop;

  main.scrollTo({
    top: Math.max(0, Math.min(targetTop, maxScroll)),
    behavior,
  });

  // Unlock after scroll completes (or after timeout)
  const unlockDelay = behavior === "instant" ? 50 : 500;
  scrollLockTimer = setTimeout(() => {
    isScrollingProgrammatically = false;
    scrollLockTimer = null;
  }, unlockDelay);
};

// Preserve context after layout changes (filter toggles)
const preserveContext = () => {
  requestAnimationFrame(() => {
    if (lastActiveTeam) {
      scrollToTeam(lastActiveTeam, "instant");
    }
  });
};

// -------------------------------------------------------------------------
// Initialization
// -------------------------------------------------------------------------

const init = () => {
  main = document.getElementById("maincanvas");
  if (!main) {
    console.debug("[salary_book] #maincanvas not found, skipping init");
    return;
  }

  rebuildCache();
  initAllSalaryTables();

  window.addEventListener("resize", () => requestAnimationFrame(rebuildCache), { passive: true });

  // Observe team section insertions/removals (also re-init scroll sync).
  const mutationObserver = new MutationObserver(() => {
    requestAnimationFrame(() => {
      rebuildCache();
      initAllSalaryTables();
    });
  });
  mutationObserver.observe(main, { childList: true, subtree: false });

  // Expose public API
  window.__salaryBookScrollToTeam = scrollToTeam;
  window.__salaryBookRebuildCache = rebuildCache;
  window.__salaryBookPreserveContext = preserveContext;

  // Note: We don't manually set first team as active here.
  // The IntersectionObserver callback will fire immediately with initial states
  // and calculateActiveTeam() will determine the correct active team.

  console.debug("[salary_book] initialized with IntersectionObserver");
};

// Auto-init when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

// Export for ES module usage
export { init, scrollToTeam, rebuildCache, preserveContext };
