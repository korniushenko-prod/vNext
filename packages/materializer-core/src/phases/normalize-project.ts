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
    hardware: {
      bindings: project.hardware?.bindings ?? {},
      ...(project.hardware?.catalog !== undefined ? { catalog: project.hardware.catalog } : {}),
      ...(project.hardware?.manifest !== undefined ? { manifest: project.hardware.manifest } : {})
    },
    views: project.views ?? { screens: {} },
    layouts: project.layouts ?? { system: {}, definitions: {} }
  };
}
