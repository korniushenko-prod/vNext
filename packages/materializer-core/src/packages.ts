import type {
  ObjectInstance,
  PackageDefinition,
  PackageInstance,
  PackageMemberDefaults,
  PackageMemberOverride,
  ParamValue,
  ProjectModel,
  SystemSignal
} from "@universal-plc/project-schema";

export function flattenPackageInstances(project: ProjectModel): ProjectModel {
  const packageDefinitions = project.definitions.packages ?? {};
  const packageInstances = project.system.packages ?? {};
  if (Object.keys(packageInstances).length === 0) {
    return project;
  }

  const flattenedInstances: Record<string, ObjectInstance> = {
    ...(project.system.instances ?? {})
  };
  const flattenedSignals: Record<string, SystemSignal> = {
    ...(project.system.signals ?? {})
  };

  for (const packageInstance of Object.values(packageInstances)) {
    const packageDefinition = packageDefinitions[packageInstance.package_ref];
    if (!packageDefinition) {
      continue;
    }

    const presetDefaults = packageInstance.preset_ref && packageDefinition.presets?.[packageInstance.preset_ref]
      ? packageDefinition.presets[packageInstance.preset_ref].member_defaults ?? {}
      : {};

    for (const member of Object.values(packageDefinition.members ?? {})) {
      const flattenedInstanceId = qualifyPackageMemberId(packageInstance.id, member.id);
      const memberOverride = packageInstance.member_overrides?.[member.id];
      const memberPresetDefaults = presetDefaults[member.id];

      const mergedParamValues = mergeParamValues(
        mergeParamValues(member.defaults?.param_values, memberPresetDefaults?.param_values),
        mergeParamValues(member.param_values, memberOverride?.param_values)
      );
      const mergedTags = mergeStringMaps(
        member.defaults?.tags,
        memberPresetDefaults?.tags,
        member.tags,
        memberOverride?.tags,
        packageInstance.tags
      );

      flattenedInstances[flattenedInstanceId] = {
        id: flattenedInstanceId,
        kind: "object_instance",
        type_ref: member.type_ref,
        ...(memberOverride?.template_ref || member.template_ref
          ? { template_ref: memberOverride?.template_ref ?? member.template_ref }
          : {}),
        ...(buildFlattenedMemberTitle(packageInstance, member, memberOverride)
          ? { title: buildFlattenedMemberTitle(packageInstance, member, memberOverride) }
          : {}),
        enabled: packageInstance.enabled === false
          ? false
          : memberOverride?.enabled ?? member.enabled ?? true,
        ...(Object.keys(mergedParamValues).length > 0 ? { param_values: mergedParamValues } : {}),
        ...(Object.keys(mergedTags).length > 0 ? { tags: mergedTags } : {})
      };
    }

    for (const signal of Object.values(packageDefinition.signals ?? {})) {
      const qualifiedSignalId = qualifyPackageSignalId(packageInstance.id, signal.id);
      flattenedSignals[qualifiedSignalId] = {
        id: qualifiedSignalId,
        title: signal.title,
        source: {
          instance_id: qualifyPackageMemberId(packageInstance.id, signal.source.instance_id),
          port_id: signal.source.port_id
        },
        targets: Object.fromEntries(
          Object.entries(signal.targets ?? {}).map(([targetId, target]) => [
            targetId,
            {
              instance_id: qualifyPackageMemberId(packageInstance.id, target.instance_id),
              port_id: target.port_id
            }
          ])
        )
      };
    }
  }

  return {
    ...project,
    system: {
      ...project.system,
      instances: flattenedInstances,
      signals: flattenedSignals,
      packages: project.system.packages ?? {}
    }
  };
}

function buildFlattenedMemberTitle(
  packageInstance: PackageInstance,
  member: PackageDefinition["members"][string],
  memberOverride?: PackageMemberOverride
): string | undefined {
  const memberTitle = memberOverride?.title ?? member.title;
  if (!memberTitle) {
    return undefined;
  }

  const packageTitle = packageInstance.title ?? packageInstance.id;
  return `${packageTitle} / ${memberTitle}`;
}

function mergeParamValues(
  base: Record<string, ParamValue> | undefined,
  override: Record<string, ParamValue> | undefined
): Record<string, ParamValue> {
  return {
    ...(base ?? {}),
    ...(override ?? {})
  };
}

function mergeStringMaps(
  ...maps: Array<Record<string, string> | undefined>
): Record<string, string> {
  return Object.assign({}, ...maps.filter(Boolean));
}

function qualifyPackageMemberId(packageInstanceId: string, memberId: string): string {
  return `${packageInstanceId}__${memberId}`;
}

function qualifyPackageSignalId(packageInstanceId: string, signalId: string): string {
  return `${packageInstanceId}__${signalId}`;
}
