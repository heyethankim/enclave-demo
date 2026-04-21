import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@patternfly/patternfly/patternfly.css";
import "./trial-wizard.css";
import "./index.css";
import App from "./App";
import { ErrorBoundary } from "./ErrorBoundary";

const el = document.getElementById("root");
if (!el) {
  throw new Error("Missing #root — check index.html");
}

createRoot(el).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
