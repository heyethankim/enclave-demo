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

type ConfigureLayout = "full" | "basicNetwork" | "basic";

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

export type FormState = {
  baseDomain: string;
  serviceName: string;
  apiVip: string;
  ingressVip: string;
  machineNetwork: string;
  hosts: AgentHost[];
};

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
    case "network":
      return "basicNetwork";
    case "models":
    case "container":
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

function randomOctet(min = 20, max = 220): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function makeVmHost1(): AgentHost {
  return {
    id: "agent-host-vm-1",
    name: "mgmt-ctl01",
    mac: "0c:c4:7a:62:fe:ec",
    ip: "192.168.2.24",
    redfish: "100.64.1.24",
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

function makeRandomHost(flavor: TriadFlavorId, hostNumber: number): AgentHost {
  const ipLast = randomOctet();
  const rfLast = randomOctet(10, 240);
  const pci = (0x10 + Math.floor(Math.random() * 12)).toString(16);
  const ata = (hostNumber % 3) + 1;
  return {
    id: `agent-host-${flavor}-${newHostId()}`,
    name: hostNameFor(flavor, hostNumber),
    mac: randomMac(),
    ip: `192.168.2.${ipLast}`,
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

function initialNetworkRandom(): {
  apiVip: string;
  ingressVip: string;
  machineNetwork: string;
} {
  let a = randomOctet(180, 230);
  let b = randomOctet(180, 230);
  while (b === a) {
    b = randomOctet(180, 230);
  }
  const third = Math.floor(Math.random() * 4) + 1;
  return {
    apiVip: `192.168.2.${a}`,
    ingressVip: `192.168.2.${b}`,
    machineNetwork: `192.168.${third}.0/24`,
  };
}

function initialNetworkTriad(flavor: TriadFlavorId): {
  apiVip: string;
  ingressVip: string;
  machineNetwork: string;
} {
  if (flavor === "vm") {
    return {
      apiVip: "192.168.2.201",
      ingressVip: "192.168.2.202",
      machineNetwork: "192.168.2.0/24",
    };
  }
  return initialNetworkRandom();
}

function initialHostsTriad(flavor: TriadFlavorId): AgentHost[] {
  const hosts =
    flavor === "vm"
      ? [makeVmHost1(), makeRandomHost("vm", 2)]
      : [makeRandomHost(flavor, 1), makeRandomHost(flavor, 2)];
  /* Demo: only Cluster — Host 1 IP unset until the user fills it (Next-step validation). */
  if (flavor === "cluster") {
    const first = hosts[0];
    if (first) {
      hosts[0] = { ...first, ip: "" };
    }
  }
  return hosts;
}

function initialTriadFormState(flavor: TriadFlavorId): FormState {
  return {
    ...initialBasicTriad(flavor),
    ...initialNetworkTriad(flavor),
    hosts: initialHostsTriad(flavor),
  };
}

function initialSoloBasic(
  flavor: "models" | "container" | "network",
): Pick<FormState, "baseDomain" | "serviceName"> {
  const tok = Math.random().toString(36).slice(2, 8);
  const n = Math.floor(Math.random() * 800 + 100);
  if (flavor === "models") {
    return {
      baseDomain: `models-${tok}.nodns.in`,
      serviceName: `infer-svc-${n}`,
    };
  }
  if (flavor === "container") {
    return {
      baseDomain: `apps-${tok}.nodns.in`,
      serviceName: `tenant-${n}`,
    };
  }
  return {
    baseDomain: `vpc-${tok}.nodns.in`,
    serviceName: `net-core-${n}`,
  };
}

export function initialFormState(flavorId: SovereignFlavorId): FormState {
  const mode = configureLayoutFor(flavorId);
  if (mode === "full") {
    return initialTriadFormState(flavorId as TriadFlavorId);
  }
  if (mode === "basicNetwork") {
    return {
      ...initialSoloBasic("network"),
      ...initialNetworkRandom(),
      hosts: [],
    };
  }
  return {
    ...initialSoloBasic(flavorId as "models" | "container"),
    apiVip: "",
    ingressVip: "",
    machineNetwork: "",
    hosts: [],
  };
}

/** Validates selected configure forms (e.g. before leaving the Configure step). */
export function validateConfigureForms(
  selected: ReadonlySet<SovereignFlavorId>,
  forms: Partial<Record<SovereignFlavorId, FormState>>,
): ConfigureValidationIssue[] {
  const issues: ConfigureValidationIssue[] = [];
  for (const id of selected) {
    if (id !== "cluster") {
      continue;
    }
    const form = forms[id] ?? initialFormState(id);
    const messages: string[] = [];
    form.hosts.forEach((host, index) => {
      if (host.ip.trim() === "") {
        messages.push(`Host ${index + 1}: Enter the IP address.`);
      }
    });
    if (messages.length > 0) {
      issues.push({ flavorId: id, messages });
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
};

function FlavorConfigureReadOnlySummary({
  form,
  layout,
  id,
}: {
  form: FormState;
  layout: ConfigureLayout;
  id: (suffix: string) => string;
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
          size="lg"
          className="trial-review-summary__section-title trial-configure-summary__subsection-title"
        >
          Basic
        </Title>
        <div className="trial-review-summary__rows">
          {row("Base domain", form.baseDomain || "—", true)}
          {row("Cluster name", form.serviceName || "—", true)}
        </div>
      </section>

      {layout === "full" || layout === "basicNetwork" ? (
        <section
          className="trial-review-summary__section"
          aria-labelledby={id("network-heading")}
        >
          <Title
            id={id("network-heading")}
            headingLevel="h4"
            size="lg"
            className="trial-review-summary__section-title trial-configure-summary__subsection-title"
          >
            Network
          </Title>
          <div className="trial-review-summary__rows">
            {row("API VIP", form.apiVip || "—")}
            {row("Ingress VIP", form.ingressVip || "—")}
            {row("Machine network", form.machineNetwork || "—")}
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
            size="lg"
            className="trial-review-summary__section-title trial-configure-summary__subsection-title"
          >
            Agent hosts
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
                  {row("Redfish", host.redfish || "—")}
                  {row("Root disk", host.rootDisk || "—", true)}
                  {row("Redfish user", host.redfishUser || "—")}
                  {row("Redfish password", host.redfishPassword || "—")}
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
    onFormChange({
      ...form,
      hosts: [...form.hosts, makeRandomHost(triad, form.hosts.length + 1)],
    });
  }, [readOnly, layout, p, form, onFormChange]);

  const [redfishPasswordVisible, setRedfishPasswordVisible] = useState<
    Record<string, boolean>
  >({});

  if (readOnly) {
    return (
      <FlavorConfigureReadOnlySummary form={form} layout={layout} id={id} />
    );
  }

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
          size="lg"
          className="trial-configure-summary__subsection-title"
        >
          Basic
        </Title>
        <div className="trial-configure-summary__vm-basic-grid">
          <FormGroup
            label="Base domain"
            fieldId={id("base-domain")}
            isRequired
          >
            <TextInput
              id={id("base-domain")}
              name={`${p}BaseDomain`}
              value={form.baseDomain}
              isRequired
              {...readOnlyProps}
              onChange={
                readOnly
                  ? () => {}
                  : (_e, v) => onFormChange({ ...form, baseDomain: v })
              }
              aria-label="Base domain"
            />
          </FormGroup>
          <FormGroup
            label="Cluster name"
            fieldId={id("service-name")}
            isRequired
          >
            <TextInput
              id={id("service-name")}
              name={`${p}ServiceName`}
              value={form.serviceName}
              isRequired
              {...readOnlyProps}
              onChange={
                readOnly
                  ? () => {}
                  : (_e, v) => onFormChange({ ...form, serviceName: v })
              }
              aria-label="Cluster name"
            />
          </FormGroup>
        </div>
      </section>

      {(layout === "full" || layout === "basicNetwork") ? (
        <section
          className="trial-configure-summary__vm-subsection"
          role="group"
          aria-labelledby={id("network-heading")}
        >
          <Title
            id={id("network-heading")}
            headingLevel="h4"
            size="lg"
            className="trial-configure-summary__subsection-title"
          >
            Network
          </Title>
          <div className="trial-configure-summary__vm-network-grid">
            <FormGroup label="API VIP" fieldId={id("api-vip")}>
              <TextInput
                id={id("api-vip")}
                name={`${p}ApiVip`}
                value={form.apiVip}
                {...readOnlyProps}
                onChange={
                  readOnly
                    ? () => {}
                    : (_e, v) => onFormChange({ ...form, apiVip: v })
                }
                aria-label="API VIP"
              />
            </FormGroup>
            <FormGroup label="Ingress VIP" fieldId={id("ingress-vip")}>
              <TextInput
                id={id("ingress-vip")}
                name={`${p}IngressVip`}
                value={form.ingressVip}
                {...readOnlyProps}
                onChange={
                  readOnly
                    ? () => {}
                    : (_e, v) => onFormChange({ ...form, ingressVip: v })
                }
                aria-label="Ingress VIP"
              />
            </FormGroup>
            <div className="trial-configure-summary__vm-network-grid__full">
              <FormGroup label="Machine network" fieldId={id("machine-network")}>
                <TextInput
                  id={id("machine-network")}
                  name={`${p}MachineNetwork`}
                  value={form.machineNetwork}
                  {...readOnlyProps}
                  onChange={
                    readOnly
                      ? () => {}
                      : (_e, v) =>
                          onFormChange({ ...form, machineNetwork: v })
                  }
                  aria-label="Machine network"
                />
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
              size="lg"
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
              const ipMissing = host.ip.trim() === "";
              const showIpError =
                showSubmitValidationErrors &&
                ipMissing &&
                flavorId === "cluster";
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
                    fieldId={`${id("host")}-${host.id}-name`}
                    isRequired
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-name`}
                      value={host.name}
                      isRequired
                      {...readOnlyProps}
                      onChange={(_e, v) => updateHost(host.id, { name: v })}
                      aria-label={`Host ${index + 1} name`}
                    />
                  </FormGroup>
                  <FormGroup
                    label="MAC address"
                    fieldId={`${id("host")}-${host.id}-mac`}
                    isRequired
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-mac`}
                      value={host.mac}
                      isRequired
                      {...readOnlyProps}
                      onChange={(_e, v) => updateHost(host.id, { mac: v })}
                      aria-label={`Host ${index + 1} MAC address`}
                    />
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
                  <FormGroup
                    label="Redfish"
                    fieldId={`${id("host")}-${host.id}-redfish`}
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-redfish`}
                      value={host.redfish}
                      {...readOnlyProps}
                      onChange={(_e, v) =>
                        updateHost(host.id, { redfish: v })
                      }
                      aria-label={`Host ${index + 1} Redfish BMC address`}
                    />
                  </FormGroup>
                  <div className="trial-configure-summary__vm-host-grid__full">
                    <FormGroup
                      label="Root disk"
                      fieldId={`${id("host")}-${host.id}-root`}
                      isRequired
                    >
                      <TextInput
                        id={`${id("host")}-${host.id}-root`}
                        value={host.rootDisk}
                        isRequired
                        {...readOnlyProps}
                        onChange={(_e, v) =>
                          updateHost(host.id, { rootDisk: v })
                        }
                        aria-label={`Host ${index + 1} root disk`}
                      />
                    </FormGroup>
                  </div>
                  <FormGroup
                    label="Redfish user"
                    fieldId={`${id("host")}-${host.id}-rf-user`}
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-rf-user`}
                      value={host.redfishUser}
                      {...readOnlyProps}
                      onChange={(_e, v) =>
                        updateHost(host.id, { redfishUser: v })
                      }
                      aria-label={`Host ${index + 1} Redfish user`}
                    />
                  </FormGroup>
                  <FormGroup
                    label="Redfish password"
                    fieldId={`${id("host")}-${host.id}-rf-pass`}
                  >
                    <div className="trial-password-input-group">
                      <TextInput
                        id={`${id("host")}-${host.id}-rf-pass`}
                        className="trial-password-input-group__input"
                        type={
                          redfishPasswordVisible[host.id]
                            ? "text"
                            : "password"
                        }
                        value={host.redfishPassword}
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
                        aria-controls={`${id("host")}-${host.id}-rf-pass`}
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
