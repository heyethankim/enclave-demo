import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  Content,
  Divider,
  Flex,
  FlexItem,
  Label,
  Title,
  Tooltip,
} from "@patternfly/react-core";
import { CheckIcon } from "@patternfly/react-icons";
import { BootstrapGlyph, DisconnectedGlyph, ShieldGlyph } from "./HighlightIcons";
import {
  DEFAULT_SOVEREIGN_FLAVOR_SELECTION,
  getSelectedSovereignFlavorsForSummary,
  SovereignFlavorCards,
  type SovereignFlavorId,
} from "./SovereignFlavorCards";
import { ConfigureDeployment } from "./ConfigureDeployment";
import type { FormState } from "./TriadFlavorConfigureFields";
import {
  initialFormState,
  validateConfigureForms,
} from "./TriadFlavorConfigureFields";
import {
  ARTIFACT_SUCCESS_SUBTITLE,
  ARTIFACT_SUCCESS_TITLE,
  GeneratingArtifact,
} from "./GeneratingArtifact";

type HighlightIconId = "bootstrap" | "disconnected" | "policies";

type Highlight = {
  title: string;
  description: string;
  icon: HighlightIconId;
};

type WizardStep = {
  id: string;
  stepperLabel: string;
  title: string | null;
  subtitle?: string;
  highlights?: Highlight[];
  body: string;
};

const steps: WizardStep[] = [
  {
    id: "welcome",
    stepperLabel: "Welcome",
    title: "Enclave",
    highlights: [
      {
        icon: "bootstrap",
        title: "Automated Bootstrap",
        description: "Image distribution and infrastructure setup, fully automated.",
      },
      {
        icon: "disconnected",
        title: "Fully Disconnected",
        description: "Air-gapped by design for sovereign and secure environments.",
      },
      {
        icon: "policies",
        title: "Smart Defaults",
        description: "Preconfigured settings for cluster management, GPU, and storage.",
      },
    ],
    body: "Deploy a sovereign, fully disconnected OpenShift environment with a simple, no-headache wizard.",
  },
  {
    id: "flavor",
    stepperLabel: "Select",
    title: "Select your sovereign cloud setup",
    body: "Choose use cases—configuration adjusts automatically.",
  },
  {
    id: "configure",
    stepperLabel: "Configure",
    title: "Configure your deployment",
    body: "Answer a few questions to set up your chosen services.",
  },
  {
    id: "review",
    stepperLabel: "Review",
    title: "Review your deployment",
    body: "Confirm selections. Use Back to edit.",
  },
  {
    id: "artifact",
    stepperLabel: "Generate",
    title: "Generating your deployment artifact",
    body: "This may take a few minutes while we bundle your disconnected deployment.",
  },
];

const TRIAL_BLUE = "#0066cc";

function buildFormsForSelected(
  selected: ReadonlySet<SovereignFlavorId>,
  prev: Partial<Record<SovereignFlavorId, FormState>>,
): Partial<Record<SovereignFlavorId, FormState>> {
  const next: Partial<Record<SovereignFlavorId, FormState>> = {};
  for (const id of selected) {
    next[id] = prev[id] ?? initialFormState(id);
  }
  return next;
}

export default function App() {
  const [index, setIndex] = useState(0);
  const [selectedSovereignFlavors, setSelectedSovereignFlavors] = useState<
    Set<SovereignFlavorId>
  >(() => new Set(DEFAULT_SOVEREIGN_FLAVOR_SELECTION));
  const [artifactGenerationComplete, setArtifactGenerationComplete] =
    useState(false);
  const [configureForms, setConfigureForms] = useState<
    Partial<Record<SovereignFlavorId, FormState>>
  >(() =>
    buildFormsForSelected(
      new Set(DEFAULT_SOVEREIGN_FLAVOR_SELECTION),
      {},
    ),
  );
  const [configureValidationAttempted, setConfigureValidationAttempted] =
    useState(false);
  const [configureValidationFocusNonce, setConfigureValidationFocusNonce] =
    useState(0);
  const step = steps[index];

  const configureIssues = useMemo(
    () =>
      validateConfigureForms(selectedSovereignFlavors, configureForms),
    [selectedSovereignFlavors, configureForms],
  );

  const showConfigureValidation =
    step.id === "configure" &&
    configureValidationAttempted &&
    configureIssues.length > 0;

  useEffect(() => {
    setConfigureForms((prev) =>
      buildFormsForSelected(selectedSovereignFlavors, prev),
    );
  }, [selectedSovereignFlavors]);

  const handleConfigureFormChange = useCallback(
    (id: SovereignFlavorId, form: FormState) => {
      setConfigureForms((prev) => ({ ...prev, [id]: form }));
    },
    [],
  );

  useEffect(() => {
    if (step.id !== "artifact") {
      setArtifactGenerationComplete(false);
    }
  }, [step.id]);

  useEffect(() => {
    if (step.id !== "configure") {
      setConfigureValidationAttempted(false);
      setConfigureValidationFocusNonce(0);
    }
  }, [step.id]);

  useEffect(() => {
    if (
      step.id === "configure" &&
      configureValidationAttempted &&
      configureIssues.length === 0
    ) {
      setConfigureValidationAttempted(false);
    }
  }, [step.id, configureValidationAttempted, configureIssues.length]);

  const isLast = index === steps.length - 1;

  const isFlavorOrConfigureOrArtifact =
    step.id === "flavor" ||
    step.id === "configure" ||
    step.id === "review" ||
    step.id === "artifact";

  const goBack = () => setIndex((i) => Math.max(0, i - 1));

  const goNext = useCallback(() => {
    if (step.id === "configure") {
      const issues = validateConfigureForms(
        selectedSovereignFlavors,
        configureForms,
      );
      if (issues.length > 0) {
        setConfigureValidationAttempted(true);
        setConfigureValidationFocusNonce((n) => n + 1);
        return;
      }
      setConfigureValidationAttempted(false);
    }
    setIndex((i) => Math.min(steps.length - 1, i + 1));
  }, [configureForms, selectedSovereignFlavors, step.id]);

  const toggleSovereignFlavor = (id: SovereignFlavorId) => {
    setSelectedSovereignFlavors((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const pageSubtitle = step.subtitle ?? step.body;
  const displayPageTitle =
    step.id === "artifact" && artifactGenerationComplete
      ? ARTIFACT_SUCCESS_TITLE
      : step.title;
  const displayPageSubtitle =
    step.id === "artifact" && artifactGenerationComplete
      ? ARTIFACT_SUCCESS_SUBTITLE
      : pageSubtitle;

  const showSovereignSelectionSummary =
    step.id !== "welcome" && selectedSovereignFlavors.size > 0;
  const sovereignSelectionChips = showSovereignSelectionSummary
    ? getSelectedSovereignFlavorsForSummary(selectedSovereignFlavors)
    : [];

  return (
    <div className="trial-page trial-wizard-app">
      <header className="trial-wizard-top" aria-label="Red Hat Enclave">
        <div className="trial-wizard-logo-bleed">
          <div className="trial-wizard-logo-wrap">
            <img
              className="trial-wizard-logo"
              src={`${import.meta.env.BASE_URL}enclave-header-logo.png`}
              alt="Red Hat Enclave"
              width={1024}
              height={307}
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
        <div
          className="trial-wizard-top-divider"
          role="presentation"
          aria-hidden
        >
          <Divider
            className="trial-wizard-header-divider"
            aria-orientation="horizontal"
          />
        </div>
        <div className="trial-wizard-inner">
          <div className="trial-wizard-stepper-area">
            <TrialLineStepper
              currentIndex={index}
              onGoTo={(i) => setIndex(i)}
              stepLabels={steps.map((s) => ({
                id: s.id,
                label: s.stepperLabel,
              }))}
            />
          </div>
        </div>
      </header>

      <div className="trial-wizard-main" role="main">
        <div className="trial-wizard-inner">
          <Card
            isRounded
            className={[
              "trial-wizard-surface",
              step.id === "configure" || step.id === "review"
                ? "trial-wizard-surface--configure-card"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-label="Enclave step content"
          >
            <CardBody
              style={{
                textAlign: isFlavorOrConfigureOrArtifact ? "start" : "center",
                padding:
                  step.id === "welcome"
                    ? "2.75rem 1.75rem 2rem"
                    : "1.5rem 1.75rem 2rem",
              }}
              className={step.id === "welcome" ? "trial-welcome-titles" : undefined}
            >
              {step.id !== "welcome" ? (
                <div
                  className={[
                    "trial-wizard-main-heading",
                    showSovereignSelectionSummary
                      ? "trial-wizard-main-heading--split"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <div className="trial-wizard-main-heading__primary">
                    {displayPageTitle ? (
                      <Title
                        headingLevel="h1"
                        size="2xl"
                        className="trial-wizard-h1"
                        style={{
                          margin: 0,
                          color: "#151515",
                        }}
                      >
                        {displayPageTitle}
                      </Title>
                    ) : null}
                    {displayPageSubtitle ? (
                      <p className="trial-wizard-page-sub">{displayPageSubtitle}</p>
                    ) : null}
                  </div>
                  {showSovereignSelectionSummary ? (
                    <div
                      className="trial-wizard-main-heading__selection"
                      aria-label="Selected sovereign cloud options"
                    >
                      <span className="trial-wizard-main-heading__selection-label">
                        Selected
                      </span>
                      <Flex
                        flexWrap={{ default: "wrap" }}
                        gap={{ default: "gapSm" }}
                        justifyContent={{
                          default: "justifyContentFlexStart",
                          md: "justifyContentFlexEnd",
                        }}
                        style={{ rowGap: "0.35rem" }}
                      >
                        {sovereignSelectionChips.map(({ id, chip, fullTitle }) => (
                          <FlexItem key={id}>
                            <Tooltip content={fullTitle}>
                              <span style={{ display: "inline-block" }}>
                                <Label color="blue">{chip}</Label>
                              </span>
                            </Tooltip>
                          </FlexItem>
                        ))}
                      </Flex>
                    </div>
                  ) : null}
                </div>
              ) : null}
              <div key={step.id}>
                {step.id === "artifact" ? (
                  <GeneratingArtifact
                    subtitle={step.body}
                    omitPageTitle
                    onGenerationComplete={() =>
                      setArtifactGenerationComplete(true)
                    }
                  />
                ) : null}
                {step.id === "flavor" ? (
                  <SovereignFlavorCards
                    selected={selectedSovereignFlavors}
                    onToggle={toggleSovereignFlavor}
                  />
                ) : null}
                {step.id === "configure" ? (
                  <ConfigureDeployment
                    selected={selectedSovereignFlavors}
                    forms={configureForms}
                    onFormChange={handleConfigureFormChange}
                    configureValidationIssues={
                      showConfigureValidation ? configureIssues : []
                    }
                    configureValidationFocusNonce={
                      showConfigureValidation
                        ? configureValidationFocusNonce
                        : 0
                    }
                    showSubmitValidationErrors={showConfigureValidation}
                  />
                ) : null}
                {step.id === "review" ? (
                  <ConfigureDeployment
                    selected={selectedSovereignFlavors}
                    forms={configureForms}
                    onFormChange={handleConfigureFormChange}
                    readOnly
                  />
                ) : null}
                {step.id === "welcome" ? (
                  <>
                    <div
                      style={{
                        maxWidth: "36rem",
                        marginInline: "auto",
                        marginTop: 0,
                      }}
                    >
                      <Title
                        headingLevel="h1"
                        size="2xl"
                        className="trial-welcome-hero-title"
                        style={{
                          textAlign: "center",
                          margin: "0 0 var(--pf-t--global--spacer--lg)",
                          color: "#151515",
                          lineHeight: 1.2,
                          letterSpacing: "-0.02em",
                        }}
                      >
                        Welcome to Enclave
                      </Title>
                      <Content
                        component="p"
                        style={{
                          color: "#6a6e73",
                          fontSize: "1.0625rem",
                          lineHeight: 1.6,
                        }}
                      >
                        {step.body}
                      </Content>
                    </div>
                    {step.highlights ? (
                      <div className="trial-welcome-hl-list" role="list">
                        {step.highlights.map((h, i) => (
                          <Fragment key={h.title}>
                            {i > 0 ? (
                              <div className="trial-welcome-hl-divider-wrap">
                                <Divider
                                  component="div"
                                  className="trial-welcome-hl-divider"
                                  role="presentation"
                                  orientation={{
                                    default: "horizontal",
                                    md: "vertical",
                                  }}
                                  inset={{
                                    default: "insetNone",
                                    md: "insetMd",
                                  }}
                                />
                              </div>
                            ) : null}
                            <div className="trial-welcome-hl-item" role="listitem">
                              <div
                                className="trial-welcome-hl-item__icon"
                                aria-hidden
                              >
                                <div
                                  className="trial-welcome-hl-icon"
                                  style={{ lineHeight: 0 }}
                                >
                                  <HighlightPfIcon id={h.icon} />
                                </div>
                              </div>
                              <div className="trial-welcome-hl-item__text">
                                <Title
                                  headingLevel="h3"
                                  size="md"
                                  className="trial-welcome-hl-item__title"
                                  style={{ color: "#151515" }}
                                >
                                  {h.title}
                                </Title>
                                <Content
                                  component="p"
                                  className="trial-welcome-hl-item__desc"
                                  style={{
                                    color: "#6a6e73",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  {h.description}
                                </Content>
                              </div>
                            </div>
                          </Fragment>
                        ))}
                      </div>
                    ) : null}
                    <div className="trial-welcome-cta">
                      <Button
                        variant="primary"
                        size="lg"
                        onClick={() => setIndex(1)}
                      >
                        Get started
                      </Button>
                    </div>
                  </>
                ) : null}
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {step.id !== "welcome" ? (
        <div className="trial-wizard-bottom" role="contentinfo" aria-label="Step actions">
          <div className="trial-wizard-inner">
            <div className="trial-wizard-bottom-align">
              <Flex
                justifyContent={{ default: "justifyContentSpaceBetween" }}
                alignItems={{ default: "alignItemsCenter" }}
                fullWidth
              >
                <FlexItem>
                  <Button
                    variant="secondary"
                    onClick={goBack}
                    aria-label="Back"
                  >
                    Back
                  </Button>
                </FlexItem>
                <FlexItem>
                  {step.id === "artifact" && artifactGenerationComplete ? (
                    <Button variant="primary" aria-label="Download ISO">
                      Download ISO
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      aria-label="Next step"
                      isDisabled={
                        isLast ||
                        (step.id === "flavor" &&
                          selectedSovereignFlavors.size === 0)
                      }
                      onClick={goNext}
                    >
                      Next
                    </Button>
                  )}
                </FlexItem>
              </Flex>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type LineStep = { id: string; label: string };

function TrialLineStepper({
  currentIndex,
  onGoTo,
  stepLabels,
}: {
  currentIndex: number;
  onGoTo: (i: number) => void;
  stepLabels: LineStep[];
}) {
  return (
    <nav
      className="trial-stepper-wrap"
      aria-label="Setup progress"
    >
      <div className="trial-stepper-rail" aria-hidden />
      <ol className="trial-stepper-nodes" role="list" aria-hidden={false}>
        {stepLabels.map((s, i) => {
          const done = i < currentIndex;
          const current = i === currentIndex;
          return (
            <li key={s.id} className="trial-node-col">
              <div style={{ minHeight: 28, display: "flex", alignItems: "center" }}>
                {done ? (
                  <button
                    type="button"
                    className="trial-node-btn is-clickable"
                    aria-label={`${s.label}, completed. Go to this step.`}
                    onClick={() => onGoTo(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onGoTo(i);
                      }
                    }}
                  >
                    <CompletedNodeIcon />
                  </button>
                ) : (
                  <div
                    className="trial-node-btn"
                    aria-current={current ? "step" : undefined}
                    role={current ? "presentation" : undefined}
                  >
                    {current ? <CurrentNodeIcon /> : <UpcomingNodeIcon />}
                  </div>
                )}
              </div>
              <span
                className={[
                  "trial-node-label",
                  current || done ? (current ? "is-current" : "is-completed") : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                id={`trial-step-lbl-${s.id}`}
              >
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function UpcomingNodeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="#b8b8b8"
        strokeWidth="2"
        fill="#fff"
      />
    </svg>
  );
}

function CurrentNodeIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10.25"
        stroke={TRIAL_BLUE}
        strokeWidth="2.5"
        fill="#fff"
      />
      <circle cx="12" cy="12" r="4.25" fill={TRIAL_BLUE} />
    </svg>
  );
}

function CompletedNodeIcon() {
  return (
    <span
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 24,
        height: 24,
        borderRadius: "50%",
        background: TRIAL_BLUE,
        boxShadow: "0 0 0 4px #fff",
        lineHeight: 0,
      }}
      aria-hidden
    >
      <CheckIcon style={{ color: "#fff", width: 14, height: 14 }} />
    </span>
  );
}

function HighlightPfIcon({ id }: { id: HighlightIconId }) {
  const size = "2.25rem";
  switch (id) {
    case "bootstrap":
      return <BootstrapGlyph style={{ width: size, height: size }} />;
    case "disconnected":
      return <DisconnectedGlyph style={{ width: size, height: size }} />;
    case "policies":
      return <ShieldGlyph style={{ width: size, height: size }} />;
    default:
      return null;
  }
}
