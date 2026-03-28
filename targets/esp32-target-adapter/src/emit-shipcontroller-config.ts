import type {
  RuntimeConnection,
  RuntimePack,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";
import type {
  ShipControllerConfigArtifact,
  ShipControllerDigitalInputArtifact,
  ShipControllerDigitalOutputArtifact,
  ShipControllerTimedRelayArtifact
} from "./types.js";

export function emitShipControllerConfigArtifact(pack: RuntimePack): ShipControllerConfigArtifact {
  return {
    schema_version: "0.1.0",
    target_kind: "esp32.shipcontroller.v1",
    source_pack_id: pack.pack_id,
    capability_profile: "esp32-basic-io",
    artifacts: {
      digital_inputs: emitDigitalInputs(pack),
      digital_outputs: emitDigitalOutputs(pack),
      timed_relays: emitTimedRelays(pack)
    },
    diagnostics: []
  };
}

function emitDigitalInputs(pack: RuntimePack): ShipControllerDigitalInputArtifact[] {
  return sortedKeys(pack.resources)
    .map((resourceId) => pack.resources[resourceId])
    .filter((resource) => resource.binding_kind === "digital_in")
    .map((resource) => {
      const instance = pack.instances[resource.instance_id];
      return {
        id: `di_${resource.instance_id}`,
        instance_id: resource.instance_id,
        pin: numberConfig(resource, "pin"),
        pullup: booleanConfig(resource, "pullup"),
        debounce_ms: numericParam(instance?.params?.debounce_ms?.value)
      };
    });
}

function emitDigitalOutputs(pack: RuntimePack): ShipControllerDigitalOutputArtifact[] {
  return sortedKeys(pack.resources)
    .map((resourceId) => pack.resources[resourceId])
    .filter((resource) => resource.binding_kind === "digital_out")
    .map((resource) => {
      const instance = pack.instances[resource.instance_id];
      return {
        id: `do_${resource.instance_id}`,
        instance_id: resource.instance_id,
        pin: numberConfig(resource, "pin"),
        active_high: booleanConfig(resource, "active_high") ?? booleanParam(instance?.params?.active_high?.value) ?? true
      };
    });
}

function emitTimedRelays(pack: RuntimePack): ShipControllerTimedRelayArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.timed_relay.v1")
    .map((instance) => {
      const triggerConnection = findIncomingConnection(pack, instance.id, "trigger_cmd");
      const outputConnection = findOutgoingConnection(pack, instance.id, "relay_out");

      if (!triggerConnection || !outputConnection) {
        throw new Error(`Timed relay instance ${instance.id} is missing required trigger/output connections.`);
      }

      return {
        id: instance.id,
        native_kind: instance.native_execution?.native_kind ?? "std.timed_relay.v1",
        pulse_time_ms: numericParam(instance.params.pulse_time_ms?.value) ?? 0,
        retriggerable: booleanParam(instance.params.retriggerable?.value) ?? false,
        require_enable: booleanParam(instance.params.require_enable?.value) ?? false,
        output_inverted: booleanParam(instance.params.output_inverted?.value) ?? false,
        trigger_source: {
          instance_id: triggerConnection.source.instance_id,
          port_id: triggerConnection.source.port_id,
          connection_id: triggerConnection.id
        },
        output_target: {
          instance_id: outputConnection.target.instance_id,
          port_id: outputConnection.target.port_id,
          connection_id: outputConnection.id
        }
      };
    });
}

function findIncomingConnection(
  pack: RuntimePack,
  instanceId: string,
  portId: string
): RuntimeConnection | undefined {
  return sortedKeys(pack.connections)
    .map((connectionId) => pack.connections[connectionId])
    .find((connection) => connection.target.instance_id === instanceId && connection.target.port_id === portId);
}

function findOutgoingConnection(
  pack: RuntimePack,
  instanceId: string,
  portId: string
): RuntimeConnection | undefined {
  return sortedKeys(pack.connections)
    .map((connectionId) => pack.connections[connectionId])
    .find((connection) => connection.source.instance_id === instanceId && connection.source.port_id === portId);
}

function numberConfig(resource: RuntimeResourceBinding, key: string): number {
  return Number(resource.config[key] ?? 0);
}

function booleanConfig(resource: RuntimeResourceBinding, key: string): boolean | undefined {
  const value = resource.config[key];
  return typeof value === "boolean" ? value : undefined;
}

function numericParam(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function booleanParam(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}
