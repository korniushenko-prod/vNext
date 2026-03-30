import type {
  RuntimeOperationSnapshot,
  TargetPackageCoordinationSnapshot
} from "@universal-plc/target-adapter-contracts";
import type {
  RuntimePackageCoordination,
  RuntimePack
} from "@universal-plc/runtime-pack-schema";
import { buildSyntheticOperationSnapshots } from "./operations.js";
import { sortedKeys } from "./sort.js";

export function buildSyntheticPackageCoordinationSnapshots(
  pack: RuntimePack
): Record<string, TargetPackageCoordinationSnapshot> {
  const snapshots: Record<string, TargetPackageCoordinationSnapshot> = {};
  const operationSnapshots = buildSyntheticOperationSnapshots(pack);

  for (const entryId of sortedKeys(pack.package_coordination ?? {})) {
    const entry = pack.package_coordination?.[entryId];
    if (!entry) {
      continue;
    }

    const summary = buildSummary(entry.summary_outputs ?? {});
    const state = deriveCoordinationState(entry, summary);

    snapshots[entry.package_instance_id] = {
      package_instance_id: entry.package_instance_id,
      state,
      summary,
      aggregate_monitor_states: Object.fromEntries(
        sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => [
          monitorId,
          {
            state: state === "fault_latched" ? "degraded" : "healthy",
            severity: entry.aggregate_monitors?.[monitorId]?.severity ?? "warning",
            summary: entry.aggregate_monitors?.[monitorId]?.title ?? monitorId
          }
        ])
      ),
      operation_proxy_states: buildOperationProxyStates(entry, operationSnapshots)
    };
  }

  return snapshots;
}

function buildSummary(
  summaryOutputs: RuntimePackageCoordination["summary_outputs"]
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  for (const outputId of sortedKeys(summaryOutputs ?? {})) {
    const output = summaryOutputs?.[outputId];
    if (!output) {
      continue;
    }

    summary[output.id] = createDeterministicValue(output.id, output.value_type);
  }

  return summary;
}

function deriveCoordinationState(
  entry: RuntimePackageCoordination,
  summary: Record<string, unknown>
): TargetPackageCoordinationSnapshot["state"] {
  if (summary.fault_summary === true) {
    return "fault_latched";
  }

  if (summary.running_summary === true) {
    return "circulation_active";
  }

  if (summary.ready_summary === true) {
    return "ready";
  }

  return entry.package_state.default_state ?? "standby";
}

function buildOperationProxyStates(
  entry: RuntimePackageCoordination,
  operationSnapshots: Record<string, RuntimeOperationSnapshot>
): Record<string, RuntimeOperationSnapshot> {
  return Object.fromEntries(
    sortedKeys(entry.operation_proxies ?? {}).map((proxyId) => {
      const proxy = entry.operation_proxies?.[proxyId];
      return [proxyId, operationSnapshots[proxy?.target_operation_id ?? ""] ?? {
        operation_id: proxy?.target_operation_id ?? proxyId,
        state: "idle",
        message: "Synthetic package coordination proxy snapshot."
      }];
    })
  );
}

function createDeterministicValue(summaryId: string, valueType: string): unknown {
  if (valueType === "bool") {
    if (/fault/i.test(summaryId)) {
      return false;
    }
    if (/running|ready|control|ok/i.test(summaryId)) {
      return true;
    }
    return false;
  }

  if (valueType === "float" || valueType === "int" || valueType === "u32") {
    return 1;
  }

  return `${summaryId}_synthetic`;
}
