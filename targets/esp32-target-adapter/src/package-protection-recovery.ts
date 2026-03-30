import type { TargetPackageProtectionRecoverySnapshot } from "@universal-plc/target-adapter-contracts";
import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";

export function buildSyntheticPackageProtectionRecoverySnapshots(
  pack: RuntimePack
): Record<string, TargetPackageProtectionRecoverySnapshot> {
  const snapshots: Record<string, TargetPackageProtectionRecoverySnapshot> = {};

  for (const entryId of sortedKeys(pack.package_protection_recovery ?? {})) {
    const entry = pack.package_protection_recovery?.[entryId];
    if (!entry) {
      continue;
    }

    const state = entry.protection_summary.default_state ?? "ready";
    snapshots[entry.package_instance_id] = {
      package_instance_id: entry.package_instance_id,
      state,
      protection_summary: {
        state,
        ready: state === "ready",
        trip_reason_ids: sortedKeys(entry.trips ?? {})
          .filter((tripId) => state === "tripped" && Boolean(entry.trips?.[tripId]))
          .map((tripId) => entry.trips?.[tripId]?.id ?? tripId),
        inhibit_reason_ids: sortedKeys(entry.inhibits ?? {})
          .filter((inhibitId) => state === "blocked" && Boolean(entry.inhibits?.[inhibitId]))
          .map((inhibitId) => entry.inhibits?.[inhibitId]?.id ?? inhibitId),
        recovery_request_ids: sortedKeys(entry.recovery_requests ?? {}).map((requestId) => entry.recovery_requests?.[requestId]?.id ?? requestId),
        diagnostic_summary_ids: sortedKeys(entry.protection_summary.diagnostic_summaries ?? {})
      },
      trip_states: Object.fromEntries(
        sortedKeys(entry.trips ?? {}).map((tripId) => [
          tripId,
          {
            state: state === "tripped" ? "tripped" : "ready",
            latching: entry.trips?.[tripId]?.latching,
            reason_code: entry.trips?.[tripId]?.reason_code,
            diagnostic_ref: entry.trips?.[tripId]?.diagnostic_ref,
            summary: entry.trips?.[tripId]?.summary
          }
        ])
      ),
      inhibit_states: Object.fromEntries(
        sortedKeys(entry.inhibits ?? {}).map((inhibitId) => [
          inhibitId,
          {
            state: state === "blocked" ? "blocked" : "ready",
            reason_code: entry.inhibits?.[inhibitId]?.reason_code,
            diagnostic_ref: entry.inhibits?.[inhibitId]?.diagnostic_ref,
            summary: entry.inhibits?.[inhibitId]?.summary
          }
        ])
      ),
      recovery_request_states: Object.fromEntries(
        sortedKeys(entry.recovery_requests ?? {}).map((requestId) => [
          requestId,
          {
            availability_state: state === "tripped" || state === "recovering" ? "available" : "unavailable",
            target_operation_id: entry.recovery_requests?.[requestId]?.target_operation_id ?? requestId,
            summary: entry.recovery_requests?.[requestId]?.summary
          }
        ])
      )
    };
  }

  return snapshots;
}
