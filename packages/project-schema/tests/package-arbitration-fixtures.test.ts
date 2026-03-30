import { strict as assert } from "node:assert";
import test from "node:test";

import boilerSupervisorArbitrationPackage from "./fixtures/boiler-supervisor-arbitration.package-definition.json" with { type: "json" };
import boilerSupervisorArbitrationProject from "./fixtures/boiler-supervisor-arbitration.project.e2e.json" with { type: "json" };
import invalidBlockedProject from "./fixtures/package-arbitration-invalid-blocked.project.json" with { type: "json" };
import invalidConflictProject from "./fixtures/package-arbitration-invalid-conflict.project.json" with { type: "json" };
import invalidDeniedProject from "./fixtures/package-arbitration-invalid-denied.project.json" with { type: "json" };
import invalidOwnershipProject from "./fixtures/package-arbitration-invalid-ownership.project.json" with { type: "json" };
import invalidRequestKindProject from "./fixtures/package-arbitration-invalid-request-kind.project.json" with { type: "json" };
import pumpSkidSupervisorArbitrationPackage from "./fixtures/pump-skid-supervisor-arbitration.package-definition.json" with { type: "json" };
import pumpSkidSupervisorArbitrationProject from "./fixtures/pump-skid-supervisor-arbitration.project.e2e.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("boiler-like package arbitration project stays structurally valid", () => {
  const result = validateProjectModel(boilerSupervisorArbitrationProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid package arbitration project stays structurally valid", () => {
  const result = validateProjectModel(pumpSkidSupervisorArbitrationProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("dual-domain package arbitration contracts stay generic across request kinds and ownership lanes", () => {
  assert.deepEqual(
    Object.keys(boilerSupervisorArbitrationPackage.arbitration.command_lanes),
    ["enable_auto", "reset_service", "disable_remote", "start_service"]
  );
  assert.deepEqual(
    Object.keys(pumpSkidSupervisorArbitrationPackage.arbitration.command_lanes),
    ["start_auto", "disable_service", "reset_remote", "stop_manual"]
  );
  assert.deepEqual(
    Object.keys(boilerSupervisorArbitrationPackage.arbitration.ownership_lanes),
    ["auto_owner", "manual_owner", "service_owner", "remote_owner"]
  );
  assert.deepEqual(
    Object.keys(pumpSkidSupervisorArbitrationPackage.arbitration.ownership_lanes),
    ["auto_owner", "manual_owner", "service_owner", "remote_owner"]
  );
});

test("invalid package arbitration ownership lane is rejected", () => {
  const result = validateProjectModel(invalidOwnershipProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path.endsWith(".lane")));
});

test("invalid package arbitration denied request without reason is rejected", () => {
  const result = validateProjectModel(invalidDeniedProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_arbitration.denied_reason.missing"));
});

test("invalid package arbitration blocked request without reason is rejected", () => {
  const result = validateProjectModel(invalidBlockedProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_arbitration.blocked_reason.missing"));
});

test("invalid package arbitration unsupported request kind is rejected", () => {
  const result = validateProjectModel(invalidRequestKindProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path.endsWith(".request_kind")));
});

test("invalid package arbitration conflicting owners are rejected", () => {
  const result = validateProjectModel(invalidConflictProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_arbitration.ownership_summary.conflict"));
});
