import { strict as assert } from "node:assert";
import test from "node:test";

import compositionValid from "./fixtures/composition-valid.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("composition fixture passes structural validation", () => {
  const result = validateProjectModel(compositionValid);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("composition fixture keeps composition route endpoint kinds constrained", () => {
  const burnerSequence = compositionValid.definitions.object_types.burner_sequence;
  const routes = burnerSequence.implementation.composition?.routes ?? {};
  for (const route of Object.values(routes)) {
    assert.ok(route.from.kind === "parent_port" || route.from.kind === "instance_port");
    assert.ok(route.to.kind === "parent_port" || route.to.kind === "instance_port");
  }
});
