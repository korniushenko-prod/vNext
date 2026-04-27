import {
  cloneProjectDocument,
  demoProjectSource,
  type UniversalPlcDemoProject,
  type UniversalPlcProjectDocument
} from "./demoProject";

export interface ProjectLoadResult {
  project: UniversalPlcDemoProject;
  source: "remote" | "bundled";
  path: string;
  error?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProjectDocument(value: unknown): value is UniversalPlcProjectDocument {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    Array.isArray(value.objects) &&
    Array.isArray(value.compositionLinks) &&
    Array.isArray(value.machines) &&
    Array.isArray(value.signals) &&
    Array.isArray(value.bindings) &&
    Array.isArray(value.blocks) &&
    isRecord(value.runtimeSnapshot)
  );
}

export function parseProjectDocument(document: unknown): UniversalPlcDemoProject {
  if (!isProjectDocument(document)) {
    throw new Error("Project document shape is invalid");
  }

  return cloneProjectDocument(document);
}

export async function loadProjectDocument(
  path = `${import.meta.env.BASE_URL}project.json`
): Promise<ProjectLoadResult> {
  try {
    const response = await fetch(path, {
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const document = (await response.json()) as unknown;
    return {
      project: parseProjectDocument(document),
      source: "remote",
      path
    };
  } catch (error) {
    return {
      project: cloneProjectDocument(demoProjectSource),
      source: "bundled",
      path,
      error: error instanceof Error ? error.message : "Unknown project loader error"
    };
  }
}
