import { strict as assert } from "node:assert";
import test from "node:test";

import invalidMissingProxy from "./fixtures/package-coordination-invalid-missing-proxy.project.json" with { type: "json" };
import invalidSafetyField from "./fixtures/package-coordination-invalid-safety-field.project.json" with { type: "json" };
import invalidState from "./fixtures/package-coordination-invalid-state.project.json" with { type: "json" };
import validPackageCoordination from "./fixtures/package-coordination-valid.project.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("package coordination fixture passes additive contract validation", () => {
  const result = validateProjectModel(validPackageCoordination);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("package coordination catches missing child proxy targets", () => {
  const result = validateProjectModel(invalidMissingProxy);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_coordination.operation_proxy.target.unresolved"));
});

test("package coordination rejects invalid baseline states", () => {
  const result = validateProjectModel(invalidState);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});

test("package coordination forbids direct burner/safety fields", () => {
  const result = validateProjectModel(invalidSafetyField);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_coordination.safety_field.forbidden"));
});
