import type { ProjectModel } from "@universal-plc/project-schema";
import type {
  RuntimePack,
  RuntimePackageAllowedModeTransition,
  RuntimePackageAllowedPhaseTransition,
  RuntimePackageModeDef,
  RuntimePackageModeGroup,
  RuntimePackageModePhase,
  RuntimePackageModeRuntimeContract,
  RuntimePackageModeSummaryEntry,
  RuntimePackagePhaseDef,
  RuntimePackagePhaseGroup,
  RuntimePackagePhaseSummaryEntry,
  RuntimePackageTraceGroup,
  RuntimeTraceSignalRef
} from "@universal-plc/runtime-pack-schema";
import { error } from "../diagnostics.js";
import type { MaterializerDiagnostic } from "../types.js";

type PackageModePhaseLike = {
  modes: Record<string, {
    id: string;
    title?: string;
    summary?: string;
    phase_refs?: string[];
  }>;
  phases: Record<string, {
    id: string;
    title?: string;
    summary?: string;
    source_ports: Array<{ member_id: string; port_id: string }>;
  }>;
  mode_summary: {
    id: string;
    title?: string;
    default_mode_ref?: string;
    entries: Record<string, {
      id: string;
      title?: string;
      mode_ref: string;
      source_ports: Array<{ member_id: string; port_id: string }>;
      summary?: string;
    }>;
  };
  phase_summary: {
    id: string;
    title?: string;
    default_phase_ref?: string;
    entries: Record<string, {
      id: string;
      title?: string;
      phase_ref: string;
      source_ports: Array<{ member_id: string; port_id: string }>;
      summary?: string;
    }>;
  };
  active_mode_ref: string;
  active_phase_ref: string;
  allowed_mode_transitions?: Record<string, {
    id: string;
    title?: string;
    intent: "request_mode_change";
    from_mode_ref?: string;
    to_mode_ref: string;
    guard_notes?: string[];
  }>;
  allowed_phase_transitions?: Record<string, {
    id: string;
    title?: string;
    intent: "request_phase_start" | "request_phase_abort";
    phase_ref: string;
    allowed_mode_refs?: string[];
    guard_notes?: string[];
  }>;
  package_mode_groups?: Record<string, {
    id: string;
    title?: string;
    mode_refs: string[];
    summary?: string;
  }>;
  package_phase_groups?: Record<string, {
    id: string;
    title?: string;
    phase_refs: string[];
    summary?: string;
  }>;
  trace_groups?: Record<string, {
    id: string;
    title?: string;
    signals: Array<{ member_id: string; port_id: string }>;
    sample_hint_ms?: number;
    chart_hint?: string;
  }>;
};

export function materializePackageModePhase(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  const materialized: Record<string, RuntimePackageModePhase> = {};

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    const modePhase = packageDefinition?.mode_phase as PackageModePhaseLike | undefined;
    if (!packageDefinition || !modePhase) {
      continue;
    }

    const runtimeModePhaseId = `pkgmode_${packageInstance.id}`;
    const packagePath = `$.definitions.packages.${packageDefinition.id}.mode_phase`;
    const qualifiedModeIds = new Map(
      Object.keys(modePhase.modes ?? {}).map((modeId) => [modeId, qualifyModeId(runtimeModePhaseId, modeId)])
    );
    const qualifiedPhaseIds = new Map(
      Object.keys(modePhase.phases ?? {}).map((phaseId) => [phaseId, qualifyPhaseId(runtimeModePhaseId, phaseId)])
    );

    const modes = materializeModes(
      runtimeModePhaseId,
      modePhase.modes,
      qualifiedPhaseIds,
      diagnostics,
      `${packagePath}.modes`
    );
    const phases = materializePhases(
      packageInstance.id,
      runtimeModePhaseId,
      modePhase.phases,
      runtimePack,
      diagnostics,
      `${packagePath}.phases`
    );
    const modeSummary = materializeModeSummary(
      packageInstance.id,
      runtimeModePhaseId,
      modePhase.mode_summary,
      qualifiedModeIds,
      runtimePack,
      diagnostics,
      `${packagePath}.mode_summary`
    );
    const phaseSummary = materializePhaseSummary(
      packageInstance.id,
      runtimeModePhaseId,
      modePhase.phase_summary,
      qualifiedPhaseIds,
      runtimePack,
      diagnostics,
      `${packagePath}.phase_summary`
    );
    const packageModeGroups = materializeModeGroups(
      modePhase.package_mode_groups,
      qualifiedModeIds,
      diagnostics,
      `${packagePath}.package_mode_groups`
    );
    const packagePhaseGroups = materializePhaseGroups(
      modePhase.package_phase_groups,
      qualifiedPhaseIds,
      diagnostics,
      `${packagePath}.package_phase_groups`
    );
    const allowedModeTransitions = materializeAllowedModeTransitions(
      modePhase.allowed_mode_transitions,
      qualifiedModeIds,
      diagnostics,
      `${packagePath}.allowed_mode_transitions`
    );
    const allowedPhaseTransitions = materializeAllowedPhaseTransitions(
      modePhase.allowed_phase_transitions,
      qualifiedModeIds,
      qualifiedPhaseIds,
      diagnostics,
      `${packagePath}.allowed_phase_transitions`
    );
    const traceGroups = materializeTraceGroups(
      packageInstance.id,
      modePhase.trace_groups,
      runtimePack,
      diagnostics,
      `${packagePath}.trace_groups`
    );

    const activeModeId = qualifiedModeIds.get(modePhase.active_mode_ref);
    if (!activeModeId) {
      diagnostics.push(error(
        "flatten_packages",
        "package_mode_phase.active_mode.unresolved",
        `${packagePath}.active_mode_ref`,
        `Package mode/phase cannot resolve active mode ref ${modePhase.active_mode_ref}.`
      ));
      continue;
    }

    const activePhaseId = qualifiedPhaseIds.get(modePhase.active_phase_ref);
    if (!activePhaseId) {
      diagnostics.push(error(
        "flatten_packages",
        "package_mode_phase.active_phase.unresolved",
        `${packagePath}.active_phase_ref`,
        `Package mode/phase cannot resolve active phase ref ${modePhase.active_phase_ref}.`
      ));
      continue;
    }

    materialized[runtimeModePhaseId] = omitUndefined({
      id: runtimeModePhaseId,
      package_instance_id: packageInstance.id,
      title: packageInstance.title ?? packageDefinition.meta.title,
      modes,
      phases,
      mode_summary: modeSummary,
      phase_summary: phaseSummary,
      active_mode_id: activeModeId,
      active_phase_id: activePhaseId,
      allowed_mode_transitions: isNonEmpty(allowedModeTransitions) ? allowedModeTransitions : undefined,
      allowed_phase_transitions: isNonEmpty(allowedPhaseTransitions) ? allowedPhaseTransitions : undefined,
      package_mode_groups: isNonEmpty(packageModeGroups) ? packageModeGroups : undefined,
      package_phase_groups: isNonEmpty(packagePhaseGroups) ? packagePhaseGroups : undefined,
      trace_groups: isNonEmpty(traceGroups) ? traceGroups : undefined,
      package_supervision_id: runtimePack.package_supervision?.[`pkg_${packageInstance.id}`] ? `pkg_${packageInstance.id}` : undefined,
      package_coordination_id: runtimePack.package_coordination?.[`pkgcoord_${packageInstance.id}`] ? `pkgcoord_${packageInstance.id}` : undefined
    }) satisfies RuntimePackageModePhase;
  }

  if (isNonEmpty(materialized)) {
    runtimePack.package_mode_runtime_contract = createPackageModeRuntimeContract();
    runtimePack.package_mode_phase = materialized;
  }
}

function createPackageModeRuntimeContract(): RuntimePackageModeRuntimeContract {
  return {
    package_mode_execution_supported: true,
    phase_transition_execution_supported: true,
    transition_guard_diagnostics_supported: true,
    supported_intents: [
      "request_mode_change",
      "request_phase_start",
      "request_phase_abort"
    ]
  };
}

function materializeModes(
  runtimeModePhaseId: string,
  modes: PackageModePhaseLike["modes"],
  qualifiedPhaseIds: Map<string, string>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageModeDef> {
  const result: Record<string, RuntimePackageModeDef> = {};

  for (const [modeId, mode] of Object.entries(modes ?? {})) {
    const phaseIds = (mode.phase_refs ?? [])
      .map((phaseRef, index) => {
        const qualified = qualifiedPhaseIds.get(phaseRef);
        if (!qualified) {
          diagnostics.push(error(
            "flatten_packages",
            "package_mode_phase.mode_phase_ref.unresolved",
            `${pathBase}.${modeId}.phase_refs[${index}]`,
            `Package mode ${modeId} references unknown phase ${phaseRef}.`
          ));
          return null;
        }
        return qualified;
      })
      .filter((entry): entry is string => entry !== null);

    result[modeId] = omitUndefined({
      id: mode.id,
      qualified_id: qualifyModeId(runtimeModePhaseId, mode.id),
      title: mode.title,
      summary: mode.summary,
      phase_ids: phaseIds.length > 0 ? phaseIds : undefined
    }) satisfies RuntimePackageModeDef;
  }

  return result;
}

function materializePhases(
  packageInstanceId: string,
  runtimeModePhaseId: string,
  phases: PackageModePhaseLike["phases"],
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackagePhaseDef> {
  const result: Record<string, RuntimePackagePhaseDef> = {};

  for (const [phaseId, phase] of Object.entries(phases ?? {})) {
    const sourcePorts = materializeQualifiedSourcePorts(
      packageInstanceId,
      phase.source_ports,
      runtimePack,
      diagnostics,
      `${pathBase}.${phaseId}.source_ports`
    );

    result[phaseId] = omitUndefined({
      id: phase.id,
      qualified_id: qualifyPhaseId(runtimeModePhaseId, phase.id),
      title: phase.title,
      summary: phase.summary,
      source_ports: sourcePorts
    }) satisfies RuntimePackagePhaseDef;
  }

  return result;
}

function materializeModeSummary(
  packageInstanceId: string,
  runtimeModePhaseId: string,
  modeSummary: PackageModePhaseLike["mode_summary"],
  qualifiedModeIds: Map<string, string>,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
) {
  const entries: Record<string, RuntimePackageModeSummaryEntry> = {};

  for (const [entryId, entry] of Object.entries(modeSummary.entries ?? {})) {
    const modeId = qualifiedModeIds.get(entry.mode_ref);
    if (!modeId) {
      diagnostics.push(error(
        "flatten_packages",
        "package_mode_phase.mode_summary.ref.unresolved",
        `${pathBase}.entries.${entryId}.mode_ref`,
        `Package mode summary entry ${entryId} references unknown mode ${entry.mode_ref}.`
      ));
      continue;
    }

    entries[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      mode_id: modeId,
      source_ports: materializeQualifiedSourcePorts(
        packageInstanceId,
        entry.source_ports,
        runtimePack,
        diagnostics,
        `${pathBase}.entries.${entryId}.source_ports`
      ),
      summary: entry.summary
    }) satisfies RuntimePackageModeSummaryEntry;
  }

  return omitUndefined({
    id: modeSummary.id,
    title: modeSummary.title,
    default_mode_id: modeSummary.default_mode_ref ? qualifiedModeIds.get(modeSummary.default_mode_ref) : undefined,
    entries
  });
}

function materializePhaseSummary(
  packageInstanceId: string,
  runtimeModePhaseId: string,
  phaseSummary: PackageModePhaseLike["phase_summary"],
  qualifiedPhaseIds: Map<string, string>,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
) {
  const entries: Record<string, RuntimePackagePhaseSummaryEntry> = {};

  for (const [entryId, entry] of Object.entries(phaseSummary.entries ?? {})) {
    const phaseId = qualifiedPhaseIds.get(entry.phase_ref);
    if (!phaseId) {
      diagnostics.push(error(
        "flatten_packages",
        "package_mode_phase.phase_summary.ref.unresolved",
        `${pathBase}.entries.${entryId}.phase_ref`,
        `Package phase summary entry ${entryId} references unknown phase ${entry.phase_ref}.`
      ));
      continue;
    }

    entries[entryId] = omitUndefined({
      id: entry.id,
      title: entry.title,
      phase_id: phaseId,
      source_ports: materializeQualifiedSourcePorts(
        packageInstanceId,
        entry.source_ports,
        runtimePack,
        diagnostics,
        `${pathBase}.entries.${entryId}.source_ports`
      ),
      summary: entry.summary
    }) satisfies RuntimePackagePhaseSummaryEntry;
  }

  return omitUndefined({
    id: phaseSummary.id,
    title: phaseSummary.title,
    default_phase_id: phaseSummary.default_phase_ref ? qualifiedPhaseIds.get(phaseSummary.default_phase_ref) : undefined,
    entries
  });
}

function materializeModeGroups(
  groups: PackageModePhaseLike["package_mode_groups"],
  qualifiedModeIds: Map<string, string>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageModeGroup> {
  const result: Record<string, RuntimePackageModeGroup> = {};

  for (const [groupId, group] of Object.entries(groups ?? {})) {
    const modeIds = group.mode_refs
      .map((modeRef, index) => {
        const qualified = qualifiedModeIds.get(modeRef);
        if (!qualified) {
          diagnostics.push(error(
            "flatten_packages",
            "package_mode_phase.mode_group.ref.unresolved",
            `${pathBase}.${groupId}.mode_refs[${index}]`,
            `Package mode group ${groupId} references unknown mode ${modeRef}.`
          ));
          return null;
        }
        return qualified;
      })
      .filter((entry): entry is string => entry !== null);

    result[groupId] = omitUndefined({
      id: group.id,
      title: group.title,
      mode_ids: modeIds,
      summary: group.summary
    }) satisfies RuntimePackageModeGroup;
  }

  return result;
}

function materializePhaseGroups(
  groups: PackageModePhaseLike["package_phase_groups"],
  qualifiedPhaseIds: Map<string, string>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackagePhaseGroup> {
  const result: Record<string, RuntimePackagePhaseGroup> = {};

  for (const [groupId, group] of Object.entries(groups ?? {})) {
    const phaseIds = group.phase_refs
      .map((phaseRef, index) => {
        const qualified = qualifiedPhaseIds.get(phaseRef);
        if (!qualified) {
          diagnostics.push(error(
            "flatten_packages",
            "package_mode_phase.phase_group.ref.unresolved",
            `${pathBase}.${groupId}.phase_refs[${index}]`,
            `Package phase group ${groupId} references unknown phase ${phaseRef}.`
          ));
          return null;
        }
        return qualified;
      })
      .filter((entry): entry is string => entry !== null);

    result[groupId] = omitUndefined({
      id: group.id,
      title: group.title,
      phase_ids: phaseIds,
      summary: group.summary
    }) satisfies RuntimePackagePhaseGroup;
  }

  return result;
}

function materializeAllowedModeTransitions(
  transitions: PackageModePhaseLike["allowed_mode_transitions"],
  qualifiedModeIds: Map<string, string>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageAllowedModeTransition> {
  const result: Record<string, RuntimePackageAllowedModeTransition> = {};

  for (const [transitionId, transition] of Object.entries(transitions ?? {})) {
    const guardState: RuntimePackageAllowedModeTransition["guard_state"] = "clear";
    const toModeId = qualifiedModeIds.get(transition.to_mode_ref);
    if (!toModeId) {
      diagnostics.push(error(
        "flatten_packages",
        "package_mode_phase.mode_transition.ref.unresolved",
        `${pathBase}.${transitionId}.to_mode_ref`,
        `Package mode transition ${transitionId} references unknown mode ${transition.to_mode_ref}.`
      ));
      continue;
    }

    const fromModeId = transition.from_mode_ref
      ? qualifiedModeIds.get(transition.from_mode_ref)
      : undefined;
    if (transition.from_mode_ref && !fromModeId) {
      diagnostics.push(error(
        "flatten_packages",
        "package_mode_phase.mode_transition.ref.unresolved",
        `${pathBase}.${transitionId}.from_mode_ref`,
        `Package mode transition ${transitionId} references unknown mode ${transition.from_mode_ref}.`
      ));
      continue;
    }

    result[transitionId] = omitUndefined({
      id: transition.id,
      title: transition.title,
      intent: transition.intent,
      from_mode_id: fromModeId,
      to_mode_id: toModeId,
      guard_state: guardState,
      guard_notes: transition.guard_notes
    }) satisfies RuntimePackageAllowedModeTransition;
  }

  return result;
}

function materializeAllowedPhaseTransitions(
  transitions: PackageModePhaseLike["allowed_phase_transitions"],
  qualifiedModeIds: Map<string, string>,
  qualifiedPhaseIds: Map<string, string>,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageAllowedPhaseTransition> {
  const result: Record<string, RuntimePackageAllowedPhaseTransition> = {};

  for (const [transitionId, transition] of Object.entries(transitions ?? {})) {
    const phaseState: RuntimePackageAllowedPhaseTransition["phase_state"] =
      transition.intent === "request_phase_abort" ? "running" : "ready";
    const transitionState: RuntimePackageAllowedPhaseTransition["transition_state"] =
      transition.intent === "request_phase_abort" ? "running" : "idle";
    const guardState: RuntimePackageAllowedPhaseTransition["guard_state"] =
      transition.intent === "request_phase_abort" ? "blocked" : "clear";
    const phaseId = qualifiedPhaseIds.get(transition.phase_ref);
    if (!phaseId) {
      diagnostics.push(error(
        "flatten_packages",
        "package_mode_phase.phase_transition.ref.unresolved",
        `${pathBase}.${transitionId}.phase_ref`,
        `Package phase transition ${transitionId} references unknown phase ${transition.phase_ref}.`
      ));
      continue;
    }

    const allowedModeIds = (transition.allowed_mode_refs ?? [])
      .map((modeRef, index) => {
        const qualifiedModeId = qualifiedModeIds.get(modeRef);
        if (!qualifiedModeId) {
          diagnostics.push(error(
            "flatten_packages",
            "package_mode_phase.phase_transition.mode_ref.unresolved",
            `${pathBase}.${transitionId}.allowed_mode_refs[${index}]`,
            `Package phase transition ${transitionId} references unknown mode ${modeRef}.`
          ));
          return null;
        }
        return qualifiedModeId;
      })
      .filter((entry): entry is string => entry !== null);

    result[transitionId] = omitUndefined({
      id: transition.id,
      title: transition.title,
      intent: transition.intent,
      phase_id: phaseId,
      allowed_mode_ids: allowedModeIds.length > 0 ? allowedModeIds : undefined,
      phase_state: phaseState,
      transition_state: transitionState,
      guard_state: guardState,
      guard_notes: transition.guard_notes
    }) satisfies RuntimePackageAllowedPhaseTransition;
  }

  return result;
}

function materializeTraceGroups(
  packageInstanceId: string,
  traceGroups: PackageModePhaseLike["trace_groups"],
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  pathBase: string
): Record<string, RuntimePackageTraceGroup> {
  const result: Record<string, RuntimePackageTraceGroup> = {};

  for (const [traceGroupId, traceGroup] of Object.entries(traceGroups ?? {})) {
    result[traceGroupId] = omitUndefined({
      id: traceGroup.id,
      title: traceGroup.title,
      signals: materializeQualifiedSourcePorts(
        packageInstanceId,
        traceGroup.signals,
        runtimePack,
        diagnostics,
        `${pathBase}.${traceGroupId}.signals`
      ),
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
        "package_mode_phase.member.unresolved",
        `${pathBase}[${index}]`,
        `Package mode/phase child source ${qualified.instance_id}.${qualified.port_id} cannot be resolved from flattened runtime instances.`
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

function qualifyModeId(runtimeModePhaseId: string, modeId: string): string {
  return `${runtimeModePhaseId}.mode.${modeId}`;
}

function qualifyPhaseId(runtimeModePhaseId: string, phaseId: string): string {
  return `${runtimeModePhaseId}.phase.${phaseId}`;
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
