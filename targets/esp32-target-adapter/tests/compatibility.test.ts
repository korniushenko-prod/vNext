import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import compatibilityOk from "./fixtures/compatibility-ok.json" with { type: "json" };
import compatibilityTooManyConnections from "./fixtures/compatibility-too-many-connections.json" with { type: "json" };
import compatibilityUnsupportedBinding from "./fixtures/compatibility-unsupported-binding.json" with { type: "json" };
import compatibilityMixedErrors from "./fixtures/compatibility-mixed-errors.json" with { type: "json" };

import {
  buildEsp32ApplyPlan,
  checkEsp32Compatibility,
  createEsp32TargetAdapter,
  esp32CapabilityProfile
} from "../src/index.js";

test("exports a stable capability profile", () => {
  assert.equal(esp32CapabilityProfile.target_id, "esp32-shipcontroller");
  assert.ok(esp32CapabilityProfile.supported_binding_kinds.includes("digital_out"));
  assert.ok(esp32CapabilityProfile.supported_channel_kinds.includes("signal"));
  assert.ok(esp32CapabilityProfile.supported_value_types.includes("bool"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("offline_validate"));
});

test("valid runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(compatibilityOk as RuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("too many connections produces the canonical limit diagnostic", () => {
  const result = checkEsp32Compatibility(compatibilityTooManyConnections as RuntimePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.connections.limit"));
});

test("unsupported binding produces the canonical unsupported binding diagnostic", () => {
  const result = checkEsp32Compatibility(compatibilityUnsupportedBinding as RuntimePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.binding.unsupported"));
});

test("diagnostic codes are stable and deterministic", () => {
  const result = checkEsp32Compatibility(compatibilityMixedErrors as RuntimePack);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics.map((entry) => entry.code), [
    "target.binding.unsupported",
    "target.channel_kind.unsupported",
    "target.value_type.unsupported",
    "target.value_type.unsupported"
  ]);
});

test("buildApplyPlan remains deterministic while compatibility becomes stricter", () => {
  const plan = buildEsp32ApplyPlan(compatibilityOk as RuntimePack);
  assert.deepEqual(plan.steps.map((step) => step.id), [
    "step_validate_pack",
    "step_stage_instances",
    "step_stage_connections",
    "step_stage_resources",
    "step_finalize_report"
  ]);
});

test("factory returns the stricter compatibility behavior", async () => {
  const adapter = createEsp32TargetAdapter();
  assert.equal(adapter.manifest.id, "esp32-target-adapter");
  assert.equal(adapter.checkCompatibility(compatibilityOk as RuntimePack).ok, true);
  const applyResult = await adapter.apply({
    request_id: "req-1",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: (compatibilityOk as RuntimePack).pack_id,
      schema_version: (compatibilityOk as RuntimePack).schema_version
    },
    options: {}
  });
  assert.equal(applyResult.success, false);
  assert.ok(applyResult.diagnostics.some((entry) => entry.code === "target.apply.not_implemented"));
});