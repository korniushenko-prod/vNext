import { strict as assert } from "node:assert";
import test from "node:test";

import packageSupervisionCapability from "./fixtures/package-supervision-capability.json" with { type: "json" };
import invalidPackageSupervisionReadback from "./fixtures/package-supervision-invalid-readback.json" with { type: "json" };
import packageSupervisionReadback from "./fixtures/package-supervision-readback.json" with { type: "json" };
import { validateTargetCapabilityProfile, validateTargetReadbackSnapshot } from "../src/index.js";

test("package supervision capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packageSupervisionCapability);
  assert.equal(result.ok, true);
  assert.equal(packageSupervisionCapability.package_supervision_support.enabled, true);
});

test("package supervision readback fixture carries package snapshots and proxy states", () => {
  const result = validateTargetReadbackSnapshot(packageSupervisionReadback);
  assert.equal(result.ok, true);
  assert.equal(
    packageSupervisionReadback.package_snapshots.boiler_supervisor_1.operation_proxy_states.op_proxy_reset_runtime_counter.state,
    "running"
  );
});

test("invalid package supervision readback fixture is rejected by additive validators", () => {
  const result = validateTargetReadbackSnapshot(invalidPackageSupervisionReadback);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum" || entry.code === "field.string"));
});
