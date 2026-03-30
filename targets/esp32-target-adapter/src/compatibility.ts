import type {
  RuntimeConnection,
  RuntimeFrontendRequirement,
  RuntimePack,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterDiagnostic } from "@universal-plc/target-adapter-contracts";
import { validateEsp32OperationSupport } from "./operations.js";
import { esp32CapabilityProfile } from "./profile.js";
import { sortDiagnostics, sortedKeys } from "./sort.js";
import type { Esp32CompatibilityResult } from "./types.js";

const WAVE3_CONNECTION_ONLY_NATIVE_KINDS = new Set([
  "std.run_hours_counter.v1",
  "std.event_counter.v1",
  "std.threshold_monitor.v1",
  "std.maintenance_counter.v1"
]);

const SUPPORTED_REMOTE_POINT_DECODES: Record<string, { value_type: string; register_count: number }> = {
  float32: {
    value_type: "float",
    register_count: 2
  }
};

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

  diagnostics.push(...validateEsp32OperationSupport(pack));
  diagnostics.push(...validatePackageSupervision(pack));
  diagnostics.push(...validatePackageCoordination(pack));
  diagnostics.push(...validatePackageModePhase(pack));
  diagnostics.push(...validatePackagePermissiveInterlock(pack));
  diagnostics.push(...validatePackageProtectionRecovery(pack));
  diagnostics.push(...validatePackageArbitration(pack));
  diagnostics.push(...validatePackageOverrideHandover(pack));

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

    if (execution.native_kind === "std.comm_bridge.v1") {
      validateCommBridgeExecution(pack, instanceId, diagnostics);
    }

    if (execution.native_kind === "std.remote_point_frontend.v1") {
      validateRemotePointExecution(pack, instanceId, diagnostics);
    }

    if (execution.native_kind === "std.run_hours_counter.v1") {
      validateSingleInputExecution(pack, instanceId, diagnostics, {
        code_prefix: "target.run_hours",
        label: "RunHoursCounter",
        required_suffix: "activity_source",
        required_binding_kind: "digital_in",
        required_channel_kind: "signal",
        allowed_value_types: ["bool"]
      });
    }

    if (execution.native_kind === "std.event_counter.v1") {
      validateSingleInputExecution(pack, instanceId, diagnostics, {
        code_prefix: "target.event_counter",
        label: "EventCounter",
        required_suffix: "event_source",
        required_binding_kind: "digital_in",
        required_channel_kind: "signal",
        allowed_value_types: ["bool"]
      });
    }

    if (execution.native_kind === "std.threshold_monitor.v1") {
      validateSingleInputExecution(pack, instanceId, diagnostics, {
        code_prefix: "target.threshold_monitor",
        label: "ThresholdMonitor",
        required_suffix: "value_source",
        required_binding_kind: "analog_in",
        required_channel_kind: "telemetry",
        allowed_value_types: ["float", "int", "u32", "duration"]
      });
    }

    if (execution.native_kind === "std.maintenance_counter.v1") {
      validateRuntimeInputExecution(pack, instanceId, diagnostics, {
        code_prefix: "target.maintenance_counter",
        label: "MaintenanceCounter",
        input_port_id: "usage_total_in",
        required_channel_kind: "telemetry",
        allowed_value_types: ["float", "int", "u32", "duration"]
      });
    }
  }

  const sorted = sortDiagnostics(diagnostics);
  return {
    ok: sorted.every((entry) => entry.severity !== "error"),
    diagnostics: sorted
  };
}

function validatePackageSupervision(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const packageSupport = esp32CapabilityProfile.package_supervision_support;
  const supportedAggregateMonitorKinds = new Set(["boolean_health_rollup"]);

  for (const packageId of sortedKeys(pack.package_supervision ?? {})) {
    const packageEntry = pack.package_supervision?.[packageId];
    if (!packageEntry) {
      continue;
    }

    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_supervision.unsupported",
        severity: "error",
        message: "Package supervision metadata is not supported by the ESP32 target.",
        path: `$.package_supervision.${packageId}`
      });
      continue;
    }

    for (const summaryId of sortedKeys(packageEntry.summary_outputs ?? {})) {
      const summary = packageEntry.summary_outputs?.[summaryId];
      if (!summary) {
        continue;
      }
      validatePackageSource(pack, diagnostics, `$.package_supervision.${packageId}.summary_outputs.${summaryId}.source`, summary.source);
    }

    for (const monitorId of sortedKeys(packageEntry.aggregate_monitors ?? {})) {
      const monitor = packageEntry.aggregate_monitors?.[monitorId];
      if (!monitor) {
        continue;
      }

      if (!supportedAggregateMonitorKinds.has(monitor.kind)) {
        diagnostics.push({
          code: "target.package_supervision.monitor_rollup.unsupported",
          severity: "error",
          message: `Package supervision monitor rollup kind \`${monitor.kind}\` is not supported by the ESP32 target.`,
          path: `$.package_supervision.${packageId}.aggregate_monitors.${monitorId}.kind`
        });
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_supervision.${packageId}.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          source
        );
      });
    }

    for (const alarmId of sortedKeys(packageEntry.aggregate_alarms ?? {})) {
      const alarm = packageEntry.aggregate_alarms?.[alarmId];
      if (!alarm) {
        continue;
      }

      alarm.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_supervision.${packageId}.aggregate_alarms.${alarmId}.source_ports[${index}]`,
          source
        );
      });
    }

    for (const traceGroupId of sortedKeys(packageEntry.trace_groups ?? {})) {
      const traceGroup = packageEntry.trace_groups?.[traceGroupId];
      if (!traceGroup) {
        continue;
      }

      traceGroup.signals.forEach((signal, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_supervision.${packageId}.trace_groups.${traceGroupId}.signals[${index}]`,
          signal
        );
      });
    }

    for (const proxyId of sortedKeys(packageEntry.operation_proxies ?? {})) {
      const proxy = packageEntry.operation_proxies?.[proxyId];
      if (!proxy) {
        continue;
      }

      const operation = pack.operations[proxy.target_operation_id];
      if (!operation || operation.owner_instance_id !== proxy.target_owner_instance_id) {
        diagnostics.push({
          code: "target.package_supervision.operation_proxy.invalid",
          severity: "error",
          message: `Package supervision proxy \`${proxy.id}\` must reference a valid child runtime operation owned by \`${proxy.target_owner_instance_id}\`.`,
          path: `$.package_supervision.${packageId}.operation_proxies.${proxyId}`
        });
      }
    }
  }

  return diagnostics;
}

function validatePackageCoordination(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const packageSupport = esp32CapabilityProfile.package_coordination_support;
  const supportedAggregateMonitorKinds = new Set(["boolean_health_rollup"]);

  for (const packageId of sortedKeys(pack.package_coordination ?? {})) {
    const packageEntry = pack.package_coordination?.[packageId];
    if (!packageEntry) {
      continue;
    }

    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_coordination.unsupported",
        severity: "error",
        message: "Package coordination metadata is not supported by the ESP32 target.",
        path: `$.package_coordination.${packageId}`
      });
      continue;
    }

    for (const stateId of sortedKeys(packageEntry.package_state.states ?? {})) {
      const stateRule = packageEntry.package_state.states?.[stateId];
      if (!stateRule) {
        continue;
      }

      stateRule.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_coordination.${packageId}.package_state.states.${stateId}.source_ports[${index}]`,
          source,
          "target.package_coordination.state_source.unresolved",
          "Package coordination state source"
        );
      });
    }

    for (const summaryId of sortedKeys(packageEntry.summary_outputs ?? {})) {
      const summary = packageEntry.summary_outputs?.[summaryId];
      if (!summary) {
        continue;
      }

      validatePackageSource(
        pack,
        diagnostics,
        `$.package_coordination.${packageId}.summary_outputs.${summaryId}.source`,
        summary.source,
        "target.package_coordination.source.unresolved",
        "Package coordination source"
      );
    }

    for (const monitorId of sortedKeys(packageEntry.aggregate_monitors ?? {})) {
      const monitor = packageEntry.aggregate_monitors?.[monitorId];
      if (!monitor) {
        continue;
      }

      if (!supportedAggregateMonitorKinds.has(monitor.kind)) {
        diagnostics.push({
          code: "target.package_coordination.monitor_rollup.unsupported",
          severity: "error",
          message: `Package coordination monitor rollup kind \`${monitor.kind}\` is not supported by the ESP32 target.`,
          path: `$.package_coordination.${packageId}.aggregate_monitors.${monitorId}.kind`
        });
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_coordination.${packageId}.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          source,
          "target.package_coordination.source.unresolved",
          "Package coordination source"
        );
      });
    }

    for (const traceGroupId of sortedKeys(packageEntry.trace_groups ?? {})) {
      const traceGroup = packageEntry.trace_groups?.[traceGroupId];
      if (!traceGroup) {
        continue;
      }

      traceGroup.signals.forEach((signal, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_coordination.${packageId}.trace_groups.${traceGroupId}.signals[${index}]`,
          signal,
          "target.package_coordination.source.unresolved",
          "Package coordination source"
        );
      });
    }

    for (const proxyId of sortedKeys(packageEntry.operation_proxies ?? {})) {
      const proxy = packageEntry.operation_proxies?.[proxyId];
      if (!proxy) {
        continue;
      }

      const operation = pack.operations[proxy.target_operation_id];
      if (!operation || operation.owner_instance_id !== proxy.target_owner_instance_id) {
        diagnostics.push({
          code: "target.package_coordination.operation_proxy.invalid",
          severity: "error",
          message: `Package coordination proxy \`${proxy.id}\` must reference a valid child runtime operation owned by \`${proxy.target_owner_instance_id}\`.`,
          path: `$.package_coordination.${packageId}.operation_proxies.${proxyId}`
        });
      }
    }
  }

  return diagnostics;
}

function validatePackageModePhase(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const packageSupport = esp32CapabilityProfile.package_mode_phase_support;
  const runtimeContract = pack.package_mode_runtime_contract;

  if (Object.keys(pack.package_mode_phase ?? {}).length > 0) {
    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_mode_phase.unsupported",
        severity: "error",
        message: "Package mode/phase metadata is not supported by the ESP32 target.",
        path: "$.package_mode_phase"
      });
      return diagnostics;
    }

    if (packageSupport.package_mode_execution !== true || runtimeContract?.package_mode_execution_supported !== true) {
      diagnostics.push({
        code: "target.package_mode_execution.disabled",
        severity: "error",
        message: "ESP32 package mode execution baseline requires package_mode_execution support on both runtime contract and target capability profile.",
        path: "$.package_mode_runtime_contract.package_mode_execution_supported"
      });
    }

    if (packageSupport.phase_transition_execution !== true || runtimeContract?.phase_transition_execution_supported !== true) {
      diagnostics.push({
        code: "target.package_mode_execution.phase_transition.unsupported",
        severity: "error",
        message: "ESP32 package mode execution baseline requires phase transition execution support to stay enabled.",
        path: "$.package_mode_runtime_contract.phase_transition_execution_supported"
      });
    }

    if (packageSupport.transition_guard_diagnostics !== true || runtimeContract?.transition_guard_diagnostics_supported !== true) {
      diagnostics.push({
        code: "target.package_mode_execution.guard.unsupported",
        severity: "error",
        message: "ESP32 package mode execution baseline requires transition guard diagnostics support to stay enabled.",
        path: "$.package_mode_runtime_contract.transition_guard_diagnostics_supported"
      });
    }

    const supportedIntents = [...(runtimeContract?.supported_intents ?? [])].sort();
    if (supportedIntents.join(",") !== ["request_mode_change", "request_phase_abort", "request_phase_start"].join(",")) {
      diagnostics.push({
        code: "target.package_mode_execution.intent.unsupported",
        severity: "error",
        message: "ESP32 package mode execution baseline supports only request_mode_change, request_phase_start, request_phase_abort.",
        path: "$.package_mode_runtime_contract.supported_intents"
      });
    }
  }

  for (const packageId of sortedKeys(pack.package_mode_phase ?? {})) {
    const packageEntry = pack.package_mode_phase?.[packageId];
    if (!packageEntry) {
      continue;
    }

    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_mode_phase.unsupported",
        severity: "error",
        message: "Package mode/phase metadata is not supported by the ESP32 target.",
        path: `$.package_mode_phase.${packageId}`
      });
      continue;
    }

    const modeIds = new Set(sortedKeys(packageEntry.modes ?? {}).map((modeId) => packageEntry.modes?.[modeId]?.qualified_id).filter(Boolean));
    const phaseIds = new Set(sortedKeys(packageEntry.phases ?? {}).map((phaseId) => packageEntry.phases?.[phaseId]?.qualified_id).filter(Boolean));

    for (const modeId of sortedKeys(packageEntry.modes ?? {})) {
      const mode = packageEntry.modes?.[modeId];
      if (!mode) {
        continue;
      }

      for (const [index, phaseId] of (mode.phase_ids ?? []).entries()) {
        if (!phaseIds.has(phaseId)) {
          diagnostics.push({
            code: "target.package_mode_phase.phase_ref.unresolved",
            severity: "error",
            message: `Package mode ${mode.id} references unknown runtime phase id ${phaseId}.`,
            path: `$.package_mode_phase.${packageId}.modes.${modeId}.phase_ids[${index}]`
          });
        }
      }
    }

    for (const phaseId of sortedKeys(packageEntry.phases ?? {})) {
      const phase = packageEntry.phases?.[phaseId];
      if (!phase) {
        continue;
      }

      phase.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_mode_phase.${packageId}.phases.${phaseId}.source_ports[${index}]`,
          source,
          "target.package_mode_phase.source.unresolved",
          "Package mode/phase source"
        );
      });
    }

    for (const entryId of sortedKeys(packageEntry.mode_summary.entries ?? {})) {
      const entry = packageEntry.mode_summary.entries?.[entryId];
      if (!entry) {
        continue;
      }

      if (!modeIds.has(entry.mode_id)) {
        diagnostics.push({
          code: "target.package_mode_phase.mode_summary.ref.unresolved",
          severity: "error",
          message: `Package mode summary entry ${entry.id} references unknown runtime mode id ${entry.mode_id}.`,
          path: `$.package_mode_phase.${packageId}.mode_summary.entries.${entryId}.mode_id`
        });
      }

      entry.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_mode_phase.${packageId}.mode_summary.entries.${entryId}.source_ports[${index}]`,
          source,
          "target.package_mode_phase.source.unresolved",
          "Package mode/phase source"
        );
      });
    }

    for (const entryId of sortedKeys(packageEntry.phase_summary.entries ?? {})) {
      const entry = packageEntry.phase_summary.entries?.[entryId];
      if (!entry) {
        continue;
      }

      if (!phaseIds.has(entry.phase_id)) {
        diagnostics.push({
          code: "target.package_mode_phase.phase_summary.ref.unresolved",
          severity: "error",
          message: `Package phase summary entry ${entry.id} references unknown runtime phase id ${entry.phase_id}.`,
          path: `$.package_mode_phase.${packageId}.phase_summary.entries.${entryId}.phase_id`
        });
      }

      entry.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_mode_phase.${packageId}.phase_summary.entries.${entryId}.source_ports[${index}]`,
          source,
          "target.package_mode_phase.source.unresolved",
          "Package mode/phase source"
        );
      });
    }

    if (!modeIds.has(packageEntry.active_mode_id)) {
      diagnostics.push({
        code: "target.package_mode_phase.active_mode.unresolved",
        severity: "error",
        message: `Package mode/phase active mode id ${packageEntry.active_mode_id} is not present in the runtime package mode set.`,
        path: `$.package_mode_phase.${packageId}.active_mode_id`
      });
    }

    if (!phaseIds.has(packageEntry.active_phase_id)) {
      diagnostics.push({
        code: "target.package_mode_phase.active_phase.unresolved",
        severity: "error",
        message: `Package mode/phase active phase id ${packageEntry.active_phase_id} is not present in the runtime package phase set.`,
        path: `$.package_mode_phase.${packageId}.active_phase_id`
      });
    }

    for (const groupId of sortedKeys(packageEntry.package_mode_groups ?? {})) {
      const group = packageEntry.package_mode_groups?.[groupId];
      if (!group) {
        continue;
      }

      for (const [index, modeId] of group.mode_ids.entries()) {
        if (!modeIds.has(modeId)) {
          diagnostics.push({
            code: "target.package_mode_phase.mode_group.ref.unresolved",
            severity: "error",
            message: `Package mode group ${group.id} references unknown runtime mode id ${modeId}.`,
            path: `$.package_mode_phase.${packageId}.package_mode_groups.${groupId}.mode_ids[${index}]`
          });
        }
      }
    }

    for (const groupId of sortedKeys(packageEntry.package_phase_groups ?? {})) {
      const group = packageEntry.package_phase_groups?.[groupId];
      if (!group) {
        continue;
      }

      for (const [index, phaseId] of group.phase_ids.entries()) {
        if (!phaseIds.has(phaseId)) {
          diagnostics.push({
            code: "target.package_mode_phase.phase_group.ref.unresolved",
            severity: "error",
            message: `Package phase group ${group.id} references unknown runtime phase id ${phaseId}.`,
            path: `$.package_mode_phase.${packageId}.package_phase_groups.${groupId}.phase_ids[${index}]`
          });
        }
      }
    }

    for (const traceGroupId of sortedKeys(packageEntry.trace_groups ?? {})) {
      const traceGroup = packageEntry.trace_groups?.[traceGroupId];
      if (!traceGroup) {
        continue;
      }

      traceGroup.signals.forEach((signal, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_mode_phase.${packageId}.trace_groups.${traceGroupId}.signals[${index}]`,
          signal,
          "target.package_mode_phase.source.unresolved",
          "Package mode/phase source"
        );
      });
    }

    if (packageEntry.package_supervision_id && !pack.package_supervision?.[packageEntry.package_supervision_id]) {
      diagnostics.push({
        code: "target.package_mode_phase.supervision_link.unresolved",
        severity: "error",
        message: `Package mode/phase references unknown package supervision id ${packageEntry.package_supervision_id}.`,
        path: `$.package_mode_phase.${packageId}.package_supervision_id`
      });
    }

    if (packageEntry.package_coordination_id && !pack.package_coordination?.[packageEntry.package_coordination_id]) {
      diagnostics.push({
        code: "target.package_mode_phase.coordination_link.unresolved",
        severity: "error",
        message: `Package mode/phase references unknown package coordination id ${packageEntry.package_coordination_id}.`,
        path: `$.package_mode_phase.${packageId}.package_coordination_id`
      });
    }

    for (const transitionId of sortedKeys(packageEntry.allowed_mode_transitions ?? {})) {
      const transition = packageEntry.allowed_mode_transitions?.[transitionId];
      if (!transition) {
        continue;
      }

      if (transition.intent !== "request_mode_change") {
        diagnostics.push({
          code: "target.package_mode_execution.intent.unsupported",
          severity: "error",
          message: `Package mode transition ${transition.id} uses unsupported intent ${transition.intent}.`,
          path: `$.package_mode_phase.${packageId}.allowed_mode_transitions.${transitionId}.intent`
        });
      }

      if (transition.from_mode_id && !modeIds.has(transition.from_mode_id)) {
        diagnostics.push({
          code: "target.package_mode_execution.mode_transition.invalid",
          severity: "error",
          message: `Package mode transition ${transition.id} references unknown from_mode_id ${transition.from_mode_id}.`,
          path: `$.package_mode_phase.${packageId}.allowed_mode_transitions.${transitionId}.from_mode_id`
        });
      }

      if (!modeIds.has(transition.to_mode_id)) {
        diagnostics.push({
          code: "target.package_mode_execution.mode_transition.invalid",
          severity: "error",
          message: `Package mode transition ${transition.id} references unknown to_mode_id ${transition.to_mode_id}.`,
          path: `$.package_mode_phase.${packageId}.allowed_mode_transitions.${transitionId}.to_mode_id`
        });
      }
    }

    for (const transitionId of sortedKeys(packageEntry.allowed_phase_transitions ?? {})) {
      const transition = packageEntry.allowed_phase_transitions?.[transitionId];
      if (!transition) {
        continue;
      }

      if (transition.intent !== "request_phase_start" && transition.intent !== "request_phase_abort") {
        diagnostics.push({
          code: "target.package_mode_execution.intent.unsupported",
          severity: "error",
          message: `Package phase transition ${transition.id} uses unsupported intent ${transition.intent}.`,
          path: `$.package_mode_phase.${packageId}.allowed_phase_transitions.${transitionId}.intent`
        });
      }

      if (!phaseIds.has(transition.phase_id)) {
        diagnostics.push({
          code: "target.package_mode_execution.phase_transition.invalid",
          severity: "error",
          message: `Package phase transition ${transition.id} references unknown phase id ${transition.phase_id}.`,
          path: `$.package_mode_phase.${packageId}.allowed_phase_transitions.${transitionId}.phase_id`
        });
      }

      const allowedModeIds = transition.allowed_mode_ids ?? [];
      for (const [index, modeId] of allowedModeIds.entries()) {
        if (!modeIds.has(modeId)) {
          diagnostics.push({
            code: "target.package_mode_execution.phase_lane.unsupported",
            severity: "error",
            message: `Package phase transition ${transition.id} references unknown allowed mode id ${modeId}.`,
            path: `$.package_mode_phase.${packageId}.allowed_phase_transitions.${transitionId}.allowed_mode_ids[${index}]`
          });
          continue;
        }

        const owningMode = Object.values(packageEntry.modes).find((mode) => mode.qualified_id === modeId);
        if (owningMode && !(owningMode.phase_ids ?? []).includes(transition.phase_id)) {
          diagnostics.push({
            code: "target.package_mode_execution.phase_lane.unsupported",
            severity: "error",
            message: `Package phase transition ${transition.id} targets phase ${transition.phase_id} outside allowed mode lane ${modeId}.`,
            path: `$.package_mode_phase.${packageId}.allowed_phase_transitions.${transitionId}.allowed_mode_ids[${index}]`
          });
        }
      }

      if (transition.guard_state === "blocked") {
        diagnostics.push({
          code: "target.package_mode_execution.guard.blocked",
          severity: "warning",
          message: `Package phase transition ${transition.id} is currently blocked by its guard state.`,
          path: `$.package_mode_phase.${packageId}.allowed_phase_transitions.${transitionId}.guard_state`
        });
      }

      if (transition.guard_state === "unsupported") {
        diagnostics.push({
          code: "target.package_mode_execution.guard.unsupported",
          severity: "error",
          message: `Package phase transition ${transition.id} uses unsupported guard state semantics.`,
          path: `$.package_mode_phase.${packageId}.allowed_phase_transitions.${transitionId}.guard_state`
        });
      }
    }
  }

  return diagnostics;
}

function validatePackagePermissiveInterlock(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const packageSupport = esp32CapabilityProfile.package_permissive_interlock_support;

  for (const packageId of sortedKeys(pack.package_permissive_interlock ?? {})) {
    const packageEntry = pack.package_permissive_interlock?.[packageId];
    if (!packageEntry) {
      continue;
    }

    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_permissive_interlock.unsupported",
        severity: "error",
        message: "Package permissive/interlock metadata is not supported by the ESP32 target.",
        path: `$.package_permissive_interlock.${packageId}`
      });
      continue;
    }

    for (const permissiveId of sortedKeys(packageEntry.permissives ?? {})) {
      const permissive = packageEntry.permissives?.[permissiveId];
      if (!permissive) {
        continue;
      }

      permissive.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_permissive_interlock.${packageId}.permissives.${permissiveId}.source_ports[${index}]`,
          source,
          "target.package_permissive_interlock.source.unresolved",
          "Package permissive source"
        );
      });
    }

    for (const interlockId of sortedKeys(packageEntry.interlocks ?? {})) {
      const interlock = packageEntry.interlocks?.[interlockId];
      if (!interlock) {
        continue;
      }

      interlock.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_permissive_interlock.${packageId}.interlocks.${interlockId}.source_ports[${index}]`,
          source,
          "target.package_permissive_interlock.source.unresolved",
          "Package interlock source"
        );
      });
    }

    for (const summaryId of sortedKeys(packageEntry.summary_outputs ?? {})) {
      const summary = packageEntry.summary_outputs?.[summaryId];
      if (!summary) {
        continue;
      }

      validatePackageSource(
        pack,
        diagnostics,
        `$.package_permissive_interlock.${packageId}.summary_outputs.${summaryId}.source`,
        summary.source,
        "target.package_permissive_interlock.source.unresolved",
        "Package gate summary source"
      );
    }

    for (const monitorId of sortedKeys(packageEntry.aggregate_monitors ?? {})) {
      const monitor = packageEntry.aggregate_monitors?.[monitorId];
      if (!monitor) {
        continue;
      }

      if (monitor.kind !== "boolean_health_rollup") {
        diagnostics.push({
          code: "target.package_permissive_interlock.monitor_rollup.unsupported",
          severity: "error",
          message: `Package permissive/interlock monitor rollup kind \`${monitor.kind}\` is not supported by the ESP32 target.`,
          path: `$.package_permissive_interlock.${packageId}.aggregate_monitors.${monitorId}.kind`
        });
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_permissive_interlock.${packageId}.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          source,
          "target.package_permissive_interlock.source.unresolved",
          "Package gate monitor source"
        );
      });
    }

    for (const traceGroupId of sortedKeys(packageEntry.trace_groups ?? {})) {
      const traceGroup = packageEntry.trace_groups?.[traceGroupId];
      if (!traceGroup) {
        continue;
      }

      traceGroup.signals.forEach((signal, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_permissive_interlock.${packageId}.trace_groups.${traceGroupId}.signals[${index}]`,
          signal,
          "target.package_permissive_interlock.source.unresolved",
          "Package gate trace source"
        );
      });
    }

    for (const [index, permissiveId] of (packageEntry.gate_summary.permissive_ids ?? []).entries()) {
      const found = sortedKeys(packageEntry.permissives ?? {}).some((entryId) => packageEntry.permissives?.[entryId]?.qualified_id === permissiveId);
      if (!found) {
        diagnostics.push({
          code: "target.package_permissive_interlock.gate_ref.unresolved",
          severity: "error",
          message: `Package gate summary references unknown permissive id ${permissiveId}.`,
          path: `$.package_permissive_interlock.${packageId}.gate_summary.permissive_ids[${index}]`
        });
      }
    }

    for (const [index, interlockId] of (packageEntry.gate_summary.interlock_ids ?? []).entries()) {
      const found = sortedKeys(packageEntry.interlocks ?? {}).some((entryId) => packageEntry.interlocks?.[entryId]?.qualified_id === interlockId);
      if (!found) {
        diagnostics.push({
          code: "target.package_permissive_interlock.gate_ref.unresolved",
          severity: "error",
          message: `Package gate summary references unknown interlock id ${interlockId}.`,
          path: `$.package_permissive_interlock.${packageId}.gate_summary.interlock_ids[${index}]`
        });
      }
    }

    for (const guardId of sortedKeys(packageEntry.gate_summary.transition_guards ?? {})) {
      const guard = packageEntry.gate_summary.transition_guards?.[guardId];
      if (!guard) {
        continue;
      }

      if (guard.mode_transition_id && !pack.package_mode_phase?.[`pkgmode_${packageEntry.package_instance_id}`]?.allowed_mode_transitions) {
        diagnostics.push({
          code: "target.package_permissive_interlock.guard.invalid",
          severity: "error",
          message: `Package transition guard ${guard.id} references package mode transitions, but the runtime pack has no package_mode_phase entry for ${packageEntry.package_instance_id}.`,
          path: `$.package_permissive_interlock.${packageId}.gate_summary.transition_guards.${guardId}.mode_transition_id`
        });
      }
    }
  }

  return diagnostics;
}

function validatePackageProtectionRecovery(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const packageSupport = esp32CapabilityProfile.package_protection_recovery_support;

  for (const packageId of sortedKeys(pack.package_protection_recovery ?? {})) {
    const packageEntry = pack.package_protection_recovery?.[packageId];
    if (!packageEntry) {
      continue;
    }

    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_protection_recovery.unsupported",
        severity: "error",
        message: "Package protection/recovery metadata is not supported by the ESP32 target.",
        path: `$.package_protection_recovery.${packageId}`
      });
      continue;
    }

    for (const tripId of sortedKeys(packageEntry.trips ?? {})) {
      const trip = packageEntry.trips?.[tripId];
      if (!trip) {
        continue;
      }

      trip.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_protection_recovery.${packageId}.trips.${tripId}.source_ports[${index}]`,
          source,
          "target.package_protection_recovery.source.unresolved",
          "Package trip source"
        );
      });
    }

    for (const inhibitId of sortedKeys(packageEntry.inhibits ?? {})) {
      const inhibit = packageEntry.inhibits?.[inhibitId];
      if (!inhibit) {
        continue;
      }

      inhibit.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_protection_recovery.${packageId}.inhibits.${inhibitId}.source_ports[${index}]`,
          source,
          "target.package_protection_recovery.source.unresolved",
          "Package inhibit source"
        );
      });
    }

    for (const summaryId of sortedKeys(packageEntry.summary_outputs ?? {})) {
      const summary = packageEntry.summary_outputs?.[summaryId];
      if (!summary) {
        continue;
      }

      validatePackageSource(
        pack,
        diagnostics,
        `$.package_protection_recovery.${packageId}.summary_outputs.${summaryId}.source`,
        summary.source,
        "target.package_protection_recovery.source.unresolved",
        "Package protection summary source"
      );
    }

    for (const monitorId of sortedKeys(packageEntry.aggregate_monitors ?? {})) {
      const monitor = packageEntry.aggregate_monitors?.[monitorId];
      if (!monitor) {
        continue;
      }

      if (monitor.kind !== "boolean_health_rollup") {
        diagnostics.push({
          code: "target.package_protection_recovery.monitor_rollup.unsupported",
          severity: "error",
          message: `Package protection/recovery monitor rollup kind \`${monitor.kind}\` is not supported by the ESP32 target.`,
          path: `$.package_protection_recovery.${packageId}.aggregate_monitors.${monitorId}.kind`
        });
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_protection_recovery.${packageId}.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          source,
          "target.package_protection_recovery.source.unresolved",
          "Package protection monitor source"
        );
      });
    }

    for (const traceGroupId of sortedKeys(packageEntry.trace_groups ?? {})) {
      const traceGroup = packageEntry.trace_groups?.[traceGroupId];
      if (!traceGroup) {
        continue;
      }

      traceGroup.signals.forEach((signal, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_protection_recovery.${packageId}.trace_groups.${traceGroupId}.signals[${index}]`,
          signal,
          "target.package_protection_recovery.source.unresolved",
          "Package protection trace source"
        );
      });
    }

    for (const [index, tripId] of (packageEntry.protection_summary.trip_ids ?? []).entries()) {
      const found = sortedKeys(packageEntry.trips ?? {}).some((entryId) => packageEntry.trips?.[entryId]?.qualified_id === tripId);
      if (!found) {
        diagnostics.push({
          code: "target.package_protection_recovery.summary_ref.unresolved",
          severity: "error",
          message: `Package protection summary references unknown trip id ${tripId}.`,
          path: `$.package_protection_recovery.${packageId}.protection_summary.trip_ids[${index}]`
        });
      }
    }

    for (const [index, inhibitId] of (packageEntry.protection_summary.inhibit_ids ?? []).entries()) {
      const found = sortedKeys(packageEntry.inhibits ?? {}).some((entryId) => packageEntry.inhibits?.[entryId]?.qualified_id === inhibitId);
      if (!found) {
        diagnostics.push({
          code: "target.package_protection_recovery.summary_ref.unresolved",
          severity: "error",
          message: `Package protection summary references unknown inhibit id ${inhibitId}.`,
          path: `$.package_protection_recovery.${packageId}.protection_summary.inhibit_ids[${index}]`
        });
      }
    }

    for (const [index, requestId] of (packageEntry.protection_summary.recovery_request_ids ?? []).entries()) {
      if (!packageEntry.recovery_requests?.[requestId]) {
        diagnostics.push({
          code: "target.package_protection_recovery.summary_ref.unresolved",
          severity: "error",
          message: `Package protection summary references unknown recovery request id ${requestId}.`,
          path: `$.package_protection_recovery.${packageId}.protection_summary.recovery_request_ids[${index}]`
        });
      }
    }

    for (const requestId of sortedKeys(packageEntry.recovery_requests ?? {})) {
      const request = packageEntry.recovery_requests?.[requestId];
      if (!request) {
        continue;
      }

      if (!pack.operations[request.target_operation_id]) {
        diagnostics.push({
          code: "target.package_protection_recovery.recovery_request.invalid",
          severity: "error",
          message: `Package protection/recovery request ${request.id} references unknown target operation ${request.target_operation_id}.`,
          path: `$.package_protection_recovery.${packageId}.recovery_requests.${requestId}.target_operation_id`
        });
      }
    }
  }

  return diagnostics;
}

function validatePackageArbitration(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const packageSupport = esp32CapabilityProfile.package_arbitration_support;

  for (const packageId of sortedKeys(pack.package_arbitration ?? {})) {
    const packageEntry = pack.package_arbitration?.[packageId];
    if (!packageEntry) {
      continue;
    }

    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_arbitration.unsupported",
        severity: "error",
        message: "Package arbitration metadata is not supported by the ESP32 target.",
        path: `$.package_arbitration.${packageId}`
      });
      continue;
    }

    for (const laneId of sortedKeys(packageEntry.ownership_lanes ?? {})) {
      const lane = packageEntry.ownership_lanes?.[laneId];
      if (!lane) {
        continue;
      }

      if (packageSupport.supported_ownership_lanes && !packageSupport.supported_ownership_lanes.includes(lane.lane)) {
        diagnostics.push({
          code: "target.package_arbitration.ownership_lane.unsupported",
          severity: "error",
          message: `Package arbitration ownership lane \`${lane.lane}\` is not supported by the ESP32 target.`,
          path: `$.package_arbitration.${packageId}.ownership_lanes.${laneId}.lane`
        });
      }

      lane.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_arbitration.${packageId}.ownership_lanes.${laneId}.source_ports[${index}]`,
          source,
          "target.package_arbitration.source.unresolved",
          "Package arbitration ownership source"
        );
      });
    }

    for (const [index, laneId] of (packageEntry.ownership_summary.active_lane_ids ?? []).entries()) {
      if (!packageEntry.ownership_lanes?.[laneId]) {
        diagnostics.push({
          code: "target.package_arbitration.summary_ref.unresolved",
          severity: "error",
          message: `Package arbitration ownership summary references unknown lane id ${laneId}.`,
          path: `$.package_arbitration.${packageId}.ownership_summary.active_lane_ids[${index}]`
        });
      }
    }

    for (const commandLaneId of sortedKeys(packageEntry.command_lanes ?? {})) {
      const commandLane = packageEntry.command_lanes?.[commandLaneId];
      if (!commandLane) {
        continue;
      }

      if (!packageEntry.ownership_lanes?.[commandLane.ownership_lane_id]) {
        diagnostics.push({
          code: "target.package_arbitration.summary_ref.unresolved",
          severity: "error",
          message: `Package arbitration command lane ${commandLane.id} references unknown ownership lane ${commandLane.ownership_lane_id}.`,
          path: `$.package_arbitration.${packageId}.command_lanes.${commandLaneId}.ownership_lane_id`
        });
      }

      if (!pack.instances[commandLane.target_instance_id]) {
        diagnostics.push({
          code: "target.package_arbitration.target_instance.unresolved",
          severity: "error",
          message: `Package arbitration command lane ${commandLane.id} references unknown target instance ${commandLane.target_instance_id}.`,
          path: `$.package_arbitration.${packageId}.command_lanes.${commandLaneId}.target_instance_id`
        });
      }

      if (packageSupport.supported_request_kinds && !packageSupport.supported_request_kinds.includes(commandLane.request_kind)) {
        diagnostics.push({
          code: "target.package_arbitration.request_kind.unsupported",
          severity: "error",
          message: `Package arbitration request kind \`${commandLane.request_kind}\` is not supported by the ESP32 target.`,
          path: `$.package_arbitration.${packageId}.command_lanes.${commandLaneId}.request_kind`
        });
      }

      if (commandLane.superseded_by_lane_id && !packageEntry.command_lanes?.[commandLane.superseded_by_lane_id]) {
        diagnostics.push({
          code: "target.package_arbitration.summary_ref.unresolved",
          severity: "error",
          message: `Package arbitration command lane ${commandLane.id} references unknown superseded lane id ${commandLane.superseded_by_lane_id}.`,
          path: `$.package_arbitration.${packageId}.command_lanes.${commandLaneId}.superseded_by_lane_id`
        });
      }
    }

    for (const summaryId of sortedKeys(packageEntry.summary_outputs ?? {})) {
      const summary = packageEntry.summary_outputs?.[summaryId];
      if (!summary) {
        continue;
      }

      validatePackageSource(
        pack,
        diagnostics,
        `$.package_arbitration.${packageId}.summary_outputs.${summaryId}.source`,
        summary.source,
        "target.package_arbitration.source.unresolved",
        "Package arbitration summary source"
      );
    }

    for (const monitorId of sortedKeys(packageEntry.aggregate_monitors ?? {})) {
      const monitor = packageEntry.aggregate_monitors?.[monitorId];
      if (!monitor) {
        continue;
      }

      if (monitor.kind !== "boolean_health_rollup") {
        diagnostics.push({
          code: "target.package_arbitration.monitor_rollup.unsupported",
          severity: "error",
          message: `Package arbitration monitor rollup kind \`${monitor.kind}\` is not supported by the ESP32 target.`,
          path: `$.package_arbitration.${packageId}.aggregate_monitors.${monitorId}.kind`
        });
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_arbitration.${packageId}.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          source,
          "target.package_arbitration.source.unresolved",
          "Package arbitration monitor source"
        );
      });
    }

    for (const traceGroupId of sortedKeys(packageEntry.trace_groups ?? {})) {
      const traceGroup = packageEntry.trace_groups?.[traceGroupId];
      if (!traceGroup) {
        continue;
      }

      traceGroup.signals.forEach((signal, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_arbitration.${packageId}.trace_groups.${traceGroupId}.signals[${index}]`,
          signal,
          "target.package_arbitration.source.unresolved",
          "Package arbitration trace source"
        );
      });
    }

    for (const [sectionName, ids, collection] of [
      ["active_owner_lane_ids", packageEntry.command_summary.active_owner_lane_ids ?? [], packageEntry.ownership_lanes ?? {}],
      ["accepted_lane_ids", packageEntry.command_summary.accepted_lane_ids ?? [], packageEntry.command_lanes ?? {}],
      ["blocked_lane_ids", packageEntry.command_summary.blocked_lane_ids ?? [], packageEntry.command_lanes ?? {}],
      ["denied_lane_ids", packageEntry.command_summary.denied_lane_ids ?? [], packageEntry.command_lanes ?? {}],
      ["superseded_lane_ids", packageEntry.command_summary.superseded_lane_ids ?? [], packageEntry.command_lanes ?? {}]
    ] as const) {
      ids.forEach((entryId, index) => {
        if (!collection[entryId]) {
          diagnostics.push({
            code: "target.package_arbitration.summary_ref.unresolved",
            severity: "error",
            message: `Package arbitration command summary references unknown id ${entryId}.`,
            path: `$.package_arbitration.${packageId}.command_summary.${sectionName}[${index}]`
          });
        }
      });
    }
  }

  return diagnostics;
}

function validatePackageOverrideHandover(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const packageSupport = esp32CapabilityProfile.package_override_handover_support;

  for (const packageId of sortedKeys(pack.package_override_handover ?? {})) {
    const packageEntry = pack.package_override_handover?.[packageId];
    if (!packageEntry) {
      continue;
    }

    if (!packageSupport?.enabled) {
      diagnostics.push({
        code: "target.package_override_handover.unsupported",
        severity: "error",
        message: "Package override/handover metadata is not supported by the ESP32 target.",
        path: `$.package_override_handover.${packageId}`
      });
      continue;
    }

    for (const holderId of sortedKeys(packageEntry.authority_holders ?? {})) {
      const holder = packageEntry.authority_holders?.[holderId];
      if (!holder) {
        continue;
      }

      if (packageSupport.supported_holder_lanes && !packageSupport.supported_holder_lanes.includes(holder.lane)) {
        diagnostics.push({
          code: "target.package_override_handover.holder_lane.unsupported",
          severity: "error",
          message: `Package override/handover holder lane \`${holder.lane}\` is not supported by the ESP32 target.`,
          path: `$.package_override_handover.${packageId}.authority_holders.${holderId}.lane`
        });
      }

      holder.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_override_handover.${packageId}.authority_holders.${holderId}.source_ports[${index}]`,
          source,
          "target.package_override_handover.source.unresolved",
          "Package override/handover holder source"
        );
      });
    }

    const summary = packageEntry.handover_summary;
    if (!packageEntry.authority_holders?.[summary.current_holder_id]) {
      diagnostics.push({
        code: "target.package_override_handover.current_holder.unresolved",
        severity: "error",
        message: `Package override/handover summary references unknown current holder ${summary.current_holder_id}.`,
        path: `$.package_override_handover.${packageId}.handover_summary.current_holder_id`
      });
    }

    const currentHolder = packageEntry.authority_holders?.[summary.current_holder_id];
    if (currentHolder && currentHolder.lane !== summary.current_lane) {
      diagnostics.push({
        code: "target.package_override_handover.current_holder.invalid",
        severity: "error",
        message: `Package override/handover summary current lane ${summary.current_lane} does not match holder lane ${currentHolder.lane}.`,
        path: `$.package_override_handover.${packageId}.handover_summary.current_lane`
      });
    }

    if (summary.requested_holder_id && !packageEntry.authority_holders?.[summary.requested_holder_id]) {
      diagnostics.push({
        code: "target.package_override_handover.summary_ref.unresolved",
        severity: "error",
        message: `Package override/handover summary references unknown requested holder ${summary.requested_holder_id}.`,
        path: `$.package_override_handover.${packageId}.handover_summary.requested_holder_id`
      });
    }

    for (const [sectionName, ids] of [
      ["accepted_request_ids", summary.accepted_request_ids ?? []],
      ["blocked_request_ids", summary.blocked_request_ids ?? []],
      ["denied_request_ids", summary.denied_request_ids ?? []]
    ] as const) {
      ids.forEach((entryId, index) => {
        if (!packageEntry.handover_requests?.[entryId]) {
          diagnostics.push({
            code: "target.package_override_handover.summary_ref.unresolved",
            severity: "error",
            message: `Package override/handover summary references unknown request id ${entryId}.`,
            path: `$.package_override_handover.${packageId}.handover_summary.${sectionName}[${index}]`
          });
        }
      });
    }

    for (const requestId of sortedKeys(packageEntry.handover_requests ?? {})) {
      const request = packageEntry.handover_requests?.[requestId];
      if (!request) {
        continue;
      }

      if (!packageEntry.authority_holders?.[request.requested_holder_id]) {
        diagnostics.push({
          code: "target.package_override_handover.requested_holder.unresolved",
          severity: "error",
          message: `Package handover request ${request.id} references unknown requested holder ${request.requested_holder_id}.`,
          path: `$.package_override_handover.${packageId}.handover_requests.${requestId}.requested_holder_id`
        });
      }

      if (packageSupport.supported_request_kinds && !packageSupport.supported_request_kinds.includes(request.request_kind)) {
        diagnostics.push({
          code: "target.package_override_handover.request_kind.unsupported",
          severity: "error",
          message: `Package override/handover request kind \`${request.request_kind}\` is not supported by the ESP32 target.`,
          path: `$.package_override_handover.${packageId}.handover_requests.${requestId}.request_kind`
        });
      }

      if (request.blocked_reason && packageSupport.supported_denial_reasons && !packageSupport.supported_denial_reasons.includes(request.blocked_reason)) {
        diagnostics.push({
          code: "target.package_override_handover.reason.unsupported",
          severity: "error",
          message: `Package override/handover blocked reason \`${request.blocked_reason}\` is not supported by the ESP32 target.`,
          path: `$.package_override_handover.${packageId}.handover_requests.${requestId}.blocked_reason`
        });
      }

      if (request.denied_reason && packageSupport.supported_denial_reasons && !packageSupport.supported_denial_reasons.includes(request.denied_reason)) {
        diagnostics.push({
          code: "target.package_override_handover.reason.unsupported",
          severity: "error",
          message: `Package override/handover denied reason \`${request.denied_reason}\` is not supported by the ESP32 target.`,
          path: `$.package_override_handover.${packageId}.handover_requests.${requestId}.denied_reason`
        });
      }
    }

    for (const summaryId of sortedKeys(packageEntry.summary_outputs ?? {})) {
      const summaryOutput = packageEntry.summary_outputs?.[summaryId];
      if (!summaryOutput) {
        continue;
      }

      validatePackageSource(
        pack,
        diagnostics,
        `$.package_override_handover.${packageId}.summary_outputs.${summaryId}.source`,
        summaryOutput.source,
        "target.package_override_handover.source.unresolved",
        "Package override/handover summary source"
      );
    }

    for (const monitorId of sortedKeys(packageEntry.aggregate_monitors ?? {})) {
      const monitor = packageEntry.aggregate_monitors?.[monitorId];
      if (!monitor) {
        continue;
      }

      if (monitor.kind !== "boolean_health_rollup") {
        diagnostics.push({
          code: "target.package_override_handover.monitor_rollup.unsupported",
          severity: "error",
          message: `Package override/handover monitor rollup kind \`${monitor.kind}\` is not supported by the ESP32 target.`,
          path: `$.package_override_handover.${packageId}.aggregate_monitors.${monitorId}.kind`
        });
      }

      monitor.source_ports.forEach((source, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_override_handover.${packageId}.aggregate_monitors.${monitorId}.source_ports[${index}]`,
          source,
          "target.package_override_handover.source.unresolved",
          "Package override/handover monitor source"
        );
      });
    }

    for (const traceGroupId of sortedKeys(packageEntry.trace_groups ?? {})) {
      const traceGroup = packageEntry.trace_groups?.[traceGroupId];
      if (!traceGroup) {
        continue;
      }

      traceGroup.signals.forEach((signal, index) => {
        validatePackageSource(
          pack,
          diagnostics,
          `$.package_override_handover.${packageId}.trace_groups.${traceGroupId}.signals[${index}]`,
          signal,
          "target.package_override_handover.source.unresolved",
          "Package override/handover trace source"
        );
      });
    }
  }

  return diagnostics;
}

function validatePackageSource(
  pack: RuntimePack,
  diagnostics: TargetAdapterDiagnostic[],
  path: string,
  source: { instance_id: string; port_id: string },
  code = "target.package_supervision.source.unresolved",
  label = "Package supervision source"
): void {
  const port = pack.instances[source.instance_id]?.ports?.[source.port_id];
  if (!port) {
    diagnostics.push({
      code,
      severity: "error",
      message: `${label} \`${source.instance_id}.${source.port_id}\` cannot be resolved from the runtime pack.`,
      path
    });
  }
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

function validateCommBridgeExecution(
  pack: RuntimePack,
  instanceId: string,
  diagnostics: TargetAdapterDiagnostic[]
): void {
  const execution = pack.instances[instanceId]?.native_execution;
  if (!execution) {
    return;
  }

  const activeFrontendIds = [...(execution.frontend_requirement_ids ?? [])].sort((left, right) => left.localeCompare(right));
  const requiredFrontendId = `fe_${instanceId}_bus_source`;

  if (activeFrontendIds.length === 0) {
    diagnostics.push({
      code: "target.comm_bridge.frontend.missing",
      severity: "error",
      message: `CommBridge instance \`${instanceId}\` has no active frontend requirement ids.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
    return;
  }

  if (!activeFrontendIds.includes(requiredFrontendId)) {
    diagnostics.push({
      code: "target.comm_bridge.frontend.missing_required",
      severity: "error",
      message: `CommBridge instance \`${instanceId}\` is missing required frontend requirement \`${requiredFrontendId}\`.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  if (activeFrontendIds.length !== 1) {
    diagnostics.push({
      code: "target.comm_bridge.frontend.unexpected_count",
      severity: "error",
      message: `CommBridge instance \`${instanceId}\` must expose exactly one active frontend requirement.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  const requirement = pack.frontend_requirements[requiredFrontendId];
  if (!requirement) {
    diagnostics.push({
      code: "target.comm_bridge.frontend.unresolved",
      severity: "error",
      message: `CommBridge instance \`${instanceId}\` references unknown frontend requirement \`${requiredFrontendId}\`.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  } else {
    if (requirement.owner_instance_id !== instanceId) {
      diagnostics.push({
        code: "target.comm_bridge.frontend.owner_mismatch",
        severity: "error",
        message: `Frontend requirement \`${requiredFrontendId}\` does not belong to CommBridge instance \`${instanceId}\`.`,
        path: `$.frontend_requirements.${requiredFrontendId}.owner_instance_id`
      });
    }

    if (requirement.binding_kind !== "bus") {
      diagnostics.push({
        code: "target.comm_bridge.binding_kind.mismatch",
        severity: "error",
        message: "CommBridge bus_source requires `bus` binding metadata.",
        path: `$.frontend_requirements.${requiredFrontendId}.binding_kind`
      });
    }

    if (stringRecordValue(requirement.config, "bus_kind") !== "modbus_rtu") {
      diagnostics.push({
        code: "target.comm_bridge.bus_kind.unsupported",
        severity: "error",
        message: "CommBridge supports only `modbus_rtu` in the communications baseline.",
        path: `$.frontend_requirements.${requiredFrontendId}.config.bus_kind`
      });
    }

    if (stringRecordValue(requirement.config, "access_mode") !== "read_only") {
      diagnostics.push({
        code: "target.comm_bridge.access_mode.unsupported",
        severity: "error",
        message: "CommBridge supports only `read_only` access in the communications baseline.",
        path: `$.frontend_requirements.${requiredFrontendId}.config.access_mode`
      });
    }
  }

  if (execution.mode !== "modbus_rtu") {
    diagnostics.push({
      code: "target.comm_bridge.mode.unsupported",
      severity: "error",
      message: "CommBridge supports only `modbus_rtu` mode in the communications baseline.",
      path: `$.instances.${instanceId}.native_execution.mode`
    });
  }

  if (stringRecordValue(execution.config_template, "access_mode") !== "read_only") {
    diagnostics.push({
      code: "target.comm_bridge.access_mode.unsupported",
      severity: "error",
      message: "CommBridge native execution supports only `read_only` access in the communications baseline.",
      path: `$.instances.${instanceId}.native_execution.config_template.access_mode`
    });
  }

  const directResources = findDirectInstanceResources(pack, instanceId);
  if (directResources.length > 0 && !directResources.some((resource) => resource.binding_kind === "bus")) {
    diagnostics.push({
      code: "target.comm_bridge.binding_kind.mismatch",
      severity: "error",
      message: "CommBridge requires a direct `bus` resource binding.",
      path: `$.resources.${directResources[0]!.id}.binding_kind`
    });
  }

  const busResource = directResources.find((resource) => resource.binding_kind === "bus");
  if (busResource && stringRecordValue(busResource.config, "driver") !== "modbus_rtu") {
    diagnostics.push({
      code: "target.comm_bridge.driver.unsupported",
      severity: "error",
      message: "CommBridge bus resources must use the `modbus_rtu` driver in the communications baseline.",
      path: `$.resources.${busResource.id}.config.driver`
    });
  }
}

function validateRemotePointExecution(
  pack: RuntimePack,
  instanceId: string,
  diagnostics: TargetAdapterDiagnostic[]
): void {
  const instance = pack.instances[instanceId];
  const execution = instance?.native_execution;
  if (!instance || !execution) {
    return;
  }

  const activeFrontendIds = [...(execution.frontend_requirement_ids ?? [])].sort((left, right) => left.localeCompare(right));
  const requiredFrontendId = `fe_${instanceId}_remote_source`;

  if (activeFrontendIds.length === 0) {
    diagnostics.push({
      code: "target.remote_point.frontend.missing",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` has no active frontend requirement ids.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
    return;
  }

  if (!activeFrontendIds.includes(requiredFrontendId)) {
    diagnostics.push({
      code: "target.remote_point.frontend.missing_required",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` is missing required frontend requirement \`${requiredFrontendId}\`.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  if (activeFrontendIds.length !== 1) {
    diagnostics.push({
      code: "target.remote_point.frontend.unexpected_count",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` must expose exactly one active frontend requirement.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  const requirement = pack.frontend_requirements[requiredFrontendId];
  if (!requirement) {
    diagnostics.push({
      code: "target.remote_point.frontend.unresolved",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` references unknown frontend requirement \`${requiredFrontendId}\`.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
    return;
  }

  if (requirement.owner_instance_id !== instanceId) {
    diagnostics.push({
      code: "target.remote_point.frontend.owner_mismatch",
      severity: "error",
      message: `Frontend requirement \`${requiredFrontendId}\` does not belong to RemotePointFrontend instance \`${instanceId}\`.`,
      path: `$.frontend_requirements.${requiredFrontendId}.owner_instance_id`
    });
  }

  if (requirement.binding_kind !== "service") {
    diagnostics.push({
      code: "target.remote_point.binding_kind.mismatch",
      severity: "error",
      message: "RemotePointFrontend remote_source requires `service` binding metadata.",
      path: `$.frontend_requirements.${requiredFrontendId}.binding_kind`
    });
  }

  if (requirement.channel_kind !== "telemetry") {
    diagnostics.push({
      code: "target.remote_point.channel_kind.mismatch",
      severity: "error",
      message: "RemotePointFrontend remote_source requires `telemetry` channel kind.",
      path: `$.frontend_requirements.${requiredFrontendId}.channel_kind`
    });
  }

  if (execution.mode !== "modbus_rtu") {
    diagnostics.push({
      code: "target.remote_point.mode.unsupported",
      severity: "error",
      message: "RemotePointFrontend supports only `modbus_rtu` mode in the communications baseline.",
      path: `$.instances.${instanceId}.native_execution.mode`
    });
  }

  if (stringRecordValue(requirement.config, "access_mode") !== "read_only") {
    diagnostics.push({
      code: "target.remote_point.access_mode.unsupported",
      severity: "error",
      message: "RemotePointFrontend supports only `read_only` access in the communications baseline.",
      path: `$.frontend_requirements.${requiredFrontendId}.config.access_mode`
    });
  }

  if (stringRecordValue(execution.config_template, "access_mode") !== "read_only") {
    diagnostics.push({
      code: "target.remote_point.access_mode.unsupported",
      severity: "error",
      message: "RemotePointFrontend native execution supports only `read_only` access in the communications baseline.",
      path: `$.instances.${instanceId}.native_execution.config_template.access_mode`
    });
  }

  const configuredScope = stringRecordValue(execution.config_template, "scope");
  if (configuredScope && configuredScope !== "single_point_read_baseline") {
    diagnostics.push({
      code: "target.remote_point.scope.unsupported",
      severity: "error",
      message: "RemotePointFrontend supports only single-point baseline scope on the ESP32 target.",
      path: `$.instances.${instanceId}.native_execution.config_template.scope`
    });
  }

  const bridgeRefParam = stringRecordValue(execution.config_template, "bridge_ref_param") ??
    stringRecordValue(requirement.config, "bridge_ref_param") ??
    "bridge_ref";
  const bridgeRef = stringParam(instance.params?.[bridgeRefParam]?.value);
  if (!bridgeRef) {
    diagnostics.push({
      code: "target.remote_point.bridge_ref.missing",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` is missing bridge ref param \`${bridgeRefParam}\`.`,
      path: `$.instances.${instanceId}.params.${bridgeRefParam}`
    });
    return;
  }

  const bridgeInstance = pack.instances[bridgeRef];
  if (!bridgeInstance) {
    diagnostics.push({
      code: "target.remote_point.bridge_ref.unresolved",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` references unknown bridge instance \`${bridgeRef}\`.`,
      path: `$.instances.${instanceId}.params.${bridgeRefParam}.value`
    });
    return;
  }

  if (bridgeInstance.native_execution?.native_kind !== "std.comm_bridge.v1") {
    diagnostics.push({
      code: "target.remote_point.bridge_kind.mismatch",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` must reference a CommBridge baseline object.`,
      path: `$.instances.${instanceId}.params.${bridgeRefParam}.value`
    });
  }

  const bridgeBusResource = findDirectInstanceResources(pack, bridgeRef)
    .find((resource) => resource.binding_kind === "bus");
  if (!bridgeBusResource) {
    diagnostics.push({
      code: "target.remote_point.bridge_resource.missing",
      severity: "error",
      message: `RemotePointFrontend instance \`${instanceId}\` references bridge \`${bridgeRef}\` without a bus resource binding.`,
      path: `$.instances.${instanceId}.params.${bridgeRefParam}.value`
    });
  }

  const outputPort = instance.ports?.value_out;
  const valueDecode = stringParam(instance.params?.value_decode?.value) ?? "float32";
  const supportedDecode = SUPPORTED_REMOTE_POINT_DECODES[valueDecode];
  const registerCount = numericParam(instance.params?.register_count?.value) ?? 0;
  const resolvedValueType = outputPort?.value_type ?? requirement.value_type;

  if (!supportedDecode || supportedDecode.value_type !== resolvedValueType || supportedDecode.register_count !== registerCount) {
    diagnostics.push({
      code: "target.remote_point.decode_combo.unsupported",
      severity: "error",
      message: "RemotePointFrontend supports only the baseline decode/value-type combinations on the ESP32 target.",
      path: `$.instances.${instanceId}.params.value_decode.value`
    });
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
  const bridgeBackedResources = findFrontendBridgeResources(pack, requirement);
  const sourceResources = findFrontendSourceResources(pack, matchingConnections);
  const directPorts = (requirement.source_ports ?? [])
    .map((port) => pack.instances[port.instance_id]?.ports?.[port.port_id])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
  const hasOwnerSourcePort = requirement.source_ports?.some((port) => port.instance_id === requirement.owner_instance_id) ?? false;
  const expectsDirectResource = requirement.binding_kind !== undefined && (
    requirement.kind === "bus_source" ||
    hasOwnerSourcePort
  );

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

  if (matchingConnections.length === 0 && directResources.length === 0 && bridgeBackedResources.length === 0) {
    diagnostics.push({
      code: expectsDirectResource ? "target.frontend.resource.missing" : "target.frontend.connection.missing",
      severity: "error",
      message: expectsDirectResource
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
      sourceResources.some((resource) => resource.binding_kind === requirement.binding_kind) ||
      bridgeBackedResources.some((resource) => resource.binding_kind === "bus");
    const ownerNativeKind = pack.instances[requirement.owner_instance_id]?.native_execution?.native_kind;
    const allowConnectionOnly = ownerNativeKind !== undefined &&
      WAVE3_CONNECTION_ONLY_NATIVE_KINDS.has(ownerNativeKind) &&
      matchingConnections.length > 0;
    if (!resourceMatch && !allowConnectionOnly) {
      diagnostics.push({
        code: "target.frontend.resource.missing",
        severity: "error",
        message: `Required frontend requirement \`${requirementId}\` has no compatible resource binding on the ESP32 target.`,
        path: `$.frontend_requirements.${requirementId}`
      });
    }
  }
}

function validateSingleInputExecution(
  pack: RuntimePack,
  instanceId: string,
  diagnostics: TargetAdapterDiagnostic[],
  options: {
    code_prefix: string;
    label: string;
    required_suffix: string;
    required_binding_kind: string;
    required_channel_kind: string;
    allowed_value_types: string[];
  }
): void {
  const execution = pack.instances[instanceId]?.native_execution;
  if (!execution) {
    return;
  }

  const activeFrontendIds = [...(execution.frontend_requirement_ids ?? [])].sort((left, right) => left.localeCompare(right));
  const requiredFrontendId = `fe_${instanceId}_${options.required_suffix}`;

  if (activeFrontendIds.length === 0) {
    diagnostics.push({
      code: `${options.code_prefix}.frontend.missing`,
      severity: "error",
      message: `${options.label} instance \`${instanceId}\` has no active frontend requirement ids.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
    return;
  }

  if (!activeFrontendIds.includes(requiredFrontendId)) {
    diagnostics.push({
      code: `${options.code_prefix}.frontend.missing_required`,
      severity: "error",
      message: `${options.label} instance \`${instanceId}\` is missing required frontend requirement \`${requiredFrontendId}\`.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  if (activeFrontendIds.length !== 1) {
    diagnostics.push({
      code: `${options.code_prefix}.frontend.unexpected_count`,
      severity: "error",
      message: `${options.label} instance \`${instanceId}\` must expose exactly one active frontend requirement.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  for (const frontendId of activeFrontendIds) {
    const requirement = pack.frontend_requirements[frontendId];
    if (!requirement) {
      diagnostics.push({
        code: `${options.code_prefix}.frontend.unresolved`,
        severity: "error",
        message: `${options.label} instance \`${instanceId}\` references unknown frontend requirement \`${frontendId}\`.`,
        path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
      });
      continue;
    }

    if (requirement.owner_instance_id !== instanceId) {
      diagnostics.push({
        code: `${options.code_prefix}.frontend.owner_mismatch`,
        severity: "error",
        message: `Frontend requirement \`${frontendId}\` does not belong to ${options.label} instance \`${instanceId}\`.`,
        path: `$.frontend_requirements.${frontendId}.owner_instance_id`
      });
    }
  }

  const requirement = pack.frontend_requirements[requiredFrontendId];
  if (!requirement) {
    return;
  }

  if (requirement.binding_kind !== options.required_binding_kind) {
    diagnostics.push({
      code: `${options.code_prefix}.binding_kind.mismatch`,
      severity: "error",
      message: `${options.label} input requires \`${options.required_binding_kind}\` binding metadata.`,
      path: `$.frontend_requirements.${requiredFrontendId}.binding_kind`
    });
  }

  if (requirement.channel_kind !== options.required_channel_kind) {
    diagnostics.push({
      code: `${options.code_prefix}.channel_kind.mismatch`,
      severity: "error",
      message: `${options.label} input requires \`${options.required_channel_kind}\` channel kind.`,
      path: `$.frontend_requirements.${requiredFrontendId}.channel_kind`
    });
  }

  const matchingConnections = findFrontendConnections(pack, requirement);
  const directPorts = (requirement.source_ports ?? [])
    .map((port) => pack.instances[port.instance_id]?.ports?.[port.port_id])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);
  const actualValueTypes = new Set<string>([
    ...matchingConnections.map((connection) => connection.value_type),
    ...directPorts.map((port) => port.value_type)
  ]);

  if (actualValueTypes.size > 0 && ![...actualValueTypes].every((valueType) => options.allowed_value_types.includes(valueType))) {
    diagnostics.push({
      code: `${options.code_prefix}.value_type.mismatch`,
      severity: "error",
      message: `${options.label} input requires one of: ${options.allowed_value_types.join(", ")}.`,
      path: `$.frontend_requirements.${requiredFrontendId}.value_type`
    });
  }
}

function validateRuntimeInputExecution(
  pack: RuntimePack,
  instanceId: string,
  diagnostics: TargetAdapterDiagnostic[],
  options: {
    code_prefix: string;
    label: string;
    input_port_id: string;
    required_channel_kind: string;
    allowed_value_types: string[];
  }
): void {
  const execution = pack.instances[instanceId]?.native_execution;
  if (!execution) {
    return;
  }

  const activeFrontendIds = [...(execution.frontend_requirement_ids ?? [])].sort((left, right) => left.localeCompare(right));
  if (activeFrontendIds.length > 0) {
    diagnostics.push({
      code: `${options.code_prefix}.frontend.unexpected`,
      severity: "error",
      message: `${options.label} instance \`${instanceId}\` must not declare frontend requirement ids for downstream runtime inputs.`,
      path: `$.instances.${instanceId}.native_execution.frontend_requirement_ids`
    });
  }

  const inputPort = pack.instances[instanceId]?.ports?.[options.input_port_id];
  if (!inputPort) {
    diagnostics.push({
      code: `${options.code_prefix}.input.missing`,
      severity: "error",
      message: `${options.label} instance \`${instanceId}\` is missing required input port \`${options.input_port_id}\`.`,
      path: `$.instances.${instanceId}.ports.${options.input_port_id}`
    });
    return;
  }

  const incomingConnections = sortedKeys(pack.connections)
    .map((connectionId) => pack.connections[connectionId])
    .filter((connection) => (
      connection.target.instance_id === instanceId &&
      connection.target.port_id === options.input_port_id
    ));

  if (incomingConnections.length === 0) {
    diagnostics.push({
      code: `${options.code_prefix}.input.missing`,
      severity: "error",
      message: `${options.label} instance \`${instanceId}\` requires an upstream runtime connection for \`${options.input_port_id}\`.`,
      path: `$.instances.${instanceId}.ports.${options.input_port_id}`
    });
    return;
  }

  const channelMismatch = incomingConnections.find((connection) => connection.channel_kind !== options.required_channel_kind);
  if (channelMismatch) {
    diagnostics.push({
      code: `${options.code_prefix}.channel_kind.mismatch`,
      severity: "error",
      message: `${options.label} input requires \`${options.required_channel_kind}\` channel kind.`,
      path: `$.connections.${channelMismatch.id}.channel_kind`
    });
  }

  const valueTypeMismatch = incomingConnections.find((connection) => !options.allowed_value_types.includes(connection.value_type));
  if (valueTypeMismatch) {
    diagnostics.push({
      code: `${options.code_prefix}.value_type.mismatch`,
      severity: "error",
      message: `${options.label} input requires one of: ${options.allowed_value_types.join(", ")}.`,
      path: `$.connections.${valueTypeMismatch.id}.value_type`
    });
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

function findFrontendBridgeResources(
  pack: RuntimePack,
  requirement: RuntimeFrontendRequirement
): RuntimeResourceBinding[] {
  const bridgeRefParam = stringRecordValue(requirement.config, "bridge_ref_param");
  if (!bridgeRefParam) {
    return [];
  }

  const ownerInstance = pack.instances[requirement.owner_instance_id];
  const bridgeRef = stringParam(ownerInstance?.params?.[bridgeRefParam]?.value);
  if (!bridgeRef) {
    return [];
  }

  return findDirectInstanceResources(pack, bridgeRef)
    .filter((resource) => resource.binding_kind === "bus");
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

function findDirectInstanceResources(
  pack: RuntimePack,
  instanceId: string
): RuntimeResourceBinding[] {
  return Object.values(pack.resources ?? {}).filter((resource) => (
    resource.instance_id === instanceId &&
    resource.port_id === undefined
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

function numericParam(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}

function stringParam(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringRecordValue(record: unknown, key: string): string | undefined {
  if (!record || typeof record !== "object") {
    return undefined;
  }

  const value = (record as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}
