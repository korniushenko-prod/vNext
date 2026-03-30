import { strict as assert } from "node:assert";
import test from "node:test";

import packageCoordinationCapability from "./fixtures/package-coordination-capability.json" with { type: "json" };
import invalidPackageCoordinationReadback from "./fixtures/package-coordination-invalid-readback.json" with { type: "json" };
import packageCoordinationReadback from "./fixtures/package-coordination-readback.json" with { type: "json" };
import { validateTargetCapabilityProfile, validateTargetReadbackSnapshot } from "../src/index.js";

test("package coordination capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packageCoordinationCapability);
  assert.equal(result.ok, true);
  assert.equal(packageCoordinationCapability.package_coordination_support.enabled, true);
});

test("package coordination readback fixture carries package state and proxy states", () => {
  const result = validateTargetReadbackSnapshot(packageCoordinationReadback);
  assert.equal(result.ok, true);
  assert.equal(
    packageCoordinationReadback.package_coordination_snapshots.boiler_coordination_1.operation_proxy_states.start_supervision.state,
    "completed"
  );
});

test("invalid package coordination readback fixture is rejected by additive validators", () => {
  const result = validateTargetReadbackSnapshot(invalidPackageCoordinationReadback);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});
