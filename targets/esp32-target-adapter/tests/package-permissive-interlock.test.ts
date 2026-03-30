import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { materializeProject } from "@universal-plc/materializer-core";
import boilerSupervisorInterlocksProjectFixture from "./fixtures/boiler-supervisor-interlocks.project.minimal.json" with { type: "json" };
import pumpSkidSupervisorInterlocksProjectFixture from "./fixtures/pump-skid-supervisor-interlocks.project.minimal.json" with { type: "json" };
import { checkEsp32Compatibility } from "../src/compatibility.js";
import { emitShipControllerConfigArtifact } from "../src/emit-shipcontroller-config.js";
import { buildSyntheticPackagePermissiveInterlockSnapshots } from "../src/package-permissive-interlock.js";
import { esp32CapabilityProfile } from "../src/profile.js";

const boilerSupervisorInterlocksProject = boilerSupervisorInterlocksProjectFixture as ProjectModel;
const pumpSkidSupervisorInterlocksProject = pumpSkidSupervisorInterlocksProjectFixture as ProjectModel;

test("boiler-like package permissive/interlock project closes compatibility, snapshot and artifact path", () => {
  const materialized = materializeProject(boilerSupervisorInterlocksProject, {
    pack_id: "boiler-supervisor-interlocks-pack",
    generated_at: "2026-03-30T13:00:00Z"
  });

  assert.equal(materialized.ok, true);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);

  const snapshots = buildSyntheticPackagePermissiveInterlockSnapshots(materialized.pack);
  assert.equal(snapshots.boiler_supervisor_interlocks_1.state, "ready");
  assert.equal(snapshots.boiler_supervisor_interlocks_1.transition_guard_states?.allow_auto_run.state, "clear");

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(artifact.artifacts.package_permissive_interlock?.[0].gate_summary.transition_guards[0].mode_transition_id, "pkgmode_boiler_supervisor_interlocks_1.mode_transition.to_auto");
});

test("pump-skid package permissive/interlock project keeps the same package-neutral target baseline", () => {
  const materialized = materializeProject(pumpSkidSupervisorInterlocksProject, {
    pack_id: "pump-skid-supervisor-interlocks-pack",
    generated_at: "2026-03-30T13:05:00Z"
  });

  assert.equal(materialized.ok, true);

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  const gateArtifact = artifact.artifacts.package_permissive_interlock?.[0];
  assert.equal(gateArtifact?.interlocks.find((entry) => entry.id === "permissive_blocked")?.active_state, "held");
  assert.equal(gateArtifact?.permissives.find((entry) => entry.id === "suction_ok")?.qualified_id, "pkggate_pump_skid_supervisor_interlocks_1.perm.suction_ok");
});

test("package permissive/interlock disabled by target produces the canonical diagnostic", () => {
  const materialized = materializeProject(boilerSupervisorInterlocksProject, {
    pack_id: "boiler-supervisor-interlocks-disabled-pack",
    generated_at: "2026-03-30T13:10:00Z"
  });

  assert.equal(materialized.ok, true);

  const previous = esp32CapabilityProfile.package_permissive_interlock_support?.enabled;
  if (esp32CapabilityProfile.package_permissive_interlock_support) {
    esp32CapabilityProfile.package_permissive_interlock_support.enabled = false;
  }

  try {
    const compatibility = checkEsp32Compatibility(materialized.pack);
    assert.equal(compatibility.ok, false);
    assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_permissive_interlock.unsupported"));
  } finally {
    if (esp32CapabilityProfile.package_permissive_interlock_support) {
      esp32CapabilityProfile.package_permissive_interlock_support.enabled = previous ?? true;
    }
  }
});
