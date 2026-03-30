import { strict as assert } from "node:assert";
import test from "node:test";

import packageArbitrationPack from "./fixtures/package-arbitration.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package arbitration runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packageArbitrationPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package arbitration runtime pack exposes ownership and command summary target-neutrally", () => {
  const packageEntry = packageArbitrationPack.package_arbitration.pkgarb_boiler_supervisor_arbitration_1;
  assert.equal(packageEntry.ownership_summary.active_lane_ids[0], "manual_owner");
  assert.equal(packageEntry.command_lanes.enable_auto.arbitration_result, "accepted");
  assert.equal(packageEntry.command_lanes.disable_remote.denied_reason, "manual_owner_active");
});
