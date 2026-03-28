import type {
  RuntimeBindingKind,
  RuntimePack,
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
  target_id: "esp32.shipcontroller.v1";
  display_name: string;
  supported_binding_kinds: RuntimeBindingKind[];
  supported_channel_kinds: string[];
  supported_value_types: string[];
  supported_native_kinds: string[];
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
  target_id: "esp32.shipcontroller.v1";
  pack_id: string;
  steps: Esp32ApplyPlanStep[];
  diagnostics: TargetAdapterDiagnostic[];
}

export interface ShipControllerDigitalInputArtifact {
  id: string;
  instance_id: string;
  pin: number;
  pullup?: boolean;
  debounce_ms?: number;
}

export interface ShipControllerDigitalOutputArtifact {
  id: string;
  instance_id: string;
  pin: number;
  active_high: boolean;
}

export interface ShipControllerTimedRelayEndpointRef {
  instance_id: string;
  port_id: string;
  connection_id: string;
}

export interface ShipControllerTimedRelayArtifact {
  id: string;
  native_kind: string;
  pulse_time_ms: number;
  retriggerable: boolean;
  require_enable: boolean;
  output_inverted: boolean;
  trigger_source: ShipControllerTimedRelayEndpointRef;
  output_target: ShipControllerTimedRelayEndpointRef;
}

export interface ShipControllerConfigArtifact {
  schema_version: "0.1.0";
  target_kind: "esp32.shipcontroller.v1";
  source_pack_id: string;
  capability_profile: string;
  artifacts: {
    digital_inputs: ShipControllerDigitalInputArtifact[];
    digital_outputs: ShipControllerDigitalOutputArtifact[];
    timed_relays: ShipControllerTimedRelayArtifact[];
  };
  diagnostics: TargetAdapterDiagnostic[];
}

export interface Esp32TargetAdapter extends TargetAdapterContract {
  getCapabilityProfile(): Esp32CapabilityProfile;
  checkCompatibility(pack: RuntimePack): Esp32CompatibilityResult;
  buildApplyPlan(pack: RuntimePack): Esp32ApplyPlan;
  validatePack(pack: RuntimePack): TargetAdapterDiagnostic[];
  apply(request: TargetDeploymentRequest): Promise<TargetDeploymentResult>;
  readback(request: TargetReadbackRequest): Promise<TargetReadbackSnapshot>;
}
