import type {
  RuntimePackageAllowedPhaseTransition,
  RuntimePackageAllowedModeTransition,
  RuntimePack
} from "@universal-plc/runtime-pack-schema";
import type {
  PackageModeTransitionRequest,
  PackageModeTransitionResult,
  TargetPackageModePhaseSnapshot,
  TargetPackagePhaseState,
  TargetPackageTransitionGuardState
} from "@universal-plc/target-adapter-contracts";
import { sortedKeys } from "./sort.js";

export function buildSyntheticPackageModePhaseSnapshots(
  pack: RuntimePack
): Record<string, TargetPackageModePhaseSnapshot> {
  const snapshots: Record<string, TargetPackageModePhaseSnapshot> = {};

  for (const packageId of sortedKeys(pack.package_mode_phase ?? {})) {
    const entry = pack.package_mode_phase?.[packageId];
    if (!entry) {
      continue;
    }

    const phaseStates: Record<string, TargetPackagePhaseState> = Object.fromEntries(
      sortedKeys(entry.phases).map((phaseId) => {
        const phase = entry.phases[phaseId];
        return [phase.qualified_id, phase.qualified_id === entry.active_phase_id ? "running" : "idle"];
      })
    );

    for (const transitionId of sortedKeys(entry.allowed_phase_transitions ?? {})) {
      const transition = entry.allowed_phase_transitions?.[transitionId];
      if (!transition?.phase_state) {
        continue;
      }
      phaseStates[transition.phase_id] = transition.phase_state;
    }

    const transitionGuardStates: Record<string, TargetPackageTransitionGuardState> = Object.fromEntries([
      ...sortedKeys(entry.allowed_mode_transitions ?? {}).map((transitionId) => {
        const transition = entry.allowed_mode_transitions?.[transitionId] as RuntimePackageAllowedModeTransition | undefined;
        return [transitionId, transition?.guard_state ?? "clear"];
      }),
      ...sortedKeys(entry.allowed_phase_transitions ?? {}).map((transitionId) => {
        const transition = entry.allowed_phase_transitions?.[transitionId] as RuntimePackageAllowedPhaseTransition | undefined;
        return [transitionId, transition?.guard_state ?? "clear"];
      })
    ]);

    const activeTransition = findActiveTransition(entry.allowed_phase_transitions);

    snapshots[packageId] = {
      package_instance_id: entry.package_instance_id,
      state: "mode_phase_available",
      active_mode_id: entry.active_mode_id,
      active_phase_id: entry.active_phase_id,
      active_transition_intent: activeTransition?.intent,
      transition_state: activeTransition?.transition_state ?? "idle",
      mode_summary: {
        default_mode_id: entry.mode_summary.default_mode_id,
        entry_ids: sortedKeys(entry.mode_summary.entries)
      },
      phase_summary: {
        default_phase_id: entry.phase_summary.default_phase_id,
        entry_ids: sortedKeys(entry.phase_summary.entries)
      },
      mode_group_states: Object.fromEntries(
        sortedKeys(entry.package_mode_groups ?? {}).map((groupId) => {
          const group = entry.package_mode_groups?.[groupId];
          return [groupId, group?.mode_ids.includes(entry.active_mode_id) ? "active" : "idle"];
        })
      ),
      phase_group_states: Object.fromEntries(
        sortedKeys(entry.package_phase_groups ?? {}).map((groupId) => {
          const group = entry.package_phase_groups?.[groupId];
          return [groupId, group?.phase_ids.includes(entry.active_phase_id) ? "active" : "idle"];
        })
      ),
      phase_states: phaseStates,
      transition_guard_states: transitionGuardStates
    };
  }

  return snapshots;
}

export function invokeEsp32PackageModeTransition(
  request: PackageModeTransitionRequest
): PackageModeTransitionResult {
  if (!request.confirmation_token) {
    return {
      accepted: false,
      package_instance_id: request.package_instance_id,
      intent: request.intent,
      transition_state: "pending",
      message: "ESP32 package mode execution baseline requires a confirmation token."
    };
  }

  if (request.intent === "request_mode_change") {
    return {
      accepted: true,
      package_instance_id: request.package_instance_id,
      intent: request.intent,
      transition_state: "completed",
      active_mode_id: request.target_mode_id,
      guard_state: "clear",
      message: "ESP32 offline adapter exposes only synthetic package mode change execution."
    };
  }

  if (request.intent === "request_phase_start") {
    return {
      accepted: true,
      package_instance_id: request.package_instance_id,
      intent: request.intent,
      transition_state: "running",
      active_phase_id: request.target_phase_id,
      target_phase_state: "running",
      guard_state: "clear",
      message: "ESP32 offline adapter exposes only synthetic package phase start execution."
    };
  }

  return {
    accepted: true,
    package_instance_id: request.package_instance_id,
    intent: request.intent,
    transition_state: "cancelled",
    active_phase_id: request.target_phase_id,
    target_phase_state: "aborted",
    guard_state: "clear",
    message: "ESP32 offline adapter exposes only synthetic package phase abort execution."
  };
}

function findActiveTransition(
  transitions: Record<string, RuntimePackageAllowedPhaseTransition> | undefined
): RuntimePackageAllowedPhaseTransition | undefined {
  return sortedKeys(transitions ?? {})
    .map((transitionId) => transitions?.[transitionId])
    .find((transition) => transition?.transition_state === "running")
    ?? sortedKeys(transitions ?? {})
      .map((transitionId) => transitions?.[transitionId])
      .find((transition) => transition?.transition_state === "pending");
}
