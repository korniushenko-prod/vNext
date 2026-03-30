import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

import { materializeProject } from "@universal-plc/materializer-core";
import type { ProjectModel } from "@universal-plc/project-schema";

import {
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact
} from "../src/index.js";

const WORKSPACE_ROOT_URL = new URL("../../../../", import.meta.url);

const runHoursCounterProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/run-hours-counter/run-hours-counter.project.minimal.json"
);
const runHoursCounterRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/run-hours-counter/run-hours-counter.runtime-pack.snapshot.json"
);
const runHoursCounterArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/run-hours-counter/run-hours-counter.shipcontroller-artifact.json"
);

const eventCounterProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/event-counter/event-counter.project.minimal.json"
);
const eventCounterRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/event-counter/event-counter.runtime-pack.snapshot.json"
);
const eventCounterArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/event-counter/event-counter.shipcontroller-artifact.json"
);

const thresholdMonitorProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/threshold-monitor/threshold-monitor.project.minimal.json"
);
const thresholdMonitorRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/threshold-monitor/threshold-monitor.runtime-pack.snapshot.json"
);
const thresholdMonitorArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/threshold-monitor/threshold-monitor.shipcontroller-artifact.json"
);

const maintenanceCounterProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/maintenance-counter/maintenance-counter.project.minimal.json"
);
const maintenanceCounterRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/maintenance-counter/maintenance-counter.runtime-pack.snapshot.json"
);
const maintenanceCounterArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/maintenance-counter/maintenance-counter.shipcontroller-artifact.json"
);
const runHoursToMaintenanceProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/run-hours-to-maintenance/run-hours-to-maintenance.project.json"
);
const runHoursToMaintenanceRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/run-hours-to-maintenance/run-hours-to-maintenance.runtime-pack.snapshot.json"
);
const runHoursToMaintenanceArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/run-hours-to-maintenance/run-hours-to-maintenance.shipcontroller-artifact.json"
);

test("run hours counter end-to-end path materializes, validates and emits the canonical artifact", () => {
  assertReferenceSlice(
    runHoursCounterProject,
    "run-hours-counter-demo-pack",
    "2026-03-29T18:00:00Z",
    runHoursCounterRuntimeSnapshot,
    runHoursCounterArtifactSnapshot
  );
});

test("event counter end-to-end path materializes, validates and emits the canonical artifact", () => {
  assertReferenceSlice(
    eventCounterProject,
    "event-counter-demo-pack",
    "2026-03-29T18:10:00Z",
    eventCounterRuntimeSnapshot,
    eventCounterArtifactSnapshot
  );
});

test("threshold monitor end-to-end path materializes, validates and emits the canonical artifact", () => {
  assertReferenceSlice(
    thresholdMonitorProject,
    "threshold-monitor-demo-pack",
    "2026-03-29T18:20:00Z",
    thresholdMonitorRuntimeSnapshot,
    thresholdMonitorArtifactSnapshot
  );
});

test("maintenance counter end-to-end path materializes, validates and emits the canonical artifact", () => {
  assertReferenceSlice(
    maintenanceCounterProject,
    "maintenance-counter-demo-pack",
    "2026-03-29T18:30:00Z",
    maintenanceCounterRuntimeSnapshot,
    maintenanceCounterArtifactSnapshot
  );
});

test("run hours to maintenance end-to-end path materializes, validates and emits the canonical artifact", () => {
  const materialized = materializeProject(runHoursToMaintenanceProject, {
    pack_id: "run-hours-to-maintenance-demo-pack",
    generated_at: "2026-03-29T19:00:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(runHoursToMaintenanceRuntimeSnapshot));

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(runHoursToMaintenanceArtifactSnapshot));
  assert.equal(artifact.artifacts.maintenance_counters[0]?.usage_source.instance_id, "run_hours_1");
  assert.equal(artifact.artifacts.maintenance_counters[0]?.usage_source.port_id, "total_hours");
  assert.equal(artifact.artifacts.maintenance_counters[0]?.usage_source.resource_id, undefined);
});

test("run hours counter without a hardware binding still fails with the canonical frontend guard diagnostic", () => {
  const project = structuredClone(runHoursCounterProject);
  delete project.hardware.bindings.hw_motor_status_1;

  const materialized = materializeProject(project, {
    pack_id: "run-hours-counter-missing-binding-demo-pack",
    generated_at: "2026-03-29T20:00:00Z"
  });

  assert.equal(materialized.ok, false);
  assert.ok(materialized.diagnostics.some((entry) => (
    entry.code === "frontend.resource.missing" &&
    entry.path === "$.frontend_requirements.fe_run_hours_1_activity_source.binding_kind"
  )));

  const artifact = materialized.ok ? emitShipControllerConfigArtifact(materialized.pack) : null;
  assert.equal(artifact, null);
});

test("threshold monitor with incompatible input value_type produces the canonical adapter diagnostic and no artifact", () => {
  const project = structuredClone(thresholdMonitorProject);
  project.definitions.object_types.analog_input.interface.ports.value.value_type = "bool";

  const materialized = materializeProject(project, {
    pack_id: "threshold-monitor-bad-input-demo-pack",
    generated_at: "2026-03-29T20:10:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.deepEqual(materialized.diagnostics, []);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => (
    entry.code === "target.threshold_monitor.value_type.mismatch" &&
    entry.path === "$.frontend_requirements.fe_threshold_monitor_1_value_source.value_type"
  )));

  const artifact = compatibility.ok ? emitShipControllerConfigArtifact(materialized.pack) : null;
  assert.equal(artifact, null);
});

function assertReferenceSlice(
  project: ProjectModel,
  packId: string,
  generatedAt: string,
  runtimeSnapshot: unknown,
  artifactSnapshot: unknown
): void {
  const materialized = materializeProject(project, {
    pack_id: packId,
    generated_at: generatedAt
  });

  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(runtimeSnapshot));

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(artifactSnapshot));
}

function loadWorkspaceJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, WORKSPACE_ROOT_URL), "utf8")) as T;
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)])
    );
  }

  return value;
}
