export type TypeRef = string;

export type PortDirection = "in" | "out";
export type ChannelKind = "signal" | "command" | "state" | "event" | "alarm" | "telemetry";

export interface ProjectModel {
  schema_version: string;
  meta: {
    project_id: string;
    title: string;
  };
  imports: {
    libraries: string[];
    packages: string[];
  };
  definitions: {
    object_types: Record<string, ObjectType>;
    templates?: Record<string, ObjectTemplate>;
    packages?: Record<string, PackageDefinition>;
  };
  system: {
    instances: Record<string, ObjectInstance>;
    signals: Record<string, SystemSignal>;
    packages?: Record<string, PackageInstance>;
  };
  hardware: {
    bindings: Record<string, unknown>;
    catalog?: HardwareCatalog;
    manifest?: HardwareManifest;
  };
  views: {
    screens: Record<string, unknown>;
  };
  layouts: {
    system: Record<string, unknown>;
    definitions: Record<string, unknown>;
  };
}

export interface ObjectType {
  id: string;
  kind: "object_type";
  meta: {
    title: string;
    version?: string;
    origin: "project" | "generated" | "imported" | "library";
    library_id?: string;
    description?: string;
  };
  interface: {
    ports: Record<string, PortDef>;
    params: Record<string, ParamDef>;
    alarms: Record<string, AlarmDef>;
  };
  locals: {
    signals: Record<string, unknown>;
    vars: Record<string, unknown>;
  };
  facets?: ObjectTypeFacets;
  implementation: {
    native: NativeImplementation | null;
    composition: CompositionModel | null;
    state: unknown | null;
    flow: unknown | null;
  };
  diagnostics: Record<string, unknown>;
}

export interface NativeImplementation {
  native_kind: string;
  target_kinds?: string[];
  config_template?: unknown;
}

export interface ObjectInstance {
  id: string;
  kind: "object_instance";
  type_ref: TypeRef;
  template_ref?: string;
  title?: string;
  enabled?: boolean;
  param_values?: Record<string, ParamValue>;
  tags?: Record<string, string>;
}

export interface ObjectTemplate {
  id: string;
  kind: "object_template";
  base_type_ref: TypeRef;
  origin: "library_template" | "project_saved";
  meta: {
    title: string;
    version?: string;
    description?: string;
  };
  defaults: {
    param_values?: Record<string, ParamValue>;
    tags?: Record<string, string>;
    facet_defaults?: Record<string, unknown>;
  };
}

export interface HardwareCatalog {
  chips?: Record<string, ChipTemplate>;
  boards?: Record<string, BoardTemplate>;
  presets?: Record<string, TargetPreset>;
}

export interface ChipTemplate {
  id: string;
  title: string;
  family?: string;
  pins: Record<string, ChipPinTemplate>;
}

export interface ChipPinTemplate {
  capabilities: string[];
  internal_pullup?: boolean;
  input_only?: boolean;
  strapping?: boolean;
  forbidden?: boolean;
  note?: string;
}

export interface BoardTemplate {
  id: string;
  title: string;
  chip_template_ref: string;
  rules: Record<string, BoardRule>;
}

export interface BoardRule {
  id: string;
  feature: string;
  class: "forbidden" | "exclusive" | "shared" | "warning";
  owner: string;
  reason: string;
  always_on?: boolean;
  pins: number[];
}

export interface TargetPreset {
  id: string;
  title: string;
  chip_template_ref: string;
  board_template_ref: string;
  active_rule_ids?: string[];
  resources: Record<string, HardwareResourceTemplate>;
  reserved_pins?: Record<string, number>;
}

export interface HardwareResourceTemplate {
  id: string;
  title?: string;
  gpio: number;
  capabilities: string[];
  note?: string;
  allowed_gpios?: number[];
}

export interface HardwareManifest {
  target_preset_ref: string;
  resource_bindings?: Record<string, HardwareResourceBinding>;
}

export interface HardwareResourceBinding {
  gpio?: number;
}

export interface PackageDefinition {
  id: string;
  kind: "package_definition";
  meta: PackageMeta;
  members: Record<string, PackageMember>;
  signals: Record<string, SystemSignal>;
  bindings?: Record<string, PackageInstanceBinding>;
  presets?: Record<string, PackagePreset>;
  supervision?: PackageSupervisionContract;
  coordination?: PackageCoordinationContract;
  mode_phase?: PackageModePhaseContract;
  permissive_interlock?: PackagePermissiveInterlockContract;
  protection_recovery?: PackageProtectionRecoveryContract;
  arbitration?: PackageArbitrationContract;
  override_handover?: PackageOverrideHandoverContract;
  boundary_notes?: string[];
}

export interface PackageMeta {
  title: string;
  version?: string;
  origin: "project" | "generated" | "imported" | "library";
  description?: string;
  domain?: string;
  package_kind?: string;
  safety_scope?: "non_safety_skeleton" | "includes_safety_logic";
}

export interface PackageMember {
  id: string;
  kind: "package_member";
  type_ref: TypeRef;
  template_ref?: string;
  title?: string;
  enabled?: boolean;
  param_values?: Record<string, ParamValue>;
  tags?: Record<string, string>;
  defaults?: PackageMemberDefaults;
}

export interface PackageMemberDefaults {
  param_values?: Record<string, ParamValue>;
  tags?: Record<string, string>;
}

export interface PackageInstanceBinding {
  id: string;
  kind: "member_port" | "member_param";
  member_id: string;
  member_port_id?: string;
  member_param_id?: string;
  title?: string;
  binding_role?: string;
  required?: boolean;
  description?: string;
}

export interface PackagePreset {
  id: string;
  title?: string;
  description?: string;
  member_defaults?: Record<string, PackageMemberDefaults>;
}

export interface PackageSupervisionContract {
  summary_outputs?: Record<string, PackageSummaryOutput>;
  aggregate_monitors?: Record<string, PackageAggregateMonitor>;
  aggregate_alarms?: Record<string, PackageAggregateAlarm>;
  trace_groups?: Record<string, PackageTraceGroup>;
  operation_proxies?: Record<string, PackageOperationProxy>;
}

export type PackageCoordinationState =
  | "standby"
  | "ready"
  | "circulation_active"
  | "control_active"
  | "fault_latched";

export interface PackageCoordinationContract {
  package_state: PackageCoordinationStateSummary;
  summary_outputs?: Record<string, PackageSummaryOutput>;
  aggregate_monitors?: Record<string, PackageAggregateMonitor>;
  trace_groups?: Record<string, PackageTraceGroup>;
  operation_proxies?: Record<string, PackageCoordinationOperationProxy>;
}

export interface PackageCoordinationStateSummary {
  id: string;
  title?: string;
  default_state?: PackageCoordinationState;
  states: Record<string, PackageCoordinationStateRule>;
}

export interface PackageCoordinationStateRule {
  id: string;
  state: PackageCoordinationState;
  title?: string;
  source_ports: PackageChildPortRef[];
  summary?: string;
}

export interface PackageChildPortRef {
  member_id: string;
  port_id: string;
}

export interface PackageSummaryOutput {
  id: string;
  title?: string;
  value_type: string;
  source: PackageChildPortRef;
}

export interface PackageAggregateMonitor {
  id: string;
  title?: string;
  kind: string;
  source_ports: PackageChildPortRef[];
  severity?: string;
}

export interface PackageAggregateAlarm {
  id: string;
  title?: string;
  severity?: string;
  source_ports: PackageChildPortRef[];
}

export interface PackageTraceGroup {
  id: string;
  title?: string;
  signals: PackageChildPortRef[];
  sample_hint_ms?: number;
  chart_hint?: string;
}

export interface PackageOperationProxy {
  id: string;
  title?: string;
  target_member_id: string;
  target_operation_id: string;
  child_operation_kind?: string;
  ui_hint?: string;
}

export interface PackageCoordinationOperationProxy {
  id: string;
  title?: string;
  kind: string;
  target_member_id: string;
  target_operation_id: string;
  child_operation_kind?: string;
  ui_hint?: string;
}

export type PackageGateState = "ready" | "blocked" | "held" | "faulted";
export type PackageInterlockActiveState = "held" | "faulted";
export type PackageProtectionState = "ready" | "blocked" | "tripped" | "recovering";
export type PackageCommandRequestKind =
  | "request_start"
  | "request_stop"
  | "request_reset"
  | "request_enable"
  | "request_disable";
export type PackageOwnershipLane = "auto" | "manual" | "service" | "remote";
export type PackageCommandArbitrationResult =
  | "accepted"
  | "blocked"
  | "denied"
  | "superseded"
  | "unsupported";
export type PackageHandoverRequestKind =
  | "request_takeover"
  | "request_release"
  | "request_return_to_auto";
export type PackageHandoverRequestState =
  | "accepted"
  | "blocked"
  | "denied"
  | "unsupported";
export type PackageHandoverDenialReason =
  | "blocked_by_policy"
  | "held_by_other_owner"
  | "not_available";

export interface PackagePermissiveInterlockContract {
  permissives: Record<string, PackagePermissiveDef>;
  interlocks: Record<string, PackageInterlockDef>;
  gate_summary: PackageGateSummary;
  summary_outputs?: Record<string, PackageSummaryOutput>;
  aggregate_monitors?: Record<string, PackageAggregateMonitor>;
  trace_groups?: Record<string, PackageTraceGroup>;
}

export interface PackagePermissiveDef {
  id: string;
  title?: string;
  source_ports: PackageChildPortRef[];
  summary?: string;
  blocked_reason_code?: string;
  diagnostic_ref?: string;
}

export interface PackageInterlockDef {
  id: string;
  title?: string;
  source_ports: PackageChildPortRef[];
  active_state: PackageInterlockActiveState;
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface PackageGateSummary {
  id: string;
  title?: string;
  default_state?: PackageGateState;
  permissive_refs?: string[];
  interlock_refs?: string[];
  transition_guards?: Record<string, PackageTransitionGuardRef>;
}

export interface PackageTransitionGuardRef {
  id: string;
  title?: string;
  permissive_refs?: string[];
  interlock_refs?: string[];
  mode_transition_ref?: string;
  phase_transition_ref?: string;
  summary?: string;
}

export interface PackageProtectionRecoveryContract {
  trips: Record<string, PackageTripDef>;
  inhibits: Record<string, PackageInhibitDef>;
  protection_summary: PackageProtectionSummary;
  recovery_requests?: Record<string, PackageRecoveryRequestDef>;
  summary_outputs?: Record<string, PackageSummaryOutput>;
  aggregate_monitors?: Record<string, PackageAggregateMonitor>;
  trace_groups?: Record<string, PackageTraceGroup>;
}

export interface PackageTripDef {
  id: string;
  title?: string;
  source_ports: PackageChildPortRef[];
  latching?: boolean;
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface PackageInhibitDef {
  id: string;
  title?: string;
  source_ports: PackageChildPortRef[];
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
}

export interface PackageProtectionSummary {
  id: string;
  title?: string;
  default_state?: PackageProtectionState;
  trip_refs?: string[];
  inhibit_refs?: string[];
  recovery_request_refs?: string[];
  diagnostic_summaries?: Record<string, PackageProtectionDiagnosticSummary>;
}

export interface PackageProtectionDiagnosticSummary {
  id: string;
  title?: string;
  trip_refs?: string[];
  inhibit_refs?: string[];
  summary?: string;
}

export interface PackageRecoveryRequestDef {
  id: string;
  title?: string;
  kind: string;
  target_member_id: string;
  target_operation_id: string;
  confirmation_policy?: "none" | "required";
  blocked_by_trip_refs?: string[];
  blocked_by_inhibit_refs?: string[];
  summary?: string;
}

export interface PackageArbitrationContract {
  ownership_lanes: Record<string, PackageOwnershipLaneDef>;
  ownership_summary: PackageOwnershipSummary;
  command_lanes: Record<string, PackageCommandLaneDef>;
  command_summary: PackageCommandSummary;
  summary_outputs?: Record<string, PackageSummaryOutput>;
  aggregate_monitors?: Record<string, PackageAggregateMonitor>;
  trace_groups?: Record<string, PackageTraceGroup>;
}

export interface PackageOverrideHandoverContract {
  authority_holders: Record<string, PackageAuthorityHolderDef>;
  handover_summary: PackageHandoverSummary;
  handover_requests: Record<string, PackageHandoverRequestDef>;
  summary_outputs?: Record<string, PackageSummaryOutput>;
  aggregate_monitors?: Record<string, PackageAggregateMonitor>;
  trace_groups?: Record<string, PackageTraceGroup>;
}

export interface PackageOwnershipLaneDef {
  id: string;
  title?: string;
  lane: PackageOwnershipLane;
  source_ports: PackageChildPortRef[];
  summary?: string;
}

export interface PackageAuthorityHolderDef {
  id: string;
  title?: string;
  lane: PackageOwnershipLane;
  source_ports: PackageChildPortRef[];
  summary?: string;
}

export interface PackageOwnershipSummary {
  id: string;
  title?: string;
  active_lane_refs?: string[];
  summary?: string;
}

export interface PackageCommandLaneDef {
  id: string;
  title?: string;
  request_kind: PackageCommandRequestKind;
  ownership_lane_ref: string;
  target_member_id: string;
  arbitration_result: PackageCommandArbitrationResult;
  summary?: string;
  request_preview?: string;
  blocked_reason?: string;
  denied_reason?: string;
  superseded_by_lane_ref?: string;
}

export interface PackageCommandSummary {
  id: string;
  title?: string;
  active_owner_lane_refs?: string[];
  accepted_lane_refs?: string[];
  blocked_lane_refs?: string[];
  denied_lane_refs?: string[];
  superseded_lane_refs?: string[];
  summary?: string;
}

export interface PackageHandoverSummary {
  id: string;
  title?: string;
  current_holder_ref: string;
  current_lane: PackageOwnershipLane;
  requested_holder_ref?: string;
  accepted_request_refs?: string[];
  blocked_request_refs?: string[];
  denied_request_refs?: string[];
  last_handover_reason?: string;
  summary?: string;
}

export interface PackageHandoverRequestDef {
  id: string;
  title?: string;
  request_kind: PackageHandoverRequestKind;
  requested_holder_ref: string;
  state: PackageHandoverRequestState;
  summary?: string;
  request_preview?: string;
  blocked_reason?: PackageHandoverDenialReason;
  denied_reason?: PackageHandoverDenialReason;
}

export interface PackageModePhaseContract {
  modes: Record<string, PackageModeDef>;
  phases: Record<string, PackagePhaseDef>;
  mode_summary: PackageModeSummary;
  phase_summary: PackagePhaseSummary;
  active_mode_ref: string;
  active_phase_ref: string;
  allowed_mode_transitions?: Record<string, PackageAllowedModeTransition>;
  allowed_phase_transitions?: Record<string, PackageAllowedPhaseTransition>;
  package_mode_groups?: Record<string, PackageModeGroup>;
  package_phase_groups?: Record<string, PackagePhaseGroup>;
  trace_groups?: Record<string, PackageTraceGroup>;
}

export type PackageModeTransitionIntent =
  | "request_mode_change"
  | "request_phase_start"
  | "request_phase_abort";

export interface PackageModeDef {
  id: string;
  title?: string;
  summary?: string;
  phase_refs?: string[];
}

export interface PackagePhaseDef {
  id: string;
  title?: string;
  summary?: string;
  source_ports: PackageChildPortRef[];
}

export interface PackageAllowedModeTransition {
  id: string;
  title?: string;
  intent: "request_mode_change";
  from_mode_ref?: string;
  to_mode_ref: string;
  guard_notes?: string[];
}

export interface PackageAllowedPhaseTransition {
  id: string;
  title?: string;
  intent: "request_phase_start" | "request_phase_abort";
  phase_ref: string;
  allowed_mode_refs?: string[];
  guard_notes?: string[];
}

export interface PackageModeSummary {
  id: string;
  title?: string;
  default_mode_ref?: string;
  entries: Record<string, PackageModeSummaryEntry>;
}

export interface PackageModeSummaryEntry {
  id: string;
  title?: string;
  mode_ref: string;
  source_ports: PackageChildPortRef[];
  summary?: string;
}

export interface PackagePhaseSummary {
  id: string;
  title?: string;
  default_phase_ref?: string;
  entries: Record<string, PackagePhaseSummaryEntry>;
}

export interface PackagePhaseSummaryEntry {
  id: string;
  title?: string;
  phase_ref: string;
  source_ports: PackageChildPortRef[];
  summary?: string;
}

export interface PackageModeGroup {
  id: string;
  title?: string;
  mode_refs: string[];
  summary?: string;
}

export interface PackagePhaseGroup {
  id: string;
  title?: string;
  phase_refs: string[];
  summary?: string;
}

export interface PackageInstance {
  id: string;
  kind: "package_instance";
  package_ref: string;
  title?: string;
  enabled?: boolean;
  preset_ref?: string;
  member_overrides?: Record<string, PackageMemberOverride>;
  tags?: Record<string, string>;
}

export interface PackageMemberOverride {
  title?: string;
  enabled?: boolean;
  template_ref?: string;
  param_values?: Record<string, ParamValue>;
  tags?: Record<string, string>;
}

export interface PortDef {
  id: string;
  title?: string;
  direction: PortDirection;
  channel_kind: ChannelKind;
  value_type: string;
  required?: boolean;
}

export interface ParamDef {
  id: string;
  title?: string;
  value_type: string;
  default?: unknown;
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

export interface AlarmDef {
  id: string;
  title?: string;
  severity?: string;
}

export interface CompositionModel {
  instances: Record<string, ObjectInstance>;
  routes: Record<string, CompositionRoute>;
}

export type CompositionEndpoint =
  | {
      kind: "parent_port";
      port_id: string;
    }
  | {
      kind: "instance_port";
      instance_id: string;
      port_id: string;
    };

export interface CompositionRoute {
  id: string;
  from: CompositionEndpoint;
  to: CompositionEndpoint;
}

export interface SystemSignal {
  id: string;
  title?: string;
  source: SystemSignalEndpoint;
  targets: Record<string, SystemSignalEndpoint>;
}

export interface SystemSignalEndpoint {
  instance_id: string;
  port_id: string;
}

export type ParamValue =
  | {
      kind: "literal";
      value: unknown;
    }
  | {
      kind: "parent_param";
      param_id: string;
    };

export interface ObjectTypeFacets {
  frontends?: {
    requirements?: Record<string, ObjectFrontendRequirementDef>;
  };
  operations?: {
    operations?: Record<string, ObjectOperationDef>;
  };
  monitors?: {
    monitors?: Record<string, ObjectMonitorDef>;
  };
  monitoring?: {
    monitors?: Record<string, ObjectMonitorDef>;
  };
  debug?: {
    trace_groups?: Record<string, ObjectTraceGroupDef>;
  };
  persistence?: {
    slots?: Record<string, ObjectPersistenceSlotDef>;
  };
  templates?: {
    presets?: Record<string, ObjectTemplatePresetDef>;
  };
  [key: string]: unknown;
}

export interface ObjectOperationDef {
  id: string;
  kind?: string;
  title?: string;
  ui_hint?: string;
  safe_when?: string[];
  confirmation_policy?: string;
  progress_signals?: string[];
  result_fields?: string[];
}

export interface ObjectTraceGroupDef {
  title?: string;
  signals: string[];
  sample_hint_ms?: number;
  chart_hint?: string;
}

export interface ObjectFrontendRequirementDef {
  id: string;
  kind: string;
  mode?: string;
  title?: string;
  source_ports?: string[];
  binding_kind?: string;
  channel_kind?: ChannelKind;
  value_type?: string;
  required?: boolean;
  config?: Record<string, unknown>;
}

export interface ObjectMonitorDef {
  id: string;
  kind: string;
  title?: string;
  source_ports?: string[];
  severity?: string;
  status_port_id?: string;
  config?: Record<string, unknown>;
}

export interface ObjectPersistenceSlotDef {
  id: string;
  slot_kind: string;
  title?: string;
  owner_param_id?: string;
  nv_slot_hint?: string;
  flush_policy?: string;
}

export interface ObjectTemplatePresetDef {
  id: string;
  title?: string;
  description?: string;
  defaults?: Record<string, unknown>;
}
