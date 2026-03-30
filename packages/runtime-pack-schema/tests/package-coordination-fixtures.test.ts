import { strict as assert } from "node:assert";
import test from "node:test";

import invalidPackageCoordinationPack from "./fixtures/package-coordination-invalid.runtime-pack.json" with { type: "json" };
import packageCoordinationPack from "./fixtures/package-coordination.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package coordination runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packageCoordinationPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package coordination runtime pack exposes package state and proxy operations target-neutrally", () => {
  const packageEntry = packageCoordinationPack.package_coordination.pkg_boiler_coordination_1;
  assert.equal(packageEntry.package_state.states.ready.state, "ready");
  assert.equal(packageEntry.operation_proxies.start_supervision.target_operation_id, "op_boiler_coordination_1__pump_group_1_start_supervision");
});

test("invalid package coordination runtime pack is rejected by additive validators", () => {
  const result = validateRuntimePack(invalidPackageCoordinationPack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});
