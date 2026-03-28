import { strict as assert } from "node:assert";
import test from "node:test";

import flattenedCompositionPack from "./fixtures/flattened-composition-pack.json" with { type: "json" };
import { validateRuntimePack } from "../src/index.js";

test("flattened composition runtime pack passes structural validation", () => {
  const result = validateRuntimePack(flattenedCompositionPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("runtime pack connections stay normalized as point-to-point links", () => {
  const connections = flattenedCompositionPack.connections;
  for (const connection of Object.values(connections)) {
    assert.ok(typeof connection.source.instance_id === "string");
    assert.ok(typeof connection.source.port_id === "string");
    assert.ok(typeof connection.target.instance_id === "string");
    assert.ok(typeof connection.target.port_id === "string");
  }
});
