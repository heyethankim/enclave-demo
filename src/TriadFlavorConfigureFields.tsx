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

/** Cluster as a Service — workload tab (nodes). */
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
  vmInstanceSmall: boolean;
  vmInstanceMedium: boolean;
  vmInstanceLarge: boolean;
  vmInstanceXLarge: boolean;
  vmInstanceGpu: boolean;
  vmOsRhel9: boolean;
  vmOsRhel8: boolean;
  vmOsFedoraCoreos: boolean;
  vmOsUbuntu2204: boolean;
  vmOsWindows2022: boolean;
  vmOsCentosStream9: boolean;
  vmDiskProvisioningType: string;
  vmDefaultDiskSize: string;
  vmNetworkMode: string;
  vmVlanEnabled: boolean;
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
  /** Cluster as a Service — workload (nodes + scaling options) */
  clusterWorkloadNodes: ClusterWorkloadNode[];
  clusterHaEnabled: boolean;
  clusterAutoscaleEnabled: boolean;
  /** Triad infrastructure — storage (full layout only) */
  storageBackend: string;
  storageDefaultClass: string;
  storageDefaultVolumeSize: string;
  storageReplicationFactor: string;
  storageVolumeBindingMode: string;
  storageFeatPvPvc: boolean;
  storageFeatEncryptionAtRest: boolean;
  storageFeatVolumeCloning: boolean;
  storageFeatVolumeSnapshots: boolean;
  storageFeatVolumeExpansion: boolean;
  storageFeatCsiDrivers: boolean;
  storagePerfIopsLimit: string;
  storagePerfThroughputLimit: string;
};

function infraStorageEmpty(): Pick<
  FormState,
  | "storageBackend"
  | "storageDefaultClass"
  | "storageDefaultVolumeSize"
  | "storageReplicationFactor"
  | "storageVolumeBindingMode"
  | "storageFeatPvPvc"
  | "storageFeatEncryptionAtRest"
  | "storageFeatVolumeCloning"
  | "storageFeatVolumeSnapshots"
  | "storageFeatVolumeExpansion"
  | "storageFeatCsiDrivers"
  | "storagePerfIopsLimit"
  | "storagePerfThroughputLimit"
> {
  return {
    storageBackend: "",
    storageDefaultClass: "",
    storageDefaultVolumeSize: "",
    storageReplicationFactor: "",
    storageVolumeBindingMode: "",
    storageFeatPvPvc: false,
    storageFeatEncryptionAtRest: false,
    storageFeatVolumeCloning: false,
    storageFeatVolumeSnapshots: false,
    storageFeatVolumeExpansion: false,
    storageFeatCsiDrivers: false,
    storagePerfIopsLimit: "",
    storagePerfThroughputLimit: "",
  };
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)] as T;
}

export const VM_DISK_PROVISIONING_OPTIONS = [
  "Thin provisioning",
  "Thick eager zeroed",
  "Thick lazy zeroed",
  "Dynamic expansion",
] as const;

export const VM_NETWORK_MODE_OPTIONS = [
  "Isolated VPC",
  "Bridged",
  "NAT",
  "Routed overlay",
  "Transparent mode",
] as const;

/** Model as a Service — inference runtime (configure + validation). */
export const MODEL_RUNTIME_OPTIONS = [
  "vLLM + NVIDIA Triton Inference Server",
  "vLLM",
  "TensorRT-LLM",
  "Text Generation Inference (TGI)",
  "OpenShift AI / KServe",
  "ONNX Runtime",
] as const;

const INFRA_STORAGE_BACKEND_OPTIONS = [
  "OpenShift Data Foundation",
  "Ceph RBD",
  "Portworx PX-Store",
  "NFS v4.2",
  "OpenEBS Mayastor",
  "NetApp Astra Trident",
] as const;

const INFRA_STORAGE_REPLICATION_OPTIONS = ["2", "3", "5"] as const;

/** Infrastructure Storage — default Kubernetes / OpenShift StorageClass names (demo presets). */
const INFRA_STORAGE_DEFAULT_CLASS_OPTIONS = [
  "ceph-block",
  "ceph-block-fast",
  "ocs-storagecluster-ceph-rbd",
  "thin",
  "gold",
  "managed-premium",
  "portworx-db-sc",
  "trident-nfs",
] as const;

/**
 * Kubernetes-style volume/disk sizes — Infrastructure default disk size and VM default disk size.
 */
export const KUBE_VOLUME_SIZE_OPTIONS = [
  "50Gi",
  "100Gi",
  "150Gi",
  "200Gi",
  "250Gi",
  "500Gi",
  "1Ti",
  "2Ti",
] as const;

/** Infrastructure Storage performance — IOPS limit presets. */
const INFRA_STORAGE_IOPS_LIMIT_OPTIONS = [
  "4000",
  "8000",
  "12000",
  "16000",
  "24000",
  "32000",
  "48000",
  "64000",
] as const;

/** Infrastructure Storage performance — throughput (aligned with prior random “N MiB/s” format). */
const INFRA_STORAGE_THROUGHPUT_LIMIT_OPTIONS = [
  "250 MiB/s",
  "400 MiB/s",
  "500 MiB/s",
  "750 MiB/s",
  "1000 MiB/s",
  "1500 MiB/s",
  "2000 MiB/s",
] as const;

const INFRA_STORAGE_BINDING_MODE_OPTIONS = [
  "Immediate",
  "WaitForFirstConsumer",
] as const;

function randomInfraStorageFields(): Pick<
  FormState,
  | "storageBackend"
  | "storageDefaultClass"
  | "storageDefaultVolumeSize"
  | "storageReplicationFactor"
  | "storageVolumeBindingMode"
  | "storageFeatPvPvc"
  | "storageFeatEncryptionAtRest"
  | "storageFeatVolumeCloning"
  | "storageFeatVolumeSnapshots"
  | "storageFeatVolumeExpansion"
  | "storageFeatCsiDrivers"
  | "storagePerfIopsLimit"
  | "storagePerfThroughputLimit"
> {
  const randBool = () => Math.random() > 0.35;
  return {
    storageBackend: pickRandom(INFRA_STORAGE_BACKEND_OPTIONS),
    storageDefaultClass: pickRandom(INFRA_STORAGE_DEFAULT_CLASS_OPTIONS),
    storageDefaultVolumeSize: pickRandom(KUBE_VOLUME_SIZE_OPTIONS),
    storageReplicationFactor: pickRandom(INFRA_STORAGE_REPLICATION_OPTIONS),
    storageVolumeBindingMode: pickRandom(INFRA_STORAGE_BINDING_MODE_OPTIONS),
    storageFeatPvPvc: randBool(),
    storageFeatEncryptionAtRest: randBool(),
    storageFeatVolumeCloning: randBool(),
    storageFeatVolumeSnapshots: randBool(),
    storageFeatVolumeExpansion: randBool(),
    storageFeatCsiDrivers: randBool(),
    storagePerfIopsLimit: pickRandom(INFRA_STORAGE_IOPS_LIMIT_OPTIONS),
    storagePerfThroughputLimit: pickRandom(INFRA_STORAGE_THROUGHPUT_LIMIT_OPTIONS),
  };
}

type VmWorkloadRandomFields = Pick<
  FormState,
  | "vmInstanceSmall"
  | "vmInstanceMedium"
  | "vmInstanceLarge"
  | "vmInstanceXLarge"
  | "vmInstanceGpu"
  | "vmOsRhel9"
  | "vmOsRhel8"
  | "vmOsFedoraCoreos"
  | "vmOsUbuntu2204"
  | "vmOsWindows2022"
  | "vmOsCentosStream9"
  | "vmDiskProvisioningType"
  | "vmDefaultDiskSize"
  | "vmNetworkMode"
  | "vmVlanEnabled"
>;

function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function randomIntInclusive(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Picks how many checkboxes to turn on, then chooses that many at random (always 1..max). */
function randomVmWorkloadFields(): VmWorkloadRandomFields {
  const instanceKeys = [
    "vmInstanceSmall",
    "vmInstanceMedium",
    "vmInstanceLarge",
    "vmInstanceXLarge",
    "vmInstanceGpu",
  ] as const satisfies readonly (keyof VmWorkloadRandomFields)[];
  const osKeys = [
    "vmOsRhel9",
    "vmOsRhel8",
    "vmOsFedoraCoreos",
    "vmOsUbuntu2204",
    "vmOsWindows2022",
    "vmOsCentosStream9",
  ] as const satisfies readonly (keyof VmWorkloadRandomFields)[];

  const pickSubset = <K extends keyof VmWorkloadRandomFields>(
    keys: readonly K[],
  ): Record<K, boolean> => {
    const picked = new Set(
      shuffleInPlace([...keys]).slice(0, randomIntInclusive(1, keys.length)),
    );
    return Object.fromEntries(keys.map((k) => [k, picked.has(k)])) as Record<
      K,
      boolean
    >;
  };

  const inst = pickSubset(instanceKeys);
  const os = pickSubset(osKeys);

  return {
    ...inst,
    ...os,
    vmDiskProvisioningType: pickRandom(VM_DISK_PROVISIONING_OPTIONS),
    vmDefaultDiskSize: pickRandom(KUBE_VOLUME_SIZE_OPTIONS),
    vmNetworkMode: pickRandom(VM_NETWORK_MODE_OPTIONS),
    vmVlanEnabled: Math.random() > 0.5,
  };
}

function workloadDefaults(): Pick<
  FormState,
  | "vmInstanceSmall"
  | "vmInstanceMedium"
  | "vmInstanceLarge"
  | "vmInstanceXLarge"
  | "vmInstanceGpu"
  | "vmOsRhel9"
  | "vmOsRhel8"
  | "vmOsFedoraCoreos"
  | "vmOsUbuntu2204"
  | "vmOsWindows2022"
  | "vmOsCentosStream9"
  | "vmDiskProvisioningType"
  | "vmDefaultDiskSize"
  | "vmNetworkMode"
  | "vmVlanEnabled"
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
  | "storageBackend"
  | "storageDefaultClass"
  | "storageDefaultVolumeSize"
  | "storageReplicationFactor"
  | "storageVolumeBindingMode"
  | "storageFeatPvPvc"
  | "storageFeatEncryptionAtRest"
  | "storageFeatVolumeCloning"
  | "storageFeatVolumeSnapshots"
  | "storageFeatVolumeExpansion"
  | "storageFeatCsiDrivers"
  | "storagePerfIopsLimit"
  | "storagePerfThroughputLimit"
> {
  return {
    vmInstanceSmall: false,
    vmInstanceMedium: false,
    vmInstanceLarge: false,
    vmInstanceXLarge: false,
    vmInstanceGpu: false,
    vmOsRhel9: false,
    vmOsRhel8: false,
    vmOsFedoraCoreos: false,
    vmOsUbuntu2204: false,
    vmOsWindows2022: false,
    vmOsCentosStream9: false,
    vmDiskProvisioningType: "",
    vmDefaultDiskSize: "",
    vmNetworkMode: "",
    vmVlanEnabled: false,
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
    ...infraStorageEmpty(),
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

/** Append a randomized agent host (same rules as Infrastructure “Add host”). */
export function appendRandomAgentHostToForm(
  form: FormState,
  flavor: TriadFlavorId,
): FormState {
  const lanThird = thirdOctetFromMachineNetwork(form.machineNetwork);
  return {
    ...form,
    hosts: [...form.hosts, makeRandomHost(flavor, form.hosts.length + 1, lanThird)],
  };
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
    Object.assign(workload, randomVmWorkloadFields());
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
    ...randomInfraStorageFields(),
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
  return {
    ...initialModelsBasic(),
    apiVip: "",
    ingressVip: "",
    machineNetwork: "",
    hosts: [],
    ...workloadDefaults(),
    modelRuntime: pickRandom(MODEL_RUNTIME_OPTIONS),
  };
}

/** Required agent host fields (used for Infrastructure hosts and workload “Host 1 / Node 1” cards). */
export function validationAgentHostFields(
  host: AgentHost | undefined,
  label: string,
): string[] {
  if (!host) {
    return [];
  }
  const p = `${label}: `;
  const messages: string[] = [];
  if (host.name.trim() === "") {
    messages.push(`${p}Enter a name.`);
  }
  if (host.mac.trim() === "") {
    messages.push(`${p}Enter a MAC address.`);
  }
  if (host.ip.trim() === "") {
    messages.push(`${p}Enter the IP address.`);
  }
  if (host.rootDisk.trim() === "") {
    messages.push(`${p}Enter a root disk path.`);
  }
  if (host.redfish.trim() === "") {
    messages.push(`${p}Enter Redfish BMC address.`);
  }
  if (host.redfishUser.trim() === "") {
    messages.push(`${p}Enter Redfish user.`);
  }
  if (host.redfishPassword.trim() === "") {
    messages.push(`${p}Enter Redfish password.`);
  }
  return messages;
}

/** When cluster workload is edited separately from infra, Node 1 maps to `hosts[0]`. */
export function validationClusterWorkloadNode1HostMessages(form: FormState): string[] {
  if (form.clusterWorkloadNodes.length === 0) {
    return [];
  }
  return validationAgentHostFields(form.hosts[0], "Node 1");
}

export function validationClusterWorkloadMessages(form: FormState): string[] {
  const messages: string[] = [];
  if (form.clusterWorkloadNodes.length === 0) {
    messages.push("Add at least one node.");
    return messages;
  }
  form.clusterWorkloadNodes.forEach((n, index) => {
    if (index === 0) {
      return;
    }
    const h = index + 1;
    if (n.name.trim() === "") {
      messages.push(`Node ${h}: Enter a node name.`);
    }
    if (!n.nodeRole || n.nodeRole.trim() === "") {
      messages.push(`Node ${h}: Select a node role.`);
    }
    if (n.cpuCores.trim() === "") {
      messages.push(`Node ${h}: Enter CPU cores.`);
    }
    if (n.memoryGb.trim() === "") {
      messages.push(`Node ${h}: Enter memory (GB).`);
    }
    if (n.storageGb.trim() === "") {
      messages.push(`Node ${h}: Enter storage (GB).`);
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
    if (form.storageBackend.trim() === "") {
      messages.push("Select a storage backend.");
    }
    if (form.storageDefaultClass.trim() === "") {
      messages.push("Select default storage class.");
    }
    if (form.storageDefaultVolumeSize.trim() === "") {
      messages.push("Select default disk size.");
    }
    if (form.storageReplicationFactor.trim() === "") {
      messages.push("Select replication factor.");
    }
    if (form.storageVolumeBindingMode.trim() === "") {
      messages.push("Select volume binding mode.");
    }
    if (form.storagePerfIopsLimit.trim() === "") {
      messages.push("Select IOPS limit.");
    }
    if (form.storagePerfThroughputLimit.trim() === "") {
      messages.push("Select throughput limit.");
    }
    form.hosts.forEach((host, index) => {
      messages.push(...validationAgentHostFields(host, `Host ${index + 1}`));
    });
  }

  if (flavorId === "vm") {
    const anyInstance =
      form.vmInstanceSmall ||
      form.vmInstanceMedium ||
      form.vmInstanceLarge ||
      form.vmInstanceXLarge ||
      form.vmInstanceGpu;
    if (!anyInstance) {
      messages.push("Select at least one default instance type.");
    }
    const anyOs =
      form.vmOsRhel9 ||
      form.vmOsRhel8 ||
      form.vmOsFedoraCoreos ||
      form.vmOsUbuntu2204 ||
      form.vmOsWindows2022 ||
      form.vmOsCentosStream9;
    if (!anyOs) {
      messages.push("Select at least one operating system image.");
    }
    if (form.vmDiskProvisioningType.trim() === "") {
      messages.push("Select disk provisioning type.");
    }
    if (form.vmDefaultDiskSize.trim() === "") {
      messages.push("Select default disk size.");
    }
    if (form.vmNetworkMode.trim() === "") {
      messages.push("Select network mode.");
    }
  }

  if (flavorId === "models") {
    if (form.modelRuntime.trim() === "") {
      messages.push("Select model runtime.");
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
    const workloadMsgs = [
      ...validationClusterWorkloadNode1HostMessages(clusterForm),
      ...validationClusterWorkloadMessages(clusterForm),
    ];
    if (workloadMsgs.length > 0) {
      issues.push({ flavorId: "cluster", messages: workloadMsgs });
    }
  }

  if (selected.has("baremetal") && infra !== "baremetal") {
    const bmForm = mergeConfigureForm("baremetal", forms);
    const bmMsgs: string[] = [];
    bmForm.hosts.forEach((host, index) => {
      bmMsgs.push(...validationAgentHostFields(host, `Host ${index + 1}`));
    });
    if (bmMsgs.length > 0) {
      issues.push({ flavorId: "baremetal", messages: bmMsgs });
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
          aria-labelledby={id("storage-heading")}
        >
          <Title
            id={id("storage-heading")}
            headingLevel="h4"
            size="md"
            className="trial-review-summary__section-title trial-configure-summary__subsection-title"
          >
            Storage
            {titleRequiredMark}
          </Title>
          <div className="trial-review-summary__rows">
            {row("Storage backend", form.storageBackend || "—", true)}
            {row("Default storage class", form.storageDefaultClass || "—", true)}
            {row("Default disk size", form.storageDefaultVolumeSize || "—", true)}
            {row("Replication factor", form.storageReplicationFactor || "—", true)}
            {row("Volume binding mode", form.storageVolumeBindingMode || "—", true)}
          </div>
          <Title headingLevel="h5" size="md" className="trial-infra-storage-subheading">
            Storage features
          </Title>
          <div className="trial-review-summary__rows">
            {row(
              "Persistent volumes (PV/PVC)",
              form.storageFeatPvPvc ? "Enabled" : "Disabled",
            )}
            {row(
              "Storage encryption at rest",
              form.storageFeatEncryptionAtRest ? "Enabled" : "Disabled",
            )}
            {row(
              "Volume cloning",
              form.storageFeatVolumeCloning ? "Enabled" : "Disabled",
            )}
            {row(
              "Volume snapshots",
              form.storageFeatVolumeSnapshots ? "Enabled" : "Disabled",
            )}
            {row(
              "Volume expansion",
              form.storageFeatVolumeExpansion ? "Enabled" : "Disabled",
            )}
            {row(
              "CSI drivers",
              form.storageFeatCsiDrivers ? "Enabled" : "Disabled",
            )}
          </div>
          <Title headingLevel="h5" size="md" className="trial-infra-storage-subheading">
            Performance options
          </Title>
          <div className="trial-review-summary__rows">
            {row("IOPS limit", form.storagePerfIopsLimit || "—", true)}
            {row("Throughput limit", form.storagePerfThroughputLimit || "—", true)}
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
    onFormChange(appendRandomAgentHostToForm(form, p as TriadFlavorId));
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

  const storageBackendHelperId = id("storage-backend-helper");
  const storageDefaultClassHelperId = id("storage-default-class-helper");
  const storageDefaultVolumeSizeHelperId = id("storage-default-volume-size-helper");
  const storageReplicationHelperId = id("storage-replication-helper");
  const storageBindingHelperId = id("storage-binding-helper");
  const storageIopsHelperId = id("storage-iops-helper");
  const storageThroughputHelperId = id("storage-throughput-helper");
  const storageBackendMissing = form.storageBackend.trim() === "";
  const storageClassMissing = form.storageDefaultClass.trim() === "";
  const storageVolSizeMissing = form.storageDefaultVolumeSize.trim() === "";
  const storageReplicationMissing = form.storageReplicationFactor.trim() === "";
  const storageBindingMissing = form.storageVolumeBindingMode.trim() === "";
  const storageIopsMissing = form.storagePerfIopsLimit.trim() === "";
  const storageThroughputMissing = form.storagePerfThroughputLimit.trim() === "";
  const showStorageBackendError =
    showSubmitValidationErrors && storageBackendMissing;
  const showStorageClassError =
    showSubmitValidationErrors && storageClassMissing;
  const showStorageVolSizeError =
    showSubmitValidationErrors && storageVolSizeMissing;
  const showStorageReplicationError =
    showSubmitValidationErrors && storageReplicationMissing;
  const showStorageBindingError =
    showSubmitValidationErrors && storageBindingMissing;
  const showStorageIopsError =
    showSubmitValidationErrors && storageIopsMissing;
  const showStorageThroughputError =
    showSubmitValidationErrors && storageThroughputMissing;

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
          aria-labelledby={id("storage-heading")}
        >
          <Title
            id={id("storage-heading")}
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Storage
          </Title>
          <div className="trial-configure-summary__vm-network-grid">
            <FormGroup label="Storage backend" fieldId={id("storage-backend")} isRequired>
              <Fragment>
                <select
                  id={id("storage-backend")}
                  className="pf-v6-c-form-control trial-configure-foundation__select"
                  aria-invalid={showStorageBackendError}
                  aria-describedby={
                    showStorageBackendError ? storageBackendHelperId : undefined
                  }
                  value={form.storageBackend}
                  onChange={(e) =>
                    onFormChange({ ...form, storageBackend: e.currentTarget.value })
                  }
                >
                  <option value="">Select backend</option>
                  {INFRA_STORAGE_BACKEND_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showStorageBackendError ? (
                  <FormHelperText
                    id={storageBackendHelperId}
                    className="trial-field-helper--error"
                  >
                    Select a storage backend.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
            <FormGroup
              label="Default storage class"
              fieldId={id("storage-default-class")}
              isRequired
            >
              <Fragment>
                <select
                  id={id("storage-default-class")}
                  className="pf-v6-c-form-control trial-configure-foundation__select"
                  aria-invalid={showStorageClassError}
                  aria-describedby={
                    showStorageClassError ? storageDefaultClassHelperId : undefined
                  }
                  value={form.storageDefaultClass}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      storageDefaultClass: e.currentTarget.value,
                    })
                  }
                  aria-label="Default storage class"
                >
                  <option value="">Select default storage class</option>
                  {INFRA_STORAGE_DEFAULT_CLASS_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showStorageClassError ? (
                  <FormHelperText
                    id={storageDefaultClassHelperId}
                    className="trial-field-helper--error"
                  >
                    Select default storage class.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
            <FormGroup
              label="Default disk size"
              fieldId={id("storage-default-volume-size")}
              isRequired
            >
              <Fragment>
                <select
                  id={id("storage-default-volume-size")}
                  className="pf-v6-c-form-control trial-configure-foundation__select"
                  aria-invalid={showStorageVolSizeError}
                  aria-describedby={
                    showStorageVolSizeError
                      ? storageDefaultVolumeSizeHelperId
                      : undefined
                  }
                  value={form.storageDefaultVolumeSize}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      storageDefaultVolumeSize: e.currentTarget.value,
                    })
                  }
                  aria-label="Default disk size"
                >
                  <option value="">Select default disk size</option>
                  {KUBE_VOLUME_SIZE_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showStorageVolSizeError ? (
                  <FormHelperText
                    id={storageDefaultVolumeSizeHelperId}
                    className="trial-field-helper--error"
                  >
                    Select default disk size.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
            <FormGroup
              label="Replication factor"
              fieldId={id("storage-replication")}
              isRequired
            >
              <Fragment>
                <select
                  id={id("storage-replication")}
                  className="pf-v6-c-form-control trial-configure-foundation__select"
                  aria-invalid={showStorageReplicationError}
                  aria-describedby={
                    showStorageReplicationError ? storageReplicationHelperId : undefined
                  }
                  value={form.storageReplicationFactor}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      storageReplicationFactor: e.currentTarget.value,
                    })
                  }
                >
                  <option value="">Select replication</option>
                  {INFRA_STORAGE_REPLICATION_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showStorageReplicationError ? (
                  <FormHelperText
                    id={storageReplicationHelperId}
                    className="trial-field-helper--error"
                  >
                    Select replication factor.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
            <div className="trial-infra-storage-binding-mode">
              <FormGroup
                label="Volume binding mode"
                fieldId={id("storage-binding-mode")}
                isRequired
              >
                <Fragment>
                  <select
                    id={id("storage-binding-mode")}
                    className="pf-v6-c-form-control trial-configure-foundation__select"
                    aria-invalid={showStorageBindingError}
                    aria-describedby={
                      showStorageBindingError ? storageBindingHelperId : undefined
                    }
                    value={form.storageVolumeBindingMode}
                    onChange={(e) =>
                      onFormChange({
                        ...form,
                        storageVolumeBindingMode: e.currentTarget.value,
                      })
                    }
                  >
                    <option value="">Select binding mode</option>
                    {INFRA_STORAGE_BINDING_MODE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                  {showStorageBindingError ? (
                    <FormHelperText
                      id={storageBindingHelperId}
                      className="trial-field-helper--error"
                    >
                      Select volume binding mode.
                    </FormHelperText>
                  ) : null}
                </Fragment>
              </FormGroup>
            </div>
          </div>

          <Title
            headingLevel="h5"
            size="md"
            className="trial-infra-storage-subheading"
          >
            Storage features
          </Title>
          <div className="trial-infra-storage-features">
            <label className="trial-workload-checkbox-row" htmlFor={id("storage-feat-pv")}>
              <input
                id={id("storage-feat-pv")}
                type="checkbox"
                className="trial-workload-checkbox-row__input"
                checked={form.storageFeatPvPvc}
                onChange={(e) =>
                  onFormChange({ ...form, storageFeatPvPvc: e.target.checked })
                }
              />
              <span className="trial-workload-checkbox-row__label">
                Enable persistent volumes (PV/PVC support)
              </span>
            </label>
            <label
              className="trial-workload-checkbox-row"
              htmlFor={id("storage-feat-encrypt")}
            >
              <input
                id={id("storage-feat-encrypt")}
                type="checkbox"
                className="trial-workload-checkbox-row__input"
                checked={form.storageFeatEncryptionAtRest}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    storageFeatEncryptionAtRest: e.target.checked,
                  })
                }
              />
              <span className="trial-workload-checkbox-row__label">
                Enable storage encryption at rest
              </span>
            </label>
            <label className="trial-workload-checkbox-row" htmlFor={id("storage-feat-clone")}>
              <input
                id={id("storage-feat-clone")}
                type="checkbox"
                className="trial-workload-checkbox-row__input"
                checked={form.storageFeatVolumeCloning}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    storageFeatVolumeCloning: e.target.checked,
                  })
                }
              />
              <span className="trial-workload-checkbox-row__label">
                Enable volume cloning (fast volume copies)
              </span>
            </label>
            <label
              className="trial-workload-checkbox-row"
              htmlFor={id("storage-feat-snap")}
            >
              <input
                id={id("storage-feat-snap")}
                type="checkbox"
                className="trial-workload-checkbox-row__input"
                checked={form.storageFeatVolumeSnapshots}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    storageFeatVolumeSnapshots: e.target.checked,
                  })
                }
              />
              <span className="trial-workload-checkbox-row__label">
                Enable volume snapshots (backup and restore)
              </span>
            </label>
            <label className="trial-workload-checkbox-row" htmlFor={id("storage-feat-expand")}>
              <input
                id={id("storage-feat-expand")}
                type="checkbox"
                className="trial-workload-checkbox-row__input"
                checked={form.storageFeatVolumeExpansion}
                onChange={(e) =>
                  onFormChange({
                    ...form,
                    storageFeatVolumeExpansion: e.target.checked,
                  })
                }
              />
              <span className="trial-workload-checkbox-row__label">
                Allow volume expansion (resize volumes dynamically)
              </span>
            </label>
            <label className="trial-workload-checkbox-row" htmlFor={id("storage-feat-csi")}>
              <input
                id={id("storage-feat-csi")}
                type="checkbox"
                className="trial-workload-checkbox-row__input"
                checked={form.storageFeatCsiDrivers}
                onChange={(e) =>
                  onFormChange({ ...form, storageFeatCsiDrivers: e.target.checked })
                }
              />
              <span className="trial-workload-checkbox-row__label">
                Enable CSI (Container Storage Interface) drivers
              </span>
            </label>
          </div>

          <Title
            headingLevel="h5"
            size="md"
            className="trial-infra-storage-subheading"
          >
            Performance options
          </Title>
          <div className="trial-infra-storage-perf-grid">
            <FormGroup label="IOPS limit" fieldId={id("storage-iops")} isRequired>
              <Fragment>
                <select
                  id={id("storage-iops")}
                  className="pf-v6-c-form-control trial-configure-foundation__select"
                  aria-invalid={showStorageIopsError}
                  aria-describedby={
                    showStorageIopsError ? storageIopsHelperId : undefined
                  }
                  value={form.storagePerfIopsLimit}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      storagePerfIopsLimit: e.currentTarget.value,
                    })
                  }
                  aria-label="IOPS limit"
                >
                  <option value="">Select IOPS limit</option>
                  {INFRA_STORAGE_IOPS_LIMIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showStorageIopsError ? (
                  <FormHelperText
                    id={storageIopsHelperId}
                    className="trial-field-helper--error"
                  >
                    Select IOPS limit.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
            <FormGroup
              label="Throughput limit"
              fieldId={id("storage-throughput")}
              isRequired
            >
              <Fragment>
                <select
                  id={id("storage-throughput")}
                  className="pf-v6-c-form-control trial-configure-foundation__select"
                  aria-invalid={showStorageThroughputError}
                  aria-describedby={
                    showStorageThroughputError
                      ? storageThroughputHelperId
                      : undefined
                  }
                  value={form.storagePerfThroughputLimit}
                  onChange={(e) =>
                    onFormChange({
                      ...form,
                      storagePerfThroughputLimit: e.currentTarget.value,
                    })
                  }
                  aria-label="Throughput limit"
                >
                  <option value="">Select throughput limit</option>
                  {INFRA_STORAGE_THROUGHPUT_LIMIT_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                {showStorageThroughputError ? (
                  <FormHelperText
                    id={storageThroughputHelperId}
                    className="trial-field-helper--error"
                  >
                    Select throughput limit.
                  </FormHelperText>
                ) : null}
              </Fragment>
            </FormGroup>
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
