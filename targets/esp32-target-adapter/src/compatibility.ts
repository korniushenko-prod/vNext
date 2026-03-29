import type {
  RuntimeConnection,
  RuntimeFrontendRequirement,
  RuntimePack,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterDiagnostic } from "@universal-plc/target-adapter-contracts";
import { esp32CapabilityProfile } from "./profile.js";
import { sortDiagnostics, sortedKeys } from "./sort.js";
import type { Esp32CompatibilityResult } from "./types.js";

export function checkEsp32Compatibility(pack: RuntimePack): Esp32CompatibilityResult {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const operations = pack.operations ?? {};
  const traceGroups = pack.trace_groups ?? {};
  const monitors = pack.monitors ?? {};
  const frontendRequirements = pack.frontend_requirements ?? {};
  const persistenceSlots = pack.persistence_slots ?? {};

  if (Object.keys(pack.instances).length > esp32CapabilityProfile.limits.max_instances) {
    diagnostics.push({
      code: "target.instances.limit",
      severity: "error",
      message: "Runtime pack instance count exceeds ESP32 target limit.",
      path: "$.instances"
    });
  }

  if (Object.keys(pack.connections).length > esp32CapabilityProfile.limits.max_connections) {
    diagnostics.push({
      code: "target.connections.limit",
      severity: "error",
      message: "Runtime pack connection count exceeds ESP32 target limit.",
      path: "$.connections"
    });
  }

  if (Object.keys(pack.resources).length > esp32CapabilityProfile.limits.max_resources) {
    diagnostics.push({
      code: "target.resources.limit",
      severity: "error",
      message: "Runtime pack resource count exceeds ESP32 target limit.",
      path: "$.resources"
    });
  }

  for (const connectionId of sortedKeys(pack.connections)) {
    const connection = pack.connections[connectionId] as RuntimeConnection;
    if (!esp32CapabilityProfile.supported_channel_kinds.includes(connection.channel_kind)) {
      diagnostics.push({
        code: "target.channel_kind.unsupported",
        severity: "error",
        message: `Connection channel kind \`${connection.channel_kind}\` is not supported by the ESP32 target.`,
        path: `$.connections.${connectionId}.channel_kind`
      });
    }
    if (!esp32CapabilityProfile.supported_value_types.includes(connection.value_type)) {
      diagnostics.push({
        code: "target.value_type.unsupported",
        severity: "error",
        message: `Connection value type \`${connection.value_type}\` is not supported by the ESP32 target.`,
        path: `$.connections.${connectionId}.value_type`
      });
    }
  }

  for (const resourceId of sortedKeys(pack.resources)) {
    const resource = pack.resources[resourceId] as RuntimeResourceBinding;
    if (!esp32CapabilityProfile.supported_binding_kinds.includes(resource.binding_kind)) {
      diagnostics.push({
        code: "target.binding.unsupported",
        severity: "error",
        message: `Resource binding kind \`${resource.binding_kind}\` is not supported by the ESP32 target.`,
        path: `$.resources.${resourceId}.binding_kind`
      });
    }
  }

  if (Object.keys(traceGroups).length > 0 && !esp32CapabilityProfile.supports_trace) {
    diagnostics.push({
      code: "target.trace.unsupported",
      severity: "error",
      message: "Runtime pack trace groups are not supported by the ESP32 target.",
      path: "$.trace_groups"
    });
  }

  if (Object.keys(operations).length > 0 && !esp32CapabilityProfile.supports_operations) {
    diagnostics.push({
      code: "target.operations.unsupported",
      severity: "error",
      message: "Runtime pack operations are not supported by the ESP32 target.",
      path: "$.operations"
    });
  }

  if (Object.keys(persistenceSlots).length > 0 && !esp32CapabilityProfile.supports_persistence) {
    diagnostics.push({
      code: "target.persistence.unsupported",
      severity: "error",
      message: "Runtime pack persistence slots are not supported by the ESP32 target.",
      path: "$.persistence_slots"
    });
  }

  for (const requirementId of sortedKeys(frontendRequirements)) {
    validateFrontendRequirement(pack, requirementId, frontendRequirements[requirementId], diagnostics);
  }

  for (const operationId of sortedKeys(operations)) {
    const operation = operations[operationId];
    if (!esp32CapabilityProfile.supported_operation_kinds.includes(operation.kind)) {
      diagnostics.push({
        code: "target.operation_kind.unsupported",
        severity: "error",
        message: `Operation kind \`${operation.kind}\` is not supported by the ESP32 target.`,
        path: `$.operations.${operationId}.kind`
      });
    }
  }

  void monitors;

  for (const instanceId of sortedKeys(pack.instances)) {
    const instance = pack.instances[instanceId];
    const execution = instance.native_execution;
    if (!execution) {
      continue;
    }

    if (!esp32CapabilityProfile.supported_native_kinds.includes(execution.native_kind)) {
      diagnostics.push({
        code: "target.native_kind.unsupported",
        severity: "error",
        message: `Native kind \`${execution.native_kind}\` is not supported by the ESP32 target.`,
        path: `$.instances.${instanceId}.native_execution.native_kind`
      });
    }

    if (execution.target_kinds && !execution.target_kinds.includes(esp32CapabilityProfile.target_id)) {
      diagnostics.push({
        code: "target.target_kind.mismatch",
        severity: "error",
        message: `Instance \`${instanceId}\` is not compatible with target \`${esp32CapabilityProfile.target_id}\`.`,
        path: `$.instances.${instanceId}.native_execution.target_kinds`
      });
    }

    if (execution.native_kind === "std.pulse_flowmeter.v1") {
      validatePulseFlowmeterExecution(pack, instanceId, diagnostics);
    }

    if (execution.native_kind === "std.pid_controller.v1") {
      validatePidControllerExecution(pack, instanceId, diagnostics);
    }
  }

  const sorted = sortDiagnostics(diagnostics);
  return {
    ok: sorted.every((entry) => entry.severity !== "error"),
    diagnostics: sorted
  };
}

function validatePidControllerExecution(
  pack: RuntimePack,
  instanceId: string,
  diagnostics: TargetAdapterDiagnostic[]
): void {
  const execution = pack.instances[instanceId]?.native_execution;
  if (!execution) {
    return;
  }

  const activeFrontendIds = [...(execution.frontend_requirement_ids ?? [])].sort((left, right) => left.localeCompare(right));
  const requiredFrontendIds = [`fe_${instanceId}_mv_output`, `fe_${instanceId}_pv_source`];

  if (activeFrontendIds.length === 0) {
    diagnostics.push({
      code: "target.pid.frontend.missing",
      severity: "error",
      message: `PID controller instance \`${instanceId}\` has no active frontend requirement ids.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
    return;
  }

  for (const requiredId of requiredFrontendIds) {
    if (!activeFrontendIds.includes(requiredId)) {
      diagnostics.push({
        code: "target.pid.frontend.missing_required",
        severity: "error",
        message: `PID controller instance \`${instanceId}\` is missing required frontend requirement \`${requiredId}\`.`,
        path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
      });
    }
  }

  if (activeFrontendIds.length !== requiredFrontendIds.length) {
    diagnostics.push({
      code: "target.pid.frontend.unexpected_count",
      severity: "error",
      message: `PID controller instance \`${instanceId}\` must expose exactly two active frontend requirements.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  for (const frontendId of activeFrontendIds) {
    const requirement = pack.frontend_requirements[frontendId];
    if (!requirement) {
      diagnostics.push({
        code: "target.pid.frontend.unresolved",
        severity: "error",
        message: `PID controller instance \`${instanceId}\` references unknown frontend requirement \`${frontendId}\`.`,
        path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
      });
      continue;
    }

    if (requirement.owner_instance_id !== instanceId) {
      diagnostics.push({
        code: "target.pid.frontend.owner_mismatch",
        severity: "error",
        message: `Frontend requirement \`${frontendId}\` does not belong to PID instance \`${instanceId}\`.`,
        path: `$.frontend_requirements.${frontendId}.owner_instance_id`
      });
    }
  }

  const pvRequirement = pack.frontend_requirements[`fe_${instanceId}_pv_source`];
  if (pvRequirement) {
    if (pvRequirement.binding_kind !== "analog_in") {
      diagnostics.push({
        code: "target.pid.binding_kind.mismatch",
        severity: "error",
        message: "PID pv_source requires `analog_in` binding.",
        path: `$.frontend_requirements.fe_${instanceId}_pv_source.binding_kind`
      });
    }
    if (pvRequirement.value_type !== "float") {
      diagnostics.push({
        code: "target.pid.value_type.mismatch",
        severity: "error",
        message: "PID pv_source requires `float` value type.",
        path: `$.frontend_requirements.fe_${instanceId}_pv_source.value_type`
      });
    }
  }

  const mvRequirement = pack.frontend_requirements[`fe_${instanceId}_mv_output`];
  if (mvRequirement) {
    if (mvRequirement.binding_kind !== "analog_out") {
      diagnostics.push({
        code: "target.pid.binding_kind.mismatch",
        severity: "error",
        message: "PID mv_output requires `analog_out` binding.",
        path: `$.frontend_requirements.fe_${instanceId}_mv_output.binding_kind`
      });
    }
    if (mvRequirement.value_type !== "float") {
      diagnostics.push({
        code: "target.pid.value_type.mismatch",
        severity: "error",
        message: "PID mv_output requires `float` value type.",
        path: `$.frontend_requirements.fe_${instanceId}_mv_output.value_type`
      });
    }
  }
}

function validateFrontendRequirement(
  pack: RuntimePack,
  requirementId: string,
  requirement: RuntimeFrontendRequirement,
  diagnostics: TargetAdapterDiagnostic[]
): void {
  const matchingConnections = findFrontendConnections(pack, requirement);
  const directResources = findFrontendDirectResources(pack, requirement);
  const sourceResources = findFrontendSourceResources(pack, matchingConnections);
  const directPorts = (requirement.source_ports ?? [])
    .map((port) => pack.instances[port.instance_id]?.ports?.[port.port_id])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  if (requirement.channel_kind && !esp32CapabilityProfile.supported_channel_kinds.includes(requirement.channel_kind)) {
    diagnostics.push({
      code: "target.frontend.channel_kind.unsupported",
      severity: "error",
      message: `Frontend requirement channel kind \`${requirement.channel_kind}\` is not supported by the ESP32 target.`,
      path: `$.frontend_requirements.${requirementId}.channel_kind`
    });
  }

  if (requirement.value_type && !esp32CapabilityProfile.supported_value_types.includes(requirement.value_type)) {
    diagnostics.push({
      code: "target.frontend.value_type.unsupported",
      severity: "error",
      message: `Frontend requirement value type \`${requirement.value_type}\` is not supported by the ESP32 target.`,
      path: `$.frontend_requirements.${requirementId}.value_type`
    });
  }

  if (requirement.binding_kind && !esp32CapabilityProfile.supported_binding_kinds.includes(requirement.binding_kind as RuntimeResourceBinding["binding_kind"])) {
    diagnostics.push({
      code: "target.frontend.binding.unsupported",
      severity: "error",
      message: `Frontend requirement binding kind \`${requirement.binding_kind}\` is not supported by the ESP32 target.`,
      path: `$.frontend_requirements.${requirementId}.binding_kind`
    });
  }

  if (
    requirement.mode &&
    esp32CapabilityProfile.supported_pulse_source_modes &&
    !esp32CapabilityProfile.supported_pulse_source_modes.includes(requirement.mode)
  ) {
    diagnostics.push({
      code: "target.frontend.mode.unsupported",
      severity: "error",
      message: `Frontend requirement mode \`${requirement.mode}\` is not supported by the ESP32 target.`,
      path: `$.frontend_requirements.${requirementId}.mode`
    });
  }

  if (!requirement.required) {
    return;
  }

  if (matchingConnections.length === 0 && directResources.length === 0) {
    const hasOwnerSourcePort = requirement.source_ports?.some((port) => port.instance_id === requirement.owner_instance_id) ?? false;
    diagnostics.push({
      code: hasOwnerSourcePort ? "target.frontend.resource.missing" : "target.frontend.connection.missing",
      severity: "error",
      message: hasOwnerSourcePort
        ? `Required frontend requirement \`${requirementId}\` has no compatible direct resource binding on the ESP32 target.`
        : `Required frontend requirement \`${requirementId}\` has no incoming runtime connection or direct resource binding on the ESP32 target.`,
      path: `$.frontend_requirements.${requirementId}`
    });
    return;
  }

  if (requirement.channel_kind) {
    const channelMatch = matchingConnections.some((connection) => connection.channel_kind === requirement.channel_kind) ||
      directPorts.some((port) => port.channel_kind === requirement.channel_kind);
    if (!channelMatch) {
      diagnostics.push({
        code: "target.frontend.channel_kind.mismatch",
        severity: "error",
        message: `Required frontend requirement \`${requirementId}\` did not receive a compatible channel kind on the ESP32 target.`,
        path: `$.frontend_requirements.${requirementId}.channel_kind`
      });
    }
  }

  if (requirement.value_type) {
    const valueMatch = matchingConnections.some((connection) => connection.value_type === requirement.value_type) ||
      directPorts.some((port) => port.value_type === requirement.value_type);
    if (!valueMatch) {
      diagnostics.push({
        code: "target.frontend.value_type.mismatch",
        severity: "error",
        message: `Required frontend requirement \`${requirementId}\` did not receive a compatible value type on the ESP32 target.`,
        path: `$.frontend_requirements.${requirementId}.value_type`
      });
    }
  }

  if (requirement.binding_kind) {
    const resourceMatch = directResources.some((resource) => resource.binding_kind === requirement.binding_kind) ||
      sourceResources.some((resource) => resource.binding_kind === requirement.binding_kind);
    if (!resourceMatch) {
      diagnostics.push({
        code: "target.frontend.resource.missing",
        severity: "error",
        message: `Required frontend requirement \`${requirementId}\` has no compatible resource binding on the ESP32 target.`,
        path: `$.frontend_requirements.${requirementId}`
      });
    }
  }
}

function validatePulseFlowmeterExecution(
  pack: RuntimePack,
  instanceId: string,
  diagnostics: TargetAdapterDiagnostic[]
): void {
  const execution = pack.instances[instanceId]?.native_execution;
  if (!execution) {
    return;
  }

  if (!execution.mode) {
    diagnostics.push({
      code: "target.flowmeter.mode.missing",
      severity: "error",
      message: `PulseFlowmeter instance \`${instanceId}\` is missing native execution mode.`,
      path: `$.instances.${instanceId}.native_execution.mode`
    });
    return;
  }

  if (
    esp32CapabilityProfile.supported_pulse_source_modes &&
    !esp32CapabilityProfile.supported_pulse_source_modes.includes(execution.mode)
  ) {
    diagnostics.push({
      code: "target.flowmeter.mode.unsupported",
      severity: "error",
      message: `PulseFlowmeter mode \`${execution.mode}\` is not supported by the ESP32 target.`,
      path: `$.instances.${instanceId}.native_execution.mode`
    });
  }

  const activeFrontendIds = execution.frontend_requirement_ids ?? [];
  if (activeFrontendIds.length === 0) {
    diagnostics.push({
      code: "target.flowmeter.frontend.missing",
      severity: "error",
      message: `PulseFlowmeter instance \`${instanceId}\` has no active frontend requirement ids.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
    return;
  }

  if (activeFrontendIds.length > 1) {
    diagnostics.push({
      code: "target.flowmeter.frontend.multiple",
      severity: "error",
      message: `PulseFlowmeter instance \`${instanceId}\` has more than one active frontend requirement.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  const constraint = esp32CapabilityProfile.pulse_source_constraints?.find((entry) => entry.mode === execution.mode);

  for (const frontendId of activeFrontendIds) {
    const requirement = pack.frontend_requirements[frontendId];
    if (!requirement) {
      diagnostics.push({
        code: "target.flowmeter.frontend.unresolved",
        severity: "error",
        message: `PulseFlowmeter instance \`${instanceId}\` references unknown frontend requirement \`${frontendId}\`.`,
        path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
      });
      continue;
    }

    if (requirement.owner_instance_id !== instanceId) {
      diagnostics.push({
        code: "target.flowmeter.frontend.owner_mismatch",
        severity: "error",
        message: `Frontend requirement \`${frontendId}\` does not belong to PulseFlowmeter instance \`${instanceId}\`.`,
        path: `$.frontend_requirements.${frontendId}.owner_instance_id`
      });
    }

    if (requirement.mode && requirement.mode !== execution.mode) {
      diagnostics.push({
        code: "target.flowmeter.frontend.mode_mismatch",
        severity: "error",
        message: `Frontend requirement \`${frontendId}\` does not match PulseFlowmeter mode \`${execution.mode}\`.`,
        path: `$.frontend_requirements.${frontendId}.mode`
      });
    }

    if (constraint?.required_binding_kind && requirement.binding_kind !== constraint.required_binding_kind) {
      diagnostics.push({
        code: "target.flowmeter.binding_kind.mismatch",
        severity: "error",
        message: `PulseFlowmeter mode \`${execution.mode}\` requires binding kind \`${constraint.required_binding_kind}\`.`,
        path: `$.frontend_requirements.${frontendId}.binding_kind`
      });
    }

    if (
      constraint?.required_value_types?.length &&
      requirement.value_type &&
      !constraint.required_value_types.includes(requirement.value_type)
    ) {
      diagnostics.push({
        code: "target.flowmeter.value_type.mismatch",
        severity: "error",
        message: `PulseFlowmeter mode \`${execution.mode}\` requires one of: ${constraint.required_value_types.join(", ")}.`,
        path: `$.frontend_requirements.${frontendId}.value_type`
      });
    }
  }
}

function findFrontendConnections(
  pack: RuntimePack,
  requirement: RuntimeFrontendRequirement
): RuntimeConnection[] {
  return Object.values(pack.connections ?? {}).filter((connection) => (
    connection.target.instance_id === requirement.owner_instance_id &&
    frontendPortMatches(connection, requirement)
  ));
}

function findFrontendDirectResources(
  pack: RuntimePack,
  requirement: RuntimeFrontendRequirement
): RuntimeResourceBinding[] {
  return Object.values(pack.resources ?? {}).filter((resource) => (
    resource.instance_id === requirement.owner_instance_id &&
    frontendResourceMatches(resource, requirement)
  ));
}

function findFrontendSourceResources(
  pack: RuntimePack,
  connections: RuntimeConnection[]
): RuntimeResourceBinding[] {
  return connections.flatMap((connection) => (
    Object.values(pack.resources ?? {}).filter((resource) => (
      resource.instance_id === connection.source.instance_id &&
      resource.port_id === connection.source.port_id
    ))
  ));
}

function frontendPortMatches(
  connection: RuntimeConnection,
  requirement: RuntimeFrontendRequirement
): boolean {
  if (!requirement.source_ports?.length) {
    return true;
  }

  return requirement.source_ports.some((port) => (
    port.instance_id === connection.target.instance_id &&
    port.port_id === connection.target.port_id
  ));
}

function frontendResourceMatches(
  resource: RuntimeResourceBinding,
  requirement: RuntimeFrontendRequirement
): boolean {
  if (requirement.binding_kind && resource.binding_kind !== requirement.binding_kind) {
    return false;
  }

  if (!requirement.source_ports?.length) {
    return true;
  }

  return requirement.source_ports.some((port) => (
    port.instance_id === resource.instance_id &&
    port.port_id === resource.port_id
  ));
}
