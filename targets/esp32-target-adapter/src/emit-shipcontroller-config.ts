import type {
  RuntimeConnection,
  RuntimeFrontendRequirement,
  RuntimePack,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";
import type {
  ShipControllerAnalogInputArtifact,
  ShipControllerConfigArtifact,
  ShipControllerDigitalInputArtifact,
  ShipControllerDigitalOutputArtifact,
  ShipControllerPidControllerArtifact,
  ShipControllerPulseFlowmeterArtifact,
  ShipControllerPulseFlowmeterSourceRef,
  ShipControllerPidEndpointRef,
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
      analog_inputs: emitAnalogInputs(pack),
      digital_outputs: emitDigitalOutputs(pack),
      timed_relays: emitTimedRelays(pack),
      pulse_flowmeters: emitPulseFlowmeters(pack),
      pid_controllers: emitPidControllers(pack)
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

function emitAnalogInputs(pack: RuntimePack): ShipControllerAnalogInputArtifact[] {
  return sortedKeys(pack.resources)
    .map((resourceId) => pack.resources[resourceId])
    .filter((resource) => resource.binding_kind === "analog_in")
    .map((resource) => ({
      id: `ai_${resource.instance_id}`,
      instance_id: resource.instance_id,
      pin: numberConfig(resource, "pin"),
      attenuation_db: numericConfig(resource, "attenuation_db"),
      sample_window_ms: numericConfig(resource, "sample_window_ms")
    }));
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

function emitPulseFlowmeters(pack: RuntimePack): ShipControllerPulseFlowmeterArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.pulse_flowmeter.v1")
    .map((instance) => {
      const execution = instance.native_execution;
      const frontendRequirementId = execution?.frontend_requirement_ids?.[0];
      if (!execution?.mode || !frontendRequirementId) {
        throw new Error(`Pulse flowmeter instance ${instance.id} is missing native execution mode or active frontend requirement.`);
      }

      const frontendRequirement = pack.frontend_requirements[frontendRequirementId];
      if (!frontendRequirement) {
        throw new Error(`Pulse flowmeter instance ${instance.id} references unknown frontend requirement ${frontendRequirementId}.`);
      }

      const source = resolvePulseFlowmeterSource(pack, frontendRequirementId, frontendRequirement);
      return {
        id: instance.id,
        native_kind: execution.native_kind,
        sensor_mode: execution.mode,
        k_factor: numericParam(instance.params.k_factor?.value) ?? 0,
        filter_window_ms: numericParam(instance.params.filter_window_ms?.value) ?? 0,
        threshold_on: numericParam(instance.params.threshold_on?.value),
        threshold_off: numericParam(instance.params.threshold_off?.value),
        stale_timeout_ms: numericParam(instance.params.stale_timeout_ms?.value) ?? 0,
        persistence_slot_id: findPersistenceSlotId(pack, instance.id),
        frontend_requirement_ids: [...(execution.frontend_requirement_ids ?? [])],
        source
      };
    });
}

function emitPidControllers(pack: RuntimePack): ShipControllerPidControllerArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.pid_controller.v1")
    .map((instance) => {
      const execution = instance.native_execution;
      const pvRequirementId = execution?.frontend_requirement_ids?.find((entry) => entry.endsWith("_pv_source"));
      const mvRequirementId = execution?.frontend_requirement_ids?.find((entry) => entry.endsWith("_mv_output"));
      if (!pvRequirementId || !mvRequirementId) {
        throw new Error(`PID controller instance ${instance.id} is missing required frontend requirement ids.`);
      }

      const pvRequirement = pack.frontend_requirements[pvRequirementId];
      const mvRequirement = pack.frontend_requirements[mvRequirementId];
      if (!pvRequirement || !mvRequirement) {
        throw new Error(`PID controller instance ${instance.id} references unknown frontend requirements.`);
      }

      return {
        id: instance.id,
        native_kind: execution?.native_kind ?? "std.pid_controller.v1",
        kp: numericParam(instance.params.kp?.value) ?? 0,
        ti: numericParam(instance.params.ti?.value) ?? 0,
        td: numericParam(instance.params.td?.value) ?? 0,
        sample_time_ms: numericParam(instance.params.sample_time_ms?.value) ?? 0,
        output_min: numericParam(instance.params.output_min?.value) ?? 0,
        output_max: numericParam(instance.params.output_max?.value) ?? 0,
        direction: stringParam(instance.params.direction?.value) ?? "reverse",
        pv_filter_tau_ms: numericParam(instance.params.pv_filter_tau_ms?.value) ?? 0,
        deadband: numericParam(instance.params.deadband?.value) ?? 0,
        persistence_slot_ids: findPersistenceSlotIds(pack, instance.id),
        frontend_requirement_ids: [...(execution?.frontend_requirement_ids ?? [])],
        pv_source: resolvePidEndpoint(pack, pvRequirementId, pvRequirement, "input"),
        mv_output: resolvePidEndpoint(pack, mvRequirementId, mvRequirement, "output")
      };
    });
}

function resolvePulseFlowmeterSource(
  pack: RuntimePack,
  frontendRequirementId: string,
  frontendRequirement: RuntimeFrontendRequirement
): ShipControllerPulseFlowmeterSourceRef {
  const connection = frontendRequirement.source_ports?.length
    ? frontendRequirement.source_ports
        .flatMap((port) => sortedKeys(pack.connections).map((connectionId) => pack.connections[connectionId]))
        .find((entry) => (
          entry.target.instance_id === frontendRequirement.owner_instance_id &&
          frontendRequirement.source_ports?.some((port) => (
            port.instance_id === entry.target.instance_id &&
            port.port_id === entry.target.port_id
          ))
        ))
    : undefined;

  const resource = connection
    ? findResource(pack, connection.source.instance_id, connection.source.port_id, frontendRequirement.binding_kind)
    : frontendRequirement.source_ports?.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)
      ? findResource(
          pack,
          frontendRequirement.source_ports.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)!.instance_id,
          frontendRequirement.source_ports.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)!.port_id,
          frontendRequirement.binding_kind
        )
      : undefined;

  if (!connection && !resource) {
    throw new Error(`Pulse flowmeter frontend requirement ${frontendRequirementId} is missing connection/resource backing.`);
  }

  return {
    requirement_id: frontendRequirementId,
    mode: frontendRequirement.mode ?? "unknown",
    binding_kind: frontendRequirement.binding_kind ?? resource?.binding_kind ?? "unknown",
    instance_id: connection?.source.instance_id ?? resource?.instance_id ?? frontendRequirement.owner_instance_id,
    port_id: connection?.source.port_id ?? resource?.port_id ?? frontendRequirement.source_ports?.[0]?.port_id ?? "unknown",
    connection_id: connection?.id,
    resource_id: resource?.id
  };
}

function findPersistenceSlotId(pack: RuntimePack, instanceId: string): string | undefined {
  return sortedKeys(pack.persistence_slots)
    .find((slotId) => pack.persistence_slots[slotId].owner_instance_id === instanceId);
}

function findPersistenceSlotIds(pack: RuntimePack, instanceId: string): string[] {
  return sortedKeys(pack.persistence_slots)
    .filter((slotId) => pack.persistence_slots[slotId].owner_instance_id === instanceId);
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

function findResource(
  pack: RuntimePack,
  instanceId: string,
  portId: string | undefined,
  bindingKind?: string
): RuntimeResourceBinding | undefined {
  return sortedKeys(pack.resources)
    .map((resourceId) => pack.resources[resourceId])
    .find((resource) => (
      resource.instance_id === instanceId &&
      resource.port_id === portId &&
      (bindingKind === undefined || resource.binding_kind === bindingKind)
    ));
}

function resolvePidEndpoint(
  pack: RuntimePack,
  frontendRequirementId: string,
  frontendRequirement: RuntimeFrontendRequirement,
  direction: "input" | "output"
): ShipControllerPidEndpointRef {
  const connection = frontendRequirement.source_ports?.length
    ? sortedKeys(pack.connections)
        .map((connectionId) => pack.connections[connectionId])
        .find((entry) => (
          direction === "input"
            ? entry.target.instance_id === frontendRequirement.owner_instance_id &&
              frontendRequirement.source_ports?.some((port) => (
                port.instance_id === entry.target.instance_id &&
                port.port_id === entry.target.port_id
              ))
            : entry.source.instance_id === frontendRequirement.owner_instance_id &&
              frontendRequirement.source_ports?.some((port) => (
                port.instance_id === entry.source.instance_id &&
                port.port_id === entry.source.port_id
              ))
        ))
    : undefined;

  const resource = direction === "input"
    ? connection
      ? findResource(pack, connection.source.instance_id, connection.source.port_id, frontendRequirement.binding_kind)
      : undefined
    : frontendRequirement.source_ports?.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)
      ? findResource(
          pack,
          frontendRequirement.source_ports.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)!.instance_id,
          frontendRequirement.source_ports.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)!.port_id,
          frontendRequirement.binding_kind
        )
      : undefined;

  if (!connection && !resource) {
    throw new Error(`PID frontend requirement ${frontendRequirementId} is missing connection/resource backing.`);
  }

  return {
    instance_id: direction === "input"
      ? (connection?.source.instance_id ?? resource?.instance_id ?? frontendRequirement.owner_instance_id)
      : (connection?.target.instance_id ?? resource?.instance_id ?? frontendRequirement.owner_instance_id),
    port_id: direction === "input"
      ? (connection?.source.port_id ?? resource?.port_id ?? frontendRequirement.source_ports?.[0]?.port_id ?? "unknown")
      : (connection?.target.port_id ?? resource?.port_id ?? frontendRequirement.source_ports?.[0]?.port_id ?? "unknown"),
    connection_id: connection?.id,
    resource_id: resource?.id
  };
}

function numberConfig(resource: RuntimeResourceBinding, key: string): number {
  return Number(resource.config[key] ?? 0);
}

function numericConfig(resource: RuntimeResourceBinding, key: string): number | undefined {
  const value = resource.config[key];
  return typeof value === "number" ? value : undefined;
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

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
