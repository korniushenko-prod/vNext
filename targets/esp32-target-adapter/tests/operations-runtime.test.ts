import { strict as assert } from "node:assert";
import test from "node:test";

import {
  buildSyntheticOperationSnapshots,
  buildSyntheticPackageArbitrationSnapshots,
  buildSyntheticPackageOverrideHandoverSnapshots,
  createEsp32TargetAdapter,
  validateEsp32OperationSnapshots
} from "../src/index.js";
import { buildSyntheticPackageProtectionRecoverySnapshots } from "../src/package-protection-recovery.js";
import {
  boilerSupervisorArbitrationRuntimePack,
  boilerSupervisorOverridesRuntimePack,
  boilerSupervisorProtectionRuntimePack,
  pidControllerAutotuneExecutionRuntimePack,
  pidControllerRuntimePack
} from "./runtime-pack-fixtures.js";
import { createCombinedExecutionBaselineRuntimePack } from "./execution-baseline-fixtures.js";

test("synthetic operation snapshots are deterministic for operation-bearing runtime packs", () => {
  const snapshots = buildSyntheticOperationSnapshots(pidControllerRuntimePack);

  assert.deepEqual(Object.keys(snapshots), [
    "op_pid_1_hold",
    "op_pid_1_release",
    "op_pid_1_reset_integral"
  ]);
  assert.equal(snapshots.op_pid_1_hold?.state, "idle");
  assert.equal(snapshots.op_pid_1_release?.state, "idle");
  assert.equal(snapshots.op_pid_1_reset_integral?.state, "idle");
  assert.equal(validateEsp32OperationSnapshots(snapshots).length, 0);
});

test("invalid operation snapshot shape produces the canonical snapshot diagnostic", () => {
  const snapshots = buildSyntheticOperationSnapshots(pidControllerRuntimePack);
  snapshots.op_pid_1_hold.state = "available" as never;

  const diagnostics = validateEsp32OperationSnapshots(snapshots);
  assert.ok(diagnostics.some((entry) => entry.code === "target.operation_snapshot.state.invalid"));
});

test("adapter readback exposes the operation_snapshots container in target-neutral shape", async () => {
  const adapter = createEsp32TargetAdapter();
  const snapshot = await adapter.readback({
    request_id: "rb-1",
    adapter_id: adapter.manifest.id,
    target_id: "esp32.shipcontroller.v1",
    scope: "summary"
  });

  assert.deepEqual(snapshot.operation_snapshots, {});
  assert.deepEqual(snapshot.package_snapshots, {});
  assert.deepEqual(snapshot.package_coordination_snapshots, {});
  assert.deepEqual(snapshot.package_protection_recovery_snapshots, {});
  assert.deepEqual(snapshot.package_arbitration_snapshots, {});
  assert.deepEqual(snapshot.package_override_handover_snapshots, {});
  assert.ok(snapshot.diagnostics.some((entry) => entry.code === "target.operations.snapshot.synthetic"));
  assert.ok(snapshot.diagnostics.some((entry) => entry.code === "target.package_coordination.snapshot.synthetic"));
  assert.ok(snapshot.diagnostics.some((entry) => entry.code === "target.package_protection_recovery.snapshot.synthetic"));
  assert.ok(snapshot.diagnostics.some((entry) => entry.code === "target.package_arbitration.snapshot.synthetic"));
  assert.ok(snapshot.diagnostics.some((entry) => entry.code === "target.package_override_handover.snapshot.synthetic"));
});

test("execution baseline snapshots stay deterministic for generic reset operations", () => {
  const snapshots = buildSyntheticOperationSnapshots(createCombinedExecutionBaselineRuntimePack());

  assert.deepEqual(Object.keys(snapshots), [
    "op_maintenance_counter_1_acknowledge_due",
    "op_maintenance_counter_1_reset_interval",
    "op_run_hours_1_reset_counter"
  ]);
  assert.equal(
    snapshots.op_run_hours_1_reset_counter?.message,
    "Execution baseline ready: offline adapter exposes synthetic reset-operation snapshots only."
  );
  assert.equal(
    snapshots.op_maintenance_counter_1_acknowledge_due?.message,
    "Metadata-only baseline: operation execution is not implemented on ESP32."
  );
  assert.equal(validateEsp32OperationSnapshots(snapshots).length, 0);
});

test("pid autotune snapshots expose deterministic progress payload and recommendation state placeholders", () => {
  const snapshots = buildSyntheticOperationSnapshots(pidControllerAutotuneExecutionRuntimePack);

  assert.equal(snapshots.op_pid_1_autotune?.state, "idle");
  assert.equal(snapshots.op_pid_1_autotune?.progress, 0);
  assert.deepEqual(snapshots.op_pid_1_autotune?.progress_payload, {
    phase: "idle",
    sample_count: 0
  });
  assert.equal(snapshots.op_pid_1_autotune?.recommendation_state, "none");
  assert.equal(
    snapshots.op_pid_1_autotune?.message,
    "PID autotune execution ready: offline adapter exposes synthetic recommendation lifecycle snapshots only."
  );
  assert.equal(validateEsp32OperationSnapshots(snapshots).length, 0);
});

test("package protection/recovery snapshots expose deterministic synthetic trip and recovery states", () => {
  const snapshots = buildSyntheticPackageProtectionRecoverySnapshots(boilerSupervisorProtectionRuntimePack);

  assert.deepEqual(Object.keys(snapshots), ["boiler_supervisor_protection_1"]);
  assert.equal(snapshots.boiler_supervisor_protection_1?.state, "tripped");
  assert.equal(snapshots.boiler_supervisor_protection_1?.trip_states?.pressure_trip.state, "tripped");
  assert.equal(
    snapshots.boiler_supervisor_protection_1?.recovery_request_states?.reset_pressure_trip.availability_state,
    "available"
  );
});

test("package arbitration snapshots expose deterministic synthetic ownership and command states", () => {
  const snapshots = buildSyntheticPackageArbitrationSnapshots(boilerSupervisorArbitrationRuntimePack);

  assert.deepEqual(Object.keys(snapshots), ["boiler_supervisor_arbitration_1"]);
  assert.equal(snapshots.boiler_supervisor_arbitration_1?.state, "accepted");
  assert.equal(snapshots.boiler_supervisor_arbitration_1?.ownership_summary?.active_lane_ids?.[0], "manual_owner");
  assert.equal(snapshots.boiler_supervisor_arbitration_1?.command_lane_states?.reset_service.arbitration_result, "blocked");
  assert.equal(snapshots.boiler_supervisor_arbitration_1?.command_lane_states?.disable_remote.denied_reason, "manual_owner_active");
});

test("package override/handover snapshots expose deterministic holder and request visibility", () => {
  const snapshots = buildSyntheticPackageOverrideHandoverSnapshots(boilerSupervisorOverridesRuntimePack);

  assert.deepEqual(Object.keys(snapshots), ["boiler_supervisor_overrides_1"]);
  assert.equal(snapshots.boiler_supervisor_overrides_1?.state, "accepted");
  assert.equal(snapshots.boiler_supervisor_overrides_1?.handover_summary?.current_holder_id, "manual_owner");
  assert.equal(snapshots.boiler_supervisor_overrides_1?.handover_request_states?.service_takeover.state, "blocked");
  assert.equal(snapshots.boiler_supervisor_overrides_1?.handover_request_states?.remote_takeover.denied_reason, "held_by_other_owner");
});

test("invoke and cancel contracts expose execution baseline and pid autotune synthetic results without imperative runtime hooks", async () => {
  const adapter = createEsp32TargetAdapter();
  const pendingResult = await adapter.invokeOperation?.({
    operation_id: "op_run_hours_1_reset_counter"
  });
  const invokeResult = await adapter.invokeOperation?.({
    operation_id: "op_run_hours_1_reset_counter",
    confirmation_token: "confirm-reset"
  });
  const metadataOnlyInvokeResult = await adapter.invokeOperation?.({
    operation_id: "op_pid_1_hold"
  });
  const autotunePendingResult = await adapter.invokeOperation?.({
    operation_id: "op_pid_1_autotune"
  });
  const autotuneInvokeResult = await adapter.invokeOperation?.({
    operation_id: "op_pid_1_autotune",
    confirmation_token: "confirm-autotune"
  });
  const autotuneApplyResult = await adapter.invokeOperation?.({
    operation_id: "op_pid_1_autotune",
    action: "apply_recommendation",
    confirmation_token: "confirm-apply"
  });
  const autotuneRejectResult = await adapter.invokeOperation?.({
    operation_id: "op_pid_1_autotune",
    action: "reject_recommendation",
    confirmation_token: "confirm-reject"
  });
  const cancelResult = await adapter.cancelOperation?.({
    operation_id: "op_run_hours_1_reset_counter"
  });
  const autotuneCancelResult = await adapter.cancelOperation?.({
    operation_id: "op_pid_1_autotune"
  });
  const metadataOnlyCancelResult = await adapter.cancelOperation?.({
    operation_id: "op_pid_1_hold"
  });

  assert.deepEqual(pendingResult, {
    accepted: false,
    state: "pending_confirmation",
    message: "ESP32 execution baseline requires a confirmation token for generic reset operations."
  });
  assert.deepEqual(invokeResult, {
    accepted: true,
    state: "completed",
    message: "ESP32 offline adapter exposes only synthetic execution-baseline completion for generic reset operations.",
    audit_record_id: "audit_op_run_hours_1_reset_counter"
  });
  assert.deepEqual(cancelResult, {
    accepted: false,
    state: "rejected",
    message: "ESP32 execution baseline supports only not_cancellable generic reset operations."
  });
  assert.deepEqual(autotunePendingResult, {
    accepted: false,
    state: "pending_confirmation",
    message: "ESP32 PID autotune execution requires a confirmation token."
  });
  assert.deepEqual(autotuneInvokeResult, {
    accepted: true,
    state: "running",
    message: "ESP32 offline adapter exposes only synthetic PID autotune progress.",
    audit_record_id: "audit_op_pid_1_autotune",
    progress_payload: {
      phase: "relay_test",
      sample_count: 0
    },
    recommendation_state: "none"
  });
  assert.deepEqual(autotuneApplyResult, {
    accepted: true,
    state: "completed",
    message: "ESP32 offline adapter exposes only synthetic PID autotune recommendation apply.",
    audit_record_id: "audit_op_pid_1_autotune_apply",
    recommendation_state: "applied"
  });
  assert.deepEqual(autotuneRejectResult, {
    accepted: true,
    state: "rejected",
    message: "ESP32 offline adapter exposes only synthetic PID autotune recommendation rejection.",
    audit_record_id: "audit_op_pid_1_autotune_reject",
    recommendation_state: "rejected"
  });
  assert.deepEqual(autotuneCancelResult, {
    accepted: true,
    state: "cancelled",
    message: "ESP32 offline adapter exposes only synthetic PID autotune cancellation.",
    audit_record_id: "audit_op_pid_1_autotune_cancel",
    recommendation_state: "none"
  });
  assert.deepEqual(metadataOnlyInvokeResult, {
    accepted: false,
    state: "rejected",
    message: "ESP32 metadata-only baseline does not execute runtime operations."
  });
  assert.deepEqual(metadataOnlyCancelResult, {
    accepted: false,
    state: "rejected",
    message: "ESP32 metadata-only baseline does not execute runtime operations."
  });
});
