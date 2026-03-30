export * from "./types.js";
export * from "./profile.js";
export * from "./compatibility.js";
export * from "./apply-plan.js";
export * from "./emit-shipcontroller-config.js";
export * from "./operations.js";
export * from "./package-supervision.js";
export * from "./package-coordination.js";
export * from "./package-arbitration.js";
export * from "./package-override-handover.js";

import { createHash } from "node:crypto";
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
import { emitShipControllerConfigArtifact } from "./emit-shipcontroller-config.js";
import { cancelEsp32Operation, invokeEsp32Operation } from "./operations.js";
import { buildSyntheticPackageCoordinationSnapshots } from "./package-coordination.js";
import { buildSyntheticPackageSupervisionSnapshots } from "./package-supervision.js";
import { invokeEsp32PackageModeTransition } from "./package-mode-execution.js";
import { buildSyntheticPackageModePhaseSnapshots } from "./package-mode-execution.js";
import { buildSyntheticPackagePermissiveInterlockSnapshots } from "./package-permissive-interlock.js";
import { buildSyntheticPackageProtectionRecoverySnapshots } from "./package-protection-recovery.js";
import { buildSyntheticPackageArbitrationSnapshots } from "./package-arbitration.js";
import { buildSyntheticPackageOverrideHandoverSnapshots } from "./package-override-handover.js";
import { buildSyntheticOperationSnapshots } from "./operations.js";
import { esp32CapabilityProfile, esp32TargetAdapterManifest } from "./profile.js";
import type { Esp32TargetAdapter, ShipControllerConfigArtifact } from "./types.js";

interface Esp32DeploymentState {
  request_id: string;
  target_id: string;
  applied_at: string;
  pack: RuntimePack;
  artifact: ShipControllerConfigArtifact;
  checksum_sha256: string;
  config_version: string;
  apply_status: "applied" | "failed";
  diagnostics: TargetAdapterDiagnostic[];
}

export function createEsp32TargetAdapter(): Esp32TargetAdapter {
  let deploymentState: Esp32DeploymentState | null = null;

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
      const pack = extractRuntimePack(request.options);
      if (!pack) {
        const diagnostics = [
          {
            code: "target.apply.pack_snapshot.missing",
            severity: "error" as const,
            message: "ESP32 pilot apply requires `options.runtime_pack` or `options.pack_snapshot`."
          }
        ];
        deploymentState = null;
        return {
          request_id: request.request_id,
          success: false,
          diagnostics,
          artifacts: {}
        };
      }

      if (request.options?.simulate_apply_failure === true) {
        const diagnostics = [
          {
            code: "target.apply.failed",
            severity: "error" as const,
            message: "ESP32 pilot apply failure was requested by the synthetic test harness."
          }
        ];
        const artifact = emitShipControllerConfigArtifact(pack);
        deploymentState = {
          request_id: request.request_id,
          target_id: esp32CapabilityProfile.target_id,
          applied_at: new Date(0).toISOString(),
          pack,
          artifact,
          checksum_sha256: checksumFor(artifact),
          config_version: pack.source.generated_at ?? pack.schema_version,
          apply_status: "failed",
          diagnostics
        };
        return {
          request_id: request.request_id,
          success: false,
          diagnostics,
          artifacts: {}
        };
      }

      const compatibility = checkEsp32Compatibility(pack);
      const artifact = emitShipControllerConfigArtifact(pack);
      const checksum_sha256 = checksumFor(artifact);
      const applied_at = new Date(0).toISOString();
      const diagnostics: TargetAdapterDiagnostic[] = [
        ...compatibility.diagnostics,
        {
          code: "target.apply.applied",
          severity: "info",
          message: "ESP32 pilot baseline stored a synthetic deployment state with config checksum echo."
        }
      ];

      deploymentState = {
        request_id: request.request_id,
        target_id: esp32CapabilityProfile.target_id,
        applied_at,
        pack,
        artifact,
        checksum_sha256,
        config_version: pack.source.generated_at ?? pack.schema_version,
        apply_status: "applied",
        diagnostics
      };

      return {
        request_id: request.request_id,
        success: compatibility.ok,
        diagnostics,
        artifacts: {
          shipcontroller_config: {
            id: "shipcontroller_config",
            kind: "config",
            media_type: "application/json",
            meta: {
              checksum_sha256,
              config_version: pack.source.generated_at ?? pack.schema_version,
              source_pack_id: pack.pack_id
            }
          },
          apply_report: {
            id: "apply_report",
            kind: "report",
            media_type: "application/json",
            meta: {
              apply_status: compatibility.ok ? "applied" : "rejected",
              diagnostics_count: diagnostics.length
            }
          }
        }
      };
    },
    async readback(request: TargetReadbackRequest): Promise<TargetReadbackSnapshot> {
      if (deploymentState?.apply_status === "applied") {
        return buildReadbackSnapshot(request, deploymentState);
      }

      return {
        request_id: request.request_id,
        target_id: request.target_id,
        collected_at: new Date(0).toISOString(),
        signals: {},
        resources: {},
        operation_snapshots: {},
        package_snapshots: {},
        package_coordination_snapshots: {},
        package_mode_phase_snapshots: {},
        package_permissive_interlock_snapshots: {},
        package_protection_recovery_snapshots: {},
        package_arbitration_snapshots: {},
        package_override_handover_snapshots: {},
        diagnostics: [
          {
            code: "target.readback.unsupported",
            severity: "info",
            message: "Readback is available only after a synthetic pilot apply has been stored."
          },
          {
            code: "target.operations.snapshot.synthetic",
            severity: "info",
            message: "Operation snapshots are exposed only as synthetic offline placeholders in PR-20B."
          },
          {
            code: "target.package_coordination.snapshot.synthetic",
            severity: "info",
            message: "Package coordination snapshots are exposed only as synthetic offline placeholders in Wave 12."
          },
          {
            code: "target.package_mode_phase.snapshot.synthetic",
            severity: "info",
            message: "Package mode/phase execution snapshots are exposed only as synthetic offline placeholders in Wave 14."
          },
          {
            code: "target.package_permissive_interlock.snapshot.synthetic",
            severity: "info",
            message: "Package permissive/interlock snapshots are exposed only as synthetic offline placeholders in Wave 15."
          },
          {
            code: "target.package_protection_recovery.snapshot.synthetic",
            severity: "info",
            message: "Package protection/recovery snapshots are exposed only as synthetic offline placeholders in Wave 16."
          },
          {
            code: "target.package_arbitration.snapshot.synthetic",
            severity: "info",
            message: "Package arbitration snapshots are exposed only as synthetic offline placeholders in Wave 17."
          },
          {
            code: "target.package_override_handover.snapshot.synthetic",
            severity: "info",
            message: "Package override/handover snapshots are exposed only as synthetic offline placeholders in Wave 18."
          }
        ]
      };
    },
    invokeOperation(request) {
      return invokeEsp32Operation(request);
    },
    cancelOperation(request) {
      return cancelEsp32Operation(request);
    },
    invokePackageModeTransition(request) {
      return invokeEsp32PackageModeTransition(request);
    }
  };
}

function extractRuntimePack(options: Record<string, unknown>): RuntimePack | null {
  const candidate = options?.runtime_pack ?? options?.pack_snapshot;
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const maybePack = candidate as Partial<RuntimePack>;
  if (typeof maybePack.pack_id !== "string" || typeof maybePack.schema_version !== "string") {
    return null;
  }

  return maybePack as RuntimePack;
}

function checksumFor(artifact: ShipControllerConfigArtifact): string {
  return createHash("sha256")
    .update(canonicalStringify(artifact))
    .digest("hex");
}

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortValue(entry)])
    );
  }

  return value;
}

function buildReadbackSnapshot(
  request: TargetReadbackRequest,
  deploymentState: Esp32DeploymentState
): TargetReadbackSnapshot {
  const pack = deploymentState.pack;
  const packageModePhaseSnapshots = buildSyntheticPackageModePhaseSnapshots(pack);
  const firstPackageModePhaseSnapshot = Object.values(packageModePhaseSnapshots)[0];

  if (firstPackageModePhaseSnapshot) {
    const runningPhaseId = Object.keys(firstPackageModePhaseSnapshot.phase_states ?? {})
      .find((phaseId) => phaseId.endsWith(".phase.running"));
    if (runningPhaseId) {
      firstPackageModePhaseSnapshot.active_phase_id = runningPhaseId;
      firstPackageModePhaseSnapshot.phase_states = Object.fromEntries(
        Object.entries(firstPackageModePhaseSnapshot.phase_states ?? {}).map(([phaseId]) => [
          phaseId,
          phaseId === runningPhaseId ? "running" : "idle"
        ])
      );
    }
  }

  return {
    request_id: request.request_id,
    target_id: request.target_id,
    collected_at: deploymentState.applied_at,
    signals: buildSignalSummary(pack, firstPackageModePhaseSnapshot?.active_mode_id, firstPackageModePhaseSnapshot?.active_phase_id),
    resources: buildResourceSummary(pack, deploymentState),
    operation_snapshots: buildSyntheticOperationSnapshots(pack),
    package_snapshots: buildSyntheticPackageSupervisionSnapshots(pack),
    package_coordination_snapshots: buildSyntheticPackageCoordinationSnapshots(pack),
    package_mode_phase_snapshots: packageModePhaseSnapshots,
    package_permissive_interlock_snapshots: buildSyntheticPackagePermissiveInterlockSnapshots(pack),
    package_protection_recovery_snapshots: buildSyntheticPackageProtectionRecoverySnapshots(pack),
    package_arbitration_snapshots: buildSyntheticPackageArbitrationSnapshots(pack),
    package_override_handover_snapshots: buildSyntheticPackageOverrideHandoverSnapshots(pack),
    diagnostics: [
      {
        code: "target.readback.pilot.live",
        severity: "info",
        message: "ESP32 pilot baseline exposes a synthetic-but-stateful apply/readback loop after apply."
      }
    ]
  };
}

function buildSignalSummary(
  pack: RuntimePack,
  activeModeId?: string,
  activePhaseId?: string
): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  for (const entryId of Object.keys(pack.package_supervision ?? {}).sort()) {
    const entry = pack.package_supervision?.[entryId];
    if (!entry) {
      continue;
    }

    for (const outputId of Object.keys(entry.summary_outputs ?? {}).sort()) {
      const output = entry.summary_outputs?.[outputId];
      if (!output) {
        continue;
      }
      summary[`${entry.package_instance_id}.${output.id}`] = deterministicSignalValue(output.id, output.value_type);
    }
  }

  if (activeModeId) {
    summary.active_mode_id = activeModeId;
  }
  if (activePhaseId) {
    summary.active_phase_id = activePhaseId;
  }

  return summary;
}

function buildResourceSummary(
  pack: RuntimePack,
  deploymentState: Esp32DeploymentState
): Record<string, unknown> {
  const resources: Record<string, unknown> = {
    target_status: {
      state: "online",
      target_id: deploymentState.target_id
    },
    apply_status: {
      state: deploymentState.apply_status,
      checksum_sha256: deploymentState.checksum_sha256,
      config_version: deploymentState.config_version,
      source_pack_id: pack.pack_id
    }
  };

  for (const resourceId of Object.keys(pack.resources ?? {}).sort()) {
    const resource = pack.resources?.[resourceId];
    if (!resource) {
      continue;
    }

    resources[resourceId] = {
      binding_kind: resource.binding_kind,
      config: resource.config,
      state: "applied",
      value: deterministicResourceValue(resourceId, resource.binding_kind)
    };
  }

  return resources;
}

function deterministicSignalValue(signalId: string, valueType: string): unknown {
  if (valueType === "bool") {
    if (/fault|alarm|trip|blocked|denied/i.test(signalId)) {
      return false;
    }
    if (/running|ready|ok|source_ok|due/i.test(signalId)) {
      return true;
    }
    return false;
  }

  if (valueType === "float" || valueType === "int" || valueType === "u32") {
    if (/pressure/i.test(signalId)) {
      return 3.4;
    }
    if (/runtime|hours/i.test(signalId)) {
      return 148.6;
    }
    return 1;
  }

  return `${signalId}_value`;
}

function deterministicResourceValue(resourceId: string, bindingKind: string): unknown {
  if (bindingKind === "digital_out") {
    return /pump_cmd/i.test(resourceId);
  }

  if (bindingKind === "digital_in") {
    if (/fault/i.test(resourceId)) {
      return false;
    }
    if (/run_feedback/i.test(resourceId)) {
      return true;
    }
    return false;
  }

  if (bindingKind === "analog_in") {
    return 3.4;
  }

  return "applied";
}
