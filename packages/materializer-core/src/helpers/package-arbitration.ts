import type { ProjectModel } from "@universal-plc/project-schema";
import type {
  RuntimePack,
  RuntimePackageAggregateMonitor,
  RuntimePackageArbitration,
  RuntimePackageCommandLane,
  RuntimePackageCommandSummary,
  RuntimePackageOwnershipLaneDef,
  RuntimePackageOwnershipSummary,
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

type PackageOwnershipLaneLike = {
  id: string;
  title?: string;
  lane: "auto" | "manual" | "service" | "remote";
  source_ports: Array<{ member_id: string; port_id: string }>;
  summary?: string;
};

type PackageOwnershipSummaryLike = {
  id: string;
  title?: string;
  active_lane_refs?: string[];
  summary?: string;
};

type PackageCommandLaneLike = {
  id: string;
  title?: string;
  request_kind: "request_start" | "request_stop" | "request_reset" | "request_enable" | "request_disable";
  ownership_lane_ref: string;
  target_member_id: string;
  arbitration_result: "accepted" | "blocked" | "denied" | "superseded" | "unsupported";
  summary?: string;
  request_preview?: string;
  blocked_reason?: string;
  denied_reason?: string;
  superseded_by_lane_ref?: string;
};

type PackageCommandSummaryLike = {
  id: string;
  title?: string;
  active_owner_lane_refs?: string[];
  accepted_lane_refs?: string[];
  blocked_lane_refs?: string[];
  denied_lane_refs?: string[];
  superseded_lane_refs?: string[];
  summary?: string;
};

type PackageArbitrationLike = {
  ownership_lanes: Record<string, PackageOwnershipLaneLike>;
  ownership_summary: PackageOwnershipSummaryLike;
  command_lanes: Record<string, PackageCommandLaneLike>;
  command_summary: PackageCommandSummaryLike;
  summary_outputs?: Record<string, PackageSummaryOutputLike>;
  aggregate_monitors?: Record<string, PackageAggregateMonitorLike>;
  trace_groups?: Record<string, PackageTraceGroupLike>;
};

export function materializePackageArbitration(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  const materialized: Record<string, RuntimePackageArbitration> = {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    const arbitration = packageDefinition?.arbitration as PackageArbitrationLike | undefined;
    if (!packageDefinition || !arbitration) {
      continue;
    }

    const runtimeArbitrationId = `pkgarb_${packageInstance.id}`;
    const packagePath = `$.definitions.packages.${packageDefinition.id}.arbitration`;

    const ownershipLanes = materializeOwnershipLanes(
      packageInstance.id,
      arbitration.ownership_lanes,
      runtimePack,
      diagnostics,
      `${packagePath}.ownership_lanes`
    );
    const ownershipSummary = materializeOwnershipSummary(
      arbitration.ownership_summary,
      ownershipLanes,
      diagnostics,
      `${packagePath}.ownership_summary`
    );
    if (!ownershipSummary) {
      continue;
    }

    const commandLanes = materializeCommandLanes(
      packageInstance.id,
      arbitration.command_lanes,
      ownershipLanes,
      runtimePack,
      diagnostics,
      `${packagePath}.command_lanes`
    );
    const commandSummary = materializeCommandSummary(
      arbitration.command_summary,
      ownershipLanes,
      commandLanes,
      diagnostics,
      `${packagePath}.command_summary`
    );
    if (!commandSummary) {
      continue;
    }

    const summaryOutputs = materializeSummaryOutputs(
      packageInstance.id,
      arbitration.summary_outputs,
      runtimePack,
      diagnostics,
      `${packagePath}.summary_outputs`
    );
    const aggregateMonitors = materializeAggregateMonitors(
      packageInstance.id,
      arbitration.aggregate_monitors,
      runtimePack,
      diagnostics,
      `${packagePath}.aggregate_monitors`
    );
    const traceGroups = materializeTraceGroups(
      packageInstance.id,
      arbitration.trace_groups,
      runtimePack,
      diagnostics,
      `${packagePath}.trace_groups`
    );

    materialized[runtimeArbitrationId] = omitUndefined({
      id: runtimeArbitrationId,
      package_instance_id: packageInstance.id,
      title: packageInstance.title ?? packageDefinition.meta.title,
      ownership_lanes: ownershipLanes,
      ownership_summary: ownershipSummary,
      command_lanes: commandLanes,
      command_summary: commandSummary,
      summary_outputs: isNonEmpty(summaryOutputs) ? summaryOutputs : undefined,
      aggregate_monitors: isNonEmpty(aggregateMonitors) ? aggregateMonitors : undefined,
      trace_groups: isNonEmpty(traceGroups) ? traceGroups : undefined
    }) satisfies RuntimePackageArbitration;
  }

  if (isNonEmpty(materialized)) {
    runtimePack.package_arbitration = materialized;
  }
}

function materializeOwnershipLanes(
  packageInstanceId: string,
  entries: Record<string, PackageOwnershipLaneLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageOwnershipLaneDef> {
  const result: Record<string, RuntimePackageOwnershipLaneDef> = {};

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
    }) satisfies RuntimePackageOwnershipLaneDef;
  }

  return result;
}

function materializeOwnershipSummary(
  summary: PackageOwnershipSummaryLike | undefined,
  ownershipLanes: Record<string, RuntimePackageOwnershipLaneDef>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): RuntimePackageOwnershipSummary | null {
  if (!summary) {
    diagnostics.push(error(
      "flatten_packages",
      "package_arbitration.ownership_summary.missing",
      pathBase,
      "Package arbitration contract requires an ownership_summary block."
    ));
    return null;
  }

  const activeLaneIds = (summary.active_lane_refs ?? [])
    .map((laneRef, index) => {
      const lane = ownershipLanes[laneRef];
      if (!lane) {
        diagnostics.push(error(
          "flatten_packages",
          "package_arbitration.ownership_lane_ref.unresolved",
          `${pathBase}.active_lane_refs[${index}]`,
          `Package arbitration ownership summary cannot resolve ownership lane ref ${laneRef}.`
        ));
        return null;
      }
      return lane.id;
    })
    .filter((entry): entry is string => entry !== null);

  return omitUndefined({
    id: summary.id,
    title: summary.title,
    active_lane_ids: activeLaneIds.length > 0 ? activeLaneIds : undefined,
    summary: summary.summary
  }) satisfies RuntimePackageOwnershipSummary;
}

function materializeCommandLanes(
  packageInstanceId: string,
  entries: Record<string, PackageCommandLaneLike> | undefined,
  ownershipLanes: Record<string, RuntimePackageOwnershipLaneDef>,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageCommandLane> {
  const result: Record<string, RuntimePackageCommandLane> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const ownershipLane = ownershipLanes[entry.ownership_lane_ref];
    if (!ownershipLane) {
      diagnostics.push(error(
        "flatten_packages",
        "package_arbitration.ownership_lane_ref.unresolved",
        `${pathBase}.${entryId}.ownership_lane_ref`,
        `Package arbitration command lane ${entryId} cannot resolve ownership lane ref ${entry.ownership_lane_ref}.`
      ));
      continue;
    }

    const targetInstanceId = qualifyMemberId(packageInstanceId, entry.target_member_id);
    if (!runtimePack.instances[targetInstanceId]) {
      diagnostics.push(error(
        "flatten_packages",
        "package_arbitration.member.unresolved",
        `${pathBase}.${entryId}.target_member_id`,
        `Package arbitration command lane ${entryId} cannot resolve flattened child instance ${targetInstanceId}.`
      ));
      continue;
    }

    result[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      request_kind: entry.request_kind,
      ownership_lane_id: ownershipLane.id,
      ownership_lane: ownershipLane.lane,
      target_instance_id: targetInstanceId,
      arbitration_result: entry.arbitration_result,
      summary: entry.summary,
      request_preview: entry.request_preview,
      blocked_reason: entry.blocked_reason,
      denied_reason: entry.denied_reason,
      superseded_by_lane_id: entry.superseded_by_lane_ref
    }) satisfies RuntimePackageCommandLane;
  }

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    if (entry.arbitration_result !== "superseded" || !entry.superseded_by_lane_ref) {
      continue;
    }
    const runtimeEntry = result[entryId];
    const supersededByLane = result[entry.superseded_by_lane_ref];
    if (!runtimeEntry || !supersededByLane) {
      diagnostics.push(error(
        "flatten_packages",
        "package_arbitration.superseded_ref.unresolved",
        `${pathBase}.${entryId}.superseded_by_lane_ref`,
        `Package arbitration command lane ${entryId} cannot resolve superseded lane ref ${entry.superseded_by_lane_ref}.`
      ));
      if (runtimeEntry) {
        delete runtimeEntry.superseded_by_lane_id;
      }
      continue;
    }

    runtimeEntry.superseded_by_lane_id = supersededByLane.id;
  }

  return result;
}

function materializeCommandSummary(
  summary: PackageCommandSummaryLike | undefined,
  ownershipLanes: Record<string, RuntimePackageOwnershipLaneDef>,
  commandLanes: Record<string, RuntimePackageCommandLane>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): RuntimePackageCommandSummary | null {
  if (!summary) {
    diagnostics.push(error(
      "flatten_packages",
      "package_arbitration.command_summary.missing",
      pathBase,
      "Package arbitration contract requires a command_summary block."
    ));
    return null;
  }

  const activeOwnerLaneIds = resolveLaneRefs(
    summary.active_owner_lane_refs,
    ownershipLanes,
    diagnostics,
    `${pathBase}.active_owner_lane_refs`,
    "package_arbitration.ownership_lane_ref.unresolved",
    "ownership lane"
  );
  const acceptedLaneIds = resolveLaneRefs(
    summary.accepted_lane_refs,
    commandLanes,
    diagnostics,
    `${pathBase}.accepted_lane_refs`,
    "package_arbitration.command_lane_ref.unresolved",
    "command lane"
  );
  const blockedLaneIds = resolveLaneRefs(
    summary.blocked_lane_refs,
    commandLanes,
    diagnostics,
    `${pathBase}.blocked_lane_refs`,
    "package_arbitration.command_lane_ref.unresolved",
    "command lane"
  );
  const deniedLaneIds = resolveLaneRefs(
    summary.denied_lane_refs,
    commandLanes,
    diagnostics,
    `${pathBase}.denied_lane_refs`,
    "package_arbitration.command_lane_ref.unresolved",
    "command lane"
  );
  const supersededLaneIds = resolveLaneRefs(
    summary.superseded_lane_refs,
    commandLanes,
    diagnostics,
    `${pathBase}.superseded_lane_refs`,
    "package_arbitration.command_lane_ref.unresolved",
    "command lane"
  );

  return omitUndefined({
    id: summary.id,
    title: summary.title,
    active_owner_lane_ids: activeOwnerLaneIds.length > 0 ? activeOwnerLaneIds : undefined,
    accepted_lane_ids: acceptedLaneIds.length > 0 ? acceptedLaneIds : undefined,
    blocked_lane_ids: blockedLaneIds.length > 0 ? blockedLaneIds : undefined,
    denied_lane_ids: deniedLaneIds.length > 0 ? deniedLaneIds : undefined,
    superseded_lane_ids: supersededLaneIds.length > 0 ? supersededLaneIds : undefined,
    summary: summary.summary
  }) satisfies RuntimePackageCommandSummary;
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
        "package_arbitration.member.unresolved",
        `${pathBase}.${entryId}.source`,
        `Package arbitration summary source ${source.instance_id}.${source.port_id} cannot be resolved from flattened runtime instances.`
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
        "package_arbitration.member.unresolved",
        `${pathBase}[${index}]`,
        `Package arbitration child source ${qualified.instance_id}.${qualified.port_id} cannot be resolved from flattened runtime instances.`
      ));
      continue;
    }

    result.push(qualified);
  }

  return result;
}

function resolveLaneRefs<T extends { id: string }>(
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
          `Package arbitration summary cannot resolve ${label} ref ${ref}.`
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
