import { useEffect, useMemo, useState } from "react";
import appStyles from "./App.module.css";
import styles from "./GeneratingArtifact.module.css";

const DURATION_MS = 14000;

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
};

function SpinnerIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="24"
        cy="24"
        r="20"
        stroke="currentColor"
        strokeOpacity="0.2"
        strokeWidth="4"
      />
      <path
        d="M44 24c0-11-9-20-20-20"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

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
  --flavor vm \\
  --storage ceph \\
  --network isolated

echo "Deployment complete!"`;
}

function SuccessCheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="3" />
      <path
        d="M15 24.5l6 6 12-14"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ArtifactSuccessView() {
  const generatedAt = useMemo(
    () =>
      new Date().toLocaleString(undefined, {
        dateStyle: "short",
        timeStyle: "medium",
      }),
    []
  );
  const script = useMemo(
    () => buildInstallScript(generatedAt),
    [generatedAt]
  );
  const [copied, setCopied] = useState(false);

  async function handleCopyScript() {
    try {
      await navigator.clipboard.writeText(script);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className={styles.root} aria-busy="false">
      <div className={`${styles.spinnerWrap} ${styles.successIconWrap}`}>
        <SuccessCheckIcon className={styles.successIcon} />
      </div>
      <h1 className={`${appStyles.title} ${appStyles.titleStep}`}>
        Artifact Generated Successfully!
      </h1>
      <p className={`${appStyles.lead} ${appStyles.leadStep} ${styles.successLead}`}>
        Your customized deployment artifact is ready for download
      </p>

      <div className={styles.artifactPanel}>
        <p className={styles.artifactFilename}>enclave-vm-deployment.iso</p>
        <div className={styles.badgeRow}>
          <span className={`${styles.badge} ${styles.badgeMuted}`}>
            ISO Image
          </span>
          <span className={`${styles.badge} ${styles.badgeMuted}`}>
            ~18.4 GB
          </span>
          <span className={`${styles.badge} ${styles.badgeReady}`}>
            Ready
          </span>
        </div>
      </div>

      <div className={styles.downloadWrap}>
        <button type="button" className={styles.downloadBtn}>
          Download ISO
        </button>
      </div>

      <div className={styles.postDownloadStack}>
        <section
          className={styles.plainCard}
          aria-labelledby="install-instructions-title"
        >
          <h2
            id="install-instructions-title"
            className={styles.instructionsTitle}
          >
            Installation Instructions
          </h2>
          <p className={styles.instructionsLead}>
            Follow these steps to deploy on your disconnected RHEL bastion host
          </p>
          <ol className={styles.stepsList}>
            {INSTALL_STEPS.map((step, i) => (
              <li key={step.title} className={styles.stepItem}>
                <span className={styles.stepNumber}>{i + 1}</span>
                <div className={styles.stepBodyWrap}>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section
          className={styles.plainCard}
          aria-labelledby="install-script-title"
        >
          <div className={styles.scriptCardHeader}>
            <h2 id="install-script-title" className={styles.scriptCardTitle}>
              Installation Script
            </h2>
            <button
              type="button"
              className={
                copied
                  ? `${styles.copyBtn} ${styles.copyBtnDone}`
                  : styles.copyBtn
              }
              onClick={handleCopyScript}
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
          <pre className={styles.scriptPre}>
            <code>{script}</code>
          </pre>
        </section>
      </div>
    </div>
  );
}

export function GeneratingArtifact({ subtitle }: Props) {
  const [percent, setPercent] = useState(1);
  const statusText = useMemo(
    () => statusMessageForPercent(percent),
    [percent]
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
    <div className={styles.root} aria-busy="true">
      <div className={styles.spinnerWrap}>
        <SpinnerIcon className={styles.spinner} />
      </div>
      <h1 className={`${appStyles.title} ${appStyles.titleStep}`}>
        Generating Your Deployment Artifact
      </h1>
      <p className={`${appStyles.lead} ${appStyles.leadStep}`}>{subtitle}</p>

      <div className={styles.progressWrap}>
        <div className={styles.statusRow}>
          <p className={styles.statusText} aria-live="polite">
            {statusText}
          </p>
          <span className={styles.percentText} aria-hidden>
            {percent}%
          </span>
        </div>
        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${percent}% — ${statusText}`}
          aria-label="Artifact generation progress"
        >
          <div
            className={styles.progressFill}
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
