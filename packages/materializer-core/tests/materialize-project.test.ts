import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { validateRuntimePack } from "@universal-plc/runtime-pack-schema";

import boilerCompositionProject from "./fixtures/boiler-composition.project.json" with { type: "json" };
import boilerPackageRuntimeSnapshot from "./fixtures/boiler-package-skeleton.runtime-pack.snapshot.json" with { type: "json" };
import boilerSupervisorCoordinationRuntimeSnapshot from "./fixtures/boiler-supervisor-coordination.runtime-pack.snapshot.json" with { type: "json" };
import boilerSupervisorInvalidAggregateDiagnosticsSnapshot from "./fixtures/boiler-supervisor-invalid-aggregate.diagnostics.snapshot.json" with { type: "json" };
import boilerSupervisorArbitrationProject from "./fixtures/boiler-supervisor-arbitration.project.e2e.json" with { type: "json" };
import boilerSupervisorArbitrationRuntimeSnapshot from "./fixtures/boiler-supervisor-arbitration.runtime-pack.snapshot.json" with { type: "json" };
import boilerSupervisorProtectionProject from "./fixtures/boiler-supervisor-protection.project.e2e.json" with { type: "json" };
import boilerSupervisorProtectionRuntimeSnapshot from "./fixtures/boiler-supervisor-protection.runtime-pack.snapshot.json" with { type: "json" };
import boilerSupervisorRuntimeSnapshot from "./fixtures/boiler-supervisor.runtime-pack.snapshot.json" with { type: "json" };
import capabilityHardeningProject from "./fixtures/capability-hardening-demo.project.json" with { type: "json" };
import capabilityHardeningRuntimeSnapshot from "./fixtures/capability-hardening-demo.runtime-pack.snapshot.json" with { type: "json" };
import commBridgeProject from "./fixtures/comm-bridge.project.json" with { type: "json" };
import commBridgeRuntimeSnapshot from "./fixtures/comm-bridge.runtime-pack.snapshot.json" with { type: "json" };
import combinedRemotePointProject from "./fixtures/combined-remote-point.project.json" with { type: "json" };
import combinedRemotePointRuntimeSnapshot from "./fixtures/combined-remote-point.runtime-pack.snapshot.json" with { type: "json" };
import emptyProject from "./fixtures/empty-project.json" with { type: "json" };
import eventCounterProject from "./fixtures/event-counter.project.json" with { type: "json" };
import eventCounterRuntimeSnapshot from "./fixtures/event-counter.runtime-pack.snapshot.json" with { type: "json" };
import invalidProject from "./fixtures/invalid-missing-type.project.json" with { type: "json" };
import invalidPidControllerMissingPvResourceProject from "./fixtures/invalid-pid-controller-missing-pv-resource.project.json" with { type: "json" };
import invalidPulseFlowmeterBadModeProject from "./fixtures/invalid-pulse-flowmeter-bad-mode.project.json" with { type: "json" };
import invalidPulseFlowmeterMissingSourceProject from "./fixtures/invalid-pulse-flowmeter-missing-source.project.json" with { type: "json" };
import maintenanceCounterProject from "./fixtures/maintenance-counter.project.json" with { type: "json" };
import maintenanceCounterRuntimeSnapshot from "./fixtures/maintenance-counter.runtime-pack.snapshot.json" with { type: "json" };
import pidControllerProject from "./fixtures/pid-controller.project.json" with { type: "json" };
import pidControllerAutotuneExecutionRuntimeSnapshot from "./fixtures/pid-controller-autotune-execution.runtime-pack.snapshot.json" with { type: "json" };
import pidControllerRuntimeSnapshot from "./fixtures/pid-controller.runtime-pack.snapshot.json" with { type: "json" };
import pulseFlowmeterProject from "./fixtures/pulse-flowmeter.project.minimal.json" with { type: "json" };
import pulseFlowmeterRuntimeSnapshot from "./fixtures/pulse-flowmeter.runtime-pack.snapshot.json" with { type: "json" };
import pumpSkidSupervisorProtectionProject from "./fixtures/pump-skid-supervisor-protection.project.e2e.json" with { type: "json" };
import pumpSkidSupervisorProtectionRuntimeSnapshot from "./fixtures/pump-skid-supervisor-protection.runtime-pack.snapshot.json" with { type: "json" };
import pumpSkidSupervisorArbitrationProject from "./fixtures/pump-skid-supervisor-arbitration.project.e2e.json" with { type: "json" };
import pumpSkidSupervisorArbitrationRuntimeSnapshot from "./fixtures/pump-skid-supervisor-arbitration.runtime-pack.snapshot.json" with { type: "json" };
import remotePointFrontendProject from "./fixtures/remote-point-frontend.project.json" with { type: "json" };
import remotePointFrontendRuntimeSnapshot from "./fixtures/remote-point-frontend.runtime-pack.snapshot.json" with { type: "json" };
import remotePointInvalidMissingBridgeRefProject from "./fixtures/remote-point-invalid-missing-bridge-ref.project.json" with { type: "json" };
import remotePointInvalidWriteCommandProject from "./fixtures/remote-point-invalid-write-command.project.json" with { type: "json" };
import packageProtectionRecoveryInvalidReadyStateProject from "./fixtures/package-protection-recovery-invalid-ready-state.project.json" with { type: "json" };
import packageProtectionRecoveryInvalidRecoveryProject from "./fixtures/package-protection-recovery-invalid-recovery.project.json" with { type: "json" };
import packageProtectionRecoveryInvalidTripProject from "./fixtures/package-protection-recovery-invalid-trip.project.json" with { type: "json" };
import packageArbitrationInvalidBlockedProject from "./fixtures/package-arbitration-invalid-blocked.project.json" with { type: "json" };
import packageArbitrationInvalidConflictProject from "./fixtures/package-arbitration-invalid-conflict.project.json" with { type: "json" };
import packageArbitrationInvalidDeniedProject from "./fixtures/package-arbitration-invalid-denied.project.json" with { type: "json" };
import runHoursCounterProject from "./fixtures/run-hours-counter.project.json" with { type: "json" };
import runHoursCounterRuntimeSnapshot from "./fixtures/run-hours-counter.runtime-pack.snapshot.json" with { type: "json" };
import runHoursTemplateProject from "./fixtures/run-hours-template.project.json" with { type: "json" };
import runHoursTemplateRuntimeSnapshot from "./fixtures/run-hours-template.runtime-pack.snapshot.json" with { type: "json" };
import runHoursToMaintenanceProject from "./fixtures/run-hours-to-maintenance.project.json" with { type: "json" };
import runHoursToMaintenanceRuntimeSnapshot from "./fixtures/run-hours-to-maintenance.runtime-pack.snapshot.json" with { type: "json" };
import projectSavedMaintenanceTemplateProject from "./fixtures/project-saved-maintenance-template.project.json" with { type: "json" };
import projectSavedMaintenanceTemplateRuntimeSnapshot from "./fixtures/project-saved-maintenance-template.runtime-pack.snapshot.json" with { type: "json" };
import thresholdMonitorProject from "./fixtures/threshold-monitor.project.json" with { type: "json" };
import thresholdMonitorRuntimeSnapshot from "./fixtures/threshold-monitor.runtime-pack.snapshot.json" with { type: "json" };
import timedRelayLibraryProject from "./fixtures/timed-relay-library.project.json" with { type: "json" };
import timedRelayProject from "./fixtures/timed-relay.project.json" with { type: "json" };
import timedRelayRuntimeSnapshot from "./fixtures/timed-relay.runtime-pack.snapshot.json" with { type: "json" };
import timedRelayTemplateProject from "./fixtures/timed-relay-template.project.json" with { type: "json" };
import timedRelayTemplateRuntimeSnapshot from "./fixtures/timed-relay-template.runtime-pack.snapshot.json" with { type: "json" };
import pulseFlowmeterHallTemplateProject from "./fixtures/pulse-flowmeter-hall-template.project.json" with { type: "json" };
import pulseFlowmeterHallTemplateRuntimeSnapshot from "./fixtures/pulse-flowmeter-hall-template.runtime-pack.snapshot.json" with { type: "json" };
import templateInvalidMissingBaseTypeRefProject from "./fixtures/template-invalid-missing-base-type-ref.project.json" with { type: "json" };
import templateInvalidMismatchedTypeRefProject from "./fixtures/template-invalid-mismatched-type-ref.project.json" with { type: "json" };
import templateInvalidUnknownParamProject from "./fixtures/template-invalid-unknown-param.project.json" with { type: "json" };
import templateInvalidUnresolvedRefProject from "./fixtures/template-invalid-unresolved-ref.project.json" with { type: "json" };
import boilerPackageProjectFixture from "./fixtures/boiler-package-skeleton.project.minimal.json" with { type: "json" };
import packageInvalidUnresolvedMemberProject from "./fixtures/package-invalid-unresolved-member.project.json" with { type: "json" };

import { materializeProject } from "../src/index.js";

test("empty project materializes into an empty runtime pack", () => {
  const result = materializeProject(emptyProject as ProjectModel);

  assert.equal(result.ok, true);
  assert.equal(Object.keys(result.pack.instances).length, 0);
  assert.equal(Object.keys(result.pack.connections).length, 0);
  assert.equal(result.diagnostics.length, 0);
});

test("timed relay project materializes a system instance and a normalized connection", () => {
  const result = materializeProject(timedRelayProject as ProjectModel);

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.relay_1);
  assert.equal(result.pack.instances.relay_1.native_execution?.native_kind, "std.timed_relay.v1");
  assert.equal(result.pack.instances.relay_1.params.pulse_time_ms.source, "instance_override");
  assert.equal(result.pack.instances.relay_1.params.pulse_time_ms.provenance?.owner_id, "relay_1");
  assert.equal(Object.keys(result.pack.connections).length, 1);
  assert.ok(result.pack.connections.conn_sig_relay_feedback_t1);
  assert.equal(result.pack.connections.conn_sig_relay_feedback_t1.origin.origin_layer, "system");
  assert.ok(result.pack.resources.relay_out_pin);
  assert.ok(result.pack.operations.op_relay_1_test_pulse);
  assert.ok(result.pack.trace_groups.tg_relay_1_basic);
});

test("boiler composition project materializes child instances and composition connections", () => {
  const result = materializeProject(boilerCompositionProject as ProjectModel);

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.boiler_supervisor_1);
  assert.ok(result.pack.instances["boiler_supervisor_1.burner_seq"]);
  assert.ok(result.pack.connections["boiler_supervisor_1::route_1"]);
  assert.ok(result.pack.connections["boiler_supervisor_1::route_2"]);
});

test("boiler package skeleton project flattens into an ordinary package-neutral runtime pack", () => {
  const result = materializeProject(buildBoilerPackageMaterializationProject(), {
    pack_id: "boiler-package-skeleton-demo-pack",
    generated_at: "2026-03-30T21:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances["boiler_pkg_1__pid_1"]);
  assert.ok(result.pack.instances["boiler_pkg_1__run_hours_1"]);
  assert.ok(result.pack.instances["boiler_pkg_1__maintenance_counter_1"]);
  assert.ok(result.pack.connections.conn_boiler_pkg_1__sig_runtime_to_maintenance_maintenance_usage);
  assert.ok(result.pack.connections.conn_boiler_pkg_1__sig_maintenance_remaining_to_monitor_remaining_monitor);
  assert.ok(result.pack.resources.hw_boiler_pkg_1_pid_pv);
  assert.ok(result.pack.resources.hw_boiler_pkg_1_pid_mv);
  assert.ok(result.pack.resources.hw_boiler_pkg_1_flowmeter_pulse);
  assert.ok(result.pack.resources.hw_boiler_pkg_1_runtime_active);
  assert.ok(result.pack.frontend_requirements.fe_boiler_pkg_1__pid_1_pv_source);
  assert.ok(result.pack.frontend_requirements.fe_boiler_pkg_1__pid_1_mv_output);
  assert.ok(result.pack.frontend_requirements.fe_boiler_pkg_1__flowmeter_1_hall_pulse_source);
  assert.ok(result.pack.frontend_requirements.fe_boiler_pkg_1__run_hours_1_activity_source);
  assert.equal(result.pack.instances["boiler_pkg_1__run_hours_1"].params.persist_enabled.source, "instance_override");
  assert.equal(result.pack.instances["boiler_pkg_1__maintenance_counter_1"].params.service_interval.source, "instance_override");
  assert.equal(JSON.stringify(result.pack).includes("package_ref"), false);
  assert.equal(JSON.stringify(result.pack).includes("package_id"), false);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(boilerPackageRuntimeSnapshot)
  );
});

test("explicit expanded boiler skeleton is runtime-pack invariant with the package-based project", () => {
  const packageResult = materializeProject(buildBoilerPackageMaterializationProject(), {
    pack_id: "boiler-package-skeleton-demo-pack",
    generated_at: "2026-03-30T21:00:00Z"
  });
  const explicitResult = materializeProject(buildExplicitBoilerPackageExpandedProject(), {
    pack_id: "boiler-package-skeleton-demo-pack",
    generated_at: "2026-03-30T21:00:00Z"
  });

  assert.equal(packageResult.ok, true);
  assert.equal(explicitResult.ok, true);
  assert.equal(canonicalStringify(packageResult.pack), canonicalStringify(explicitResult.pack));
});

test("missing type produces a diagnostic and no runtime instance", () => {
  const result = materializeProject(invalidProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.equal(Object.keys(result.pack.instances).length, 0);
  assert.ok(result.diagnostics.some((entry) => entry.code === "system_instance.type_ref.unresolved"));
});

test("unresolved package member project fails before flattened instances are emitted", () => {
  const result = materializeProject(packageInvalidUnresolvedMemberProject as ProjectModel, {
    pack_id: "broken-package-pack",
    generated_at: "2026-03-30T21:05:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_member.type_ref.unresolved"));
  assert.equal(Object.keys(result.pack.instances).some((entry) => entry.startsWith("broken_pkg_1__")), false);
});

test("illegal package param default on an unknown member param produces the canonical diagnostic", () => {
  const mutated = buildBoilerPackageMaterializationProject() as any;
  mutated.definitions.packages.boiler_supervisor.members.run_hours_1.defaults = {
    param_values: {
      ghost_param: {
        kind: "literal",
        value: 1
      }
    }
  };

  const result = materializeProject(mutated as ProjectModel, {
    pack_id: "boiler-package-skeleton-demo-pack",
    generated_at: "2026-03-30T21:10:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_member.param.unknown"));
});

test("boiler supervisor project flattens package supervision into a target-neutral runtime section", () => {
  const result = materializeProject(buildBoilerSupervisorMaterializationProject(), {
    pack_id: "boiler-supervisor-demo-pack",
    generated_at: "2026-03-30T22:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances["boiler_pkg_1__pid_1"]);
  assert.ok(result.pack.instances["boiler_pkg_1__run_hours_1"]);
  assert.ok(result.pack.package_supervision?.pkg_boiler_pkg_1);
  assert.equal(result.pack.package_supervision?.pkg_boiler_pkg_1.package_instance_id, "boiler_pkg_1");
  assert.equal(result.pack.package_supervision?.pkg_boiler_pkg_1.summary_outputs?.runtime_total.source.instance_id, "boiler_pkg_1__run_hours_1");
  assert.equal(result.pack.package_supervision?.pkg_boiler_pkg_1.aggregate_monitors?.health_rollup.source_ports.length, 3);
  assert.equal(result.pack.package_supervision?.pkg_boiler_pkg_1.trace_groups?.process_summary.signals.length, 3);
  assert.equal(
    result.pack.package_supervision?.pkg_boiler_pkg_1.operation_proxies?.reset_runtime_counter.target_operation_id,
    "op_boiler_pkg_1__run_hours_1_reset_counter"
  );
  assert.equal(JSON.stringify(result.pack).includes("package_ref"), false);
  assert.equal(JSON.stringify(result.pack).includes("package_id"), false);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(boilerSupervisorRuntimeSnapshot)
  );
});

test("boiler supervisor package supervision runtime output stays deterministic", () => {
  const first = materializeProject(buildBoilerSupervisorMaterializationProject(), {
    pack_id: "boiler-supervisor-demo-pack",
    generated_at: "2026-03-30T22:30:00Z"
  });
  const second = materializeProject(buildBoilerSupervisorMaterializationProject(), {
    pack_id: "boiler-supervisor-demo-pack",
    generated_at: "2026-03-30T22:30:00Z"
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(canonicalStringify(first.pack), canonicalStringify(second.pack));
});

test("broken package supervision child mapping produces the canonical materializer diagnostic", () => {
  const result = materializeProject(buildBoilerSupervisorInvalidAggregateProject(), {
    pack_id: "boiler-supervisor-invalid-pack",
    generated_at: "2026-03-30T22:35:00Z"
  });

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.diagnostics.filter((entry) => entry.code === "package_supervision.member.unresolved"),
    boilerSupervisorInvalidAggregateDiagnosticsSnapshot
  );
});

test("boiler supervisor coordination project flattens package coordination into a target-neutral runtime section", () => {
  const result = materializeProject(buildBoilerSupervisorCoordinationMaterializationProject(), {
    pack_id: "boiler-supervisor-coordination-demo-pack",
    generated_at: "2026-03-30T23:20:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_coordination?.pkgcoord_boiler_pkg_1);
  assert.equal(result.pack.package_coordination?.pkgcoord_boiler_pkg_1.package_instance_id, "boiler_pkg_1");
  assert.equal(result.pack.package_coordination?.pkgcoord_boiler_pkg_1.package_state.states.ready.state, "ready");
  assert.equal(result.pack.package_coordination?.pkgcoord_boiler_pkg_1.summary_outputs?.ready_summary.source.instance_id, "boiler_pkg_1__pump_group_1");
  assert.equal(result.pack.package_coordination?.pkgcoord_boiler_pkg_1.aggregate_monitors?.coordination_health.source_ports.length, 2);
  assert.equal(result.pack.package_coordination?.pkgcoord_boiler_pkg_1.trace_groups?.coordination_trace.signals.length, 3);
  assert.equal(
    result.pack.package_coordination?.pkgcoord_boiler_pkg_1.operation_proxies?.pid_autotune_proxy.target_operation_id,
    "op_boiler_pkg_1__pid_1_autotune"
  );
  assert.equal(JSON.stringify(result.pack).includes("package_execution_kind"), false);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(boilerSupervisorCoordinationRuntimeSnapshot)
  );
});

test("broken package coordination proxy mapping produces the canonical materializer diagnostic", () => {
  const project = buildBoilerSupervisorCoordinationMaterializationProject() as any;
  project.definitions.packages.boiler_supervisor.coordination.operation_proxies.start_supervision.target_operation_id = "missing_proxy_target";

  const result = materializeProject(project as ProjectModel, {
    pack_id: "boiler-supervisor-coordination-invalid-pack",
    generated_at: "2026-03-30T23:25:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_coordination.operation_proxy.target.unresolved"));
});

test("invalid package coordination state metadata produces the canonical structural diagnostic", () => {
  const project = buildBoilerSupervisorCoordinationMaterializationProject() as any;
  project.definitions.packages.boiler_supervisor.coordination.package_state.states.ready.state = "ignite_sequence";

  const result = materializeProject(project as ProjectModel, {
    pack_id: "boiler-supervisor-coordination-invalid-state-pack",
    generated_at: "2026-03-30T23:26:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "field.enum"));
});

test("boiler-like package protection/recovery project flattens into a target-neutral runtime section", () => {
  const result = materializeProject(boilerSupervisorProtectionProject as ProjectModel, {
    pack_id: "boiler-supervisor-protection-demo-pack",
    generated_at: "2026-03-30T23:40:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_protection_recovery?.pkgprotect_boiler_supervisor_protection_1);
  assert.equal(
    result.pack.package_protection_recovery?.pkgprotect_boiler_supervisor_protection_1.package_instance_id,
    "boiler_supervisor_protection_1"
  );
  assert.equal(
    result.pack.package_protection_recovery?.pkgprotect_boiler_supervisor_protection_1.trips.pressure_trip.qualified_id,
    "pkgprotect_boiler_supervisor_protection_1.trip.pressure_trip"
  );
  assert.equal(
    result.pack.package_protection_recovery?.pkgprotect_boiler_supervisor_protection_1.inhibits.feedwater_blocked.qualified_id,
    "pkgprotect_boiler_supervisor_protection_1.inhibit.feedwater_blocked"
  );
  assert.equal(
    result.pack.package_protection_recovery?.pkgprotect_boiler_supervisor_protection_1.recovery_requests?.reset_pressure_trip.target_operation_id,
    "op_boiler_supervisor_protection_1__pressure_trip_1_reset_trip"
  );
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(boilerSupervisorProtectionRuntimeSnapshot)
  );
});

test("pump-skid package protection/recovery project flattens into the same generic runtime section", () => {
  const result = materializeProject(pumpSkidSupervisorProtectionProject as ProjectModel, {
    pack_id: "pump-skid-supervisor-protection-demo-pack",
    generated_at: "2026-03-30T23:45:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_protection_recovery?.pkgprotect_pump_skid_supervisor_protection_1);
  assert.equal(
    result.pack.package_protection_recovery?.pkgprotect_pump_skid_supervisor_protection_1.package_instance_id,
    "pump_skid_supervisor_protection_1"
  );
  assert.equal(
    result.pack.package_protection_recovery?.pkgprotect_pump_skid_supervisor_protection_1.protection_summary.default_state,
    "ready"
  );
  assert.equal(
    result.pack.package_protection_recovery?.pkgprotect_pump_skid_supervisor_protection_1.recovery_requests?.reset_motor_trip.target_operation_id,
    "op_pump_skid_supervisor_protection_1__motor_trip_1_reset_trip"
  );
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pumpSkidSupervisorProtectionRuntimeSnapshot)
  );
});

test("invalid package protection/recovery child operation mapping produces the canonical materializer diagnostic", () => {
  const result = materializeProject(packageProtectionRecoveryInvalidRecoveryProject as ProjectModel, {
    pack_id: "package-protection-recovery-invalid-recovery-pack",
    generated_at: "2026-03-30T23:46:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "package_protection_recovery.recovery_request.target.unresolved"));
});

test("invalid package protection/recovery unresolved refs are preserved as canonical diagnostics", () => {
  const tripResult = materializeProject(packageProtectionRecoveryInvalidTripProject as ProjectModel, {
    pack_id: "package-protection-recovery-invalid-trip-pack",
    generated_at: "2026-03-30T23:47:00Z"
  });
  const readyStateResult = materializeProject(packageProtectionRecoveryInvalidReadyStateProject as ProjectModel, {
    pack_id: "package-protection-recovery-invalid-ready-state-pack",
    generated_at: "2026-03-30T23:48:00Z"
  });

  assert.equal(tripResult.ok, false);
  assert.ok(tripResult.diagnostics.some((entry) => entry.code === "package_protection_recovery.trip_ref.unresolved"));
  assert.equal(readyStateResult.ok, false);
  assert.ok(readyStateResult.diagnostics.some((entry) => entry.code === "package_protection_recovery.state_summary.inconsistent"));
});

test("boiler-like package arbitration project flattens into a target-neutral runtime section", () => {
  const result = materializeProject(boilerSupervisorArbitrationProject as ProjectModel, {
    pack_id: "boiler-supervisor-arbitration-demo-pack",
    generated_at: "2026-03-30T23:55:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_arbitration?.pkgarb_boiler_supervisor_arbitration_1);
  assert.equal(
    result.pack.package_arbitration?.pkgarb_boiler_supervisor_arbitration_1.package_instance_id,
    "boiler_supervisor_arbitration_1"
  );
  assert.equal(
    result.pack.package_arbitration?.pkgarb_boiler_supervisor_arbitration_1.ownership_lanes.manual_owner.lane,
    "manual"
  );
  assert.equal(
    result.pack.package_arbitration?.pkgarb_boiler_supervisor_arbitration_1.command_lanes.enable_auto.target_instance_id,
    "boiler_supervisor_arbitration_1__enable_request_1"
  );
  assert.equal(
    result.pack.package_arbitration?.pkgarb_boiler_supervisor_arbitration_1.command_lanes.start_service.superseded_by_lane_id,
    "enable_auto"
  );
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(boilerSupervisorArbitrationRuntimeSnapshot)
  );
});

test("pump-skid package arbitration project flattens into the same generic runtime section", () => {
  const result = materializeProject(pumpSkidSupervisorArbitrationProject as ProjectModel, {
    pack_id: "pump-skid-supervisor-arbitration-demo-pack",
    generated_at: "2026-03-30T23:56:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.package_arbitration?.pkgarb_pump_skid_supervisor_arbitration_1);
  assert.equal(
    result.pack.package_arbitration?.pkgarb_pump_skid_supervisor_arbitration_1.package_instance_id,
    "pump_skid_supervisor_arbitration_1"
  );
  assert.equal(
    result.pack.package_arbitration?.pkgarb_pump_skid_supervisor_arbitration_1.ownership_summary.active_lane_ids?.[0],
    "auto_owner"
  );
  assert.equal(
    result.pack.package_arbitration?.pkgarb_pump_skid_supervisor_arbitration_1.command_lanes.stop_manual.superseded_by_lane_id,
    "start_auto"
  );
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pumpSkidSupervisorArbitrationRuntimeSnapshot)
  );
});

test("invalid package arbitration missing blocked/denied reasons and conflicts stay canonical", () => {
  const blockedResult = materializeProject(packageArbitrationInvalidBlockedProject as ProjectModel, {
    pack_id: "package-arbitration-invalid-blocked-pack",
    generated_at: "2026-03-30T23:57:00Z"
  });
  const deniedResult = materializeProject(packageArbitrationInvalidDeniedProject as ProjectModel, {
    pack_id: "package-arbitration-invalid-denied-pack",
    generated_at: "2026-03-30T23:58:00Z"
  });
  const conflictResult = materializeProject(packageArbitrationInvalidConflictProject as ProjectModel, {
    pack_id: "package-arbitration-invalid-conflict-pack",
    generated_at: "2026-03-30T23:59:00Z"
  });

  assert.equal(blockedResult.ok, false);
  assert.ok(blockedResult.diagnostics.some((entry) => entry.code === "package_arbitration.blocked_reason.missing"));
  assert.equal(deniedResult.ok, false);
  assert.ok(deniedResult.diagnostics.some((entry) => entry.code === "package_arbitration.denied_reason.missing"));
  assert.equal(conflictResult.ok, false);
  assert.ok(conflictResult.diagnostics.some((entry) => entry.code === "package_arbitration.ownership_summary.conflict"));
});

test("timed relay library slice materializes library refs, resources, operations and trace groups", () => {
  const result = materializeProject(timedRelayLibraryProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.start_button_1);
  assert.ok(result.pack.instances.relay_1);
  assert.ok(result.pack.instances.pump_contact_1);
  assert.equal(result.pack.instances.relay_1.native_execution?.native_kind, "std.timed_relay.v1");
  assert.ok(result.pack.connections.conn_sig_start_to_trigger_t1);
  assert.ok(result.pack.connections.conn_sig_relay_to_output_t1);
  assert.ok(result.pack.resources.res_start_button_1);
  assert.ok(result.pack.resources.res_pump_contact_1);
  assert.ok(result.pack.operations.op_relay_1_test_pulse);
  assert.ok(result.pack.trace_groups.tg_relay_1_basic);
});

test("timed relay library slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(timedRelayLibraryProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(timedRelayRuntimeSnapshot)
  );
});

test("timed relay template slice resolves template defaults into the canonical runtime pack snapshot", () => {
  const result = materializeProject(timedRelayTemplateProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(timedRelayTemplateRuntimeSnapshot)
  );
  assert.equal(JSON.stringify(result.pack).includes("template_ref"), false);
  assert.equal(JSON.stringify(result.pack).includes("template_id"), false);
});

test("timed relay explicit and template-based instances are runtime-pack invariant", () => {
  const explicitResult = materializeProject(timedRelayProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });
  const templateResult = materializeProject(timedRelayTemplateProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(explicitResult.ok, true);
  assert.equal(templateResult.ok, true);
  assert.equal(canonicalStringify(templateResult.pack), canonicalStringify(explicitResult.pack));
});

test("capability hardening demo materializes runtime metadata blocks", () => {
  const result = materializeProject(capabilityHardeningProject as ProjectModel, {
    pack_id: "capability-hardening-demo-pack",
    generated_at: "2026-03-28T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.meter_1);
  assert.ok(result.pack.frontend_requirements.fe_meter_1_pulse_source);
  assert.ok(result.pack.monitors.mon_meter_1_pulse_timeout);
  assert.ok(result.pack.operations.op_meter_1_reset_totalizer);
  assert.ok(result.pack.trace_groups.tg_meter_1_flow_metrics);
  assert.ok(result.pack.persistence_slots.ps_meter_1_total_volume);
  assert.equal(result.pack.instances.meter_1.params.k_factor.metadata?.unit, "pulses_per_liter");
});

test("capability hardening demo matches the runtime pack golden snapshot", () => {
  const result = materializeProject(capabilityHardeningProject as ProjectModel, {
    pack_id: "capability-hardening-demo-pack",
    generated_at: "2026-03-28T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(capabilityHardeningRuntimeSnapshot)
  );
});

test("comm bridge slice materializes runtime metadata, bus requirement and native execution", () => {
  const result = materializeProject(commBridgeProject as ProjectModel, {
    pack_id: "comm-bridge-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.comm_bridge_1);
  assert.equal(result.pack.instances.comm_bridge_1.native_execution?.native_kind, "std.comm_bridge.v1");
  assert.equal(result.pack.instances.comm_bridge_1.native_execution?.mode, "modbus_rtu");
  assert.deepEqual(result.pack.instances.comm_bridge_1.native_execution?.frontend_requirement_ids, [
    "fe_comm_bridge_1_bus_source"
  ]);
  assert.ok(result.pack.resources.rs485_1);
  assert.ok(result.pack.frontend_requirements.fe_comm_bridge_1_bus_source);
  assert.ok(result.pack.monitors.mon_comm_bridge_1_timeout);
  assert.ok(result.pack.trace_groups.tg_comm_bridge_1_bridge);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("comm bridge slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(commBridgeProject as ProjectModel, {
    pack_id: "comm-bridge-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(commBridgeRuntimeSnapshot)
  );
});

test("remote point frontend slice materializes remote acquisition metadata and bridge-backed frontend requirements", () => {
  const result = materializeProject(remotePointFrontendProject as ProjectModel, {
    pack_id: "remote-point-frontend-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.comm_bridge_1);
  assert.ok(result.pack.instances.remote_point_1);
  assert.equal(result.pack.instances.remote_point_1.native_execution?.native_kind, "std.remote_point_frontend.v1");
  assert.equal(result.pack.instances.remote_point_1.native_execution?.mode, "modbus_rtu");
  assert.deepEqual(result.pack.instances.remote_point_1.native_execution?.frontend_requirement_ids, [
    "fe_remote_point_1_remote_source"
  ]);
  assert.ok(result.pack.frontend_requirements.fe_remote_point_1_remote_source);
  assert.ok(result.pack.monitors.mon_remote_point_1_timeout);
  assert.ok(result.pack.trace_groups.tg_remote_point_1_value);
  assert.ok(result.pack.trace_groups.tg_remote_point_1_quality);
  assert.ok(result.pack.trace_groups.tg_remote_point_1_source);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("remote point frontend slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(remotePointFrontendProject as ProjectModel, {
    pack_id: "remote-point-frontend-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(remotePointFrontendRuntimeSnapshot)
  );
});

test("combined remote point slice materializes a normal remote-point-to-consumer runtime connection", () => {
  const result = materializeProject(combinedRemotePointProject as ProjectModel, {
    pack_id: "combined-remote-point-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.comm_bridge_1);
  assert.ok(result.pack.instances.remote_point_1);
  assert.ok(result.pack.instances.display_1);
  assert.ok(result.pack.connections.conn_sig_remote_point_to_display_t1);
  assert.equal(result.pack.connections.conn_sig_remote_point_to_display_t1.channel_kind, "telemetry");
  assert.equal(result.pack.connections.conn_sig_remote_point_to_display_t1.value_type, "float");
});

test("combined remote point slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(combinedRemotePointProject as ProjectModel, {
    pack_id: "combined-remote-point-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(combinedRemotePointRuntimeSnapshot)
  );
});

test("remote point frontend missing bridge_ref produces the canonical communications diagnostic", () => {
  const result = materializeProject(remotePointInvalidMissingBridgeRefProject as ProjectModel, {
    pack_id: "invalid-missing-bridge-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "comms.bridge_ref.missing"));
});

test("remote point frontend rejects write-oriented scope in the read-only communications baseline", () => {
  const result = materializeProject(remotePointInvalidWriteCommandProject as ProjectModel, {
    pack_id: "invalid-write-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "comms.write_param.unsupported"));
});

test("remote point frontend without the bridge bus binding produces the canonical bus resource diagnostic", () => {
  const project = structuredClone(remotePointFrontendProject) as ProjectModel;
  delete project.hardware.bindings.rs485_1;

  const result = materializeProject(project, {
    pack_id: "missing-bus-demo-pack",
    generated_at: "2026-03-29T23:30:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "frontend.resource.missing" &&
    entry.path === "$.frontend_requirements.fe_remote_point_1_remote_source.binding_kind"
  )));
});

test("pulse flowmeter hall_pulse slice materializes runtime metadata and native execution", () => {
  const result = materializeProject(pulseFlowmeterProject as ProjectModel, {
    pack_id: "pulse-flowmeter-demo-pack",
    generated_at: "2026-03-28T20:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.flowmeter_1);
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.native_kind, "std.pulse_flowmeter.v1");
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.mode, "hall_pulse");
  assert.deepEqual(result.pack.instances.flowmeter_1.native_execution?.frontend_requirement_ids, [
    "fe_flowmeter_1_hall_pulse_source"
  ]);
  assert.ok(result.pack.frontend_requirements.fe_flowmeter_1_hall_pulse_source);
  assert.equal(result.pack.frontend_requirements.fe_flowmeter_1_hall_pulse_source.required, true);
  assert.ok(result.pack.operations.op_flowmeter_1_reset_totalizer);
  assert.deepEqual(result.pack.operation_runtime_contract, {
    invoke_supported: false,
    cancel_supported: false,
    progress_supported: false,
    result_supported: false,
    audit_required: false
  });
  assert.equal(result.pack.operations.op_flowmeter_1_reset_totalizer.confirmation_policy, "required");
  assert.deepEqual(result.pack.operations.op_flowmeter_1_reset_totalizer.availability, {
    mode: "guarded",
    required_states: ["stopped"]
  });
  assert.equal(result.pack.operations.op_flowmeter_1_reset_totalizer.progress_mode, "signal_based");
  assert.deepEqual(result.pack.operations.op_flowmeter_1_reset_totalizer.result_contract, {
    mode: "applyable_result",
    fields: [
      { id: "completed", value_type: "bool" },
      { id: "total_volume", value_type: "float" }
    ]
  });
  assert.ok(result.pack.trace_groups.tg_flowmeter_1_process);
  assert.ok(result.pack.trace_groups.tg_flowmeter_1_source);
  assert.ok(result.pack.monitors.mon_flowmeter_1_no_pulse_timeout);
  assert.ok(result.pack.persistence_slots.ps_flowmeter_1_totalizer);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("pulse flowmeter hall_pulse slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(pulseFlowmeterProject as ProjectModel, {
    pack_id: "pulse-flowmeter-demo-pack",
    generated_at: "2026-03-28T20:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pulseFlowmeterRuntimeSnapshot)
  );
});

test("pulse flowmeter hall template slice resolves template defaults into the canonical runtime pack snapshot", () => {
  const result = materializeProject(pulseFlowmeterHallTemplateProject as ProjectModel, {
    pack_id: "pulse-flowmeter-demo-pack",
    generated_at: "2026-03-28T20:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pulseFlowmeterHallTemplateRuntimeSnapshot)
  );
  assert.equal(JSON.stringify(result.pack).includes("template_kind"), false);
});

test("pulse flowmeter analog_threshold_pulse mode materializes the analog frontend requirement", () => {
  const analogProject = structuredClone(pulseFlowmeterProject) as ProjectModel;

  analogProject.definitions.object_types.analog_input = {
    id: "analog_input",
    kind: "object_type",
    meta: {
      title: "Analog Input",
      version: "1.0.0",
      origin: "library",
      library_id: "std"
    },
    interface: {
      ports: {
        value: {
          id: "value",
          direction: "out",
          channel_kind: "telemetry",
          value_type: "float"
        }
      },
      params: {},
      alarms: {}
    },
    locals: {
      signals: {},
      vars: {}
    },
    implementation: {
      native: {
        native_kind: "std.analog_input.v1",
        target_kinds: ["esp32.shipcontroller.v1"],
        config_template: "shipcontroller.analog_input.v1"
      },
      composition: null,
      state: null,
      flow: null
    },
    diagnostics: {}
  };

  delete analogProject.system.instances.pulse_source_1;
  analogProject.system.instances.analog_source_1 = {
    id: "analog_source_1",
    kind: "object_instance",
    type_ref: "library:std/analog_input",
    title: "Analog Pulse Source",
    enabled: true,
    param_values: {}
  };

  analogProject.system.instances.flowmeter_1.param_values!.sensor_mode = {
    kind: "literal",
    value: "analog_threshold_pulse"
  };

  analogProject.system.signals.sig_pulse_source_to_flowmeter = {
    id: "sig_pulse_source_to_flowmeter",
    title: "Analog Source -> Flowmeter",
    source: {
      instance_id: "analog_source_1",
      port_id: "value"
    },
    targets: {
      t1: {
        instance_id: "flowmeter_1",
        port_id: "analog_source"
      }
    }
  };

  analogProject.hardware.bindings = {
    hw_analog_source_1: {
      id: "hw_analog_source_1",
      instance_id: "analog_source_1",
      port_id: "value",
      binding_kind: "analog_in",
      config: {
        pin: 34
      }
    }
  };

  const result = materializeProject(analogProject);

  assert.equal(result.ok, true);
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.mode, "analog_threshold_pulse");
  assert.deepEqual(result.pack.instances.flowmeter_1.native_execution?.frontend_requirement_ids, [
    "fe_flowmeter_1_analog_threshold_source"
  ]);
  assert.equal(result.pack.frontend_requirements.fe_flowmeter_1_analog_threshold_source.required, true);
  assert.ok(result.pack.resources.hw_analog_source_1);
});

test("pulse flowmeter remote_pulse mode materializes the remote frontend requirement", () => {
  const remoteProject = structuredClone(pulseFlowmeterProject) as ProjectModel;

  remoteProject.definitions.object_types.remote_pulse_source = {
    id: "remote_pulse_source",
    kind: "object_type",
    meta: {
      title: "Remote Pulse Source",
      version: "1.0.0",
      origin: "library",
      library_id: "std"
    },
    interface: {
      ports: {
        value: {
          id: "value",
          direction: "out",
          channel_kind: "signal",
          value_type: "bool"
        }
      },
      params: {},
      alarms: {}
    },
    locals: {
      signals: {},
      vars: {}
    },
    implementation: {
      native: null,
      composition: null,
      state: null,
      flow: null
    },
    diagnostics: {}
  };

  delete remoteProject.system.instances.pulse_source_1;
  remoteProject.system.instances.remote_source_1 = {
    id: "remote_source_1",
    kind: "object_instance",
    type_ref: "library:std/remote_pulse_source",
    title: "Remote Pulse Source",
    enabled: true,
    param_values: {}
  };

  remoteProject.system.instances.flowmeter_1.param_values!.sensor_mode = {
    kind: "literal",
    value: "remote_pulse"
  };

  remoteProject.system.signals.sig_pulse_source_to_flowmeter = {
    id: "sig_pulse_source_to_flowmeter",
    title: "Remote Source -> Flowmeter",
    source: {
      instance_id: "remote_source_1",
      port_id: "value"
    },
    targets: {
      t1: {
        instance_id: "flowmeter_1",
        port_id: "remote_pulse"
      }
    }
  };

  remoteProject.hardware.bindings = {
    hw_remote_source_1: {
      id: "hw_remote_source_1",
      instance_id: "remote_source_1",
      port_id: "value",
      binding_kind: "service",
      config: {
        topic: "flowmeter/remote_pulse"
      }
    }
  };

  const result = materializeProject(remoteProject);

  assert.equal(result.ok, true);
  assert.equal(result.pack.instances.flowmeter_1.native_execution?.mode, "remote_pulse");
  assert.deepEqual(result.pack.instances.flowmeter_1.native_execution?.frontend_requirement_ids, [
    "fe_flowmeter_1_remote_pulse_source"
  ]);
  assert.equal(result.pack.frontend_requirements.fe_flowmeter_1_remote_pulse_source.required, true);
  assert.ok(result.pack.resources.hw_remote_source_1);
});

test("pulse flowmeter missing source binding produces the canonical frontend resource diagnostic", () => {
  const result = materializeProject(invalidPulseFlowmeterMissingSourceProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "frontend.resource.missing"));
});

test("pulse flowmeter bad mode produces the canonical unsupported mode diagnostic", () => {
  const result = materializeProject(invalidPulseFlowmeterBadModeProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "frontend.mode.unsupported"));
});

test("run hours counter slice materializes runtime metadata, persistence, and required frontend requirements", () => {
  const result = materializeProject(runHoursCounterProject as ProjectModel, {
    pack_id: "run-hours-counter-demo-pack",
    generated_at: "2026-03-29T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.run_hours_1);
  assert.equal(result.pack.instances.run_hours_1.native_execution?.native_kind, "std.run_hours_counter.v1");
  assert.deepEqual(result.pack.instances.run_hours_1.native_execution?.frontend_requirement_ids, [
    "fe_run_hours_1_activity_source"
  ]);
  assert.ok(result.pack.frontend_requirements.fe_run_hours_1_activity_source);
  assert.ok(result.pack.operations.op_run_hours_1_reset_counter);
  assert.ok(result.pack.trace_groups.tg_run_hours_1_runtime);
  assert.ok(result.pack.monitors.mon_run_hours_1_stale_source);
  assert.ok(result.pack.monitors.mon_run_hours_1_unexpected_toggle_rate);
  assert.ok(result.pack.persistence_slots.ps_run_hours_1_total_runtime);
  assert.ok(result.pack.resources.hw_motor_status_1);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("run hours counter slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(runHoursCounterProject as ProjectModel, {
    pack_id: "run-hours-counter-demo-pack",
    generated_at: "2026-03-29T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(runHoursCounterRuntimeSnapshot)
  );
});

test("run hours template slice resolves template defaults and keeps explicit overrides authoritative", () => {
  const result = materializeProject(runHoursTemplateProject as ProjectModel, {
    pack_id: "run-hours-counter-demo-pack",
    generated_at: "2026-03-29T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(result.pack.instances.run_hours_1.params.persist_enabled.value, true);
  assert.equal(result.pack.instances.run_hours_1.params.persist_period_s.value, 60);
  assert.equal(result.pack.instances.run_hours_1.params.rounding_mode.value, "tenths");
  assert.equal(result.pack.instances.run_hours_1.params.min_active_time_ms.value, 1000);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(runHoursTemplateRuntimeSnapshot)
  );
});

test("run hours explicit and template-based instances are runtime-pack invariant", () => {
  const explicitResult = materializeProject(runHoursCounterProject as ProjectModel, {
    pack_id: "run-hours-counter-demo-pack",
    generated_at: "2026-03-29T18:00:00Z"
  });
  const templateResult = materializeProject(runHoursTemplateProject as ProjectModel, {
    pack_id: "run-hours-counter-demo-pack",
    generated_at: "2026-03-29T18:00:00Z"
  });

  assert.equal(explicitResult.ok, true);
  assert.equal(templateResult.ok, true);
  assert.equal(canonicalStringify(templateResult.pack), canonicalStringify(explicitResult.pack));
});

test("event counter slice materializes runtime metadata, persistence, and required frontend requirements", () => {
  const result = materializeProject(eventCounterProject as ProjectModel, {
    pack_id: "event-counter-demo-pack",
    generated_at: "2026-03-29T18:10:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.event_counter_1);
  assert.equal(result.pack.instances.event_counter_1.native_execution?.native_kind, "std.event_counter.v1");
  assert.deepEqual(result.pack.instances.event_counter_1.native_execution?.frontend_requirement_ids, [
    "fe_event_counter_1_event_source"
  ]);
  assert.ok(result.pack.frontend_requirements.fe_event_counter_1_event_source);
  assert.ok(result.pack.operations.op_event_counter_1_reset_counter);
  assert.ok(result.pack.trace_groups.tg_event_counter_1_counting);
  assert.ok(result.pack.monitors.mon_event_counter_1_stale_source);
  assert.ok(result.pack.monitors.mon_event_counter_1_unexpected_event_rate);
  assert.ok(result.pack.persistence_slots.ps_event_counter_1_total_count);
  assert.ok(result.pack.resources.hw_pulse_source_1);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("event counter slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(eventCounterProject as ProjectModel, {
    pack_id: "event-counter-demo-pack",
    generated_at: "2026-03-29T18:10:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(eventCounterRuntimeSnapshot)
  );
});

test("threshold monitor slice materializes runtime metadata and required frontend requirements", () => {
  const result = materializeProject(thresholdMonitorProject as ProjectModel, {
    pack_id: "threshold-monitor-demo-pack",
    generated_at: "2026-03-29T18:20:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.threshold_monitor_1);
  assert.equal(result.pack.instances.threshold_monitor_1.native_execution?.native_kind, "std.threshold_monitor.v1");
  assert.deepEqual(result.pack.instances.threshold_monitor_1.native_execution?.frontend_requirement_ids, [
    "fe_threshold_monitor_1_value_source"
  ]);
  assert.ok(result.pack.frontend_requirements.fe_threshold_monitor_1_value_source);
  assert.ok(result.pack.operations.op_threshold_monitor_1_reset_latch);
  assert.ok(result.pack.trace_groups.tg_threshold_monitor_1_thresholds);
  assert.ok(result.pack.monitors.mon_threshold_monitor_1_stale_source);
  assert.ok(result.pack.monitors.mon_threshold_monitor_1_value_missing);
  assert.ok(result.pack.resources.hw_process_value_1);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("threshold monitor slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(thresholdMonitorProject as ProjectModel, {
    pack_id: "threshold-monitor-demo-pack",
    generated_at: "2026-03-29T18:20:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(thresholdMonitorRuntimeSnapshot)
  );
});

test("maintenance counter slice materializes runtime metadata, persistence, and upstream usage input", () => {
  const result = materializeProject(maintenanceCounterProject as ProjectModel, {
    pack_id: "maintenance-counter-demo-pack",
    generated_at: "2026-03-29T18:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.maintenance_counter_1);
  assert.equal(result.pack.instances.maintenance_counter_1.native_execution?.native_kind, "std.maintenance_counter.v1");
  assert.equal(result.pack.instances.maintenance_counter_1.native_execution?.frontend_requirement_ids, undefined);
  assert.ok(result.pack.connections.conn_sig_usage_source_to_maintenance_counter_t1);
  assert.equal(Object.keys(result.pack.frontend_requirements).length, 0);
  assert.ok(result.pack.operations.op_maintenance_counter_1_acknowledge_due);
  assert.ok(result.pack.operations.op_maintenance_counter_1_reset_interval);
  assert.equal(result.pack.operations.op_maintenance_counter_1_acknowledge_due.confirmation_policy, "none");
  assert.equal(result.pack.operations.op_maintenance_counter_1_reset_interval.confirmation_policy, "required");
  assert.equal(result.pack.operations.op_maintenance_counter_1_reset_interval.progress_mode, "signal_based");
  assert.equal(result.pack.operations.op_maintenance_counter_1_reset_interval.result_contract?.mode, "applyable_result");
  assert.ok(result.pack.trace_groups.tg_maintenance_counter_1_maintenance);
  assert.ok(result.pack.monitors.mon_maintenance_counter_1_stale_source);
  assert.ok(result.pack.monitors.mon_maintenance_counter_1_interval_invalid);
  assert.ok(result.pack.persistence_slots.ps_maintenance_counter_1_reset_baseline);
  assert.ok(result.pack.persistence_slots.ps_maintenance_counter_1_acknowledge_state);
  assert.ok(result.pack.resources.hw_usage_source_1);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("maintenance counter slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(maintenanceCounterProject as ProjectModel, {
    pack_id: "maintenance-counter-demo-pack",
    generated_at: "2026-03-29T18:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(maintenanceCounterRuntimeSnapshot)
  );
});

test("project-saved maintenance template slice resolves into the canonical runtime pack snapshot", () => {
  const result = materializeProject(projectSavedMaintenanceTemplateProject as ProjectModel, {
    pack_id: "maintenance-counter-demo-pack",
    generated_at: "2026-03-29T18:30:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(projectSavedMaintenanceTemplateRuntimeSnapshot)
  );
  assert.equal(JSON.stringify(result.pack).includes("template_ref"), false);
});

test("run hours to maintenance slice keeps maintenance as a downstream runtime consumer", () => {
  const result = materializeProject(runHoursToMaintenanceProject as ProjectModel, {
    pack_id: "run-hours-to-maintenance-demo-pack",
    generated_at: "2026-03-29T19:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.run_hours_1);
  assert.ok(result.pack.instances.maintenance_counter_1);
  assert.equal(result.pack.instances.maintenance_counter_1.native_execution?.frontend_requirement_ids, undefined);
  assert.ok(result.pack.connections.conn_sig_run_hours_to_maintenance_counter_t1);
  assert.ok(result.pack.frontend_requirements.fe_run_hours_1_activity_source);
  assert.equal(Object.keys(result.pack.frontend_requirements).length, 1);
  assert.ok(result.pack.persistence_slots.ps_run_hours_1_total_runtime);
  assert.ok(result.pack.persistence_slots.ps_maintenance_counter_1_reset_baseline);
  assert.ok(result.pack.persistence_slots.ps_maintenance_counter_1_acknowledge_state);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("run hours to maintenance slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(runHoursToMaintenanceProject as ProjectModel, {
    pack_id: "run-hours-to-maintenance-demo-pack",
    generated_at: "2026-03-29T19:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(runHoursToMaintenanceRuntimeSnapshot)
  );
});

test("pid controller slice materializes runtime metadata, native execution and required frontend requirements", () => {
  const result = materializeProject(pidControllerProject as ProjectModel, {
    pack_id: "pid-controller-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.ok(result.pack.instances.pid_1);
  assert.equal(result.pack.instances.pid_1.native_execution?.native_kind, "std.pid_controller.v1");
  assert.deepEqual(result.pack.instances.pid_1.native_execution?.frontend_requirement_ids, [
    "fe_pid_1_mv_output",
    "fe_pid_1_pv_source"
  ]);
  assert.ok(result.pack.connections.conn_sig_pv_sensor_to_pid_t1);
  assert.ok(result.pack.frontend_requirements.fe_pid_1_pv_source);
  assert.ok(result.pack.frontend_requirements.fe_pid_1_mv_output);
  assert.ok(result.pack.operations.op_pid_1_reset_integral);
  assert.ok(result.pack.operations.op_pid_1_hold);
  assert.ok(result.pack.operations.op_pid_1_release);
  assert.deepEqual(result.pack.operation_runtime_contract, {
    invoke_supported: false,
    cancel_supported: false,
    progress_supported: false,
    result_supported: false,
    audit_required: false
  });
  assert.equal(result.pack.operations.op_pid_1_hold.availability?.mode, "guarded");
  assert.equal(result.pack.operations.op_pid_1_hold.progress_mode, "signal_based");
  assert.equal(result.pack.operations.op_pid_1_hold.result_contract?.mode, "applyable_result");
  assert.ok(result.pack.trace_groups.tg_pid_1_control_loop);
  assert.ok(result.pack.trace_groups.tg_pid_1_mode);
  assert.ok(result.pack.monitors.mon_pid_1_pv_stale);
  assert.ok(result.pack.monitors.mon_pid_1_output_saturated);
  assert.ok(result.pack.monitors.mon_pid_1_manual_override_active);
  assert.ok(result.pack.persistence_slots.ps_pid_1_kp);
  assert.ok(result.pack.persistence_slots.ps_pid_1_ti);
  assert.ok(result.pack.persistence_slots.ps_pid_1_td);
  assert.ok(result.pack.resources.hw_pv_sensor_1);
  assert.ok(result.pack.resources.hw_pid_1_mv_out);

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("pid controller slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(pidControllerProject as ProjectModel, {
    pack_id: "pid-controller-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pidControllerRuntimeSnapshot)
  );
});

test("pid controller missing PV resource produces the canonical frontend resource diagnostic", () => {
  const result = materializeProject(invalidPidControllerMissingPvResourceProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "frontend.resource.missing"));
});

test("pid controller autotune contract materializes as an additive runtime operation", () => {
  const result = materializeProject(buildPidControllerAutotuneExecutionProject(), {
    pack_id: "pid-controller-autotune-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.pack.operations.op_pid_1_autotune, {
    id: "op_pid_1_autotune",
    owner_instance_id: "pid_1",
    kind: "autotune",
    title: "Autotune",
    confirmation_policy: "required",
    availability: {
      mode: "guarded",
      required_states: ["enabled", "manual_mode"]
    },
    progress_mode: "signal_based",
    progress_contract: {
      fields: [
        { id: "phase", value_type: "string", title: "Autotune phase" },
        { id: "sample_count", value_type: "u32", title: "Collected samples" }
      ]
    },
    result_contract: {
      mode: "recommendation",
      fields: [
        { id: "completed", value_type: "bool" },
        { id: "recommended_kp", value_type: "float" },
        { id: "recommended_ti", value_type: "float" },
        { id: "recommended_td", value_type: "float" },
        { id: "summary", value_type: "string" }
      ],
      failure_fields: [
        { id: "error", value_type: "string" },
        { id: "diagnostics", value_type: "string" }
      ],
      recommendation_lifecycle: {
        mode: "apply_reject",
        apply_confirmation_policy: "required",
        reject_confirmation_policy: "required"
      }
    },
    ui_hint: "primary",
    safe_when: ["enabled", "manual_mode"],
    progress_signals: [
      { instance_id: "pid_1", port_id: "loop_ok" },
      { instance_id: "pid_1", port_id: "in_auto" },
      { instance_id: "pid_1", port_id: "saturated" }
    ],
    result_fields: ["completed", "recommended_kp", "recommended_ti", "recommended_td", "summary"],
    state_hint: {
      availability: "guarded",
      progress_style: "signals",
      destructive: true
    },
    provenance: {
      owner_instance_id: "pid_1",
      facet_kind: "operation",
      facet_id: "autotune",
      source_type_ref: "library:pid_controller"
    }
  });
  assert.deepEqual(result.pack.operation_runtime_contract, {
    invoke_supported: true,
    cancel_supported: true,
    progress_supported: true,
    result_supported: true,
    audit_required: true,
    confirmation_token_validation: "when_required",
    failure_payload_supported: true,
    audit_hook_mode: "operation_events",
    recommendation_lifecycle_supported: true,
    progress_payload_supported: true
  });

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("pid controller autotune execution slice matches the runtime pack golden snapshot", () => {
  const result = materializeProject(buildPidControllerAutotuneExecutionProject(), {
    pack_id: "pid-controller-autotune-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.equal(
    canonicalStringify(result.pack),
    canonicalStringify(pidControllerAutotuneExecutionRuntimeSnapshot)
  );
});

test("invalid pid autotune recommendation lifecycle metadata produces a canonical diagnostic", () => {
  const mutated = buildPidControllerAutotuneExecutionProject() as any;
  mutated.definitions.object_types.pid_controller.facets.operations.operations.autotune.result_contract.recommendation_lifecycle.mode = "mystery";

  const result = materializeProject(mutated as ProjectModel, {
    pack_id: "pid-controller-invalid-autotune-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "operation.result_contract.invalid"));
});

test("reset-only operation slices remain metadata-only after autotune execution alignment", () => {
  const result = materializeProject(runHoursCounterProject as ProjectModel, {
    pack_id: "run-hours-counter-demo-pack",
    generated_at: "2026-03-29T18:00:00Z"
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.pack.operation_runtime_contract, {
    invoke_supported: false,
    cancel_supported: false,
    progress_supported: false,
    result_supported: false,
    audit_required: false
  });

  const runtimeValidation = validateRuntimePack(result.pack);
  assert.equal(runtimeValidation.ok, true);
});

test("operation IDs remain deterministic and qualified by instance scope", () => {
  const first = materializeProject(pidControllerProject as ProjectModel, {
    pack_id: "pid-controller-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });
  const second = materializeProject(pidControllerProject as ProjectModel, {
    pack_id: "pid-controller-demo-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.deepEqual(Object.keys(first.pack.operations).sort(), Object.keys(second.pack.operations).sort());
  assert.ok(Object.keys(first.pack.operations).every((entry) => entry.startsWith("op_pid_1_")));
});

test("invalid operation availability metadata produces a canonical diagnostic", () => {
  const mutated = structuredClone(pidControllerProject) as any;
  mutated.definitions.object_types.pid_controller.facets.operations.operations.reset_integral.availability = {
    mode: "sometimes"
  };

  const result = materializeProject(mutated as ProjectModel, {
    pack_id: "pid-controller-invalid-availability-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "operation.availability.invalid"));
});

test("invalid operation result contract metadata produces a canonical diagnostic", () => {
  const mutated = structuredClone(pidControllerProject) as any;
  mutated.definitions.object_types.pid_controller.facets.operations.operations.reset_integral.result_contract = {
    mode: "mystery_result"
  };

  const result = materializeProject(mutated as ProjectModel, {
    pack_id: "pid-controller-invalid-result-contract-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "operation.result_contract.invalid"));
});

test("invalid operation kind shape produces a canonical diagnostic", () => {
  const mutated = structuredClone(pidControllerProject) as any;
  mutated.definitions.object_types.pid_controller.facets.operations.operations.reset_integral.kind = 42;

  const result = materializeProject(mutated as ProjectModel, {
    pack_id: "pid-controller-invalid-operation-kind-pack",
    generated_at: "2026-03-29T12:00:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "operation.kind.invalid"));
});

test("template resolution fails with the canonical unresolved template diagnostic", () => {
  const result = materializeProject(templateInvalidUnresolvedRefProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "template.ref.unresolved"));
  assert.equal(Object.keys(result.pack.instances).includes("relay_1"), false);
});

test("template resolution fails with the canonical missing base_type_ref diagnostic", () => {
  const result = materializeProject(templateInvalidMissingBaseTypeRefProject as unknown as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "template.base_type_ref.missing"));
  assert.equal(Object.keys(result.pack.instances).includes("relay_1"), false);
});

test("template resolution fails with the canonical type_ref mismatch diagnostic", () => {
  const result = materializeProject(templateInvalidMismatchedTypeRefProject as ProjectModel);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "template.type_ref.mismatch"));
  assert.equal(Object.keys(result.pack.instances).includes("run_hours_1"), false);
});

test("template resolution reports unknown template params without adding template runtime identity", () => {
  const result = materializeProject(templateInvalidUnknownParamProject as ProjectModel, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "template.param.unknown"));
  assert.ok(result.pack.instances.relay_1);
  assert.equal(JSON.stringify(result.pack).includes("template_ref"), false);
});

test("template resolution reports invalid explicit instance overrides against the effective type", () => {
  const project = structuredClone(timedRelayTemplateProject) as ProjectModel;
  if (!project.system.instances.relay_1.param_values) {
    throw new Error("relay_1.param_values is required for the template override invalid test.");
  }
  project.system.instances.relay_1.param_values.ghost_override = {
    kind: "literal",
    value: 123
  };

  const result = materializeProject(project, {
    pack_id: "timed-relay-demo-pack",
    generated_at: "2026-03-28T12:00:00Z"
  });

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "template.instance.override.invalid"));
  assert.ok(result.pack.instances.relay_1);
});

function buildPidControllerAutotuneExecutionProject(): ProjectModel {
  const mutated = structuredClone(pidControllerProject) as any;
  mutated.definitions.object_types.pid_controller.facets.operations.operations.autotune = {
    id: "autotune",
    kind: "autotune",
    title: "Autotune",
    ui_hint: "primary",
    safe_when: ["enabled", "manual_mode"],
    confirmation_policy: "required",
    progress_mode: "signal_based",
    progress_contract: {
      fields: [
        { id: "phase", value_type: "string", title: "Autotune phase" },
        { id: "sample_count", value_type: "u32", title: "Collected samples" }
      ]
    },
    progress_signals: ["loop_ok", "in_auto", "saturated"],
    result_contract: {
      mode: "recommendation",
      fields: [
        { id: "completed", value_type: "bool" },
        { id: "recommended_kp", value_type: "float" },
        { id: "recommended_ti", value_type: "float" },
        { id: "recommended_td", value_type: "float" },
        { id: "summary", value_type: "string" }
      ],
      failure_fields: [
        { id: "error", value_type: "string" },
        { id: "diagnostics", value_type: "string" }
      ],
      recommendation_lifecycle: {
        mode: "apply_reject",
        apply_confirmation_policy: "required",
        reject_confirmation_policy: "required"
      }
    },
    result_fields: ["completed", "recommended_kp", "recommended_ti", "recommended_td", "summary"]
  };

  return mutated as ProjectModel;
}

function buildExplicitBoilerPackageExpandedProject(): ProjectModel {
  const project = buildBoilerPackageMaterializationProject() as any;
  delete project.definitions.packages;
  delete project.system.packages;

  project.system.instances = {
    "boiler_pkg_1__pid_1": {
      id: "boiler_pkg_1__pid_1",
      kind: "object_instance",
      type_ref: "library:std/pid_controller",
      title: "Boiler Supervisor #1 / Pressure Controller",
      enabled: true,
      tags: {
        zone: "boiler_loop"
      }
    },
    "boiler_pkg_1__flowmeter_1": {
      id: "boiler_pkg_1__flowmeter_1",
      kind: "object_instance",
      type_ref: "library:std/pulse_flowmeter",
      title: "Boiler Supervisor #1 / Feedwater Flowmeter",
      enabled: true
    },
    "boiler_pkg_1__run_hours_1": {
      id: "boiler_pkg_1__run_hours_1",
      kind: "object_instance",
      type_ref: "library:std/run_hours_counter",
      template_ref: "run_hours_service_preset",
      title: "Boiler Supervisor #1 / Boiler Runtime Hours",
      enabled: true
    },
    "boiler_pkg_1__maintenance_counter_1": {
      id: "boiler_pkg_1__maintenance_counter_1",
      kind: "object_instance",
      type_ref: "library:std/maintenance_counter",
      template_ref: "maintenance_service_saved",
      title: "Boiler Supervisor #1 / Boiler Maintenance Counter",
      enabled: true
    },
    "boiler_pkg_1__threshold_monitor_1": {
      id: "boiler_pkg_1__threshold_monitor_1",
      kind: "object_instance",
      type_ref: "library:std/threshold_monitor",
      title: "Boiler Supervisor #1 / Maintenance Due Monitor",
      enabled: true,
      tags: {
        importance: "warning"
      }
    }
  };

  project.system.signals = {
    "boiler_pkg_1__sig_runtime_to_maintenance": {
      id: "boiler_pkg_1__sig_runtime_to_maintenance",
      title: "Runtime To Maintenance",
      source: {
        instance_id: "boiler_pkg_1__run_hours_1",
        port_id: "total_seconds"
      },
      targets: {
        maintenance_usage: {
          instance_id: "boiler_pkg_1__maintenance_counter_1",
          port_id: "usage_total_in"
        }
      }
    },
    "boiler_pkg_1__sig_maintenance_remaining_to_monitor": {
      id: "boiler_pkg_1__sig_maintenance_remaining_to_monitor",
      title: "Remaining To Threshold Monitor",
      source: {
        instance_id: "boiler_pkg_1__maintenance_counter_1",
        port_id: "remaining_out"
      },
      targets: {
        remaining_monitor: {
          instance_id: "boiler_pkg_1__threshold_monitor_1",
          port_id: "value_in"
        }
      }
    }
  };

  return project as ProjectModel;
}

function buildBoilerSupervisorMaterializationProject(): ProjectModel {
  const project = buildBoilerPackageMaterializationProject() as any;
  const packageDefinition = project.definitions.packages.boiler_supervisor;
  const pidAutotuneProject = buildPidControllerAutotuneExecutionProject() as any;

  project.definitions.object_types.pid_controller = structuredClone(
    pidAutotuneProject.definitions.object_types.pid_controller
  );

  packageDefinition.meta.title = "Boiler Supervisor v1";
  packageDefinition.meta.description = "Supervisory boiler package built from frozen library objects and package-level supervision metadata.";
  packageDefinition.meta.package_kind = "boiler_supervisor_v1";
  packageDefinition.presets = {
    default_supervision: {
      id: "default_supervision",
      title: "Default Supervision",
      description: "Package-level defaults for supervisory boiler view.",
      member_defaults: {
        pid_1: {
          tags: {
            zone: "boiler_loop"
          }
        },
        threshold_monitor_1: {
          tags: {
            importance: "warning"
          }
        }
      }
    }
  };
  packageDefinition.boundary_notes = [
    "BoilerSupervisor v1 is a supervisory skeleton only. It excludes burner safety, flame supervision, ignition sequencing, and certified shutdown logic.",
    "Package supervision remains authoring-level aggregation over child objects and does not create a package execution kind."
  ];
  packageDefinition.supervision = {
    summary_outputs: {
      package_ok: {
        id: "package_ok",
        title: "Package OK",
        value_type: "bool",
        source: {
          member_id: "threshold_monitor_1",
          port_id: "source_ok"
        }
      },
      alarm_present: {
        id: "alarm_present",
        title: "Alarm Present",
        value_type: "bool",
        source: {
          member_id: "threshold_monitor_1",
          port_id: "alarm_active"
        }
      },
      maintenance_due: {
        id: "maintenance_due",
        title: "Maintenance Due",
        value_type: "bool",
        source: {
          member_id: "maintenance_counter_1",
          port_id: "due_out"
        }
      },
      loop_in_auto: {
        id: "loop_in_auto",
        title: "Loop In Auto",
        value_type: "bool",
        source: {
          member_id: "pid_1",
          port_id: "in_auto"
        }
      },
      flow_ok: {
        id: "flow_ok",
        title: "Flow OK",
        value_type: "bool",
        source: {
          member_id: "flowmeter_1",
          port_id: "source_ok"
        }
      },
      runtime_total: {
        id: "runtime_total",
        title: "Runtime Total",
        value_type: "float",
        source: {
          member_id: "run_hours_1",
          port_id: "total_hours"
        }
      }
    },
    aggregate_monitors: {
      health_rollup: {
        id: "health_rollup",
        title: "Health Rollup",
        kind: "boolean_health_rollup",
        source_ports: [
          { member_id: "threshold_monitor_1", port_id: "source_ok" },
          { member_id: "flowmeter_1", port_id: "source_ok" },
          { member_id: "maintenance_counter_1", port_id: "source_ok" }
        ],
        severity: "warning"
      }
    },
    aggregate_alarms: {
      alarm_rollup: {
        id: "alarm_rollup",
        title: "Alarm Rollup",
        severity: "warning",
        source_ports: [
          { member_id: "threshold_monitor_1", port_id: "alarm_active" },
          { member_id: "maintenance_counter_1", port_id: "due_out" }
        ]
      }
    },
    trace_groups: {
      process_summary: {
        id: "process_summary",
        title: "Process Summary",
        signals: [
          { member_id: "run_hours_1", port_id: "total_hours" },
          { member_id: "flowmeter_1", port_id: "flow_rate" },
          { member_id: "pid_1", port_id: "mv_out" }
        ]
      },
      health_summary: {
        id: "health_summary",
        title: "Health Summary",
        signals: [
          { member_id: "threshold_monitor_1", port_id: "alarm_active" },
          { member_id: "maintenance_counter_1", port_id: "due_out" },
          { member_id: "pid_1", port_id: "loop_ok" }
        ]
      }
    },
    operation_proxies: {
      reset_flow_totalizer: {
        id: "reset_flow_totalizer",
        title: "Reset Flow Totalizer",
        target_member_id: "flowmeter_1",
        target_operation_id: "reset_totalizer",
        child_operation_kind: "reset_totalizer"
      },
      reset_runtime_counter: {
        id: "reset_runtime_counter",
        title: "Reset Runtime Counter",
        target_member_id: "run_hours_1",
        target_operation_id: "reset_counter",
        child_operation_kind: "reset_counter"
      },
      reset_maintenance_interval: {
        id: "reset_maintenance_interval",
        title: "Reset Maintenance Interval",
        target_member_id: "maintenance_counter_1",
        target_operation_id: "reset_interval",
        child_operation_kind: "reset_interval"
      },
      pid_autotune: {
        id: "pid_autotune",
        title: "PID Autotune",
        target_member_id: "pid_1",
        target_operation_id: "autotune",
        child_operation_kind: "autotune"
      }
    }
  };
  project.system.packages.boiler_pkg_1.preset_ref = "default_supervision";

  return project as ProjectModel;
}

function buildBoilerSupervisorInvalidAggregateProject(): ProjectModel {
  const project = buildBoilerSupervisorMaterializationProject() as any;
  project.definitions.packages.boiler_supervisor.supervision.aggregate_monitors.health_rollup.source_ports[1].member_id = "missing_flowmeter_member";
  return project as ProjectModel;
}

function buildBoilerSupervisorCoordinationMaterializationProject(): ProjectModel {
  const project = buildBoilerSupervisorMaterializationProject() as any;

  project.definitions.object_types.pump_group = {
    id: "pump_group",
    kind: "object_type",
    meta: {
      title: "Pump Group",
      version: "1.0.0",
      origin: "project",
      description: "Minimal Wave 12 circulation group used for package coordination."
    },
    interface: {
      ports: {
        ready_out: {
          id: "ready_out",
          direction: "out",
          channel_kind: "state",
          value_type: "bool"
        },
        circulation_active: {
          id: "circulation_active",
          direction: "out",
          channel_kind: "state",
          value_type: "bool"
        },
        fault_active: {
          id: "fault_active",
          direction: "out",
          channel_kind: "state",
          value_type: "bool"
        }
      },
      params: {},
      alarms: {}
    },
    locals: {
      signals: {},
      vars: {}
    },
    facets: {
      operations: {
        operations: {
          start_supervision: {
            id: "start_supervision",
            kind: "start_supervision",
            title: "Start Supervision",
            confirmation_policy: "required",
            progress_signals: ["ready_out"]
          },
          stop_supervision: {
            id: "stop_supervision",
            kind: "stop_supervision",
            title: "Stop Supervision",
            progress_signals: ["circulation_active"]
          },
          acknowledge_faults: {
            id: "acknowledge_faults",
            kind: "acknowledge_faults",
            title: "Acknowledge Faults",
            progress_signals: ["fault_active"]
          }
        }
      }
    },
    implementation: {
      native: null,
      composition: null,
      state: null,
      flow: null
    },
    diagnostics: {}
  };

  project.definitions.packages.boiler_supervisor.meta.title = "Boiler Supervisor Coordination v1";
  project.definitions.packages.boiler_supervisor.meta.description = "Supervisory boiler package with package-level supervision and coordination metadata.";
  project.definitions.packages.boiler_supervisor.meta.package_kind = "boiler_supervisor_coordination_v1";
  project.definitions.packages.boiler_supervisor.members.pump_group_1 = {
    id: "pump_group_1",
    kind: "package_member",
    type_ref: "project:pump_group",
    title: "Pump Group"
  };
  project.definitions.packages.boiler_supervisor.boundary_notes = [
    "BoilerSupervisorCoordination v1 is supervisory only. It excludes burner safety, flame supervision, ignition sequencing, and certified shutdown logic.",
    "Package coordination remains authoring-level orchestration over already supported child operation lanes."
  ];
  project.definitions.packages.boiler_supervisor.coordination = {
    package_state: {
      id: "package_state",
      title: "Package State",
      default_state: "standby",
      states: {
        standby: {
          id: "standby",
          state: "standby",
          source_ports: [
            { member_id: "pid_1", port_id: "in_auto" }
          ]
        },
        ready: {
          id: "ready",
          state: "ready",
          source_ports: [
            { member_id: "pump_group_1", port_id: "ready_out" }
          ]
        },
        circulation_active: {
          id: "circulation_active",
          state: "circulation_active",
          source_ports: [
            { member_id: "pump_group_1", port_id: "circulation_active" }
          ]
        },
        control_active: {
          id: "control_active",
          state: "control_active",
          source_ports: [
            { member_id: "pid_1", port_id: "loop_ok" }
          ]
        },
        fault_latched: {
          id: "fault_latched",
          state: "fault_latched",
          source_ports: [
            { member_id: "threshold_monitor_1", port_id: "alarm_active" }
          ]
        }
      }
    },
    summary_outputs: {
      ready_summary: {
        id: "ready_summary",
        title: "Ready Summary",
        value_type: "bool",
        source: {
          member_id: "pump_group_1",
          port_id: "ready_out"
        }
      },
      fault_summary: {
        id: "fault_summary",
        title: "Fault Summary",
        value_type: "bool",
        source: {
          member_id: "threshold_monitor_1",
          port_id: "alarm_active"
        }
      },
      circulation_summary: {
        id: "circulation_summary",
        title: "Circulation Summary",
        value_type: "bool",
        source: {
          member_id: "pump_group_1",
          port_id: "circulation_active"
        }
      },
      control_summary: {
        id: "control_summary",
        title: "Control Summary",
        value_type: "bool",
        source: {
          member_id: "pid_1",
          port_id: "loop_ok"
        }
      }
    },
    aggregate_monitors: {
      coordination_health: {
        id: "coordination_health",
        title: "Coordination Health",
        kind: "boolean_health_rollup",
        source_ports: [
          { member_id: "pump_group_1", port_id: "ready_out" },
          { member_id: "threshold_monitor_1", port_id: "source_ok" }
        ],
        severity: "warning"
      }
    },
    trace_groups: {
      coordination_trace: {
        id: "coordination_trace",
        title: "Coordination Trace",
        signals: [
          { member_id: "pump_group_1", port_id: "circulation_active" },
          { member_id: "pid_1", port_id: "loop_ok" },
          { member_id: "maintenance_counter_1", port_id: "remaining_out" }
        ]
      }
    },
    operation_proxies: {
      start_supervision: {
        id: "start_supervision",
        title: "Start Supervision",
        kind: "start_supervision",
        target_member_id: "pump_group_1",
        target_operation_id: "start_supervision",
        child_operation_kind: "start_supervision"
      },
      stop_supervision: {
        id: "stop_supervision",
        title: "Stop Supervision",
        kind: "stop_supervision",
        target_member_id: "pump_group_1",
        target_operation_id: "stop_supervision",
        child_operation_kind: "stop_supervision"
      },
      acknowledge_faults: {
        id: "acknowledge_faults",
        title: "Acknowledge Faults",
        kind: "acknowledge_faults",
        target_member_id: "threshold_monitor_1",
        target_operation_id: "reset_latch",
        child_operation_kind: "reset_latch"
      },
      reset_package_counters: {
        id: "reset_package_counters",
        title: "Reset Package Counters",
        kind: "reset_package_counters",
        target_member_id: "flowmeter_1",
        target_operation_id: "reset_totalizer",
        child_operation_kind: "reset_totalizer"
      },
      pid_autotune_proxy: {
        id: "pid_autotune_proxy",
        title: "PID Autotune Proxy",
        kind: "pid_autotune_proxy",
        target_member_id: "pid_1",
        target_operation_id: "autotune",
        child_operation_kind: "autotune"
      }
    }
  };

  return project as ProjectModel;
}

function buildBoilerPackageMaterializationProject(): ProjectModel {
  const project = structuredClone(boilerPackageProjectFixture) as any;
  project.definitions.object_types = {
    pid_controller: structuredClone(pidControllerProject.definitions.object_types.pid_controller),
    pulse_flowmeter: structuredClone(pulseFlowmeterProject.definitions.object_types.pulse_flowmeter),
    run_hours_counter: structuredClone(runHoursCounterProject.definitions.object_types.run_hours_counter),
    maintenance_counter: structuredClone(maintenanceCounterProject.definitions.object_types.maintenance_counter),
    threshold_monitor: structuredClone(thresholdMonitorProject.definitions.object_types.threshold_monitor)
  };
  project.hardware.bindings = {
    ...project.hardware.bindings,
    hw_boiler_pkg_1_pid_pv: {
      id: "hw_boiler_pkg_1_pid_pv",
      binding_kind: "analog_in",
      instance_id: "boiler_pkg_1__pid_1",
      port_id: "pv",
      config: {
        pin: 0
      }
    },
    hw_boiler_pkg_1_pid_mv: {
      id: "hw_boiler_pkg_1_pid_mv",
      binding_kind: "analog_out",
      instance_id: "boiler_pkg_1__pid_1",
      port_id: "mv_out",
      config: {
        pin: 25
      }
    },
    hw_boiler_pkg_1_flowmeter_pulse: {
      id: "hw_boiler_pkg_1_flowmeter_pulse",
      binding_kind: "digital_in",
      instance_id: "boiler_pkg_1__flowmeter_1",
      port_id: "pulse_in",
      config: {
        pin: 26
      }
    },
    hw_boiler_pkg_1_runtime_active: {
      id: "hw_boiler_pkg_1_runtime_active",
      binding_kind: "digital_in",
      instance_id: "boiler_pkg_1__run_hours_1",
      port_id: "active_in",
      config: {
        pin: 27
      }
    },
    hw_boiler_pkg_1_threshold_value: {
      id: "hw_boiler_pkg_1_threshold_value",
      binding_kind: "analog_in",
      instance_id: "boiler_pkg_1__threshold_monitor_1",
      port_id: "value_in",
      config: {
        pin: 32
      }
    }
  };

  return project as ProjectModel;
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
