import { Component, type ErrorInfo, type ReactNode } from "react";

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
        <div
          style={{
            minHeight: "100dvh",
            padding: "2rem",
            fontFamily: "system-ui, sans-serif",
            background: "#0c0c14",
            color: "#f5f5f5",
            maxWidth: "40rem",
          }}
        >
          <h1 style={{ fontSize: "1.25rem", marginTop: 0 }}>Something went wrong</h1>
          <p style={{ color: "#c7c7c7", lineHeight: 1.5 }}>
            The wizard failed to load. Check the browser developer console for details, then try
            refreshing. If you opened this app from a built folder, use{" "}
            <code style={{ color: "#fff" }}>npm run preview</code> instead of opening{" "}
            <code style={{ color: "#fff" }}>index.html</code> directly.
          </p>
          <pre
            style={{
              overflow: "auto",
              padding: "1rem",
              background: "#1a1a22",
              borderRadius: 8,
              fontSize: "0.85rem",
              color: "#ffb4b4",
            }}
          >
            {this.state.error.message}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
