import type { NativeImplementation } from "@universal-plc/project-schema";
import type { RuntimeNativeExecution } from "@universal-plc/runtime-pack-schema";

export function materializeNativeExecution(
  implementation: NativeImplementation | null | undefined,
  mode?: string,
  frontendRequirementIds?: string[]
): RuntimeNativeExecution | undefined {
  if (!implementation) {
    return undefined;
  }

  return omitUndefined({
    native_kind: implementation.native_kind,
    target_kinds: implementation.target_kinds ? [...implementation.target_kinds] : undefined,
    config_template: implementation.config_template,
    mode,
    frontend_requirement_ids: frontendRequirementIds && frontendRequirementIds.length > 0
      ? [...frontendRequirementIds]
      : undefined
  }) as RuntimeNativeExecution;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
