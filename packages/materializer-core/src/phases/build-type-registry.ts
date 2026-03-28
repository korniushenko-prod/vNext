import type { ProjectModel } from "@universal-plc/project-schema";

export function buildLocalTypeRegistry(project: ProjectModel): Map<string, unknown> {
  const registry = new Map<string, unknown>();

  for (const [typeId, objectType] of Object.entries(project.definitions.object_types ?? {})) {
    registry.set(typeId, objectType);
  }

  return registry;
}

export function resolveLocalTypeRef<T = unknown>(
  registry: Map<string, unknown>,
  typeRef: string
): T | undefined {
  if (typeRef.startsWith("project:")) {
    return registry.get(typeRef.slice("project:".length)) as T | undefined;
  }

  if (typeRef.startsWith("generated:")) {
    return registry.get(typeRef.slice("generated:".length)) as T | undefined;
  }

  return undefined;
}
