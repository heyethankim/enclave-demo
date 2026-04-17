import styles from "./App.module.css";
import { AiFlavorIcon, CubesFlavorIcon, StorageFlavorIcon } from "./FlavorCardIcons";

export type FlavorId = "storage" | "vms" | "ai";

export type FlavorOption = {
  id: FlavorId;
  title: string;
  description: string;
  includes: string[];
};

export const flavorOptions: FlavorOption[] = [
  {
    id: "storage",
    title: "Storage as a Service",
    description:
      "Deploy a sovereign storage layer with Ceph and OpenShift Data Foundation",
    includes: [
      "OpenShift Data Foundation",
      "Ceph Storage Cluster",
      "S3-compatible Object Storage",
      "Block & File Storage",
      "Multi-AZ Replication",
    ],
  },
  {
    id: "vms",
    title: "VM as a Service",
    description: "OSAC VMaaS layer with OpenShift Virtualization for running virtual machines",
    includes: [
      "OpenShift Virtualization",
      "KubeVirt Integration",
      "VM Lifecycle Management",
      "Live Migration Support",
      "Network Isolation",
    ],
  },
  {
    id: "ai",
    title: "AI/ML Workloads",
    description: "GPU-accelerated infrastructure for AI and machine learning workloads",
    includes: [
      "NVIDIA GPU Operator",
      "OpenShift AI",
      "Model Serving",
      "Distributed Training",
      "Jupyter Notebooks",
    ],
  },
];

type FlavorCardsProps = {
  selected: FlavorId;
  onSelect: (id: FlavorId) => void;
};

export function FlavorCards({ selected, onSelect }: FlavorCardsProps) {
  return (
    <div
      className={styles.flavorGrid}
      role="radiogroup"
      aria-label="Primary use case"
    >
      {flavorOptions.map((opt) => (
        <label
          key={opt.id}
          className={
            selected === opt.id
              ? `${styles.flavorCard} ${styles.flavorCardSelected}`
              : styles.flavorCard
          }
        >
          <input
            type="radio"
            name="sovereign-flavor"
            value={opt.id}
            checked={selected === opt.id}
            onChange={() => onSelect(opt.id)}
            className={styles.flavorRadio}
          />
          <div className={styles.flavorIcon} aria-hidden="true">
            {opt.id === "storage" ? (
              <StorageFlavorIcon className={styles.flavorGlyph} />
            ) : opt.id === "vms" ? (
              <CubesFlavorIcon
                className={`${styles.flavorGlyph} ${styles.flavorGlyphCubes}`}
              />
            ) : (
              <AiFlavorIcon className={styles.flavorGlyph} />
            )}
          </div>
          <h3 className={styles.flavorCardTitle}>{opt.title}</h3>
          <p className={styles.flavorDescription}>{opt.description}</p>
          <p className={styles.flavorIncludesHeading}>Includes:</p>
          <ul className={styles.flavorIncludesList}>
            {opt.includes.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </label>
      ))}
    </div>
  );
}
