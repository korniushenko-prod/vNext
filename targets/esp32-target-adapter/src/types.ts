import type {
  RuntimeBindingKind,
  RuntimePack,
} from "@universal-plc/runtime-pack-schema";
import type {
  TargetAdapterContract,
  TargetAdapterCapabilityProfile,
  TargetAdapterDiagnostic,
  TargetDeploymentRequest,
  TargetDeploymentResult,
  TargetReadbackRequest,
  TargetReadbackSnapshot
} from "@universal-plc/target-adapter-contracts";

export interface Esp32CapabilityProfile extends TargetAdapterCapabilityProfile {
  target_id: "esp32.shipcontroller.v1";
  supported_binding_kinds: RuntimeBindingKind[];
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

export interface ShipControllerAnalogInputArtifact {
  id: string;
  instance_id: string;
  pin: number;
  attenuation_db?: number;
  sample_window_ms?: number;
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

export interface ShipControllerPulseFlowmeterSourceRef {
  requirement_id: string;
  mode: string;
  binding_kind: string;
  instance_id: string;
  port_id: string;
  connection_id?: string;
  resource_id?: string;
}

export interface ShipControllerPulseFlowmeterArtifact {
  id: string;
  native_kind: string;
  sensor_mode: string;
  k_factor: number;
  filter_window_ms: number;
  threshold_on?: number;
  threshold_off?: number;
  stale_timeout_ms: number;
  persistence_slot_id?: string;
  frontend_requirement_ids: string[];
  source: ShipControllerPulseFlowmeterSourceRef;
}

export interface ShipControllerPidEndpointRef {
  instance_id: string;
  port_id: string;
  connection_id?: string;
  resource_id?: string;
}

export interface ShipControllerPidControllerArtifact {
  id: string;
  native_kind: string;
  kp: number;
  ti: number;
  td: number;
  sample_time_ms: number;
  output_min: number;
  output_max: number;
  direction: string;
  pv_filter_tau_ms: number;
  deadband: number;
  persistence_slot_ids: string[];
  frontend_requirement_ids: string[];
  pv_source: ShipControllerPidEndpointRef;
  mv_output: ShipControllerPidEndpointRef;
}

export interface ShipControllerConfigArtifact {
  schema_version: "0.1.0";
  target_kind: "esp32.shipcontroller.v1";
  source_pack_id: string;
  capability_profile: string;
  artifacts: {
    digital_inputs: ShipControllerDigitalInputArtifact[];
    analog_inputs: ShipControllerAnalogInputArtifact[];
    digital_outputs: ShipControllerDigitalOutputArtifact[];
    timed_relays: ShipControllerTimedRelayArtifact[];
    pulse_flowmeters: ShipControllerPulseFlowmeterArtifact[];
    pid_controllers: ShipControllerPidControllerArtifact[];
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
