import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import emptyPack from "./fixtures/empty.runtime-pack.json" with { type: "json" };
import timedRelayPack from "./fixtures/timed-relay.runtime-pack.json" with { type: "json" };
import unsortedPack from "./fixtures/unsorted.runtime-pack.json" with { type: "json" };

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
});

test("empty runtime pack passes compatibility without crashing", () => {
  const result = checkEsp32Compatibility(emptyPack as RuntimePack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("buildApplyPlan creates a deterministic step sequence", () => {
  const plan = buildEsp32ApplyPlan(unsortedPack as RuntimePack);
  assert.deepEqual(plan.steps.map((step) => step.id), [
    "step_validate_pack",
    "step_stage_instances",
    "step_stage_connections",
    "step_stage_resources",
    "step_finalize_report"
  ]);
  assert.deepEqual(plan.steps[1].target_ids, ["relay_1", "relay_2"]);
  assert.deepEqual(plan.steps[2].target_ids, ["conn_a", "conn_b"]);
  assert.deepEqual(plan.steps[3].target_ids, ["resource_a", "resource_b"]);
});

test("factory returns a contract-shaped offline adapter", async () => {
  const adapter = createEsp32TargetAdapter();
  assert.equal(adapter.manifest.id, "esp32-target-adapter");
  assert.equal(adapter.checkCompatibility(timedRelayPack as RuntimePack).ok, true);
  const applyResult = await adapter.apply({
    request_id: "req-1",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: (timedRelayPack as RuntimePack).pack_id,
      schema_version: (timedRelayPack as RuntimePack).schema_version
    },
    options: {}
  });
  assert.equal(applyResult.success, false);
  assert.ok(applyResult.diagnostics.some((entry) => entry.code === "target.apply.not_implemented"));
});