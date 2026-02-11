const COMBOBOX_SELECTOR = "[data-combobox-cmdk] #sbplayercb-input";

const isEditableElement = (element) => {
  if (!element) return false;

  const tag = (element.tagName || "").toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;

  return element.isContentEditable === true;
};

const focusPrimaryCombobox = () => {
  const input = document.querySelector(COMBOBOX_SELECTOR);
  if (!input) return false;

  input.focus({ preventScroll: true });
  if (typeof input.select === "function") input.select();
  return true;
};

const onGlobalKeydown = (event) => {
  const isShortcut = (event.metaKey || event.ctrlKey) && !event.shiftKey && !event.altKey && event.key.toLowerCase() === "k";
  if (!isShortcut) return;

  const target = event.target;
  const targetIsComboboxInput = target && target.id === "sbplayercb-input";

  if (isEditableElement(target) && !targetIsComboboxInput) {
    return;
  }

  if (!focusPrimaryCombobox()) return;

  event.preventDefault();
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
