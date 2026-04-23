/**
 * Wizard branding: Open Sovereign AI Cloud (OSAC) for all environments.
 *
 * `local` is still derived from dev / loopback hosts so `trial-local-dev` CSS
 * can tweak layout in `npm run dev` and `vite preview` on localhost.
 */

export function isWizardLocalUi(): boolean {
  if (import.meta.env.DEV) return true;
  try {
    const h = globalThis.location?.hostname;
    if (!h) return false;
    return (
      h === "localhost" ||
      h === "127.0.0.1" ||
      h === "::1" ||
      h === "[::1]"
    );
  } catch {
    return false;
  }
}

export type WizardBrand = {
  /** True when running dev server or preview on loopback (layout tweaks only) */
  local: boolean;
  browserTabTitle: string;
  welcomeHeroTitle: string;
  headerLandmarkLabel: string;
  headerLogoAlt: string;
  mainStepAriaLabel: string;
  headerLogoSrc: string;
  headerLogoWidth: number;
  headerLogoHeight: number;
};

export function getWizardBrand(): WizardBrand {
  const local = isWizardLocalUi();
  const base = import.meta.env.BASE_URL;
  return {
    local,
    browserTabTitle: "Open Sovereign AI Cloud setup wizard",
    welcomeHeroTitle: "Welcome to Open Sovereign AI Cloud",
    headerLandmarkLabel: "Red Hat Open Sovereign AI Cloud",
    headerLogoAlt: "Red Hat Open Sovereign AI Cloud",
    mainStepAriaLabel: "Open Sovereign AI Cloud step content",
    headerLogoSrc: `${base}redhat-osac.png`,
    headerLogoWidth: 1024,
    headerLogoHeight: 204,
  };
}

/** Tab title + `<html>` class for dev-only CSS; safe to call from main.tsx */
export function applyWizardChrome(): void {
  if (typeof document === "undefined") return;
  const b = getWizardBrand();
  document.title = b.browserTabTitle;
  document.documentElement.classList.toggle("trial-local-dev", b.local);
}
