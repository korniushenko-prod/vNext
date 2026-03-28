import type {
  ObjectOperationDef,
  ObjectTraceGroupDef,
  ObjectType
} from "@universal-plc/project-schema";
import type {
  RuntimeOperation,
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
        {
          id: runtimeOperationId,
          owner_instance_id: runtimeInstanceId,
          kind: operation.id || operationId,
          title: operation.title
        } satisfies RuntimeOperation
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
        {
          id: runtimeTraceGroupId,
          owner_instance_id: runtimeInstanceId,
          signals: (traceGroup.signals ?? []).map((portId) => ({
            instance_id: runtimeInstanceId,
            port_id: portId
          })),
          sample_hint_ms: traceGroup.sample_hint_ms,
          chart_hint: traceGroup.chart_hint
        } satisfies RuntimeTraceGroup
      ];
    })
  );
}
