import { Fragment } from "react";
import {
  Button,
  FormGroup,
  FormHelperText,
  TextInput,
} from "@patternfly/react-core";
import type { AgentHost } from "./TriadFlavorConfigureFields";

function RedfishEyeShowIcon() {
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

function RedfishEyeHideIcon() {
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

export type AgentHostWorkloadCardProps = {
  host: AgentHost;
  /** Prefix for stable element ids, e.g. `trial-cluster-wl-host` */
  idPrefix: string;
  /** Screen-reader / aria context, e.g. `Node 1` or `Host 1` */
  hostLabelForAria: string;
  readOnly: boolean;
  showSubmitValidationErrors: boolean;
  onUpdateHost: (patch: Partial<AgentHost>) => void;
  passwordVisible: boolean;
  onTogglePassword: () => void;
};

export function AgentHostWorkloadCard({
  host,
  idPrefix,
  hostLabelForAria,
  readOnly,
  showSubmitValidationErrors,
  onUpdateHost,
  passwordVisible,
  onTogglePassword,
}: AgentHostWorkloadCardProps) {
  const ro = readOnly
    ? ({ readOnlyVariant: "default" as const } satisfies { readOnlyVariant: "default" })
    : {};

  const ipFieldId = `${idPrefix}-${host.id}-ip`;
  const ipHelperId = `${ipFieldId}-helper`;
  const nameFieldId = `${idPrefix}-${host.id}-name`;
  const nameHelperId = `${nameFieldId}-helper`;
  const macFieldId = `${idPrefix}-${host.id}-mac`;
  const macHelperId = `${macFieldId}-helper`;
  const rootFieldId = `${idPrefix}-${host.id}-root`;
  const rootHelperId = `${rootFieldId}-helper`;
  const redfishFieldId = `${idPrefix}-${host.id}-redfish`;
  const redfishHelperId = `${redfishFieldId}-helper`;
  const rfUserFieldId = `${idPrefix}-${host.id}-rf-user`;
  const rfUserHelperId = `${rfUserFieldId}-helper`;
  const rfPassFieldId = `${idPrefix}-${host.id}-rf-pass`;
  const rfPassHelperId = `${rfPassFieldId}-helper`;

  const nameMissing = host.name.trim() === "";
  const macMissing = host.mac.trim() === "";
  const ipMissing = host.ip.trim() === "";
  const rootMissing = host.rootDisk.trim() === "";
  const redfishMissing = host.redfish.trim() === "";
  const redfishUserMissing = host.redfishUser.trim() === "";
  const redfishPasswordMissing = host.redfishPassword.trim() === "";

  const showNameError = showSubmitValidationErrors && nameMissing;
  const showMacError = showSubmitValidationErrors && macMissing;
  const showIpError = showSubmitValidationErrors && ipMissing;
  const showRootError = showSubmitValidationErrors && rootMissing;
  const showRedfishError = showSubmitValidationErrors && redfishMissing;
  const showRedfishUserError = showSubmitValidationErrors && redfishUserMissing;
  const showRedfishPasswordError = showSubmitValidationErrors && redfishPasswordMissing;

  return (
    <div className="trial-configure-summary__vm-host-grid">
      <FormGroup label="Name" fieldId={nameFieldId} isRequired>
        <Fragment>
          <TextInput
            id={nameFieldId}
            value={host.name}
            isRequired
            validated={showNameError ? "error" : "default"}
            aria-invalid={showNameError}
            aria-describedby={showNameError ? nameHelperId : undefined}
            {...ro}
            onChange={
              readOnly ? () => {} : (_e, v) => onUpdateHost({ name: v })
            }
            aria-label={`${hostLabelForAria} name`}
          />
          {showNameError ? (
            <FormHelperText id={nameHelperId} className="trial-field-helper--error">
              Enter a host name.
            </FormHelperText>
          ) : null}
        </Fragment>
      </FormGroup>
      <FormGroup label="MAC address" fieldId={macFieldId} isRequired>
        <Fragment>
          <TextInput
            id={macFieldId}
            value={host.mac}
            isRequired
            validated={showMacError ? "error" : "default"}
            aria-invalid={showMacError}
            aria-describedby={showMacError ? macHelperId : undefined}
            {...ro}
            onChange={readOnly ? () => {} : (_e, v) => onUpdateHost({ mac: v })}
            aria-label={`${hostLabelForAria} MAC address`}
          />
          {showMacError ? (
            <FormHelperText id={macHelperId} className="trial-field-helper--error">
              Enter a MAC address.
            </FormHelperText>
          ) : null}
        </Fragment>
      </FormGroup>
      <FormGroup label="IP address" fieldId={ipFieldId} isRequired>
        <Fragment>
          <TextInput
            id={ipFieldId}
            value={host.ip}
            isRequired
            validated={showIpError ? "error" : "default"}
            aria-invalid={showIpError}
            aria-describedby={showIpError ? ipHelperId : undefined}
            {...ro}
            onChange={readOnly ? () => {} : (_e, v) => onUpdateHost({ ip: v })}
            aria-label={`${hostLabelForAria} IP address`}
          />
          {showIpError ? (
            <FormHelperText id={ipHelperId} className="trial-field-helper--error">
              Enter the host IP address.
            </FormHelperText>
          ) : null}
        </Fragment>
      </FormGroup>
      <FormGroup label="Redfish" fieldId={redfishFieldId} isRequired>
        <Fragment>
          <TextInput
            id={redfishFieldId}
            value={host.redfish}
            isRequired
            validated={showRedfishError ? "error" : "default"}
            aria-invalid={showRedfishError}
            aria-describedby={showRedfishError ? redfishHelperId : undefined}
            {...ro}
            onChange={readOnly ? () => {} : (_e, v) => onUpdateHost({ redfish: v })}
            aria-label={`${hostLabelForAria} Redfish BMC address`}
          />
          {showRedfishError ? (
            <FormHelperText id={redfishHelperId} className="trial-field-helper--error">
              Enter Redfish BMC address.
            </FormHelperText>
          ) : null}
        </Fragment>
      </FormGroup>
      <div className="trial-configure-summary__vm-host-grid__full">
        <FormGroup label="Root disk" fieldId={rootFieldId} isRequired>
          <Fragment>
            <TextInput
              id={rootFieldId}
              value={host.rootDisk}
              isRequired
              validated={showRootError ? "error" : "default"}
              aria-invalid={showRootError}
              aria-describedby={showRootError ? rootHelperId : undefined}
              {...ro}
              onChange={readOnly ? () => {} : (_e, v) => onUpdateHost({ rootDisk: v })}
              aria-label={`${hostLabelForAria} root disk`}
            />
            {showRootError ? (
              <FormHelperText id={rootHelperId} className="trial-field-helper--error">
                Enter a root disk path.
              </FormHelperText>
            ) : null}
          </Fragment>
        </FormGroup>
      </div>
      <FormGroup label="Redfish user" fieldId={rfUserFieldId} isRequired>
        <Fragment>
          <TextInput
            id={rfUserFieldId}
            value={host.redfishUser}
            isRequired
            validated={showRedfishUserError ? "error" : "default"}
            aria-invalid={showRedfishUserError}
            aria-describedby={showRedfishUserError ? rfUserHelperId : undefined}
            {...ro}
            onChange={readOnly ? () => {} : (_e, v) => onUpdateHost({ redfishUser: v })}
            aria-label={`${hostLabelForAria} Redfish user`}
          />
          {showRedfishUserError ? (
            <FormHelperText id={rfUserHelperId} className="trial-field-helper--error">
              Enter Redfish user.
            </FormHelperText>
          ) : null}
        </Fragment>
      </FormGroup>
      <FormGroup label="Redfish password" fieldId={rfPassFieldId} isRequired>
        <Fragment>
          <div className="trial-password-input-group">
            <TextInput
              id={rfPassFieldId}
              className="trial-password-input-group__input"
              type={passwordVisible ? "text" : "password"}
              value={host.redfishPassword}
              isRequired
              validated={showRedfishPasswordError ? "error" : "default"}
              aria-invalid={showRedfishPasswordError}
              aria-describedby={showRedfishPasswordError ? rfPassHelperId : undefined}
              {...ro}
              onChange={readOnly ? () => {} : (_e, v) => onUpdateHost({ redfishPassword: v })}
              aria-label={`${hostLabelForAria} Redfish password`}
            />
            <Button
              type="button"
              variant="plain"
              className="trial-password-input-group__toggle"
              aria-label={
                passwordVisible
                  ? `Hide ${hostLabelForAria} Redfish password`
                  : `Show ${hostLabelForAria} Redfish password`
              }
              aria-pressed={passwordVisible}
              aria-controls={rfPassFieldId}
              onClick={readOnly ? undefined : onTogglePassword}
              isDisabled={readOnly}
            >
              {passwordVisible ? <RedfishEyeHideIcon /> : <RedfishEyeShowIcon />}
            </Button>
          </div>
          {showRedfishPasswordError ? (
            <FormHelperText id={rfPassHelperId} className="trial-field-helper--error">
              Enter Redfish password.
            </FormHelperText>
          ) : null}
        </Fragment>
      </FormGroup>
    </div>
  );
}
