import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { validateRuntimePack } from "@universal-plc/runtime-pack-schema";

import boilerSupervisorModesExecutionProjectFixture from "./fixtures/boiler-supervisor-modes-execution.project.minimal.json" with { type: "json" };
import boilerSupervisorModesExecutionRuntimeSnapshot from "./fixtures/boiler-supervisor-modes-execution.runtime-pack.snapshot.json" with { type: "json" };
import invalidTransitionDiagnosticsSnapshot from "./fixtures/package-mode-execution-invalid-transition.diagnostics.snapshot.json" with { type: "json" };
import invalidTransitionProjectFixture from "./fixtures/package-mode-execution-invalid-transition.project.json" with { type: "json" };
import pumpSkidSupervisorModesExecutionProjectFixture from "./fixtures/pump-skid-supervisor-modes-execution.project.minimal.json" with { type: "json" };
import pumpSkidSupervisorModesExecutionRuntimeSnapshot from "./fixtures/pump-skid-supervisor-modes-execution.runtime-pack.snapshot.json" with { type: "json" };

import { materializeProject } from "../src/index.js";

const boilerSupervisorModesExecutionProject = boilerSupervisorModesExecutionProjectFixture as ProjectModel;
const pumpSkidSupervisorModesExecutionProject = pumpSkidSupervisorModesExecutionProjectFixture as ProjectModel;
const invalidTransitionProject = invalidTransitionProjectFixture as ProjectModel;

test("boiler-like package execution project materializes package-neutral transition metadata", () => {
  const result = materializeProject(boilerSupervisorModesExecutionProject, {
    pack_id: "boiler-supervisor-modes-execution-pack",
    generated_at: "2026-03-30T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(validateRuntimePack(result.pack).diagnostics, []);
  assert.equal(result.pack.package_mode_runtime_contract?.package_mode_execution_supported, true);
  assert.deepEqual(
    result.pack.package_mode_runtime_contract?.supported_intents,
    ["request_mode_change", "request_phase_start", "request_phase_abort"]
  );
  assert.equal(
    result.pack.package_mode_phase?.pkgmode_boiler_supervisor_modes_execution_1.allowed_phase_transitions?.start_run.phase_state,
    "ready"
  );
  assert.equal(
    result.pack.package_mode_phase?.pkgmode_boiler_supervisor_modes_execution_1.allowed_phase_transitions?.abort_shutdown.guard_state,
    "blocked"
  );
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(boilerSupervisorModesExecutionRuntimeSnapshot)
  );
});

test("pump-skid package execution project materializes the same bounded transition baseline", () => {
  const result = materializeProject(pumpSkidSupervisorModesExecutionProject, {
    pack_id: "pump-skid-supervisor-modes-execution-pack",
    generated_at: "2026-03-30T12:05:00Z"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(validateRuntimePack(result.pack).diagnostics, []);
  assert.equal(
    result.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_modes_execution_1.allowed_mode_transitions?.to_service.intent,
    "request_mode_change"
  );
  assert.equal(
    result.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_modes_execution_1.allowed_phase_transitions?.abort_flush.transition_state,
    "running"
  );
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pumpSkidSupervisorModesExecutionRuntimeSnapshot)
  );
});

test("invalid package transition config keeps the canonical diagnostics", () => {
  const result = materializeProject(invalidTransitionProject, {
    pack_id: "package-mode-execution-invalid-pack",
    generated_at: "2026-03-30T12:10:00Z"
  });

  assert.equal(result.ok, false);
  assert.equal(
    canonicalStringify(result.diagnostics),
    canonicalStringify(invalidTransitionDiagnosticsSnapshot)
  );
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
