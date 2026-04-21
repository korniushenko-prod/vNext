import demoProjectDocument from "./demoProject.data.json";

export type WorkspaceId = "bind" | "logic" | "machine" | "observe";
export type BehaviorKind = "sequence" | "control" | "monitoring";
export type ObjectPortKind = "command" | "input" | "output" | "status" | "permission" | "alarm";
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

export interface PlcObjectDefinition {
  id: string;
  name: string;
  type:
    | "BoilerSupervisor"
    | "Burner"
    | "FuelGroup"
    | "CombustionAirGroup"
    | "FeedWaterAndLevelGroup"
    | "SteamPressureControl"
    | "FlameSafety"
    | "BoilerProtection"
    | "OperatorPanelSelectors";
  behaviorKind: BehaviorKind;
  summary: string;
  commands: ObjectInterfacePortDefinition[];
  inputs: ObjectInterfacePortDefinition[];
  outputs: ObjectInterfacePortDefinition[];
  status: ObjectInterfacePortDefinition[];
  permissions: ObjectInterfacePortDefinition[];
  alarms: ObjectInterfacePortDefinition[];
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

export function cloneProjectDocument(project: UniversalPlcProjectDocument): UniversalPlcDemoProject {
  return structuredClone(project) as UniversalPlcDemoProject;
}

export function loadDemoProject(): UniversalPlcDemoProject {
  return cloneProjectDocument(demoProjectDocument as UniversalPlcProjectDocument);
}

export const demoProjectSource = demoProjectDocument as UniversalPlcProjectDocument;
export const demoProject = loadDemoProject();
