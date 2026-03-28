export type TargetAdapterCapability = "validate" | "emit" | "apply" | "readback" | "diagnostics";
export type TargetArtifactKind = "bundle" | "firmware" | "config" | "report";
export type TargetDiagnosticSeverity = "error" | "warning" | "info";
export type TargetReadbackScope = "summary" | "full";

export interface RuntimePackRef {
  pack_id: string;
  schema_version: string;
}

export interface TargetAdapterManifest {
  id: string;
  kind: "target_adapter";
  contract_version: string;
  display_name: string;
  target_family: string;
  runtime_pack_schema_version: string;
  capabilities: TargetAdapterCapability[];
  artifact_kinds: TargetArtifactKind[];
}

export interface TargetAdapterDiagnostic {
  code: string;
  severity: TargetDiagnosticSeverity;
  message: string;
  path?: string;
}

export interface TargetDeploymentRequest {
  request_id: string;
  adapter_id: string;
  pack: RuntimePackRef;
  options: Record<string, unknown>;
}

export interface TargetArtifact {
  id: string;
  kind: TargetArtifactKind;
  uri?: string;
  media_type?: string;
  meta?: Record<string, unknown>;
}

export interface TargetDeploymentResult {
  request_id: string;
  success: boolean;
  diagnostics: TargetAdapterDiagnostic[];
  artifacts: Record<string, TargetArtifact>;
}

export interface TargetReadbackRequest {
  request_id: string;
  adapter_id: string;
  target_id: string;
  scope: TargetReadbackScope;
}

export interface TargetReadbackSnapshot {
  request_id: string;
  target_id: string;
  collected_at: string;
  signals: Record<string, unknown>;
  resources: Record<string, unknown>;
  diagnostics: TargetAdapterDiagnostic[];
}

export interface TargetAdapterContract<
  TDeploymentRequest extends TargetDeploymentRequest = TargetDeploymentRequest,
  TDeploymentResult extends TargetDeploymentResult = TargetDeploymentResult,
  TReadbackRequest extends TargetReadbackRequest = TargetReadbackRequest,
  TReadbackSnapshot extends TargetReadbackSnapshot = TargetReadbackSnapshot
> {
  manifest: TargetAdapterManifest;
  validatePack?(pack: unknown): Promise<TargetAdapterDiagnostic[]> | TargetAdapterDiagnostic[];
  emit?(request: TDeploymentRequest): Promise<TDeploymentResult> | TDeploymentResult;
  apply?(request: TDeploymentRequest): Promise<TDeploymentResult> | TDeploymentResult;
  readback?(request: TReadbackRequest): Promise<TReadbackSnapshot> | TReadbackSnapshot;
}
