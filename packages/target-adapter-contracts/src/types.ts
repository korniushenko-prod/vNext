import {
  WAVE8_EXECUTION_BASELINE_OPERATION_KINDS,
  WAVE14_PACKAGE_MODE_EXECUTION_INTENTS,
  WAVE14_PACKAGE_MODE_TRANSITION_STATES,
  WAVE14_PACKAGE_PHASE_STATES,
  WAVE14_PACKAGE_TRANSITION_GUARD_STATES,
  WAVE15_PACKAGE_GATE_STATES,
  WAVE16_PACKAGE_PROTECTION_STATES,
  WAVE17_PACKAGE_ARBITRATION_RESULTS,
  WAVE17_PACKAGE_COMMAND_REQUEST_KINDS,
  WAVE17_PACKAGE_OWNERSHIP_LANES,
  WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_STATES
} from "./constants.js";

export type TargetAdapterCapability = "validate" | "emit" | "apply" | "readback" | "diagnostics";
export type TargetArtifactKind = "bundle" | "firmware" | "config" | "report";
export type TargetDiagnosticSeverity = "error" | "warning" | "info";
export type TargetReadbackScope = "summary" | "full";
export type TargetOperationConfirmationTokenValidation = "none" | "when_required";
export type TargetExecutionBaselineOperationKind = typeof WAVE8_EXECUTION_BASELINE_OPERATION_KINDS[number];
export type TargetOperationInvocationAction = "invoke" | "apply_recommendation" | "reject_recommendation";
export type TargetOperationRecommendationState = "none" | "available" | "pending_apply" | "applied" | "rejected";
export type TargetPackageModeTransitionIntent = typeof WAVE14_PACKAGE_MODE_EXECUTION_INTENTS[number];
export type TargetPackageModeTransitionState = typeof WAVE14_PACKAGE_MODE_TRANSITION_STATES[number];
export type TargetPackagePhaseState = typeof WAVE14_PACKAGE_PHASE_STATES[number];
export type TargetPackageTransitionGuardState = typeof WAVE14_PACKAGE_TRANSITION_GUARD_STATES[number];
export type TargetPackageGateState = typeof WAVE15_PACKAGE_GATE_STATES[number];
export type TargetPackageProtectionState = typeof WAVE16_PACKAGE_PROTECTION_STATES[number];
export type TargetPackageCommandRequestKind = typeof WAVE17_PACKAGE_COMMAND_REQUEST_KINDS[number];
export type TargetPackageOwnershipLane = typeof WAVE17_PACKAGE_OWNERSHIP_LANES[number];
export type TargetPackageArbitrationResult = typeof WAVE17_PACKAGE_ARBITRATION_RESULTS[number];
export type TargetPackageHandoverRequestKind = typeof WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS[number];
export type TargetPackageHandoverRequestState = typeof WAVE18_PACKAGE_HANDOVER_REQUEST_STATES[number];
export type TargetPackageHandoverDenialReason = typeof WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS[number];
export type RuntimeOperationState =
  | "idle"
  | "pending_confirmation"
  | "accepted"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "rejected";

export interface RuntimePackRef {
  pack_id: string;
  schema_version: string;
}

export interface TargetAdapterManifest {
  id: string;
  kind: "target_adapter";
  contract_version: string;
  display_name: string;
  target_family: string;
  runtime_pack_schema_version: string;
  capabilities: TargetAdapterCapability[];
  artifact_kinds: TargetArtifactKind[];
}

export interface TargetPulseSourceConstraint {
  mode: string;
  required_binding_kind: string;
  required_value_types?: string[];
  notes?: string;
}

export interface TargetAdapterCapabilityProfile {
  target_id: string;
  display_name: string;
  supported_binding_kinds: string[];
  supported_channel_kinds: string[];
  supported_value_types: string[];
  supported_native_kinds: string[];
  supported_operation_kinds: string[];
  supports_trace: boolean;
  supports_operations: boolean;
  operations_support?: TargetOperationSupportProfile;
  package_supervision_support?: TargetPackageSupervisionSupportProfile;
  package_coordination_support?: TargetPackageCoordinationSupportProfile;
  package_mode_phase_support?: TargetPackageModePhaseSupportProfile;
  package_permissive_interlock_support?: TargetPackagePermissiveInterlockSupportProfile;
  package_protection_recovery_support?: TargetPackageProtectionRecoverySupportProfile;
  package_arbitration_support?: TargetPackageArbitrationSupportProfile;
  package_override_handover_support?: TargetPackageOverrideHandoverSupportProfile;
  supports_persistence: boolean;
  supports_simulation: boolean;
  supported_pulse_source_modes?: string[];
  pulse_source_constraints?: TargetPulseSourceConstraint[];
  limits: {
    max_instances: number;
    max_connections: number;
    max_resources: number;
  };
}

export interface TargetOperationSupportProfile {
  enabled: boolean;
  invoke: boolean;
  cancel: boolean;
  progress: boolean;
  result_payload: boolean;
  confirmation: boolean;
  execution_baseline_kinds?: TargetExecutionBaselineOperationKind[];
  confirmation_token_validation?: TargetOperationConfirmationTokenValidation;
  failure_payload?: boolean;
  audit_hooks?: boolean;
  recommendation_lifecycle?: boolean;
  progress_payload?: boolean;
}

export interface TargetPackageSupervisionSupportProfile {
  enabled: boolean;
  summary_outputs: boolean;
  aggregate_monitors: boolean;
  aggregate_alarms: boolean;
  trace_groups: boolean;
  operation_proxies: boolean;
}

export interface TargetPackageCoordinationSupportProfile {
  enabled: boolean;
  package_state: boolean;
  summary_outputs: boolean;
  aggregate_monitors: boolean;
  trace_groups: boolean;
  operation_proxies: boolean;
}

export interface TargetPackageModePhaseSupportProfile {
  enabled: boolean;
  modes: boolean;
  phases: boolean;
  mode_summary: boolean;
  phase_summary: boolean;
  groups: boolean;
  trace_groups: boolean;
  active_refs: boolean;
  package_mode_execution?: boolean;
  phase_transition_execution?: boolean;
  transition_guard_diagnostics?: boolean;
}

export interface TargetPackagePermissiveInterlockSupportProfile {
  enabled: boolean;
  gate_summary: boolean;
  reason_codes: boolean;
  diagnostics_refs: boolean;
  transition_guards: boolean;
}

export interface TargetPackageProtectionRecoverySupportProfile {
  enabled: boolean;
  protection_summary: boolean;
  reason_codes: boolean;
  diagnostics_refs: boolean;
  recovery_requests: boolean;
}

export interface TargetPackageArbitrationSupportProfile {
  enabled: boolean;
  ownership_lanes: boolean;
  command_summary: boolean;
  reason_codes: boolean;
  request_preview: boolean;
  supported_ownership_lanes?: TargetPackageOwnershipLane[];
  supported_request_kinds?: TargetPackageCommandRequestKind[];
}

export interface TargetPackageOverrideHandoverSupportProfile {
  enabled: boolean;
  holder_visibility: boolean;
  request_visibility: boolean;
  reason_codes: boolean;
  last_handover_reason: boolean;
  supported_holder_lanes?: TargetPackageOwnershipLane[];
  supported_request_kinds?: TargetPackageHandoverRequestKind[];
  supported_denial_reasons?: TargetPackageHandoverDenialReason[];
}

export interface TargetAdapterDiagnostic {
  code: string;
  severity: TargetDiagnosticSeverity;
  message: string;
  path?: string;
}

export interface TargetDeploymentRequest {
  request_id: string;
  adapter_id: string;
  pack: RuntimePackRef;
  options: Record<string, unknown>;
}

export interface TargetArtifact {
  id: string;
  kind: TargetArtifactKind;
  uri?: string;
  media_type?: string;
  meta?: Record<string, unknown>;
}

export interface TargetDeploymentResult {
  request_id: string;
  success: boolean;
  diagnostics: TargetAdapterDiagnostic[];
  artifacts: Record<string, TargetArtifact>;
}

export interface TargetReadbackRequest {
  request_id: string;
  adapter_id: string;
  target_id: string;
  scope: TargetReadbackScope;
}

export interface TargetReadbackSnapshot {
  request_id: string;
  target_id: string;
  collected_at: string;
  signals: Record<string, unknown>;
  resources: Record<string, unknown>;
  operation_snapshots?: Record<string, RuntimeOperationSnapshot>;
  package_snapshots?: Record<string, TargetPackageSupervisionSnapshot>;
  package_coordination_snapshots?: Record<string, TargetPackageCoordinationSnapshot>;
  package_mode_phase_snapshots?: Record<string, TargetPackageModePhaseSnapshot>;
  package_permissive_interlock_snapshots?: Record<string, TargetPackagePermissiveInterlockSnapshot>;
  package_protection_recovery_snapshots?: Record<string, TargetPackageProtectionRecoverySnapshot>;
  package_arbitration_snapshots?: Record<string, TargetPackageArbitrationSnapshot>;
  package_override_handover_snapshots?: Record<string, TargetPackageOverrideHandoverSnapshot>;
  diagnostics: TargetAdapterDiagnostic[];
}

export interface RuntimeOperationSnapshot {
  operation_id: string;
  state: RuntimeOperationState;
  progress?: number;
  progress_payload?: Record<string, unknown>;
  message?: string;
  result?: Record<string, unknown>;
  failure?: Record<string, unknown>;
  audit_record_id?: string;
  recommendation_state?: TargetOperationRecommendationState;
}

export interface TargetPackageSupervisionSnapshot {
  package_instance_id: string;
  state?: "healthy" | "degraded" | "alarm_present" | "maintenance_due" | "stale" | "unsupported_by_target";
  summary?: Record<string, unknown>;
  aggregate_monitor_states?: Record<string, unknown>;
  aggregate_alarm_states?: Record<string, unknown>;
  operation_proxy_states?: Record<string, RuntimeOperationSnapshot>;
}

export interface TargetPackageCoordinationSnapshot {
  package_instance_id: string;
  state?: "standby" | "ready" | "circulation_active" | "control_active" | "fault_latched" | "no_snapshot" | "unsupported_by_target";
  summary?: Record<string, unknown>;
  aggregate_monitor_states?: Record<string, unknown>;
  operation_proxy_states?: Record<string, RuntimeOperationSnapshot>;
}

export interface TargetPackageModePhaseSnapshot {
  package_instance_id: string;
  state?: "mode_phase_available" | "no_snapshot" | "unsupported_by_target";
  active_mode_id?: string;
  active_phase_id?: string;
  active_transition_intent?: TargetPackageModeTransitionIntent;
  transition_state?: TargetPackageModeTransitionState;
  mode_summary?: Record<string, unknown>;
  phase_summary?: Record<string, unknown>;
  mode_group_states?: Record<string, unknown>;
  phase_group_states?: Record<string, unknown>;
  phase_states?: Record<string, TargetPackagePhaseState>;
  transition_guard_states?: Record<string, TargetPackageTransitionGuardState>;
}

export interface TargetPackagePermissiveInterlockSnapshot {
  package_instance_id: string;
  state?: TargetPackageGateState | "no_snapshot" | "unsupported_by_target";
  gate_summary?: TargetPackageGateSummarySnapshot;
  permissive_states?: Record<string, TargetPackageGateReasonSnapshot>;
  interlock_states?: Record<string, TargetPackageGateReasonSnapshot>;
  transition_guard_states?: Record<string, TargetPackageTransitionGuardSnapshot>;
}

export interface TargetPackageGateSummarySnapshot {
  state: TargetPackageGateState;
  ready: boolean;
  blocked_reason_ids?: string[];
  held_reason_ids?: string[];
  faulted_reason_ids?: string[];
  transition_guard_ids?: string[];
}

export interface TargetPackageGateReasonSnapshot {
  state: TargetPackageGateState;
  reason_code?: string;
  diagnostic_ref?: string;
  summary?: string;
}

export interface TargetPackageTransitionGuardSnapshot {
  state: TargetPackageTransitionGuardState;
  blocked_by_ids?: string[];
  summary?: string;
}

export interface TargetPackageProtectionRecoverySnapshot {
  package_instance_id: string;
  state?: TargetPackageProtectionState | "no_snapshot" | "unsupported_by_target";
  protection_summary?: TargetPackageProtectionSummarySnapshot;
  trip_states?: Record<string, TargetPackageProtectionReasonSnapshot>;
  inhibit_states?: Record<string, TargetPackageProtectionReasonSnapshot>;
  recovery_request_states?: Record<string, TargetPackageRecoveryRequestSnapshot>;
}

export interface TargetPackageProtectionSummarySnapshot {
  state: TargetPackageProtectionState;
  ready: boolean;
  trip_reason_ids?: string[];
  inhibit_reason_ids?: string[];
  recovery_request_ids?: string[];
  diagnostic_summary_ids?: string[];
}

export interface TargetPackageProtectionReasonSnapshot {
  state: TargetPackageProtectionState;
  latching?: boolean;
  reason_code?: string;
  diagnostic_ref?: string;
  summary?: string;
}

export interface TargetPackageRecoveryRequestSnapshot {
  availability_state: "available" | "unavailable";
  target_operation_id: string;
  summary?: string;
}

export interface TargetPackageArbitrationSnapshot {
  package_instance_id: string;
  state?: TargetPackageArbitrationResult | "no_snapshot" | "unsupported_by_target";
  ownership_summary?: TargetPackageOwnershipSummarySnapshot;
  command_summary?: TargetPackageCommandSummarySnapshot;
  command_lane_states?: Record<string, TargetPackageCommandLaneSnapshot>;
}

export interface TargetPackageOverrideHandoverSnapshot {
  package_instance_id: string;
  state?: TargetPackageHandoverRequestState | "no_snapshot" | "unsupported_by_target";
  handover_summary?: TargetPackageHandoverSummarySnapshot;
  handover_request_states?: Record<string, TargetPackageHandoverRequestSnapshot>;
}

export interface TargetPackageOwnershipSummarySnapshot {
  active_lane_ids?: string[];
  summary?: string;
}

export interface TargetPackageCommandSummarySnapshot {
  active_owner_lane_ids?: string[];
  accepted_lane_ids?: string[];
  blocked_lane_ids?: string[];
  denied_lane_ids?: string[];
  superseded_lane_ids?: string[];
  summary?: string;
}

export interface TargetPackageCommandLaneSnapshot {
  request_kind: TargetPackageCommandRequestKind;
  ownership_lane: TargetPackageOwnershipLane;
  arbitration_result: TargetPackageArbitrationResult;
  blocked_reason?: string;
  denied_reason?: string;
  superseded_by_lane_id?: string;
  request_preview?: string;
  summary?: string;
}

export interface TargetPackageHandoverSummarySnapshot {
  current_holder_id: string;
  current_lane: TargetPackageOwnershipLane;
  requested_holder_id?: string;
  accepted_request_ids?: string[];
  blocked_request_ids?: string[];
  denied_request_ids?: string[];
  last_handover_reason?: string;
  summary?: string;
}

export interface TargetPackageHandoverRequestSnapshot {
  request_kind: TargetPackageHandoverRequestKind;
  requested_holder_id: string;
  requested_lane: TargetPackageOwnershipLane;
  state: TargetPackageHandoverRequestState;
  blocked_reason?: TargetPackageHandoverDenialReason;
  denied_reason?: TargetPackageHandoverDenialReason;
  request_preview?: string;
  summary?: string;
}

export interface PackageModeTransitionRequest {
  package_instance_id: string;
  intent: TargetPackageModeTransitionIntent;
  target_mode_id?: string;
  target_phase_id?: string;
  confirmation_token?: string;
}

export interface PackageModeTransitionResult {
  accepted: boolean;
  package_instance_id: string;
  intent: TargetPackageModeTransitionIntent;
  transition_state: TargetPackageModeTransitionState;
  active_mode_id?: string;
  active_phase_id?: string;
  target_phase_state?: TargetPackagePhaseState;
  guard_state?: TargetPackageTransitionGuardState;
  message?: string;
}

export interface OperationInvocationRequest {
  operation_id: string;
  action?: TargetOperationInvocationAction;
  confirmation_token?: string;
  inputs?: Record<string, unknown>;
}

export interface OperationInvocationResult {
  accepted: boolean;
  state: RuntimeOperationState;
  message?: string;
  progress_payload?: Record<string, unknown>;
  failure?: Record<string, unknown>;
  audit_record_id?: string;
  recommendation_state?: TargetOperationRecommendationState;
}

export interface OperationCancelRequest {
  operation_id: string;
}

export interface OperationCancelResult {
  accepted: boolean;
  state: RuntimeOperationState;
  message?: string;
  progress_payload?: Record<string, unknown>;
  failure?: Record<string, unknown>;
  audit_record_id?: string;
  recommendation_state?: TargetOperationRecommendationState;
}

export interface TargetAdapterContract<
  TDeploymentRequest extends TargetDeploymentRequest = TargetDeploymentRequest,
  TDeploymentResult extends TargetDeploymentResult = TargetDeploymentResult,
  TReadbackRequest extends TargetReadbackRequest = TargetReadbackRequest,
  TReadbackSnapshot extends TargetReadbackSnapshot = TargetReadbackSnapshot
> {
  manifest: TargetAdapterManifest;
  validatePack?(pack: unknown): Promise<TargetAdapterDiagnostic[]> | TargetAdapterDiagnostic[];
  emit?(request: TDeploymentRequest): Promise<TDeploymentResult> | TDeploymentResult;
  apply?(request: TDeploymentRequest): Promise<TDeploymentResult> | TDeploymentResult;
  readback?(request: TReadbackRequest): Promise<TReadbackSnapshot> | TReadbackSnapshot;
  invokeOperation?(request: OperationInvocationRequest): Promise<OperationInvocationResult> | OperationInvocationResult;
  cancelOperation?(request: OperationCancelRequest): Promise<OperationCancelResult> | OperationCancelResult;
  invokePackageModeTransition?(request: PackageModeTransitionRequest): Promise<PackageModeTransitionResult> | PackageModeTransitionResult;
}
