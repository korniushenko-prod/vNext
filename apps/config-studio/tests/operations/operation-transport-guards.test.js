const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mapOperationDetails
} = require("../../src/operations/contracts/operation-ui-mappers");
const {
  canApplyRecommendation,
  canCancelOperation,
  canInvokeOperation
} = require("../../src/operations/transport/operation-transport-guards");
const {
  getTransportFixture
} = require("../../src/operations/transport/operation-transport-fixtures");
const {
  readonlyFlowmeterFixture,
  readonlyPidFixture,
  readonlyRunHoursFixture,
  readonlyUnsupportedFixture
} = require("./fixtures");

test("canInvokeOperation allows canonical invoke when target support enables transport", () => {
  const flowmeter = mapOperationDetails({
    runtimePack: readonlyFlowmeterFixture.runtimePack,
    operationId: "op_flowmeter_1_reset_totalizer",
    runtimeSnapshot: readonlyFlowmeterFixture.runtimeSnapshot,
    operationsSupport: readonlyFlowmeterFixture.operationsSupport
  });

  const gate = canInvokeOperation(flowmeter, getTransportFixture("operations-readonly-flowmeter").operations_support);
  assert.equal(gate.allowed, true);
  assert.equal(gate.intent_state, "invoke_requested");
});

test("canInvokeOperation blocks guarded run-hours reset", () => {
  const runHours = mapOperationDetails({
    runtimePack: readonlyRunHoursFixture.runtimePack,
    operationId: "op_run_hours_1_reset_counter",
    runtimeSnapshot: readonlyRunHoursFixture.runtimeSnapshot,
    operationsSupport: readonlyRunHoursFixture.operationsSupport
  });

  const gate = canInvokeOperation(runHours, getTransportFixture("operations-readonly-runhours").operations_support);
  assert.equal(gate.allowed, true);
  assert.equal(gate.intent_state, "invoke_requested");
});

test("non-baseline PID operations stay non-runnable at the guard layer", () => {
  const pidHold = mapOperationDetails({
    runtimePack: readonlyPidFixture.runtimePack,
    operationId: "op_pid_1_hold",
    runtimeSnapshot: readonlyPidFixture.runtimeSnapshot,
    operationsSupport: readonlyPidFixture.operationsSupport
  });

  const holdGate = canCancelOperation(pidHold, getTransportFixture("operations-readonly-pid").operations_support);
  const invokeGate = canInvokeOperation(pidHold, getTransportFixture("operations-readonly-pid").operations_support);

  assert.equal(holdGate.allowed, false);
  assert.equal(holdGate.intent_state, "unsupported_execution");
  assert.equal(invokeGate.allowed, false);
  assert.equal(invokeGate.intent_state, "unsupported_execution");
});

test("pid autotune recommendation apply is allowed when recommendation is available", () => {
  const pidAutotune = mapOperationDetails({
    runtimePack: readonlyPidFixture.runtimePack,
    operationId: "op_pid_1_autotune",
    runtimeSnapshot: readonlyPidFixture.runtimeSnapshot,
    operationsSupport: readonlyPidFixture.operationsSupport
  });

  const gate = canApplyRecommendation(pidAutotune, getTransportFixture("operations-readonly-pid").operations_support);
  assert.equal(gate.allowed, true);
  assert.equal(gate.intent_state, "apply_recommendation");
});

test("unsupported target remains blocked at the guard layer", () => {
  const unsupported = mapOperationDetails({
    runtimePack: readonlyUnsupportedFixture.runtimePack,
    operationId: "op_remote_point_1_self_test",
    runtimeSnapshot: readonlyUnsupportedFixture.runtimeSnapshot,
    operationsSupport: readonlyUnsupportedFixture.operationsSupport
  });

  const gate = canInvokeOperation(unsupported, getTransportFixture("operations-readonly-unsupported").operations_support);
  assert.equal(gate.allowed, false);
  assert.equal(gate.intent_state, "unsupported_by_target");
});
