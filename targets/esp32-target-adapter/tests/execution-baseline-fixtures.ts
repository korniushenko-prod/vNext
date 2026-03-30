import type { RuntimeOperation, RuntimePack } from "@universal-plc/runtime-pack-schema";

import {
  esp32ExecutionBaselineOperationRuntimeContract
} from "../src/operations.js";
import { pulseFlowmeterRuntimePack } from "./runtime-pack-fixtures.js";
import {
  createRunHoursToMaintenanceRuntimePack,
  maintenanceCounterRuntimePack,
  runHoursCounterRuntimePack
} from "./wave3-fixtures.js";

export function createPulseFlowmeterExecutionBaselineRuntimePack(): RuntimePack {
  return enableExecutionBaseline(structuredClone(pulseFlowmeterRuntimePack));
}

export function createRunHoursExecutionBaselineRuntimePack(): RuntimePack {
  return enableExecutionBaseline(structuredClone(runHoursCounterRuntimePack));
}

export function createMaintenanceExecutionBaselineRuntimePack(): RuntimePack {
  return enableExecutionBaseline(structuredClone(maintenanceCounterRuntimePack));
}

export function createCombinedExecutionBaselineRuntimePack(): RuntimePack {
  return enableExecutionBaseline(createRunHoursToMaintenanceRuntimePack());
}

function enableExecutionBaseline(pack: RuntimePack): RuntimePack {
  pack.operation_runtime_contract = structuredClone(esp32ExecutionBaselineOperationRuntimeContract);

  for (const operationId of Object.keys(pack.operations)) {
    const operation = pack.operations[operationId];
    if (!isExecutionBaselineOperation(operation)) {
      continue;
    }

    operation.confirmation_policy = "required";
    operation.cancel_mode = "not_cancellable";
    operation.progress_mode = "none";
    delete operation.progress_signals;
    if (operation.result_contract?.mode === "recommendation") {
      operation.result_contract.mode = "applyable_result";
    }
  }

  return pack;
}

function isExecutionBaselineOperation(operation: RuntimeOperation): boolean {
  return operation.kind === "reset_totalizer" ||
    operation.kind === "reset_counter" ||
    operation.kind === "reset_interval";
}
