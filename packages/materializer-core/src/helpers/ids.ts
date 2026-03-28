export function qualifyInstanceId(parentRuntimeInstanceId: string, localInstanceId: string): string {
  return `${parentRuntimeInstanceId}.${localInstanceId}`;
}

export function systemConnectionId(signalId: string, targetId: string): string {
  return `conn_${signalId}_${targetId}`;
}

export function compositionConnectionId(ownerRuntimeInstanceId: string, routeId: string): string {
  return `${ownerRuntimeInstanceId}::${routeId}`;
}

export function defaultPackId(projectId: string): string {
  return `${projectId}-runtime-pack`;
}
