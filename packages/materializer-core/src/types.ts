import type { ProjectModel } from "@universal-plc/project-schema";
import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

export type MaterializerSeverity = "error" | "warning";

export type MaterializerPhase =
  | "structural_validation"
  | "normalize_project"
  | "flatten_packages"
  | "build_type_registry"
  | "resolve_templates"
  | "materialize_system_instances"
  | "materialize_system_signals"
  | "materialize_hardware"
  | "expand_composition"
  | "finalize_pack";

export interface MaterializerDiagnostic {
  code: string;
  severity: MaterializerSeverity;
  phase: MaterializerPhase;
  path: string;
  message: string;
}

export interface MaterializeOptions {
  pack_id?: string;
  generated_at?: string;
  include_partial_pack?: boolean;
}

export interface MaterializeResult {
  ok: boolean;
  pack: RuntimePack;
  diagnostics: MaterializerDiagnostic[];
}

export interface ResolvedHardwarePortRef {
  instance_id: string;
  port_id?: string;
}

export interface ResolvedHardwareResource {
  id: string;
  title?: string;
  gpio: number;
  capabilities: string[];
  note?: string;
  allowed_gpios?: number[];
  origin: "preset_default" | "manifest_override";
  binding_ids: string[];
  port_refs: ResolvedHardwarePortRef[];
}

export interface ResolvedHardwareDiagnostic {
  code: string;
  severity: "error" | "warning";
  message: string;
  binding_id?: string;
  resource_id?: string;
  gpio?: number;
}

export interface ResolvedHardwareSection {
  target_preset_ref: string;
  chip_template_ref: string;
  chip_title?: string;
  board_template_ref: string;
  board_title?: string;
  active_rule_ids: string[];
  reserved_pins: Record<string, number>;
  forbidden_pins: number[];
  resources: Record<string, ResolvedHardwareResource>;
  diagnostics: ResolvedHardwareDiagnostic[];
}

export type RuntimePackWithHardwareResolution = RuntimePack & {
  hardware_resolution?: ResolvedHardwareSection;
};

export interface LocalTypeRegistry {
  by_type_id: Record<string, unknown>;
}

export interface MaterializeContext {
  project: ProjectModel;
  options: Required<MaterializeOptions>;
  diagnostics: MaterializerDiagnostic[];
  type_registry: Map<string, unknown>;
}

export interface QualifiedInstanceRef {
  runtime_instance_id: string;
  type_ref: string;
  owner_layer: "system" | "composition";
  owner_id: string;
}
