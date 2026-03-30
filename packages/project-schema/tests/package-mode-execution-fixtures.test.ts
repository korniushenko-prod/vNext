import { strict as assert } from "node:assert";
import test from "node:test";

import boilerSupervisorModesExecutionPackage from "./fixtures/boiler-supervisor-modes-execution.package-definition.json" with { type: "json" };
import boilerSupervisorModesExecutionProject from "./fixtures/boiler-supervisor-modes-execution.project.minimal.json" with { type: "json" };
import invalidTransitionProject from "./fixtures/package-mode-execution-invalid-transition.project.json" with { type: "json" };
import pumpSkidSupervisorModesExecutionPackage from "./fixtures/pump-skid-supervisor-modes-execution.package-definition.json" with { type: "json" };
import pumpSkidSupervisorModesExecutionProject from "./fixtures/pump-skid-supervisor-modes-execution.project.minimal.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("boiler-like package mode execution minimal project stays structurally valid", () => {
  const result = validateProjectModel(boilerSupervisorModesExecutionProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid package mode execution minimal project stays structurally valid", () => {
  const result = validateProjectModel(pumpSkidSupervisorModesExecutionProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("dual-domain package mode execution contracts stay bounded and generic", () => {
  assert.equal(boilerSupervisorModesExecutionPackage.mode_phase.allowed_phase_transitions.start_run.intent, "request_phase_start");
  assert.equal(pumpSkidSupervisorModesExecutionPackage.mode_phase.allowed_phase_transitions.abort_flush.intent, "request_phase_abort");
  assert.deepEqual(Object.keys(boilerSupervisorModesExecutionPackage.mode_phase.modes), ["off", "auto", "service"]);
  assert.deepEqual(Object.keys(pumpSkidSupervisorModesExecutionPackage.mode_phase.modes), ["off", "auto", "service"]);
});

test("invalid package mode execution transition refs are rejected", () => {
  const result = validateProjectModel(invalidTransitionProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.phase_transition.ref.unresolved"));
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.phase_transition.mode_ref.unresolved"));
});
