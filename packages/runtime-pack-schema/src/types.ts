import {
  WAVE8_EXECUTION_BASELINE_OPERATION_KINDS,
  WAVE14_PACKAGE_MODE_EXECUTION_INTENTS,
  WAVE14_PACKAGE_MODE_TRANSITION_STATES,
  WAVE14_PACKAGE_PHASE_STATES,
  WAVE14_PACKAGE_TRANSITION_GUARD_STATES,
  WAVE15_PACKAGE_GATE_STATES,
  WAVE15_PACKAGE_INTERLOCK_ACTIVE_STATES,
  WAVE16_PACKAGE_PROTECTION_STATES,
  WAVE17_PACKAGE_ARBITRATION_RESULTS,
  WAVE17_PACKAGE_COMMAND_REQUEST_KINDS,
  WAVE17_PACKAGE_OWNERSHIP_LANES,
  WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_STATES
} from "./constants.js";

export type RuntimeBindingKind = "digital_in" | "digital_out" | "analog_in" | "analog_out" | "bus" | "service";
export type RuntimeParamSource = "default" | "override" | "instance_override" | "parent_param" | "materialized";
export type RuntimeConnectionScope = "system" | "composition";
export type RuntimePortDirection = "in" | "out";
export type RuntimeOperationConfirmationPolicy = "none" | "required";
export type RuntimeOperationProgressMode = "none" | "signal_based" | "state_based";
export type RuntimeOperationResultMode = "none" | "recommendation" | "applyable_result";
export type RuntimeOperationAvailabilityMode = "always" | "guarded";
export type RuntimeOperationCancelMode = "not_cancellable" | "while_running";
export type RuntimeOperationConfirmationTokenValidation = "none" | "when_required";
export type RuntimeOperationAuditHookMode = "none" | "operation_events";
export type RuntimeOperationRecommendationLifecycleMode = "advisory" | "apply_reject";
export type RuntimeOperationRecommendationState = "none" | "available" | "pending_apply" | "applied" | "rejected";
export type RuntimeExecutionBaselineOperationKind = typeof WAVE8_EXECUTION_BASELINE_OPERATION_KINDS[number];
export type RuntimePackageModeTransitionIntent = typeof WAVE14_PACKAGE_MODE_EXECUTION_INTENTS[number];
export type RuntimePackageModeTransitionState = typeof WAVE14_PACKAGE_MODE_TRANSITION_STATES[number];
export type RuntimePackagePhaseState = typeof WAVE14_PACKAGE_PHASE_STATES[number];
export type RuntimePackageTransitionGuardState = typeof WAVE14_PACKAGE_TRANSITION_GUARD_STATES[number];
export type RuntimePackageGateState = typeof WAVE15_PACKAGE_GATE_STATES[number];
export type RuntimePackageInterlockActiveState = typeof WAVE15_PACKAGE_INTERLOCK_ACTIVE_STATES[number];
export type RuntimePackageProtectionState = typeof WAVE16_PACKAGE_PROTECTION_STATES[number];
export type RuntimePackageCommandRequestKind = typeof WAVE17_PACKAGE_COMMAND_REQUEST_KINDS[number];
export type RuntimePackageOwnershipLane = typeof WAVE17_PACKAGE_OWNERSHIP_LANES[number];
export type RuntimePackageArbitrationResult = typeof WAVE17_PACKAGE_ARBITRATION_RESULTS[number];
export type RuntimePackageHandoverRequestKind = typeof WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS[number];
export type RuntimePackageHandoverRequestState = typeof WAVE18_PACKAGE_HANDOVER_REQUEST_STATES[number];
export type RuntimePackageHandoverDenialReason = typeof WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS[number];
export type RuntimeOperationState =
  | "idle"
  | "pending_confirmation"
  | "accepted"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"
  | "rejected";

export interface RuntimePack {
  schema_version: string;
  pack_id: string;
  source: RuntimePackSource;
  instances: Record<string, RuntimeInstance>;
  connections: Record<string, RuntimeConnection>;
  resources: Record<string, RuntimeResourceBinding>;
  operations: Record<string, RuntimeOperation>;
  operation_runtime_contract?: RuntimeOperationRuntimeContract;
  package_mode_runtime_contract?: RuntimePackageModeRuntimeContract;
  package_supervision?: Record<string, RuntimePackageSupervision>;
  package_coordination?: Record<string, RuntimePackageCoordination>;
  package_mode_phase?: Record<string, RuntimePackageModePhase>;
  package_permissive_interlock?: Record<string, RuntimePackagePermissiveInterlock>;
  package_protection_recovery?: Record<string, RuntimePackageProtectionRecovery>;
  package_arbitration?: Record<string, RuntimePackageArbitration>;
  package_override_handover?: Record<string, RuntimePackageOverrideHandover>;
  trace_groups: Record<string, RuntimeTraceGroup>;
  monitors: Record<string, RuntimeMonitor>;
  frontend_requirements: Record<string, RuntimeFrontendRequirement>;
  persistence_slots: Record<string, RuntimePersistenceSlot>;
}

export interface RuntimePackSource {
  project_id: string;
  authoring_schema_version: string;
  generated_at?: string;
}

export interface RuntimeInstance {
  id: string;
  type_ref: string;
  title?: string;
  enabled: boolean;
  ports: Record<string, RuntimePort>;
  params: Record<string, RuntimeResolvedParam>;
  alarms: Record<string, RuntimeAlarm>;
  native_execution?: RuntimeNativeExecution;
  source_scope?: RuntimeSourceScope;
}

export interface RuntimePort {
  id: string;
  direction: RuntimePortDirection;
  channel_kind: string;
  value_type: string;
}

export interface RuntimeResolvedParam {
  value: unknown;
  value_type?: string;
  source: RuntimeParamSource;
  metadata?: RuntimeParamMetadata;
  provenance?: RuntimeParamProvenance;
}

export interface RuntimeAlarm {
  id: string;
  severity?: string;
}

export interface RuntimeConnection {
  id: string;
  source: RuntimeEndpoint;
  target: RuntimeEndpoint;
  channel_kind: string;
  value_type: string;
  origin: RuntimeConnectionOrigin;
}

export interface RuntimeEndpoint {
  instance_id: string;
  port_id: string;
}

export interface RuntimeConnectionOrigin {
  origin_layer: RuntimeConnectionScope;
  owner_id: string;
  signal_id?: string;
  route_id?: string;
}

export interface RuntimeResourceBinding {
  id: string;
  binding_kind: RuntimeBindingKind;
  instance_id: string;
  port_id?: string;
  config: Record<string, unknown>;
}

export interface RuntimeSourceScope {
  kind: RuntimeConnectionScope;
  owner_id: string;
}

export interface RuntimeNativeExecution {
  native_kind: string;
  target_kinds?: string[];
  config_template?: unknown;
  mode?: string;
  frontend_requirement_ids?: string[];
}

export interface RuntimeParamProvenance {
  owner_id: string;
  param_id: string;
  source_layer: RuntimeConnectionScope;
}

export interface RuntimeOperation {
  id: string;
  owner_instance_id: string;
  kind: string;
  title?: string;
  confirmation_policy?: RuntimeOperationConfirmationPolicy;
  availability?: RuntimeOperationAvailability;
  cancel_mode?: RuntimeOperationCancelMode;
  progress_mode?: RuntimeOperationProgressMode;
  progress_contract?: RuntimeOperationProgressContract;
  result_contract?: RuntimeOperationResultContract;
  ui_hint?: string;
  safe_when?: string[];
  progress_signals?: RuntimeTraceSignalRef[];
  result_fields?: string[];
  state_hint?: RuntimeOperationStateHint;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimeOperationAvailability {
  mode?: RuntimeOperationAvailabilityMode;
  required_signals?: RuntimeEndpoint[];
  required_states?: string[];
  notes?: string;
}

export interface RuntimeOperationResultContract {
  mode: RuntimeOperationResultMode;
  fields?: RuntimeOperationResultField[];
  failure_fields?: RuntimeOperationResultField[];
  recommendation_lifecycle?: RuntimeOperationRecommendationLifecycleContract;
}

export interface RuntimeOperationProgressContract {
  fields?: RuntimeOperationResultField[];
}

export interface RuntimeOperationRecommendationLifecycleContract {
  mode: RuntimeOperationRecommendationLifecycleMode;
  apply_confirmation_policy?: RuntimeOperationConfirmationPolicy;
  reject_confirmation_policy?: RuntimeOperationConfirmationPolicy;
}

export interface RuntimeOperationResultField {
  id: string;
  value_type: string;
  title?: string;
}

export interface RuntimeOperationRuntimeContract {
  invoke_supported: boolean;
  cancel_supported: boolean;
  progress_supported: boolean;
  result_supported: boolean;
  audit_required: boolean;
  execution_baseline_kinds?: RuntimeExecutionBaselineOperationKind[];
  confirmation_token_validation?: RuntimeOperationConfirmationTokenValidation;
  failure_payload_supported?: boolean;
  audit_hook_mode?: RuntimeOperationAuditHookMode;
  recommendation_lifecycle_supported?: boolean;
  progress_payload_supported?: boolean;
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
  recommendation_state?: RuntimeOperationRecommendationState;
}

export interface RuntimePackageModeRuntimeContract {
  package_mode_execution_supported: boolean;
  phase_transition_execution_supported: boolean;
  transition_guard_diagnostics_supported: boolean;
  supported_intents: RuntimePackageModeTransitionIntent[];
}

export interface RuntimePackageSupervision {
  id: string;
  package_instance_id: string;
  title?: string;
  summary_outputs?: Record<string, RuntimePackageSummaryOutput>;
  aggregate_monitors?: Record<string, RuntimePackageAggregateMonitor>;
  aggregate_alarms?: Record<string, RuntimePackageAggregateAlarm>;
  trace_groups?: Record<string, RuntimePackageTraceGroup>;
  operation_proxies?: Record<string, RuntimePackageOperationProxy>;
  provenance?: RuntimeMetadataProvenance;
}

export type RuntimePackageCoordinationState =
  | "standby"
  | "ready"
  | "circulation_active"
  | "control_active"
  | "fault_latched";

export interface RuntimePackageCoordination {
  id: string;
  package_instance_id: string;
  title?: string;
  package_state: RuntimePackageCoordinationStateSummary;
  summary_outputs?: Record<string, RuntimePackageSummaryOutput>;
  aggregate_monitors?: Record<string, RuntimePackageAggregateMonitor>;
  trace_groups?: Record<string, RuntimePackageTraceGroup>;
  operation_proxies?: Record<string, RuntimePackageCoordinationOperationProxy>;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimePackageCoordinationStateSummary {
  id: string;
  title?: string;
  default_state?: RuntimePackageCoordinationState;
  states: Record<string, RuntimePackageCoordinationStateRule>;
}

export interface RuntimePackageCoordinationStateRule {
  id: string;
  state: RuntimePackageCoordinationState;
  title?: string;
  source_ports: RuntimeTraceSignalRef[];
  summary?: string;
}

export interface RuntimePackageSummaryOutput {
  id: string;
  title?: string;
  value_type: string;
  source: RuntimeEndpoint;
}

export interface RuntimePackageAggregateMonitor {
  id: string;
  title?: string;
  kind: string;
  source_ports: RuntimeTraceSignalRef[];
  severity?: string;
}

export interface RuntimePackageAggregateAlarm {
  id: string;
  title?: string;
  severity?: string;
  source_ports: RuntimeTraceSignalRef[];
}

export interface RuntimePackageTraceGroup {
  id: string;
  title?: string;
  signals: RuntimeTraceSignalRef[];
  sample_hint_ms?: number;
  chart_hint?: string;
}

export interface RuntimePackageOperationProxy {
  id: string;
  title?: string;
  target_operation_id: string;
  target_owner_instance_id: string;
  child_operation_kind?: string;
  ui_hint?: string;
}

export interface RuntimePackageCoordinationOperationProxy {
  id: string;
  title?: string;
  kind: string;
  target_operation_id: string;
  target_owner_instance_id: string;
  child_operation_kind?: string;
  ui_hint?: string;
}

export interface RuntimePackagePermissiveInterlock {
  id: string;
  package_instance_id: string;
  title?: string;
  permissives: Record<string, RuntimePackagePermissive>;
  interlocks: Record<string, RuntimePackageInterlock>;
  gate_summary: RuntimePackageGateSummary;
  summary_outputs?: Record<string, RuntimePackageSummaryOutput>;
  aggregate_monitors?: Record<string, RuntimePackageAggregateMonitor>;
  trace_groups?: Record<string, RuntimePackageTraceGroup>;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimePackageProtectionRecovery {
  id: string;
  package_instance_id: string;
  title?: string;
  protection_summary: RuntimePackageProtectionSummary;
  trips: Record<string, RuntimePackageTrip>;
  inhibits: Record<string, RuntimePackageInhibit>;
  recovery_requests?: Record<string, RuntimePackageRecoveryRequest>;
  summary_outputs?: Record<string, RuntimePackageSummaryOutput>;
  aggregate_monitors?: Record<string, RuntimePackageAggregateMonitor>;
  trace_groups?: Record<string, RuntimePackageTraceGroup>;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimePackageArbitration {
  id: string;
  package_instance_id: string;
  title?: string;
  ownership_lanes: Record<string, RuntimePackageOwnershipLaneDef>;
  ownership_summary: RuntimePackageOwnershipSummary;
  command_lanes: Record<string, RuntimePackageCommandLane>;
  command_summary: RuntimePackageCommandSummary;
  summary_outputs?: Record<string, RuntimePackageSummaryOutput>;
  aggregate_monitors?: Record<string, RuntimePackageAggregateMonitor>;
  trace_groups?: Record<string, RuntimePackageTraceGroup>;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimePackageOverrideHandover {
  id: string;
  package_instance_id: string;
  title?: string;
  authority_holders: Record<string, RuntimePackageAuthorityHolder>;
  handover_summary: RuntimePackageHandoverSummary;
  handover_requests: Record<string, RuntimePackageHandoverRequest>;
  summary_outputs?: Record<string, RuntimePackageSummaryOutput>;
  aggregate_monitors?: Record<string, RuntimePackageAggregateMonitor>;
  trace_groups?: Record<string, RuntimePackageTraceGroup>;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimePackageOwnershipLaneDef {
  id: string;
  title?: string;
  lane: RuntimePackageOwnershipLane;
  source_ports: RuntimeTraceSignalRef[];
  summary?: string;
}

export interface RuntimePackageAuthorityHolder {
  id: string;
  title?: string;
  lane: RuntimePackageOwnershipLane;
  source_ports: RuntimeTraceSignalRef[];
  summary?: string;
}

export interface RuntimePackageOwnershipSummary {
  id: string;
  title?: string;
  active_lane_ids?: string[];
  summary?: string;
}

export interface RuntimePackageCommandLane {
  id: string;
  title?: string;
  request_kind: RuntimePackageCommandRequestKind;
  ownership_lane_id: string;
  ownership_lane: RuntimePackageOwnershipLane;
  target_instance_id: string;
  arbitration_result: RuntimePackageArbitrationResult;
  summary?: string;
  request_preview?: string;
  blocked_reason?: string;
  denied_reason?: string;
  superseded_by_lane_id?: string;
}

export interface RuntimePackageCommandSummary {
  id: string;
  title?: string;
  active_owner_lane_ids?: string[];
  accepted_lane_ids?: string[];
  blocked_lane_ids?: string[];
  denied_lane_ids?: string[];
  superseded_lane_ids?: string[];
  summary?: string;
}

export interface RuntimePackageHandoverSummary {
  id: string;
  title?: string;
  current_holder_id: string;
  current_lane: RuntimePackageOwnershipLane;
  requested_holder_id?: string;
  accepted_request_ids?: string[];
  blocked_request_ids?: string[];
  denied_request_ids?: string[];
  last_handover_reason?: string;
  summary?: string;
}

export interface RuntimePackageHandoverRequest {
  id: string;
  title?: string;
  request_kind: RuntimePackageHandoverRequestKind;
  requested_holder_id: string;
  requested_lane: RuntimePackageOwnershipLane;
  state: RuntimePackageHandoverRequestState;
  summary?: string;
  request_preview?: string;
  blocked_reason?: RuntimePackageHandoverDenialReason;
  denied_reason?: RuntimePackageHandoverDenialReason;
}

export interface RuntimePackageTrip {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: RuntimeTraceSignalRef[];
  latching?: boolean;
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface RuntimePackageInhibit {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: RuntimeTraceSignalRef[];
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface RuntimePackageProtectionSummary {
  id: string;
  title?: string;
  default_state?: RuntimePackageProtectionState;
  trip_ids?: string[];
  inhibit_ids?: string[];
  recovery_request_ids?: string[];
  diagnostic_summaries?: Record<string, RuntimePackageProtectionDiagnosticSummary>;
}

export interface RuntimePackageProtectionDiagnosticSummary {
  id: string;
  title?: string;
  trip_ids?: string[];
  inhibit_ids?: string[];
  summary?: string;
}

export interface RuntimePackageRecoveryRequest {
  id: string;
  title?: string;
  kind: string;
  target_operation_id: string;
  target_owner_instance_id: string;
  confirmation_policy?: RuntimeOperationConfirmationPolicy;
  blocked_by_trip_ids?: string[];
  blocked_by_inhibit_ids?: string[];
  summary?: string;
}

export interface RuntimePackagePermissive {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: RuntimeTraceSignalRef[];
  summary?: string;
  blocked_reason_code?: string;
  diagnostic_ref?: string;
}

export interface RuntimePackageInterlock {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: RuntimeTraceSignalRef[];
  active_state: RuntimePackageInterlockActiveState;
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface RuntimePackageGateSummary {
  id: string;
  title?: string;
  default_state?: RuntimePackageGateState;
  permissive_ids?: string[];
  interlock_ids?: string[];
  transition_guards?: Record<string, RuntimePackageTransitionGuardRef>;
}

export interface RuntimePackageTransitionGuardRef {
  id: string;
  qualified_id: string;
  title?: string;
  permissive_ids?: string[];
  interlock_ids?: string[];
  mode_transition_id?: string;
  phase_transition_id?: string;
  summary?: string;
}

export interface RuntimePackageModePhase {
  id: string;
  package_instance_id: string;
  title?: string;
  modes: Record<string, RuntimePackageModeDef>;
  phases: Record<string, RuntimePackagePhaseDef>;
  mode_summary: RuntimePackageModeSummary;
  phase_summary: RuntimePackagePhaseSummary;
  active_mode_id: string;
  active_phase_id: string;
  allowed_mode_transitions?: Record<string, RuntimePackageAllowedModeTransition>;
  allowed_phase_transitions?: Record<string, RuntimePackageAllowedPhaseTransition>;
  package_mode_groups?: Record<string, RuntimePackageModeGroup>;
  package_phase_groups?: Record<string, RuntimePackagePhaseGroup>;
  trace_groups?: Record<string, RuntimePackageTraceGroup>;
  package_supervision_id?: string;
  package_coordination_id?: string;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimePackageModeDef {
  id: string;
  qualified_id: string;
  title?: string;
  summary?: string;
  phase_ids?: string[];
}

export interface RuntimePackagePhaseDef {
  id: string;
  qualified_id: string;
  title?: string;
  summary?: string;
  source_ports: RuntimeTraceSignalRef[];
}

export interface RuntimePackageAllowedModeTransition {
  id: string;
  title?: string;
  intent: RuntimePackageModeTransitionIntent;
  from_mode_id?: string;
  to_mode_id: string;
  guard_state?: RuntimePackageTransitionGuardState;
  guard_notes?: string[];
}

export interface RuntimePackageAllowedPhaseTransition {
  id: string;
  title?: string;
  intent: RuntimePackageModeTransitionIntent;
  phase_id: string;
  allowed_mode_ids?: string[];
  phase_state?: RuntimePackagePhaseState;
  transition_state?: RuntimePackageModeTransitionState;
  guard_state?: RuntimePackageTransitionGuardState;
  guard_notes?: string[];
}

export interface RuntimePackageModeSummary {
  id: string;
  title?: string;
  default_mode_id?: string;
  entries: Record<string, RuntimePackageModeSummaryEntry>;
}

export interface RuntimePackageModeSummaryEntry {
  id: string;
  title?: string;
  mode_id: string;
  source_ports: RuntimeTraceSignalRef[];
  summary?: string;
}

export interface RuntimePackagePhaseSummary {
  id: string;
  title?: string;
  default_phase_id?: string;
  entries: Record<string, RuntimePackagePhaseSummaryEntry>;
}

export interface RuntimePackagePhaseSummaryEntry {
  id: string;
  title?: string;
  phase_id: string;
  source_ports: RuntimeTraceSignalRef[];
  summary?: string;
}

export interface RuntimePackageModeGroup {
  id: string;
  title?: string;
  mode_ids: string[];
  summary?: string;
}

export interface RuntimePackagePhaseGroup {
  id: string;
  title?: string;
  phase_ids: string[];
  summary?: string;
}

export interface RuntimeTraceSignalRef {
  instance_id: string;
  port_id: string;
}

export interface RuntimeTraceGroup {
  id: string;
  owner_instance_id: string;
  title?: string;
  signals: RuntimeTraceSignalRef[];
  sample_hint_ms?: number;
  chart_hint?: string;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimeMonitor {
  id: string;
  owner_instance_id: string;
  kind: string;
  title?: string;
  source_ports?: RuntimeTraceSignalRef[];
  severity?: string;
  status_port_id?: string;
  config?: Record<string, unknown>;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimeFrontendRequirement {
  id: string;
  owner_instance_id: string;
  kind: string;
  mode?: string;
  title?: string;
  source_ports?: RuntimeTraceSignalRef[];
  binding_kind?: string;
  channel_kind?: string;
  value_type?: string;
  required?: boolean;
  config?: Record<string, unknown>;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimePersistenceSlot {
  id: string;
  owner_instance_id: string;
  slot_kind: string;
  title?: string;
  owner_param_id?: string;
  nv_slot_hint?: string;
  flush_policy?: string;
  provenance?: RuntimeMetadataProvenance;
}

export interface RuntimeOperationStateHint {
  availability?: string;
  progress_style?: string;
  destructive?: boolean;
}

export interface RuntimeMetadataProvenance {
  owner_instance_id: string;
  facet_kind: "operation" | "trace_group" | "monitor" | "frontend_requirement" | "persistence_slot";
  facet_id: string;
  source_type_ref?: string;
}

export interface RuntimeParamMetadata {
  title?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  group?: string;
  ui_hint?: string;
  description?: string;
  access_role?: string;
  live_edit_policy?: string;
  persist_policy?: string;
  recipe_scope?: string;
  danger_level?: string;
}
