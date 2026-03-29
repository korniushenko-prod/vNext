export type RuntimeBindingKind = "digital_in" | "digital_out" | "analog_in" | "analog_out" | "bus" | "service";
export type RuntimeParamSource = "default" | "override" | "instance_override" | "parent_param" | "materialized";
export type RuntimeConnectionScope = "system" | "composition";
export type RuntimePortDirection = "in" | "out";

export interface RuntimePack {
  schema_version: string;
  pack_id: string;
  source: RuntimePackSource;
  instances: Record<string, RuntimeInstance>;
  connections: Record<string, RuntimeConnection>;
  resources: Record<string, RuntimeResourceBinding>;
  operations: Record<string, RuntimeOperation>;
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
  ui_hint?: string;
  safe_when?: string[];
  confirmation_policy?: string;
  progress_signals?: RuntimeTraceSignalRef[];
  result_fields?: string[];
  state_hint?: RuntimeOperationStateHint;
  provenance?: RuntimeMetadataProvenance;
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
