import { readThemePreference, writeThemePreference, type Theme } from "../lib/local-ui-preferences";

const root = document.documentElement;
let revision = 0;
let writes = Promise.resolve();

function applyTheme(theme: Theme) {
  root.dataset.theme = theme;
  const light = theme === "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", light ? "#f5f7f2" : "#0a0d0e");
  for (const button of document.querySelectorAll("[data-theme-toggle]")) {
    const label = light ? "Activer le thème sombre" : "Activer le thème clair";
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", String(light));
  }
}

async function restoreTheme() {
  const requestedAt = revision;
  try {
    await writes;
    const theme = await readThemePreference();
    // A slow storage read must not undo a more recent explicit choice.
    if (revision === requestedAt) applyTheme(theme);
  } catch { /* Keep the current theme if browser storage is unavailable. */ }
}

applyTheme("dark");
void restoreTheme();
for (const button of document.querySelectorAll("[data-theme-toggle]")) {
  button.addEventListener("click", () => {
    const theme = root.dataset.theme === "light" ? "dark" : "light";
    revision += 1;
    applyTheme(theme);
    // Preserve click order even if storage transactions complete slowly.
    writes = writes.then(async () => { await writeThemePreference(theme); }).catch(() => {});
  });
}
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) void restoreTheme();
});
