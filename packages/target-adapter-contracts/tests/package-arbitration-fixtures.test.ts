import { strict as assert } from "node:assert";
import test from "node:test";

import packageArbitrationCapability from "./fixtures/package-arbitration-capability.json" with { type: "json" };
import packageArbitrationSnapshot from "./fixtures/package-arbitration-snapshot.json" with { type: "json" };
import { validateTargetCapabilityProfile, validateTargetReadbackSnapshot } from "../src/index.js";

test("package arbitration capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packageArbitrationCapability);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package arbitration snapshot fixture stays structurally valid", () => {
  const result = validateTargetReadbackSnapshot(packageArbitrationSnapshot);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package arbitration snapshot exposes ownership and explicit command outcomes", () => {
  const snapshot = packageArbitrationSnapshot.package_arbitration_snapshots.boiler_supervisor_arbitration_1;
  assert.equal(snapshot.ownership_summary.active_lane_ids[0], "manual_owner");
  assert.equal(snapshot.command_lane_states.enable_auto.arbitration_result, "accepted");
  assert.equal(snapshot.command_lane_states.reset_service.blocked_reason, "service_lockout");
  assert.equal(snapshot.command_lane_states.disable_remote.denied_reason, "manual_owner_active");
  assert.equal(snapshot.command_lane_states.start_service.superseded_by_lane_id, "enable_auto");
});
