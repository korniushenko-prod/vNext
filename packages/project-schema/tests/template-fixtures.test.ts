import { strict as assert } from "node:assert";
import test from "node:test";

import projectSavedMaintenanceTemplate from "./fixtures/project-saved-maintenance-template.object-template.json" with { type: "json" };
import projectSavedMaintenanceTemplateProject from "./fixtures/project-saved-maintenance-template.project.minimal.json" with { type: "json" };
import pulseFlowmeterHallTemplate from "./fixtures/pulse-flowmeter-hall-template.object-template.json" with { type: "json" };
import pulseFlowmeterHallTemplateProject from "./fixtures/pulse-flowmeter-hall-template.project.minimal.json" with { type: "json" };
import runHoursTemplate from "./fixtures/run-hours-template.object-template.json" with { type: "json" };
import runHoursTemplateProject from "./fixtures/run-hours-template.project.minimal.json" with { type: "json" };
import timedRelayTemplate from "./fixtures/timed-relay-template.object-template.json" with { type: "json" };
import timedRelayTemplateProject from "./fixtures/timed-relay-template.project.minimal.json" with { type: "json" };
import invalidMissingBaseTypeRefProject from "./fixtures/template-invalid-missing-base-type-ref.project.json" with { type: "json" };
import invalidMissingTemplateRefProject from "./fixtures/template-invalid-missing-template-ref.project.json" with { type: "json" };
import invalidMismatchedTypeRefProject from "./fixtures/template-invalid-mismatched-type-ref.project.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

function buildTemplateFixtureProject(project_id: string, title: string, templateKey: string, template: unknown) {
  return {
    schema_version: "0.4.0",
    meta: {
      project_id,
      title
    },
    imports: {
      libraries: ["std"],
      packages: []
    },
    definitions: {
      object_types: {},
      templates: {
        [templateKey]: template
      }
    },
    system: {
      instances: {},
      signals: {}
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

test("timed relay template contract fixture stays structurally valid", () => {
  const project = buildTemplateFixtureProject(
    "timed_relay_template_fixture",
    "Timed Relay Template Fixture",
    "timed_relay_service_preset",
    timedRelayTemplate
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pulse flowmeter hall template contract fixture stays structurally valid", () => {
  const project = buildTemplateFixtureProject(
    "pulse_flowmeter_hall_template_fixture",
    "Pulse Flowmeter Hall Template Fixture",
    "pulse_flowmeter_hall_preset",
    pulseFlowmeterHallTemplate
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("run hours template contract fixture stays structurally valid", () => {
  const project = buildTemplateFixtureProject(
    "run_hours_template_fixture",
    "Run Hours Template Fixture",
    "run_hours_service_preset",
    runHoursTemplate
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("project-saved maintenance template contract fixture stays structurally valid", () => {
  const project = buildTemplateFixtureProject(
    "project_saved_maintenance_template_fixture",
    "Project Saved Maintenance Template Fixture",
    "maintenance_service_saved",
    projectSavedMaintenanceTemplate
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("template minimal projects stay structurally valid", () => {
  for (const project of [
    timedRelayTemplateProject,
    pulseFlowmeterHallTemplateProject,
    runHoursTemplateProject,
    projectSavedMaintenanceTemplateProject
  ]) {
    const result = validateProjectModel(project);
    assert.equal(result.ok, true);
    assert.equal(result.diagnostics.length, 0);
  }
});

test("invalid template fixture missing base_type_ref is rejected", () => {
  const result = validateProjectModel(invalidMissingBaseTypeRefProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "field.string" &&
    entry.path === "$.definitions.templates.broken_template.base_type_ref"
  )));
});

test("invalid template fixture with unresolved template_ref is rejected", () => {
  const result = validateProjectModel(invalidMissingTemplateRefProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "object_instance.template_ref.unresolved" &&
    entry.path === "$.system.instances.relay_1.template_ref"
  )));
});

test("invalid template fixture with mismatched type_ref is rejected", () => {
  const result = validateProjectModel(invalidMismatchedTypeRefProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "object_instance.template_ref.type_mismatch" &&
    entry.path === "$.system.instances.flowmeter_1.template_ref"
  )));
});
