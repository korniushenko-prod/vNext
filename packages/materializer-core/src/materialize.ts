import { MATERIALIZER_CORE_VERSION } from "./constants.js";
import type {
  AlarmDef,
  MaterializationDiagnostic,
  MaterializationOptions,
  MaterializationResult,
  ObjectInstance,
  ObjectType,
  ParamDef,
  ParamValue,
  PortDef,
  ProjectModel,
  RuntimeConnection,
  RuntimeInstance,
  RuntimePack,
  RuntimeResolvedParam
} from "./types.js";

interface ExpandedScope {
  runtimeInstanceId: string;
  typeId: string;
  typeDef: ObjectType;
  resolvedParams: Record<string, RuntimeResolvedParam>;
}

interface WorkingState {
  project: ProjectModel;
  diagnostics: MaterializationDiagnostic[];
  instances: Record<string, RuntimeInstance>;
  connections: Record<string, RuntimeConnection>;
  connectionCounter: number;
  instanceTypes: Record<string, ObjectType>;
}

export function materializeProject(project: ProjectModel, options: MaterializationOptions = {}): MaterializationResult {
  const state: WorkingState = {
    project,
    diagnostics: [],
    instances: {},
    connections: {},
    connectionCounter: 0,
    instanceTypes: {}
  };

  for (const [instanceId, instance] of Object.entries(project.system.instances)) {
    const typeDef = resolveObjectType(project, instance.type_ref, `$.system.instances.${instanceId}.type_ref`, state.diagnostics);
    if (!typeDef) {
      continue;
    }

    const rootScope = materializeInstanceScope({
      state,
      runtimeInstanceId: instanceId,
      instance,
      typeDef,
      scopeKind: "system",
      ownerId: project.meta.project_id,
      parentParams: null,
      path: `$.system.instances.${instanceId}`
    });

    if (rootScope) {
      materializeComposition(rootScope, state, `$.definitions.object_types.${typeDef.id}.implementation.composition`);
    }
  }

  materializeSystemSignals(state);

  const pack: RuntimePack | null = state.diagnostics.some((entry) => entry.severity === "error")
    ? null
    : {
        schema_version: "0.1.0",
        pack_id: options.packId ?? `${project.meta.project_id}-runtime-pack`,
        source: {
          project_id: project.meta.project_id,
          authoring_schema_version: project.schema_version,
          generated_at: options.generatedAt ?? new Date().toISOString()
        },
        instances: state.instances,
        connections: state.connections,
        resources: {}
      };

  return {
    ok: !state.diagnostics.some((entry) => entry.severity === "error"),
    diagnostics: state.diagnostics,
    pack
  };
}

interface MaterializeInstanceScopeArgs {
  state: WorkingState;
  runtimeInstanceId: string;
  instance: ObjectInstance;
  typeDef: ObjectType;
  scopeKind: "system" | "composition";
  ownerId: string;
  parentParams: Record<string, RuntimeResolvedParam> | null;
  path: string;
}

function materializeInstanceScope(args: MaterializeInstanceScopeArgs): ExpandedScope {
  const { state, runtimeInstanceId, instance, typeDef, scopeKind, ownerId, parentParams, path } = args;
  const resolvedParams = resolveParams(typeDef.interface.params, instance.param_values ?? {}, parentParams, `${path}.param_values`, state.diagnostics);

  state.instances[runtimeInstanceId] = {
    id: runtimeInstanceId,
    type_ref: instance.type_ref,
    title: instance.title,
    enabled: instance.enabled !== false,
    ports: mapPorts(typeDef.interface.ports),
    params: resolvedParams,
    alarms: mapAlarms(typeDef.interface.alarms),
    source_scope: {
      kind: scopeKind,
      owner_id: ownerId
    }
  };
  state.instanceTypes[runtimeInstanceId] = typeDef;

  return {
    runtimeInstanceId,
    typeId: typeDef.id,
    typeDef,
    resolvedParams
  };
}

function materializeComposition(scope: ExpandedScope, state: WorkingState, path: string) {
  const composition = scope.typeDef.implementation.composition;
  if (!composition) {
    return;
  }

  for (const [childId, childInstance] of Object.entries(composition.instances)) {
    const childType = resolveObjectType(state.project, childInstance.type_ref, `${path}.instances.${childId}.type_ref`, state.diagnostics);
    if (!childType) {
      continue;
    }

    const runtimeChildId = `${scope.runtimeInstanceId}.${childId}`;
    const childScope = materializeInstanceScope({
      state,
      runtimeInstanceId: runtimeChildId,
      instance: childInstance,
      typeDef: childType,
      scopeKind: "composition",
      ownerId: scope.typeId,
      parentParams: scope.resolvedParams,
      path: `${path}.instances.${childId}`
    });

    materializeComposition(childScope, state, `$.definitions.object_types.${childType.id}.implementation.composition`);
  }

  for (const [routeId, route] of Object.entries(composition.routes)) {
    const source = resolveCompositionEndpoint(scope, route.from, state, `${path}.routes.${routeId}.from`, true);
    const target = resolveCompositionEndpoint(scope, route.to, state, `${path}.routes.${routeId}.to`, false);
    if (!source || !target) {
      continue;
    }

    if (!isOutputCompatible(source.port) || !isInputCompatible(target.port)) {
      state.diagnostics.push(error("composition.route.direction", `${path}.routes.${routeId}`, "Composition route must connect output-compatible source to input-compatible target."));
      continue;
    }

    if (source.port.value_type !== target.port.value_type) {
      state.diagnostics.push(error("composition.route.value_type", `${path}.routes.${routeId}`, "Composition route source/target value types must match."));
      continue;
    }

    addConnection(state, {
      source: { instance_id: source.instanceId, port_id: source.port.id },
      target: { instance_id: target.instanceId, port_id: target.port.id },
      channel_kind: source.port.channel_kind,
      value_type: source.port.value_type,
      origin: {
        scope_kind: "composition",
        owner_id: scope.typeId,
        route_id: routeId
      }
    });
  }
}

function materializeSystemSignals(state: WorkingState) {
  for (const [signalId, signal] of Object.entries(state.project.system.signals)) {
    const source = resolveRuntimePort(state, signal.source.instance_id, signal.source.port_id, `$.system.signals.${signalId}.source`);
    if (!source) {
      continue;
    }

    if (!isOutputCompatible(source.port)) {
      state.diagnostics.push(error("system.signal.source.direction", `$.system.signals.${signalId}.source`, "System signal source must resolve to an output port."));
      continue;
    }

    for (const [targetId, targetRef] of Object.entries(signal.targets)) {
      const target = resolveRuntimePort(state, targetRef.instance_id, targetRef.port_id, `$.system.signals.${signalId}.targets.${targetId}`);
      if (!target) {
        continue;
      }
      if (!isInputCompatible(target.port)) {
        state.diagnostics.push(error("system.signal.target.direction", `$.system.signals.${signalId}.targets.${targetId}`, "System signal target must resolve to an input port."));
        continue;
      }
      if (source.port.value_type !== target.port.value_type) {
        state.diagnostics.push(error("system.signal.value_type", `$.system.signals.${signalId}.targets.${targetId}`, "System signal source/target value types must match."));
        continue;
      }

      addConnection(state, {
        source: { instance_id: source.instanceId, port_id: source.port.id },
        target: { instance_id: target.instanceId, port_id: target.port.id },
        channel_kind: source.port.channel_kind,
        value_type: source.port.value_type,
        origin: {
          scope_kind: "system",
          owner_id: state.project.meta.project_id,
          signal_id: signalId
        }
      });
    }
  }
}

function resolveCompositionEndpoint(
  scope: ExpandedScope,
  endpoint: { kind: "parent_port"; port_id: string } | { kind: "instance_port"; instance_id: string; port_id: string },
  state: WorkingState,
  path: string,
  asSource: boolean
) {
  if (endpoint.kind === "parent_port") {
    const port = scope.typeDef.interface.ports[endpoint.port_id];
    if (!port) {
      state.diagnostics.push(error("composition.parent_port.missing", path, `Parent port \`${endpoint.port_id}\` does not exist.`));
      return null;
    }

    const compatible = asSource ? port.direction === "in" : port.direction === "out";
    if (!compatible) {
      state.diagnostics.push(error("composition.parent_port.boundary_direction", path, "Parent boundary port is used on the wrong side of the composition boundary."));
      return null;
    }

    return {
      instanceId: scope.runtimeInstanceId,
      port: {
        id: port.id,
        direction: asSource ? "out" : "in",
        channel_kind: port.channel_kind,
        value_type: port.value_type
      }
    };
  }

  const childRuntimeId = `${scope.runtimeInstanceId}.${endpoint.instance_id}`;
  return resolveRuntimePort(state, childRuntimeId, endpoint.port_id, path);
}

function resolveRuntimePort(state: WorkingState, instanceId: string, portId: string, path: string) {
  const runtimeInstance = state.instances[instanceId];
  if (!runtimeInstance) {
    state.diagnostics.push(error("runtime.instance.missing", path, `Runtime instance \`${instanceId}\` does not exist.`));
    return null;
  }

  const port = runtimeInstance.ports[portId];
  if (!port) {
    state.diagnostics.push(error("runtime.port.missing", path, `Runtime port \`${portId}\` does not exist on \`${instanceId}\`.`));
    return null;
  }

  return { instanceId, port };
}

function resolveObjectType(project: ProjectModel, typeRef: string, path: string, diagnostics: MaterializationDiagnostic[]) {
  const parts = typeRef.split(":");
  if (parts.length !== 2) {
    diagnostics.push(error("type_ref.invalid", path, `Type ref \`${typeRef}\` must use namespace:id format.`));
    return null;
  }

  const [, typeId] = parts;
  const typeDef = project.definitions.object_types[typeId];
  if (!typeDef) {
    diagnostics.push(error("type_ref.missing", path, `Object type \`${typeId}\` was not found.`));
    return null;
  }

  return typeDef;
}

function resolveParams(
  paramDefs: Record<string, ParamDef>,
  paramValues: Record<string, ParamValue>,
  parentParams: Record<string, RuntimeResolvedParam> | null,
  path: string,
  diagnostics: MaterializationDiagnostic[]
) {
  const resolved: Record<string, RuntimeResolvedParam> = {};

  for (const [paramId, paramDef] of Object.entries(paramDefs)) {
    const override = paramValues[paramId];
    if (override?.kind === "literal") {
      resolved[paramId] = {
        value: override.value,
        value_type: paramDef.value_type,
        source: "override"
      };
      continue;
    }

    if (override?.kind === "parent_param") {
      const parentValue = parentParams?.[override.param_id];
      if (!parentValue) {
        diagnostics.push(error("param.parent_param.missing", `${path}.${paramId}`, `Parent param \`${override.param_id}\` was not resolved.`));
        continue;
      }
      resolved[paramId] = {
        value: parentValue.value,
        value_type: paramDef.value_type,
        source: "parent_param"
      };
      continue;
    }

    if (Object.prototype.hasOwnProperty.call(paramDef, "default")) {
      resolved[paramId] = {
        value: paramDef.default,
        value_type: paramDef.value_type,
        source: "default"
      };
    }
  }

  for (const paramId of Object.keys(paramValues)) {
    if (!paramDefs[paramId]) {
      diagnostics.push(error("param.unknown", `${path}.${paramId}`, `Unknown param override \`${paramId}\`.`));
    }
  }

  return resolved;
}

function mapPorts(ports: Record<string, PortDef>) {
  const result: RuntimeInstance["ports"] = {};
  for (const [portId, port] of Object.entries(ports)) {
    result[portId] = {
      id: port.id,
      direction: port.direction,
      channel_kind: port.channel_kind,
      value_type: port.value_type
    };
  }
  return result;
}

function mapAlarms(alarms: Record<string, AlarmDef>) {
  const result: RuntimeInstance["alarms"] = {};
  for (const [alarmId, alarm] of Object.entries(alarms)) {
    result[alarmId] = {
      id: alarm.id,
      severity: alarm.severity
    };
  }
  return result;
}

function addConnection(state: WorkingState, connection: Omit<RuntimeConnection, "id">) {
  state.connectionCounter += 1;
  const id = `conn_${state.connectionCounter}`;
  state.connections[id] = {
    id,
    ...connection
  };
}

function isOutputCompatible(port: { direction: string }) {
  return port.direction === "out";
}

function isInputCompatible(port: { direction: string }) {
  return port.direction === "in";
}

function error(code: string, path: string, message: string): MaterializationDiagnostic {
  return {
    code,
    severity: "error",
    path,
    message
  };
}

export function getMaterializerVersion() {
  return MATERIALIZER_CORE_VERSION;
}


