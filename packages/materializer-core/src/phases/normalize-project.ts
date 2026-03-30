import type { ProjectModel } from "@universal-plc/project-schema";

export function normalizeProject(project: ProjectModel): ProjectModel {
  return {
    ...project,
    imports: project.imports ?? { libraries: [], packages: [] },
    definitions: {
      object_types: project.definitions?.object_types ?? {},
      templates: project.definitions?.templates ?? {},
      packages: project.definitions?.packages ?? {}
    },
    system: {
      instances: project.system?.instances ?? {},
      signals: project.system?.signals ?? {},
      packages: project.system?.packages ?? {}
    },
    hardware: project.hardware ?? { bindings: {} },
    views: project.views ?? { screens: {} },
    layouts: project.layouts ?? { system: {}, definitions: {} }
  };
}
