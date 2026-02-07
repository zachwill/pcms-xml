const THEME_STORAGE_KEY = "pcms-theme";

const isValidTheme = (value) => value === "light" || value === "dark";

const resolveInitialTheme = () => {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isValidTheme(stored)) return stored;
  } catch (_) {
    // Ignore storage errors (private mode, blocked storage, etc.)
  }

  if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }

  return "light";
};

const applyTheme = (theme) => {
  const normalized = isValidTheme(theme) ? theme : "light";
  const root = document.documentElement;

  root.classList.remove("light", "dark");
  root.classList.add(normalized);

  const themeColorTag = document.querySelector('meta[name="theme-color"]');
  if (themeColorTag) {
    themeColorTag.setAttribute("content", normalized === "dark" ? "#0a0a0a" : "#ffffff");
  }

  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized);
  } catch (_) {
    // Ignore storage errors
  }

  return normalized;
};

const syncDarkModeToggles = () => {
  const checked = document.documentElement.classList.contains("dark");

  document.querySelectorAll("[data-commandbar-dark-toggle]").forEach((toggle) => {
    toggle.checked = checked;
  });
};

const setupNavSelect = (select) => {
  if (!select || select.dataset.commandbarNavReady === "true") return;

  select.addEventListener("change", () => {
    const option = select.options[select.selectedIndex];
    if (!option || option.disabled) return;

    const href = (select.value || "").trim();
    if (!href) return;

    window.location.assign(href);
  });

  select.dataset.commandbarNavReady = "true";
};

const setupDarkModeToggle = (toggle) => {
  if (!toggle || toggle.dataset.commandbarThemeReady === "true") return;

  toggle.addEventListener("change", () => {
    applyTheme(toggle.checked ? "dark" : "light");
    syncDarkModeToggles();
  });

  toggle.dataset.commandbarThemeReady = "true";
};

const initCommandbarNavigation = () => {
  document.querySelectorAll("[data-commandbar-nav-select]").forEach(setupNavSelect);
  document.querySelectorAll("[data-commandbar-dark-toggle]").forEach(setupDarkModeToggle);
  syncDarkModeToggles();
};

// Ensure theme is applied even if head bootstrap script did not run.
applyTheme(resolveInitialTheme());

document.addEventListener("DOMContentLoaded", initCommandbarNavigation);
document.addEventListener("turbo:load", initCommandbarNavigation);
window.addEventListener("pageshow", initCommandbarNavigation);
window.addEventListener("storage", (event) => {
  if (event.key !== THEME_STORAGE_KEY) return;
  applyTheme(resolveInitialTheme());
  syncDarkModeToggles();
});

export { initCommandbarNavigation, applyTheme, resolveInitialTheme };
