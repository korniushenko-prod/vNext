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

const commBridgeProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/comm-bridge/comm-bridge.project.minimal.json"
);
const commBridgeRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/comm-bridge/comm-bridge.runtime-pack.snapshot.json"
);
const commBridgeArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/comm-bridge/comm-bridge.shipcontroller-artifact.json"
);

const remotePointFrontendProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/remote-point-frontend/remote-point-frontend.project.minimal.json"
);
const remotePointFrontendRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/remote-point-frontend/remote-point-frontend.runtime-pack.snapshot.json"
);
const remotePointFrontendArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/remote-point-frontend/remote-point-frontend.shipcontroller-artifact.json"
);

const combinedRemotePointProject = loadWorkspaceJson<ProjectModel>(
  "docs/merge/reference-slices/combined-remote-point/combined-remote-point.project.minimal.json"
);
const combinedRemotePointRuntimeSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/combined-remote-point/combined-remote-point.runtime-pack.snapshot.json"
);
const combinedRemotePointArtifactSnapshot = loadWorkspaceJson(
  "docs/merge/reference-slices/combined-remote-point/combined-remote-point.shipcontroller-artifact.json"
);

test("comm bridge end-to-end path materializes, validates and emits the canonical artifact", () => {
  assertReferenceSlice(
    commBridgeProject,
    "comm-bridge-demo-pack",
    "2026-03-29T23:30:00Z",
    commBridgeRuntimeSnapshot,
    commBridgeArtifactSnapshot
  );
});

test("remote point frontend end-to-end path materializes, validates and emits the canonical artifact", () => {
  assertReferenceSlice(
    remotePointFrontendProject,
    "remote-point-frontend-demo-pack",
    "2026-03-29T23:30:00Z",
    remotePointFrontendRuntimeSnapshot,
    remotePointFrontendArtifactSnapshot
  );
});

test("combined remote point end-to-end path materializes, validates and emits the canonical artifact", () => {
  const materialized = materializeProject(combinedRemotePointProject, {
    pack_id: "combined-remote-point-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(combinedRemotePointRuntimeSnapshot));

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(combinedRemotePointArtifactSnapshot));
  assert.equal(artifact.artifacts.remote_points?.[0]?.bridge_id, "comm_bridge_1");
  assert.equal(artifact.artifacts.remote_points?.[0]?.bus_ref, "rs485_1");
});

test("remote point frontend without bridge_ref fails in materialization with the canonical communications diagnostic", () => {
  const project = structuredClone(remotePointFrontendProject);
  const remotePoint = project.system.instances.remote_point_1;
  if (!remotePoint.param_values) {
    throw new Error("remote_point_1.param_values is required for the PR-16D negative bridge_ref case.");
  }
  delete remotePoint.param_values.bridge_ref;

  const materialized = materializeProject(project, {
    pack_id: "remote-point-missing-bridge-demo-pack",
    generated_at: "2026-03-29T23:40:00Z"
  });

  assert.equal(materialized.ok, false);
  assert.ok(materialized.diagnostics.some((entry) => entry.code === "comms.bridge_ref.missing"));

  const artifact = materialized.ok ? emitShipControllerConfigArtifact(materialized.pack) : null;
  assert.equal(artifact, null);
});

test("remote point frontend without bus binding fails in materialization with the canonical frontend diagnostic", () => {
  const project = structuredClone(remotePointFrontendProject);
  delete project.hardware.bindings.rs485_1;

  const materialized = materializeProject(project, {
    pack_id: "remote-point-missing-bus-demo-pack",
    generated_at: "2026-03-29T23:50:00Z"
  });

  assert.equal(materialized.ok, false);
  assert.ok(materialized.diagnostics.some((entry) => (
    entry.code === "frontend.resource.missing" &&
    entry.path === "$.frontend_requirements.fe_remote_point_1_remote_source.binding_kind"
  )));

  const artifact = materialized.ok ? emitShipControllerConfigArtifact(materialized.pack) : null;
  assert.equal(artifact, null);
});

function assertReferenceSlice(
  project: ProjectModel,
  packId: string,
  generatedAt: string,
  runtimeSnapshot: unknown,
  artifactSnapshot: unknown
): void {
  const materialized = materializeProject(project, {
    pack_id: packId,
    generated_at: generatedAt
  });

  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(runtimeSnapshot));

  const compatibility = checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(artifactSnapshot));
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
