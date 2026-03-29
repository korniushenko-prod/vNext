import { strict as assert } from "node:assert";
import test from "node:test";

import compositionValid from "./fixtures/composition-valid.json" with { type: "json" };
import pidControllerObjectType from "./fixtures/pid-controller.object-type.json" with { type: "json" };
import pulseFlowmeterObjectType from "./fixtures/pulse-flowmeter.object-type.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

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
  const project = {
    schema_version: "0.4.0",
    meta: {
      project_id: "pulse_flowmeter_fixture",
      title: "Pulse Flowmeter Fixture"
    },
    imports: {
      libraries: ["std"],
      packages: []
    },
    definitions: {
      object_types: {
        pulse_flowmeter: pulseFlowmeterObjectType
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

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pid controller contract fixture stays structurally valid as a library object", () => {
  const project = {
    schema_version: "0.4.0",
    meta: {
      project_id: "pid_controller_fixture",
      title: "PID Controller Fixture"
    },
    imports: {
      libraries: ["std"],
      packages: []
    },
    definitions: {
      object_types: {
        pid_controller: pidControllerObjectType
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

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});
