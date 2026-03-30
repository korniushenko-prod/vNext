(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(
      require("./operation-transport-guards"),
      require("../contracts/operation-ui-guards")
    );
    return;
  }

  root.OperationTransportMappers = factory(root.OperationTransportGuards, root.OperationUiGuards);
})(typeof globalThis !== "undefined" ? globalThis : this, function factory(transportGuards, operationUiGuards) {
  const {
    canApplyRecommendation,
    canCancelOperation,
    canInvokeOperation,
    canRejectRecommendation
  } = transportGuards;
  const { normalizeOperationsSupport } = operationUiGuards;

  function buildInvocationRequest(operationVm, context = {}) {
    const action = typeof context.action === "string" ? context.action : "invoke";
    const gate = action === "apply_recommendation"
      ? canApplyRecommendation(operationVm, context.targetSupport)
      : action === "reject_recommendation"
        ? canRejectRecommendation(operationVm, context.targetSupport)
        : canInvokeOperation(operationVm, context.targetSupport);
    if (!gate.allowed) {
      return blocked(gate);
    }

    if (operationVm.confirmation?.required && !context.confirmationToken) {
      return {
        ok: false,
        intent_state: "confirmation_required",
        reason: "confirmation_token_missing"
      };
    }

    const request = {
      operation_id: operationVm.id
    };

    if (action !== "invoke") {
      request.action = action;
    }

    if (context.confirmationToken) {
      request.confirmation_token = context.confirmationToken;
    }

    if (context.inputs && typeof context.inputs === "object" && Object.keys(context.inputs).length > 0) {
      request.inputs = structuredClone(context.inputs);
    }

    return {
      ok: true,
      intent_state: "invoke_requested",
      request
    };
  }

  function buildCancelRequest(operationVm, context = {}) {
    const gate = canCancelOperation(operationVm, context.targetSupport);
    if (!gate.allowed) {
      return blocked(gate);
    }

    return {
      ok: true,
      intent_state: "cancel_requested",
      request: {
        operation_id: operationVm.id
      }
    };
  }

  function mapInvocationResult(result, context = {}) {
    return mapTransportResult(result, context);
  }

  function mapCancelResult(result, context = {}) {
    return mapTransportResult(result, context);
  }

  function overlayRuntimeSnapshot(baseSnapshot, dispatchRegistry = {}) {
    const snapshot = structuredClone(baseSnapshot && typeof baseSnapshot === "object"
      ? baseSnapshot
      : { operation_snapshots: {} });

    if (!snapshot.operation_snapshots || typeof snapshot.operation_snapshots !== "object") {
      snapshot.operation_snapshots = {};
    }

    Object.values(dispatchRegistry).forEach((entry) => {
      if (entry && entry.snapshot_patch && typeof entry.operation_id === "string") {
        const existing = snapshot.operation_snapshots[entry.operation_id] &&
          typeof snapshot.operation_snapshots[entry.operation_id] === "object"
          ? snapshot.operation_snapshots[entry.operation_id]
          : { operation_id: entry.operation_id };
        snapshot.operation_snapshots[entry.operation_id] = {
          ...structuredClone(existing),
          ...structuredClone(entry.snapshot_patch)
        };
      }
    });

    return snapshot;
  }

  function mapTransportResult(result, context) {
    if (!isValidTransportResult(result)) {
      return {
        ok: false,
        intent_state: "dispatch_failed",
        reason: "malformed_transport_payload",
        message: "Malformed transport payload.",
        snapshot_patch: null
      };
    }

    if (!result.accepted) {
      return {
        ok: false,
        intent_state: "dispatch_failed",
        reason: "transport_rejected",
        message: result.message ?? "Transport rejected the request.",
        state: result.state,
        snapshot_patch: null
      };
    }

    return {
      ok: true,
      intent_state: "pending_dispatch",
      message: result.message ?? "Transport accepted the request.",
      state: result.state,
      snapshot_patch: {
        state: result.state,
        message: result.message ?? undefined,
        progress_payload: result.progress_payload ?? undefined,
        result: result.result ?? undefined,
        failure: result.failure ?? undefined,
        recommendation_state: result.recommendation_state ?? undefined
      },
      operation_id: context.operationId
    };
  }

  function blocked(gate) {
    return {
      ok: false,
      intent_state: gate.intent_state,
      reason: gate.reason
    };
  }

  function isValidTransportResult(result) {
    return Boolean(
      result &&
      typeof result === "object" &&
      typeof result.accepted === "boolean" &&
      typeof result.state === "string"
    );
  }

  return {
    buildCancelRequest,
    buildInvocationRequest,
    mapCancelResult,
    mapInvocationResult,
    normalizeTransportSupport: normalizeOperationsSupport,
    overlayRuntimeSnapshot
  };
});
