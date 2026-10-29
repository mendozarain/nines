export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "nines-theme";

export function getStoredTheme(): ThemePreference {
  if (typeof window === "undefined") return "system";
  const value = localStorage.getItem(STORAGE_KEY);
  if (value === "light" || value === "dark" || value === "system") return value;
  return "system";
}

export function resolveDark(preference: ThemePreference = getStoredTheme()): boolean {
  if (preference === "dark") return true;
  if (preference === "light") return false;
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function applyTheme(preference: ThemePreference) {
  if (typeof document === "undefined") return;
  localStorage.setItem(STORAGE_KEY, preference);
  document.documentElement.classList.toggle("dark", resolveDark(preference));
}

export function toggleTheme() {
  const next: ThemePreference = resolveDark() ? "light" : "dark";
  applyTheme(next);
  return next;
}
