import type { ProjectModel } from "@universal-plc/project-schema";
import type {
  RuntimePack,
  RuntimePackageAggregateMonitor,
  RuntimePackageCoordination,
  RuntimePackageCoordinationOperationProxy,
  RuntimePackageCoordinationStateRule,
  RuntimePackageSummaryOutput,
  RuntimePackageTraceGroup,
  RuntimeTraceSignalRef
} from "@universal-plc/runtime-pack-schema";
import { error } from "../diagnostics.js";
import type { MaterializerDiagnostic } from "../types.js";

type PackageCoordinationStateRuleLike = {
  id: string;
  state: "standby" | "ready" | "circulation_active" | "control_active" | "fault_latched";
  title?: string;
  source_ports: Array<{ member_id: string; port_id: string }>;
  summary?: string;
};

type PackageCoordinationLike = {
  package_state: {
    id: string;
    title?: string;
    default_state?: "standby" | "ready" | "circulation_active" | "control_active" | "fault_latched";
    states: Record<string, PackageCoordinationStateRuleLike>;
  };
  summary_outputs?: Record<string, {
    id: string;
    title?: string;
    value_type: string;
    source: { member_id: string; port_id: string };
  }>;
  aggregate_monitors?: Record<string, {
    id: string;
    title?: string;
    kind: string;
    severity?: string;
    source_ports: Array<{ member_id: string; port_id: string }>;
  }>;
  trace_groups?: Record<string, {
    id: string;
    title?: string;
    signals: Array<{ member_id: string; port_id: string }>;
    sample_hint_ms?: number;
    chart_hint?: string;
  }>;
  operation_proxies?: Record<string, {
    id: string;
    title?: string;
    kind: string;
    target_member_id: string;
    target_operation_id: string;
    child_operation_kind?: string;
    ui_hint?: string;
  }>;
};

export function materializePackageCoordination(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  const materialized: Record<string, RuntimePackageCoordination> = {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    const coordination = packageDefinition?.coordination as PackageCoordinationLike | undefined;
    if (!packageDefinition || !coordination) {
      continue;
    }

    const runtimeCoordinationId = `pkgcoord_${packageInstance.id}`;
    const packagePath = `$.definitions.packages.${packageDefinition.id}.coordination`;
    const packageState = materializePackageState(
      packageInstance.id,
      coordination.package_state,
      runtimePack,
      diagnostics,
      `${packagePath}.package_state`
    );
    const summaryOutputs = materializeSummaryOutputs(
      packageInstance.id,
      coordination.summary_outputs,
      runtimePack,
      diagnostics,
      `${packagePath}.summary_outputs`
    );
    const aggregateMonitors = materializeAggregateMonitors(
      packageInstance.id,
      coordination.aggregate_monitors,
      runtimePack,
      diagnostics,
      `${packagePath}.aggregate_monitors`
    );
    const traceGroups = materializeTraceGroups(
      packageInstance.id,
      coordination.trace_groups,
      runtimePack,
      diagnostics,
      `${packagePath}.trace_groups`
    );
    const operationProxies = materializeOperationProxies(
      packageInstance.id,
      coordination.operation_proxies,
      runtimePack,
      diagnostics,
      `${packagePath}.operation_proxies`
    );

    materialized[runtimeCoordinationId] = omitUndefined({
      id: runtimeCoordinationId,
      package_instance_id: packageInstance.id,
      title: packageInstance.title ?? packageDefinition.meta.title,
      package_state: packageState,
      summary_outputs: isNonEmpty(summaryOutputs) ? summaryOutputs : undefined,
      aggregate_monitors: isNonEmpty(aggregateMonitors) ? aggregateMonitors : undefined,
      trace_groups: isNonEmpty(traceGroups) ? traceGroups : undefined,
      operation_proxies: isNonEmpty(operationProxies) ? operationProxies : undefined
    }) satisfies RuntimePackageCoordination;
  }

  if (isNonEmpty(materialized)) {
    runtimePack.package_coordination = materialized;
  }
}

function materializePackageState(
  packageInstanceId: string,
  packageState: PackageCoordinationLike["package_state"],
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
) {
  const states: Record<string, RuntimePackageCoordinationStateRule> = {};

  for (const [stateId, stateRule] of Object.entries(packageState.states ?? {})) {
    const sourcePorts = materializeQualifiedSourcePorts(
      packageInstanceId,
      stateRule.source_ports,
      runtimePack,
      diagnostics,
      `${pathBase}.states.${stateId}.source_ports`
    );
    if (sourcePorts.length === 0 && stateRule.source_ports.length > 0) {
      continue;
    }

    states[stateId] = omitUndefined({
      id: stateRule.id,
      state: stateRule.state,
      title: stateRule.title,
      source_ports: sourcePorts,
      summary: stateRule.summary
    }) satisfies RuntimePackageCoordinationStateRule;
  }

  return omitUndefined({
    id: packageState.id,
    title: packageState.title,
    default_state: packageState.default_state,
    states
  });
}

function materializeSummaryOutputs(
  packageInstanceId: string,
  summaryOutputs: PackageCoordinationLike["summary_outputs"],
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageSummaryOutput> {
  const result: Record<string, RuntimePackageSummaryOutput> = {};

  for (const [summaryId, summary] of Object.entries(summaryOutputs ?? {})) {
    const source = qualifyChildEndpoint(packageInstanceId, summary.source);
    if (!hasRuntimePort(runtimePack, source.instance_id, source.port_id)) {
      diagnostics.push(error(
        "flatten_packages",
        "package_coordination.member.unresolved",
        `${pathBase}.${summaryId}.source`,
        `Package coordination summary source ${source.instance_id}.${source.port_id} cannot be resolved from flattened runtime instances.`
      ));
      continue;
    }

    result[summaryId] = omitUndefined({
      id: summary.id,
      title: summary.title,
      value_type: summary.value_type,
      source
    }) satisfies RuntimePackageSummaryOutput;
  }

  return result;
}

function materializeAggregateMonitors(
  packageInstanceId: string,
  entries: PackageCoordinationLike["aggregate_monitors"],
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageAggregateMonitor> {
  const result: Record<string, RuntimePackageAggregateMonitor> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const sourcePorts = materializeQualifiedSourcePorts(
      packageInstanceId,
      entry.source_ports,
      runtimePack,
      diagnostics,
      `${pathBase}.${entryId}.source_ports`
    );
    if (sourcePorts.length === 0 && entry.source_ports.length > 0) {
      continue;
    }

    result[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      kind: entry.kind,
      severity: entry.severity,
      source_ports: sourcePorts
    }) satisfies RuntimePackageAggregateMonitor;
  }

  return result;
}

function materializeTraceGroups(
  packageInstanceId: string,
  traceGroups: PackageCoordinationLike["trace_groups"],
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageTraceGroup> {
  const result: Record<string, RuntimePackageTraceGroup> = {};

  for (const [traceGroupId, traceGroup] of Object.entries(traceGroups ?? {})) {
    const signals = materializeQualifiedSourcePorts(
      packageInstanceId,
      traceGroup.signals,
      runtimePack,
      diagnostics,
      `${pathBase}.${traceGroupId}.signals`
    );
    if (signals.length === 0 && traceGroup.signals.length > 0) {
      continue;
    }

    result[traceGroupId] = omitUndefined({
      id: traceGroup.id,
      title: traceGroup.title,
      signals,
      sample_hint_ms: traceGroup.sample_hint_ms,
      chart_hint: traceGroup.chart_hint
    }) satisfies RuntimePackageTraceGroup;
  }

  return result;
}

function materializeOperationProxies(
  packageInstanceId: string,
  operationProxies: PackageCoordinationLike["operation_proxies"],
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageCoordinationOperationProxy> {
  const result: Record<string, RuntimePackageCoordinationOperationProxy> = {};

  for (const [proxyId, proxy] of Object.entries(operationProxies ?? {})) {
    const targetOwnerInstanceId = qualifyMemberId(packageInstanceId, proxy.target_member_id);
    const targetOperationId = `op_${targetOwnerInstanceId}_${proxy.target_operation_id}`;
    if (!runtimePack.operations[targetOperationId]) {
      diagnostics.push(error(
        "flatten_packages",
        "package_coordination.operation_proxy.target.unresolved",
        `${pathBase}.${proxyId}`,
        `Package coordination operation proxy cannot resolve flattened child operation ${targetOperationId}.`
      ));
      continue;
    }

    result[proxyId] = omitUndefined({
      id: proxy.id,
      title: proxy.title,
      kind: proxy.kind,
      target_operation_id: targetOperationId,
      target_owner_instance_id: targetOwnerInstanceId,
      child_operation_kind: proxy.child_operation_kind,
      ui_hint: proxy.ui_hint
    }) satisfies RuntimePackageCoordinationOperationProxy;
  }

  return result;
}

function materializeQualifiedSourcePorts(
  packageInstanceId: string,
  refs: Array<{ member_id: string; port_id: string }> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): RuntimeTraceSignalRef[] {
  const result: RuntimeTraceSignalRef[] = [];

  for (const [index, ref] of (refs ?? []).entries()) {
    const qualified = qualifyChildEndpoint(packageInstanceId, ref);
    if (!hasRuntimePort(runtimePack, qualified.instance_id, qualified.port_id)) {
      diagnostics.push(error(
        "flatten_packages",
        "package_coordination.member.unresolved",
        `${pathBase}[${index}]`,
        `Package coordination child source ${qualified.instance_id}.${qualified.port_id} cannot be resolved from flattened runtime instances.`
      ));
      continue;
    }

    result.push(qualified);
  }

  return result;
}

function qualifyChildEndpoint(
  packageInstanceId: string,
  ref: { member_id: string; port_id: string }
): RuntimeTraceSignalRef {
  return {
    instance_id: qualifyMemberId(packageInstanceId, ref.member_id),
    port_id: ref.port_id
  };
}

function qualifyMemberId(packageInstanceId: string, memberId: string): string {
  return `${packageInstanceId}__${memberId}`;
}

function hasRuntimePort(runtimePack: RuntimePack, instanceId: string, portId: string): boolean {
  return Boolean(runtimePack.instances[instanceId]?.ports?.[portId]);
}

function isNonEmpty<T>(value: Record<string, T>): boolean {
  return Object.keys(value).length > 0;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
