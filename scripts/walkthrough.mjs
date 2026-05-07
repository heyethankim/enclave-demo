#!/usr/bin/env node
/**
 * Infra admin — facilitator script for the Open Sovereign AI Cloud setup wizard.
 *
 * Prints a step-by-step demo / dry-run narrative you can follow in the UI
 * (npm run dev). No browser automation; safe to run offline.
 *
 * Usage: npm run walkthrough
 *        node scripts/walkthrough.mjs
 */

const script = String.raw`
================================================================================
  INFRASTRUCTURE ADMINISTRATOR — WIZARD WALKTHROUGH
  Open Sovereign AI Cloud (OSAC) setup wizard — from landing through artifacts
================================================================================

Audience: You are guiding (or playing) an Infrastructure Administrator who owns
platform bootstrap, networking, storage, and compliance handoff to security.

Prerequisite: Run the app locally (npm run dev), then open the URL Vite prints.

--------------------------------------------------------------------------------
0) LANDING — “Welcome to Open Sovereign AI Cloud”
--------------------------------------------------------------------------------

  On screen
  - Hero heading: “Welcome to Open Sovereign AI Cloud”
  - Intro copy explains deploying a sovereign, fully disconnected OpenShift-style
    environment through a short wizard.
  - Three highlights (read left to right on wide viewports):
      • Automated Bootstrap — image distribution and infra setup, automated
      • Fully Disconnected — air-gapped by design
      • Smart Defaults — preconfigured cluster, GPU, and storage settings

  Infra admin angle
  - Frame this as your path from “greenfield sovereign footprint” to downloadable
    installer + config bundle, without touching a public registry in production.

  Do this
  - Click “Get started”.

  Optional say-this
  - “We’ll stay on a guided path: select services, lay down infra and workload
     defaults, record residency and regulatory posture, then review and generate
     disconnected artifacts.”

--------------------------------------------------------------------------------
1) SELECT — sovereign cloud setup
--------------------------------------------------------------------------------

  On screen
  - Heading: “Select your sovereign cloud setup”
  - Four selectable cards (checkbox semantics): VM, Cluster, Model, Bare metal
    as a Service — each lists concrete includes (storage, networking, GPU, etc.).

  Infra admin angle
  - Defaults in the demo typically include VM + Cluster; that’s a realistic
    platform team starting point (tenant VMs plus a managed Kubernetes plane).
  - If you add Bare metal or Model services, Configure grows extra sub-steps.

  Do this
  - Adjust selections to match your story (or keep VM + Cluster).
  - Click “Next” in the footer.

  Optional say-this
  - “Here we declare which service planes we’re responsible for provisioning;
     everything downstream keys off this set.”

--------------------------------------------------------------------------------
2) CONFIGURE — deployment (sub-stepper: Infrastructure → workloads)
--------------------------------------------------------------------------------

  On screen
  - Vertical progress stepper on the left; main pane shows one sub-step at a time.
  - Footer inside the card: “Back” / “Continue” between sub-steps.
  - When you reach the last sub-step, click “Continue” once more to see
    “Completed” — that unlocks the wizard-level “Next”.

  Infra admin angle
  - With both VM and Cluster selected, the shared “Infrastructure” form is owned
    by the Cluster triad (cluster network, API / ingress VIPs, machine network,
    agent hosts, storage class defaults). Then you visit VM workload and Cluster
    workload sections (instance/OS profiles; cluster nodes, HA, autoscale).
  - Call out: this is where you’d align with IPAM, storage, and install media
    in a real engagement — the UI is a structured intake, not production state.

  Do this
  - Sub-step “Infrastructure”: confirm or edit base domain, service name, VIPs,
    machine network, agent host rows, and storage backend fields as needed.
    Fix any inline validation called out before continuing.
  - Click “Continue” through each workload sub-step (e.g. VM as a Service, then
    Cluster as a Service) until the final sub-step shows “Completed”.
  - Click wizard “Next”.

  Optional say-this
  - “We normalize infra once, then fan out into per-service workload policies so
     downstream automation can render install manifests consistently.”

--------------------------------------------------------------------------------
3) SECURE & COMPLY
--------------------------------------------------------------------------------

  On screen
  - “Data residency” map: at least one region must be selected before “Next”
    enables (pegs are keyboard-focusable buttons with region names).
  - Regulatory and security toggles (e.g. GDPR, ISO 27001, encryption, audit).

  Infra admin angle
  - Position yourself as capturing constraints the platform must honor; security
    org may own the toggles, but you need the residency pins for networking and
    mirror placement.

  Do this
  - Select one or more map regions (e.g. “US East”) that fit your scenario.
  - Adjust compliance toggles to match the customer profile.
  - Click “Next”.

  Optional say-this
  - “Residency isn’t decorative here — it gates whether we let you advance,
     which mirrors how we’d fail closed in automation if regions aren’t pinned.”

--------------------------------------------------------------------------------
4) REVIEW
--------------------------------------------------------------------------------

  On screen
  - Read-only stack: Infrastructure, workload summaries, and Security &
    Compliance summary.

  Infra admin angle
  - Use this as the handoff checkpoint: IP scheme, storage class, node inventory,
    and compliance flags should match the architecture decision record.

  Do this
  - Read top to bottom; if something is wrong, use wizard “Back” to the right step.
  - When satisfied, click “Next”.

  Optional say-this
  - “This is the last human gate before we treat inputs as immutable for the
     artifact build.”

--------------------------------------------------------------------------------
5) GENERATE — artifact build
--------------------------------------------------------------------------------

  On screen
  - Progress phases (mirror, catalogs, manifests, ISO, etc.).
  - After completion: success title about installer ISO + configuration file,
    with actions to download a demo ISO and a demo YAML config.

  Infra admin angle
  - Explain that in production this step wraps disconnected mirror sync and
    image set bundling; in the demo, downloads are placeholders proving the UX.

  Do this
  - Wait for the success state.
  - Optionally trigger “Download installer ISO” and “Download config” to show
    the operator handoff.

  Optional say-this
  - “From here, the same bundle would land on a bastion or jump host inside the
     air gap for controlled install — we’ve closed the loop from welcome screen
     to consumable artifacts.”

================================================================================
End of walkthrough. Re-run: npm run walkthrough
================================================================================
`;

process.stdout.write(script);
