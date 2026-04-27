import demoProjectDocument from "./demoProject.data.json";

export type WorkspaceId = "bind" | "logic" | "machine" | "observe";
export type BehaviorKind = "sequence" | "control" | "monitoring";
export type ObjectPortKind = "command" | "input" | "output" | "status" | "permission" | "fault";
export type ObjectContractFamily = "commands" | "inputs" | "outputs" | "status" | "permissions" | "faults";
export type DataType = "bool" | "number" | "string" | "enum";
export type SignalLayer = "raw" | "conditioned" | "semantic";

export interface ObjectInterfacePortDefinition {
  id: string;
  name: string;
  kind: ObjectPortKind;
  dataType: DataType;
  summary: string;
}

export interface ObjectBehaviorDefinition {
  machineId: string;
  summary: string;
}

export interface ObjectStructureNodeDefinition {
  id: string;
  title: string;
  kind: string;
  summary: string;
  position: { x: number; y: number };
  inputs: ObjectInterfacePortDefinition[];
  outputs: ObjectInterfacePortDefinition[];
  parameters?: Record<string, unknown>;
  relatedSignalIds?: string[];
  relatedBlockIds?: string[];
  relatedBindingIds?: string[];
}

export interface ObjectStructureRouteEndpointDefinition {
  kind: "boundary" | "node";
  nodeId?: string;
  portId: string;
  portKind?: ObjectPortKind;
}

export interface ObjectStructureRouteDefinition {
  id: string;
  label: string;
  from: ObjectStructureRouteEndpointDefinition;
  to: ObjectStructureRouteEndpointDefinition;
}

export interface ObjectStructureDefinition {
  summary: string;
  nodes: ObjectStructureNodeDefinition[];
  routes: ObjectStructureRouteDefinition[];
}

export interface StructurePortSeed {
  name: string;
  dataType?: DataType;
  summary?: string;
}

export interface PlcObjectDefinition {
  id: string;
  name: string;
  type: string;
  behaviorKind: BehaviorKind;
  summary: string;
  parentObjectId?: string | null;
  topologyPosition?: { x: number; y: number } | null;
  commands: ObjectInterfacePortDefinition[];
  inputs: ObjectInterfacePortDefinition[];
  outputs: ObjectInterfacePortDefinition[];
  status: ObjectInterfacePortDefinition[];
  permissions: ObjectInterfacePortDefinition[];
  faults: ObjectInterfacePortDefinition[];
  behavior?: ObjectBehaviorDefinition;
  structure?: ObjectStructureDefinition;
}

export interface ObjectCompositionLinkDefinition {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  sourcePortId?: string;
  targetPortId?: string;
  kind: "command" | "permission" | "status" | "fault";
  label: string;
  summary: string;
}

export interface ObjectCompositionEndpointDefinition {
  objectId: string;
  portId: string;
}

export interface MachineStateDefinition {
  id: string;
  name: string;
  kind: "initial" | "normal" | "fault" | "final";
  position: { x: number; y: number };
  sectionId: string;
  regionId?: string;
  active?: boolean;
  entryActions?: string[];
  exitActions?: string[];
  timeoutMs?: number;
  relatedSignalIds?: string[];
  relatedBlockIds?: string[];
  relatedBindingIds?: string[];
}

export interface MachineTransitionDefinition {
  id: string;
  source: string;
  target: string;
  sectionId?: string;
  event?: string;
  guard?: string;
  delayMs?: number;
  action?: string;
  relatedSignalIds?: string[];
  relatedBlockIds?: string[];
  relatedBindingIds?: string[];
}

export interface MachineRegionDefinition {
  id: string;
  name: string;
  type: BehaviorKind | "fault";
  summary: string;
  color: string;
  stateIds: string[];
  relatedSignalIds?: string[];
  relatedBlockIds?: string[];
  relatedBindingIds?: string[];
}

export interface MachineSceneGroupDefinition {
  id: string;
  name: string;
  summary: string;
  color: string;
  stateIds: string[];
  sectionIds?: string[];
  regionIds?: string[];
  relatedSignalIds?: string[];
  relatedBlockIds?: string[];
  relatedBindingIds?: string[];
}

export interface MachineSectionDefinition {
  id: string;
  name: string;
  summary: string;
  color: string;
  regionIds?: string[];
  relatedSignalIds?: string[];
  relatedBlockIds?: string[];
  relatedBindingIds?: string[];
}

export interface MachineDefinition {
  id: string;
  name: string;
  behaviorKind: BehaviorKind;
  behaviorSummary?: {
    primaryStateIds: string[];
    faultStateIds: string[];
    recoveryTransitionIds: string[];
  };
  states: MachineStateDefinition[];
  transitions: MachineTransitionDefinition[];
  sceneGroups?: MachineSceneGroupDefinition[];
  sections: MachineSectionDefinition[];
  regions?: MachineRegionDefinition[];
}

export interface SignalDefinition {
  id: string;
  name: string;
  layer: SignalLayer;
  summary: string;
  type: "bool" | "number" | "string";
  direction: "input" | "output" | "internal";
  value?: boolean | number | string;
  sourceBindingIds?: string[];
  derivedFromSignalIds?: string[];
  consumerRefs?: Array<{
    objectId: string;
    portKind: ObjectPortKind;
    portName: string;
  }>;
  producerRef?: {
    objectId: string;
    portKind: ObjectPortKind;
    portName: string;
  };
}

export interface IoBindingDefinition {
  id: string;
  signalId: string;
  physicalSource: string;
  direction: "input" | "output";
  type: "bool" | "analog";
  status?: boolean | number;
  debounceMs?: number;
  inverted?: boolean;
  scale?: string;
  failSafeValue?: boolean | number;
}

export interface LogicBlockDefinition {
  id: string;
  name: string;
  type:
    | "StartStopLatch"
    | "ThresholdMonitor"
    | "TimerOn"
    | "InterlockSet"
    | "PermissiveMatrix"
    | "Pid"
    | "Selector"
    | "Resolver"
    | "CommandLogic";
  inputs: string[];
  outputs: string[];
  parameters?: Record<string, unknown>;
}

export interface DiagnosticItem {
  id: string;
  severity: "info" | "warning" | "fault";
  objectId: string;
  cause: string;
  hint: string;
}

export interface RuntimeSnapshot {
  activeMachineId: string;
  activeStateId: string;
  health: "ok" | "warning" | "fault";
  lastEvent?: string;
  diagnostics: DiagnosticItem[];
}

export interface UniversalPlcDemoProject {
  id: string;
  name: string;
  objects: PlcObjectDefinition[];
  compositionLinks: ObjectCompositionLinkDefinition[];
  machines: MachineDefinition[];
  signals: SignalDefinition[];
  bindings: IoBindingDefinition[];
  blocks: LogicBlockDefinition[];
  runtimeSnapshot: RuntimeSnapshot;
}

export type UniversalPlcProjectDocument = UniversalPlcDemoProject;

function normalizePortList(
  value: unknown,
  fallbackKind: ObjectPortKind
): ObjectInterfacePortDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `${fallbackKind}_${index + 1}`,
      name: typeof item.name === "string" ? item.name : `port_${index + 1}`,
      kind: (typeof item.kind === "string" ? item.kind : fallbackKind) as ObjectPortKind,
      dataType: (typeof item.dataType === "string" ? item.dataType : "bool") as DataType,
      summary: typeof item.summary === "string" ? item.summary : ""
    }));
}

function normalizeProjectDocument(project: UniversalPlcProjectDocument): UniversalPlcDemoProject {
  return {
    ...project,
    objects: (project.objects ?? []).map((object) => {
      const rawObject = object as unknown as Record<string, unknown>;

      return {
        ...object,
        type: typeof object.type === "string" ? object.type : "CustomObject",
        summary: typeof object.summary === "string" ? object.summary : "",
        parentObjectId:
          typeof rawObject.parentObjectId === "string" || rawObject.parentObjectId === null
            ? (rawObject.parentObjectId as string | null)
            : null,
        topologyPosition:
          typeof rawObject.topologyPosition === "object" &&
          rawObject.topologyPosition !== null &&
          typeof (rawObject.topologyPosition as Record<string, unknown>).x === "number" &&
          typeof (rawObject.topologyPosition as Record<string, unknown>).y === "number"
            ? {
                x: (rawObject.topologyPosition as Record<string, number>).x,
                y: (rawObject.topologyPosition as Record<string, number>).y
              }
            : null,
        behaviorKind: (typeof object.behaviorKind === "string" ? object.behaviorKind : "control") as BehaviorKind,
        commands: normalizePortList(rawObject.commands, "command"),
        inputs: normalizePortList(rawObject.inputs, "input"),
        outputs: normalizePortList(rawObject.outputs, "output"),
        status: normalizePortList(rawObject.status, "status"),
        permissions: normalizePortList(rawObject.permissions, "permission"),
        faults: normalizePortList(rawObject.faults ?? rawObject.alarms, "fault")
      };
    }),
    compositionLinks: project.compositionLinks ?? [],
    machines: project.machines ?? [],
    signals: project.signals ?? [],
    bindings: project.bindings ?? [],
    blocks: project.blocks ?? [],
    runtimeSnapshot: {
      activeMachineId: project.runtimeSnapshot?.activeMachineId ?? "",
      activeStateId: project.runtimeSnapshot?.activeStateId ?? "",
      health: project.runtimeSnapshot?.health ?? "ok",
      lastEvent: project.runtimeSnapshot?.lastEvent,
      diagnostics: project.runtimeSnapshot?.diagnostics ?? []
    }
  };
}

export function cloneProjectDocument(project: UniversalPlcProjectDocument): UniversalPlcDemoProject {
  return structuredClone(normalizeProjectDocument(project)) as UniversalPlcDemoProject;
}

export function createEmptyProjectDocument(): UniversalPlcProjectDocument {
  return {
    id: "untitled_project",
    name: "Untitled Project",
    objects: [],
    compositionLinks: [],
    machines: [],
    signals: [],
    bindings: [],
    blocks: [],
    runtimeSnapshot: {
      activeMachineId: "",
      activeStateId: "",
      health: "ok",
      diagnostics: []
    }
  };
}

function sanitizeIdFragment(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function createUniqueId(base: string, existingIds: string[]) {
  const normalizedBase = sanitizeIdFragment(base) || "item";
  let candidate = normalizedBase;
  let counter = 1;

  while (existingIds.includes(candidate)) {
    counter += 1;
    candidate = `${normalizedBase}_${counter}`;
  }

  return candidate;
}

export function createProjectId(name: string) {
  return sanitizeIdFragment(name) || "untitled_project";
}

export function createObjectDefinition(
  project: UniversalPlcDemoProject,
  input: {
    name: string;
    type?: string;
    behaviorKind: BehaviorKind;
    summary?: string;
    parentObjectId?: string | null;
  }
): PlcObjectDefinition {
  const id = createUniqueId(input.name || input.type || "object", project.objects.map((object) => object.id));
  return {
    id,
    name: input.name.trim() || "New Object",
    type: input.type?.trim() || "CustomObject",
    behaviorKind: input.behaviorKind,
    summary: input.summary?.trim() || "Describe what this object owns and exports.",
    parentObjectId: input.parentObjectId ?? null,
    topologyPosition: null,
    commands: [],
    inputs: [],
    outputs: [],
    status: [],
    permissions: [],
    faults: []
  };
}

export function createObjectPortDefinition(
  object: PlcObjectDefinition,
  family: ObjectContractFamily,
  input: {
    name: string;
    dataType: DataType;
    summary?: string;
  }
): ObjectInterfacePortDefinition {
  const kindByFamily: Record<ObjectContractFamily, ObjectPortKind> = {
    commands: "command",
    inputs: "input",
    outputs: "output",
    status: "status",
    permissions: "permission",
    faults: "fault"
  };

  const existingIds = [
    ...object.commands,
    ...object.inputs,
    ...object.outputs,
    ...object.status,
    ...object.permissions,
    ...object.faults
  ].map((port) => port.id);

  const id = createUniqueId(`${object.id}_${kindByFamily[family]}_${input.name || "port"}`, existingIds);
  return {
    id,
    name: input.name.trim() || "newPort",
    kind: kindByFamily[family],
    dataType: input.dataType,
    summary: input.summary?.trim() || "Describe what this port means to the rest of the system."
  };
}

export function getPortsForContractFamily(object: PlcObjectDefinition, family: ObjectContractFamily) {
  return object[family];
}

export function findObjectPortFamilyById(object: PlcObjectDefinition, portId: string): ObjectContractFamily | null {
  const families: ObjectContractFamily[] = ["commands", "inputs", "outputs", "status", "permissions", "faults"];

  for (const family of families) {
    if (object[family].some((port) => port.id === portId)) {
      return family;
    }
  }

  return null;
}

export function findObjectPortById(object: PlcObjectDefinition, portId: string) {
  const family = findObjectPortFamilyById(object, portId);
  return family ? object[family].find((port) => port.id === portId) ?? null : null;
}

function isIncomingObjectContractFamily(family: ObjectContractFamily) {
  return family === "commands" || family === "inputs";
}

function isOutgoingObjectContractFamily(family: ObjectContractFamily) {
  return family === "outputs" || family === "status" || family === "permissions" || family === "faults";
}

function inferCompositionLinkKind(
  sourceFamily: ObjectContractFamily,
  targetFamily: ObjectContractFamily
): ObjectCompositionLinkDefinition["kind"] {
  if (sourceFamily === "permissions") {
    return "permission";
  }

  if (sourceFamily === "faults") {
    return "fault";
  }

  if (sourceFamily === "status") {
    return "status";
  }

  if (sourceFamily === "outputs" && targetFamily === "commands") {
    return "command";
  }

  return "status";
}

export function createObjectCompositionLinkDefinition(
  project: UniversalPlcDemoProject,
  input: {
    source: ObjectCompositionEndpointDefinition;
    target: ObjectCompositionEndpointDefinition;
  }
): ObjectCompositionLinkDefinition | null {
  const sourceObject = project.objects.find((object) => object.id === input.source.objectId);
  const targetObject = project.objects.find((object) => object.id === input.target.objectId);
  if (!sourceObject || !targetObject || sourceObject.id === targetObject.id) {
    return null;
  }

  const sourceFamily = findObjectPortFamilyById(sourceObject, input.source.portId);
  const targetFamily = findObjectPortFamilyById(targetObject, input.target.portId);
  if (!sourceFamily || !targetFamily) {
    return null;
  }

  const normalized =
    isOutgoingObjectContractFamily(sourceFamily) && isIncomingObjectContractFamily(targetFamily)
      ? {
          sourceObject,
          sourcePortId: input.source.portId,
          sourceFamily,
          targetObject,
          targetPortId: input.target.portId,
          targetFamily
        }
      : isOutgoingObjectContractFamily(targetFamily) && isIncomingObjectContractFamily(sourceFamily)
        ? {
            sourceObject: targetObject,
            sourcePortId: input.target.portId,
            sourceFamily: targetFamily,
            targetObject: sourceObject,
            targetPortId: input.source.portId,
            targetFamily: sourceFamily
          }
        : null;

  if (!normalized) {
    return null;
  }

  const sourcePort = findObjectPortById(normalized.sourceObject, normalized.sourcePortId);
  const targetPort = findObjectPortById(normalized.targetObject, normalized.targetPortId);
  if (!sourcePort || !targetPort) {
    return null;
  }

  const duplicate = project.compositionLinks.some(
    (link) =>
      link.sourceObjectId === normalized.sourceObject.id &&
      link.targetObjectId === normalized.targetObject.id &&
      link.sourcePortId === normalized.sourcePortId &&
      link.targetPortId === normalized.targetPortId
  );
  if (duplicate) {
    return null;
  }

  const existingIds = project.compositionLinks.map((link) => link.id);
  const id = createUniqueId(
    `${normalized.sourceObject.id}_${sourcePort.name}_${normalized.targetObject.id}_${targetPort.name}`,
    existingIds
  );

  return {
    id,
    sourceObjectId: normalized.sourceObject.id,
    targetObjectId: normalized.targetObject.id,
    sourcePortId: normalized.sourcePortId,
    targetPortId: normalized.targetPortId,
    kind: inferCompositionLinkKind(normalized.sourceFamily, normalized.targetFamily),
    label: sourcePort.name,
    summary: `${normalized.sourceObject.name}.${sourcePort.name} -> ${normalized.targetObject.name}.${targetPort.name}`
  };
}

export function createObjectStructureDefinition(summary?: string): ObjectStructureDefinition {
  return {
    summary: summary?.trim() || "Internal parts, ports and local routes inside this object.",
    nodes: [],
    routes: []
  };
}

export function createObjectStructureNodeDefinition(
  object: PlcObjectDefinition,
  input: {
    title: string;
    kind: string;
    summary?: string;
    position?: { x: number; y: number };
    inputs?: StructurePortSeed[];
    outputs?: StructurePortSeed[];
  }
): ObjectStructureNodeDefinition {
  const existingIds = object.structure?.nodes.map((node) => node.id) ?? [];
  const id = createUniqueId(`${object.id}_${input.kind}_${input.title || "node"}`, existingIds);
  const createPorts = (ports: StructurePortSeed[] | undefined, io: "input" | "output") =>
    (ports ?? []).map((port, index) => ({
      id: `${id}_${io}_${sanitizeIdFragment(port.name) || index + 1}`,
      name: port.name.trim() || `${io}_${index + 1}`,
      kind: io,
      dataType: port.dataType ?? "bool",
      summary: port.summary?.trim() || ""
    }));

  return {
    id,
    title: input.title.trim() || "New Internal Part",
    kind: input.kind.trim() || "Subobject",
    summary: input.summary?.trim() || "Describe what this internal part is responsible for.",
    position: input.position ?? { x: 80, y: 80 },
    inputs: createPorts(input.inputs, "input"),
    outputs: createPorts(input.outputs, "output")
  };
}

function findStructureNodePort(
  object: PlcObjectDefinition,
  endpoint: ObjectStructureRouteEndpointDefinition
) {
  if (endpoint.kind !== "node" || !endpoint.nodeId) {
    return null;
  }

  const node = object.structure?.nodes.find((item) => item.id === endpoint.nodeId);
  if (!node) {
    return null;
  }

  const inputPort = node.inputs.find((item) => item.id === endpoint.portId);
  if (inputPort) {
    return { node, port: inputPort, role: "target" as const };
  }

  const outputPort = node.outputs.find((item) => item.id === endpoint.portId);
  if (outputPort) {
    return { node, port: outputPort, role: "source" as const };
  }

  return null;
}

function findBoundaryPort(
  object: PlcObjectDefinition,
  endpoint: ObjectStructureRouteEndpointDefinition
) {
  if (endpoint.kind !== "boundary" || !endpoint.portKind) {
    return null;
  }

  const portsByKind: Record<ObjectPortKind, ObjectInterfacePortDefinition[]> = {
    command: object.commands,
    input: object.inputs,
    output: object.outputs,
    status: object.status,
    permission: object.permissions,
    fault: object.faults
  };

  const port = portsByKind[endpoint.portKind]?.find((item) => item.id === endpoint.portId);
  if (!port) {
    return null;
  }

  const role = endpoint.portKind === "output" || endpoint.portKind === "status" || endpoint.portKind === "fault"
    ? "target"
    : "source";

  return { port, role };
}

function getEndpointRole(
  object: PlcObjectDefinition,
  endpoint: ObjectStructureRouteEndpointDefinition
) {
  if (endpoint.kind === "node") {
    return findStructureNodePort(object, endpoint)?.role ?? null;
  }

  return findBoundaryPort(object, endpoint)?.role ?? null;
}

function describeStructureEndpoint(
  object: PlcObjectDefinition,
  endpoint: ObjectStructureRouteEndpointDefinition
) {
  if (endpoint.kind === "node") {
    const match = findStructureNodePort(object, endpoint);
    return match ? `${match.node.title}.${match.port.name}` : "node";
  }

  const match = findBoundaryPort(object, endpoint);
  return match?.port.name ?? "boundary";
}

export function normalizeObjectStructureRouteEndpoints(
  object: PlcObjectDefinition,
  input: {
    from: ObjectStructureRouteEndpointDefinition;
    to: ObjectStructureRouteEndpointDefinition;
  }
) {
  const fromRole = getEndpointRole(object, input.from);
  const toRole = getEndpointRole(object, input.to);

  if (fromRole === "source" && toRole === "target") {
    return input;
  }

  if (fromRole === "target" && toRole === "source") {
    return {
      from: input.to,
      to: input.from
    };
  }

  return null;
}

export function createObjectStructureRouteDefinition(
  object: PlcObjectDefinition,
  input: {
    label: string;
    from: ObjectStructureRouteEndpointDefinition;
    to: ObjectStructureRouteEndpointDefinition;
  }
): ObjectStructureRouteDefinition | null {
  const normalized = normalizeObjectStructureRouteEndpoints(object, input);
  if (!normalized) {
    return null;
  }

  const existingIds = object.structure?.routes.map((route) => route.id) ?? [];
  const id = createUniqueId(`${object.id}_route_${input.label || "link"}`, existingIds);
  const fallbackLabel = `${describeStructureEndpoint(object, normalized.from)} -> ${describeStructureEndpoint(object, normalized.to)}`;

  return {
    id,
    label: input.label.trim() || fallbackLabel,
    from: normalized.from,
    to: normalized.to
  };
}

export function loadDemoProject(): UniversalPlcDemoProject {
  return cloneProjectDocument(demoProjectDocument as UniversalPlcProjectDocument);
}

export const demoProjectSource = demoProjectDocument as UniversalPlcProjectDocument;
export const demoProject = loadDemoProject();
