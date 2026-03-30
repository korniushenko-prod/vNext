import { strict as assert } from "node:assert";
import test from "node:test";

import invalidPackageModePhaseReadback from "./fixtures/package-mode-phase-invalid-readback.json" with { type: "json" };
import packageModePhaseCapability from "./fixtures/package-mode-phase-capability.json" with { type: "json" };
import packageModePhaseReadback from "./fixtures/package-mode-phase-readback.json" with { type: "json" };
import { validateTargetCapabilityProfile, validateTargetReadbackSnapshot } from "../src/index.js";

test("package mode/phase capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packageModePhaseCapability);
  assert.equal(result.ok, true);
  assert.equal(packageModePhaseCapability.package_mode_phase_support.enabled, true);
});

test("package mode/phase readback fixture carries active refs and grouped states", () => {
  const result = validateTargetReadbackSnapshot(packageModePhaseReadback);
  assert.equal(result.ok, true);
  assert.equal(
    packageModePhaseReadback.package_mode_phase_snapshots.pump_pkg_1.active_mode_id,
    "pkgmode_pump_pkg_1.mode.auto"
  );
});

test("invalid package mode/phase readback fixture is rejected by additive validators", () => {
  const result = validateTargetReadbackSnapshot(invalidPackageModePhaseReadback);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});
