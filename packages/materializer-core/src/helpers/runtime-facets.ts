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
  RuntimeParamMetadata,
  RuntimePersistenceSlot,
  RuntimeTraceGroup
} from "@universal-plc/runtime-pack-schema";

export function collectRuntimeOperations(
  runtimeInstanceId: string,
  objectType: ObjectType
): Record<string, RuntimeOperation> {
  const operations = ((objectType.facets?.operations as { operations?: Record<string, ObjectOperationDef> } | undefined)?.operations) ?? {};
  return Object.fromEntries(
    Object.entries(operations).map(([operationId, operation]) => {
      const runtimeOperationId = `op_${runtimeInstanceId}_${operationId}`;
      return [
        runtimeOperationId,
        omitUndefined({
          id: runtimeOperationId,
          owner_instance_id: runtimeInstanceId,
          kind: operation.kind || operation.id || operationId,
          title: operation.title,
          ui_hint: operation.ui_hint,
          safe_when: operation.safe_when ? [...operation.safe_when] : undefined,
          confirmation_policy: operation.confirmation_policy,
          progress_signals: operation.progress_signals?.length
            ? operation.progress_signals.map((portId) => ({
                instance_id: runtimeInstanceId,
                port_id: portId
              }))
            : undefined,
          result_fields: operation.result_fields ? [...operation.result_fields] : undefined,
          state_hint: buildOperationStateHint(operation),
          provenance: buildFacetProvenance(runtimeInstanceId, "operation", operationId, objectType)
        }) satisfies RuntimeOperation
      ];
    })
  );
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

function buildOperationStateHint(operation: ObjectOperationDef): RuntimeOperation["state_hint"] {
  const availability = operation.safe_when?.length ? "guarded" : undefined;
  const progress_style = operation.progress_signals?.length ? "signals" : undefined;
  const destructive = operation.confirmation_policy === "required" ? true : undefined;

  if (availability === undefined && progress_style === undefined && destructive === undefined) {
    return undefined;
  }

  return {
    availability,
    progress_style,
    destructive
  };
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
