import type {
  ObjectInstance,
  ObjectType,
  ParamValue,
  ProjectModel
} from "@universal-plc/project-schema";
import type { MaterializerDiagnostic, MaterializerPhase } from "./types.js";
import { error } from "./diagnostics.js";

export interface TemplateResolutionResult {
  resolved_instance: ObjectInstance;
  diagnostics: MaterializerDiagnostic[];
  fatal: boolean;
}

export function resolveTemplateBackedInstance(
  project: ProjectModel,
  instance: ObjectInstance,
  objectType: ObjectType,
  phase: MaterializerPhase,
  pathBase: string
): TemplateResolutionResult {
  const diagnostics: MaterializerDiagnostic[] = [];
  if (!instance.template_ref) {
    return {
      resolved_instance: instance,
      diagnostics,
      fatal: false
    };
  }

  const template = project.definitions.templates?.[instance.template_ref];
  if (!template) {
    diagnostics.push(error(
      phase,
      "template.ref.unresolved",
      `${pathBase}.template_ref`,
      `Cannot resolve template_ref ${instance.template_ref}.`
    ));
    return {
      resolved_instance: stripTemplateRef(instance),
      diagnostics,
      fatal: true
    };
  }

  if (typeof template.base_type_ref !== "string" || template.base_type_ref.length === 0) {
    diagnostics.push(error(
      phase,
      "template.base_type_ref.missing",
      `$.definitions.templates.${template.id}.base_type_ref`,
      `Template ${template.id} is missing required base_type_ref.`
    ));
    return {
      resolved_instance: stripTemplateRef(instance),
      diagnostics,
      fatal: true
    };
  }

  if (template.base_type_ref !== instance.type_ref) {
    diagnostics.push(error(
      phase,
      "template.type_ref.mismatch",
      `${pathBase}.template_ref`,
      `Instance type_ref ${instance.type_ref} must match template base_type_ref ${template.base_type_ref}.`
    ));
    return {
      resolved_instance: stripTemplateRef(instance),
      diagnostics,
      fatal: true
    };
  }

  const paramDefs = objectType.interface?.params ?? {};
  const mergedParamValues: Record<string, ParamValue> = {};
  const templateParamValues = template.defaults.param_values ?? {};
  for (const [paramId, paramValue] of Object.entries(templateParamValues)) {
    if (!(paramId in paramDefs)) {
      diagnostics.push(error(
        phase,
        "template.param.unknown",
        `$.definitions.templates.${template.id}.defaults.param_values.${paramId}`,
        `Template ${template.id} references unknown param ${paramId} for type ${instance.type_ref}.`
      ));
      continue;
    }

    mergedParamValues[paramId] = paramValue;
  }

  for (const [paramId, paramValue] of Object.entries(instance.param_values ?? {})) {
    if (!(paramId in paramDefs)) {
      diagnostics.push(error(
        phase,
        "template.instance.override.invalid",
        `${pathBase}.param_values.${paramId}`,
        `Instance override ${paramId} is not defined on effective type ${instance.type_ref}.`
      ));
      continue;
    }

    mergedParamValues[paramId] = paramValue;
  }

  const mergedTags = {
    ...(template.defaults.tags ?? {}),
    ...(instance.tags ?? {})
  };

  return {
    resolved_instance: {
      ...stripTemplateRef(instance),
      ...(Object.keys(mergedParamValues).length > 0 ? { param_values: mergedParamValues } : {}),
      ...(Object.keys(mergedTags).length > 0 ? { tags: mergedTags } : {})
    },
    diagnostics,
    fatal: false
  };
}

function stripTemplateRef(instance: ObjectInstance): ObjectInstance {
  const { template_ref: _templateRef, ...rest } = instance;
  return rest;
}
