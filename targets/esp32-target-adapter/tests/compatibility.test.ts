import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import compatibilityOk from "./fixtures/compatibility-ok.json" with { type: "json" };
import compatibilityTooManyConnections from "./fixtures/compatibility-too-many-connections.json" with { type: "json" };
import compatibilityUnsupportedBinding from "./fixtures/compatibility-unsupported-binding.json" with { type: "json" };
import compatibilityMixedErrors from "./fixtures/compatibility-mixed-errors.json" with { type: "json" };
import capabilityHardeningCompatibilitySnapshot from "./fixtures/capability-hardening-demo.compatibility.snapshot.json" with { type: "json" };
import {
  commBridgeRuntimePack,
  createCombinedRemotePointRuntimePack,
  remotePointFrontendRuntimePack
} from "./comm-fixtures.js";
import {
  boilerPackageRuntimePack,
  boilerSupervisorProtectionRuntimePack,
  boilerSupervisorCoordinationRuntimePack,
  boilerSupervisorRuntimePack,
  capabilityHardeningRuntimePack,
  pidControllerAutotuneExecutionRuntimePack,
  pidControllerRuntimePack,
  pumpSkidSupervisorProtectionRuntimePack,
  pulseFlowmeterRuntimePack,
  timedRelayRuntimePack
} from "./runtime-pack-fixtures.js";
import {
  createCombinedExecutionBaselineRuntimePack,
  createMaintenanceExecutionBaselineRuntimePack,
  createPulseFlowmeterExecutionBaselineRuntimePack,
  createRunHoursExecutionBaselineRuntimePack
} from "./execution-baseline-fixtures.js";
import {
  createRunHoursToMaintenanceRuntimePack,
  eventCounterRuntimePack,
  maintenanceCounterRuntimePack,
  runHoursCounterRuntimePack,
  thresholdMonitorRuntimePack
} from "./wave3-fixtures.js";

import {
  buildEsp32ApplyPlan,
  checkEsp32Compatibility,
  createEsp32TargetAdapter,
  esp32CapabilityProfile
} from "../src/index.js";

test("exports a stable capability profile", () => {
  assert.equal(esp32CapabilityProfile.target_id, "esp32.shipcontroller.v1");
  assert.ok(esp32CapabilityProfile.supported_binding_kinds.includes("digital_out"));
  assert.ok(esp32CapabilityProfile.supported_channel_kinds.includes("signal"));
  assert.ok(esp32CapabilityProfile.supported_value_types.includes("bool"));
  assert.ok(esp32CapabilityProfile.supported_native_kinds.includes("std.timed_relay.v1"));
  assert.ok(esp32CapabilityProfile.supported_native_kinds.includes("std.run_hours_counter.v1"));
  assert.ok(esp32CapabilityProfile.supported_native_kinds.includes("std.event_counter.v1"));
  assert.ok(esp32CapabilityProfile.supported_native_kinds.includes("std.threshold_monitor.v1"));
  assert.ok(esp32CapabilityProfile.supported_native_kinds.includes("std.maintenance_counter.v1"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("offline_validate"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("reset_counter"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("reset_latch"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("acknowledge_due"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("reset_interval"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("reset_hours"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("reset_maintenance"));
  assert.ok(esp32CapabilityProfile.supported_operation_kinds.includes("pid_autotune"));
  assert.equal(esp32CapabilityProfile.supports_trace, true);
  assert.equal(esp32CapabilityProfile.supports_operations, true);
  assert.deepEqual(esp32CapabilityProfile.package_supervision_support, {
    enabled: true,
    summary_outputs: true,
    aggregate_monitors: true,
    aggregate_alarms: true,
    trace_groups: true,
    operation_proxies: true
  });
  assert.deepEqual(esp32CapabilityProfile.package_coordination_support, {
    enabled: true,
    package_state: true,
    summary_outputs: true,
    aggregate_monitors: true,
    trace_groups: true,
    operation_proxies: true
  });
  assert.deepEqual(esp32CapabilityProfile.package_protection_recovery_support, {
    enabled: true,
    protection_summary: true,
    reason_codes: true,
    diagnostics_refs: true,
    recovery_requests: true
  });
  assert.deepEqual(esp32CapabilityProfile.package_arbitration_support, {
    enabled: true,
    ownership_lanes: true,
    command_summary: true,
    reason_codes: true,
    request_preview: true,
    supported_ownership_lanes: ["auto", "manual", "service", "remote"],
    supported_request_kinds: [
      "request_start",
      "request_stop",
      "request_reset",
      "request_enable",
      "request_disable"
    ]
  });
  assert.deepEqual(esp32CapabilityProfile.package_override_handover_support, {
    enabled: true,
    holder_visibility: true,
    request_visibility: true,
    reason_codes: true,
    last_handover_reason: true,
    supported_holder_lanes: ["auto", "manual", "service", "remote"],
    supported_request_kinds: [
      "request_takeover",
      "request_release",
      "request_return_to_auto"
    ],
    supported_denial_reasons: [
      "blocked_by_policy",
      "held_by_other_owner",
      "not_available"
    ]
  });
  assert.deepEqual(esp32CapabilityProfile.operations_support, {
    enabled: true,
    invoke: true,
    cancel: true,
    progress: true,
    result_payload: true,
    confirmation: true,
    execution_baseline_kinds: ["reset_totalizer", "reset_counter", "reset_interval"],
    confirmation_token_validation: "when_required",
    failure_payload: true,
    audit_hooks: true,
    recommendation_lifecycle: true,
    progress_payload: true
  });
  assert.equal(esp32CapabilityProfile.supports_persistence, true);
  assert.ok(esp32CapabilityProfile.supported_pulse_source_modes?.includes("hall_pulse"));
});

test("valid runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(compatibilityOk as unknown as RuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("too many connections produces the canonical limit diagnostic", () => {
  const result = checkEsp32Compatibility(compatibilityTooManyConnections as unknown as RuntimePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.connections.limit"));
});

test("unsupported binding produces the canonical unsupported binding diagnostic", () => {
  const result = checkEsp32Compatibility(compatibilityUnsupportedBinding as unknown as RuntimePack);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.binding.unsupported"));
});

test("unsupported native kind produces the canonical native diagnostic", () => {
  const mutated = structuredClone(compatibilityOk) as unknown as RuntimePack;
  mutated.instances.relay_1.native_execution = {
    native_kind: "std.unknown.v1"
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.native_kind.unsupported"));
});

test("target kind mismatch produces the canonical target mismatch diagnostic", () => {
  const mutated = structuredClone(compatibilityOk) as unknown as RuntimePack;
  mutated.instances.relay_1.native_execution = {
    native_kind: "std.timed_relay.v1",
    target_kinds: ["other.target.v1"]
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.target_kind.mismatch"));
});

test("diagnostic codes are stable and deterministic", () => {
  const result = checkEsp32Compatibility(compatibilityMixedErrors as unknown as RuntimePack);
  assert.equal(result.ok, false);
  assert.deepEqual(result.diagnostics.map((entry) => entry.code), [
    "target.binding.unsupported",
    "target.channel_kind.unsupported",
    "target.value_type.unsupported",
    "target.value_type.unsupported"
  ]);
});

test("capability hardening runtime pack passes compatibility as a golden snapshot", () => {
  const result = checkEsp32Compatibility(capabilityHardeningRuntimePack as unknown as RuntimePack);
  assert.deepEqual(result, capabilityHardeningCompatibilitySnapshot);
});

test("boiler package-derived runtime pack passes compatibility without package-specific hooks", () => {
  const result = checkEsp32Compatibility(boilerPackageRuntimePack as unknown as RuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("boiler supervisor runtime pack passes compatibility with package supervision metadata", () => {
  const result = checkEsp32Compatibility(boilerSupervisorRuntimePack as unknown as RuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("boiler supervisor coordination runtime pack passes compatibility with package coordination metadata", () => {
  const result = checkEsp32Compatibility(boilerSupervisorCoordinationRuntimePack as unknown as RuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("package supervision catches missing child artifact sources canonically", () => {
  const mutated = structuredClone(boilerSupervisorRuntimePack) as unknown as RuntimePack;
  mutated.package_supervision!.pkg_boiler_pkg_1.summary_outputs!.runtime_total.source.instance_id = "missing_runtime_member";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_supervision.source.unresolved"));
});

test("package supervision catches invalid proxy mappings canonically", () => {
  const mutated = structuredClone(boilerSupervisorRuntimePack) as unknown as RuntimePack;
  mutated.package_supervision!.pkg_boiler_pkg_1.operation_proxies!.pid_autotune.target_operation_id = "op_missing_pid_autotune";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_supervision.operation_proxy.invalid"));
});

test("package supervision rejects unsupported aggregate monitor rollups canonically", () => {
  const mutated = structuredClone(boilerSupervisorRuntimePack) as unknown as RuntimePack;
  mutated.package_supervision!.pkg_boiler_pkg_1.aggregate_monitors!.health_rollup.kind = "weighted_health_rollup";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_supervision.monitor_rollup.unsupported"));
});

test("package coordination catches missing state sources canonically", () => {
  const mutated = structuredClone(boilerSupervisorCoordinationRuntimePack) as unknown as RuntimePack;
  mutated.package_coordination!.pkgcoord_boiler_pkg_1.package_state.states.ready.source_ports[0].instance_id = "missing_coordination_member";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_coordination.state_source.unresolved"));
});

test("package coordination catches invalid proxy mappings canonically", () => {
  const mutated = structuredClone(boilerSupervisorCoordinationRuntimePack) as unknown as RuntimePack;
  mutated.package_coordination!.pkgcoord_boiler_pkg_1.operation_proxies!.pid_autotune_proxy.target_operation_id = "op_missing_pid_autotune";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_coordination.operation_proxy.invalid"));
});

test("package coordination rejects unsupported aggregate monitor rollups canonically", () => {
  const mutated = structuredClone(boilerSupervisorCoordinationRuntimePack) as unknown as RuntimePack;
  mutated.package_coordination!.pkgcoord_boiler_pkg_1.aggregate_monitors!.coordination_health.kind = "weighted_health_rollup";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_coordination.monitor_rollup.unsupported"));
});

test("boiler package-derived runtime pack still rejects unsupported binding kinds canonically", () => {
  const mutated = structuredClone(boilerPackageRuntimePack) as unknown as RuntimePack;
  (mutated.resources.hw_boiler_pkg_1_threshold_value as { binding_kind: string }).binding_kind = "vendor_panel";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.binding.unsupported"));
});

test("boiler package-derived runtime pack rejects unsupported comm bridge baseline drift canonically", () => {
  const mutated = structuredClone(boilerPackageRuntimePack) as unknown as RuntimePack;
  mutated.instances.boiler_pkg_1__pid_1.native_execution = {
    native_kind: "std.comm_bridge.v1",
    target_kinds: ["esp32.shipcontroller.v1"],
    mode: "modbus_tcp",
    frontend_requirement_ids: ["fe_boiler_pkg_1__pid_1_pv_source"],
    config_template: {
      access_mode: "write_only"
    }
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.comm_bridge.mode.unsupported"));
});

test("unsupported frontend mode produces the canonical frontend mode diagnostic", () => {
  const mutated = structuredClone(capabilityHardeningRuntimePack) as unknown as RuntimePack;
  mutated.frontend_requirements.fe_meter_1_pulse_source.mode = "mystery_mode";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.frontend.mode.unsupported"));
});

test("missing required frontend resource produces the canonical missing resource diagnostic", () => {
  const mutated = structuredClone(capabilityHardeningRuntimePack) as unknown as RuntimePack;
  delete mutated.resources.res_meter_1_pulse_source;

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.frontend.resource.missing"));
});

test("pulse flowmeter hall_pulse runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(pulseFlowmeterRuntimePack as unknown as RuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("pulse flowmeter analog_threshold_pulse runtime pack passes compatibility", () => {
  const mutated = structuredClone(pulseFlowmeterRuntimePack) as unknown as RuntimePack;

  mutated.instances.flowmeter_1.native_execution!.mode = "analog_threshold_pulse";
  mutated.instances.flowmeter_1.native_execution!.frontend_requirement_ids = [
    "fe_flowmeter_1_analog_threshold_source"
  ];
  mutated.frontend_requirements.fe_flowmeter_1_hall_pulse_source.required = false;
  mutated.frontend_requirements.fe_flowmeter_1_analog_threshold_source.required = true;
  mutated.connections.conn_sig_pulse_source_to_flowmeter_t1.channel_kind = "telemetry";
  mutated.connections.conn_sig_pulse_source_to_flowmeter_t1.value_type = "float";
  mutated.connections.conn_sig_pulse_source_to_flowmeter_t1.target.port_id = "analog_source";
  mutated.resources.hw_pulse_source_1.binding_kind = "analog_in";
  mutated.instances.pulse_source_1.native_execution = {
    native_kind: "std.analog_input.v1",
    target_kinds: ["esp32.shipcontroller.v1"]
  };
  mutated.instances.pulse_source_1.ports.value.channel_kind = "telemetry";
  mutated.instances.pulse_source_1.ports.value.value_type = "float";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("pulse flowmeter remote_pulse runtime pack passes compatibility", () => {
  const mutated = structuredClone(pulseFlowmeterRuntimePack) as unknown as RuntimePack;

  mutated.instances.flowmeter_1.native_execution!.mode = "remote_pulse";
  mutated.instances.flowmeter_1.native_execution!.frontend_requirement_ids = [
    "fe_flowmeter_1_remote_pulse_source"
  ];
  mutated.frontend_requirements.fe_flowmeter_1_hall_pulse_source.required = false;
  mutated.frontend_requirements.fe_flowmeter_1_remote_pulse_source.required = true;
  mutated.connections.conn_sig_pulse_source_to_flowmeter_t1.target.port_id = "remote_pulse";
  mutated.resources.hw_pulse_source_1.binding_kind = "service";
  delete mutated.instances.pulse_source_1.native_execution;

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("pulse flowmeter unsupported mode produces the canonical flowmeter mode diagnostic", () => {
  const mutated = structuredClone(pulseFlowmeterRuntimePack) as unknown as RuntimePack;

  mutated.instances.flowmeter_1.native_execution!.mode = "mystery_mode";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.flowmeter.mode.unsupported"));
});

test("pulse flowmeter missing active frontend resource produces the canonical resource diagnostic", () => {
  const mutated = structuredClone(pulseFlowmeterRuntimePack) as unknown as RuntimePack;

  delete mutated.resources.hw_pulse_source_1;

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.frontend.resource.missing"));
});

test("pid controller runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(pidControllerRuntimePack as unknown as RuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("pid controller missing required frontend id produces the canonical pid diagnostic", () => {
  const mutated = structuredClone(pidControllerRuntimePack) as unknown as RuntimePack;

  mutated.instances.pid_1.native_execution!.frontend_requirement_ids = ["fe_pid_1_pv_source"];

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.pid.frontend.missing_required"));
});

test("pid controller wrong mv_output binding kind produces the canonical pid binding diagnostic", () => {
  const mutated = structuredClone(pidControllerRuntimePack) as unknown as RuntimePack;

  mutated.frontend_requirements.fe_pid_1_mv_output.binding_kind = "digital_out";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.pid.binding_kind.mismatch"));
});

test("pid controller autotune execution runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(pidControllerAutotuneExecutionRuntimePack);
  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("pid controller autotune without progress payload support produces the canonical runtime diagnostic", () => {
  const mutated = structuredClone(pidControllerAutotuneExecutionRuntimePack) as unknown as RuntimePack;
  if (!mutated.operation_runtime_contract) {
    throw new Error("PID autotune execution runtime contract is required for the compatibility test.");
  }
  mutated.operation_runtime_contract.progress_payload_supported = false;

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation_runtime.progress_payload.unsupported"));
});

test("pid controller autotune with non-recommendation result mode produces the canonical result diagnostic", () => {
  const mutated = structuredClone(pidControllerAutotuneExecutionRuntimePack) as unknown as RuntimePack;
  mutated.operations.op_pid_1_autotune.result_contract = {
    mode: "applyable_result"
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation.result_contract.unsupported"));
});

test("metadata-only operation runtime contract passes compatibility for operation-bearing runtime packs", () => {
  const result = checkEsp32Compatibility(timedRelayRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("comm bridge runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(commBridgeRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("remote point frontend runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(remotePointFrontendRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("combined remote point runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(createCombinedRemotePointRuntimePack());

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("run hours counter runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(runHoursCounterRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("event counter runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(eventCounterRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("threshold monitor runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(thresholdMonitorRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("maintenance counter runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(maintenanceCounterRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("boiler-like package protection/recovery runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(boilerSupervisorProtectionRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("pump-skid package protection/recovery runtime pack passes compatibility", () => {
  const result = checkEsp32Compatibility(pumpSkidSupervisorProtectionRuntimePack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("package protection/recovery missing source produces the canonical package source diagnostic", () => {
  const mutated = structuredClone(boilerSupervisorProtectionRuntimePack) as RuntimePack;
  mutated.package_protection_recovery!.pkgprotect_boiler_supervisor_protection_1.trips.pressure_trip.source_ports[0].instance_id = "missing_trip_member";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_protection_recovery.source.unresolved"));
});

test("package protection/recovery missing recovery proxy target produces the canonical package recovery diagnostic", () => {
  const mutated = structuredClone(boilerSupervisorProtectionRuntimePack) as RuntimePack;
  mutated.package_protection_recovery!.pkgprotect_boiler_supervisor_protection_1.recovery_requests!.reset_pressure_trip.target_operation_id = "op_missing_reset_trip";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.package_protection_recovery.recovery_request.invalid"));
});

test("pulse flowmeter execution baseline pack passes compatibility", () => {
  const result = checkEsp32Compatibility(createPulseFlowmeterExecutionBaselineRuntimePack());

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("run hours execution baseline pack passes compatibility", () => {
  const result = checkEsp32Compatibility(createRunHoursExecutionBaselineRuntimePack());

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("maintenance execution baseline pack passes compatibility while acknowledge_due remains metadata-only", () => {
  const result = checkEsp32Compatibility(createMaintenanceExecutionBaselineRuntimePack());

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("combined execution baseline pack passes compatibility with multiple reset operations", () => {
  const result = checkEsp32Compatibility(createCombinedExecutionBaselineRuntimePack());

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("run hours to maintenance chain passes compatibility without requiring a hardware usage resource", () => {
  const combinedPack = createRunHoursToMaintenanceRuntimePack();
  const result = checkEsp32Compatibility(combinedPack);

  assert.equal(result.ok, true);
  assert.deepEqual(result.diagnostics, []);
});

test("wave 3 missing required input produces the canonical missing connection diagnostic", () => {
  const mutated = structuredClone(eventCounterRuntimePack);

  delete mutated.connections.conn_sig_pulse_source_to_event_counter_t1;
  mutated.frontend_requirements.fe_event_counter_1_event_source.source_ports = [];

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.frontend.connection.missing"));
});

test("wave 3 unsupported value type produces the canonical single-input diagnostic", () => {
  const mutated = structuredClone(thresholdMonitorRuntimePack);

  mutated.connections.conn_sig_process_value_to_threshold_monitor_t1.value_type = "string";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.threshold_monitor.value_type.mismatch"));
});

test("wave 3 persistence requested while target persistence is disabled produces the canonical persistence diagnostic", () => {
  const original = esp32CapabilityProfile.supports_persistence;
  esp32CapabilityProfile.supports_persistence = false;

  try {
    const result = checkEsp32Compatibility(runHoursCounterRuntimePack);

    assert.equal(result.ok, false);
    assert.ok(result.diagnostics.some((entry) => entry.code === "target.persistence.unsupported"));
  } finally {
    esp32CapabilityProfile.supports_persistence = original;
  }
});

test("wave 3 unsupported operation kind produces the canonical operation diagnostic", () => {
  const mutated = structuredClone(maintenanceCounterRuntimePack);

  mutated.operations.op_maintenance_counter_1_reset_interval.kind = "mystery_reset";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation_kind.unsupported"));
});

test("operation runtime contract requiring invocation produces the canonical metadata-only diagnostic", () => {
  const mutated = structuredClone(pidControllerRuntimePack);

  mutated.operation_runtime_contract = {
    ...(mutated.operation_runtime_contract ?? {}),
    invoke_supported: true,
    cancel_supported: false,
    progress_supported: false,
    result_supported: false,
    audit_required: false
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation_runtime.unsupported"));
});

test("execution baseline with unsupported runnable kind produces the canonical operation diagnostic", () => {
  const mutated = createRunHoursExecutionBaselineRuntimePack();
  mutated.operations.op_run_hours_1_reset_counter.kind = "reset_hours";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation.execution_kind.unsupported"));
});

test("operation id must remain qualified by owner instance", () => {
  const mutated = structuredClone(runHoursCounterRuntimePack);

  mutated.operations.op_run_hours_1_reset_counter.id = "reset_counter";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation.id.invalid"));
});

test("execution baseline with unsupported confirmation token rule produces the canonical contract diagnostic", () => {
  const mutated = createPulseFlowmeterExecutionBaselineRuntimePack();
  mutated.operation_runtime_contract = {
    ...mutated.operation_runtime_contract!,
    confirmation_token_validation: "none"
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation_runtime.confirmation.unsupported"));
});

test("execution baseline with unsupported progress mode produces the canonical progress diagnostic", () => {
  const mutated = createPulseFlowmeterExecutionBaselineRuntimePack();

  mutated.operations.op_flowmeter_1_reset_totalizer.progress_mode = "signal_based";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation.progress_mode.unsupported"));
});

test("execution baseline with unsupported result contract produces the canonical result diagnostic", () => {
  const mutated = createMaintenanceExecutionBaselineRuntimePack();

  mutated.operations.op_maintenance_counter_1_reset_interval.result_contract = {
    mode: "recommendation"
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation.result_contract.unsupported"));
});

test("execution baseline with unsupported cancel semantics produces the canonical cancel diagnostic", () => {
  const mutated = createRunHoursExecutionBaselineRuntimePack();

  mutated.operations.op_run_hours_1_reset_counter.cancel_mode = "while_running";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.operation.cancel_mode.unsupported"));
});

test("communications missing bus binding produces the canonical resource diagnostic", () => {
  const mutated = structuredClone(commBridgeRuntimePack);

  delete mutated.resources.rs485_1;

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.frontend.resource.missing"));
});

test("communications missing bridge ref produces the canonical bridge diagnostic", () => {
  const mutated = structuredClone(remotePointFrontendRuntimePack);

  delete mutated.instances.remote_point_1.params.bridge_ref;

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.remote_point.bridge_ref.missing"));
});

test("communications write-oriented scope produces the canonical access-mode diagnostic", () => {
  const mutated = structuredClone(remotePointFrontendRuntimePack);

  mutated.instances.remote_point_1.native_execution!.config_template = {
    ...(mutated.instances.remote_point_1.native_execution!.config_template ?? {}),
    access_mode: "write"
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.remote_point.access_mode.unsupported"));
});

test("communications unsupported direct binding kind produces the canonical bridge binding diagnostic", () => {
  const mutated = structuredClone(commBridgeRuntimePack);

  mutated.resources.rs485_1.binding_kind = "service";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.comm_bridge.binding_kind.mismatch"));
});

test("communications unsupported decode/value-type combination produces the canonical decode diagnostic", () => {
  const mutated = structuredClone(remotePointFrontendRuntimePack);

  mutated.instances.remote_point_1.ports.value_out.value_type = "int";

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.remote_point.decode_combo.unsupported"));
});

test("communications unsupported multi-point semantics produces the canonical scope diagnostic", () => {
  const mutated = structuredClone(remotePointFrontendRuntimePack);

  mutated.instances.remote_point_1.native_execution!.config_template = {
    ...(mutated.instances.remote_point_1.native_execution!.config_template ?? {}),
    scope: "multi_point_batch"
  };

  const result = checkEsp32Compatibility(mutated);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "target.remote_point.scope.unsupported"));
});

test("buildApplyPlan remains deterministic while compatibility becomes stricter", () => {
  const plan = buildEsp32ApplyPlan(compatibilityOk as unknown as RuntimePack);
  assert.deepEqual(plan.steps.map((step) => step.id), [
    "step_validate_pack",
    "step_stage_instances",
    "step_stage_connections",
    "step_stage_resources",
    "step_finalize_report"
  ]);
});

test("factory returns the stricter compatibility behavior", async () => {
  const adapter = createEsp32TargetAdapter();
  assert.equal(adapter.manifest.id, "esp32-target-adapter");
  assert.equal(adapter.checkCompatibility(compatibilityOk as unknown as RuntimePack).ok, true);
  const applyResult = await adapter.apply({
    request_id: "req-1",
    adapter_id: adapter.manifest.id,
      pack: {
      pack_id: (compatibilityOk as unknown as RuntimePack).pack_id,
      schema_version: (compatibilityOk as unknown as RuntimePack).schema_version
    },
    options: {}
  });
  assert.equal(applyResult.success, false);
  assert.ok(applyResult.diagnostics.some((entry) => entry.code === "target.apply.pack_snapshot.missing"));
});
