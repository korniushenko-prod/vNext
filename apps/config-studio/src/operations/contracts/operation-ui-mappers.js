// Dual-export so the same frozen mapper layer can be reused in browser previews.
(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./operation-ui-guards"),
      require("./operation-ui-contracts")
    );
    return;
  }

  root.OperationUiMappers = factory(root.OperationUiGuards, root.OperationUiContracts);
})(typeof globalThis !== "undefined" ? globalThis : this, function factory(guards, contracts) {
  const {
    isExecutionBaselineKind,
    isPidAutotuneKind,
    normalizeAvailabilityMode,
    normalizeConfirmationPolicy,
    normalizeLifecycleState,
    normalizeOperationRuntimeContract,
    normalizeOperationsSupport,
    normalizeProgressMode,
    normalizeResultContract
  } = guards;
  const {
    OPERATION_UI_SECTIONS
  } = contracts;

function mapOperationListItems({ runtimePack, runtimeSnapshot, operationsSupport }) {
  const operations = runtimePack?.operations ?? {};
  const operationIds = Object.keys(operations).sort((left, right) => left.localeCompare(right));
  return operationIds.map((operationId) => (
    mapOperationListItem({
      operation: operations[operationId],
      operationSnapshot: runtimeSnapshot?.operation_snapshots?.[operationId],
      operationsSupport,
      runtimeContract: runtimePack?.operation_runtime_contract
    })
  ));
}

function mapOperationDetails({ runtimePack, operationId, runtimeSnapshot, operationsSupport }) {
  const operation = runtimePack?.operations?.[operationId];
  if (!operation) {
    return null;
  }

  const listItem = mapOperationListItem({
    operation,
    operationSnapshot: runtimeSnapshot?.operation_snapshots?.[operationId],
    operationsSupport,
    runtimeContract: runtimePack?.operation_runtime_contract
  });

  return {
    ...listItem,
    ui_sections: [...OPERATION_UI_SECTIONS],
    raw_operation: operation,
    recent_history: buildRecentHistory(listItem, runtimeSnapshot?.operation_snapshots?.[operationId])
  };
}

function mapOperationListItem({ operation, operationSnapshot, operationsSupport, runtimeContract }) {
  const support = normalizeOperationsSupport(operationsSupport);
  const rootRuntimeContract = normalizeOperationRuntimeContract(runtimeContract);
  const confirmation = mapOperationConfirmation(operation, support);
  const lifecycleState = mapLifecycleState(operation, operationSnapshot, support, confirmation);
  const availability = mapOperationAvailability(operation, support, lifecycleState);
  const progress = mapOperationProgress(operation, operationSnapshot, support, lifecycleState);
  const resultSummary = mapOperationResultSummary(operation, operationSnapshot, lifecycleState);
  const execution = mapOperationExecution(operation, support, rootRuntimeContract);
  const metadataOnly = execution.capable !== true;

  return {
    id: operation.id,
    owner_instance_id: operation.owner_instance_id,
    kind: operation.kind,
    title: operation.title ?? operation.id,
    lifecycle_state: lifecycleState,
    metadata_only: metadataOnly,
    availability,
    confirmation,
    progress,
    result_summary: resultSummary,
    execution,
    primary_intent: buildPrimaryIntent(operation, support, lifecycleState, confirmation, execution),
    cancel_intent: buildCancelIntent(operation, support, lifecycleState, execution)
  };
}

function mapLifecycleState(operation, operationSnapshot, support, confirmation) {
  if (operationSnapshot) {
    switch (operationSnapshot.state) {
      case "pending_confirmation":
        return "confirmation_required";
      case "accepted":
        return "requested";
      case "running":
        return "running";
      case "completed":
        return "completed";
      case "failed":
        return "failed";
      case "cancelled":
        return "cancelled";
      case "idle":
        return deriveLifecycleWithoutSnapshot(operation, support, confirmation);
      default:
        return normalizeLifecycleState(operationSnapshot.state);
    }
  }

  return deriveLifecycleWithoutSnapshot(operation, support, confirmation);
}

function deriveLifecycleWithoutSnapshot(operation, support, confirmation) {
  if (!support.enabled) {
    return "blocked";
  }

  if (normalizeAvailabilityMode(operation?.availability?.mode) === "guarded") {
    return "blocked";
  }

  if (confirmation.required) {
    return "confirmation_required";
  }

  return "available";
}

function mapOperationAvailability(operation, support, lifecycleState) {
  const availabilityMode = normalizeAvailabilityMode(operation?.availability?.mode);
  const blocked = !support.enabled || lifecycleState === "blocked";
  const requiredStates = Array.isArray(operation?.availability?.required_states)
    ? [...operation.availability.required_states]
    : [];

  return {
    mode: availabilityMode,
    required_states: requiredStates,
    label: blocked ? "Blocked" : availabilityMode === "guarded" ? "Guarded" : "Available",
    blocked,
    reasons: blocked
      ? buildAvailabilityReasons(operation, support)
      : []
  };
}

function mapOperationProgress(operation, operationSnapshot, support, lifecycleState) {
  const rawMode = operationSnapshot?.state === "running" && operation?.progress_mode === undefined
    ? "none"
    : operation?.progress_mode;
  const mode = normalizeProgressMode(rawMode);
  const fallback = rawMode !== undefined && rawMode !== mode;
  const percent = typeof operationSnapshot?.progress === "number"
    ? operationSnapshot.progress
    : undefined;
  const visible = lifecycleState === "running" || lifecycleState === "completed";
  const payload = operationSnapshot?.progress_payload && typeof operationSnapshot.progress_payload === "object"
    ? structuredClone(operationSnapshot.progress_payload)
    : null;
  const contractFields = Array.isArray(operation?.progress_contract?.fields)
    ? operation.progress_contract.fields
        .filter((field) => field && typeof field.id === "string" && typeof field.value_type === "string")
        .map((field) => ({
          id: field.id,
          value_type: field.value_type,
          title: typeof field.title === "string" ? field.title : field.id,
          value: payload ? payload[field.id] : undefined
        }))
    : [];

  return {
    visible,
    mode,
    percent,
    fallback,
    supports_live_progress: support.progress,
    payload,
    fields: contractFields,
    label: lifecycleState === "running"
      ? "In progress"
      : lifecycleState === "completed"
        ? "Completed"
        : "No live progress"
  };
}

function mapOperationResultSummary(operation, operationSnapshot, lifecycleState) {
  const contract = normalizeResultContract(operation?.result_contract);
  const result = operationSnapshot?.result && typeof operationSnapshot.result === "object"
    ? operationSnapshot.result
    : {};
  const failure = operationSnapshot?.failure && typeof operationSnapshot.failure === "object"
    ? operationSnapshot.failure
    : {};

  return {
    visible: lifecycleState === "completed" || contract.fields.length > 0,
    mode: contract.mode,
    recommendation_state: typeof operationSnapshot?.recommendation_state === "string"
      ? operationSnapshot.recommendation_state
      : "none",
    recommendation_lifecycle: contract.recommendation_lifecycle,
    fields: contract.fields.map((field) => ({
      id: field.id,
      value_type: field.value_type,
      title: field.title ?? field.id,
      value: result[field.id]
    })),
    failure_fields: contract.failure_fields.map((field) => ({
      id: field.id,
      value_type: field.value_type,
      title: field.title ?? field.id,
      value: failure[field.id]
    }))
  };
}

function mapOperationConfirmation(operation, support) {
  const policy = normalizeConfirmationPolicy(operation?.confirmation_policy);
  return {
    required: policy === "required",
    policy,
    supported: support.confirmation,
    label: policy === "required" ? "Confirmation required" : "No confirmation"
  };
}

function buildPrimaryIntent(operation, support, lifecycleState, confirmation, execution) {
  const enabled = execution.runnable === true && (lifecycleState === "available" || lifecycleState === "confirmation_required");

  return {
    kind: "invoke",
    operation_id: operation.id,
    label: confirmation.required ? "Request confirmation" : "Invoke",
    enabled,
    reason: enabled ? undefined : execution.reason
  };
}

function buildCancelIntent(operation, support, lifecycleState, execution) {
  const active = lifecycleState === "requested" || lifecycleState === "running";
  return {
    kind: "cancel",
    operation_id: operation.id,
    label: "Cancel",
    enabled: active && support.cancel && execution.cancel_supported === true,
    reason: active && (!support.cancel || execution.cancel_supported !== true)
      ? "cancel_not_available"
      : execution.cancel_reason
  };
}

function mapOperationExecution(operation, support, runtimeContract) {
  const baselineKind = isExecutionBaselineKind(operation?.kind);
  const pidAutotuneKind = isPidAutotuneKind(operation?.kind);
  const runtimeEnabled = runtimeContract.invoke_supported === true &&
    runtimeContract.execution_baseline_kinds.includes(operation?.kind);
  const targetEnabled = support.enabled === true &&
    support.invoke === true &&
    support.execution_baseline_kinds.includes(operation?.kind);
  const capable = baselineKind && runtimeEnabled && targetEnabled;
  const pidAutotuneRuntimeEnabled = pidAutotuneKind &&
    runtimeContract.invoke_supported === true &&
    runtimeContract.cancel_supported === true &&
    runtimeContract.progress_supported === true &&
    runtimeContract.result_supported === true &&
    runtimeContract.audit_required === true &&
    runtimeContract.recommendation_lifecycle_supported === true &&
    runtimeContract.progress_payload_supported === true;
  const pidAutotuneTargetEnabled = pidAutotuneKind &&
    support.enabled === true &&
    support.invoke === true &&
    support.cancel === true &&
    support.progress === true &&
    support.result_payload === true &&
    support.confirmation === true &&
    support.recommendation_lifecycle === true &&
    support.progress_payload === true;
  const pidAutotuneCapable = pidAutotuneKind && pidAutotuneRuntimeEnabled && pidAutotuneTargetEnabled;

  return {
    baseline_kind: baselineKind,
    specialized_kind: pidAutotuneCapable ? "pid_autotune" : null,
    lane: pidAutotuneCapable ? "pid_autotune" : capable ? "baseline_runnable" : baselineKind ? "unsupported_execution" : pidAutotuneKind ? "pid_autotune" : "metadata_only",
    capable: capable || pidAutotuneCapable,
    runnable: capable || pidAutotuneCapable,
    target_enabled: targetEnabled || pidAutotuneTargetEnabled,
    runtime_enabled: runtimeEnabled || pidAutotuneRuntimeEnabled,
    cancel_supported: pidAutotuneCapable
      ? true
      : capable && support.cancel === true && runtimeContract.cancel_supported === true,
    confirmation_token_validation: capable || pidAutotuneCapable
      ? (support.confirmation_token_validation || runtimeContract.confirmation_token_validation)
      : "none",
    recommendation_lifecycle_supported: pidAutotuneCapable,
    progress_payload_supported: pidAutotuneCapable,
    apply_reject_supported: pidAutotuneCapable,
    reason: capable || pidAutotuneCapable
      ? undefined
      : baselineKind
        ? "unsupported_execution"
        : pidAutotuneKind
          ? "autotune_not_runnable"
        : "metadata_only",
    cancel_reason: capable || pidAutotuneCapable ? undefined : "cancel_not_available"
  };
}

function buildAvailabilityReasons(operation, support) {
  if (!support.enabled) {
    return ["operations_disabled"];
  }

  if (normalizeAvailabilityMode(operation?.availability?.mode) === "guarded") {
    return ["guard_conditions_unknown"];
  }

  return ["not_available"];
}

function buildRecentHistory(listItem, operationSnapshot) {
  if (!operationSnapshot) {
    return [];
  }

  return [
    {
      operation_id: listItem.id,
      lifecycle_state: listItem.lifecycle_state,
      message: operationSnapshot.message ?? null,
      metadata_only: listItem.metadata_only
    }
  ];
}

  return {
    mapOperationAvailability,
    mapOperationConfirmation,
    mapOperationDetails,
    mapOperationListItem,
    mapOperationListItems,
    mapOperationProgress,
    mapOperationResultSummary
  };
});
