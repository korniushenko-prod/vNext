import type {
  RuntimeConnection,
  RuntimeFrontendRequirement,
  RuntimePack,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";
import type {
  ShipControllerAnalogInputArtifact,
  ShipControllerCommBridgeArtifact,
  ShipControllerConfigArtifact,
  ShipControllerDigitalInputArtifact,
  ShipControllerDigitalOutputArtifact,
  ShipControllerEndpointRef,
  ShipControllerEventCounterArtifact,
  ShipControllerMaintenanceCounterArtifact,
  ShipControllerModbusRtuBusArtifact,
  ShipControllerPidControllerArtifact,
  ShipControllerPulseFlowmeterArtifact,
  ShipControllerPulseFlowmeterSourceRef,
  ShipControllerPidEndpointRef,
  ShipControllerOperationArtifact,
  ShipControllerPackageAllowedModeTransitionArtifact,
  ShipControllerPackageAllowedPhaseTransitionArtifact,
  ShipControllerPackageModeArtifact,
  ShipControllerPackageModeGroupArtifact,
  ShipControllerPackageModePhaseArtifact,
  ShipControllerPackageModeSummaryArtifact,
  ShipControllerPackageModeSummaryEntryArtifact,
  ShipControllerPackageCoordinationArtifact,
  ShipControllerPackageCoordinationStateArtifact,
  ShipControllerPackageCoordinationStateRuleArtifact,
  ShipControllerPackageAggregateAlarmArtifact,
  ShipControllerPackageAggregateMonitorArtifact,
  ShipControllerPackageGateSummaryArtifact,
  ShipControllerPackageInterlockArtifact,
  ShipControllerPackageOperationProxyArtifact,
  ShipControllerPackagePhaseArtifact,
  ShipControllerPackagePhaseGroupArtifact,
  ShipControllerPackagePhaseSummaryArtifact,
  ShipControllerPackagePhaseSummaryEntryArtifact,
  ShipControllerPackagePermissiveArtifact,
  ShipControllerPackagePermissiveInterlockArtifact,
  ShipControllerPackageArbitrationArtifact,
  ShipControllerPackageAuthorityHolderArtifact,
  ShipControllerPackageHandoverRequestArtifact,
  ShipControllerPackageHandoverSummaryArtifact,
  ShipControllerPackageOwnershipLaneArtifact,
  ShipControllerPackageOwnershipSummaryArtifact,
  ShipControllerPackageCommandLaneArtifact,
  ShipControllerPackageCommandSummaryArtifact,
  ShipControllerPackageOverrideHandoverArtifact,
  ShipControllerPackageProtectionDiagnosticSummaryArtifact,
  ShipControllerPackageProtectionRecoveryArtifact,
  ShipControllerPackageProtectionSummaryArtifact,
  ShipControllerPackageRecoveryRequestArtifact,
  ShipControllerPackageSupervisionArtifact,
  ShipControllerPackageSummaryOutputArtifact,
  ShipControllerPackageTraceGroupArtifact,
  ShipControllerPackageTripArtifact,
  ShipControllerPackageTransitionGuardArtifact,
  ShipControllerPackageInhibitArtifact,
  ShipControllerRemotePointArtifact,
  ShipControllerRunHoursCounterArtifact,
  ShipControllerThresholdMonitorArtifact,
  ShipControllerTimedRelayArtifact
} from "./types.js";

export function emitShipControllerConfigArtifact(pack: RuntimePack): ShipControllerConfigArtifact {
  const modbusRtuBuses = emitModbusRtuBuses(pack);
  const commBridges = emitCommBridges(pack);
  const remotePoints = emitRemotePoints(pack);
  const operations = emitOperations(pack);
  const packageSupervision = emitPackageSupervision(pack);
  const packageCoordination = emitPackageCoordination(pack);
  const packageModePhase = emitPackageModePhase(pack);
  const packagePermissiveInterlock = emitPackagePermissiveInterlock(pack);
  const packageProtectionRecovery = emitPackageProtectionRecovery(pack);
  const packageArbitration = emitPackageArbitration(pack);
  const packageOverrideHandover = emitPackageOverrideHandover(pack);
  const artifacts: ShipControllerConfigArtifact["artifacts"] = {
    digital_inputs: emitDigitalInputs(pack),
    analog_inputs: emitAnalogInputs(pack),
    digital_outputs: emitDigitalOutputs(pack),
    timed_relays: emitTimedRelays(pack),
    pulse_flowmeters: emitPulseFlowmeters(pack),
    run_hours_counters: emitRunHoursCounters(pack),
    event_counters: emitEventCounters(pack),
    threshold_monitors: emitThresholdMonitors(pack),
    maintenance_counters: emitMaintenanceCounters(pack),
    pid_controllers: emitPidControllers(pack)
  };

  if (modbusRtuBuses.length > 0) {
    artifacts.modbus_rtu_buses = modbusRtuBuses;
  }

  if (commBridges.length > 0) {
    artifacts.comm_bridges = commBridges;
  }

  if (remotePoints.length > 0) {
    artifacts.remote_points = remotePoints;
  }

  if (operations.length > 0) {
    artifacts.operations = operations;
  }

  if (packageSupervision.length > 0) {
    artifacts.package_supervision = packageSupervision;
  }

  if (packageCoordination.length > 0) {
    artifacts.package_coordination = packageCoordination;
  }

  if (packageModePhase.length > 0) {
    artifacts.package_mode_phase = packageModePhase;
  }

  if (packagePermissiveInterlock.length > 0) {
    artifacts.package_permissive_interlock = packagePermissiveInterlock;
  }

  if (packageProtectionRecovery.length > 0) {
    artifacts.package_protection_recovery = packageProtectionRecovery;
  }

  if (packageArbitration.length > 0) {
    artifacts.package_arbitration = packageArbitration;
  }
  if (packageOverrideHandover.length > 0) {
    artifacts.package_override_handover = packageOverrideHandover;
  }

  return {
    schema_version: "0.1.0",
    target_kind: "esp32.shipcontroller.v1",
    source_pack_id: pack.pack_id,
    capability_profile: "esp32-basic-io",
    artifacts,
    diagnostics: []
  };
}

function emitPackageSupervision(pack: RuntimePack): ShipControllerPackageSupervisionArtifact[] {
  return sortedKeys(pack.package_supervision ?? {})
    .map((packageId) => pack.package_supervision?.[packageId])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => ({
      id: entry.id,
      package_instance_id: entry.package_instance_id,
      title: entry.title,
      summary_outputs: sortedKeys(entry.summary_outputs ?? {}).map((summaryId) => {
        const summary = entry.summary_outputs?.[summaryId];
        if (!summary) {
          throw new Error(`Package supervision ${entry.id} is missing summary output ${summaryId}.`);
        }

        return {
          id: summary.id,
          title: summary.title,
          value_type: summary.value_type,
          source: resolvePackageEndpoint(pack, summary.source.instance_id, summary.source.port_id)
        } satisfies ShipControllerPackageSummaryOutputArtifact;
      }),
      aggregate_monitors: sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => {
        const monitor = entry.aggregate_monitors?.[monitorId];
        if (!monitor) {
          throw new Error(`Package supervision ${entry.id} is missing aggregate monitor ${monitorId}.`);
        }

        return {
          id: monitor.id,
          title: monitor.title,
          kind: monitor.kind,
          severity: monitor.severity,
          source_ports: monitor.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackageAggregateMonitorArtifact;
      }),
      aggregate_alarms: sortedKeys(entry.aggregate_alarms ?? {}).map((alarmId) => {
        const alarm = entry.aggregate_alarms?.[alarmId];
        if (!alarm) {
          throw new Error(`Package supervision ${entry.id} is missing aggregate alarm ${alarmId}.`);
        }

        return {
          id: alarm.id,
          title: alarm.title,
          severity: alarm.severity,
          source_ports: alarm.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackageAggregateAlarmArtifact;
      }),
      trace_groups: sortedKeys(entry.trace_groups ?? {}).map((traceGroupId) => {
        const traceGroup = entry.trace_groups?.[traceGroupId];
        if (!traceGroup) {
          throw new Error(`Package supervision ${entry.id} is missing trace group ${traceGroupId}.`);
        }

        return {
          id: traceGroup.id,
          title: traceGroup.title,
          signals: traceGroup.signals.map((signal) => resolvePackageEndpoint(pack, signal.instance_id, signal.port_id)),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies ShipControllerPackageTraceGroupArtifact;
      }),
      operation_proxies: sortedKeys(entry.operation_proxies ?? {}).map((proxyId) => {
        const proxy = entry.operation_proxies?.[proxyId];
        if (!proxy) {
          throw new Error(`Package supervision ${entry.id} is missing operation proxy ${proxyId}.`);
        }
        if (!pack.operations[proxy.target_operation_id]) {
          throw new Error(`Package supervision proxy ${proxy.id} references unknown operation ${proxy.target_operation_id}.`);
        }

        return {
          id: proxy.id,
          title: proxy.title,
          target_operation_id: proxy.target_operation_id,
          target_owner_instance_id: proxy.target_owner_instance_id,
          child_operation_kind: proxy.child_operation_kind,
          ui_hint: proxy.ui_hint
        } satisfies ShipControllerPackageOperationProxyArtifact;
      })
    }));
}

function emitPackageCoordination(pack: RuntimePack): ShipControllerPackageCoordinationArtifact[] {
  return sortedKeys(pack.package_coordination ?? {})
    .map((packageId) => pack.package_coordination?.[packageId])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => ({
      id: entry.id,
      package_instance_id: entry.package_instance_id,
      title: entry.title,
      package_state: {
        id: entry.package_state.id,
        title: entry.package_state.title,
        default_state: entry.package_state.default_state,
        states: sortedKeys(entry.package_state.states).map((stateId) => {
          const stateRule = entry.package_state.states[stateId];
          if (!stateRule) {
            throw new Error(`Package coordination ${entry.id} is missing state rule ${stateId}.`);
          }

          return {
            id: stateRule.id,
            state: stateRule.state,
            title: stateRule.title,
            source_ports: stateRule.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
            summary: stateRule.summary
          } satisfies ShipControllerPackageCoordinationStateRuleArtifact;
        })
      } satisfies ShipControllerPackageCoordinationStateArtifact,
      summary_outputs: sortedKeys(entry.summary_outputs ?? {}).map((summaryId) => {
        const summary = entry.summary_outputs?.[summaryId];
        if (!summary) {
          throw new Error(`Package coordination ${entry.id} is missing summary output ${summaryId}.`);
        }

        return {
          id: summary.id,
          title: summary.title,
          value_type: summary.value_type,
          source: resolvePackageEndpoint(pack, summary.source.instance_id, summary.source.port_id)
        } satisfies ShipControllerPackageSummaryOutputArtifact;
      }),
      aggregate_monitors: sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => {
        const monitor = entry.aggregate_monitors?.[monitorId];
        if (!monitor) {
          throw new Error(`Package coordination ${entry.id} is missing aggregate monitor ${monitorId}.`);
        }

        return {
          id: monitor.id,
          title: monitor.title,
          kind: monitor.kind,
          severity: monitor.severity,
          source_ports: monitor.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackageAggregateMonitorArtifact;
      }),
      trace_groups: sortedKeys(entry.trace_groups ?? {}).map((traceGroupId) => {
        const traceGroup = entry.trace_groups?.[traceGroupId];
        if (!traceGroup) {
          throw new Error(`Package coordination ${entry.id} is missing trace group ${traceGroupId}.`);
        }

        return {
          id: traceGroup.id,
          title: traceGroup.title,
          signals: traceGroup.signals.map((signal) => resolvePackageEndpoint(pack, signal.instance_id, signal.port_id)),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies ShipControllerPackageTraceGroupArtifact;
      }),
      operation_proxies: sortedKeys(entry.operation_proxies ?? {}).map((proxyId) => {
        const proxy = entry.operation_proxies?.[proxyId];
        if (!proxy) {
          throw new Error(`Package coordination ${entry.id} is missing operation proxy ${proxyId}.`);
        }
        if (!pack.operations[proxy.target_operation_id]) {
          throw new Error(`Package coordination proxy ${proxy.id} references unknown operation ${proxy.target_operation_id}.`);
        }

        return {
          id: proxy.id,
          title: proxy.title,
          target_operation_id: proxy.target_operation_id,
          target_owner_instance_id: proxy.target_owner_instance_id,
          child_operation_kind: proxy.child_operation_kind,
          ui_hint: proxy.ui_hint
        } satisfies ShipControllerPackageOperationProxyArtifact;
      })
    }));
}

function emitPackageModePhase(pack: RuntimePack): ShipControllerPackageModePhaseArtifact[] {
  return sortedKeys(pack.package_mode_phase ?? {})
    .map((packageId) => pack.package_mode_phase?.[packageId])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => ({
      id: entry.id,
      package_instance_id: entry.package_instance_id,
      title: entry.title,
      modes: sortedKeys(entry.modes).map((modeId) => {
        const mode = entry.modes[modeId];
        return {
          id: mode.id,
          qualified_id: mode.qualified_id,
          title: mode.title,
          summary: mode.summary,
          phase_ids: [...(mode.phase_ids ?? [])]
        } satisfies ShipControllerPackageModeArtifact;
      }),
      phases: sortedKeys(entry.phases).map((phaseId) => {
        const phase = entry.phases[phaseId];
        return {
          id: phase.id,
          qualified_id: phase.qualified_id,
          title: phase.title,
          summary: phase.summary,
          source_ports: phase.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackagePhaseArtifact;
      }),
      mode_summary: {
        id: entry.mode_summary.id,
        title: entry.mode_summary.title,
        default_mode_id: entry.mode_summary.default_mode_id,
        entries: sortedKeys(entry.mode_summary.entries).map((summaryId) => {
          const summaryEntry = entry.mode_summary.entries[summaryId];
          return {
            id: summaryEntry.id,
            title: summaryEntry.title,
            mode_id: summaryEntry.mode_id,
            source_ports: summaryEntry.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
            summary: summaryEntry.summary
          } satisfies ShipControllerPackageModeSummaryEntryArtifact;
        })
      } satisfies ShipControllerPackageModeSummaryArtifact,
      phase_summary: {
        id: entry.phase_summary.id,
        title: entry.phase_summary.title,
        default_phase_id: entry.phase_summary.default_phase_id,
        entries: sortedKeys(entry.phase_summary.entries).map((summaryId) => {
          const summaryEntry = entry.phase_summary.entries[summaryId];
          return {
            id: summaryEntry.id,
            title: summaryEntry.title,
            phase_id: summaryEntry.phase_id,
            source_ports: summaryEntry.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
            summary: summaryEntry.summary
          } satisfies ShipControllerPackagePhaseSummaryEntryArtifact;
        })
      } satisfies ShipControllerPackagePhaseSummaryArtifact,
      active_mode_id: entry.active_mode_id,
      active_phase_id: entry.active_phase_id,
      allowed_mode_transitions: sortedKeys(entry.allowed_mode_transitions ?? {}).map((transitionId) => {
        const transition = entry.allowed_mode_transitions?.[transitionId];
        if (!transition) {
          throw new Error(`Package mode/phase ${entry.id} is missing mode transition ${transitionId}.`);
        }

        return {
          id: transition.id,
          title: transition.title,
          intent: "request_mode_change",
          from_mode_id: transition.from_mode_id,
          to_mode_id: transition.to_mode_id,
          guard_state: transition.guard_state,
          guard_notes: transition.guard_notes
        } satisfies ShipControllerPackageAllowedModeTransitionArtifact;
      }),
      allowed_phase_transitions: sortedKeys(entry.allowed_phase_transitions ?? {}).map((transitionId) => {
        const transition = entry.allowed_phase_transitions?.[transitionId];
        if (!transition) {
          throw new Error(`Package mode/phase ${entry.id} is missing phase transition ${transitionId}.`);
        }

        return {
          id: transition.id,
          title: transition.title,
          intent: transition.intent === "request_phase_abort" ? "request_phase_abort" : "request_phase_start",
          phase_id: transition.phase_id,
          allowed_mode_ids: transition.allowed_mode_ids ? [...transition.allowed_mode_ids] : undefined,
          phase_state: transition.phase_state,
          transition_state: transition.transition_state,
          guard_state: transition.guard_state,
          guard_notes: transition.guard_notes
        } satisfies ShipControllerPackageAllowedPhaseTransitionArtifact;
      }),
      package_mode_groups: sortedKeys(entry.package_mode_groups ?? {}).map((groupId) => {
        const group = entry.package_mode_groups?.[groupId];
        if (!group) {
          throw new Error(`Package mode/phase ${entry.id} is missing mode group ${groupId}.`);
        }

        return {
          id: group.id,
          title: group.title,
          mode_ids: [...group.mode_ids],
          summary: group.summary
        } satisfies ShipControllerPackageModeGroupArtifact;
      }),
      package_phase_groups: sortedKeys(entry.package_phase_groups ?? {}).map((groupId) => {
        const group = entry.package_phase_groups?.[groupId];
        if (!group) {
          throw new Error(`Package mode/phase ${entry.id} is missing phase group ${groupId}.`);
        }

        return {
          id: group.id,
          title: group.title,
          phase_ids: [...group.phase_ids],
          summary: group.summary
        } satisfies ShipControllerPackagePhaseGroupArtifact;
      }),
      trace_groups: sortedKeys(entry.trace_groups ?? {}).map((traceGroupId) => {
        const traceGroup = entry.trace_groups?.[traceGroupId];
        if (!traceGroup) {
          throw new Error(`Package mode/phase ${entry.id} is missing trace group ${traceGroupId}.`);
        }

        return {
          id: traceGroup.id,
          title: traceGroup.title,
          signals: traceGroup.signals.map((signal) => resolvePackageEndpoint(pack, signal.instance_id, signal.port_id)),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies ShipControllerPackageTraceGroupArtifact;
      }),
      package_supervision_id: entry.package_supervision_id,
      package_coordination_id: entry.package_coordination_id
    }));
}

function emitPackageArbitration(pack: RuntimePack): ShipControllerPackageArbitrationArtifact[] {
  return sortedKeys(pack.package_arbitration ?? {})
    .map((packageId) => pack.package_arbitration?.[packageId])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => ({
      id: entry.id,
      package_instance_id: entry.package_instance_id,
      title: entry.title,
      ownership_lanes: sortedKeys(entry.ownership_lanes ?? {}).map((laneId) => {
        const lane = entry.ownership_lanes?.[laneId];
        if (!lane) {
          throw new Error(`Package arbitration ${entry.id} is missing ownership lane ${laneId}.`);
        }

        return {
          id: lane.id,
          title: lane.title,
          lane: lane.lane,
          source_ports: lane.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
          summary: lane.summary
        } satisfies ShipControllerPackageOwnershipLaneArtifact;
      }),
      ownership_summary: {
        id: entry.ownership_summary.id,
        title: entry.ownership_summary.title,
        active_lane_ids: [...(entry.ownership_summary.active_lane_ids ?? [])],
        summary: entry.ownership_summary.summary
      } satisfies ShipControllerPackageOwnershipSummaryArtifact,
      command_lanes: sortedKeys(entry.command_lanes ?? {}).map((laneId) => {
        const lane = entry.command_lanes?.[laneId];
        if (!lane) {
          throw new Error(`Package arbitration ${entry.id} is missing command lane ${laneId}.`);
        }
        if (!pack.instances[lane.target_instance_id]) {
          throw new Error(`Package arbitration lane ${lane.id} references unknown target instance ${lane.target_instance_id}.`);
        }

        return {
          id: lane.id,
          title: lane.title,
          request_kind: lane.request_kind,
          ownership_lane_id: lane.ownership_lane_id,
          ownership_lane: lane.ownership_lane,
          target_instance_id: lane.target_instance_id,
          arbitration_result: lane.arbitration_result,
          summary: lane.summary,
          request_preview: lane.request_preview,
          blocked_reason: lane.blocked_reason,
          denied_reason: lane.denied_reason,
          superseded_by_lane_id: lane.superseded_by_lane_id
        } satisfies ShipControllerPackageCommandLaneArtifact;
      }),
      command_summary: {
        id: entry.command_summary.id,
        title: entry.command_summary.title,
        active_owner_lane_ids: [...(entry.command_summary.active_owner_lane_ids ?? [])],
        accepted_lane_ids: [...(entry.command_summary.accepted_lane_ids ?? [])],
        blocked_lane_ids: [...(entry.command_summary.blocked_lane_ids ?? [])],
        denied_lane_ids: [...(entry.command_summary.denied_lane_ids ?? [])],
        superseded_lane_ids: [...(entry.command_summary.superseded_lane_ids ?? [])],
        summary: entry.command_summary.summary
      } satisfies ShipControllerPackageCommandSummaryArtifact,
      summary_outputs: sortedKeys(entry.summary_outputs ?? {}).map((summaryId) => {
        const summary = entry.summary_outputs?.[summaryId];
        if (!summary) {
          throw new Error(`Package arbitration ${entry.id} is missing summary output ${summaryId}.`);
        }

        return {
          id: summary.id,
          title: summary.title,
          value_type: summary.value_type,
          source: resolvePackageEndpoint(pack, summary.source.instance_id, summary.source.port_id)
        } satisfies ShipControllerPackageSummaryOutputArtifact;
      }),
      aggregate_monitors: sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => {
        const monitor = entry.aggregate_monitors?.[monitorId];
        if (!monitor) {
          throw new Error(`Package arbitration ${entry.id} is missing aggregate monitor ${monitorId}.`);
        }

        return {
          id: monitor.id,
          title: monitor.title,
          kind: monitor.kind,
          severity: monitor.severity,
          source_ports: monitor.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackageAggregateMonitorArtifact;
      }),
      trace_groups: sortedKeys(entry.trace_groups ?? {}).map((traceGroupId) => {
        const traceGroup = entry.trace_groups?.[traceGroupId];
        if (!traceGroup) {
          throw new Error(`Package arbitration ${entry.id} is missing trace group ${traceGroupId}.`);
        }

        return {
          id: traceGroup.id,
          title: traceGroup.title,
          signals: traceGroup.signals.map((signal) => resolvePackageEndpoint(pack, signal.instance_id, signal.port_id)),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies ShipControllerPackageTraceGroupArtifact;
      })
    }));
}

function emitPackageOverrideHandover(pack: RuntimePack): ShipControllerPackageOverrideHandoverArtifact[] {
  return sortedKeys(pack.package_override_handover ?? {})
    .map((packageId) => pack.package_override_handover?.[packageId])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => ({
      id: entry.id,
      package_instance_id: entry.package_instance_id,
      title: entry.title,
      authority_holders: sortedKeys(entry.authority_holders ?? {}).map((holderId) => {
        const holder = entry.authority_holders?.[holderId];
        if (!holder) {
          throw new Error(`Package override/handover ${entry.id} is missing authority holder ${holderId}.`);
        }

        return {
          id: holder.id,
          title: holder.title,
          lane: holder.lane,
          source_ports: holder.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
          summary: holder.summary
        } satisfies ShipControllerPackageAuthorityHolderArtifact;
      }),
      handover_summary: {
        id: entry.handover_summary.id,
        title: entry.handover_summary.title,
        current_holder_id: entry.handover_summary.current_holder_id,
        current_lane: entry.handover_summary.current_lane,
        requested_holder_id: entry.handover_summary.requested_holder_id,
        accepted_request_ids: [...(entry.handover_summary.accepted_request_ids ?? [])],
        blocked_request_ids: [...(entry.handover_summary.blocked_request_ids ?? [])],
        denied_request_ids: [...(entry.handover_summary.denied_request_ids ?? [])],
        last_handover_reason: entry.handover_summary.last_handover_reason,
        summary: entry.handover_summary.summary
      } satisfies ShipControllerPackageHandoverSummaryArtifact,
      handover_requests: sortedKeys(entry.handover_requests ?? {}).map((requestId) => {
        const request = entry.handover_requests?.[requestId];
        if (!request) {
          throw new Error(`Package override/handover ${entry.id} is missing handover request ${requestId}.`);
        }

        return {
          id: request.id,
          title: request.title,
          request_kind: request.request_kind,
          requested_holder_id: request.requested_holder_id,
          requested_lane: request.requested_lane,
          state: request.state,
          summary: request.summary,
          request_preview: request.request_preview,
          blocked_reason: request.blocked_reason,
          denied_reason: request.denied_reason
        } satisfies ShipControllerPackageHandoverRequestArtifact;
      }),
      summary_outputs: sortedKeys(entry.summary_outputs ?? {}).map((summaryId) => {
        const summary = entry.summary_outputs?.[summaryId];
        if (!summary) {
          throw new Error(`Package override/handover ${entry.id} is missing summary output ${summaryId}.`);
        }

        return {
          id: summary.id,
          title: summary.title,
          value_type: summary.value_type,
          source: resolvePackageEndpoint(pack, summary.source.instance_id, summary.source.port_id)
        } satisfies ShipControllerPackageSummaryOutputArtifact;
      }),
      aggregate_monitors: sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => {
        const monitor = entry.aggregate_monitors?.[monitorId];
        if (!monitor) {
          throw new Error(`Package override/handover ${entry.id} is missing aggregate monitor ${monitorId}.`);
        }

        return {
          id: monitor.id,
          title: monitor.title,
          kind: monitor.kind,
          severity: monitor.severity,
          source_ports: monitor.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackageAggregateMonitorArtifact;
      }),
      trace_groups: sortedKeys(entry.trace_groups ?? {}).map((traceGroupId) => {
        const traceGroup = entry.trace_groups?.[traceGroupId];
        if (!traceGroup) {
          throw new Error(`Package override/handover ${entry.id} is missing trace group ${traceGroupId}.`);
        }

        return {
          id: traceGroup.id,
          title: traceGroup.title,
          signals: traceGroup.signals.map((signal) => resolvePackageEndpoint(pack, signal.instance_id, signal.port_id)),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies ShipControllerPackageTraceGroupArtifact;
      })
    }));
}

function emitPackagePermissiveInterlock(pack: RuntimePack): ShipControllerPackagePermissiveInterlockArtifact[] {
  return sortedKeys(pack.package_permissive_interlock ?? {})
    .map((packageId) => pack.package_permissive_interlock?.[packageId])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => ({
      id: entry.id,
      package_instance_id: entry.package_instance_id,
      title: entry.title,
      permissives: sortedKeys(entry.permissives ?? {}).map((permissiveId) => {
        const permissive = entry.permissives?.[permissiveId];
        if (!permissive) {
          throw new Error(`Package permissive/interlock ${entry.id} is missing permissive ${permissiveId}.`);
        }

        return {
          id: permissive.id,
          qualified_id: permissive.qualified_id,
          title: permissive.title,
          source_ports: permissive.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
          summary: permissive.summary,
          blocked_reason_code: permissive.blocked_reason_code,
          diagnostic_ref: permissive.diagnostic_ref
        } satisfies ShipControllerPackagePermissiveArtifact;
      }),
      interlocks: sortedKeys(entry.interlocks ?? {}).map((interlockId) => {
        const interlock = entry.interlocks?.[interlockId];
        if (!interlock) {
          throw new Error(`Package permissive/interlock ${entry.id} is missing interlock ${interlockId}.`);
        }

        return {
          id: interlock.id,
          qualified_id: interlock.qualified_id,
          title: interlock.title,
          source_ports: interlock.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
          active_state: interlock.active_state,
          summary: interlock.summary,
          reason_code: interlock.reason_code,
          diagnostic_ref: interlock.diagnostic_ref
        } satisfies ShipControllerPackageInterlockArtifact;
      }),
      gate_summary: {
        id: entry.gate_summary.id,
        title: entry.gate_summary.title,
        default_state: entry.gate_summary.default_state,
        permissive_ids: [...(entry.gate_summary.permissive_ids ?? [])],
        interlock_ids: [...(entry.gate_summary.interlock_ids ?? [])],
        transition_guards: sortedKeys(entry.gate_summary.transition_guards ?? {}).map((guardId) => {
          const guard = entry.gate_summary.transition_guards?.[guardId];
          if (!guard) {
            throw new Error(`Package permissive/interlock ${entry.id} is missing transition guard ${guardId}.`);
          }

          return {
            id: guard.id,
            qualified_id: guard.qualified_id,
            title: guard.title,
            permissive_ids: [...(guard.permissive_ids ?? [])],
            interlock_ids: [...(guard.interlock_ids ?? [])],
            mode_transition_id: guard.mode_transition_id,
            phase_transition_id: guard.phase_transition_id,
            summary: guard.summary
          } satisfies ShipControllerPackageTransitionGuardArtifact;
        })
      } satisfies ShipControllerPackageGateSummaryArtifact,
      summary_outputs: sortedKeys(entry.summary_outputs ?? {}).map((summaryId) => {
        const summary = entry.summary_outputs?.[summaryId];
        if (!summary) {
          throw new Error(`Package permissive/interlock ${entry.id} is missing summary output ${summaryId}.`);
        }
        return {
          id: summary.id,
          title: summary.title,
          value_type: summary.value_type,
          source: resolvePackageEndpoint(pack, summary.source.instance_id, summary.source.port_id)
        } satisfies ShipControllerPackageSummaryOutputArtifact;
      }),
      aggregate_monitors: sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => {
        const monitor = entry.aggregate_monitors?.[monitorId];
        if (!monitor) {
          throw new Error(`Package permissive/interlock ${entry.id} is missing aggregate monitor ${monitorId}.`);
        }
        return {
          id: monitor.id,
          title: monitor.title,
          kind: monitor.kind,
          severity: monitor.severity,
          source_ports: monitor.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackageAggregateMonitorArtifact;
      }),
      trace_groups: sortedKeys(entry.trace_groups ?? {}).map((traceGroupId) => {
        const traceGroup = entry.trace_groups?.[traceGroupId];
        if (!traceGroup) {
          throw new Error(`Package permissive/interlock ${entry.id} is missing trace group ${traceGroupId}.`);
        }
        return {
          id: traceGroup.id,
          title: traceGroup.title,
          signals: traceGroup.signals.map((signal) => resolvePackageEndpoint(pack, signal.instance_id, signal.port_id)),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies ShipControllerPackageTraceGroupArtifact;
      })
    }) satisfies ShipControllerPackagePermissiveInterlockArtifact);
}

function emitPackageProtectionRecovery(pack: RuntimePack): ShipControllerPackageProtectionRecoveryArtifact[] {
  return sortedKeys(pack.package_protection_recovery ?? {})
    .map((packageId) => pack.package_protection_recovery?.[packageId])
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined)
    .map((entry) => ({
      id: entry.id,
      package_instance_id: entry.package_instance_id,
      title: entry.title,
      trips: sortedKeys(entry.trips ?? {}).map((tripId) => {
        const trip = entry.trips?.[tripId];
        if (!trip) {
          throw new Error(`Package protection/recovery ${entry.id} is missing trip ${tripId}.`);
        }

        return {
          id: trip.id,
          qualified_id: trip.qualified_id,
          title: trip.title,
          source_ports: trip.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
          latching: trip.latching,
          summary: trip.summary,
          reason_code: trip.reason_code,
          diagnostic_ref: trip.diagnostic_ref
        } satisfies ShipControllerPackageTripArtifact;
      }),
      inhibits: sortedKeys(entry.inhibits ?? {}).map((inhibitId) => {
        const inhibit = entry.inhibits?.[inhibitId];
        if (!inhibit) {
          throw new Error(`Package protection/recovery ${entry.id} is missing inhibit ${inhibitId}.`);
        }

        return {
          id: inhibit.id,
          qualified_id: inhibit.qualified_id,
          title: inhibit.title,
          source_ports: inhibit.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id)),
          summary: inhibit.summary,
          reason_code: inhibit.reason_code,
          diagnostic_ref: inhibit.diagnostic_ref
        } satisfies ShipControllerPackageInhibitArtifact;
      }),
      protection_summary: {
        id: entry.protection_summary.id,
        title: entry.protection_summary.title,
        default_state: entry.protection_summary.default_state,
        trip_ids: [...(entry.protection_summary.trip_ids ?? [])],
        inhibit_ids: [...(entry.protection_summary.inhibit_ids ?? [])],
        recovery_request_ids: [...(entry.protection_summary.recovery_request_ids ?? [])],
        diagnostic_summaries: sortedKeys(entry.protection_summary.diagnostic_summaries ?? {}).map((summaryId) => {
          const summary = entry.protection_summary.diagnostic_summaries?.[summaryId];
          if (!summary) {
            throw new Error(`Package protection/recovery ${entry.id} is missing diagnostic summary ${summaryId}.`);
          }

          return {
            id: summary.id,
            title: summary.title,
            trip_ids: [...(summary.trip_ids ?? [])],
            inhibit_ids: [...(summary.inhibit_ids ?? [])],
            summary: summary.summary
          } satisfies ShipControllerPackageProtectionDiagnosticSummaryArtifact;
        })
      } satisfies ShipControllerPackageProtectionSummaryArtifact,
      recovery_requests: sortedKeys(entry.recovery_requests ?? {}).map((requestId) => {
        const request = entry.recovery_requests?.[requestId];
        if (!request) {
          throw new Error(`Package protection/recovery ${entry.id} is missing recovery request ${requestId}.`);
        }

        return {
          id: request.id,
          title: request.title,
          kind: request.kind,
          target_operation_id: request.target_operation_id,
          target_owner_instance_id: request.target_owner_instance_id,
          confirmation_policy: request.confirmation_policy,
          blocked_by_trip_ids: [...(request.blocked_by_trip_ids ?? [])],
          blocked_by_inhibit_ids: [...(request.blocked_by_inhibit_ids ?? [])],
          summary: request.summary
        } satisfies ShipControllerPackageRecoveryRequestArtifact;
      }),
      summary_outputs: sortedKeys(entry.summary_outputs ?? {}).map((summaryId) => {
        const summary = entry.summary_outputs?.[summaryId];
        if (!summary) {
          throw new Error(`Package protection/recovery ${entry.id} is missing summary output ${summaryId}.`);
        }
        return {
          id: summary.id,
          title: summary.title,
          value_type: summary.value_type,
          source: resolvePackageEndpoint(pack, summary.source.instance_id, summary.source.port_id)
        } satisfies ShipControllerPackageSummaryOutputArtifact;
      }),
      aggregate_monitors: sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => {
        const monitor = entry.aggregate_monitors?.[monitorId];
        if (!monitor) {
          throw new Error(`Package protection/recovery ${entry.id} is missing aggregate monitor ${monitorId}.`);
        }
        return {
          id: monitor.id,
          title: monitor.title,
          kind: monitor.kind,
          severity: monitor.severity,
          source_ports: monitor.source_ports.map((source) => resolvePackageEndpoint(pack, source.instance_id, source.port_id))
        } satisfies ShipControllerPackageAggregateMonitorArtifact;
      }),
      trace_groups: sortedKeys(entry.trace_groups ?? {}).map((traceGroupId) => {
        const traceGroup = entry.trace_groups?.[traceGroupId];
        if (!traceGroup) {
          throw new Error(`Package protection/recovery ${entry.id} is missing trace group ${traceGroupId}.`);
        }
        return {
          id: traceGroup.id,
          title: traceGroup.title,
          signals: traceGroup.signals.map((signal) => resolvePackageEndpoint(pack, signal.instance_id, signal.port_id)),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies ShipControllerPackageTraceGroupArtifact;
      })
    }) satisfies ShipControllerPackageProtectionRecoveryArtifact);
}

function emitOperations(pack: RuntimePack): ShipControllerOperationArtifact[] {
  const executionBaselineKinds = new Set<string>(pack.operation_runtime_contract?.execution_baseline_kinds ?? []);
  const pidAutotuneExecution = (
    pack.operation_runtime_contract?.invoke_supported === true &&
    pack.operation_runtime_contract?.cancel_supported === true &&
    pack.operation_runtime_contract?.progress_supported === true &&
    pack.operation_runtime_contract?.result_supported === true &&
    pack.operation_runtime_contract?.audit_required === true &&
    pack.operation_runtime_contract?.recommendation_lifecycle_supported === true &&
    pack.operation_runtime_contract?.progress_payload_supported === true
  );

  return sortedKeys(pack.operations)
    .map((operationId) => pack.operations[operationId])
    .map((operation) => {
      const progressFields = operation.progress_contract?.fields?.map((field) => ({
        id: field.id,
        value_type: field.value_type,
        title: field.title
      }));
      const resultFields = operation.result_contract?.fields?.map((field) => ({
        id: field.id,
        value_type: field.value_type,
        title: field.title
      }));
      const failureFields = operation.result_contract?.failure_fields?.map((field) => ({
        id: field.id,
        value_type: field.value_type,
        title: field.title
      }));
      const executionBaseline = executionBaselineKinds.has(operation.kind);
      const specializedPidAutotune = pidAutotuneExecution && (operation.kind === "autotune" || operation.kind === "pid_autotune");

      return {
        id: operation.id,
        owner_instance_id: operation.owner_instance_id,
        kind: operation.kind,
        ...(executionBaseline
          ? { execution_baseline: true as const }
          : specializedPidAutotune
            ? { specialized_execution: "pid_autotune" as const }
            : { metadata_only: true as const }),
        title: operation.title,
        confirmation_policy: operation.confirmation_policy,
        confirmation_token_validation: executionBaseline || specializedPidAutotune
          ? pack.operation_runtime_contract?.confirmation_token_validation
          : undefined,
        availability_mode: operation.availability?.mode,
        cancel_mode: executionBaseline ? operation.cancel_mode : undefined,
        progress_mode: operation.progress_mode,
        progress_fields: specializedPidAutotune ? progressFields : undefined,
        progress_payload_supported: specializedPidAutotune && pack.operation_runtime_contract?.progress_payload_supported
          ? true
          : undefined,
        result_mode: operation.result_contract?.mode,
        result_fields: resultFields,
        failure_fields: executionBaseline || specializedPidAutotune ? failureFields : undefined,
        audit_hook_mode: executionBaseline || specializedPidAutotune ? pack.operation_runtime_contract?.audit_hook_mode : undefined,
        recommendation_lifecycle_mode: specializedPidAutotune
          ? operation.result_contract?.recommendation_lifecycle?.mode
          : undefined,
        recommendation_apply_confirmation_policy: specializedPidAutotune
          ? operation.result_contract?.recommendation_lifecycle?.apply_confirmation_policy
          : undefined,
        recommendation_reject_confirmation_policy: specializedPidAutotune
          ? operation.result_contract?.recommendation_lifecycle?.reject_confirmation_policy
          : undefined
      };
    });
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

function emitModbusRtuBuses(pack: RuntimePack): ShipControllerModbusRtuBusArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.comm_bridge.v1")
    .map((instance) => {
      const busResource = resolveDirectResource(pack, instance.id, "bus");
      return {
        id: `modbus_bus_${instance.id}`,
        instance_id: instance.id,
        resource_id: busResource.id,
        driver: stringConfig(busResource, "driver") ?? "modbus_rtu",
        port: stringConfig(busResource, "port") ?? "unknown",
        baud_rate: numericParam(instance.params.baud_rate?.value) ?? 0,
        parity: stringParam(instance.params.parity?.value) ?? "N",
        stop_bits: numericParam(instance.params.stop_bits?.value) ?? 1
      };
    });
}

function emitCommBridges(pack: RuntimePack): ShipControllerCommBridgeArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.comm_bridge.v1")
    .map((instance) => {
      const execution = instance.native_execution;
      const frontendRequirementId = execution?.frontend_requirement_ids?.find((entry) => entry.endsWith("_bus_source"));
      if (!frontendRequirementId) {
        throw new Error(`CommBridge instance ${instance.id} is missing required frontend requirement ids.`);
      }

      const busResource = resolveDirectResource(pack, instance.id, "bus");
      return {
        id: instance.id,
        native_kind: execution?.native_kind ?? "std.comm_bridge.v1",
        bus_ref: busResource.id,
        slave_id: numericParam(instance.params.slave_id?.value) ?? 0,
        timeout_ms: numericParam(instance.params.timeout_ms?.value) ?? 0,
        poll_period_ms: numericParam(instance.params.poll_period_ms?.value) ?? 0,
        startup_delay_ms: numericParam(instance.params.startup_delay_ms?.value) ?? 0,
        stale_timeout_ms: numericParam(instance.params.stale_timeout_ms?.value) ?? 0,
        frontend_requirement_ids: [...(execution?.frontend_requirement_ids ?? [])]
      };
    });
}

function emitRemotePoints(pack: RuntimePack): ShipControllerRemotePointArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.remote_point_frontend.v1")
    .map((instance) => {
      const bridgeRef = stringParam(instance.params.bridge_ref?.value);
      if (!bridgeRef) {
        throw new Error(`RemotePointFrontend instance ${instance.id} is missing bridge_ref.`);
      }

      const bridgeInstance = pack.instances[bridgeRef];
      if (!bridgeInstance) {
        throw new Error(`RemotePointFrontend instance ${instance.id} references unknown bridge ${bridgeRef}.`);
      }

      const busResource = resolveDirectResource(pack, bridgeRef, "bus");
      const outputPort = instance.ports.value_out;
      return {
        id: instance.id,
        bridge_id: bridgeRef,
        bus_ref: busResource.id,
        slave_id: numericParam(bridgeInstance.params.slave_id?.value) ?? 0,
        register_address: numericParam(instance.params.register_address?.value) ?? 0,
        register_kind: stringParam(instance.params.register_kind?.value) ?? "unknown",
        register_count: numericParam(instance.params.register_count?.value) ?? 0,
        decode: stringParam(instance.params.value_decode?.value) ?? "unknown",
        value_type: outputPort?.value_type ?? "unknown",
        byte_order: stringParam(instance.params.byte_order?.value) ?? "unknown",
        word_order: stringParam(instance.params.word_order?.value) ?? "unknown",
        poll_period_ms: numericParam(bridgeInstance.params.poll_period_ms?.value) ?? 0,
        timeout_ms: numericParam(bridgeInstance.params.timeout_ms?.value) ?? 0
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

function emitRunHoursCounters(pack: RuntimePack): ShipControllerRunHoursCounterArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.run_hours_counter.v1")
    .map((instance) => {
      const execution = instance.native_execution;
      const frontendRequirementId = execution?.frontend_requirement_ids?.find((entry) => entry.endsWith("_activity_source"));
      if (!frontendRequirementId) {
        throw new Error(`Run hours counter instance ${instance.id} is missing required frontend requirement ids.`);
      }

      const frontendRequirement = pack.frontend_requirements[frontendRequirementId];
      if (!frontendRequirement) {
        throw new Error(`Run hours counter instance ${instance.id} references unknown frontend requirement ${frontendRequirementId}.`);
      }

      return {
        id: instance.id,
        native_kind: execution?.native_kind ?? "std.run_hours_counter.v1",
        persist_enabled: booleanParam(instance.params.persist_enabled?.value) ?? false,
        persist_period_s: numericParam(instance.params.persist_period_s?.value) ?? 0,
        rounding_mode: stringParam(instance.params.rounding_mode?.value) ?? "unknown",
        min_active_time_ms: numericParam(instance.params.min_active_time_ms?.value) ?? 0,
        persistence_slot_id: findPersistenceSlotId(pack, instance.id),
        frontend_requirement_ids: [...(execution?.frontend_requirement_ids ?? [])],
        source: resolveInputEndpoint(pack, frontendRequirementId, frontendRequirement)
      };
    });
}

function emitEventCounters(pack: RuntimePack): ShipControllerEventCounterArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.event_counter.v1")
    .map((instance) => {
      const execution = instance.native_execution;
      const frontendRequirementId = execution?.frontend_requirement_ids?.find((entry) => entry.endsWith("_event_source"));
      if (!frontendRequirementId) {
        throw new Error(`Event counter instance ${instance.id} is missing required frontend requirement ids.`);
      }

      const frontendRequirement = pack.frontend_requirements[frontendRequirementId];
      if (!frontendRequirement) {
        throw new Error(`Event counter instance ${instance.id} references unknown frontend requirement ${frontendRequirementId}.`);
      }

      return {
        id: instance.id,
        native_kind: execution?.native_kind ?? "std.event_counter.v1",
        edge_mode: stringParam(instance.params.edge_mode?.value) ?? "rising",
        debounce_ms: numericParam(instance.params.debounce_ms?.value) ?? 0,
        persist_enabled: booleanParam(instance.params.persist_enabled?.value) ?? false,
        persist_period_s: numericParam(instance.params.persist_period_s?.value) ?? 0,
        increment_step: numericParam(instance.params.increment_step?.value) ?? 0,
        persistence_slot_id: findPersistenceSlotId(pack, instance.id),
        frontend_requirement_ids: [...(execution?.frontend_requirement_ids ?? [])],
        source: resolveInputEndpoint(pack, frontendRequirementId, frontendRequirement)
      };
    });
}

function emitThresholdMonitors(pack: RuntimePack): ShipControllerThresholdMonitorArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.threshold_monitor.v1")
    .map((instance) => {
      const execution = instance.native_execution;
      const frontendRequirementId = execution?.frontend_requirement_ids?.find((entry) => entry.endsWith("_value_source"));
      if (!frontendRequirementId) {
        throw new Error(`Threshold monitor instance ${instance.id} is missing required frontend requirement ids.`);
      }

      const frontendRequirement = pack.frontend_requirements[frontendRequirementId];
      if (!frontendRequirement) {
        throw new Error(`Threshold monitor instance ${instance.id} references unknown frontend requirement ${frontendRequirementId}.`);
      }

      return {
        id: instance.id,
        native_kind: execution?.native_kind ?? "std.threshold_monitor.v1",
        mode: stringParam(instance.params.mode?.value) ?? "high",
        threshold_a: numericParam(instance.params.threshold_a?.value) ?? 0,
        threshold_b: numericParam(instance.params.threshold_b?.value) ?? 0,
        hysteresis: numericParam(instance.params.hysteresis?.value) ?? 0,
        latch_alarm: booleanParam(instance.params.latch_alarm?.value) ?? false,
        timeout_ms: numericParam(instance.params.timeout_ms?.value) ?? 0,
        frontend_requirement_ids: [...(execution?.frontend_requirement_ids ?? [])],
        source: resolveInputEndpoint(pack, frontendRequirementId, frontendRequirement)
      };
    });
}

function emitMaintenanceCounters(pack: RuntimePack): ShipControllerMaintenanceCounterArtifact[] {
  return sortedKeys(pack.instances)
    .map((instanceId) => pack.instances[instanceId])
    .filter((instance) => instance.native_execution?.native_kind === "std.maintenance_counter.v1")
    .map((instance) => {
      const execution = instance.native_execution;
      return {
        id: instance.id,
        native_kind: execution?.native_kind ?? "std.maintenance_counter.v1",
        service_interval: numericParam(instance.params.service_interval?.value) ?? 0,
        warning_before: numericParam(instance.params.warning_before?.value) ?? 0,
        overdue_margin: numericParam(instance.params.overdue_margin?.value) ?? 0,
        auto_rollover: booleanParam(instance.params.auto_rollover?.value) ?? false,
        persist_enabled: booleanParam(instance.params.persist_enabled?.value) ?? false,
        persistence_slot_ids: findPersistenceSlotIds(pack, instance.id),
        frontend_requirement_ids: [...(execution?.frontend_requirement_ids ?? [])],
        usage_source: resolveRequiredConnectedInputEndpoint(pack, instance.id, "usage_total_in")
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

function resolveDirectResource(
  pack: RuntimePack,
  instanceId: string,
  bindingKind: string
): RuntimeResourceBinding {
  const resource = sortedKeys(pack.resources)
    .map((resourceId) => pack.resources[resourceId])
    .find((entry) => (
      entry.instance_id === instanceId &&
      entry.port_id === undefined &&
      entry.binding_kind === bindingKind
    ));

  if (!resource) {
    throw new Error(`Instance ${instanceId} is missing required direct resource binding ${bindingKind}.`);
  }

  return resource;
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
      : frontendRequirement.source_ports?.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)
        ? findResource(
            pack,
            frontendRequirement.source_ports.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)!.instance_id,
            frontendRequirement.source_ports.find((port) => findResource(pack, port.instance_id, port.port_id, frontendRequirement.binding_kind) !== undefined)!.port_id,
            frontendRequirement.binding_kind
          )
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

function resolveInputEndpoint(
  pack: RuntimePack,
  frontendRequirementId: string,
  frontendRequirement: RuntimeFrontendRequirement
): ShipControllerEndpointRef {
  const connection = frontendRequirement.source_ports?.length
    ? sortedKeys(pack.connections)
        .map((connectionId) => pack.connections[connectionId])
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
    throw new Error(`Frontend requirement ${frontendRequirementId} is missing connection/resource backing.`);
  }

  return {
    instance_id: connection?.source.instance_id ?? resource?.instance_id ?? frontendRequirement.owner_instance_id,
    port_id: connection?.source.port_id ?? resource?.port_id ?? frontendRequirement.source_ports?.[0]?.port_id ?? "unknown",
    connection_id: connection?.id,
    resource_id: resource?.id
  };
}

function resolveRequiredConnectedInputEndpoint(
  pack: RuntimePack,
  instanceId: string,
  portId: string
): ShipControllerEndpointRef {
  const connection = findIncomingConnection(pack, instanceId, portId);
  if (!connection) {
    throw new Error(`Required runtime input ${instanceId}.${portId} is missing an incoming connection.`);
  }

  const resource = findResource(pack, connection.source.instance_id, connection.source.port_id);
  return {
    instance_id: connection.source.instance_id,
    port_id: connection.source.port_id,
    connection_id: connection.id,
    resource_id: resource?.id
  };
}

function resolvePackageEndpoint(
  pack: RuntimePack,
  instanceId: string,
  portId: string
): ShipControllerEndpointRef {
  const port = pack.instances[instanceId]?.ports?.[portId];
  if (!port) {
    throw new Error(`Package supervision source ${instanceId}.${portId} is missing from the runtime pack.`);
  }

  const resource = findResource(pack, instanceId, portId);
  const incoming = findIncomingConnection(pack, instanceId, portId);
  const outgoing = findOutgoingConnection(pack, instanceId, portId);

  return {
    instance_id: instanceId,
    port_id: portId,
    connection_id: incoming?.id ?? outgoing?.id,
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

function stringConfig(resource: RuntimeResourceBinding, key: string): string | undefined {
  const value = resource.config[key];
  return typeof value === "string" ? value : undefined;
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
