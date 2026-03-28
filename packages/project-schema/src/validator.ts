import type {
  CompositionEndpoint,
  CompositionModel,
  ObjectInstance,
  ObjectType,
  ParamValue,
  PortDef,
  ProjectModel,
  SystemSignal,
  SystemSignalEndpoint
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

export function validateProjectModel(model: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  if (!isRecord(model)) {
    return fail(diagnostics, {
      code: "root.invalid",
      severity: "error",
      path: "$",
      message: "Project model must be an object."
    });
  }

  requireString(model, "schema_version", "$.schema_version", diagnostics);
  requireRecord(model, "meta", "$.meta", diagnostics);
  requireRecord(model, "imports", "$.imports", diagnostics);
  requireRecord(model, "definitions", "$.definitions", diagnostics);
  requireRecord(model, "system", "$.system", diagnostics);
  requireRecord(model, "hardware", "$.hardware", diagnostics);
  requireRecord(model, "views", "$.views", diagnostics);
  requireRecord(model, "layouts", "$.layouts", diagnostics);

  if (isRecord(model.system) && "routes" in model.system) {
    diagnostics.push({
      code: "system.routes.forbidden",
      severity: "error",
      path: "$.system.routes",
      message: "system.routes is forbidden in canonical authoring schema; use system.signals instead."
    });
  }

  if (isRecord(model.imports)) {
    requireStringArray(model.imports, "libraries", "$.imports.libraries", diagnostics);
    requireStringArray(model.imports, "packages", "$.imports.packages", diagnostics);
  }

  if (isRecord(model.definitions)) {
    const objectTypes = requireRecord(model.definitions, "object_types", "$.definitions.object_types", diagnostics);
    if (objectTypes) {
      for (const [typeId, objectType] of Object.entries(objectTypes)) {
        validateObjectType(typeId, objectType, `$.definitions.object_types.${typeId}`, diagnostics);
      }
    }
  }

  if (isRecord(model.system)) {
    const instances = requireRecord(model.system, "instances", "$.system.instances", diagnostics);
    if (instances) {
      for (const [instanceId, instance] of Object.entries(instances)) {
        validateObjectInstance(instanceId, instance, `$.system.instances.${instanceId}`, diagnostics);
      }
    }

    const signals = requireRecord(model.system, "signals", "$.system.signals", diagnostics);
    if (signals) {
      for (const [signalId, signal] of Object.entries(signals)) {
        validateSystemSignal(signalId, signal, `$.system.signals.${signalId}`, diagnostics);
      }
    }
  }

  if (isRecord(model.hardware)) {
    requireRecord(model.hardware, "bindings", "$.hardware.bindings", diagnostics);
  }

  if (isRecord(model.views)) {
    requireRecord(model.views, "screens", "$.views.screens", diagnostics);
  }

  if (isRecord(model.layouts)) {
    requireRecord(model.layouts, "system", "$.layouts.system", diagnostics);
    requireRecord(model.layouts, "definitions", "$.layouts.definitions", diagnostics);
  }

  return {
    ok: diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics
  };
}

function validateObjectType(typeId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is ObjectType {
  if (!isRecord(value)) {
    diagnostics.push(error("object_type.invalid", path, "ObjectType must be an object."));
    return false;
  }

  requireExactString(value, "id", typeId, `${path}.id`, diagnostics);
  requireExactString(value, "kind", "object_type", `${path}.kind`, diagnostics);

  const meta = requireRecord(value, "meta", `${path}.meta`, diagnostics);
  if (meta) {
    requireString(meta, "title", `${path}.meta.title`, diagnostics);
    requireOptionalString(meta, "version", `${path}.meta.version`, diagnostics);
    requireOneOf(meta, "origin", ["project", "generated", "imported"], `${path}.meta.origin`, diagnostics);
  }

  const iface = requireRecord(value, "interface", `${path}.interface`, diagnostics);
  if (iface) {
    const ports = requireRecord(iface, "ports", `${path}.interface.ports`, diagnostics);
    if (ports) {
      for (const [portId, port] of Object.entries(ports)) {
        validatePortDef(portId, port, `${path}.interface.ports.${portId}`, diagnostics);
      }
    }

    const params = requireRecord(iface, "params", `${path}.interface.params`, diagnostics);
    if (params) {
      for (const [paramId, param] of Object.entries(params)) {
        validateParamDef(paramId, param, `${path}.interface.params.${paramId}`, diagnostics);
      }
    }

    const alarms = requireRecord(iface, "alarms", `${path}.interface.alarms`, diagnostics);
    if (alarms) {
      for (const [alarmId, alarm] of Object.entries(alarms)) {
        validateAlarmDef(alarmId, alarm, `${path}.interface.alarms.${alarmId}`, diagnostics);
      }
    }
  }

  const locals = requireRecord(value, "locals", `${path}.locals`, diagnostics);
  if (locals) {
    requireRecord(locals, "signals", `${path}.locals.signals`, diagnostics);
    requireRecord(locals, "vars", `${path}.locals.vars`, diagnostics);
  }

  const impl = requireRecord(value, "implementation", `${path}.implementation`, diagnostics);
  if (impl) {
    requirePresent(impl, "native", `${path}.implementation.native`, diagnostics);
    if ("composition" in impl && impl.composition !== null) {
      validateCompositionModel(impl.composition, `${path}.implementation.composition`, diagnostics);
    }
    requirePresent(impl, "state", `${path}.implementation.state`, diagnostics);
    requirePresent(impl, "flow", `${path}.implementation.flow`, diagnostics);
  }

  requireRecord(value, "diagnostics", `${path}.diagnostics`, diagnostics);
  return true;
}

function validateObjectInstance(instanceId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is ObjectInstance {
  if (!isRecord(value)) {
    diagnostics.push(error("object_instance.invalid", path, "ObjectInstance must be an object."));
    return false;
  }

  requireExactString(value, "id", instanceId, `${path}.id`, diagnostics);
  requireExactString(value, "kind", "object_instance", `${path}.kind`, diagnostics);
  requireString(value, "type_ref", `${path}.type_ref`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalBoolean(value, "enabled", `${path}.enabled`, diagnostics);

  if ("interface" in value) {
    diagnostics.push(error("object_instance.interface.forbidden", `${path}.interface`, "Instance must not define its own interface; use type_ref."));
  }

  if ("param_values" in value) {
    const paramValues = requireRecord(value, "param_values", `${path}.param_values`, diagnostics);
    if (paramValues) {
      for (const [paramId, paramValue] of Object.entries(paramValues)) {
        validateParamValue(paramValue, `${path}.param_values.${paramId}`, diagnostics);
      }
    }
  }

  if ("tags" in value) {
    const tags = requireRecord(value, "tags", `${path}.tags`, diagnostics);
    if (tags) {
      for (const [tagKey, tagValue] of Object.entries(tags)) {
        if (typeof tagValue !== "string") {
          diagnostics.push(error("instance.tag.invalid", `${path}.tags.${tagKey}`, "Tag values must be strings."));
        }
      }
    }
  }

  return true;
}

function validateSystemSignal(signalId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is SystemSignal {
  if (!isRecord(value)) {
    diagnostics.push(error("system_signal.invalid", path, "SystemSignal must be an object."));
    return false;
  }

  requireExactString(value, "id", signalId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateSystemSignalEndpoint(value.source, `${path}.source`, diagnostics);

  const targets = requireRecord(value, "targets", `${path}.targets`, diagnostics);
  if (targets) {
    for (const [targetId, targetValue] of Object.entries(targets)) {
      validateSystemSignalEndpoint(targetValue, `${path}.targets.${targetId}`, diagnostics);
    }
  }

  return true;
}

function validateSystemSignalEndpoint(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is SystemSignalEndpoint {
  if (!isRecord(value)) {
    diagnostics.push(error("system_signal_endpoint.invalid", path, "System signal endpoint must be an object."));
    return false;
  }

  requireString(value, "instance_id", `${path}.instance_id`, diagnostics);
  requireString(value, "port_id", `${path}.port_id`, diagnostics);
  return true;
}

function validateCompositionModel(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is CompositionModel {
  if (!isRecord(value)) {
    diagnostics.push(error("composition.invalid", path, "Composition model must be an object."));
    return false;
  }

  const instances = requireRecord(value, "instances", `${path}.instances`, diagnostics);
  if (instances) {
    for (const [instanceId, instance] of Object.entries(instances)) {
      validateObjectInstance(instanceId, instance, `${path}.instances.${instanceId}`, diagnostics);
    }
  }

  const routes = requireRecord(value, "routes", `${path}.routes`, diagnostics);
  if (routes) {
    for (const [routeId, route] of Object.entries(routes)) {
      if (!isRecord(route)) {
        diagnostics.push(error("composition_route.invalid", `${path}.routes.${routeId}`, "Composition route must be an object."));
        continue;
      }

      requireExactString(route, "id", routeId, `${path}.routes.${routeId}.id`, diagnostics);
      validateCompositionEndpoint(route.from, `${path}.routes.${routeId}.from`, diagnostics);
      validateCompositionEndpoint(route.to, `${path}.routes.${routeId}.to`, diagnostics);
    }
  }

  return true;
}

function validateCompositionEndpoint(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is CompositionEndpoint {
  if (!isRecord(value)) {
    diagnostics.push(error("composition_endpoint.invalid", path, "Composition endpoint must be an object."));
    return false;
  }

  requireOneOf(value, "kind", ["parent_port", "instance_port"], `${path}.kind`, diagnostics);
  if (value.kind === "parent_port") {
    requireString(value, "port_id", `${path}.port_id`, diagnostics);
  }
  if (value.kind === "instance_port") {
    requireString(value, "instance_id", `${path}.instance_id`, diagnostics);
    requireString(value, "port_id", `${path}.port_id`, diagnostics);
  }
  return true;
}

function validateParamValue(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is ParamValue {
  if (!isRecord(value)) {
    diagnostics.push(error("param_value.invalid", path, "Param value must be an object."));
    return false;
  }

  requireOneOf(value, "kind", ["literal", "parent_param"], `${path}.kind`, diagnostics);
  if (value.kind === "literal" && !("value" in value)) {
    diagnostics.push(error("param_value.literal.missing", path, "Literal param value must include `value`."));
  }
  if (value.kind === "parent_param") {
    requireString(value, "param_id", `${path}.param_id`, diagnostics);
  }
  return true;
}

function validatePortDef(portId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is PortDef {
  if (!isRecord(value)) {
    diagnostics.push(error("port.invalid", path, "Port definition must be an object."));
    return false;
  }

  requireExactString(value, "id", portId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "direction", ["in", "out"], `${path}.direction`, diagnostics);
  requireOneOf(value, "channel_kind", ["signal", "command", "state", "event", "alarm"], `${path}.channel_kind`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);
  requireOptionalBoolean(value, "required", `${path}.required`, diagnostics);
  return true;
}

function validateParamDef(paramId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("param.invalid", path, "Param definition must be an object."));
    return false;
  }

  requireExactString(value, "id", paramId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);
  return true;
}

function validateAlarmDef(alarmId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("alarm.invalid", path, "Alarm definition must be an object."));
    return false;
  }

  requireExactString(value, "id", alarmId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  return true;
}

function requirePresent(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (!(field in value)) {
    diagnostics.push(error("field.missing", path, `Missing required field \`${field}\`.`));
  }
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

function requireStringArray(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  const current = value[field];
  if (!Array.isArray(current) || current.some((entry) => typeof entry !== "string")) {
    diagnostics.push(error("field.string_array", path, `Field \`${field}\` must be an array of strings.`));
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
  return { ok: false, diagnostics };
}
