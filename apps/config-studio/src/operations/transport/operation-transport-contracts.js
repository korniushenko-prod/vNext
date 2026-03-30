(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.OperationTransportContracts = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  const OPERATION_TRANSPORT_ACTION_KINDS = Object.freeze([
    "invoke",
    "cancel"
  ]);

  const OPERATION_TRANSPORT_INTENT_STATES = Object.freeze([
    "invoke_requested",
    "cancel_requested",
    "confirmation_required",
    "blocked",
    "unsupported_by_target",
    "pending_dispatch",
    "dispatch_failed"
  ]);

  const OPERATION_TRANSPORT_RESULT_STATES = Object.freeze([
    "accepted",
    "running",
    "completed",
    "failed",
    "cancelled",
    "rejected"
  ]);

  return {
    OPERATION_TRANSPORT_ACTION_KINDS,
    OPERATION_TRANSPORT_INTENT_STATES,
    OPERATION_TRANSPORT_RESULT_STATES
  };
});
