const test = require("node:test");
const assert = require("node:assert/strict");

const {
  OPERATION_SERVICE_LIFECYCLE_STATES,
  OPERATION_UI_SECTIONS
} = require("../../src/operations/contracts/operation-ui-contracts");
const { mapOperationListItems } = require("../../src/operations/contracts/operation-ui-mappers");
const {
  maintenancePack,
  metadataOnlySupport,
  pidAutotunePack,
  pidPack,
  pulseFlowmeterPack,
  runHoursPack
} = require("./fixtures");

test("ui/service lifecycle vocabulary is frozen in the expected canonical order", () => {
  assert.deepEqual(OPERATION_SERVICE_LIFECYCLE_STATES, [
    "idle",
    "available",
    "blocked",
    "confirmation_required",
    "requested",
    "running",
    "completed",
    "rejected",
    "failed",
    "cancelled",
    "stale"
  ]);
  assert.deepEqual(OPERATION_UI_SECTIONS, [
    "available_actions",
    "running_operations",
    "confirmation_required",
    "result_summary",
    "recent_operation_history"
  ]);
});

test("canonical operation-bearing fixtures expose the required five object families", () => {
  const cases = [
    { pack: pulseFlowmeterPack, expected: ["op_flowmeter_1_reset_totalizer"] },
    { pack: runHoursPack, expected: ["op_run_hours_1_reset_counter"] },
    { pack: maintenancePack, expected: ["op_maintenance_counter_1_reset_interval"] },
    { pack: pidPack, expected: ["op_pid_1_hold", "op_pid_1_release"] },
    { pack: pidAutotunePack, expected: ["op_pid_1_autotune"] }
  ];

  for (const entry of cases) {
    const items = mapOperationListItems({
      runtimePack: entry.pack,
      operationsSupport: metadataOnlySupport
    });
    const ids = items.map((item) => item.id);
    for (const expectedId of entry.expected) {
      assert.ok(ids.includes(expectedId));
    }
  }
});
