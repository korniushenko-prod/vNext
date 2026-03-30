import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import boilerSupervisorOverridesArtifact from "./fixtures/boiler-supervisor-overrides.shipcontroller-artifact.json" with { type: "json" };
import pumpSkidSupervisorOverridesArtifact from "./fixtures/pump-skid-supervisor-overrides.shipcontroller-artifact.json" with { type: "json" };
import {
  buildSyntheticPackageOverrideHandoverSnapshots,
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact,
  esp32CapabilityProfile
} from "../src/index.js";
import {
  boilerSupervisorOverridesRuntimePack,
  pumpSkidSupervisorOverridesRuntimePack
} from "./runtime-pack-fixtures.js";

test("boiler-like package override/handover runtime pack closes compatibility, snapshot and artifact path", () => {
  const compatibility = checkEsp32Compatibility(boilerSupervisorOverridesRuntimePack);
  assert.equal(compatibility.ok, true);

  const snapshots = buildSyntheticPackageOverrideHandoverSnapshots(boilerSupervisorOverridesRuntimePack);
  assert.equal(snapshots.boiler_supervisor_overrides_1.state, "accepted");
  assert.equal(snapshots.boiler_supervisor_overrides_1.handover_summary?.current_holder_id, "manual_owner");

  const artifact = emitShipControllerConfigArtifact(boilerSupervisorOverridesRuntimePack);
  assert.equal(artifact.artifacts.package_override_handover?.[0]?.authority_holders.length, 4);
  assert.equal(artifact.artifacts.package_override_handover?.[0]?.handover_requests.length, 4);
  assert.equal(canonicalStringify(artifact), canonicalStringify(boilerSupervisorOverridesArtifact));
});

test("pump-skid package override/handover runtime pack keeps the same package-neutral target baseline", () => {
  const compatibility = checkEsp32Compatibility(pumpSkidSupervisorOverridesRuntimePack);
  assert.equal(compatibility.ok, true);

  const snapshots = buildSyntheticPackageOverrideHandoverSnapshots(pumpSkidSupervisorOverridesRuntimePack);
  assert.equal(snapshots.pump_skid_supervisor_overrides_1.state, "accepted");
  assert.equal(snapshots.pump_skid_supervisor_overrides_1.handover_request_states?.service_takeover.state, "blocked");

  const artifact = emitShipControllerConfigArtifact(pumpSkidSupervisorOverridesRuntimePack);
  assert.equal(artifact.artifacts.package_override_handover?.[0]?.handover_summary.current_lane, "auto");
  assert.equal(canonicalStringify(artifact), canonicalStringify(pumpSkidSupervisorOverridesArtifact));
});

test("package override/handover disabled by target produces the canonical diagnostic", () => {
  const previous = esp32CapabilityProfile.package_override_handover_support?.enabled;
  if (esp32CapabilityProfile.package_override_handover_support) {
    esp32CapabilityProfile.package_override_handover_support.enabled = false;
  }

  try {
    const compatibility = checkEsp32Compatibility(boilerSupervisorOverridesRuntimePack);
    assert.equal(compatibility.ok, false);
    assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_override_handover.unsupported"));
  } finally {
    if (esp32CapabilityProfile.package_override_handover_support) {
      esp32CapabilityProfile.package_override_handover_support.enabled = previous ?? true;
    }
  }
});

test("unsupported package override/handover holder lane produces the canonical diagnostic", () => {
  const mutated = structuredClone(boilerSupervisorOverridesRuntimePack) as RuntimePack;
  assert.ok(mutated.package_override_handover?.pkgho_boiler_supervisor_overrides_1);
  mutated.package_override_handover!.pkgho_boiler_supervisor_overrides_1.authority_holders.remote_owner.lane = "field" as never;

  const compatibility = checkEsp32Compatibility(mutated);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_override_handover.holder_lane.unsupported"));
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
