import {
  Card,
  CardBody,
  Content,
  List,
  ListComponent,
  ListItem,
  Title,
} from "@patternfly/react-core";
import type { ReactNode } from "react";
import {
  BundleIcon,
  EnterpriseIcon,
  NetworkWiredIcon,
} from "@patternfly/react-icons";
import {
  AiFlavorIcon,
  ClusterFlavorIcon,
  CubesFlavorIcon,
} from "./FlavorCardIcons";

export type SovereignFlavorId =
  | "vm"
  | "cluster"
  | "models"
  | "container"
  | "baremetal"
  | "network";

type FlavorOption = {
  id: SovereignFlavorId;
  title: string;
  lead: string;
  includes: readonly string[];
  icon: ReactNode;
  listLabel: string;
};

const FLAVOR_CHIP_LABEL: Record<SovereignFlavorId, string> = {
  vm: "VM",
  cluster: "Cluster",
  models: "Models",
  container: "Containers",
  baremetal: "Bare metal",
  network: "Network",
};

const FLAVOR_OPTIONS: FlavorOption[] = [
  {
    id: "vm",
    title: "VM as a Service",
    lead: "On-demand virtual machines with built-in reliability, security, and scalability for your workloads.",
    includes: [
      "Virtual machine management",
      "High availability across zones",
      "Block storage (volumes and snapshots)",
      "Private networking (VPC)",
      "GPU acceleration on demand",
    ],
    icon: <CubesFlavorIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
    listLabel: "VM as a Service includes",
  },
  {
    id: "cluster",
    title: "Cluster as a Service",
    lead: "On-demand container clusters with built-in scalability, resilience, and lifecycle management.",
    includes: [
      "Cluster provisioning and management",
      "Auto-scaling and high availability",
      "Integrated networking and service discovery",
      "Persistent storage for stateful workloads",
      "Policy-based governance and access control",
    ],
    icon: <ClusterFlavorIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
    listLabel: "Cluster as a Service includes",
  },
  {
    id: "models",
    title: "Model as a Service",
    lead: "On-demand access to AI/ML models with scalable inference and streamlined deployment.",
    includes: [
      "Model deployment and versioning",
      "Scalable inference endpoints",
      "GPU acceleration for training and inference",
      "Secure access and usage controls",
      "Monitoring and performance tracking",
    ],
    icon: <AiFlavorIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
    listLabel: "Model as a Service includes",
  },
  {
    id: "container",
    title: "Container as a Service",
    lead: "On-demand container clusters for running and scaling applications with built-in automation, resilience, and security.",
    includes: [
      "Cluster provisioning and lifecycle management",
      "Automated scaling and self-healing workloads",
      "Container registry integration and image management",
      "Service discovery and internal networking",
      "Persistent storage for stateful applications",
    ],
    icon: <BundleIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
    listLabel: "Container as a Service includes",
  },
  {
    id: "baremetal",
    title: "Bare Metal as a Service",
    lead: "On-demand physical servers with full hardware access, performance control, and automated provisioning.",
    includes: [
      "Automated server provisioning and deprovisioning",
      "Full hardware-level access (no virtualization layer)",
      "Custom OS installation and image management",
      "High-performance compute options",
      "Dedicated GPU and accelerator support",
    ],
    icon: <EnterpriseIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
    listLabel: "Bare Metal as a Service includes",
  },
  {
    id: "network",
    title: "Network as a Service",
    lead: "On-demand software-defined networking for connecting, isolating, and securing workloads across environments.",
    includes: [
      "Virtual private cloud (VPC) provisioning",
      "Subnets, routing tables, and IP management",
      "Network segmentation and isolation policies",
      "Load balancing (layer 4 and layer 7)",
      "Firewall and security group management",
    ],
    icon: <NetworkWiredIcon style={{ width: "2.5rem", height: "2.5rem" }} />,
    listLabel: "Network as a Service includes",
  },
];

export function getSelectedSovereignFlavorsForSummary(
  selected: ReadonlySet<SovereignFlavorId>,
): { id: SovereignFlavorId; chip: string; fullTitle: string }[] {
  return FLAVOR_OPTIONS.filter((o) => selected.has(o.id)).map((o) => ({
    id: o.id,
    chip: FLAVOR_CHIP_LABEL[o.id],
    fullTitle: o.title,
  }));
}

type Props = {
  selected: ReadonlySet<SovereignFlavorId>;
  onToggle: (id: SovereignFlavorId) => void;
};

export function SovereignFlavorCards({ selected, onToggle }: Props) {
  return (
    <div
      className="trial-flavor-options-grid"
      role="group"
      aria-label="Sovereign cloud setup options"
    >
      {FLAVOR_OPTIONS.map((opt) => {
        const isSelected = selected.has(opt.id);
        const titleId = `trial-flavor-title-${opt.id}`;
        return (
          <Card
            key={opt.id}
            id={`trial-flavor-card-${opt.id}`}
            isRounded
            isSelectable
            isSelected={isSelected}
            className="trial-flavor-option-card"
            tabIndex={0}
            role="checkbox"
            aria-checked={isSelected}
            aria-labelledby={titleId}
            onClick={() => onToggle(opt.id)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onToggle(opt.id);
              }
            }}
          >
            <CardBody className="trial-flavor-option-card__body">
              {isSelected ? (
                <span className="trial-flavor-option-card__badge">Selected</span>
              ) : null}
              <div className="trial-flavor-option-card__icon" aria-hidden>
                {opt.icon}
              </div>
              <Title
                id={titleId}
                headingLevel="h2"
                size="xl"
                className="trial-flavor-option-card__title"
              >
                {opt.title}
              </Title>
              <Content component="p" className="trial-flavor-option-card__lead">
                {opt.lead}
              </Content>
              <Content
                component="p"
                className="trial-flavor-option-card__includes-label"
              >
                Includes:
              </Content>
              <List
                component={ListComponent.ul}
                className="trial-flavor-option-card__list"
                aria-label={opt.listLabel}
              >
                {opt.includes.map((line, idx) => (
                  <ListItem key={`${opt.id}-${idx}`}>{line}</ListItem>
                ))}
              </List>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}

export const DEFAULT_SOVEREIGN_FLAVOR_SELECTION: ReadonlySet<SovereignFlavorId> =
  new Set(["vm", "cluster", "baremetal"]);
