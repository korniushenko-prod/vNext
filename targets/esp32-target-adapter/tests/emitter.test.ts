import { strict as assert } from "node:assert";
import test from "node:test";

import boilerPackageArtifact from "./fixtures/boiler-package-skeleton.shipcontroller-artifact.json" with { type: "json" };
import boilerSupervisorProtectionArtifact from "./fixtures/boiler-supervisor-protection.shipcontroller-artifact.json" with { type: "json" };
import boilerSupervisorCoordinationArtifact from "./fixtures/boiler-supervisor-coordination.shipcontroller-artifact.json" with { type: "json" };
import boilerSupervisorArtifact from "./fixtures/boiler-supervisor.shipcontroller.artifact.snapshot.json" with { type: "json" };
import pidAutotuneRuntimePack from "./fixtures/pid-controller-autotune.runtime-pack.json" with { type: "json" };
import pulseFlowmeterArtifact from "./fixtures/pulse-flowmeter.shipcontroller-artifact.json" with { type: "json" };
import pidControllerAutotuneArtifact from "./fixtures/pid-controller-autotune.shipcontroller-artifact.json" with { type: "json" };
import pidControllerArtifact from "./fixtures/pid-controller.shipcontroller-artifact.json" with { type: "json" };
import pumpSkidSupervisorProtectionArtifact from "./fixtures/pump-skid-supervisor-protection.shipcontroller-artifact.json" with { type: "json" };
import eventCounterArtifact from "./fixtures/event-counter.shipcontroller-artifact.json" with { type: "json" };
import maintenanceCounterArtifact from "./fixtures/maintenance-counter.shipcontroller-artifact.json" with { type: "json" };
import commBridgeArtifact from "./fixtures/comm-bridge.shipcontroller-artifact.json" with { type: "json" };
import combinedRemotePointArtifact from "./fixtures/combined-remote-point.shipcontroller-artifact.json" with { type: "json" };
import combinedExecutionBaselineArtifact from "./fixtures/combined-execution-baseline.shipcontroller-artifact.json" with { type: "json" };
import remotePointFrontendArtifact from "./fixtures/remote-point-frontend.shipcontroller-artifact.json" with { type: "json" };
import maintenanceExecutionBaselineArtifact from "./fixtures/maintenance-execution-baseline.shipcontroller-artifact.json" with { type: "json" };
import pulseFlowmeterExecutionBaselineArtifact from "./fixtures/pulse-flowmeter-execution-baseline.shipcontroller-artifact.json" with { type: "json" };
import runHoursToMaintenanceArtifact from "./fixtures/run-hours-to-maintenance.shipcontroller-artifact.json" with { type: "json" };
import runHoursCounterArtifact from "./fixtures/run-hours-counter.shipcontroller-artifact.json" with { type: "json" };
import runHoursExecutionBaselineArtifact from "./fixtures/run-hours-execution-baseline.shipcontroller-artifact.json" with { type: "json" };
import thresholdMonitorArtifact from "./fixtures/threshold-monitor.shipcontroller-artifact.json" with { type: "json" };
import timedRelayArtifact from "./fixtures/timed-relay.shipcontroller-artifact.json" with { type: "json" };
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
  pumpSkidSupervisorProtectionRuntimePack,
  pidControllerRuntimePack,
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

import { emitShipControllerConfigArtifact } from "../src/index.js";

test("emitter creates a ShipController-shaped artifact for a valid runtime pack", () => {
  const artifact = emitShipControllerConfigArtifact(timedRelayRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "timed-relay-demo-pack");
  assert.equal(artifact.artifacts.digital_inputs.length, 1);
  assert.equal(artifact.artifacts.digital_outputs.length, 1);
  assert.equal(artifact.artifacts.timed_relays.length, 1);
});

test("emitter is byte-stable for the same input after canonical stringify", () => {
  const first = emitShipControllerConfigArtifact(timedRelayRuntimePack);
  const second = emitShipControllerConfigArtifact(timedRelayRuntimePack);

  assert.equal(canonicalStringify(first), canonicalStringify(second));
  assert.equal(canonicalStringify(first), canonicalStringify(timedRelayArtifact));
});

test("artifact does not contain UI or editor fields", () => {
  const artifact = emitShipControllerConfigArtifact(timedRelayRuntimePack) as unknown as Record<string, unknown>;

  assert.equal("layouts" in artifact, false);
  assert.equal("views" in artifact, false);
  assert.equal("hardware" in artifact, false);
  assert.equal(JSON.stringify(artifact).includes("source_scope"), false);
  assert.equal(JSON.stringify(artifact).includes("native_execution_placeholders"), false);
});

test("emitter does not mutate the input runtime pack", () => {
  const before = canonicalStringify(timedRelayRuntimePack);
  emitShipControllerConfigArtifact(timedRelayRuntimePack);
  const after = canonicalStringify(timedRelayRuntimePack);

  assert.equal(after, before);
});

test("pulse flowmeter emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(pulseFlowmeterRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "pulse-flowmeter-demo-pack");
  assert.equal(artifact.artifacts.digital_inputs.length, 1);
  assert.equal(artifact.artifacts.analog_inputs.length, 0);
  assert.equal(artifact.artifacts.pulse_flowmeters.length, 1);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(pulseFlowmeterArtifact)
  );
});

test("pulse flowmeter artifact does not contain editor/runtime-noise fields", () => {
  const artifact = emitShipControllerConfigArtifact(pulseFlowmeterRuntimePack) as unknown as Record<string, unknown>;

  assert.equal("layouts" in artifact, false);
  assert.equal("views" in artifact, false);
  assert.equal("hardware" in artifact, false);
  assert.equal(JSON.stringify(artifact).includes("source_scope"), false);
});

test("pid controller emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(pidControllerRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "pid-controller-demo-pack");
  assert.equal(artifact.artifacts.analog_inputs.length, 1);
  assert.equal(artifact.artifacts.pid_controllers.length, 1);
  assert.equal(
    canonicalStringify(artifact),
    canonicalStringify(pidControllerArtifact)
  );
});

test("pid controller artifact does not contain editor/runtime-noise fields", () => {
  const artifact = emitShipControllerConfigArtifact(pidControllerRuntimePack) as unknown as Record<string, unknown>;

  assert.equal("layouts" in artifact, false);
  assert.equal("views" in artifact, false);
  assert.equal("hardware" in artifact, false);
  assert.equal(JSON.stringify(artifact).includes("source_scope"), false);
});

test("artifact handling remains deterministic and keeps only metadata-only operation fields", () => {
  const artifact = emitShipControllerConfigArtifact(pidControllerRuntimePack) as unknown as Record<string, unknown>;

  assert.equal(JSON.stringify(artifact).includes("\"operations\""), true);
  assert.equal(JSON.stringify(artifact).includes("operation_runtime_contract"), false);
  assert.equal(JSON.stringify(artifact).includes("progress_signals"), false);
  assert.equal(JSON.stringify(artifact).includes("safe_when"), false);
  assert.equal(JSON.stringify(artifact).includes("state_hint"), false);
});

test("boiler package-derived runtime pack emits a deterministic package-neutral ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(boilerPackageRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "boiler-package-skeleton-demo-pack");
  assert.equal(artifact.artifacts.digital_inputs.length, 2);
  assert.equal(artifact.artifacts.analog_inputs.length, 2);
  assert.equal(artifact.artifacts.pulse_flowmeters.length, 1);
  assert.equal(artifact.artifacts.run_hours_counters.length, 1);
  assert.equal(artifact.artifacts.threshold_monitors.length, 1);
  assert.equal(artifact.artifacts.maintenance_counters.length, 1);
  assert.equal(artifact.artifacts.pid_controllers.length, 1);
  assert.equal(JSON.stringify(artifact).includes("package_ref"), false);
  assert.equal(JSON.stringify(artifact).includes("package_id"), false);
  assert.equal(canonicalStringify(artifact), canonicalStringify(boilerPackageArtifact));
});

test("boiler supervisor runtime pack emits a deterministic package supervision artifact summary", () => {
  const artifact = emitShipControllerConfigArtifact(boilerSupervisorRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "boiler-supervisor-demo-pack");
  assert.equal(artifact.artifacts.package_supervision?.length, 1);
  assert.equal(artifact.artifacts.package_supervision?.[0]?.summary_outputs.length, 6);
  assert.equal(artifact.artifacts.package_supervision?.[0]?.aggregate_monitors.length, 1);
  assert.equal(artifact.artifacts.package_supervision?.[0]?.operation_proxies.length, 4);
  assert.equal(JSON.stringify(artifact).includes("package_execution_kind"), false);
  assert.equal(canonicalStringify(artifact), canonicalStringify(boilerSupervisorArtifact));
});

test("boiler supervisor coordination runtime pack emits a deterministic package coordination artifact summary", () => {
  const artifact = emitShipControllerConfigArtifact(boilerSupervisorCoordinationRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "boiler-supervisor-coordination-demo-pack");
  assert.equal(artifact.artifacts.package_coordination?.length, 1);
  assert.equal(artifact.artifacts.package_coordination?.[0]?.package_state.states.length, 5);
  assert.equal(artifact.artifacts.package_coordination?.[0]?.summary_outputs.length, 4);
  assert.equal(artifact.artifacts.package_coordination?.[0]?.aggregate_monitors.length, 1);
  assert.equal(artifact.artifacts.package_coordination?.[0]?.operation_proxies.length, 5);
  assert.equal(JSON.stringify(artifact).includes("package_execution_kind"), false);
  assert.equal(canonicalStringify(artifact), canonicalStringify(boilerSupervisorCoordinationArtifact));
});

test("boiler-like package protection/recovery runtime pack emits a deterministic protection artifact summary", () => {
  const artifact = emitShipControllerConfigArtifact(boilerSupervisorProtectionRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "boiler-supervisor-protection-demo-pack");
  assert.equal(artifact.artifacts.package_protection_recovery?.length, 1);
  assert.equal(artifact.artifacts.package_protection_recovery?.[0]?.trips.length, 1);
  assert.equal(artifact.artifacts.package_protection_recovery?.[0]?.inhibits.length, 1);
  assert.equal(artifact.artifacts.package_protection_recovery?.[0]?.recovery_requests.length, 2);
  assert.equal(canonicalStringify(artifact), canonicalStringify(boilerSupervisorProtectionArtifact));
});

test("pump-skid package protection/recovery runtime pack emits the same generic artifact section", () => {
  const artifact = emitShipControllerConfigArtifact(pumpSkidSupervisorProtectionRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "pump-skid-supervisor-protection-demo-pack");
  assert.equal(artifact.artifacts.package_protection_recovery?.length, 1);
  assert.equal(artifact.artifacts.package_protection_recovery?.[0]?.protection_summary.default_state, "ready");
  assert.equal(canonicalStringify(artifact), canonicalStringify(pumpSkidSupervisorProtectionArtifact));
});

test("comm bridge emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(commBridgeRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "comm-bridge-demo-pack");
  assert.equal(artifact.artifacts.modbus_rtu_buses?.length, 1);
  assert.equal(artifact.artifacts.comm_bridges?.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(commBridgeArtifact));
});

test("remote point frontend emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(remotePointFrontendRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "remote-point-frontend-demo-pack");
  assert.equal(artifact.artifacts.modbus_rtu_buses?.length, 1);
  assert.equal(artifact.artifacts.comm_bridges?.length, 1);
  assert.equal(artifact.artifacts.remote_points?.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(remotePointFrontendArtifact));
});

test("combined remote point emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(createCombinedRemotePointRuntimePack());

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "combined-remote-point-demo-pack");
  assert.equal(artifact.artifacts.modbus_rtu_buses?.length, 1);
  assert.equal(artifact.artifacts.comm_bridges?.length, 1);
  assert.equal(artifact.artifacts.remote_points?.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(combinedRemotePointArtifact));
});

test("run hours counter emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(runHoursCounterRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "run-hours-counter-demo-pack");
  assert.equal(artifact.artifacts.digital_inputs.length, 1);
  assert.equal(artifact.artifacts.run_hours_counters.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(runHoursCounterArtifact));
});

test("event counter emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(eventCounterRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "event-counter-demo-pack");
  assert.equal(artifact.artifacts.digital_inputs.length, 1);
  assert.equal(artifact.artifacts.event_counters.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(eventCounterArtifact));
});

test("threshold monitor emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(thresholdMonitorRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "threshold-monitor-demo-pack");
  assert.equal(artifact.artifacts.analog_inputs.length, 1);
  assert.equal(artifact.artifacts.threshold_monitors.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(thresholdMonitorArtifact));
});

test("maintenance counter emitter creates a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(maintenanceCounterRuntimePack);

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "maintenance-counter-demo-pack");
  assert.equal(artifact.artifacts.analog_inputs.length, 1);
  assert.equal(artifact.artifacts.maintenance_counters.length, 1);
  assert.equal(canonicalStringify(artifact), canonicalStringify(maintenanceCounterArtifact));
});

test("run hours to maintenance chain emits a deterministic ShipController artifact", () => {
  const artifact = emitShipControllerConfigArtifact(createRunHoursToMaintenanceRuntimePack());

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(artifact.source_pack_id, "run-hours-to-maintenance-demo-pack");
  assert.equal(artifact.artifacts.run_hours_counters.length, 1);
  assert.equal(artifact.artifacts.maintenance_counters.length, 1);
  assert.equal(artifact.artifacts.maintenance_counters[0]?.usage_source.instance_id, "run_hours_1");
  assert.equal(artifact.artifacts.maintenance_counters[0]?.usage_source.port_id, "total_hours");
  assert.equal(artifact.artifacts.maintenance_counters[0]?.usage_source.resource_id, undefined);
  assert.equal(canonicalStringify(artifact), canonicalStringify(runHoursToMaintenanceArtifact));
});

test("pulse flowmeter execution baseline artifact exposes deterministic reset execution metadata only", () => {
  const artifact = emitShipControllerConfigArtifact(createPulseFlowmeterExecutionBaselineRuntimePack());
  const operation = artifact.artifacts.operations?.find((entry) => entry.id === "op_flowmeter_1_reset_totalizer");

  assert.equal(artifact.target_kind, "esp32.shipcontroller.v1");
  assert.equal(operation?.execution_baseline, true);
  assert.equal(operation?.metadata_only, undefined);
  assert.equal(operation?.confirmation_token_validation, "when_required");
  assert.equal(operation?.cancel_mode, "not_cancellable");
  assert.equal(operation?.audit_hook_mode, "operation_events");
  assert.equal(canonicalStringify(artifact), canonicalStringify(pulseFlowmeterExecutionBaselineArtifact));
});

test("run hours execution baseline artifact exposes deterministic reset execution metadata only", () => {
  const artifact = emitShipControllerConfigArtifact(createRunHoursExecutionBaselineRuntimePack());
  const operation = artifact.artifacts.operations?.find((entry) => entry.id === "op_run_hours_1_reset_counter");

  assert.equal(operation?.execution_baseline, true);
  assert.equal(operation?.confirmation_token_validation, "when_required");
  assert.equal(operation?.cancel_mode, "not_cancellable");
  assert.equal(operation?.result_mode, "applyable_result");
  assert.equal(canonicalStringify(artifact), canonicalStringify(runHoursExecutionBaselineArtifact));
});

test("maintenance execution baseline artifact keeps reset_interval execution-capable while acknowledge_due stays metadata-only", () => {
  const artifact = emitShipControllerConfigArtifact(createMaintenanceExecutionBaselineRuntimePack());
  const acknowledgeOperation = artifact.artifacts.operations?.find((entry) => entry.id === "op_maintenance_counter_1_acknowledge_due");
  const resetOperation = artifact.artifacts.operations?.find((entry) => entry.id === "op_maintenance_counter_1_reset_interval");

  assert.equal(acknowledgeOperation?.metadata_only, true);
  assert.equal(acknowledgeOperation?.execution_baseline, undefined);
  assert.equal(resetOperation?.execution_baseline, true);
  assert.equal(resetOperation?.confirmation_token_validation, "when_required");
  assert.equal(resetOperation?.audit_hook_mode, "operation_events");
  assert.equal(canonicalStringify(artifact), canonicalStringify(maintenanceExecutionBaselineArtifact));
});

test("pid autotune artifact exposes deterministic specialized execution metadata", () => {
  const artifact = emitShipControllerConfigArtifact(pidAutotuneRuntimePack as any);
  const autotuneOperation = artifact.artifacts.operations?.find((entry) => entry.id === "op_pid_1_autotune");

  assert.equal(autotuneOperation?.specialized_execution, "pid_autotune");
  assert.equal(autotuneOperation?.metadata_only, undefined);
  assert.equal(autotuneOperation?.execution_baseline, undefined);
  assert.equal(autotuneOperation?.confirmation_token_validation, "when_required");
  assert.equal(autotuneOperation?.progress_payload_supported, true);
  assert.equal(autotuneOperation?.recommendation_lifecycle_mode, "apply_reject");
  assert.equal(autotuneOperation?.audit_hook_mode, "operation_events");
  assert.equal(canonicalStringify(artifact), canonicalStringify(pidControllerAutotuneArtifact));
});

test("combined execution baseline artifact stays deterministic with multiple execution-capable reset operations", () => {
  const artifact = emitShipControllerConfigArtifact(createCombinedExecutionBaselineRuntimePack());

  assert.equal(artifact.artifacts.operations?.filter((entry) => entry.execution_baseline === true).length, 2);
  assert.equal(
    artifact.artifacts.operations?.some((entry) => entry.id === "op_maintenance_counter_1_acknowledge_due" && entry.metadata_only === true),
    true
  );
  assert.equal(canonicalStringify(artifact), canonicalStringify(combinedExecutionBaselineArtifact));
  assert.equal(JSON.stringify(artifact).includes("invokeOperation"), false);
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
