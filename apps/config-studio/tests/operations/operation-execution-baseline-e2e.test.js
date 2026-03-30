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
  buildInvocationRequest,
  mapInvocationResult,
  overlayRuntimeSnapshot
} = require("../../src/operations/transport/operation-transport-mappers");
const {
  loadJson,
  pidAutotunePack
} = require("./fixtures");

const workspaceRoot = path.resolve(__dirname, "../../../../");

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

function makeDispatchEntry({ fixtureId, operationId, action, mapped }) {
  return {
    [`${fixtureId}::${operationId}`]: {
      operation_id: operationId,
      action,
      intent_state: mapped.intent_state,
      message: mapped.message,
      snapshot_patch: mapped.snapshot_patch
    }
  };
}

function runningPatch(message = "Synthetic lifecycle running.") {
  return {
    intent_state: "pending_dispatch",
    message,
    snapshot_patch: {
      state: "running",
      progress: 45,
      message
    }
  };
}

function failedPatch(message = "Synthetic lifecycle failed.") {
  return {
    intent_state: "pending_dispatch",
    message,
    snapshot_patch: {
      state: "failed",
      message
    }
  };
}

function buildSurface({ fixture, selectedOperationId, dispatchRegistry = {}, operationsSupport }) {
  return createReadonlyOperationSurfaceViewModel({
    fixture: {
      ...fixture,
      operationsSupport: operationsSupport ?? fixture.operationsSupport,
      runtimeSnapshot: overlayRuntimeSnapshot(
        fixture.runtimeSnapshot ?? { operation_snapshots: {} },
        dispatchRegistry
      )
    },
    selectedOperationId
  });
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
      esp32ExecutionBaselineOperationRuntimeContract: targetOperations.esp32ExecutionBaselineOperationRuntimeContract
    }));
  }

  return workspaceModulesPromise;
}

function importWorkspaceModule(relativePath) {
  return import(pathToFileURL(path.join(workspaceRoot, relativePath)).href);
}

function enableExecutionBaseline(pack, runtimeContract) {
  const baselinePack = structuredClone(pack);
  baselinePack.operation_runtime_contract = structuredClone(runtimeContract);

  for (const operation of Object.values(baselinePack.operations ?? {})) {
    if (!OPERATION_EXECUTION_BASELINE_KINDS.includes(operation.kind)) {
      continue;
    }

    operation.confirmation_policy = "required";
    operation.cancel_mode = "not_cancellable";
    operation.progress_mode = "none";
    delete operation.progress_signals;

    if (operation.result_contract?.mode === "recommendation") {
      operation.result_contract.mode = "applyable_result";
    }
  }

  return baselinePack;
}

async function createExecutionFixture(options) {
  const modules = await loadWorkspaceModules();
  const materialized = modules.materializeProject(loadJson(options.projectPath), {
    pack_id: options.packId,
    generated_at: options.generatedAt
  });

  assert.equal(materialized.ok, true);

  const runtimePack = enableExecutionBaseline(
    materialized.pack,
    modules.esp32ExecutionBaselineOperationRuntimeContract
  );

  const compatibility = modules.checkEsp32Compatibility(runtimePack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(runtimePack);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(loadJson(options.artifactPath))
  );

  return {
    fixture: {
      id: options.fixtureId,
      title: options.title,
      description: options.description,
      subject_label: options.subjectLabel,
      runtimePack,
      runtimeSnapshot: { operation_snapshots: {} },
      operationsSupport: structuredClone(modules.esp32CapabilityProfile.operations_support)
    },
    artifact,
    invokeEsp32Operation: modules.invokeEsp32Operation,
    operationsSupport: structuredClone(modules.esp32CapabilityProfile.operations_support)
  };
}

test("execution baseline kinds stay frozen to the three generic reset operations", () => {
  assert.deepEqual(OPERATION_EXECUTION_BASELINE_KINDS, [
    "reset_totalizer",
    "reset_counter",
    "reset_interval"
  ]);
});

test("PulseFlowmeter reset_totalizer closes the full baseline path into the execution surface", async () => {
  const e2e = await createExecutionFixture({
    projectPath: "targets/esp32-target-adapter/tests/fixtures/pulse-flowmeter.project.minimal.json",
    artifactPath: "targets/esp32-target-adapter/tests/fixtures/pulse-flowmeter-execution-baseline.shipcontroller-artifact.json",
    fixtureId: "operations-e2e-flowmeter",
    title: "PulseFlowmeter + reset_totalizer",
    description: "Canonical Wave 8 execution-baseline slice for flowmeter reset.",
    subjectLabel: "Flowmeter execution baseline",
    packId: "pulse-flowmeter-demo-pack",
    generatedAt: "2026-03-30T20:00:00Z"
  });
  const surfaceFixture = structuredClone(e2e.fixture);
  surfaceFixture.runtimePack.operations.op_flowmeter_1_reset_totalizer.availability = {
    mode: "always",
    required_states: []
  };

  const surface = buildSurface({
    fixture: surfaceFixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer"
  });

  assert.equal(surface.selected_operation.service_state, "no_snapshot");
  assert.equal(surface.selected_operation.execution_summary.lane, "baseline_runnable");
  assert.equal(surface.selected_operation.execution_summary.runnable, true);
  assert.ok(e2e.artifact.artifacts.operations.some((entry) => (
    entry.id === "op_flowmeter_1_reset_totalizer" &&
    entry.execution_baseline === true &&
    entry.confirmation_token_validation === "when_required"
  )));

  const request = buildInvocationRequest(surface.selected_operation, {
    targetSupport: e2e.operationsSupport,
    confirmationToken: "confirm-flowmeter"
  });
  assert.equal(request.ok, true);

  const rawResult = e2e.invokeEsp32Operation(request.request);
  const mapped = mapInvocationResult(rawResult, {
    operationId: surface.selected_operation.id
  });
  const completed = buildSurface({
    fixture: surfaceFixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer",
    dispatchRegistry: makeDispatchEntry({
      fixtureId: surfaceFixture.id,
      operationId: "op_flowmeter_1_reset_totalizer",
      action: "invoke",
      mapped
    })
  });

  assert.equal(completed.selected_operation.service_state, "completed");
});

test("RunHoursCounter reset_counter closes the full baseline path into the execution surface", async () => {
  const e2e = await createExecutionFixture({
    projectPath: "docs/merge/reference-slices/run-hours-counter/run-hours-counter.project.minimal.json",
    artifactPath: "targets/esp32-target-adapter/tests/fixtures/run-hours-execution-baseline.shipcontroller-artifact.json",
    fixtureId: "operations-e2e-runhours",
    title: "RunHoursCounter + reset_counter",
    description: "Canonical Wave 8 execution-baseline slice for run-hours reset.",
    subjectLabel: "Run-hours execution baseline",
    packId: "run-hours-counter-demo-pack",
    generatedAt: "2026-03-30T20:10:00Z"
  });

  const surface = buildSurface({
    fixture: e2e.fixture,
    selectedOperationId: "op_run_hours_1_reset_counter"
  });

  assert.equal(surface.selected_operation.kind, "reset_counter");
  assert.equal(surface.selected_operation.service_state, "blocked");
  assert.equal(surface.selected_operation.execution_summary.runnable, true);
  assert.ok(e2e.artifact.artifacts.operations.some((entry) => (
    entry.id === "op_run_hours_1_reset_counter" &&
    entry.execution_baseline === true
  )));
});

test("MaintenanceCounter reset_interval closes the full baseline path while acknowledge_due stays metadata-only", async () => {
  const e2e = await createExecutionFixture({
    projectPath: "docs/merge/reference-slices/maintenance-counter/maintenance-counter.project.minimal.json",
    artifactPath: "targets/esp32-target-adapter/tests/fixtures/maintenance-execution-baseline.shipcontroller-artifact.json",
    fixtureId: "operations-e2e-maintenance",
    title: "MaintenanceCounter + reset_interval",
    description: "Canonical Wave 8 execution-baseline slice for maintenance reset.",
    subjectLabel: "Maintenance execution baseline",
    packId: "maintenance-counter-demo-pack",
    generatedAt: "2026-03-30T20:20:00Z"
  });

  const resetSurface = buildSurface({
    fixture: e2e.fixture,
    selectedOperationId: "op_maintenance_counter_1_reset_interval"
  });
  const acknowledgeSurface = buildSurface({
    fixture: e2e.fixture,
    selectedOperationId: "op_maintenance_counter_1_acknowledge_due"
  });

  assert.equal(resetSurface.selected_operation.service_state, "blocked");
  assert.equal(resetSurface.selected_operation.execution_summary.runnable, true);
  assert.equal(acknowledgeSurface.selected_operation.service_state, "metadata_only");
  assert.equal(acknowledgeSurface.selected_operation.metadata_only, true);
  assert.ok(e2e.artifact.artifacts.operations.some((entry) => (
    entry.id === "op_maintenance_counter_1_reset_interval" &&
    entry.execution_baseline === true
  )));
});

test("combined execution baseline demo keeps no_snapshot, pending, running, completed, failed, and unsupported lanes visible on one canonical surface", async () => {
  const e2e = await createExecutionFixture({
    projectPath: "docs/merge/reference-slices/run-hours-to-maintenance/run-hours-to-maintenance.project.json",
    artifactPath: "targets/esp32-target-adapter/tests/fixtures/combined-execution-baseline.shipcontroller-artifact.json",
    fixtureId: "operations-e2e-combined",
    title: "Combined baseline execution demo",
    description: "Wave 8 combined demo over run-hours and maintenance reset operations.",
    subjectLabel: "Combined execution baseline",
    packId: "run-hours-to-maintenance-demo-pack",
    generatedAt: "2026-03-30T20:30:00Z"
  });
  const combinedFixture = structuredClone(e2e.fixture);
  combinedFixture.runtimePack.operations.op_run_hours_1_reset_counter.availability = {
    mode: "always",
    required_states: []
  };
  combinedFixture.runtimePack.operations.op_maintenance_counter_1_reset_interval.availability = {
    mode: "always",
    required_states: []
  };

  const initial = buildSurface({
    fixture: combinedFixture,
    selectedOperationId: "op_run_hours_1_reset_counter"
  });
  assert.equal(initial.selected_operation.service_state, "no_snapshot");

  const pending = buildSurface({
    fixture: combinedFixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    dispatchRegistry: makeDispatchEntry({
      fixtureId: combinedFixture.id,
      operationId: "op_run_hours_1_reset_counter",
      action: "invoke",
      mapped: {
        intent_state: "pending_dispatch",
        message: "Synthetic lifecycle accepted.",
        snapshot_patch: {
          state: "accepted",
          message: "Synthetic lifecycle accepted."
        }
      }
    })
  });
  assert.equal(pending.selected_operation.service_state, "pending_invoke");

  const running = buildSurface({
    fixture: combinedFixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    dispatchRegistry: makeDispatchEntry({
      fixtureId: combinedFixture.id,
      operationId: "op_run_hours_1_reset_counter",
      action: "invoke",
      mapped: runningPatch("Synthetic run-hours reset is running.")
    })
  });
  assert.equal(running.selected_operation.service_state, "running");

  const request = buildInvocationRequest(running.selected_operation, {
    targetSupport: e2e.operationsSupport,
    confirmationToken: "confirm-runhours"
  });
  assert.equal(request.ok, false);

  const freshRequest = buildInvocationRequest(initial.selected_operation, {
    targetSupport: e2e.operationsSupport,
    confirmationToken: "confirm-runhours"
  });
  assert.equal(freshRequest.ok, true);

  const completedResult = e2e.invokeEsp32Operation(freshRequest.request);
  const completed = buildSurface({
    fixture: combinedFixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    dispatchRegistry: makeDispatchEntry({
      fixtureId: combinedFixture.id,
      operationId: "op_run_hours_1_reset_counter",
      action: "invoke",
      mapped: mapInvocationResult(completedResult, {
        operationId: "op_run_hours_1_reset_counter"
      })
    })
  });
  assert.equal(completed.selected_operation.service_state, "completed");

  const failed = buildSurface({
    fixture: combinedFixture,
    selectedOperationId: "op_maintenance_counter_1_reset_interval",
    dispatchRegistry: makeDispatchEntry({
      fixtureId: combinedFixture.id,
      operationId: "op_maintenance_counter_1_reset_interval",
      action: "invoke",
      mapped: failedPatch("Synthetic maintenance reset failed.")
    })
  });
  assert.equal(failed.selected_operation.service_state, "failed");

  const unsupported = buildSurface({
    fixture: combinedFixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    operationsSupport: {
      ...e2e.operationsSupport,
      enabled: false,
      invoke: false
    }
  });
  assert.equal(unsupported.selected_operation.service_state, "unsupported_by_target");
});

test("missing confirmation token blocks a confirmation-required baseline operation on the full e2e path", async () => {
  const e2e = await createExecutionFixture({
    projectPath: "targets/esp32-target-adapter/tests/fixtures/pulse-flowmeter.project.minimal.json",
    artifactPath: "targets/esp32-target-adapter/tests/fixtures/pulse-flowmeter-execution-baseline.shipcontroller-artifact.json",
    fixtureId: "operations-e2e-flowmeter-negative",
    title: "PulseFlowmeter + reset_totalizer",
    description: "Negative confirmation gate coverage for the execution baseline.",
    subjectLabel: "Flowmeter execution baseline",
    packId: "pulse-flowmeter-demo-pack",
    generatedAt: "2026-03-30T20:40:00Z"
  });
  const surfaceFixture = structuredClone(e2e.fixture);
  surfaceFixture.runtimePack.operations.op_flowmeter_1_reset_totalizer.availability = {
    mode: "always",
    required_states: []
  };

  const surface = buildSurface({
    fixture: surfaceFixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer"
  });

  const request = buildInvocationRequest(surface.selected_operation, {
    targetSupport: e2e.operationsSupport
  });
  assert.equal(request.ok, false);
  assert.equal(request.intent_state, "confirmation_required");
});

test("unsupported_by_target remains visible for a frozen baseline kind when target execution support is blocked", async () => {
  const e2e = await createExecutionFixture({
    projectPath: "docs/merge/reference-slices/run-hours-counter/run-hours-counter.project.minimal.json",
    artifactPath: "targets/esp32-target-adapter/tests/fixtures/run-hours-execution-baseline.shipcontroller-artifact.json",
    fixtureId: "operations-e2e-runhours-unsupported",
    title: "RunHoursCounter + reset_counter",
    description: "Negative unsupported-by-target coverage for the execution baseline.",
    subjectLabel: "Run-hours execution baseline",
    packId: "run-hours-counter-demo-pack",
    generatedAt: "2026-03-30T20:50:00Z"
  });

  const blockedSupport = {
    ...e2e.operationsSupport,
    enabled: false,
    invoke: false
  };
  const surface = buildSurface({
    fixture: e2e.fixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    operationsSupport: blockedSupport
  });
  const request = buildInvocationRequest(surface.selected_operation, {
    targetSupport: blockedSupport,
    confirmationToken: "confirm-runhours"
  });

  assert.equal(surface.selected_operation.service_state, "unsupported_by_target");
  assert.equal(request.ok, false);
  assert.equal(request.intent_state, "unsupported_by_target");
});

test("PID autotune uses the specialized execution lane on top of the frozen execution transport layer", async () => {
  const { esp32CapabilityProfile } = await loadWorkspaceModules();
  const surface = buildSurface({
    fixture: {
      id: "operations-e2e-pid-autotune",
      title: "PID + autotune",
      description: "Specialized PID autotune lane rides on top of the generic execution transport boundary.",
      subject_label: "PID execution boundary",
      runtimePack: structuredClone(pidAutotunePack),
      runtimeSnapshot: { operation_snapshots: {} },
      operationsSupport: structuredClone(esp32CapabilityProfile.operations_support)
    },
    selectedOperationId: "op_pid_1_autotune"
  });

  const request = buildInvocationRequest(surface.selected_operation, {
    targetSupport: structuredClone(esp32CapabilityProfile.operations_support),
    confirmationToken: "confirm-autotune",
    inputs: {
      tuning_mode: "guided"
    }
  });

  assert.equal(surface.selected_operation.metadata_only, false);
  assert.equal(surface.selected_operation.service_state, "blocked");
  assert.equal(surface.selected_operation.execution_summary.lane, "pid_autotune");
  assert.equal(request.ok, false);
  assert.equal(request.intent_state, "blocked");
});
