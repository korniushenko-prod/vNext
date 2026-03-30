import { readFileSync } from "node:fs";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

const WORKSPACE_ROOT_URL = new URL("../../../../", import.meta.url);

function loadWorkspaceJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, WORKSPACE_ROOT_URL), "utf8")) as T;
}

export const runHoursCounterRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/run-hours-counter.runtime-pack.snapshot.json"
);

export const eventCounterRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/event-counter.runtime-pack.snapshot.json"
);

export const thresholdMonitorRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/threshold-monitor.runtime-pack.snapshot.json"
);

export const maintenanceCounterRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/maintenance-counter.runtime-pack.snapshot.json"
);

export const runHoursToMaintenanceRuntimePack = loadWorkspaceJson<RuntimePack>(
  "packages/materializer-core/tests/fixtures/run-hours-to-maintenance.runtime-pack.snapshot.json"
);

export function createRunHoursToMaintenanceRuntimePack(): RuntimePack {
  return structuredClone(runHoursToMaintenanceRuntimePack);
}
