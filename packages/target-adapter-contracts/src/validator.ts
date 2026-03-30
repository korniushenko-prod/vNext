import {
  TARGET_ADAPTER_CONTRACT_VERSION,
  WAVE14_PACKAGE_MODE_EXECUTION_INTENTS,
  WAVE14_PACKAGE_MODE_TRANSITION_STATES,
  WAVE14_PACKAGE_PHASE_STATES,
  WAVE14_PACKAGE_TRANSITION_GUARD_STATES,
  WAVE15_PACKAGE_GATE_STATES,
  WAVE16_PACKAGE_PROTECTION_STATES,
  WAVE17_PACKAGE_ARBITRATION_RESULTS,
  WAVE17_PACKAGE_COMMAND_REQUEST_KINDS,
  WAVE17_PACKAGE_OWNERSHIP_LANES,
  WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS,
  WAVE18_PACKAGE_HANDOVER_REQUEST_STATES
} from "./constants.js";
import type {
  TargetAdapterManifest,
  TargetArtifact,
  TargetDeploymentRequest,
  TargetDeploymentResult,
  TargetOperationSupportProfile,
  RuntimeOperationSnapshot,
  TargetReadbackRequest,
  TargetReadbackSnapshot
} from "./types.js";

export type ValidationSeverity = "error" | "warning";

export interface ValidationDiagnostic {
  code: string;
  severity: ValidationSeverity;
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: boolean;
  diagnostics: ValidationDiagnostic[];
}

export function validateTargetAdapterManifest(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("manifest.invalid", "$", "Target adapter manifest must be an object."));
  }

  requireString(value, "id", "$.id", diagnostics);
  requireExactString(value, "kind", "target_adapter", "$.kind", diagnostics);
  requireExactString(value, "contract_version", TARGET_ADAPTER_CONTRACT_VERSION, "$.contract_version", diagnostics);
  requireString(value, "display_name", "$.display_name", diagnostics);
  requireString(value, "target_family", "$.target_family", diagnostics);
  requireString(value, "runtime_pack_schema_version", "$.runtime_pack_schema_version", diagnostics);
  requireStringArrayOf(value, "capabilities", ["validate", "emit", "apply", "readback", "diagnostics"], "$.capabilities", diagnostics);
  requireStringArrayOf(value, "artifact_kinds", ["bundle", "firmware", "config", "report"], "$.artifact_kinds", diagnostics);

  return done(diagnostics);
}

export function validateTargetCapabilityProfile(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("capability_profile.invalid", "$", "Target capability profile must be an object."));
  }

  requireString(value, "target_id", "$.target_id", diagnostics);
  requireString(value, "display_name", "$.display_name", diagnostics);
  requireStringArray(value, "supported_binding_kinds", "$.supported_binding_kinds", diagnostics);
  requireStringArray(value, "supported_channel_kinds", "$.supported_channel_kinds", diagnostics);
  requireStringArray(value, "supported_value_types", "$.supported_value_types", diagnostics);
  requireStringArray(value, "supported_native_kinds", "$.supported_native_kinds", diagnostics);
  requireStringArray(value, "supported_operation_kinds", "$.supported_operation_kinds", diagnostics);
  requireBoolean(value, "supports_trace", "$.supports_trace", diagnostics);
  requireBoolean(value, "supports_operations", "$.supports_operations", diagnostics);
  requireBoolean(value, "supports_persistence", "$.supports_persistence", diagnostics);
  requireBoolean(value, "supports_simulation", "$.supports_simulation", diagnostics);
  requireOptionalStringArray(value, "supported_pulse_source_modes", "$.supported_pulse_source_modes", diagnostics);

  if ("operations_support" in value && value.operations_support !== undefined) {
    validateTargetOperationSupportProfile(value.operations_support, "$.operations_support", diagnostics);
  }

  if ("package_supervision_support" in value && value.package_supervision_support !== undefined) {
    validateTargetPackageSupervisionSupportProfile(value.package_supervision_support, "$.package_supervision_support", diagnostics);
  }

  if ("package_coordination_support" in value && value.package_coordination_support !== undefined) {
    validateTargetPackageCoordinationSupportProfile(value.package_coordination_support, "$.package_coordination_support", diagnostics);
  }

  if ("package_mode_phase_support" in value && value.package_mode_phase_support !== undefined) {
    validateTargetPackageModePhaseSupportProfile(value.package_mode_phase_support, "$.package_mode_phase_support", diagnostics);
  }

  if ("package_permissive_interlock_support" in value && value.package_permissive_interlock_support !== undefined) {
    validateTargetPackagePermissiveInterlockSupportProfile(value.package_permissive_interlock_support, "$.package_permissive_interlock_support", diagnostics);
  }

  if ("package_protection_recovery_support" in value && value.package_protection_recovery_support !== undefined) {
    validateTargetPackageProtectionRecoverySupportProfile(value.package_protection_recovery_support, "$.package_protection_recovery_support", diagnostics);
  }

  if ("package_arbitration_support" in value && value.package_arbitration_support !== undefined) {
    validateTargetPackageArbitrationSupportProfile(value.package_arbitration_support, "$.package_arbitration_support", diagnostics);
  }

  if ("package_override_handover_support" in value && value.package_override_handover_support !== undefined) {
    validateTargetPackageOverrideHandoverSupportProfile(value.package_override_handover_support, "$.package_override_handover_support", diagnostics);
  }

  if ("pulse_source_constraints" in value && value.pulse_source_constraints !== undefined) {
    if (!Array.isArray(value.pulse_source_constraints)) {
      diagnostics.push(error("field.array", "$.pulse_source_constraints", "Field `pulse_source_constraints` must be an array when present."));
    } else {
      value.pulse_source_constraints.forEach((entry, index) => {
        if (!isRecord(entry)) {
          diagnostics.push(error("pulse_source_constraint.invalid", `$.pulse_source_constraints[${index}]`, "Pulse source constraint must be an object."));
          return;
        }
        requireString(entry, "mode", `$.pulse_source_constraints[${index}].mode`, diagnostics);
        requireString(entry, "required_binding_kind", `$.pulse_source_constraints[${index}].required_binding_kind`, diagnostics);
        requireOptionalStringArray(entry, "required_value_types", `$.pulse_source_constraints[${index}].required_value_types`, diagnostics);
        requireOptionalString(entry, "notes", `$.pulse_source_constraints[${index}].notes`, diagnostics);
      });
    }
  }

  const limits = requireRecord(value, "limits", "$.limits", diagnostics);
  if (limits) {
    requireNumber(limits, "max_instances", "$.limits.max_instances", diagnostics);
    requireNumber(limits, "max_connections", "$.limits.max_connections", diagnostics);
    requireNumber(limits, "max_resources", "$.limits.max_resources", diagnostics);
  }

  return done(diagnostics);
}

export function validateTargetDeploymentRequest(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("deployment_request.invalid", "$", "Target deployment request must be an object."));
  }

  requireString(value, "request_id", "$.request_id", diagnostics);
  requireString(value, "adapter_id", "$.adapter_id", diagnostics);
  const pack = requireRecord(value, "pack", "$.pack", diagnostics);
  if (pack) {
    requireString(pack, "pack_id", "$.pack.pack_id", diagnostics);
    requireString(pack, "schema_version", "$.pack.schema_version", diagnostics);
  }
  requireRecord(value, "options", "$.options", diagnostics);

  return done(diagnostics);
}

export function validateTargetDeploymentResult(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("deployment_result.invalid", "$", "Target deployment result must be an object."));
  }

  requireString(value, "request_id", "$.request_id", diagnostics);
  requireBoolean(value, "success", "$.success", diagnostics);
  validateDiagnosticsArray(value.diagnostics, "$.diagnostics", diagnostics);

  const artifacts = requireRecord(value, "artifacts", "$.artifacts", diagnostics);
  if (artifacts) {
    for (const [artifactId, artifact] of Object.entries(artifacts)) {
      validateArtifact(artifactId, artifact, `$.artifacts.${artifactId}`, diagnostics);
    }
  }

  return done(diagnostics);
}

export function validateTargetReadbackRequest(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("readback_request.invalid", "$", "Target readback request must be an object."));
  }

  requireString(value, "request_id", "$.request_id", diagnostics);
  requireString(value, "adapter_id", "$.adapter_id", diagnostics);
  requireString(value, "target_id", "$.target_id", diagnostics);
  requireOneOf(value, "scope", ["summary", "full"], "$.scope", diagnostics);
  return done(diagnostics);
}

export function validateTargetReadbackSnapshot(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("readback_snapshot.invalid", "$", "Target readback snapshot must be an object."));
  }

  requireString(value, "request_id", "$.request_id", diagnostics);
  requireString(value, "target_id", "$.target_id", diagnostics);
  requireString(value, "collected_at", "$.collected_at", diagnostics);
  requireRecord(value, "signals", "$.signals", diagnostics);
  requireRecord(value, "resources", "$.resources", diagnostics);
  if ("operation_snapshots" in value && value.operation_snapshots !== undefined) {
    const snapshots = requireRecord(value, "operation_snapshots", "$.operation_snapshots", diagnostics);
    if (snapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(snapshots)) {
        const snapshotValidation = validateOperationSnapshot(
          snapshotValue,
          `$.operation_snapshots.${snapshotId}`
        );
        diagnostics.push(...snapshotValidation.diagnostics);
      }
    }
  }
  if ("package_snapshots" in value && value.package_snapshots !== undefined) {
    const packageSnapshots = requireRecord(value, "package_snapshots", "$.package_snapshots", diagnostics);
    if (packageSnapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(packageSnapshots)) {
        validateTargetPackageSupervisionSnapshot(
          snapshotId,
          snapshotValue,
          `$.package_snapshots.${snapshotId}`,
          diagnostics
        );
      }
    }
  }
  if ("package_coordination_snapshots" in value && value.package_coordination_snapshots !== undefined) {
    const packageCoordinationSnapshots = requireRecord(value, "package_coordination_snapshots", "$.package_coordination_snapshots", diagnostics);
    if (packageCoordinationSnapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(packageCoordinationSnapshots)) {
        validateTargetPackageCoordinationSnapshot(
          snapshotId,
          snapshotValue,
          `$.package_coordination_snapshots.${snapshotId}`,
          diagnostics
        );
      }
    }
  }
  if ("package_mode_phase_snapshots" in value && value.package_mode_phase_snapshots !== undefined) {
    const packageModePhaseSnapshots = requireRecord(value, "package_mode_phase_snapshots", "$.package_mode_phase_snapshots", diagnostics);
    if (packageModePhaseSnapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(packageModePhaseSnapshots)) {
        validateTargetPackageModePhaseSnapshot(
          snapshotId,
          snapshotValue,
          `$.package_mode_phase_snapshots.${snapshotId}`,
          diagnostics
        );
      }
    }
  }
  if ("package_permissive_interlock_snapshots" in value && value.package_permissive_interlock_snapshots !== undefined) {
    const packagePermissiveInterlockSnapshots = requireRecord(value, "package_permissive_interlock_snapshots", "$.package_permissive_interlock_snapshots", diagnostics);
    if (packagePermissiveInterlockSnapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(packagePermissiveInterlockSnapshots)) {
        validateTargetPackagePermissiveInterlockSnapshot(
          snapshotId,
          snapshotValue,
          `$.package_permissive_interlock_snapshots.${snapshotId}`,
          diagnostics
        );
      }
    }
  }
  if ("package_protection_recovery_snapshots" in value && value.package_protection_recovery_snapshots !== undefined) {
    const packageProtectionRecoverySnapshots = requireRecord(value, "package_protection_recovery_snapshots", "$.package_protection_recovery_snapshots", diagnostics);
    if (packageProtectionRecoverySnapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(packageProtectionRecoverySnapshots)) {
        validateTargetPackageProtectionRecoverySnapshot(
          snapshotId,
          snapshotValue,
          `$.package_protection_recovery_snapshots.${snapshotId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_arbitration_snapshots" in value && value.package_arbitration_snapshots !== undefined) {
    const packageArbitrationSnapshots = requireRecord(value, "package_arbitration_snapshots", "$.package_arbitration_snapshots", diagnostics);
    if (packageArbitrationSnapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(packageArbitrationSnapshots)) {
        validateTargetPackageArbitrationSnapshot(
          snapshotId,
          snapshotValue,
          `$.package_arbitration_snapshots.${snapshotId}`,
          diagnostics
        );
      }
    }
  }

  if ("package_override_handover_snapshots" in value && value.package_override_handover_snapshots !== undefined) {
    const packageOverrideHandoverSnapshots = requireRecord(value, "package_override_handover_snapshots", "$.package_override_handover_snapshots", diagnostics);
    if (packageOverrideHandoverSnapshots) {
      for (const [snapshotId, snapshotValue] of Object.entries(packageOverrideHandoverSnapshots)) {
        validateTargetPackageOverrideHandoverSnapshot(
          snapshotId,
          snapshotValue,
          `$.package_override_handover_snapshots.${snapshotId}`,
          diagnostics
        );
      }
    }
  }
  validateDiagnosticsArray(value.diagnostics, "$.diagnostics", diagnostics);

  return done(diagnostics);
}

export function validateOperationInvocationRequest(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("operation_invocation_request.invalid", "$", "Operation invocation request must be an object."));
  }

  requireString(value, "operation_id", "$.operation_id", diagnostics);
  requireOptionalOneOf(
    value,
    "action",
    ["invoke", "apply_recommendation", "reject_recommendation"],
    "$.action",
    diagnostics
  );
  requireOptionalString(value, "confirmation_token", "$.confirmation_token", diagnostics);
  if ("inputs" in value && value.inputs !== undefined) {
    requireRecord(value, "inputs", "$.inputs", diagnostics);
  }

  return done(diagnostics);
}

export function validateOperationInvocationResult(value: unknown): ValidationResult {
  return validateOperationResultLike(value, "$", "operation_invocation_result.invalid");
}

export function validateOperationCancelRequest(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("operation_cancel_request.invalid", "$", "Operation cancel request must be an object."));
  }

  requireString(value, "operation_id", "$.operation_id", diagnostics);
  return done(diagnostics);
}

export function validateOperationCancelResult(value: unknown): ValidationResult {
  return validateOperationResultLike(value, "$", "operation_cancel_result.invalid");
}

export function validatePackageModeTransitionRequest(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("package_mode_transition_request.invalid", "$", "Package mode transition request must be an object."));
  }

  requireString(value, "package_instance_id", "$.package_instance_id", diagnostics);
  requireOneOf(
    value,
    "intent",
    [...WAVE14_PACKAGE_MODE_EXECUTION_INTENTS],
    "$.intent",
    diagnostics
  );
  requireOptionalString(value, "target_mode_id", "$.target_mode_id", diagnostics);
  requireOptionalString(value, "target_phase_id", "$.target_phase_id", diagnostics);
  requireOptionalString(value, "confirmation_token", "$.confirmation_token", diagnostics);
  return done(diagnostics);
}

export function validatePackageModeTransitionResult(value: unknown): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error("package_mode_transition_result.invalid", "$", "Package mode transition result must be an object."));
  }

  requireBoolean(value, "accepted", "$.accepted", diagnostics);
  requireString(value, "package_instance_id", "$.package_instance_id", diagnostics);
  requireOneOf(
    value,
    "intent",
    [...WAVE14_PACKAGE_MODE_EXECUTION_INTENTS],
    "$.intent",
    diagnostics
  );
  requireOneOf(
    value,
    "transition_state",
    [...WAVE14_PACKAGE_MODE_TRANSITION_STATES],
    "$.transition_state",
    diagnostics
  );
  requireOptionalString(value, "active_mode_id", "$.active_mode_id", diagnostics);
  requireOptionalString(value, "active_phase_id", "$.active_phase_id", diagnostics);
  requireOptionalOneOf(
    value,
    "target_phase_state",
    [...WAVE14_PACKAGE_PHASE_STATES],
    "$.target_phase_state",
    diagnostics
  );
  requireOptionalOneOf(
    value,
    "guard_state",
    [...WAVE14_PACKAGE_TRANSITION_GUARD_STATES],
    "$.guard_state",
    diagnostics
  );
  requireOptionalString(value, "message", "$.message", diagnostics);
  return done(diagnostics);
}

function validateOperationSnapshot(value: unknown, path: string): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  const ok = validateOperationSnapshotAtPath(value, path, diagnostics);
  return {
    ok: ok && diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics
  };
}

function validateArtifact(artifactId: string, value: unknown, path: string, diagnostics: ValidationDiagnostic[]): value is TargetArtifact {
  if (!isRecord(value)) {
    diagnostics.push(error("artifact.invalid", path, "Artifact must be an object."));
    return false;
  }

  requireExactString(value, "id", artifactId, `${path}.id`, diagnostics);
  requireOneOf(value, "kind", ["bundle", "firmware", "config", "report"], `${path}.kind`, diagnostics);
  requireOptionalString(value, "uri", `${path}.uri`, diagnostics);
  requireOptionalString(value, "media_type", `${path}.media_type`, diagnostics);
  if ("meta" in value) {
    requireRecord(value, "meta", `${path}.meta`, diagnostics);
  }
  return true;
}

function validateOperationResultLike(
  value: unknown,
  path: string,
  invalidCode: string
): ValidationResult {
  const diagnostics: ValidationDiagnostic[] = [];
  if (!isRecord(value)) {
    return fail(diagnostics, error(invalidCode, path, "Operation result must be an object."));
  }

  requireBoolean(value, "accepted", `${path}.accepted`, diagnostics);
  requireOneOf(
    value,
    "state",
    ["idle", "pending_confirmation", "accepted", "running", "completed", "failed", "cancelled", "rejected"],
    `${path}.state`,
    diagnostics
  );
  requireOptionalString(value, "message", `${path}.message`, diagnostics);
  if ("progress_payload" in value && value.progress_payload !== undefined) {
    requireRecord(value, "progress_payload", `${path}.progress_payload`, diagnostics);
  }
  if ("failure" in value && value.failure !== undefined) {
    requireRecord(value, "failure", `${path}.failure`, diagnostics);
  }
  requireOptionalString(value, "audit_record_id", `${path}.audit_record_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "recommendation_state",
    ["none", "available", "pending_apply", "applied", "rejected"],
    `${path}.recommendation_state`,
    diagnostics
  );
  return done(diagnostics);
}

function validateTargetOperationSupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is TargetOperationSupportProfile {
  if (!isRecord(value)) {
    diagnostics.push(error("operations_support.invalid", path, "Operations support profile must be an object."));
    return false;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "invoke", `${path}.invoke`, diagnostics);
  requireBoolean(value, "cancel", `${path}.cancel`, diagnostics);
  requireBoolean(value, "progress", `${path}.progress`, diagnostics);
  requireBoolean(value, "result_payload", `${path}.result_payload`, diagnostics);
  requireBoolean(value, "confirmation", `${path}.confirmation`, diagnostics);
  if ("execution_baseline_kinds" in value && value.execution_baseline_kinds !== undefined) {
    requireStringArrayExactOneOf(
      value.execution_baseline_kinds,
      ["reset_totalizer", "reset_counter", "reset_interval"],
      `${path}.execution_baseline_kinds`,
      diagnostics
    );
  }
  requireOptionalOneOf(value, "confirmation_token_validation", ["none", "when_required"], `${path}.confirmation_token_validation`, diagnostics);
  requireOptionalBoolean(value, "failure_payload", `${path}.failure_payload`, diagnostics);
  requireOptionalBoolean(value, "audit_hooks", `${path}.audit_hooks`, diagnostics);
  requireOptionalBoolean(value, "recommendation_lifecycle", `${path}.recommendation_lifecycle`, diagnostics);
  requireOptionalBoolean(value, "progress_payload", `${path}.progress_payload`, diagnostics);
  return true;
}

function validateOperationSnapshotAtPath(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
): value is RuntimeOperationSnapshot {
  if (!isRecord(value)) {
    diagnostics.push(error("runtime_operation_snapshot.invalid", path, "Runtime operation snapshot must be an object."));
    return false;
  }

  requireString(value, "operation_id", `${path}.operation_id`, diagnostics);
  requireOneOf(
    value,
    "state",
    ["idle", "pending_confirmation", "accepted", "running", "completed", "failed", "cancelled", "rejected"],
    `${path}.state`,
    diagnostics
  );
  requireOptionalNumber(value, "progress", `${path}.progress`, diagnostics);
  if ("progress_payload" in value && value.progress_payload !== undefined) {
    requireRecord(value, "progress_payload", `${path}.progress_payload`, diagnostics);
  }
  requireOptionalString(value, "message", `${path}.message`, diagnostics);
  if ("result" in value && value.result !== undefined) {
    requireRecord(value, "result", `${path}.result`, diagnostics);
  }
  if ("failure" in value && value.failure !== undefined) {
    requireRecord(value, "failure", `${path}.failure`, diagnostics);
  }
  requireOptionalString(value, "audit_record_id", `${path}.audit_record_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "recommendation_state",
    ["none", "available", "pending_apply", "applied", "rejected"],
    `${path}.recommendation_state`,
    diagnostics
  );
  return true;
}

function requireStringArrayExactOneOf(
  value: unknown,
  allowed: string[],
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!Array.isArray(value)) {
    diagnostics.push(error("field.array", path, "Field must be an array."));
    return;
  }

  value.forEach((entry, index) => {
    if (typeof entry !== "string") {
      diagnostics.push(error("field.string", `${path}.${index}`, "Array entry must be a string."));
      return;
    }
    if (!allowed.includes(entry)) {
      diagnostics.push(error("field.enum", `${path}.${index}`, `Field must be one of: ${allowed.join(", ")}.`));
    }
  });
}

function validateDiagnosticsArray(value: unknown, path: string, diagnostics: ValidationDiagnostic[]) {
  if (!Array.isArray(value)) {
    diagnostics.push(error("diagnostics.invalid", path, "Diagnostics must be an array."));
    return;
  }

  value.forEach((entry, index) => {
    if (!isRecord(entry)) {
      diagnostics.push(error("diagnostic.invalid", `${path}[${index}]`, "Diagnostic entry must be an object."));
      return;
    }
    requireString(entry, "code", `${path}[${index}].code`, diagnostics);
    requireOneOf(entry, "severity", ["error", "warning", "info"], `${path}[${index}].severity`, diagnostics);
    requireString(entry, "message", `${path}[${index}].message`, diagnostics);
    requireOptionalString(entry, "path", `${path}[${index}].path`, diagnostics);
  });
}

function requireString(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "string") {
    diagnostics.push(error("field.string", path, `Field \`${field}\` must be a string.`));
  }
}

function validateTargetPackageSupervisionSupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_supervision_support.invalid", path, "Package supervision support profile must be an object."));
    return;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  requireBoolean(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  requireBoolean(value, "aggregate_alarms", `${path}.aggregate_alarms`, diagnostics);
  requireBoolean(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  requireBoolean(value, "operation_proxies", `${path}.operation_proxies`, diagnostics);
}

function validateTargetPackageCoordinationSupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_coordination_support.invalid", path, "Package coordination support profile must be an object."));
    return;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "package_state", `${path}.package_state`, diagnostics);
  requireBoolean(value, "summary_outputs", `${path}.summary_outputs`, diagnostics);
  requireBoolean(value, "aggregate_monitors", `${path}.aggregate_monitors`, diagnostics);
  requireBoolean(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  requireBoolean(value, "operation_proxies", `${path}.operation_proxies`, diagnostics);
}

function validateTargetPackageModePhaseSupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_mode_phase_support.invalid", path, "Package mode/phase support profile must be an object."));
    return;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "modes", `${path}.modes`, diagnostics);
  requireBoolean(value, "phases", `${path}.phases`, diagnostics);
  requireBoolean(value, "mode_summary", `${path}.mode_summary`, diagnostics);
  requireBoolean(value, "phase_summary", `${path}.phase_summary`, diagnostics);
  requireBoolean(value, "groups", `${path}.groups`, diagnostics);
  requireBoolean(value, "trace_groups", `${path}.trace_groups`, diagnostics);
  requireBoolean(value, "active_refs", `${path}.active_refs`, diagnostics);
  requireOptionalBoolean(value, "package_mode_execution", `${path}.package_mode_execution`, diagnostics);
  requireOptionalBoolean(value, "phase_transition_execution", `${path}.phase_transition_execution`, diagnostics);
  requireOptionalBoolean(value, "transition_guard_diagnostics", `${path}.transition_guard_diagnostics`, diagnostics);
}

function validateTargetPackagePermissiveInterlockSupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_permissive_interlock_support.invalid", path, "Package permissive/interlock support profile must be an object."));
    return;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "gate_summary", `${path}.gate_summary`, diagnostics);
  requireBoolean(value, "reason_codes", `${path}.reason_codes`, diagnostics);
  requireBoolean(value, "diagnostics_refs", `${path}.diagnostics_refs`, diagnostics);
  requireBoolean(value, "transition_guards", `${path}.transition_guards`, diagnostics);
}

function validateTargetPackageProtectionRecoverySupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_protection_recovery_support.invalid", path, "Package protection/recovery support profile must be an object."));
    return;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "protection_summary", `${path}.protection_summary`, diagnostics);
  requireBoolean(value, "reason_codes", `${path}.reason_codes`, diagnostics);
  requireBoolean(value, "diagnostics_refs", `${path}.diagnostics_refs`, diagnostics);
  requireBoolean(value, "recovery_requests", `${path}.recovery_requests`, diagnostics);
}

function validateTargetPackageArbitrationSupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_arbitration_support.invalid", path, "Package arbitration support profile must be an object."));
    return;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "ownership_lanes", `${path}.ownership_lanes`, diagnostics);
  requireBoolean(value, "command_summary", `${path}.command_summary`, diagnostics);
  requireBoolean(value, "reason_codes", `${path}.reason_codes`, diagnostics);
  requireBoolean(value, "request_preview", `${path}.request_preview`, diagnostics);
  requireOptionalOneOfArray(value, "supported_ownership_lanes", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.supported_ownership_lanes`, diagnostics);
  requireOptionalOneOfArray(value, "supported_request_kinds", [...WAVE17_PACKAGE_COMMAND_REQUEST_KINDS], `${path}.supported_request_kinds`, diagnostics);
}

function validateTargetPackageOverrideHandoverSupportProfile(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_override_handover_support.invalid", path, "Package override/handover support profile must be an object."));
    return;
  }

  requireBoolean(value, "enabled", `${path}.enabled`, diagnostics);
  requireBoolean(value, "holder_visibility", `${path}.holder_visibility`, diagnostics);
  requireBoolean(value, "request_visibility", `${path}.request_visibility`, diagnostics);
  requireBoolean(value, "reason_codes", `${path}.reason_codes`, diagnostics);
  requireBoolean(value, "last_handover_reason", `${path}.last_handover_reason`, diagnostics);
  requireOptionalOneOfArray(value, "supported_holder_lanes", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.supported_holder_lanes`, diagnostics);
  requireOptionalOneOfArray(value, "supported_request_kinds", [...WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS], `${path}.supported_request_kinds`, diagnostics);
  requireOptionalOneOfArray(value, "supported_denial_reasons", [...WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS], `${path}.supported_denial_reasons`, diagnostics);
}

function validateTargetPackageSupervisionSnapshot(
  snapshotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_supervision_snapshot.invalid", path, "Package supervision snapshot must be an object."));
    return;
  }

  requireExactString(value, "package_instance_id", snapshotId, `${path}.package_instance_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "state",
    ["healthy", "degraded", "alarm_present", "maintenance_due", "stale", "unsupported_by_target"],
    `${path}.state`,
    diagnostics
  );
  if ("summary" in value && value.summary !== undefined) {
    requireRecord(value, "summary", `${path}.summary`, diagnostics);
  }
  if ("aggregate_monitor_states" in value && value.aggregate_monitor_states !== undefined) {
    requireRecord(value, "aggregate_monitor_states", `${path}.aggregate_monitor_states`, diagnostics);
  }
  if ("aggregate_alarm_states" in value && value.aggregate_alarm_states !== undefined) {
    requireRecord(value, "aggregate_alarm_states", `${path}.aggregate_alarm_states`, diagnostics);
  }

  if ("operation_proxy_states" in value && value.operation_proxy_states !== undefined) {
    const proxyStates = requireRecord(value, "operation_proxy_states", `${path}.operation_proxy_states`, diagnostics);
    if (proxyStates) {
      for (const [operationId, snapshotValue] of Object.entries(proxyStates)) {
        const snapshotValidation = validateOperationSnapshot(
          snapshotValue,
          `${path}.operation_proxy_states.${operationId}`
        );
        diagnostics.push(...snapshotValidation.diagnostics);
      }
    }
  }
}

function validateTargetPackageCoordinationSnapshot(
  snapshotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_coordination_snapshot.invalid", path, "Package coordination snapshot must be an object."));
    return;
  }

  requireExactString(value, "package_instance_id", snapshotId, `${path}.package_instance_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "state",
    ["standby", "ready", "circulation_active", "control_active", "fault_latched", "no_snapshot", "unsupported_by_target"],
    `${path}.state`,
    diagnostics
  );
  if ("summary" in value && value.summary !== undefined) {
    requireRecord(value, "summary", `${path}.summary`, diagnostics);
  }
  if ("aggregate_monitor_states" in value && value.aggregate_monitor_states !== undefined) {
    requireRecord(value, "aggregate_monitor_states", `${path}.aggregate_monitor_states`, diagnostics);
  }
  if ("operation_proxy_states" in value && value.operation_proxy_states !== undefined) {
    const proxyStates = requireRecord(value, "operation_proxy_states", `${path}.operation_proxy_states`, diagnostics);
    if (proxyStates) {
      for (const [operationId, snapshotValue] of Object.entries(proxyStates)) {
        const snapshotValidation = validateOperationSnapshot(
          snapshotValue,
          `${path}.operation_proxy_states.${operationId}`
        );
        diagnostics.push(...snapshotValidation.diagnostics);
      }
    }
  }
}

function validateTargetPackageModePhaseSnapshot(
  snapshotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_mode_phase_snapshot.invalid", path, "Package mode/phase snapshot must be an object."));
    return;
  }

  requireExactString(value, "package_instance_id", snapshotId, `${path}.package_instance_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "state",
    ["mode_phase_available", "no_snapshot", "unsupported_by_target"],
    `${path}.state`,
    diagnostics
  );
  requireOptionalString(value, "active_mode_id", `${path}.active_mode_id`, diagnostics);
  requireOptionalString(value, "active_phase_id", `${path}.active_phase_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "active_transition_intent",
    [...WAVE14_PACKAGE_MODE_EXECUTION_INTENTS],
    `${path}.active_transition_intent`,
    diagnostics
  );
  requireOptionalOneOf(
    value,
    "transition_state",
    [...WAVE14_PACKAGE_MODE_TRANSITION_STATES],
    `${path}.transition_state`,
    diagnostics
  );
  if ("mode_summary" in value && value.mode_summary !== undefined) {
    requireRecord(value, "mode_summary", `${path}.mode_summary`, diagnostics);
  }
  if ("phase_summary" in value && value.phase_summary !== undefined) {
    requireRecord(value, "phase_summary", `${path}.phase_summary`, diagnostics);
  }
  if ("mode_group_states" in value && value.mode_group_states !== undefined) {
    requireRecord(value, "mode_group_states", `${path}.mode_group_states`, diagnostics);
  }
  if ("phase_group_states" in value && value.phase_group_states !== undefined) {
    requireRecord(value, "phase_group_states", `${path}.phase_group_states`, diagnostics);
  }
  if ("phase_states" in value && value.phase_states !== undefined) {
    const phaseStates = requireRecord(value, "phase_states", `${path}.phase_states`, diagnostics);
    if (phaseStates) {
      for (const [phaseId, phaseState] of Object.entries(phaseStates)) {
        if (typeof phaseState !== "string" || !WAVE14_PACKAGE_PHASE_STATES.includes(phaseState as typeof WAVE14_PACKAGE_PHASE_STATES[number])) {
          diagnostics.push(error("field.enum", `${path}.phase_states.${phaseId}`, `Field must be one of: ${WAVE14_PACKAGE_PHASE_STATES.join(", ")}.`));
        }
      }
    }
  }
  if ("transition_guard_states" in value && value.transition_guard_states !== undefined) {
    const guardStates = requireRecord(value, "transition_guard_states", `${path}.transition_guard_states`, diagnostics);
    if (guardStates) {
      for (const [guardId, guardState] of Object.entries(guardStates)) {
        if (typeof guardState !== "string" || !WAVE14_PACKAGE_TRANSITION_GUARD_STATES.includes(guardState as typeof WAVE14_PACKAGE_TRANSITION_GUARD_STATES[number])) {
          diagnostics.push(error("field.enum", `${path}.transition_guard_states.${guardId}`, `Field must be one of: ${WAVE14_PACKAGE_TRANSITION_GUARD_STATES.join(", ")}.`));
        }
      }
    }
  }
}

function validateTargetPackagePermissiveInterlockSnapshot(
  snapshotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_permissive_interlock_snapshot.invalid", path, "Package permissive/interlock snapshot must be an object."));
    return;
  }

  requireExactString(value, "package_instance_id", snapshotId, `${path}.package_instance_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "state",
    [...WAVE15_PACKAGE_GATE_STATES, "no_snapshot", "unsupported_by_target"],
    `${path}.state`,
    diagnostics
  );

  if ("gate_summary" in value && value.gate_summary !== undefined) {
    const gateSummary = requireRecord(value, "gate_summary", `${path}.gate_summary`, diagnostics);
    if (gateSummary) {
      requireOneOf(gateSummary, "state", [...WAVE15_PACKAGE_GATE_STATES], `${path}.gate_summary.state`, diagnostics);
      requireBoolean(gateSummary, "ready", `${path}.gate_summary.ready`, diagnostics);
      requireOptionalStringArray(gateSummary, "blocked_reason_ids", `${path}.gate_summary.blocked_reason_ids`, diagnostics);
      requireOptionalStringArray(gateSummary, "held_reason_ids", `${path}.gate_summary.held_reason_ids`, diagnostics);
      requireOptionalStringArray(gateSummary, "faulted_reason_ids", `${path}.gate_summary.faulted_reason_ids`, diagnostics);
      requireOptionalStringArray(gateSummary, "transition_guard_ids", `${path}.gate_summary.transition_guard_ids`, diagnostics);
    }
  }

  if ("permissive_states" in value && value.permissive_states !== undefined) {
    const permissiveStates = requireRecord(value, "permissive_states", `${path}.permissive_states`, diagnostics);
    if (permissiveStates) {
      for (const [reasonId, reasonValue] of Object.entries(permissiveStates)) {
        validateTargetPackageGateReasonSnapshot(reasonValue, `${path}.permissive_states.${reasonId}`, diagnostics);
      }
    }
  }

  if ("interlock_states" in value && value.interlock_states !== undefined) {
    const interlockStates = requireRecord(value, "interlock_states", `${path}.interlock_states`, diagnostics);
    if (interlockStates) {
      for (const [reasonId, reasonValue] of Object.entries(interlockStates)) {
        validateTargetPackageGateReasonSnapshot(reasonValue, `${path}.interlock_states.${reasonId}`, diagnostics);
      }
    }
  }

  if ("transition_guard_states" in value && value.transition_guard_states !== undefined) {
    const guardStates = requireRecord(value, "transition_guard_states", `${path}.transition_guard_states`, diagnostics);
    if (guardStates) {
      for (const [guardId, guardValue] of Object.entries(guardStates)) {
        validateTargetPackageTransitionGuardSnapshot(guardValue, `${path}.transition_guard_states.${guardId}`, diagnostics);
      }
    }
  }
}

function validateTargetPackageGateReasonSnapshot(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_gate_reason_snapshot.invalid", path, "Package gate reason snapshot must be an object."));
    return;
  }

  requireOneOf(value, "state", [...WAVE15_PACKAGE_GATE_STATES], `${path}.state`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
}

function validateTargetPackageTransitionGuardSnapshot(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_transition_guard_snapshot.invalid", path, "Package transition guard snapshot must be an object."));
    return;
  }

  requireOneOf(value, "state", [...WAVE14_PACKAGE_TRANSITION_GUARD_STATES], `${path}.state`, diagnostics);
  requireOptionalStringArray(value, "blocked_by_ids", `${path}.blocked_by_ids`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
}

function validateTargetPackageProtectionRecoverySnapshot(
  snapshotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_protection_recovery_snapshot.invalid", path, "Package protection/recovery snapshot must be an object."));
    return;
  }

  requireExactString(value, "package_instance_id", snapshotId, `${path}.package_instance_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "state",
    [...WAVE16_PACKAGE_PROTECTION_STATES, "no_snapshot", "unsupported_by_target"],
    `${path}.state`,
    diagnostics
  );

  if ("protection_summary" in value && value.protection_summary !== undefined) {
    const summary = requireRecord(value, "protection_summary", `${path}.protection_summary`, diagnostics);
    if (summary) {
      requireOneOf(summary, "state", [...WAVE16_PACKAGE_PROTECTION_STATES], `${path}.protection_summary.state`, diagnostics);
      requireBoolean(summary, "ready", `${path}.protection_summary.ready`, diagnostics);
      requireOptionalStringArray(summary, "trip_reason_ids", `${path}.protection_summary.trip_reason_ids`, diagnostics);
      requireOptionalStringArray(summary, "inhibit_reason_ids", `${path}.protection_summary.inhibit_reason_ids`, diagnostics);
      requireOptionalStringArray(summary, "recovery_request_ids", `${path}.protection_summary.recovery_request_ids`, diagnostics);
      requireOptionalStringArray(summary, "diagnostic_summary_ids", `${path}.protection_summary.diagnostic_summary_ids`, diagnostics);
    }
  }

  if ("trip_states" in value && value.trip_states !== undefined) {
    const tripStates = requireRecord(value, "trip_states", `${path}.trip_states`, diagnostics);
    if (tripStates) {
      for (const [reasonId, reasonValue] of Object.entries(tripStates)) {
        validateTargetPackageProtectionReasonSnapshot(reasonValue, `${path}.trip_states.${reasonId}`, diagnostics);
      }
    }
  }

  if ("inhibit_states" in value && value.inhibit_states !== undefined) {
    const inhibitStates = requireRecord(value, "inhibit_states", `${path}.inhibit_states`, diagnostics);
    if (inhibitStates) {
      for (const [reasonId, reasonValue] of Object.entries(inhibitStates)) {
        validateTargetPackageProtectionReasonSnapshot(reasonValue, `${path}.inhibit_states.${reasonId}`, diagnostics);
      }
    }
  }

  if ("recovery_request_states" in value && value.recovery_request_states !== undefined) {
    const requestStates = requireRecord(value, "recovery_request_states", `${path}.recovery_request_states`, diagnostics);
    if (requestStates) {
      for (const [requestId, requestValue] of Object.entries(requestStates)) {
        validateTargetPackageRecoveryRequestSnapshot(requestValue, `${path}.recovery_request_states.${requestId}`, diagnostics);
      }
    }
  }
}

function validateTargetPackageProtectionReasonSnapshot(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_protection_reason_snapshot.invalid", path, "Package protection reason snapshot must be an object."));
    return;
  }

  requireOneOf(value, "state", [...WAVE16_PACKAGE_PROTECTION_STATES], `${path}.state`, diagnostics);
  requireOptionalBoolean(value, "latching", `${path}.latching`, diagnostics);
  requireOptionalString(value, "reason_code", `${path}.reason_code`, diagnostics);
  requireOptionalString(value, "diagnostic_ref", `${path}.diagnostic_ref`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
}

function validateTargetPackageRecoveryRequestSnapshot(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_recovery_request_snapshot.invalid", path, "Package recovery request snapshot must be an object."));
    return;
  }

  requireOneOf(value, "availability_state", ["available", "unavailable"], `${path}.availability_state`, diagnostics);
  requireString(value, "target_operation_id", `${path}.target_operation_id`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
}

function validateTargetPackageArbitrationSnapshot(
  snapshotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_arbitration_snapshot.invalid", path, "Package arbitration snapshot must be an object."));
    return;
  }

  requireExactString(value, "package_instance_id", snapshotId, `${path}.package_instance_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "state",
    [...WAVE17_PACKAGE_ARBITRATION_RESULTS, "no_snapshot", "unsupported_by_target"],
    `${path}.state`,
    diagnostics
  );

  if ("ownership_summary" in value && value.ownership_summary !== undefined) {
    const ownershipSummary = requireRecord(value, "ownership_summary", `${path}.ownership_summary`, diagnostics);
    if (ownershipSummary) {
      requireOptionalStringArray(ownershipSummary, "active_lane_ids", `${path}.ownership_summary.active_lane_ids`, diagnostics);
      requireOptionalString(ownershipSummary, "summary", `${path}.ownership_summary.summary`, diagnostics);
    }
  }

  if ("command_summary" in value && value.command_summary !== undefined) {
    const commandSummary = requireRecord(value, "command_summary", `${path}.command_summary`, diagnostics);
    if (commandSummary) {
      requireOptionalStringArray(commandSummary, "active_owner_lane_ids", `${path}.command_summary.active_owner_lane_ids`, diagnostics);
      requireOptionalStringArray(commandSummary, "accepted_lane_ids", `${path}.command_summary.accepted_lane_ids`, diagnostics);
      requireOptionalStringArray(commandSummary, "blocked_lane_ids", `${path}.command_summary.blocked_lane_ids`, diagnostics);
      requireOptionalStringArray(commandSummary, "denied_lane_ids", `${path}.command_summary.denied_lane_ids`, diagnostics);
      requireOptionalStringArray(commandSummary, "superseded_lane_ids", `${path}.command_summary.superseded_lane_ids`, diagnostics);
      requireOptionalString(commandSummary, "summary", `${path}.command_summary.summary`, diagnostics);
    }
  }

  if ("command_lane_states" in value && value.command_lane_states !== undefined) {
    const laneStates = requireRecord(value, "command_lane_states", `${path}.command_lane_states`, diagnostics);
    if (laneStates) {
      for (const [laneId, laneValue] of Object.entries(laneStates)) {
        validateTargetPackageCommandLaneSnapshot(laneValue, `${path}.command_lane_states.${laneId}`, diagnostics);
      }
    }
  }
}

function validateTargetPackageOverrideHandoverSnapshot(
  snapshotId: string,
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_override_handover_snapshot.invalid", path, "Package override/handover snapshot must be an object."));
    return;
  }

  requireExactString(value, "package_instance_id", snapshotId, `${path}.package_instance_id`, diagnostics);
  requireOptionalOneOf(
    value,
    "state",
    [...WAVE18_PACKAGE_HANDOVER_REQUEST_STATES, "no_snapshot", "unsupported_by_target"],
    `${path}.state`,
    diagnostics
  );

  if ("handover_summary" in value && value.handover_summary !== undefined) {
    const handoverSummary = requireRecord(value, "handover_summary", `${path}.handover_summary`, diagnostics);
    if (handoverSummary) {
      requireString(handoverSummary, "current_holder_id", `${path}.handover_summary.current_holder_id`, diagnostics);
      requireOneOf(handoverSummary, "current_lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.handover_summary.current_lane`, diagnostics);
      requireOptionalString(handoverSummary, "requested_holder_id", `${path}.handover_summary.requested_holder_id`, diagnostics);
      requireOptionalStringArray(handoverSummary, "accepted_request_ids", `${path}.handover_summary.accepted_request_ids`, diagnostics);
      requireOptionalStringArray(handoverSummary, "blocked_request_ids", `${path}.handover_summary.blocked_request_ids`, diagnostics);
      requireOptionalStringArray(handoverSummary, "denied_request_ids", `${path}.handover_summary.denied_request_ids`, diagnostics);
      requireOptionalString(handoverSummary, "last_handover_reason", `${path}.handover_summary.last_handover_reason`, diagnostics);
      requireOptionalString(handoverSummary, "summary", `${path}.handover_summary.summary`, diagnostics);
    }
  }

  if ("handover_request_states" in value && value.handover_request_states !== undefined) {
    const requestStates = requireRecord(value, "handover_request_states", `${path}.handover_request_states`, diagnostics);
    if (requestStates) {
      for (const [requestId, requestValue] of Object.entries(requestStates)) {
        validateTargetPackageHandoverRequestSnapshot(requestValue, `${path}.handover_request_states.${requestId}`, diagnostics);
      }
    }
  }
}

function validateTargetPackageCommandLaneSnapshot(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_command_lane_snapshot.invalid", path, "Package command lane snapshot must be an object."));
    return;
  }

  requireOneOf(value, "request_kind", [...WAVE17_PACKAGE_COMMAND_REQUEST_KINDS], `${path}.request_kind`, diagnostics);
  requireOneOf(value, "ownership_lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.ownership_lane`, diagnostics);
  requireOneOf(value, "arbitration_result", [...WAVE17_PACKAGE_ARBITRATION_RESULTS], `${path}.arbitration_result`, diagnostics);
  requireOptionalString(value, "blocked_reason", `${path}.blocked_reason`, diagnostics);
  requireOptionalString(value, "denied_reason", `${path}.denied_reason`, diagnostics);
  requireOptionalString(value, "superseded_by_lane_id", `${path}.superseded_by_lane_id`, diagnostics);
  requireOptionalString(value, "request_preview", `${path}.request_preview`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
}

function validateTargetPackageHandoverRequestSnapshot(
  value: unknown,
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!isRecord(value)) {
    diagnostics.push(error("package_handover_request_snapshot.invalid", path, "Package handover request snapshot must be an object."));
    return;
  }

  requireOneOf(value, "request_kind", [...WAVE18_PACKAGE_HANDOVER_REQUEST_KINDS], `${path}.request_kind`, diagnostics);
  requireString(value, "requested_holder_id", `${path}.requested_holder_id`, diagnostics);
  requireOneOf(value, "requested_lane", [...WAVE17_PACKAGE_OWNERSHIP_LANES], `${path}.requested_lane`, diagnostics);
  requireOneOf(value, "state", [...WAVE18_PACKAGE_HANDOVER_REQUEST_STATES], `${path}.state`, diagnostics);
  requireOptionalOneOf(value, "blocked_reason", [...WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS], `${path}.blocked_reason`, diagnostics);
  requireOptionalOneOf(value, "denied_reason", [...WAVE18_PACKAGE_HANDOVER_DENIAL_REASONS], `${path}.denied_reason`, diagnostics);
  requireOptionalString(value, "request_preview", `${path}.request_preview`, diagnostics);
  requireOptionalString(value, "summary", `${path}.summary`, diagnostics);
}

function requireOptionalString(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "string") {
    diagnostics.push(error("field.string", path, `Field \`${field}\` must be a string when present.`));
  }
}

function requireOptionalNumber(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "number") {
    diagnostics.push(error("field.number", path, `Field \`${field}\` must be a number when present.`));
  }
}

function requireOptionalBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean when present.`));
  }
}

function requireBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean.`));
  }
}

function requireNumber(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "number") {
    diagnostics.push(error("field.number", path, `Field \`${field}\` must be a number.`));
  }
}

function requireExactString(value: Record<string, unknown>, field: string, expected: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (value[field] !== expected) {
    diagnostics.push(error("field.exact", path, `Field \`${field}\` must equal \`${expected}\`.`));
  }
}

function requireOneOf(value: Record<string, unknown>, field: string, allowed: string[], path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "string" || !allowed.includes(value[field] as string)) {
    diagnostics.push(error("field.enum", path, `Field \`${field}\` must be one of: ${allowed.join(", ")}.`));
  }
}

function requireOptionalOneOf(
  value: Record<string, unknown>,
  field: string,
  allowed: string[],
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  requireOneOf(value, field, allowed, path, diagnostics);
}

function requireStringArrayOf(value: Record<string, unknown>, field: string, allowed: string[], path: string, diagnostics: ValidationDiagnostic[]) {
  const current = value[field];
  if (!Array.isArray(current)) {
    diagnostics.push(error("field.array", path, `Field \`${field}\` must be an array.`));
    return;
  }
  current.forEach((entry, index) => {
    if (typeof entry !== "string" || !allowed.includes(entry)) {
      diagnostics.push(error("field.enum", `${path}[${index}]`, `Entry must be one of: ${allowed.join(", ")}.`));
    }
  });
}

function requireStringArray(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  const current = value[field];
  if (!Array.isArray(current)) {
    diagnostics.push(error("field.array", path, `Field \`${field}\` must be an array.`));
    return;
  }
  current.forEach((entry, index) => {
    if (typeof entry !== "string") {
      diagnostics.push(error("field.string", `${path}[${index}]`, "Entry must be a string."));
    }
  });
}

function requireOptionalStringArray(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  requireStringArray(value, field, path, diagnostics);
}

function requireOptionalOneOfArray(
  value: Record<string, unknown>,
  field: string,
  allowed: string[],
  path: string,
  diagnostics: ValidationDiagnostic[]
) {
  if (!(field in value) || value[field] === undefined) {
    return;
  }

  requireStringArrayOf(value, field, allowed, path, diagnostics);
}

function requireRecord(
  value: Record<string, unknown>,
  field: string,
  path: string,
  diagnostics: ValidationDiagnostic[]
): Record<string, unknown> | null {
  const current = value[field];
  if (!isRecord(current)) {
    diagnostics.push(error("field.object", path, `Field \`${field}\` must be an object.`));
    return null;
  }
  return current;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function error(code: string, path: string, message: string): ValidationDiagnostic {
  return {
    code,
    severity: "error",
    path,
    message
  };
}

function fail(diagnostics: ValidationDiagnostic[], diagnostic: ValidationDiagnostic): ValidationResult {
  diagnostics.push(diagnostic);
  return {
    ok: false,
    diagnostics
  };
}

function done(diagnostics: ValidationDiagnostic[]): ValidationResult {
  return {
    ok: diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics
  };
}
