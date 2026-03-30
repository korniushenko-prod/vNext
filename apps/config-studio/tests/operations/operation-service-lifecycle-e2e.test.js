const test = require("node:test");
const assert = require("node:assert/strict");

const {
  createReadonlyOperationSurfaceViewModel
} = require("../../src/operations/ui/operation-readonly-surface");
const {
  buildInvocationRequest,
  mapInvocationResult,
  overlayRuntimeSnapshot
} = require("../../src/operations/transport/operation-transport-mappers");
const {
  createSyntheticOperationTransport,
  getTransportFixture
} = require("../../src/operations/transport/operation-transport-fixtures");
const {
  readonlyFlowmeterFixture,
  readonlyMaintenanceFixture,
  readonlyPidFixture,
  readonlyRunHoursFixture,
  readonlyUnsupportedFixture
} = require("./fixtures");

function clone(value) {
  return structuredClone(value);
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

function buildSurface({ fixture, selectedOperationId, dispatchRegistry = {}, operationsSupport }) {
  const runtimeSnapshot = overlayRuntimeSnapshot(fixture.runtimeSnapshot, dispatchRegistry);
  return createReadonlyOperationSurfaceViewModel({
    fixture: {
      ...fixture,
      runtimeSnapshot,
      operationsSupport: operationsSupport ?? fixture.operationsSupport
    },
    selectedOperationId
  });
}

function completedPatch(result = {}) {
  return {
    intent_state: "pending_dispatch",
    message: "Synthetic lifecycle advanced to completed.",
    snapshot_patch: {
      state: "completed",
      result
    }
  };
}

function runningPatch(progress = 50, message = "Synthetic lifecycle running.") {
  return {
    intent_state: "pending_dispatch",
    message,
    snapshot_patch: {
      state: "running",
      progress,
      message
    }
  };
}

function cancelledPatch(message = "Synthetic lifecycle cancelled.") {
  return {
    intent_state: "pending_dispatch",
    message,
    snapshot_patch: {
      state: "cancelled",
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

test("PulseFlowmeter lifecycle closes confirmation_required -> invoke -> pending_invoke -> completed", async () => {
  const fixture = clone(readonlyFlowmeterFixture);
  fixture.runtimeSnapshot = { operation_snapshots: {} };
  const transportFixture = getTransportFixture(fixture.id);

  const initial = buildSurface({
    fixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer",
    operationsSupport: transportFixture.operations_support
  });
  assert.equal(initial.selected_operation.availability.blocked, false);
  assert.equal(initial.selected_operation.confirmation.required, true);
  assert.equal(initial.selected_operation.service_state, "no_snapshot");
  assert.equal(initial.selected_operation.snapshot_summary.label, "no_snapshot");

  const request = buildInvocationRequest(initial.selected_operation, {
    targetSupport: transportFixture.operations_support,
    confirmationToken: "confirm-flowmeter"
  });
  assert.equal(request.ok, true);

  const transport = createSyntheticOperationTransport();
  const raw = await transport.invokeOperation(request.request, { fixture_id: fixture.id });
  const mapped = mapInvocationResult(raw, { operationId: initial.selected_operation.id });
  const pending = buildSurface({
    fixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer",
    operationsSupport: transportFixture.operations_support,
    dispatchRegistry: makeDispatchEntry({
      fixtureId: fixture.id,
      operationId: initial.selected_operation.id,
      action: "invoke",
      mapped
    })
  });
  assert.equal(pending.selected_operation.service_state, "pending_invoke");

  const completed = buildSurface({
    fixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer",
    operationsSupport: transportFixture.operations_support,
    dispatchRegistry: makeDispatchEntry({
      fixtureId: fixture.id,
      operationId: initial.selected_operation.id,
      action: "invoke",
      mapped: completedPatch({
        completed: true,
        total_volume: 0
      })
    })
  });
  assert.equal(completed.selected_operation.service_state, "completed");
  assert.equal(completed.selected_operation.result_summary.fields.find((field) => field.id === "total_volume").value, 0);
});

test("RunHoursCounter lifecycle closes available -> invoke -> completed with frozen reset_counter kind", async () => {
  const fixture = clone(readonlyRunHoursFixture);
  fixture.runtimeSnapshot = { operation_snapshots: {} };
  const transportFixture = getTransportFixture(fixture.id);

  const initial = buildSurface({
    fixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    operationsSupport: transportFixture.operations_support
  });
  assert.equal(initial.selected_operation.kind, "reset_counter");
  assert.equal(initial.selected_operation.service_state, "no_snapshot");

  const request = buildInvocationRequest(initial.selected_operation, {
    targetSupport: transportFixture.operations_support,
    confirmationToken: "confirm-runhours"
  });
  assert.equal(request.ok, true);

  const running = buildSurface({
    fixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    operationsSupport: transportFixture.operations_support,
    dispatchRegistry: makeDispatchEntry({
      fixtureId: fixture.id,
      operationId: initial.selected_operation.id,
      action: "invoke",
      mapped: runningPatch(35, "Run-hours reset in progress.")
    })
  });
  assert.equal(running.selected_operation.service_state, "running");

  const completed = buildSurface({
    fixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    operationsSupport: transportFixture.operations_support,
    dispatchRegistry: makeDispatchEntry({
      fixtureId: fixture.id,
      operationId: initial.selected_operation.id,
      action: "invoke",
      mapped: completedPatch({
        completed: true,
        total_seconds: 0
      })
    })
  });
  assert.equal(completed.selected_operation.service_state, "completed");
});

test("MaintenanceCounter lifecycle closes confirmation_required -> cancelled", () => {
  const fixture = clone(readonlyMaintenanceFixture);
  fixture.runtimeSnapshot = { operation_snapshots: {} };
  const transportFixture = getTransportFixture(fixture.id);

  const initial = buildSurface({
    fixture,
    selectedOperationId: "op_maintenance_counter_1_reset_interval",
    operationsSupport: transportFixture.operations_support
  });
  assert.equal(initial.selected_operation.confirmation.required, true);
  assert.equal(initial.selected_operation.service_state, "no_snapshot");
  assert.equal(initial.selected_operation.snapshot_summary.label, "no_snapshot");

  const cancelled = buildSurface({
    fixture,
    selectedOperationId: "op_maintenance_counter_1_reset_interval",
    operationsSupport: transportFixture.operations_support,
    dispatchRegistry: makeDispatchEntry({
      fixtureId: fixture.id,
      operationId: initial.selected_operation.id,
      action: "invoke",
      mapped: cancelledPatch("Maintenance reset cancelled by service layer.")
    })
  });
  assert.equal(cancelled.selected_operation.service_state, "cancelled");
});

test("RunHoursCounter lifecycle can render failed state without creating a runnable false-positive", () => {
  const fixture = clone(readonlyRunHoursFixture);
  fixture.runtimeSnapshot = { operation_snapshots: {} };
  const transportFixture = getTransportFixture(fixture.id);

  const failed = buildSurface({
    fixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    operationsSupport: transportFixture.operations_support,
    dispatchRegistry: makeDispatchEntry({
      fixtureId: fixture.id,
      operationId: "op_run_hours_1_reset_counter",
      action: "invoke",
      mapped: failedPatch("Run-hours reset rejected by synthetic service.")
    })
  });

  assert.equal(failed.selected_operation.service_state, "failed");
});

test("PID hold/release remain visible but non-runnable in unsupported execution lane", () => {
  const fixture = clone(readonlyPidFixture);
  fixture.runtimeSnapshot = { operation_snapshots: {} };
  const transportFixture = getTransportFixture(fixture.id);

  const initial = buildSurface({
    fixture,
    selectedOperationId: "op_pid_1_hold",
    operationsSupport: transportFixture.operations_support
  });
  const hold = initial.operations.find((item) => item.id === "op_pid_1_hold");
  const release = initial.operations.find((item) => item.id === "op_pid_1_release");
  assert.equal(hold.service_state, "metadata_only");
  assert.equal(release.service_state, "metadata_only");
  assert.equal(initial.selected_operation.execution_summary.lane, "metadata_only");
});

test("PID autotune enters the specialized service lane and keeps recommendation apply/reject available", () => {
  const fixture = clone(readonlyPidFixture);
  const transportFixture = getTransportFixture(fixture.id);

  const initial = buildSurface({
    fixture,
    selectedOperationId: "op_pid_1_autotune",
    operationsSupport: transportFixture.operations_support
  });
  assert.equal(initial.selected_operation.metadata_only, false);
  assert.equal(initial.selected_operation.confirmation.required, true);
  assert.equal(initial.selected_operation.service_state, "completed");
  assert.equal(initial.selected_operation.execution_summary.lane, "pid_autotune");

  const request = buildInvocationRequest(initial.selected_operation, {
    targetSupport: transportFixture.operations_support,
    confirmationToken: "confirm-autotune",
    inputs: transportFixture.default_inputs.op_pid_1_autotune
  });
  assert.equal(request.ok, true);

  const applyRequest = buildInvocationRequest(initial.selected_operation, {
    action: "apply_recommendation",
    targetSupport: transportFixture.operations_support,
    confirmationToken: "confirm-apply"
  });
  const rejectRequest = buildInvocationRequest(initial.selected_operation, {
    action: "reject_recommendation",
    targetSupport: transportFixture.operations_support,
    confirmationToken: "confirm-reject"
  });

  assert.equal(applyRequest.ok, true);
  assert.equal(rejectRequest.ok, true);
});

test("missing confirmation token keeps lifecycle in confirmation_required gate", () => {
  const fixture = clone(readonlyFlowmeterFixture);
  fixture.runtimeSnapshot = { operation_snapshots: {} };
  const transportFixture = getTransportFixture(fixture.id);

  const surface = buildSurface({
    fixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer",
    operationsSupport: transportFixture.operations_support
  });
  const request = buildInvocationRequest(surface.selected_operation, {
    targetSupport: transportFixture.operations_support
  });

  assert.equal(request.ok, false);
  assert.equal(request.intent_state, "confirmation_required");
});

test("unsupported progress mode degrades safely in lifecycle surface", () => {
  const fixture = clone(readonlyPidFixture);
  fixture.runtimePack.operations.op_pid_1_hold.progress_mode = "device_magic";

  const surface = buildSurface({
    fixture,
    selectedOperationId: "op_pid_1_hold",
    operationsSupport: getTransportFixture(fixture.id).operations_support
  });

  assert.equal(surface.selected_operation.progress.mode, "none");
  assert.ok(surface.selected_operation.diagnostics.some((entry) => entry.code === "unsupported_progress_mode"));
});

test("transport result error mapping stays deterministic", () => {
  const mapped = mapInvocationResult({
    accepted: false,
    state: "rejected",
    message: "Transport rejected the request."
  }, {
    operationId: "op_pid_1_autotune"
  });

  assert.equal(mapped.ok, false);
  assert.equal(mapped.intent_state, "dispatch_failed");
});

test("unsupported target, no snapshot, and stale snapshot handling remain visible", () => {
  const unsupported = buildSurface({
    fixture: clone(readonlyUnsupportedFixture),
    selectedOperationId: "op_remote_point_1_self_test",
    operationsSupport: getTransportFixture("operations-readonly-unsupported").operations_support
  });
  assert.equal(unsupported.selected_operation.service_state, "unsupported_by_target");

  const noSnapshotFixture = clone(readonlyRunHoursFixture);
  noSnapshotFixture.runtimeSnapshot = { operation_snapshots: {} };
  const noSnapshot = buildSurface({
    fixture: noSnapshotFixture,
    selectedOperationId: "op_run_hours_1_reset_counter",
    operationsSupport: noSnapshotFixture.operationsSupport
  });
  assert.equal(noSnapshot.selected_operation.snapshot_summary.label, "no_snapshot");
  assert.equal(noSnapshot.selected_operation.service_state, "no_snapshot");

  const staleFixture = clone(readonlyPidFixture);
  staleFixture.runtimeSnapshot = {
    operation_snapshots: {
      op_pid_1_hold: {
        operation_id: "op_pid_1_hold",
        state: "mystery_state"
      }
    }
  };
  const stale = buildSurface({
    fixture: staleFixture,
    selectedOperationId: "op_pid_1_hold",
    operationsSupport: getTransportFixture(staleFixture.id).operations_support
  });
  assert.equal(stale.selected_operation.lifecycle_state, "stale");
  assert.ok(stale.selected_operation.diagnostics.some((entry) => entry.code === "unknown_state"));
});
