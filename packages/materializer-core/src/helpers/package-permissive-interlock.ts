import type { ProjectModel } from "@universal-plc/project-schema";
import type {
  RuntimePack,
  RuntimePackageAggregateMonitor,
  RuntimePackageGateSummary,
  RuntimePackageInterlock,
  RuntimePackagePermissive,
  RuntimePackagePermissiveInterlock,
  RuntimePackageSummaryOutput,
  RuntimePackageTraceGroup,
  RuntimePackageTransitionGuardRef,
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

type PackagePermissiveLike = {
  id: string;
  title?: string;
  source_ports: Array<{ member_id: string; port_id: string }>;
  summary?: string;
  blocked_reason_code?: string;
  diagnostic_ref?: string;
};

type PackageInterlockLike = {
  id: string;
  title?: string;
  source_ports: Array<{ member_id: string; port_id: string }>;
  active_state: "held" | "faulted";
  summary?: string;
  reason_code?: string;
  diagnostic_ref?: string;
};

type PackageGateSummaryLike = {
  id: string;
  title?: string;
  default_state?: "ready" | "blocked" | "held" | "faulted";
  permissive_refs?: string[];
  interlock_refs?: string[];
  transition_guards?: Record<string, {
    id: string;
    title?: string;
    permissive_refs?: string[];
    interlock_refs?: string[];
    mode_transition_ref?: string;
    phase_transition_ref?: string;
    summary?: string;
  }>;
};

export function materializePackagePermissiveInterlock(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  const materialized: Record<string, RuntimePackagePermissiveInterlock> = {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    const contract = packageDefinition?.permissive_interlock;
    if (!packageDefinition || !contract) {
      continue;
    }

    const runtimeGateId = `pkggate_${packageInstance.id}`;
    const packagePath = `$.definitions.packages.${packageDefinition.id}.permissive_interlock`;

    const permissives = materializePermissives(
      packageInstance.id,
      runtimeGateId,
      contract.permissives as Record<string, PackagePermissiveLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.permissives`
    );
    const interlocks = materializeInterlocks(
      packageInstance.id,
      runtimeGateId,
      contract.interlocks as Record<string, PackageInterlockLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.interlocks`
    );

    if (hasDuplicateGateIds(permissives, interlocks)) {
      diagnostics.push(error(
        "flatten_packages",
        "package_permissive_interlock.gate_id.duplicate",
        `${packagePath}.gate_summary`,
        `Package permissive/interlock ${runtimeGateId} contains duplicate gate ids across permissives and interlocks.`
      ));
      continue;
    }

    const gateSummary = materializeGateSummary(
      packageInstance.id,
      runtimeGateId,
      contract.gate_summary as PackageGateSummaryLike | undefined,
      permissives,
      interlocks,
      runtimePack,
      diagnostics,
      `${packagePath}.gate_summary`
    );
    if (!gateSummary) {
      continue;
    }

    const summaryOutputs = materializeSummaryOutputs(
      packageInstance.id,
      contract.summary_outputs as Record<string, PackageSummaryOutputLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.summary_outputs`
    );
    const aggregateMonitors = materializeAggregateMonitors(
      packageInstance.id,
      contract.aggregate_monitors as Record<string, PackageAggregateMonitorLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.aggregate_monitors`
    );
    const traceGroups = materializeTraceGroups(
      packageInstance.id,
      contract.trace_groups as Record<string, PackageTraceGroupLike> | undefined,
      runtimePack,
      diagnostics,
      `${packagePath}.trace_groups`
    );

    materialized[runtimeGateId] = omitUndefined({
      id: runtimeGateId,
      package_instance_id: packageInstance.id,
      title: packageInstance.title ?? packageDefinition.meta.title,
      permissives,
      interlocks,
      gate_summary: gateSummary,
      summary_outputs: isNonEmpty(summaryOutputs) ? summaryOutputs : undefined,
      aggregate_monitors: isNonEmpty(aggregateMonitors) ? aggregateMonitors : undefined,
      trace_groups: isNonEmpty(traceGroups) ? traceGroups : undefined
    }) satisfies RuntimePackagePermissiveInterlock;
  }

  if (isNonEmpty(materialized)) {
    runtimePack.package_permissive_interlock = materialized;
  }
}

function materializePermissives(
  packageInstanceId: string,
  runtimeGateId: string,
  entries: Record<string, PackagePermissiveLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackagePermissive> {
  const result: Record<string, RuntimePackagePermissive> = {};

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
      qualified_id: `${runtimeGateId}.perm.${entry.id}`,
      title: entry.title,
      source_ports: sourcePorts,
      summary: entry.summary,
      blocked_reason_code: entry.blocked_reason_code,
      diagnostic_ref: entry.diagnostic_ref
    }) satisfies RuntimePackagePermissive;
  }

  return result;
}

function materializeInterlocks(
  packageInstanceId: string,
  runtimeGateId: string,
  entries: Record<string, PackageInterlockLike> | undefined,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageInterlock> {
  const result: Record<string, RuntimePackageInterlock> = {};

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
      qualified_id: `${runtimeGateId}.int.${entry.id}`,
      title: entry.title,
      source_ports: sourcePorts,
      active_state: entry.active_state,
      summary: entry.summary,
      reason_code: entry.reason_code,
      diagnostic_ref: entry.diagnostic_ref
    }) satisfies RuntimePackageInterlock;
  }

  return result;
}

function materializeGateSummary(
  packageInstanceId: string,
  runtimeGateId: string,
  gateSummary: PackageGateSummaryLike | undefined,
  permissives: Record<string, RuntimePackagePermissive>,
  interlocks: Record<string, RuntimePackageInterlock>,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): RuntimePackageGateSummary | null {
  if (!gateSummary) {
    diagnostics.push(error(
      "flatten_packages",
      "package_permissive_interlock.gate_summary.missing",
      pathBase,
      "Package permissive/interlock contract requires a gate_summary block."
    ));
    return null;
  }

  const permissiveIds = (gateSummary.permissive_refs ?? [])
    .map((permissiveRef, index) => {
      const permissive = permissives[permissiveRef];
      if (!permissive) {
        diagnostics.push(error(
          "flatten_packages",
          "package_permissive_interlock.permissive_ref.unresolved",
          `${pathBase}.permissive_refs[${index}]`,
          `Package gate summary cannot resolve permissive ref ${permissiveRef}.`
        ));
        return null;
      }
      return permissive.qualified_id;
    })
    .filter((entry): entry is string => entry !== null);

  const interlockIds = (gateSummary.interlock_refs ?? [])
    .map((interlockRef, index) => {
      const interlock = interlocks[interlockRef];
      if (!interlock) {
        diagnostics.push(error(
          "flatten_packages",
          "package_permissive_interlock.interlock_ref.unresolved",
          `${pathBase}.interlock_refs[${index}]`,
          `Package gate summary cannot resolve interlock ref ${interlockRef}.`
        ));
        return null;
      }
      return interlock.qualified_id;
    })
    .filter((entry): entry is string => entry !== null);

  const transitionGuards = materializeTransitionGuards(
    packageInstanceId,
    runtimeGateId,
    gateSummary.transition_guards,
    permissives,
    interlocks,
    runtimePack,
    diagnostics,
    `${pathBase}.transition_guards`
  );

  return omitUndefined({
    id: gateSummary.id,
    title: gateSummary.title,
    default_state: gateSummary.default_state,
    permissive_ids: permissiveIds.length > 0 ? permissiveIds : undefined,
    interlock_ids: interlockIds.length > 0 ? interlockIds : undefined,
    transition_guards: isNonEmpty(transitionGuards) ? transitionGuards : undefined
  }) satisfies RuntimePackageGateSummary;
}

function materializeTransitionGuards(
  packageInstanceId: string,
  runtimeGateId: string,
  guards: PackageGateSummaryLike["transition_guards"],
  permissives: Record<string, RuntimePackagePermissive>,
  interlocks: Record<string, RuntimePackageInterlock>,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageTransitionGuardRef> {
  const result: Record<string, RuntimePackageTransitionGuardRef> = {};

  for (const [guardId, guard] of Object.entries(guards ?? {})) {
    const permissiveIds = (guard.permissive_refs ?? [])
      .map((permissiveRef, index) => {
        const permissive = permissives[permissiveRef];
        if (!permissive) {
          diagnostics.push(error(
            "flatten_packages",
            "package_permissive_interlock.guard_ref.unresolved",
            `${pathBase}.${guardId}.permissive_refs[${index}]`,
            `Package transition guard ${guardId} cannot resolve permissive ref ${permissiveRef}.`
          ));
          return null;
        }
        return permissive.qualified_id;
      })
      .filter((entry): entry is string => entry !== null);

    const interlockIds = (guard.interlock_refs ?? [])
      .map((interlockRef, index) => {
        const interlock = interlocks[interlockRef];
        if (!interlock) {
          diagnostics.push(error(
            "flatten_packages",
            "package_permissive_interlock.guard_ref.unresolved",
            `${pathBase}.${guardId}.interlock_refs[${index}]`,
            `Package transition guard ${guardId} cannot resolve interlock ref ${interlockRef}.`
          ));
          return null;
        }
        return interlock.qualified_id;
      })
      .filter((entry): entry is string => entry !== null);

    const modeTransitionRef = typeof guard.mode_transition_ref === "string"
      ? guard.mode_transition_ref
      : undefined;
    const phaseTransitionRef = typeof guard.phase_transition_ref === "string"
      ? guard.phase_transition_ref
      : undefined;

    const modeTransitionId = modeTransitionRef
      ? qualifyModeTransitionId(packageInstanceId, modeTransitionRef)
      : undefined;
    const phaseTransitionId = phaseTransitionRef
      ? qualifyPhaseTransitionId(packageInstanceId, phaseTransitionRef)
      : undefined;

    if (modeTransitionRef && modeTransitionId && !runtimePack.package_mode_phase?.[`pkgmode_${packageInstanceId}`]?.allowed_mode_transitions?.[modeTransitionRef]) {
      diagnostics.push(error(
        "flatten_packages",
        "package_permissive_interlock.transition_guard.target.unresolved",
        `${pathBase}.${guardId}.mode_transition_ref`,
        `Package transition guard ${guardId} cannot resolve mode transition ${modeTransitionRef}.`
      ));
      continue;
    }

    if (phaseTransitionRef && phaseTransitionId && !runtimePack.package_mode_phase?.[`pkgmode_${packageInstanceId}`]?.allowed_phase_transitions?.[phaseTransitionRef]) {
      diagnostics.push(error(
        "flatten_packages",
        "package_permissive_interlock.transition_guard.target.unresolved",
        `${pathBase}.${guardId}.phase_transition_ref`,
        `Package transition guard ${guardId} cannot resolve phase transition ${phaseTransitionRef}.`
      ));
      continue;
    }

    result[guardId] = omitUndefined({
      id: guard.id,
      qualified_id: `${runtimeGateId}.guard.${guard.id}`,
      title: guard.title,
      permissive_ids: permissiveIds.length > 0 ? permissiveIds : undefined,
      interlock_ids: interlockIds.length > 0 ? interlockIds : undefined,
      mode_transition_id: modeTransitionId,
      phase_transition_id: phaseTransitionId,
      summary: guard.summary
    }) satisfies RuntimePackageTransitionGuardRef;
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
        "package_permissive_interlock.member.unresolved",
        `${pathBase}.${summaryId}.source`,
        `Package permissive/interlock summary source ${source.instance_id}.${source.port_id} cannot be resolved from flattened runtime instances.`
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
        "package_permissive_interlock.member.unresolved",
        `${pathBase}[${index}]`,
        `Package permissive/interlock child source ${qualified.instance_id}.${qualified.port_id} cannot be resolved from flattened runtime instances.`
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
    instance_id: `${packageInstanceId}__${ref.member_id}`,
    port_id: ref.port_id
  };
}

function qualifyModeTransitionId(packageInstanceId: string, transitionId: string): string {
  return `pkgmode_${packageInstanceId}.mode_transition.${transitionId}`;
}

function qualifyPhaseTransitionId(packageInstanceId: string, transitionId: string): string {
  return `pkgmode_${packageInstanceId}.phase_transition.${transitionId}`;
}

function hasRuntimePort(runtimePack: RuntimePack, instanceId: string, portId: string): boolean {
  return Boolean(runtimePack.instances[instanceId]?.ports?.[portId]);
}

function hasDuplicateGateIds(
  permissives: Record<string, RuntimePackagePermissive>,
  interlocks: Record<string, RuntimePackageInterlock>
): boolean {
  const ids = new Set<string>();
  for (const id of Object.keys(permissives)) {
    ids.add(id);
  }
  for (const id of Object.keys(interlocks)) {
    if (ids.has(id)) {
      return true;
    }
  }
  return false;
}

function isNonEmpty<T>(value: Record<string, T>): boolean {
  return Object.keys(value).length > 0;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
