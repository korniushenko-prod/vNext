import { strict as assert } from "node:assert";
import test from "node:test";

import minimalProject from "./fixtures/minimal-project.json" with { type: "json" };
import invalidProject from "./fixtures/system-routes-invalid.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("validateProjectModel accepts canonical minimal project", () => {
  const result = validateProjectModel(minimalProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateProjectModel rejects system.routes in canonical schema", () => {
  const result = validateProjectModel(invalidProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "system.routes.forbidden"));
});
