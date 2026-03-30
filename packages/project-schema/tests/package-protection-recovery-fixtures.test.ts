import { strict as assert } from "node:assert";
import test from "node:test";

import boilerSupervisorProtectionPackage from "./fixtures/boiler-supervisor-protection.package-definition.json" with { type: "json" };
import boilerSupervisorProtectionProject from "./fixtures/boiler-supervisor-protection.project.e2e.json" with { type: "json" };
import invalidReadyStateProject from "./fixtures/package-protection-recovery-invalid-ready-state.project.json" with { type: "json" };
import invalidRecoveryProject from "./fixtures/package-protection-recovery-invalid-recovery.project.json" with { type: "json" };
import invalidTripProject from "./fixtures/package-protection-recovery-invalid-trip.project.json" with { type: "json" };
import pumpSkidSupervisorProtectionPackage from "./fixtures/pump-skid-supervisor-protection.package-definition.json" with { type: "json" };
import pumpSkidSupervisorProtectionProject from "./fixtures/pump-skid-supervisor-protection.project.e2e.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("boiler-like package protection/recovery project stays structurally valid", () => {
  const result = validateProjectModel(boilerSupervisorProtectionProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid package protection/recovery project stays structurally valid", () => {
  const result = validateProjectModel(pumpSkidSupervisorProtectionProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("dual-domain package protection/recovery contracts stay package-neutral", () => {
  assert.deepEqual(Object.keys(boilerSupervisorProtectionPackage.protection_recovery.trips), ["pressure_trip"]);
  assert.deepEqual(Object.keys(boilerSupervisorProtectionPackage.protection_recovery.inhibits), ["feedwater_blocked"]);
  assert.deepEqual(Object.keys(pumpSkidSupervisorProtectionPackage.protection_recovery.trips), ["motor_trip"]);
  assert.deepEqual(Object.keys(pumpSkidSupervisorProtectionPackage.protection_recovery.inhibits), ["suction_blocked"]);
});

test("invalid package protection/recovery unresolved trip refs are rejected", () => {
  const result = validateProjectModel(invalidTripProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_protection_recovery.trip_ref.unresolved"));
});

test("invalid package protection/recovery unresolved target operations are rejected", () => {
  const result = validateProjectModel(invalidRecoveryProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_protection_recovery.recovery_request.target.unresolved"));
});

test("invalid package protection/recovery ready state cannot coexist with active trip refs", () => {
  const result = validateProjectModel(invalidReadyStateProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_protection_recovery.state_summary.inconsistent"));
});
