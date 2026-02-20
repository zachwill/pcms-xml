/**
 * Teams index UI glue (vanilla JS)
 *
 * Responsibilities:
 * 1) Horizontal scroll sync (header <-> body) per pressure lane
 * 2) Sticky-left shadow visibility while horizontally scrolled
 * 3) Re-sync after Datastar morph patches
 * 4) Keep active source-row highlight in sync with overlay state
 */

let main = null;

const TEAM_ROW_SELECTOR = "[role='button'][data-on\\:click*=\"@get('/teams/sidebar/\"]";
const ACTIVE_ROW_CLASSES = ["bg-yellow-100/80", "dark:bg-yellow-900/20", "ring-1", "ring-inset", "ring-yellow-300/50", "dark:ring-yellow-700/40"];
const ACTIVE_STICKY_CLASSES = ["bg-yellow-100", "dark:bg-yellow-900"];

const initTeamsTableSync = (tableEl) => {
  if (!tableEl) return;
  if (tableEl.dataset.teamsTableInit === "true") return;

  const headerEl = tableEl.querySelector("[data-teams-table-header-scroll]");
  const bodyEl = tableEl.querySelector("[data-teams-table-body-scroll]");
  const shadowEl = tableEl.querySelector("[data-teams-table-sticky-shadow]");

  if (!headerEl || !bodyEl) return;

  tableEl.dataset.teamsTableInit = "true";

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

  setShadow(bodyEl.scrollLeft);
};

const initAllTeamsTables = () => {
  if (!main) return;
  const tables = main.querySelectorAll("[data-teams-table]");
  tables.forEach(initTeamsTableSync);
};

const syncAllTeamsTableScrollPositions = () => {
  if (!main) return;

  const tables = main.querySelectorAll("[data-teams-table]");
  tables.forEach((tableEl) => {
    const headerEl = tableEl.querySelector("[data-teams-table-header-scroll]");
    const bodyEl = tableEl.querySelector("[data-teams-table-body-scroll]");
    const shadowEl = tableEl.querySelector("[data-teams-table-sticky-shadow]");

    if (!headerEl || !bodyEl) return;

    headerEl.scrollLeft = bodyEl.scrollLeft;

    if (!shadowEl) return;

    if (bodyEl.scrollLeft > 2) {
      shadowEl.classList.add("opacity-100");
      shadowEl.classList.remove("opacity-0");
    } else {
      shadowEl.classList.add("opacity-0");
      shadowEl.classList.remove("opacity-100");
    }
  });
};

const teamIdForRow = (rowEl) => {
  if (!rowEl) return "";

  if (rowEl.dataset.teamId) return rowEl.dataset.teamId;

  const clickExpr = rowEl.getAttribute("data-on:click") || "";
  const match = clickExpr.match(/\/teams\/sidebar\/(\d+)/);
  const teamId = match ? match[1] : "";

  if (teamId) rowEl.dataset.teamId = teamId;

  return teamId;
};

const syncActiveTeamRowState = () => {
  if (!main) return;

  const overlayType = main.dataset.overlayType || "none";
  const selectedTeamId = main.dataset.selectedTeamId || "";
  const activeTeamId = overlayType === "team" ? selectedTeamId : "";

  const rows = main.querySelectorAll(TEAM_ROW_SELECTOR);
  rows.forEach((rowEl) => {
    const rowTeamId = teamIdForRow(rowEl);
    const isActive = activeTeamId !== "" && rowTeamId === activeTeamId;

    ACTIVE_ROW_CLASSES.forEach((className) => {
      rowEl.classList.toggle(className, isActive);
    });

    const stickyCell = rowEl.querySelector(".sticky.left-0");
    if (!stickyCell) return;

    ACTIVE_STICKY_CLASSES.forEach((className) => {
      stickyCell.classList.toggle(className, isActive);
    });
  });
};

const init = () => {
  main = document.getElementById("maincanvas");
  if (!main) return;

  let rafId = null;

  const syncWorkspaceVisualState = () => {
    initAllTeamsTables();
    syncAllTeamsTableScrollPositions();
    syncActiveTeamRowState();
  };

  const scheduleWorkspaceVisualState = () => {
    if (rafId) return;

    rafId = requestAnimationFrame(() => {
      rafId = null;
      syncWorkspaceVisualState();
    });
  };

  syncWorkspaceVisualState();

  window.addEventListener("resize", scheduleWorkspaceVisualState, { passive: true });

  const mutationObserver = new MutationObserver(scheduleWorkspaceVisualState);

  mutationObserver.observe(main, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-selected-team-id", "data-overlay-type"]
  });
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { init };
