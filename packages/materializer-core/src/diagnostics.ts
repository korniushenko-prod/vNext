import type { MaterializerDiagnostic, MaterializerPhase, MaterializerSeverity } from "./types.js";

export function diagnostic(
  phase: MaterializerPhase,
  code: string,
  severity: MaterializerSeverity,
  path: string,
  message: string
): MaterializerDiagnostic {
  return {
    phase,
    code,
    severity,
    path,
    message
  };
}

export function error(
  phase: MaterializerPhase,
  code: string,
  path: string,
  message: string
): MaterializerDiagnostic {
  return diagnostic(phase, code, "error", path, message);
}

export function warning(
  phase: MaterializerPhase,
  code: string,
  path: string,
  message: string
): MaterializerDiagnostic {
  return diagnostic(phase, code, "warning", path, message);
}

export function hasErrors(diagnostics: MaterializerDiagnostic[]): boolean {
  return diagnostics.some((entry) => entry.severity === "error");
}
