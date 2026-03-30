(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.OperationUiContracts = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  const OPERATION_UI_SECTIONS = Object.freeze([
    "available_actions",
    "running_operations",
    "confirmation_required",
    "result_summary",
    "recent_operation_history"
  ]);

  const OPERATION_SERVICE_LIFECYCLE_STATES = Object.freeze([
    "idle",
    "available",
    "blocked",
    "confirmation_required",
    "requested",
    "running",
    "completed",
    "rejected",
    "failed",
    "cancelled",
    "stale"
  ]);

  const OPERATION_ACTION_INTENT_KINDS = Object.freeze([
    "invoke",
    "cancel",
    "view_details"
  ]);

  const OPERATION_EXECUTION_BASELINE_KINDS = Object.freeze([
    "reset_totalizer",
    "reset_counter",
    "reset_interval"
  ]);

  const PID_AUTOTUNE_SPECIALIZED_KINDS = Object.freeze([
    "autotune",
    "pid_autotune"
  ]);

  return {
    OPERATION_ACTION_INTENT_KINDS,
    OPERATION_EXECUTION_BASELINE_KINDS,
    PID_AUTOTUNE_SPECIALIZED_KINDS,
    OPERATION_SERVICE_LIFECYCLE_STATES,
    OPERATION_UI_SECTIONS
  };
});
