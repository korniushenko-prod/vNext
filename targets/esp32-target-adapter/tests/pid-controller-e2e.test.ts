import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { materializeProject } from "@universal-plc/materializer-core";

import pidControllerProject from "./fixtures/pid-controller.project.json" with { type: "json" };
import pidControllerRuntimeSnapshot from "./fixtures/pid-controller.runtime-pack.json" with { type: "json" };
import pidControllerArtifactSnapshot from "./fixtures/pid-controller.shipcontroller-artifact.json" with { type: "json" };

import {
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact
} from "../src/index.js";

test("pid controller end-to-end path materializes, validates and emits the canonical artifact", () => {
  const materialized = materializeProject(pidControllerProject as ProjectModel, {
    pack_id: "pid-controller-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.equal(
    canonicalStringify(materialized.pack),
    canonicalStringify(pidControllerRuntimeSnapshot)
  );

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(pidControllerArtifactSnapshot)
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
