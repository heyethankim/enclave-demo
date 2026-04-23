import { Content, Title } from "@patternfly/react-core";
import { DATA_RESIDENCY_REGIONS } from "./dataResidencyRegions";
import {
  SECURE_COMPLY_REGULATORY_OPTIONS,
  type SecureComplyState,
} from "./SecureComplyStep";

function reviewRow(label: string, value: string, isRequired = false) {
  return (
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
}

function subsectionTitleRequiredMark() {
  return (
    <span className="trial-review-summary__label-required" aria-hidden>
      {" *"}
    </span>
  );
}

function yn(c: boolean): string {
  return c ? "Yes" : "No";
}

type Props = {
  value: SecureComplyState;
};

/** Read-only summary of Security & Compliance selections for the Review step. */
export function SecureComplyReadOnlySummary({ value }: Props) {
  const selectedRegions = value.dataResidencyRegionIds
    .map((id) => DATA_RESIDENCY_REGIONS.find((r) => r.id === id))
    .filter((r): r is NonNullable<typeof r> => r != null);

  const selectedFrameworks = SECURE_COMPLY_REGULATORY_OPTIONS.filter(
    (opt) => value[opt.key],
  );

  return (
    <div
      className="trial-configure-foundation trial-configure-foundation--secure-compliance trial-secure-comply-review"
      aria-labelledby="trial-secure-review-main-heading"
    >
      <Title
        id="trial-secure-review-main-heading"
        headingLevel="h2"
        size="xl"
        className="trial-configure-foundation__title"
      >
        Security & Compliance
      </Title>
      <div className="trial-secure-comply-review__rail">
        <section
          className="trial-secure-comply-review__section"
          aria-labelledby="trial-secure-review-data-heading"
        >
          <Title
            id="trial-secure-review-data-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Data residency
            {subsectionTitleRequiredMark()}
          </Title>
          {selectedRegions.length === 0 ? (
            <Content component="p" className="trial-secure-comply-review__empty">
              No regions selected.
            </Content>
          ) : (
            <ul className="trial-secure-comply-review__region-list">
              {selectedRegions.map((r) => (
                <li key={r.id} className="trial-secure-comply-review__region-item">
                  <span className="trial-secure-comply-review__region-title">{r.shortTitle}</span>
                  <span className="trial-secure-comply-review__region-detail">{r.detail}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="trial-secure-comply-review__section"
          aria-labelledby="trial-secure-review-fw-heading"
        >
          <Title
            id="trial-secure-review-fw-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Regulatory frameworks
            {subsectionTitleRequiredMark()}
          </Title>
          {selectedFrameworks.length === 0 ? (
            <Content component="p" className="trial-secure-comply-review__empty">
              None selected.
            </Content>
          ) : (
            <ul className="trial-secure-comply-review__framework-list">
              {selectedFrameworks.map((opt) => (
                <li key={opt.key} className="trial-secure-comply-review__framework-item">
                  <span className="trial-secure-comply-review__framework-name">{opt.name}</span>
                  <span className="trial-secure-comply-review__framework-desc">{opt.description}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section
          className="trial-secure-comply-review__section"
          aria-labelledby="trial-secure-review-controls-heading"
        >
          <Title
            id="trial-secure-review-controls-heading"
            headingLevel="h4"
            size="md"
            className="trial-configure-summary__subsection-title"
          >
            Security controls
          </Title>
          <div className="trial-review-summary__rows">
            {reviewRow("Encryption at rest", yn(value.encryptionAtRest), true)}
            {reviewRow("Encryption in transit", yn(value.encryptionInTransit), true)}
            {reviewRow("Comprehensive audit logging", yn(value.auditLogging), true)}
          </div>
        </section>
      </div>
    </div>
  );
}
