import { useCallback, useMemo, useState } from "react";
import {
  Button,
  FormGroup,
  TextInput,
  Title,
} from "@patternfly/react-core";
import type { SovereignFlavorId } from "./SovereignFlavorCards";

export type TriadFlavorId = "vm" | "cluster" | "baremetal";

type ConfigureLayout = "full" | "basicNetwork" | "basic";

type AgentHost = {
  id: string;
  name: string;
  mac: string;
  ip: string;
  redfish: string;
  rootDisk: string;
  redfishUser: string;
  redfishPassword: string;
};

type FormState = {
  baseDomain: string;
  serviceName: string;
  apiVip: string;
  ingressVip: string;
  machineNetwork: string;
  hosts: AgentHost[];
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
  if (flavor === "vm") {
    return [makeVmHost1(), makeRandomHost("vm", 2)];
  }
  return [makeRandomHost(flavor, 1), makeRandomHost(flavor, 2)];
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

function initialFormState(flavorId: SovereignFlavorId): FormState {
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

type Props = { flavorId: SovereignFlavorId };

export function FlavorConfigureFields({ flavorId }: Props) {
  const layout = configureLayoutFor(flavorId);
  const p = flavorId;
  const id = (suffix: string) => `trial-cfg-${p}-${suffix}`;

  const seed = useMemo(() => initialFormState(flavorId), [flavorId]);
  const [form, setForm] = useState<FormState>(seed);

  const updateHost = useCallback((hostId: string, patch: Partial<AgentHost>) => {
    setForm((prev) => ({
      ...prev,
      hosts: prev.hosts.map((h) =>
        h.id === hostId ? { ...h, ...patch } : h,
      ),
    }));
  }, []);

  const addHost = useCallback(() => {
    if (layout !== "full") {
      return;
    }
    const triad = p as TriadFlavorId;
    setForm((prev) => ({
      ...prev,
      hosts: [...prev.hosts, makeRandomHost(triad, prev.hosts.length + 1)],
    }));
  }, [layout, p]);

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
          <FormGroup label="Base domain" fieldId={id("base-domain")}>
            <TextInput
              id={id("base-domain")}
              name={`${p}BaseDomain`}
              value={form.baseDomain}
              onChange={(_e, v) =>
                setForm((prev) => ({ ...prev, baseDomain: v }))
              }
              aria-label="Base domain"
            />
          </FormGroup>
          <FormGroup label="Service name" fieldId={id("service-name")}>
            <TextInput
              id={id("service-name")}
              name={`${p}ServiceName`}
              value={form.serviceName}
              onChange={(_e, v) =>
                setForm((prev) => ({ ...prev, serviceName: v }))
              }
              aria-label="Service name"
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
                onChange={(_e, v) =>
                  setForm((prev) => ({ ...prev, apiVip: v }))
                }
                aria-label="API VIP"
              />
            </FormGroup>
            <FormGroup label="Ingress VIP" fieldId={id("ingress-vip")}>
              <TextInput
                id={id("ingress-vip")}
                name={`${p}IngressVip`}
                value={form.ingressVip}
                onChange={(_e, v) =>
                  setForm((prev) => ({ ...prev, ingressVip: v }))
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
                  onChange={(_e, v) =>
                    setForm((prev) => ({ ...prev, machineNetwork: v }))
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
            <Button variant="secondary" type="button" onClick={addHost}>
              Add host
            </Button>
          </div>
          <div className="trial-configure-summary__vm-agent-hosts">
            {form.hosts.map((host, index) => (
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
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-name`}
                      value={host.name}
                      onChange={(_e, v) => updateHost(host.id, { name: v })}
                      aria-label={`Host ${index + 1} name`}
                    />
                  </FormGroup>
                  <FormGroup
                    label="MAC address"
                    fieldId={`${id("host")}-${host.id}-mac`}
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-mac`}
                      value={host.mac}
                      onChange={(_e, v) => updateHost(host.id, { mac: v })}
                      aria-label={`Host ${index + 1} MAC address`}
                    />
                  </FormGroup>
                  <FormGroup
                    label="IP address"
                    fieldId={`${id("host")}-${host.id}-ip`}
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-ip`}
                      value={host.ip}
                      onChange={(_e, v) => updateHost(host.id, { ip: v })}
                      aria-label={`Host ${index + 1} IP address`}
                    />
                  </FormGroup>
                  <FormGroup
                    label="Redfish"
                    fieldId={`${id("host")}-${host.id}-redfish`}
                  >
                    <TextInput
                      id={`${id("host")}-${host.id}-redfish`}
                      value={host.redfish}
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
                    >
                      <TextInput
                        id={`${id("host")}-${host.id}-root`}
                        value={host.rootDisk}
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
                    <TextInput
                      id={`${id("host")}-${host.id}-rf-pass`}
                      type="password"
                      value={host.redfishPassword}
                      onChange={(_e, v) =>
                        updateHost(host.id, { redfishPassword: v })
                      }
                      aria-label={`Host ${index + 1} Redfish password`}
                    />
                  </FormGroup>
                </div>
              </div>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
