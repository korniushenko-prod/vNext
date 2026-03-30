import { strict as assert } from "node:assert";
import test from "node:test";

import compositionValid from "./fixtures/composition-valid.json" with { type: "json" };
import eventCounterObjectType from "./fixtures/event-counter.object-type.json" with { type: "json" };
import maintenanceCounterObjectType from "./fixtures/maintenance-counter.object-type.json" with { type: "json" };
import pidControllerObjectType from "./fixtures/pid-controller.object-type.json" with { type: "json" };
import pulseFlowmeterObjectType from "./fixtures/pulse-flowmeter.object-type.json" with { type: "json" };
import runHoursCounterObjectType from "./fixtures/run-hours-counter.object-type.json" with { type: "json" };
import thresholdMonitorObjectType from "./fixtures/threshold-monitor.object-type.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

function buildLibraryFixtureProject(project_id: string, title: string, objectKey: string, objectType: unknown) {
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
      object_types: {
        [objectKey]: objectType
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

test("composition fixture passes structural validation", () => {
  const result = validateProjectModel(compositionValid);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("composition fixture keeps composition route endpoint kinds constrained", () => {
  const burnerSequence = compositionValid.definitions.object_types.burner_sequence;
  const routes = burnerSequence.implementation.composition?.routes ?? {};
  for (const route of Object.values(routes)) {
    assert.ok(route.from.kind === "parent_port" || route.from.kind === "instance_port");
    assert.ok(route.to.kind === "parent_port" || route.to.kind === "instance_port");
  }
});

test("pulse flowmeter contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "pulse_flowmeter_fixture",
    "Pulse Flowmeter Fixture",
    "pulse_flowmeter",
    pulseFlowmeterObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pid controller contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "pid_controller_fixture",
    "PID Controller Fixture",
    "pid_controller",
    pidControllerObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("run hours counter contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "run_hours_counter_fixture",
    "Run Hours Counter Fixture",
    "run_hours_counter",
    runHoursCounterObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("event counter contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "event_counter_fixture",
    "Event Counter Fixture",
    "event_counter",
    eventCounterObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("threshold monitor contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "threshold_monitor_fixture",
    "Threshold Monitor Fixture",
    "threshold_monitor",
    thresholdMonitorObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("maintenance counter contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "maintenance_counter_fixture",
    "Maintenance Counter Fixture",
    "maintenance_counter",
    maintenanceCounterObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pid controller contract fixture exposes additive autotune operation metadata", () => {
  const autotune = pidControllerObjectType.facets?.operations?.operations?.autotune;

  assert.ok(autotune);
  assert.equal(autotune.kind, "autotune");
  assert.equal(autotune.confirmation_policy, "required");
  assert.deepEqual(autotune.safe_when, ["enabled", "manual_mode"]);
  assert.deepEqual(autotune.progress_signals, ["loop_ok", "in_auto", "saturated"]);
  assert.deepEqual(autotune.result_fields, [
    "completed",
    "recommended_kp",
    "recommended_ti",
    "recommended_td",
    "summary"
  ]);
});
