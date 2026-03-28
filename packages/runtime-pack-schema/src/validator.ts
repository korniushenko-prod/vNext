import type {
  RuntimeConnection,
  RuntimeEndpoint,
  RuntimeInstance,
  RuntimePack,
  RuntimePackSource,
  RuntimePort,
  RuntimeResolvedParam,
  RuntimeResourceBinding
} from "./types.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationDiagnostic {
  code: string;
  severity: ValidationSeverity;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  diagnostics: ValidationDiagnostic[];
}

export function validateRuntimePack(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  if (!isRecord(value)) {
    return fail(diagnostics, error("runtime_pack.invalid", "$", "Runtime pack must be an object."));
  }

  requireString(value, "schema_version", "$.schema_version", diagnostics);
  requireString(value, "pack_id", "$.pack_id", diagnostics);

  if ("signals" in value) {
    diagnostics.push(error("runtime_pack.signals.forbidden", "$.signals", "Runtime pack must not contain signals; use normalized connections."));
  }

  const source = requireRecord(value, "source", "$.source", diagnostics);
  if (source) {
    validateRuntimePackSource(source, "$.source", diagnostics);
  }

  const instances = requireRecord(value, "instances", "$.instances", diagnostics);
  if (instances) {
    for (const [instanceId, instanceValue] of Object.entries(instances)) {
      validateRuntimeInstance(instanceId, instanceValue, `$.instances.${instanceId}`, diagnostics);
    }
  }

  const connections = requireRecord(value, "connections", "$.connections", diagnostics);
  if (connections) {
    for (const [connectionId, connectionValue] of Object.entries(connections)) {
      validateRuntimeConnection(connectionId, connectionValue, `$.connections.${connectionId}`, diagnostics);
    }
  }

  const resources = requireRecord(value, "resources", "$.resources", diagnostics);
  if (resources) {
    for (const [resourceId, resourceValue] of Object.entries(resources)) {
      validateRuntimeResourceBinding(resourceId, resourceValue, `$.resources.${resourceId}`, diagnostics);
    }
  }

  return {
    ok: diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics
  };
}

function validateRuntimePackSource(value: Record<string, unknown>, path: string, diagnostics: ValidationDiagnostic[]): void {
  requireString(value, "project_id", `${path}.project_id`, diagnostics);
  requireString(value, "authoring_schema_version", `${path}.authoring_schema_version`, diagnostics);
  requireOptionalString(value, "generated_at", `${path}.generated_at`, diagnostics);
}

function validateRuntimeInstance(
  instanceId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeInstance {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_instance.invalid", path, "Runtime instance must be an object."));
    return false;
  }

  requireExactString(value, "id", instanceId, `${path}.id`, diagnostics);
  requireString(value, "type_ref", `${path}.type_ref`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);

  const ports = requireRecord(value, "ports", `${path}.ports`, diagnostics);
  if (ports) {
    for (const [portId, portValue] of Object.entries(ports)) {
      validateRuntimePort(portId, portValue, `${path}.ports.${portId}`, diagnostics);
    }
  }

  const params = requireRecord(value, "params", `${path}.params`, diagnostics);
  if (params) {
    for (const [paramId, paramValue] of Object.entries(params)) {
      validateResolvedParam(paramValue, `${path}.params.${paramId}`, diagnostics);
    }
  }

  const alarms = requireRecord(value, "alarms", `${path}.alarms`, diagnostics);
  if (alarms) {
    for (const [alarmId, alarmValue] of Object.entries(alarms)) {
      if (!isRecord(alarmValue)) {
        diagnostics.push(error("runtime_alarm.invalid", `${path}.alarms.${alarmId}`, "Runtime alarm must be an object."));
        continue;
      }
      requireExactString(alarmValue, "id", alarmId, `${path}.alarms.${alarmId}.id`, diagnostics);
      requireOptionalString(alarmValue, "severity", `${path}.alarms.${alarmId}.severity`, diagnostics);
    }
  }

  if ("source_scope" in value && value.source_scope !== undefined) {
    const sourceScope = requireRecord(value, "source_scope", `${path}.source_scope`, diagnostics);
    if (sourceScope) {
      requireOneOf(sourceScope, "kind", ["system", "composition"], `${path}.source_scope.kind`, diagnostics);
      requireString(sourceScope, "owner_id", `${path}.source_scope.owner_id`, diagnostics);
    }
  }

  return true;
}

function validateRuntimePort(portId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is RuntimePort {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_port.invalid", path, "Runtime port must be an object."));
    return false;
  }

  requireExactString(value, "id", portId, `${path}.id`, diagnostics);
  requireOneOf(value, "direction", ["in", "out"], `${path}.direction`, diagnostics);
  requireString(value, "channel_kind", `${path}.channel_kind`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);
  return true;
}

function validateResolvedParam(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is RuntimeResolvedParam {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_param.invalid", path, "Resolved runtime param must be an object."));
    return false;
  }

  if (!("value" in value)) {
    diagnostics.push(error("runtime_param.value.missing", `${path}.value`, "Resolved runtime param must include `value`."));
  }

  requireOptionalString(value, "value_type", `${path}.value_type`, diagnostics);
  requireOneOf(value, "source", ["default", "override", "parent_param", "materialized"], `${path}.source`, diagnostics);
  return true;
}

function validateRuntimeConnection(
  connectionId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeConnection {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_connection.invalid", path, "Runtime connection must be an object."));
    return false;
  }

  requireExactString(value, "id", connectionId, `${path}.id`, diagnostics);
  validateRuntimeEndpoint(value.source, `${path}.source`, diagnostics);
  validateRuntimeEndpoint(value.target, `${path}.target`, diagnostics);
  requireString(value, "channel_kind", `${path}.channel_kind`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);

  const origin = requireRecord(value, "origin", `${path}.origin`, diagnostics);
  if (origin) {
    requireOneOf(origin, "scope_kind", ["system", "composition"], `${path}.origin.scope_kind`, diagnostics);
    requireString(origin, "owner_id", `${path}.origin.owner_id`, diagnostics);
    requireOptionalString(origin, "signal_id", `${path}.origin.signal_id`, diagnostics);
    requireOptionalString(origin, "route_id", `${path}.origin.route_id`, diagnostics);
  }

  return true;
}

function validateRuntimeEndpoint(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is RuntimeEndpoint {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_endpoint.invalid", path, "Runtime endpoint must be an object."));
    return false;
  }

  requireString(value, "instance_id", `${path}.instance_id`, diagnostics);
  requireString(value, "port_id", `${path}.port_id`, diagnostics);
  return true;
}

function validateRuntimeResourceBinding(
  resourceId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeResourceBinding {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_resource.invalid", path, "Runtime resource binding must be an object."));
    return false;
  }

  requireExactString(value, "id", resourceId, `${path}.id`, diagnostics);
  requireOneOf(value, "binding_kind", ["digital_in", "digital_out", "analog_in", "analog_out", "bus", "service"], `${path}.binding_kind`, diagnostics);
  requireString(value, "instance_id", `${path}.instance_id`, diagnostics);
  requireOptionalString(value, "port_id", `${path}.port_id`, diagnostics);
  requireRecord(value, "config", `${path}.config`, diagnostics);
  return true;
}

function requireString(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "string") {
    diagnostics.push(error("field.string", path, `Field \`${field}\` must be a string.`));
  }
}

function requireOptionalString(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "string") {
    diagnostics.push(error("field.string", path, `Field \`${field}\` must be a string when present.`));
  }
}

function requireBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean.`));
  }
}

function requireExactString(
  value: Record<string, unknown>,
  field: string,
  expected: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (value[field] !== expected) {
    diagnostics.push(error("field.exact", path, `Field \`${field}\` must equal \`${expected}\`.`));
  }
}

function requireOneOf(
  value: Record<string, unknown>,
  field: string,
  allowed: string[],
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (typeof value[field] !== "string" || !allowed.includes(value[field] as string)) {
    diagnostics.push(error("field.enum", path, `Field \`${field}\` must be one of: ${allowed.join(", ")}.`));
  }
}

function requireRecord(
  value: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
): Record<string, unknown> | null {
  const current = value[field];
  if (!isRecord(current)) {
    diagnostics.push(error("field.object", path, `Field \`${field}\` must be an object.`));
    return null;
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error(code: string, path: string, message: string): ValidationDiagnostic {
  return {
    code,
    severity: "error",
    path,
    message
  };
}

function fail(diagnostics: ValidationDiagnostic[], diagnostic: ValidationDiagnostic): ValidationResult {
  diagnostics.push(diagnostic);
  return {
    ok: false,
    diagnostics
  };
}
