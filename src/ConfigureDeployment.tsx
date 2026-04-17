import type { FlavorId } from "./FlavorCards";
import { flavorOptions } from "./FlavorCards";
import { CubesFlavorIcon } from "./FlavorCardIcons";
import styles from "./ConfigureDeployment.module.css";

export type StorageBackend = "ceph" | "odf" | "local" | "nfs";

export type NetworkLevel = "airgap" | "proxy" | "restricted";

export type ConfigureFormState = {
  deploymentName: string;
  aiMlEnabled: boolean;
  storageBackend: StorageBackend;
  networkLevel: NetworkLevel;
};

type Props = {
  flavorId: FlavorId;
  form: ConfigureFormState;
  onChange: (patch: Partial<ConfigureFormState>) => void;
};

const storageOptions: { value: StorageBackend; label: string }[] = [
  { value: "ceph", label: "Ceph (Recommended)" },
  { value: "odf", label: "OpenShift Data Foundation" },
  { value: "local", label: "Local Storage" },
  { value: "nfs", label: "NFS" },
];

const networkOptions: { value: NetworkLevel; label: string }[] = [
  { value: "airgap", label: "Fully isolated (Air-gapped)" },
  { value: "proxy", label: "Proxy-connected" },
  { value: "restricted", label: "Restricted Network" },
];

const includedStatic = [
  { key: "acm", label: "Advanced Cluster Management (ACM)" },
  { key: "compliance", label: "Compliance Operator" },
  { key: "virt", label: "OpenShift Virtualization" },
  { key: "ai", label: "OpenShift AI" },
  { key: "gpu", label: "NVIDIA GPU Operator" },
] as const;

function IncludedCheckGlyph({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M3 8l3.25 3.25L13 4.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ConfigureDeployment({ flavorId, form, onChange }: Props) {
  const flavorTitle =
    flavorOptions.find((f) => f.id === flavorId)?.title ?? "—";

  return (
    <div className={styles.root}>
      <section className={styles.configureCard} aria-labelledby="cfg-flavor-label">
        <div className={styles.flavorHeader}>
          {flavorId === "vms" ? (
            <div className={styles.flavorIconWrap} aria-hidden>
              <CubesFlavorIcon className={styles.pageIcon} />
            </div>
          ) : null}
          <p id="cfg-flavor-label" className={styles.flavorSingleLine}>
            <span className={styles.flavorInlineLabel}>Selected Flavor:</span>
            <span className={styles.flavorInlineTitle}>{flavorTitle}</span>
          </p>
        </div>
      </section>

      <section className={styles.configureCard} aria-labelledby="cfg-name-title">
        <h2 id="cfg-name-title" className={styles.fieldTitle}>
          Deployment Name
        </h2>
        <p className={styles.fieldHint}>
          Give your cloud deployment a custom name (optional)
        </p>
        <input
          type="text"
          className={styles.textInput}
          value={form.deploymentName}
          onChange={(e) => onChange({ deploymentName: e.target.value })}
          placeholder="e.g., sovereign-cloud-production"
          autoComplete="off"
        />
      </section>

      <section className={styles.configureCard} aria-labelledby="cfg-aiml-title">
        <h2 id="cfg-aiml-title" className={styles.fieldTitle}>
          AI/ML Capabilities
        </h2>
        <div className={styles.toggleBlock}>
          <div className={styles.toggleCopy}>
            <p>
              Include OpenShift AI and GPU operator support for machine learning
              workloads
            </p>
          </div>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={form.aiMlEnabled}
              onChange={(e) => onChange({ aiMlEnabled: e.target.checked })}
              aria-label="Include OpenShift AI and GPU operator support"
            />
            <span className={styles.switchTrack} aria-hidden>
              <span className={styles.switchThumb} />
            </span>
          </label>
        </div>
        {form.aiMlEnabled ? (
          <div className={styles.gpuSub}>
            <p className={styles.gpuSubTitle}>NVIDIA GPU Support</p>
            <p className={styles.gpuSubBody}>
              Install NVIDIA GPU operator for hardware acceleration
            </p>
          </div>
        ) : null}
      </section>

      <div className={styles.splitRow}>
        <section
          className={styles.configureCard}
          aria-labelledby="cfg-storage-title"
        >
          <h2 id="cfg-storage-title" className={styles.fieldTitle}>
            Storage Backend
          </h2>
          <p className={styles.fieldHint}>
            Select the storage solution for your deployment
          </p>
          <select
            className={styles.select}
            value={form.storageBackend}
            onChange={(e) =>
              onChange({ storageBackend: e.target.value as StorageBackend })
            }
            aria-label="Storage backend"
          >
            {storageOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </section>

        <section
          className={styles.configureCard}
          aria-labelledby="cfg-net-title"
        >
          <h2 id="cfg-net-title" className={styles.fieldTitle}>
            Network Configuration
          </h2>
          <p className={styles.fieldHint}>Select network isolation level.</p>
          <select
            className={styles.select}
            value={form.networkLevel}
            onChange={(e) =>
              onChange({ networkLevel: e.target.value as NetworkLevel })
            }
            aria-label="Network configuration"
          >
            {networkOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </section>
      </div>

      <section className={styles.configureCard} aria-labelledby="cfg-auto-title">
        <h2 id="cfg-auto-title" className={styles.autoHeading}>
          Automatically Included
        </h2>
        <p className={styles.autoLead}>
          These components will be pre-configured based on your selections
        </p>
        <ul className={styles.autoList}>
          {includedStatic.map((row) => (
            <li key={row.key} className={styles.autoListItem}>
              <IncludedCheckGlyph className={styles.autoCheck} />
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
