import { strict as assert } from "node:assert";
import test from "node:test";

import packageProtectionRecoveryPack from "./fixtures/package-protection-recovery.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package protection/recovery runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packageProtectionRecoveryPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package protection/recovery runtime pack exposes qualified ids and recovery targets target-neutrally", () => {
  const packageEntry = packageProtectionRecoveryPack.package_protection_recovery.pkgprotect_boiler_pkg_1;
  assert.equal(packageEntry.trips.pressure_trip.qualified_id, "pkgprotect_boiler_pkg_1.trip.pressure_trip");
  assert.equal(packageEntry.inhibits.feedwater_blocked.qualified_id, "pkgprotect_boiler_pkg_1.inhibit.feedwater_blocked");
  assert.equal(
    packageEntry.recovery_requests.reset_pressure_trip.target_operation_id,
    "op_boiler_pkg_1__pressure_trip_1_reset_trip"
  );
});
