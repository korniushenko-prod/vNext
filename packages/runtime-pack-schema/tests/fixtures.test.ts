import { strict as assert } from "node:assert";
import test from "node:test";

import flattenedCompositionPack from "./fixtures/flattened-composition-pack.json" with { type: "json" };
import operationsExecutionBaselinePack from "./fixtures/operations-execution-baseline.runtime-pack.json" with { type: "json" };
import operationsMinimalPack from "./fixtures/operations-minimal.runtime-pack.json" with { type: "json" };
import operationsPidAutotuneExecutionPack from "./fixtures/operations-pid-autotune-execution.runtime-pack.json" with { type: "json" };
import { WAVE8_EXECUTION_BASELINE_OPERATION_KINDS, validateRuntimePack } from "../src/index.js";

test("flattened composition runtime pack passes structural validation", () => {
  const result = validateRuntimePack(flattenedCompositionPack);
  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
});

test("runtime pack connections stay normalized as point-to-point links", () => {
  const connections = flattenedCompositionPack.connections;
  for (const connection of Object.values(connections)) {
    assert.ok(typeof connection.source.instance_id === "string");
    assert.ok(typeof connection.source.port_id === "string");
    assert.ok(typeof connection.target.instance_id === "string");
    assert.ok(typeof connection.target.port_id === "string");
  }
});

test("operations runtime pack fixture keeps the root runtime spine contract target-neutral", () => {
  const result = validateRuntimePack(operationsMinimalPack);
  assert.equal(result.ok, true);
  assert.equal(operationsMinimalPack.operation_runtime_contract.invoke_supported, true);
  assert.equal(operationsMinimalPack.operation_runtime_contract.audit_required, true);
});

test("execution baseline fixture freezes only the three generic reset operation kinds for Wave 8 contracts", () => {
  const result = validateRuntimePack(operationsExecutionBaselinePack);
  assert.equal(result.ok, true);
  assert.deepEqual(
    operationsExecutionBaselinePack.operation_runtime_contract.execution_baseline_kinds,
    [...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS]
  );
});

test("pid autotune execution fixture exposes additive recommendation lifecycle and progress payload contracts", () => {
  const result = validateRuntimePack(operationsPidAutotuneExecutionPack);
  assert.equal(result.ok, true);
  assert.equal(
    operationsPidAutotuneExecutionPack.operations.op_pid_1_autotune.progress_contract.fields[0].id,
    "phase"
  );
  assert.equal(
    operationsPidAutotuneExecutionPack.operations.op_pid_1_autotune.result_contract.recommendation_lifecycle.mode,
    "apply_reject"
  );
});
