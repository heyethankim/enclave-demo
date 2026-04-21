import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  Divider,
  Flex,
  Label,
  Progress,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { CheckCircleIcon } from "@patternfly/react-icons";

export const ARTIFACT_SUCCESS_TITLE = "Artifact generated successfully";
export const ARTIFACT_SUCCESS_SUBTITLE =
  "Your customized deployment artifact is ready for download.";

export const ISO_ARTIFACT_NAME = "Enclave-Platform.iso";

const DURATION_MS = 5000;

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
    title: "Transfer the ISO",
    body: `Copy ${ISO_ARTIFACT_NAME} to your disconnected RHEL 9.x bastion host`,
  },
  {
    title: "Mount the ISO",
    body: `Mount ${ISO_ARTIFACT_NAME} to access the installation scripts and artifacts`,
  },
  {
    title: "Run the installer",
    body: "Execute the installation script as shown below",
  },
  {
    title: "Wait for completion",
    body: "The automated process will take 45–90 minutes depending on hardware",
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
    <Stack hasGutter className="trial-artifact-success">
      <StackItem className="trial-artifact-success__hero-item">
        <div className="trial-artifact-success__hero">
          <Flex
            justifyContent={{ default: "justifyContentCenter" }}
            className="trial-artifact-success__success-icon"
          >
            <CheckCircleIcon
              style={{
                width: "2rem",
                height: "2rem",
                color:
                  "var(--pf-t--global--icon--color--status--success--default)",
              }}
              aria-hidden
            />
          </Flex>
          <p className="trial-artifact-success__iso-name">{ISO_ARTIFACT_NAME}</p>
          <Flex
            className="trial-artifact-success__pills"
            gap={{ default: "gapSm" }}
            justifyContent={{ default: "justifyContentCenter" }}
            flexWrap={{ default: "wrap" }}
            role="group"
            aria-label="Artifact type and size"
          >
            <Label color="grey" isCompact>
              ISO Image
            </Label>
            <Label color="grey" isCompact>
              ~18.4 GB
            </Label>
          </Flex>
          <div className="trial-artifact-success__cta">
            <Button variant="primary">Download ISO</Button>
          </div>
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
