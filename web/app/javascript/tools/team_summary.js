const isEditableTarget = (target) => {
  if (!target) return false;
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable;
};

const init = () => {
  const root = document.getElementById("team-summary");
  if (!root) return;

  const handleKeydown = (event) => {
    if (event.key !== "Escape") return;

    const target = event.target;
    if (isEditableTarget(target)) return;

    const clearButton = root.querySelector("[data-team-summary-overlay-clear]");
    if (!clearButton) return;

    event.preventDefault();
    clearButton.click();
  };

  document.addEventListener("keydown", handleKeydown);

  console.debug("[team_summary] initialized");
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export { init };
