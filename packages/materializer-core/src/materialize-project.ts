import {
  validateProjectModel,
  type ObjectType,
  type ProjectModel
} from "@universal-plc/project-schema";
import type {
  RuntimeAlarm,
  RuntimeInstance,
  RuntimePack,
  RuntimePort,
  RuntimeResolvedParam,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import { error, hasErrors } from "./diagnostics.js";
import type {
  MaterializeContext,
  MaterializeOptions,
  MaterializeResult
} from "./types.js";
import { buildLocalTypeRegistry, resolveLocalTypeRef } from "./phases/build-type-registry.js";
import { createEmptyRuntimePack } from "./phases/finalize-pack.js";
import { expandCompositionRecursively } from "./phases/materialize-composition.js";
import { materializeSystemSignals } from "./phases/materialize-system-signals.js";
import { normalizeProject } from "./phases/normalize-project.js";
import { flattenPackageInstances } from "./packages.js";
import { materializePackageArbitration } from "./helpers/package-arbitration.js";
import { materializePackageCoordination } from "./helpers/package-coordination.js";
import { materializePackageModePhase } from "./helpers/package-mode-phase.js";
import { materializePackageOverrideHandover } from "./helpers/package-override-handover.js";
import { materializePackagePermissiveInterlock } from "./helpers/package-permissive-interlock.js";
import { materializePackageProtectionRecovery } from "./helpers/package-protection-recovery.js";
import { materializePackageSupervision } from "./helpers/package-supervision.js";
import { materializeFrontendRequirements, validateActiveFrontendBindings } from "./helpers/frontend-requirements.js";
import { materializeCommsMetadata } from "./helpers/comms.js";
import { materializeNativeExecution } from "./helpers/native-execution.js";
import { resolveTemplateBackedInstance } from "./templates.js";
import {
  collectRuntimeMonitors,
  collectRuntimeOperations,
  collectRuntimePersistenceSlots,
  collectRuntimeTraceGroups,
  deriveRuntimeOperationRuntimeContract,
  toRuntimeParamMetadata
} from "./helpers/runtime-facets.js";

const DEFAULT_OPTIONS: Required<MaterializeOptions> = {
  pack_id: "",
  generated_at: "",
  include_partial_pack: true
};

export function materializeProject(
  inputProject: ProjectModel,
  options: MaterializeOptions = {}
): MaterializeResult {
  const diagnostics = [];
  const structural = validateProjectModel(inputProject);

  for (const entry of structural.diagnostics ?? []) {
    diagnostics.push({
      code: entry.code,
      severity: entry.severity,
      phase: "structural_validation" as const,
      path: entry.path,
      message: entry.message
    });
  }

  const normalizedProject = normalizeProject(inputProject);
  const flattenedProject = flattenPackageInstances(normalizedProject);
  const runtimePack = createEmptyRuntimePack(flattenedProject, {
    ...DEFAULT_OPTIONS,
    ...options
  });

  if (!structural.ok && !(options.include_partial_pack ?? true)) {
    return {
      ok: false,
      pack: runtimePack,
      diagnostics
    };
  }

  const typeRegistry = buildLocalTypeRegistry(flattenedProject);
  const context: MaterializeContext = {
    project: flattenedProject,
    options: {
      ...DEFAULT_OPTIONS,
      ...options
    },
    diagnostics,
    type_registry: typeRegistry
  };

  diagnostics.push(...validatePackageFlatteningSemantics(flattenedProject, typeRegistry));
  materializeSystemInstances(context, runtimePack);
  materializeSystemSignals(flattenedProject, runtimePack, diagnostics);
  materializePackageSupervision(flattenedProject, runtimePack, diagnostics);
  materializePackageCoordination(flattenedProject, runtimePack, diagnostics);
  materializePackageModePhase(flattenedProject, runtimePack, diagnostics);
  materializePackagePermissiveInterlock(flattenedProject, runtimePack, diagnostics);
  materializePackageProtectionRecovery(flattenedProject, runtimePack, diagnostics);
  materializePackageArbitration(flattenedProject, runtimePack, diagnostics);
  materializePackageOverrideHandover(flattenedProject, runtimePack, diagnostics);
  materializeHardwareBindings(flattenedProject, runtimePack);
  validateActiveFrontendBindings(runtimePack, diagnostics);
  if (Object.keys(runtimePack.operations).length > 0) {
    runtimePack.operation_runtime_contract = deriveRuntimeOperationRuntimeContract(runtimePack.operations);
  }

  return {
    ok: !hasErrors(diagnostics),
    pack: runtimePack,
    diagnostics
  };
}

function materializeSystemInstances(
  context: MaterializeContext,
  runtimePack: RuntimePack
): void {
  for (const [instanceId, instance] of Object.entries(context.project.system.instances ?? {})) {
    const objectType = resolveLocalTypeRef<ObjectType>(context.type_registry, instance.type_ref);
    if (!objectType) {
      context.diagnostics.push(error(
        "build_type_registry",
        "system_instance.type_ref.unresolved",
        `$.system.instances.${instanceId}.type_ref`,
        `Cannot resolve type_ref ${instance.type_ref}.`
      ));
      continue;
    }

    const templateResolution = resolveTemplateBackedInstance(
      context.project,
      instance,
      objectType,
      "resolve_templates",
      `$.system.instances.${instanceId}`
    );
    context.diagnostics.push(...templateResolution.diagnostics);
    if (templateResolution.fatal) {
      continue;
    }
    const resolvedInstance = templateResolution.resolved_instance;

    const runtimeInstance = materializeSystemRuntimeInstance(
      context.project.meta.project_id,
      instanceId,
      resolvedInstance,
      objectType
    );
    const frontendRequirements = materializeFrontendRequirements(
      instanceId,
      objectType,
      runtimeInstance.params,
      "materialize_system_instances",
      `$.system.instances.${instanceId}`
    );
    const commsMetadata = materializeCommsMetadata(
      context.project,
      resolvedInstance,
      objectType,
      runtimeInstance.params,
      "materialize_system_instances",
      `$.system.instances.${instanceId}`
    );
    runtimeInstance.native_execution = materializeNativeExecution(
      objectType.implementation?.native,
      frontendRequirements.mode ?? commsMetadata.execution.mode,
      frontendRequirements.active_requirement_ids,
      commsMetadata.execution.config_template
    );
    const runtimeOperations = collectRuntimeOperations(
      instanceId,
      objectType,
      "materialize_system_instances",
      `$.definitions.object_types.${objectType.id}.facets.operations.operations`
    );
    runtimePack.instances[instanceId] = runtimeInstance;
    Object.assign(runtimePack.operations, runtimeOperations.operations);
    Object.assign(runtimePack.trace_groups, collectRuntimeTraceGroups(instanceId, objectType));
    Object.assign(runtimePack.monitors, collectRuntimeMonitors(instanceId, objectType));
    Object.assign(runtimePack.frontend_requirements, frontendRequirements.requirements);
    Object.assign(runtimePack.persistence_slots, collectRuntimePersistenceSlots(instanceId, objectType));
    context.diagnostics.push(...runtimeOperations.diagnostics);
    context.diagnostics.push(...frontendRequirements.diagnostics);
    context.diagnostics.push(...commsMetadata.diagnostics);

    expandCompositionRecursively(
      runtimePack,
      context.type_registry,
      context.project,
      instanceId,
      objectType,
      runtimeInstance,
      context.diagnostics
    );
  }
}

function materializeSystemRuntimeInstance(
  projectOwnerId: string,
  runtimeInstanceId: string,
  instance: ProjectModel["system"]["instances"][string],
  objectType: ObjectType
): RuntimeInstance {
  const ports = objectFromEntries(Object.entries(objectType.interface?.ports ?? {}).map(([portId, port]) => [
    portId,
    materializePort(port)
  ]));

  const params = materializeTopLevelParams(instance, objectType);
  const alarms = objectFromEntries(Object.entries(objectType.interface?.alarms ?? {}).map(([alarmId, alarm]) => [
    alarmId,
    materializeAlarm(alarm)
  ]));

  return {
    id: runtimeInstanceId,
    type_ref: instance.type_ref,
    title: instance.title,
    enabled: instance.enabled ?? true,
    ports,
    params,
    alarms,
    native_execution: materializeNativeExecution(objectType.implementation?.native),
    source_scope: {
      kind: "system",
      owner_id: projectOwnerId
    }
  };
}

function materializePort(port: ObjectType["interface"]["ports"][string]): RuntimePort {
  return {
    id: port.id,
    direction: port.direction,
    channel_kind: port.channel_kind,
    value_type: port.value_type
  };
}

function materializeAlarm(alarm: ObjectType["interface"]["alarms"][string]): RuntimeAlarm {
  return {
    id: alarm.id,
    severity: alarm.severity
  };
}

function materializeTopLevelParams(
  instance: ProjectModel["system"]["instances"][string],
  objectType: ObjectType
): Record<string, RuntimeResolvedParam> {
  const params: Record<string, RuntimeResolvedParam> = {};

  for (const [paramId, paramDef] of Object.entries(objectType.interface?.params ?? {})) {
    const override = instance.param_values?.[paramId];
    if (override && override.kind === "literal") {
      params[paramId] = {
        value: override.value,
        value_type: paramDef.value_type,
        source: "instance_override",
        metadata: toRuntimeParamMetadata(paramDef),
        provenance: {
          owner_id: instance.id,
          param_id: paramId,
          source_layer: "system"
        }
      };
      continue;
    }

    params[paramId] = {
      value: paramDef.default ?? null,
      value_type: paramDef.value_type,
      source: "default",
      metadata: toRuntimeParamMetadata(paramDef)
    };
  }

  return params;
}

function objectFromEntries<T>(entries: Array<[string, T]>): Record<string, T> {
  return Object.fromEntries(entries) as Record<string, T>;
}

function validatePackageFlatteningSemantics(
  project: ProjectModel,
  typeRegistry: Map<string, unknown>
) {
  const diagnostics = [];
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    if (!packageDefinition) {
      continue;
    }

    const preset = packageInstance.preset_ref ? packageDefinition.presets?.[packageInstance.preset_ref] : undefined;

    for (const member of Object.values(packageDefinition.members ?? {})) {
      const objectType = resolveLocalTypeRef<ObjectType>(typeRegistry, member.type_ref);
      if (!objectType) {
        continue;
      }

      const knownParams = new Set(Object.keys(objectType.interface?.params ?? {}));
      const memberOverride = packageInstance.member_overrides?.[member.id];
      const presetMemberDefaults = preset?.member_defaults?.[member.id];

      diagnostics.push(...validateKnownPackageParams(
        knownParams,
        member.defaults?.param_values,
        `$.definitions.packages.${packageDefinition.id}.members.${member.id}.defaults.param_values`
      ));
      diagnostics.push(...validateKnownPackageParams(
        knownParams,
        member.param_values,
        `$.definitions.packages.${packageDefinition.id}.members.${member.id}.param_values`
      ));
      diagnostics.push(...validateKnownPackageParams(
        knownParams,
        presetMemberDefaults?.param_values,
        `$.definitions.packages.${packageDefinition.id}.presets.${preset?.id}.member_defaults.${member.id}.param_values`
      ));
      diagnostics.push(...validateKnownPackageParams(
        knownParams,
        memberOverride?.param_values,
        `$.system.packages.${packageInstance.id}.member_overrides.${member.id}.param_values`
      ));
    }
  }

  return diagnostics;
}

function validateKnownPackageParams(
  knownParams: Set<string>,
  paramValues: Record<string, unknown> | undefined,
  pathBase: string
) {
  const diagnostics = [];
  for (const paramId of Object.keys(paramValues ?? {})) {
    if (knownParams.has(paramId)) {
      continue;
    }

    diagnostics.push(error(
      "flatten_packages",
      "package_member.param.unknown",
      `${pathBase}.${paramId}`,
      `Package member parameter \`${paramId}\` is not defined on the effective object type.`
    ));
  }

  return diagnostics;
}

function materializeHardwareBindings(project: ProjectModel, runtimePack: RuntimePack): void {
  for (const [bindingId, bindingValue] of Object.entries(project.hardware?.bindings ?? {})) {
    if (!isHardwareBindingLike(bindingValue)) {
      continue;
    }

    runtimePack.resources[bindingId] = {
      id: bindingValue.id,
      binding_kind: bindingValue.binding_kind,
      instance_id: bindingValue.instance_id,
      ...(bindingValue.port_id !== undefined ? { port_id: bindingValue.port_id } : {}),
      config: isRecord(bindingValue.config) ? { ...bindingValue.config } : {}
    } satisfies RuntimeResourceBinding;
  }
}

function isHardwareBindingLike(value: unknown): value is {
  id: string;
  binding_kind: RuntimeResourceBinding["binding_kind"];
  instance_id: string;
  port_id?: string;
  config?: Record<string, unknown>;
} {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.binding_kind === "string" &&
    typeof value.instance_id === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
