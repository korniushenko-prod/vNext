import type { TargetPackageOverrideHandoverSnapshot } from "@universal-plc/target-adapter-contracts";
import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";

export function buildSyntheticPackageOverrideHandoverSnapshots(
  pack: RuntimePack
): Record<string, TargetPackageOverrideHandoverSnapshot> {
  const snapshots: Record<string, TargetPackageOverrideHandoverSnapshot> = {};

  for (const entryId of sortedKeys(pack.package_override_handover ?? {})) {
    const entry = pack.package_override_handover?.[entryId];
    if (!entry) {
      continue;
    }

    const requestIds = sortedKeys(entry.handover_requests ?? {});
    const acceptedRequestIds = requestIds.filter((requestId) => entry.handover_requests?.[requestId]?.state === "accepted");
    const blockedRequestIds = requestIds.filter((requestId) => entry.handover_requests?.[requestId]?.state === "blocked");
    const deniedRequestIds = requestIds.filter((requestId) => entry.handover_requests?.[requestId]?.state === "denied");

    const state = acceptedRequestIds.length > 0
      ? "accepted"
      : blockedRequestIds.length > 0
        ? "blocked"
        : deniedRequestIds.length > 0
          ? "denied"
          : "unsupported";

    snapshots[entry.package_instance_id] = {
      package_instance_id: entry.package_instance_id,
      state,
      handover_summary: {
        current_holder_id: entry.handover_summary.current_holder_id,
        current_lane: entry.handover_summary.current_lane,
        requested_holder_id: entry.handover_summary.requested_holder_id,
        accepted_request_ids: [...(entry.handover_summary.accepted_request_ids ?? [])],
        blocked_request_ids: [...(entry.handover_summary.blocked_request_ids ?? [])],
        denied_request_ids: [...(entry.handover_summary.denied_request_ids ?? [])],
        last_handover_reason: entry.handover_summary.last_handover_reason,
        summary: entry.handover_summary.summary
      },
      handover_request_states: Object.fromEntries(
        requestIds.map((requestId) => {
          const request = entry.handover_requests?.[requestId];
          return [requestId, {
            request_kind: request?.request_kind ?? "request_takeover",
            requested_holder_id: request?.requested_holder_id ?? "unknown_holder",
            requested_lane: request?.requested_lane ?? "manual",
            state: request?.state ?? "unsupported",
            blocked_reason: request?.blocked_reason,
            denied_reason: request?.denied_reason,
            request_preview: request?.request_preview,
            summary: request?.summary
          }];
        })
      )
    };
  }

  return snapshots;
}
