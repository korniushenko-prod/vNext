import type {
  ObjectFrontendRequirementDef,
  ObjectMonitorDef,
  ObjectOperationDef,
  ObjectPersistenceSlotDef,
  ObjectType,
  ObjectTraceGroupDef,
  ParamDef
} from "@universal-plc/project-schema";
import type {
  RuntimeFrontendRequirement,
  RuntimeMetadataProvenance,
  RuntimeMonitor,
  RuntimeOperation,
  RuntimeOperationAvailabilityMode,
  RuntimeOperationAvailability,
  RuntimeOperationProgressContract,
  RuntimeOperationResultContract,
  RuntimeOperationResultField,
  RuntimeOperationResultMode,
  RuntimeOperationRuntimeContract,
  RuntimeParamMetadata,
  RuntimePersistenceSlot,
  RuntimeTraceGroup
} from "@universal-plc/runtime-pack-schema";

import { error } from "../diagnostics.js";
import type { MaterializerDiagnostic, MaterializerPhase } from "../types.js";

type OperationFacetLike = ObjectOperationDef & {
  availability?: {
    mode?: string;
    required_signals?: unknown;
    required_states?: unknown;
    notes?: unknown;
  };
  progress_mode?: string;
  progress_contract?: {
    fields?: unknown;
  };
  result_contract?: {
    mode?: string;
    fields?: unknown;
    failure_fields?: unknown;
    recommendation_lifecycle?: {
      mode?: string;
      apply_confirmation_policy?: string;
      reject_confirmation_policy?: string;
    };
  };
};

export const metadataOnlyOperationRuntimeContract: RuntimeOperationRuntimeContract = {
  invoke_supported: false,
  cancel_supported: false,
  progress_supported: false,
  result_supported: false,
  audit_required: false
};

export const pidAutotuneExecutionRuntimeContract: RuntimeOperationRuntimeContract = {
  invoke_supported: true,
  cancel_supported: true,
  progress_supported: true,
  result_supported: true,
  audit_required: true,
  confirmation_token_validation: "when_required",
  failure_payload_supported: true,
  audit_hook_mode: "operation_events",
  recommendation_lifecycle_supported: true,
  progress_payload_supported: true
};

export function collectRuntimeOperations(
  runtimeInstanceId: string,
  objectType: ObjectType,
  phase: MaterializerPhase,
  pathBase: string
): {
  diagnostics: MaterializerDiagnostic[];
  operations: Record<string, RuntimeOperation>;
} {
  const diagnostics: MaterializerDiagnostic[] = [];
  const operations = ((objectType.facets?.operations as { operations?: Record<string, ObjectOperationDef> } | undefined)?.operations) ?? {};

  return {
    diagnostics,
    operations: Object.fromEntries(
      Object.entries(operations).map(([operationId, operationDef]) => {
        const operation = operationDef as OperationFacetLike;
        const runtimeOperationId = `op_${runtimeInstanceId}_${operationId}`;

        const normalizedKind = normalizeOperationKind(operation, operationId, phase, `${pathBase}.${operationId}`, diagnostics);
        const normalizedConfirmationPolicy = normalizeConfirmationPolicy(
          operation,
          phase,
          `${pathBase}.${operationId}.confirmation_policy`,
          diagnostics
        );
        const normalizedAvailability = normalizeAvailability(
          runtimeInstanceId,
          operation,
          phase,
          `${pathBase}.${operationId}.availability`,
          diagnostics
        );
        const normalizedProgressMode = normalizeProgressMode(
          operation,
          phase,
          `${pathBase}.${operationId}.progress_mode`,
          diagnostics
        );
        const normalizedProgressContract = normalizeProgressContract(
          operation,
          normalizedKind,
          phase,
          `${pathBase}.${operationId}.progress_contract`,
          diagnostics
        );
        const normalizedProgressSignals = normalizeProgressSignals(
          runtimeInstanceId,
          operation,
          phase,
          `${pathBase}.${operationId}.progress_signals`,
          diagnostics
        );
        const normalizedResultContract = normalizeResultContract(
          objectType,
          operation,
          phase,
          `${pathBase}.${operationId}.result_contract`,
          diagnostics
        );

        return [
          runtimeOperationId,
          omitUndefined({
            id: runtimeOperationId,
            owner_instance_id: runtimeInstanceId,
            kind: normalizedKind,
            title: operation.title,
            confirmation_policy: normalizedConfirmationPolicy,
            availability: normalizedAvailability,
            progress_mode: normalizedProgressMode,
            progress_contract: normalizedProgressContract,
            result_contract: normalizedResultContract,
            ui_hint: operation.ui_hint,
            safe_when: normalizeStringArray(
              operation.safe_when,
              phase,
              `${pathBase}.${operationId}.safe_when`,
              diagnostics
            ),
            progress_signals: normalizedProgressSignals,
            result_fields: normalizeLegacyResultFields(
              objectType,
              operation,
              phase,
              `${pathBase}.${operationId}.result_fields`,
              diagnostics
            ),
            state_hint: buildOperationStateHint(
              normalizedAvailability,
              normalizedProgressMode,
              normalizedConfirmationPolicy
            ),
            provenance: buildFacetProvenance(runtimeInstanceId, "operation", operationId, objectType)
          }) satisfies RuntimeOperation
        ];
      })
    )
  };
}

export function deriveRuntimeOperationRuntimeContract(
  operations: Record<string, RuntimeOperation>
): RuntimeOperationRuntimeContract | undefined {
  const entries = Object.values(operations);
  if (entries.length === 0) {
    return undefined;
  }

  if (entries.some(isPidAutotuneExecutionOperation)) {
    return { ...pidAutotuneExecutionRuntimeContract };
  }

  return { ...metadataOnlyOperationRuntimeContract };
}

export function collectRuntimeTraceGroups(
  runtimeInstanceId: string,
  objectType: ObjectType
): Record<string, RuntimeTraceGroup> {
  const traceGroups = ((objectType.facets?.debug as { trace_groups?: Record<string, ObjectTraceGroupDef> } | undefined)?.trace_groups) ?? {};
  return Object.fromEntries(
    Object.entries(traceGroups).map(([traceGroupId, traceGroup]) => {
      const runtimeTraceGroupId = `tg_${runtimeInstanceId}_${traceGroupId}`;
      return [
        runtimeTraceGroupId,
        omitUndefined({
          id: runtimeTraceGroupId,
          owner_instance_id: runtimeInstanceId,
          title: traceGroup.title,
          signals: (traceGroup.signals ?? []).map((portId) => ({
            instance_id: runtimeInstanceId,
            port_id: portId
          })),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint,
          provenance: buildFacetProvenance(runtimeInstanceId, "trace_group", traceGroupId, objectType)
        }) satisfies RuntimeTraceGroup
      ];
    })
  );
}

export function collectRuntimeMonitors(
  runtimeInstanceId: string,
  objectType: ObjectType
): Record<string, RuntimeMonitor> {
  const monitorFacet =
    ((objectType.facets?.monitoring as { monitors?: Record<string, ObjectMonitorDef> } | undefined)?.monitors) ??
    ((objectType.facets?.monitors as { monitors?: Record<string, ObjectMonitorDef> } | undefined)?.monitors) ??
    {};

  return Object.fromEntries(
    Object.entries(monitorFacet).map(([monitorId, monitor]) => {
      const runtimeMonitorId = `mon_${runtimeInstanceId}_${monitorId}`;
      return [
        runtimeMonitorId,
        omitUndefined({
          id: runtimeMonitorId,
          owner_instance_id: runtimeInstanceId,
          kind: monitor.kind,
          title: monitor.title,
          source_ports: (monitor.source_ports ?? []).map((portId) => ({
            instance_id: runtimeInstanceId,
            port_id: portId
          })),
          severity: monitor.severity,
          status_port_id: monitor.status_port_id,
          config: monitor.config ? { ...monitor.config } : undefined,
          provenance: buildFacetProvenance(runtimeInstanceId, "monitor", monitorId, objectType)
        }) satisfies RuntimeMonitor
      ];
    })
  );
}

export function collectRuntimeFrontendRequirements(
  runtimeInstanceId: string,
  objectType: ObjectType
): Record<string, RuntimeFrontendRequirement> {
  const requirements = ((objectType.facets?.frontends as { requirements?: Record<string, ObjectFrontendRequirementDef> } | undefined)?.requirements) ?? {};

  return Object.fromEntries(
    Object.entries(requirements).map(([requirementId, requirement]) => {
      const runtimeRequirementId = `fe_${runtimeInstanceId}_${requirementId}`;
      return [
        runtimeRequirementId,
        omitUndefined({
          id: runtimeRequirementId,
          owner_instance_id: runtimeInstanceId,
          kind: requirement.kind,
          mode: requirement.mode,
          title: requirement.title,
          source_ports: (requirement.source_ports ?? []).map((portId) => ({
            instance_id: runtimeInstanceId,
            port_id: portId
          })),
          binding_kind: requirement.binding_kind,
          channel_kind: requirement.channel_kind,
          value_type: requirement.value_type,
          required: requirement.required,
          config: requirement.config ? { ...requirement.config } : undefined,
          provenance: buildFacetProvenance(runtimeInstanceId, "frontend_requirement", requirementId, objectType)
        }) satisfies RuntimeFrontendRequirement
      ];
    })
  );
}

export function collectRuntimePersistenceSlots(
  runtimeInstanceId: string,
  objectType: ObjectType
): Record<string, RuntimePersistenceSlot> {
  const slots = ((objectType.facets?.persistence as { slots?: Record<string, ObjectPersistenceSlotDef> } | undefined)?.slots) ?? {};

  return Object.fromEntries(
    Object.entries(slots).map(([slotId, slot]) => {
      const runtimeSlotId = `ps_${runtimeInstanceId}_${slotId}`;
      return [
        runtimeSlotId,
        omitUndefined({
          id: runtimeSlotId,
          owner_instance_id: runtimeInstanceId,
          slot_kind: slot.slot_kind,
          title: slot.title,
          owner_param_id: slot.owner_param_id,
          nv_slot_hint: slot.nv_slot_hint,
          flush_policy: slot.flush_policy,
          provenance: buildFacetProvenance(runtimeInstanceId, "persistence_slot", slotId, objectType)
        }) satisfies RuntimePersistenceSlot
      ];
    })
  );
}

export function toRuntimeParamMetadata(paramDef: ParamDef): RuntimeParamMetadata | undefined {
  const metadata = omitUndefined({
    title: paramDef.title,
    unit: paramDef.unit,
    min: paramDef.min,
    max: paramDef.max,
    step: paramDef.step,
    group: paramDef.group,
    ui_hint: paramDef.ui_hint,
    description: paramDef.description,
    access_role: paramDef.access_role,
    live_edit_policy: paramDef.live_edit_policy,
    persist_policy: paramDef.persist_policy,
    recipe_scope: paramDef.recipe_scope,
    danger_level: paramDef.danger_level
  }) as RuntimeParamMetadata;

  return Object.values(metadata).some((entry) => entry !== undefined)
    ? metadata
    : undefined;
}

function normalizeOperationKind(
  operation: OperationFacetLike,
  operationId: string,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): string {
  if (typeof operation.kind === "string" && operation.kind.length > 0) {
    return operation.kind;
  }

  if (typeof operation.kind !== "undefined") {
    diagnostics.push(error(
      phase,
      "operation.kind.invalid",
      `${path}.kind`,
      "Operation `kind` must be a non-empty string when present."
    ));
  }

  if (typeof operation.id === "string" && operation.id.length > 0) {
    return operation.id;
  }

  return operationId;
}

function normalizeConfirmationPolicy(
  operation: OperationFacetLike,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperation["confirmation_policy"] {
  if (operation.confirmation_policy === "required") {
    return "required";
  }

  if (
    operation.confirmation_policy === undefined ||
    operation.confirmation_policy === "none" ||
    operation.confirmation_policy === "optional"
  ) {
    return "none";
  }

  diagnostics.push(error(
    phase,
    "operation.confirmation_policy.invalid",
    path,
    "Operation `confirmation_policy` must be `required`, `optional`, or `none`."
  ));
  return "none";
}

function normalizeAvailability(
  runtimeInstanceId: string,
  operation: OperationFacetLike,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperationAvailability {
  const explicitAvailability = operation.availability;
  if (explicitAvailability === undefined) {
    if (Array.isArray(operation.safe_when) && operation.safe_when.length > 0) {
      return {
        mode: "guarded",
        required_states: [...operation.safe_when]
      };
    }

    return {
      mode: "always"
    };
  }

  if (!isRecord(explicitAvailability)) {
    diagnostics.push(error(
      phase,
      "operation.availability.invalid",
      path,
      "Operation `availability` must be an object when present."
    ));
    return {
      mode: "always"
    };
  }

  const mode = explicitAvailability.mode;
  if (mode !== undefined && mode !== "always" && mode !== "guarded") {
    diagnostics.push(error(
      phase,
      "operation.availability.invalid",
      `${path}.mode`,
      "Operation `availability.mode` must be `always` or `guarded`."
    ));
  }

  const requiredSignals = normalizeStringArray(
    explicitAvailability.required_signals,
    phase,
    `${path}.required_signals`,
    diagnostics
  )?.map((portId) => ({
    instance_id: runtimeInstanceId,
    port_id: portId
  }));

  const requiredStates = normalizeStringArray(
    explicitAvailability.required_states,
    phase,
    `${path}.required_states`,
    diagnostics
  );

  if ("notes" in explicitAvailability && explicitAvailability.notes !== undefined && typeof explicitAvailability.notes !== "string") {
    diagnostics.push(error(
      phase,
      "operation.availability.invalid",
      `${path}.notes`,
      "Operation `availability.notes` must be a string when present."
    ));
  }

  const normalizedMode: RuntimeOperationAvailabilityMode =
    mode === "guarded" || mode === "always"
      ? mode
      : ((requiredSignals?.length || requiredStates?.length) ? "guarded" : "always");

  return omitUndefined({
    mode: normalizedMode,
    required_signals: requiredSignals?.length ? requiredSignals : undefined,
    required_states: requiredStates?.length ? requiredStates : undefined,
    notes: typeof explicitAvailability.notes === "string" ? explicitAvailability.notes : undefined
  });
}

function normalizeProgressMode(
  operation: OperationFacetLike,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperation["progress_mode"] {
  if (operation.progress_mode === undefined) {
    return Array.isArray(operation.progress_signals) && operation.progress_signals.length > 0
      ? "signal_based"
      : "none";
  }

  if (
    operation.progress_mode === "none" ||
    operation.progress_mode === "signal_based" ||
    operation.progress_mode === "state_based"
  ) {
    return operation.progress_mode;
  }

  diagnostics.push(error(
    phase,
    "operation.progress_mode.invalid",
    path,
    "Operation `progress_mode` must be `none`, `signal_based`, or `state_based`."
  ));
  return "none";
}

function normalizeProgressSignals(
  runtimeInstanceId: string,
  operation: OperationFacetLike,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperation["progress_signals"] {
  const progressSignals = normalizeStringArray(operation.progress_signals, phase, path, diagnostics);
  return progressSignals?.length
    ? progressSignals.map((portId) => ({
        instance_id: runtimeInstanceId,
        port_id: portId
      }))
    : undefined;
}

function normalizeProgressContract(
  operation: OperationFacetLike,
  normalizedKind: string,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperationProgressContract | undefined {
  if (operation.progress_contract === undefined) {
    return isPidAutotuneOperationKind(normalizedKind)
      ? {
          fields: [
            { id: "phase", value_type: "string", title: "Autotune phase" },
            { id: "sample_count", value_type: "u32", title: "Collected samples" }
          ]
        }
      : undefined;
  }

  if (!isRecord(operation.progress_contract)) {
    diagnostics.push(error(
      phase,
      "operation.progress_contract.invalid",
      path,
      "Operation `progress_contract` must be an object when present."
    ));
    return undefined;
  }

  const fields = normalizeResultContractFields(
    operation.progress_contract.fields,
    phase,
    `${path}.fields`,
    diagnostics,
    "Operation progress field"
  );

  return fields?.length
    ? { fields }
    : undefined;
}

function normalizeLegacyResultFields(
  objectType: ObjectType,
  operation: OperationFacetLike,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): string[] | undefined {
  const resultFields = normalizeStringArray(operation.result_fields, phase, path, diagnostics);
  return resultFields?.length ? resultFields : undefined;
}

function normalizeResultContract(
  objectType: ObjectType,
  operation: OperationFacetLike,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperationResultContract {
  if (operation.result_contract === undefined) {
    return deriveLegacyResultContract(objectType, operation, phase, `${path}.fields`, diagnostics);
  }

  if (!isRecord(operation.result_contract)) {
    diagnostics.push(error(
      phase,
      "operation.result_contract.invalid",
      path,
      "Operation `result_contract` must be an object when present."
    ));
    return {
      mode: "none"
    };
  }

  const mode = operation.result_contract.mode;
  if (
    mode !== "none" &&
    mode !== "recommendation" &&
    mode !== "applyable_result"
  ) {
    diagnostics.push(error(
      phase,
      "operation.result_contract.invalid",
      `${path}.mode`,
      "Operation `result_contract.mode` must be `none`, `recommendation`, or `applyable_result`."
    ));
  }

  const fields = normalizeResultContractFields(
    operation.result_contract.fields,
    phase,
    `${path}.fields`,
    diagnostics,
    "Operation result field"
  );
  const failureFields = normalizeResultContractFields(
    operation.result_contract.failure_fields,
    phase,
    `${path}.failure_fields`,
    diagnostics,
    "Operation failure field"
  );

  const normalizedMode: RuntimeOperationResultMode =
    mode === "none" || mode === "recommendation" || mode === "applyable_result"
      ? mode
      : "none";

  const recommendationLifecycle = normalizeRecommendationLifecycle(
    operation,
    normalizedMode,
    phase,
    `${path}.recommendation_lifecycle`,
    diagnostics
  );

  return omitUndefined({
    mode: normalizedMode,
    fields: fields?.length ? fields : undefined,
    failure_fields: failureFields?.length ? failureFields : undefined,
    recommendation_lifecycle: recommendationLifecycle
  });
}

function deriveLegacyResultContract(
  objectType: ObjectType,
  operation: OperationFacetLike,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperationResultContract {
  const resultFields = normalizeStringArray(operation.result_fields, phase, path, diagnostics);
  if (!resultFields?.length) {
    return {
      mode: "none"
    };
  }

  return {
    mode: inferResultMode(operation, resultFields),
    fields: resultFields.map((fieldId) => ({
      id: fieldId,
      value_type: inferResultFieldValueType(objectType, fieldId)
    })),
    ...(inferResultMode(operation, resultFields) === "recommendation"
      ? {
          recommendation_lifecycle: {
            mode: "apply_reject",
            apply_confirmation_policy: "required",
            reject_confirmation_policy: "required"
          }
        }
      : {})
  };
}

function inferResultMode(operation: OperationFacetLike, resultFields: string[]): RuntimeOperationResultContract["mode"] {
  const normalizedKind = `${operation.kind ?? operation.id ?? ""}`.toLowerCase();
  if (normalizedKind.includes("autotune") || resultFields.some((fieldId) => fieldId.startsWith("recommended_"))) {
    return "recommendation";
  }

  return "applyable_result";
}

function inferResultFieldValueType(objectType: ObjectType, fieldId: string): string {
  const portValueType = objectType.interface?.ports?.[fieldId]?.value_type;
  if (typeof portValueType === "string" && portValueType.length > 0) {
    return portValueType;
  }

  const paramValueType = objectType.interface?.params?.[fieldId]?.value_type;
  if (typeof paramValueType === "string" && paramValueType.length > 0) {
    return paramValueType;
  }

  if (fieldId === "completed" || fieldId === "acknowledged" || fieldId === "accepted" || fieldId === "applied") {
    return "bool";
  }

  if (fieldId.startsWith("recommended_")) {
    return "float";
  }

  if (fieldId === "summary" || fieldId === "message" || fieldId === "notes") {
    return "string";
  }

  return "string";
}

function normalizeRecommendationLifecycle(
  operation: OperationFacetLike,
  normalizedMode: RuntimeOperationResultMode,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): RuntimeOperationResultContract["recommendation_lifecycle"] {
  if (operation.result_contract?.recommendation_lifecycle === undefined) {
    return normalizedMode === "recommendation"
      ? {
          mode: "apply_reject",
          apply_confirmation_policy: "required",
          reject_confirmation_policy: "required"
        }
      : undefined;
  }

  if (normalizedMode !== "recommendation") {
    diagnostics.push(error(
      phase,
      "operation.result_contract.invalid",
      path,
      "Operation `recommendation_lifecycle` is allowed only for `mode: recommendation`."
    ));
    return undefined;
  }

  const lifecycle = operation.result_contract.recommendation_lifecycle;
  if (!isRecord(lifecycle)) {
    diagnostics.push(error(
      phase,
      "operation.result_contract.invalid",
      path,
      "Operation `recommendation_lifecycle` must be an object when present."
    ));
    return undefined;
  }

  const mode = lifecycle.mode;
  if (mode !== "advisory" && mode !== "apply_reject") {
    diagnostics.push(error(
      phase,
      "operation.result_contract.invalid",
      `${path}.mode`,
      "Operation `recommendation_lifecycle.mode` must be `advisory` or `apply_reject`."
    ));
  }

  const applyConfirmationPolicy = normalizeLifecycleConfirmationPolicy(
    lifecycle.apply_confirmation_policy,
    phase,
    `${path}.apply_confirmation_policy`,
    diagnostics
  );
  const rejectConfirmationPolicy = normalizeLifecycleConfirmationPolicy(
    lifecycle.reject_confirmation_policy,
    phase,
    `${path}.reject_confirmation_policy`,
    diagnostics
  );
  const normalizedLifecycleMode: "advisory" | "apply_reject" =
    mode === "advisory" || mode === "apply_reject" ? mode : "apply_reject";

  return {
    mode: normalizedLifecycleMode,
    ...(applyConfirmationPolicy !== undefined
      ? { apply_confirmation_policy: applyConfirmationPolicy }
      : {}),
    ...(rejectConfirmationPolicy !== undefined
      ? { reject_confirmation_policy: rejectConfirmationPolicy }
      : {})
  };
}

function normalizeLifecycleConfirmationPolicy(
  value: unknown,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): "none" | "required" | undefined {
  if (value === undefined || value === "none") {
    return value === undefined ? undefined : "none";
  }

  if (value === "required" || value === "optional") {
    return value === "required" ? "required" : "none";
  }

  diagnostics.push(error(
    phase,
    "operation.result_contract.invalid",
    path,
    "Recommendation lifecycle confirmation policy must be `required`, `optional`, or `none`."
  ));
  return undefined;
}

function normalizeResultContractFields(
  value: unknown,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[],
  noun: string
): RuntimeOperationResultField[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    diagnostics.push(error(
      phase,
      "operation.result_contract.invalid",
      path,
      `Operation \`${path.split(".").slice(-1)[0]}\` must be an array when present.`
    ));
    return undefined;
  }

  return value.flatMap((entry, index) => {
    if (!isRecord(entry)) {
      diagnostics.push(error(
        phase,
        "operation.result_contract.invalid",
        `${path}.${index}`,
        `${noun} must be an object.`
      ));
      return [];
    }

    if (typeof entry.id !== "string" || entry.id.length === 0) {
      diagnostics.push(error(
        phase,
        "operation.result_contract.invalid",
        `${path}.${index}.id`,
        `${noun} \`id\` must be a non-empty string.`
      ));
      return [];
    }

    if (typeof entry.value_type !== "string" || entry.value_type.length === 0) {
      diagnostics.push(error(
        phase,
        "operation.result_contract.invalid",
        `${path}.${index}.value_type`,
        `${noun} \`value_type\` must be a non-empty string.`
      ));
      return [];
    }

    if ("title" in entry && entry.title !== undefined && typeof entry.title !== "string") {
      diagnostics.push(error(
        phase,
        "operation.result_contract.invalid",
        `${path}.${index}.title`,
        `${noun} \`title\` must be a string when present.`
      ));
    }

    return [{
      id: entry.id,
      value_type: entry.value_type,
      ...(typeof entry.title === "string" ? { title: entry.title } : {})
    }];
  });
}

function isPidAutotuneExecutionOperation(operation: RuntimeOperation): boolean {
  return isPidAutotuneOperationKind(operation.kind) &&
    operation.result_contract?.mode === "recommendation";
}

function isPidAutotuneOperationKind(kind: string): boolean {
  const normalizedKind = kind.toLowerCase();
  return normalizedKind === "autotune" || normalizedKind === "pid_autotune";
}

function normalizeStringArray(
  value: unknown,
  phase: MaterializerPhase,
  path: string,
  diagnostics: MaterializerDiagnostic[]
): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((entry) => typeof entry !== "string" || entry.length === 0)) {
    diagnostics.push(error(
      phase,
      "operation.contract.invalid",
      path,
      "Operation metadata array must contain only non-empty strings."
    ));
    return undefined;
  }

  return [...value];
}

function buildFacetProvenance(
  runtimeInstanceId: string,
  facetKind: RuntimeMetadataProvenance["facet_kind"],
  facetId: string,
  objectType: ObjectType
): RuntimeMetadataProvenance {
  return {
    owner_instance_id: runtimeInstanceId,
    facet_kind: facetKind,
    facet_id: facetId,
    source_type_ref: `${objectType.meta.origin}:${objectType.id}`
  };
}

function buildOperationStateHint(
  availability: RuntimeOperation["availability"],
  progressMode: RuntimeOperation["progress_mode"],
  confirmationPolicy: RuntimeOperation["confirmation_policy"]
): RuntimeOperation["state_hint"] {
  const availabilityHint = availability?.mode === "guarded" ? "guarded" : undefined;
  const progressStyle = progressMode === "signal_based"
    ? "signals"
    : progressMode === "state_based"
      ? "state"
      : undefined;
  const destructive = confirmationPolicy === "required" ? true : undefined;

  if (availabilityHint === undefined && progressStyle === undefined && destructive === undefined) {
    return undefined;
  }

  return omitUndefined({
    availability: availabilityHint,
    progress_style: progressStyle,
    destructive
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
