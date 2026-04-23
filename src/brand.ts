/**
 * Wizard branding: OSAC when running locally, Enclave when deployed (e.g. GitHub Pages).
 *
 * Uses `import.meta.env.DEV` for `npm run dev`, and also treats `localhost` / `127.0.0.1`
 * at runtime so `vite preview` (production bundle on loopback) still shows OSAC.
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
  /** True when showing OSAC / loopback UI */
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
    browserTabTitle: local ? "OSAC setup wizard" : "Enclave setup wizard",
    welcomeHeroTitle: local
      ? "Welcome to Open Sovereign AI Cloud"
      : "Welcome to Enclave",
    headerLandmarkLabel: local
      ? "Red Hat Open Sovereign AI Cloud"
      : "Red Hat Enclave",
    headerLogoAlt: local
      ? "Red Hat Open Sovereign AI Cloud"
      : "Red Hat Enclave",
    mainStepAriaLabel: local
      ? "Open Sovereign AI Cloud step content"
      : "Enclave step content",
    headerLogoSrc: local
      ? `${base}enclave-header-logo-osac.png`
      : `${base}enclave-header-logo.png`,
    headerLogoWidth: 1024,
    /* OSAC artwork is 1024×204; prod PNG matches until a taller Enclave asset is restored */
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
