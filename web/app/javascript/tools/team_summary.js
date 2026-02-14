const isEditableTarget = (target) => {
  if (!target) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
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
  let rafId = null;

  const updateStickyShadow = () => {
    const shadow = root.querySelector("[data-team-summary-sticky-shadow]");
    if (!shadow || !maincanvas) return;

    const showShadow = maincanvas.scrollLeft > 2;
    shadow.classList.toggle("opacity-0", !showShadow);
    shadow.classList.toggle("opacity-100", showShadow);
  };

  const scheduleStickyShadowUpdate = () => {
    if (rafId) return;

    rafId = window.requestAnimationFrame(() => {
      rafId = null;
      updateStickyShadow();
    });
  };

  const maincanvasMutationObserver = new MutationObserver(scheduleStickyShadowUpdate);

  if (maincanvas) {
    maincanvas.addEventListener("scroll", scheduleStickyShadowUpdate, { passive: true });
    maincanvasMutationObserver.observe(maincanvas, { childList: true });
  }

  window.addEventListener("resize", scheduleStickyShadowUpdate);
  document.addEventListener("keydown", handleKeydown);

  scheduleStickyShadowUpdate();

  root.__teamSummaryCleanup = () => {
    document.removeEventListener("keydown", handleKeydown);
    window.removeEventListener("resize", scheduleStickyShadowUpdate);

    if (maincanvas) {
      maincanvas.removeEventListener("scroll", scheduleStickyShadowUpdate);
    }

    maincanvasMutationObserver.disconnect();

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
