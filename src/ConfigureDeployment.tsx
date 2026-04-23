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
  ClusterWorkloadNode,
  ConfigureValidationIssue,
  FormState,
} from "./TriadFlavorConfigureFields";
import {
  createClusterWorkloadNode,
  FlavorConfigureFields,
  infrastructureFlavorIdForConfigure,
  mergeConfigureForm,
} from "./TriadFlavorConfigureFields";
import { CheckIcon, EnterpriseIcon } from "@patternfly/react-icons";
import { AiFlavorIcon, ClusterFlavorIcon, CubesFlavorIcon } from "./FlavorCardIcons";
import type { SecureComplyState } from "./SecureComplyStep";
import { SecureComplyReadOnlySummary } from "./SecureComplyReadOnlySummary";

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
        const hasInfraMessage = messages.some((m) => !m.includes("Cluster node"));
        const hasWorkloadMessage = messages.some((m) => m.includes("Cluster node"));
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

  const toggleHa = (key: "clusterHaEnabled" | "clusterAutoscaleEnabled", checked: boolean) => {
    onChange({ ...form, [key]: checked } as FormState);
  };

  const haRow = (id: string, label: string, key: "clusterHaEnabled" | "clusterAutoscaleEnabled") => (
    <label key={id} className="trial-workload-checkbox-row" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        className="trial-workload-checkbox-row__input"
        checked={form[key]}
        disabled={readOnly}
        onChange={(e) => toggleHa(key, e.target.checked)}
      />
      <span className="trial-workload-checkbox-row__label">{label}</span>
    </label>
  );

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
            Cluster nodes
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
          You can add, remove, or modify cluster nodes at any time after deployment through the
          management interface. This allows you to scale and update your infrastructure without
          downtime.
        </Alert>
      <div className="trial-configure-summary__vm-agent-hosts">
        {form.clusterWorkloadNodes.map((node, index) => {
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
                      aria-label={`Cluster node ${index + 1} name`}
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
                      aria-label={`Cluster node ${index + 1} role`}
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
                      aria-label={`Cluster node ${index + 1} CPU cores`}
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
                      aria-label={`Cluster node ${index + 1} memory in GB`}
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
                        aria-label={`Cluster node ${index + 1} storage in GB`}
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
        High availability
        <TrialConfigureRequiredMark />
      </p>
      <div
        className="trial-workload-model-checkboxes"
        role="group"
        aria-label="High availability options"
      >
        {haRow(
          "trial-cluster-ha",
          "Enable High Availability (Minimum 3 control plane nodes)",
          "clusterHaEnabled",
        )}
        {haRow(
          "trial-cluster-autoscale",
          "Enable auto-scaling (automatically add/remove nodes based on load)",
          "clusterAutoscaleEnabled",
        )}
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
  const baseUrlMissing = form.baseUrl.trim() === "";
  const orgMissing = form.organization.trim() === "";
  const storageMissing = form.storagePolicy.trim() === "";
  const showBaseUrlErr = showSubmitValidationErrors && baseUrlMissing;
  const showOrgErr = showSubmitValidationErrors && orgMissing;
  const showStorageErr = showSubmitValidationErrors && storageMissing;
  const baseUrlHelperId = "trial-workload-vm-baseurl-helper";
  const orgHelperId = "trial-workload-vm-org-helper";
  const storageHelperId = "trial-workload-vm-storage-helper";
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
        aria-labelledby="trial-workload-vm-platform-heading"
      >
        <Title
          id="trial-workload-vm-platform-heading"
          headingLevel="h4"
          size="md"
          className="trial-configure-summary__subsection-title"
        >
          Platform settings
        </Title>
        <div className="trial-configure-foundation__field-grid trial-configure-foundation__field-grid--vm-workload">
        <FormGroup
          label="Base URL"
          fieldId="trial-workload-vm-baseurl"
          className="trial-workload-vm-base-url"
          isRequired
        >
          <Fragment>
            <TextInput
              id="trial-workload-vm-baseurl"
              value={form.baseUrl}
              isRequired
              validated={showBaseUrlErr ? "error" : "default"}
              aria-invalid={showBaseUrlErr}
              aria-describedby={showBaseUrlErr ? baseUrlHelperId : undefined}
              {...ro}
              onChange={
                readOnly ? () => {} : (_e, v) => onChange({ ...form, baseUrl: v })
              }
              aria-label="Base URL"
            />
            {showBaseUrlErr ? (
              <FormHelperText id={baseUrlHelperId} className="trial-field-helper--error">
                Enter base URL.
              </FormHelperText>
            ) : null}
          </Fragment>
        </FormGroup>
        <FormGroup label="Organization" fieldId="trial-workload-vm-org" isRequired>
          <Fragment>
            <TextInput
              id="trial-workload-vm-org"
              value={form.organization}
              isRequired
              validated={showOrgErr ? "error" : "default"}
              aria-invalid={showOrgErr}
              aria-describedby={showOrgErr ? orgHelperId : undefined}
              {...ro}
              onChange={
                readOnly
                  ? () => {}
                  : (_e, v) => onChange({ ...form, organization: v })
              }
              aria-label="Organization"
            />
            {showOrgErr ? (
              <FormHelperText id={orgHelperId} className="trial-field-helper--error">
                Enter organization.
              </FormHelperText>
            ) : null}
          </Fragment>
        </FormGroup>
        <FormGroup label="Storage policy" fieldId="trial-workload-vm-storage" isRequired>
          <Fragment>
            <TextInput
              id="trial-workload-vm-storage"
              value={form.storagePolicy}
              isRequired
              validated={showStorageErr ? "error" : "default"}
              aria-invalid={showStorageErr}
              aria-describedby={showStorageErr ? storageHelperId : undefined}
              {...ro}
              onChange={
                readOnly
                  ? () => {}
                  : (_e, v) => onChange({ ...form, storagePolicy: v })
              }
              aria-label="Storage policy"
            />
            {showStorageErr ? (
              <FormHelperText id={storageHelperId} className="trial-field-helper--error">
                Enter storage policy.
              </FormHelperText>
            ) : null}
          </Fragment>
        </FormGroup>
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
  const ro = readOnly ? ({ readOnlyVariant: "default" as const } satisfies {
    readOnlyVariant: "default";
  }) : {};
  const provMissing = form.provisioningNetwork.trim() === "";
  const showProvErr = showSubmitValidationErrors && provMissing;
  const provHelperId = "trial-workload-bm-provnet-helper";
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
        aria-labelledby="trial-workload-bm-network-boot-heading"
      >
        <Title
          id="trial-workload-bm-network-boot-heading"
          headingLevel="h4"
          size="md"
          className="trial-configure-summary__subsection-title"
        >
          Network & Boot
        </Title>
        <div className="trial-configure-foundation__field-grid">
        <FormGroup label="Provisioning network" fieldId="trial-workload-bm-provnet" isRequired>
          <Fragment>
            <TextInput
              id="trial-workload-bm-provnet"
              value={form.provisioningNetwork}
              isRequired
              validated={showProvErr ? "error" : "default"}
              aria-invalid={showProvErr}
              aria-describedby={showProvErr ? provHelperId : undefined}
              {...ro}
              onChange={
                readOnly
                  ? () => {}
                  : (_e, v) => onChange({ ...form, provisioningNetwork: v })
              }
              aria-label="Provisioning network"
            />
            {showProvErr ? (
              <FormHelperText id={provHelperId} className="trial-field-helper--error">
                Enter provisioning network.
              </FormHelperText>
            ) : null}
          </Fragment>
        </FormGroup>
        <FormGroup label="Boot mode" fieldId="trial-workload-bm-boot" isRequired>
          <select
            id="trial-workload-bm-boot"
            className="trial-configure-foundation__select pf-v6-c-form-control"
            value={form.bootMode}
            disabled={readOnly}
            aria-label="Boot mode"
            onChange={
              readOnly
                ? undefined
                : (e) => onChange({ ...form, bootMode: e.target.value })
            }
          >
            <option value="UEFI">UEFI</option>
            <option value="Legacy BIOS">Legacy BIOS</option>
          </select>
        </FormGroup>
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
  const row = (id: string, label: string, key: keyof FormState, checked: boolean) => (
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
        <p className="trial-configure-foundation__muted-label">
          Red Hat validated models
          <TrialConfigureRequiredMark />
        </p>
        <div
          className="trial-workload-model-checkboxes"
          role="group"
          aria-label="Red Hat validated models"
        >
          {row(
            "trial-model-granite",
            "IBM Granite",
            "modelIbmGranite",
            form.modelIbmGranite,
          )}
          {row(
            "trial-model-llama",
            "Meta Llama 3",
            "modelMetaLlama3",
            form.modelMetaLlama3,
          )}
          {row(
            "trial-model-mistral",
            "Mistral AI",
            "modelMistralAi",
            form.modelMistralAi,
          )}
          {row(
            "trial-model-mixtral",
            "Mixtral 8x7B",
            "modelMixtral8x7b",
            form.modelMixtral8x7b,
          )}
        </div>
        </div>
        <div
          className="trial-workload-models-group"
          role="group"
          aria-label="GPU acceleration"
        >
        <p className="trial-configure-foundation__muted-label">
          GPU acceleration
          <TrialConfigureRequiredMark />
        </p>
        <div
          className="trial-workload-model-checkboxes"
          role="group"
          aria-label="GPU acceleration options"
        >
          {row(
            "trial-model-gpu-nvidia",
            "Install NVIDIA GPU Drivers",
            "gpuInstallNvidiaDrivers",
            form.gpuInstallNvidiaDrivers,
          )}
          {row(
            "trial-model-gpu-cuda",
            "Install CUDA Toolkit",
            "gpuInstallCudaToolkit",
            form.gpuInstallCudaToolkit,
          )}
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
            id="trial-workload-vm-platform-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Platform settings
            <TrialReviewRequiredMark />
          </Title>
          <div
            className="trial-review-summary__rows"
            role="group"
            aria-labelledby="trial-workload-vm-platform-review-heading"
          >
            {row("Base URL", mergeConfigureForm("vm", forms).baseUrl || "—", true)}
            {row("Organization", mergeConfigureForm("vm", forms).organization || "—", true)}
            {row("Storage policy", mergeConfigureForm("vm", forms).storagePolicy || "—", true)}
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
            Cluster nodes
            <TrialReviewRequiredMark />
          </Title>
          {clusterRo.clusterWorkloadNodes.map((node, index) => (
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
          ))}
          <p className="trial-configure-foundation__muted-label">
            High availability
            <TrialReviewRequiredMark />
          </p>
          <div className="trial-review-summary__rows">
            {row(
              "Enable High Availability (Minimum 3 control plane nodes)",
              yn(clusterRo.clusterHaEnabled),
              true,
            )}
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
            <p className="trial-configure-foundation__muted-label">
              Red Hat validated models
              <TrialReviewRequiredMark />
            </p>
            <div className="trial-review-summary__rows">
              {row("IBM Granite", yn(mergeConfigureForm("models", forms).modelIbmGranite), true)}
              {row("Meta Llama 3", yn(mergeConfigureForm("models", forms).modelMetaLlama3), true)}
              {row("Mistral AI", yn(mergeConfigureForm("models", forms).modelMistralAi), true)}
              {row("Mixtral 8x7B", yn(mergeConfigureForm("models", forms).modelMixtral8x7b), true)}
            </div>
          </div>
          <div className="trial-workload-models-group">
            <p className="trial-configure-foundation__muted-label">
              GPU acceleration
              <TrialReviewRequiredMark />
            </p>
            <div className="trial-review-summary__rows">
              {row(
                "Install NVIDIA GPU Drivers",
                yn(mergeConfigureForm("models", forms).gpuInstallNvidiaDrivers),
                true,
              )}
              {row(
                "Install CUDA Toolkit",
                yn(mergeConfigureForm("models", forms).gpuInstallCudaToolkit),
                true,
              )}
            </div>
          </div>
          <div className="trial-workload-models-runtime">
            <div className="trial-review-summary__rows">
              {row("Model runtime", mergeConfigureForm("models", forms).modelRuntime || "—", true)}
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
            id="trial-workload-bm-network-boot-review-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Network & Boot
            <TrialReviewRequiredMark />
          </Title>
          <div
            className="trial-review-summary__rows"
            role="group"
            aria-labelledby="trial-workload-bm-network-boot-review-heading"
          >
            {row(
              "Provisioning network",
              mergeConfigureForm("baremetal", forms).provisioningNetwork || "—",
              true,
            )}
            {row("Boot mode", mergeConfigureForm("baremetal", forms).bootMode || "—", true)}
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
  }, [configureFlowKey]);

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

            {configureEditorSteps.length > 1 ? (
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
