import type { TargetPackagePermissiveInterlockSnapshot } from "@universal-plc/target-adapter-contracts";
import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import { sortedKeys } from "./sort.js";

export function buildSyntheticPackagePermissiveInterlockSnapshots(
  pack: RuntimePack
): Record<string, TargetPackagePermissiveInterlockSnapshot> {
  const snapshots: Record<string, TargetPackagePermissiveInterlockSnapshot> = {};

  for (const entryId of sortedKeys(pack.package_permissive_interlock ?? {})) {
    const entry = pack.package_permissive_interlock?.[entryId];
    if (!entry) {
      continue;
    }

    snapshots[entry.package_instance_id] = {
      package_instance_id: entry.package_instance_id,
      state: entry.gate_summary.default_state ?? "ready",
      gate_summary: {
        state: entry.gate_summary.default_state ?? "ready",
        ready: (entry.gate_summary.default_state ?? "ready") === "ready",
        blocked_reason_ids: [],
        held_reason_ids: [],
        faulted_reason_ids: [],
        transition_guard_ids: sortedKeys(entry.gate_summary.transition_guards ?? {})
      },
      permissive_states: Object.fromEntries(
        sortedKeys(entry.permissives ?? {}).map((permissiveId) => [
          permissiveId,
          {
            state: "ready",
            reason_code: entry.permissives?.[permissiveId]?.blocked_reason_code,
            diagnostic_ref: entry.permissives?.[permissiveId]?.diagnostic_ref,
            summary: entry.permissives?.[permissiveId]?.summary
          }
        ])
      ),
      interlock_states: Object.fromEntries(
        sortedKeys(entry.interlocks ?? {}).map((interlockId) => [
          interlockId,
          {
            state: "ready",
            reason_code: entry.interlocks?.[interlockId]?.reason_code,
            diagnostic_ref: entry.interlocks?.[interlockId]?.diagnostic_ref,
            summary: entry.interlocks?.[interlockId]?.summary
          }
        ])
      ),
      transition_guard_states: Object.fromEntries(
        sortedKeys(entry.gate_summary.transition_guards ?? {}).map((guardId) => [
          guardId,
          {
            state: "clear",
            blocked_by_ids: [],
            summary: entry.gate_summary.transition_guards?.[guardId]?.summary
          }
        ])
      )
    };
  }

  return snapshots;
}
