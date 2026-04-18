import { useState } from "react";
import {
  ConfigureDeployment,
  type ConfigureFormState,
} from "./ConfigureDeployment";
import type { FlavorId } from "./FlavorCards";
import { FlavorCards } from "./FlavorCards";
import { BootstrapGlyph, DisconnectedGlyph, ShieldGlyph } from "./HighlightIcons";
import { GeneratingArtifact } from "./GeneratingArtifact";
import styles from "./App.module.css";

type HighlightIconId = "bootstrap" | "disconnected" | "policies";

type Highlight = {
  title: string;
  description: string;
  icon: HighlightIconId;
};

type WizardStep = {
  id: string;
  title: string | null;
  subtitle?: string;
  highlights?: Highlight[];
  body: string;
};

const steps: WizardStep[] = [
  {
    id: "welcome",
    title: "Enclave",
    subtitle: "Your Cloud-in-a-Box Bootstrap Solution",
    highlights: [
      {
        icon: "bootstrap",
        title: "Automated Bootstrap",
        description: "Quay mirror and bare-metal install, handled for you.",
      },
      {
        icon: "disconnected",
        title: "Fully Disconnected",
        description: "Air-gapped by design for sovereign environments.",
      },
      {
        icon: "policies",
        title: "Opinionated Policies",
        description: "Sensible defaults for ACM, GPU, and storage.",
      },
    ],
    body: "Deploy a sovereign, fully disconnected OpenShift environment with a simple, no-headache wizard.",
  },
  {
    id: "flavor",
    title: "Select Your Sovereign Cloud Flavor",
    body: "Select the primary use case to auto-configure operators and policies.",
  },
  {
    id: "configure",
    title: "Configure Your Deployment",
    body: "Answer a few questions—Enclave automatically selects the required operators and policies.",
  },
  {
    id: "artifact",
    title: "Generating Your Deployment Artifact",
    body: "This may take a few minutes while we bundle your disconnected deployment.",
  },
];

const initialConfigureForm: ConfigureFormState = {
  deploymentName: "",
  aiMlEnabled: false,
  storageBackend: "ceph",
  networkLevel: "airgap",
};

export default function App() {
  const [index, setIndex] = useState(0);
  const [flavorId, setFlavorId] = useState<FlavorId>("vms");
  const [configureForm, setConfigureForm] =
    useState<ConfigureFormState>(initialConfigureForm);
  const step = steps[index];
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;

  return (
    <div className={styles.shell}>
      <div className={styles.shellStack}>
        <div className={styles.brandMark}>
          <img
            className={styles.brandLogo}
            src={`${import.meta.env.BASE_URL}Logo-RedHat-A-Reverse-RGB.svg`}
            alt="Red Hat"
            width={613}
            height={145}
          />
        </div>

        <div className={styles.card} role="region" aria-label="Enclave setup wizard">
          <div
            key={step.id}
            className={
              step.id === "flavor" ||
              step.id === "configure" ||
              step.id === "artifact"
                ? `${styles.panel} ${styles.panelFlavor}`
                : styles.panel
            }
          >
            {step.id === "artifact" ? (
              <GeneratingArtifact subtitle={step.body} />
            ) : null}
            {step.id === "artifact" ? null : step.title ? (
              <h1
                className={
                  step.id === "welcome"
                    ? styles.title
                    : `${styles.title} ${styles.titleStep}`
                }
              >
                {step.title}
              </h1>
            ) : null}
            {step.id === "artifact" ? null : step.subtitle ? (
              <p className={styles.subtitle}>{step.subtitle}</p>
            ) : null}
            {step.id === "artifact" ? null : (
              <p
                className={
                  step.id === "welcome"
                    ? `${styles.lead} ${styles.leadCompact}`
                    : `${styles.lead} ${styles.leadStep}`
                }
              >
                {step.body}
              </p>
            )}
            {step.id === "artifact" ? null : step.highlights ? (
              <ul className={styles.highlights}>
                {step.highlights.map((h) => (
                  <li key={h.title} className={styles.highlight}>
                    <div className={styles.highlightIcon} aria-hidden="true">
                      <HighlightPfIcon id={h.icon} />
                    </div>
                    <h3 className={styles.highlightTitle}>{h.title}</h3>
                    <p className={styles.highlightBody}>{h.description}</p>
                  </li>
                ))}
              </ul>
            ) : null}
            {step.id === "flavor" ? (
              <FlavorCards selected={flavorId} onSelect={setFlavorId} />
            ) : null}
            {step.id === "configure" ? (
              <ConfigureDeployment
                flavorId={flavorId}
                form={configureForm}
                onChange={(patch) =>
                  setConfigureForm((prev) => ({ ...prev, ...patch }))
                }
              />
            ) : null}
          </div>

          <footer className={styles.footer}>
            <div className={styles.dots} aria-hidden="true">
              {steps.map((s, i) => (
                <span
                  key={s.id}
                  className={i === index ? styles.dotActive : styles.dot}
                />
              ))}
            </div>

            <div className={styles.nav}>
              {!isFirst ? (
                <button
                  type="button"
                  className={styles.iconBtn}
                  onClick={() => setIndex((i) => Math.max(0, i - 1))}
                  aria-label="Previous step"
                >
                  <ChevronArrow direction="left" />
                </button>
              ) : null}
              <button
                type="button"
                className={styles.iconBtnPrimary}
                onClick={() =>
                  setIndex((i) => Math.min(steps.length - 1, i + 1))
                }
                disabled={isLast}
                aria-label="Next step"
              >
                <ChevronArrow direction="right" />
              </button>
            </div>
          </footer>
        </div>
      </div>
    </div>
  );
}

/** Minimal inline SVGs for highlight cards. */
function HighlightPfIcon({ id }: { id: HighlightIconId }) {
  const iconClass =
    id === "disconnected"
      ? `${styles.highlightPfIcon} ${styles.highlightPfIconDisconnected}`
      : styles.highlightPfIcon;
  const iconProps = { className: iconClass };
  switch (id) {
    case "bootstrap":
      return <BootstrapGlyph {...iconProps} />;
    case "disconnected":
      return <DisconnectedGlyph {...iconProps} />;
    case "policies":
      return <ShieldGlyph {...iconProps} />;
    default:
      return null;
  }
}

function ChevronArrow({ direction }: { direction: "left" | "right" }) {
  const rotate = direction === "left" ? 180 : 0;
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <path
        d="M5 12h14M13 6l6 6-6 6"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
