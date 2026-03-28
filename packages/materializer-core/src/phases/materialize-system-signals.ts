import type {
  RuntimeConnection,
  RuntimeEndpoint,
  RuntimeInstance,
  RuntimePack
} from "@universal-plc/runtime-pack-schema";
import type { ProjectModel } from "@universal-plc/project-schema";
import type { MaterializerDiagnostic } from "../types.js";
import { error } from "../diagnostics.js";
import { systemConnectionId } from "../helpers/ids.js";

interface PortLike {
  id: string;
  direction: "in" | "out";
  channel_kind: string;
  value_type: string;
}

export function materializeSystemSignals(
  project: ProjectModel,
  runtimePack: RuntimePack,
  diagnostics: MaterializerDiagnostic[]
): void {
  for (const [signalId, signal] of Object.entries(project.system?.signals ?? {})) {
    const source = signal.source;
    if (!source) {
      diagnostics.push(error(
        "materialize_system_signals",
        "system_signal.source.missing",
        `$.system.signals.${signalId}.source`,
        "System signal must have a source endpoint."
      ));
      continue;
    }

    const sourcePort = resolvePort(runtimePack.instances, source.instance_id, source.port_id);
    if (!sourcePort) {
      diagnostics.push(error(
        "materialize_system_signals",
        "system_signal.source.unresolved",
        `$.system.signals.${signalId}.source`,
        `Cannot resolve source endpoint ${source.instance_id}.${source.port_id}.`
      ));
      continue;
    }

    const targets = normalizeSignalTargets(signal.targets);
    for (const [targetId, target] of targets) {
      const targetPort = resolvePort(runtimePack.instances, target.instance_id, target.port_id);
      if (!targetPort) {
        diagnostics.push(error(
          "materialize_system_signals",
          "system_signal.target.unresolved",
          `$.system.signals.${signalId}.targets.${targetId}`,
          `Cannot resolve target endpoint ${target.instance_id}.${target.port_id}.`
        ));
        continue;
      }

      const connectionId = systemConnectionId(signalId, targetId);
      const connection: RuntimeConnection = {
        id: connectionId,
        source: endpoint(source.instance_id, source.port_id),
        target: endpoint(target.instance_id, target.port_id),
        channel_kind: sourcePort.channel_kind,
        value_type: sourcePort.value_type,
        origin: {
          origin_layer: "system",
          owner_id: project.meta.project_id,
          signal_id: signalId
        }
      };

      runtimePack.connections[connectionId] = connection;
    }
  }
}

function endpoint(instance_id: string, port_id: string): RuntimeEndpoint {
  return { instance_id, port_id };
}

function resolvePort(
  instances: Record<string, RuntimeInstance>,
  instanceId: string,
  portId: string
): PortLike | undefined {
  return instances[instanceId]?.ports?.[portId] as PortLike | undefined;
}

function normalizeSignalTargets(value: unknown): Array<[string, { instance_id: string; port_id: string }]> {
  if (Array.isArray(value)) {
    return (value as Array<{ instance_id: string; port_id: string }>).map((entry, index) => [
      `t${index + 1}`,
      entry
    ]);
  }

  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, { instance_id: string; port_id: string }>);
  }

  return [];
}
