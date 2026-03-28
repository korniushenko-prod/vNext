import type {
  RuntimeAlarm,
  RuntimeBindingKind,
  RuntimeConnection,
  RuntimePack,
  RuntimePort,
  RuntimeResolvedParam,
  RuntimeResourceBinding
} from "@universal-plc/runtime-pack-schema";
import type {
  TargetAdapterContract,
  TargetAdapterDiagnostic,
  TargetDeploymentRequest,
  TargetDeploymentResult,
  TargetReadbackRequest,
  TargetReadbackSnapshot
} from "@universal-plc/target-adapter-contracts";

export interface Esp32CapabilityProfile {
  target_id: "esp32-shipcontroller";
  display_name: string;
  supported_binding_kinds: RuntimeBindingKind[];
  supported_channel_kinds: string[];
  supported_value_types: string[];
  supported_operation_kinds: string[];
  supports_trace: boolean;
  supports_simulation: boolean;
  limits: {
    max_instances: number;
    max_connections: number;
    max_resources: number;
  };
}

export interface Esp32CompatibilityResult {
  ok: boolean;
  diagnostics: TargetAdapterDiagnostic[];
}

export type Esp32ApplyPlanStepKind =
  | "validate_pack"
  | "stage_instances"
  | "stage_connections"
  | "stage_resources"
  | "finalize_report";

export interface Esp32ApplyPlanStep {
  id: string;
  kind: Esp32ApplyPlanStepKind;
  target_ids: string[];
}

export interface Esp32ApplyPlan {
  target_id: "esp32-shipcontroller";
  pack_id: string;
  steps: Esp32ApplyPlanStep[];
  diagnostics: TargetAdapterDiagnostic[];
}

export interface ShipControllerConfigMeta {
  artifact_version: "0.1.0";
  target_id: "esp32-shipcontroller";
  pack_id: string;
  generated_at: string;
  source_project_id: string;
}

export interface ShipControllerArtifactPort extends RuntimePort {}

export interface ShipControllerArtifactParam extends RuntimeResolvedParam {
  id: string;
}

export interface ShipControllerArtifactAlarm extends RuntimeAlarm {}

export interface ShipControllerArtifactInstance {
  id: string;
  type_ref: string;
  title?: string;
  enabled: boolean;
  ports: ShipControllerArtifactPort[];
  params: ShipControllerArtifactParam[];
  alarms: ShipControllerArtifactAlarm[];
}

export interface ShipControllerArtifactConnection extends RuntimeConnection {}

export interface ShipControllerArtifactResource extends RuntimeResourceBinding {}

export interface ShipControllerNativeExecutionPlaceholder {
  instance_id: string;
  status: "unresolved";
  reason: "native_seam_not_available";
}

export interface ShipControllerConfigArtifact {
  meta: ShipControllerConfigMeta;
  instances: ShipControllerArtifactInstance[];
  connections: ShipControllerArtifactConnection[];
  resources: ShipControllerArtifactResource[];
  native_execution_placeholders: ShipControllerNativeExecutionPlaceholder[];
}

export interface Esp32TargetAdapter extends TargetAdapterContract {
  getCapabilityProfile(): Esp32CapabilityProfile;
  checkCompatibility(pack: RuntimePack): Esp32CompatibilityResult;
  buildApplyPlan(pack: RuntimePack): Esp32ApplyPlan;
  validatePack(pack: RuntimePack): TargetAdapterDiagnostic[];
  apply(request: TargetDeploymentRequest): Promise<TargetDeploymentResult>;
  readback(request: TargetReadbackRequest): Promise<TargetReadbackSnapshot>;
}
