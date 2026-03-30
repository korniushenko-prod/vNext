import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import boilerSupervisorArbitrationArtifact from "./fixtures/boiler-supervisor-arbitration.shipcontroller-artifact.json" with { type: "json" };
import pumpSkidSupervisorArbitrationArtifact from "./fixtures/pump-skid-supervisor-arbitration.shipcontroller-artifact.json" with { type: "json" };
import {
  buildSyntheticPackageArbitrationSnapshots,
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact,
  esp32CapabilityProfile
} from "../src/index.js";
import {
  boilerSupervisorArbitrationRuntimePack,
  pumpSkidSupervisorArbitrationRuntimePack
} from "./runtime-pack-fixtures.js";

test("boiler-like package arbitration runtime pack closes compatibility, snapshot and artifact path", () => {
  const compatibility = checkEsp32Compatibility(boilerSupervisorArbitrationRuntimePack);
  assert.equal(compatibility.ok, true);

  const snapshots = buildSyntheticPackageArbitrationSnapshots(boilerSupervisorArbitrationRuntimePack);
  assert.equal(snapshots.boiler_supervisor_arbitration_1.state, "accepted");
  assert.equal(snapshots.boiler_supervisor_arbitration_1.command_lane_states?.start_service.superseded_by_lane_id, "enable_auto");

  const artifact = emitShipControllerConfigArtifact(boilerSupervisorArbitrationRuntimePack);
  assert.equal(artifact.artifacts.package_arbitration?.[0]?.ownership_lanes.length, 4);
  assert.equal(artifact.artifacts.package_arbitration?.[0]?.command_lanes.length, 4);
  assert.equal(canonicalStringify(artifact), canonicalStringify(boilerSupervisorArbitrationArtifact));
});

test("pump-skid package arbitration runtime pack keeps the same package-neutral target baseline", () => {
  const compatibility = checkEsp32Compatibility(pumpSkidSupervisorArbitrationRuntimePack);
  assert.equal(compatibility.ok, true);

  const snapshots = buildSyntheticPackageArbitrationSnapshots(pumpSkidSupervisorArbitrationRuntimePack);
  assert.equal(snapshots.pump_skid_supervisor_arbitration_1.state, "accepted");
  assert.equal(snapshots.pump_skid_supervisor_arbitration_1.command_lane_states?.disable_service.arbitration_result, "blocked");

  const artifact = emitShipControllerConfigArtifact(pumpSkidSupervisorArbitrationRuntimePack);
  assert.equal(artifact.artifacts.package_arbitration?.[0]?.ownership_summary.active_lane_ids[0], "auto_owner");
  assert.equal(canonicalStringify(artifact), canonicalStringify(pumpSkidSupervisorArbitrationArtifact));
});

test("package arbitration disabled by target produces the canonical diagnostic", () => {
  const previous = esp32CapabilityProfile.package_arbitration_support?.enabled;
  if (esp32CapabilityProfile.package_arbitration_support) {
    esp32CapabilityProfile.package_arbitration_support.enabled = false;
  }

  try {
    const compatibility = checkEsp32Compatibility(boilerSupervisorArbitrationRuntimePack);
    assert.equal(compatibility.ok, false);
    assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_arbitration.unsupported"));
  } finally {
    if (esp32CapabilityProfile.package_arbitration_support) {
      esp32CapabilityProfile.package_arbitration_support.enabled = previous ?? true;
    }
  }
});

test("unsupported package arbitration request kind produces the canonical diagnostic", () => {
  const mutated = structuredClone(boilerSupervisorArbitrationRuntimePack) as RuntimePack;
  assert.ok(mutated.package_arbitration?.pkgarb_boiler_supervisor_arbitration_1);
  mutated.package_arbitration!.pkgarb_boiler_supervisor_arbitration_1.command_lanes.enable_auto.request_kind = "request_flush" as never;

  const compatibility = checkEsp32Compatibility(mutated);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_arbitration.request_kind.unsupported"));
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
        .filter(([, entry]) => entry !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)])
    );
  }

  return value;
}
