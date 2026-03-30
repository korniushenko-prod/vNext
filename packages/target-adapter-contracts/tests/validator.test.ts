import { strict as assert } from "node:assert";
import test from "node:test";

import invalidManifest from "./fixtures/manifest-invalid.json" with { type: "json" };
import operationExecutionSnapshot from "./fixtures/operation-execution-snapshot.json" with { type: "json" };
import operationInvocationRequest from "./fixtures/operation-invocation-request.json" with { type: "json" };
import operationPidAutotuneInvocationRequest from "./fixtures/operation-pid-autotune-invocation-request.json" with { type: "json" };
import operationPidAutotuneSnapshot from "./fixtures/operation-pid-autotune-snapshot.json" with { type: "json" };
import operationSnapshot from "./fixtures/operation-snapshot.json" with { type: "json" };
import invalidOperationSnapshot from "./fixtures/operation-snapshot-invalid.json" with { type: "json" };
import operationsCapabilityExecutionBaseline from "./fixtures/operations-capability-execution-baseline.json" with { type: "json" };
import operationsCapabilityEnabled from "./fixtures/operations-capability-enabled.json" with { type: "json" };
import operationsCapabilityPidAutotuneExecution from "./fixtures/operations-capability-pid-autotune-execution.json" with { type: "json" };
import validManifest from "./fixtures/manifest-valid.json" with { type: "json" };
import {
  TARGET_ADAPTER_CONTRACT_VERSION,
  WAVE8_EXECUTION_BASELINE_OPERATION_KINDS,
  validateOperationCancelRequest,
  validateOperationCancelResult,
  validateOperationInvocationRequest,
  validateOperationInvocationResult,
  validateTargetAdapterManifest,
  validateTargetCapabilityProfile,
  validateTargetReadbackSnapshot
} from "../src/index.js";

test("validateTargetAdapterManifest accepts canonical manifest", () => {
  const result = validateTargetAdapterManifest(validManifest);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateTargetAdapterManifest enforces contract version and enum values", () => {
  const result = validateTargetAdapterManifest(invalidManifest);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.contract_version"));
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.capabilities[1]"));
  assert.equal(TARGET_ADAPTER_CONTRACT_VERSION, "0.1.0");
});

test("validateTargetCapabilityProfile accepts operations support declarations", () => {
  const result = validateTargetCapabilityProfile(operationsCapabilityEnabled);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateTargetCapabilityProfile accepts additive execution baseline declarations for generic reset operations", () => {
  const result = validateTargetCapabilityProfile(operationsCapabilityExecutionBaseline);
  assert.equal(result.ok, true);
  assert.deepEqual(
    operationsCapabilityExecutionBaseline.operations_support.execution_baseline_kinds,
    [...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS]
  );
});

test("validateOperationInvocationRequest accepts canonical generic operation requests", () => {
  const result = validateOperationInvocationRequest(operationInvocationRequest);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateOperationInvocationRequest accepts additive PID autotune apply/reject request vocabulary", () => {
  const result = validateOperationInvocationRequest(operationPidAutotuneInvocationRequest);
  assert.equal(result.ok, true);
  assert.equal(operationPidAutotuneInvocationRequest.action, "apply_recommendation");
});

test("validateTargetReadbackSnapshot accepts operation snapshots", () => {
  const result = validateTargetReadbackSnapshot(operationSnapshot);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateTargetReadbackSnapshot accepts additive failure payload and audit hook fields", () => {
  const result = validateTargetReadbackSnapshot(operationExecutionSnapshot);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateTargetReadbackSnapshot accepts additive PID autotune progress payload and recommendation state fields", () => {
  const result = validateTargetReadbackSnapshot(operationPidAutotuneSnapshot);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("validateTargetReadbackSnapshot rejects invalid operation snapshot shapes", () => {
  const result = validateTargetReadbackSnapshot(invalidOperationSnapshot);
  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.path === "$.operation_snapshots.op_reset_1.state"));
});

test("operation invoke/cancel result contracts accept canonical runtime-neutral state transitions", () => {
  const invokeResult = validateOperationInvocationResult({
    accepted: true,
    state: "accepted",
    message: "Operation queued."
  });
  const cancelRequest = validateOperationCancelRequest({
    operation_id: "op_pid_1_autotune"
  });
  const cancelResult = validateOperationCancelResult({
    accepted: true,
    state: "cancelled",
    message: "Operation cancelled.",
    audit_record_id: "audit-003"
  });
  const failedInvokeResult = validateOperationInvocationResult({
    accepted: false,
    state: "failed",
    message: "Operation failed.",
    failure: {
      reason_code: "source_stale"
    },
    audit_record_id: "audit-004"
  });

  assert.equal(invokeResult.ok, true);
  assert.equal(cancelRequest.ok, true);
  assert.equal(cancelResult.ok, true);
  assert.equal(failedInvokeResult.ok, true);
});

test("validateTargetCapabilityProfile accepts additive PID autotune execution support declarations", () => {
  const result = validateTargetCapabilityProfile(operationsCapabilityPidAutotuneExecution);
  assert.equal(result.ok, true);
  assert.equal(operationsCapabilityPidAutotuneExecution.operations_support.recommendation_lifecycle, true);
  assert.equal(operationsCapabilityPidAutotuneExecution.operations_support.progress_payload, true);
});
