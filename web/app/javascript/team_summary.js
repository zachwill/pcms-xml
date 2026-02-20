const isEditableTarget = (target) => {
  if (!target) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
};

const parseInteger = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const syncStepControls = (root) => {
  const overlay = root.querySelector("#rightpanel-overlay[data-team-summary-step-total]");
  if (!overlay) return;

  const total = parseInteger(overlay.dataset.teamSummaryStepTotal);
  const index = parseInteger(overlay.dataset.teamSummaryStepIndex);

  const hasPosition = Number.isInteger(total) && total > 0 && Number.isInteger(index) && index >= 0 && index < total;
  const positionText = hasPosition ? `${index + 1} of ${total}` : "Outside list";

  overlay.querySelectorAll("[data-team-summary-step-position]").forEach((node) => {
    if (node.textContent?.trim() === positionText) return;
    node.textContent = positionText;
  });
};

const initTeamSummaryTableSync = (tableEl) => {
  if (!tableEl) return;
  if (tableEl.dataset.teamSummaryTableInit === "true") return;

  const headerEl = tableEl.querySelector("[data-team-summary-table-header-scroll]");
  const bodyEl = tableEl.querySelector("[data-team-summary-table-body-scroll]");
  const shadowEl = tableEl.querySelector("[data-team-summary-sticky-shadow]");

  if (!headerEl || !bodyEl) return;

  tableEl.dataset.teamSummaryTableInit = "true";

  let syncing = null;

  const setShadow = (scrollLeft) => {
    if (!shadowEl) return;

    const showShadow = scrollLeft > 2;
    shadowEl.classList.toggle("opacity-0", !showShadow);
    shadowEl.classList.toggle("opacity-100", showShadow);
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

const init = () => {
  const root = document.getElementById("team-summary");
  if (!root) return;

  if (root.__teamSummaryCleanup) {
    root.__teamSummaryCleanup();
    root.__teamSummaryCleanup = null;
  }

  const handleKeydown = (event) => {
    if (event.key !== "Escape") return;

    const target = event.target;
    if (isEditableTarget(target)) return;

    const clearButton = root.querySelector("[data-team-summary-overlay-clear]");
    if (!clearButton) return;

    event.preventDefault();
    clearButton.click();
  };

  const maincanvas = document.getElementById("maincanvas");
  const rightpanel = document.getElementById("rightpanel");
  let rafId = null;

  const syncWorkspaceUi = () => {
    const tableEl = root.querySelector("[data-team-summary-table]");
    if (tableEl) {
      initTeamSummaryTableSync(tableEl);

      const headerEl = tableEl.querySelector("[data-team-summary-table-header-scroll]");
      const bodyEl = tableEl.querySelector("[data-team-summary-table-body-scroll]");
      const shadowEl = tableEl.querySelector("[data-team-summary-sticky-shadow]");

      if (headerEl && bodyEl) {
        headerEl.scrollLeft = bodyEl.scrollLeft;

        if (shadowEl) {
          const showShadow = bodyEl.scrollLeft > 2;
          shadowEl.classList.toggle("opacity-0", !showShadow);
          shadowEl.classList.toggle("opacity-100", showShadow);
        }
      }
    }

    syncStepControls(root);
  };

  const scheduleUiUpdate = () => {
    if (rafId) return;

    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      syncWorkspaceUi();
    });
  };

  const maincanvasMutationObserver = new MutationObserver(scheduleUiUpdate);
  const rightpanelMutationObserver = new MutationObserver(scheduleUiUpdate);

  if (maincanvas) {
    maincanvasMutationObserver.observe(maincanvas, { childList: true, subtree: true });
  }

  if (rightpanel) {
    rightpanelMutationObserver.observe(rightpanel, { childList: true, subtree: true });
  }

  window.addEventListener("resize", scheduleUiUpdate);
  document.addEventListener("keydown", handleKeydown);

  scheduleUiUpdate();

  root.__teamSummaryCleanup = () => {
    document.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("resize", scheduleUiUpdate);

    maincanvasMutationObserver.disconnect();
    rightpanelMutationObserver.disconnect();

    if (rafId) {
      window.cancelAnimationFrame(rafId);
      rafId = null;
    }
  };
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { init };
