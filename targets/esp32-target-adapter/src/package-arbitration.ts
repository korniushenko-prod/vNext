import type { TargetPackageArbitrationSnapshot } from "@universal-plc/target-adapter-contracts";
import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";

export function buildSyntheticPackageArbitrationSnapshots(
  pack: RuntimePack
): Record<string, TargetPackageArbitrationSnapshot> {
  const snapshots: Record<string, TargetPackageArbitrationSnapshot> = {};

  for (const entryId of sortedKeys(pack.package_arbitration ?? {})) {
    const entry = pack.package_arbitration?.[entryId];
    if (!entry) {
      continue;
    }

    const commandLaneIds = sortedKeys(entry.command_lanes ?? {});
    const acceptedLaneIds = commandLaneIds.filter((laneId) => entry.command_lanes?.[laneId]?.arbitration_result === "accepted");
    const blockedLaneIds = commandLaneIds.filter((laneId) => entry.command_lanes?.[laneId]?.arbitration_result === "blocked");
    const deniedLaneIds = commandLaneIds.filter((laneId) => entry.command_lanes?.[laneId]?.arbitration_result === "denied");
    const supersededLaneIds = commandLaneIds.filter((laneId) => entry.command_lanes?.[laneId]?.arbitration_result === "superseded");

    const state = acceptedLaneIds.length > 0
      ? "accepted"
      : blockedLaneIds.length > 0
        ? "blocked"
        : deniedLaneIds.length > 0
          ? "denied"
          : supersededLaneIds.length > 0
            ? "superseded"
            : "unsupported";

    snapshots[entry.package_instance_id] = {
      package_instance_id: entry.package_instance_id,
      state,
      ownership_summary: {
        active_lane_ids: [...(entry.ownership_summary.active_lane_ids ?? [])],
        summary: entry.ownership_summary.summary
      },
      command_summary: {
        active_owner_lane_ids: [...(entry.command_summary.active_owner_lane_ids ?? [])],
        accepted_lane_ids: [...(entry.command_summary.accepted_lane_ids ?? [])],
        blocked_lane_ids: [...(entry.command_summary.blocked_lane_ids ?? [])],
        denied_lane_ids: [...(entry.command_summary.denied_lane_ids ?? [])],
        superseded_lane_ids: [...(entry.command_summary.superseded_lane_ids ?? [])],
        summary: entry.command_summary.summary
      },
      command_lane_states: Object.fromEntries(
        commandLaneIds.map((laneId) => {
          const lane = entry.command_lanes?.[laneId];
          return [laneId, {
            request_kind: lane?.request_kind ?? "request_reset",
            ownership_lane: lane?.ownership_lane ?? "manual",
            arbitration_result: lane?.arbitration_result ?? "unsupported",
            blocked_reason: lane?.blocked_reason,
            denied_reason: lane?.denied_reason,
            superseded_by_lane_id: lane?.superseded_by_lane_id,
            request_preview: lane?.request_preview,
            summary: lane?.summary
          }];
        })
      )
    };
  }

  return snapshots;
}
