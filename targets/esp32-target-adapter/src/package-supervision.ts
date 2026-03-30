import type {
  RuntimeOperationSnapshot,
  TargetPackageSupervisionSnapshot
} from "@universal-plc/target-adapter-contracts";
import type {
  RuntimePackageSupervision,
  RuntimePack
} from "@universal-plc/runtime-pack-schema";
import { buildSyntheticOperationSnapshots } from "./operations.js";
import { sortedKeys } from "./sort.js";

export function buildSyntheticPackageSupervisionSnapshots(
  pack: RuntimePack
): Record<string, TargetPackageSupervisionSnapshot> {
  const snapshots: Record<string, TargetPackageSupervisionSnapshot> = {};
  const operationSnapshots = buildSyntheticOperationSnapshots(pack);

  for (const entryId of sortedKeys(pack.package_supervision ?? {})) {
    const entry = pack.package_supervision?.[entryId];
    if (!entry) {
      continue;
    }

    const summary = buildSummary(entry.summary_outputs ?? {});
    const state = derivePackageSupervisionState(summary);

    snapshots[entry.package_instance_id] = {
      package_instance_id: entry.package_instance_id,
      state,
      summary,
      aggregate_monitor_states: Object.fromEntries(
        sortedKeys(entry.aggregate_monitors ?? {}).map((monitorId) => [
          monitorId,
          {
            state: state === "healthy" ? "healthy" : state === "maintenance_due" ? "maintenance_due" : "degraded",
            severity: entry.aggregate_monitors?.[monitorId]?.severity ?? "warning",
            summary: entry.aggregate_monitors?.[monitorId]?.title ?? monitorId
          }
        ])
      ),
      aggregate_alarm_states: Object.fromEntries(
        sortedKeys(entry.aggregate_alarms ?? {}).map((alarmId) => [
          alarmId,
          {
            state: state === "alarm_present" ? "alarm_present" : state === "maintenance_due" ? "maintenance_due" : "clear",
            severity: entry.aggregate_alarms?.[alarmId]?.severity ?? "warning",
            summary: entry.aggregate_alarms?.[alarmId]?.title ?? alarmId
          }
        ])
      ),
      operation_proxy_states: buildOperationProxyStates(entry, operationSnapshots)
    };
  }

  return snapshots;
}

function buildSummary(
  summaryOutputs: RuntimePackageSupervision["summary_outputs"]
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

function derivePackageSupervisionState(summary: Record<string, unknown>):
  "healthy" | "degraded" | "alarm_present" | "maintenance_due" {
  if (summary.maintenance_due === true) {
    return "maintenance_due";
  }

  if (summary.package_faulted === true || summary.pressure_alarm === true || summary.alarm_present === true) {
    return "alarm_present";
  }

  if (summary.package_ready === false || summary.package_ok === false) {
    return "degraded";
  }

  return "healthy";
}

function buildOperationProxyStates(
  entry: RuntimePackageSupervision,
  operationSnapshots: Record<string, RuntimeOperationSnapshot>
): Record<string, RuntimeOperationSnapshot> {
  return Object.fromEntries(
    sortedKeys(entry.operation_proxies ?? {}).map((proxyId) => {
      const proxy = entry.operation_proxies?.[proxyId];
      return [proxyId, operationSnapshots[proxy?.target_operation_id ?? ""] ?? {
        operation_id: proxy?.target_operation_id ?? proxyId,
        state: "idle",
        message: "Synthetic package supervision proxy snapshot."
      }];
    })
  );
}

function createDeterministicValue(summaryId: string, valueType: string): unknown {
  if (valueType === "bool") {
    if (/fault|alarm|trip|blocked|denied|maintenance_due/i.test(summaryId)) {
      return false;
    }
    if (/ready|running|ok|source_ok/i.test(summaryId)) {
      return true;
    }
    return false;
  }

  if (valueType === "float" || valueType === "int" || valueType === "u32") {
    if (/pressure/i.test(summaryId)) {
      return 3.4;
    }
    if (/runtime|hours/i.test(summaryId)) {
      return 148.6;
    }
    if (/remaining/i.test(summaryId)) {
      return 752.4;
    }
    return 1;
  }

  return `${summaryId}_synthetic`;
}
