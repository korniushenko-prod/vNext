import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { validateRuntimePack } from "@universal-plc/runtime-pack-schema";

import pumpSkidSupervisorPilotProject from "./fixtures/pump-skid-supervisor.project.e2e.json" with { type: "json" };
import pumpSkidSupervisorPilotRuntimeSnapshot from "./fixtures/pump-skid-supervisor.runtime-pack.snapshot.json" with { type: "json" };

import { materializeProject } from "../src/index.js";

test("pump-skid supervisor pilot project materializes into the bounded MVP runtime pack", () => {
  const result = materializeProject(pumpSkidSupervisorPilotProject as ProjectModel, {
    pack_id: "pump-skid-supervisor-demo-pack",
    generated_at: "2026-03-30T00:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
  assert.deepEqual(validateRuntimePack(result.pack).diagnostics, []);
  assert.ok(result.pack.package_supervision?.pkg_pump_skid_supervisor_1);
  assert.ok(result.pack.package_coordination?.pkgcoord_pump_skid_supervisor_1);
  assert.ok(result.pack.package_mode_phase?.pkgmode_pump_skid_supervisor_1);
  assert.ok(result.pack.package_permissive_interlock?.pkggate_pump_skid_supervisor_1);
  assert.ok(result.pack.package_protection_recovery?.pkgprotect_pump_skid_supervisor_1);
  assert.ok(result.pack.package_arbitration?.pkgarb_pump_skid_supervisor_1);
  assert.ok(result.pack.package_override_handover?.pkgho_pump_skid_supervisor_1);
  assert.equal(result.pack.instances.pump_skid_supervisor_1__run_hours_1.native_execution?.native_kind, "std.run_hours_counter.v1");
  assert.equal(result.pack.resources.hw_pressure_pv_1.binding_kind, "analog_in");
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pumpSkidSupervisorPilotRuntimeSnapshot)
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
