import { strict as assert } from "node:assert";
import test from "node:test";

import boilerSupervisorOverridesPackage from "./fixtures/boiler-supervisor-overrides.package-definition.json" with { type: "json" };
import boilerSupervisorOverridesProject from "./fixtures/boiler-supervisor-overrides.project.e2e.json" with { type: "json" };
import invalidBlockedProject from "./fixtures/package-override-handover-invalid-blocked.project.json" with { type: "json" };
import invalidDeniedProject from "./fixtures/package-override-handover-invalid-denied.project.json" with { type: "json" };
import invalidHolderProject from "./fixtures/package-override-handover-invalid-holder.project.json" with { type: "json" };
import pumpSkidSupervisorOverridesPackage from "./fixtures/pump-skid-supervisor-overrides.package-definition.json" with { type: "json" };
import pumpSkidSupervisorOverridesProject from "./fixtures/pump-skid-supervisor-overrides.project.e2e.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("boiler-like package override/handover project stays structurally valid", () => {
  const result = validateProjectModel(boilerSupervisorOverridesProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("pump-skid package override/handover project stays structurally valid", () => {
  const result = validateProjectModel(pumpSkidSupervisorOverridesProject);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("dual-domain package override/handover contracts stay generic across holder lanes and handover requests", () => {
  assert.deepEqual(
    Object.keys(boilerSupervisorOverridesPackage.override_handover.authority_holders),
    ["auto_owner", "manual_owner", "service_owner", "remote_owner"]
  );
  assert.deepEqual(
    Object.keys(pumpSkidSupervisorOverridesPackage.override_handover.authority_holders),
    ["auto_owner", "manual_owner", "service_owner", "remote_owner"]
  );
  assert.deepEqual(
    Object.keys(boilerSupervisorOverridesPackage.override_handover.handover_requests),
    ["service_takeover", "release_to_auto", "return_to_auto", "remote_takeover"]
  );
  assert.deepEqual(
    Object.keys(pumpSkidSupervisorOverridesPackage.override_handover.handover_requests),
    ["manual_takeover", "service_takeover", "return_to_auto", "remote_release"]
  );
});

test("invalid package override/handover blocked request without reason is rejected", () => {
  const result = validateProjectModel(invalidBlockedProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_override_handover.blocked_reason.missing"));
});

test("invalid package override/handover denied request without reason is rejected", () => {
  const result = validateProjectModel(invalidDeniedProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_override_handover.denied_reason.missing"));
});

test("invalid package override/handover holder lane mismatch is rejected", () => {
  const result = validateProjectModel(invalidHolderProject);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_override_handover.current_holder_lane.mismatch"));
});
