import type { ProjectModel } from "@universal-plc/project-schema";
import type {
  RuntimePack,
  RuntimePackageAggregateAlarm,
  RuntimePackageAggregateMonitor,
  RuntimePackageOperationProxy,
  RuntimePackageSummaryOutput,
  RuntimePackageSupervision,
  RuntimePackageTraceGroup,
  RuntimeTraceSignalRef
} from "@universal-plc/runtime-pack-schema";
import { error } from "../diagnostics.js";
import type { MaterializerDiagnostic } from "../types.js";

type PackageSummaryOutputLike = {
  id: string;
  title?: string;
  value_type: string;
  source: { member_id: string; port_id: string };
};

type PackageAggregateMonitorLike = {
  id: string;
  title?: string;
  kind: string;
  severity?: string;
  source_ports: Array<{ member_id: string; port_id: string }>;
};

type PackageAggregateAlarmLike = {
  id: string;
  title?: string;
  severity?: string;
  source_ports: Array<{ member_id: string; port_id: string }>;
};

type PackageTraceGroupLike = {
  id: string;
  title?: string;
  signals: Array<{ member_id: string; port_id: string }>;
  sample_hint_ms?: number;
  chart_hint?: string;
};

type PackageOperationProxyLike = {
  id: string;
  title?: string;
  target_member_id: string;
  target_operation_id: string;
  child_operation_kind?: string;
  ui_hint?: string;
};

export function materializePackageSupervision(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  const materialized: Record<string, RuntimePackageSupervision> = {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    const supervision = packageDefinition?.supervision;
    if (!packageDefinition || !supervision) {
      continue;
    }

    const runtimeSupervisionId = `pkg_${packageInstance.id}`;
    const packagePath = `$.definitions.packages.${packageDefinition.id}.supervision`;

    const summaryOutputs = materializeSummaryOutputs(
      packageInstance.id,
      supervision.summary_outputs as Record<string, PackageSummaryOutputLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.summary_outputs`
    );
    const aggregateMonitors = materializeAggregateMonitors(
      packageInstance.id,
      supervision.aggregate_monitors as Record<string, PackageAggregateMonitorLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.aggregate_monitors`
    );
    const aggregateAlarms = materializeAggregateAlarms(
      packageInstance.id,
      supervision.aggregate_alarms as Record<string, PackageAggregateAlarmLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.aggregate_alarms`
    );
    const traceGroups = materializeTraceGroups(
      packageInstance.id,
      supervision.trace_groups as Record<string, PackageTraceGroupLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.trace_groups`
    );
    const operationProxies = materializeOperationProxies(
      packageInstance.id,
      supervision.operation_proxies as Record<string, PackageOperationProxyLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.operation_proxies`
    );

    materialized[runtimeSupervisionId] = omitUndefined({
      id: runtimeSupervisionId,
      package_instance_id: packageInstance.id,
      title: packageInstance.title ?? packageDefinition.meta.title,
      summary_outputs: isNonEmpty(summaryOutputs) ? summaryOutputs : undefined,
      aggregate_monitors: isNonEmpty(aggregateMonitors) ? aggregateMonitors : undefined,
      aggregate_alarms: isNonEmpty(aggregateAlarms) ? aggregateAlarms : undefined,
      trace_groups: isNonEmpty(traceGroups) ? traceGroups : undefined,
      operation_proxies: isNonEmpty(operationProxies) ? operationProxies : undefined
    }) satisfies RuntimePackageSupervision;
  }

  if (isNonEmpty(materialized)) {
    runtimePack.package_supervision = materialized;
  }
}

function materializeSummaryOutputs(
  packageInstanceId: string,
  summaryOutputs: Record<string, PackageSummaryOutputLike> | undefined,
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
        "package_supervision.member.unresolved",
        `${pathBase}.${summaryId}.source`,
        `Package supervision summary source ${source.instance_id}.${source.port_id} cannot be resolved from flattened runtime instances.`
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
  entries: Record<string, PackageAggregateMonitorLike> | undefined,
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

function materializeAggregateAlarms(
  packageInstanceId: string,
  entries: Record<string, PackageAggregateAlarmLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageAggregateAlarm> {
  const result: Record<string, RuntimePackageAggregateAlarm> = {};

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
      severity: entry.severity,
      source_ports: sourcePorts
    }) satisfies RuntimePackageAggregateAlarm;
  }

  return result;
}

function materializeTraceGroups(
  packageInstanceId: string,
  traceGroups: Record<string, PackageTraceGroupLike> | undefined,
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
  operationProxies: Record<string, PackageOperationProxyLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageOperationProxy> {
  const result: Record<string, RuntimePackageOperationProxy> = {};

  for (const [proxyId, proxy] of Object.entries(operationProxies ?? {})) {
    const targetOwnerInstanceId = qualifyMemberId(packageInstanceId, proxy.target_member_id);
    const targetOperationId = `op_${targetOwnerInstanceId}_${proxy.target_operation_id}`;
    if (!runtimePack.operations[targetOperationId]) {
      diagnostics.push(error(
        "flatten_packages",
        "package_operation_proxy.target.unresolved",
        `${pathBase}.${proxyId}`,
        `Package supervision operation proxy cannot resolve flattened child operation ${targetOperationId}.`
      ));
      continue;
    }

    result[proxyId] = omitUndefined({
      id: proxy.id,
      title: proxy.title,
      target_operation_id: targetOperationId,
      target_owner_instance_id: targetOwnerInstanceId,
      child_operation_kind: proxy.child_operation_kind,
      ui_hint: proxy.ui_hint
    }) satisfies RuntimePackageOperationProxy;
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
        "package_supervision.member.unresolved",
        `${pathBase}[${index}]`,
        `Package supervision child source ${qualified.instance_id}.${qualified.port_id} cannot be resolved from flattened runtime instances.`
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
