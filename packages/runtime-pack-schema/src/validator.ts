import type {
  RuntimeConnection,
  RuntimeEndpoint,
  RuntimeInstance,
  RuntimeFrontendRequirement,
  RuntimeMonitor,
  RuntimeNativeExecution,
  RuntimeOperation,
  RuntimePack,
  RuntimePackSource,
  RuntimePersistenceSlot,
  RuntimePort,
  RuntimeResolvedParam,
  RuntimeTraceGroup,
  RuntimeResourceBinding
} from "./types.js";
import { RUNTIME_PACK_SCHEMA_VERSION } from "./constants.js";

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

  requireExactString(value, "schema_version", RUNTIME_PACK_SCHEMA_VERSION, "$.schema_version", diagnostics);
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

  const operations = requireRecord(value, "operations", "$.operations", diagnostics);
  if (operations) {
    for (const [operationId, operationValue] of Object.entries(operations)) {
      validateRuntimeOperation(operationId, operationValue, `$.operations.${operationId}`, diagnostics);
    }
  }

  const traceGroups = requireRecord(value, "trace_groups", "$.trace_groups", diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroupValue] of Object.entries(traceGroups)) {
      validateRuntimeTraceGroup(traceGroupId, traceGroupValue, `$.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  const monitors = requireRecord(value, "monitors", "$.monitors", diagnostics);
  if (monitors) {
    for (const [monitorId, monitorValue] of Object.entries(monitors)) {
      validateRuntimeMonitor(monitorId, monitorValue, `$.monitors.${monitorId}`, diagnostics);
    }
  }

  const frontendRequirements = requireRecord(value, "frontend_requirements", "$.frontend_requirements", diagnostics);
  if (frontendRequirements) {
    for (const [requirementId, requirementValue] of Object.entries(frontendRequirements)) {
      validateRuntimeFrontendRequirement(requirementId, requirementValue, `$.frontend_requirements.${requirementId}`, diagnostics);
    }
  }

  const persistenceSlots = requireRecord(value, "persistence_slots", "$.persistence_slots", diagnostics);
  if (persistenceSlots) {
    for (const [slotId, slotValue] of Object.entries(persistenceSlots)) {
      validateRuntimePersistenceSlot(slotId, slotValue, `$.persistence_slots.${slotId}`, diagnostics);
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

  if ("native_execution" in value && value.native_execution !== undefined) {
    validateRuntimeNativeExecution(value.native_execution, `${path}.native_execution`, diagnostics);
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
  requireOneOf(value, "source", ["default", "override", "instance_override", "parent_param", "materialized"], `${path}.source`, diagnostics);

  if ("metadata" in value && value.metadata !== undefined) {
    const metadata = requireRecord(value, "metadata", `${path}.metadata`, diagnostics);
    if (metadata) {
      requireOptionalString(metadata, "title", `${path}.metadata.title`, diagnostics);
      requireOptionalString(metadata, "unit", `${path}.metadata.unit`, diagnostics);
      requireOptionalNumber(metadata, "min", `${path}.metadata.min`, diagnostics);
      requireOptionalNumber(metadata, "max", `${path}.metadata.max`, diagnostics);
      requireOptionalNumber(metadata, "step", `${path}.metadata.step`, diagnostics);
      requireOptionalString(metadata, "group", `${path}.metadata.group`, diagnostics);
      requireOptionalString(metadata, "ui_hint", `${path}.metadata.ui_hint`, diagnostics);
      requireOptionalString(metadata, "description", `${path}.metadata.description`, diagnostics);
      requireOptionalString(metadata, "access_role", `${path}.metadata.access_role`, diagnostics);
      requireOptionalString(metadata, "live_edit_policy", `${path}.metadata.live_edit_policy`, diagnostics);
      requireOptionalString(metadata, "persist_policy", `${path}.metadata.persist_policy`, diagnostics);
      requireOptionalString(metadata, "recipe_scope", `${path}.metadata.recipe_scope`, diagnostics);
      requireOptionalString(metadata, "danger_level", `${path}.metadata.danger_level`, diagnostics);
    }
  }

  if ("provenance" in value && value.provenance !== undefined) {
    const provenance = requireRecord(value, "provenance", `${path}.provenance`, diagnostics);
    if (provenance) {
      requireString(provenance, "owner_id", `${path}.provenance.owner_id`, diagnostics);
      requireString(provenance, "param_id", `${path}.provenance.param_id`, diagnostics);
      requireOneOf(provenance, "source_layer", ["system", "composition"], `${path}.provenance.source_layer`, diagnostics);
    }
  }
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
    requireOneOf(origin, "origin_layer", ["system", "composition"], `${path}.origin.origin_layer`, diagnostics);
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

function validateRuntimeNativeExecution(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeNativeExecution {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_native_execution.invalid", path, "Runtime native execution must be an object."));
    return false;
  }

  requireString(value, "native_kind", `${path}.native_kind`, diagnostics);
  requireOptionalStringArray(value, "target_kinds", `${path}.target_kinds`, diagnostics);
  requireOptionalString(value, "mode", `${path}.mode`, diagnostics);
  requireOptionalStringArray(value, "frontend_requirement_ids", `${path}.frontend_requirement_ids`, diagnostics);
  if ("config_template" in value && typeof value.config_template === "undefined") {
    diagnostics.push(error("field.present", `${path}.config_template`, "Field `config_template` must not be undefined when present."));
  }
  return true;
}

function validateRuntimeOperation(
  operationId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeOperation {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation.invalid", path, "Runtime operation must be an object."));
    return false;
  }

  requireExactString(value, "id", operationId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  requireOptionalStringArray(value, "safe_when", `${path}.safe_when`, diagnostics);
  requireOptionalString(value, "confirmation_policy", `${path}.confirmation_policy`, diagnostics);
  validateOptionalSignalRefs(value, "progress_signals", `${path}.progress_signals`, diagnostics);
  requireOptionalStringArray(value, "result_fields", `${path}.result_fields`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);

  if ("state_hint" in value && value.state_hint !== undefined) {
    const stateHint = requireRecord(value, "state_hint", `${path}.state_hint`, diagnostics);
    if (stateHint) {
      requireOptionalString(stateHint, "availability", `${path}.state_hint.availability`, diagnostics);
      requireOptionalString(stateHint, "progress_style", `${path}.state_hint.progress_style`, diagnostics);
      requireOptionalBoolean(stateHint, "destructive", `${path}.state_hint.destructive`, diagnostics);
    }
  }
  return true;
}

function validateRuntimeTraceGroup(
  traceGroupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeTraceGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_trace_group.invalid", path, "Runtime trace group must be an object."));
    return false;
  }

  requireExactString(value, "id", traceGroupId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  validateSignalRefs(value.signals, `${path}.signals`, diagnostics);

  if ("sample_hint_ms" in value && typeof value.sample_hint_ms !== "number") {
    diagnostics.push(error("field.number", `${path}.sample_hint_ms`, "Field `sample_hint_ms` must be a number when present."));
  }
  requireOptionalString(value, "chart_hint", `${path}.chart_hint`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimeMonitor(
  monitorId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeMonitor {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_monitor.invalid", path, "Runtime monitor must be an object."));
    return false;
  }

  requireExactString(value, "id", monitorId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateOptionalSignalRefs(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  requireOptionalString(value, "status_port_id", `${path}.status_port_id`, diagnostics);
  requireOptionalRecord(value, "config", `${path}.config`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimeFrontendRequirement(
  requirementId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeFrontendRequirement {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_frontend_requirement.invalid", path, "Runtime frontend requirement must be an object."));
    return false;
  }

  requireExactString(value, "id", requirementId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "mode", `${path}.mode`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateOptionalSignalRefs(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "binding_kind", `${path}.binding_kind`, diagnostics);
  requireOptionalString(value, "channel_kind", `${path}.channel_kind`, diagnostics);
  requireOptionalString(value, "value_type", `${path}.value_type`, diagnostics);
  requireOptionalBoolean(value, "required", `${path}.required`, diagnostics);
  requireOptionalRecord(value, "config", `${path}.config`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimePersistenceSlot(
  slotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePersistenceSlot {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_persistence_slot.invalid", path, "Runtime persistence slot must be an object."));
    return false;
  }

  requireExactString(value, "id", slotId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "slot_kind", `${path}.slot_kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "owner_param_id", `${path}.owner_param_id`, diagnostics);
  requireOptionalString(value, "nv_slot_hint", `${path}.nv_slot_hint`, diagnostics);
  requireOptionalString(value, "flush_policy", `${path}.flush_policy`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
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

function requireOptionalStringArray(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (!(field in value)) {
    return;
  }

  const current = value[field];
  if (!Array.isArray(current) || current.some((entry) => typeof entry !== "string")) {
    diagnostics.push(error("field.string_array", path, `Field \`${field}\` must be an array of strings when present.`));
  }
}

function requireOptionalNumber(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "number") {
    diagnostics.push(error("field.number", path, `Field \`${field}\` must be a number when present.`));
  }
}

function requireBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean.`));
  }
}

function requireOptionalBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean when present.`));
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

function requireOptionalRecord(
  value: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
): Record<string, unknown> | null {
  if (!(field in value) || value[field] === undefined) {
    return null;
  }

  return requireRecord(value, field, path, diagnostics);
}

function validateSignalRefs(value: unknown, path: string, diagnostics: ValidationDiagnostic[]) {
  if (!Array.isArray(value)) {
    diagnostics.push(error("field.array", path, "Field must be an array."));
    return;
  }

  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      diagnostics.push(error("runtime_trace_signal.invalid", `${path}.${index}`, "Signal ref must be an object."));
      return;
    }
    requireString(entry, "instance_id", `${path}.${index}.instance_id`, diagnostics);
    requireString(entry, "port_id", `${path}.${index}.port_id`, diagnostics);
  });
}

function validateOptionalSignalRefs(
  value: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  validateSignalRefs(value[field], path, diagnostics);
}

function validateOptionalMetadataProvenance(
  value: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  const provenance = requireRecord(value, field, path, diagnostics);
  if (!provenance) {
    return;
  }

  requireString(provenance, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireOneOf(
    provenance,
    "facet_kind",
    ["operation", "trace_group", "monitor", "frontend_requirement", "persistence_slot"],
    `${path}.facet_kind`,
    diagnostics
  );
  requireString(provenance, "facet_id", `${path}.facet_id`, diagnostics);
  requireOptionalString(provenance, "source_type_ref", `${path}.source_type_ref`, diagnostics);
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
