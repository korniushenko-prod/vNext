import { strict as assert } from "node:assert";
import test from "node:test";

import minimalRuntimePack from "./fixtures/minimal-runtime-pack.json" with { type: "json" };
import invalidRuntimePack from "./fixtures/runtime-signals-invalid.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

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
