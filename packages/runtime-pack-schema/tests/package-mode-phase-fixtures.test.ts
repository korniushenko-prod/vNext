import { strict as assert } from "node:assert";
import test from "node:test";

import invalidPackageModePhasePack from "./fixtures/package-mode-phase-invalid.runtime-pack.json" with { type: "json" };
import packageModePhasePack from "./fixtures/package-mode-phase.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package mode/phase runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packageModePhasePack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package mode/phase runtime pack exposes qualified ids and active refs target-neutrally", () => {
  const packageEntry = packageModePhasePack.package_mode_phase.pkgmode_pump_pkg_1;
  assert.equal(packageEntry.modes.auto.qualified_id, "pkgmode_pump_pkg_1.mode.auto");
  assert.equal(packageEntry.phase_summary.entries.ready_summary.phase_id, "pkgmode_pump_pkg_1.phase.ready");
  assert.equal(packageEntry.active_mode_id, "pkgmode_pump_pkg_1.mode.auto");
});

test("invalid package mode/phase runtime pack is rejected by additive validators", () => {
  const result = validateRuntimePack(invalidPackageModePhasePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.string"));
});
