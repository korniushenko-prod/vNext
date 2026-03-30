import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import boilerSupervisorModesExecutionProjectFixture from "./fixtures/boiler-supervisor-modes-execution.project.minimal.json" with { type: "json" };
import boilerSupervisorModesExecutionArtifactSnapshot from "./fixtures/boiler-supervisor-modes-execution.shipcontroller-artifact.json" with { type: "json" };
import pumpSkidSupervisorModesExecutionProjectFixture from "./fixtures/pump-skid-supervisor-modes-execution.project.minimal.json" with { type: "json" };
import pumpSkidSupervisorModesExecutionArtifactSnapshot from "./fixtures/pump-skid-supervisor-modes-execution.shipcontroller-artifact.json" with { type: "json" };
import { materializeProject } from "@universal-plc/materializer-core";
import { checkEsp32Compatibility } from "../src/compatibility.js";
import { emitShipControllerConfigArtifact } from "../src/emit-shipcontroller-config.js";
import { invokeEsp32PackageModeTransition, buildSyntheticPackageModePhaseSnapshots } from "../src/package-mode-execution.js";
import { esp32CapabilityProfile } from "../src/profile.js";

const boilerSupervisorModesExecutionProject = boilerSupervisorModesExecutionProjectFixture as ProjectModel;
const pumpSkidSupervisorModesExecutionProject = pumpSkidSupervisorModesExecutionProjectFixture as ProjectModel;

test("boiler-like package execution closes compatibility, snapshot and artifact path", () => {
  const materialized = materializeProject(boilerSupervisorModesExecutionProject, {
    pack_id: "boiler-supervisor-modes-execution-pack",
    generated_at: "2026-03-30T12:00:00Z"
  });

  assert.equal(materialized.ok, true);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.guard.blocked"));

  const snapshots = buildSyntheticPackageModePhaseSnapshots(materialized.pack);
  assert.equal(snapshots.pkgmode_boiler_supervisor_modes_execution_1.transition_state, "running");
  assert.equal(snapshots.pkgmode_boiler_supervisor_modes_execution_1.transition_guard_states?.abort_shutdown, "blocked");

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(boilerSupervisorModesExecutionArtifactSnapshot)
  );
});

test("pump-skid package execution keeps the same target-neutral baseline", () => {
  const materialized = materializeProject(pumpSkidSupervisorModesExecutionProject, {
    pack_id: "pump-skid-supervisor-modes-execution-pack",
    generated_at: "2026-03-30T12:05:00Z"
  });

  assert.equal(materialized.ok, true);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.guard.blocked"));

  const invokeStart = invokeEsp32PackageModeTransition({
    package_instance_id: "pump_skid_supervisor_modes_execution_1",
    intent: "request_phase_start",
    target_phase_id: "pkgmode_pump_skid_supervisor_modes_execution_1.phase.run",
    confirmation_token: "confirm"
  });
  assert.equal(invokeStart.accepted, true);
  assert.equal(invokeStart.transition_state, "running");
  assert.equal(invokeStart.target_phase_state, "running");

  const invokeAbort = invokeEsp32PackageModeTransition({
    package_instance_id: "pump_skid_supervisor_modes_execution_1",
    intent: "request_phase_abort",
    target_phase_id: "pkgmode_pump_skid_supervisor_modes_execution_1.phase.flush",
    confirmation_token: "confirm"
  });
  assert.equal(invokeAbort.accepted, true);
  assert.equal(invokeAbort.transition_state, "cancelled");
  assert.equal(invokeAbort.target_phase_state, "aborted");

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(pumpSkidSupervisorModesExecutionArtifactSnapshot)
  );
});

test("package mode execution requires confirmation token for synthetic requests", () => {
  const result = invokeEsp32PackageModeTransition({
    package_instance_id: "pump_skid_supervisor_modes_execution_1",
    intent: "request_mode_change",
    target_mode_id: "pkgmode_pump_skid_supervisor_modes_execution_1.mode.service"
  });

  assert.equal(result.accepted, false);
  assert.equal(result.transition_state, "pending");
});

test("invalid package phase transition is rejected canonically at target compatibility", () => {
  const materialized = materializeProject(pumpSkidSupervisorModesExecutionProject, {
    pack_id: "pump-skid-supervisor-modes-execution-invalid-transition-pack",
    generated_at: "2026-03-30T12:10:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.ok(materialized.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_modes_execution_1);
  materialized.pack.package_mode_phase.pkgmode_pump_skid_supervisor_modes_execution_1.allowed_phase_transitions!.start_run.phase_id = "missing.phase.id";

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.phase_transition.invalid"));
});

test("unsupported package phase lane is rejected canonically at target compatibility", () => {
  const materialized = materializeProject(boilerSupervisorModesExecutionProject, {
    pack_id: "boiler-supervisor-modes-execution-invalid-lane-pack",
    generated_at: "2026-03-30T12:15:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.ok(materialized.pack.package_mode_phase?.pkgmode_boiler_supervisor_modes_execution_1);
  materialized.pack.package_mode_phase.pkgmode_boiler_supervisor_modes_execution_1.allowed_phase_transitions!.start_run.allowed_mode_ids = [
    "pkgmode_boiler_supervisor_modes_execution_1.mode.service"
  ];

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.phase_lane.unsupported"));
});

test("package mode execution disabled by target produces the canonical diagnostic", () => {
  const materialized = materializeProject(pumpSkidSupervisorModesExecutionProject, {
    pack_id: "pump-skid-supervisor-modes-execution-disabled-pack",
    generated_at: "2026-03-30T12:20:00Z"
  });

  assert.equal(materialized.ok, true);

  const previous = esp32CapabilityProfile.package_mode_phase_support?.package_mode_execution;
  if (esp32CapabilityProfile.package_mode_phase_support) {
    esp32CapabilityProfile.package_mode_phase_support.package_mode_execution = false;
  }

  try {
    const compatibility = checkEsp32Compatibility(materialized.pack);
    assert.equal(compatibility.ok, false);
    assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.disabled"));
  } finally {
    if (esp32CapabilityProfile.package_mode_phase_support) {
      esp32CapabilityProfile.package_mode_phase_support.package_mode_execution = previous;
    }
  }
});

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)])
    );
  }

  return value;
}
