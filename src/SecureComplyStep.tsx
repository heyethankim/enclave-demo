import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { Title } from "@patternfly/react-core";
import {
  DATA_RESIDENCY_MACRO_LEGEND,
  DATA_RESIDENCY_MAP_VIEW_HEIGHT,
  DATA_RESIDENCY_MAP_VIEW_WIDTH,
  DATA_RESIDENCY_REGIONS,
} from "./dataResidencyRegions";

export type SecureComplyState = {
  /** Selected data residency region ids (see `DATA_RESIDENCY_REGIONS`) */
  dataResidencyRegionIds: string[];
  gdpr: boolean;
  fedramp: boolean;
  hipaa: boolean;
  soc2: boolean;
  iso27001: boolean;
  pciDss: boolean;
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  auditLogging: boolean;
};

export function initialSecureComplyState(): SecureComplyState {
  return {
    dataResidencyRegionIds: [],
    gdpr: true,
    fedramp: false,
    hipaa: false,
    soc2: false,
    iso27001: true,
    pciDss: false,
    encryptionAtRest: true,
    encryptionInTransit: true,
    auditLogging: true,
  };
}

export const SECURE_COMPLY_REGULATORY_OPTIONS: {
  key: keyof Pick<
    SecureComplyState,
    "gdpr" | "fedramp" | "hipaa" | "soc2" | "iso27001" | "pciDss"
  >;
  name: string;
  description: string;
}[] = [
  {
    key: "gdpr",
    name: "GDPR (General Data Protection Regulation)",
    description: "EU data protection and privacy regulation",
  },
  {
    key: "fedramp",
    name: "FedRAMP (Federal Risk and Authorization Management Program)",
    description: "US federal government cloud security standard",
  },
  {
    key: "hipaa",
    name: "HIPAA (Health Insurance Portability and Accountability Act)",
    description: "US healthcare data protection standard",
  },
  {
    key: "soc2",
    name: "SOC 2 (Service Organization Control 2)",
    description: "Data security and privacy audit standard",
  },
  {
    key: "iso27001",
    name: "ISO 27001",
    description: "International information security management standard",
  },
  {
    key: "pciDss",
    name: "PCI DSS (Payment Card Industry Data Security Standard)",
    description: "Payment card data security requirements",
  },
];

type Props = {
  value: SecureComplyState;
  onChange: (next: SecureComplyState) => void;
};

/** Dark tooltip above peg (SVG user space); shared by hover + selected sticky states */
function DataResidencyMapRegionTooltipBody({
  shortTitle,
  detail,
}: {
  shortTitle: string;
  detail: string;
}) {
  /* foreignObject bottom = y + height; keep arrow tip clearly above peg (r=10, top y=-10) */
  return (
    <foreignObject x={-86} y={-92} width={172} height={78}>
      <div
        xmlns="http://www.w3.org/1999/xhtml"
        className="trial-data-residency-map-point__sticky-shell"
      >
        <div className="trial-data-residency-map-point__sticky-panel">
          <div className="trial-data-residency-map-point__sticky-title">{shortTitle}</div>
          <div className="trial-data-residency-map-point__sticky-detail">{detail}</div>
        </div>
        <div className="trial-data-residency-map-point__sticky-arrow" />
      </div>
    </foreignObject>
  );
}

export function SecureComplyStep({ value, onChange }: Props) {
  const patch = (partial: Partial<SecureComplyState>) =>
    onChange({ ...value, ...partial });

  const selectedRegionSet = useMemo(
    () => new Set(value.dataResidencyRegionIds),
    [value.dataResidencyRegionIds],
  );

  const toggleDataResidencyRegion = (id: string) => {
    const next = new Set(value.dataResidencyRegionIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    patch({ dataResidencyRegionIds: [...next] });
  };

  const onDataResidencyRegionKeyDown = (e: KeyboardEvent, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDataResidencyRegion(id);
    }
  };

  /** SVG filter id must be valid in `url(#…)` (no colons from `useId`). */
  const dataResidencyMapToneFilterId = `trial-data-residency-tonemap-${useId().replace(/:/g, "")}`;
  const dataResidencyPegShadowFilterId = `trial-data-residency-peg-shadow-${useId().replace(/:/g, "")}`;
  const [dataResidencyHoveredRegionId, setDataResidencyHoveredRegionId] = useState<string | null>(
    null,
  );

  return (
    <div className="trial-secure-comply">
      <section
        className="trial-secure-comply__section"
        aria-labelledby="trial-secure-data-residency-heading"
        aria-required={true}
      >
        <Title
          id="trial-secure-data-residency-heading"
          headingLevel="h2"
          size="xl"
          className="trial-secure-comply__section-title"
        >
          Data residency
          <span className="trial-secure-comply__required-asterisk" aria-hidden="true">
            *
          </span>
          <span className="trial-secure-comply__sr-only">(required)</span>
        </Title>
        <p className="trial-secure-comply__lead trial-secure-comply__lead--data-residency">
          Specify where your data must be stored and processed to meet legal and
          regulatory requirements.
        </p>
        <div className="trial-secure-comply__data-residency-map-wrap">
          <svg
            className="trial-data-residency-map-filter-svg"
            width={0}
            height={0}
            aria-hidden
            focusable="false"
          >
            <defs>
              <filter
                id={dataResidencyMapToneFilterId}
                colorInterpolationFilters="sRGB"
              >
                {/* Asset: ~black ocean, ~charcoal land → light gray ocean (#e4e7eb-ish), white land */}
                <feColorMatrix
                  type="matrix"
                  values="0.47 0 0 0 0.906  0 0.47 0 0 0.906  0 0 0.47 0 0.906  0 0 0 1 0"
                />
              </filter>
            </defs>
          </svg>
          <img
            className="trial-data-residency-world-map-img"
            src={`${import.meta.env.BASE_URL}data-residency-world-map.png`}
            alt=""
            width={1024}
            height={418}
            decoding="async"
            loading="lazy"
            style={{ filter: `url(#${dataResidencyMapToneFilterId})` }}
          />
          <svg
            className="trial-data-residency-map-overlay"
            viewBox={`0 0 ${DATA_RESIDENCY_MAP_VIEW_WIDTH} ${DATA_RESIDENCY_MAP_VIEW_HEIGHT}`}
            preserveAspectRatio="xMidYMin slice"
          >
            <defs>
              <filter
                id={dataResidencyPegShadowFilterId}
                x="-60%"
                y="-60%"
                width="220%"
                height="220%"
                colorInterpolationFilters="sRGB"
              >
                <feDropShadow
                  dx="0"
                  dy="1.5"
                  stdDeviation="1.6"
                  floodColor="#000000"
                  floodOpacity="0.24"
                />
              </filter>
            </defs>
            {DATA_RESIDENCY_REGIONS.map((r) => {
              const selected = selectedRegionSet.has(r.id);
              return (
                <g
                  key={r.id}
                  transform={`translate(${r.mapX} ${r.mapY})`}
                  className={[
                    "trial-data-residency-map-point",
                    `trial-data-residency-macro--${r.macro}`,
                    selected ? "is-selected" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  role="button"
                  tabIndex={0}
                  aria-pressed={selected}
                  aria-label={`${r.shortTitle}. ${r.detail}`}
                  onClick={() => toggleDataResidencyRegion(r.id)}
                  onKeyDown={(e) => onDataResidencyRegionKeyDown(e, r.id)}
                  onMouseEnter={() => setDataResidencyHoveredRegionId(r.id)}
                  onMouseLeave={() => setDataResidencyHoveredRegionId(null)}
                >
                  <circle
                    className="trial-data-residency-map-point__peg"
                    r={10}
                    cx={0}
                    cy={0}
                    filter={`url(#${dataResidencyPegShadowFilterId})`}
                  />
                  {selected && dataResidencyHoveredRegionId !== r.id ? (
                    <g className="trial-data-residency-map-point__sticky" pointerEvents="none" aria-hidden>
                      <DataResidencyMapRegionTooltipBody shortTitle={r.shortTitle} detail={r.detail} />
                    </g>
                  ) : null}
                  {selected ? (
                    <g className="trial-data-residency-map-point__badge" aria-hidden>
                      <circle
                        className="trial-data-residency-map-point__ring"
                        r={10.25}
                        cx={0}
                        cy={0}
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.65}
                        opacity={0.95}
                      />
                      <path
                        className="trial-data-residency-map-point__tick"
                        d="M -3.3 0 L -1.1 2.75 L 3.85 -3.85"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth={1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                  ) : null}
                  <circle
                    className="trial-data-residency-map-point__hit"
                    r={r.mapHitR}
                    cx={0}
                    cy={0}
                  />
                </g>
              );
            })}
            {dataResidencyHoveredRegionId
              ? (() => {
                  const r = DATA_RESIDENCY_REGIONS.find((x) => x.id === dataResidencyHoveredRegionId);
                  if (!r) return null;
                  return (
                    <g
                      key={`data-residency-hover-tip-${r.id}`}
                      transform={`translate(${r.mapX} ${r.mapY})`}
                      pointerEvents="none"
                      aria-hidden
                    >
                      <DataResidencyMapRegionTooltipBody shortTitle={r.shortTitle} detail={r.detail} />
                    </g>
                  );
                })()
              : null}
          </svg>
          <ul
            className="trial-data-residency-map-legend"
            aria-label="Region colors"
          >
            {DATA_RESIDENCY_MACRO_LEGEND.map(({ macro, label }) => (
              <li key={macro} className="trial-data-residency-map-legend__item">
                <span
                  className={`trial-data-residency-map-legend__dot trial-data-residency-macro--${macro}`}
                  aria-hidden
                />
                <span className="trial-data-residency-map-legend__label">{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <div
          className="trial-data-residency-region-list"
          role="group"
          aria-label="Data residency regions"
          aria-required={true}
        >
          {DATA_RESIDENCY_REGIONS.map((r) => {
            const selected = selectedRegionSet.has(r.id);
            return (
              <button
                key={r.id}
                type="button"
                className={[
                  "trial-data-residency-region",
                  `trial-data-residency-macro--${r.macro}`,
                  selected ? "is-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-pressed={selected}
                onClick={() => toggleDataResidencyRegion(r.id)}
              >
                {selected ? (
                  <span className="trial-data-residency-region__badge">Selected</span>
                ) : null}
                <span className="trial-data-residency-region__head">
                  <span className="trial-data-residency-region__mark" aria-hidden>
                    <span className="trial-data-residency-region__peg" />
                  </span>
                  <span className="trial-data-residency-region__title">{r.shortTitle}</span>
                </span>
                <span className="trial-data-residency-region__detail">{r.detail}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section
        className="trial-secure-comply__section"
        aria-labelledby="trial-secure-frameworks-heading"
      >
        <Title
          id="trial-secure-frameworks-heading"
          headingLevel="h2"
          size="xl"
          className="trial-secure-comply__section-title"
        >
          Regulatory frameworks
        </Title>
        <p className="trial-secure-comply__lead trial-secure-comply__lead--sm">
          Select all regulatory frameworks that apply to your organization and
          workload.
        </p>
        <div
          className="trial-secure-comply__framework-list"
          role="group"
          aria-label="Regulatory frameworks"
        >
          {SECURE_COMPLY_REGULATORY_OPTIONS.map((opt) => {
            const id = `trial-secure-fw-${opt.key}`;
            const checked = value[opt.key];
            return (
              <label key={opt.key} className="trial-secure-comply__framework" htmlFor={id}>
                <input
                  id={id}
                  type="checkbox"
                  className="trial-secure-comply__framework-input"
                  checked={checked}
                  onChange={(e) => patch({ [opt.key]: e.target.checked } as Partial<SecureComplyState>)}
                />
                <span className="trial-secure-comply__framework-body">
                  <span className="trial-secure-comply__framework-name">{opt.name}</span>
                  <span className="trial-secure-comply__framework-desc">{opt.description}</span>
                </span>
              </label>
            );
          })}
        </div>
      </section>

      <section
        className="trial-secure-comply__section"
        aria-labelledby="trial-secure-controls-heading"
      >
        <Title
          id="trial-secure-controls-heading"
          headingLevel="h2"
          size="xl"
          className="trial-secure-comply__section-title"
        >
          Security controls
        </Title>
        <p className="trial-secure-comply__lead trial-secure-comply__lead--sm">
          Enable additional security controls for your deployment.
        </p>
        <div className="trial-secure-comply__control-list" role="group" aria-label="Security controls">
          <label className="trial-secure-comply__control" htmlFor="trial-secure-enc-rest">
            <input
              id="trial-secure-enc-rest"
              type="checkbox"
              className="trial-secure-comply__control-input"
              checked={value.encryptionAtRest}
              onChange={(e) => patch({ encryptionAtRest: e.target.checked })}
            />
            <span className="trial-secure-comply__control-label">
              Enable encryption at rest{" "}
              <span className="trial-secure-comply__control-hint">
                (all stored data encrypted)
              </span>
            </span>
          </label>
          <label className="trial-secure-comply__control" htmlFor="trial-secure-enc-transit">
            <input
              id="trial-secure-enc-transit"
              type="checkbox"
              className="trial-secure-comply__control-input"
              checked={value.encryptionInTransit}
              onChange={(e) => patch({ encryptionInTransit: e.target.checked })}
            />
            <span className="trial-secure-comply__control-label">
              Enable encryption in transit{" "}
              <span className="trial-secure-comply__control-hint">
                (TLS 1.3 for all communications)
              </span>
            </span>
          </label>
          <label className="trial-secure-comply__control" htmlFor="trial-secure-audit">
            <input
              id="trial-secure-audit"
              type="checkbox"
              className="trial-secure-comply__control-input"
              checked={value.auditLogging}
              onChange={(e) => patch({ auditLogging: e.target.checked })}
            />
            <span className="trial-secure-comply__control-label">
              Enable comprehensive audit logging
            </span>
          </label>
        </div>
      </section>
    </div>
  );
}
