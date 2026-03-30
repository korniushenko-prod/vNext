const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mapOperationDetails
} = require("../../src/operations/contracts/operation-ui-mappers");
const {
  buildCancelRequest,
  buildInvocationRequest,
  mapCancelResult,
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
  readonlyPidFixture
} = require("./fixtures");

test("buildInvocationRequest produces canonical invoke payload", () => {
  const flowmeter = mapOperationDetails({
    runtimePack: readonlyFlowmeterFixture.runtimePack,
    operationId: "op_flowmeter_1_reset_totalizer",
    runtimeSnapshot: readonlyFlowmeterFixture.runtimeSnapshot,
    operationsSupport: readonlyFlowmeterFixture.operationsSupport
  });

  const built = buildInvocationRequest(flowmeter, {
    targetSupport: getTransportFixture("operations-readonly-flowmeter").operations_support,
    confirmationToken: "confirm-123"
  });

  assert.equal(built.ok, true);
  assert.deepEqual(built.request, {
    operation_id: "op_flowmeter_1_reset_totalizer",
    confirmation_token: "confirm-123"
  });
});

test("buildInvocationRequest blocks when confirmation is missing", () => {
  const maintenance = mapOperationDetails({
    runtimePack: readonlyMaintenanceFixture.runtimePack,
    operationId: "op_maintenance_counter_1_reset_interval",
    runtimeSnapshot: readonlyMaintenanceFixture.runtimeSnapshot,
    operationsSupport: readonlyMaintenanceFixture.operationsSupport
  });

  const built = buildInvocationRequest(maintenance, {
    targetSupport: getTransportFixture("operations-readonly-maintenance").operations_support
  });

  assert.equal(built.ok, false);
  assert.equal(built.intent_state, "confirmation_required");
});

test("buildCancelRequest stays blocked for non-cancellable baseline UI surface", () => {
  const pidHold = mapOperationDetails({
    runtimePack: readonlyPidFixture.runtimePack,
    operationId: "op_pid_1_hold",
    runtimeSnapshot: readonlyPidFixture.runtimeSnapshot,
    operationsSupport: readonlyPidFixture.operationsSupport
  });

  const built = buildCancelRequest(pidHold, {
    targetSupport: getTransportFixture("operations-readonly-pid").operations_support
  });

  assert.equal(built.ok, false);
  assert.equal(built.intent_state, "unsupported_execution");
});

test("buildInvocationRequest supports autotune recommendation actions", () => {
  const autotune = mapOperationDetails({
    runtimePack: readonlyPidFixture.runtimePack,
    operationId: "op_pid_1_autotune",
    runtimeSnapshot: readonlyPidFixture.runtimeSnapshot,
    operationsSupport: readonlyPidFixture.operationsSupport
  });

  const built = buildInvocationRequest(autotune, {
    action: "apply_recommendation",
    targetSupport: getTransportFixture("operations-readonly-pid").operations_support,
    confirmationToken: "confirm-apply"
  });

  assert.equal(built.ok, true);
  assert.deepEqual(built.request, {
    operation_id: "op_pid_1_autotune",
    action: "apply_recommendation",
    confirmation_token: "confirm-apply"
  });
});

test("mapInvocationResult keeps accepted invoke in pending dispatch state and produces snapshot overlay", async () => {
  const transport = createSyntheticOperationTransport();
  const rawResult = await transport.invokeOperation({
    operation_id: "op_flowmeter_1_reset_totalizer",
    confirmation_token: "confirm-123"
  }, {
    fixture_id: "operations-readonly-flowmeter"
  });

  const mapped = mapInvocationResult(rawResult, {
    operationId: "op_flowmeter_1_reset_totalizer"
  });

  assert.equal(mapped.ok, true);
  assert.equal(mapped.intent_state, "pending_dispatch");

  const overlay = overlayRuntimeSnapshot(readonlyFlowmeterFixture.runtimeSnapshot, {
    flowmeter: mapped
  });
  assert.equal(overlay.operation_snapshots.op_flowmeter_1_reset_totalizer.state, "accepted");
});

test("mapCancelResult falls back to dispatch_failed on malformed payload", () => {
  const mapped = mapCancelResult({ foo: "bar" }, {
    operationId: "op_pid_1_hold"
  });

  assert.equal(mapped.ok, false);
  assert.equal(mapped.intent_state, "dispatch_failed");
});

test("synthetic transport rejects unknown operation ids predictably", async () => {
  const transport = createSyntheticOperationTransport();
  const rawResult = await transport.invokeOperation({
    operation_id: "op_unknown"
  }, {
    fixture_id: "operations-readonly-flowmeter"
  });

  const mapped = mapInvocationResult(rawResult, {
    operationId: "op_unknown"
  });

  assert.equal(mapped.ok, false);
  assert.equal(mapped.intent_state, "dispatch_failed");
});

test("mapInvocationResult keeps autotune recommendation payload fields in the snapshot overlay", async () => {
  const transport = createSyntheticOperationTransport();
  const rawResult = await transport.invokeOperation({
    operation_id: "op_pid_1_autotune",
    action: "apply_recommendation",
    confirmation_token: "confirm-apply"
  }, {
    fixture_id: "operations-readonly-pid"
  });

  const mapped = mapInvocationResult(rawResult, {
    operationId: "op_pid_1_autotune"
  });

  assert.equal(mapped.ok, true);
  const overlay = overlayRuntimeSnapshot(readonlyPidFixture.runtimeSnapshot, {
    pidAutotune: mapped
  });
  assert.equal(overlay.operation_snapshots.op_pid_1_autotune.recommendation_state, "applied");
  assert.equal(overlay.operation_snapshots.op_pid_1_autotune.result.applied, true);
});
