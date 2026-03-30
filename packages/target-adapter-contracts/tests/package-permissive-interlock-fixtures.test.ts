import { strict as assert } from "node:assert";
import test from "node:test";

import packagePermissiveInterlockCapability from "./fixtures/package-permissive-interlock-capability.json" with { type: "json" };
import packagePermissiveInterlockSnapshot from "./fixtures/package-permissive-interlock-snapshot.json" with { type: "json" };
import { validateTargetCapabilityProfile, validateTargetReadbackSnapshot } from "../src/index.js";

test("package permissive/interlock capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packagePermissiveInterlockCapability);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package permissive/interlock snapshot fixture stays structurally valid", () => {
  const result = validateTargetReadbackSnapshot(packagePermissiveInterlockSnapshot);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package permissive/interlock snapshot exposes typed gate reasons and transition guards", () => {
  const snapshot = packagePermissiveInterlockSnapshot.package_permissive_interlock_snapshots.boiler_supervisor_interlocks_1;
  assert.equal(snapshot.gate_summary.state, "blocked");
  assert.equal(snapshot.transition_guard_states.allow_auto_run.state, "blocked");
});
