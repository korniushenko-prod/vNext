const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const {
  READONLY_PACKAGE_OVERVIEW_FIXTURES
} = require("../../src/packages/fixtures/package-overview-fixtures");
const {
  PACKAGE_COMMISSIONING_FIXTURES
} = require("../../src/packages/fixtures/package-commissioning-fixtures");
const {
  createReadonlyPackageOverviewViewModel
} = require("../../src/packages/ui/package-overview-readonly");
const {
  createPackageCommissioningViewModel
} = require("../../src/packages/ui/package-commissioning-surface");

const workspaceRoot = path.resolve(__dirname, "../../../../");
let workspaceModulesPromise;

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(workspaceRoot, relativePath), "utf8"));
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
      checkEsp32Compatibility: targetAdapter.checkEsp32Compatibility,
      emitShipControllerConfigArtifact: targetAdapter.emitShipControllerConfigArtifact,
      createEsp32TargetAdapter: targetAdapter.createEsp32TargetAdapter
    }));
  }

  return workspaceModulesPromise;
}

test("pump-skid pilot package closes the full commissioning path into runtime, target artifact, readback, and commissioning surface", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.shipcontroller-artifact.json");
  const expectedReadback = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.readback.snapshot.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.package-overview.fixture.json");
  const expectedCommissioningFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.commissioning.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-demo-pack",
    generated_at: "2026-03-30T00:00:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const adapter = modules.createEsp32TargetAdapter();
  const applyResult = await adapter.apply({
    request_id: "pilot-apply-1",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: materialized.pack.pack_id,
      schema_version: materialized.pack.schema_version
    },
    options: {
      runtime_pack: materialized.pack
    }
  });
  assert.equal(applyResult.success, true);

  const readback = await adapter.readback({
    request_id: "pilot-readback-1",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "full"
  });
  assert.equal(canonicalStringify(readback), canonicalStringify(expectedReadback));

  const overviewFixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-pilot");
  assert.ok(overviewFixture);
  assert.equal(canonicalStringify(overviewFixture), canonicalStringify(expectedOverviewFixture));

  const commissioningFixture = PACKAGE_COMMISSIONING_FIXTURES.find((entry) => entry.id === "package-commissioning-pump-skid-supervisor-pilot");
  assert.ok(commissioningFixture);
  assert.equal(canonicalStringify(commissioningFixture), canonicalStringify(expectedCommissioningFixture));

  const overviewSurface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "maintenance_counter_1"
  });
  assert.equal(overviewSurface.package_mode_phase.active_mode.id, "auto");
  assert.equal(overviewSurface.package_mode_phase.active_phase.id, "running");

  const commissioningSurface = createPackageCommissioningViewModel({
    fixture: expectedCommissioningFixture
  });
  assert.equal(commissioningSurface.configuration.apply_result.state, "applied");
  assert.equal(commissioningSurface.configuration.readback_status.state, "online");
  assert.equal(commissioningSurface.commissioning.permissive_interlock.state, "ready");
});

test("pilot package keeps missing binding and unsupported target profile diagnostics explicit", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json");
  delete project.hardware.bindings.hw_pressure_pv_1;

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-missing-binding",
    generated_at: "2026-03-30T00:10:00Z"
  });
  assert.equal(materialized.ok, false);
  assert.ok(materialized.diagnostics.some((entry) => entry.code === "frontend.resource.missing"));

  const supportedProject = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json");
  const supportedMaterialized = modules.materializeProject(supportedProject, {
    pack_id: "pump-skid-supervisor-unsupported-target",
    generated_at: "2026-03-30T00:11:00Z"
  });
  const unsupportedPack = structuredClone(supportedMaterialized.pack);
  unsupportedPack.instances.pump_skid_supervisor_1__pump_cmd_1.native_execution.target_kinds = ["other.target.v1"];

  const compatibility = modules.checkEsp32Compatibility(unsupportedPack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.target_kind.mismatch"));
});

test("pilot commissioning loop keeps apply failure, no readback, and mismatch states explicit", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor/pump-skid-supervisor.project.e2e.json");
  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-failure-demo-pack",
    generated_at: "2026-03-30T00:12:00Z"
  });
  const adapter = modules.createEsp32TargetAdapter();

  const noReadback = await adapter.readback({
    request_id: "pilot-no-readback",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "summary"
  });
  assert.ok(noReadback.diagnostics.some((entry) => entry.code === "target.readback.unsupported"));

  const applyFailure = await adapter.apply({
    request_id: "pilot-apply-failure",
    adapter_id: adapter.manifest.id,
    pack: {
      pack_id: materialized.pack.pack_id,
      schema_version: materialized.pack.schema_version
    },
    options: {
      runtime_pack: materialized.pack,
      simulate_apply_failure: true
    }
  });
  assert.equal(applyFailure.success, false);
  assert.ok(applyFailure.diagnostics.some((entry) => entry.code === "target.apply.failed"));

  const commissioningFixture = structuredClone(PACKAGE_COMMISSIONING_FIXTURES[0]);
  commissioningFixture.configuration.readback_status.state = "mismatch";
  commissioningFixture.configuration.readback_status.summary = "Expected running=true but target readback returned false.";
  commissioningFixture.diagnostics = [
    { severity: "warning", code: "target.readback.mismatch", summary: "Expected running=true but target readback returned false." },
    { severity: "warning", code: "target.readback.stale", summary: "Readback snapshot is older than the commissioning freshness window." }
  ];

  const commissioningSurface = createPackageCommissioningViewModel({
    fixture: commissioningFixture
  });
  assert.equal(commissioningSurface.configuration.readback_status.state, "mismatch");
  assert.equal(commissioningSurface.diagnostics.length, 2);
});
