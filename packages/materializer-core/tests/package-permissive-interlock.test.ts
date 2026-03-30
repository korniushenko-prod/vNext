import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import boilerSupervisorInterlocksProjectFixture from "./fixtures/boiler-supervisor-interlocks.project.minimal.json" with { type: "json" };
import invalidPermissiveRefProjectFixture from "./fixtures/package-permissive-interlock-invalid-ref.project.json" with { type: "json" };
import pumpSkidSupervisorInterlocksProjectFixture from "./fixtures/pump-skid-supervisor-interlocks.project.minimal.json" with { type: "json" };
import { materializeProject } from "../src/index.js";

const boilerSupervisorInterlocksProject = boilerSupervisorInterlocksProjectFixture as ProjectModel;
const pumpSkidSupervisorInterlocksProject = pumpSkidSupervisorInterlocksProjectFixture as ProjectModel;
const invalidPermissiveRefProject = invalidPermissiveRefProjectFixture as ProjectModel;

test("boiler-like package permissive/interlock project materializes into a package-neutral runtime section", () => {
  const result = materializeProject(boilerSupervisorInterlocksProject, {
    pack_id: "boiler-supervisor-interlocks-pack",
    generated_at: "2026-03-30T12:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_permissive_interlock?.pkggate_boiler_supervisor_interlocks_1);
  assert.equal(
    result.pack.package_permissive_interlock?.pkggate_boiler_supervisor_interlocks_1.permissives.feedwater_ok.qualified_id,
    "pkggate_boiler_supervisor_interlocks_1.perm.feedwater_ok"
  );
  assert.equal(
    result.pack.package_permissive_interlock?.pkggate_boiler_supervisor_interlocks_1.gate_summary.transition_guards?.allow_auto_run.mode_transition_id,
    "pkgmode_boiler_supervisor_interlocks_1.mode_transition.to_auto"
  );
});

test("pump-skid package permissive/interlock project materializes into the same package-neutral runtime shape", () => {
  const result = materializeProject(pumpSkidSupervisorInterlocksProject, {
    pack_id: "pump-skid-supervisor-interlocks-pack",
    generated_at: "2026-03-30T12:35:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_permissive_interlock?.pkggate_pump_skid_supervisor_interlocks_1);
  assert.equal(
    result.pack.package_permissive_interlock?.pkggate_pump_skid_supervisor_interlocks_1.interlocks.package_faulted.active_state,
    "faulted"
  );
  assert.equal(
    result.pack.package_permissive_interlock?.pkggate_pump_skid_supervisor_interlocks_1.gate_summary.transition_guards?.allow_auto_run.mode_transition_id,
    "pkgmode_pump_skid_supervisor_interlocks_1.mode_transition.to_auto"
  );
});

test("broken package permissive/interlock refs produce canonical materializer diagnostics", () => {
  const result = materializeProject(invalidPermissiveRefProject, {
    pack_id: "package-permissive-interlock-invalid-pack",
    generated_at: "2026-03-30T12:40:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_permissive_interlock.permissive_ref.unresolved"));
});
