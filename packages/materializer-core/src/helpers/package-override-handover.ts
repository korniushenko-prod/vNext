import type { ProjectModel } from "@universal-plc/project-schema";
import type {
  RuntimePack,
  RuntimePackageAggregateMonitor,
  RuntimePackageAuthorityHolder,
  RuntimePackageHandoverRequest,
  RuntimePackageHandoverSummary,
  RuntimePackageOverrideHandover,
  RuntimePackageSummaryOutput,
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

type PackageTraceGroupLike = {
  id: string;
  title?: string;
  signals: Array<{ member_id: string; port_id: string }>;
  sample_hint_ms?: number;
  chart_hint?: string;
};

type PackageAuthorityHolderLike = {
  id: string;
  title?: string;
  lane: "auto" | "manual" | "service" | "remote";
  source_ports: Array<{ member_id: string; port_id: string }>;
  summary?: string;
};

type PackageHandoverSummaryLike = {
  id: string;
  title?: string;
  current_holder_ref: string;
  current_lane: "auto" | "manual" | "service" | "remote";
  requested_holder_ref?: string;
  accepted_request_refs?: string[];
  blocked_request_refs?: string[];
  denied_request_refs?: string[];
  last_handover_reason?: string;
  summary?: string;
};

type PackageHandoverRequestLike = {
  id: string;
  title?: string;
  request_kind: "request_takeover" | "request_release" | "request_return_to_auto";
  requested_holder_ref: string;
  state: "accepted" | "blocked" | "denied" | "unsupported";
  summary?: string;
  request_preview?: string;
  blocked_reason?: "blocked_by_policy" | "held_by_other_owner" | "not_available";
  denied_reason?: "blocked_by_policy" | "held_by_other_owner" | "not_available";
};

type PackageOverrideHandoverLike = {
  authority_holders: Record<string, PackageAuthorityHolderLike>;
  handover_summary: PackageHandoverSummaryLike;
  handover_requests: Record<string, PackageHandoverRequestLike>;
  summary_outputs?: Record<string, PackageSummaryOutputLike>;
  aggregate_monitors?: Record<string, PackageAggregateMonitorLike>;
  trace_groups?: Record<string, PackageTraceGroupLike>;
};

export function materializePackageOverrideHandover(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  const materialized: Record<string, RuntimePackageOverrideHandover> = {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    const overrideHandover = packageDefinition?.override_handover as PackageOverrideHandoverLike | undefined;
    if (!packageDefinition || !overrideHandover) {
      continue;
    }

    const runtimeEntryId = `pkgho_${packageInstance.id}`;
    const packagePath = `$.definitions.packages.${packageDefinition.id}.override_handover`;

    const authorityHolders = materializeAuthorityHolders(
      packageInstance.id,
      overrideHandover.authority_holders,
      runtimePack,
      diagnostics,
      `${packagePath}.authority_holders`
    );
    const handoverRequests = materializeHandoverRequests(
      overrideHandover.handover_requests,
      authorityHolders,
      diagnostics,
      `${packagePath}.handover_requests`
    );
    const handoverSummary = materializeHandoverSummary(
      overrideHandover.handover_summary,
      authorityHolders,
      handoverRequests,
      diagnostics,
      `${packagePath}.handover_summary`
    );
    if (!handoverSummary) {
      continue;
    }

    const summaryOutputs = materializeSummaryOutputs(
      packageInstance.id,
      overrideHandover.summary_outputs,
      runtimePack,
      diagnostics,
      `${packagePath}.summary_outputs`
    );
    const aggregateMonitors = materializeAggregateMonitors(
      packageInstance.id,
      overrideHandover.aggregate_monitors,
      runtimePack,
      diagnostics,
      `${packagePath}.aggregate_monitors`
    );
    const traceGroups = materializeTraceGroups(
      packageInstance.id,
      overrideHandover.trace_groups,
      runtimePack,
      diagnostics,
      `${packagePath}.trace_groups`
    );

    materialized[runtimeEntryId] = omitUndefined({
      id: runtimeEntryId,
      package_instance_id: packageInstance.id,
      title: packageInstance.title ?? packageDefinition.meta.title,
      authority_holders: authorityHolders,
      handover_summary: handoverSummary,
      handover_requests: handoverRequests,
      summary_outputs: isNonEmpty(summaryOutputs) ? summaryOutputs : undefined,
      aggregate_monitors: isNonEmpty(aggregateMonitors) ? aggregateMonitors : undefined,
      trace_groups: isNonEmpty(traceGroups) ? traceGroups : undefined
    }) satisfies RuntimePackageOverrideHandover;
  }

  if (isNonEmpty(materialized)) {
    runtimePack.package_override_handover = materialized;
  }
}

function materializeAuthorityHolders(
  packageInstanceId: string,
  entries: Record<string, PackageAuthorityHolderLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageAuthorityHolder> {
  const result: Record<string, RuntimePackageAuthorityHolder> = {};

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
      lane: entry.lane,
      source_ports: sourcePorts,
      summary: entry.summary
    }) satisfies RuntimePackageAuthorityHolder;
  }

  return result;
}

function materializeHandoverRequests(
  entries: Record<string, PackageHandoverRequestLike> | undefined,
  authorityHolders: Record<string, RuntimePackageAuthorityHolder>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageHandoverRequest> {
  const result: Record<string, RuntimePackageHandoverRequest> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const requestedHolder = authorityHolders[entry.requested_holder_ref];
    if (!requestedHolder) {
      diagnostics.push(error(
        "flatten_packages",
        "package_override_handover.requested_holder_ref.unresolved",
        `${pathBase}.${entryId}.requested_holder_ref`,
        `Package handover request ${entryId} cannot resolve requested holder ref ${entry.requested_holder_ref}.`
      ));
      continue;
    }

    result[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      request_kind: entry.request_kind,
      requested_holder_id: requestedHolder.id,
      requested_lane: requestedHolder.lane,
      state: entry.state,
      summary: entry.summary,
      request_preview: entry.request_preview,
      blocked_reason: entry.blocked_reason,
      denied_reason: entry.denied_reason
    }) satisfies RuntimePackageHandoverRequest;
  }

  return result;
}

function materializeHandoverSummary(
  summary: PackageHandoverSummaryLike | undefined,
  authorityHolders: Record<string, RuntimePackageAuthorityHolder>,
  handoverRequests: Record<string, RuntimePackageHandoverRequest>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): RuntimePackageHandoverSummary | null {
  if (!summary) {
    diagnostics.push(error(
      "flatten_packages",
      "package_override_handover.handover_summary.missing",
      pathBase,
      "Package override/handover contract requires a handover_summary block."
    ));
    return null;
  }

  const currentHolder = authorityHolders[summary.current_holder_ref];
  if (!currentHolder) {
    diagnostics.push(error(
      "flatten_packages",
      "package_override_handover.current_holder_ref.unresolved",
      `${pathBase}.current_holder_ref`,
      `Package override/handover summary cannot resolve current holder ref ${summary.current_holder_ref}.`
    ));
    return null;
  }

  if (currentHolder.lane !== summary.current_lane) {
    diagnostics.push(error(
      "flatten_packages",
      "package_override_handover.current_holder_lane.mismatch",
      `${pathBase}.current_lane`,
      `Package override/handover summary current_lane ${summary.current_lane} must match current holder lane ${currentHolder.lane}.`
    ));
  }

  const requestedHolderId = summary.requested_holder_ref
    ? resolveHolderRef(summary.requested_holder_ref, authorityHolders, diagnostics, `${pathBase}.requested_holder_ref`)
    : undefined;
  const acceptedRequestIds = resolveEntryRefs(
    summary.accepted_request_refs,
    handoverRequests,
    diagnostics,
    `${pathBase}.accepted_request_refs`,
    "package_override_handover.request_ref.unresolved",
    "handover request"
  );
  const blockedRequestIds = resolveEntryRefs(
    summary.blocked_request_refs,
    handoverRequests,
    diagnostics,
    `${pathBase}.blocked_request_refs`,
    "package_override_handover.request_ref.unresolved",
    "handover request"
  );
  const deniedRequestIds = resolveEntryRefs(
    summary.denied_request_refs,
    handoverRequests,
    diagnostics,
    `${pathBase}.denied_request_refs`,
    "package_override_handover.request_ref.unresolved",
    "handover request"
  );

  return omitUndefined({
    id: summary.id,
    title: summary.title,
    current_holder_id: currentHolder.id,
    current_lane: currentHolder.lane,
    requested_holder_id: requestedHolderId,
    accepted_request_ids: acceptedRequestIds.length > 0 ? acceptedRequestIds : undefined,
    blocked_request_ids: blockedRequestIds.length > 0 ? blockedRequestIds : undefined,
    denied_request_ids: deniedRequestIds.length > 0 ? deniedRequestIds : undefined,
    last_handover_reason: summary.last_handover_reason,
    summary: summary.summary
  }) satisfies RuntimePackageHandoverSummary;
}

function materializeSummaryOutputs(
  packageInstanceId: string,
  entries: Record<string, PackageSummaryOutputLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageSummaryOutput> {
  const result: Record<string, RuntimePackageSummaryOutput> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const source = qualifyChildEndpoint(packageInstanceId, entry.source);
    if (!hasRuntimePort(runtimePack, source.instance_id, source.port_id)) {
      diagnostics.push(error(
        "flatten_packages",
        "package_override_handover.member.unresolved",
        `${pathBase}.${entryId}.source`,
        `Package override/handover summary source ${source.instance_id}.${source.port_id} cannot be resolved from flattened runtime instances.`
      ));
      continue;
    }

    result[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      value_type: entry.value_type,
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

function materializeTraceGroups(
  packageInstanceId: string,
  entries: Record<string, PackageTraceGroupLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageTraceGroup> {
  const result: Record<string, RuntimePackageTraceGroup> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const signals = materializeQualifiedSourcePorts(
      packageInstanceId,
      entry.signals,
      runtimePack,
      diagnostics,
      `${pathBase}.${entryId}.signals`
    );
    if (signals.length === 0 && entry.signals.length > 0) {
      continue;
    }

    result[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      signals,
      sample_hint_ms: entry.sample_hint_ms,
      chart_hint: entry.chart_hint
    }) satisfies RuntimePackageTraceGroup;
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
        "package_override_handover.member.unresolved",
        `${pathBase}[${index}]`,
        `Package override/handover child source ${qualified.instance_id}.${qualified.port_id} cannot be resolved from flattened runtime instances.`
      ));
      continue;
    }

    result.push(qualified);
  }

  return result;
}

function resolveHolderRef(
  ref: string,
  entries: Record<string, RuntimePackageAuthorityHolder>,
  diagnostics: MaterializerDiagnostic[],
  path: string
): string | undefined {
  const entry = entries[ref];
  if (!entry) {
    diagnostics.push(error(
      "flatten_packages",
      "package_override_handover.requested_holder_ref.unresolved",
      path,
      `Package override/handover summary cannot resolve holder ref ${ref}.`
    ));
    return undefined;
  }
  return entry.id;
}

function resolveEntryRefs<T extends { id: string }>(
  refs: string[] | undefined,
  entries: Record<string, T>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string,
  code: string,
  label: string
): string[] {
  return (refs ?? [])
    .map((ref, index) => {
      const entry = entries[ref];
      if (!entry) {
        diagnostics.push(error(
          "flatten_packages",
          code,
          `${pathBase}[${index}]`,
          `Package override/handover summary cannot resolve ${label} ref ${ref}.`
        ));
        return null;
      }
      return entry.id;
    })
    .filter((entry): entry is string => entry !== null);
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
