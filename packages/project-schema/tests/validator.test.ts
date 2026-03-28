import { strict as assert } from "node:assert";
import test from "node:test";

import minimalProject from "./fixtures/minimal-project.json" with { type: "json" };
import invalidProject from "./fixtures/system-routes-invalid.json" with { type: "json" };
import { PROJECT_SCHEMA_VERSION, validateProjectModel } from "../src/index.js";

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

test("validateProjectModel enforces canonical schema version", () => {
  const mutated = {
    ...minimalProject,
    schema_version: "0.3.0"
  };
  const result = validateProjectModel(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.schema_version"));
  assert.equal(PROJECT_SCHEMA_VERSION, "0.4.0");
});
