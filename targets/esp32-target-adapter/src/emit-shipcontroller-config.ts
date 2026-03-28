import type {
  RuntimeAlarm,
  RuntimeConnection,
  RuntimePack,
  RuntimePort,
  RuntimeResolvedParam,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";
import type {
  ShipControllerArtifactAlarm,
  ShipControllerArtifactConnection,
  ShipControllerArtifactInstance,
  ShipControllerArtifactParam,
  ShipControllerArtifactPort,
  ShipControllerArtifactResource,
  ShipControllerConfigArtifact
} from "./types.js";

export function emitShipControllerConfigArtifact(pack: RuntimePack): ShipControllerConfigArtifact {
  return {
    meta: {
      artifact_version: "0.1.0",
      target_id: "esp32-shipcontroller",
      pack_id: pack.pack_id,
      generated_at: pack.source.generated_at ?? new Date(0).toISOString(),
      source_project_id: pack.source.project_id
    },
    instances: sortedKeys(pack.instances).map((instanceId) => {
      const instance = pack.instances[instanceId];
      return materializeInstance(instance);
    }),
    connections: sortedKeys(pack.connections).map((connectionId) => ({
      ...pack.connections[connectionId]
    })),
    resources: sortedKeys(pack.resources).map((resourceId) => ({
      ...pack.resources[resourceId],
      config: { ...pack.resources[resourceId].config }
    })),
    native_execution_placeholders: sortedKeys(pack.instances).map((instanceId) => ({
      instance_id: instanceId,
      status: "unresolved",
      reason: "native_seam_not_available"
    }))
  };
}

function materializeInstance(instance: RuntimePack["instances"][string]): ShipControllerArtifactInstance {
  return {
    id: instance.id,
    type_ref: instance.type_ref,
    title: instance.title,
    enabled: instance.enabled,
    ports: materializePorts(instance.ports),
    params: materializeParams(instance.params),
    alarms: materializeAlarms(instance.alarms)
  };
}

function materializePorts(ports: Record<string, RuntimePort>): ShipControllerArtifactPort[] {
  return sortedKeys(ports).map((portId) => ({
    ...ports[portId]
  }));
}

function materializeParams(params: Record<string, RuntimeResolvedParam>): ShipControllerArtifactParam[] {
  return sortedKeys(params).map((paramId) => ({
    id: paramId,
    value: params[paramId].value,
    value_type: params[paramId].value_type,
    source: params[paramId].source
  }));
}

function materializeAlarms(alarms: Record<string, RuntimeAlarm>): ShipControllerArtifactAlarm[] {
  return sortedKeys(alarms).map((alarmId) => ({
    ...alarms[alarmId]
  }));
}
