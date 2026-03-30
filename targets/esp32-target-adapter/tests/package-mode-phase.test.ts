import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import boilerSupervisorModesProjectFixture from "./fixtures/boiler-supervisor-modes.project.minimal.json" with { type: "json" };
import pumpSkidSupervisorModesProjectFixture from "./fixtures/pump-skid-supervisor-modes.project.minimal.json" with { type: "json" };
import { materializeProject } from "@universal-plc/materializer-core";
import { checkEsp32Compatibility } from "../src/compatibility.js";
import { emitShipControllerConfigArtifact } from "../src/emit-shipcontroller-config.js";

const boilerSupervisorModesProject = boilerSupervisorModesProjectFixture as ProjectModel;
const pumpSkidSupervisorModesProject = pumpSkidSupervisorModesProjectFixture as ProjectModel;

test("boiler supervisor modes closes target compatibility and artifact path", () => {
  const materialized = materializeProject(boilerSupervisorModesProject, {
    pack_id: "boiler-supervisor-modes-demo-pack",
    generated_at: "2026-03-31T00:10:00Z"
  });

  assert.equal(materialized.ok, true);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(artifact.artifacts.package_mode_phase?.[0]?.active_mode_id, "pkgmode_boiler_supervisor_modes_1.mode.standby");
  assert.equal(artifact.artifacts.package_mode_phase?.[0]?.package_supervision_id, undefined);
});

test("pump skid supervisor modes closes target compatibility and artifact path", () => {
  const materialized = materializeProject(pumpSkidSupervisorModesProject, {
    pack_id: "pump-skid-supervisor-modes-demo-pack",
    generated_at: "2026-03-31T00:15:00Z"
  });

  assert.equal(materialized.ok, true);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(artifact.artifacts.package_mode_phase?.[0]?.active_mode_id, "pkgmode_pump_skid_supervisor_modes_1.mode.auto");
  assert.equal(artifact.artifacts.package_mode_phase?.[0]?.package_phase_groups.length, 2);
});

test("broken package mode/phase active ref is rejected canonically at target compatibility", () => {
  const materialized = materializeProject(pumpSkidSupervisorModesProject, {
    pack_id: "pump-skid-supervisor-modes-invalid-target-pack",
    generated_at: "2026-03-31T00:20:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.ok(materialized.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_modes_1);
  materialized.pack.package_mode_phase.pkgmode_pump_skid_supervisor_modes_1.active_phase_id = "missing.phase.id";

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_phase.active_phase.unresolved"));
});
