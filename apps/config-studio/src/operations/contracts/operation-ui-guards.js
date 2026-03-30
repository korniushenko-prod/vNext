(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./operation-ui-contracts"));
    return;
  }

  root.OperationUiGuards = factory(root.OperationUiContracts);
})(typeof globalThis !== "undefined" ? globalThis : this, function factory(contracts) {
  const {
    OPERATION_EXECUTION_BASELINE_KINDS,
    PID_AUTOTUNE_SPECIALIZED_KINDS,
    OPERATION_SERVICE_LIFECYCLE_STATES
  } = contracts;

  function normalizeOperationsSupport(operationsSupport) {
    return {
      enabled: operationsSupport?.enabled !== false,
      invoke: operationsSupport?.invoke === true,
      cancel: operationsSupport?.cancel === true,
      progress: operationsSupport?.progress === true,
      result_payload: operationsSupport?.result_payload === true,
      confirmation: operationsSupport?.confirmation !== false,
      execution_baseline_kinds: normalizeExecutionBaselineKinds(operationsSupport?.execution_baseline_kinds),
      confirmation_token_validation: operationsSupport?.confirmation_token_validation === "when_required"
        ? "when_required"
        : "none",
      failure_payload: operationsSupport?.failure_payload === true,
      audit_hooks: operationsSupport?.audit_hooks === true,
      recommendation_lifecycle: operationsSupport?.recommendation_lifecycle === true,
      progress_payload: operationsSupport?.progress_payload === true
    };
  }

  function normalizeOperationRuntimeContract(runtimeContract) {
    return {
      invoke_supported: runtimeContract?.invoke_supported === true,
      cancel_supported: runtimeContract?.cancel_supported === true,
      progress_supported: runtimeContract?.progress_supported === true,
      result_supported: runtimeContract?.result_supported === true,
      audit_required: runtimeContract?.audit_required === true,
      execution_baseline_kinds: normalizeExecutionBaselineKinds(runtimeContract?.execution_baseline_kinds),
      confirmation_token_validation: runtimeContract?.confirmation_token_validation === "when_required"
        ? "when_required"
        : "none",
      failure_payload_supported: runtimeContract?.failure_payload_supported === true,
      audit_hook_mode: runtimeContract?.audit_hook_mode === "operation_events"
        ? "operation_events"
        : "none",
      recommendation_lifecycle_supported: runtimeContract?.recommendation_lifecycle_supported === true,
      progress_payload_supported: runtimeContract?.progress_payload_supported === true
    };
  }

  function normalizeLifecycleState(value) {
    return OPERATION_SERVICE_LIFECYCLE_STATES.includes(value) ? value : "stale";
  }

  function normalizeConfirmationPolicy(value) {
    return value === "required" ? "required" : "none";
  }

  function normalizeAvailabilityMode(value) {
    return value === "guarded" ? "guarded" : "always";
  }

  function normalizeProgressMode(value) {
    if (value === "signal_based" || value === "state_based") {
      return value;
    }

    return "none";
  }

  function normalizeResultContract(resultContract) {
    if (!resultContract || typeof resultContract !== "object") {
      return {
        mode: "none",
        fields: [],
        failure_fields: [],
        recommendation_lifecycle: null
      };
    }

    const mode = resultContract.mode === "recommendation" || resultContract.mode === "applyable_result"
      ? resultContract.mode
      : "none";
    const fields = Array.isArray(resultContract.fields)
      ? resultContract.fields
          .filter((field) => field && typeof field.id === "string" && typeof field.value_type === "string")
          .map((field) => ({
            id: field.id,
            value_type: field.value_type,
            title: typeof field.title === "string" ? field.title : undefined
          }))
      : [];
    const failureFields = Array.isArray(resultContract.failure_fields)
      ? resultContract.failure_fields
          .filter((field) => field && typeof field.id === "string" && typeof field.value_type === "string")
          .map((field) => ({
            id: field.id,
            value_type: field.value_type,
            title: typeof field.title === "string" ? field.title : undefined
          }))
      : [];
    const recommendationLifecycle = resultContract.recommendation_lifecycle &&
      typeof resultContract.recommendation_lifecycle === "object"
      ? {
          mode: resultContract.recommendation_lifecycle.mode === "apply_reject"
            ? "apply_reject"
            : "advisory",
          apply_confirmation_policy: resultContract.recommendation_lifecycle.apply_confirmation_policy === "required"
            ? "required"
            : "none",
          reject_confirmation_policy: resultContract.recommendation_lifecycle.reject_confirmation_policy === "required"
            ? "required"
            : "none"
        }
      : null;

    return { mode, fields, failure_fields: failureFields, recommendation_lifecycle: recommendationLifecycle };
  }

  function isExecutionBaselineKind(kind) {
    return OPERATION_EXECUTION_BASELINE_KINDS.includes(kind);
  }

  function isPidAutotuneKind(kind) {
    return PID_AUTOTUNE_SPECIALIZED_KINDS.includes(kind);
  }

  function normalizeExecutionBaselineKinds(value) {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.filter((entry) => OPERATION_EXECUTION_BASELINE_KINDS.includes(entry));
  }

  return {
    isExecutionBaselineKind,
    isPidAutotuneKind,
    normalizeAvailabilityMode,
    normalizeConfirmationPolicy,
    normalizeLifecycleState,
    normalizeOperationRuntimeContract,
    normalizeOperationsSupport,
    normalizeProgressMode,
    normalizeResultContract
  };
});
