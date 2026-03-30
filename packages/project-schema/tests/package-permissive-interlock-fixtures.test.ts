import { strict as assert } from "node:assert";
import test from "node:test";

import boilerSupervisorInterlocksPackage from "./fixtures/boiler-supervisor-interlocks.package-definition.json" with { type: "json" };
import boilerSupervisorInterlocksProject from "./fixtures/boiler-supervisor-interlocks.project.minimal.json" with { type: "json" };
import invalidDomainFieldProject from "./fixtures/package-permissive-interlock-invalid-domain-field.project.json" with { type: "json" };
import invalidRefProject from "./fixtures/package-permissive-interlock-invalid-ref.project.json" with { type: "json" };
import pumpSkidSupervisorInterlocksPackage from "./fixtures/pump-skid-supervisor-interlocks.package-definition.json" with { type: "json" };
import pumpSkidSupervisorInterlocksProject from "./fixtures/pump-skid-supervisor-interlocks.project.minimal.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("boiler-like package permissive/interlock minimal project stays structurally valid", () => {
  const result = validateProjectModel(boilerSupervisorInterlocksProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid package permissive/interlock minimal project stays structurally valid", () => {
  const result = validateProjectModel(pumpSkidSupervisorInterlocksProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("dual-domain package permissive/interlock contracts stay package-neutral", () => {
  assert.deepEqual(Object.keys(boilerSupervisorInterlocksPackage.permissive_interlock.permissives), [
    "feedwater_ok",
    "circulation_ok",
    "demand_present"
  ]);
  assert.deepEqual(Object.keys(pumpSkidSupervisorInterlocksPackage.permissive_interlock.permissives), [
    "suction_ok",
    "discharge_path_ok",
    "motor_ready"
  ]);
});

test("invalid package permissive/interlock unresolved refs are rejected", () => {
  const result = validateProjectModel(invalidRefProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_permissive_interlock.permissive_ref.unresolved"));
});

test("invalid package permissive/interlock domain-specific fields are rejected", () => {
  const result = validateProjectModel(invalidDomainFieldProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_permissive_interlock.domain_field.forbidden"));
});
