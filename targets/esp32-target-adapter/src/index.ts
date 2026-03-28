export * from "./types.js";
export * from "./profile.js";
export * from "./compatibility.js";
export * from "./apply-plan.js";
export * from "./emit-shipcontroller-config.js";

import type {
  TargetAdapterDiagnostic,
  TargetDeploymentRequest,
  TargetDeploymentResult,
  TargetReadbackRequest,
  TargetReadbackSnapshot
} from "@universal-plc/target-adapter-contracts";
import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import { buildEsp32ApplyPlan } from "./apply-plan.js";
import { checkEsp32Compatibility } from "./compatibility.js";
import { esp32CapabilityProfile, esp32TargetAdapterManifest } from "./profile.js";
import type { Esp32TargetAdapter } from "./types.js";

export function createEsp32TargetAdapter(): Esp32TargetAdapter {
  return {
    manifest: esp32TargetAdapterManifest,
    getCapabilityProfile() {
      return esp32CapabilityProfile;
    },
    checkCompatibility(pack: RuntimePack) {
      return checkEsp32Compatibility(pack);
    },
    buildApplyPlan(pack: RuntimePack) {
      return buildEsp32ApplyPlan(pack);
    },
    validatePack(pack: RuntimePack): TargetAdapterDiagnostic[] {
      return checkEsp32Compatibility(pack).diagnostics;
    },
    async apply(request: TargetDeploymentRequest): Promise<TargetDeploymentResult> {
      return {
        request_id: request.request_id,
        success: false,
        diagnostics: [
          {
            code: "target.apply.not_implemented",
            severity: "warning",
            message: "Live apply is intentionally not implemented in PR-12A."
          }
        ],
        artifacts: {}
      };
    },
    async readback(request: TargetReadbackRequest): Promise<TargetReadbackSnapshot> {
      return {
        request_id: request.request_id,
        target_id: request.target_id,
        collected_at: new Date(0).toISOString(),
        signals: {},
        resources: {},
        diagnostics: [
          {
            code: "target.readback.unsupported",
            severity: "info",
            message: "Readback is not supported in PR-12A."
          }
        ]
      };
    }
  };
}