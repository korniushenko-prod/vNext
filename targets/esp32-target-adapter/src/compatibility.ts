import type { RuntimeConnection, RuntimePack, RuntimeResourceBinding } from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterDiagnostic } from "@universal-plc/target-adapter-contracts";
import { esp32CapabilityProfile } from "./profile.js";
import { sortDiagnostics, sortedKeys } from "./sort.js";
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

  for (const connectionId of sortedKeys(pack.connections)) {
    const connection = pack.connections[connectionId] as RuntimeConnection;
    if (!esp32CapabilityProfile.supported_channel_kinds.includes(connection.channel_kind)) {
      diagnostics.push({
        code: "target.channel_kind.unsupported",
        severity: "error",
        message: `Connection channel kind \`${connection.channel_kind}\` is not supported by the ESP32 target.`,
        path: `$.connections.${connectionId}.channel_kind`
      });
    }
    if (!esp32CapabilityProfile.supported_value_types.includes(connection.value_type)) {
      diagnostics.push({
        code: "target.value_type.unsupported",
        severity: "error",
        message: `Connection value type \`${connection.value_type}\` is not supported by the ESP32 target.`,
        path: `$.connections.${connectionId}.value_type`
      });
    }
  }

  for (const resourceId of sortedKeys(pack.resources)) {
    const resource = pack.resources[resourceId] as RuntimeResourceBinding;
    if (!esp32CapabilityProfile.supported_binding_kinds.includes(resource.binding_kind)) {
      diagnostics.push({
        code: "target.binding.unsupported",
        severity: "error",
        message: `Resource binding kind \`${resource.binding_kind}\` is not supported by the ESP32 target.`,
        path: `$.resources.${resourceId}.binding_kind`
      });
    }
  }

  const sorted = sortDiagnostics(diagnostics);
  return {
    ok: sorted.every((entry) => entry.severity !== "error"),
    diagnostics: sorted
  };
}