import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { materializeProject } from "@universal-plc/materializer-core";

import pulseFlowmeterProject from "./fixtures/pulse-flowmeter.project.minimal.json" with { type: "json" };
import pulseFlowmeterRuntimeSnapshot from "./fixtures/pulse-flowmeter.runtime-pack.json" with { type: "json" };
import pulseFlowmeterArtifactSnapshot from "./fixtures/pulse-flowmeter.shipcontroller-artifact.json" with { type: "json" };

import {
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact
} from "../src/index.js";

test("pulse flowmeter end-to-end path materializes, validates and emits the canonical artifact", () => {
  const materialized = materializeProject(pulseFlowmeterProject as ProjectModel, {
    pack_id: "pulse-flowmeter-demo-pack",
    generated_at: "2026-03-28T20:00:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.equal(
    canonicalStringify(materialized.pack),
    canonicalStringify(pulseFlowmeterRuntimeSnapshot)
  );

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(pulseFlowmeterArtifactSnapshot)
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
