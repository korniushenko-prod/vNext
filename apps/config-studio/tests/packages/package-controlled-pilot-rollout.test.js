const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const workspaceRoot = path.resolve(__dirname, "../../../../");
let workspaceModulesPromise;

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
}

function importWorkspaceModule(relativePath) {
  return import(pathToFileURL(path.join(workspaceRoot, relativePath)).href);
}

async function loadWorkspaceModules() {
  if (!workspaceModulesPromise) {
    workspaceModulesPromise = Promise.all([
      importWorkspaceModule("packages/materializer-core/dist/src/index.js"),
      importWorkspaceModule("targets/esp32-target-adapter/dist/src/index.js")
    ]).then(([materializer, targetAdapter]) => ({
      materializeProject: materializer.materializeProject,
      emitShipControllerConfigArtifact: targetAdapter.emitShipControllerConfigArtifact,
      createEsp32TargetAdapter: targetAdapter.createEsp32TargetAdapter
    }));
  }

  return workspaceModulesPromise;
}

function canonicalStringify(value) {
  return JSON.stringify(sortJson(value));
}

function sortJson(value) {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.keys(value)
      .sort((left, right) => left.localeCompare(right))
      .reduce((accumulator, key) => {
        accumulator[key] = sortJson(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function normalizeReadback(snapshot) {
  return sortJson({
    ...snapshot,
    request_id: "__normalized__"
  });
}

test("controlled pilot bundle stays aligned with the frozen pump-skid baseline and closes the deploy/readback harness", async () => {
  const modules = await loadWorkspaceModules();
  const rolloutProject = loadJson("docs/pilot/pumpskid-v1-controlled-pilot.project.json");
  const rolloutArtifact = loadJson("docs/pilot/pumpskid-v1-controlled-pilot.artifact.json");
  const rolloutReadback = loadJson("docs/pilot/pumpskid-v1-controlled-pilot.readback.json");
  const frozenProject = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json");
  const frozenArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.shipcontroller-artifact.json");
  const frozenReadback = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.readback.snapshot.json");

  assert.equal(rolloutProject.meta.project_id, "pumpskid_v1_controlled_pilot");
  assert.equal(rolloutProject.meta.title, "PumpSkidSupervisor Controlled Pilot Bundle");
  assert.equal(
    canonicalStringify({ ...rolloutProject, meta: frozenProject.meta }),
    canonicalStringify(frozenProject)
  );
  assert.equal(canonicalStringify(rolloutArtifact), canonicalStringify(frozenArtifact));
  assert.equal(
    canonicalStringify(normalizeReadback(rolloutReadback)),
    canonicalStringify(normalizeReadback(frozenReadback))
  );

  const materialized = modules.materializeProject(rolloutProject, {
    pack_id: "pump-skid-supervisor-demo-pack",
    generated_at: "2026-03-30T00:00:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(materialized.diagnostics.length, 0);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(rolloutArtifact));

  const adapter = modules.createEsp32TargetAdapter();
  const applyResult = await adapter.apply({
    request_id: "controlled-pilot-apply",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: materialized.pack.pack_id,
      schema_version: materialized.pack.schema_version
    },
    options: {
      runtime_pack: materialized.pack
    }
  });
  const readback = await adapter.readback({
    request_id: "controlled-pilot-readback",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "full"
  });

  assert.equal(applyResult.success, true);
  assert.equal(
    applyResult.artifacts.shipcontroller_config.meta.checksum_sha256,
    readback.resources.apply_status.checksum_sha256
  );
  assert.equal(
    canonicalStringify(normalizeReadback(readback)),
    canonicalStringify(normalizeReadback(rolloutReadback))
  );
});
