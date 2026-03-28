import type { NativeImplementation } from "@universal-plc/project-schema";
import type { RuntimeNativeExecution } from "@universal-plc/runtime-pack-schema";

export function materializeNativeExecution(
  implementation: NativeImplementation | null | undefined
): RuntimeNativeExecution | undefined {
  if (!implementation) {
    return undefined;
  }

  return {
    native_kind: implementation.native_kind,
    target_kinds: implementation.target_kinds ? [...implementation.target_kinds] : undefined,
    config_template: implementation.config_template
  };
}
