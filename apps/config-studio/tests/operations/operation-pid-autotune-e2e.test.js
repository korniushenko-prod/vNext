const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const {
  OPERATION_EXECUTION_BASELINE_KINDS
} = require("../../src/operations/contracts/operation-ui-contracts");
const {
  createReadonlyOperationSurfaceViewModel
} = require("../../src/operations/ui/operation-readonly-surface");
const {
  buildCancelRequest,
  buildInvocationRequest,
  mapCancelResult,
  mapInvocationResult,
  overlayRuntimeSnapshot
} = require("../../src/operations/transport/operation-transport-mappers");
const { loadJson } = require("./fixtures");

const workspaceRoot = path.resolve(__dirname, "../../../../");
const autotuneProject = loadJson("docs/merge/reference-slices/pid-controller/pid-controller-autotune.project.json");
const autotuneRuntimeSnapshot = loadJson("docs/merge/reference-slices/pid-controller/pid-controller-autotune.runtime-pack.snapshot.json");
const autotuneArtifactSnapshot = loadJson("docs/merge/reference-slices/pid-controller/pid-controller-autotune.shipcontroller.artifact.snapshot.json");
const autotuneReadbackSnapshot = loadJson("docs/merge/reference-slices/pid-controller/pid-controller-autotune.readback.snapshot.json");

let workspaceModulesPromise;

function canonicalStringify(value) {
  return JSON.stringify(sortJson(value));
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((accumulator, key) => {
        accumulator[key] = sortJson(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function importWorkspaceModule(relativePath) {
  return import(pathToFileURL(path.join(workspaceRoot, relativePath)).href);
}

async function loadWorkspaceModules() {
  if (!workspaceModulesPromise) {
    workspaceModulesPromise = Promise.all([
      importWorkspaceModule("packages/materializer-core/dist/src/index.js"),
      importWorkspaceModule("targets/esp32-target-adapter/dist/src/index.js"),
      importWorkspaceModule("targets/esp32-target-adapter/dist/src/operations.js")
    ]).then(([materializer, targetAdapter, targetOperations]) => ({
      materializeProject: materializer.materializeProject,
      checkEsp32Compatibility: targetAdapter.checkEsp32Compatibility,
      emitShipControllerConfigArtifact: targetAdapter.emitShipControllerConfigArtifact,
      esp32CapabilityProfile: targetAdapter.esp32CapabilityProfile,
      invokeEsp32Operation: targetAdapter.invokeEsp32Operation,
      cancelEsp32Operation: targetAdapter.cancelEsp32Operation,
      buildSyntheticOperationSnapshots: targetOperations.buildSyntheticOperationSnapshots
    }));
  }

  return workspaceModulesPromise;
}

function buildSurface({ runtimePack, runtimeSnapshot, operationsSupport, selectedOperationId }) {
  return createReadonlyOperationSurfaceViewModel({
    fixture: {
      id: "wave9-pid-autotune-e2e",
      title: "PID autotune e2e",
      description: "Wave 9 dedicated PID autotune reference slice.",
      subject_label: "PID autotune execution",
      runtimePack,
      runtimeSnapshot,
      operationsSupport
    },
    selectedOperationId
  });
}

function makeDispatchEntry({ operationId, action, mapped }) {
  return {
    [`wave9-pid-autotune-e2e::${operationId}`]: {
      operation_id: operationId,
      action,
      intent_state: mapped.intent_state,
      message: mapped.message,
      snapshot_patch: mapped.snapshot_patch
    }
  };
}

function clone(value) {
  return structuredClone(value);
}

async function materializeAutotuneSlice() {
  const modules = await loadWorkspaceModules();
  const materialized = modules.materializeProject(autotuneProject, {
    pack_id: "pid-controller-autotune-demo-pack",
    generated_at: "2026-03-30T12:00:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(autotuneRuntimeSnapshot));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(autotuneArtifactSnapshot));

  return {
    modules,
    runtimePack: materialized.pack,
    artifact,
    operationsSupport: clone(modules.esp32CapabilityProfile.operations_support)
  };
}

test("Wave 9 keeps the frozen generic reset baseline kinds unchanged", () => {
  assert.deepEqual(OPERATION_EXECUTION_BASELINE_KINDS, [
    "reset_totalizer",
    "reset_counter",
    "reset_interval"
  ]);
});

test("PID autotune closes the full end-to-end path into runtime pack, target artifact, running progress, recommendation result, apply, reject, and cancel states", async () => {
  const e2e = await materializeAutotuneSlice();
  const operationId = "op_pid_1_autotune";

  assert.ok(e2e.artifact.artifacts.operations.some((entry) => (
    entry.id === operationId &&
    entry.specialized_execution === "pid_autotune" &&
    entry.recommendation_lifecycle_mode === "apply_reject"
  )));

  const initialSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: {
      operation_snapshots: e2e.modules.buildSyntheticOperationSnapshots(e2e.runtimePack)
    },
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });

  assert.equal(initialSurface.selected_operation.execution_summary.lane, "pid_autotune");
  assert.equal(initialSurface.selected_operation.service_state, "blocked");
  assert.equal(initialSurface.selected_operation.snapshot_summary.state, "idle");

  const invokeRequest = buildInvocationRequest(initialSurface.selected_operation, {
    targetSupport: e2e.operationsSupport,
    confirmationToken: "confirm-autotune",
    inputs: {
      tuning_mode: "guided"
    }
  });
  assert.equal(invokeRequest.ok, false);
  assert.equal(invokeRequest.intent_state, "blocked");

  const completedSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: autotuneReadbackSnapshot,
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });

  assert.equal(completedSurface.selected_operation.service_state, "completed");
  assert.equal(completedSurface.selected_operation.result_summary.recommendation_state, "available");
  assert.equal(completedSurface.selected_operation.snapshot_summary.progress_payload.phase, "settle");

  const rerunRequest = buildInvocationRequest(completedSurface.selected_operation, {
    targetSupport: e2e.operationsSupport,
    confirmationToken: "confirm-autotune",
    inputs: {
      tuning_mode: "guided"
    }
  });
  assert.equal(rerunRequest.ok, true);

  const runningResult = e2e.modules.invokeEsp32Operation(rerunRequest.request);
  const runningMapped = mapInvocationResult(runningResult, { operationId });
  const runningSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: overlayRuntimeSnapshot(
      { operation_snapshots: {} },
      makeDispatchEntry({
        operationId,
        action: "invoke",
        mapped: runningMapped
      })
    ),
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });

  assert.equal(runningSurface.selected_operation.service_state, "running");
  assert.equal(runningSurface.selected_operation.snapshot_summary.progress_payload.phase, "relay_test");

  const cancelRequest = buildCancelRequest(runningSurface.selected_operation, {
    targetSupport: e2e.operationsSupport
  });
  assert.equal(cancelRequest.ok, true);

  const cancelResult = e2e.modules.cancelEsp32Operation(cancelRequest.request);
  const cancelMapped = mapCancelResult(cancelResult, { operationId });
  const cancelledSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: overlayRuntimeSnapshot(
      { operation_snapshots: {} },
      makeDispatchEntry({
        operationId,
        action: "cancel",
        mapped: cancelMapped
      })
    ),
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });

  assert.equal(cancelledSurface.selected_operation.service_state, "cancelled");

  const applyRequest = buildInvocationRequest(completedSurface.selected_operation, {
    action: "apply_recommendation",
    targetSupport: e2e.operationsSupport,
    confirmationToken: "confirm-apply",
    inputs: {
      recommendation_id: "rec-001"
    }
  });
  assert.equal(applyRequest.ok, true);

  const applyResult = e2e.modules.invokeEsp32Operation(applyRequest.request);
  const applyMapped = mapInvocationResult(applyResult, { operationId });
  const appliedSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: overlayRuntimeSnapshot(
      clone(autotuneReadbackSnapshot),
      makeDispatchEntry({
        operationId,
        action: "apply_recommendation",
        mapped: applyMapped
      })
    ),
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });

  assert.equal(appliedSurface.selected_operation.service_state, "completed");
  assert.equal(appliedSurface.selected_operation.result_summary.recommendation_state, "applied");

  const rejectRequest = buildInvocationRequest(completedSurface.selected_operation, {
    action: "reject_recommendation",
    targetSupport: e2e.operationsSupport,
    confirmationToken: "confirm-reject"
  });
  assert.equal(rejectRequest.ok, true);

  const rejectResult = e2e.modules.invokeEsp32Operation(rejectRequest.request);
  const rejectMapped = mapInvocationResult(rejectResult, { operationId });
  const rejectedSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: overlayRuntimeSnapshot(
      clone(autotuneReadbackSnapshot),
      makeDispatchEntry({
        operationId,
        action: "reject_recommendation",
        mapped: rejectMapped
      })
    ),
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });

  assert.equal(rejectedSurface.selected_operation.service_state, "rejected");
  assert.equal(rejectedSurface.selected_operation.snapshot_summary.recommendation_state, "rejected");
});

test("PID autotune e2e slice keeps unsupported_by_target, missing confirmation, stale/no snapshot, and result payload mismatch visible without fake fallbacks", async () => {
  const e2e = await materializeAutotuneSlice();
  const operationId = "op_pid_1_autotune";

  const unsupportedSupport = {
    ...e2e.operationsSupport,
    enabled: false,
    invoke: false,
    cancel: false
  };
  const unsupportedSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: { operation_snapshots: {} },
    operationsSupport: unsupportedSupport,
    selectedOperationId: operationId
  });
  assert.equal(unsupportedSurface.selected_operation.service_state, "unsupported_by_target");

  const missingSnapshotSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: { operation_snapshots: {} },
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });
  assert.equal(missingSnapshotSurface.selected_operation.snapshot_summary.label, "no_snapshot");
  assert.equal(missingSnapshotSurface.selected_operation.service_state, "blocked");

  const confirmationSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: autotuneReadbackSnapshot,
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });
  const missingConfirmation = buildInvocationRequest(confirmationSurface.selected_operation, {
    targetSupport: e2e.operationsSupport
  });
  assert.equal(missingConfirmation.ok, false);
  assert.equal(missingConfirmation.intent_state, "confirmation_required");

  const staleSnapshot = clone(autotuneReadbackSnapshot);
  staleSnapshot.operation_snapshots[operationId].state = "mystery_state";
  const staleSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: staleSnapshot,
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });
  assert.equal(staleSurface.selected_operation.lifecycle_state, "stale");
  assert.ok(staleSurface.selected_operation.diagnostics.some((entry) => entry.code === "unknown_state"));

  const mismatchedSnapshot = clone(autotuneReadbackSnapshot);
  delete mismatchedSnapshot.operation_snapshots[operationId].result.recommended_td;
  const mismatchedSurface = buildSurface({
    runtimePack: e2e.runtimePack,
    runtimeSnapshot: mismatchedSnapshot,
    operationsSupport: e2e.operationsSupport,
    selectedOperationId: operationId
  });
  assert.ok(mismatchedSurface.selected_operation.diagnostics.some((entry) => entry.code === "result_payload_mismatch"));
  assert.equal(
    mismatchedSurface.selected_operation.result_summary.fields.find((field) => field.id === "recommended_td")?.value,
    undefined
  );
});
