const test = require("node:test");
const assert = require("node:assert/strict");

const {
  mapOperationDetails
} = require("../../src/operations/contracts/operation-ui-mappers");
const {
  resolveOperationCommandIntents
} = require("../../src/operations/transport/operation-command-intents");
const {
  getTransportFixture
} = require("../../src/operations/transport/operation-transport-fixtures");
const {
  readonlyMaintenanceFixture,
  readonlyPidFixture,
  readonlyUnsupportedFixture
} = require("./fixtures");

test("confirmation-required operation stays gated until token is present", () => {
  const maintenance = mapOperationDetails({
    runtimePack: readonlyMaintenanceFixture.runtimePack,
    operationId: "op_maintenance_counter_1_reset_interval",
    runtimeSnapshot: readonlyMaintenanceFixture.runtimeSnapshot,
    operationsSupport: readonlyMaintenanceFixture.operationsSupport
  });

  const missing = resolveOperationCommandIntents({
    operationVm: maintenance,
    targetSupport: getTransportFixture("operations-readonly-maintenance").operations_support,
    confirmationToken: ""
  });
  const confirmed = resolveOperationCommandIntents({
    operationVm: maintenance,
    targetSupport: getTransportFixture("operations-readonly-maintenance").operations_support,
    confirmationToken: "confirm-456"
  });

  assert.equal(missing.invoke.state, "confirmation_required");
  assert.equal(confirmed.invoke.state, "invoke_requested");
});

test("metadata-only PID operations stay in unsupported execution lane", () => {
  const pidHold = mapOperationDetails({
    runtimePack: readonlyPidFixture.runtimePack,
    operationId: "op_pid_1_hold",
    runtimeSnapshot: readonlyPidFixture.runtimeSnapshot,
    operationsSupport: readonlyPidFixture.operationsSupport
  });

  const holdIntents = resolveOperationCommandIntents({
    operationVm: pidHold,
    targetSupport: getTransportFixture("operations-readonly-pid").operations_support,
    confirmationToken: "confirm-pid"
  });

  assert.equal(holdIntents.invoke.state, "unsupported_execution");
  assert.equal(holdIntents.cancel.state, "unsupported_execution");
});

test("specialized autotune exposes invoke/apply/reject intents through the transport layer", () => {
  const autotune = mapOperationDetails({
    runtimePack: readonlyPidFixture.runtimePack,
    operationId: "op_pid_1_autotune",
    runtimeSnapshot: readonlyPidFixture.runtimeSnapshot,
    operationsSupport: readonlyPidFixture.operationsSupport
  });

  const intents = resolveOperationCommandIntents({
    operationVm: autotune,
    targetSupport: getTransportFixture("operations-readonly-pid").operations_support,
    confirmationToken: "confirm-autotune"
  });

  assert.equal(autotune.metadata_only, false);
  assert.equal(intents.invoke.state, "invoke_requested");
  assert.equal(intents.apply_recommendation.state, "apply_recommendation");
  assert.equal(intents.reject_recommendation.state, "reject_recommendation");
});

test("unsupported target resolves to unsupported_by_target intent", () => {
  const unsupported = mapOperationDetails({
    runtimePack: readonlyUnsupportedFixture.runtimePack,
    operationId: "op_remote_point_1_self_test",
    runtimeSnapshot: readonlyUnsupportedFixture.runtimeSnapshot,
    operationsSupport: readonlyUnsupportedFixture.operationsSupport
  });

  const intents = resolveOperationCommandIntents({
    operationVm: unsupported,
    targetSupport: getTransportFixture("operations-readonly-unsupported").operations_support
  });

  assert.equal(intents.invoke.state, "unsupported_by_target");
});
