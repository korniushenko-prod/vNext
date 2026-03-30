(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./operation-transport-guards"));
    return;
  }

  root.OperationCommandIntents = factory(root.OperationTransportGuards);
})(typeof globalThis !== "undefined" ? globalThis : this, function factory(transportGuards) {
  const {
    canApplyRecommendation,
    canCancelOperation,
    canInvokeOperation,
    canRejectRecommendation
  } = transportGuards;

  function resolveOperationCommandIntents({ operationVm, targetSupport, confirmationToken, localDispatch }) {
    return {
      invoke: resolveInvokeIntent({ operationVm, targetSupport, confirmationToken, localDispatch }),
      cancel: resolveCancelIntent({ operationVm, targetSupport, localDispatch }),
      apply_recommendation: resolveRecommendationIntent({
        action: "apply_recommendation",
        operationVm,
        targetSupport,
        confirmationToken,
        localDispatch
      }),
      reject_recommendation: resolveRecommendationIntent({
        action: "reject_recommendation",
        operationVm,
        targetSupport,
        confirmationToken,
        localDispatch
      })
    };
  }

  function resolveInvokeIntent({ operationVm, targetSupport, confirmationToken, localDispatch }) {
    if (localDispatch?.action === "invoke" && localDispatch.intent_state === "pending_dispatch") {
      return intent("pending_dispatch", false, localDispatch.message ?? "Invoke dispatch pending.");
    }

    if (localDispatch?.action === "invoke" && localDispatch.intent_state === "dispatch_failed") {
      return intent("dispatch_failed", true, localDispatch.message ?? "Invoke dispatch failed.");
    }

    const gate = canInvokeOperation(operationVm, targetSupport);
    if (!gate.allowed) {
      return intent(gate.intent_state, false, gate.reason);
    }

    if (operationVm.confirmation?.required && !confirmationToken) {
      return intent("confirmation_required", false, "confirmation_token_missing");
    }

    return intent("invoke_requested", true);
  }

  function resolveCancelIntent({ operationVm, targetSupport, localDispatch }) {
    if (localDispatch?.action === "cancel" && localDispatch.intent_state === "pending_dispatch") {
      return intent("pending_dispatch", false, localDispatch.message ?? "Cancel dispatch pending.");
    }

    if (localDispatch?.action === "cancel" && localDispatch.intent_state === "dispatch_failed") {
      return intent("dispatch_failed", true, localDispatch.message ?? "Cancel dispatch failed.");
    }

    const gate = canCancelOperation(operationVm, targetSupport);
    if (!gate.allowed) {
      return intent(gate.intent_state, false, gate.reason);
    }

    return intent("cancel_requested", true);
  }

  function resolveRecommendationIntent({ action, operationVm, targetSupport, confirmationToken, localDispatch }) {
    if (localDispatch?.action === action && localDispatch.intent_state === "pending_dispatch") {
      return intent("pending_dispatch", false, localDispatch.message ?? "Recommendation dispatch pending.");
    }

    if (localDispatch?.action === action && localDispatch.intent_state === "dispatch_failed") {
      return intent("dispatch_failed", true, localDispatch.message ?? "Recommendation dispatch failed.");
    }

    const gate = action === "apply_recommendation"
      ? canApplyRecommendation(operationVm, targetSupport)
      : canRejectRecommendation(operationVm, targetSupport);
    if (!gate.allowed) {
      return intent(gate.intent_state, false, gate.reason);
    }

    if (operationVm.confirmation?.required && !confirmationToken) {
      return intent("confirmation_required", false, "confirmation_token_missing");
    }

    return intent(action, true);
  }

  function intent(state, enabled, reason) {
    return {
      state,
      enabled,
      reason
    };
  }

  return {
    resolveOperationCommandIntents
  };
});
