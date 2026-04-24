import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  Divider,
  Progress,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { ClipboardCheckIcon, CubeIcon } from "@patternfly/react-icons";

export const ARTIFACT_SUCCESS_TITLE =
  "Your installer ISO and configuration file are ready to download";
export const ARTIFACT_SUCCESS_SUBTITLE =
  "Your customized deployment artifact is ready for download.";

export const ISO_ARTIFACT_NAME = "Enclave-Platform.iso";

export const CONFIG_ARTIFACT_NAME = "enclave-deployment-config.yaml";

/** OSAC prototype hub — floating link on the artifact success screen. */
export const OSAC_PROTOTYPE_HUB_URL = "https://heyethankim.github.io/osac-demo/";

/** Shown under download buttons in the success view (demo; not the tiny placeholder file sizes). */
const ARTIFACT_ISO_DISPLAY_SIZE = "1.5 GB";
const ARTIFACT_CONFIG_DISPLAY_SIZE = "500 KB";

const DURATION_MS = 5000;

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Demo placeholder body for the installer ISO (same bytes as download). */
export function getInstallerIsoDemoBody(): string {
  return `Enclave installer ISO — demo placeholder\n\nFilename: ${ISO_ARTIFACT_NAME}\nThis file stands in for the full bootable image in this UI prototype.\n`;
}

/** Demo YAML body for the deployment config (same bytes as download for a given timestamp). */
export function buildDeploymentConfigYaml(generatedAtIso: string): string {
  return `# Enclave deployment configuration (demo)\n# Generated: ${generatedAtIso}\n\napiVersion: enclave.demo/v1\nkind: DeploymentConfig\nmetadata:\n  name: enclave-trial\nspec:\n  profile: disconnected-bastion\n`;
}

/** Demo placeholder for the wizard (replace with real ISO in production). */
export function downloadInstallerIso(): void {
  triggerDownload(ISO_ARTIFACT_NAME, getInstallerIsoDemoBody(), "application/octet-stream");
}

/** Demo deployment config download for the wizard. */
export function downloadDeploymentConfig(): void {
  triggerDownload(
    CONFIG_ARTIFACT_NAME,
    buildDeploymentConfigYaml(new Date().toISOString()),
    "text/yaml;charset=utf-8",
  );
}

const STATUS_MESSAGES = [
  "Initializing build environment...",
  "Fetching container image from Quay...",
  "Mirroring OpenShift registry...",
  "Bundling operator catalogs...",
  "Configuring installation manifests...",
  "Generating deployment scripts...",
  "Creating bootable ISO...",
  "Finalizing artifacts ...",
] as const;

function statusMessageForPercent(p: number): string {
  const n = STATUS_MESSAGES.length;
  const i = Math.min(n - 1, Math.floor((p * n) / 100));
  return STATUS_MESSAGES[i];
}

type Props = {
  subtitle: string;
  /** When the parent page header already shows the title, omit the in-flow headline (loading state). */
  omitPageTitle?: boolean;
  /** Called once when progress reaches 100% (e.g. to update the wizard page title). */
  onGenerationComplete?: () => void;
};

const INSTALL_STEPS = [
  {
    title: "Download required files",
    body: "Download both the installation ISO and the configuration file.",
  },
  {
    title: "Transfer files",
    body: "Copy the ISO and config file to your disconnected RHEL 9.x bastion host.",
  },
  {
    title: "Mount the ISO",
    body: "Mount the ISO to access installation scripts and artifacts.",
  },
  {
    title: "Provide the configuration",
    body: "Place the config file in the expected location or pass it to the installer (as required).",
  },
  {
    title: "Run the installer",
    body: "Execute the installation script using the provided configuration.",
  },
  {
    title: "Wait for completion",
    body: "The process takes ~45–90 minutes depending on hardware.",
  },
] as const;

function buildInstallScript(generatedAt: string): string {
  return `#!/bin/bash
# Enclave Bootstrap Script
# Generated: ${generatedAt}
# Configuration: VM

echo "Starting Enclave deployment..."

# Mount the ISO
mount -o loop ${ISO_ARTIFACT_NAME} /mnt/enclave

# Run the installer
/mnt/enclave/install.sh \\
  --flavor cluster \\
  --storage ceph \\
  --network isolated

echo "Deployment complete!"`;
}

function ArtifactSuccessView() {
  const generatedAt = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "medium",
      }),
    [],
  );
  const script = useMemo(
    () => buildInstallScript(generatedAt),
    [generatedAt],
  );

  return (
    <Fragment>
    <Stack hasGutter className="trial-artifact-success">
      <StackItem className="trial-artifact-success__hero-item">
        <div className="trial-artifact-success__hero">
          <section
            className="trial-artifact-success__provenance"
            aria-label="Software bill of materials and signature"
          >
            <ul className="trial-artifact-success__provenance-list">
              <li className="trial-artifact-success__provenance-item">
                <span className="trial-artifact-success__provenance-icon-wrap" aria-hidden>
                  <CubeIcon className="trial-artifact-success__provenance-icon" />
                </span>
                <div className="trial-artifact-success__provenance-item-body">
                  <div className="trial-artifact-success__provenance-item-title">
                    SBOM available
                  </div>
                  <Content
                    component="p"
                    className="trial-artifact-success__provenance-item-desc"
                  >
                    Software Bill of Materials included for transparency
                  </Content>
                </div>
              </li>
              <li className="trial-artifact-success__provenance-item">
                <span className="trial-artifact-success__provenance-icon-wrap" aria-hidden>
                  <ClipboardCheckIcon className="trial-artifact-success__provenance-icon" />
                </span>
                <div className="trial-artifact-success__provenance-item-body">
                  <div className="trial-artifact-success__provenance-item-title">
                    Signature verified
                  </div>
                  <Content
                    component="p"
                    className="trial-artifact-success__provenance-item-desc"
                  >
                    Cryptographically signed and verified
                  </Content>
                </div>
              </li>
            </ul>
          </section>
          <div className="trial-artifact-success__cta" aria-label="Download options">
            <div className="trial-artifact-success__download-wrap">
              <Button
                variant="primary"
                size="lg"
                aria-label="Download installer ISO"
                onClick={downloadInstallerIso}
              >
                Download installer ISO
              </Button>
              <span className="trial-artifact-success__file-size">
                {ARTIFACT_ISO_DISPLAY_SIZE}
              </span>
            </div>
            <div className="trial-artifact-success__download-wrap">
              <Button
                variant="secondary"
                size="lg"
                aria-label="Download config"
                onClick={downloadDeploymentConfig}
              >
                Download config
              </Button>
              <span className="trial-artifact-success__file-size">
                {ARTIFACT_CONFIG_DISPLAY_SIZE}
              </span>
            </div>
          </div>
          <Divider className="trial-artifact-success__post-download-divider" />
        </div>
      </StackItem>
      <StackItem>
        <Title headingLevel="h2" size="xl" style={{ margin: 0 }}>
          Installation instructions
        </Title>
        <Content
          component="p"
          className="trial-artifact-success__intro"
        >
          Follow these steps to deploy on your disconnected RHEL bastion host.
        </Content>
        <ol className="trial-artifact-install-steps">
          {INSTALL_STEPS.map((s) => (
            <li key={s.title}>
              <Title
                headingLevel="h3"
                size="md"
                className="trial-artifact-install-steps__title"
              >
                {s.title}
              </Title>
              <Content component="p" className="trial-artifact-install-steps__body">
                {s.body}
              </Content>
            </li>
          ))}
        </ol>
      </StackItem>
      <StackItem>
        <Divider />
      </StackItem>
      <StackItem>
        <Title headingLevel="h2" size="xl" style={{ margin: 0 }}>
          Installation script
        </Title>
        <ClipboardCopy
          variant={ClipboardCopyVariant.expansion}
          isExpanded
          isCode
          hoverTip="Copy"
          clickTip="Copied!"
          style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
        >
          {script}
        </ClipboardCopy>
      </StackItem>
    </Stack>
    <Button
      variant="secondary"
      component="a"
      href={OSAC_PROTOTYPE_HUB_URL}
      rel="noopener noreferrer"
      className="trial-osac-hub-fab"
    >
      Red Hat OSAC Prototypes
    </Button>
    </Fragment>
  );
}

export function GeneratingArtifact({
  subtitle,
  omitPageTitle = false,
  onGenerationComplete,
}: Props) {
  const [percent, setPercent] = useState(1);
  const reportedCompleteRef = useRef(false);
  const statusText = useMemo(
    () => statusMessageForPercent(percent),
    [percent],
  );
  const isComplete = percent >= 100;

  useEffect(() => {
    if (percent >= 100 && !reportedCompleteRef.current) {
      reportedCompleteRef.current = true;
      onGenerationComplete?.();
    }
  }, [percent, onGenerationComplete]);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;

    function tick(now: number) {
      const t = Math.min(1, (now - start) / DURATION_MS);
      const value = Math.min(100, Math.max(1, Math.round(1 + 99 * t)));
      setPercent(value);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  if (isComplete) {
    return <ArtifactSuccessView />;
  }

  return (
    <Stack hasGutter>
      {omitPageTitle ? null : (
        <StackItem>
          <Title headingLevel="h1" size="2xl" style={{ textAlign: "center" }}>
            Generating Your Deployment Artifact
          </Title>
          <div
            style={{
              marginTop: "var(--pf-t--global--spacer--md)",
              textAlign: "center",
            }}
          >
            <Content component="p">{subtitle}</Content>
          </div>
        </StackItem>
      )}
      <StackItem>
        <Progress
          title={statusText}
          value={percent}
          measureLocation="outside"
          valueText={`${percent}% — ${statusText}`}
          aria-label="Artifact generation progress"
          variant="success"
        />
      </StackItem>
    </Stack>
  );
}
