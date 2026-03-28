import type { ProjectModel } from "@universal-plc/project-schema";

export function normalizeProject(project: ProjectModel): ProjectModel {
  return {
    ...project,
    imports: project.imports ?? { libraries: [], packages: [] },
    definitions: {
      object_types: project.definitions?.object_types ?? {}
    },
    system: {
      instances: project.system?.instances ?? {},
      signals: project.system?.signals ?? {}
    },
    hardware: project.hardware ?? { bindings: {} },
    views: project.views ?? { screens: {} },
    layouts: project.layouts ?? { system: {}, definitions: {} }
  };
}
