import {
  Divider,
  EmptyState,
  EmptyStateBody,
  List,
  ListComponent,
  ListItem,
  Title,
} from "@patternfly/react-core";
import { getSelectedSovereignFlavorsForSummary } from "./SovereignFlavorCards";
import type { SovereignFlavorId } from "./SovereignFlavorCards";
import { FlavorConfigureFields } from "./TriadFlavorConfigureFields";

type Props = {
  selected: ReadonlySet<SovereignFlavorId>;
};

export function ConfigureDeployment({ selected }: Props) {
  const rows = getSelectedSovereignFlavorsForSummary(selected);

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

  return (
    <div className="trial-configure-summary">
      <List
        component={ListComponent.ul}
        className="trial-configure-summary__list"
        aria-label="Selected services"
      >
        {rows.map(({ id, fullTitle, icon }, index) => (
          <ListItem key={id} className="trial-configure-summary__item">
            {index > 0 ? (
              <Divider
                component="div"
                className="trial-configure-summary__divider"
              />
            ) : null}
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
                <FlavorConfigureFields flavorId={id} />
              </div>
            </div>
          </ListItem>
        ))}
      </List>
    </div>
  );
}
