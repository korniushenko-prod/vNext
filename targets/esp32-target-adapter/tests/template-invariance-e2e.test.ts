import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

import { materializeProject } from "@universal-plc/materializer-core";
import type { ProjectModel } from "@universal-plc/project-schema";

import {
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact
} from "../src/index.js";

const WORKSPACE_ROOT_URL = new URL("../../../../", import.meta.url);

const timedRelayExplicitProject = loadWorkspaceJson<ProjectModel>(
  "targets/esp32-target-adapter/tests/fixtures/timed-relay-library.project.json"
);
const timedRelayTemplateProject = loadWorkspaceJson<ProjectModel>(
  "targets/esp32-target-adapter/tests/fixtures/timed-relay-library-template.project.json"
);
const timedRelayRuntimeSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/timed-relay.runtime-pack.json"
);
const timedRelayArtifactSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/timed-relay.shipcontroller-artifact.json"
);

const runHoursExplicitProject = loadWorkspaceJson<ProjectModel>(
  "packages/materializer-core/tests/fixtures/run-hours-counter.project.json"
);
const runHoursTemplateProject = loadWorkspaceJson<ProjectModel>(
  "packages/materializer-core/tests/fixtures/run-hours-template.project.json"
);
const runHoursRuntimeSnapshot = loadWorkspaceJson(
  "packages/materializer-core/tests/fixtures/run-hours-counter.runtime-pack.snapshot.json"
);
const runHoursArtifactSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/run-hours-counter.shipcontroller-artifact.json"
);

const pulseFlowmeterExplicitProject = loadWorkspaceJson<ProjectModel>(
  "packages/materializer-core/tests/fixtures/pulse-flowmeter.project.minimal.json"
);
const pulseFlowmeterTemplateProject = loadWorkspaceJson<ProjectModel>(
  "packages/materializer-core/tests/fixtures/pulse-flowmeter-hall-template.project.json"
);
const pulseFlowmeterRuntimeSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/pulse-flowmeter.runtime-pack.json"
);
const pulseFlowmeterArtifactSnapshot = loadWorkspaceJson(
  "targets/esp32-target-adapter/tests/fixtures/pulse-flowmeter.shipcontroller-artifact.json"
);

test("timed relay explicit and template-based library slices are end-to-end invariant", () => {
  assertTemplatePairInvariance({
    explicitProject: timedRelayExplicitProject,
    templateProject: timedRelayTemplateProject,
    packId: "timed-relay-demo-pack",
    generatedAt: "2026-03-28T12:00:00Z",
    runtimeSnapshot: timedRelayRuntimeSnapshot,
    artifactSnapshot: timedRelayArtifactSnapshot
  });
});

test("run hours explicit and template-based slices are end-to-end invariant", () => {
  assertTemplatePairInvariance({
    explicitProject: runHoursExplicitProject,
    templateProject: runHoursTemplateProject,
    packId: "run-hours-counter-demo-pack",
    generatedAt: "2026-03-29T18:00:00Z",
    runtimeSnapshot: runHoursRuntimeSnapshot,
    artifactSnapshot: runHoursArtifactSnapshot
  });
});

test("pulse flowmeter hall explicit and template-based slices are end-to-end invariant", () => {
  assertTemplatePairInvariance({
    explicitProject: pulseFlowmeterExplicitProject,
    templateProject: pulseFlowmeterTemplateProject,
    packId: "pulse-flowmeter-demo-pack",
    generatedAt: "2026-03-28T20:00:00Z",
    runtimeSnapshot: pulseFlowmeterRuntimeSnapshot,
    artifactSnapshot: pulseFlowmeterArtifactSnapshot
  });
});

type TemplatePairExpectation = {
  artifactSnapshot: unknown;
  explicitProject: ProjectModel;
  generatedAt: string;
  packId: string;
  runtimeSnapshot: unknown;
  templateProject: ProjectModel;
};

function assertTemplatePairInvariance(expectation: TemplatePairExpectation): void {
  const explicitMaterialized = materializeProject(expectation.explicitProject, {
    pack_id: expectation.packId,
    generated_at: expectation.generatedAt
  });
  const templateMaterialized = materializeProject(expectation.templateProject, {
    pack_id: expectation.packId,
    generated_at: expectation.generatedAt
  });

  assert.equal(explicitMaterialized.ok, true);
  assert.equal(templateMaterialized.ok, true);
  assert.equal(
    canonicalStringify(explicitMaterialized.pack),
    canonicalStringify(expectation.runtimeSnapshot)
  );
  assert.equal(
    canonicalStringify(templateMaterialized.pack),
    canonicalStringify(expectation.runtimeSnapshot)
  );
  assert.equal(
    canonicalStringify(templateMaterialized.pack),
    canonicalStringify(explicitMaterialized.pack)
  );

  const explicitCompatibility = checkEsp32Compatibility(explicitMaterialized.pack);
  const templateCompatibility = checkEsp32Compatibility(templateMaterialized.pack);

  assert.equal(explicitCompatibility.ok, true);
  assert.deepEqual(explicitCompatibility.diagnostics, []);
  assert.equal(templateCompatibility.ok, true);
  assert.deepEqual(templateCompatibility.diagnostics, []);

  const explicitArtifact = emitShipControllerConfigArtifact(explicitMaterialized.pack);
  const templateArtifact = emitShipControllerConfigArtifact(templateMaterialized.pack);

  assert.equal(
    canonicalStringify(explicitArtifact),
    canonicalStringify(expectation.artifactSnapshot)
  );
  assert.equal(
    canonicalStringify(templateArtifact),
    canonicalStringify(expectation.artifactSnapshot)
  );
  assert.equal(
    canonicalStringify(templateArtifact),
    canonicalStringify(explicitArtifact)
  );

  assertTemplateRuntimeIdentityIsAbsent(templateMaterialized.pack);
  assertTemplateRuntimeIdentityIsAbsent(templateArtifact);
}

function assertTemplateRuntimeIdentityIsAbsent(value: unknown): void {
  const json = JSON.stringify(value);
  assert.equal(json.includes("template_ref"), false);
  assert.equal(json.includes("template_id"), false);
  assert.equal(json.includes("template_kind"), false);
}

function loadWorkspaceJson<T>(relativePath: string): T {
  return JSON.parse(readFileSync(new URL(relativePath, WORKSPACE_ROOT_URL), "utf8")) as T;
}

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
