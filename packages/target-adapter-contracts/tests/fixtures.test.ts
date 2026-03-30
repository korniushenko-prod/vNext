import { strict as assert } from "node:assert";
import test from "node:test";

import deploymentResult from "./fixtures/deployment-result-valid.json" with { type: "json" };
import operationExecutionSnapshot from "./fixtures/operation-execution-snapshot.json" with { type: "json" };
import operationPidAutotuneSnapshot from "./fixtures/operation-pid-autotune-snapshot.json" with { type: "json" };
import operationsCapabilityDisabled from "./fixtures/operations-capability-disabled.json" with { type: "json" };
import operationsCapabilityExecutionBaseline from "./fixtures/operations-capability-execution-baseline.json" with { type: "json" };
import operationsCapabilityPidAutotuneExecution from "./fixtures/operations-capability-pid-autotune-execution.json" with { type: "json" };
import operationSnapshot from "./fixtures/operation-snapshot.json" with { type: "json" };
import {
  WAVE8_EXECUTION_BASELINE_OPERATION_KINDS,
  validateTargetCapabilityProfile,
  validateTargetDeploymentResult,
  validateTargetReadbackSnapshot
} from "../src/index.js";

test("validateTargetDeploymentResult accepts canonical deployment result", () => {
  const result = validateTargetDeploymentResult(deploymentResult);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("deployment result fixture exposes artifact ids as keyed records", () => {
  const artifactIds = Object.keys(deploymentResult.artifacts);
  assert.deepEqual(artifactIds, ["bundle_1"]);
});

test("operations-disabled capability fixture remains structurally valid", () => {
  const result = validateTargetCapabilityProfile(operationsCapabilityDisabled);
  assert.equal(result.ok, true);
  assert.equal(operationsCapabilityDisabled.operations_support.enabled, false);
});

test("operation snapshot fixture exposes operation states as keyed records", () => {
  const result = validateTargetReadbackSnapshot(operationSnapshot);
  assert.equal(result.ok, true);
  assert.deepEqual(Object.keys(operationSnapshot.operation_snapshots), ["op_pid_1_autotune"]);
});

test("execution baseline capability fixture freezes only the three generic reset operation kinds", () => {
  const result = validateTargetCapabilityProfile(operationsCapabilityExecutionBaseline);
  assert.equal(result.ok, true);
  assert.deepEqual(
    operationsCapabilityExecutionBaseline.operations_support.execution_baseline_kinds,
    [...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS]
  );
});

test("execution snapshot fixture exposes failure payload and audit hook skeleton", () => {
  const result = validateTargetReadbackSnapshot(operationExecutionSnapshot);
  assert.equal(result.ok, true);
  assert.equal(
    operationExecutionSnapshot.operation_snapshots.op_run_hours_1_reset_counter.audit_record_id,
    "audit-002"
  );
});

test("pid autotune capability fixture exposes additive recommendation lifecycle and progress payload support", () => {
  const result = validateTargetCapabilityProfile(operationsCapabilityPidAutotuneExecution);
  assert.equal(result.ok, true);
  assert.equal(operationsCapabilityPidAutotuneExecution.operations_support.recommendation_lifecycle, true);
  assert.equal(operationsCapabilityPidAutotuneExecution.operations_support.progress_payload, true);
});

test("pid autotune snapshot fixture exposes progress payload and recommendation state fields", () => {
  const result = validateTargetReadbackSnapshot(operationPidAutotuneSnapshot);
  assert.equal(result.ok, true);
  assert.equal(
    operationPidAutotuneSnapshot.operation_snapshots.op_pid_1_autotune.recommendation_state,
    "pending_apply"
  );
});
