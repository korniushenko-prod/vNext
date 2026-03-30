import { strict as assert } from "node:assert";
import test from "node:test";

import commBridgeObjectType from "./fixtures/comm-bridge.object-type.json" with { type: "json" };
import commBridgeProject from "./fixtures/comm-bridge.project.minimal.json" with { type: "json" };
import modbusRtuBusFrontendContract from "./fixtures/modbus-rtu-bus-frontend.contract.json" with { type: "json" };
import pollScheduleContract from "./fixtures/poll-schedule.contract.json" with { type: "json" };
import registerMapContract from "./fixtures/register-map.contract.json" with { type: "json" };
import remotePointInvalidMissingBridgeRefProject from "./fixtures/remote-point-invalid-missing-bridge-ref.project.json" with { type: "json" };
import remotePointInvalidWriteCommandProject from "./fixtures/remote-point-invalid-write-command.project.json" with { type: "json" };
import remotePointFrontendObjectType from "./fixtures/remote-point-frontend.object-type.json" with { type: "json" };
import remotePointFrontendProject from "./fixtures/remote-point-frontend.project.minimal.json" with { type: "json" };
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

test("comm bridge contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "comm_bridge_fixture",
    "Comm Bridge Fixture",
    "comm_bridge",
    commBridgeObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("remote point frontend contract fixture stays structurally valid as a library object", () => {
  const project = buildLibraryFixtureProject(
    "remote_point_frontend_fixture",
    "Remote Point Frontend Fixture",
    "remote_point_frontend",
    remotePointFrontendObjectType
  );

  const result = validateProjectModel(project);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("comms support contracts stay locked to Modbus RTU read-only baseline", () => {
  assert.equal(modbusRtuBusFrontendContract.id, "support.modbus_rtu_bus_frontend.v1");
  assert.equal(modbusRtuBusFrontendContract.scope, "read_only_baseline");
  assert.deepEqual(modbusRtuBusFrontendContract.params, [
    "port_ref",
    "baud_rate",
    "parity",
    "stop_bits",
    "slave_id",
    "timeout_ms"
  ]);

  assert.equal(registerMapContract.id, "support.register_map.v1");
  assert.equal(registerMapContract.scope, "single_point_baseline");
  assert.deepEqual(registerMapContract.fields, [
    "register_address",
    "register_kind",
    "register_count",
    "byte_order",
    "word_order",
    "value_decode"
  ]);

  assert.equal(pollScheduleContract.id, "support.poll_schedule.v1");
  assert.equal(pollScheduleContract.scope, "read_only_baseline");
  assert.deepEqual(pollScheduleContract.fields, [
    "poll_period_ms",
    "startup_delay_ms",
    "stale_timeout_ms"
  ]);
});

test("communications baseline minimal projects stay structurally valid", () => {
  const commBridgeResult = validateProjectModel(commBridgeProject);
  assert.equal(commBridgeResult.ok, true);
  assert.equal(commBridgeResult.diagnostics.length, 0);

  const remotePointResult = validateProjectModel(remotePointFrontendProject);
  assert.equal(remotePointResult.ok, true);
  assert.equal(remotePointResult.diagnostics.length, 0);
});

test("invalid communications fixtures are caught by the PR-16A semantic gate", () => {
  const missingBridgeStructure = validateProjectModel(remotePointInvalidMissingBridgeRefProject);
  assert.equal(missingBridgeStructure.ok, true);

  const missingBridgeGate = validatePr16aRemotePointBaseline(remotePointInvalidMissingBridgeRefProject);
  assert.equal(missingBridgeGate.ok, false);
  assert.ok(missingBridgeGate.diagnostics.some((entry) => entry.code === "pr16a.remote_point.bridge_ref.missing"));

  const writeCommandStructure = validateProjectModel(remotePointInvalidWriteCommandProject);
  assert.equal(writeCommandStructure.ok, true);

  const writeCommandGate = validatePr16aRemotePointBaseline(remotePointInvalidWriteCommandProject);
  assert.equal(writeCommandGate.ok, false);
  assert.ok(writeCommandGate.diagnostics.some((entry) => entry.code === "pr16a.remote_point.write_param.unsupported"));
});

function validatePr16aRemotePointBaseline(project: unknown): {
  ok: boolean;
  diagnostics: Array<{ code: string; path: string }>;
} {
  const diagnostics: Array<{ code: string; path: string }> = [];

  if (!project || typeof project !== "object") {
    return {
      ok: false,
      diagnostics: [{ code: "pr16a.project.invalid", path: "$" }]
    };
  }

  const instances = (project as {
    system?: { instances?: Record<string, { type_ref?: string; param_values?: Record<string, unknown> }> };
  }).system?.instances ?? {};

  for (const [instanceId, instance] of Object.entries(instances)) {
    if (instance.type_ref !== "library:std/remote_point_frontend") {
      continue;
    }

    const paramValues = instance.param_values ?? {};
    const path = `$.system.instances.${instanceId}.param_values`;

    if (!("bridge_ref" in paramValues)) {
      diagnostics.push({
        code: "pr16a.remote_point.bridge_ref.missing",
        path: `${path}.bridge_ref`
      });
    }

    for (const forbiddenParam of ["write_enabled", "write_command", "write_value"]) {
      if (forbiddenParam in paramValues) {
        diagnostics.push({
          code: "pr16a.remote_point.write_param.unsupported",
          path: `${path}.${forbiddenParam}`
        });
      }
    }
  }

  return {
    ok: diagnostics.length === 0,
    diagnostics
  };
}
