const THEMES = ["figma-light", "figma-dark"];

/** Figma (themeColors: true) marks <html> with its theme class and injects the --figma-color-* variables. */
function figmaThemeActive(): boolean {
  const html = document.documentElement;
  if (THEMES.some((t) => html.classList.contains(t))) return true;
  return getComputedStyle(html).getPropertyValue("--figma-color-bg").trim() !== "";
}

/**
 * Follow Figma's theme. Only when Figma hasn't set one (tests, browser previews) put the
 * library's fallback theme on <body>, matching the OS setting. Re-checks when Figma
 * sets or changes its theme, which can happen after the UI has started.
 */
export function syncTheme(): () => void {
  const dark = window.matchMedia?.("(prefers-color-scheme: dark)");

  const apply = () => {
    const body = document.body.classList;
    body.remove(...THEMES);
    if (!figmaThemeActive()) body.add(dark?.matches ? "figma-dark" : "figma-light");
  };

  apply();
  const observer = new MutationObserver(apply);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style"] });
  observer.observe(document.head, { childList: true });
  dark?.addEventListener?.("change", apply);

  return () => {
    observer.disconnect();
    dark?.removeEventListener?.("change", apply);
  };
}
