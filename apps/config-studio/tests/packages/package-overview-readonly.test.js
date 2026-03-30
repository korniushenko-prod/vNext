const test = require("node:test");
const assert = require("node:assert/strict");

const {
  READONLY_PACKAGE_FIXTURE_IDS,
  READONLY_PACKAGE_OVERVIEW_FIXTURES
} = require("../../src/packages/fixtures/package-overview-fixtures");
const {
  createReadonlyPackageOverviewViewModel,
  renderReadonlyPackageMemberMarkup,
  renderReadonlyPackageDetailsMarkup
} = require("../../src/packages/ui/package-overview-readonly");

function fixtureById(id) {
  return READONLY_PACKAGE_OVERVIEW_FIXTURES.find((entry) => entry.id === id);
}

test("package overview fixtures expose the canonical boiler package example", () => {
  assert.deepEqual(READONLY_PACKAGE_FIXTURE_IDS, [
    "package-overview-boiler-skeleton",
    "package-overview-boiler-supervisor",
    "package-overview-boiler-supervisor-coordination",
    "package-overview-boiler-supervisor-modes",
    "package-overview-pump-skid-supervisor-modes",
    "package-overview-boiler-supervisor-modes-execution",
    "package-overview-pump-skid-supervisor-modes-execution",
    "package-overview-boiler-supervisor-interlocks",
    "package-overview-pump-skid-supervisor-interlocks",
    "package-overview-boiler-supervisor-protection",
    "package-overview-pump-skid-supervisor-protection",
    "package-overview-boiler-supervisor-protection-no-snapshot",
    "package-overview-pump-skid-supervisor-protection-unsupported",
    "package-overview-boiler-supervisor-interlocks-no-snapshot",
    "package-overview-pump-skid-supervisor-interlocks-unsupported",
    "package-overview-boiler-supervisor-modes-no-snapshot",
    "package-overview-pump-skid-supervisor-modes-unsupported",
    "package-overview-boiler-supervisor-arbitration",
    "package-overview-pump-skid-supervisor-arbitration",
    "package-overview-boiler-supervisor-overrides",
    "package-overview-pump-skid-supervisor-overrides",
    "package-overview-boiler-supervisor-no-snapshot",
    "package-overview-boiler-supervisor-unsupported",
    "package-overview-pump-skid-supervisor-pilot"
  ]);
});

test("readonly package overview view model summarizes boiler package composition", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-skeleton"),
    selectedMemberId: "maintenance_counter_1"
  });

  assert.equal(surface.package_definition.package_id, "std.boiler_supervisor.v1");
  assert.equal(surface.package_instance_id, "boiler_pkg_1");
  assert.equal(surface.selected_member.id, "maintenance_counter_1");
  assert.equal(surface.members.length, 5);
  assert.equal(surface.effective_objects.length, 5);
  assert.match(surface.package_definition.boundary_notes[0], /package-neutral/i);
});

test("member card markup shows effective object and linked object surface summary", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-skeleton"),
    selectedMemberId: "pid_1"
  });

  const markup = renderReadonlyPackageMemberMarkup(surface.selected_member);
  assert.match(markup, /PID Controller/);
  assert.match(markup, /boiler_pkg_1__pid_1/);
  assert.match(markup, /Operations Overview: PID \+ hold\/release\/autotune/);
});

test("details markup renders package boundary notes and effective objects", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-skeleton"),
    selectedMemberId: "flowmeter_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.match(markup, /Boiler Supervisor Skeleton/);
  assert.match(markup, /Package Summary/);
  assert.match(markup, /Linked Object Surfaces/);
  assert.match(markup, /ordinary_runtime_object/);
  assert.match(markup, /not burner-management/i);
});

test("boiler supervisor fixture exposes package supervision summary state", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor"),
    selectedMemberId: "pid_1"
  });

  assert.equal(surface.package_supervision.snapshot_state, "alarm_present");
  assert.equal(surface.package_supervision.summary_outputs.length, 6);
  assert.equal(surface.package_supervision.aggregate_monitors.length, 1);
  assert.equal(surface.package_supervision.aggregate_alarms.length, 1);
  assert.equal(surface.package_supervision.trace_groups.length, 2);
  assert.equal(surface.package_supervision.operation_proxies.length, 6);
  assert.equal(surface.selected_member.child_state, "blocked");
});

test("details markup renders package supervision sections for boiler supervisor", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor"),
    selectedMemberId: "maintenance_counter_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.match(markup, /Package Supervision/);
  assert.match(markup, /Summary Outputs/);
  assert.match(markup, /Health Rollup/);
  assert.match(markup, /Operation Proxies/);
  assert.match(markup, /PID Autotune/);
  assert.match(markup, /Maintenance Due/);
  assert.match(markup, /execution engine/i);
});

test("boiler supervisor coordination fixture exposes package coordination summary state", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-coordination"),
    selectedMemberId: "pid_1"
  });

  assert.equal(surface.active_package_surface_kind, "coordination");
  assert.equal(surface.package_coordination.snapshot_state, "control_active");
  assert.equal(surface.package_coordination.summary_outputs.length, 4);
  assert.equal(surface.package_coordination.aggregate_monitors.length, 1);
  assert.equal(surface.package_coordination.trace_groups.length, 1);
  assert.equal(surface.package_coordination.operation_proxies.length, 5);
});

test("details markup renders package coordination sections for boiler supervisor coordination", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-coordination"),
    selectedMemberId: "pid_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.match(markup, /Package Coordination/);
  assert.match(markup, /Coordination Health/);
  assert.match(markup, /Coordination Traces/);
  assert.match(markup, /PID Autotune Proxy/);
  assert.match(markup, /child execution lanes/i);
});

test("boiler supervisor modes fixture exposes package mode and phase summary state", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-modes"),
    selectedMemberId: "pid_1"
  });

  assert.equal(surface.active_package_surface_kind, "mode_phase");
  assert.equal(surface.package_mode_phase.snapshot_state, "mode_phase_available");
  assert.equal(surface.package_mode_phase.active_mode.id, "standby");
  assert.equal(surface.package_mode_phase.active_phase.id, "precheck");
  assert.equal(surface.package_mode_phase.mode_summary_entries.length, 3);
  assert.equal(surface.package_mode_phase.phase_groups.length, 2);
});

test("pump skid supervisor modes fixture keeps the package mode / phase vocabulary generic", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-modes"),
    selectedMemberId: "pump_group_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "mode_phase");
  assert.equal(surface.package_mode_phase.active_mode.id, "auto");
  assert.match(markup, /Package Mode \/ Phase/);
  assert.match(markup, /Active Mode \/ Phase/);
  assert.match(markup, /Mode Groups/);
  assert.doesNotMatch(markup, /burner/i);
});

test("boiler-like package mode execution fixture exposes bounded transition actions", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-modes-execution"),
    selectedMemberId: "boiler_core_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "mode_phase");
  assert.equal(surface.package_mode_phase.transition_actions.length, 3);
  assert.equal(surface.package_mode_phase.active_transition.lifecycle_state, "running");
  assert.equal(surface.package_mode_phase.transition_actions[2].guard_state, "blocked");
  assert.match(markup, /Allowed Transition Actions/);
  assert.match(markup, /Active Transition Lane/);
  assert.match(markup, /Request Phase Start/);
  assert.match(markup, /Synthetic package phase start is running/);
});

test("pump-skid package mode execution fixture keeps execution package-neutral across lifecycle states", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-modes-execution"),
    selectedMemberId: "pump_group_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.package_mode_phase.transition_actions.length, 3);
  assert.equal(surface.package_mode_phase.transition_actions[0].lifecycle_state, "pending");
  assert.equal(surface.package_mode_phase.transition_actions[1].lifecycle_state, "completed");
  assert.equal(surface.package_mode_phase.transition_actions[2].lifecycle_state, "cancelled");
  assert.match(markup, /Request Service Mode/);
  assert.match(markup, /Request Phase Abort/);
  assert.doesNotMatch(markup, /wizard|burner|ignition/i);
});

test("boiler-like package permissive/interlock fixture exposes blocked, held, and faulted gate presentation", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-interlocks"),
    selectedMemberId: "fault_latch_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "permissive_interlock");
  assert.equal(surface.package_permissive_interlock.snapshot_state, "blocked");
  assert.equal(surface.package_permissive_interlock.gate_entries.length, 5);
  assert.equal(surface.package_permissive_interlock.reason_cards.length, 4);
  assert.equal(surface.package_permissive_interlock.transition_guards.length, 1);
  assert.match(markup, /Package Permissive \/ Interlock/);
  assert.match(markup, /Gate Summary/);
  assert.match(markup, /Gate Entries/);
  assert.match(markup, /Reason List/);
  assert.match(markup, /Transition Guards/);
  assert.match(markup, /Package Gate Traces/);
  assert.match(markup, /Faulted/);
});

test("pump-skid package permissive/interlock fixture keeps wording generic across the second reference domain", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-interlocks"),
    selectedMemberId: "motor_ready_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "permissive_interlock");
  assert.equal(surface.package_permissive_interlock.snapshot_state, "ready");
  assert.equal(surface.package_permissive_interlock.gate_summary.ready, true);
  assert.equal(surface.package_permissive_interlock.reason_cards.length, 0);
  assert.match(markup, /Allow Auto Run/);
  assert.match(markup, /Package Gate Trace/);
  assert.doesNotMatch(markup, /burner|ignition|trip relay/i);
});

test("boiler-like package protection/recovery fixture exposes tripped protection summary state", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-protection"),
    selectedMemberId: "pressure_trip_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "protection_recovery");
  assert.equal(surface.package_protection_recovery.snapshot_state, "tripped");
  assert.equal(surface.package_protection_recovery.protection_summary.ready, false);
  assert.equal(surface.package_protection_recovery.trips.length, 1);
  assert.equal(surface.package_protection_recovery.inhibits.length, 1);
  assert.equal(surface.package_protection_recovery.recovery_requests.length, 2);
  assert.equal(surface.package_protection_recovery.diagnostic_summaries.length, 1);
  assert.match(markup, /Package Protection \/ Recovery/);
  assert.match(markup, /Protection Summary/);
  assert.match(markup, /Trips \/ Inhibits/);
  assert.match(markup, /Recovery Requests/);
  assert.match(markup, /Protection Diagnostics/);
  assert.match(markup, /non-safety/i);
});

test("pump-skid package protection/recovery fixture keeps wording generic across the second reference domain", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-protection"),
    selectedMemberId: "motor_trip_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "protection_recovery");
  assert.equal(surface.package_protection_recovery.snapshot_state, "ready");
  assert.equal(surface.package_protection_recovery.protection_summary.ready, true);
  assert.equal(surface.package_protection_recovery.recovery_requests[0].availability_state, "unavailable");
  assert.match(markup, /Motor Trip/);
  assert.match(markup, /Protection Traces/);
  assert.doesNotMatch(markup, /burner|ignition|flame safeguard/i);
});

test("boiler-like package arbitration fixture exposes ownership and command arbitration presentation", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-arbitration"),
    selectedMemberId: "manual_owner_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "arbitration");
  assert.equal(surface.package_arbitration.snapshot_state, "accepted");
  assert.equal(surface.package_arbitration.ownership_lanes.length, 4);
  assert.equal(surface.package_arbitration.command_lanes.length, 4);
  assert.equal(surface.package_arbitration.command_summary.denied_lane_ids.length, 1);
  assert.match(markup, /Package Arbitration/);
  assert.match(markup, /Ownership Summary/);
  assert.match(markup, /Command Summary/);
  assert.match(markup, /Ownership Lanes/);
  assert.match(markup, /Command Lanes/);
  assert.match(markup, /Package Arbitration Traces/);
});

test("pump-skid package arbitration fixture keeps wording generic across the second reference domain", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-arbitration"),
    selectedMemberId: "start_request_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "arbitration");
  assert.equal(surface.package_arbitration.snapshot_state, "accepted");
  assert.equal(surface.package_arbitration.ownership_summary.active_lane_ids[0], "auto_owner");
  assert.equal(surface.package_arbitration.command_lanes[1].state, "blocked");
  assert.match(markup, /Start In Auto/);
  assert.match(markup, /Package Arbitration Traces/);
  assert.doesNotMatch(markup, /burner|ignition|flame safeguard/i);
});

test("boiler-like package override/handover fixture exposes current holder and bounded handover requests", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-overrides"),
    selectedMemberId: "manual_owner_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "override_handover");
  assert.equal(surface.package_override_handover.snapshot_state, "accepted");
  assert.equal(surface.package_override_handover.ownership_summary.current_holder_id, "manual_owner");
  assert.equal(surface.package_override_handover.command_lanes.length, 4);
  assert.match(markup, /Package Override \/ Handover/);
  assert.match(markup, /Current Holder/);
  assert.match(markup, /Last Handover Reason/);
  assert.match(markup, /Package Override \/ Handover Traces/);
});

test("pump-skid package override/handover fixture keeps wording generic across the second reference domain", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-overrides"),
    selectedMemberId: "handover_request_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.active_package_surface_kind, "override_handover");
  assert.equal(surface.package_override_handover.ownership_summary.current_lane, "auto");
  assert.equal(surface.package_override_handover.command_lanes[1].state, "blocked");
  assert.match(markup, /Manual Takeover/);
  assert.doesNotMatch(markup, /burner|ignition|flame safeguard/i);
});

test("pump-skid pilot fixture keeps package overview focused on bounded package shape and mode/phase state", () => {
  const surface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-pilot"),
    selectedMemberId: "run_hours_1"
  });

  const markup = renderReadonlyPackageDetailsMarkup(surface);
  assert.equal(surface.package_definition.package_id, "std.pump_skid_supervisor.v1");
  assert.equal(surface.active_package_surface_kind, "mode_phase");
  assert.equal(surface.package_mode_phase.active_mode.id, "auto");
  assert.equal(surface.package_mode_phase.active_phase.id, "running");
  assert.match(markup, /PumpSkidSupervisor v1/);
  assert.match(markup, /Deploy\/apply\/readback baseline is surfaced separately/i);
});

test("package supervision degraded fixtures render no-snapshot and unsupported states explicitly", () => {
  const noSnapshotSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-no-snapshot"),
    selectedMemberId: ""
  });
  const unsupportedSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-unsupported"),
    selectedMemberId: ""
  });

  const noSnapshotMarkup = renderReadonlyPackageDetailsMarkup(noSnapshotSurface);
  const unsupportedMarkup = renderReadonlyPackageDetailsMarkup(unsupportedSurface);

  assert.match(noSnapshotMarkup, /No package members in this fixture yet\./);
  assert.match(noSnapshotMarkup, /No target snapshot is available for package supervision yet\./);
  assert.match(unsupportedMarkup, /No package members in this fixture yet\./);
  assert.match(unsupportedMarkup, /Current target surface does not expose package supervision snapshots\./);
});

test("package protection/recovery degraded fixtures render no-snapshot and unsupported states explicitly", () => {
  const noSnapshotSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-protection-no-snapshot"),
    selectedMemberId: ""
  });
  const unsupportedSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-protection-unsupported"),
    selectedMemberId: ""
  });

  const noSnapshotMarkup = renderReadonlyPackageDetailsMarkup(noSnapshotSurface);
  const unsupportedMarkup = renderReadonlyPackageDetailsMarkup(unsupportedSurface);

  assert.match(noSnapshotMarkup, /No target snapshot is available for package protection \/ recovery yet\./);
  assert.match(noSnapshotMarkup, /No package protection summary is available\./);
  assert.match(unsupportedMarkup, /Current target surface does not expose package protection \/ recovery snapshots\./);
  assert.match(unsupportedMarkup, /No package recovery requests are available\./);
});

test("package permissive/interlock degraded fixtures render no-snapshot and unsupported states explicitly", () => {
  const noSnapshotSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-interlocks-no-snapshot"),
    selectedMemberId: ""
  });
  const unsupportedSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-interlocks-unsupported"),
    selectedMemberId: ""
  });

  const noSnapshotMarkup = renderReadonlyPackageDetailsMarkup(noSnapshotSurface);
  const unsupportedMarkup = renderReadonlyPackageDetailsMarkup(unsupportedSurface);

  assert.match(noSnapshotMarkup, /No target snapshot is available for package permissive \/ interlock yet\./);
  assert.match(noSnapshotMarkup, /No package gate summary is available\./);
  assert.match(unsupportedMarkup, /Current target surface does not expose package permissive \/ interlock snapshots\./);
  assert.match(unsupportedMarkup, /No package gate entries are available\./);
});

test("package mode / phase degraded fixtures render no-snapshot and unsupported states explicitly", () => {
  const noSnapshotSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-boiler-supervisor-modes-no-snapshot"),
    selectedMemberId: ""
  });
  const unsupportedSurface = createReadonlyPackageOverviewViewModel({
    fixture: fixtureById("package-overview-pump-skid-supervisor-modes-unsupported"),
    selectedMemberId: ""
  });

  const noSnapshotMarkup = renderReadonlyPackageDetailsMarkup(noSnapshotSurface);
  const unsupportedMarkup = renderReadonlyPackageDetailsMarkup(unsupportedSurface);

  assert.match(noSnapshotMarkup, /No target snapshot is available for package mode \/ phase yet\./);
  assert.match(unsupportedMarkup, /Current target surface does not expose package mode \/ phase snapshots\./);
});
