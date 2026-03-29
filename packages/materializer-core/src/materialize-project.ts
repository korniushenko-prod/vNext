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
import { materializeFrontendRequirements, validateActiveFrontendBindings } from "./helpers/frontend-requirements.js";
import { materializeNativeExecution } from "./helpers/native-execution.js";
import {
  collectRuntimeMonitors,
  collectRuntimeOperations,
  collectRuntimePersistenceSlots,
  collectRuntimeTraceGroups,
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
  const runtimePack = createEmptyRuntimePack(normalizedProject, {
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

  const typeRegistry = buildLocalTypeRegistry(normalizedProject);
  const context: MaterializeContext = {
    project: normalizedProject,
    options: {
      ...DEFAULT_OPTIONS,
      ...options
    },
    diagnostics,
    type_registry: typeRegistry
  };

  materializeSystemInstances(context, runtimePack);
  materializeSystemSignals(normalizedProject, runtimePack, diagnostics);
  materializeHardwareBindings(normalizedProject, runtimePack);
  validateActiveFrontendBindings(runtimePack, diagnostics);

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

    const runtimeInstance = materializeSystemRuntimeInstance(
      context.project.meta.project_id,
      instanceId,
      instance,
      objectType
    );
    const frontendRequirements = materializeFrontendRequirements(
      instanceId,
      objectType,
      runtimeInstance.params,
      "materialize_system_instances",
      `$.system.instances.${instanceId}`
    );
    runtimeInstance.native_execution = materializeNativeExecution(
      objectType.implementation?.native,
      frontendRequirements.mode,
      frontendRequirements.active_requirement_ids
    );
    runtimePack.instances[instanceId] = runtimeInstance;
    Object.assign(runtimePack.operations, collectRuntimeOperations(instanceId, objectType));
    Object.assign(runtimePack.trace_groups, collectRuntimeTraceGroups(instanceId, objectType));
    Object.assign(runtimePack.monitors, collectRuntimeMonitors(instanceId, objectType));
    Object.assign(runtimePack.frontend_requirements, frontendRequirements.requirements);
    Object.assign(runtimePack.persistence_slots, collectRuntimePersistenceSlots(instanceId, objectType));
    context.diagnostics.push(...frontendRequirements.diagnostics);

    expandCompositionRecursively(
      runtimePack,
      context.type_registry,
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

function materializeHardwareBindings(project: ProjectModel, runtimePack: RuntimePack): void {
  for (const [bindingId, bindingValue] of Object.entries(project.hardware?.bindings ?? {})) {
    if (!isHardwareBindingLike(bindingValue)) {
      continue;
    }

    runtimePack.resources[bindingId] = {
      id: bindingValue.id,
      binding_kind: bindingValue.binding_kind,
      instance_id: bindingValue.instance_id,
      port_id: bindingValue.port_id,
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
