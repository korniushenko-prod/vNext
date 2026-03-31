import type {
  RuntimeBindingKind,
  RuntimePack,
} from "@universal-plc/runtime-pack-schema";
import type {
  TargetAdapterContract,
  TargetAdapterCapabilityProfile,
  TargetAdapterDiagnostic,
  TargetDeploymentRequest,
  TargetDeploymentResult,
  TargetReadbackRequest,
  TargetReadbackSnapshot
} from "@universal-plc/target-adapter-contracts";

export interface Esp32CapabilityProfile extends TargetAdapterCapabilityProfile {
  target_id: "esp32.shipcontroller.v1";
  supported_binding_kinds: RuntimeBindingKind[];
  hardware_preset_support?: Esp32HardwarePresetSupport;
}

export interface Esp32HardwarePresetSupport {
  enabled: boolean;
  supported_target_presets: string[];
  supported_board_templates: string[];
  supported_chip_templates: string[];
}

export interface Esp32CompatibilityResult {
  ok: boolean;
  diagnostics: TargetAdapterDiagnostic[];
}

export interface ResolvedHardwarePortRefInput {
  instance_id: string;
  port_id?: string;
}

export interface ResolvedHardwareResourceInput {
  id: string;
  title?: string;
  gpio: number;
  capabilities: string[];
  note?: string;
  allowed_gpios?: number[];
  origin: "preset_default" | "manifest_override";
  binding_ids: string[];
  port_refs: ResolvedHardwarePortRefInput[];
}

export interface ResolvedHardwareDiagnosticInput {
  code: string;
  severity: "error" | "warning";
  message: string;
  binding_id?: string;
  resource_id?: string;
  gpio?: number;
}

export interface ResolvedHardwareSectionInput {
  target_preset_ref: string;
  chip_template_ref: string;
  chip_title?: string;
  board_template_ref: string;
  board_title?: string;
  active_rule_ids: string[];
  reserved_pins: Record<string, number>;
  forbidden_pins: number[];
  resources: Record<string, ResolvedHardwareResourceInput>;
  diagnostics: ResolvedHardwareDiagnosticInput[];
}

export type RuntimePackWithHardwareResolution = RuntimePack & {
  hardware_resolution?: ResolvedHardwareSectionInput;
};

export type Esp32ApplyPlanStepKind =
  | "validate_pack"
  | "stage_instances"
  | "stage_connections"
  | "stage_resources"
  | "finalize_report";

export interface Esp32ApplyPlanStep {
  id: string;
  kind: Esp32ApplyPlanStepKind;
  target_ids: string[];
}

export interface Esp32ApplyPlan {
  target_id: "esp32.shipcontroller.v1";
  pack_id: string;
  steps: Esp32ApplyPlanStep[];
  diagnostics: TargetAdapterDiagnostic[];
}

export interface ShipControllerDigitalInputArtifact {
  id: string;
  instance_id: string;
  pin: number;
  pullup?: boolean;
  debounce_ms?: number;
}

export interface ShipControllerAnalogInputArtifact {
  id: string;
  instance_id: string;
  pin: number;
  attenuation_db?: number;
  sample_window_ms?: number;
}

export interface ShipControllerDigitalOutputArtifact {
  id: string;
  instance_id: string;
  pin: number;
  active_high: boolean;
}

export interface ShipControllerTimedRelayEndpointRef {
  instance_id: string;
  port_id: string;
  connection_id: string;
}

export interface ShipControllerTimedRelayArtifact {
  id: string;
  native_kind: string;
  pulse_time_ms: number;
  retriggerable: boolean;
  require_enable: boolean;
  output_inverted: boolean;
  trigger_source: ShipControllerTimedRelayEndpointRef;
  output_target: ShipControllerTimedRelayEndpointRef;
}

export interface ShipControllerPulseFlowmeterSourceRef {
  requirement_id: string;
  mode: string;
  binding_kind: string;
  instance_id: string;
  port_id: string;
  connection_id?: string;
  resource_id?: string;
}

export interface ShipControllerEndpointRef {
  instance_id: string;
  port_id: string;
  connection_id?: string;
  resource_id?: string;
}

export interface ShipControllerPulseFlowmeterArtifact {
  id: string;
  native_kind: string;
  sensor_mode: string;
  k_factor: number;
  filter_window_ms: number;
  threshold_on?: number;
  threshold_off?: number;
  stale_timeout_ms: number;
  persistence_slot_id?: string;
  frontend_requirement_ids: string[];
  source: ShipControllerPulseFlowmeterSourceRef;
}

export interface ShipControllerPidEndpointRef {
  instance_id: string;
  port_id: string;
  connection_id?: string;
  resource_id?: string;
}

export interface ShipControllerModbusRtuBusArtifact {
  id: string;
  instance_id: string;
  resource_id: string;
  driver: string;
  port: string;
  baud_rate: number;
  parity: string;
  stop_bits: number;
}

export interface ShipControllerCommBridgeArtifact {
  id: string;
  native_kind: string;
  bus_ref: string;
  slave_id: number;
  timeout_ms: number;
  poll_period_ms: number;
  startup_delay_ms: number;
  stale_timeout_ms: number;
  frontend_requirement_ids: string[];
}

export interface ShipControllerRemotePointArtifact {
  id: string;
  bridge_id: string;
  bus_ref: string;
  slave_id: number;
  register_address: number;
  register_kind: string;
  register_count: number;
  decode: string;
  value_type: string;
  byte_order: string;
  word_order: string;
  poll_period_ms: number;
  timeout_ms: number;
}

export interface ShipControllerRunHoursCounterArtifact {
  id: string;
  native_kind: string;
  persist_enabled: boolean;
  persist_period_s: number;
  rounding_mode: string;
  min_active_time_ms: number;
  persistence_slot_id?: string;
  frontend_requirement_ids: string[];
  source: ShipControllerEndpointRef;
}

export interface ShipControllerEventCounterArtifact {
  id: string;
  native_kind: string;
  edge_mode: string;
  debounce_ms: number;
  persist_enabled: boolean;
  persist_period_s: number;
  increment_step: number;
  persistence_slot_id?: string;
  frontend_requirement_ids: string[];
  source: ShipControllerEndpointRef;
}

export interface ShipControllerThresholdMonitorArtifact {
  id: string;
  native_kind: string;
  mode: string;
  threshold_a: number;
  threshold_b: number;
  hysteresis: number;
  latch_alarm: boolean;
  timeout_ms: number;
  frontend_requirement_ids: string[];
  source: ShipControllerEndpointRef;
}

export interface ShipControllerMaintenanceCounterArtifact {
  id: string;
  native_kind: string;
  service_interval: number;
  warning_before: number;
  overdue_margin: number;
  auto_rollover: boolean;
  persist_enabled: boolean;
  persistence_slot_ids: string[];
  frontend_requirement_ids: string[];
  usage_source: ShipControllerEndpointRef;
}

export interface ShipControllerPidControllerArtifact {
  id: string;
  native_kind: string;
  kp: number;
  ti: number;
  td: number;
  sample_time_ms: number;
  output_min: number;
  output_max: number;
  direction: string;
  pv_filter_tau_ms: number;
  deadband: number;
  persistence_slot_ids: string[];
  frontend_requirement_ids: string[];
  pv_source: ShipControllerPidEndpointRef;
  mv_output: ShipControllerPidEndpointRef;
}

export interface ShipControllerOperationFieldArtifact {
  id: string;
  value_type: string;
  title?: string;
}

export interface ShipControllerOperationArtifact {
  id: string;
  owner_instance_id: string;
  kind: string;
  metadata_only?: true;
  execution_baseline?: true;
  specialized_execution?: "pid_autotune";
  title?: string;
  confirmation_policy?: string;
  confirmation_token_validation?: string;
  availability_mode?: string;
  cancel_mode?: string;
  progress_mode?: string;
  progress_fields?: ShipControllerOperationFieldArtifact[];
  progress_payload_supported?: true;
  result_mode?: string;
  result_fields?: ShipControllerOperationFieldArtifact[];
  failure_fields?: ShipControllerOperationFieldArtifact[];
  audit_hook_mode?: string;
  recommendation_lifecycle_mode?: string;
  recommendation_apply_confirmation_policy?: string;
  recommendation_reject_confirmation_policy?: string;
}

export interface ShipControllerPackageSummaryOutputArtifact {
  id: string;
  title?: string;
  value_type: string;
  source: ShipControllerEndpointRef;
}

export interface ShipControllerPackageAggregateMonitorArtifact {
  id: string;
  title?: string;
  kind: string;
  severity?: string;
  source_ports: ShipControllerEndpointRef[];
}

export interface ShipControllerPackageAggregateAlarmArtifact {
  id: string;
  title?: string;
  severity?: string;
  source_ports: ShipControllerEndpointRef[];
}

export interface ShipControllerPackageTraceGroupArtifact {
  id: string;
  title?: string;
  signals: ShipControllerEndpointRef[];
  sample_hint_ms?: number;
  chart_hint?: string;
}

export interface ShipControllerPackageOperationProxyArtifact {
  id: string;
  title?: string;
  target_operation_id: string;
  target_owner_instance_id: string;
  child_operation_kind?: string;
  ui_hint?: string;
}

export interface ShipControllerPackageCoordinationStateRuleArtifact {
  id: string;
  state: string;
  title?: string;
  source_ports: ShipControllerEndpointRef[];
  summary?: string;
}

export interface ShipControllerPackageCoordinationStateArtifact {
  id: string;
  title?: string;
  default_state?: string;
  states: ShipControllerPackageCoordinationStateRuleArtifact[];
}

export interface ShipControllerPackageSupervisionArtifact {
  id: string;
  package_instance_id: string;
  title?: string;
  summary_outputs: ShipControllerPackageSummaryOutputArtifact[];
  aggregate_monitors: ShipControllerPackageAggregateMonitorArtifact[];
  aggregate_alarms: ShipControllerPackageAggregateAlarmArtifact[];
  trace_groups: ShipControllerPackageTraceGroupArtifact[];
  operation_proxies: ShipControllerPackageOperationProxyArtifact[];
}

export interface ShipControllerPackageCoordinationArtifact {
  id: string;
  package_instance_id: string;
  title?: string;
  package_state: ShipControllerPackageCoordinationStateArtifact;
  summary_outputs: ShipControllerPackageSummaryOutputArtifact[];
  aggregate_monitors: ShipControllerPackageAggregateMonitorArtifact[];
  trace_groups: ShipControllerPackageTraceGroupArtifact[];
  operation_proxies: ShipControllerPackageOperationProxyArtifact[];
}

export interface ShipControllerPackagePermissiveArtifact {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: ShipControllerEndpointRef[];
  summary?: string;
  blocked_reason_code?: string;
  diagnostic_ref?: string;
}

export interface ShipControllerPackageInterlockArtifact {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: ShipControllerEndpointRef[];
  active_state: "held" | "faulted";
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface ShipControllerPackageTransitionGuardArtifact {
  id: string;
  qualified_id: string;
  title?: string;
  permissive_ids: string[];
  interlock_ids: string[];
  mode_transition_id?: string;
  phase_transition_id?: string;
  summary?: string;
}

export interface ShipControllerPackageGateSummaryArtifact {
  id: string;
  title?: string;
  default_state?: "ready" | "blocked" | "held" | "faulted";
  permissive_ids: string[];
  interlock_ids: string[];
  transition_guards: ShipControllerPackageTransitionGuardArtifact[];
}

export interface ShipControllerPackagePermissiveInterlockArtifact {
  id: string;
  package_instance_id: string;
  title?: string;
  permissives: ShipControllerPackagePermissiveArtifact[];
  interlocks: ShipControllerPackageInterlockArtifact[];
  gate_summary: ShipControllerPackageGateSummaryArtifact;
  summary_outputs: ShipControllerPackageSummaryOutputArtifact[];
  aggregate_monitors: ShipControllerPackageAggregateMonitorArtifact[];
  trace_groups: ShipControllerPackageTraceGroupArtifact[];
}

export interface ShipControllerPackageTripArtifact {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: ShipControllerEndpointRef[];
  latching?: boolean;
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface ShipControllerPackageInhibitArtifact {
  id: string;
  qualified_id: string;
  title?: string;
  source_ports: ShipControllerEndpointRef[];
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface ShipControllerPackageProtectionDiagnosticSummaryArtifact {
  id: string;
  title?: string;
  trip_ids: string[];
  inhibit_ids: string[];
  summary?: string;
}

export interface ShipControllerPackageProtectionSummaryArtifact {
  id: string;
  title?: string;
  default_state?: "ready" | "blocked" | "tripped" | "recovering";
  trip_ids: string[];
  inhibit_ids: string[];
  recovery_request_ids: string[];
  diagnostic_summaries: ShipControllerPackageProtectionDiagnosticSummaryArtifact[];
}

export interface ShipControllerPackageRecoveryRequestArtifact {
  id: string;
  title?: string;
  kind: string;
  target_operation_id: string;
  target_owner_instance_id: string;
  confirmation_policy?: "none" | "required";
  blocked_by_trip_ids: string[];
  blocked_by_inhibit_ids: string[];
  summary?: string;
}

export interface ShipControllerPackageProtectionRecoveryArtifact {
  id: string;
  package_instance_id: string;
  title?: string;
  trips: ShipControllerPackageTripArtifact[];
  inhibits: ShipControllerPackageInhibitArtifact[];
  protection_summary: ShipControllerPackageProtectionSummaryArtifact;
  recovery_requests: ShipControllerPackageRecoveryRequestArtifact[];
  summary_outputs: ShipControllerPackageSummaryOutputArtifact[];
  aggregate_monitors: ShipControllerPackageAggregateMonitorArtifact[];
  trace_groups: ShipControllerPackageTraceGroupArtifact[];
}

export interface ShipControllerPackageOwnershipLaneArtifact {
  id: string;
  title?: string;
  lane: "auto" | "manual" | "service" | "remote";
  source_ports: ShipControllerEndpointRef[];
  summary?: string;
}

export interface ShipControllerPackageOwnershipSummaryArtifact {
  id: string;
  title?: string;
  active_lane_ids: string[];
  summary?: string;
}

export interface ShipControllerPackageCommandLaneArtifact {
  id: string;
  title?: string;
  request_kind: "request_start" | "request_stop" | "request_reset" | "request_enable" | "request_disable";
  ownership_lane_id: string;
  ownership_lane: "auto" | "manual" | "service" | "remote";
  target_instance_id: string;
  arbitration_result: "accepted" | "blocked" | "denied" | "superseded" | "unsupported";
  summary?: string;
  request_preview?: string;
  blocked_reason?: string;
  denied_reason?: string;
  superseded_by_lane_id?: string;
}

export interface ShipControllerPackageCommandSummaryArtifact {
  id: string;
  title?: string;
  active_owner_lane_ids: string[];
  accepted_lane_ids: string[];
  blocked_lane_ids: string[];
  denied_lane_ids: string[];
  superseded_lane_ids: string[];
  summary?: string;
}

export interface ShipControllerPackageArbitrationArtifact {
  id: string;
  package_instance_id: string;
  title?: string;
  ownership_lanes: ShipControllerPackageOwnershipLaneArtifact[];
  ownership_summary: ShipControllerPackageOwnershipSummaryArtifact;
  command_lanes: ShipControllerPackageCommandLaneArtifact[];
  command_summary: ShipControllerPackageCommandSummaryArtifact;
  summary_outputs: ShipControllerPackageSummaryOutputArtifact[];
  aggregate_monitors: ShipControllerPackageAggregateMonitorArtifact[];
  trace_groups: ShipControllerPackageTraceGroupArtifact[];
}

export interface ShipControllerPackageAuthorityHolderArtifact {
  id: string;
  title?: string;
  lane: "auto" | "manual" | "service" | "remote";
  source_ports: ShipControllerEndpointRef[];
  summary?: string;
}

export interface ShipControllerPackageHandoverSummaryArtifact {
  id: string;
  title?: string;
  current_holder_id: string;
  current_lane: "auto" | "manual" | "service" | "remote";
  requested_holder_id?: string;
  accepted_request_ids: string[];
  blocked_request_ids: string[];
  denied_request_ids: string[];
  last_handover_reason?: string;
  summary?: string;
}

export interface ShipControllerPackageHandoverRequestArtifact {
  id: string;
  title?: string;
  request_kind: "request_takeover" | "request_release" | "request_return_to_auto";
  requested_holder_id: string;
  requested_lane: "auto" | "manual" | "service" | "remote";
  state: "accepted" | "blocked" | "denied" | "unsupported";
  summary?: string;
  request_preview?: string;
  blocked_reason?: "blocked_by_policy" | "held_by_other_owner" | "not_available";
  denied_reason?: "blocked_by_policy" | "held_by_other_owner" | "not_available";
}

export interface ShipControllerPackageOverrideHandoverArtifact {
  id: string;
  package_instance_id: string;
  title?: string;
  authority_holders: ShipControllerPackageAuthorityHolderArtifact[];
  handover_summary: ShipControllerPackageHandoverSummaryArtifact;
  handover_requests: ShipControllerPackageHandoverRequestArtifact[];
  summary_outputs: ShipControllerPackageSummaryOutputArtifact[];
  aggregate_monitors: ShipControllerPackageAggregateMonitorArtifact[];
  trace_groups: ShipControllerPackageTraceGroupArtifact[];
}

export interface ShipControllerPackageModeArtifact {
  id: string;
  qualified_id: string;
  title?: string;
  summary?: string;
  phase_ids: string[];
}

export interface ShipControllerPackagePhaseArtifact {
  id: string;
  qualified_id: string;
  title?: string;
  summary?: string;
  source_ports: ShipControllerEndpointRef[];
}

export interface ShipControllerPackageModeSummaryEntryArtifact {
  id: string;
  title?: string;
  mode_id: string;
  source_ports: ShipControllerEndpointRef[];
  summary?: string;
}

export interface ShipControllerPackagePhaseSummaryEntryArtifact {
  id: string;
  title?: string;
  phase_id: string;
  source_ports: ShipControllerEndpointRef[];
  summary?: string;
}

export interface ShipControllerPackageModeSummaryArtifact {
  id: string;
  title?: string;
  default_mode_id?: string;
  entries: ShipControllerPackageModeSummaryEntryArtifact[];
}

export interface ShipControllerPackagePhaseSummaryArtifact {
  id: string;
  title?: string;
  default_phase_id?: string;
  entries: ShipControllerPackagePhaseSummaryEntryArtifact[];
}

export interface ShipControllerPackageModeGroupArtifact {
  id: string;
  title?: string;
  mode_ids: string[];
  summary?: string;
}

export interface ShipControllerPackagePhaseGroupArtifact {
  id: string;
  title?: string;
  phase_ids: string[];
  summary?: string;
}

export interface ShipControllerPackageAllowedModeTransitionArtifact {
  id: string;
  title?: string;
  intent: "request_mode_change";
  from_mode_id?: string;
  to_mode_id: string;
  guard_state?: "clear" | "blocked" | "unsupported";
  guard_notes?: string[];
}

export interface ShipControllerPackageAllowedPhaseTransitionArtifact {
  id: string;
  title?: string;
  intent: "request_phase_start" | "request_phase_abort";
  phase_id: string;
  allowed_mode_ids?: string[];
  phase_state?: "idle" | "ready" | "running" | "aborting" | "completed" | "aborted";
  transition_state?: "idle" | "pending" | "running" | "completed" | "failed" | "cancelled";
  guard_state?: "clear" | "blocked" | "unsupported";
  guard_notes?: string[];
}

export interface ShipControllerPackageModePhaseArtifact {
  id: string;
  package_instance_id: string;
  title?: string;
  modes: ShipControllerPackageModeArtifact[];
  phases: ShipControllerPackagePhaseArtifact[];
  mode_summary: ShipControllerPackageModeSummaryArtifact;
  phase_summary: ShipControllerPackagePhaseSummaryArtifact;
  active_mode_id: string;
  active_phase_id: string;
  allowed_mode_transitions: ShipControllerPackageAllowedModeTransitionArtifact[];
  allowed_phase_transitions: ShipControllerPackageAllowedPhaseTransitionArtifact[];
  package_mode_groups: ShipControllerPackageModeGroupArtifact[];
  package_phase_groups: ShipControllerPackagePhaseGroupArtifact[];
  trace_groups: ShipControllerPackageTraceGroupArtifact[];
  package_supervision_id?: string;
  package_coordination_id?: string;
}

export interface ShipControllerHardwareResourceArtifact {
  id: string;
  title?: string;
  gpio: number;
  capabilities: string[];
  note?: string;
  allowed_gpios?: number[];
  origin: "preset_default" | "manifest_override";
  binding_ids: string[];
  port_refs: ShipControllerEndpointRef[];
}

export interface ShipControllerHardwareDiagnosticArtifact {
  code: string;
  severity: "error" | "warning";
  message: string;
  binding_id?: string;
  resource_id?: string;
  gpio?: number;
}

export interface ShipControllerHardwareArtifact {
  target_preset_ref: string;
  chip_template_ref: string;
  chip_title?: string;
  board_template_ref: string;
  board_title?: string;
  active_rule_ids: string[];
  reserved_pins: Record<string, number>;
  forbidden_pins: number[];
  resources: ShipControllerHardwareResourceArtifact[];
  diagnostics: ShipControllerHardwareDiagnosticArtifact[];
}

export interface ShipControllerConfigArtifact {
  schema_version: "0.1.0";
  target_kind: "esp32.shipcontroller.v1";
  source_pack_id: string;
  capability_profile: string;
  artifacts: {
    digital_inputs: ShipControllerDigitalInputArtifact[];
    analog_inputs: ShipControllerAnalogInputArtifact[];
    digital_outputs: ShipControllerDigitalOutputArtifact[];
    timed_relays: ShipControllerTimedRelayArtifact[];
    pulse_flowmeters: ShipControllerPulseFlowmeterArtifact[];
    run_hours_counters: ShipControllerRunHoursCounterArtifact[];
    event_counters: ShipControllerEventCounterArtifact[];
    threshold_monitors: ShipControllerThresholdMonitorArtifact[];
    maintenance_counters: ShipControllerMaintenanceCounterArtifact[];
    pid_controllers: ShipControllerPidControllerArtifact[];
    modbus_rtu_buses?: ShipControllerModbusRtuBusArtifact[];
    comm_bridges?: ShipControllerCommBridgeArtifact[];
    remote_points?: ShipControllerRemotePointArtifact[];
    operations?: ShipControllerOperationArtifact[];
    package_supervision?: ShipControllerPackageSupervisionArtifact[];
    package_coordination?: ShipControllerPackageCoordinationArtifact[];
    package_mode_phase?: ShipControllerPackageModePhaseArtifact[];
    package_permissive_interlock?: ShipControllerPackagePermissiveInterlockArtifact[];
    package_protection_recovery?: ShipControllerPackageProtectionRecoveryArtifact[];
    package_arbitration?: ShipControllerPackageArbitrationArtifact[];
    package_override_handover?: ShipControllerPackageOverrideHandoverArtifact[];
    hardware?: ShipControllerHardwareArtifact;
  };
  diagnostics: TargetAdapterDiagnostic[];
}

export interface Esp32TargetAdapter extends TargetAdapterContract {
  getCapabilityProfile(): Esp32CapabilityProfile;
  checkCompatibility(pack: RuntimePack): Esp32CompatibilityResult;
  buildApplyPlan(pack: RuntimePack): Esp32ApplyPlan;
  validatePack(pack: RuntimePack): TargetAdapterDiagnostic[];
  apply(request: TargetDeploymentRequest): Promise<TargetDeploymentResult>;
  readback(request: TargetReadbackRequest): Promise<TargetReadbackSnapshot>;
}
