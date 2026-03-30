import { strict as assert } from "node:assert";
import test from "node:test";

import boilerSupervisorModesPackage from "./fixtures/boiler-supervisor-modes.package-definition.json" with { type: "json" };
import boilerSupervisorModesProject from "./fixtures/boiler-supervisor-modes.project.minimal.json" with { type: "json" };
import invalidActiveModeProject from "./fixtures/package-mode-phase-invalid-active-mode.project.json" with { type: "json" };
import invalidActivePhaseProject from "./fixtures/package-mode-phase-invalid-active-phase.project.json" with { type: "json" };
import invalidBoilerFieldProject from "./fixtures/package-mode-phase-invalid-boiler-field.project.json" with { type: "json" };
import invalidPhaseSummaryRefProject from "./fixtures/package-mode-phase-invalid-phase-summary-ref.project.json" with { type: "json" };
import pumpSkidSupervisorModesPackage from "./fixtures/pump-skid-supervisor-modes.package-definition.json" with { type: "json" };
import pumpSkidSupervisorModesProject from "./fixtures/pump-skid-supervisor-modes.project.minimal.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

function buildPackageFixtureProject(
  project_id: string,
  title: string,
  packageKey: string,
  packageDefinition: unknown,
  object_types: Record<string, unknown> = {},
  templates: Record<string, unknown> = {},
  libraries: string[] = []
) {
  return {
    schema_version: "0.4.0",
    meta: {
      project_id,
      title
    },
    imports: {
      libraries,
      packages: []
    },
    definitions: {
      object_types,
      templates,
      packages: {
        [packageKey]: packageDefinition
      }
    },
    system: {
      instances: {},
      signals: {},
      packages: {}
    },
    hardware: {
      bindings: {}
    },
    views: {
      screens: {}
    },
    layouts: {
      system: {},
      definitions: {}
    }
  };
}

test("boiler supervisor modes package contract fixture stays structurally valid", () => {
  const project = buildPackageFixtureProject(
    "boiler_supervisor_modes_fixture",
    "Boiler Supervisor Modes Fixture",
    "boiler_supervisor_modes",
    boilerSupervisorModesPackage,
    boilerSupervisorModesProject.definitions.object_types,
    boilerSupervisorModesProject.definitions.templates,
    ["std"]
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump skid supervisor modes package contract fixture stays structurally valid", () => {
  const project = buildPackageFixtureProject(
    "pump_skid_supervisor_modes_fixture",
    "Pump Skid Supervisor Modes Fixture",
    "pump_skid_supervisor_modes",
    pumpSkidSupervisorModesPackage,
    pumpSkidSupervisorModesProject.definitions.object_types
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("boiler supervisor modes minimal project stays structurally valid", () => {
  const result = validateProjectModel(boilerSupervisorModesProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump skid supervisor modes minimal project stays structurally valid", () => {
  const result = validateProjectModel(pumpSkidSupervisorModesProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("dual-domain package mode/phase contracts stay generic rather than boiler-specific", () => {
  assert.equal(boilerSupervisorModesPackage.mode_phase.active_mode_ref, "standby");
  assert.equal(Object.keys(boilerSupervisorModesPackage.mode_phase.modes).length, 3);
  assert.equal(pumpSkidSupervisorModesPackage.mode_phase.active_mode_ref, "auto");
  assert.equal(Object.keys(pumpSkidSupervisorModesPackage.mode_phase.phases).length, 3);
});

test("invalid package mode/phase active mode ref is rejected", () => {
  const result = validateProjectModel(invalidActiveModeProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.active_mode.unresolved"));
});

test("invalid package mode/phase active phase ref is rejected", () => {
  const result = validateProjectModel(invalidActivePhaseProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.active_phase.unresolved"));
});

test("invalid package mode/phase phase summary ref is rejected", () => {
  const result = validateProjectModel(invalidPhaseSummaryRefProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.phase_summary.ref.unresolved"));
});

test("invalid boiler-specific field is rejected from generic mode/phase contract", () => {
  const result = validateProjectModel(invalidBoilerFieldProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.boiler_field.forbidden"));
});
