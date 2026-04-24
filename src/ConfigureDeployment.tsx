import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  EmptyState,
  EmptyStateBody,
  FormGroup,
  FormHelperText,
  List,
  ListComponent,
  ListItem,
  ProgressStep,
  ProgressStepper,
  SkipToContent,
  TextInput,
  Title,
} from "@patternfly/react-core";
import { getSelectedSovereignFlavorsForSummary } from "./SovereignFlavorCards";
import type { SovereignFlavorId } from "./SovereignFlavorCards";
import type {
  AgentHost,
  ClusterWorkloadNode,
  ConfigureValidationIssue,
  FormState,
} from "./TriadFlavorConfigureFields";
import {
  appendRandomAgentHostToForm,
  createClusterWorkloadNode,
  FlavorConfigureFields,
  infrastructureFlavorIdForConfigure,
  mergeConfigureForm,
  VM_DISK_PROVISIONING_OPTIONS,
  VM_NETWORK_MODE_OPTIONS,
} from "./TriadFlavorConfigureFields";
import { CheckIcon, EnterpriseIcon } from "@patternfly/react-icons";
import { AiFlavorIcon, ClusterFlavorIcon, CubesFlavorIcon } from "./FlavorCardIcons";
import type { SecureComplyState } from "./SecureComplyStep";
import { SecureComplyReadOnlySummary } from "./SecureComplyReadOnlySummary";
import { AgentHostWorkloadCard } from "./AgentHostWorkloadCard";
import { publicAssetUrl } from "./publicAssetUrl";
import { scrollTrialWizardMainToTop } from "./scrollTrialWizardMain";

type Props = {
  selected: ReadonlySet<SovereignFlavorId>;
  forms: Partial<Record<SovereignFlavorId, FormState>>;
  onFormChange: (id: SovereignFlavorId, form: FormState) => void;
  readOnly?: boolean;
  /** When set with `readOnly`, appends Security & Compliance to the stacked review (Review step). */
  secureComply?: SecureComplyState;
  configureValidationIssues?: ConfigureValidationIssue[];
  configureValidationFocusNonce?: number;
  showSubmitValidationErrors?: boolean;
  /** Edit mode only: `true` after the user finishes the last configure sub-step (Completed). */
  onConfigureSubstepsCompletionChange?: (complete: boolean) => void;
};

function sectionHintForFlavor(
  flavorId: SovereignFlavorId,
  rows: ReturnType<typeof getSelectedSovereignFlavorsForSummary>,
): string {
  if (flavorId === "vm" || flavorId === "baremetal") {
    return "Infrastructure";
  }
  if (flavorId === "cluster") {
    return "Cluster as a Service";
  }
  const row = rows.find((r) => r.id === flavorId);
  return row?.fullTitle ?? flavorId;
}

/** Workload sub-steps follow the same order as the former combined Workload tab. */
const WORKLOAD_CONFIGURE_ORDER: SovereignFlavorId[] = [
  "vm",
  "cluster",
  "models",
  "baremetal",
];

type ConfigureEditorStep =
  | { kind: "infrastructure" }
  | { kind: "workload"; flavor: SovereignFlavorId };

function buildConfigureEditorSteps(
  selected: ReadonlySet<SovereignFlavorId>,
  infraId: SovereignFlavorId | null,
): ConfigureEditorStep[] {
  const steps: ConfigureEditorStep[] = [];
  if (infraId != null) {
    steps.push({ kind: "infrastructure" });
  }
  for (const flavor of WORKLOAD_CONFIGURE_ORDER) {
    if (selected.has(flavor)) {
      steps.push({ kind: "workload", flavor });
    }
  }
  return steps;
}

function editorStepTitle(
  step: ConfigureEditorStep,
  rows: ReturnType<typeof getSelectedSovereignFlavorsForSummary>,
): string {
  if (step.kind === "infrastructure") {
    return "Infrastructure";
  }
  return rows.find((r) => r.id === step.flavor)?.fullTitle ?? step.flavor;
}

/** Progress stepper row title — same as `editorStepTitle` without trailing “ as a Service”. */
function progressStepperStepTitle(
  step: ConfigureEditorStep,
  rows: ReturnType<typeof getSelectedSovereignFlavorsForSummary>,
): string {
  return editorStepTitle(step, rows).replace(/\s+as a Service$/i, "");
}

/** Maps validation issues to the first matching configure sub-step (infra vs cluster workload, etc.). */
function firstEditorStepIndexWithValidationIssue(
  steps: ConfigureEditorStep[],
  issues: ConfigureValidationIssue[],
  infraId: SovereignFlavorId | null,
): number {
  for (const issue of issues) {
    const { flavorId, messages } = issue;
    const infraStepIdx = steps.findIndex((s) => s.kind === "infrastructure");
    const clusterWorkloadIdx = steps.findIndex(
      (s) => s.kind === "workload" && s.flavor === "cluster",
    );

    if (infraId != null && flavorId === infraId) {
      if (flavorId === "cluster") {
        const isClusterWorkloadValidationMessage = (m: string) =>
          m.includes("Add at least one node") || /^Node \d+: /.test(m);
        const hasInfraMessage = messages.some(
          (m) => !isClusterWorkloadValidationMessage(m),
        );
        const hasWorkloadMessage = messages.some(isClusterWorkloadValidationMessage);
        if (hasInfraMessage && infraStepIdx >= 0) {
          return infraStepIdx;
        }
        if (hasWorkloadMessage && clusterWorkloadIdx >= 0) {
          return clusterWorkloadIdx;
        }
        if (infraStepIdx >= 0) {
          return infraStepIdx;
        }
        if (clusterWorkloadIdx >= 0) {
          return clusterWorkloadIdx;
        }
        continue;
      }
      if (infraStepIdx >= 0) {
        return infraStepIdx;
      }
    }

    const workloadIdx = steps.findIndex(
      (s) => s.kind === "workload" && s.flavor === flavorId,
    );
    if (workloadIdx >= 0) {
      return workloadIdx;
    }
  }
  return -1;
}

const CLUSTER_NODE_ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "control-plane", label: "Control plane" },
  { value: "worker", label: "Worker" },
  { value: "infra", label: "Infra" },
];

type VmOsImageOptionKey =
  | "vmOsRhel9"
  | "vmOsRhel8"
  | "vmOsFedoraCoreos"
  | "vmOsUbuntu2204"
  | "vmOsWindows2022"
  | "vmOsCentosStream9";

const VM_OS_IMAGE_OPTIONS: {
  id: string;
  key: VmOsImageOptionKey;
  label: string;
  logoSrc: string;
}[] = [
  {
    id: "trial-vm-os-rhel9",
    key: "vmOsRhel9",
    label: "Red Hat Enterprise Linux 9",
    logoSrc: publicAssetUrl("os-logos/redhat-hat.svg"),
  },
  {
    id: "trial-vm-os-rhel8",
    key: "vmOsRhel8",
    label: "Red Hat Enterprise Linux 8",
    logoSrc: publicAssetUrl("os-logos/redhat-hat.svg"),
  },
  {
    id: "trial-vm-os-fcos",
    key: "vmOsFedoraCoreos",
    label: "Fedora CoreOS",
    logoSrc: publicAssetUrl("os-logos/fedora.png"),
  },
  {
    id: "trial-vm-os-ubuntu2204",
    key: "vmOsUbuntu2204",
    label: "Ubuntu 22.04 LTS",
    logoSrc: publicAssetUrl("os-logos/ubuntu.png"),
  },
  {
    id: "trial-vm-os-win2022",
    key: "vmOsWindows2022",
    label: "Windows Server 2022",
    logoSrc: publicAssetUrl("os-logos/windows.png"),
  },
  {
    id: "trial-vm-os-centos9",
    key: "vmOsCentosStream9",
    label: "CentOS Stream 9",
    logoSrc: publicAssetUrl("os-logos/centos-stream.png"),
  },
];

type ModelsValidatedCheckboxKey =
  | "modelIbmGranite"
  | "modelMetaLlama3"
  | "modelMistralAi"
  | "modelMixtral8x7b";

const MODELS_VALIDATED_CHECKBOX_OPTIONS: {
  id: string;
  key: ModelsValidatedCheckboxKey;
  label: string;
  logoSrc: string;
}[] = [
  {
    id: "trial-model-granite",
    key: "modelIbmGranite",
    label: "IBM Granite",
    logoSrc: publicAssetUrl("model-logos/ibm-granite.png"),
  },
  {
    id: "trial-model-llama",
    key: "modelMetaLlama3",
    label: "Meta Llama 3",
    logoSrc: publicAssetUrl("model-logos/meta-llama.png"),
  },
  {
    id: "trial-model-mistral",
    key: "modelMistralAi",
    label: "Mistral AI",
    logoSrc: publicAssetUrl("model-logos/mistral.png"),
  },
  {
    id: "trial-model-mixtral",
    key: "modelMixtral8x7b",
    label: "Mixtral 8x7B",
    logoSrc: publicAssetUrl("model-logos/mixtral.png"),
  },
];

type ModelsGpuCheckboxKey = "gpuInstallNvidiaDrivers" | "gpuInstallCudaToolkit";

const MODELS_GPU_CHECKBOX_OPTIONS: {
  id: string;
  key: ModelsGpuCheckboxKey;
  label: string;
  logoSrc: string;
}[] = [
  {
    id: "trial-model-gpu-nvidia",
    key: "gpuInstallNvidiaDrivers",
    label: "Install NVIDIA GPU Drivers",
    logoSrc: publicAssetUrl("model-logos/nvidia.png"),
  },
  {
    id: "trial-model-gpu-cuda",
    key: "gpuInstallCudaToolkit",
    label: "Install CUDA Toolkit",
    logoSrc: publicAssetUrl("model-logos/cuda.png"),
  },
];

function clusterNodeRoleLabel(value: string): string {
  const opt = CLUSTER_NODE_ROLE_OPTIONS.find((o) => o.value === value);
  if (opt) return opt.label;
  return value.trim() || "—";
}

/** Red asterisk for configure copy outside FormGroup labels (checkbox section headings). */
function TrialConfigureRequiredMark() {
  return (
    <span className="trial-configure-required-mark" aria-hidden>
      {" *"}
    </span>
  );
}

/** Red asterisk on Review step read-only labels (matches `trial-review-summary__label-required`). */
function TrialReviewRequiredMark() {
  return (
    <span className="trial-review-summary__label-required" aria-hidden>
      {" *"}
    </span>
  );
}

type WorkloadProps = {
  readOnly: boolean;
  form: FormState;
  onChange: (next: FormState) => void;
  showSubmitValidationErrors?: boolean;
};

function ClusterWorkloadBlock({
  readOnly,
  form,
  onChange,
  showSubmitValidationErrors = false,
}: WorkloadProps) {
  const ro = readOnly ? ({ readOnlyVariant: "default" as const } satisfies {
    readOnlyVariant: "default";
  }) : {};
  const [redfishPasswordVisible, setRedfishPasswordVisible] = useState<
    Record<string, boolean>
  >({});

  const updateHost = (hostId: string, patch: Partial<AgentHost>) => {
    onChange({
      ...form,
      hosts: form.hosts.map((h) => (h.id === hostId ? { ...h, ...patch } : h)),
    });
  };

  const updateNode = (nodeId: string, patch: Partial<ClusterWorkloadNode>) => {
    onChange({
      ...form,
      clusterWorkloadNodes: form.clusterWorkloadNodes.map((n) =>
        n.id === nodeId ? { ...n, ...patch } : n,
      ),
    });
  };

  const addNode = () => {
    const idx = form.clusterWorkloadNodes.length;
    onChange({
      ...form,
      clusterWorkloadNodes: [...form.clusterWorkloadNodes, createClusterWorkloadNode(idx)],
    });
  };

  return (
    <section
      className="trial-configure-foundation__subsection"
      aria-labelledby="trial-workload-cluster-heading"
    >
      <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
        <span className="trial-configure-workload__subsection-icon" aria-hidden>
          <ClusterFlavorIcon />
        </span>
        <Title
          id="trial-workload-cluster-heading"
          headingLevel="h3"
          size="lg"
          className="trial-configure-foundation__service-title"
        >
          Cluster as a Service
        </Title>
      </div>

      <div className="trial-configure-service-rail-body">
        <div className="trial-configure-summary__vm-agent-hosts-title-row">
          <Title
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title trial-configure-summary__subsection-title--inline"
          >
            Nodes
          </Title>
          {!readOnly ? (
            <Button variant="secondary" type="button" onClick={addNode}>
              Add node
            </Button>
          ) : null}
        </div>
        <Alert
          variant="info"
          isInline
          className="trial-cluster-workload-day2-alert"
          title="Manage your cluster anytime"
        >
          You can add, remove, or modify nodes at any time after deployment through the
          management interface. This allows you to scale and update your infrastructure without
          downtime.
        </Alert>
      <div className="trial-configure-summary__vm-agent-hosts">
        {form.clusterWorkloadNodes.map((node, index) => {
          const host0 = form.hosts[0];
          if (index === 0 && host0) {
            return (
              <div key={node.id} className="trial-configure-summary__vm-host-card">
                <Title
                  headingLevel="h5"
                  size="md"
                  className="trial-configure-summary__vm-host-heading"
                >
                  Node 1
                </Title>
                <AgentHostWorkloadCard
                  host={host0}
                  idPrefix="trial-cluster-wl-host"
                  hostLabelForAria="Node 1"
                  readOnly={readOnly}
                  showSubmitValidationErrors={showSubmitValidationErrors}
                  onUpdateHost={(patch) => updateHost(host0.id, patch)}
                  passwordVisible={Boolean(redfishPasswordVisible[host0.id])}
                  onTogglePassword={() =>
                    setRedfishPasswordVisible((prev) => ({
                      ...prev,
                      [host0.id]: !prev[host0.id],
                    }))
                  }
                />
              </div>
            );
          }

          const nameFieldId = `trial-cluster-node-${node.id}-name`;
          const nameHelperId = `${nameFieldId}-helper`;
          const roleFieldId = `trial-cluster-node-${node.id}-role`;
          const roleHelperId = `${roleFieldId}-helper`;
          const cpuFieldId = `trial-cluster-node-${node.id}-cpu`;
          const cpuHelperId = `${cpuFieldId}-helper`;
          const memFieldId = `trial-cluster-node-${node.id}-mem`;
          const memHelperId = `${memFieldId}-helper`;
          const storFieldId = `trial-cluster-node-${node.id}-stor`;
          const storHelperId = `${storFieldId}-helper`;
          const nameMissing = node.name.trim() === "";
          const roleMissing = !node.nodeRole || node.nodeRole.trim() === "";
          const cpuMissing = node.cpuCores.trim() === "";
          const memMissing = node.memoryGb.trim() === "";
          const storMissing = node.storageGb.trim() === "";
          const showNameErr = showSubmitValidationErrors && nameMissing;
          const showRoleErr = showSubmitValidationErrors && roleMissing;
          const showCpuErr = showSubmitValidationErrors && cpuMissing;
          const showMemErr = showSubmitValidationErrors && memMissing;
          const showStorErr = showSubmitValidationErrors && storMissing;
          return (
            <div key={node.id} className="trial-configure-summary__vm-host-card">
              <Title
                headingLevel="h5"
                size="md"
                className="trial-configure-summary__vm-host-heading"
              >
                Node {index + 1}
              </Title>
              <div className="trial-configure-summary__vm-host-grid">
                <FormGroup label="Node name" fieldId={nameFieldId} isRequired>
                  <Fragment>
                    <TextInput
                      id={nameFieldId}
                      value={node.name}
                      isRequired
                      validated={showNameErr ? "error" : "default"}
                      aria-invalid={showNameErr}
                      aria-describedby={showNameErr ? nameHelperId : undefined}
                      {...ro}
                      onChange={
                        readOnly
                          ? () => {}
                          : (_e, v) => updateNode(node.id, { name: v })
                      }
                      aria-label={`Node ${index + 1} name`}
                    />
                    {showNameErr ? (
                      <FormHelperText id={nameHelperId} className="trial-field-helper--error">
                        Enter a node name.
                      </FormHelperText>
                    ) : null}
                  </Fragment>
                </FormGroup>
                <FormGroup label="Node role" fieldId={roleFieldId} isRequired>
                  <Fragment>
                    <select
                      id={roleFieldId}
                      className="trial-configure-foundation__select pf-v6-c-form-control"
                      value={node.nodeRole}
                      disabled={readOnly}
                      aria-invalid={showRoleErr}
                      aria-describedby={showRoleErr ? roleHelperId : undefined}
                      aria-label={`Node ${index + 1} role`}
                      onChange={
                        readOnly
                          ? undefined
                          : (e) => updateNode(node.id, { nodeRole: e.target.value })
                      }
                    >
                      {CLUSTER_NODE_ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    {showRoleErr ? (
                      <FormHelperText id={roleHelperId} className="trial-field-helper--error">
                        Select a node role.
                      </FormHelperText>
                    ) : null}
                  </Fragment>
                </FormGroup>
                <FormGroup label="CPU cores" fieldId={cpuFieldId} isRequired>
                  <Fragment>
                    <TextInput
                      id={cpuFieldId}
                      value={node.cpuCores}
                      isRequired
                      validated={showCpuErr ? "error" : "default"}
                      aria-invalid={showCpuErr}
                      aria-describedby={showCpuErr ? cpuHelperId : undefined}
                      {...ro}
                      onChange={
                        readOnly
                          ? () => {}
                          : (_e, v) => updateNode(node.id, { cpuCores: v })
                      }
                      aria-label={`Node ${index + 1} CPU cores`}
                    />
                    {showCpuErr ? (
                      <FormHelperText id={cpuHelperId} className="trial-field-helper--error">
                        Enter CPU cores.
                      </FormHelperText>
                    ) : null}
                  </Fragment>
                </FormGroup>
                <FormGroup label="Memory (GB)" fieldId={memFieldId} isRequired>
                  <Fragment>
                    <TextInput
                      id={memFieldId}
                      value={node.memoryGb}
                      isRequired
                      validated={showMemErr ? "error" : "default"}
                      aria-invalid={showMemErr}
                      aria-describedby={showMemErr ? memHelperId : undefined}
                      {...ro}
                      onChange={
                        readOnly
                          ? () => {}
                          : (_e, v) => updateNode(node.id, { memoryGb: v })
                      }
                      aria-label={`Node ${index + 1} memory in GB`}
                    />
                    {showMemErr ? (
                      <FormHelperText id={memHelperId} className="trial-field-helper--error">
                        Enter memory (GB).
                      </FormHelperText>
                    ) : null}
                  </Fragment>
                </FormGroup>
                <div className="trial-configure-summary__vm-host-grid__full">
                  <FormGroup label="Storage (GB)" fieldId={storFieldId} isRequired>
                    <Fragment>
                      <TextInput
                        id={storFieldId}
                        value={node.storageGb}
                        isRequired
                        validated={showStorErr ? "error" : "default"}
                        aria-invalid={showStorErr}
                        aria-describedby={showStorErr ? storHelperId : undefined}
                        {...ro}
                        onChange={
                          readOnly
                            ? () => {}
                            : (_e, v) => updateNode(node.id, { storageGb: v })
                        }
                        aria-label={`Node ${index + 1} storage in GB`}
                      />
                      {showStorErr ? (
                        <FormHelperText id={storHelperId} className="trial-field-helper--error">
                          Enter storage (GB).
                        </FormHelperText>
                      ) : null}
                    </Fragment>
                  </FormGroup>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <p className="trial-configure-foundation__muted-label">
        Scaling
        <TrialConfigureRequiredMark />
      </p>
      <div
        className="trial-workload-model-checkboxes"
        role="group"
        aria-label="Cluster scaling options"
      >
        <label className="trial-workload-checkbox-row" htmlFor="trial-cluster-autoscale">
          <input
            id="trial-cluster-autoscale"
            type="checkbox"
            className="trial-workload-checkbox-row__input"
            checked={form.clusterAutoscaleEnabled}
            disabled={readOnly}
            onChange={(e) =>
              onChange({ ...form, clusterAutoscaleEnabled: e.target.checked })
            }
          />
          <span className="trial-workload-checkbox-row__label">
            Enable auto-scaling (automatically add/remove nodes based on load)
          </span>
        </label>
      </div>

      </div>
    </section>
  );
}

function VmWorkloadBlock({
  readOnly,
  form,
  onChange,
  showSubmitValidationErrors = false,
}: WorkloadProps) {
  const ro = readOnly ? ({ readOnlyVariant: "default" as const } satisfies {
    readOnlyVariant: "default";
  }) : {};
  const anyInstance =
    form.vmInstanceSmall ||
    form.vmInstanceMedium ||
    form.vmInstanceLarge ||
    form.vmInstanceXLarge ||
    form.vmInstanceGpu;
  const anyOs =
    form.vmOsRhel9 ||
    form.vmOsRhel8 ||
    form.vmOsFedoraCoreos ||
    form.vmOsUbuntu2204 ||
    form.vmOsWindows2022 ||
    form.vmOsCentosStream9;
  const diskTypeMissing = form.vmDiskProvisioningType.trim() === "";
  const diskSizeMissing = form.vmDefaultDiskSize.trim() === "";
  const netModeMissing = form.vmNetworkMode.trim() === "";
  const showInstanceErr = showSubmitValidationErrors && !anyInstance;
  const showOsErr = showSubmitValidationErrors && !anyOs;
  const showDiskTypeErr = showSubmitValidationErrors && diskTypeMissing;
  const showDiskSizeErr = showSubmitValidationErrors && diskSizeMissing;
  const showNetModeErr = showSubmitValidationErrors && netModeMissing;
  const instanceHelperId = "trial-workload-vm-instance-types-helper";
  const osHelperId = "trial-workload-vm-os-images-helper";
  const diskTypeHelperId = "trial-workload-vm-disk-type-helper";
  const diskSizeHelperId = "trial-workload-vm-disk-size-helper";
  const netModeHelperId = "trial-workload-vm-net-mode-helper";
  const toggle = (key: keyof FormState, checked: boolean) => {
    onChange({ ...form, [key]: checked } as FormState);
  };
  const checkboxRow = (id: string, label: string, key: keyof FormState, checked: boolean) => (
    <label key={id} className="trial-workload-checkbox-row" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="trial-workload-checkbox-row__input"
        checked={checked}
        disabled={readOnly}
        onChange={(e) => toggle(key, e.target.checked)}
      />
      <span className="trial-workload-checkbox-row__label">{label}</span>
    </label>
  );
  return (
    <section
      className="trial-configure-foundation__subsection"
      aria-labelledby="trial-workload-vm-heading"
    >
      <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
        <span className="trial-configure-workload__subsection-icon" aria-hidden>
          <CubesFlavorIcon />
        </span>
        <Title
          id="trial-workload-vm-heading"
          headingLevel="h3"
          size="lg"
          className="trial-configure-foundation__service-title"
        >
          VM as a Service
        </Title>
      </div>
      <div
        className="trial-configure-service-rail-body"
        role="group"
        aria-label="VM as a Service workload settings"
      >
        <p
          className="trial-configure-foundation__muted-label"
          id="trial-workload-vm-instance-types-label"
        >
          Default instance types
          <TrialConfigureRequiredMark />
        </p>
        <div
          className="trial-workload-model-checkboxes"
          role="group"
          aria-labelledby="trial-workload-vm-instance-types-label"
          aria-invalid={showInstanceErr}
          aria-describedby={showInstanceErr ? instanceHelperId : undefined}
        >
          {checkboxRow(
            "trial-vm-inst-small",
            "Small (2 vCPU, 4 GB RAM)",
            "vmInstanceSmall",
            form.vmInstanceSmall,
          )}
          {checkboxRow(
            "trial-vm-inst-medium",
            "Medium (4 vCPU, 8 GB RAM)",
            "vmInstanceMedium",
            form.vmInstanceMedium,
          )}
          {checkboxRow(
            "trial-vm-inst-large",
            "Large (8 vCPU, 16 GB RAM)",
            "vmInstanceLarge",
            form.vmInstanceLarge,
          )}
          {checkboxRow(
            "trial-vm-inst-xlarge",
            "X-Large (16 vCPU, 32 GB RAM)",
            "vmInstanceXLarge",
            form.vmInstanceXLarge,
          )}
          {checkboxRow(
            "trial-vm-inst-gpu",
            "GPU (4 vCPU, 16 GB RAM, GPU)",
            "vmInstanceGpu",
            form.vmInstanceGpu,
          )}
        </div>
        {showInstanceErr ? (
          <FormHelperText id={instanceHelperId} className="trial-field-helper--error">
            Select at least one default instance type.
          </FormHelperText>
        ) : null}

        <p
          className="trial-configure-foundation__muted-label"
          id="trial-workload-vm-os-images-label"
        >
          Operating system images
          <TrialConfigureRequiredMark />
        </p>
        <div
          className="trial-vm-os-images-grid"
          role="group"
          aria-labelledby="trial-workload-vm-os-images-label"
          aria-invalid={showOsErr}
          aria-describedby={showOsErr ? osHelperId : undefined}
        >
          {VM_OS_IMAGE_OPTIONS.map((opt) => {
            const checked = form[opt.key];
            return (
              <label key={opt.id} className="trial-vm-os-image-card" htmlFor={opt.id}>
                <input
                  id={opt.id}
                  type="checkbox"
                  className="trial-workload-checkbox-row__input trial-vm-os-image-card__input"
                  checked={checked}
                  disabled={readOnly}
                  onChange={(e) => toggle(opt.key, e.target.checked)}
                />
                <span className="trial-vm-os-image-card__logo-wrap" aria-hidden>
                  <img src={opt.logoSrc} alt="" className="trial-vm-os-image-card__logo" />
                </span>
                <span className="trial-vm-os-image-card__label">{opt.label}</span>
              </label>
            );
          })}
        </div>
        {showOsErr ? (
          <FormHelperText id={osHelperId} className="trial-field-helper--error">
            Select at least one operating system image.
          </FormHelperText>
        ) : null}

        <Title
          id="trial-workload-vm-storage-heading"
          headingLevel="h4"
          size="md"
          className="trial-configure-summary__subsection-title"
        >
          Storage provisioning
        </Title>
        <div
          className="trial-configure-foundation__field-grid"
          role="group"
          aria-labelledby="trial-workload-vm-storage-heading"
        >
          <FormGroup label="Disk provisioning type" fieldId="trial-vm-disk-type" isRequired>
            <Fragment>
              <select
                id="trial-vm-disk-type"
                className="trial-configure-foundation__select pf-v6-c-form-control"
                value={form.vmDiskProvisioningType}
                disabled={readOnly}
                aria-invalid={showDiskTypeErr}
                aria-describedby={showDiskTypeErr ? diskTypeHelperId : undefined}
                aria-label="Disk provisioning type"
                onChange={
                  readOnly
                    ? undefined
                    : (e) => onChange({ ...form, vmDiskProvisioningType: e.target.value })
                }
              >
                <option value="">Select disk provisioning type</option>
                {VM_DISK_PROVISIONING_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {showDiskTypeErr ? (
                <FormHelperText id={diskTypeHelperId} className="trial-field-helper--error">
                  Select disk provisioning type.
                </FormHelperText>
              ) : null}
            </Fragment>
          </FormGroup>
          <FormGroup label="Default disk size" fieldId="trial-vm-disk-size" isRequired>
            <Fragment>
              <TextInput
                id="trial-vm-disk-size"
                value={form.vmDefaultDiskSize}
                isRequired
                validated={showDiskSizeErr ? "error" : "default"}
                aria-invalid={showDiskSizeErr}
                aria-describedby={showDiskSizeErr ? diskSizeHelperId : undefined}
                {...ro}
                onChange={
                  readOnly ? () => {} : (_e, v) => onChange({ ...form, vmDefaultDiskSize: v })
                }
                aria-label="Default disk size"
                placeholder="e.g. 80Gi"
              />
              {showDiskSizeErr ? (
                <FormHelperText id={diskSizeHelperId} className="trial-field-helper--error">
                  Enter default disk size.
                </FormHelperText>
              ) : null}
            </Fragment>
          </FormGroup>
        </div>

        <Title
          id="trial-workload-vm-network-heading"
          headingLevel="h4"
          size="md"
          className="trial-configure-summary__subsection-title trial-vm-network-heading"
        >
          Network configuration
        </Title>
        <div
          className="trial-configure-foundation__field-grid trial-configure-foundation__field-grid--vm-network"
          role="group"
          aria-labelledby="trial-workload-vm-network-heading"
        >
          <FormGroup label="Network mode" fieldId="trial-vm-net-mode" isRequired>
            <Fragment>
              <select
                id="trial-vm-net-mode"
                className="trial-configure-foundation__select pf-v6-c-form-control"
                value={form.vmNetworkMode}
                disabled={readOnly}
                aria-invalid={showNetModeErr}
                aria-describedby={showNetModeErr ? netModeHelperId : undefined}
                aria-label="Network mode"
                onChange={
                  readOnly
                    ? undefined
                    : (e) => onChange({ ...form, vmNetworkMode: e.target.value })
                }
              >
                <option value="">Select network mode</option>
                {VM_NETWORK_MODE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
              {showNetModeErr ? (
                <FormHelperText id={netModeHelperId} className="trial-field-helper--error">
                  Select network mode.
                </FormHelperText>
              ) : null}
            </Fragment>
          </FormGroup>
          <label className="trial-workload-checkbox-row" htmlFor="trial-vm-vlan">
            <input
              id="trial-vm-vlan"
              type="checkbox"
              className="trial-workload-checkbox-row__input"
              checked={form.vmVlanEnabled}
              disabled={readOnly}
              onChange={(e) => onChange({ ...form, vmVlanEnabled: e.target.checked })}
            />
            <span className="trial-workload-checkbox-row__label">Enable VLAN support</span>
          </label>
        </div>
      </div>
    </section>
  );
}

function BareMetalWorkloadBlock({
  readOnly,
  form,
  onChange,
  showSubmitValidationErrors = false,
}: WorkloadProps) {
  const [redfishPasswordVisible, setRedfishPasswordVisible] = useState<
    Record<string, boolean>
  >({});
  const updateHost = (hostId: string, patch: Partial<AgentHost>) => {
    onChange({
      ...form,
      hosts: form.hosts.map((h) => (h.id === hostId ? { ...h, ...patch } : h)),
    });
  };
  return (
    <section
      className="trial-configure-foundation__subsection"
      aria-labelledby="trial-workload-bm-heading"
    >
      <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
        <span
          className="trial-configure-workload__subsection-icon trial-configure-workload__subsection-icon--baremetal"
          aria-hidden
        >
          <EnterpriseIcon />
        </span>
        <Title
          id="trial-workload-bm-heading"
          headingLevel="h3"
          size="lg"
          className="trial-configure-foundation__service-title"
        >
          Bare Metal as a Service
        </Title>
      </div>
      <div
        className="trial-configure-service-rail-body"
        role="group"
        aria-labelledby="trial-workload-bm-heading"
      >
        <div className="trial-baremetal-workload-hosts-block">
          <div className="trial-configure-summary__vm-agent-hosts-title-row">
            <Title
              id="trial-workload-bm-hosts-heading"
              headingLevel="h4"
              size="md"
              className="trial-configure-summary__subsection-title trial-configure-summary__subsection-title--inline"
            >
              Agent host
              <TrialConfigureRequiredMark />
            </Title>
            {!readOnly ? (
              <Button
                variant="secondary"
                type="button"
                onClick={() => onChange(appendRandomAgentHostToForm(form, "baremetal"))}
              >
                Add host
              </Button>
            ) : null}
          </div>
          <div
            className="trial-configure-summary__vm-agent-hosts"
            role="group"
            aria-labelledby="trial-workload-bm-hosts-heading"
          >
            {form.hosts.map((host, index) => (
              <div key={host.id} className="trial-configure-summary__vm-host-card">
                <Title
                  headingLevel="h5"
                  size="md"
                  className="trial-configure-summary__vm-host-heading"
                >
                  Host {index + 1}
                </Title>
                <AgentHostWorkloadCard
                  host={host}
                  idPrefix={`trial-bm-wl-host-${host.id}`}
                  hostLabelForAria={`Host ${index + 1}`}
                  readOnly={readOnly}
                  showSubmitValidationErrors={showSubmitValidationErrors}
                  onUpdateHost={(patch) => updateHost(host.id, patch)}
                  passwordVisible={Boolean(redfishPasswordVisible[host.id])}
                  onTogglePassword={() =>
                    setRedfishPasswordVisible((prev) => ({
                      ...prev,
                      [host.id]: !prev[host.id],
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ModelsWorkloadBlock({
  readOnly,
  form,
  onChange,
  showSubmitValidationErrors = false,
}: WorkloadProps) {
  const ro = readOnly ? ({ readOnlyVariant: "default" as const } satisfies {
    readOnlyVariant: "default";
  }) : {};
  const runtimeMissing = form.modelRuntime.trim() === "";
  const showRuntimeErr = showSubmitValidationErrors && runtimeMissing;
  const runtimeHelperId = "trial-model-runtime-helper";
  const toggle = (key: keyof FormState, checked: boolean) => {
    onChange({ ...form, [key]: checked } as FormState);
  };
  return (
    <section
      className="trial-configure-foundation__subsection"
      aria-labelledby="trial-workload-models-heading"
    >
      <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
        <span
          className="trial-configure-workload__subsection-icon trial-configure-workload__subsection-icon--models"
          aria-hidden
        >
          <AiFlavorIcon />
        </span>
        <Title
          id="trial-workload-models-heading"
          headingLevel="h3"
          size="lg"
          className="trial-configure-foundation__service-title"
        >
          Model as a Service
        </Title>
      </div>
      <div
        className="trial-configure-service-rail-body trial-workload-models-config"
        role="group"
        aria-labelledby="trial-workload-models-gpu-heading"
      >
        <Title
          id="trial-workload-models-gpu-heading"
          headingLevel="h4"
          size="md"
          className="trial-configure-summary__subsection-title"
        >
          Models & GPU Runtime
        </Title>
        <div
          className="trial-workload-models-group"
          role="group"
          aria-label="Red Hat validated models"
        >
        <p
          className="trial-configure-foundation__muted-label"
          id="trial-workload-models-validated-label"
        >
          Red Hat validated models
          <TrialConfigureRequiredMark />
        </p>
        <div
          className="trial-vm-os-images-grid"
          role="group"
          aria-labelledby="trial-workload-models-validated-label"
        >
          {MODELS_VALIDATED_CHECKBOX_OPTIONS.map((opt) => (
            <label key={opt.id} className="trial-vm-os-image-card" htmlFor={opt.id}>
              <input
                id={opt.id}
                type="checkbox"
                className="trial-workload-checkbox-row__input trial-vm-os-image-card__input"
                checked={form[opt.key]}
                disabled={readOnly}
                onChange={(e) => toggle(opt.key, e.target.checked)}
              />
              <span className="trial-vm-os-image-card__logo-wrap" aria-hidden>
                <img src={opt.logoSrc} alt="" className="trial-vm-os-image-card__logo" />
              </span>
              <span className="trial-vm-os-image-card__label">{opt.label}</span>
            </label>
          ))}
        </div>
        </div>
        <div
          className="trial-workload-models-group"
          role="group"
          aria-label="GPU acceleration"
        >
        <p
          className="trial-configure-foundation__muted-label"
          id="trial-workload-models-gpu-accel-label"
        >
          GPU acceleration
          <TrialConfigureRequiredMark />
        </p>
        <div
          className="trial-vm-os-images-grid"
          role="group"
          aria-labelledby="trial-workload-models-gpu-accel-label"
        >
          {MODELS_GPU_CHECKBOX_OPTIONS.map((opt) => (
            <label key={opt.id} className="trial-vm-os-image-card" htmlFor={opt.id}>
              <input
                id={opt.id}
                type="checkbox"
                className="trial-workload-checkbox-row__input trial-vm-os-image-card__input"
                checked={form[opt.key]}
                disabled={readOnly}
                onChange={(e) => toggle(opt.key, e.target.checked)}
              />
              <span className="trial-vm-os-image-card__logo-wrap" aria-hidden>
                <img src={opt.logoSrc} alt="" className="trial-vm-os-image-card__logo" />
              </span>
              <span className="trial-vm-os-image-card__label">{opt.label}</span>
            </label>
          ))}
        </div>
        </div>
        <div className="trial-workload-models-runtime">
        <FormGroup label="Model runtime" fieldId="trial-model-runtime" isRequired>
          <Fragment>
            <TextInput
              id="trial-model-runtime"
              value={form.modelRuntime}
              isRequired
              validated={showRuntimeErr ? "error" : "default"}
              aria-invalid={showRuntimeErr}
              aria-describedby={showRuntimeErr ? runtimeHelperId : undefined}
              {...ro}
              onChange={
                readOnly ? () => {} : (_e, v) => onChange({ ...form, modelRuntime: v })
              }
              aria-label="Model runtime"
            />
            {showRuntimeErr ? (
              <FormHelperText id={runtimeHelperId} className="trial-field-helper--error">
                Enter model runtime.
              </FormHelperText>
            ) : null}
          </Fragment>
        </FormGroup>
        </div>
      </div>
    </section>
  );
}

function WorkloadReadOnlySummary({
  selected,
  forms,
}: {
  selected: ReadonlySet<SovereignFlavorId>;
  forms: Partial<Record<SovereignFlavorId, FormState>>;
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
  const yn = (b: boolean) => (b ? "Yes" : "No");
  const clusterRo = mergeConfigureForm("cluster", forms);
  const bmRo = mergeConfigureForm("baremetal", forms);
  const vmRo = mergeConfigureForm("vm", forms);
  const modelsRo = mergeConfigureForm("models", forms);
  const vmInstanceLines = (() => {
    const lines: string[] = [];
    if (vmRo.vmInstanceSmall) {
      lines.push("Small (2 vCPU, 4 GB RAM)");
    }
    if (vmRo.vmInstanceMedium) {
      lines.push("Medium (4 vCPU, 8 GB RAM)");
    }
    if (vmRo.vmInstanceLarge) {
      lines.push("Large (8 vCPU, 16 GB RAM)");
    }
    if (vmRo.vmInstanceXLarge) {
      lines.push("X-Large (16 vCPU, 32 GB RAM)");
    }
    if (vmRo.vmInstanceGpu) {
      lines.push("GPU (4 vCPU, 16 GB RAM, GPU)");
    }
    return lines;
  })();
  const vmOsSelectedOptions = VM_OS_IMAGE_OPTIONS.filter((opt) => vmRo[opt.key]);
  const modelsValidatedSelectedOptions = MODELS_VALIDATED_CHECKBOX_OPTIONS.filter(
    (opt) => modelsRo[opt.key],
  );
  const modelsGpuSelectedOptions = MODELS_GPU_CHECKBOX_OPTIONS.filter((opt) => modelsRo[opt.key]);
  return (
    <div className="trial-configure-foundation__workload-readonly">
      {selected.has("vm") ? (
        <section className="trial-configure-foundation__subsection">
          <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
            <span className="trial-configure-workload__subsection-icon" aria-hidden>
              <CubesFlavorIcon />
            </span>
            <Title headingLevel="h3" size="lg" className="trial-configure-foundation__service-title">
              VM as a Service
            </Title>
          </div>
          <div className="trial-configure-service-rail-body">
          <Title
            id="trial-workload-vm-instance-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Default instance types
            <TrialReviewRequiredMark />
          </Title>
          <div
            className="trial-review-summary__rows"
            role="group"
            aria-labelledby="trial-workload-vm-instance-review-heading"
          >
            <Fragment>
              <span className="trial-review-summary__label">
                Enabled types
                <span className="trial-review-summary__label-required" aria-hidden>
                  {" "}
                  *
                </span>
              </span>
              <span className="trial-review-summary__value trial-review-summary__value--vm-review-stack">
                {vmInstanceLines.length ? (
                  <span className="trial-review-summary__vm-review-stack-inner">
                    {vmInstanceLines.map((line) => (
                      <span key={line} className="trial-review-summary__vm-review-type-line">
                        {line}
                      </span>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </Fragment>
          </div>
          <Title
            id="trial-workload-vm-os-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Operating system images
            <TrialReviewRequiredMark />
          </Title>
          <div
            className="trial-review-summary__rows"
            role="group"
            aria-labelledby="trial-workload-vm-os-review-heading"
          >
            <Fragment>
              <span className="trial-review-summary__label">
                Enabled images
                <span className="trial-review-summary__label-required" aria-hidden>
                  {" "}
                  *
                </span>
              </span>
              <span className="trial-review-summary__value trial-review-summary__value--vm-review-stack">
                {vmOsSelectedOptions.length ? (
                  <span className="trial-review-summary__vm-review-stack-inner">
                    {vmOsSelectedOptions.map((opt) => (
                      <span key={opt.id} className="trial-review-summary__vm-review-os-line">
                        <img
                          src={opt.logoSrc}
                          alt=""
                          className="trial-review-summary__vm-review-os-logo"
                          width={24}
                          height={24}
                        />
                        <span>{opt.label}</span>
                      </span>
                    ))}
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </Fragment>
          </div>
          <Title
            id="trial-workload-vm-storage-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title trial-vm-review-storage-heading"
          >
            Storage provisioning
            <TrialReviewRequiredMark />
          </Title>
          <div
            className="trial-review-summary__rows"
            role="group"
            aria-labelledby="trial-workload-vm-storage-review-heading"
          >
            {row("Disk provisioning type", vmRo.vmDiskProvisioningType || "—", true)}
            {row("Default disk size", vmRo.vmDefaultDiskSize || "—", true)}
          </div>
          <Title
            id="trial-workload-vm-network-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title trial-vm-review-network-heading"
          >
            Network configuration
          </Title>
          <div
            className="trial-review-summary__rows"
            role="group"
            aria-labelledby="trial-workload-vm-network-review-heading"
          >
            {row("Network mode", vmRo.vmNetworkMode || "—", true)}
            {row("VLAN support", yn(vmRo.vmVlanEnabled))}
          </div>
          </div>
        </section>
      ) : null}
      {selected.has("cluster") ? (
        <section className="trial-configure-foundation__subsection">
          <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
            <span className="trial-configure-workload__subsection-icon" aria-hidden>
              <ClusterFlavorIcon />
            </span>
            <Title headingLevel="h3" size="lg" className="trial-configure-foundation__service-title">
              Cluster as a Service
            </Title>
          </div>
          <div className="trial-configure-service-rail-body">
          <Title
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Nodes
            <TrialReviewRequiredMark />
          </Title>
          {clusterRo.clusterWorkloadNodes.map((node, index) => {
            const host0 = clusterRo.hosts[0];
            if (index === 0 && host0) {
              return (
                <div key={node.id} className="trial-review-summary__host-block">
                  <Title
                    headingLevel="h5"
                    size="md"
                    className="trial-review-summary__host-title trial-configure-summary__vm-host-heading"
                  >
                    Node 1
                  </Title>
                  <div className="trial-review-summary__rows">
                    {row("Name", host0.name || "—", true)}
                    {row("MAC address", host0.mac || "—", true)}
                    {row("IP address", host0.ip || "—", true)}
                    {row("Redfish", host0.redfish || "—", true)}
                    {row("Root disk", host0.rootDisk || "—", true)}
                    {row("Redfish user", host0.redfishUser || "—", true)}
                    {row("Redfish password", host0.redfishPassword || "—", true)}
                  </div>
                </div>
              );
            }
            return (
              <div key={node.id} className="trial-review-summary__host-block">
                <Title
                  headingLevel="h5"
                  size="md"
                  className="trial-review-summary__host-title trial-configure-summary__vm-host-heading"
                >
                  Node {index + 1}
                </Title>
                <div className="trial-review-summary__rows">
                  {row("Node name", node.name || "—", true)}
                  {row("Node role", clusterNodeRoleLabel(node.nodeRole), true)}
                  {row("CPU cores", node.cpuCores || "—", true)}
                  {row("Memory (GB)", node.memoryGb || "—", true)}
                  {row("Storage (GB)", node.storageGb || "—", true)}
                </div>
              </div>
            );
          })}
          <p className="trial-configure-foundation__muted-label">
            Scaling
            <TrialReviewRequiredMark />
          </p>
          <div className="trial-review-summary__rows">
            {row(
              "Enable auto-scaling (automatically add/remove nodes based on load)",
              yn(clusterRo.clusterAutoscaleEnabled),
              true,
            )}
          </div>
          </div>
        </section>
      ) : null}
      {selected.has("models") ? (
        <section className="trial-configure-foundation__subsection">
          <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
            <span
              className="trial-configure-workload__subsection-icon trial-configure-workload__subsection-icon--models"
              aria-hidden
            >
              <AiFlavorIcon />
            </span>
            <Title headingLevel="h3" size="lg" className="trial-configure-foundation__service-title">
              Model as a Service
            </Title>
          </div>
          <div
            className="trial-configure-service-rail-body trial-workload-models-config"
            role="group"
            aria-labelledby="trial-workload-models-gpu-review-heading"
          >
          <Title
            id="trial-workload-models-gpu-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Models & GPU Runtime
            <TrialReviewRequiredMark />
          </Title>
          <div className="trial-workload-models-group">
            <Title
              id="trial-workload-models-validated-review-heading"
              headingLevel="h4"
              size="md"
              className="trial-configure-summary__subsection-title"
            >
              Red Hat validated models
              <TrialReviewRequiredMark />
            </Title>
            <div
              className="trial-review-summary__rows"
              role="group"
              aria-labelledby="trial-workload-models-validated-review-heading"
            >
              <Fragment>
                <span className="trial-review-summary__label">
                  Enabled models
                  <span className="trial-review-summary__label-required" aria-hidden>
                    {" "}
                    *
                  </span>
                </span>
                <span className="trial-review-summary__value trial-review-summary__value--vm-review-stack">
                  {modelsValidatedSelectedOptions.length ? (
                    <span className="trial-review-summary__vm-review-stack-inner">
                      {modelsValidatedSelectedOptions.map((opt) => (
                        <span key={opt.id} className="trial-review-summary__vm-review-os-line">
                          <img
                            src={opt.logoSrc}
                            alt=""
                            className="trial-review-summary__vm-review-os-logo"
                            width={24}
                            height={24}
                          />
                          <span>{opt.label}</span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
              </Fragment>
            </div>
          </div>
          <div className="trial-workload-models-group">
            <Title
              id="trial-workload-models-gpu-accel-review-heading"
              headingLevel="h4"
              size="md"
              className="trial-configure-summary__subsection-title"
            >
              GPU acceleration
              <TrialReviewRequiredMark />
            </Title>
            <div
              className="trial-review-summary__rows"
              role="group"
              aria-labelledby="trial-workload-models-gpu-accel-review-heading"
            >
              <Fragment>
                <span className="trial-review-summary__label">
                  Enabled GPU options
                  <span className="trial-review-summary__label-required" aria-hidden>
                    {" "}
                    *
                  </span>
                </span>
                <span className="trial-review-summary__value trial-review-summary__value--vm-review-stack">
                  {modelsGpuSelectedOptions.length ? (
                    <span className="trial-review-summary__vm-review-stack-inner">
                      {modelsGpuSelectedOptions.map((opt) => (
                        <span key={opt.id} className="trial-review-summary__vm-review-os-line">
                          <img
                            src={opt.logoSrc}
                            alt=""
                            className="trial-review-summary__vm-review-os-logo"
                            width={24}
                            height={24}
                          />
                          <span>{opt.label}</span>
                        </span>
                      ))}
                    </span>
                  ) : (
                    "—"
                  )}
                </span>
              </Fragment>
            </div>
          </div>
          <div className="trial-workload-models-runtime">
            <div className="trial-review-summary__rows">
              {row("Model runtime", modelsRo.modelRuntime || "—", true)}
            </div>
          </div>
          </div>
        </section>
      ) : null}
      {selected.has("baremetal") ? (
        <section className="trial-configure-foundation__subsection">
          <div className="trial-configure-workload__subsection-head trial-configure-summary__title-with-icon">
            <span
              className="trial-configure-workload__subsection-icon trial-configure-workload__subsection-icon--baremetal"
              aria-hidden
            >
              <EnterpriseIcon />
            </span>
            <Title headingLevel="h3" size="lg" className="trial-configure-foundation__service-title">
              Bare Metal as a Service
            </Title>
          </div>
          <div className="trial-configure-service-rail-body">
          <Title
            id="trial-workload-bm-hosts-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title trial-bm-review-agent-host-heading"
          >
            Agent host
            <TrialReviewRequiredMark />
          </Title>
          <div
            className="trial-review-summary__hosts"
            role="group"
            aria-labelledby="trial-workload-bm-hosts-review-heading"
          >
            {bmRo.hosts.map((host, index) => (
              <div key={host.id} className="trial-review-summary__host-block">
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
          </div>
        </section>
      ) : null}
    </div>
  );
}

export function ConfigureDeployment({
  selected,
  forms,
  onFormChange,
  readOnly = false,
  secureComply,
  configureValidationIssues = [],
  configureValidationFocusNonce = 0,
  showSubmitValidationErrors = false,
  onConfigureSubstepsCompletionChange,
}: Props) {
  const rows = useMemo(
    () => getSelectedSovereignFlavorsForSummary(selected),
    [selected],
  );

  const infraId = useMemo(
    () => infrastructureFlavorIdForConfigure(selected),
    [selected],
  );

  const showValidationAlert =
    !readOnly &&
    configureValidationIssues.length > 0 &&
    configureValidationFocusNonce > 0;

  const configureEditorSteps = useMemo(
    () => buildConfigureEditorSteps(selected, infraId),
    [selected, infraId],
  );

  const configureFlowKey = useMemo(
    () => `${[...selected].sort().join(",")}:${infraId ?? ""}`,
    [selected, infraId],
  );

  const [configureEditorStepIndex, setConfigureEditorStepIndex] = useState(0);
  /** After the final sub-step, user clicks Continue to mark done; then they use the wizard Next for Secure & Comply. */
  const [configureFinalContinueDone, setConfigureFinalContinueDone] = useState(false);

  useEffect(() => {
    setConfigureEditorStepIndex(0);
    setConfigureFinalContinueDone(false);
    if (!readOnly) {
      onConfigureSubstepsCompletionChange?.(false);
    }
  }, [configureFlowKey, readOnly, onConfigureSubstepsCompletionChange]);

  useEffect(() => {
    const last = configureEditorSteps.length - 1;
    if (configureEditorSteps.length === 0 || configureEditorStepIndex < last) {
      setConfigureFinalContinueDone(false);
    }
  }, [configureEditorStepIndex, configureEditorSteps.length]);

  useEffect(() => {
    setConfigureEditorStepIndex((i) =>
      Math.min(i, Math.max(0, configureEditorSteps.length - 1)),
    );
  }, [configureEditorSteps.length]);

  useEffect(() => {
    if (readOnly) return;
    const n = configureEditorSteps.length;
    if (n === 0) {
      onConfigureSubstepsCompletionChange?.(true);
      return;
    }
    const lastIdx = n - 1;
    const complete =
      configureFinalContinueDone && configureEditorStepIndex === lastIdx;
    onConfigureSubstepsCompletionChange?.(complete);
  }, [
    readOnly,
    configureEditorSteps.length,
    configureEditorStepIndex,
    configureFinalContinueDone,
    onConfigureSubstepsCompletionChange,
  ]);

  useEffect(() => {
    if (readOnly || configureValidationFocusNonce === 0) return;
    if (configureValidationIssues.length === 0) return;
    const idx = firstEditorStepIndexWithValidationIssue(
      configureEditorSteps,
      configureValidationIssues,
      infraId,
    );
    if (idx >= 0) {
      setConfigureEditorStepIndex(idx);
    }
  }, [
    readOnly,
    configureValidationFocusNonce,
    configureEditorSteps,
    configureValidationIssues,
    infraId,
  ]);

  useEffect(() => {
    if (readOnly) return;
    if (!configureFinalContinueDone) return;
    const lastIdx = configureEditorSteps.length - 1;
    if (lastIdx < 0 || configureEditorStepIndex !== lastIdx) return;
    const frame = requestAnimationFrame(() => {
      document.getElementById("trial-wizard-next-step")?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [
    readOnly,
    configureFinalContinueDone,
    configureEditorStepIndex,
    configureEditorSteps.length,
  ]);

  useEffect(() => {
    if (readOnly) return;
    scrollTrialWizardMainToTop();
  }, [readOnly, configureEditorStepIndex, configureFlowKey]);

  const showSecureComplyTab = readOnly && secureComply != null;

  if (rows.length === 0) {
    return (
      <EmptyState variant="sm" headingLevel="h2" titleText="No services selected">
        <EmptyStateBody>
          Go back and choose at least one sovereign cloud option to see what
          will be configured for your deployment.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  const showWorkload =
    selected.has("vm") ||
    selected.has("cluster") ||
    selected.has("baremetal") ||
    selected.has("models");

  const infrastructurePanel = infraId ? (
    <section
      className={[
        "trial-configure-foundation",
        "trial-configure-foundation--infrastructure",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-labelledby="trial-configure-infra-heading"
    >
      <Title
        id="trial-configure-infra-heading"
        headingLevel="h2"
        size="xl"
        className="trial-configure-foundation__title"
      >
        Infrastructure
      </Title>
      <div className="trial-configure-foundation__infra-body">
        <FlavorConfigureFields
          flavorId={infraId}
          form={mergeConfigureForm(infraId, forms)}
          onFormChange={(form) => onFormChange(infraId, form)}
          readOnly={readOnly}
          showSubmitValidationErrors={showSubmitValidationErrors}
        />
      </div>
    </section>
  ) : (
    <section
      className="trial-configure-foundation trial-configure-foundation--infrastructure"
      aria-labelledby="trial-configure-infra-missing-heading"
    >
      <Title
        id="trial-configure-infra-missing-heading"
        headingLevel="h2"
        size="xl"
        className="trial-configure-foundation__title"
      >
        Infrastructure
      </Title>
      <div className="trial-configure-foundation__infra-body">
        <p className="trial-configure-foundation__empty-hint">
          Select <strong>VM as a Service</strong>, <strong>Cluster as a Service</strong>, or{" "}
          <strong>Bare Metal as a Service</strong> on the previous step to configure cluster,
          network, and agent hosts.
        </p>
      </div>
    </section>
  );

  const workloadPanel = showWorkload ? (
    <section
      className="trial-configure-foundation trial-configure-foundation--workload"
      aria-labelledby="trial-configure-workload-heading"
    >
      <Title
        id="trial-configure-workload-heading"
        headingLevel="h2"
        size="xl"
        className="trial-configure-foundation__title"
      >
        Workload service
      </Title>
      {readOnly ? (
        <WorkloadReadOnlySummary selected={selected} forms={forms} />
      ) : (
        <>
          {selected.has("vm") ? (
            <VmWorkloadBlock
              readOnly={readOnly}
              form={mergeConfigureForm("vm", forms)}
              onChange={(f) => onFormChange("vm", f)}
              showSubmitValidationErrors={showSubmitValidationErrors}
            />
          ) : null}
          {selected.has("cluster") ? (
            <ClusterWorkloadBlock
              readOnly={readOnly}
              form={mergeConfigureForm("cluster", forms)}
              onChange={(f) => onFormChange("cluster", f)}
              showSubmitValidationErrors={showSubmitValidationErrors}
            />
          ) : null}
          {selected.has("models") ? (
            <ModelsWorkloadBlock
              readOnly={readOnly}
              form={mergeConfigureForm("models", forms)}
              onChange={(f) => onFormChange("models", f)}
              showSubmitValidationErrors={showSubmitValidationErrors}
            />
          ) : null}
          {selected.has("baremetal") ? (
            <BareMetalWorkloadBlock
              readOnly={readOnly}
              form={mergeConfigureForm("baremetal", forms)}
              onChange={(f) => onFormChange("baremetal", f)}
              showSubmitValidationErrors={showSubmitValidationErrors}
            />
          ) : null}
        </>
      )}
    </section>
  ) : (
    <section
      className="trial-configure-foundation trial-configure-foundation--workload"
      aria-labelledby="trial-configure-workload-empty-heading"
    >
      <Title
        id="trial-configure-workload-empty-heading"
        headingLevel="h2"
        size="xl"
        className="trial-configure-foundation__title"
      >
        Workload service
      </Title>
      <p className="trial-configure-foundation__empty-hint">
        Select <strong>VM as a Service</strong>, <strong>Cluster as a Service</strong>,{" "}
        <strong>Model as a Service</strong>, or <strong>Bare Metal as a Service</strong> on the
        previous step to configure workload options.
      </p>
    </section>
  );

  const validationAlert = showValidationAlert ? (
    <Alert
      variant="danger"
      isInline
      className="trial-configure-summary__validation-alert"
      title="Fix the following on Configure before continuing"
    >
      <List component={ListComponent.ul}>
        {configureValidationIssues.map((issue) => {
          const hint = sectionHintForFlavor(issue.flavorId, rows);
          return (
            <Fragment key={issue.flavorId}>
              {issue.messages.map((msg) => (
                <ListItem key={`${issue.flavorId}-${msg}`}>
                  <strong>{hint}</strong> — {msg}
                </ListItem>
              ))}
            </Fragment>
          );
        })}
      </List>
    </Alert>
  ) : null;

  if (readOnly) {
    return (
      <div
        className={[
          "trial-configure-summary",
          "trial-configure-summary--unified",
          "trial-configure-summary--review-stack",
          "trial-configure-summary--read-only",
        ].join(" ")}
      >
        <SkipToContent href="#trial-review-main-content">Skip to main content</SkipToContent>
        {validationAlert}
        <div
          id="trial-review-main-content"
          tabIndex={-1}
          role="region"
          aria-label="Deployment review"
          className="trial-configure-summary__review-main"
        >
          {infrastructurePanel}
          {workloadPanel}
          {showSecureComplyTab && secureComply != null ? (
            <SecureComplyReadOnlySummary value={secureComply} />
          ) : null}
        </div>
      </div>
    );
  }

  const editorStep =
    configureEditorSteps.length === 0
      ? null
      : (configureEditorSteps[configureEditorStepIndex] ?? null);

  return (
    <div className="trial-configure-summary trial-configure-summary--unified trial-configure-summary--substeps">
      {validationAlert}

      {configureEditorSteps.length > 0 ? (
        <div className="trial-configure-substep-layout">
          <aside className="trial-configure-substep-rail">
            <ProgressStepper
              isVertical
              aria-label="Configure deployment steps"
              className="trial-configure-pf-stepper"
            >
              {configureEditorSteps.map((step, i) => {
                const n = configureEditorSteps.length;
                const lastIdx = n - 1;
                const lastStepAcknowledged =
                  configureFinalContinueDone &&
                  configureEditorStepIndex === lastIdx &&
                  n > 0;
                const isComplete =
                  i < configureEditorStepIndex || (lastStepAcknowledged && i === lastIdx);
                const isCurrent =
                  i === configureEditorStepIndex &&
                  !(configureFinalContinueDone && i === lastIdx);
                const title = progressStepperStepTitle(step, rows);
                const stepId = `trial-configure-pf-step-${step.kind === "infrastructure" ? "infra" : step.flavor}`;
                const titleId = `${stepId}-title`;
                const variant = isComplete ? "success" : isCurrent ? "default" : "pending";
                const stepLabel = `${title}${
                  isComplete ? ", completed" : isCurrent ? ", current step" : ", not started"
                }`;
                return (
                  <ProgressStep
                    key={step.kind === "infrastructure" ? "infra" : step.flavor}
                    id={stepId}
                    titleId={titleId}
                    variant={variant}
                    isCurrent={isCurrent}
                    description={
                      isComplete
                        ? "Completed"
                        : isCurrent
                          ? "Fill the form and click Continue."
                          : undefined
                    }
                    aria-label={stepLabel}
                    className="trial-configure-pf-step--interactive"
                    onClick={() => setConfigureEditorStepIndex(i)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setConfigureEditorStepIndex(i);
                      }
                    }}
                    tabIndex={0}
                  >
                    {title}
                  </ProgressStep>
                );
              })}
            </ProgressStepper>
          </aside>

          <div className="trial-configure-substep-main">
            <p className="trial-configure-substep__meta" aria-live="polite">
              Step {configureEditorStepIndex + 1} of {configureEditorSteps.length}
              {editorStep ? (
                <>
                  <span className="trial-configure-substep__meta-sep" aria-hidden>
                    {" "}
                    ·{" "}
                  </span>
                  <span>{editorStepTitle(editorStep, rows)}</span>
                </>
              ) : null}
            </p>

            <div className="trial-configure-substep-content">
              {editorStep == null ? null : editorStep.kind === "infrastructure" ? (
                infrastructurePanel
              ) : (
                <section
                  className="trial-configure-foundation trial-configure-foundation--workload"
                  aria-label={editorStepTitle(editorStep, rows)}
                >
                  {editorStep.flavor === "vm" ? (
                    <VmWorkloadBlock
                      readOnly={false}
                      form={mergeConfigureForm("vm", forms)}
                      onChange={(f) => onFormChange("vm", f)}
                      showSubmitValidationErrors={showSubmitValidationErrors}
                    />
                  ) : null}
                  {editorStep.flavor === "cluster" ? (
                    <ClusterWorkloadBlock
                      readOnly={false}
                      form={mergeConfigureForm("cluster", forms)}
                      onChange={(f) => onFormChange("cluster", f)}
                      showSubmitValidationErrors={showSubmitValidationErrors}
                    />
                  ) : null}
                  {editorStep.flavor === "models" ? (
                    <ModelsWorkloadBlock
                      readOnly={false}
                      form={mergeConfigureForm("models", forms)}
                      onChange={(f) => onFormChange("models", f)}
                      showSubmitValidationErrors={showSubmitValidationErrors}
                    />
                  ) : null}
                  {editorStep.flavor === "baremetal" ? (
                    <BareMetalWorkloadBlock
                      readOnly={false}
                      form={mergeConfigureForm("baremetal", forms)}
                      onChange={(f) => onFormChange("baremetal", f)}
                      showSubmitValidationErrors={showSubmitValidationErrors}
                    />
                  ) : null}
                </section>
              )}
            </div>

            {configureEditorSteps.length > 0 ? (
              <div className="trial-configure-substep-footer">
                <Button
                  variant="secondary"
                  type="button"
                  isDisabled={configureEditorStepIndex <= 0}
                  onClick={() =>
                    setConfigureEditorStepIndex((x) => Math.max(0, x - 1))
                  }
                >
                  Back
                </Button>
                {configureEditorStepIndex < configureEditorSteps.length - 1 ? (
                  <Button
                    variant="primary"
                    type="button"
                    onClick={() =>
                      setConfigureEditorStepIndex((x) =>
                        Math.min(configureEditorSteps.length - 1, x + 1),
                      )
                    }
                  >
                    Continue
                  </Button>
                ) : configureFinalContinueDone ? (
                  <div
                    className="trial-configure-substep-footer__completed"
                    role="status"
                    aria-live="polite"
                  >
                    <CheckIcon aria-hidden className="trial-configure-substep-footer__completed-icon" />
                    <span>Completed</span>
                  </div>
                ) : (
                  <Button
                    variant="primary"
                    type="button"
                    id="trial-configure-final-continue"
                    onClick={() => setConfigureFinalContinueDone(true)}
                  >
                    Continue
                  </Button>
                )}
              </div>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="trial-configure-substep-content">
          <p className="trial-configure-foundation__empty-hint">
            Nothing to configure for the current selection. Go back and choose at least one
            sovereign cloud option.
          </p>
        </div>
      )}
    </div>
  );
}
