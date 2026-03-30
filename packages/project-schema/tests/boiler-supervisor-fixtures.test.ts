import { strict as assert } from "node:assert";
import test from "node:test";

import invalidHardwareBinding from "./fixtures/boiler-supervisor-invalid-hardware-binding.project.json" with { type: "json" };
import invalidMissingMonitorSource from "./fixtures/boiler-supervisor-invalid-missing-monitor-source.project.json" with { type: "json" };
import invalidSummaryMismatch from "./fixtures/boiler-supervisor-invalid-summary-mismatch.project.json" with { type: "json" };
import invalidUnknownProxyTarget from "./fixtures/boiler-supervisor-invalid-unknown-proxy-target.project.json" with { type: "json" };
import boilerSupervisorProject from "./fixtures/boiler-supervisor.project.minimal.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("boiler supervisor reference minimal project passes package supervision validation", () => {
  const result = validateProjectModel(boilerSupervisorProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("boiler supervisor catches missing member refs in aggregate monitor rollups", () => {
  const result = validateProjectModel(invalidMissingMonitorSource);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_supervision.member.unresolved"));
});

test("boiler supervisor catches unresolved operation proxy targets", () => {
  const result = validateProjectModel(invalidUnknownProxyTarget);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_operation_proxy.target.unresolved"));
});

test("boiler supervisor forbids direct hardware bindings in package supervision metadata", () => {
  const result = validateProjectModel(invalidHardwareBinding);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_supervision.hardware_binding.forbidden"));
});

test("boiler supervisor catches mismatched summary value types", () => {
  const result = validateProjectModel(invalidSummaryMismatch);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_supervision.summary_source.value_type_mismatch"));
});
