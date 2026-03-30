import { strict as assert } from "node:assert";
import test from "node:test";

import invalidPackageModeExecutionPack from "./fixtures/package-mode-execution-invalid.runtime-pack.json" with { type: "json" };
import packageModeExecutionPack from "./fixtures/package-mode-execution.runtime-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("package mode execution runtime pack fixture stays structurally valid", () => {
  const result = validateRuntimePack(packageModeExecutionPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package mode execution fixture exposes bounded transition intents and guard vocabulary", () => {
  const packageEntry = packageModeExecutionPack.package_mode_phase.pkgmode_pump_pkg_1;
  assert.deepEqual(
    packageModeExecutionPack.package_mode_runtime_contract.supported_intents,
    ["request_mode_change", "request_phase_start", "request_phase_abort"]
  );
  assert.equal(packageEntry.allowed_mode_transitions.to_service.intent, "request_mode_change");
  assert.equal(packageEntry.allowed_phase_transitions.abort_flush.guard_state, "blocked");
  assert.equal(packageEntry.allowed_phase_transitions.start_run.phase_state, "ready");
});

test("invalid package mode execution runtime pack is rejected by additive validators", () => {
  const result = validateRuntimePack(invalidPackageModeExecutionPack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});
