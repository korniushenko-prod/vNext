const test = require("node:test");
const assert = require("node:assert/strict");

const {
  READONLY_FIXTURE_IDS
} = require("../../src/operations/fixtures/operation-readonly-fixtures");
const {
  createReadonlyOperationSurfaceViewModel,
  renderReadonlyOperationCardMarkup,
  renderReadonlyOperationDetailsMarkup
} = require("../../src/operations/ui/operation-readonly-surface");
const {
  readonlyFlowmeterFixture,
  readonlyMaintenanceFixture,
  readonlyPidFixture,
  readonlyRunHoursFixture,
  readonlyUnsupportedFixture
} = require("./fixtures");

test("readonly surface fixtures expose the required five canonical examples", () => {
  assert.deepEqual(READONLY_FIXTURE_IDS, [
    "operations-readonly-flowmeter",
    "operations-readonly-runhours",
    "operations-readonly-maintenance",
    "operations-readonly-pid",
    "operations-readonly-unsupported"
  ]);
});

test("list renders canonical execution baseline cards without inline invoke or cancel controls", () => {
  const surface = createReadonlyOperationSurfaceViewModel({
    fixture: readonlyFlowmeterFixture,
    selectedOperationId: "op_flowmeter_1_reset_totalizer"
  });

  const markup = renderReadonlyOperationCardMarkup(surface.operations[0]);
  assert.match(markup, /Reset Totalizer/);
  assert.match(markup, /Completed/);
  assert.match(markup, /Execution baseline/);
  assert.doesNotMatch(markup, /<button/i);
  assert.doesNotMatch(markup, /Invoke|Cancel/);
});

test("pid autotune shows specialized execution details with recommendation preview", () => {
  const surface = createReadonlyOperationSurfaceViewModel({
    fixture: readonlyPidFixture,
    selectedOperationId: "op_pid_1_autotune"
  });

  const autotune = surface.selected_operation;
  assert.equal(autotune.kind, "autotune");
  assert.equal(autotune.metadata_only, false);
  assert.equal(autotune.confirmation.required, true);
  assert.equal(autotune.service_state, "completed");
  assert.equal(autotune.execution_summary.lane, "pid_autotune");
  assert.equal(autotune.autotune_summary.recommendation_state, "available");
  assert.equal(autotune.autotune_summary.summary_text, "Stable relay test complete.");
});

test("unsupported target state renders a degraded note instead of hiding the operation", () => {
  const surface = createReadonlyOperationSurfaceViewModel({
    fixture: readonlyUnsupportedFixture,
    selectedOperationId: "op_remote_point_1_self_test"
  });

  assert.equal(surface.operations[0].diagnostics[0].code, "unsupported_by_target");
  assert.equal(surface.selected_operation.target_support.enabled, false);

  const markup = renderReadonlyOperationDetailsMarkup(surface);
  assert.match(markup, /Unsupported by target/);
});

test("no snapshot present remains visible as a read-only degraded state", () => {
  const surface = createReadonlyOperationSurfaceViewModel({
    fixture: readonlyRunHoursFixture,
    selectedOperationId: "op_run_hours_1_reset_counter"
  });

  assert.equal(surface.selected_operation.lifecycle_state, "confirmation_required");
  assert.equal(surface.selected_operation.service_state, "no_snapshot");
  assert.ok(surface.selected_operation.diagnostics.some((entry) => entry.code === "no_snapshot"));
});

test("maintenance fixture carries both failed and completed service semantics through one canonical surface", () => {
  const surface = createReadonlyOperationSurfaceViewModel({
    fixture: readonlyMaintenanceFixture,
    selectedOperationId: "op_maintenance_counter_1_reset_interval"
  });

  const statuses = surface.operations.map((item) => item.lifecycle_state);
  assert.ok(statuses.includes("failed"));
  assert.ok(statuses.includes("completed"));
  assert.equal(surface.selected_operation.execution_summary.lane, "baseline_runnable");
});
