import { strict as assert } from "node:assert";
import test from "node:test";

import packageProtectionRecoveryCapability from "./fixtures/package-protection-recovery-capability.json" with { type: "json" };
import packageProtectionRecoverySnapshot from "./fixtures/package-protection-recovery-snapshot.json" with { type: "json" };
import { validateTargetCapabilityProfile, validateTargetReadbackSnapshot } from "../src/index.js";

test("package protection/recovery capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packageProtectionRecoveryCapability);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package protection/recovery snapshot fixture stays structurally valid", () => {
  const result = validateTargetReadbackSnapshot(packageProtectionRecoverySnapshot);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package protection/recovery snapshot exposes tripped reasons and recovery request availability", () => {
  const snapshot = packageProtectionRecoverySnapshot.package_protection_recovery_snapshots.boiler_supervisor_protection_1;
  assert.equal(snapshot.protection_summary.state, "tripped");
  assert.equal(snapshot.trip_states.pressure_trip.state, "tripped");
  assert.equal(snapshot.recovery_request_states.request_recovery.availability_state, "unavailable");
});
