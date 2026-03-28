import type { ProjectModel } from "@universal-plc/project-schema";

export function buildLocalTypeRegistry(project: ProjectModel): Map<string, unknown> {
  const registry = new Map<string, unknown>();

  for (const [typeId, objectType] of Object.entries(project.definitions.object_types ?? {})) {
    registry.set(typeId, objectType);

    const meta = objectType && typeof objectType === "object"
      ? (objectType as unknown as Record<string, unknown>).meta
      : undefined;
    if (meta && typeof meta === "object") {
      const record = meta as Record<string, unknown>;
      if (record.origin === "library" && typeof record.library_id === "string") {
        registry.set(`library:${record.library_id}/${typeId}`, objectType);
      }
      if (record.origin === "imported") {
        registry.set(`imported:${typeId}`, objectType);
      }
    }
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

  if (typeRef.startsWith("library:")) {
    return registry.get(typeRef) as T | undefined;
  }

  if (typeRef.startsWith("imported:")) {
    return registry.get(typeRef) as T | undefined;
  }

  return undefined;
}
