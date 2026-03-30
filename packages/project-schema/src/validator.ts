import type {
  CompositionEndpoint,
  CompositionModel,
  ObjectInstance,
  ObjectTemplate,
  ObjectType,
  PackageAggregateAlarm,
  PackageAggregateMonitor,
  PackageAllowedModeTransition,
  PackageAllowedPhaseTransition,
  PackageArbitrationContract,
  PackageCommandLaneDef,
  PackageCommandSummary,
  PackageChildPortRef,
  PackageCommandRequestKind,
  PackageCommandArbitrationResult,
  PackageGateSummary,
  PackageInterlockDef,
  PackageModeDef,
  PackageModeGroup,
  PackageModePhaseContract,
  PackageModeSummary,
  PackageModeSummaryEntry,
  PackageCoordinationContract,
  PackageGateState,
  PackageDefinition,
  PackageInstance,
  PackageInstanceBinding,
  PackageMember,
  PackageMemberDefaults,
  PackageCoordinationOperationProxy,
  PackageOperationProxy,
  PackagePhaseDef,
  PackagePhaseGroup,
  PackagePhaseSummary,
  PackagePhaseSummaryEntry,
  PackagePermissiveDef,
  PackagePermissiveInterlockContract,
  PackageAuthorityHolderDef,
  PackageHandoverSummary,
  PackageHandoverRequestDef,
  PackageOverrideHandoverContract,
  PackageProtectionDiagnosticSummary,
  PackageProtectionRecoveryContract,
  PackageProtectionSummary,
  PackageProtectionState,
  PackageOwnershipLane,
  PackageOwnershipLaneDef,
  PackageOwnershipSummary,
  PackageRecoveryRequestDef,
  PackagePreset,
  PackageCoordinationStateRule,
  PackageSummaryOutput,
  PackageSupervisionContract,
  PackageTraceGroup,
  PackageTripDef,
  PackageInhibitDef,
  PackageTransitionGuardRef,
  ParamValue,
  PortDef,
  ProjectModel,
  SystemSignal,
  SystemSignalEndpoint
} from "./types.js";
import { PROJECT_SCHEMA_VERSION } from "./constants.js";

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

  requireExactString(model, "schema_version", PROJECT_SCHEMA_VERSION, "$.schema_version", diagnostics);
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

    const templates = getOptionalRecord(model.definitions, "templates", "$.definitions.templates", diagnostics);
    if (templates) {
      for (const [templateId, template] of Object.entries(templates)) {
        validateObjectTemplate(templateId, template, `$.definitions.templates.${templateId}`, diagnostics);
      }
    }

    const packages = getOptionalRecord(model.definitions, "packages", "$.definitions.packages", diagnostics);
    if (packages) {
      for (const [packageId, packageDefinition] of Object.entries(packages)) {
        validatePackageDefinition(packageId, packageDefinition, `$.definitions.packages.${packageId}`, diagnostics);
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

    const packages = getOptionalRecord(model.system, "packages", "$.system.packages", diagnostics);
    if (packages) {
      for (const [packageInstanceId, packageInstance] of Object.entries(packages)) {
        validatePackageInstance(packageInstanceId, packageInstance, `$.system.packages.${packageInstanceId}`, diagnostics);
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

  validateTemplateSemantics(model, diagnostics);
  validatePackageSemantics(model, diagnostics);

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
    requireOneOf(meta, "origin", ["project", "generated", "imported", "library"], `${path}.meta.origin`, diagnostics);
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

  if ("facets" in value && value.facets !== undefined) {
    validateObjectTypeFacets(value.facets, `${path}.facets`, diagnostics);
  }

  const impl = requireRecord(value, "implementation", `${path}.implementation`, diagnostics);
  if (impl) {
    requirePresent(impl, "native", `${path}.implementation.native`, diagnostics);
    if ("native" in impl && impl.native !== null) {
      validateNativeImplementation(impl.native, `${path}.implementation.native`, diagnostics);
    }
    if ("composition" in impl && impl.composition !== null) {
      validateCompositionModel(impl.composition, `${path}.implementation.composition`, diagnostics);
    }
    requirePresent(impl, "state", `${path}.implementation.state`, diagnostics);
    requirePresent(impl, "flow", `${path}.implementation.flow`, diagnostics);
  }

  requireRecord(value, "diagnostics", `${path}.diagnostics`, diagnostics);
  return true;
}

function validateNativeImplementation(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("native_implementation.invalid", path, "Native implementation must be an object or null."));
    return false;
  }

  requireString(value, "native_kind", `${path}.native_kind`, diagnostics);
  requireOptionalStringArray(value, "target_kinds", `${path}.target_kinds`, diagnostics);

  if ("config_template" in value && typeof value.config_template === "undefined") {
    diagnostics.push(error("field.present", `${path}.config_template`, "Field `config_template` must not be undefined when present."));
  }

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
  requireOptionalString(value, "template_ref", `${path}.template_ref`, diagnostics);
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

function validateObjectTemplate(templateId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is ObjectTemplate {
  if (!isRecord(value)) {
    diagnostics.push(error("object_template.invalid", path, "ObjectTemplate must be an object."));
    return false;
  }

  requireExactString(value, "id", templateId, `${path}.id`, diagnostics);
  requireExactString(value, "kind", "object_template", `${path}.kind`, diagnostics);
  requireString(value, "base_type_ref", `${path}.base_type_ref`, diagnostics);
  requireOneOf(value, "origin", ["library_template", "project_saved"], `${path}.origin`, diagnostics);

  const meta = requireRecord(value, "meta", `${path}.meta`, diagnostics);
  if (meta) {
    requireString(meta, "title", `${path}.meta.title`, diagnostics);
    requireOptionalString(meta, "version", `${path}.meta.version`, diagnostics);
    requireOptionalString(meta, "description", `${path}.meta.description`, diagnostics);
  }

  const defaults = requireRecord(value, "defaults", `${path}.defaults`, diagnostics);
  if (!defaults) {
    return false;
  }

  if ("param_values" in defaults) {
    const paramValues = requireRecord(defaults, "param_values", `${path}.defaults.param_values`, diagnostics);
    if (paramValues) {
      for (const [paramId, paramValue] of Object.entries(paramValues)) {
        validateParamValue(paramValue, `${path}.defaults.param_values.${paramId}`, diagnostics);
      }
    }
  }

  if ("tags" in defaults) {
    const tags = requireRecord(defaults, "tags", `${path}.defaults.tags`, diagnostics);
    if (tags) {
      for (const [tagKey, tagValue] of Object.entries(tags)) {
        if (typeof tagValue !== "string") {
          diagnostics.push(error("template.tag.invalid", `${path}.defaults.tags.${tagKey}`, "Template tag values must be strings."));
        }
      }
    }
  }

  getOptionalRecord(defaults, "facet_defaults", `${path}.defaults.facet_defaults`, diagnostics);
  return true;
}

function validatePackageDefinition(
  packageId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageDefinition {
  if (!isRecord(value)) {
    diagnostics.push(error("package_definition.invalid", path, "PackageDefinition must be an object."));
    return false;
  }

  requireExactString(value, "id", packageId, `${path}.id`, diagnostics);
  requireExactString(value, "kind", "package_definition", `${path}.kind`, diagnostics);

  const meta = requireRecord(value, "meta", `${path}.meta`, diagnostics);
  if (meta) {
    requireString(meta, "title", `${path}.meta.title`, diagnostics);
    requireOptionalString(meta, "version", `${path}.meta.version`, diagnostics);
    requireOneOf(meta, "origin", ["project", "generated", "imported", "library"], `${path}.meta.origin`, diagnostics);
    requireOptionalString(meta, "description", `${path}.meta.description`, diagnostics);
    requireOptionalString(meta, "domain", `${path}.meta.domain`, diagnostics);
    requireOptionalString(meta, "package_kind", `${path}.meta.package_kind`, diagnostics);
    if ("safety_scope" in meta) {
      requireOneOf(meta, "safety_scope", ["non_safety_skeleton", "includes_safety_logic"], `${path}.meta.safety_scope`, diagnostics);
    }
  }

  const members = requireRecord(value, "members", `${path}.members`, diagnostics);
  if (members) {
    for (const [memberId, member] of Object.entries(members)) {
      validatePackageMember(memberId, member, `${path}.members.${memberId}`, diagnostics);
    }
  }

  const signals = requireRecord(value, "signals", `${path}.signals`, diagnostics);
  if (signals) {
    for (const [signalId, signal] of Object.entries(signals)) {
      validateSystemSignal(signalId, signal, `${path}.signals.${signalId}`, diagnostics);
    }
  }

  const bindings = getOptionalRecord(value, "bindings", `${path}.bindings`, diagnostics);
  if (bindings) {
    for (const [bindingId, binding] of Object.entries(bindings)) {
      validatePackageInstanceBinding(bindingId, binding, `${path}.bindings.${bindingId}`, diagnostics);
    }
  }

  const presets = getOptionalRecord(value, "presets", `${path}.presets`, diagnostics);
  if (presets) {
    for (const [presetId, preset] of Object.entries(presets)) {
      validatePackagePreset(presetId, preset, `${path}.presets.${presetId}`, diagnostics);
    }
  }

  if ("supervision" in value && value.supervision !== undefined) {
    validatePackageSupervisionContract(value.supervision, `${path}.supervision`, diagnostics);
  }

  if ("coordination" in value && value.coordination !== undefined) {
    validatePackageCoordinationContract(value.coordination, `${path}.coordination`, diagnostics);
  }

  if ("mode_phase" in value && value.mode_phase !== undefined) {
    validatePackageModePhaseContract(value.mode_phase, `${path}.mode_phase`, diagnostics);
  }

  if ("permissive_interlock" in value && value.permissive_interlock !== undefined) {
    validatePackagePermissiveInterlockContract(value.permissive_interlock, `${path}.permissive_interlock`, diagnostics);
  }

  if ("protection_recovery" in value && value.protection_recovery !== undefined) {
    validatePackageProtectionRecoveryContract(value.protection_recovery, `${path}.protection_recovery`, diagnostics);
  }

  if ("arbitration" in value && value.arbitration !== undefined) {
    validatePackageArbitrationContract(value.arbitration, `${path}.arbitration`, diagnostics);
  }

  if ("override_handover" in value && value.override_handover !== undefined) {
    validatePackageOverrideHandoverContract(value.override_handover, `${path}.override_handover`, diagnostics);
  }

  requireOptionalStringArray(value, "boundary_notes", `${path}.boundary_notes`, diagnostics);
  return true;
}

function validatePackageMember(memberId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is PackageMember {
  if (!isRecord(value)) {
    diagnostics.push(error("package_member.invalid", path, "PackageMember must be an object."));
    return false;
  }

  requireExactString(value, "id", memberId, `${path}.id`, diagnostics);
  requireExactString(value, "kind", "package_member", `${path}.kind`, diagnostics);
  requireString(value, "type_ref", `${path}.type_ref`, diagnostics);
  requireOptionalString(value, "template_ref", `${path}.template_ref`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalBoolean(value, "enabled", `${path}.enabled`, diagnostics);

  if ("param_values" in value) {
    const paramValues = requireRecord(value, "param_values", `${path}.param_values`, diagnostics);
    if (paramValues) {
      for (const [paramId, paramValue] of Object.entries(paramValues)) {
        validateParamValue(paramValue, `${path}.param_values.${paramId}`, diagnostics);
      }
    }
  }

  validateStringRecord(value, "tags", `${path}.tags`, "package_member.tag.invalid", diagnostics);

  const defaults = getOptionalRecord(value, "defaults", `${path}.defaults`, diagnostics);
  if (defaults) {
    validatePackageMemberDefaults(defaults, `${path}.defaults`, diagnostics);
  }

  return true;
}

function validatePackageMemberDefaults(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  if ("param_values" in value) {
    const paramValues = requireRecord(value, "param_values", `${path}.param_values`, diagnostics);
    if (paramValues) {
      for (const [paramId, paramValue] of Object.entries(paramValues)) {
        validateParamValue(paramValue, `${path}.param_values.${paramId}`, diagnostics);
      }
    }
  }

  validateStringRecord(value, "tags", `${path}.tags`, "package_member_default.tag.invalid", diagnostics);
  return true;
}

function validatePackageInstanceBinding(
  bindingId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageInstanceBinding {
  if (!isRecord(value)) {
    diagnostics.push(error("package_binding.invalid", path, "Package binding must be an object."));
    return false;
  }

  requireExactString(value, "id", bindingId, `${path}.id`, diagnostics);
  requireOneOf(value, "kind", ["member_port", "member_param"], `${path}.kind`, diagnostics);
  requireString(value, "member_id", `${path}.member_id`, diagnostics);
  requireOptionalString(value, "member_port_id", `${path}.member_port_id`, diagnostics);
  requireOptionalString(value, "member_param_id", `${path}.member_param_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "binding_role", `${path}.binding_role`, diagnostics);
  requireOptionalBoolean(value, "required", `${path}.required`, diagnostics);
  requireOptionalString(value, "description", `${path}.description`, diagnostics);

  if (value.kind === "member_port" && typeof value.member_port_id !== "string") {
    diagnostics.push(error("package_binding.member_port_id.missing", `${path}.member_port_id`, "Package member_port binding must include member_port_id."));
  }

  if (value.kind === "member_param" && typeof value.member_param_id !== "string") {
    diagnostics.push(error("package_binding.member_param_id.missing", `${path}.member_param_id`, "Package member_param binding must include member_param_id."));
  }

  return true;
}

function validatePackagePreset(
  presetId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackagePreset {
  if (!isRecord(value)) {
    diagnostics.push(error("package_preset.invalid", path, "Package preset must be an object."));
    return false;
  }

  requireExactString(value, "id", presetId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "description", `${path}.description`, diagnostics);

  const memberDefaults = getOptionalRecord(value, "member_defaults", `${path}.member_defaults`, diagnostics);
  if (memberDefaults) {
    for (const [memberId, defaults] of Object.entries(memberDefaults)) {
      if (!isRecord(defaults)) {
        diagnostics.push(error("package_preset.member_default.invalid", `${path}.member_defaults.${memberId}`, "Package preset member default must be an object."));
        continue;
      }

      validatePackageMemberDefaults(defaults, `${path}.member_defaults.${memberId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageSupervisionContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageSupervisionContract {
  if (!isRecord(value)) {
    diagnostics.push(error("package_supervision.invalid", path, "Package supervision contract must be an object."));
    return false;
  }

  const summaryOutputs = getOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validatePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = getOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validatePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const aggregateAlarms = getOptionalRecord(value, "aggregate_alarms", `${path}.aggregate_alarms`, diagnostics);
  if (aggregateAlarms) {
    for (const [alarmId, alarm] of Object.entries(aggregateAlarms)) {
      validatePackageAggregateAlarm(alarmId, alarm, `${path}.aggregate_alarms.${alarmId}`, diagnostics);
    }
  }

  const traceGroups = getOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validatePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  const operationProxies = getOptionalRecord(value, "operation_proxies", `${path}.operation_proxies`, diagnostics);
  if (operationProxies) {
    for (const [proxyId, proxy] of Object.entries(operationProxies)) {
      validatePackageOperationProxy(proxyId, proxy, `${path}.operation_proxies.${proxyId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageCoordinationContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageCoordinationContract {
  if (!isRecord(value)) {
    diagnostics.push(error("package_coordination.invalid", path, "Package coordination contract must be an object."));
    return false;
  }

  validatePackageCoordinationNoSafetyFields(value, path, diagnostics);

  const packageState = requireRecord(value, "package_state", `${path}.package_state`, diagnostics);
  if (packageState) {
    validatePackageCoordinationStateSummary(packageState, `${path}.package_state`, diagnostics);
  }

  const summaryOutputs = getOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validatePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = getOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validatePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = getOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validatePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  const operationProxies = getOptionalRecord(value, "operation_proxies", `${path}.operation_proxies`, diagnostics);
  if (operationProxies) {
    for (const [proxyId, proxy] of Object.entries(operationProxies)) {
      validatePackageCoordinationOperationProxy(proxyId, proxy, `${path}.operation_proxies.${proxyId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageModePhaseContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageModePhaseContract {
  if (!isRecord(value)) {
    diagnostics.push(error("package_mode_phase.invalid", path, "Package mode/phase contract must be an object."));
    return false;
  }

  validatePackageModePhaseNoBoilerFields(value, path, diagnostics);

  const modes = requireRecord(value, "modes", `${path}.modes`, diagnostics);
  if (modes) {
    for (const [modeId, mode] of Object.entries(modes)) {
      validatePackageModeDef(modeId, mode, `${path}.modes.${modeId}`, diagnostics);
    }
  }

  const phases = requireRecord(value, "phases", `${path}.phases`, diagnostics);
  if (phases) {
    for (const [phaseId, phase] of Object.entries(phases)) {
      validatePackagePhaseDef(phaseId, phase, `${path}.phases.${phaseId}`, diagnostics);
    }
  }

  const modeSummary = requireRecord(value, "mode_summary", `${path}.mode_summary`, diagnostics);
  if (modeSummary) {
    validatePackageModeSummary(modeSummary, `${path}.mode_summary`, diagnostics);
  }

  const phaseSummary = requireRecord(value, "phase_summary", `${path}.phase_summary`, diagnostics);
  if (phaseSummary) {
    validatePackagePhaseSummary(phaseSummary, `${path}.phase_summary`, diagnostics);
  }

  requireString(value, "active_mode_ref", `${path}.active_mode_ref`, diagnostics);
  requireString(value, "active_phase_ref", `${path}.active_phase_ref`, diagnostics);

  const allowedModeTransitions = getOptionalRecord(value, "allowed_mode_transitions", `${path}.allowed_mode_transitions`, diagnostics);
  if (allowedModeTransitions) {
    for (const [transitionId, transition] of Object.entries(allowedModeTransitions)) {
      validatePackageAllowedModeTransition(
        transitionId,
        transition,
        `${path}.allowed_mode_transitions.${transitionId}`,
        diagnostics
      );
    }
  }

  const allowedPhaseTransitions = getOptionalRecord(value, "allowed_phase_transitions", `${path}.allowed_phase_transitions`, diagnostics);
  if (allowedPhaseTransitions) {
    for (const [transitionId, transition] of Object.entries(allowedPhaseTransitions)) {
      validatePackageAllowedPhaseTransition(
        transitionId,
        transition,
        `${path}.allowed_phase_transitions.${transitionId}`,
        diagnostics
      );
    }
  }

  const modeGroups = getOptionalRecord(value, "package_mode_groups", `${path}.package_mode_groups`, diagnostics);
  if (modeGroups) {
    for (const [groupId, group] of Object.entries(modeGroups)) {
      validatePackageModeGroup(groupId, group, `${path}.package_mode_groups.${groupId}`, diagnostics);
    }
  }

  const phaseGroups = getOptionalRecord(value, "package_phase_groups", `${path}.package_phase_groups`, diagnostics);
  if (phaseGroups) {
    for (const [groupId, group] of Object.entries(phaseGroups)) {
      validatePackagePhaseGroup(groupId, group, `${path}.package_phase_groups.${groupId}`, diagnostics);
    }
  }

  const traceGroups = getOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validatePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validatePackagePermissiveInterlockContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackagePermissiveInterlockContract {
  if (!isRecord(value)) {
    diagnostics.push(error("package_permissive_interlock.invalid", path, "Package permissive/interlock contract must be an object."));
    return false;
  }

  validatePackagePermissiveInterlockNoSafetyFields(value, path, diagnostics);

  const permissives = requireRecord(value, "permissives", `${path}.permissives`, diagnostics);
  if (permissives) {
    for (const [permissiveId, permissive] of Object.entries(permissives)) {
      validatePackagePermissiveDef(permissiveId, permissive, `${path}.permissives.${permissiveId}`, diagnostics);
    }
  }

  const interlocks = requireRecord(value, "interlocks", `${path}.interlocks`, diagnostics);
  if (interlocks) {
    for (const [interlockId, interlock] of Object.entries(interlocks)) {
      validatePackageInterlockDef(interlockId, interlock, `${path}.interlocks.${interlockId}`, diagnostics);
    }
  }

  const gateSummary = requireRecord(value, "gate_summary", `${path}.gate_summary`, diagnostics);
  if (gateSummary) {
    validatePackageGateSummary(gateSummary, `${path}.gate_summary`, diagnostics);
  }

  const summaryOutputs = getOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validatePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = getOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validatePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = getOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validatePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageProtectionRecoveryContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageProtectionRecoveryContract {
  if (!isRecord(value)) {
    diagnostics.push(error("package_protection_recovery.invalid", path, "Package protection/recovery contract must be an object."));
    return false;
  }

  validatePackageProtectionRecoveryNoSafetyFields(value, path, diagnostics);

  const trips = requireRecord(value, "trips", `${path}.trips`, diagnostics);
  if (trips) {
    for (const [tripId, trip] of Object.entries(trips)) {
      validatePackageTripDef(tripId, trip, `${path}.trips.${tripId}`, diagnostics);
    }
  }

  const inhibits = requireRecord(value, "inhibits", `${path}.inhibits`, diagnostics);
  if (inhibits) {
    for (const [inhibitId, inhibit] of Object.entries(inhibits)) {
      validatePackageInhibitDef(inhibitId, inhibit, `${path}.inhibits.${inhibitId}`, diagnostics);
    }
  }

  const protectionSummary = requireRecord(value, "protection_summary", `${path}.protection_summary`, diagnostics);
  if (protectionSummary) {
    validatePackageProtectionSummary(protectionSummary, `${path}.protection_summary`, diagnostics);
  }

  const recoveryRequests = getOptionalRecord(value, "recovery_requests", `${path}.recovery_requests`, diagnostics);
  if (recoveryRequests) {
    for (const [requestId, request] of Object.entries(recoveryRequests)) {
      validatePackageRecoveryRequestDef(requestId, request, `${path}.recovery_requests.${requestId}`, diagnostics);
    }
  }

  const summaryOutputs = getOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validatePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = getOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validatePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = getOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validatePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageArbitrationContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageArbitrationContract {
  if (!isRecord(value)) {
    diagnostics.push(error("package_arbitration.invalid", path, "Package arbitration contract must be an object."));
    return false;
  }

  const ownershipLanes = requireRecord(value, "ownership_lanes", `${path}.ownership_lanes`, diagnostics);
  if (ownershipLanes) {
    for (const [laneId, lane] of Object.entries(ownershipLanes)) {
      validatePackageOwnershipLaneDef(laneId, lane, `${path}.ownership_lanes.${laneId}`, diagnostics);
    }
  }

  const ownershipSummary = requireRecord(value, "ownership_summary", `${path}.ownership_summary`, diagnostics);
  if (ownershipSummary) {
    validatePackageOwnershipSummary(ownershipSummary, `${path}.ownership_summary`, diagnostics);
  }

  const commandLanes = requireRecord(value, "command_lanes", `${path}.command_lanes`, diagnostics);
  if (commandLanes) {
    for (const [laneId, lane] of Object.entries(commandLanes)) {
      validatePackageCommandLaneDef(laneId, lane, `${path}.command_lanes.${laneId}`, diagnostics);
    }
  }

  const commandSummary = requireRecord(value, "command_summary", `${path}.command_summary`, diagnostics);
  if (commandSummary) {
    validatePackageCommandSummary(commandSummary, `${path}.command_summary`, diagnostics);
  }

  const summaryOutputs = getOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validatePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = getOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validatePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = getOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validatePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageOverrideHandoverContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageOverrideHandoverContract {
  if (!isRecord(value)) {
    diagnostics.push(error("package_override_handover.invalid", path, "Package override/handover contract must be an object."));
    return false;
  }

  validatePackageOverrideHandoverNoSafetyFields(value, path, diagnostics);

  const authorityHolders = requireRecord(value, "authority_holders", `${path}.authority_holders`, diagnostics);
  if (authorityHolders) {
    for (const [holderId, holder] of Object.entries(authorityHolders)) {
      validatePackageAuthorityHolderDef(holderId, holder, `${path}.authority_holders.${holderId}`, diagnostics);
    }
  }

  const handoverSummary = requireRecord(value, "handover_summary", `${path}.handover_summary`, diagnostics);
  if (handoverSummary) {
    validatePackageHandoverSummary(handoverSummary, `${path}.handover_summary`, diagnostics);
  }

  const handoverRequests = requireRecord(value, "handover_requests", `${path}.handover_requests`, diagnostics);
  if (handoverRequests) {
    for (const [requestId, request] of Object.entries(handoverRequests)) {
      validatePackageHandoverRequestDef(requestId, request, `${path}.handover_requests.${requestId}`, diagnostics);
    }
  }

  const summaryOutputs = getOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validatePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = getOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validatePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = getOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validatePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageAuthorityHolderDef(
  holderId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageAuthorityHolderDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_override_holder.invalid", path, "Package authority holder definition must be an object."));
    return false;
  }

  requireExactString(value, "id", holderId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "lane", ["auto", "manual", "service", "remote"], `${path}.lane`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageHandoverSummary(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageHandoverSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("package_override_handover.summary.invalid", path, "Package handover summary must be an object."));
    return false;
  }

  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "current_holder_ref", `${path}.current_holder_ref`, diagnostics);
  requireOneOf(value, "current_lane", ["auto", "manual", "service", "remote"], `${path}.current_lane`, diagnostics);
  requireOptionalString(value, "requested_holder_ref", `${path}.requested_holder_ref`, diagnostics);
  requireOptionalStringArray(value, "accepted_request_refs", `${path}.accepted_request_refs`, diagnostics);
  requireOptionalStringArray(value, "blocked_request_refs", `${path}.blocked_request_refs`, diagnostics);
  requireOptionalStringArray(value, "denied_request_refs", `${path}.denied_request_refs`, diagnostics);
  requireOptionalString(value, "last_handover_reason", `${path}.last_handover_reason`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageHandoverRequestDef(
  requestId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageHandoverRequestDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_override_handover.request.invalid", path, "Package handover request definition must be an object."));
    return false;
  }

  requireExactString(value, "id", requestId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "request_kind", ["request_takeover", "request_release", "request_return_to_auto"], `${path}.request_kind`, diagnostics);
  requireString(value, "requested_holder_ref", `${path}.requested_holder_ref`, diagnostics);
  requireOneOf(value, "state", ["accepted", "blocked", "denied", "unsupported"], `${path}.state`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "request_preview", `${path}.request_preview`, diagnostics);
  requireOptionalOneOf(value, "blocked_reason", ["blocked_by_policy", "held_by_other_owner", "not_available"], `${path}.blocked_reason`, diagnostics);
  requireOptionalOneOf(value, "denied_reason", ["blocked_by_policy", "held_by_other_owner", "not_available"], `${path}.denied_reason`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageModeDef(
  modeId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageModeDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_mode.invalid", path, "Package mode definition must be an object."));
    return false;
  }

  requireExactString(value, "id", modeId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalStringArray(value, "phase_refs", `${path}.phase_refs`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackagePermissiveDef(
  permissiveId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackagePermissiveDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_permissive.invalid", path, "Package permissive definition must be an object."));
    return false;
  }

  requireExactString(value, "id", permissiveId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "blocked_reason_code", `${path}.blocked_reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageInterlockDef(
  interlockId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageInterlockDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_interlock.invalid", path, "Package interlock definition must be an object."));
    return false;
  }

  requireExactString(value, "id", interlockId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOneOf(value, "active_state", ["held", "faulted"], `${path}.active_state`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageTripDef(
  tripId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageTripDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_trip.invalid", path, "Package trip definition must be an object."));
    return false;
  }

  requireExactString(value, "id", tripId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalBoolean(value, "latching", `${path}.latching`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageInhibitDef(
  inhibitId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageInhibitDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_inhibit.invalid", path, "Package inhibit definition must be an object."));
    return false;
  }

  requireExactString(value, "id", inhibitId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageOwnershipLaneDef(
  laneId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageOwnershipLaneDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_ownership_lane.invalid", path, "Package ownership lane must be an object."));
    return false;
  }

  requireExactString(value, "id", laneId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "lane", ["auto", "manual", "service", "remote"], `${path}.lane`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageOwnershipSummary(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageOwnershipSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("package_ownership_summary.invalid", path, "Package ownership summary must be an object."));
    return false;
  }

  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "active_lane_refs", `${path}.active_lane_refs`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validatePackageCommandLaneDef(
  laneId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageCommandLaneDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_command_lane.invalid", path, "Package command lane must be an object."));
    return false;
  }

  requireExactString(value, "id", laneId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(
    value,
    "request_kind",
    ["request_start", "request_stop", "request_reset", "request_enable", "request_disable"],
    `${path}.request_kind`,
    diagnostics
  );
  requireString(value, "ownership_lane_ref", `${path}.ownership_lane_ref`, diagnostics);
  requireString(value, "target_member_id", `${path}.target_member_id`, diagnostics);
  requireOneOf(value, "arbitration_result", ["accepted", "blocked", "denied", "superseded", "unsupported"], `${path}.arbitration_result`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "request_preview", `${path}.request_preview`, diagnostics);
  requireOptionalString(value, "blocked_reason", `${path}.blocked_reason`, diagnostics);
  requireOptionalString(value, "denied_reason", `${path}.denied_reason`, diagnostics);
  requireOptionalString(value, "superseded_by_lane_ref", `${path}.superseded_by_lane_ref`, diagnostics);
  return true;
}

function validatePackageCommandSummary(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageCommandSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("package_command_summary.invalid", path, "Package command summary must be an object."));
    return false;
  }

  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "active_owner_lane_refs", `${path}.active_owner_lane_refs`, diagnostics);
  requireOptionalStringArray(value, "accepted_lane_refs", `${path}.accepted_lane_refs`, diagnostics);
  requireOptionalStringArray(value, "blocked_lane_refs", `${path}.blocked_lane_refs`, diagnostics);
  requireOptionalStringArray(value, "denied_lane_refs", `${path}.denied_lane_refs`, diagnostics);
  requireOptionalStringArray(value, "superseded_lane_refs", `${path}.superseded_lane_refs`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validatePackageProtectionSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalOneOf(value, "default_state", ["ready", "blocked", "tripped", "recovering"], `${path}.default_state`, diagnostics);
  requireOptionalStringArray(value, "trip_refs", `${path}.trip_refs`, diagnostics);
  requireOptionalStringArray(value, "inhibit_refs", `${path}.inhibit_refs`, diagnostics);
  requireOptionalStringArray(value, "recovery_request_refs", `${path}.recovery_request_refs`, diagnostics);

  const diagnosticSummaries = getOptionalRecord(value, "diagnostic_summaries", `${path}.diagnostic_summaries`, diagnostics);
  if (diagnosticSummaries) {
    for (const [summaryId, summary] of Object.entries(diagnosticSummaries)) {
      validatePackageProtectionDiagnosticSummary(summaryId, summary, `${path}.diagnostic_summaries.${summaryId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageProtectionDiagnosticSummary(
  summaryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageProtectionDiagnosticSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("package_protection_summary.invalid", path, "Package protection diagnostic summary must be an object."));
    return false;
  }

  requireExactString(value, "id", summaryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "trip_refs", `${path}.trip_refs`, diagnostics);
  requireOptionalStringArray(value, "inhibit_refs", `${path}.inhibit_refs`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validatePackageRecoveryRequestDef(
  requestId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageRecoveryRequestDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_recovery_request.invalid", path, "Package recovery request must be an object."));
    return false;
  }

  requireExactString(value, "id", requestId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireString(value, "target_member_id", `${path}.target_member_id`, diagnostics);
  requireString(value, "target_operation_id", `${path}.target_operation_id`, diagnostics);
  requireOptionalOneOf(value, "confirmation_policy", ["none", "required"], `${path}.confirmation_policy`, diagnostics);
  requireOptionalStringArray(value, "blocked_by_trip_refs", `${path}.blocked_by_trip_refs`, diagnostics);
  requireOptionalStringArray(value, "blocked_by_inhibit_refs", `${path}.blocked_by_inhibit_refs`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validatePackagePhaseDef(
  phaseId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackagePhaseDef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_phase.invalid", path, "Package phase definition must be an object."));
    return false;
  }

  requireExactString(value, "id", phaseId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageAllowedModeTransition(
  transitionId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageAllowedModeTransition {
  if (!isRecord(value)) {
    diagnostics.push(error("package_mode_transition.invalid", path, "Package mode transition must be an object."));
    return false;
  }

  requireExactString(value, "id", transitionId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireExactString(value, "intent", "request_mode_change", `${path}.intent`, diagnostics);
  requireOptionalString(value, "from_mode_ref", `${path}.from_mode_ref`, diagnostics);
  requireString(value, "to_mode_ref", `${path}.to_mode_ref`, diagnostics);
  requireOptionalStringArray(value, "guard_notes", `${path}.guard_notes`, diagnostics);
  return true;
}

function validatePackageAllowedPhaseTransition(
  transitionId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageAllowedPhaseTransition {
  if (!isRecord(value)) {
    diagnostics.push(error("package_phase_transition.invalid", path, "Package phase transition must be an object."));
    return false;
  }

  requireExactString(value, "id", transitionId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "intent", ["request_phase_start", "request_phase_abort"], `${path}.intent`, diagnostics);
  requireString(value, "phase_ref", `${path}.phase_ref`, diagnostics);
  requireOptionalStringArray(value, "allowed_mode_refs", `${path}.allowed_mode_refs`, diagnostics);
  requireOptionalStringArray(value, "guard_notes", `${path}.guard_notes`, diagnostics);
  return true;
}

function validatePackageModeSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "default_mode_ref", `${path}.default_mode_ref`, diagnostics);

  const entries = requireRecord(value, "entries", `${path}.entries`, diagnostics);
  if (entries) {
    for (const [entryId, entry] of Object.entries(entries)) {
      validatePackageModeSummaryEntry(entryId, entry, `${path}.entries.${entryId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageGateSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalOneOf(value, "default_state", ["ready", "blocked", "held", "faulted"], `${path}.default_state`, diagnostics);
  requireOptionalStringArray(value, "permissive_refs", `${path}.permissive_refs`, diagnostics);
  requireOptionalStringArray(value, "interlock_refs", `${path}.interlock_refs`, diagnostics);

  const transitionGuards = getOptionalRecord(value, "transition_guards", `${path}.transition_guards`, diagnostics);
  if (transitionGuards) {
    for (const [guardId, guard] of Object.entries(transitionGuards)) {
      validatePackageTransitionGuardRef(guardId, guard, `${path}.transition_guards.${guardId}`, diagnostics);
    }
  }

  return true;
}

function validatePackageModeSummaryEntry(
  entryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageModeSummaryEntry {
  if (!isRecord(value)) {
    diagnostics.push(error("package_mode_summary_entry.invalid", path, "Package mode summary entry must be an object."));
    return false;
  }

  requireExactString(value, "id", entryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "mode_ref", `${path}.mode_ref`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackagePhaseSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "default_phase_ref", `${path}.default_phase_ref`, diagnostics);

  const entries = requireRecord(value, "entries", `${path}.entries`, diagnostics);
  if (entries) {
    for (const [entryId, entry] of Object.entries(entries)) {
      validatePackagePhaseSummaryEntry(entryId, entry, `${path}.entries.${entryId}`, diagnostics);
    }
  }

  return true;
}

function validatePackagePhaseSummaryEntry(
  entryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackagePhaseSummaryEntry {
  if (!isRecord(value)) {
    diagnostics.push(error("package_phase_summary_entry.invalid", path, "Package phase summary entry must be an object."));
    return false;
  }

  requireExactString(value, "id", entryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "phase_ref", `${path}.phase_ref`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageModeGroup(
  groupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageModeGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("package_mode_group.invalid", path, "Package mode group must be an object."));
    return false;
  }

  requireExactString(value, "id", groupId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireStringArray(value, "mode_refs", `${path}.mode_refs`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackagePhaseGroup(
  groupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackagePhaseGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("package_phase_group.invalid", path, "Package phase group must be an object."));
    return false;
  }

  requireExactString(value, "id", groupId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireStringArray(value, "phase_refs", `${path}.phase_refs`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageCoordinationStateSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalOneOf(
    value,
    "default_state",
    ["standby", "ready", "circulation_active", "control_active", "fault_latched"],
    `${path}.default_state`,
    diagnostics
  );

  const states = requireRecord(value, "states", `${path}.states`, diagnostics);
  if (states) {
    for (const [stateId, stateRule] of Object.entries(states)) {
      validatePackageCoordinationStateRule(stateId, stateRule, `${path}.states.${stateId}`, diagnostics);
    }
  }
}

function validatePackageTransitionGuardRef(
  guardId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageTransitionGuardRef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_transition_guard.invalid", path, "Package transition guard reference must be an object."));
    return false;
  }

  requireExactString(value, "id", guardId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "permissive_refs", `${path}.permissive_refs`, diagnostics);
  requireOptionalStringArray(value, "interlock_refs", `${path}.interlock_refs`, diagnostics);
  requireOptionalString(value, "mode_transition_ref", `${path}.mode_transition_ref`, diagnostics);
  requireOptionalString(value, "phase_transition_ref", `${path}.phase_transition_ref`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);

  if (typeof value.mode_transition_ref === "string" && typeof value.phase_transition_ref === "string") {
    diagnostics.push(error(
      "package_transition_guard.target.exclusive",
      path,
      "Package transition guard must reference either a mode transition or a phase transition, but not both."
    ));
  }

  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageCoordinationStateRule(
  stateId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageCoordinationStateRule {
  if (!isRecord(value)) {
    diagnostics.push(error("package_coordination_state.invalid", path, "Package coordination state rule must be an object."));
    return false;
  }

  requireExactString(value, "id", stateId, `${path}.id`, diagnostics);
  requireOneOf(
    value,
    "state",
    ["standby", "ready", "circulation_active", "control_active", "fault_latched"],
    `${path}.state`,
    diagnostics
  );
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageSummaryOutput(
  summaryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageSummaryOutput {
  if (!isRecord(value)) {
    diagnostics.push(error("package_summary_output.invalid", path, "Package summary output must be an object."));
    return false;
  }

  requireExactString(value, "id", summaryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);
  validatePackageChildPortRef(value.source, `${path}.source`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageAggregateMonitor(
  monitorId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageAggregateMonitor {
  if (!isRecord(value)) {
    diagnostics.push(error("package_aggregate_monitor.invalid", path, "Package aggregate monitor must be an object."));
    return false;
  }

  requireExactString(value, "id", monitorId, `${path}.id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageAggregateAlarm(
  alarmId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageAggregateAlarm {
  if (!isRecord(value)) {
    diagnostics.push(error("package_aggregate_alarm.invalid", path, "Package aggregate alarm must be an object."));
    return false;
  }

  requireExactString(value, "id", alarmId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  validatePackageChildPortRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageTraceGroup(
  traceGroupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageTraceGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("package_trace_group.invalid", path, "Package trace group must be an object."));
    return false;
  }

  requireExactString(value, "id", traceGroupId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validatePackageChildPortRefArray(value, "signals", `${path}.signals`, diagnostics);
  requireOptionalNumber(value, "sample_hint_ms", `${path}.sample_hint_ms`, diagnostics);
  requireOptionalString(value, "chart_hint", `${path}.chart_hint`, diagnostics);
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageOperationProxy(
  proxyId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageOperationProxy {
  if (!isRecord(value)) {
    diagnostics.push(error("package_operation_proxy.invalid", path, "Package operation proxy must be an object."));
    return false;
  }

  requireExactString(value, "id", proxyId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "target_member_id", `${path}.target_member_id`, diagnostics);
  requireString(value, "target_operation_id", `${path}.target_operation_id`, diagnostics);
  requireOptionalString(value, "child_operation_kind", `${path}.child_operation_kind`, diagnostics);
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  if ("execution_hook" in value) {
    diagnostics.push(error(
      "package_operation_proxy.execution_hook.forbidden",
      `${path}.execution_hook`,
      "Package operation proxy must not declare direct execution hooks."
    ));
  }
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageCoordinationOperationProxy(
  proxyId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageCoordinationOperationProxy {
  if (!isRecord(value)) {
    diagnostics.push(error("package_coordination_operation_proxy.invalid", path, "Package coordination operation proxy must be an object."));
    return false;
  }

  requireExactString(value, "id", proxyId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireString(value, "target_member_id", `${path}.target_member_id`, diagnostics);
  requireString(value, "target_operation_id", `${path}.target_operation_id`, diagnostics);
  requireOptionalString(value, "child_operation_kind", `${path}.child_operation_kind`, diagnostics);
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  if ("execution_hook" in value) {
    diagnostics.push(error(
      "package_coordination.operation_proxy.execution_hook.forbidden",
      `${path}.execution_hook`,
      "Package coordination operation proxy must not declare direct execution hooks."
    ));
  }
  validatePackageSupervisionNoHardwareBinding(value, path, diagnostics);
  return true;
}

function validatePackageChildPortRefArray(
  container: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  const value = container[field];
  if (!Array.isArray(value)) {
    diagnostics.push(error("field.array", path, `Field \`${field}\` must be an array.`));
    return;
  }

  value.forEach((entry, index) => {
    validatePackageChildPortRef(entry, `${path}[${index}]`, diagnostics);
  });
}

function validatePackageChildPortRef(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageChildPortRef {
  if (!isRecord(value)) {
    diagnostics.push(error("package_child_port_ref.invalid", path, "Package child port reference must be an object."));
    return false;
  }

  requireString(value, "member_id", `${path}.member_id`, diagnostics);
  requireString(value, "port_id", `${path}.port_id`, diagnostics);
  return true;
}

function validatePackageSupervisionNoHardwareBinding(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  if ("binding_kind" in value || "resource_id" in value || "hardware_binding" in value) {
    diagnostics.push(error(
      "package_supervision.hardware_binding.forbidden",
      path,
      "Package supervision metadata must not declare direct hardware bindings."
    ));
  }
}

function validatePackageCoordinationNoSafetyFields(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  for (const forbiddenField of ["burner_sequence", "safety_contract", "flame_safeguard", "direct_safety_action"]) {
    if (forbiddenField in value) {
      diagnostics.push(error(
        "package_coordination.safety_field.forbidden",
        `${path}.${forbiddenField}`,
        "Package coordination baseline must not declare burner or safety-specific fields."
      ));
    }
  }
}

function validatePackageModePhaseNoBoilerFields(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  for (const forbiddenField of ["burner_sequence", "safety_contract", "flame_safeguard", "ignition_phase", "purge_timer"]) {
    if (forbiddenField in value) {
      diagnostics.push(error(
        "package_mode_phase.boiler_field.forbidden",
        `${path}.${forbiddenField}`,
        "Package mode/phase baseline must remain domain-neutral and must not declare boiler-specific fields."
      ));
    }
  }
}

function validatePackagePermissiveInterlockNoSafetyFields(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  for (const forbiddenField of ["burner_trip", "safety_chain", "flame_safeguard", "hardwired_interlock", "purge_proven"]) {
    if (forbiddenField in value) {
      diagnostics.push(error(
        "package_permissive_interlock.domain_field.forbidden",
        `${path}.${forbiddenField}`,
        "Package permissive/interlock baseline must remain generic and must not declare boiler or safety-specific fields."
      ));
    }
  }
}

function validatePackageProtectionRecoveryNoSafetyFields(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  for (const forbiddenField of ["burner_trip", "safety_trip_class", "flame_safeguard", "hardwired_trip", "sif_vote"]) {
    if (forbiddenField in value) {
      diagnostics.push(error(
        "package_protection_recovery.domain_field.forbidden",
        `${path}.${forbiddenField}`,
        "Package protection/recovery baseline must remain generic and must not declare safety-certified or boiler-specific fields."
      ));
    }
  }
}

function validatePackageOverrideHandoverNoSafetyFields(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  for (const forbiddenField of ["safety_bypass", "permissive_bypass", "burner_override", "hardwired_handover", "vendor_lockout_policy"]) {
    if (forbiddenField in value) {
      diagnostics.push(error(
        "package_override_handover.domain_field.forbidden",
        `${path}.${forbiddenField}`,
        "Package override/handover baseline must remain generic and must not declare safety bypass or vendor-specific lockout fields."
      ));
    }
  }
}

function validatePackageInstance(
  packageInstanceId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is PackageInstance {
  if (!isRecord(value)) {
    diagnostics.push(error("package_instance.invalid", path, "PackageInstance must be an object."));
    return false;
  }

  requireExactString(value, "id", packageInstanceId, `${path}.id`, diagnostics);
  requireExactString(value, "kind", "package_instance", `${path}.kind`, diagnostics);
  requireString(value, "package_ref", `${path}.package_ref`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireOptionalString(value, "preset_ref", `${path}.preset_ref`, diagnostics);
  validateStringRecord(value, "tags", `${path}.tags`, "package_instance.tag.invalid", diagnostics);

  const memberOverrides = getOptionalRecord(value, "member_overrides", `${path}.member_overrides`, diagnostics);
  if (memberOverrides) {
    for (const [memberId, override] of Object.entries(memberOverrides)) {
      if (!isRecord(override)) {
        diagnostics.push(error("package_member_override.invalid", `${path}.member_overrides.${memberId}`, "Package member override must be an object."));
        continue;
      }

      requireOptionalString(override, "title", `${path}.member_overrides.${memberId}.title`, diagnostics);
      requireOptionalBoolean(override, "enabled", `${path}.member_overrides.${memberId}.enabled`, diagnostics);
      requireOptionalString(override, "template_ref", `${path}.member_overrides.${memberId}.template_ref`, diagnostics);
      if ("param_values" in override) {
        const paramValues = requireRecord(override, "param_values", `${path}.member_overrides.${memberId}.param_values`, diagnostics);
        if (paramValues) {
          for (const [paramId, paramValue] of Object.entries(paramValues)) {
            validateParamValue(paramValue, `${path}.member_overrides.${memberId}.param_values.${paramId}`, diagnostics);
          }
        }
      }
      validateStringRecord(override, "tags", `${path}.member_overrides.${memberId}.tags`, "package_member_override.tag.invalid", diagnostics);
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
  requireOneOf(value, "channel_kind", ["signal", "command", "state", "event", "alarm", "telemetry"], `${path}.channel_kind`, diagnostics);
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
  requireOptionalString(value, "unit", `${path}.unit`, diagnostics);
  requireOptionalNumber(value, "min", `${path}.min`, diagnostics);
  requireOptionalNumber(value, "max", `${path}.max`, diagnostics);
  requireOptionalNumber(value, "step", `${path}.step`, diagnostics);
  requireOptionalString(value, "group", `${path}.group`, diagnostics);
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  requireOptionalString(value, "description", `${path}.description`, diagnostics);
  requireOptionalString(value, "access_role", `${path}.access_role`, diagnostics);
  requireOptionalString(value, "live_edit_policy", `${path}.live_edit_policy`, diagnostics);
  requireOptionalString(value, "persist_policy", `${path}.persist_policy`, diagnostics);
  requireOptionalString(value, "recipe_scope", `${path}.recipe_scope`, diagnostics);
  requireOptionalString(value, "danger_level", `${path}.danger_level`, diagnostics);
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

function validateObjectTypeFacets(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("facets.invalid", path, "Object facets must be an object."));
    return false;
  }

  const frontendFacet = getOptionalRecord(value, "frontends", `${path}.frontends`, diagnostics);
  if (frontendFacet) {
    const requirements = getOptionalRecord(frontendFacet, "requirements", `${path}.frontends.requirements`, diagnostics);
    if (requirements) {
      for (const [requirementId, requirement] of Object.entries(requirements)) {
        validateFrontendRequirementDef(requirementId, requirement, `${path}.frontends.requirements.${requirementId}`, diagnostics);
      }
    }
  }

  const operationsFacet = getOptionalRecord(value, "operations", `${path}.operations`, diagnostics);
  if (operationsFacet) {
    const operations = getOptionalRecord(operationsFacet, "operations", `${path}.operations.operations`, diagnostics);
    if (operations) {
      for (const [operationId, operation] of Object.entries(operations)) {
        validateOperationDef(operationId, operation, `${path}.operations.operations.${operationId}`, diagnostics);
      }
    }
  }

  validateMonitorFacet(value, "monitors", `${path}.monitors`, diagnostics);
  validateMonitorFacet(value, "monitoring", `${path}.monitoring`, diagnostics);

  const debugFacet = getOptionalRecord(value, "debug", `${path}.debug`, diagnostics);
  if (debugFacet) {
    const traceGroups = getOptionalRecord(debugFacet, "trace_groups", `${path}.debug.trace_groups`, diagnostics);
    if (traceGroups) {
      for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
        validateTraceGroupDef(traceGroupId, traceGroup, `${path}.debug.trace_groups.${traceGroupId}`, diagnostics);
      }
    }
  }

  const persistenceFacet = getOptionalRecord(value, "persistence", `${path}.persistence`, diagnostics);
  if (persistenceFacet) {
    const slots = getOptionalRecord(persistenceFacet, "slots", `${path}.persistence.slots`, diagnostics);
    if (slots) {
      for (const [slotId, slot] of Object.entries(slots)) {
        validatePersistenceSlotDef(slotId, slot, `${path}.persistence.slots.${slotId}`, diagnostics);
      }
    }
  }

  const templatesFacet = getOptionalRecord(value, "templates", `${path}.templates`, diagnostics);
  if (templatesFacet) {
    const presets = getOptionalRecord(templatesFacet, "presets", `${path}.templates.presets`, diagnostics);
    if (presets) {
      for (const [presetId, preset] of Object.entries(presets)) {
        validateTemplatePresetDef(presetId, preset, `${path}.templates.presets.${presetId}`, diagnostics);
      }
    }
  }

  return true;
}

function validateFrontendRequirementDef(requirementId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("frontend_requirement.invalid", path, "Frontend requirement must be an object."));
    return false;
  }

  requireExactString(value, "id", requirementId, `${path}.id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "mode", `${path}.mode`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "binding_kind", `${path}.binding_kind`, diagnostics);
  requireOptionalString(value, "channel_kind", `${path}.channel_kind`, diagnostics);
  requireOptionalString(value, "value_type", `${path}.value_type`, diagnostics);
  requireOptionalBoolean(value, "required", `${path}.required`, diagnostics);
  getOptionalRecord(value, "config", `${path}.config`, diagnostics);
  return true;
}

function validateOperationDef(operationId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("operation.invalid", path, "Operation definition must be an object."));
    return false;
  }

  requireExactString(value, "id", operationId, `${path}.id`, diagnostics);
  requireOptionalString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  requireOptionalStringArray(value, "safe_when", `${path}.safe_when`, diagnostics);
  requireOptionalString(value, "confirmation_policy", `${path}.confirmation_policy`, diagnostics);
  requireOptionalStringArray(value, "progress_signals", `${path}.progress_signals`, diagnostics);
  requireOptionalStringArray(value, "result_fields", `${path}.result_fields`, diagnostics);
  return true;
}

function validateMonitorFacet(
  container: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  const monitorFacet = getOptionalRecord(container, field, path, diagnostics);
  if (!monitorFacet) {
    return;
  }

  const monitors = getOptionalRecord(monitorFacet, "monitors", `${path}.monitors`, diagnostics);
  if (!monitors) {
    return;
  }

  for (const [monitorId, monitor] of Object.entries(monitors)) {
    validateMonitorDef(monitorId, monitor, `${path}.monitors.${monitorId}`, diagnostics);
  }
}

function validateMonitorDef(monitorId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("monitor.invalid", path, "Monitor definition must be an object."));
    return false;
  }

  requireExactString(value, "id", monitorId, `${path}.id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  requireOptionalString(value, "status_port_id", `${path}.status_port_id`, diagnostics);
  getOptionalRecord(value, "config", `${path}.config`, diagnostics);
  return true;
}

function validateTraceGroupDef(traceGroupId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("trace_group.invalid", path, "Trace group definition must be an object."));
    return false;
  }

  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireStringArray(value, "signals", `${path}.signals`, diagnostics);
  requireOptionalNumber(value, "sample_hint_ms", `${path}.sample_hint_ms`, diagnostics);
  requireOptionalString(value, "chart_hint", `${path}.chart_hint`, diagnostics);
  return true;
}

function validatePersistenceSlotDef(slotId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("persistence_slot.invalid", path, "Persistence slot definition must be an object."));
    return false;
  }

  requireExactString(value, "id", slotId, `${path}.id`, diagnostics);
  requireString(value, "slot_kind", `${path}.slot_kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "owner_param_id", `${path}.owner_param_id`, diagnostics);
  requireOptionalString(value, "nv_slot_hint", `${path}.nv_slot_hint`, diagnostics);
  requireOptionalString(value, "flush_policy", `${path}.flush_policy`, diagnostics);
  return true;
}

function validateTemplatePresetDef(presetId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("template_preset.invalid", path, "Template preset definition must be an object."));
    return false;
  }

  requireExactString(value, "id", presetId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "description", `${path}.description`, diagnostics);
  getOptionalRecord(value, "defaults", `${path}.defaults`, diagnostics);
  return true;
}

function validateTemplateSemantics(model: Record<string, unknown>, diagnostics: ValidationDiagnostic[]): void {
  const definitions = isRecord(model.definitions) ? model.definitions : null;
  const system = isRecord(model.system) ? model.system : null;
  const templates = definitions && isRecord(definitions.templates) ? definitions.templates : null;
  const instances = system && isRecord(system.instances) ? system.instances : null;

  if (!templates || !instances) {
    return;
  }

  for (const [instanceId, instance] of Object.entries(instances)) {
    if (!isRecord(instance) || typeof instance.template_ref !== "string") {
      continue;
    }

    const template = templates[instance.template_ref];
    const instancePath = `$.system.instances.${instanceId}`;
    if (!isRecord(template)) {
      diagnostics.push(error(
        "object_instance.template_ref.unresolved",
        `${instancePath}.template_ref`,
        `ObjectInstance template_ref \`${instance.template_ref}\` cannot be resolved from definitions.templates.`
      ));
      continue;
    }

    if (typeof template.base_type_ref === "string" && typeof instance.type_ref === "string" && template.base_type_ref !== instance.type_ref) {
      diagnostics.push(error(
        "object_instance.template_ref.type_mismatch",
        `${instancePath}.template_ref`,
        `ObjectInstance type_ref \`${instance.type_ref}\` must match template base_type_ref \`${template.base_type_ref}\`.`
      ));
    }
  }
}

function validatePackageSemantics(model: Record<string, unknown>, diagnostics: ValidationDiagnostic[]): void {
  const definitions = isRecord(model.definitions) ? model.definitions : null;
  const system = isRecord(model.system) ? model.system : null;
  const objectTypes = definitions && isRecord(definitions.object_types) ? definitions.object_types : null;
  const templates = definitions && isRecord(definitions.templates) ? definitions.templates : null;
  const packages = definitions && isRecord(definitions.packages) ? definitions.packages : null;
  const packageInstances = system && isRecord(system.packages) ? system.packages : null;

  if (packages) {
    for (const [packageId, packageDefinition] of Object.entries(packages)) {
      if (!isRecord(packageDefinition)) {
        continue;
      }

      const packagePath = `$.definitions.packages.${packageId}`;
      const members = isRecord(packageDefinition.members) ? packageDefinition.members : null;
      const signals = isRecord(packageDefinition.signals) ? packageDefinition.signals : null;
      const bindings = isRecord(packageDefinition.bindings) ? packageDefinition.bindings : null;
      const presets = isRecord(packageDefinition.presets) ? packageDefinition.presets : null;

      if (typeof packageDefinition.meta === "object" && packageDefinition.meta !== null) {
        const meta = packageDefinition.meta as Record<string, unknown>;
        if (
          typeof meta.package_kind === "string" &&
          meta.package_kind.includes("skeleton") &&
          meta.safety_scope === "includes_safety_logic"
        ) {
          diagnostics.push(error(
            "package.safety_scope.forbidden",
            `${packagePath}.meta.safety_scope`,
            "Skeleton packages must not declare safety-specific scope."
          ));
        }
      }

      if (members) {
        for (const [memberId, member] of Object.entries(members)) {
          if (!isRecord(member)) {
            continue;
          }

          const memberPath = `${packagePath}.members.${memberId}`;
          const typeRef = member.type_ref;
          const templateRef = member.template_ref;
          if (typeof typeRef === "string" && !canResolveObjectLikeRef(typeRef, objectTypes)) {
            diagnostics.push(error(
              "package_member.type_ref.unresolved",
              `${memberPath}.type_ref`,
              `Package member type_ref \`${typeRef}\` cannot be resolved from definitions.object_types or library refs.`
            ));
          }

          if (typeof templateRef === "string" && (!templates || !isRecord(templates[templateRef]))) {
            diagnostics.push(error(
              "package_member.template_ref.unresolved",
              `${memberPath}.template_ref`,
              `Package member template_ref \`${templateRef}\` cannot be resolved from definitions.templates.`
            ));
          }

          validatePackageParamRefs(member.defaults, objectTypes, typeRef, `${memberPath}.defaults`, diagnostics);
        }
      }

      if (signals && members) {
        for (const [signalId, signal] of Object.entries(signals)) {
          if (!isRecord(signal)) {
            continue;
          }

          validatePackageSignalEndpoint(signal.source, `${packagePath}.signals.${signalId}.source`, members, diagnostics);
          const targets = isRecord(signal.targets) ? signal.targets : null;
          if (targets) {
            for (const [targetId, target] of Object.entries(targets)) {
              validatePackageSignalEndpoint(target, `${packagePath}.signals.${signalId}.targets.${targetId}`, members, diagnostics);
            }
          }
        }
      }

      if (bindings && members) {
        for (const [bindingId, binding] of Object.entries(bindings)) {
          if (!isRecord(binding)) {
            continue;
          }

          const memberId = binding.member_id;
          if (typeof memberId === "string" && !members[memberId]) {
            diagnostics.push(error(
              "package_binding.member.unresolved",
              `${packagePath}.bindings.${bindingId}.member_id`,
              `Package binding \`${bindingId}\` references unknown member \`${memberId}\`.`
            ));
          }
        }
      }

      if (presets && members) {
        for (const [presetId, preset] of Object.entries(presets)) {
          if (!isRecord(preset)) {
            continue;
          }

          const memberDefaults = isRecord(preset.member_defaults) ? preset.member_defaults : null;
          if (!memberDefaults) {
            continue;
          }

          for (const [memberId, defaults] of Object.entries(memberDefaults)) {
            if (!members[memberId]) {
              diagnostics.push(error(
                "package_preset.member.unresolved",
                `${packagePath}.presets.${presetId}.member_defaults.${memberId}`,
                `Package preset \`${presetId}\` references unknown member \`${memberId}\`.`
              ));
              continue;
            }

            validatePackageParamRefs(defaults, objectTypes, (members[memberId] as Record<string, unknown>).type_ref, `${packagePath}.presets.${presetId}.member_defaults.${memberId}`, diagnostics);
          }
        }
      }

      if (members) {
        validatePackageSupervisionSemantics(
          packageDefinition,
          packagePath,
          members,
          objectTypes,
          diagnostics
        );
        validatePackageCoordinationSemantics(
          packageDefinition,
          packagePath,
          members,
          objectTypes,
          diagnostics
        );
        validatePackageModePhaseSemantics(
          packageDefinition,
          packagePath,
          members,
          objectTypes,
          diagnostics
        );
        validatePackagePermissiveInterlockSemantics(
          packageDefinition,
          packagePath,
          members,
          objectTypes,
          diagnostics
        );
        validatePackageProtectionRecoverySemantics(
          packageDefinition,
          packagePath,
          members,
          objectTypes,
          diagnostics
        );
        validatePackageArbitrationSemantics(
          packageDefinition,
          packagePath,
          members,
          objectTypes,
          diagnostics
        );
        validatePackageOverrideHandoverSemantics(
          packageDefinition,
          packagePath,
          members,
          objectTypes,
          diagnostics
        );
      }
    }
  }

  if (!packageInstances) {
    return;
  }

  for (const [packageInstanceId, packageInstance] of Object.entries(packageInstances)) {
    if (!isRecord(packageInstance)) {
      continue;
    }

    const packageInstancePath = `$.system.packages.${packageInstanceId}`;
    const packageRef = packageInstance.package_ref;
    const packageDefinition = typeof packageRef === "string" && packages && isRecord(packages[packageRef]) ? packages[packageRef] : null;
    if (!packageDefinition) {
      diagnostics.push(error(
        "package_instance.package_ref.unresolved",
        `${packageInstancePath}.package_ref`,
        `PackageInstance package_ref \`${packageRef}\` cannot be resolved from definitions.packages.`
      ));
      continue;
    }

    const members = isRecord(packageDefinition.members) ? packageDefinition.members : null;
    const presets = isRecord(packageDefinition.presets) ? packageDefinition.presets : null;
    if (typeof packageInstance.preset_ref === "string" && (!presets || !isRecord(presets[packageInstance.preset_ref]))) {
      diagnostics.push(error(
        "package_instance.preset_ref.unresolved",
        `${packageInstancePath}.preset_ref`,
        `PackageInstance preset_ref \`${packageInstance.preset_ref}\` cannot be resolved from the selected package definition.`
      ));
    }

    const memberOverrides = isRecord(packageInstance.member_overrides) ? packageInstance.member_overrides : null;
    if (!memberOverrides || !members) {
      continue;
    }

    for (const [memberId, override] of Object.entries(memberOverrides)) {
      if (!members[memberId]) {
        diagnostics.push(error(
          "package_member_override.member.unresolved",
          `${packageInstancePath}.member_overrides.${memberId}`,
          `Package member override references unknown member \`${memberId}\`.`
        ));
        continue;
      }

      if (!isRecord(override)) {
        continue;
      }

      if (typeof override.template_ref === "string" && (!templates || !isRecord(templates[override.template_ref]))) {
        diagnostics.push(error(
          "package_member_override.template_ref.unresolved",
          `${packageInstancePath}.member_overrides.${memberId}.template_ref`,
          `Package member override template_ref \`${override.template_ref}\` cannot be resolved from definitions.templates.`
        ));
      }

      validatePackageParamRefs(
        override,
        objectTypes,
        (members[memberId] as Record<string, unknown>).type_ref,
        `${packageInstancePath}.member_overrides.${memberId}`,
        diagnostics
      );
    }
  }
}

function validatePackageSignalEndpoint(
  value: unknown,
  path: string,
  members: Record<string, unknown>,
  diagnostics: ValidationDiagnostic[]
): void {
  if (!isRecord(value)) {
    return;
  }

  if (typeof value.instance_id === "string" && !(value.instance_id in members)) {
    diagnostics.push(error(
      "package_signal.endpoint.member.unresolved",
      `${path}.instance_id`,
      `Package signal endpoint references unknown member \`${value.instance_id}\`.`
    ));
  }
}

function validatePackageParamRefs(
  value: unknown,
  objectTypes: Record<string, unknown> | null,
  typeRef: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  if (!isRecord(value) || !isRecord(value.param_values) || typeof typeRef !== "string") {
    return;
  }

  const knownParams = resolveLocalObjectTypeParams(typeRef, objectTypes);
  if (!knownParams) {
    return;
  }

  for (const paramId of Object.keys(value.param_values)) {
    if (!(paramId in knownParams)) {
      diagnostics.push(error(
        "package_member.param.unknown",
        `${path}.param_values.${paramId}`,
        `Package param default/override references unknown param \`${paramId}\` for type_ref \`${typeRef}\`.`
      ));
    }
  }
}

function validatePackageSupervisionSemantics(
  packageDefinition: Record<string, unknown>,
  packagePath: string,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  diagnostics: ValidationDiagnostic[]
): void {
  const supervision = isRecord(packageDefinition.supervision) ? packageDefinition.supervision : null;
  if (!supervision) {
    return;
  }

  const summaryOutputs = isRecord(supervision.summary_outputs) ? supervision.summary_outputs : null;
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      if (!isRecord(summary)) {
        continue;
      }

      const summaryPath = `${packagePath}.supervision.summary_outputs.${summaryId}`;
      validatePackageSupervisionSource(summary.source, `${summaryPath}.source`, members, diagnostics);

      const sourceRef = isRecord(summary.source) ? summary.source : null;
      const actualValueType = resolvePackageMemberPortValueType(
        sourceRef?.member_id,
        sourceRef?.port_id,
        members,
        objectTypes
      );
      if (
        typeof summary.value_type === "string" &&
        typeof actualValueType === "string" &&
        summary.value_type !== actualValueType
      ) {
        diagnostics.push(error(
          "package_supervision.summary_source.value_type_mismatch",
          `${summaryPath}.value_type`,
          `Package summary output \`${summaryId}\` declares value_type \`${summary.value_type}\` but source port resolves to \`${actualValueType}\`.`
        ));
      }
    }
  }

  const aggregateMonitors = isRecord(supervision.aggregate_monitors) ? supervision.aggregate_monitors : null;
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      if (!isRecord(monitor) || !Array.isArray(monitor.source_ports)) {
        continue;
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.supervision.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  const aggregateAlarms = isRecord(supervision.aggregate_alarms) ? supervision.aggregate_alarms : null;
  if (aggregateAlarms) {
    for (const [alarmId, alarm] of Object.entries(aggregateAlarms)) {
      if (!isRecord(alarm) || !Array.isArray(alarm.source_ports)) {
        continue;
      }

      alarm.source_ports.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.supervision.aggregate_alarms.${alarmId}.source_ports[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  const traceGroups = isRecord(supervision.trace_groups) ? supervision.trace_groups : null;
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      if (!isRecord(traceGroup) || !Array.isArray(traceGroup.signals)) {
        continue;
      }

      traceGroup.signals.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.supervision.trace_groups.${traceGroupId}.signals[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  const operationProxies = isRecord(supervision.operation_proxies) ? supervision.operation_proxies : null;
  if (operationProxies) {
    for (const [proxyId, proxy] of Object.entries(operationProxies)) {
      if (!isRecord(proxy)) {
        continue;
      }

      const proxyPath = `${packagePath}.supervision.operation_proxies.${proxyId}`;
      if (typeof proxy.target_member_id === "string" && !members[proxy.target_member_id]) {
        diagnostics.push(error(
          "package_operation_proxy.member.unresolved",
          `${proxyPath}.target_member_id`,
          `Package operation proxy \`${proxyId}\` references unknown member \`${proxy.target_member_id}\`.`
        ));
        continue;
      }

      const operations = resolveLocalObjectTypeOperations(
        typeof proxy.target_member_id === "string" ? (members[proxy.target_member_id] as Record<string, unknown>).type_ref : undefined,
        objectTypes
      );
      if (
        typeof proxy.target_operation_id === "string" &&
        operations &&
        !operations[proxy.target_operation_id]
      ) {
        diagnostics.push(error(
          "package_operation_proxy.target.unresolved",
          `${proxyPath}.target_operation_id`,
          `Package operation proxy \`${proxyId}\` references unknown child operation \`${proxy.target_operation_id}\`.`
        ));
      }
    }
  }
}

function validatePackageCoordinationSemantics(
  packageDefinition: Record<string, unknown>,
  packagePath: string,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  diagnostics: ValidationDiagnostic[]
): void {
  const coordination = isRecord(packageDefinition.coordination) ? packageDefinition.coordination : null;
  if (!coordination) {
    return;
  }

  const packageState = isRecord(coordination.package_state) ? coordination.package_state : null;
  if (packageState && isRecord(packageState.states)) {
    for (const [stateId, stateRule] of Object.entries(packageState.states)) {
      if (!isRecord(stateRule) || !Array.isArray(stateRule.source_ports)) {
        continue;
      }

      stateRule.source_ports.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.coordination.package_state.states.${stateId}.source_ports[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  const summaryOutputs = isRecord(coordination.summary_outputs) ? coordination.summary_outputs : null;
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      if (!isRecord(summary)) {
        continue;
      }

      const summaryPath = `${packagePath}.coordination.summary_outputs.${summaryId}`;
      validatePackageSupervisionSource(summary.source, `${summaryPath}.source`, members, diagnostics);

      const sourceRef = isRecord(summary.source) ? summary.source : null;
      const actualValueType = resolvePackageMemberPortValueType(
        sourceRef?.member_id,
        sourceRef?.port_id,
        members,
        objectTypes
      );
      if (
        typeof summary.value_type === "string" &&
        typeof actualValueType === "string" &&
        summary.value_type !== actualValueType
      ) {
        diagnostics.push(error(
          "package_coordination.summary_source.value_type_mismatch",
          `${summaryPath}.value_type`,
          `Package coordination summary output \`${summaryId}\` declares value_type \`${summary.value_type}\` but source port resolves to \`${actualValueType}\`.`
        ));
      }
    }
  }

  const aggregateMonitors = isRecord(coordination.aggregate_monitors) ? coordination.aggregate_monitors : null;
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      if (!isRecord(monitor) || !Array.isArray(monitor.source_ports)) {
        continue;
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.coordination.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  const traceGroups = isRecord(coordination.trace_groups) ? coordination.trace_groups : null;
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      if (!isRecord(traceGroup) || !Array.isArray(traceGroup.signals)) {
        continue;
      }

      traceGroup.signals.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.coordination.trace_groups.${traceGroupId}.signals[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  const operationProxies = isRecord(coordination.operation_proxies) ? coordination.operation_proxies : null;
  if (operationProxies) {
    for (const [proxyId, proxy] of Object.entries(operationProxies)) {
      if (!isRecord(proxy)) {
        continue;
      }

      const proxyPath = `${packagePath}.coordination.operation_proxies.${proxyId}`;
      if (typeof proxy.target_member_id === "string" && !members[proxy.target_member_id]) {
        diagnostics.push(error(
          "package_coordination.operation_proxy.member.unresolved",
          `${proxyPath}.target_member_id`,
          `Package coordination operation proxy \`${proxyId}\` references unknown member \`${proxy.target_member_id}\`.`
        ));
        continue;
      }

      const operations = resolveLocalObjectTypeOperations(
        typeof proxy.target_member_id === "string" ? (members[proxy.target_member_id] as Record<string, unknown>).type_ref : undefined,
        objectTypes
      );
      if (
        typeof proxy.target_operation_id === "string" &&
        operations &&
        !operations[proxy.target_operation_id]
      ) {
        diagnostics.push(error(
          "package_coordination.operation_proxy.target.unresolved",
          `${proxyPath}.target_operation_id`,
          `Package coordination operation proxy \`${proxyId}\` references unknown child operation \`${proxy.target_operation_id}\`.`
        ));
      }
    }
  }
}

function validatePackageModePhaseSemantics(
  packageDefinition: Record<string, unknown>,
  packagePath: string,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  diagnostics: ValidationDiagnostic[]
): void {
  const modePhase = isRecord(packageDefinition.mode_phase) ? packageDefinition.mode_phase : null;
  if (!modePhase) {
    return;
  }

  const modes = isRecord(modePhase.modes) ? modePhase.modes : null;
  const phases = isRecord(modePhase.phases) ? modePhase.phases : null;
  void objectTypes;

  if (typeof modePhase.active_mode_ref === "string" && !modes?.[modePhase.active_mode_ref]) {
    diagnostics.push(error(
      "package_mode_phase.active_mode.unresolved",
      `${packagePath}.mode_phase.active_mode_ref`,
      `Package mode/phase active_mode_ref \`${modePhase.active_mode_ref}\` does not resolve to a known package mode.`
    ));
  }

  if (typeof modePhase.active_phase_ref === "string" && !phases?.[modePhase.active_phase_ref]) {
    diagnostics.push(error(
      "package_mode_phase.active_phase.unresolved",
      `${packagePath}.mode_phase.active_phase_ref`,
      `Package mode/phase active_phase_ref \`${modePhase.active_phase_ref}\` does not resolve to a known package phase.`
    ));
  }

  for (const [modeId, mode] of Object.entries(modes ?? {})) {
    if (!isRecord(mode) || !Array.isArray(mode.phase_refs)) {
      continue;
    }

    mode.phase_refs.forEach((phaseRef, index) => {
      if (!phases?.[phaseRef]) {
        diagnostics.push(error(
          "package_mode_phase.mode_phase_ref.unresolved",
          `${packagePath}.mode_phase.modes.${modeId}.phase_refs[${index}]`,
          `Package mode \`${modeId}\` references unknown phase \`${phaseRef}\`.`
        ));
      }
    });
  }

  for (const [phaseId, phase] of Object.entries(phases ?? {})) {
    if (!isRecord(phase) || !Array.isArray(phase.source_ports)) {
      continue;
    }

    phase.source_ports.forEach((source, index) => {
      validatePackageSupervisionSource(
        source,
        `${packagePath}.mode_phase.phases.${phaseId}.source_ports[${index}]`,
        members,
        diagnostics
      );
    });
  }

  const modeSummary = isRecord(modePhase.mode_summary) ? modePhase.mode_summary : null;
  if (modeSummary) {
    if (typeof modeSummary.default_mode_ref === "string" && !modes?.[modeSummary.default_mode_ref]) {
      diagnostics.push(error(
        "package_mode_phase.mode_summary.ref.unresolved",
        `${packagePath}.mode_phase.mode_summary.default_mode_ref`,
        `Package mode summary default ref \`${modeSummary.default_mode_ref}\` does not resolve to a known mode.`
      ));
    }

    const entries = isRecord(modeSummary.entries) ? modeSummary.entries : null;
    for (const [entryId, entry] of Object.entries(entries ?? {})) {
      if (!isRecord(entry)) {
        continue;
      }

      if (typeof entry.mode_ref === "string" && !modes?.[entry.mode_ref]) {
        diagnostics.push(error(
          "package_mode_phase.mode_summary.ref.unresolved",
          `${packagePath}.mode_phase.mode_summary.entries.${entryId}.mode_ref`,
          `Package mode summary entry \`${entryId}\` references unknown mode \`${entry.mode_ref}\`.`
        ));
      }

      if (Array.isArray(entry.source_ports)) {
        entry.source_ports.forEach((source, index) => {
          validatePackageSupervisionSource(
            source,
            `${packagePath}.mode_phase.mode_summary.entries.${entryId}.source_ports[${index}]`,
            members,
            diagnostics
          );
        });
      }
    }
  }

  const phaseSummary = isRecord(modePhase.phase_summary) ? modePhase.phase_summary : null;
  if (phaseSummary) {
    if (typeof phaseSummary.default_phase_ref === "string" && !phases?.[phaseSummary.default_phase_ref]) {
      diagnostics.push(error(
        "package_mode_phase.phase_summary.ref.unresolved",
        `${packagePath}.mode_phase.phase_summary.default_phase_ref`,
        `Package phase summary default ref \`${phaseSummary.default_phase_ref}\` does not resolve to a known phase.`
      ));
    }

    const entries = isRecord(phaseSummary.entries) ? phaseSummary.entries : null;
    for (const [entryId, entry] of Object.entries(entries ?? {})) {
      if (!isRecord(entry)) {
        continue;
      }

      if (typeof entry.phase_ref === "string" && !phases?.[entry.phase_ref]) {
        diagnostics.push(error(
          "package_mode_phase.phase_summary.ref.unresolved",
          `${packagePath}.mode_phase.phase_summary.entries.${entryId}.phase_ref`,
          `Package phase summary entry \`${entryId}\` references unknown phase \`${entry.phase_ref}\`.`
        ));
      }

      if (Array.isArray(entry.source_ports)) {
        entry.source_ports.forEach((source, index) => {
          validatePackageSupervisionSource(
            source,
            `${packagePath}.mode_phase.phase_summary.entries.${entryId}.source_ports[${index}]`,
            members,
            diagnostics
          );
        });
      }
    }
  }

  const modeGroups = isRecord(modePhase.package_mode_groups) ? modePhase.package_mode_groups : null;
  for (const [groupId, group] of Object.entries(modeGroups ?? {})) {
    if (!isRecord(group) || !Array.isArray(group.mode_refs)) {
      continue;
    }

    group.mode_refs.forEach((modeRef, index) => {
      if (!modes?.[modeRef]) {
        diagnostics.push(error(
          "package_mode_phase.mode_group.ref.unresolved",
          `${packagePath}.mode_phase.package_mode_groups.${groupId}.mode_refs[${index}]`,
          `Package mode group \`${groupId}\` references unknown mode \`${modeRef}\`.`
        ));
      }
    });
  }

  const phaseGroups = isRecord(modePhase.package_phase_groups) ? modePhase.package_phase_groups : null;
  for (const [groupId, group] of Object.entries(phaseGroups ?? {})) {
    if (!isRecord(group) || !Array.isArray(group.phase_refs)) {
      continue;
    }

    group.phase_refs.forEach((phaseRef, index) => {
      if (!phases?.[phaseRef]) {
        diagnostics.push(error(
          "package_mode_phase.phase_group.ref.unresolved",
          `${packagePath}.mode_phase.package_phase_groups.${groupId}.phase_refs[${index}]`,
          `Package phase group \`${groupId}\` references unknown phase \`${phaseRef}\`.`
        ));
      }
    });
  }

  const traceGroups = isRecord(modePhase.trace_groups) ? modePhase.trace_groups : null;
  for (const [traceGroupId, traceGroup] of Object.entries(traceGroups ?? {})) {
    if (!isRecord(traceGroup) || !Array.isArray(traceGroup.signals)) {
      continue;
    }

    traceGroup.signals.forEach((source, index) => {
      validatePackageSupervisionSource(
        source,
        `${packagePath}.mode_phase.trace_groups.${traceGroupId}.signals[${index}]`,
        members,
        diagnostics
      );
    });
  }

  const allowedModeTransitions = isRecord(modePhase.allowed_mode_transitions) ? modePhase.allowed_mode_transitions : null;
  for (const [transitionId, transition] of Object.entries(allowedModeTransitions ?? {})) {
    if (!isRecord(transition)) {
      continue;
    }

    if (typeof transition.from_mode_ref === "string" && !modes?.[transition.from_mode_ref]) {
      diagnostics.push(error(
        "package_mode_phase.mode_transition.ref.unresolved",
        `${packagePath}.mode_phase.allowed_mode_transitions.${transitionId}.from_mode_ref`,
        `Package mode transition \`${transitionId}\` references unknown source mode \`${transition.from_mode_ref}\`.`
      ));
    }

    if (typeof transition.to_mode_ref === "string" && !modes?.[transition.to_mode_ref]) {
      diagnostics.push(error(
        "package_mode_phase.mode_transition.ref.unresolved",
        `${packagePath}.mode_phase.allowed_mode_transitions.${transitionId}.to_mode_ref`,
        `Package mode transition \`${transitionId}\` references unknown target mode \`${transition.to_mode_ref}\`.`
      ));
    }
  }

  const allowedPhaseTransitions = isRecord(modePhase.allowed_phase_transitions) ? modePhase.allowed_phase_transitions : null;
  for (const [transitionId, transition] of Object.entries(allowedPhaseTransitions ?? {})) {
    if (!isRecord(transition)) {
      continue;
    }

    if (typeof transition.phase_ref === "string" && !phases?.[transition.phase_ref]) {
      diagnostics.push(error(
        "package_mode_phase.phase_transition.ref.unresolved",
        `${packagePath}.mode_phase.allowed_phase_transitions.${transitionId}.phase_ref`,
        `Package phase transition \`${transitionId}\` references unknown phase \`${transition.phase_ref}\`.`
      ));
    }

    if (Array.isArray(transition.allowed_mode_refs)) {
      transition.allowed_mode_refs.forEach((modeRef, index) => {
        if (!modes?.[modeRef]) {
          diagnostics.push(error(
            "package_mode_phase.phase_transition.mode_ref.unresolved",
            `${packagePath}.mode_phase.allowed_phase_transitions.${transitionId}.allowed_mode_refs[${index}]`,
            `Package phase transition \`${transitionId}\` references unknown allowed mode \`${modeRef}\`.`
          ));
        }
      });
    }
  }
}

function validatePackagePermissiveInterlockSemantics(
  packageDefinition: Record<string, unknown>,
  packagePath: string,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  diagnostics: ValidationDiagnostic[]
): void {
  const permissiveInterlock = isRecord(packageDefinition.permissive_interlock) ? packageDefinition.permissive_interlock : null;
  if (!permissiveInterlock) {
    return;
  }

  const permissives = isRecord(permissiveInterlock.permissives) ? permissiveInterlock.permissives : null;
  const interlocks = isRecord(permissiveInterlock.interlocks) ? permissiveInterlock.interlocks : null;
  const gateSummary = isRecord(permissiveInterlock.gate_summary) ? permissiveInterlock.gate_summary : null;
  const modePhase = isRecord(packageDefinition.mode_phase) ? packageDefinition.mode_phase : null;
  const allowedModeTransitions = modePhase && isRecord(modePhase.allowed_mode_transitions) ? modePhase.allowed_mode_transitions : null;
  const allowedPhaseTransitions = modePhase && isRecord(modePhase.allowed_phase_transitions) ? modePhase.allowed_phase_transitions : null;

  for (const [permissiveId, permissive] of Object.entries(permissives ?? {})) {
    if (!isRecord(permissive) || !Array.isArray(permissive.source_ports)) {
      continue;
    }

    permissive.source_ports.forEach((source, index) => {
      validatePackageSupervisionSource(
        source,
        `${packagePath}.permissive_interlock.permissives.${permissiveId}.source_ports[${index}]`,
        members,
        diagnostics
      );
    });
  }

  for (const [interlockId, interlock] of Object.entries(interlocks ?? {})) {
    if (!isRecord(interlock) || !Array.isArray(interlock.source_ports)) {
      continue;
    }

    interlock.source_ports.forEach((source, index) => {
      validatePackageSupervisionSource(
        source,
        `${packagePath}.permissive_interlock.interlocks.${interlockId}.source_ports[${index}]`,
        members,
        diagnostics
      );
    });
  }

  const summaryOutputs = isRecord(permissiveInterlock.summary_outputs) ? permissiveInterlock.summary_outputs : null;
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      if (!isRecord(summary)) {
        continue;
      }

      const summaryPath = `${packagePath}.permissive_interlock.summary_outputs.${summaryId}`;
      validatePackageSupervisionSource(summary.source, `${summaryPath}.source`, members, diagnostics);

      const sourceRef = isRecord(summary.source) ? summary.source : null;
      const actualValueType = resolvePackageMemberPortValueType(
        sourceRef?.member_id,
        sourceRef?.port_id,
        members,
        objectTypes
      );
      if (
        typeof summary.value_type === "string" &&
        typeof actualValueType === "string" &&
        summary.value_type !== actualValueType
      ) {
        diagnostics.push(error(
          "package_permissive_interlock.summary_source.value_type_mismatch",
          `${summaryPath}.value_type`,
          `Package permissive/interlock summary output \`${summaryId}\` declares value_type \`${summary.value_type}\` but source port resolves to \`${actualValueType}\`.`
        ));
      }
    }
  }

  const aggregateMonitors = isRecord(permissiveInterlock.aggregate_monitors) ? permissiveInterlock.aggregate_monitors : null;
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      if (!isRecord(monitor) || !Array.isArray(monitor.source_ports)) {
        continue;
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.permissive_interlock.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  const traceGroups = isRecord(permissiveInterlock.trace_groups) ? permissiveInterlock.trace_groups : null;
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      if (!isRecord(traceGroup) || !Array.isArray(traceGroup.signals)) {
        continue;
      }

      traceGroup.signals.forEach((source, index) => {
        validatePackageSupervisionSource(
          source,
          `${packagePath}.permissive_interlock.trace_groups.${traceGroupId}.signals[${index}]`,
          members,
          diagnostics
        );
      });
    }
  }

  if (gateSummary) {
    if (Array.isArray(gateSummary.permissive_refs)) {
      gateSummary.permissive_refs.forEach((permissiveRef, index) => {
        if (!permissives?.[permissiveRef]) {
          diagnostics.push(error(
            "package_permissive_interlock.permissive_ref.unresolved",
            `${packagePath}.permissive_interlock.gate_summary.permissive_refs[${index}]`,
            `Package gate summary references unknown permissive \`${permissiveRef}\`.`
          ));
        }
      });
    }

    if (Array.isArray(gateSummary.interlock_refs)) {
      gateSummary.interlock_refs.forEach((interlockRef, index) => {
        if (!interlocks?.[interlockRef]) {
          diagnostics.push(error(
            "package_permissive_interlock.interlock_ref.unresolved",
            `${packagePath}.permissive_interlock.gate_summary.interlock_refs[${index}]`,
            `Package gate summary references unknown interlock \`${interlockRef}\`.`
          ));
        }
      });
    }

    const transitionGuards = isRecord(gateSummary.transition_guards) ? gateSummary.transition_guards : null;
    for (const [guardId, guard] of Object.entries(transitionGuards ?? {})) {
      if (!isRecord(guard)) {
        continue;
      }

      if (Array.isArray(guard.permissive_refs)) {
        guard.permissive_refs.forEach((permissiveRef, index) => {
          if (!permissives?.[permissiveRef]) {
            diagnostics.push(error(
              "package_permissive_interlock.guard_ref.unresolved",
              `${packagePath}.permissive_interlock.gate_summary.transition_guards.${guardId}.permissive_refs[${index}]`,
              `Package transition guard \`${guardId}\` references unknown permissive \`${permissiveRef}\`.`
            ));
          }
        });
      }

      if (Array.isArray(guard.interlock_refs)) {
        guard.interlock_refs.forEach((interlockRef, index) => {
          if (!interlocks?.[interlockRef]) {
            diagnostics.push(error(
              "package_permissive_interlock.guard_ref.unresolved",
              `${packagePath}.permissive_interlock.gate_summary.transition_guards.${guardId}.interlock_refs[${index}]`,
              `Package transition guard \`${guardId}\` references unknown interlock \`${interlockRef}\`.`
            ));
          }
        });
      }

      if (typeof guard.mode_transition_ref === "string" && !allowedModeTransitions?.[guard.mode_transition_ref]) {
        diagnostics.push(error(
          "package_permissive_interlock.guard_transition.unresolved",
          `${packagePath}.permissive_interlock.gate_summary.transition_guards.${guardId}.mode_transition_ref`,
          `Package transition guard \`${guardId}\` references unknown mode transition \`${guard.mode_transition_ref}\`.`
        ));
      }

      if (typeof guard.phase_transition_ref === "string" && !allowedPhaseTransitions?.[guard.phase_transition_ref]) {
        diagnostics.push(error(
          "package_permissive_interlock.guard_transition.unresolved",
          `${packagePath}.permissive_interlock.gate_summary.transition_guards.${guardId}.phase_transition_ref`,
          `Package transition guard \`${guardId}\` references unknown phase transition \`${guard.phase_transition_ref}\`.`
        ));
      }
    }
  }
}

function validatePackageProtectionRecoverySemantics(
  packageDefinition: Record<string, unknown>,
  packagePath: string,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  diagnostics: ValidationDiagnostic[]
): void {
  const protectionRecovery = isRecord(packageDefinition.protection_recovery) ? packageDefinition.protection_recovery : null;
  if (!protectionRecovery) {
    return;
  }

  for (const [tripId, trip] of Object.entries(protectionRecovery.trips ?? {})) {
    if (!isRecord(trip)) {
      continue;
    }

    const sourcePorts = Array.isArray(trip.source_ports) ? trip.source_ports : [];
    for (const [index, sourcePort] of sourcePorts.entries()) {
      validatePackageChildSourcePort(
        sourcePort,
        members,
        objectTypes,
        `${packagePath}.protection_recovery.trips.${tripId}.source_ports[${index}]`,
        diagnostics,
        "package_protection_recovery.member.unresolved"
      );
    }
  }

  for (const [inhibitId, inhibit] of Object.entries(protectionRecovery.inhibits ?? {})) {
    if (!isRecord(inhibit)) {
      continue;
    }

    const sourcePorts = Array.isArray(inhibit.source_ports) ? inhibit.source_ports : [];
    for (const [index, sourcePort] of sourcePorts.entries()) {
      validatePackageChildSourcePort(
        sourcePort,
        members,
        objectTypes,
        `${packagePath}.protection_recovery.inhibits.${inhibitId}.source_ports[${index}]`,
        diagnostics,
        "package_protection_recovery.member.unresolved"
      );
    }
  }

  for (const [summaryId, summary] of Object.entries(protectionRecovery.summary_outputs ?? {})) {
    if (!isRecord(summary) || !isRecord(summary.source)) {
      continue;
    }

    const summaryPath = `${packagePath}.protection_recovery.summary_outputs.${summaryId}`;
    const sourcePortDef = resolvePackageChildPortDef(summary.source, members, objectTypes);
    if (!sourcePortDef) {
      diagnostics.push(error(
        "package_protection_recovery.member.unresolved",
        `${summaryPath}.source`,
        `Package protection/recovery summary source ${String(summary.source.member_id)}.${String(summary.source.port_id)} cannot be resolved.`
      ));
      continue;
    }

    if (typeof summary.value_type === "string" && sourcePortDef.value_type !== summary.value_type) {
      diagnostics.push(error(
        "package_protection_recovery.summary_source.value_type_mismatch",
        `${summaryPath}.value_type`,
        `Package protection/recovery summary output ${summaryId} declares value_type ${summary.value_type}, but the source port resolves to ${sourcePortDef.value_type}.`
      ));
    }
  }

  for (const [monitorId, monitor] of Object.entries(protectionRecovery.aggregate_monitors ?? {})) {
    if (!isRecord(monitor)) {
      continue;
    }

    const sourcePorts = Array.isArray(monitor.source_ports) ? monitor.source_ports : [];
    for (const [index, sourcePort] of sourcePorts.entries()) {
      validatePackageChildSourcePort(
        sourcePort,
        members,
        objectTypes,
        `${packagePath}.protection_recovery.aggregate_monitors.${monitorId}.source_ports[${index}]`,
        diagnostics,
        "package_protection_recovery.member.unresolved"
      );
    }
  }

  for (const [traceGroupId, traceGroup] of Object.entries(protectionRecovery.trace_groups ?? {})) {
    if (!isRecord(traceGroup)) {
      continue;
    }

    const signals = Array.isArray(traceGroup.signals) ? traceGroup.signals : [];
    for (const [index, signal] of signals.entries()) {
      validatePackageChildSourcePort(
        signal,
        members,
        objectTypes,
        `${packagePath}.protection_recovery.trace_groups.${traceGroupId}.signals[${index}]`,
        diagnostics,
        "package_protection_recovery.member.unresolved"
      );
    }
  }

  const tripIds = new Set(Object.keys(protectionRecovery.trips ?? {}));
  const inhibitIds = new Set(Object.keys(protectionRecovery.inhibits ?? {}));
  const recoveryRequestIds = new Set(Object.keys(protectionRecovery.recovery_requests ?? {}));
  const protectionSummary = isRecord(protectionRecovery.protection_summary) ? protectionRecovery.protection_summary : null;

  if (protectionSummary) {
    const tripRefs = Array.isArray(protectionSummary.trip_refs) ? protectionSummary.trip_refs : [];
    for (const [index, tripRef] of tripRefs.entries()) {
      if (!tripIds.has(tripRef)) {
        diagnostics.push(error(
          "package_protection_recovery.trip_ref.unresolved",
          `${packagePath}.protection_recovery.protection_summary.trip_refs[${index}]`,
          `Package protection summary cannot resolve trip ref ${tripRef}.`
        ));
      }
    }

    const inhibitRefs = Array.isArray(protectionSummary.inhibit_refs) ? protectionSummary.inhibit_refs : [];
    for (const [index, inhibitRef] of inhibitRefs.entries()) {
      if (!inhibitIds.has(inhibitRef)) {
        diagnostics.push(error(
          "package_protection_recovery.inhibit_ref.unresolved",
          `${packagePath}.protection_recovery.protection_summary.inhibit_refs[${index}]`,
          `Package protection summary cannot resolve inhibit ref ${inhibitRef}.`
        ));
      }
    }

    const recoveryRefs = Array.isArray(protectionSummary.recovery_request_refs) ? protectionSummary.recovery_request_refs : [];
    for (const [index, recoveryRef] of recoveryRefs.entries()) {
      if (!recoveryRequestIds.has(recoveryRef)) {
        diagnostics.push(error(
          "package_protection_recovery.recovery_request_ref.unresolved",
          `${packagePath}.protection_recovery.protection_summary.recovery_request_refs[${index}]`,
          `Package protection summary cannot resolve recovery request ref ${recoveryRef}.`
        ));
      }
    }

    const diagnosticSummaries = isRecord(protectionSummary.diagnostic_summaries)
      ? protectionSummary.diagnostic_summaries
      : {};
    for (const [summaryId, summary] of Object.entries(diagnosticSummaries)) {
      if (!isRecord(summary)) {
        continue;
      }

      const summaryTripRefs = Array.isArray(summary.trip_refs) ? summary.trip_refs : [];
      for (const [index, tripRef] of summaryTripRefs.entries()) {
        if (!tripIds.has(tripRef)) {
          diagnostics.push(error(
            "package_protection_recovery.diagnostic_ref.unresolved",
            `${packagePath}.protection_recovery.protection_summary.diagnostic_summaries.${summaryId}.trip_refs[${index}]`,
            `Package protection diagnostic summary ${summaryId} cannot resolve trip ref ${tripRef}.`
          ));
        }
      }

      const summaryInhibitRefs = Array.isArray(summary.inhibit_refs) ? summary.inhibit_refs : [];
      for (const [index, inhibitRef] of summaryInhibitRefs.entries()) {
        if (!inhibitIds.has(inhibitRef)) {
          diagnostics.push(error(
            "package_protection_recovery.diagnostic_ref.unresolved",
            `${packagePath}.protection_recovery.protection_summary.diagnostic_summaries.${summaryId}.inhibit_refs[${index}]`,
            `Package protection diagnostic summary ${summaryId} cannot resolve inhibit ref ${inhibitRef}.`
          ));
        }
      }
    }

    const defaultState = protectionSummary.default_state as PackageProtectionState | undefined;
    if (defaultState === "ready" && (
      tripRefs.length > 0 ||
      inhibitRefs.length > 0
    )) {
      diagnostics.push(error(
        "package_protection_recovery.state_summary.inconsistent",
        `${packagePath}.protection_recovery.protection_summary.default_state`,
        "Package protection summary cannot default to ready while active trip_refs or inhibit_refs are declared."
      ));
    }
  }

  for (const [requestId, request] of Object.entries(protectionRecovery.recovery_requests ?? {})) {
    if (!isRecord(request)) {
      continue;
    }

    const targetMember = members[String(request.target_member_id)];
    if (!isRecord(targetMember) || typeof targetMember.type_ref !== "string") {
      diagnostics.push(error(
        "package_protection_recovery.recovery_request.member.unresolved",
        `${packagePath}.protection_recovery.recovery_requests.${requestId}.target_member_id`,
        `Package recovery request ${requestId} cannot resolve target member ${String(request.target_member_id)}.`
      ));
      continue;
    }

    const operations = resolveLocalObjectTypeOperations(targetMember.type_ref, objectTypes);
    if (!operations || !isRecord(operations[String(request.target_operation_id)])) {
      diagnostics.push(error(
        "package_protection_recovery.recovery_request.target.unresolved",
        `${packagePath}.protection_recovery.recovery_requests.${requestId}.target_operation_id`,
        `Package recovery request ${requestId} cannot resolve target child operation ${String(request.target_operation_id)}.`
      ));
    }

    const blockedTripRefs = Array.isArray(request.blocked_by_trip_refs) ? request.blocked_by_trip_refs : [];
    for (const [index, tripRef] of blockedTripRefs.entries()) {
      if (!tripIds.has(tripRef)) {
        diagnostics.push(error(
          "package_protection_recovery.trip_ref.unresolved",
          `${packagePath}.protection_recovery.recovery_requests.${requestId}.blocked_by_trip_refs[${index}]`,
          `Package recovery request ${requestId} cannot resolve trip ref ${tripRef}.`
        ));
      }
    }

    const blockedInhibitRefs = Array.isArray(request.blocked_by_inhibit_refs) ? request.blocked_by_inhibit_refs : [];
    for (const [index, inhibitRef] of blockedInhibitRefs.entries()) {
      if (!inhibitIds.has(inhibitRef)) {
        diagnostics.push(error(
          "package_protection_recovery.inhibit_ref.unresolved",
          `${packagePath}.protection_recovery.recovery_requests.${requestId}.blocked_by_inhibit_refs[${index}]`,
          `Package recovery request ${requestId} cannot resolve inhibit ref ${inhibitRef}.`
        ));
      }
    }
  }
}

function validatePackageArbitrationSemantics(
  packageDefinition: Record<string, unknown>,
  packagePath: string,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  diagnostics: ValidationDiagnostic[]
): void {
  const arbitration = isRecord(packageDefinition.arbitration) ? packageDefinition.arbitration : null;
  if (!arbitration) {
    return;
  }

  for (const [laneId, lane] of Object.entries(arbitration.ownership_lanes ?? {})) {
    if (!isRecord(lane)) {
      continue;
    }

    const sourcePorts = Array.isArray(lane.source_ports) ? lane.source_ports : [];
    for (const [index, sourcePort] of sourcePorts.entries()) {
      validatePackageChildSourcePort(
        sourcePort,
        members,
        objectTypes,
        `${packagePath}.arbitration.ownership_lanes.${laneId}.source_ports[${index}]`,
        diagnostics,
        "package_arbitration.member.unresolved"
      );
    }
  }

  for (const [summaryId, summary] of Object.entries(arbitration.summary_outputs ?? {})) {
    if (!isRecord(summary) || !isRecord(summary.source)) {
      continue;
    }

    const summaryPath = `${packagePath}.arbitration.summary_outputs.${summaryId}`;
    const sourcePortDef = resolvePackageChildPortDef(summary.source, members, objectTypes);
    if (!sourcePortDef) {
      diagnostics.push(error(
        "package_arbitration.member.unresolved",
        `${summaryPath}.source`,
        `Package arbitration summary source ${String(summary.source.member_id)}.${String(summary.source.port_id)} cannot be resolved.`
      ));
      continue;
    }

    if (typeof summary.value_type === "string" && sourcePortDef.value_type !== summary.value_type) {
      diagnostics.push(error(
        "package_arbitration.summary_source.value_type_mismatch",
        `${summaryPath}.value_type`,
        `Package arbitration summary output ${summaryId} declares value_type ${summary.value_type}, but the source port resolves to ${sourcePortDef.value_type}.`
      ));
    }
  }

  for (const [monitorId, monitor] of Object.entries(arbitration.aggregate_monitors ?? {})) {
    if (!isRecord(monitor)) {
      continue;
    }

    const sourcePorts = Array.isArray(monitor.source_ports) ? monitor.source_ports : [];
    for (const [index, sourcePort] of sourcePorts.entries()) {
      validatePackageChildSourcePort(
        sourcePort,
        members,
        objectTypes,
        `${packagePath}.arbitration.aggregate_monitors.${monitorId}.source_ports[${index}]`,
        diagnostics,
        "package_arbitration.member.unresolved"
      );
    }
  }

  for (const [traceGroupId, traceGroup] of Object.entries(arbitration.trace_groups ?? {})) {
    if (!isRecord(traceGroup)) {
      continue;
    }

    const signals = Array.isArray(traceGroup.signals) ? traceGroup.signals : [];
    for (const [index, signal] of signals.entries()) {
      validatePackageChildSourcePort(
        signal,
        members,
        objectTypes,
        `${packagePath}.arbitration.trace_groups.${traceGroupId}.signals[${index}]`,
        diagnostics,
        "package_arbitration.member.unresolved"
      );
    }
  }

  const ownershipLaneIds = new Set(Object.keys(arbitration.ownership_lanes ?? {}));
  const commandLaneIds = new Set(Object.keys(arbitration.command_lanes ?? {}));

  const ownershipSummary = isRecord(arbitration.ownership_summary) ? arbitration.ownership_summary : null;
  if (ownershipSummary) {
    const activeLaneRefs = Array.isArray(ownershipSummary.active_lane_refs) ? ownershipSummary.active_lane_refs : [];
    for (const [index, laneRef] of activeLaneRefs.entries()) {
      if (!ownershipLaneIds.has(laneRef)) {
        diagnostics.push(error(
          "package_arbitration.ownership_lane_ref.unresolved",
          `${packagePath}.arbitration.ownership_summary.active_lane_refs[${index}]`,
          `Package ownership summary cannot resolve ownership lane ref ${laneRef}.`
        ));
      }
    }

    if (activeLaneRefs.length > 1) {
      diagnostics.push(error(
        "package_arbitration.ownership_summary.conflict",
        `${packagePath}.arbitration.ownership_summary.active_lane_refs`,
        "Package ownership summary cannot declare more than one active ownership lane."
      ));
    }
  }

  for (const [laneId, lane] of Object.entries(arbitration.command_lanes ?? {})) {
    if (!isRecord(lane)) {
      continue;
    }

    if (!ownershipLaneIds.has(String(lane.ownership_lane_ref))) {
      diagnostics.push(error(
        "package_arbitration.ownership_lane_ref.unresolved",
        `${packagePath}.arbitration.command_lanes.${laneId}.ownership_lane_ref`,
        `Package command lane ${laneId} cannot resolve ownership lane ref ${String(lane.ownership_lane_ref)}.`
      ));
    }

    const targetMember = members[String(lane.target_member_id)];
    if (!isRecord(targetMember) || typeof targetMember.type_ref !== "string") {
      diagnostics.push(error(
        "package_arbitration.member.unresolved",
        `${packagePath}.arbitration.command_lanes.${laneId}.target_member_id`,
        `Package command lane ${laneId} cannot resolve target member ${String(lane.target_member_id)}.`
      ));
    }

    const arbitrationResult = lane.arbitration_result;
    if (arbitrationResult === "blocked" && typeof lane.blocked_reason !== "string") {
      diagnostics.push(error(
        "package_arbitration.blocked_reason.missing",
        `${packagePath}.arbitration.command_lanes.${laneId}.blocked_reason`,
        `Package command lane ${laneId} must provide blocked_reason when arbitration_result is blocked.`
      ));
    }

    if (arbitrationResult === "denied" && typeof lane.denied_reason !== "string") {
      diagnostics.push(error(
        "package_arbitration.denied_reason.missing",
        `${packagePath}.arbitration.command_lanes.${laneId}.denied_reason`,
        `Package command lane ${laneId} must provide denied_reason when arbitration_result is denied.`
      ));
    }

    if (arbitrationResult === "superseded") {
      if (typeof lane.superseded_by_lane_ref !== "string") {
        diagnostics.push(error(
          "package_arbitration.superseded_ref.unresolved",
          `${packagePath}.arbitration.command_lanes.${laneId}.superseded_by_lane_ref`,
          `Package command lane ${laneId} must provide superseded_by_lane_ref when arbitration_result is superseded.`
        ));
      } else if (!commandLaneIds.has(lane.superseded_by_lane_ref)) {
        diagnostics.push(error(
          "package_arbitration.superseded_ref.unresolved",
          `${packagePath}.arbitration.command_lanes.${laneId}.superseded_by_lane_ref`,
          `Package command lane ${laneId} cannot resolve superseded_by_lane_ref ${lane.superseded_by_lane_ref}.`
        ));
      }
    }
  }

  const commandSummary = isRecord(arbitration.command_summary) ? arbitration.command_summary : null;
  if (!commandSummary) {
    return;
  }

  const summaryLists: Array<[string, unknown, string]> = [
    ["active_owner_lane_refs", commandSummary.active_owner_lane_refs, "package_arbitration.ownership_lane_ref.unresolved"],
    ["accepted_lane_refs", commandSummary.accepted_lane_refs, "package_arbitration.command_lane_ref.unresolved"],
    ["blocked_lane_refs", commandSummary.blocked_lane_refs, "package_arbitration.command_lane_ref.unresolved"],
    ["denied_lane_refs", commandSummary.denied_lane_refs, "package_arbitration.command_lane_ref.unresolved"],
    ["superseded_lane_refs", commandSummary.superseded_lane_refs, "package_arbitration.command_lane_ref.unresolved"]
  ];

  for (const [field, refs, code] of summaryLists) {
    const entries = Array.isArray(refs) ? refs : [];
    const knownIds = field === "active_owner_lane_refs" ? ownershipLaneIds : commandLaneIds;
    for (const [index, ref] of entries.entries()) {
      if (!knownIds.has(ref)) {
        diagnostics.push(error(
          code,
          `${packagePath}.arbitration.command_summary.${field}[${index}]`,
          `Package command summary cannot resolve ref ${ref} in ${field}.`
        ));
      }
    }
  }

  const activeOwnerLaneRefs = Array.isArray(commandSummary.active_owner_lane_refs) ? commandSummary.active_owner_lane_refs : [];
  if (activeOwnerLaneRefs.length > 1) {
    diagnostics.push(error(
      "package_arbitration.ownership_summary.conflict",
      `${packagePath}.arbitration.command_summary.active_owner_lane_refs`,
      "Package command summary cannot declare more than one active owner lane."
    ));
  }
}

function validatePackageOverrideHandoverSemantics(
  packageDefinition: Record<string, unknown>,
  packagePath: string,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  diagnostics: ValidationDiagnostic[]
): void {
  const overrideHandover = isRecord(packageDefinition.override_handover) ? packageDefinition.override_handover : null;
  if (!overrideHandover) {
    return;
  }

  for (const [holderId, holder] of Object.entries(overrideHandover.authority_holders ?? {})) {
    if (!isRecord(holder)) {
      continue;
    }

    const sourcePorts = Array.isArray(holder.source_ports) ? holder.source_ports : [];
    for (const [index, sourcePort] of sourcePorts.entries()) {
      validatePackageChildSourcePort(
        sourcePort,
        members,
        objectTypes,
        `${packagePath}.override_handover.authority_holders.${holderId}.source_ports[${index}]`,
        diagnostics,
        "package_override_handover.member.unresolved"
      );
    }
  }

  for (const [summaryId, summary] of Object.entries(overrideHandover.summary_outputs ?? {})) {
    if (!isRecord(summary) || !isRecord(summary.source)) {
      continue;
    }

    const summaryPath = `${packagePath}.override_handover.summary_outputs.${summaryId}`;
    const sourcePortDef = resolvePackageChildPortDef(summary.source, members, objectTypes);
    if (!sourcePortDef) {
      diagnostics.push(error(
        "package_override_handover.member.unresolved",
        `${summaryPath}.source`,
        `Package override/handover summary source ${String(summary.source.member_id)}.${String(summary.source.port_id)} cannot be resolved.`
      ));
      continue;
    }

    if (typeof summary.value_type === "string" && sourcePortDef.value_type !== summary.value_type) {
      diagnostics.push(error(
        "package_override_handover.summary_source.value_type_mismatch",
        `${summaryPath}.value_type`,
        `Package override/handover summary output ${summaryId} declares value_type ${summary.value_type}, but the source port resolves to ${sourcePortDef.value_type}.`
      ));
    }
  }

  for (const [monitorId, monitor] of Object.entries(overrideHandover.aggregate_monitors ?? {})) {
    if (!isRecord(monitor)) {
      continue;
    }

    const sourcePorts = Array.isArray(monitor.source_ports) ? monitor.source_ports : [];
    for (const [index, sourcePort] of sourcePorts.entries()) {
      validatePackageChildSourcePort(
        sourcePort,
        members,
        objectTypes,
        `${packagePath}.override_handover.aggregate_monitors.${monitorId}.source_ports[${index}]`,
        diagnostics,
        "package_override_handover.member.unresolved"
      );
    }
  }

  for (const [traceGroupId, traceGroup] of Object.entries(overrideHandover.trace_groups ?? {})) {
    if (!isRecord(traceGroup)) {
      continue;
    }

    const signals = Array.isArray(traceGroup.signals) ? traceGroup.signals : [];
    for (const [index, signal] of signals.entries()) {
      validatePackageChildSourcePort(
        signal,
        members,
        objectTypes,
        `${packagePath}.override_handover.trace_groups.${traceGroupId}.signals[${index}]`,
        diagnostics,
        "package_override_handover.member.unresolved"
      );
    }
  }

  const authorityHolderIds = new Set(Object.keys(overrideHandover.authority_holders ?? {}));
  const handoverRequestIds = new Set(Object.keys(overrideHandover.handover_requests ?? {}));
  const handoverSummary = isRecord(overrideHandover.handover_summary) ? overrideHandover.handover_summary : null;

  if (handoverSummary) {
    const currentHolderRef = typeof handoverSummary.current_holder_ref === "string" ? handoverSummary.current_holder_ref : "";
    if (!authorityHolderIds.has(currentHolderRef)) {
      diagnostics.push(error(
        "package_override_handover.current_holder_ref.unresolved",
        `${packagePath}.override_handover.handover_summary.current_holder_ref`,
        `Package override/handover summary cannot resolve current_holder_ref ${currentHolderRef}.`
      ));
    } else {
      const authorityHolders = isRecord(overrideHandover.authority_holders) ? overrideHandover.authority_holders : null;
      const holder = authorityHolders && isRecord(authorityHolders[currentHolderRef]) ? authorityHolders[currentHolderRef] : null;
      if (holder && typeof holder.lane === "string" && holder.lane !== handoverSummary.current_lane) {
        diagnostics.push(error(
          "package_override_handover.current_holder_lane.mismatch",
          `${packagePath}.override_handover.handover_summary.current_lane`,
          `Package override/handover summary current_lane ${String(handoverSummary.current_lane)} must match holder ${currentHolderRef} lane ${holder.lane}.`
        ));
      }
    }

    if (typeof handoverSummary.requested_holder_ref === "string" && !authorityHolderIds.has(handoverSummary.requested_holder_ref)) {
      diagnostics.push(error(
        "package_override_handover.requested_holder_ref.unresolved",
        `${packagePath}.override_handover.handover_summary.requested_holder_ref`,
        `Package override/handover summary cannot resolve requested_holder_ref ${handoverSummary.requested_holder_ref}.`
      ));
    }

    const summaryLists: Array<[string, unknown]> = [
      ["accepted_request_refs", handoverSummary.accepted_request_refs],
      ["blocked_request_refs", handoverSummary.blocked_request_refs],
      ["denied_request_refs", handoverSummary.denied_request_refs]
    ];

    for (const [field, refs] of summaryLists) {
      const entries = Array.isArray(refs) ? refs : [];
      for (const [index, ref] of entries.entries()) {
        if (!handoverRequestIds.has(ref)) {
          diagnostics.push(error(
            "package_override_handover.request_ref.unresolved",
            `${packagePath}.override_handover.handover_summary.${field}[${index}]`,
            `Package override/handover summary cannot resolve request ref ${ref} in ${field}.`
          ));
        }
      }
    }
  }

  for (const [requestId, request] of Object.entries(overrideHandover.handover_requests ?? {})) {
    if (!isRecord(request)) {
      continue;
    }

    const requestedHolderRef = String(request.requested_holder_ref);
    if (!authorityHolderIds.has(requestedHolderRef)) {
      diagnostics.push(error(
        "package_override_handover.requested_holder_ref.unresolved",
        `${packagePath}.override_handover.handover_requests.${requestId}.requested_holder_ref`,
        `Package handover request ${requestId} cannot resolve requested_holder_ref ${requestedHolderRef}.`
      ));
    }

    if (request.state === "blocked" && typeof request.blocked_reason !== "string") {
      diagnostics.push(error(
        "package_override_handover.blocked_reason.missing",
        `${packagePath}.override_handover.handover_requests.${requestId}.blocked_reason`,
        `Package handover request ${requestId} must provide blocked_reason when state is blocked.`
      ));
    }

    if (request.state === "denied" && typeof request.denied_reason !== "string") {
      diagnostics.push(error(
        "package_override_handover.denied_reason.missing",
        `${packagePath}.override_handover.handover_requests.${requestId}.denied_reason`,
        `Package handover request ${requestId} must provide denied_reason when state is denied.`
      ));
    }
  }
}

function validatePackageSupervisionSource(
  value: unknown,
  path: string,
  members: Record<string, unknown>,
  diagnostics: ValidationDiagnostic[]
): void {
  if (!isRecord(value)) {
    return;
  }

  if (typeof value.member_id === "string" && !members[value.member_id]) {
    diagnostics.push(error(
      "package_supervision.member.unresolved",
      `${path}.member_id`,
      `Package supervision source references unknown member \`${value.member_id}\`.`
    ));
  }
}

function validatePackageChildSourcePort(
  value: unknown,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null,
  path: string,
  diagnostics: ValidationDiagnostic[],
  unresolvedCode: string
): void {
  if (!validatePackageChildPortRef(value, path, diagnostics)) {
    return;
  }

  if (!resolvePackageChildPortDef(value, members, objectTypes)) {
    diagnostics.push(error(
      unresolvedCode,
      path,
      `Package child source ${String(value.member_id)}.${String(value.port_id)} cannot be resolved from package members.`
    ));
  }
}

function resolvePackageChildPortDef(
  value: unknown,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null
): PortDef | null {
  if (!isRecord(value) || typeof value.member_id !== "string" || typeof value.port_id !== "string") {
    return null;
  }

  const member = members[value.member_id];
  if (!isRecord(member) || typeof member.type_ref !== "string") {
    return null;
  }

  const ports = resolveLocalObjectTypePorts(member.type_ref, objectTypes);
  const port = ports && isRecord(ports[value.port_id]) ? ports[value.port_id] : null;
  if (!port) {
    return null;
  }

  return port as PortDef;
}

function resolveLocalObjectTypeParams(
  typeRef: string,
  objectTypes: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!objectTypes) {
    return null;
  }

  const localId = typeRef.startsWith("project:")
    ? typeRef.slice("project:".length)
    : typeRef;
  const objectType = objectTypes[localId];
  if (!isRecord(objectType) || !isRecord(objectType.interface) || !isRecord(objectType.interface.params)) {
    return null;
  }

  return objectType.interface.params;
}

function resolveLocalObjectTypePorts(
  typeRef: string,
  objectTypes: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (!objectTypes) {
    return null;
  }

  const localId = typeRef.startsWith("project:")
    ? typeRef.slice("project:".length)
    : typeRef;
  const objectType = objectTypes[localId];
  if (!isRecord(objectType) || !isRecord(objectType.interface) || !isRecord(objectType.interface.ports)) {
    return null;
  }

  return objectType.interface.ports;
}

function resolveLocalObjectTypeOperations(
  typeRef: unknown,
  objectTypes: Record<string, unknown> | null
): Record<string, unknown> | null {
  if (typeof typeRef !== "string" || !objectTypes) {
    return null;
  }

  const localId = typeRef.startsWith("project:")
    ? typeRef.slice("project:".length)
    : typeRef;
  const objectType = objectTypes[localId];
  if (
    !isRecord(objectType) ||
    !isRecord(objectType.facets) ||
    !isRecord(objectType.facets.operations) ||
    !isRecord(objectType.facets.operations.operations)
  ) {
    return null;
  }

  return objectType.facets.operations.operations;
}

function resolvePackageMemberPortValueType(
  memberId: unknown,
  portId: unknown,
  members: Record<string, unknown>,
  objectTypes: Record<string, unknown> | null
): string | null {
  if (typeof memberId !== "string" || typeof portId !== "string" || !members[memberId]) {
    return null;
  }

  const member = members[memberId];
  if (!isRecord(member) || typeof member.type_ref !== "string") {
    return null;
  }

  const ports = resolveLocalObjectTypePorts(member.type_ref, objectTypes);
  const port = ports && isRecord(ports[portId]) ? ports[portId] : null;
  return port && typeof port.value_type === "string" ? port.value_type : null;
}

function canResolveObjectLikeRef(typeRef: string, objectTypes: Record<string, unknown> | null): boolean {
  if (typeRef.startsWith("library:")) {
    return true;
  }

  if (!objectTypes) {
    return false;
  }

  const localId = typeRef.startsWith("project:")
    ? typeRef.slice("project:".length)
    : typeRef;
  return isRecord(objectTypes[localId]);
}

function validateStringRecord(
  value: Record<string, unknown>,
  field: string,
  path: string,
  code: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value)) {
    return;
  }

  const record = requireRecord(value, field, path, diagnostics);
  if (!record) {
    return;
  }

  for (const [key, entry] of Object.entries(record)) {
    if (typeof entry !== "string") {
      diagnostics.push(error(code, `${path}.${key}`, `Field \`${field}\` must contain only string values.`));
    }
  }
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

function requireOptionalStringArray(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (!(field in value)) {
    return;
  }

  const current = value[field];
  if (!Array.isArray(current) || current.some((entry) => typeof entry !== "string")) {
    diagnostics.push(error("field.string_array", path, `Field \`${field}\` must be an array of strings when present.`));
  }
}

function requireOptionalBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean when present.`));
  }
}

function requireOptionalNumber(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "number") {
    diagnostics.push(error("field.number", path, `Field \`${field}\` must be a number when present.`));
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

function requireOptionalOneOf(
  value: Record<string, unknown>,
  field: string,
  allowed: string[],
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  requireOneOf(value, field, allowed, path, diagnostics);
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

function getOptionalRecord(
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
