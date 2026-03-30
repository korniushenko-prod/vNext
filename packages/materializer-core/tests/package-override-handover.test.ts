import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { validateRuntimePack } from "@universal-plc/runtime-pack-schema";

import boilerSupervisorOverridesProject from "./fixtures/boiler-supervisor-overrides.project.e2e.json" with { type: "json" };
import boilerSupervisorOverridesRuntimeSnapshot from "./fixtures/boiler-supervisor-overrides.runtime-pack.snapshot.json" with { type: "json" };
import invalidBlockedProject from "./fixtures/package-override-handover-invalid-blocked.project.json" with { type: "json" };
import invalidHolderProject from "./fixtures/package-override-handover-invalid-holder.project.json" with { type: "json" };
import pumpSkidSupervisorOverridesProject from "./fixtures/pump-skid-supervisor-overrides.project.e2e.json" with { type: "json" };
import pumpSkidSupervisorOverridesRuntimeSnapshot from "./fixtures/pump-skid-supervisor-overrides.runtime-pack.snapshot.json" with { type: "json" };

import { materializeProject } from "../src/index.js";

function canonicalStringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

test("boiler-like package override/handover project flattens into a target-neutral runtime section", () => {
  const result = materializeProject(boilerSupervisorOverridesProject as ProjectModel, {
    pack_id: "boiler-supervisor-overrides-demo-pack",
    generated_at: "2026-03-30T23:59:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(canonicalStringify(result.pack), canonicalStringify(boilerSupervisorOverridesRuntimeSnapshot));
  assert.equal(validateRuntimePack(result.pack).ok, true);
  assert.equal(result.pack.package_override_handover?.pkgho_boiler_supervisor_overrides_1.handover_summary.current_holder_id, "manual_owner");
});

test("pump-skid package override/handover project flattens into the same generic runtime section", () => {
  const result = materializeProject(pumpSkidSupervisorOverridesProject as ProjectModel, {
    pack_id: "pump-skid-supervisor-overrides-demo-pack",
    generated_at: "2026-03-30T23:59:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(canonicalStringify(result.pack), canonicalStringify(pumpSkidSupervisorOverridesRuntimeSnapshot));
  assert.equal(validateRuntimePack(result.pack).ok, true);
  assert.equal(result.pack.package_override_handover?.pkgho_pump_skid_supervisor_overrides_1.handover_summary.current_lane, "auto");
});

test("invalid package override/handover blocked reason and holder mismatch stay canonical", () => {
  const blockedResult = materializeProject(invalidBlockedProject as ProjectModel, {
    pack_id: "package-override-handover-invalid-blocked-pack"
  });
  const holderResult = materializeProject(invalidHolderProject as ProjectModel, {
    pack_id: "package-override-handover-invalid-holder-pack"
  });

  assert.equal(blockedResult.ok, false);
  assert.ok(blockedResult.diagnostics.some((entry) => entry.code === "package_override_handover.blocked_reason.missing"));
  assert.equal(holderResult.ok, false);
  assert.ok(holderResult.diagnostics.some((entry) => entry.code === "package_override_handover.current_holder_lane.mismatch"));
});
