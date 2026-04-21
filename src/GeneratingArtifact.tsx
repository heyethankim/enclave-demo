import { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardBody,
  CardTitle,
  ClipboardCopy,
  ClipboardCopyVariant,
  Content,
  Flex,
  Label,
  List,
  ListComponent,
  ListItem,
  OrderType,
  Progress,
  Stack,
  StackItem,
  Title,
} from "@patternfly/react-core";
import { CheckCircleIcon } from "@patternfly/react-icons";

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
};

const INSTALL_STEPS = [
  {
    title: "Transfer the ISO",
    body: "Copy enclave-vm-deployment.iso to your disconnected RHEL 9.x bastion host",
  },
  {
    title: "Mount the ISO",
    body: "Mount the ISO file to access the installation scripts and artifacts",
  },
  {
    title: "Run the installer",
    body: "Execute the installation script as shown below",
  },
  {
    title: "Wait for completion",
    body: "The automated process will take 45-90 minutes depending on hardware",
  },
] as const;

function buildInstallScript(generatedAt: string): string {
  return `#!/bin/bash
# Enclave Bootstrap Script
# Generated: ${generatedAt}
# Configuration: VM

echo "Starting Enclave deployment..."

# Mount the ISO
mount -o loop enclave-vm-deployment.iso /mnt/enclave

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
    <Stack hasGutter>
      <StackItem>
        <Flex justifyContent={{ default: "justifyContentCenter" }}>
          <CheckCircleIcon
            style={{
              width: "3rem",
              height: "3rem",
              color: "var(--pf-t--global--icon--color--status--success--default)",
            }}
            aria-hidden
          />
        </Flex>
      </StackItem>
      <StackItem>
        <Title headingLevel="h1" size="2xl" style={{ textAlign: "center" }}>
          Artifact Generated Successfully
        </Title>
        <div style={{ marginTop: "var(--pf-t--global--spacer--md)", textAlign: "center" }}>
          <Content component="p">
            Your customized deployment artifact is ready for download
          </Content>
        </div>
      </StackItem>
      <StackItem>
        <Card isCompact>
          <CardBody>
            <Title headingLevel="h4" size="md" style={{ fontFamily: "var(--pf-t--global--font--family--mono)" }}>
              enclave-vm-deployment.iso
            </Title>
            <Flex gap={{ default: "gapSm" }} style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
              <Label color="grey">ISO Image</Label>
              <Label color="grey">~18.4 GB</Label>
              <Label status="success">Ready</Label>
            </Flex>
          </CardBody>
        </Card>
      </StackItem>
      <StackItem>
        <Flex justifyContent={{ default: "justifyContentCenter" }}>
          <Button variant="primary">Download ISO</Button>
        </Flex>
      </StackItem>
      <StackItem>
        <Card isCompact>
          <CardBody>
            <CardTitle component="h2">Installation Instructions</CardTitle>
            <div style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
              <Content component="p">
                Follow these steps to deploy on your disconnected RHEL bastion host
              </Content>
            </div>
            <List
              component={ListComponent.ol}
              type={OrderType.number}
              style={{ marginTop: "var(--pf-t--global--spacer--md)" }}
            >
              {INSTALL_STEPS.map((s) => (
                <ListItem key={s.title}>
                  <Title headingLevel="h3" size="md">
                    {s.title}
                  </Title>
                  <Content component="p">{s.body}</Content>
                </ListItem>
              ))}
            </List>
          </CardBody>
        </Card>
      </StackItem>
      <StackItem>
        <Card isCompact>
          <CardBody>
            <CardTitle component="h2">Installation Script</CardTitle>
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
          </CardBody>
        </Card>
      </StackItem>
    </Stack>
  );
}

export function GeneratingArtifact({ subtitle, omitPageTitle = false }: Props) {
  const [percent, setPercent] = useState(1);
  const statusText = useMemo(
    () => statusMessageForPercent(percent),
    [percent],
  );
  const isComplete = percent >= 100;

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
        />
      </StackItem>
    </Stack>
  );
}
