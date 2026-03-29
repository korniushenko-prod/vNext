import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import pulseFlowmeterArtifact from "./fixtures/pulse-flowmeter.shipcontroller-artifact.json" with { type: "json" };
import pulseFlowmeterPack from "./fixtures/pulse-flowmeter.runtime-pack.json" with { type: "json" };
import pidControllerArtifact from "./fixtures/pid-controller.shipcontroller-artifact.json" with { type: "json" };
import pidControllerPack from "./fixtures/pid-controller.runtime-pack.json" with { type: "json" };
import timedRelayArtifact from "./fixtures/timed-relay.shipcontroller-artifact.json" with { type: "json" };
import timedRelayPack from "./fixtures/timed-relay.runtime-pack.json" with { type: "json" };

import { emitShipControllerConfigArtifact } from "../src/index.js";

test("emitter creates a ShipController-shaped artifact for a valid runtime pack", () => {
  const artifact = emitShipControllerConfigArtifact(timedRelayPack as unknown as RuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "timed-relay-demo-pack");
  assert.equal(artifact.artifacts.digital_inputs.length, 1);
  assert.equal(artifact.artifacts.digital_outputs.length, 1);
  assert.equal(artifact.artifacts.timed_relays.length, 1);
});

test("emitter is byte-stable for the same input after canonical stringify", () => {
  const first = emitShipControllerConfigArtifact(timedRelayPack as unknown as RuntimePack);
  const second = emitShipControllerConfigArtifact(timedRelayPack as unknown as RuntimePack);

  assert.equal(canonicalStringify(first), canonicalStringify(second));
  assert.equal(canonicalStringify(first), canonicalStringify(timedRelayArtifact));
});

test("artifact does not contain UI or editor fields", () => {
  const artifact = emitShipControllerConfigArtifact(timedRelayPack as unknown as RuntimePack) as unknown as Record<string, unknown>;

  assert.equal("layouts" in artifact, false);
  assert.equal("views" in artifact, false);
  assert.equal("hardware" in artifact, false);
  assert.equal(JSON.stringify(artifact).includes("source_scope"), false);
  assert.equal(JSON.stringify(artifact).includes("native_execution_placeholders"), false);
});

test("emitter does not mutate the input runtime pack", () => {
  const before = canonicalStringify(timedRelayPack);
  emitShipControllerConfigArtifact(timedRelayPack as unknown as RuntimePack);
  const after = canonicalStringify(timedRelayPack);

  assert.equal(after, before);
});

test("pulse flowmeter emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(pulseFlowmeterPack as unknown as RuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "pulse-flowmeter-demo-pack");
  assert.equal(artifact.artifacts.digital_inputs.length, 1);
  assert.equal(artifact.artifacts.analog_inputs.length, 0);
  assert.equal(artifact.artifacts.pulse_flowmeters.length, 1);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(pulseFlowmeterArtifact)
  );
});

test("pulse flowmeter artifact does not contain editor/runtime-noise fields", () => {
  const artifact = emitShipControllerConfigArtifact(pulseFlowmeterPack as unknown as RuntimePack) as unknown as Record<string, unknown>;

  assert.equal("layouts" in artifact, false);
  assert.equal("views" in artifact, false);
  assert.equal("hardware" in artifact, false);
  assert.equal(JSON.stringify(artifact).includes("source_scope"), false);
});

test("pid controller emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(pidControllerPack as unknown as RuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "pid-controller-demo-pack");
  assert.equal(artifact.artifacts.analog_inputs.length, 1);
  assert.equal(artifact.artifacts.pid_controllers.length, 1);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(pidControllerArtifact)
  );
});

test("pid controller artifact does not contain editor/runtime-noise fields", () => {
  const artifact = emitShipControllerConfigArtifact(pidControllerPack as unknown as RuntimePack) as unknown as Record<string, unknown>;

  assert.equal("layouts" in artifact, false);
  assert.equal("views" in artifact, false);
  assert.equal("hardware" in artifact, false);
  assert.equal(JSON.stringify(artifact).includes("source_scope"), false);
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
