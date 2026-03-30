import { strict as assert } from "node:assert";
import test from "node:test";

import packageModeExecutionCapability from "./fixtures/package-mode-execution-capability.json" with { type: "json" };
import packageModeExecutionInvalidReadback from "./fixtures/package-mode-execution-invalid-readback.json" with { type: "json" };
import packageModeExecutionReadback from "./fixtures/package-mode-execution-readback.json" with { type: "json" };
import packageModeTransitionRequest from "./fixtures/package-mode-transition-request.json" with { type: "json" };
import packageModeTransitionResult from "./fixtures/package-mode-transition-result.json" with { type: "json" };
import {
  validatePackageModeTransitionRequest,
  validatePackageModeTransitionResult,
  validateTargetCapabilityProfile,
  validateTargetReadbackSnapshot
} from "../src/index.js";

test("package mode execution capability fixture stays structurally valid", () => {
  const result = validateTargetCapabilityProfile(packageModeExecutionCapability);
  assert.equal(result.ok, true);
  assert.equal(packageModeExecutionCapability.package_mode_phase_support.package_mode_execution, true);
});

test("package mode execution readback fixture carries transition state and guard vocabulary", () => {
  const result = validateTargetReadbackSnapshot(packageModeExecutionReadback);
  assert.equal(result.ok, true);
  assert.equal(
    packageModeExecutionReadback.package_mode_phase_snapshots.pump_pkg_1.transition_state,
    "running"
  );
  assert.equal(
    packageModeExecutionReadback.package_mode_phase_snapshots.pump_pkg_1.transition_guard_states.abort_flush,
    "blocked"
  );
});

test("package mode transition request/result fixtures stay structurally valid", () => {
  assert.equal(validatePackageModeTransitionRequest(packageModeTransitionRequest).ok, true);
  assert.equal(validatePackageModeTransitionResult(packageModeTransitionResult).ok, true);
});

test("invalid package mode execution readback is rejected by additive validators", () => {
  const result = validateTargetReadbackSnapshot(packageModeExecutionInvalidReadback);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});
