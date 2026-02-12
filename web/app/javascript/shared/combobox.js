const PALETTE_SELECTOR = "#sbplayercmdk";

const isEditableElement = (element) => {
  if (!element) return false;

  const tag = (element.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;

  return element.isContentEditable === true;
};

const paletteRoot = () => document.querySelector(PALETTE_SELECTOR);

const dispatchPaletteEvent = (eventName) => {
  const root = paletteRoot();
  if (!root) return false;

  root.dispatchEvent(new CustomEvent(eventName, { bubbles: true }));
  return true;
};

const isPaletteOpen = () => {
  const root = paletteRoot();
  if (!root) return false;

  return root.dataset.open === "true";
};

const onGlobalKeydown = (event) => {
  const key = (event.key || "").toLowerCase();
  const isShortcut = (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && key === "k";

  if (isShortcut) {
    const target = event.target;
    const targetIsPaletteInput = target && target.id === "sbplayercb-input";

    if (isEditableElement(target) && !targetIsPaletteInput) {
      return;
    }

    if (!dispatchPaletteEvent("salarybook-cmdk-open")) return;

    event.preventDefault();
    return;
  }

  if (event.key === "Escape" && isPaletteOpen()) {
    if (!dispatchPaletteEvent("salarybook-cmdk-close")) return;

    event.preventDefault();
  }
};

let initialized = false;

const initComboboxShortcuts = () => {
  if (initialized) return;

  document.addEventListener("keydown", onGlobalKeydown);
  initialized = true;
};

document.addEventListener("DOMContentLoaded", initComboboxShortcuts);
window.addEventListener("pageshow", initComboboxShortcuts);

export { initComboboxShortcuts };
