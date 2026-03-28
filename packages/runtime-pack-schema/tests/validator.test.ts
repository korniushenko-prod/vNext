import { strict as assert } from "node:assert";
import test from "node:test";

import minimalRuntimePack from "./fixtures/minimal-runtime-pack.json" with { type: "json" };
import invalidRuntimePack from "./fixtures/runtime-signals-invalid.json" with { type: "json" };
import { RUNTIME_PACK_SCHEMA_VERSION, validateRuntimePack } from "../src/index.js";

test("validateRuntimePack accepts canonical minimal runtime pack", () => {
  const result = validateRuntimePack(minimalRuntimePack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateRuntimePack rejects signals in runtime pack", () => {
  const result = validateRuntimePack(invalidRuntimePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "runtime_pack.signals.forbidden"));
});

test("validateRuntimePack enforces canonical runtime schema version", () => {
  const mutated = {
    ...minimalRuntimePack,
    schema_version: "0.0.9"
  };
  const result = validateRuntimePack(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.schema_version"));
  assert.equal(RUNTIME_PACK_SCHEMA_VERSION, "0.1.0");
});

test("validateRuntimePack accepts native execution metadata and empty ops/trace groups", () => {
  const result = validateRuntimePack(minimalRuntimePack);
  assert.equal(result.ok, true);
});
