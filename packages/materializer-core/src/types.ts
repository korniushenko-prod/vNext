export type PortDirection = "in" | "out";

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
  };
  system: {
    instances: Record<string, ObjectInstance>;
    signals: Record<string, SystemSignal>;
  };
  hardware: {
    bindings: Record<string, unknown>;
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
    origin: "project" | "generated" | "imported";
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
  implementation: {
    native: unknown | null;
    composition: CompositionModel | null;
    state: unknown | null;
    flow: unknown | null;
  };
  diagnostics: Record<string, unknown>;
}

export interface ObjectInstance {
  id: string;
  kind: "object_instance";
  type_ref: string;
  title?: string;
  enabled?: boolean;
  param_values?: Record<string, ParamValue>;
  tags?: Record<string, string>;
}

export interface PortDef {
  id: string;
  title?: string;
  direction: PortDirection;
  channel_kind: string;
  value_type: string;
  required?: boolean;
}

export interface ParamDef {
  id: string;
  title?: string;
  value_type: string;
  default?: unknown;
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
  binding_kind: string;
  instance_id: string;
  port_id?: string;
  config: Record<string, unknown>;
}

export interface RuntimeSourceScope {
  kind: RuntimeConnectionScope;
  owner_id: string;
}

export type MaterializationSeverity = "error" | "warning";

export interface MaterializationDiagnostic {
  code: string;
  severity: MaterializationSeverity;
  path: string;
  message: string;
}

export interface MaterializationOptions {
  packId?: string;
  generatedAt?: string;
}

export interface MaterializationResult {
  ok: boolean;
  diagnostics: MaterializationDiagnostic[];
  pack: RuntimePack | null;
}
