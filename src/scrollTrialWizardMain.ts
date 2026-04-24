const TRIAL_WIZARD_SCROLL_REGION_ID = "trial-wizard-scroll-region";

/**
 * Scrolls the wizard shell’s main column to the top after step / sub-step changes.
 * Uses smooth scrolling unless the user prefers reduced motion.
 */
export function scrollTrialWizardMainToTop(): void {
  const el = document.getElementById(
    TRIAL_WIZARD_SCROLL_REGION_ID,
  ) as HTMLElement | null;
  if (!el) return;
  const reduceMotion =
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollTo({
    top: 0,
    left: 0,
    behavior: reduceMotion ? "auto" : "smooth",
  });
}
