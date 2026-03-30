import { strict as assert } from "node:assert";
import test from "node:test";

import boilerSupervisorModesProjectFixture from "./fixtures/boiler-supervisor-modes.project.minimal.json" with { type: "json" };
import pumpSkidSupervisorModesProjectFixture from "./fixtures/pump-skid-supervisor-modes.project.minimal.json" with { type: "json" };
import type { ProjectModel } from "@universal-plc/project-schema";
import { materializeProject } from "../src/index.js";

const boilerSupervisorModesProject = boilerSupervisorModesProjectFixture as ProjectModel;
const pumpSkidSupervisorModesProject = pumpSkidSupervisorModesProjectFixture as ProjectModel;

test("boiler supervisor modes project flattens package mode/phase into a target-neutral runtime section", () => {
  const result = materializeProject(boilerSupervisorModesProject, {
    pack_id: "boiler-supervisor-modes-demo-pack",
    generated_at: "2026-03-30T23:50:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_mode_phase?.pkgmode_boiler_supervisor_modes_1);
  assert.equal(result.pack.package_mode_phase?.pkgmode_boiler_supervisor_modes_1.active_mode_id, "pkgmode_boiler_supervisor_modes_1.mode.standby");
  assert.equal(result.pack.package_mode_phase?.pkgmode_boiler_supervisor_modes_1.active_phase_id, "pkgmode_boiler_supervisor_modes_1.phase.precheck");
  assert.equal(result.pack.package_mode_phase?.pkgmode_boiler_supervisor_modes_1.package_supervision_id, undefined);
});

test("pump skid supervisor modes project flattens package mode/phase into a target-neutral runtime section", () => {
  const result = materializeProject(pumpSkidSupervisorModesProject, {
    pack_id: "pump-skid-supervisor-modes-demo-pack",
    generated_at: "2026-03-30T23:55:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_modes_1);
  assert.equal(result.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_modes_1.modes.auto.qualified_id, "pkgmode_pump_skid_supervisor_modes_1.mode.auto");
  assert.equal(result.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_modes_1.phase_summary.entries.ready_summary.phase_id, "pkgmode_pump_skid_supervisor_modes_1.phase.ready");
});

test("broken package mode/phase active mode ref produces the canonical materializer diagnostic", () => {
  const project = structuredClone(pumpSkidSupervisorModesProject);
  assert.ok(project.definitions.packages?.pump_skid_supervisor_modes?.mode_phase);
  project.definitions.packages.pump_skid_supervisor_modes.mode_phase.active_mode_ref = "missing_mode";

  const result = materializeProject(project, {
    pack_id: "pump-skid-supervisor-modes-invalid-pack",
    generated_at: "2026-03-31T00:00:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.active_mode.unresolved"));
});
