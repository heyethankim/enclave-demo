import { Fragment, useCallback, useState } from "react";
import {
  Button,
  FormGroup,
  FormHelperText,
  TextInput,
  Title,
} from "@patternfly/react-core";
import type { SovereignFlavorId } from "./SovereignFlavorCards";

export type TriadFlavorId = "vm" | "cluster" | "baremetal";

type ConfigureLayout = "full" | "basic";

export type AgentHost = {
  id: string;
  name: string;
  mac: string;
  ip: string;
  redfish: string;
  rootDisk: string;
  redfishUser: string;
  redfishPassword: string;
};

/** Cluster as a Service — workload tab (cluster nodes). */
export type ClusterWorkloadNode = {
  id: string;
  name: string;
  nodeRole: string;
  cpuCores: string;
  memoryGb: string;
  storageGb: string;
};

export type FormState = {
  baseDomain: string;
  serviceName: string;
  apiVip: string;
  ingressVip: string;
  machineNetwork: string;
  hosts: AgentHost[];
  /** VM as a Service — workload */
  baseUrl: string;
  organization: string;
  storagePolicy: string;
  /** Bare Metal as a Service — workload */
  provisioningNetwork: string;
  bootMode: string;
  /** Model as a Service — Red Hat validated models */
  modelIbmGranite: boolean;
  modelMetaLlama3: boolean;
  modelMistralAi: boolean;
  modelMixtral8x7b: boolean;
  /** Model as a Service — GPU acceleration options */
  gpuInstallNvidiaDrivers: boolean;
  gpuInstallCudaToolkit: boolean;
  /** Model as a Service — inference runtime identifier */
  modelRuntime: string;
  /** Cluster as a Service — workload (cluster nodes + HA options) */
  clusterWorkloadNodes: ClusterWorkloadNode[];
  clusterHaEnabled: boolean;
  clusterAutoscaleEnabled: boolean;
};

function workloadDefaults(): Pick<
  FormState,
  | "baseUrl"
  | "organization"
  | "storagePolicy"
  | "provisioningNetwork"
  | "bootMode"
  | "modelIbmGranite"
  | "modelMetaLlama3"
  | "modelMistralAi"
  | "modelMixtral8x7b"
  | "gpuInstallNvidiaDrivers"
  | "gpuInstallCudaToolkit"
  | "modelRuntime"
  | "clusterWorkloadNodes"
  | "clusterHaEnabled"
  | "clusterAutoscaleEnabled"
> {
  return {
    baseUrl: "https://api.mgmt.example.com/v1",
    organization: "",
    storagePolicy: "",
    provisioningNetwork: "",
    bootMode: "UEFI",
    modelIbmGranite: true,
    modelMetaLlama3: true,
    modelMistralAi: true,
    modelMixtral8x7b: true,
    gpuInstallNvidiaDrivers: true,
    gpuInstallCudaToolkit: true,
    modelRuntime: "",
    clusterWorkloadNodes: [],
    clusterHaEnabled: true,
    clusterAutoscaleEnabled: true,
  };
}

export function mergeConfigureForm(
  flavorId: SovereignFlavorId,
  forms: Partial<Record<SovereignFlavorId, FormState>>,
): FormState {
  return { ...initialFormState(flavorId), ...forms[flavorId] };
}

/** Which flavor backs the shared “Infrastructure” block. */
export function infrastructureFlavorIdForConfigure(
  selected: ReadonlySet<SovereignFlavorId>,
): SovereignFlavorId | null {
  if (selected.has("cluster")) return "cluster";
  if (selected.has("vm")) return "vm";
  if (selected.has("baremetal")) return "baremetal";
  return null;
}

export type ConfigureValidationIssue = {
  flavorId: SovereignFlavorId;
  messages: string[];
};

export function configureLayoutFor(id: SovereignFlavorId): ConfigureLayout {
  switch (id) {
    case "vm":
    case "cluster":
    case "baremetal":
      return "full";
    case "models":
      return "basic";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function randomHexByte(): string {
  return Math.floor(Math.random() * 256)
    .toString(16)
    .padStart(2, "0");
}

function randomMac(): string {
  return [
    randomHexByte(),
    randomHexByte(),
    randomHexByte(),
    randomHexByte(),
    randomHexByte(),
    randomHexByte(),
  ].join(":");
}

function newHostId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function newClusterWorkloadNodeId(): string {
  return `cl-node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createClusterWorkloadNode(index: number): ClusterWorkloadNode {
  return {
    id: newClusterWorkloadNodeId(),
    name: `cluster-node-${String(index + 1).padStart(2, "0")}`,
    nodeRole: index === 0 ? "control-plane" : "worker",
    cpuCores: String(4 + (index % 3) * 4),
    memoryGb: String(16 + index * 8),
    storageGb: String(100 + index * 100),
  };
}

function randomOctet(min = 20, max = 220): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Third IPv4 octet from `192.168.x.0/24`-style machine network; fallback if unparsable. */
function thirdOctetFromMachineNetwork(machineNetwork: string): number {
  const m = machineNetwork
    .trim()
    .match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.0\/\d+$/);
  if (m) {
    const n = Number(m[3]);
    if (n >= 0 && n <= 255) {
      return n;
    }
  }
  return randomOctet(2, 250);
}

const VM_ORG_PREFIXES = [
  "northwind",
  "acme",
  "contoso",
  "globex",
  "initech",
  "umbrella",
] as const;

const VM_ORG_SUFFIXES = ["-labs", "-platform", "-infra", "-cloud", ""] as const;

function randomVmOrganization(): string {
  const p = VM_ORG_PREFIXES[Math.floor(Math.random() * VM_ORG_PREFIXES.length)];
  const s = VM_ORG_SUFFIXES[Math.floor(Math.random() * VM_ORG_SUFFIXES.length)];
  const n = Math.floor(Math.random() * 900 + 100);
  return `${p}${s}-${n}`;
}

const VM_STORAGE_POLICIES = [
  "ceph-rbd-gold",
  "ssd-premium-default",
  "tiered-warm-archive",
  "nfs-backup-retain-30d",
  "local-lvm-provisioned",
  "thin-replicated-ssd",
] as const;

function randomVmStoragePolicy(): string {
  return VM_STORAGE_POLICIES[Math.floor(Math.random() * VM_STORAGE_POLICIES.length)];
}

function makeVmHost1(lanThirdOctet: number): AgentHost {
  const last = randomOctet(12, 90);
  return {
    id: "agent-host-vm-1",
    name: "mgmt-ctl01",
    mac: "0c:c4:7a:62:fe:ec",
    ip: `192.168.${lanThirdOctet}.${last}`,
    redfish: `100.64.1.${randomOctet(10, 240)}`,
    rootDisk: "/dev/disk/by-path/pci-0000:0011.4-ata-1.0",
    redfishUser: "admin",
    redfishPassword: "SecureBmcPlaceholder1!",
  };
}

function hostNameFor(flavor: TriadFlavorId, hostNumber: number): string {
  const suffix = String(hostNumber).padStart(2, "0");
  if (flavor === "baremetal") {
    return `bmc-ctl${suffix}`;
  }
  return `mgmt-ctl${suffix}`;
}

function makeRandomHost(
  flavor: TriadFlavorId,
  hostNumber: number,
  lanThirdOctet: number,
): AgentHost {
  const ipLast = randomOctet();
  const rfLast = randomOctet(10, 240);
  const pci = (0x10 + Math.floor(Math.random() * 12)).toString(16);
  const ata = (hostNumber % 3) + 1;
  return {
    id: `agent-host-${flavor}-${newHostId()}`,
    name: hostNameFor(flavor, hostNumber),
    mac: randomMac(),
    ip: `192.168.${lanThirdOctet}.${ipLast}`,
    redfish: `100.64.1.${rfLast}`,
    rootDisk: `/dev/disk/by-path/pci-0000:${pci}.4-ata-${ata}.0`,
    redfishUser: "admin",
    redfishPassword: `Bmc-${randomHexByte()}${randomHexByte()}${randomHexByte()}!`,
  };
}

function initialBasicTriad(flavor: TriadFlavorId): {
  baseDomain: string;
  serviceName: string;
} {
  if (flavor === "vm") {
    return { baseDomain: "enclave-test.nodns.in", serviceName: "mgmt" };
  }
  const tok = Math.random().toString(36).slice(2, 8);
  const n = Math.floor(Math.random() * 800 + 100);
  if (flavor === "cluster") {
    return {
      baseDomain: `enclave-${tok}.nodns.in`,
      serviceName: `mgmt-${n}`,
    };
  }
  return {
    baseDomain: `metal-${tok}.nodns.in`,
    serviceName: `bmc-${n}`,
  };
}

/** Random RFC1918-style /24 for Infrastructure (VIP + machine network + host IPs stay aligned). */
function randomInfrastructureNetwork(): {
  apiVip: string;
  ingressVip: string;
  machineNetwork: string;
  lanThirdOctet: number;
} {
  const lanThirdOctet = randomOctet(2, 250);
  let a = randomOctet(100, 230);
  let b = randomOctet(100, 230);
  while (b === a) {
    b = randomOctet(100, 230);
  }
  return {
    apiVip: `192.168.${lanThirdOctet}.${a}`,
    ingressVip: `192.168.${lanThirdOctet}.${b}`,
    machineNetwork: `192.168.${lanThirdOctet}.0/24`,
    lanThirdOctet,
  };
}

function initialHostsTriad(flavor: TriadFlavorId, lanThirdOctet: number): AgentHost[] {
  return flavor === "vm"
    ? [makeVmHost1(lanThirdOctet)]
    : [makeRandomHost(flavor, 1, lanThirdOctet)];
}

function initialTriadFormState(flavor: TriadFlavorId): FormState {
  const net = randomInfrastructureNetwork();
  const workload = workloadDefaults();
  if (flavor === "cluster") {
    workload.clusterWorkloadNodes = [createClusterWorkloadNode(0)];
  }
  if (flavor === "vm") {
    workload.organization = randomVmOrganization();
    workload.storagePolicy = randomVmStoragePolicy();
  }
  if (flavor === "baremetal") {
    workload.provisioningNetwork = net.machineNetwork;
    workload.bootMode = Math.random() < 0.5 ? "UEFI" : "Legacy BIOS";
  }
  return {
    ...initialBasicTriad(flavor),
    apiVip: net.apiVip,
    ingressVip: net.ingressVip,
    machineNetwork: net.machineNetwork,
    hosts: initialHostsTriad(flavor, net.lanThirdOctet),
    ...workload,
  };
}

function initialModelsBasic(): Pick<FormState, "baseDomain" | "serviceName"> {
  const tok = Math.random().toString(36).slice(2, 8);
  const n = Math.floor(Math.random() * 800 + 100);
  return {
    baseDomain: `models-${tok}.nodns.in`,
    serviceName: `infer-svc-${n}`,
  };
}

export function initialFormState(flavorId: SovereignFlavorId): FormState {
  const mode = configureLayoutFor(flavorId);
  if (mode === "full") {
    return initialTriadFormState(flavorId as TriadFlavorId);
  }
  const tok = Math.random().toString(36).slice(2, 7);
  return {
    ...initialModelsBasic(),
    apiVip: "",
    ingressVip: "",
    machineNetwork: "",
    hosts: [],
    ...workloadDefaults(),
    modelRuntime: `vLLM 0.5.3 + Triton (${tok})`,
  };
}

export function validationClusterWorkloadMessages(form: FormState): string[] {
  const messages: string[] = [];
  if (form.clusterWorkloadNodes.length === 0) {
    messages.push("Add at least one cluster node.");
    return messages;
  }
  form.clusterWorkloadNodes.forEach((n, index) => {
    const h = index + 1;
    if (n.name.trim() === "") {
      messages.push(`Cluster node ${h}: Enter a node name.`);
    }
    if (!n.nodeRole || n.nodeRole.trim() === "") {
      messages.push(`Cluster node ${h}: Select a node role.`);
    }
    if (n.cpuCores.trim() === "") {
      messages.push(`Cluster node ${h}: Enter CPU cores.`);
    }
    if (n.memoryGb.trim() === "") {
      messages.push(`Cluster node ${h}: Enter memory (GB).`);
    }
    if (n.storageGb.trim() === "") {
      messages.push(`Cluster node ${h}: Enter storage (GB).`);
    }
  });
  return messages;
}

function serviceNameFieldLabelFor(flavorId: SovereignFlavorId): string {
  if (flavorId === "models") {
    return "Inference service name";
  }
  if (flavorId === "vm" || flavorId === "cluster" || flavorId === "baremetal") {
    return "Name";
  }
  const _exhaustive: never = flavorId;
  return _exhaustive;
}

/** Collects user-facing validation messages for one flavor (required fields only). */
export function validationMessagesForForm(
  flavorId: SovereignFlavorId,
  form: FormState,
): string[] {
  const messages: string[] = [];
  const layout = configureLayoutFor(flavorId);
  const nameLabel = serviceNameFieldLabelFor(flavorId);

  if (form.baseDomain.trim() === "") {
    messages.push("Enter a base domain.");
  }
  if (form.serviceName.trim() === "") {
    messages.push(`Enter ${nameLabel.toLowerCase()}.`);
  }

  if (layout === "full") {
    if (form.apiVip.trim() === "") {
      messages.push("Enter API VIP.");
    }
    if (form.ingressVip.trim() === "") {
      messages.push("Enter ingress VIP.");
    }
    if (form.machineNetwork.trim() === "") {
      messages.push("Enter machine network.");
    }
    form.hosts.forEach((host, index) => {
      const h = index + 1;
      if (host.name.trim() === "") {
        messages.push(`Host ${h}: Enter a name.`);
      }
      if (host.mac.trim() === "") {
        messages.push(`Host ${h}: Enter a MAC address.`);
      }
      if (host.ip.trim() === "") {
        messages.push(`Host ${h}: Enter the IP address.`);
      }
      if (host.rootDisk.trim() === "") {
        messages.push(`Host ${h}: Enter a root disk path.`);
      }
      if (host.redfish.trim() === "") {
        messages.push(`Host ${h}: Enter Redfish BMC address.`);
      }
      if (host.redfishUser.trim() === "") {
        messages.push(`Host ${h}: Enter Redfish user.`);
      }
      if (host.redfishPassword.trim() === "") {
        messages.push(`Host ${h}: Enter Redfish password.`);
      }
    });
  }

  if (flavorId === "vm") {
    if (form.baseUrl.trim() === "") {
      messages.push("Enter base URL.");
    }
    if (form.organization.trim() === "") {
      messages.push("Enter organization.");
    }
    if (form.storagePolicy.trim() === "") {
      messages.push("Enter storage policy.");
    }
  }

  if (flavorId === "baremetal") {
    if (form.provisioningNetwork.trim() === "") {
      messages.push("Enter provisioning network.");
    }
  }

  if (flavorId === "models") {
    if (form.modelRuntime.trim() === "") {
      messages.push("Enter model runtime.");
    }
    const anyModel =
      form.modelIbmGranite ||
      form.modelMetaLlama3 ||
      form.modelMistralAi ||
      form.modelMixtral8x7b;
    if (!anyModel) {
      messages.push("Select at least one Red Hat validated model.");
    }
    const anyGpu = form.gpuInstallNvidiaDrivers || form.gpuInstallCudaToolkit;
    if (!anyGpu) {
      messages.push("Select at least one GPU acceleration option.");
    }
  }

  if (flavorId === "cluster") {
    messages.push(...validationClusterWorkloadMessages(form));
  }

  return messages;
}

/** Validates selected configure forms (e.g. before leaving the Configure step). */
export function validateConfigureForms(
  selected: ReadonlySet<SovereignFlavorId>,
  forms: Partial<Record<SovereignFlavorId, FormState>>,
): ConfigureValidationIssue[] {
  const issues: ConfigureValidationIssue[] = [];
  const infra = infrastructureFlavorIdForConfigure(selected);

  for (const id of selected) {
    const form = mergeConfigureForm(id, forms);
    const isTriad = id === "vm" || id === "cluster" || id === "baremetal";

    if (isTriad && infra !== null && id !== infra) {
      /* Triad fields are edited only on the shared infrastructure source form */
      continue;
    }

    const messages = validationMessagesForForm(id, form);
    if (messages.length > 0) {
      issues.push({ flavorId: id, messages });
    }
  }

  if (selected.has("cluster") && infra !== "cluster") {
    const clusterForm = mergeConfigureForm("cluster", forms);
    const workloadMsgs = validationClusterWorkloadMessages(clusterForm);
    if (workloadMsgs.length > 0) {
      issues.push({ flavorId: "cluster", messages: workloadMsgs });
    }
  }

  return issues;
}

type Props = {
  flavorId: SovereignFlavorId;
  form: FormState;
  onFormChange: (next: FormState) => void;
  readOnly?: boolean;
  /** When true (after a failed “Next”), show inline errors for invalid fields. */
  showSubmitValidationErrors?: boolean;
  /** Overrides the “Basic” subsection title. */
  basicSectionTitle?: string;
  /** Overrides the service name field label (defaults to “Name” for infrastructure flavors). */
  serviceNameFieldLabelOverride?: string;
};

function FlavorConfigureReadOnlySummary({
  form,
  layout,
  id,
  flavorId,
  basicSectionTitle = "Basic",
  serviceNameFieldLabelOverride,
}: {
  form: FormState;
  layout: ConfigureLayout;
  id: (suffix: string) => string;
  flavorId: SovereignFlavorId;
  basicSectionTitle?: string;
  serviceNameFieldLabelOverride?: string;
}) {
  const row = (label: string, value: string, isRequired = false) => (
    <div key={label} className="trial-review-summary__row">
      <span className="trial-review-summary__label">
        {label}
        {isRequired ? (
          <span className="trial-review-summary__label-required" aria-hidden>
            {" "}
            *
          </span>
        ) : null}
      </span>
      <span className="trial-review-summary__value">{value}</span>
    </div>
  );

  const titleRequiredMark = (
    <span className="trial-review-summary__label-required" aria-hidden>
      {" *"}
    </span>
  );

  return (
    <div
      className="trial-configure-summary__service-block trial-review-summary"
      aria-readonly="true"
    >
      <section
        className="trial-review-summary__section"
        aria-labelledby={id("basic-heading")}
      >
        <Title
          id={id("basic-heading")}
          headingLevel="h4"
          size="md"
          className="trial-review-summary__section-title trial-configure-summary__subsection-title"
        >
          {basicSectionTitle}
          {titleRequiredMark}
        </Title>
        <div className="trial-review-summary__rows">
          {row("Base domain", form.baseDomain || "—", true)}
          {row(
            serviceNameFieldLabelOverride ?? serviceNameFieldLabelFor(flavorId),
            form.serviceName || "—",
            true,
          )}
        </div>
      </section>

      {layout === "full" ? (
        <section
          className="trial-review-summary__section"
          aria-labelledby={id("network-heading")}
        >
          <Title
            id={id("network-heading")}
            headingLevel="h4"
            size="md"
            className="trial-review-summary__section-title trial-configure-summary__subsection-title"
          >
            Network
            {titleRequiredMark}
          </Title>
          <div className="trial-review-summary__rows">
            {row("API VIP", form.apiVip || "—", true)}
            {row("Ingress VIP", form.ingressVip || "—", true)}
            {row("Machine network", form.machineNetwork || "—", true)}
          </div>
        </section>
      ) : null}

      {layout === "full" ? (
        <section
          className="trial-review-summary__section"
          aria-labelledby={id("agent-hosts-heading")}
        >
          <Title
            id={id("agent-hosts-heading")}
            headingLevel="h4"
            size="md"
            className="trial-review-summary__section-title trial-configure-summary__subsection-title"
          >
            Agent hosts
            {titleRequiredMark}
          </Title>
          <div className="trial-review-summary__hosts">
            {form.hosts.map((host, index) => (
              <div
                key={host.id}
                className="trial-review-summary__host-block"
              >
                <Title
                  headingLevel="h5"
                  size="md"
                  className="trial-review-summary__host-title trial-configure-summary__vm-host-heading"
                >
                  Host {index + 1}
                </Title>
                <div className="trial-review-summary__rows">
                  {row("Name", host.name || "—", true)}
                  {row("MAC address", host.mac || "—", true)}
                  {row("IP address", host.ip || "—", true)}
                  {row("Redfish", host.redfish || "—", true)}
                  {row("Root disk", host.rootDisk || "—", true)}
                  {row("Redfish user", host.redfishUser || "—", true)}
                  {row("Redfish password", host.redfishPassword || "—", true)}
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function EyeShowIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeHideIcon() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export function FlavorConfigureFields({
  flavorId,
  form,
  onFormChange,
  readOnly = false,
  showSubmitValidationErrors = false,
  basicSectionTitle = "Basic",
  serviceNameFieldLabelOverride,
}: Props) {
  const layout = configureLayoutFor(flavorId);
  const p = flavorId;
  const id = (suffix: string) => `trial-cfg-${p}-${suffix}`;

  const readOnlyProps = readOnly ? { readOnlyVariant: "default" as const } : {};

  const updateHost = useCallback(
    (hostId: string, patch: Partial<AgentHost>) => {
      if (readOnly) {
        return;
      }
      onFormChange({
        ...form,
        hosts: form.hosts.map((h) =>
          h.id === hostId ? { ...h, ...patch } : h,
        ),
      });
    },
    [readOnly, form, onFormChange],
  );

  const addHost = useCallback(() => {
    if (readOnly || layout !== "full") {
      return;
    }
    const triad = p as TriadFlavorId;
    const lanThird = thirdOctetFromMachineNetwork(form.machineNetwork);
    onFormChange({
      ...form,
      hosts: [
        ...form.hosts,
        makeRandomHost(triad, form.hosts.length + 1, lanThird),
      ],
    });
  }, [readOnly, layout, p, form, onFormChange]);

  const [redfishPasswordVisible, setRedfishPasswordVisible] = useState<
    Record<string, boolean>
  >({});

  if (readOnly) {
    return (
      <FlavorConfigureReadOnlySummary
        form={form}
        layout={layout}
        id={id}
        flavorId={p}
        basicSectionTitle={basicSectionTitle}
        serviceNameFieldLabelOverride={serviceNameFieldLabelOverride}
      />
    );
  }

  const serviceNameFieldLabel =
    serviceNameFieldLabelOverride ?? serviceNameFieldLabelFor(p);
  const baseDomainHelperId = id("base-domain-helper");
  const serviceNameHelperId = id("service-name-helper");
  const apiVipHelperId = id("api-vip-helper");
  const ingressVipHelperId = id("ingress-vip-helper");
  const machineNetworkHelperId = id("machine-network-helper");
  const baseMissing = form.baseDomain.trim() === "";
  const serviceMissing = form.serviceName.trim() === "";
  const apiVipMissing = form.apiVip.trim() === "";
  const ingressVipMissing = form.ingressVip.trim() === "";
  const machineNetworkMissing = form.machineNetwork.trim() === "";
  const showBaseError = showSubmitValidationErrors && baseMissing;
  const showServiceError = showSubmitValidationErrors && serviceMissing;
  const showApiVipError = showSubmitValidationErrors && apiVipMissing;
  const showIngressVipError = showSubmitValidationErrors && ingressVipMissing;
  const showMachineNetworkError = showSubmitValidationErrors && machineNetworkMissing;

  return (
    <div className="trial-configure-summary__service-block">
      <section
        className="trial-configure-summary__vm-subsection"
        role="group"
        aria-labelledby={id("basic-heading")}
      >
        <Title
          id={id("basic-heading")}
          headingLevel="h4"
          size="md"
          className="trial-configure-summary__subsection-title"
        >
          {basicSectionTitle}
        </Title>
        <div className="trial-configure-summary__vm-basic-grid">
          <FormGroup
            label="Base domain"
            fieldId={id("base-domain")}
            isRequired
          >
            <Fragment>
              <TextInput
                id={id("base-domain")}
                name={`${p}BaseDomain`}
                value={form.baseDomain}
                isRequired
                validated={showBaseError ? "error" : "default"}
                aria-invalid={showBaseError}
                aria-describedby={
                  showBaseError ? baseDomainHelperId : undefined
                }
                {...readOnlyProps}
                onChange={
                  readOnly
                    ? () => {}
                    : (_e, v) => onFormChange({ ...form, baseDomain: v })
                }
                aria-label="Base domain"
              />
              {showBaseError ? (
                <FormHelperText
                  id={baseDomainHelperId}
                  className="trial-field-helper--error"
                >
                  Enter a base domain.
                </FormHelperText>
              ) : null}
            </Fragment>
          </FormGroup>
          <FormGroup
            label={serviceNameFieldLabel}
            fieldId={id("service-name")}
            isRequired
          >
            <Fragment>
              <TextInput
                id={id("service-name")}
                name={`${p}ServiceName`}
                value={form.serviceName}
                isRequired
                validated={showServiceError ? "error" : "default"}
                aria-invalid={showServiceError}
                aria-describedby={
                  showServiceError ? serviceNameHelperId : undefined
                }
                {...readOnlyProps}
                onChange={
                  readOnly
                    ? () => {}
                    : (_e, v) => onFormChange({ ...form, serviceName: v })
                }
                aria-label={serviceNameFieldLabel}
              />
              {showServiceError ? (
                <FormHelperText
                  id={serviceNameHelperId}
                  className="trial-field-helper--error"
                >
                  Enter {serviceNameFieldLabel.toLowerCase()}.
                </FormHelperText>
              ) : null}
            </Fragment>
          </FormGroup>
        </div>
      </section>

      {layout === "full" ? (
        <section
          className="trial-configure-summary__vm-subsection"
          role="group"
          aria-labelledby={id("network-heading")}
        >
          <Title
            id={id("network-heading")}
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Network
          </Title>
          <div className="trial-configure-summary__vm-network-grid">
            <FormGroup label="API VIP" fieldId={id("api-vip")} isRequired>
              <Fragment>
                <TextInput
                  id={id("api-vip")}
                  name={`${p}ApiVip`}
                  value={form.apiVip}
                  isRequired
                  validated={showApiVipError ? "error" : "default"}
                  aria-invalid={showApiVipError}
                  aria-describedby={showApiVipError ? apiVipHelperId : undefined}
                  {...readOnlyProps}
                  onChange={
                    readOnly
                      ? () => {}
                      : (_e, v) => onFormChange({ ...form, apiVip: v })
                  }
                  aria-label="API VIP"
                />
                {showApiVipError ? (
                  <FormHelperText id={apiVipHelperId} className="trial-field-helper--error">
                    Enter API VIP.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
            <FormGroup label="Ingress VIP" fieldId={id("ingress-vip")} isRequired>
              <Fragment>
                <TextInput
                  id={id("ingress-vip")}
                  name={`${p}IngressVip`}
                  value={form.ingressVip}
                  isRequired
                  validated={showIngressVipError ? "error" : "default"}
                  aria-invalid={showIngressVipError}
                  aria-describedby={showIngressVipError ? ingressVipHelperId : undefined}
                  {...readOnlyProps}
                  onChange={
                    readOnly
                      ? () => {}
                      : (_e, v) => onFormChange({ ...form, ingressVip: v })
                  }
                  aria-label="Ingress VIP"
                />
                {showIngressVipError ? (
                  <FormHelperText id={ingressVipHelperId} className="trial-field-helper--error">
                    Enter ingress VIP.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
            <div className="trial-configure-summary__vm-network-grid__full">
              <FormGroup label="Machine network" fieldId={id("machine-network")} isRequired>
                <Fragment>
                  <TextInput
                    id={id("machine-network")}
                    name={`${p}MachineNetwork`}
                    value={form.machineNetwork}
                    isRequired
                    validated={showMachineNetworkError ? "error" : "default"}
                    aria-invalid={showMachineNetworkError}
                    aria-describedby={
                      showMachineNetworkError ? machineNetworkHelperId : undefined
                    }
                    {...readOnlyProps}
                    onChange={
                      readOnly
                        ? () => {}
                        : (_e, v) =>
                            onFormChange({ ...form, machineNetwork: v })
                    }
                    aria-label="Machine network"
                  />
                  {showMachineNetworkError ? (
                    <FormHelperText
                      id={machineNetworkHelperId}
                      className="trial-field-helper--error"
                    >
                      Enter machine network.
                    </FormHelperText>
                  ) : null}
                </Fragment>
              </FormGroup>
            </div>
          </div>
        </section>
      ) : null}

      {layout === "full" ? (
        <section
          className="trial-configure-summary__vm-subsection"
          role="group"
          aria-labelledby={id("agent-hosts-heading")}
        >
          <div className="trial-configure-summary__vm-agent-hosts-title-row">
            <Title
              id={id("agent-hosts-heading")}
              headingLevel="h4"
              size="md"
              className="trial-configure-summary__subsection-title trial-configure-summary__subsection-title--inline"
            >
              Agent hosts
            </Title>
            {!readOnly ? (
              <Button variant="secondary" type="button" onClick={addHost}>
                Add host
              </Button>
            ) : null}
          </div>
          <div className="trial-configure-summary__vm-agent-hosts">
            {form.hosts.map((host, index) => {
              const ipFieldId = `${id("host")}-${host.id}-ip`;
              const ipHelperId = `${ipFieldId}-helper`;
              const nameFieldId = `${id("host")}-${host.id}-name`;
              const nameHelperId = `${nameFieldId}-helper`;
              const macFieldId = `${id("host")}-${host.id}-mac`;
              const macHelperId = `${macFieldId}-helper`;
              const rootFieldId = `${id("host")}-${host.id}-root`;
              const rootHelperId = `${rootFieldId}-helper`;
              const nameMissing = host.name.trim() === "";
              const macMissing = host.mac.trim() === "";
              const ipMissing = host.ip.trim() === "";
              const rootMissing = host.rootDisk.trim() === "";
              const redfishFieldId = `${id("host")}-${host.id}-redfish`;
              const redfishHelperId = `${redfishFieldId}-helper`;
              const rfUserFieldId = `${id("host")}-${host.id}-rf-user`;
              const rfUserHelperId = `${rfUserFieldId}-helper`;
              const rfPassFieldId = `${id("host")}-${host.id}-rf-pass`;
              const rfPassHelperId = `${rfPassFieldId}-helper`;
              const redfishMissing = host.redfish.trim() === "";
              const redfishUserMissing = host.redfishUser.trim() === "";
              const redfishPasswordMissing = host.redfishPassword.trim() === "";
              const showNameError =
                showSubmitValidationErrors && nameMissing;
              const showMacError = showSubmitValidationErrors && macMissing;
              const showIpError = showSubmitValidationErrors && ipMissing;
              const showRootError =
                showSubmitValidationErrors && rootMissing;
              const showRedfishError =
                showSubmitValidationErrors && redfishMissing;
              const showRedfishUserError =
                showSubmitValidationErrors && redfishUserMissing;
              const showRedfishPasswordError =
                showSubmitValidationErrors && redfishPasswordMissing;
              return (
              <div key={host.id} className="trial-configure-summary__vm-host-card">
                <Title
                  headingLevel="h5"
                  size="md"
                  className="trial-configure-summary__vm-host-heading"
                >
                  Host {index + 1}
                </Title>
                <div className="trial-configure-summary__vm-host-grid">
                  <FormGroup
                    label="Name"
                    fieldId={nameFieldId}
                    isRequired
                  >
                    <Fragment>
                      <TextInput
                        id={nameFieldId}
                        value={host.name}
                        isRequired
                        validated={showNameError ? "error" : "default"}
                        aria-invalid={showNameError}
                        aria-describedby={
                          showNameError ? nameHelperId : undefined
                        }
                        {...readOnlyProps}
                        onChange={(_e, v) => updateHost(host.id, { name: v })}
                        aria-label={`Host ${index + 1} name`}
                      />
                      {showNameError ? (
                        <FormHelperText
                          id={nameHelperId}
                          className="trial-field-helper--error"
                        >
                          Enter a host name.
                        </FormHelperText>
                      ) : null}
                    </Fragment>
                  </FormGroup>
                  <FormGroup
                    label="MAC address"
                    fieldId={macFieldId}
                    isRequired
                  >
                    <Fragment>
                      <TextInput
                        id={macFieldId}
                        value={host.mac}
                        isRequired
                        validated={showMacError ? "error" : "default"}
                        aria-invalid={showMacError}
                        aria-describedby={
                          showMacError ? macHelperId : undefined
                        }
                        {...readOnlyProps}
                        onChange={(_e, v) => updateHost(host.id, { mac: v })}
                        aria-label={`Host ${index + 1} MAC address`}
                      />
                      {showMacError ? (
                        <FormHelperText
                          id={macHelperId}
                          className="trial-field-helper--error"
                        >
                          Enter a MAC address.
                        </FormHelperText>
                      ) : null}
                    </Fragment>
                  </FormGroup>
                  <FormGroup
                    label="IP address"
                    fieldId={ipFieldId}
                    isRequired
                  >
                    <Fragment>
                      <TextInput
                        id={ipFieldId}
                        value={host.ip}
                        isRequired
                        validated={showIpError ? "error" : "default"}
                        aria-invalid={showIpError}
                        aria-describedby={
                          showIpError ? ipHelperId : undefined
                        }
                        {...readOnlyProps}
                        onChange={(_e, v) =>
                          updateHost(host.id, { ip: v })
                        }
                        aria-label={`Host ${index + 1} IP address`}
                      />
                      {showIpError ? (
                        <FormHelperText
                          id={ipHelperId}
                          className="trial-field-helper--error"
                        >
                          Enter the host IP address.
                        </FormHelperText>
                      ) : null}
                    </Fragment>
                  </FormGroup>
                  <FormGroup label="Redfish" fieldId={redfishFieldId} isRequired>
                    <Fragment>
                      <TextInput
                        id={redfishFieldId}
                        value={host.redfish}
                        isRequired
                        validated={showRedfishError ? "error" : "default"}
                        aria-invalid={showRedfishError}
                        aria-describedby={showRedfishError ? redfishHelperId : undefined}
                        {...readOnlyProps}
                        onChange={(_e, v) =>
                          updateHost(host.id, { redfish: v })
                        }
                        aria-label={`Host ${index + 1} Redfish BMC address`}
                      />
                      {showRedfishError ? (
                        <FormHelperText id={redfishHelperId} className="trial-field-helper--error">
                          Enter Redfish BMC address.
                        </FormHelperText>
                      ) : null}
                    </Fragment>
                  </FormGroup>
                  <div className="trial-configure-summary__vm-host-grid__full">
                    <FormGroup
                      label="Root disk"
                      fieldId={rootFieldId}
                      isRequired
                    >
                      <Fragment>
                        <TextInput
                          id={rootFieldId}
                          value={host.rootDisk}
                          isRequired
                          validated={showRootError ? "error" : "default"}
                          aria-invalid={showRootError}
                          aria-describedby={
                            showRootError ? rootHelperId : undefined
                          }
                          {...readOnlyProps}
                          onChange={(_e, v) =>
                            updateHost(host.id, { rootDisk: v })
                          }
                          aria-label={`Host ${index + 1} root disk`}
                        />
                        {showRootError ? (
                          <FormHelperText
                            id={rootHelperId}
                            className="trial-field-helper--error"
                          >
                            Enter a root disk path.
                          </FormHelperText>
                        ) : null}
                      </Fragment>
                    </FormGroup>
                  </div>
                  <FormGroup label="Redfish user" fieldId={rfUserFieldId} isRequired>
                    <Fragment>
                      <TextInput
                        id={rfUserFieldId}
                        value={host.redfishUser}
                        isRequired
                        validated={showRedfishUserError ? "error" : "default"}
                        aria-invalid={showRedfishUserError}
                        aria-describedby={
                          showRedfishUserError ? rfUserHelperId : undefined
                        }
                        {...readOnlyProps}
                        onChange={(_e, v) =>
                          updateHost(host.id, { redfishUser: v })
                        }
                        aria-label={`Host ${index + 1} Redfish user`}
                      />
                      {showRedfishUserError ? (
                        <FormHelperText id={rfUserHelperId} className="trial-field-helper--error">
                          Enter Redfish user.
                        </FormHelperText>
                      ) : null}
                    </Fragment>
                  </FormGroup>
                  <FormGroup label="Redfish password" fieldId={rfPassFieldId} isRequired>
                    <Fragment>
                      <div className="trial-password-input-group">
                        <TextInput
                          id={rfPassFieldId}
                          className="trial-password-input-group__input"
                          type={
                            redfishPasswordVisible[host.id]
                              ? "text"
                              : "password"
                          }
                          value={host.redfishPassword}
                          isRequired
                          validated={showRedfishPasswordError ? "error" : "default"}
                          aria-invalid={showRedfishPasswordError}
                          aria-describedby={
                            showRedfishPasswordError ? rfPassHelperId : undefined
                          }
                          {...readOnlyProps}
                          onChange={(_e, v) =>
                            updateHost(host.id, { redfishPassword: v })
                          }
                          aria-label={`Host ${index + 1} Redfish password`}
                        />
                        <Button
                          type="button"
                          variant="plain"
                          className="trial-password-input-group__toggle"
                          aria-label={
                            redfishPasswordVisible[host.id]
                              ? `Hide host ${index + 1} Redfish password`
                              : `Show host ${index + 1} Redfish password`
                          }
                          aria-pressed={Boolean(redfishPasswordVisible[host.id])}
                          aria-controls={rfPassFieldId}
                          onClick={() =>
                            setRedfishPasswordVisible((prev) => ({
                              ...prev,
                              [host.id]: !prev[host.id],
                            }))
                          }
                        >
                          {redfishPasswordVisible[host.id] ? (
                            <EyeHideIcon />
                          ) : (
                            <EyeShowIcon />
                          )}
                        </Button>
                      </div>
                      {showRedfishPasswordError ? (
                        <FormHelperText id={rfPassHelperId} className="trial-field-helper--error">
                          Enter Redfish password.
                        </FormHelperText>
                      ) : null}
                    </Fragment>
                  </FormGroup>
                </div>
              </div>
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}
