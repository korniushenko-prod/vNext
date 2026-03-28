import { TARGET_ADAPTER_CONTRACT_VERSION } from "./constants.js";
import type {
  TargetAdapterDiagnostic,
  TargetAdapterManifest,
  TargetArtifact,
  TargetDeploymentRequest,
  TargetDeploymentResult,
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
  validateDiagnosticsArray(value.diagnostics, "$.diagnostics", diagnostics);

  return done(diagnostics);
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

function requireOptionalString(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (field in value && typeof value[field] !== "string") {
    diagnostics.push(error("field.string", path, `Field \`${field}\` must be a string when present.`));
  }
}

function requireBoolean(value: Record<string, unknown>, field: string, path: string, diagnostics: ValidationDiagnostic[]) {
  if (typeof value[field] !== "boolean") {
    diagnostics.push(error("field.boolean", path, `Field \`${field}\` must be a boolean.`));
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
