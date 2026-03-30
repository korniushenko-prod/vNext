import type {
  RuntimeConnection,
  RuntimeEndpoint,
  RuntimeOperationAvailability,
  RuntimeInstance,
  RuntimeFrontendRequirement,
  RuntimeMonitor,
  RuntimeNativeExecution,
  RuntimeOperation,
  RuntimeOperationResultContract,
  RuntimeOperationRuntimeContract,
  RuntimePackageAggregateAlarm,
  RuntimePackageAggregateMonitor,
  RuntimePackageCoordination,
  RuntimePackageArbitration,
  RuntimePackageArbitrationResult,
  RuntimePackageAuthorityHolder,
  RuntimePackageCoordinationOperationProxy,
  RuntimePackageCoordinationStateRule,
  RuntimePackageCommandLane,
  RuntimePackageCommandSummary,
  RuntimePackageGateSummary,
  RuntimePackageHandoverRequest,
  RuntimePackageHandoverSummary,
  RuntimePackageInterlock,
  RuntimePackageModeRuntimeContract,
  RuntimePackageAllowedModeTransition,
  RuntimePackageAllowedPhaseTransition,
  RuntimePackageModeDef,
  RuntimePackageModeGroup,
  RuntimePackageModePhase,
  RuntimePackageModeSummary,
  RuntimePackageModeSummaryEntry,
  RuntimePackagePhaseDef,
  RuntimePackagePhaseGroup,
  RuntimePackagePhaseSummary,
  RuntimePackagePhaseSummaryEntry,
  RuntimePackagePermissive,
  RuntimePackagePermissiveInterlock,
  RuntimePackageProtectionDiagnosticSummary,
  RuntimePackageProtectionRecovery,
  RuntimePackageProtectionSummary,
  RuntimePackageRecoveryRequest,
  RuntimePackageTrip,
  RuntimePackageInhibit,
  RuntimePackageOverrideHandover,
  RuntimePackageOwnershipLaneDef,
  RuntimePackageOwnershipSummary,
  RuntimePackageOperationProxy,
  RuntimePackageSummaryOutput,
  RuntimePackageSupervision,
  RuntimePackageTraceGroup,
  RuntimePackageTransitionGuardRef,
  RuntimePack,
  RuntimePackSource,
  RuntimePersistenceSlot,
  RuntimePort,
  RuntimeResolvedParam,
  RuntimeOperationSnapshot,
  RuntimeTraceGroup,
  RuntimeResourceBinding
} from "./types.js";
import {
  RUNTIME_PACK_SCHEMA_VERSION,
  WAVE14_PACKAGE_MODE_EXECUTION_INTENTS,
  WAVE14_PACKAGE_MODE_TRANSITION_STATES,
  WAVE14_PACKAGE_PHASE_STATES,
  WAVE14_PACKAGE_TRANSITION_GUARD_STATES,
  WAVE15_PACKAGE_GATE_STATES,
  WAVE15_PACKAGE_INTERLOCK_ACTIVE_STATES,
  WAVE16_PACKAGE_PROTECTION_STATES,
  WAVE17_PACKAGE_ARBITRATION_RESULTS,
  WAVE17_PACKAGE_COMMAND_REQUEST_KINDS,
  WAVE17_PACKAGE_OWNERSHIP_LANES,
  WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_STATES
} from "./constants.js";

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

export function validateRuntimePack(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];

  if (!isRecord(value)) {
    return fail(diagnostics, error("runtime_pack.invalid", "$", "Runtime pack must be an object."));
  }

  requireExactString(value, "schema_version", RUNTIME_PACK_SCHEMA_VERSION, "$.schema_version", diagnostics);
  requireString(value, "pack_id", "$.pack_id", diagnostics);

  if ("signals" in value) {
    diagnostics.push(error("runtime_pack.signals.forbidden", "$.signals", "Runtime pack must not contain signals; use normalized connections."));
  }

  const source = requireRecord(value, "source", "$.source", diagnostics);
  if (source) {
    validateRuntimePackSource(source, "$.source", diagnostics);
  }

  const instances = requireRecord(value, "instances", "$.instances", diagnostics);
  if (instances) {
    for (const [instanceId, instanceValue] of Object.entries(instances)) {
      validateRuntimeInstance(instanceId, instanceValue, `$.instances.${instanceId}`, diagnostics);
    }
  }

  const connections = requireRecord(value, "connections", "$.connections", diagnostics);
  if (connections) {
    for (const [connectionId, connectionValue] of Object.entries(connections)) {
      validateRuntimeConnection(connectionId, connectionValue, `$.connections.${connectionId}`, diagnostics);
    }
  }

  const resources = requireRecord(value, "resources", "$.resources", diagnostics);
  if (resources) {
    for (const [resourceId, resourceValue] of Object.entries(resources)) {
      validateRuntimeResourceBinding(resourceId, resourceValue, `$.resources.${resourceId}`, diagnostics);
    }
  }

  const operations = requireRecord(value, "operations", "$.operations", diagnostics);
  if (operations) {
    for (const [operationId, operationValue] of Object.entries(operations)) {
      validateRuntimeOperation(operationId, operationValue, `$.operations.${operationId}`, diagnostics);
    }
  }

  if ("operation_runtime_contract" in value && value.operation_runtime_contract !== undefined) {
    validateRuntimeOperationRuntimeContract(
      value.operation_runtime_contract,
      "$.operation_runtime_contract",
      diagnostics
    );
  }

  if ("package_mode_runtime_contract" in value && value.package_mode_runtime_contract !== undefined) {
    validateRuntimePackageModeRuntimeContract(
      value.package_mode_runtime_contract,
      "$.package_mode_runtime_contract",
      diagnostics
    );
  }

  if ("package_supervision" in value && value.package_supervision !== undefined) {
    const packageSupervision = requireRecord(value, "package_supervision", "$.package_supervision", diagnostics);
    if (packageSupervision) {
      for (const [supervisionId, supervisionValue] of Object.entries(packageSupervision)) {
        validateRuntimePackageSupervision(
          supervisionId,
          supervisionValue,
          `$.package_supervision.${supervisionId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_coordination" in value && value.package_coordination !== undefined) {
    const packageCoordination = requireRecord(value, "package_coordination", "$.package_coordination", diagnostics);
    if (packageCoordination) {
      for (const [coordinationId, coordinationValue] of Object.entries(packageCoordination)) {
        validateRuntimePackageCoordination(
          coordinationId,
          coordinationValue,
          `$.package_coordination.${coordinationId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_mode_phase" in value && value.package_mode_phase !== undefined) {
    const packageModePhase = requireRecord(value, "package_mode_phase", "$.package_mode_phase", diagnostics);
    if (packageModePhase) {
      for (const [modePhaseId, modePhaseValue] of Object.entries(packageModePhase)) {
        validateRuntimePackageModePhase(
          modePhaseId,
          modePhaseValue,
          `$.package_mode_phase.${modePhaseId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_permissive_interlock" in value && value.package_permissive_interlock !== undefined) {
    const packagePermissiveInterlock = requireRecord(value, "package_permissive_interlock", "$.package_permissive_interlock", diagnostics);
    if (packagePermissiveInterlock) {
      for (const [entryId, entryValue] of Object.entries(packagePermissiveInterlock)) {
        validateRuntimePackagePermissiveInterlock(
          entryId,
          entryValue,
          `$.package_permissive_interlock.${entryId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_protection_recovery" in value && value.package_protection_recovery !== undefined) {
    const packageProtectionRecovery = requireRecord(value, "package_protection_recovery", "$.package_protection_recovery", diagnostics);
    if (packageProtectionRecovery) {
      for (const [entryId, entryValue] of Object.entries(packageProtectionRecovery)) {
        validateRuntimePackageProtectionRecovery(
          entryId,
          entryValue,
          `$.package_protection_recovery.${entryId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_arbitration" in value && value.package_arbitration !== undefined) {
    const packageArbitration = requireRecord(value, "package_arbitration", "$.package_arbitration", diagnostics);
    if (packageArbitration) {
      for (const [entryId, entryValue] of Object.entries(packageArbitration)) {
        validateRuntimePackageArbitration(
          entryId,
          entryValue,
          `$.package_arbitration.${entryId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_override_handover" in value && value.package_override_handover !== undefined) {
    const packageOverrideHandover = requireRecord(value, "package_override_handover", "$.package_override_handover", diagnostics);
    if (packageOverrideHandover) {
      for (const [entryId, entryValue] of Object.entries(packageOverrideHandover)) {
        validateRuntimePackageOverrideHandover(
          entryId,
          entryValue,
          `$.package_override_handover.${entryId}`,
          diagnostics
        );
      }
    }
  }

  const traceGroups = requireRecord(value, "trace_groups", "$.trace_groups", diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroupValue] of Object.entries(traceGroups)) {
      validateRuntimeTraceGroup(traceGroupId, traceGroupValue, `$.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  const monitors = requireRecord(value, "monitors", "$.monitors", diagnostics);
  if (monitors) {
    for (const [monitorId, monitorValue] of Object.entries(monitors)) {
      validateRuntimeMonitor(monitorId, monitorValue, `$.monitors.${monitorId}`, diagnostics);
    }
  }

  const frontendRequirements = requireRecord(value, "frontend_requirements", "$.frontend_requirements", diagnostics);
  if (frontendRequirements) {
    for (const [requirementId, requirementValue] of Object.entries(frontendRequirements)) {
      validateRuntimeFrontendRequirement(requirementId, requirementValue, `$.frontend_requirements.${requirementId}`, diagnostics);
    }
  }

  const persistenceSlots = requireRecord(value, "persistence_slots", "$.persistence_slots", diagnostics);
  if (persistenceSlots) {
    for (const [slotId, slotValue] of Object.entries(persistenceSlots)) {
      validateRuntimePersistenceSlot(slotId, slotValue, `$.persistence_slots.${slotId}`, diagnostics);
    }
  }

  return {
    ok: diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics
  };
}

function validateRuntimePackageSupervision(
  supervisionId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageSupervision {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_supervision.invalid", path, "Runtime package supervision must be an object."));
    return false;
  }

  requireExactString(value, "id", supervisionId, `${path}.id`, diagnostics);
  requireString(value, "package_instance_id", `${path}.package_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  const summaryOutputs = requireOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summaryValue] of Object.entries(summaryOutputs)) {
      validateRuntimePackageSummaryOutput(summaryId, summaryValue, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = requireOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitorValue] of Object.entries(aggregateMonitors)) {
      validateRuntimePackageAggregateMonitor(monitorId, monitorValue, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const aggregateAlarms = requireOptionalRecord(value, "aggregate_alarms", `${path}.aggregate_alarms`, diagnostics);
  if (aggregateAlarms) {
    for (const [alarmId, alarmValue] of Object.entries(aggregateAlarms)) {
      validateRuntimePackageAggregateAlarm(alarmId, alarmValue, `${path}.aggregate_alarms.${alarmId}`, diagnostics);
    }
  }

  const traceGroups = requireOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroupValue] of Object.entries(traceGroups)) {
      validateRuntimePackageTraceGroup(traceGroupId, traceGroupValue, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  const operationProxies = requireOptionalRecord(value, "operation_proxies", `${path}.operation_proxies`, diagnostics);
  if (operationProxies) {
    for (const [proxyId, proxyValue] of Object.entries(operationProxies)) {
      validateRuntimePackageOperationProxy(proxyId, proxyValue, `${path}.operation_proxies.${proxyId}`, diagnostics);
    }
  }

  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);

  return true;
}

function validateRuntimePackageCoordination(
  coordinationId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageCoordination {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_coordination.invalid", path, "Runtime package coordination must be an object."));
    return false;
  }

  requireExactString(value, "id", coordinationId, `${path}.id`, diagnostics);
  requireString(value, "package_instance_id", `${path}.package_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  const packageState = requireRecord(value, "package_state", `${path}.package_state`, diagnostics);
  if (packageState) {
    requireString(packageState, "id", `${path}.package_state.id`, diagnostics);
    requireOptionalString(packageState, "title", `${path}.package_state.title`, diagnostics);
    requireOptionalOneOf(
      packageState,
      "default_state",
      ["standby", "ready", "circulation_active", "control_active", "fault_latched"],
      `${path}.package_state.default_state`,
      diagnostics
    );

    const states = requireRecord(packageState, "states", `${path}.package_state.states`, diagnostics);
    if (states) {
      for (const [stateId, stateValue] of Object.entries(states)) {
        validateRuntimePackageCoordinationStateRule(
          stateId,
          stateValue,
          `${path}.package_state.states.${stateId}`,
          diagnostics
        );
      }
    }
  }

  const summaryOutputs = requireOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summaryValue] of Object.entries(summaryOutputs)) {
      validateRuntimePackageSummaryOutput(summaryId, summaryValue, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = requireOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitorValue] of Object.entries(aggregateMonitors)) {
      validateRuntimePackageAggregateMonitor(monitorId, monitorValue, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = requireOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroupValue] of Object.entries(traceGroups)) {
      validateRuntimePackageTraceGroup(traceGroupId, traceGroupValue, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  const operationProxies = requireOptionalRecord(value, "operation_proxies", `${path}.operation_proxies`, diagnostics);
  if (operationProxies) {
    for (const [proxyId, proxyValue] of Object.entries(operationProxies)) {
      validateRuntimePackageCoordinationOperationProxy(proxyId, proxyValue, `${path}.operation_proxies.${proxyId}`, diagnostics);
    }
  }

  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimePackageCoordinationStateRule(
  stateId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageCoordinationStateRule {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_coordination_state.invalid", path, "Runtime package coordination state must be an object."));
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
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageModePhase(
  modePhaseId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageModePhase {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_mode_phase.invalid", path, "Runtime package mode/phase must be an object."));
    return false;
  }

  requireExactString(value, "id", modePhaseId, `${path}.id`, diagnostics);
  requireString(value, "package_instance_id", `${path}.package_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  const modes = requireRecord(value, "modes", `${path}.modes`, diagnostics);
  if (modes) {
    for (const [modeId, modeValue] of Object.entries(modes)) {
      validateRuntimePackageModeDef(modeId, modeValue, `${path}.modes.${modeId}`, diagnostics);
    }
  }

  const phases = requireRecord(value, "phases", `${path}.phases`, diagnostics);
  if (phases) {
    for (const [phaseId, phaseValue] of Object.entries(phases)) {
      validateRuntimePackagePhaseDef(phaseId, phaseValue, `${path}.phases.${phaseId}`, diagnostics);
    }
  }

  const modeSummary = requireRecord(value, "mode_summary", `${path}.mode_summary`, diagnostics);
  if (modeSummary) {
    validateRuntimePackageModeSummary(modeSummary, `${path}.mode_summary`, diagnostics);
  }

  const phaseSummary = requireRecord(value, "phase_summary", `${path}.phase_summary`, diagnostics);
  if (phaseSummary) {
    validateRuntimePackagePhaseSummary(phaseSummary, `${path}.phase_summary`, diagnostics);
  }

  requireString(value, "active_mode_id", `${path}.active_mode_id`, diagnostics);
  requireString(value, "active_phase_id", `${path}.active_phase_id`, diagnostics);

  const allowedModeTransitions = requireOptionalRecord(value, "allowed_mode_transitions", `${path}.allowed_mode_transitions`, diagnostics);
  if (allowedModeTransitions) {
    for (const [transitionId, transitionValue] of Object.entries(allowedModeTransitions)) {
      validateRuntimePackageAllowedModeTransition(
        transitionId,
        transitionValue,
        `${path}.allowed_mode_transitions.${transitionId}`,
        diagnostics
      );
    }
  }

  const allowedPhaseTransitions = requireOptionalRecord(value, "allowed_phase_transitions", `${path}.allowed_phase_transitions`, diagnostics);
  if (allowedPhaseTransitions) {
    for (const [transitionId, transitionValue] of Object.entries(allowedPhaseTransitions)) {
      validateRuntimePackageAllowedPhaseTransition(
        transitionId,
        transitionValue,
        `${path}.allowed_phase_transitions.${transitionId}`,
        diagnostics
      );
    }
  }

  const modeGroups = requireOptionalRecord(value, "package_mode_groups", `${path}.package_mode_groups`, diagnostics);
  if (modeGroups) {
    for (const [groupId, groupValue] of Object.entries(modeGroups)) {
      validateRuntimePackageModeGroup(groupId, groupValue, `${path}.package_mode_groups.${groupId}`, diagnostics);
    }
  }

  const phaseGroups = requireOptionalRecord(value, "package_phase_groups", `${path}.package_phase_groups`, diagnostics);
  if (phaseGroups) {
    for (const [groupId, groupValue] of Object.entries(phaseGroups)) {
      validateRuntimePackagePhaseGroup(groupId, groupValue, `${path}.package_phase_groups.${groupId}`, diagnostics);
    }
  }

  const traceGroups = requireOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroupValue] of Object.entries(traceGroups)) {
      validateRuntimePackageTraceGroup(traceGroupId, traceGroupValue, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  requireOptionalString(value, "package_supervision_id", `${path}.package_supervision_id`, diagnostics);
  requireOptionalString(value, "package_coordination_id", `${path}.package_coordination_id`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimePackagePermissiveInterlock(
  entryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackagePermissiveInterlock {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_permissive_interlock.invalid", path, "Runtime package permissive/interlock must be an object."));
    return false;
  }

  requireExactString(value, "id", entryId, `${path}.id`, diagnostics);
  requireString(value, "package_instance_id", `${path}.package_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  const permissives = requireRecord(value, "permissives", `${path}.permissives`, diagnostics);
  if (permissives) {
    for (const [permissiveId, permissiveValue] of Object.entries(permissives)) {
      validateRuntimePackagePermissive(permissiveId, permissiveValue, `${path}.permissives.${permissiveId}`, diagnostics);
    }
  }

  const interlocks = requireRecord(value, "interlocks", `${path}.interlocks`, diagnostics);
  if (interlocks) {
    for (const [interlockId, interlockValue] of Object.entries(interlocks)) {
      validateRuntimePackageInterlock(interlockId, interlockValue, `${path}.interlocks.${interlockId}`, diagnostics);
    }
  }

  const gateSummary = requireRecord(value, "gate_summary", `${path}.gate_summary`, diagnostics);
  if (gateSummary) {
    validateRuntimePackageGateSummary(gateSummary, `${path}.gate_summary`, diagnostics);
  }

  const summaryOutputs = requireOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summaryValue] of Object.entries(summaryOutputs)) {
      validateRuntimePackageSummaryOutput(summaryId, summaryValue, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = requireOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitorValue] of Object.entries(aggregateMonitors)) {
      validateRuntimePackageAggregateMonitor(monitorId, monitorValue, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = requireOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroupValue] of Object.entries(traceGroups)) {
      validateRuntimePackageTraceGroup(traceGroupId, traceGroupValue, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimePackageProtectionRecovery(
  packageId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageProtectionRecovery {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_protection_recovery.invalid", path, "Runtime package protection/recovery must be an object."));
    return false;
  }

  requireExactString(value, "id", packageId, `${path}.id`, diagnostics);
  requireString(value, "package_instance_id", `${path}.package_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  const protectionSummary = requireRecord(value, "protection_summary", `${path}.protection_summary`, diagnostics);
  if (protectionSummary) {
    validateRuntimePackageProtectionSummary(protectionSummary, `${path}.protection_summary`, diagnostics);
  }

  const trips = requireRecord(value, "trips", `${path}.trips`, diagnostics);
  if (trips) {
    for (const [tripId, trip] of Object.entries(trips)) {
      validateRuntimePackageTrip(tripId, trip, `${path}.trips.${tripId}`, diagnostics);
    }
  }

  const inhibits = requireRecord(value, "inhibits", `${path}.inhibits`, diagnostics);
  if (inhibits) {
    for (const [inhibitId, inhibit] of Object.entries(inhibits)) {
      validateRuntimePackageInhibit(inhibitId, inhibit, `${path}.inhibits.${inhibitId}`, diagnostics);
    }
  }

  const recoveryRequests = requireOptionalRecord(value, "recovery_requests", `${path}.recovery_requests`, diagnostics);
  if (recoveryRequests) {
    for (const [requestId, request] of Object.entries(recoveryRequests)) {
      validateRuntimePackageRecoveryRequest(requestId, request, `${path}.recovery_requests.${requestId}`, diagnostics);
    }
  }

  const summaryOutputs = requireOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validateRuntimePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = requireOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validateRuntimePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = requireOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validateRuntimePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validateRuntimePackageArbitration(
  packageId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageArbitration {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_arbitration.invalid", path, "Runtime package arbitration must be an object."));
    return false;
  }

  requireExactString(value, "id", packageId, `${path}.id`, diagnostics);
  requireString(value, "package_instance_id", `${path}.package_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  const ownershipLanes = requireRecord(value, "ownership_lanes", `${path}.ownership_lanes`, diagnostics);
  if (ownershipLanes) {
    for (const [laneId, lane] of Object.entries(ownershipLanes)) {
      validateRuntimePackageOwnershipLaneDef(laneId, lane, `${path}.ownership_lanes.${laneId}`, diagnostics);
    }
  }

  const ownershipSummary = requireRecord(value, "ownership_summary", `${path}.ownership_summary`, diagnostics);
  if (ownershipSummary) {
    validateRuntimePackageOwnershipSummary(ownershipSummary, `${path}.ownership_summary`, diagnostics);
  }

  const commandLanes = requireRecord(value, "command_lanes", `${path}.command_lanes`, diagnostics);
  if (commandLanes) {
    for (const [laneId, lane] of Object.entries(commandLanes)) {
      validateRuntimePackageCommandLane(laneId, lane, `${path}.command_lanes.${laneId}`, diagnostics);
    }
  }

  const commandSummary = requireRecord(value, "command_summary", `${path}.command_summary`, diagnostics);
  if (commandSummary) {
    validateRuntimePackageCommandSummary(commandSummary, `${path}.command_summary`, diagnostics);
  }

  const summaryOutputs = requireOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validateRuntimePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = requireOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validateRuntimePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = requireOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validateRuntimePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validateRuntimePackageOverrideHandover(
  packageId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageOverrideHandover {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_override_handover.invalid", path, "Runtime package override/handover must be an object."));
    return false;
  }

  requireExactString(value, "id", packageId, `${path}.id`, diagnostics);
  requireString(value, "package_instance_id", `${path}.package_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  const authorityHolders = requireRecord(value, "authority_holders", `${path}.authority_holders`, diagnostics);
  if (authorityHolders) {
    for (const [holderId, holder] of Object.entries(authorityHolders)) {
      validateRuntimePackageAuthorityHolder(holderId, holder, `${path}.authority_holders.${holderId}`, diagnostics);
    }
  }

  const handoverSummary = requireRecord(value, "handover_summary", `${path}.handover_summary`, diagnostics);
  if (handoverSummary) {
    validateRuntimePackageHandoverSummary(handoverSummary, `${path}.handover_summary`, diagnostics);
  }

  const handoverRequests = requireRecord(value, "handover_requests", `${path}.handover_requests`, diagnostics);
  if (handoverRequests) {
    for (const [requestId, request] of Object.entries(handoverRequests)) {
      validateRuntimePackageHandoverRequest(requestId, request, `${path}.handover_requests.${requestId}`, diagnostics);
    }
  }

  const summaryOutputs = requireOptionalRecord(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  if (summaryOutputs) {
    for (const [summaryId, summary] of Object.entries(summaryOutputs)) {
      validateRuntimePackageSummaryOutput(summaryId, summary, `${path}.summary_outputs.${summaryId}`, diagnostics);
    }
  }

  const aggregateMonitors = requireOptionalRecord(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  if (aggregateMonitors) {
    for (const [monitorId, monitor] of Object.entries(aggregateMonitors)) {
      validateRuntimePackageAggregateMonitor(monitorId, monitor, `${path}.aggregate_monitors.${monitorId}`, diagnostics);
    }
  }

  const traceGroups = requireOptionalRecord(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  if (traceGroups) {
    for (const [traceGroupId, traceGroup] of Object.entries(traceGroups)) {
      validateRuntimePackageTraceGroup(traceGroupId, traceGroup, `${path}.trace_groups.${traceGroupId}`, diagnostics);
    }
  }

  return true;
}

function validateRuntimePackageTrip(
  tripId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageTrip {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_trip.invalid", path, "Runtime package trip must be an object."));
    return false;
  }

  requireExactString(value, "id", tripId, `${path}.id`, diagnostics);
  requireString(value, "qualified_id", `${path}.qualified_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalBoolean(value, "latching", `${path}.latching`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  return true;
}

function validateRuntimePackageOwnershipLaneDef(
  laneId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageOwnershipLaneDef {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_ownership_lane.invalid", path, "Runtime package ownership lane must be an object."));
    return false;
  }

  requireExactString(value, "id", laneId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.lane`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageAuthorityHolder(
  holderId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageAuthorityHolder {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_override_holder.invalid", path, "Runtime package authority holder must be an object."));
    return false;
  }

  requireExactString(value, "id", holderId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.lane`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageOwnershipSummary(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageOwnershipSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_ownership_summary.invalid", path, "Runtime package ownership summary must be an object."));
    return false;
  }

  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "active_lane_ids", `${path}.active_lane_ids`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageCommandLane(
  laneId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageCommandLane {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_command_lane.invalid", path, "Runtime package command lane must be an object."));
    return false;
  }

  requireExactString(value, "id", laneId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "request_kind", [...WAVE17_PACKAGE_COMMAND_REQUEST_KINDS], `${path}.request_kind`, diagnostics);
  requireString(value, "ownership_lane_id", `${path}.ownership_lane_id`, diagnostics);
  requireOneOf(value, "ownership_lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.ownership_lane`, diagnostics);
  requireString(value, "target_instance_id", `${path}.target_instance_id`, diagnostics);
  requireOneOf(value, "arbitration_result", [...WAVE17_PACKAGE_ARBITRATION_RESULTS], `${path}.arbitration_result`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "request_preview", `${path}.request_preview`, diagnostics);
  requireOptionalString(value, "blocked_reason", `${path}.blocked_reason`, diagnostics);
  requireOptionalString(value, "denied_reason", `${path}.denied_reason`, diagnostics);
  requireOptionalString(value, "superseded_by_lane_id", `${path}.superseded_by_lane_id`, diagnostics);
  return true;
}

function validateRuntimePackageCommandSummary(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageCommandSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_command_summary.invalid", path, "Runtime package command summary must be an object."));
    return false;
  }

  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "active_owner_lane_ids", `${path}.active_owner_lane_ids`, diagnostics);
  requireOptionalStringArray(value, "accepted_lane_ids", `${path}.accepted_lane_ids`, diagnostics);
  requireOptionalStringArray(value, "blocked_lane_ids", `${path}.blocked_lane_ids`, diagnostics);
  requireOptionalStringArray(value, "denied_lane_ids", `${path}.denied_lane_ids`, diagnostics);
  requireOptionalStringArray(value, "superseded_lane_ids", `${path}.superseded_lane_ids`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageHandoverSummary(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageHandoverSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_handover_summary.invalid", path, "Runtime package handover summary must be an object."));
    return false;
  }

  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "current_holder_id", `${path}.current_holder_id`, diagnostics);
  requireOneOf(value, "current_lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.current_lane`, diagnostics);
  requireOptionalString(value, "requested_holder_id", `${path}.requested_holder_id`, diagnostics);
  requireOptionalStringArray(value, "accepted_request_ids", `${path}.accepted_request_ids`, diagnostics);
  requireOptionalStringArray(value, "blocked_request_ids", `${path}.blocked_request_ids`, diagnostics);
  requireOptionalStringArray(value, "denied_request_ids", `${path}.denied_request_ids`, diagnostics);
  requireOptionalString(value, "last_handover_reason", `${path}.last_handover_reason`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageHandoverRequest(
  requestId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageHandoverRequest {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_handover_request.invalid", path, "Runtime package handover request must be an object."));
    return false;
  }

  requireExactString(value, "id", requestId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(value, "request_kind", [...WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS], `${path}.request_kind`, diagnostics);
  requireString(value, "requested_holder_id", `${path}.requested_holder_id`, diagnostics);
  requireOneOf(value, "requested_lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.requested_lane`, diagnostics);
  requireOneOf(value, "state", [...WAVE18_PACKAGE_HANDOVER_REQUEST_STATES], `${path}.state`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "request_preview", `${path}.request_preview`, diagnostics);
  requireOptionalOneOf(value, "blocked_reason", [...WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS], `${path}.blocked_reason`, diagnostics);
  requireOptionalOneOf(value, "denied_reason", [...WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS], `${path}.denied_reason`, diagnostics);
  return true;
}

function validateRuntimePackageInhibit(
  inhibitId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageInhibit {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_inhibit.invalid", path, "Runtime package inhibit must be an object."));
    return false;
  }

  requireExactString(value, "id", inhibitId, `${path}.id`, diagnostics);
  requireString(value, "qualified_id", `${path}.qualified_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  return true;
}

function validateRuntimePackageProtectionSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalOneOf(value, "default_state", [...WAVE16_PACKAGE_PROTECTION_STATES], `${path}.default_state`, diagnostics);
  requireOptionalStringArray(value, "trip_ids", `${path}.trip_ids`, diagnostics);
  requireOptionalStringArray(value, "inhibit_ids", `${path}.inhibit_ids`, diagnostics);
  requireOptionalStringArray(value, "recovery_request_ids", `${path}.recovery_request_ids`, diagnostics);

  const diagnosticSummaries = requireOptionalRecord(value, "diagnostic_summaries", `${path}.diagnostic_summaries`, diagnostics);
  if (diagnosticSummaries) {
    for (const [summaryId, summary] of Object.entries(diagnosticSummaries)) {
      validateRuntimePackageProtectionDiagnosticSummary(summaryId, summary, `${path}.diagnostic_summaries.${summaryId}`, diagnostics);
    }
  }

  return true;
}

function validateRuntimePackageProtectionDiagnosticSummary(
  summaryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageProtectionDiagnosticSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_protection_summary.invalid", path, "Runtime package protection diagnostic summary must be an object."));
    return false;
  }

  requireExactString(value, "id", summaryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "trip_ids", `${path}.trip_ids`, diagnostics);
  requireOptionalStringArray(value, "inhibit_ids", `${path}.inhibit_ids`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageRecoveryRequest(
  requestId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageRecoveryRequest {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_recovery_request.invalid", path, "Runtime package recovery request must be an object."));
    return false;
  }

  requireExactString(value, "id", requestId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireString(value, "target_operation_id", `${path}.target_operation_id`, diagnostics);
  requireString(value, "target_owner_instance_id", `${path}.target_owner_instance_id`, diagnostics);
  requireOptionalOneOf(value, "confirmation_policy", ["none", "required"], `${path}.confirmation_policy`, diagnostics);
  requireOptionalStringArray(value, "blocked_by_trip_ids", `${path}.blocked_by_trip_ids`, diagnostics);
  requireOptionalStringArray(value, "blocked_by_inhibit_ids", `${path}.blocked_by_inhibit_ids`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackagePermissive(
  permissiveId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackagePermissive {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_permissive.invalid", path, "Runtime package permissive must be an object."));
    return false;
  }

  requireExactString(value, "id", permissiveId, `${path}.id`, diagnostics);
  requireString(value, "qualified_id", `${path}.qualified_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "blocked_reason_code", `${path}.blocked_reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  return true;
}

function validateRuntimePackageInterlock(
  interlockId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageInterlock {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_interlock.invalid", path, "Runtime package interlock must be an object."));
    return false;
  }

  requireExactString(value, "id", interlockId, `${path}.id`, diagnostics);
  requireString(value, "qualified_id", `${path}.qualified_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOneOf(value, "active_state", [...WAVE15_PACKAGE_INTERLOCK_ACTIVE_STATES], `${path}.active_state`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  return true;
}

function validateRuntimePackageGateSummary(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageGateSummary {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_gate_summary.invalid", path, "Runtime package gate summary must be an object."));
    return false;
  }

  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalOneOf(value, "default_state", [...WAVE15_PACKAGE_GATE_STATES], `${path}.default_state`, diagnostics);
  requireOptionalStringArray(value, "permissive_ids", `${path}.permissive_ids`, diagnostics);
  requireOptionalStringArray(value, "interlock_ids", `${path}.interlock_ids`, diagnostics);

  const transitionGuards = requireOptionalRecord(value, "transition_guards", `${path}.transition_guards`, diagnostics);
  if (transitionGuards) {
    for (const [guardId, guardValue] of Object.entries(transitionGuards)) {
      validateRuntimePackageTransitionGuardRef(guardId, guardValue, `${path}.transition_guards.${guardId}`, diagnostics);
    }
  }

  return true;
}

function validateRuntimePackageTransitionGuardRef(
  guardId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageTransitionGuardRef {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_transition_guard.invalid", path, "Runtime package transition guard must be an object."));
    return false;
  }

  requireExactString(value, "id", guardId, `${path}.id`, diagnostics);
  requireString(value, "qualified_id", `${path}.qualified_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalStringArray(value, "permissive_ids", `${path}.permissive_ids`, diagnostics);
  requireOptionalStringArray(value, "interlock_ids", `${path}.interlock_ids`, diagnostics);
  requireOptionalString(value, "mode_transition_id", `${path}.mode_transition_id`, diagnostics);
  requireOptionalString(value, "phase_transition_id", `${path}.phase_transition_id`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageModeDef(
  modeId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageModeDef {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_mode.invalid", path, "Runtime package mode must be an object."));
    return false;
  }

  requireExactString(value, "id", modeId, `${path}.id`, diagnostics);
  requireString(value, "qualified_id", `${path}.qualified_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  requireOptionalStringArray(value, "phase_ids", `${path}.phase_ids`, diagnostics);
  return true;
}

function validateRuntimePackagePhaseDef(
  phaseId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackagePhaseDef {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_phase.invalid", path, "Runtime package phase must be an object."));
    return false;
  }

  requireExactString(value, "id", phaseId, `${path}.id`, diagnostics);
  requireString(value, "qualified_id", `${path}.qualified_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  return true;
}

function validateRuntimePackageAllowedModeTransition(
  transitionId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageAllowedModeTransition {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_mode_transition.invalid", path, "Runtime package mode transition must be an object."));
    return false;
  }

  requireExactString(value, "id", transitionId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(
    value,
    "intent",
    [...WAVE14_PACKAGE_MODE_EXECUTION_INTENTS],
    `${path}.intent`,
    diagnostics
  );
  requireOptionalString(value, "from_mode_id", `${path}.from_mode_id`, diagnostics);
  requireString(value, "to_mode_id", `${path}.to_mode_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "guard_state",
    [...WAVE14_PACKAGE_TRANSITION_GUARD_STATES],
    `${path}.guard_state`,
    diagnostics
  );
  requireOptionalStringArray(value, "guard_notes", `${path}.guard_notes`, diagnostics);
  return true;
}

function validateRuntimePackageAllowedPhaseTransition(
  transitionId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageAllowedPhaseTransition {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_phase_transition.invalid", path, "Runtime package phase transition must be an object."));
    return false;
  }

  requireExactString(value, "id", transitionId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOneOf(
    value,
    "intent",
    [...WAVE14_PACKAGE_MODE_EXECUTION_INTENTS],
    `${path}.intent`,
    diagnostics
  );
  requireString(value, "phase_id", `${path}.phase_id`, diagnostics);
  requireOptionalStringArray(value, "allowed_mode_ids", `${path}.allowed_mode_ids`, diagnostics);
  requireOptionalOneOf(
    value,
    "phase_state",
    [...WAVE14_PACKAGE_PHASE_STATES],
    `${path}.phase_state`,
    diagnostics
  );
  requireOptionalOneOf(
    value,
    "transition_state",
    [...WAVE14_PACKAGE_MODE_TRANSITION_STATES],
    `${path}.transition_state`,
    diagnostics
  );
  requireOptionalOneOf(
    value,
    "guard_state",
    [...WAVE14_PACKAGE_TRANSITION_GUARD_STATES],
    `${path}.guard_state`,
    diagnostics
  );
  requireOptionalStringArray(value, "guard_notes", `${path}.guard_notes`, diagnostics);
  return true;
}

function validateRuntimePackageModeSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "default_mode_id", `${path}.default_mode_id`, diagnostics);
  const entries = requireRecord(value, "entries", `${path}.entries`, diagnostics);
  if (entries) {
    for (const [entryId, entryValue] of Object.entries(entries)) {
      validateRuntimePackageModeSummaryEntry(entryId, entryValue, `${path}.entries.${entryId}`, diagnostics);
    }
  }
  return true;
}

function validateRuntimePackageModeSummaryEntry(
  entryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageModeSummaryEntry {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_mode_summary_entry.invalid", path, "Runtime package mode summary entry must be an object."));
    return false;
  }

  requireExactString(value, "id", entryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "mode_id", `${path}.mode_id`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackagePhaseSummary(
  value: Record<string, unknown>,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  requireString(value, "id", `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "default_phase_id", `${path}.default_phase_id`, diagnostics);
  const entries = requireRecord(value, "entries", `${path}.entries`, diagnostics);
  if (entries) {
    for (const [entryId, entryValue] of Object.entries(entries)) {
      validateRuntimePackagePhaseSummaryEntry(entryId, entryValue, `${path}.entries.${entryId}`, diagnostics);
    }
  }
  return true;
}

function validateRuntimePackagePhaseSummaryEntry(
  entryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackagePhaseSummaryEntry {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_phase_summary_entry.invalid", path, "Runtime package phase summary entry must be an object."));
    return false;
  }

  requireExactString(value, "id", entryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "phase_id", `${path}.phase_id`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageModeGroup(
  groupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageModeGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_mode_group.invalid", path, "Runtime package mode group must be an object."));
    return false;
  }

  requireExactString(value, "id", groupId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireStringArray(value, "mode_ids", `${path}.mode_ids`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackagePhaseGroup(
  groupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackagePhaseGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_phase_group.invalid", path, "Runtime package phase group must be an object."));
    return false;
  }

  requireExactString(value, "id", groupId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireStringArray(value, "phase_ids", `${path}.phase_ids`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
  return true;
}

function validateRuntimePackageSummaryOutput(
  summaryId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageSummaryOutput {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_summary_output.invalid", path, "Runtime package summary output must be an object."));
    return false;
  }

  requireExactString(value, "id", summaryId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);
  validateRuntimeEndpoint(value.source, `${path}.source`, diagnostics);
  return true;
}

function validateRuntimePackageAggregateMonitor(
  monitorId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageAggregateMonitor {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_aggregate_monitor.invalid", path, "Runtime package aggregate monitor must be an object."));
    return false;
  }

  requireExactString(value, "id", monitorId, `${path}.id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  return true;
}

function validateRuntimePackageAggregateAlarm(
  alarmId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageAggregateAlarm {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_aggregate_alarm.invalid", path, "Runtime package aggregate alarm must be an object."));
    return false;
  }

  requireExactString(value, "id", alarmId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "source_ports", `${path}.source_ports`, diagnostics);
  return true;
}

function validateRuntimePackageTraceGroup(
  traceGroupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageTraceGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_trace_group.invalid", path, "Runtime package trace group must be an object."));
    return false;
  }

  requireExactString(value, "id", traceGroupId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateRuntimeTraceSignalRefArray(value, "signals", `${path}.signals`, diagnostics);
  requireOptionalNumber(value, "sample_hint_ms", `${path}.sample_hint_ms`, diagnostics);
  requireOptionalString(value, "chart_hint", `${path}.chart_hint`, diagnostics);
  return true;
}

function validateRuntimePackageOperationProxy(
  proxyId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageOperationProxy {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_operation_proxy.invalid", path, "Runtime package operation proxy must be an object."));
    return false;
  }

  requireExactString(value, "id", proxyId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "target_operation_id", `${path}.target_operation_id`, diagnostics);
  requireString(value, "target_owner_instance_id", `${path}.target_owner_instance_id`, diagnostics);
  requireOptionalString(value, "child_operation_kind", `${path}.child_operation_kind`, diagnostics);
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  return true;
}

function validateRuntimePackageCoordinationOperationProxy(
  proxyId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageCoordinationOperationProxy {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_coordination_operation_proxy.invalid", path, "Runtime package coordination operation proxy must be an object."));
    return false;
  }

  requireExactString(value, "id", proxyId, `${path}.id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireString(value, "target_operation_id", `${path}.target_operation_id`, diagnostics);
  requireString(value, "target_owner_instance_id", `${path}.target_owner_instance_id`, diagnostics);
  requireOptionalString(value, "child_operation_kind", `${path}.child_operation_kind`, diagnostics);
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  return true;
}

function validateRuntimeTraceSignalRefArray(
  container: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
): void {
  validateSignalRefs(container[field], path, diagnostics);
}

function validateRuntimePackSource(value: Record<string, unknown>, path: string, diagnostics: ValidationDiagnostic[]): void {
  requireString(value, "project_id", `${path}.project_id`, diagnostics);
  requireString(value, "authoring_schema_version", `${path}.authoring_schema_version`, diagnostics);
  requireOptionalString(value, "generated_at", `${path}.generated_at`, diagnostics);
}

function validateRuntimeInstance(
  instanceId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeInstance {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_instance.invalid", path, "Runtime instance must be an object."));
    return false;
  }

  requireExactString(value, "id", instanceId, `${path}.id`, diagnostics);
  requireString(value, "type_ref", `${path}.type_ref`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);

  const ports = requireRecord(value, "ports", `${path}.ports`, diagnostics);
  if (ports) {
    for (const [portId, portValue] of Object.entries(ports)) {
      validateRuntimePort(portId, portValue, `${path}.ports.${portId}`, diagnostics);
    }
  }

  const params = requireRecord(value, "params", `${path}.params`, diagnostics);
  if (params) {
    for (const [paramId, paramValue] of Object.entries(params)) {
      validateResolvedParam(paramValue, `${path}.params.${paramId}`, diagnostics);
    }
  }

  const alarms = requireRecord(value, "alarms", `${path}.alarms`, diagnostics);
  if (alarms) {
    for (const [alarmId, alarmValue] of Object.entries(alarms)) {
      if (!isRecord(alarmValue)) {
        diagnostics.push(error("runtime_alarm.invalid", `${path}.alarms.${alarmId}`, "Runtime alarm must be an object."));
        continue;
      }
      requireExactString(alarmValue, "id", alarmId, `${path}.alarms.${alarmId}.id`, diagnostics);
      requireOptionalString(alarmValue, "severity", `${path}.alarms.${alarmId}.severity`, diagnostics);
    }
  }

  if ("native_execution" in value && value.native_execution !== undefined) {
    validateRuntimeNativeExecution(value.native_execution, `${path}.native_execution`, diagnostics);
  }

  if ("source_scope" in value && value.source_scope !== undefined) {
    const sourceScope = requireRecord(value, "source_scope", `${path}.source_scope`, diagnostics);
    if (sourceScope) {
      requireOneOf(sourceScope, "kind", ["system", "composition"], `${path}.source_scope.kind`, diagnostics);
      requireString(sourceScope, "owner_id", `${path}.source_scope.owner_id`, diagnostics);
    }
  }

  return true;
}

function validateRuntimePort(portId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is RuntimePort {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_port.invalid", path, "Runtime port must be an object."));
    return false;
  }

  requireExactString(value, "id", portId, `${path}.id`, diagnostics);
  requireOneOf(value, "direction", ["in", "out"], `${path}.direction`, diagnostics);
  requireString(value, "channel_kind", `${path}.channel_kind`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);
  return true;
}

function validateResolvedParam(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is RuntimeResolvedParam {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_param.invalid", path, "Resolved runtime param must be an object."));
    return false;
  }

  if (!("value" in value)) {
    diagnostics.push(error("runtime_param.value.missing", `${path}.value`, "Resolved runtime param must include `value`."));
  }

  requireOptionalString(value, "value_type", `${path}.value_type`, diagnostics);
  requireOneOf(value, "source", ["default", "override", "instance_override", "parent_param", "materialized"], `${path}.source`, diagnostics);

  if ("metadata" in value && value.metadata !== undefined) {
    const metadata = requireRecord(value, "metadata", `${path}.metadata`, diagnostics);
    if (metadata) {
      requireOptionalString(metadata, "title", `${path}.metadata.title`, diagnostics);
      requireOptionalString(metadata, "unit", `${path}.metadata.unit`, diagnostics);
      requireOptionalNumber(metadata, "min", `${path}.metadata.min`, diagnostics);
      requireOptionalNumber(metadata, "max", `${path}.metadata.max`, diagnostics);
      requireOptionalNumber(metadata, "step", `${path}.metadata.step`, diagnostics);
      requireOptionalString(metadata, "group", `${path}.metadata.group`, diagnostics);
      requireOptionalString(metadata, "ui_hint", `${path}.metadata.ui_hint`, diagnostics);
      requireOptionalString(metadata, "description", `${path}.metadata.description`, diagnostics);
      requireOptionalString(metadata, "access_role", `${path}.metadata.access_role`, diagnostics);
      requireOptionalString(metadata, "live_edit_policy", `${path}.metadata.live_edit_policy`, diagnostics);
      requireOptionalString(metadata, "persist_policy", `${path}.metadata.persist_policy`, diagnostics);
      requireOptionalString(metadata, "recipe_scope", `${path}.metadata.recipe_scope`, diagnostics);
      requireOptionalString(metadata, "danger_level", `${path}.metadata.danger_level`, diagnostics);
    }
  }

  if ("provenance" in value && value.provenance !== undefined) {
    const provenance = requireRecord(value, "provenance", `${path}.provenance`, diagnostics);
    if (provenance) {
      requireString(provenance, "owner_id", `${path}.provenance.owner_id`, diagnostics);
      requireString(provenance, "param_id", `${path}.provenance.param_id`, diagnostics);
      requireOneOf(provenance, "source_layer", ["system", "composition"], `${path}.provenance.source_layer`, diagnostics);
    }
  }
  return true;
}

function validateRuntimeConnection(
  connectionId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeConnection {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_connection.invalid", path, "Runtime connection must be an object."));
    return false;
  }

  requireExactString(value, "id", connectionId, `${path}.id`, diagnostics);
  validateRuntimeEndpoint(value.source, `${path}.source`, diagnostics);
  validateRuntimeEndpoint(value.target, `${path}.target`, diagnostics);
  requireString(value, "channel_kind", `${path}.channel_kind`, diagnostics);
  requireString(value, "value_type", `${path}.value_type`, diagnostics);

  const origin = requireRecord(value, "origin", `${path}.origin`, diagnostics);
  if (origin) {
    requireOneOf(origin, "origin_layer", ["system", "composition"], `${path}.origin.origin_layer`, diagnostics);
    requireString(origin, "owner_id", `${path}.origin.owner_id`, diagnostics);
    requireOptionalString(origin, "signal_id", `${path}.origin.signal_id`, diagnostics);
    requireOptionalString(origin, "route_id", `${path}.origin.route_id`, diagnostics);
  }

  return true;
}

function validateRuntimeEndpoint(value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is RuntimeEndpoint {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_endpoint.invalid", path, "Runtime endpoint must be an object."));
    return false;
  }

  requireString(value, "instance_id", `${path}.instance_id`, diagnostics);
  requireString(value, "port_id", `${path}.port_id`, diagnostics);
  return true;
}

function validateRuntimeResourceBinding(
  resourceId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeResourceBinding {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_resource.invalid", path, "Runtime resource binding must be an object."));
    return false;
  }

  requireExactString(value, "id", resourceId, `${path}.id`, diagnostics);
  requireOneOf(value, "binding_kind", ["digital_in", "digital_out", "analog_in", "analog_out", "bus", "service"], `${path}.binding_kind`, diagnostics);
  requireString(value, "instance_id", `${path}.instance_id`, diagnostics);
  requireOptionalString(value, "port_id", `${path}.port_id`, diagnostics);
  requireRecord(value, "config", `${path}.config`, diagnostics);
  return true;
}

function validateRuntimeNativeExecution(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeNativeExecution {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_native_execution.invalid", path, "Runtime native execution must be an object."));
    return false;
  }

  requireString(value, "native_kind", `${path}.native_kind`, diagnostics);
  requireOptionalStringArray(value, "target_kinds", `${path}.target_kinds`, diagnostics);
  requireOptionalString(value, "mode", `${path}.mode`, diagnostics);
  requireOptionalStringArray(value, "frontend_requirement_ids", `${path}.frontend_requirement_ids`, diagnostics);
  if ("config_template" in value && typeof value.config_template === "undefined") {
    diagnostics.push(error("field.present", `${path}.config_template`, "Field `config_template` must not be undefined when present."));
  }
  return true;
}

function validateRuntimeOperation(
  operationId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeOperation {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation.invalid", path, "Runtime operation must be an object."));
    return false;
  }

  requireExactString(value, "id", operationId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalOneOf(value, "confirmation_policy", ["none", "required"], `${path}.confirmation_policy`, diagnostics);
  if ("availability" in value && value.availability !== undefined) {
    validateRuntimeOperationAvailability(value.availability, `${path}.availability`, diagnostics);
  }
  requireOptionalOneOf(value, "cancel_mode", ["not_cancellable", "while_running"], `${path}.cancel_mode`, diagnostics);
  requireOptionalOneOf(value, "progress_mode", ["none", "signal_based", "state_based"], `${path}.progress_mode`, diagnostics);
  if ("progress_contract" in value && value.progress_contract !== undefined) {
    validateRuntimeOperationProgressContract(value.progress_contract, `${path}.progress_contract`, diagnostics);
  }
  if ("result_contract" in value && value.result_contract !== undefined) {
    validateRuntimeOperationResultContract(value.result_contract, `${path}.result_contract`, diagnostics);
  }
  requireOptionalString(value, "ui_hint", `${path}.ui_hint`, diagnostics);
  requireOptionalStringArray(value, "safe_when", `${path}.safe_when`, diagnostics);
  validateOptionalSignalRefs(value, "progress_signals", `${path}.progress_signals`, diagnostics);
  requireOptionalStringArray(value, "result_fields", `${path}.result_fields`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);

  if ("state_hint" in value && value.state_hint !== undefined) {
    const stateHint = requireRecord(value, "state_hint", `${path}.state_hint`, diagnostics);
    if (stateHint) {
      requireOptionalString(stateHint, "availability", `${path}.state_hint.availability`, diagnostics);
      requireOptionalString(stateHint, "progress_style", `${path}.state_hint.progress_style`, diagnostics);
      requireOptionalBoolean(stateHint, "destructive", `${path}.state_hint.destructive`, diagnostics);
    }
  }
  return true;
}

function validateRuntimeOperationAvailability(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeOperationAvailability {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation.availability.invalid", path, "Runtime operation availability must be an object."));
    return false;
  }

  requireOptionalOneOf(value, "mode", ["always", "guarded"], `${path}.mode`, diagnostics);
  if ("required_signals" in value && value.required_signals !== undefined) {
    validateSignalRefs(value.required_signals, `${path}.required_signals`, diagnostics);
  }
  requireOptionalStringArray(value, "required_states", `${path}.required_states`, diagnostics);
  requireOptionalString(value, "notes", `${path}.notes`, diagnostics);
  return true;
}

function validateRuntimeOperationResultContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeOperationResultContract {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation.result_contract.invalid", path, "Runtime operation result contract must be an object."));
    return false;
  }

  requireOneOf(value, "mode", ["none", "recommendation", "applyable_result"], `${path}.mode`, diagnostics);
  validateOptionalResultFields(value, "fields", `${path}.fields`, diagnostics);
  validateOptionalResultFields(value, "failure_fields", `${path}.failure_fields`, diagnostics);

  if ("recommendation_lifecycle" in value && value.recommendation_lifecycle !== undefined) {
    if (value.mode !== "recommendation") {
      diagnostics.push(error(
        "runtime_operation.result_contract.recommendation_lifecycle.invalid",
        `${path}.recommendation_lifecycle`,
        "Recommendation lifecycle is allowed only for `mode: recommendation`."
      ));
    }
    validateRuntimeOperationRecommendationLifecycle(
      value.recommendation_lifecycle,
      `${path}.recommendation_lifecycle`,
      diagnostics
    );
  }
  return true;
}

function validateRuntimeOperationProgressContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation.progress_contract.invalid", path, "Runtime operation progress contract must be an object."));
    return false;
  }

  validateOptionalResultFields(value, "fields", `${path}.fields`, diagnostics);
  return true;
}

function validateRuntimeOperationRecommendationLifecycle(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): boolean {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation.recommendation_lifecycle.invalid", path, "Recommendation lifecycle contract must be an object."));
    return false;
  }

  requireOneOf(value, "mode", ["advisory", "apply_reject"], `${path}.mode`, diagnostics);
  requireOptionalOneOf(
    value,
    "apply_confirmation_policy",
    ["none", "required"],
    `${path}.apply_confirmation_policy`,
    diagnostics
  );
  requireOptionalOneOf(
    value,
    "reject_confirmation_policy",
    ["none", "required"],
    `${path}.reject_confirmation_policy`,
    diagnostics
  );
  return true;
}

function validateRuntimeOperationRuntimeContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeOperationRuntimeContract {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation_runtime_contract.invalid", path, "Runtime operation runtime contract must be an object."));
    return false;
  }

  requireBoolean(value, "invoke_supported", `${path}.invoke_supported`, diagnostics);
  requireBoolean(value, "cancel_supported", `${path}.cancel_supported`, diagnostics);
  requireBoolean(value, "progress_supported", `${path}.progress_supported`, diagnostics);
  requireBoolean(value, "result_supported", `${path}.result_supported`, diagnostics);
  requireBoolean(value, "audit_required", `${path}.audit_required`, diagnostics);
  requireOptionalOneOf(
    value,
    "confirmation_token_validation",
    ["none", "when_required"],
    `${path}.confirmation_token_validation`,
    diagnostics
  );
  requireOptionalBoolean(value, "failure_payload_supported", `${path}.failure_payload_supported`, diagnostics);
  requireOptionalOneOf(value, "audit_hook_mode", ["none", "operation_events"], `${path}.audit_hook_mode`, diagnostics);
  requireOptionalBoolean(value, "recommendation_lifecycle_supported", `${path}.recommendation_lifecycle_supported`, diagnostics);
  requireOptionalBoolean(value, "progress_payload_supported", `${path}.progress_payload_supported`, diagnostics);
  if ("execution_baseline_kinds" in value && value.execution_baseline_kinds !== undefined) {
    requireStringArrayExactOneOf(
      value.execution_baseline_kinds,
      ["reset_totalizer", "reset_counter", "reset_interval"],
      `${path}.execution_baseline_kinds`,
      diagnostics
    );
  }
  return true;
}

function validateRuntimePackageModeRuntimeContract(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePackageModeRuntimeContract {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_package_mode_runtime_contract.invalid", path, "Runtime package mode runtime contract must be an object."));
    return false;
  }

  requireBoolean(value, "package_mode_execution_supported", `${path}.package_mode_execution_supported`, diagnostics);
  requireBoolean(value, "phase_transition_execution_supported", `${path}.phase_transition_execution_supported`, diagnostics);
  requireBoolean(value, "transition_guard_diagnostics_supported", `${path}.transition_guard_diagnostics_supported`, diagnostics);
  requireStringArrayExactOneOf(
    value.supported_intents,
    [...WAVE14_PACKAGE_MODE_EXECUTION_INTENTS],
    `${path}.supported_intents`,
    diagnostics
  );
  return true;
}

export function validateRuntimeOperationSnapshot(
  value: unknown,
  path = "$"
): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  const ok = validateRuntimeOperationSnapshotAtPath(value, path, diagnostics);
  return {
    ok: ok && diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics
  };
}

function validateRuntimeOperationSnapshotAtPath(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeOperationSnapshot {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation_snapshot.invalid", path, "Runtime operation snapshot must be an object."));
    return false;
  }

  requireString(value, "operation_id", `${path}.operation_id`, diagnostics);
  requireOneOf(
    value,
    "state",
    ["idle", "pending_confirmation", "accepted", "running", "completed", "failed", "cancelled", "rejected"],
    `${path}.state`,
    diagnostics
  );
  requireOptionalNumber(value, "progress", `${path}.progress`, diagnostics);
  requireOptionalRecord(value, "progress_payload", `${path}.progress_payload`, diagnostics);
  requireOptionalString(value, "message", `${path}.message`, diagnostics);
  requireOptionalRecord(value, "result", `${path}.result`, diagnostics);
  requireOptionalRecord(value, "failure", `${path}.failure`, diagnostics);
  requireOptionalString(value, "audit_record_id", `${path}.audit_record_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "recommendation_state",
    ["none", "available", "pending_apply", "applied", "rejected"],
    `${path}.recommendation_state`,
    diagnostics
  );
  return true;
}

function validateOptionalResultFields(
  value: Record<string, unknown>,
  field: "fields" | "failure_fields",
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  if (!Array.isArray(value[field])) {
    diagnostics.push(error("field.array", path, `Field \`${field}\` must be an array when present.`));
    return;
  }

  (value[field] as unknown[]).forEach((entry, index) => {
    if (!isRecord(entry)) {
      diagnostics.push(error("runtime_operation.result_field.invalid", `${path}.${index}`, "Result field must be an object."));
      return;
    }
    requireString(entry, "id", `${path}.${index}.id`, diagnostics);
    requireString(entry, "value_type", `${path}.${index}.value_type`, diagnostics);
    requireOptionalString(entry, "title", `${path}.${index}.title`, diagnostics);
  });
}

function requireStringArrayExactOneOf(
  value: unknown,
  allowed: string[],
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!Array.isArray(value)) {
    diagnostics.push(error("field.array", path, "Field must be an array."));
    return;
  }

  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      diagnostics.push(error("field.string", `${path}.${index}`, "Array entry must be a string."));
      return;
    }
    if (!allowed.includes(entry)) {
      diagnostics.push(error("field.enum", `${path}.${index}`, `Field must be one of: ${allowed.join(", ")}.`));
    }
  });
}

function validateRuntimeTraceGroup(
  traceGroupId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeTraceGroup {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_trace_group.invalid", path, "Runtime trace group must be an object."));
    return false;
  }

  requireExactString(value, "id", traceGroupId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);

  validateSignalRefs(value.signals, `${path}.signals`, diagnostics);

  if ("sample_hint_ms" in value && typeof value.sample_hint_ms !== "number") {
    diagnostics.push(error("field.number", `${path}.sample_hint_ms`, "Field `sample_hint_ms` must be a number when present."));
  }
  requireOptionalString(value, "chart_hint", `${path}.chart_hint`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimeMonitor(
  monitorId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeMonitor {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_monitor.invalid", path, "Runtime monitor must be an object."));
    return false;
  }

  requireExactString(value, "id", monitorId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateOptionalSignalRefs(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "severity", `${path}.severity`, diagnostics);
  requireOptionalString(value, "status_port_id", `${path}.status_port_id`, diagnostics);
  requireOptionalRecord(value, "config", `${path}.config`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimeFrontendRequirement(
  requirementId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeFrontendRequirement {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_frontend_requirement.invalid", path, "Runtime frontend requirement must be an object."));
    return false;
  }

  requireExactString(value, "id", requirementId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "kind", `${path}.kind`, diagnostics);
  requireOptionalString(value, "mode", `${path}.mode`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  validateOptionalSignalRefs(value, "source_ports", `${path}.source_ports`, diagnostics);
  requireOptionalString(value, "binding_kind", `${path}.binding_kind`, diagnostics);
  requireOptionalString(value, "channel_kind", `${path}.channel_kind`, diagnostics);
  requireOptionalString(value, "value_type", `${path}.value_type`, diagnostics);
  requireOptionalBoolean(value, "required", `${path}.required`, diagnostics);
  requireOptionalRecord(value, "config", `${path}.config`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
}

function validateRuntimePersistenceSlot(
  slotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimePersistenceSlot {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_persistence_slot.invalid", path, "Runtime persistence slot must be an object."));
    return false;
  }

  requireExactString(value, "id", slotId, `${path}.id`, diagnostics);
  requireString(value, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireString(value, "slot_kind", `${path}.slot_kind`, diagnostics);
  requireOptionalString(value, "title", `${path}.title`, diagnostics);
  requireOptionalString(value, "owner_param_id", `${path}.owner_param_id`, diagnostics);
  requireOptionalString(value, "nv_slot_hint", `${path}.nv_slot_hint`, diagnostics);
  requireOptionalString(value, "flush_policy", `${path}.flush_policy`, diagnostics);
  validateOptionalMetadataProvenance(value, "provenance", `${path}.provenance`, diagnostics);
  return true;
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

function requireStringArray(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  const current = value[field];
  if (!Array.isArray(current) || current.some((entry) => typeof entry !== "string")) {
    diagnostics.push(error("field.string_array", path, `Field \`${field}\` must be an array of strings.`));
  }
}

function requireOptionalNumber(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "number") {
    diagnostics.push(error("field.number", path, `Field \`${field}\` must be a number when present.`));
  }
}

function requireBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean.`));
  }
}

function requireOptionalBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean when present.`));
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

function requireOptionalRecord(
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

function validateSignalRefs(value: unknown, path: string, diagnostics: ValidationDiagnostic[]) {
  if (!Array.isArray(value)) {
    diagnostics.push(error("field.array", path, "Field must be an array."));
    return;
  }

  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      diagnostics.push(error("runtime_trace_signal.invalid", `${path}.${index}`, "Signal ref must be an object."));
      return;
    }
    requireString(entry, "instance_id", `${path}.${index}.instance_id`, diagnostics);
    requireString(entry, "port_id", `${path}.${index}.port_id`, diagnostics);
  });
}

function validateOptionalSignalRefs(
  value: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  validateSignalRefs(value[field], path, diagnostics);
}

function validateOptionalMetadataProvenance(
  value: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  const provenance = requireRecord(value, field, path, diagnostics);
  if (!provenance) {
    return;
  }

  requireString(provenance, "owner_instance_id", `${path}.owner_instance_id`, diagnostics);
  requireOneOf(
    provenance,
    "facet_kind",
    ["operation", "trace_group", "monitor", "frontend_requirement", "persistence_slot"],
    `${path}.facet_kind`,
    diagnostics
  );
  requireString(provenance, "facet_id", `${path}.facet_id`, diagnostics);
  requireOptionalString(provenance, "source_type_ref", `${path}.source_type_ref`, diagnostics);
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
  return {
    ok: false,
    diagnostics
  };
}
