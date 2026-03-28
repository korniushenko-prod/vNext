import { strict as assert } from "node:assert";
import test from "node:test";

import invalidManifest from "./fixtures/manifest-invalid.json" with { type: "json" };
import validManifest from "./fixtures/manifest-valid.json" with { type: "json" };
import {
  TARGET_ADAPTER_CONTRACT_VERSION,
  validateTargetAdapterManifest
} from "../src/index.js";

test("validateTargetAdapterManifest accepts canonical manifest", () => {
  const result = validateTargetAdapterManifest(validManifest);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateTargetAdapterManifest enforces contract version and enum values", () => {
  const result = validateTargetAdapterManifest(invalidManifest);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.contract_version"));
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.capabilities[1]"));
  assert.equal(TARGET_ADAPTER_CONTRACT_VERSION, "0.1.0");
});
