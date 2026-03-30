export const TARGET_ADAPTER_CONTRACT_VERSION = "0.1.0";

export const WAVE8_EXECUTION_BASELINE_OPERATION_KINDS = [
  "reset_totalizer",
  "reset_counter",
  "reset_interval"
] as const;

export const WAVE14_PACKAGE_MODE_EXECUTION_INTENTS = [
  "request_mode_change",
  "request_phase_start",
  "request_phase_abort"
] as const;

export const WAVE14_PACKAGE_MODE_TRANSITION_STATES = [
  "idle",
  "pending",
  "running",
  "completed",
  "failed",
  "cancelled"
] as const;

export const WAVE14_PACKAGE_PHASE_STATES = [
  "idle",
  "ready",
  "running",
  "aborting",
  "completed",
  "aborted"
] as const;

export const WAVE14_PACKAGE_TRANSITION_GUARD_STATES = [
  "clear",
  "blocked",
  "unsupported"
] as const;

export const WAVE15_PACKAGE_GATE_STATES = [
  "ready",
  "blocked",
  "held",
  "faulted"
] as const;

export const WAVE16_PACKAGE_PROTECTION_STATES = [
  "ready",
  "blocked",
  "tripped",
  "recovering"
] as const;

export const WAVE17_PACKAGE_COMMAND_REQUEST_KINDS = [
  "request_start",
  "request_stop",
  "request_reset",
  "request_enable",
  "request_disable"
] as const;

export const WAVE17_PACKAGE_OWNERSHIP_LANES = [
  "auto",
  "manual",
  "service",
  "remote"
] as const;

export const WAVE17_PACKAGE_ARBITRATION_RESULTS = [
  "accepted",
  "blocked",
  "denied",
  "superseded",
  "unsupported"
] as const;

export const WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS = [
  "request_takeover",
  "request_release",
  "request_return_to_auto"
] as const;

export const WAVE18_PACKAGE_HANDOVER_REQUEST_STATES = [
  "accepted",
  "blocked",
  "denied",
  "unsupported"
] as const;

export const WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS = [
  "blocked_by_policy",
  "held_by_other_owner",
  "not_available"
] as const;
