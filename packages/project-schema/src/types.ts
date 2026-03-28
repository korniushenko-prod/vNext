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
  title?: string;
  enabled?: boolean;
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
  operations?: {
    operations?: Record<string, ObjectOperationDef>;
  };
  debug?: {
    trace_groups?: Record<string, ObjectTraceGroupDef>;
  };
  [key: string]: unknown;
}

export interface ObjectOperationDef {
  id: string;
  kind?: string;
  title?: string;
}

export interface ObjectTraceGroupDef {
  signals: string[];
  sample_hint_ms?: number;
  chart_hint?: string;
}
