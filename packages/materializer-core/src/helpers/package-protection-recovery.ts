import type { ProjectModel } from "@universal-plc/project-schema";
import type {
  RuntimePack,
  RuntimePackageAggregateMonitor,
  RuntimePackageInhibit,
  RuntimePackageProtectionDiagnosticSummary,
  RuntimePackageProtectionRecovery,
  RuntimePackageProtectionSummary,
  RuntimePackageRecoveryRequest,
  RuntimePackageSummaryOutput,
  RuntimePackageTraceGroup,
  RuntimePackageTrip,
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

type PackageTripLike = {
  id: string;
  title?: string;
  source_ports: Array<{ member_id: string; port_id: string }>;
  latching?: boolean;
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
};

type PackageInhibitLike = {
  id: string;
  title?: string;
  source_ports: Array<{ member_id: string; port_id: string }>;
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
};

type PackageProtectionSummaryLike = {
  id: string;
  title?: string;
  default_state?: "ready" | "blocked" | "tripped" | "recovering";
  trip_refs?: string[];
  inhibit_refs?: string[];
  recovery_request_refs?: string[];
  diagnostic_summaries?: Record<string, {
    id: string;
    title?: string;
    trip_refs?: string[];
    inhibit_refs?: string[];
    summary?: string;
  }>;
};

type PackageRecoveryRequestLike = {
  id: string;
  title?: string;
  kind: string;
  target_member_id: string;
  target_operation_id: string;
  confirmation_policy?: "none" | "required";
  blocked_by_trip_refs?: string[];
  blocked_by_inhibit_refs?: string[];
  summary?: string;
};

export function materializePackageProtectionRecovery(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  const materialized: Record<string, RuntimePackageProtectionRecovery> = {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    const protectionRecovery = packageDefinition?.protection_recovery;
    if (!packageDefinition || !protectionRecovery) {
      continue;
    }

    const runtimeProtectionId = `pkgprotect_${packageInstance.id}`;
    const packagePath = `$.definitions.packages.${packageDefinition.id}.protection_recovery`;

    const trips = materializeTrips(
      packageInstance.id,
      runtimeProtectionId,
      protectionRecovery.trips as Record<string, PackageTripLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.trips`
    );
    const inhibits = materializeInhibits(
      packageInstance.id,
      runtimeProtectionId,
      protectionRecovery.inhibits as Record<string, PackageInhibitLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.inhibits`
    );
    const recoveryRequests = materializeRecoveryRequests(
      packageInstance.id,
      protectionRecovery.recovery_requests as Record<string, PackageRecoveryRequestLike> | undefined,
      trips,
      inhibits,
      runtimePack,
      diagnostics,
      `${packagePath}.recovery_requests`
    );
    const protectionSummary = materializeProtectionSummary(
      protectionRecovery.protection_summary as PackageProtectionSummaryLike | undefined,
      trips,
      inhibits,
      recoveryRequests,
      diagnostics,
      `${packagePath}.protection_summary`
    );
    if (!protectionSummary) {
      continue;
    }

    const summaryOutputs = materializeSummaryOutputs(
      packageInstance.id,
      protectionRecovery.summary_outputs as Record<string, PackageSummaryOutputLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.summary_outputs`
    );
    const aggregateMonitors = materializeAggregateMonitors(
      packageInstance.id,
      protectionRecovery.aggregate_monitors as Record<string, PackageAggregateMonitorLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.aggregate_monitors`
    );
    const traceGroups = materializeTraceGroups(
      packageInstance.id,
      protectionRecovery.trace_groups as Record<string, PackageTraceGroupLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.trace_groups`
    );

    materialized[runtimeProtectionId] = omitUndefined({
      id: runtimeProtectionId,
      package_instance_id: packageInstance.id,
      title: packageInstance.title ?? packageDefinition.meta.title,
      trips,
      inhibits,
      protection_summary: protectionSummary,
      recovery_requests: isNonEmpty(recoveryRequests) ? recoveryRequests : undefined,
      summary_outputs: isNonEmpty(summaryOutputs) ? summaryOutputs : undefined,
      aggregate_monitors: isNonEmpty(aggregateMonitors) ? aggregateMonitors : undefined,
      trace_groups: isNonEmpty(traceGroups) ? traceGroups : undefined
    }) satisfies RuntimePackageProtectionRecovery;
  }

  if (isNonEmpty(materialized)) {
    runtimePack.package_protection_recovery = materialized;
  }
}

function materializeTrips(
  packageInstanceId: string,
  runtimeProtectionId: string,
  entries: Record<string, PackageTripLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageTrip> {
  const result: Record<string, RuntimePackageTrip> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const sourcePorts = materializeQualifiedSourcePorts(
      packageInstanceId,
      entry.source_ports,
      runtimePack,
      diagnostics,
      `${pathBase}.${entryId}.source_ports`,
      "package_protection_recovery.member.unresolved"
    );
    if (sourcePorts.length === 0 && entry.source_ports.length > 0) {
      continue;
    }

    result[entryId] = omitUndefined({
      id: entry.id,
      qualified_id: `${runtimeProtectionId}.trip.${entry.id}`,
      title: entry.title,
      source_ports: sourcePorts,
      latching: entry.latching,
      summary: entry.summary,
      reason_code: entry.reason_code,
      diagnostic_ref: entry.diagnostic_ref
    }) satisfies RuntimePackageTrip;
  }

  return result;
}

function materializeInhibits(
  packageInstanceId: string,
  runtimeProtectionId: string,
  entries: Record<string, PackageInhibitLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageInhibit> {
  const result: Record<string, RuntimePackageInhibit> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const sourcePorts = materializeQualifiedSourcePorts(
      packageInstanceId,
      entry.source_ports,
      runtimePack,
      diagnostics,
      `${pathBase}.${entryId}.source_ports`,
      "package_protection_recovery.member.unresolved"
    );
    if (sourcePorts.length === 0 && entry.source_ports.length > 0) {
      continue;
    }

    result[entryId] = omitUndefined({
      id: entry.id,
      qualified_id: `${runtimeProtectionId}.inhibit.${entry.id}`,
      title: entry.title,
      source_ports: sourcePorts,
      summary: entry.summary,
      reason_code: entry.reason_code,
      diagnostic_ref: entry.diagnostic_ref
    }) satisfies RuntimePackageInhibit;
  }

  return result;
}

function materializeProtectionSummary(
  summary: PackageProtectionSummaryLike | undefined,
  trips: Record<string, RuntimePackageTrip>,
  inhibits: Record<string, RuntimePackageInhibit>,
  recoveryRequests: Record<string, RuntimePackageRecoveryRequest>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): RuntimePackageProtectionSummary | null {
  if (!summary) {
    diagnostics.push(error(
      "flatten_packages",
      "package_protection_recovery.summary.missing",
      pathBase,
      "Package protection/recovery contract requires a protection_summary block."
    ));
    return null;
  }

  const tripIds = (summary.trip_refs ?? [])
    .map((tripRef, index) => {
      const trip = trips[tripRef];
      if (!trip) {
        diagnostics.push(error(
          "flatten_packages",
          "package_protection_recovery.trip_ref.unresolved",
          `${pathBase}.trip_refs[${index}]`,
          `Package protection summary cannot resolve trip ref ${tripRef}.`
        ));
        return null;
      }
      return trip.qualified_id;
    })
    .filter((entry): entry is string => entry !== null);

  const inhibitIds = (summary.inhibit_refs ?? [])
    .map((inhibitRef, index) => {
      const inhibit = inhibits[inhibitRef];
      if (!inhibit) {
        diagnostics.push(error(
          "flatten_packages",
          "package_protection_recovery.inhibit_ref.unresolved",
          `${pathBase}.inhibit_refs[${index}]`,
          `Package protection summary cannot resolve inhibit ref ${inhibitRef}.`
        ));
        return null;
      }
      return inhibit.qualified_id;
    })
    .filter((entry): entry is string => entry !== null);

  const recoveryRequestIds = (summary.recovery_request_refs ?? [])
    .map((requestRef, index) => {
      const request = recoveryRequests[requestRef];
      if (!request) {
        diagnostics.push(error(
          "flatten_packages",
          "package_protection_recovery.recovery_request_ref.unresolved",
          `${pathBase}.recovery_request_refs[${index}]`,
          `Package protection summary cannot resolve recovery request ref ${requestRef}.`
        ));
        return null;
      }
      return request.id;
    })
    .filter((entry): entry is string => entry !== null);

  const diagnosticSummaries = materializeDiagnosticSummaries(
    summary.diagnostic_summaries,
    trips,
    inhibits,
    diagnostics,
    `${pathBase}.diagnostic_summaries`
  );

  return omitUndefined({
    id: summary.id,
    title: summary.title,
    default_state: summary.default_state,
    trip_ids: tripIds.length > 0 ? tripIds : undefined,
    inhibit_ids: inhibitIds.length > 0 ? inhibitIds : undefined,
    recovery_request_ids: recoveryRequestIds.length > 0 ? recoveryRequestIds : undefined,
    diagnostic_summaries: isNonEmpty(diagnosticSummaries) ? diagnosticSummaries : undefined
  }) satisfies RuntimePackageProtectionSummary;
}

function materializeDiagnosticSummaries(
  entries: PackageProtectionSummaryLike["diagnostic_summaries"],
  trips: Record<string, RuntimePackageTrip>,
  inhibits: Record<string, RuntimePackageInhibit>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageProtectionDiagnosticSummary> {
  const result: Record<string, RuntimePackageProtectionDiagnosticSummary> = {};

  for (const [summaryId, summary] of Object.entries(entries ?? {})) {
    const tripIds = (summary.trip_refs ?? [])
      .map((tripRef, index) => {
        const trip = trips[tripRef];
        if (!trip) {
          diagnostics.push(error(
            "flatten_packages",
            "package_protection_recovery.diagnostic_ref.unresolved",
            `${pathBase}.${summaryId}.trip_refs[${index}]`,
            `Package protection diagnostic summary ${summaryId} cannot resolve trip ref ${tripRef}.`
          ));
          return null;
        }
        return trip.qualified_id;
      })
      .filter((entry): entry is string => entry !== null);

    const inhibitIds = (summary.inhibit_refs ?? [])
      .map((inhibitRef, index) => {
        const inhibit = inhibits[inhibitRef];
        if (!inhibit) {
          diagnostics.push(error(
            "flatten_packages",
            "package_protection_recovery.diagnostic_ref.unresolved",
            `${pathBase}.${summaryId}.inhibit_refs[${index}]`,
            `Package protection diagnostic summary ${summaryId} cannot resolve inhibit ref ${inhibitRef}.`
          ));
          return null;
        }
        return inhibit.qualified_id;
      })
      .filter((entry): entry is string => entry !== null);

    result[summaryId] = omitUndefined({
      id: summary.id,
      title: summary.title,
      trip_ids: tripIds.length > 0 ? tripIds : undefined,
      inhibit_ids: inhibitIds.length > 0 ? inhibitIds : undefined,
      summary: summary.summary
    }) satisfies RuntimePackageProtectionDiagnosticSummary;
  }

  return result;
}

function materializeRecoveryRequests(
  packageInstanceId: string,
  entries: Record<string, PackageRecoveryRequestLike> | undefined,
  trips: Record<string, RuntimePackageTrip>,
  inhibits: Record<string, RuntimePackageInhibit>,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageRecoveryRequest> {
  const result: Record<string, RuntimePackageRecoveryRequest> = {};

  for (const [entryId, entry] of Object.entries(entries ?? {})) {
    const targetOwnerInstanceId = qualifyMemberId(packageInstanceId, entry.target_member_id);
    const targetOperationId = `op_${targetOwnerInstanceId}_${entry.target_operation_id}`;
    if (!runtimePack.operations[targetOperationId]) {
      diagnostics.push(error(
        "flatten_packages",
        "package_protection_recovery.recovery_request.target.unresolved",
        `${pathBase}.${entryId}.target_operation_id`,
        `Package protection/recovery request cannot resolve flattened child operation ${targetOperationId}.`
      ));
      continue;
    }

    const blockedByTripIds = (entry.blocked_by_trip_refs ?? [])
      .map((tripRef, index) => {
        const trip = trips[tripRef];
        if (!trip) {
          diagnostics.push(error(
            "flatten_packages",
            "package_protection_recovery.trip_ref.unresolved",
            `${pathBase}.${entryId}.blocked_by_trip_refs[${index}]`,
            `Package recovery request ${entryId} cannot resolve trip ref ${tripRef}.`
          ));
          return null;
        }
        return trip.qualified_id;
      })
      .filter((value): value is string => value !== null);

    const blockedByInhibitIds = (entry.blocked_by_inhibit_refs ?? [])
      .map((inhibitRef, index) => {
        const inhibit = inhibits[inhibitRef];
        if (!inhibit) {
          diagnostics.push(error(
            "flatten_packages",
            "package_protection_recovery.inhibit_ref.unresolved",
            `${pathBase}.${entryId}.blocked_by_inhibit_refs[${index}]`,
            `Package recovery request ${entryId} cannot resolve inhibit ref ${inhibitRef}.`
          ));
          return null;
        }
        return inhibit.qualified_id;
      })
      .filter((value): value is string => value !== null);

    result[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      kind: entry.kind,
      target_operation_id: targetOperationId,
      target_owner_instance_id: targetOwnerInstanceId,
      confirmation_policy: entry.confirmation_policy,
      blocked_by_trip_ids: blockedByTripIds.length > 0 ? blockedByTripIds : undefined,
      blocked_by_inhibit_ids: blockedByInhibitIds.length > 0 ? blockedByInhibitIds : undefined,
      summary: entry.summary
    }) satisfies RuntimePackageRecoveryRequest;
  }

  return result;
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
        "package_protection_recovery.member.unresolved",
        `${pathBase}.${summaryId}.source`,
        `Package protection/recovery summary source ${source.instance_id}.${source.port_id} cannot be resolved from flattened runtime instances.`
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
      `${pathBase}.${entryId}.source_ports`,
      "package_protection_recovery.member.unresolved"
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
      `${pathBase}.${traceGroupId}.signals`,
      "package_protection_recovery.member.unresolved"
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

function materializeQualifiedSourcePorts(
  packageInstanceId: string,
  refs: Array<{ member_id: string; port_id: string }> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string,
  unresolvedCode: string
): RuntimeTraceSignalRef[] {
  const result: RuntimeTraceSignalRef[] = [];

  for (const [index, ref] of (refs ?? []).entries()) {
    const qualified = qualifyChildEndpoint(packageInstanceId, ref);
    if (!hasRuntimePort(runtimePack, qualified.instance_id, qualified.port_id)) {
      diagnostics.push(error(
        "flatten_packages",
        unresolvedCode,
        `${pathBase}[${index}]`,
        `Package protection/recovery child source ${qualified.instance_id}.${qualified.port_id} cannot be resolved from flattened runtime instances.`
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
