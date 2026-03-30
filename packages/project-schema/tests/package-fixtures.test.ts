import { strict as assert } from "node:assert";
import test from "node:test";

import boilerPackageInvalidSafetyScopeProject from "./fixtures/boiler-package-invalid-safety-scope.project.json" with { type: "json" };
import boilerPackageProject from "./fixtures/boiler-package-skeleton.project.minimal.json" with { type: "json" };
import boilerSupervisorProject from "./fixtures/boiler-supervisor.project.minimal.json" with { type: "json" };
import boilerSupervisorPackage from "./fixtures/boiler-supervisor.package-definition.json" with { type: "json" };
import minimalPackageDefinition from "./fixtures/minimal-package.package-definition.json" with { type: "json" };
import pumpSkidSupervisorPackage from "./fixtures/pump-skid-supervisor.package-definition.json" with { type: "json" };
import pumpSkidSupervisorProject from "./fixtures/pump-skid-supervisor.project.e2e.json" with { type: "json" };
import invalidMissingMetaProject from "./fixtures/package-invalid-missing-meta.project.json" with { type: "json" };
import invalidUnresolvedMemberProject from "./fixtures/package-invalid-unresolved-member.project.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

function buildPackageFixtureProject(
  project_id: string,
  title: string,
  packageKey: string,
  packageDefinition: unknown,
  templates: Record<string, unknown> = {}
) {
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

test("minimal package contract fixture stays structurally valid", () => {
  const project = buildPackageFixtureProject(
    "minimal_package_fixture",
    "Minimal Package Fixture",
    "minimal_service_package",
    minimalPackageDefinition
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("boiler supervisor package contract fixture stays structurally valid", () => {
  const project = buildPackageFixtureProject(
    "boiler_supervisor_fixture",
    "Boiler Supervisor Fixture",
    "boiler_supervisor",
    boilerSupervisorPackage,
    boilerPackageProject.definitions.templates
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("boiler package minimal project stays structurally valid", () => {
  const result = validateProjectModel(boilerPackageProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("boiler package skeleton minimal project keeps frozen Wave 10 boundaries", () => {
  const skeletonContract = boilerPackageProject.definitions.packages.boiler_supervisor;

  assert.equal(skeletonContract.meta.package_kind, "boiler_supervisor_skeleton_v1");
  assert.equal(skeletonContract.meta.safety_scope, "non_safety_skeleton");
  assert.ok(skeletonContract.boundary_notes.some((entry: string) => entry.includes("non-safety")));
  assert.ok(skeletonContract.members.pid_1);
  assert.ok(skeletonContract.members.run_hours_1.template_ref);
  assert.ok(skeletonContract.bindings.runtime_active_source);
});

test("boiler supervisor minimal project stays structurally valid", () => {
  const result = validateProjectModel(boilerSupervisorProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid supervisor pilot package contract stays structurally valid", () => {
  const project = {
    schema_version: "0.4.0",
    meta: {
      project_id: "pump_skid_supervisor_fixture",
      title: "Pump Skid Supervisor Fixture"
    },
    imports: {
      libraries: ["std"],
      packages: []
    },
    definitions: {
      object_types: pumpSkidSupervisorProject.definitions.object_types,
      templates: pumpSkidSupervisorProject.definitions.templates,
      packages: {
        [pumpSkidSupervisorPackage.id]: pumpSkidSupervisorPackage
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

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid supervisor pilot project stays structurally valid", () => {
  const result = validateProjectModel(pumpSkidSupervisorProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid supervisor package exposes bounded pilot-track metadata only", () => {
  assert.equal(pumpSkidSupervisorPackage.meta.package_kind, "pump_skid_supervisor_v1");
  assert.equal(pumpSkidSupervisorPackage.meta.safety_scope, "non_safety_skeleton");
  assert.ok(pumpSkidSupervisorPackage.members.pump_cmd_1);
  assert.ok(pumpSkidSupervisorPackage.members.run_hours_1.template_ref);
  assert.ok(pumpSkidSupervisorPackage.presets.single_pump_with_run_hours);
  assert.ok(pumpSkidSupervisorPackage.boundary_notes.some((entry: string) => entry.includes("pilot")));
});

test("boiler supervisor package exposes canonical package supervision facets", () => {
  assert.equal(boilerSupervisorPackage.meta.package_kind, "boiler_supervisor_v1");
  assert.equal(boilerSupervisorPackage.meta.safety_scope, "non_safety_skeleton");
  assert.equal(Object.keys(boilerSupervisorPackage.supervision.summary_outputs).length, 6);
  assert.equal(Object.keys(boilerSupervisorPackage.supervision.trace_groups).length, 2);
  assert.equal(Object.keys(boilerSupervisorPackage.supervision.operation_proxies).length, 4);
  assert.ok(boilerSupervisorPackage.boundary_notes.some((entry) => entry.includes("authoring-level aggregation")));
});

test("invalid package fixture missing meta is rejected", () => {
  const result = validateProjectModel(invalidMissingMetaProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "field.object" &&
    entry.path === "$.definitions.packages.broken_package.meta"
  )));
});

test("invalid package fixture with unresolved member refs is rejected", () => {
  const result = validateProjectModel(invalidUnresolvedMemberProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "package_member.type_ref.unresolved" &&
    entry.path === "$.definitions.packages.broken_package.members.missing_object.type_ref"
  )));
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "package_member.template_ref.unresolved" &&
    entry.path === "$.definitions.packages.broken_package.members.missing_object.template_ref"
  )));
});

test("invalid boiler skeleton fixture with safety scope is rejected", () => {
  const result = validateProjectModel(boilerPackageInvalidSafetyScopeProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "package.safety_scope.forbidden" &&
    entry.path === "$.definitions.packages.boiler_supervisor.meta.safety_scope"
  )));
});
