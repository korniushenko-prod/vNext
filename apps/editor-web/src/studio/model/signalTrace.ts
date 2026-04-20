import type { IoBindingDefinition, SignalDefinition, UniversalPlcDemoProject } from "./demoProject";

export interface SignalTraceResult {
  signal: SignalDefinition | null;
  upstream: SignalDefinition[];
  bindings: IoBindingDefinition[];
  downstream: SignalDefinition[];
}

export function getSignalById(project: UniversalPlcDemoProject, signalId: string) {
  return project.signals.find((signal) => signal.id === signalId) ?? null;
}

export function getBindingById(project: UniversalPlcDemoProject, bindingId: string) {
  return project.bindings.find((binding) => binding.id === bindingId) ?? null;
}

function collectUpstream(project: UniversalPlcDemoProject, signal: SignalDefinition, visited: Set<string>, acc: SignalDefinition[]) {
  for (const parentId of signal.derivedFromSignalIds ?? []) {
    if (visited.has(parentId)) {
      continue;
    }
    visited.add(parentId);
    const parent = getSignalById(project, parentId);
    if (!parent) {
      continue;
    }
    collectUpstream(project, parent, visited, acc);
    acc.push(parent);
  }
}

export function getDirectDerivedSignals(project: UniversalPlcDemoProject, signalId: string) {
  return project.signals.filter((candidate) => candidate.derivedFromSignalIds?.includes(signalId));
}

export function buildSignalTrace(project: UniversalPlcDemoProject, signalId: string): SignalTraceResult {
  const signal = getSignalById(project, signalId);
  if (!signal) {
    return {
      signal: null,
      upstream: [],
      bindings: [],
      downstream: []
    };
  }

  const upstream: SignalDefinition[] = [];
  collectUpstream(project, signal, new Set<string>(), upstream);

  const bindingIds = new Set<string>();
  [...upstream, signal].forEach((item) => {
    (item.sourceBindingIds ?? []).forEach((bindingId) => bindingIds.add(bindingId));
  });

  return {
    signal,
    upstream,
    bindings: [...bindingIds]
      .map((bindingId) => getBindingById(project, bindingId))
      .filter((binding): binding is IoBindingDefinition => Boolean(binding)),
    downstream: getDirectDerivedSignals(project, signal.id)
  };
}
