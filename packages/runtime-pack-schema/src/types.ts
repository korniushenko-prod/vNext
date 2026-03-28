export type RuntimeBindingKind = "digital_in" | "digital_out" | "analog_in" | "analog_out" | "bus" | "service";
export type RuntimeParamSource = "default" | "override" | "parent_param" | "materialized";
export type RuntimeConnectionScope = "system" | "composition";
export type RuntimePortDirection = "in" | "out";

export interface RuntimePack {
  schema_version: string;
  pack_id: string;
  source: RuntimePackSource;
  instances: Record<string, RuntimeInstance>;
  connections: Record<string, RuntimeConnection>;
  resources: Record<string, RuntimeResourceBinding>;
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
  scope_kind: RuntimeConnectionScope;
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
