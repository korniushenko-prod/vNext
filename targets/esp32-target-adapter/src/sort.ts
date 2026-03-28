import type { TargetAdapterDiagnostic } from "@universal-plc/target-adapter-contracts";

export function sortedKeys<T>(record: Record<string, T>): string[] {
  return Object.keys(record).sort((left, right) => left.localeCompare(right));
}

export function sortDiagnostics(diagnostics: TargetAdapterDiagnostic[]): TargetAdapterDiagnostic[] {
  return [...diagnostics].sort((left, right) => {
    const leftKey = `${left.code}|${left.path ?? ""}|${left.message}`;
    const rightKey = `${right.code}|${right.path ?? ""}|${right.message}`;
    return leftKey.localeCompare(rightKey);
  });
}