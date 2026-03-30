import { strict as assert } from "node:assert";
import test from "node:test";

import invalidMissingProxy from "./fixtures/boiler-supervisor-coordination-invalid-missing-proxy.project.json" with { type: "json" };
import invalidSafetyField from "./fixtures/boiler-supervisor-coordination-invalid-safety-field.project.json" with { type: "json" };
import invalidState from "./fixtures/boiler-supervisor-coordination-invalid-state.project.json" with { type: "json" };
import boilerSupervisorCoordinationProject from "./fixtures/boiler-supervisor-coordination.project.minimal.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("boiler supervisor coordination reference minimal project passes package coordination validation", () => {
  const result = validateProjectModel(boilerSupervisorCoordinationProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("boiler supervisor coordination catches unresolved package proxy targets", () => {
  const result = validateProjectModel(invalidMissingProxy);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_coordination.operation_proxy.target.unresolved"));
});

test("boiler supervisor coordination catches invalid package states", () => {
  const result = validateProjectModel(invalidState);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});

test("boiler supervisor coordination forbids direct safety fields", () => {
  const result = validateProjectModel(invalidSafetyField);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_coordination.safety_field.forbidden"));
});
