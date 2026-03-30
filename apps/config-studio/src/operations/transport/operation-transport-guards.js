(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("../contracts/operation-ui-guards"));
    return;
  }

  root.OperationTransportGuards = factory(root.OperationUiGuards);
})(typeof globalThis !== "undefined" ? globalThis : this, function factory(operationUiGuards) {
  const { normalizeOperationsSupport } = operationUiGuards;

  function canInvokeOperation(operationVm, targetSupport) {
    const support = normalizeOperationsSupport(targetSupport);
    if (!operationVm || typeof operationVm.id !== "string" || !operationVm.id) {
      return deny("blocked", "unknown_operation_id");
    }

    if (!support.enabled || !support.invoke) {
      return deny("unsupported_by_target", "invoke_not_supported");
    }

    if (operationVm.execution?.runnable !== true) {
      return deny("unsupported_execution", operationVm.execution?.reason || "operation_not_runnable");
    }

    if (operationVm.availability?.blocked || operationVm.lifecycle_state === "blocked") {
      return deny("blocked", "operation_unavailable");
    }

    if (operationVm.lifecycle_state === "running" || operationVm.lifecycle_state === "requested") {
      return deny("blocked", "operation_already_active");
    }

    return allow("invoke_requested");
  }

  function canCancelOperation(operationVm, targetSupport) {
    const support = normalizeOperationsSupport(targetSupport);
    if (!operationVm || typeof operationVm.id !== "string" || !operationVm.id) {
      return deny("blocked", "unknown_operation_id");
    }

    if (!support.enabled || !support.cancel) {
      return deny("unsupported_by_target", "cancel_not_supported");
    }

    if (operationVm.execution?.cancel_supported !== true) {
      return deny("unsupported_execution", "cancel_not_supported");
    }

    if (operationVm.lifecycle_state !== "running" && operationVm.lifecycle_state !== "requested") {
      return deny("blocked", "operation_not_running");
    }

    return allow("cancel_requested");
  }

  function canApplyRecommendation(operationVm, targetSupport) {
    return canHandleRecommendation(operationVm, targetSupport, "apply_recommendation");
  }

  function canRejectRecommendation(operationVm, targetSupport) {
    return canHandleRecommendation(operationVm, targetSupport, "reject_recommendation");
  }

  function canHandleRecommendation(operationVm, targetSupport, intentState) {
    const support = normalizeOperationsSupport(targetSupport);
    if (!operationVm || typeof operationVm.id !== "string" || !operationVm.id) {
      return deny("blocked", "unknown_operation_id");
    }

    if (!support.enabled || !support.invoke) {
      return deny("unsupported_by_target", "invoke_not_supported");
    }

    if (operationVm.execution?.apply_reject_supported !== true) {
      return deny("unsupported_execution", "recommendation_not_supported");
    }

    const recommendationState = operationVm.result_summary?.recommendation_state;
    if (recommendationState !== "available" && recommendationState !== "pending_apply") {
      return deny("blocked", "recommendation_not_available");
    }

    return allow(intentState);
  }

  function allow(intentState) {
    return {
      allowed: true,
      intent_state: intentState
    };
  }

  function deny(intentState, reason) {
    return {
      allowed: false,
      intent_state: intentState,
      reason
    };
  }

  return {
    canApplyRecommendation,
    canCancelOperation,
    canInvokeOperation,
    canRejectRecommendation
  };
});
