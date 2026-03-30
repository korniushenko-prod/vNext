import type { ObjectType, ProjectModel } from "@universal-plc/project-schema";
import type { RuntimeNativeExecution, RuntimeResolvedParam } from "@universal-plc/runtime-pack-schema";
import { error } from "../diagnostics.js";
import type { MaterializerDiagnostic, MaterializerPhase } from "../types.js";

export interface MaterializedCommsMetadata {
  execution: Pick<RuntimeNativeExecution, "mode" | "config_template">;
  diagnostics: MaterializerDiagnostic[];
}

export function materializeCommsMetadata(
  project: ProjectModel,
  instance: ProjectModel["system"]["instances"][string],
  objectType: ObjectType,
  params: Record<string, RuntimeResolvedParam>,
  phase: MaterializerPhase,
  pathBase: string
): MaterializedCommsMetadata {
  const diagnostics: MaterializerDiagnostic[] = [];
  const commsFacet = getRecord(objectType.facets?.comms);
  if (!commsFacet) {
    return {
      execution: {},
      diagnostics
    };
  }

  const busKind = typeof commsFacet.bus_kind === "string" ? commsFacet.bus_kind : undefined;
  const accessMode = typeof commsFacet.access_mode === "string" ? commsFacet.access_mode : undefined;
  const supportContractRefs = Array.isArray(commsFacet.support_contract_refs)
    ? commsFacet.support_contract_refs.filter((entry): entry is string => typeof entry === "string")
    : [];

  const paramDefs = objectType.interface?.params ?? {};
  const paramValues = instance.param_values ?? {};
  const isCommBridge = "port_ref" in paramDefs;
  const isRemotePoint = "bridge_ref" in paramDefs;

  if (accessMode && accessMode !== "read_only") {
    diagnostics.push(error(
      phase,
      "comms.access_mode.unsupported",
      `${pathBase}.type_ref`,
      `Communications baseline only supports read_only access_mode, received \`${accessMode}\`.`
    ));
  }

  if (isCommBridge && !hasNonEmptyLiteralString(paramValues.port_ref)) {
    diagnostics.push(error(
      phase,
      "comms.port_ref.missing",
      `${pathBase}.param_values.port_ref`,
      "CommBridge requires a literal port_ref for the Modbus RTU baseline."
    ));
  }

  if (isRemotePoint && !hasNonEmptyLiteralString(paramValues.bridge_ref)) {
    diagnostics.push(error(
      phase,
      "comms.bridge_ref.missing",
      `${pathBase}.param_values.bridge_ref`,
      "RemotePointFrontend requires a literal bridge_ref for the Modbus RTU baseline."
    ));
  }

  if (isRemotePoint && hasNonEmptyLiteralString(paramValues.bridge_ref)) {
    const bridgeRef = (paramValues.bridge_ref as { value: string }).value;
    const bridgeExists = Boolean(project.system?.instances?.[bridgeRef]);
    const hasBusBinding = Object.values(project.hardware?.bindings ?? {}).some((bindingValue) => (
      isRecord(bindingValue) &&
      bindingValue.instance_id === bridgeRef &&
      bindingValue.binding_kind === "bus"
    ));

    if (bridgeExists && !hasBusBinding) {
      diagnostics.push(error(
        phase,
        "comms.bridge_resource.missing",
        `${pathBase}.param_values.bridge_ref`,
        `RemotePointFrontend bridge_ref \`${bridgeRef}\` has no bus resource binding in hardware.bindings.`
      ));
    }
  }

  if (isRemotePoint) {
    for (const forbiddenParamId of ["write_enabled", "write_command", "write_value"]) {
      if (forbiddenParamId in paramValues) {
        diagnostics.push(error(
          phase,
          "comms.write_param.unsupported",
          `${pathBase}.param_values.${forbiddenParamId}`,
          `RemotePointFrontend is read-only in PR-16B and cannot accept \`${forbiddenParamId}\`.`
        ));
      }
    }
  }

  const executionRole = isCommBridge
    ? "comm_bridge"
    : isRemotePoint
      ? "remote_point_frontend"
      : "comms_object";

  return {
    execution: omitUndefined({
      mode: busKind,
      config_template: omitUndefined({
        role: executionRole,
        bus_kind: busKind,
        access_mode: accessMode,
        support_contract_refs: supportContractRefs.length > 0 ? supportContractRefs : undefined,
        bridge_ref_param: isRemotePoint ? "bridge_ref" : undefined,
        port_ref_param: isCommBridge ? "port_ref" : undefined
      })
    }),
    diagnostics
  };
}

function hasNonEmptyLiteralString(value: unknown): boolean {
  return (
    isRecord(value) &&
    value.kind === "literal" &&
    typeof value.value === "string" &&
    value.value.trim().length > 0
  );
}

function getRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
