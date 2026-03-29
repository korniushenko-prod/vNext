import type { ObjectType } from "@universal-plc/project-schema";
import type {
  RuntimeConnection,
  RuntimeFrontendRequirement,
  RuntimePack,
  RuntimeResolvedParam
} from "@universal-plc/runtime-pack-schema";
import { error } from "../diagnostics.js";
import type { MaterializerDiagnostic, MaterializerPhase } from "../types.js";

export interface MaterializedFrontendRequirements {
  requirements: Record<string, RuntimeFrontendRequirement>;
  active_requirement_ids: string[];
  mode?: string;
  diagnostics: MaterializerDiagnostic[];
}

export function materializeFrontendRequirements(
  runtimeInstanceId: string,
  objectType: ObjectType,
  params: Record<string, RuntimeResolvedParam>,
  phase: MaterializerPhase,
  pathBase: string
): MaterializedFrontendRequirements {
  const diagnostics: MaterializerDiagnostic[] = [];
  const definitions = ((objectType.facets?.frontends as {
    requirements?: Record<string, {
      id: string;
      kind: string;
      mode?: string;
      title?: string;
      source_ports?: string[];
      binding_kind?: string;
      channel_kind?: string;
      value_type?: string;
      required?: boolean;
      config?: Record<string, unknown>;
    }>;
  } | undefined)?.requirements) ?? {};

  const mode = typeof params.sensor_mode?.value === "string" ? params.sensor_mode.value : undefined;
  const knownModes = Array.from(new Set(Object.values(definitions).map((entry) => entry.mode).filter((entry): entry is string => typeof entry === "string")));

  if (mode && knownModes.length > 0 && !knownModes.includes(mode)) {
    diagnostics.push(error(
      phase,
      "frontend.mode.unsupported",
      `${pathBase}.params.sensor_mode`,
      `Unsupported frontend mode \`${mode}\` for object type ${objectType.id}.`
    ));
  }

  const requirements = Object.fromEntries(
    Object.entries(definitions).map(([requirementId, requirement]) => {
      const active = resolveFrontendRequirementActive(requirement, params, mode);
      const runtimeRequirementId = `fe_${runtimeInstanceId}_${requirementId}`;
      return [
        runtimeRequirementId,
        omitUndefined({
          id: runtimeRequirementId,
          owner_instance_id: runtimeInstanceId,
          kind: requirement.kind,
          mode: requirement.mode,
          title: requirement.title,
          source_ports: (requirement.source_ports ?? []).map((portId) => ({
            instance_id: runtimeInstanceId,
            port_id: portId
          })),
          binding_kind: requirement.binding_kind,
          channel_kind: requirement.channel_kind,
          value_type: requirement.value_type,
          required: active,
          config: requirement.config ? { ...requirement.config } : undefined,
          provenance: {
            owner_instance_id: runtimeInstanceId,
            facet_kind: "frontend_requirement" as const,
            facet_id: requirementId,
            source_type_ref: `${objectType.meta.origin}:${objectType.id}`
          }
        }) satisfies RuntimeFrontendRequirement
      ];
    })
  );

  const activeRequirementIds = Object.values(requirements)
    .filter((entry) => entry.required)
    .map((entry) => entry.id)
    .sort((left, right) => left.localeCompare(right));

  return {
    requirements,
    active_requirement_ids: activeRequirementIds,
    mode,
    diagnostics
  };
}

export function validateActiveFrontendBindings(
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[],
  phase: MaterializerPhase = "finalize_pack"
): void {
  for (const [requirementId, requirement] of Object.entries(runtimePack.frontend_requirements ?? {})) {
    if (!requirement.required) {
      continue;
    }

    const matchingConnections = Object.values(runtimePack.connections ?? {}).filter((connection) => (
      connection.target.instance_id === requirement.owner_instance_id &&
      portMatchesRequirement(connection, requirement)
    ));
    const directResources = Object.values(runtimePack.resources ?? {}).filter((resource) => (
      resource.instance_id === requirement.owner_instance_id &&
      resourceMatchesRequirement(resource, requirement)
    ));
    const directPorts = (requirement.source_ports ?? [])
      .map((port) => runtimePack.instances[port.instance_id]?.ports?.[port.port_id])
      .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

    if (matchingConnections.length === 0 && directResources.length === 0) {
      diagnostics.push(error(
        phase,
        "frontend.connection.missing",
        `$.frontend_requirements.${requirementId}`,
        `Active frontend requirement \`${requirementId}\` has no incoming runtime connection or direct resource binding.`
      ));
      continue;
    }

    if (requirement.channel_kind) {
      const channelMatch = matchingConnections.some((connection) => connection.channel_kind === requirement.channel_kind) ||
        directPorts.some((port) => port.channel_kind === requirement.channel_kind);
      if (!channelMatch) {
        diagnostics.push(error(
          phase,
          "frontend.channel_kind.mismatch",
          `$.frontend_requirements.${requirementId}.channel_kind`,
          `Active frontend requirement \`${requirementId}\` did not receive a compatible channel kind.`
        ));
      }
    }

    if (requirement.value_type) {
      const valueMatch = matchingConnections.some((connection) => connection.value_type === requirement.value_type) ||
        directPorts.some((port) => port.value_type === requirement.value_type);
      if (!valueMatch) {
        diagnostics.push(error(
          phase,
          "frontend.value_type.mismatch",
          `$.frontend_requirements.${requirementId}.value_type`,
          `Active frontend requirement \`${requirementId}\` did not receive a compatible value type.`
        ));
      }
    }

    if (requirement.binding_kind) {
      const resourceMatch = matchingConnections.some((connection) => (
        Object.values(runtimePack.resources ?? {}).some((resource) => (
          resource.instance_id === connection.source.instance_id &&
          resource.port_id === connection.source.port_id &&
          resource.binding_kind === requirement.binding_kind
        ))
      )) || directResources.some((resource) => resource.binding_kind === requirement.binding_kind);

      if (!resourceMatch) {
        diagnostics.push(error(
          phase,
          "frontend.resource.missing",
          `$.frontend_requirements.${requirementId}.binding_kind`,
          `Active frontend requirement \`${requirementId}\` has no compatible resource binding.`
        ));
      }
    }
  }
}

function resolveFrontendRequirementActive(
  requirement: {
    mode?: string;
    required?: boolean;
    config?: Record<string, unknown>;
  },
  params: Record<string, RuntimeResolvedParam>,
  mode?: string
): boolean {
  if (requirement.mode && mode !== undefined) {
    return requirement.mode === mode;
  }

  const activationParam = typeof requirement.config?.activation_param === "string" ? requirement.config.activation_param : undefined;
  const activationValue = requirement.config?.activation_value;
  if (activationParam) {
    return params[activationParam]?.value === activationValue;
  }

  return requirement.required ?? true;
}

function portMatchesRequirement(connection: RuntimeConnection, requirement: RuntimeFrontendRequirement): boolean {
  if (!requirement.source_ports || requirement.source_ports.length === 0) {
    return true;
  }

  return requirement.source_ports.some((port) => (
    port.instance_id === connection.target.instance_id &&
    port.port_id === connection.target.port_id
  ));
}

function resourceMatchesRequirement(
  resource: RuntimePack["resources"][string],
  requirement: RuntimeFrontendRequirement
): boolean {
  if (requirement.binding_kind && resource.binding_kind !== requirement.binding_kind) {
    return false;
  }

  if (!requirement.source_ports || requirement.source_ports.length === 0) {
    return true;
  }

  return requirement.source_ports.some((port) => (
    port.instance_id === resource.instance_id &&
    port.port_id === resource.port_id
  ));
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  ) as T;
}
