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
  RuntimeResolvedParam
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

    const runtimeInstance = materializeSystemRuntimeInstance(instanceId, instance, objectType);
    runtimePack.instances[instanceId] = runtimeInstance;

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
    source_scope: {
      kind: "system",
      owner_id: objectType.id
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
        source: "override"
      };
      continue;
    }

    params[paramId] = {
      value: paramDef.default ?? null,
      value_type: paramDef.value_type,
      source: "default"
    };
  }

  return params;
}

function objectFromEntries<T>(entries: Array<[string, T]>): Record<string, T> {
  return Object.fromEntries(entries) as Record<string, T>;
}
