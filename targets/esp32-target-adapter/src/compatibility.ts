import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterDiagnostic } from "@universal-plc/target-adapter-contracts";
import { esp32CapabilityProfile } from "./profile.js";
import type { Esp32CompatibilityResult } from "./types.js";

export function checkEsp32Compatibility(pack: RuntimePack): Esp32CompatibilityResult {
  const diagnostics: TargetAdapterDiagnostic[] = [];

  if (Object.keys(pack.instances).length > esp32CapabilityProfile.limits.max_instances) {
    diagnostics.push({
      code: "target.instances.limit",
      severity: "error",
      message: "Runtime pack instance count exceeds ESP32 target limit.",
      path: "$.instances"
    });
  }

  if (Object.keys(pack.connections).length > esp32CapabilityProfile.limits.max_connections) {
    diagnostics.push({
      code: "target.connections.limit",
      severity: "error",
      message: "Runtime pack connection count exceeds ESP32 target limit.",
      path: "$.connections"
    });
  }

  if (Object.keys(pack.resources).length > esp32CapabilityProfile.limits.max_resources) {
    diagnostics.push({
      code: "target.resources.limit",
      severity: "error",
      message: "Runtime pack resource count exceeds ESP32 target limit.",
      path: "$.resources"
    });
  }

  return {
    ok: diagnostics.every((entry) => entry.severity !== "error"),
    diagnostics
  };
}