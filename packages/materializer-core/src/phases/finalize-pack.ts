import type { RuntimePack } from "@universal-plc/runtime-pack-schema";
import type { ProjectModel } from "@universal-plc/project-schema";
import type { MaterializeOptions } from "../types.js";
import { defaultPackId } from "../helpers/ids.js";

export function createEmptyRuntimePack(project: ProjectModel, options: Required<MaterializeOptions>): RuntimePack {
  const projectId = project.meta?.project_id ?? "project";
  return {
    schema_version: "0.1.0",
    pack_id: options.pack_id || defaultPackId(projectId),
    source: {
      project_id: projectId,
      authoring_schema_version: project.schema_version,
      generated_at: options.generated_at || new Date().toISOString()
    },
    instances: {},
    connections: {},
    resources: {},
    operations: {},
    trace_groups: {}
  };
}
