import type {
  RuntimeOperationRuntimeContract,
  RuntimeOperationSnapshot,
  RuntimeOperationState,
  RuntimePack
} from "@universal-plc/runtime-pack-schema";
import {
  type OperationCancelRequest,
  type OperationCancelResult,
  type OperationInvocationRequest,
  type OperationInvocationResult,
  type TargetAdapterDiagnostic,
  type TargetOperationSupportProfile,
  WAVE8_EXECUTION_BASELINE_OPERATION_KINDS
} from "@universal-plc/target-adapter-contracts";
import { sortedKeys } from "./sort.js";

const ALLOWED_SNAPSHOT_STATES: RuntimeOperationState[] = [
  "idle",
  "pending_confirmation",
  "accepted",
  "running",
  "completed",
  "failed",
  "cancelled",
  "rejected"
];

const METADATA_ONLY_RUNTIME_FIELDS: Array<keyof RuntimeOperationRuntimeContract> = [
  "invoke_supported",
  "cancel_supported",
  "progress_supported",
  "result_supported",
  "audit_required"
];

const EXECUTION_BASELINE_OPERATION_KINDS = new Set<string>(WAVE8_EXECUTION_BASELINE_OPERATION_KINDS);
const PID_AUTOTUNE_OPERATION_KINDS = new Set<string>(["autotune", "pid_autotune"]);

export const esp32OperationSupportProfile: TargetOperationSupportProfile = {
  enabled: true,
  invoke: true,
  cancel: true,
  progress: true,
  result_payload: true,
  confirmation: true,
  execution_baseline_kinds: [...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS],
  confirmation_token_validation: "when_required",
  failure_payload: true,
  audit_hooks: true,
  recommendation_lifecycle: true,
  progress_payload: true
};

export const esp32MetadataOnlyOperationRuntimeContract: RuntimeOperationRuntimeContract = {
  invoke_supported: false,
  cancel_supported: false,
  progress_supported: false,
  result_supported: false,
  audit_required: false
};

export const esp32ExecutionBaselineOperationRuntimeContract: RuntimeOperationRuntimeContract = {
  invoke_supported: true,
  cancel_supported: false,
  progress_supported: true,
  result_supported: true,
  audit_required: true,
  execution_baseline_kinds: [...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS],
  confirmation_token_validation: "when_required",
  failure_payload_supported: true,
  audit_hook_mode: "operation_events"
};

export const esp32PidAutotuneOperationRuntimeContract: RuntimeOperationRuntimeContract = {
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
};

export function validateEsp32OperationSupport(pack: RuntimePack): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const runtimeContract = pack.operation_runtime_contract;
  const executionBaselineEnabled = hasExecutionBaselineSupport(runtimeContract);
  const pidAutotunePresent = sortedKeys(pack.operations ?? {}).some((operationId) => (
    isPidAutotuneKind(pack.operations[operationId]?.kind)
  ));

  if (runtimeContract) {
    if (executionBaselineEnabled) {
      diagnostics.push(...validateExecutionBaselineRuntimeContract(runtimeContract));
    }

    if (pidAutotunePresent) {
      diagnostics.push(...validatePidAutotuneRuntimeContract(runtimeContract));
    }

    if (!executionBaselineEnabled && !pidAutotunePresent) {
      for (const field of METADATA_ONLY_RUNTIME_FIELDS) {
        if (runtimeContract[field]) {
          diagnostics.push({
            code: "target.operation_runtime.unsupported",
            severity: "error",
            message: `ESP32 metadata-only operations baseline does not support \`${field}\`.`,
            path: `$.operation_runtime_contract.${field}`
          });
        }
      }
    }
  }

  for (const operationId of sortedKeys(pack.operations ?? {})) {
    const operation = pack.operations[operationId];

    if (operation.id !== operationId) {
      diagnostics.push({
        code: "target.operation.id.invalid",
        severity: "error",
        message: `Operation record key \`${operationId}\` must match operation id \`${operation.id}\`.`,
        path: `$.operations.${operationId}.id`
      });
    }

    if (!operation.id.startsWith("op_") || !operation.id.startsWith(`op_${operation.owner_instance_id}_`)) {
      diagnostics.push({
        code: "target.operation.id.invalid",
        severity: "error",
        message: `Operation id \`${operation.id}\` must remain qualified by owner instance \`${operation.owner_instance_id}\`.`,
        path: `$.operations.${operationId}.id`
      });
    }

    if (!pack.instances[operation.owner_instance_id]) {
      diagnostics.push({
        code: "target.operation.owner.unresolved",
        severity: "error",
        message: `Operation \`${operation.id}\` references unknown owner instance \`${operation.owner_instance_id}\`.`,
        path: `$.operations.${operationId}.owner_instance_id`
      });
    }

    if (executionBaselineEnabled && isExecutionLikeButUnsupported(operation.kind)) {
      diagnostics.push({
        code: "target.operation.execution_kind.unsupported",
        severity: "error",
        message: `ESP32 execution baseline supports only these runnable kinds: ${[...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS].join(", ")}.`,
        path: `$.operations.${operationId}.kind`
      });
      continue;
    }

    if (executionBaselineEnabled && isExecutionBaselineKind(operation.kind)) {
      diagnostics.push(...validateExecutionBaselineOperation(pack, operationId));
      continue;
    }

    if (isPidAutotuneKind(operation.kind)) {
      diagnostics.push(...validatePidAutotuneOperation(pack, operationId));
      continue;
    }

    if (operation.progress_mode === "state_based") {
      diagnostics.push({
        code: "target.operation.progress_mode.unsupported",
        severity: "error",
        message: "ESP32 metadata-only operations baseline does not support `state_based` progress mode.",
        path: `$.operations.${operationId}.progress_mode`
      });
    }
  }

  return diagnostics;
}

export function buildSyntheticOperationSnapshots(pack: RuntimePack): Record<string, RuntimeOperationSnapshot> {
  const snapshots: Record<string, RuntimeOperationSnapshot> = {};
  const executionBaselineEnabled = hasExecutionBaselineSupport(pack.operation_runtime_contract);
  const pidAutotuneExecutionEnabled = hasPidAutotuneExecutionSupport(pack.operation_runtime_contract);

  for (const operationId of sortedKeys(pack.operations ?? {})) {
    const operation = pack.operations[operationId];
    snapshots[operationId] = isPidAutotuneKind(operation.kind) && pidAutotuneExecutionEnabled
      ? {
          operation_id: operationId,
          state: "idle",
          progress: 0,
          progress_payload: {
            phase: "idle",
            sample_count: 0
          },
          recommendation_state: "none",
          message: "PID autotune execution ready: offline adapter exposes synthetic recommendation lifecycle snapshots only."
        }
      : {
          operation_id: operationId,
          state: "idle",
          message: executionBaselineEnabled && isExecutionBaselineKind(operation.kind)
            ? "Execution baseline ready: offline adapter exposes synthetic reset-operation snapshots only."
            : "Metadata-only baseline: operation execution is not implemented on ESP32."
        };
  }

  return snapshots;
}

export function validateEsp32OperationSnapshots(
  snapshots: Record<string, RuntimeOperationSnapshot>
): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];

  for (const snapshotId of sortedKeys(snapshots)) {
    const snapshot = snapshots[snapshotId];

    if (snapshot.operation_id !== snapshotId) {
      diagnostics.push({
        code: "target.operation_snapshot.id.invalid",
        severity: "error",
        message: `Operation snapshot record key \`${snapshotId}\` must match operation_id \`${snapshot.operation_id}\`.`,
        path: `$.operation_snapshots.${snapshotId}.operation_id`
      });
    }

    if (!ALLOWED_SNAPSHOT_STATES.includes(snapshot.state)) {
      diagnostics.push({
        code: "target.operation_snapshot.state.invalid",
        severity: "error",
        message: `Operation snapshot state \`${snapshot.state}\` is not supported by the ESP32 adapter.`,
        path: `$.operation_snapshots.${snapshotId}.state`
      });
    }

    if (snapshot.progress !== undefined && (snapshot.progress < 0 || snapshot.progress > 100)) {
      diagnostics.push({
        code: "target.operation_snapshot.progress.invalid",
        severity: "error",
        message: "Operation snapshot progress must stay within the inclusive 0..100 range.",
        path: `$.operation_snapshots.${snapshotId}.progress`
      });
    }
  }

  return diagnostics;
}

export function invokeEsp32Operation(request: OperationInvocationRequest): OperationInvocationResult {
  if (isPidAutotuneOperationId(request.operation_id)) {
    const action = request.action ?? "invoke";

    if (!request.confirmation_token) {
      return {
        accepted: false,
        state: "pending_confirmation",
        message: action === "invoke"
          ? "ESP32 PID autotune execution requires a confirmation token."
          : "ESP32 PID autotune recommendation handling requires a confirmation token."
      };
    }

    if (action === "apply_recommendation") {
      return {
        accepted: true,
        state: "completed",
        message: "ESP32 offline adapter exposes only synthetic PID autotune recommendation apply.",
        audit_record_id: `audit_${request.operation_id}_apply`,
        recommendation_state: "applied"
      };
    }

    if (action === "reject_recommendation") {
      return {
        accepted: true,
        state: "rejected",
        message: "ESP32 offline adapter exposes only synthetic PID autotune recommendation rejection.",
        audit_record_id: `audit_${request.operation_id}_reject`,
        recommendation_state: "rejected"
      };
    }

    return {
      accepted: true,
      state: "running",
      message: "ESP32 offline adapter exposes only synthetic PID autotune progress.",
      audit_record_id: `audit_${request.operation_id}`,
      progress_payload: {
        phase: "relay_test",
        sample_count: 0
      },
      recommendation_state: "none"
    };
  }

  if (!isExecutionBaselineOperationId(request.operation_id)) {
    return {
      accepted: false,
      state: "rejected",
      message: "ESP32 metadata-only baseline does not execute runtime operations."
    };
  }

  if (!request.confirmation_token) {
    return {
      accepted: false,
      state: "pending_confirmation",
      message: "ESP32 execution baseline requires a confirmation token for generic reset operations."
    };
  }

  return {
    accepted: true,
    state: "completed",
    message: "ESP32 offline adapter exposes only synthetic execution-baseline completion for generic reset operations.",
    audit_record_id: `audit_${request.operation_id}`
  };
}

export function cancelEsp32Operation(request: OperationCancelRequest): OperationCancelResult {
  if (isPidAutotuneOperationId(request.operation_id)) {
    return {
      accepted: true,
      state: "cancelled",
      message: "ESP32 offline adapter exposes only synthetic PID autotune cancellation.",
      audit_record_id: `audit_${request.operation_id}_cancel`,
      recommendation_state: "none"
    };
  }

  if (!isExecutionBaselineOperationId(request.operation_id)) {
    return {
      accepted: false,
      state: "rejected",
      message: "ESP32 metadata-only baseline does not execute runtime operations."
    };
  }

  return {
    accepted: false,
    state: "rejected",
    message: "ESP32 execution baseline supports only not_cancellable generic reset operations."
  };
}

function validateExecutionBaselineRuntimeContract(
  runtimeContract: RuntimeOperationRuntimeContract
): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const baselineKinds = runtimeContract.execution_baseline_kinds ?? [];
  const expectedKinds = [...WAVE8_EXECUTION_BASELINE_OPERATION_KINDS].sort();

  if (runtimeContract.invoke_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.invoke.unsupported",
      "$.operation_runtime_contract.invoke_supported",
      "ESP32 execution baseline requires `invoke_supported: true`."
    ));
  }

  if (runtimeContract.cancel_supported !== false) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.cancel.unsupported",
      "$.operation_runtime_contract.cancel_supported",
      "ESP32 execution baseline does not support cancellable operation execution."
    ));
  }

  if (runtimeContract.progress_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.progress.unsupported",
      "$.operation_runtime_contract.progress_supported",
      "ESP32 execution baseline requires synthetic snapshot progress support to stay enabled."
    ));
  }

  if (runtimeContract.result_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.result.unsupported",
      "$.operation_runtime_contract.result_supported",
      "ESP32 execution baseline requires result payload support for generic reset operations."
    ));
  }

  if (runtimeContract.audit_required !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.audit.unsupported",
      "$.operation_runtime_contract.audit_required",
      "ESP32 execution baseline requires audit hook skeleton support."
    ));
  }

  if (runtimeContract.confirmation_token_validation !== "when_required") {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.confirmation.unsupported",
      "$.operation_runtime_contract.confirmation_token_validation",
      "ESP32 execution baseline requires `confirmation_token_validation: when_required`."
    ));
  }

  if (runtimeContract.failure_payload_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.failure.unsupported",
      "$.operation_runtime_contract.failure_payload_supported",
      "ESP32 execution baseline requires failure payload vocabulary support."
    ));
  }

  if (runtimeContract.audit_hook_mode !== "operation_events") {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.audit.unsupported",
      "$.operation_runtime_contract.audit_hook_mode",
      "ESP32 execution baseline requires `audit_hook_mode: operation_events`."
    ));
  }

  if (baselineKinds.length !== expectedKinds.length || baselineKinds.some((entry) => !EXECUTION_BASELINE_OPERATION_KINDS.has(entry))) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.execution_kind.unsupported",
      "$.operation_runtime_contract.execution_baseline_kinds",
      `ESP32 execution baseline supports only: ${expectedKinds.join(", ")}.`
    ));
  }

  return diagnostics;
}

function validateExecutionBaselineOperation(pack: RuntimePack, operationId: string): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const operation = pack.operations[operationId];
  const path = `$.operations.${operationId}`;

  if (operation.confirmation_policy !== "required") {
    diagnostics.push({
      code: "target.operation.confirmation_policy.unsupported",
      severity: "error",
      message: "ESP32 execution baseline requires `confirmation_policy: required` for generic reset operations.",
      path: `${path}.confirmation_policy`
    });
  }

  if (operation.progress_mode !== undefined && operation.progress_mode !== "none") {
    diagnostics.push({
      code: "target.operation.progress_mode.unsupported",
      severity: "error",
      message: "ESP32 execution baseline does not support long-running progress semantics for generic reset operations.",
      path: `${path}.progress_mode`
    });
  }

  if (operation.progress_signals?.length) {
    diagnostics.push({
      code: "target.operation.long_running.unsupported",
      severity: "error",
      message: "ESP32 execution baseline does not support progress signal wiring for generic reset operations.",
      path: `${path}.progress_signals`
    });
  }

  if (operation.cancel_mode !== undefined && operation.cancel_mode !== "not_cancellable") {
    diagnostics.push({
      code: "target.operation.cancel_mode.unsupported",
      severity: "error",
      message: "ESP32 execution baseline supports only `not_cancellable` reset operations.",
      path: `${path}.cancel_mode`
    });
  }

  const resultMode = operation.result_contract?.mode;
  if (resultMode !== undefined && resultMode !== "none" && resultMode !== "applyable_result") {
    diagnostics.push({
      code: "target.operation.result_contract.unsupported",
      severity: "error",
      message: "ESP32 execution baseline supports only `none` or `applyable_result` result contracts for generic reset operations.",
      path: `${path}.result_contract.mode`
    });
  }

  return diagnostics;
}

function validatePidAutotuneRuntimeContract(
  runtimeContract: RuntimeOperationRuntimeContract
): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];

  if (runtimeContract.invoke_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.invoke.unsupported",
      "$.operation_runtime_contract.invoke_supported",
      "ESP32 PID autotune support requires `invoke_supported: true`."
    ));
  }

  if (runtimeContract.cancel_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.cancel.unsupported",
      "$.operation_runtime_contract.cancel_supported",
      "ESP32 PID autotune support requires `cancel_supported: true`."
    ));
  }

  if (runtimeContract.progress_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.progress.unsupported",
      "$.operation_runtime_contract.progress_supported",
      "ESP32 PID autotune support requires progress support."
    ));
  }

  if (runtimeContract.result_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.result.unsupported",
      "$.operation_runtime_contract.result_supported",
      "ESP32 PID autotune support requires result payload support."
    ));
  }

  if (runtimeContract.audit_required !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.audit.unsupported",
      "$.operation_runtime_contract.audit_required",
      "ESP32 PID autotune support requires audit hook skeleton support."
    ));
  }

  if (runtimeContract.confirmation_token_validation !== "when_required") {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.confirmation.unsupported",
      "$.operation_runtime_contract.confirmation_token_validation",
      "ESP32 PID autotune support requires `confirmation_token_validation: when_required`."
    ));
  }

  if (runtimeContract.failure_payload_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.failure.unsupported",
      "$.operation_runtime_contract.failure_payload_supported",
      "ESP32 PID autotune support requires failure payload vocabulary support."
    ));
  }

  if (runtimeContract.audit_hook_mode !== "operation_events") {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.audit.unsupported",
      "$.operation_runtime_contract.audit_hook_mode",
      "ESP32 PID autotune support requires `audit_hook_mode: operation_events`."
    ));
  }

  if (runtimeContract.recommendation_lifecycle_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.recommendation.unsupported",
      "$.operation_runtime_contract.recommendation_lifecycle_supported",
      "ESP32 PID autotune support requires recommendation lifecycle support."
    ));
  }

  if (runtimeContract.progress_payload_supported !== true) {
    diagnostics.push(operationRuntimeDiagnostic(
      "target.operation_runtime.progress_payload.unsupported",
      "$.operation_runtime_contract.progress_payload_supported",
      "ESP32 PID autotune support requires progress payload support."
    ));
  }

  return diagnostics;
}

function validatePidAutotuneOperation(pack: RuntimePack, operationId: string): TargetAdapterDiagnostic[] {
  const diagnostics: TargetAdapterDiagnostic[] = [];
  const operation = pack.operations[operationId];
  const path = `$.operations.${operationId}`;
  const owner = pack.instances[operation.owner_instance_id];

  if (owner?.native_execution?.native_kind !== "std.pid_controller.v1") {
    diagnostics.push({
      code: "target.operation.owner.unsupported",
      severity: "error",
      message: "ESP32 PID autotune support is allowed only for `std.pid_controller.v1` owners.",
      path: `${path}.owner_instance_id`
    });
  }

  if (operation.confirmation_policy !== "required") {
    diagnostics.push({
      code: "target.operation.confirmation_policy.unsupported",
      severity: "error",
      message: "ESP32 PID autotune support requires `confirmation_policy: required`.",
      path: `${path}.confirmation_policy`
    });
  }

  if (operation.progress_mode !== "signal_based") {
    diagnostics.push({
      code: "target.operation.progress_mode.unsupported",
      severity: "error",
      message: "ESP32 PID autotune support requires `progress_mode: signal_based`.",
      path: `${path}.progress_mode`
    });
  }

  if (!operation.progress_contract?.fields?.length) {
    diagnostics.push({
      code: "target.operation.progress_contract.unsupported",
      severity: "error",
      message: "ESP32 PID autotune support requires progress contract fields.",
      path: `${path}.progress_contract.fields`
    });
  }

  if (!operation.progress_signals?.length) {
    diagnostics.push({
      code: "target.operation.long_running.unsupported",
      severity: "error",
      message: "ESP32 PID autotune support requires progress signal wiring.",
      path: `${path}.progress_signals`
    });
  }

  if (operation.result_contract?.mode !== "recommendation") {
    diagnostics.push({
      code: "target.operation.result_contract.unsupported",
      severity: "error",
      message: "ESP32 PID autotune support requires `result_contract.mode: recommendation`.",
      path: `${path}.result_contract.mode`
    });
  }

  if (operation.result_contract?.recommendation_lifecycle?.mode !== "apply_reject") {
    diagnostics.push({
      code: "target.operation.recommendation_lifecycle.unsupported",
      severity: "error",
      message: "ESP32 PID autotune support requires `recommendation_lifecycle.mode: apply_reject`.",
      path: `${path}.result_contract.recommendation_lifecycle.mode`
    });
  }

  return diagnostics;
}

function hasExecutionBaselineSupport(runtimeContract: RuntimeOperationRuntimeContract | undefined): boolean {
  return Array.isArray(runtimeContract?.execution_baseline_kinds) && runtimeContract.execution_baseline_kinds.length > 0;
}

function hasPidAutotuneExecutionSupport(runtimeContract: RuntimeOperationRuntimeContract | undefined): boolean {
  return runtimeContract?.invoke_supported === true &&
    runtimeContract.cancel_supported === true &&
    runtimeContract.progress_supported === true &&
    runtimeContract.result_supported === true &&
    runtimeContract.audit_required === true &&
    runtimeContract.recommendation_lifecycle_supported === true &&
    runtimeContract.progress_payload_supported === true;
}

function isExecutionBaselineKind(kind: string): boolean {
  return EXECUTION_BASELINE_OPERATION_KINDS.has(kind);
}

function isExecutionLikeButUnsupported(kind: string): boolean {
  return kind.startsWith("reset_") && !isExecutionBaselineKind(kind);
}

function isExecutionBaselineOperationId(operationId: string): boolean {
  return [...EXECUTION_BASELINE_OPERATION_KINDS].some((kind) => operationId.endsWith(`_${kind}`));
}

function isPidAutotuneKind(kind: string): boolean {
  return PID_AUTOTUNE_OPERATION_KINDS.has(kind);
}

function isPidAutotuneOperationId(operationId: string): boolean {
  return [...PID_AUTOTUNE_OPERATION_KINDS].some((kind) => operationId.endsWith(`_${kind}`));
}

function operationRuntimeDiagnostic(
  code: string,
  path: string,
  message: string
): TargetAdapterDiagnostic {
  return {
    code,
    severity: "error",
    message,
    path
  };
}
