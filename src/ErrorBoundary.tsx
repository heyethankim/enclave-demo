import { Component, type ErrorInfo, type ReactNode } from "react";
import { Alert, AlertVariant, Bullseye, Content, Title } from "@patternfly/react-core";

type Props = { children: ReactNode };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <Bullseye>
          <div style={{ maxWidth: "40rem", padding: "var(--pf-t--global--spacer--lg)" }}>
            <Alert variant={AlertVariant.danger} title="Something went wrong" isInline={false}>
              <Content component="p">
                The wizard failed to load. Check the browser developer console for details, then try
                refreshing. If you opened this app from a built folder, use{" "}
                <code>npm run preview</code> instead of opening <code>index.html</code> directly.
              </Content>
            </Alert>
            <Title headingLevel="h2" size="md" style={{ marginTop: "var(--pf-t--global--spacer--md)" }}>
              Details
            </Title>
            <Content component="pre" style={{ marginTop: "var(--pf-t--global--spacer--sm)" }}>
              {this.state.error.message}
            </Content>
          </div>
        </Bullseye>
      );
    }
    return this.props.children;
  }
}
