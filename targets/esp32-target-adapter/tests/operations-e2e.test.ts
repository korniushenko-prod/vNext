import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

import { materializeProject } from "@universal-plc/materializer-core";
import type { ProjectModel } from "@universal-plc/project-schema";

import {
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact,
  esp32CapabilityProfile
} from "../src/index.js";

const WORKSPACE_ROOT_URL = new URL("../../../../", import.meta.url);

const pulseFlowmeterProject = loadWorkspaceJson<ProjectModel>(
  "targets/esp32-target-adapter/tests/fixtures/pulse-flowmeter.project.minimal.json"
);
const pulseFlowmeterRuntimeSnapshot = loadWorkspaceJson(
  "packages/materializer-core/tests/fixtures/pulse-flowmeter.runtime-pack.snapshot.json"
);
const pulseFlowmeterArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/pulse-flowmeter/pulse-flowmeter.shipcontroller-artifact.json"
);

const runHoursProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/run-hours-counter/run-hours-counter.project.minimal.json"
);
const runHoursRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/run-hours-counter/run-hours-counter.runtime-pack.snapshot.json"
);
const runHoursArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/run-hours-counter/run-hours-counter.shipcontroller-artifact.json"
);

const maintenanceProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/maintenance-counter/maintenance-counter.project.minimal.json"
);
const maintenanceRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/maintenance-counter/maintenance-counter.runtime-pack.snapshot.json"
);
const maintenanceArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/maintenance-counter/maintenance-counter.shipcontroller-artifact.json"
);

const pidProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/pid-controller/pid-controller.project.minimal.json"
);
const pidObjectType = loadWorkspaceJson<Record<string, unknown>>(
  "docs/merge/reference-slices/pid-controller/pid-controller.object-type.json"
);
const pidRuntimeSnapshot = loadWorkspaceJson(
  "packages/materializer-core/tests/fixtures/pid-controller.runtime-pack.snapshot.json"
);
const pidArtifactSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/pid-controller.shipcontroller-artifact.json"
);
const pidAutotuneRuntimeSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/pid-controller-autotune.runtime-pack.json"
);
const pidAutotuneArtifactSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/pid-controller-autotune.shipcontroller-artifact.json"
);

const commBridgeProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/comm-bridge/comm-bridge.project.minimal.json"
);
const commBridgeArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/comm-bridge/comm-bridge.shipcontroller-artifact.json"
);

test("pulse flowmeter reset_totalizer operation survives the full e2e path as metadata-only artifact metadata", () => {
  assertOperationSlice({
    project: pulseFlowmeterProject,
    packId: "pulse-flowmeter-demo-pack",
    generatedAt: "2026-03-28T20:00:00Z",
    runtimeSnapshot: pulseFlowmeterRuntimeSnapshot,
    artifactSnapshot: pulseFlowmeterArtifactSnapshot,
    expectedOperationIds: ["op_flowmeter_1_reset_totalizer"],
    expectedExecutionOperationIds: []
  });
});

test("run hours counter reset operation survives the full e2e path as metadata-only artifact metadata", () => {
  assertOperationSlice({
    project: runHoursProject,
    packId: "run-hours-counter-demo-pack",
    generatedAt: "2026-03-29T18:00:00Z",
    runtimeSnapshot: runHoursRuntimeSnapshot,
    artifactSnapshot: runHoursArtifactSnapshot,
    expectedOperationIds: ["op_run_hours_1_reset_counter"],
    expectedExecutionOperationIds: []
  });
});

test("maintenance counter reset operation survives the full e2e path as metadata-only artifact metadata", () => {
  assertOperationSlice({
    project: maintenanceProject,
    packId: "maintenance-counter-demo-pack",
    generatedAt: "2026-03-29T18:30:00Z",
    runtimeSnapshot: maintenanceRuntimeSnapshot,
    artifactSnapshot: maintenanceArtifactSnapshot,
    expectedOperationIds: [
      "op_maintenance_counter_1_acknowledge_due",
      "op_maintenance_counter_1_reset_interval"
    ],
    expectedExecutionOperationIds: []
  });
});

test("pid hold/release operations survive the full e2e path as metadata-only artifact metadata", () => {
  assertOperationSlice({
    project: pidProject,
    packId: "pid-controller-demo-pack",
    generatedAt: "2026-03-29T12:00:00Z",
    runtimeSnapshot: pidRuntimeSnapshot,
    artifactSnapshot: pidArtifactSnapshot,
    expectedOperationIds: [
      "op_pid_1_hold",
      "op_pid_1_release",
      "op_pid_1_reset_integral"
    ],
    expectedExecutionOperationIds: []
  });
});

test("pid autotune survives the full e2e path as specialized execution metadata", () => {
  const project = createPidAutotuneProject();
  const materialized = materializeProject(project, {
    pack_id: "pid-controller-autotune-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(pidAutotuneRuntimeSnapshot));
  assert.ok(materialized.pack.operations.op_pid_1_autotune);
  assert.equal(materialized.pack.operations.op_pid_1_autotune.kind, "autotune");
  assert.equal(materialized.pack.operations.op_pid_1_autotune.result_contract?.mode, "recommendation");

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(pidAutotuneArtifactSnapshot));
  assert.ok(artifact.artifacts.operations?.some((entry) => (
    entry.id === "op_pid_1_autotune" &&
    entry.specialized_execution === "pid_autotune" &&
    entry.kind === "autotune" &&
    entry.result_mode === "recommendation" &&
    entry.recommendation_lifecycle_mode === "apply_reject"
  )));
  assert.equal(artifact.artifacts.operations?.some((entry) => entry.metadata_only === true && entry.id === "op_pid_1_autotune"), false);
  assert.equal(JSON.stringify(artifact).includes("invoke_supported"), false);
  assert.equal(JSON.stringify(artifact).includes("progress_signals"), false);
});

test("compatibility fails when the target capability profile disables operations spine support", () => {
  const materialized = materializeProject(pidProject, {
    pack_id: "pid-controller-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });
  assert.equal(materialized.ok, true);

  const previousSupportsOperations = esp32CapabilityProfile.supports_operations;
  try {
    esp32CapabilityProfile.supports_operations = false;

    const compatibility = checkEsp32Compatibility(materialized.pack);
    assert.equal(compatibility.ok, false);
    assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.operations.unsupported"));
  } finally {
    esp32CapabilityProfile.supports_operations = previousSupportsOperations;
  }
});

test("compatibility fails when metadata-only operation baseline is given forbidden execution semantics", () => {
  const materialized = materializeProject(pidProject, {
    pack_id: "pid-controller-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });
  assert.equal(materialized.ok, true);

  materialized.pack.operation_runtime_contract = {
    invoke_supported: true,
    cancel_supported: false,
    progress_supported: false,
    result_supported: false,
    audit_required: false
  };

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.operation_runtime.unsupported"));
});

test("compatibility fails deterministically for an unknown operation kind in the target baseline", () => {
  const materialized = materializeProject(runHoursProject, {
    pack_id: "run-hours-counter-demo-pack",
    generated_at: "2026-03-29T18:00:00Z"
  });
  assert.equal(materialized.ok, true);

  materialized.pack.operations.op_run_hours_1_reset_counter.kind = "mystery_reset";

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.operation_kind.unsupported"));
});

test("non-operation comms slice remains stable and does not gain an operations artifact section", () => {
  const materialized = materializeProject(commBridgeProject, {
    pack_id: "comm-bridge-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(materialized.ok, true);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(commBridgeArtifactSnapshot));
  assert.equal(artifact.artifacts.operations, undefined);
});

function assertOperationSlice(options: {
  project: ProjectModel;
  packId: string;
  generatedAt: string;
  runtimeSnapshot: unknown;
  artifactSnapshot: unknown;
  expectedOperationIds: string[];
  expectedExecutionOperationIds: string[];
}): void {
  const materialized = materializeProject(options.project, {
    pack_id: options.packId,
    generated_at: options.generatedAt
  });

  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(options.runtimeSnapshot));
  assert.deepEqual(Object.keys(materialized.pack.operations).sort(), [...options.expectedOperationIds].sort());

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(options.artifactSnapshot));
  assert.deepEqual(
    artifact.artifacts.operations?.map((entry) => entry.id).sort(),
    [...options.expectedOperationIds].sort()
  );
  const expectedExecutionIds = new Set(options.expectedExecutionOperationIds);
  for (const operation of artifact.artifacts.operations ?? []) {
    if (expectedExecutionIds.has(operation.id)) {
      assert.equal(operation.execution_baseline, true);
      assert.equal(operation.metadata_only, undefined);
    } else {
      assert.equal(operation.metadata_only, true);
      assert.equal(operation.execution_baseline, undefined);
    }
  }
  assert.equal(JSON.stringify(artifact).includes("progress_signals"), false);
  assert.equal(JSON.stringify(artifact).includes("safe_when"), false);
  assert.equal(JSON.stringify(artifact).includes("state_hint"), false);
}

function createPidAutotuneProject(): ProjectModel {
  const project = structuredClone(pidProject);
  const pidControllerObjectType = project.definitions.object_types.pid_controller as {
    facets: {
      operations: {
        operations: Record<string, unknown>;
      };
    };
  };
  const autotune = structuredClone(
    ((pidObjectType as {
      facets?: {
        operations?: {
          operations?: Record<string, unknown>;
        };
      };
    }).facets?.operations?.operations?.autotune)
  );

  if (!autotune) {
    throw new Error("PID autotune contract is missing from the canonical object type fixture.");
  }

  pidControllerObjectType.facets.operations.operations.autotune = autotune;
  return project;
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
