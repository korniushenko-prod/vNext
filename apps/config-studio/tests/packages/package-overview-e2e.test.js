const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");

const {
  READONLY_PACKAGE_OVERVIEW_FIXTURES
} = require("../../src/packages/fixtures/package-overview-fixtures");
const {
  createReadonlyPackageOverviewViewModel
} = require("../../src/packages/ui/package-overview-readonly");

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
      emitShipControllerConfigArtifact: targetAdapter.emitShipControllerConfigArtifact
    }));
  }

  return workspaceModulesPromise;
}

test("boiler package skeleton closes the full package path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-package-skeleton/boiler-package-skeleton.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-package-skeleton/boiler-package-skeleton.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-package-skeleton/boiler-package-skeleton.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-package-skeleton/boiler-package-skeleton.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-package-skeleton-demo-pack",
    generated_at: "2026-03-30T21:00:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  assert.equal(
    canonicalStringify(expectedOverviewFixture),
    canonicalStringify(READONLY_PACKAGE_OVERVIEW_FIXTURES[0])
  );

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "pid_1"
  });
  assert.equal(surface.package_definition.package_id, "std.boiler_supervisor.v1");
  assert.equal(surface.package_instance_id, "boiler_pkg_1");
  assert.ok(surface.effective_objects.every((entry) => entry.package_neutral_label === "package-neutral"));
  assert.equal(surface.selected_member.effective_object_id, "boiler_pkg_1__pid_1");
});

test("boiler supervisor closes the full package supervision path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor/boiler-supervisor.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor/boiler-supervisor.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor/boiler-supervisor.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor/boiler-supervisor.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-demo-pack",
    generated_at: "2026-03-30T22:30:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "maintenance_counter_1"
  });
  assert.equal(surface.package_definition.package_id, "std.boiler_supervisor.v1");
  assert.equal(surface.package_supervision.snapshot_state, "alarm_present");
  assert.equal(surface.package_supervision.summary_outputs.length, 6);
  assert.equal(surface.package_supervision.aggregate_monitors.length, 1);
  assert.equal(surface.package_supervision.aggregate_alarms.length, 1);
  assert.equal(surface.package_supervision.trace_groups.length, 2);
  assert.equal(surface.package_supervision.operation_proxies.length, 6);
  assert.equal(surface.selected_member.child_state, "maintenance_due");
});

test("boiler supervisor coordination closes the full package coordination path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor-coordination/boiler-supervisor-coordination.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor-coordination/boiler-supervisor-coordination.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor-coordination/boiler-supervisor-coordination.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor-coordination/boiler-supervisor-coordination.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-coordination-demo-pack",
    generated_at: "2026-03-30T23:20:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-coordination");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "pid_1"
  });
  assert.equal(surface.package_definition.package_id, "std.boiler_supervisor_coordination.v1");
  assert.equal(surface.active_package_surface_kind, "coordination");
  assert.equal(surface.package_coordination.snapshot_state, "control_active");
  assert.equal(surface.package_coordination.summary_outputs.length, 4);
  assert.equal(surface.package_coordination.aggregate_monitors.length, 1);
  assert.equal(surface.package_coordination.trace_groups.length, 1);
  assert.equal(surface.package_coordination.operation_proxies.length, 5);
});

test("boiler supervisor modes closes the full package mode / phase path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor-modes/boiler-supervisor-modes.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor-modes/boiler-supervisor-modes.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor-modes/boiler-supervisor-modes.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor-modes/boiler-supervisor-modes.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-modes-demo-pack",
    generated_at: "2026-03-31T00:30:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-modes");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "boiler_core_1"
  });
  assert.equal(surface.package_definition.package_id, "boiler_supervisor_modes");
  assert.equal(surface.active_package_surface_kind, "mode_phase");
  assert.equal(surface.package_mode_phase.snapshot_state, "mode_phase_available");
  assert.equal(surface.package_mode_phase.active_mode.id, "standby");
  assert.equal(surface.package_mode_phase.active_phase.id, "precheck");
  assert.equal(surface.package_mode_phase.mode_summary_entries.length, 3);
});

test("pump skid supervisor modes closes the full package mode / phase path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes/pump-skid-supervisor-modes.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes/pump-skid-supervisor-modes.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes/pump-skid-supervisor-modes.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes/pump-skid-supervisor-modes.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-modes-demo-pack",
    generated_at: "2026-03-31T00:35:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-modes");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "pump_group_1"
  });
  assert.equal(surface.active_package_surface_kind, "mode_phase");
  assert.equal(surface.package_mode_phase.snapshot_state, "mode_phase_available");
  assert.equal(surface.package_mode_phase.active_mode.id, "auto");
  assert.equal(surface.package_mode_phase.active_phase.id, "ready");
  assert.equal(surface.package_mode_phase.phase_summary_entries.length, 3);
});

test("boiler supervisor modes execution closes the full bounded execution path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor-modes-execution/boiler-supervisor-modes-execution.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor-modes-execution/boiler-supervisor-modes-execution.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor-modes-execution/boiler-supervisor-modes-execution.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor-modes-execution/boiler-supervisor-modes-execution.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-modes-execution-demo-pack",
    generated_at: "2026-03-31T01:00:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.guard.blocked"));

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-modes-execution");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "boiler_core_1"
  });
  assert.equal(surface.active_package_surface_kind, "mode_phase");
  assert.equal(surface.package_mode_phase.transition_actions.length, 3);
  assert.equal(surface.package_mode_phase.active_transition.lifecycle_state, "running");
  assert.equal(surface.package_mode_phase.transition_actions[2].guard_state, "blocked");
});

test("pump skid supervisor modes execution closes the non-boiler bounded execution path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes-execution/pump-skid-supervisor-modes-execution.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes-execution/pump-skid-supervisor-modes-execution.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes-execution/pump-skid-supervisor-modes-execution.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor-modes-execution/pump-skid-supervisor-modes-execution.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-modes-execution-demo-pack",
    generated_at: "2026-03-31T01:05:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.guard.blocked"));

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-modes-execution");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "pump_group_1"
  });
  assert.equal(surface.package_mode_phase.transition_actions.length, 3);
  assert.equal(surface.package_mode_phase.transition_actions[0].lifecycle_state, "pending");
  assert.equal(surface.package_mode_phase.transition_actions[1].lifecycle_state, "completed");
  assert.equal(surface.package_mode_phase.transition_actions[2].lifecycle_state, "cancelled");
});

test("boiler supervisor interlocks closes the full package permissive/interlock path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor-interlocks/boiler-supervisor-interlocks.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor-interlocks/boiler-supervisor-interlocks.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor-interlocks/boiler-supervisor-interlocks.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor-interlocks/boiler-supervisor-interlocks.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-interlocks-demo-pack",
    generated_at: "2026-03-30T23:59:59Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.guard.blocked"));

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-interlocks");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "fault_latch_1"
  });
  assert.equal(surface.active_package_surface_kind, "permissive_interlock");
  assert.equal(surface.package_permissive_interlock.snapshot_state, "blocked");
  assert.equal(surface.package_permissive_interlock.gate_summary.ready, false);
  assert.equal(surface.package_permissive_interlock.gate_entries.length, 5);
  assert.equal(surface.package_permissive_interlock.transition_guards.length, 1);
});

test("pump skid supervisor interlocks closes the full non-boiler package permissive/interlock path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor-interlocks/pump-skid-supervisor-interlocks.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/pump-skid-supervisor-interlocks/pump-skid-supervisor-interlocks.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor-interlocks/pump-skid-supervisor-interlocks.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor-interlocks/pump-skid-supervisor-interlocks.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-interlocks-demo-pack",
    generated_at: "2026-03-30T23:59:59Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.package_mode_execution.guard.blocked"));

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-interlocks");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "motor_ready_1"
  });
  assert.equal(surface.active_package_surface_kind, "permissive_interlock");
  assert.equal(surface.package_permissive_interlock.snapshot_state, "ready");
  assert.equal(surface.package_permissive_interlock.gate_summary.ready, true);
  assert.equal(surface.package_permissive_interlock.reason_cards.length, 0);
});

test("boiler supervisor protection closes the full package protection/recovery path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor-protection/boiler-supervisor-protection.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor-protection/boiler-supervisor-protection.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor-protection/boiler-supervisor-protection.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor-protection/boiler-supervisor-protection.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-protection-demo-pack",
    generated_at: "2026-03-30T23:40:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-protection");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "pressure_trip_1"
  });
  assert.equal(surface.active_package_surface_kind, "protection_recovery");
  assert.equal(surface.package_protection_recovery.snapshot_state, "tripped");
  assert.equal(surface.package_protection_recovery.protection_summary.ready, false);
  assert.equal(surface.package_protection_recovery.trips.length, 1);
  assert.equal(surface.package_protection_recovery.recovery_requests.length, 2);
});

test("pump skid supervisor protection closes the full non-boiler package protection/recovery path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor-protection/pump-skid-supervisor-protection.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/pump-skid-supervisor-protection/pump-skid-supervisor-protection.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor-protection/pump-skid-supervisor-protection.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor-protection/pump-skid-supervisor-protection.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-protection-demo-pack",
    generated_at: "2026-03-30T23:45:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-protection");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "motor_trip_1"
  });
  assert.equal(surface.active_package_surface_kind, "protection_recovery");
  assert.equal(surface.package_protection_recovery.snapshot_state, "ready");
  assert.equal(surface.package_protection_recovery.protection_summary.ready, true);
  assert.equal(surface.package_protection_recovery.recovery_requests[0].availability_state, "unavailable");
});

test("boiler supervisor arbitration closes the full package arbitration path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor-arbitration/boiler-supervisor-arbitration.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor-arbitration/boiler-supervisor-arbitration.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor-arbitration/boiler-supervisor-arbitration.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor-arbitration/boiler-supervisor-arbitration.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-arbitration-demo-pack",
    generated_at: "2026-03-30T23:55:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-arbitration");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "manual_owner_1"
  });
  assert.equal(surface.active_package_surface_kind, "arbitration");
  assert.equal(surface.package_arbitration.snapshot_state, "accepted");
  assert.equal(surface.package_arbitration.ownership_lanes.length, 4);
  assert.equal(surface.package_arbitration.command_lanes.length, 4);
});

test("pump skid supervisor arbitration closes the full non-boiler package arbitration path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor-arbitration/pump-skid-supervisor-arbitration.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/pump-skid-supervisor-arbitration/pump-skid-supervisor-arbitration.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor-arbitration/pump-skid-supervisor-arbitration.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor-arbitration/pump-skid-supervisor-arbitration.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-arbitration-demo-pack",
    generated_at: "2026-03-30T23:56:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-arbitration");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "start_request_1"
  });
  assert.equal(surface.active_package_surface_kind, "arbitration");
  assert.equal(surface.package_arbitration.snapshot_state, "accepted");
  assert.equal(surface.package_arbitration.ownership_summary.active_lane_ids[0], "auto_owner");
  assert.equal(surface.package_arbitration.command_lanes[1].state, "blocked");
});

test("boiler supervisor overrides closes the full package override / handover path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-supervisor-overrides/boiler-supervisor-overrides.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/boiler-supervisor-overrides/boiler-supervisor-overrides.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/boiler-supervisor-overrides/boiler-supervisor-overrides.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/boiler-supervisor-overrides/boiler-supervisor-overrides.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-supervisor-overrides-demo-pack",
    generated_at: "2026-03-30T23:59:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-overrides");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "manual_owner_1"
  });
  assert.equal(surface.active_package_surface_kind, "override_handover");
  assert.equal(surface.package_override_handover.ownership_summary.current_holder_id, "manual_owner");
  assert.equal(surface.package_override_handover.command_lanes.length, 4);
});

test("pump skid supervisor overrides closes the full non-boiler package override / handover path into runtime, target artifact, and package overview", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/pump-skid-supervisor-overrides/pump-skid-supervisor-overrides.project.e2e.json");
  const expectedPack = loadJson("docs/merge/reference-slices/pump-skid-supervisor-overrides/pump-skid-supervisor-overrides.runtime-pack.snapshot.json");
  const expectedArtifact = loadJson("docs/merge/reference-slices/pump-skid-supervisor-overrides/pump-skid-supervisor-overrides.shipcontroller-artifact.json");
  const expectedOverviewFixture = loadJson("docs/merge/reference-slices/pump-skid-supervisor-overrides/pump-skid-supervisor-overrides.package-overview.fixture.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "pump-skid-supervisor-overrides-demo-pack",
    generated_at: "2026-03-30T23:59:00Z"
  });
  assert.equal(materialized.ok, true);
  assert.equal(canonicalStringify(materialized.pack), canonicalStringify(expectedPack));

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);

  const artifact = modules.emitShipControllerConfigArtifact(materialized.pack);
  assert.equal(canonicalStringify(artifact), canonicalStringify(expectedArtifact));

  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-overrides");
  assert.ok(fixture);
  assert.equal(canonicalStringify(expectedOverviewFixture), canonicalStringify(fixture));

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: expectedOverviewFixture,
    selectedMemberId: "handover_request_1"
  });
  assert.equal(surface.active_package_surface_kind, "override_handover");
  assert.equal(surface.package_override_handover.ownership_summary.current_lane, "auto");
  assert.equal(surface.package_override_handover.command_lanes[1].state, "blocked");
});

test("package with unresolved member fails before flattened runtime instances appear", async () => {
  const modules = await loadWorkspaceModules();
  const invalidProject = loadJson("packages/project-schema/tests/fixtures/package-invalid-unresolved-member.project.json");

  const result = modules.materializeProject(invalidProject, {
    pack_id: "package-invalid-unresolved-member-pack",
    generated_at: "2026-03-30T21:10:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_member.type_ref.unresolved"));
});

test("package path still rejects unsupported binding kinds canonically at target compatibility", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-package-skeleton/boiler-package-skeleton.project.e2e.json");

  const materialized = modules.materializeProject(project, {
    pack_id: "boiler-package-skeleton-unsupported-binding-pack",
    generated_at: "2026-03-30T21:20:00Z"
  });
  assert.equal(materialized.ok, true);
  materialized.pack.resources.hw_boiler_pkg_1_threshold_value.binding_kind = "vendor_panel";

  const compatibility = modules.checkEsp32Compatibility(materialized.pack);
  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "target.binding.unsupported"));
});

test("package permissive/interlock unresolved permissive refs still fail canonically during flattening", async () => {
  const modules = await loadWorkspaceModules();
  const invalidProject = loadJson("packages/project-schema/tests/fixtures/package-permissive-interlock-invalid-ref.project.json");

  const result = modules.materializeProject(invalidProject, {
    pack_id: "package-permissive-interlock-invalid-ref-pack",
    generated_at: "2026-03-31T01:30:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_permissive_interlock.permissive_ref.unresolved"));
});

test("package permissive/interlock unsupported target readback capability stays explicit at the package surface", () => {
  const fixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-pump-skid-supervisor-interlocks-unsupported");
  assert.ok(fixture);

  const surface = createReadonlyPackageOverviewViewModel({
    fixture,
    selectedMemberId: ""
  });

  assert.equal(surface.active_package_surface_kind, "permissive_interlock");
  assert.equal(surface.package_permissive_interlock.snapshot_state, "unsupported_by_target");
});

test("package permissive/interlock malformed gate summary payload degrades without crashing the generic package surface", () => {
  const baseFixture = READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === "package-overview-boiler-supervisor-interlocks");
  assert.ok(baseFixture);

  const malformedFixture = {
    ...baseFixture,
    package_permissive_interlock: {
      ...baseFixture.package_permissive_interlock,
      gate_summary: {
        state: "blocked",
        ready: false,
        blocked_reason_ids: "feedwater_ok",
        held_reason_ids: null,
        faulted_reason_ids: undefined,
        transition_guard_ids: {}
      }
    }
  };

  const surface = createReadonlyPackageOverviewViewModel({
    fixture: malformedFixture,
    selectedMemberId: "feedwater_guard_1"
  });

  assert.equal(surface.package_permissive_interlock.gate_summary.blocked_reason_ids.length, 0);
  assert.equal(surface.package_permissive_interlock.gate_summary.held_reason_ids.length, 0);
  assert.equal(surface.package_permissive_interlock.gate_summary.transition_guard_ids.length, 0);
});

test("illegal package default override fails canonically during flattening", async () => {
  const modules = await loadWorkspaceModules();
  const project = loadJson("docs/merge/reference-slices/boiler-package-skeleton/boiler-package-skeleton.project.e2e.json");
  project.definitions.packages.boiler_supervisor.presets.demo_defaults.member_defaults.pid_1.param_values = {
    unknown_pid_param: {
      kind: "literal",
      value: 123
    }
  };

  const result = modules.materializeProject(project, {
    pack_id: "boiler-package-skeleton-illegal-default-pack",
    generated_at: "2026-03-30T21:30:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_member.param.unknown"));
});

test("package mode / phase invalid active mode ref fails canonically during flattening", async () => {
  const modules = await loadWorkspaceModules();
  const invalidProject = loadJson("packages/project-schema/tests/fixtures/package-mode-phase-invalid-active-mode.project.json");

  const result = modules.materializeProject(invalidProject, {
    pack_id: "package-mode-phase-invalid-active-mode-pack",
    generated_at: "2026-03-31T00:40:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_mode_phase.active_mode.unresolved"));
});
