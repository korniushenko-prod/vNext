import { strict as assert } from "node:assert";
import test from "node:test";

import pumpSkidSupervisorArtifact from "./fixtures/pump-skid-supervisor.shipcontroller-artifact.json" with { type: "json" };
import pumpSkidSupervisorReadback from "./fixtures/pump-skid-supervisor.readback.snapshot.json" with { type: "json" };
import { pumpSkidSupervisorPilotRuntimePack } from "./runtime-pack-fixtures.js";

import { createEsp32TargetAdapter, emitShipControllerConfigArtifact } from "../src/index.js";

test("pump-skid supervisor pilot artifact stays deterministic and production-like", () => {
  const artifact = emitShipControllerConfigArtifact(pumpSkidSupervisorPilotRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "pump-skid-supervisor-demo-pack");
  assert.equal(artifact.artifacts.package_supervision?.length, 1);
  assert.equal(artifact.artifacts.package_coordination?.length, 1);
  assert.equal(artifact.artifacts.package_mode_phase?.length, 1);
  assert.equal(artifact.artifacts.package_permissive_interlock?.length, 1);
  assert.equal(artifact.artifacts.package_protection_recovery?.length, 1);
  assert.equal(artifact.artifacts.package_arbitration?.length, 1);
  assert.equal(artifact.artifacts.package_override_handover?.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(pumpSkidSupervisorArtifact));
});

test("pump-skid supervisor pilot apply and readback close the first stateful commissioning loop", async () => {
  const adapter = createEsp32TargetAdapter();
  const applyResult = await adapter.apply({
    request_id: "pilot-apply-1",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: pumpSkidSupervisorPilotRuntimePack.pack_id,
      schema_version: pumpSkidSupervisorPilotRuntimePack.schema_version
    },
    options: {
      runtime_pack: pumpSkidSupervisorPilotRuntimePack
    }
  });
  const readback = await adapter.readback({
    request_id: "pilot-readback-1",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "full"
  });

  assert.equal(applyResult.success, true);
  assert.ok(applyResult.artifacts.shipcontroller_config);
  assert.ok(applyResult.diagnostics.some((entry) => entry.code === "target.apply.applied"));
  assert.equal(readback.package_snapshots?.pump_skid_supervisor_1?.state, "healthy");
  assert.equal(readback.package_coordination_snapshots?.pump_skid_supervisor_1?.state, "circulation_active");
  assert.equal(readback.package_mode_phase_snapshots?.pkgmode_pump_skid_supervisor_1?.active_phase_id, "pkgmode_pump_skid_supervisor_1.phase.running");
  assert.equal((readback.resources.apply_status as { state?: string } | undefined)?.state, "applied");
  assert.equal(canonicalStringify(readback), canonicalStringify(pumpSkidSupervisorReadback));
});

test("pilot apply failure stays explicit and readback remains unavailable", async () => {
  const adapter = createEsp32TargetAdapter();
  const applyResult = await adapter.apply({
    request_id: "pilot-apply-fail",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: pumpSkidSupervisorPilotRuntimePack.pack_id,
      schema_version: pumpSkidSupervisorPilotRuntimePack.schema_version
    },
    options: {
      runtime_pack: pumpSkidSupervisorPilotRuntimePack,
      simulate_apply_failure: true
    }
  });
  const readback = await adapter.readback({
    request_id: "pilot-readback-fail",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "summary"
  });

  assert.equal(applyResult.success, false);
  assert.ok(applyResult.diagnostics.some((entry) => entry.code === "target.apply.failed"));
  assert.deepEqual(readback.package_snapshots, {});
  assert.ok(readback.diagnostics.some((entry) => entry.code === "target.readback.unsupported"));
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
