import { Fragment, useEffect, useMemo, useState } from "react";
import {
  Alert,
  EmptyState,
  EmptyStateBody,
  List,
  ListComponent,
  ListItem,
  Tab,
  Tabs,
  TabTitleText,
  Title,
} from "@patternfly/react-core";
import { getSelectedSovereignFlavorsForSummary } from "./SovereignFlavorCards";
import type { SovereignFlavorId } from "./SovereignFlavorCards";
import type { ConfigureValidationIssue, FormState } from "./TriadFlavorConfigureFields";
import { FlavorConfigureFields, initialFormState } from "./TriadFlavorConfigureFields";

type Props = {
  selected: ReadonlySet<SovereignFlavorId>;
  forms: Partial<Record<SovereignFlavorId, FormState>>;
  onFormChange: (id: SovereignFlavorId, form: FormState) => void;
  readOnly?: boolean;
  /** Shown above the service tabs after a failed attempt to continue. */
  configureValidationIssues?: ConfigureValidationIssue[];
  /** Bumps when validation fails so we can focus the first tab with an error. */
  configureValidationFocusNonce?: number;
  /** Inline field errors (e.g. host IP) only after a failed Next. */
  showSubmitValidationErrors?: boolean;
};

export function ConfigureDeployment({
  selected,
  forms,
  onFormChange,
  readOnly = false,
  configureValidationIssues = [],
  configureValidationFocusNonce = 0,
  showSubmitValidationErrors = false,
}: Props) {
  const rows = useMemo(
    () => getSelectedSovereignFlavorsForSummary(selected),
    [selected],
  );

  const [activeTab, setActiveTab] = useState<SovereignFlavorId | null>(null);

  useEffect(() => {
    if (rows.length === 0) {
      return;
    }
    setActiveTab((prev) =>
      prev !== null && rows.some((r) => r.id === prev)
        ? prev
        : rows[0]!.id,
    );
  }, [rows]);

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

  const activeKey = activeTab ?? rows[0]!.id;

  const showValidationAlert =
    !readOnly &&
    configureValidationIssues.length > 0 &&
    configureValidationFocusNonce > 0;

  useEffect(() => {
    if (!showValidationAlert || configureValidationIssues.length === 0) {
      return;
    }
    const first = configureValidationIssues[0]!.flavorId;
    if (rows.some((r) => r.id === first)) {
      setActiveTab(first);
    }
  }, [configureValidationFocusNonce, showValidationAlert, configureValidationIssues, rows]);

  return (
    <div
      className={[
        "trial-configure-summary",
        readOnly ? "trial-configure-summary--read-only" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showValidationAlert ? (
        <Alert
          variant="danger"
          isInline
          className="trial-configure-summary__validation-alert"
          title="Fix the following on Configure before continuing"
        >
          <List component={ListComponent.ul}>
            {configureValidationIssues.map((issue) => {
              const row = rows.find((r) => r.id === issue.flavorId);
              const serviceLabel = row?.fullTitle ?? issue.flavorId;
              const tabHint = row?.chip
                ? `Use the "${row.chip}" tab.`
                : null;
              return (
                <Fragment key={issue.flavorId}>
                  {issue.messages.map((msg) => (
                    <ListItem key={`${issue.flavorId}-${msg}`}>
                      <strong>{serviceLabel}</strong>
                      {tabHint ? <> — {tabHint}</> : null} {msg}
                    </ListItem>
                  ))}
                </Fragment>
              );
            })}
          </List>
        </Alert>
      ) : null}
      <Tabs
        id="trial-configure-services-tabs"
        className="trial-configure-summary__tabs"
        aria-label="Services"
        activeKey={activeKey}
        onSelect={(_e, key) => setActiveTab(key as SovereignFlavorId)}
      >
        {rows.map(({ id, chip, fullTitle, icon }) => (
          <Tab
            key={id}
            eventKey={id}
            title={<TabTitleText>{chip}</TabTitleText>}
          >
            <div className="trial-configure-summary__block">
              <div className="trial-configure-summary__title-with-icon">
                <div className="trial-configure-summary__icon" aria-hidden>
                  {icon}
                </div>
                <Title
                  headingLevel="h3"
                  size="xl"
                  className="trial-configure-summary__service-title"
                >
                  {fullTitle}
                </Title>
              </div>
              <div className="trial-configure-summary__service-addon">
                <FlavorConfigureFields
                  flavorId={id}
                  form={forms[id] ?? initialFormState(id)}
                  onFormChange={(form) => onFormChange(id, form)}
                  readOnly={readOnly}
                  showSubmitValidationErrors={showSubmitValidationErrors}
                />
              </div>
            </div>
          </Tab>
        ))}
      </Tabs>
    </div>
  );
}
