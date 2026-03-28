import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import timedRelayArtifact from "./fixtures/timed-relay.shipcontroller-artifact.json" with { type: "json" };
import timedRelayPack from "./fixtures/timed-relay.runtime-pack.json" with { type: "json" };

import { emitShipControllerConfigArtifact } from "../src/index.js";

test("emitter creates a ShipController-shaped artifact for a valid runtime pack", () => {
  const artifact = emitShipControllerConfigArtifact(timedRelayPack as RuntimePack);

  assert.equal(artifact.meta.target_id, "esp32-shipcontroller");
  assert.equal(artifact.meta.pack_id, "timed-relay-pack");
  assert.equal(artifact.instances.length, 1);
  assert.equal(artifact.connections.length, 1);
  assert.equal(artifact.resources.length, 1);
  assert.equal(artifact.native_execution_placeholders.length, 1);
});

test("emitter is byte-stable for the same input after canonical stringify", () => {
  const first = emitShipControllerConfigArtifact(timedRelayPack as RuntimePack);
  const second = emitShipControllerConfigArtifact(timedRelayPack as RuntimePack);

  assert.equal(canonicalStringify(first), canonicalStringify(second));
  assert.equal(canonicalStringify(first), canonicalStringify(timedRelayArtifact));
});

test("artifact does not contain UI or editor fields", () => {
  const artifact = emitShipControllerConfigArtifact(timedRelayPack as RuntimePack) as unknown as Record<string, unknown>;

  assert.equal("layouts" in artifact, false);
  assert.equal("views" in artifact, false);
  assert.equal("hardware" in artifact, false);
  assert.equal(JSON.stringify(artifact).includes("source_scope"), false);
});

test("emitter does not mutate the input runtime pack", () => {
  const before = canonicalStringify(timedRelayPack);
  emitShipControllerConfigArtifact(timedRelayPack as RuntimePack);
  const after = canonicalStringify(timedRelayPack);

  assert.equal(after, before);
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
