import type {
  ObjectInstance,
  ObjectType
} from "@universal-plc/project-schema";
import type {
  RuntimeConnection,
  RuntimeInstance,
  RuntimePack,
  RuntimeResolvedParam
} from "@universal-plc/runtime-pack-schema";
import type { MaterializerDiagnostic } from "../types.js";
import { error } from "../diagnostics.js";
import { compositionConnectionId, qualifyInstanceId } from "../helpers/ids.js";
import { resolveLocalTypeRef } from "./build-type-registry.js";

export function expandCompositionRecursively(
  runtimePack: RuntimePack,
  registry: Map<string, unknown>,
  parentRuntimeInstanceId: string,
  parentType: ObjectType,
  parentRuntimeInstance: RuntimeInstance,
  diagnostics: MaterializerDiagnostic[]
): void {
  const composition = parentType.implementation?.composition;
  if (!composition) {
    return;
  }

  for (const [childId, childInstance] of Object.entries(composition.instances ?? {})) {
    const childType = resolveLocalTypeRef<ObjectType>(registry, childInstance.type_ref);
    if (!childType) {
      diagnostics.push(error(
        "expand_composition",
        "composition.child_type.unresolved",
        `$.definitions.object_types.${parentType.id}.implementation.composition.instances.${childId}.type_ref`,
        `Cannot resolve child type_ref ${childInstance.type_ref}.`
      ));
      continue;
    }

    const runtimeInstanceId = qualifyInstanceId(parentRuntimeInstanceId, childId);
    const childRuntimeInstance = materializeRuntimeInstanceFromType(
      runtimeInstanceId,
      childInstance,
      childType,
      parentRuntimeInstance,
      parentType.id,
      diagnostics
    );

    runtimePack.instances[runtimeInstanceId] = childRuntimeInstance;

    expandCompositionRecursively(
      runtimePack,
      registry,
      runtimeInstanceId,
      childType,
      childRuntimeInstance,
      diagnostics
    );
  }

  for (const [routeId, route] of Object.entries(composition.routes ?? {})) {
    const source = resolveCompositionEndpoint(parentRuntimeInstanceId, route.from);
    const target = resolveCompositionEndpoint(parentRuntimeInstanceId, route.to);
    if (!source || !target) {
      diagnostics.push(error(
        "expand_composition",
        "composition.route.endpoint.invalid",
        `$.definitions.object_types.${parentType.id}.implementation.composition.routes.${routeId}`,
        "Cannot resolve composition route endpoint."
      ));
      continue;
    }

    const sourcePort = runtimePack.instances[source.instance_id]?.ports?.[source.port_id];
    if (!sourcePort) {
      diagnostics.push(error(
        "expand_composition",
        "composition.route.source.unresolved",
        `$.definitions.object_types.${parentType.id}.implementation.composition.routes.${routeId}.from`,
        `Cannot resolve source port ${source.instance_id}.${source.port_id}.`
      ));
      continue;
    }

    const targetPort = runtimePack.instances[target.instance_id]?.ports?.[target.port_id];
    if (!targetPort) {
      diagnostics.push(error(
        "expand_composition",
        "composition.route.target.unresolved",
        `$.definitions.object_types.${parentType.id}.implementation.composition.routes.${routeId}.to`,
        `Cannot resolve target port ${target.instance_id}.${target.port_id}.`
      ));
      continue;
    }

    const connectionId = compositionConnectionId(parentRuntimeInstanceId, routeId);
    const connection: RuntimeConnection = {
      id: connectionId,
      source,
      target,
      channel_kind: sourcePort.channel_kind,
      value_type: sourcePort.value_type,
      origin: {
        scope_kind: "composition",
        owner_id: parentType.id,
        route_id: routeId
      }
    };

    runtimePack.connections[connectionId] = connection;
  }
}

function materializeRuntimeInstanceFromType(
  runtimeInstanceId: string,
  instance: ObjectInstance,
  objectType: ObjectType,
  parentRuntimeInstance: RuntimeInstance,
  ownerTypeId: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeInstance {
  const ports = objectFromEntries(Object.entries(objectType.interface?.ports ?? {}).map(([portId, port]) => [
    portId,
    {
      id: port.id,
      direction: port.direction,
      channel_kind: port.channel_kind,
      value_type: port.value_type
    }
  ]));

  const params = resolveParams(instance, objectType, parentRuntimeInstance, diagnostics);

  const alarms = objectFromEntries(Object.entries(objectType.interface?.alarms ?? {}).map(([alarmId, alarm]) => [
    alarmId,
    {
      id: alarm.id,
      severity: alarm.severity
    }
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
      kind: "composition",
      owner_id: ownerTypeId
    }
  };
}

function resolveParams(
  instance: ObjectInstance,
  objectType: ObjectType,
  parentRuntimeInstance: RuntimeInstance,
  diagnostics: MaterializerDiagnostic[]
): Record<string, RuntimeResolvedParam> {
  const result: Record<string, RuntimeResolvedParam> = {};

  for (const [paramId, paramDef] of Object.entries(objectType.interface?.params ?? {})) {
    const override = instance.param_values?.[paramId];
    if (!override) {
      result[paramId] = {
        value: paramDef.default ?? null,
        value_type: paramDef.value_type,
        source: "default"
      };
      continue;
    }

    if (override.kind === "literal") {
      result[paramId] = {
        value: override.value,
        value_type: paramDef.value_type,
        source: "override"
      };
      continue;
    }

    if (override.kind === "parent_param") {
      const inherited = parentRuntimeInstance.params?.[override.param_id];
      if (!inherited) {
        diagnostics.push(error(
          "expand_composition",
          "composition.param.parent_param.unresolved",
          `$.implementation.composition.instances.${instance.id}.param_values.${paramId}`,
          `Cannot resolve parent param ${override.param_id} for child param ${paramId}.`
        ));
        result[paramId] = {
          value: paramDef.default ?? null,
          value_type: paramDef.value_type,
          source: "default"
        };
        continue;
      }

      result[paramId] = {
        value: inherited.value,
        value_type: paramDef.value_type,
        source: "materialized"
      };
    }
  }

  return result;
}

function resolveCompositionEndpoint(
  parentRuntimeInstanceId: string,
  endpoint: unknown
): { instance_id: string; port_id: string } | undefined {
  if (!endpoint || typeof endpoint !== "object") {
    return undefined;
  }

  const record = endpoint as Record<string, unknown>;
  if (record.kind === "parent_port" && typeof record.port_id === "string") {
    return {
      instance_id: parentRuntimeInstanceId,
      port_id: record.port_id
    };
  }

  if (
    record.kind === "instance_port" &&
    typeof record.instance_id === "string" &&
    typeof record.port_id === "string"
  ) {
    return {
      instance_id: qualifyInstanceId(parentRuntimeInstanceId, record.instance_id),
      port_id: record.port_id
    };
  }

  return undefined;
}

function objectFromEntries<T>(entries: Array<[string, T]>): Record<string, T> {
  return Object.fromEntries(entries) as Record<string, T>;
}
