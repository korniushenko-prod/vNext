import demoProjectDocument from "./demoProject.data.json";
import { getBuiltinBlockByKind } from "./blockCatalog";

export type WorkspaceId = "bind" | "logic" | "machine" | "observe";
export type BehaviorKind = "sequence" | "control" | "monitoring";
export type ObjectPortKind = "command" | "input" | "output" | "status" | "permission" | "fault";
export type ObjectContractFamily = "commands" | "inputs" | "outputs" | "status" | "permissions" | "faults";
export type DataType = "bool" | "number" | "string" | "enum";
export type SignalLayer = "raw" | "conditioned" | "semantic";

export interface DeploymentControllerConfig {
  target: string;
  activeBoard: string;
  activeBoardTemplate: string;
  activeChipTemplate: string;
}

export interface DeploymentWifiConfig {
  mode: string;
  ssid: string;
  password: string;
  apSsid: string;
  apPassword: string;
  startupPolicy: string;
}

export interface DeploymentOledConfig {
  enabled: boolean;
  showIpOnFallback: boolean;
  width: number;
  height: number;
  sda: number;
  scl: number;
  address: string;
}

export interface DeploymentLedConfig {
  enabled: boolean;
  pin: number;
}

export interface DeploymentDebugConfig {
  serialEnabled: boolean;
  webEnabled: boolean;
  livePreviewEnabled: boolean;
}

export interface DeploymentDisplayWidgetConfig {
  id: string;
  type: string;
  label: string;
  signalKey: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DeploymentDisplayScreenConfig {
  id: string;
  label: string;
  refreshMs: number;
  widgets: DeploymentDisplayWidgetConfig[];
}

export interface DeploymentConfig {
  controller: DeploymentControllerConfig;
  wifi: DeploymentWifiConfig;
  oled: DeploymentOledConfig;
  led: DeploymentLedConfig;
  debug: DeploymentDebugConfig;
  displayScreens: DeploymentDisplayScreenConfig[];
}

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
  refObjectId?: string | null;
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

interface BuiltinTemplatePortSeed extends StructurePortSeed {
  family: ObjectContractFamily;
}

interface BuiltinTemplateStructureNodeSeed {
  key: string;
  title: string;
  kind: string;
  summary?: string;
  position?: { x: number; y: number };
  inputs?: StructurePortSeed[];
  outputs?: StructurePortSeed[];
}

interface BuiltinTemplateStructureEndpointSeed {
  kind: "boundary" | "node";
  family?: ObjectContractFamily;
  nodeKey?: string;
  portName: string;
}

interface BuiltinTemplateStructureRouteSeed {
  label?: string;
  from: BuiltinTemplateStructureEndpointSeed;
  to: BuiltinTemplateStructureEndpointSeed;
}

interface BuiltinTemplateSeed {
  ports: BuiltinTemplatePortSeed[];
  nativeConfig?: Record<string, unknown>;
  structure?: {
    summary: string;
    nodes: BuiltinTemplateStructureNodeSeed[];
    routes: BuiltinTemplateStructureRouteSeed[];
  };
}

export interface PlcObjectDefinition {
  id: string;
  name: string;
  type: string;
  behaviorKind: BehaviorKind;
  summary: string;
  nativeConfig?: Record<string, unknown>;
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
  bindingKind?: "digital_in" | "digital_out" | "analog_in" | "analog_out" | "counter" | "pwm";
  resourceId?: string;
  gpio?: number;
  status?: boolean | number;
  debounceMs?: number;
  inverted?: boolean;
  initialState?: boolean;
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
  deployment: DeploymentConfig;
  objects: PlcObjectDefinition[];
  compositionLinks: ObjectCompositionLinkDefinition[];
  machines: MachineDefinition[];
  signals: SignalDefinition[];
  bindings: IoBindingDefinition[];
  blocks: LogicBlockDefinition[];
  runtimeSnapshot: RuntimeSnapshot;
}

const BUILTIN_OBJECT_TEMPLATE_SEEDS: Record<string, BuiltinTemplateSeed> = {
  BlinkRelayPrimitive: {
    ports: [
      { family: "commands", name: "enable", summary: "Enables the blinking relay cycle." },
      { family: "outputs", name: "relayOut", summary: "Physical relay command output for the bound digital output." },
      { family: "status", name: "relayState", summary: "Current relay state after runtime evaluation." },
      { family: "status", name: "phase", dataType: "string", summary: "Current blink phase: ON or OFF." },
      {
        family: "status",
        name: "remainingSeconds",
        dataType: "number",
        summary: "Seconds remaining before the current phase finishes."
      }
    ],
    nativeConfig: {
      primitiveType: "blink_relay",
      enabled: true,
      onDurationS: 5,
      offDurationS: 10,
      outputBindingId: "",
      oledScreenId: "oled_blink_status"
    },
    structure: {
      summary: "Native blink relay primitive. Authoring view stays empty until we expose it as simple blocks or nested objects.",
      nodes: [],
      routes: []
    }
  },
  PumpUnit: {
    ports: [
      { family: "commands", name: "startCmd", summary: "Run request for this pump unit." },
      { family: "commands", name: "reset", summary: "Reset command for local alarms and latches." },
      { family: "inputs", name: "runFb", summary: "Physical run feedback from the pump." },
      { family: "inputs", name: "faultFb", summary: "Physical fault feedback from the pump." },
      {
        family: "inputs",
        name: "pressureValue",
        dataType: "number",
        summary: "Measured pressure value used to validate the running pump."
      },
      { family: "status", name: "running", summary: "Pump is confirmed as running." },
      { family: "status", name: "ready", summary: "Pump is available and pressure conditions are satisfied." },
      { family: "faults", name: "fault", summary: "Combined pump fault output." }
    ],
    structure: {
      summary: "Pump unit assembled from starter command, compare, ready and fault blocks.",
      nodes: [
        {
          key: "runLatch",
          title: "Run",
          kind: "Latch",
          summary: "Stores run demand until reset is applied.",
          position: { x: 220, y: 120 },
          inputs: [{ name: "set" }, { name: "reset" }],
          outputs: [{ name: "out" }]
        },
        {
          key: "runConfirm",
          title: "RunConfirm",
          kind: "AND",
          summary: "Combines stored command with physical run feedback.",
          position: { x: 500, y: 120 },
          inputs: [{ name: "in1" }, { name: "in2" }],
          outputs: [{ name: "out" }]
        },
        {
          key: "pressureMin",
          title: "PressureMin",
          kind: "Setpoint",
          summary: "Starter setpoint node for minimum pressure.",
          position: { x: 220, y: 290 },
          outputs: [{ name: "value", dataType: "number" }]
        },
        {
          key: "pressureCompare",
          title: "PressureCheck",
          kind: "Comparator",
          summary: "Checks that measured pressure satisfies the pump requirement.",
          position: { x: 500, y: 270 },
          inputs: [
            { name: "value", dataType: "number" },
            { name: "setpoint", dataType: "number" }
          ],
          outputs: [{ name: "ok" }]
        },
        {
          key: "readyAnd",
          title: "Ready",
          kind: "AND",
          summary: "Combines running feedback with pressure confirmation.",
          position: { x: 790, y: 180 },
          inputs: [{ name: "in1" }, { name: "in2" }],
          outputs: [{ name: "out" }]
        },
        {
          key: "faultOr",
          title: "Fault",
          kind: "OR",
          summary: "Provides a starter point for local and external fault aggregation.",
          position: { x: 790, y: 340 },
          inputs: [{ name: "in1" }, { name: "in2" }],
          outputs: [{ name: "out" }]
        },
        {
          key: "readyNot",
          title: "MissingReady",
          kind: "NOT",
          summary: "Inverts ready output to expose missing-ready as a starter local fault.",
          position: { x: 1080, y: 180 },
          inputs: [{ name: "in" }],
          outputs: [{ name: "out" }]
        }
      ],
      routes: [
        {
          from: { kind: "boundary", family: "commands", portName: "startCmd" },
          to: { kind: "node", nodeKey: "runLatch", portName: "set" }
        },
        {
          from: { kind: "boundary", family: "commands", portName: "reset" },
          to: { kind: "node", nodeKey: "runLatch", portName: "reset" }
        },
        {
          from: { kind: "node", nodeKey: "runLatch", portName: "out" },
          to: { kind: "node", nodeKey: "runConfirm", portName: "in1" }
        },
        {
          from: { kind: "boundary", family: "inputs", portName: "runFb" },
          to: { kind: "node", nodeKey: "runConfirm", portName: "in2" }
        },
        {
          from: { kind: "node", nodeKey: "runConfirm", portName: "out" },
          to: { kind: "boundary", family: "status", portName: "running" }
        },
        {
          from: { kind: "boundary", family: "inputs", portName: "pressureValue" },
          to: { kind: "node", nodeKey: "pressureCompare", portName: "value" }
        },
        {
          from: { kind: "node", nodeKey: "pressureMin", portName: "value" },
          to: { kind: "node", nodeKey: "pressureCompare", portName: "setpoint" }
        },
        {
          from: { kind: "node", nodeKey: "runConfirm", portName: "out" },
          to: { kind: "node", nodeKey: "readyAnd", portName: "in1" }
        },
        {
          from: { kind: "node", nodeKey: "pressureCompare", portName: "ok" },
          to: { kind: "node", nodeKey: "readyAnd", portName: "in2" }
        },
        {
          from: { kind: "node", nodeKey: "readyAnd", portName: "out" },
          to: { kind: "boundary", family: "status", portName: "ready" }
        },
        {
          from: { kind: "node", nodeKey: "readyAnd", portName: "out" },
          to: { kind: "node", nodeKey: "readyNot", portName: "in" }
        },
        {
          from: { kind: "boundary", family: "inputs", portName: "faultFb" },
          to: { kind: "node", nodeKey: "faultOr", portName: "in1" }
        },
        {
          from: { kind: "node", nodeKey: "readyNot", portName: "out" },
          to: { kind: "node", nodeKey: "faultOr", portName: "in2" }
        },
        {
          from: { kind: "node", nodeKey: "faultOr", portName: "out" },
          to: { kind: "boundary", family: "faults", portName: "fault" }
        }
      ]
    }
  },
  ReadyResolver: {
    ports: [
      { family: "inputs", name: "inA", summary: "First ready condition." },
      { family: "inputs", name: "inB", summary: "Second ready condition." },
      { family: "inputs", name: "inC", summary: "Third ready condition." },
      { family: "outputs", name: "ready", summary: "Resolved ready output." }
    ],
    structure: {
      summary: "Ready resolver chains simple AND blocks into one engineering-ready output.",
      nodes: [
        {
          key: "gateAB",
          title: "StageAB",
          kind: "AND",
          summary: "Combines the first two conditions.",
          position: { x: 300, y: 160 },
          inputs: [{ name: "in1" }, { name: "in2" }],
          outputs: [{ name: "out" }]
        },
        {
          key: "gateReady",
          title: "Ready",
          kind: "AND",
          summary: "Combines the intermediate result with the final condition.",
          position: { x: 560, y: 160 },
          inputs: [{ name: "in1" }, { name: "in2" }],
          outputs: [{ name: "out" }]
        }
      ],
      routes: [
        {
          from: { kind: "boundary", family: "inputs", portName: "inA" },
          to: { kind: "node", nodeKey: "gateAB", portName: "in1" }
        },
        {
          from: { kind: "boundary", family: "inputs", portName: "inB" },
          to: { kind: "node", nodeKey: "gateAB", portName: "in2" }
        },
        {
          from: { kind: "node", nodeKey: "gateAB", portName: "out" },
          to: { kind: "node", nodeKey: "gateReady", portName: "in1" }
        },
        {
          from: { kind: "boundary", family: "inputs", portName: "inC" },
          to: { kind: "node", nodeKey: "gateReady", portName: "in2" }
        },
        {
          from: { kind: "node", nodeKey: "gateReady", portName: "out" },
          to: { kind: "boundary", family: "outputs", portName: "ready" }
        }
      ]
    }
  },
  FaultAggregator: {
    ports: [
      { family: "inputs", name: "faultA", summary: "First fault input." },
      { family: "inputs", name: "faultB", summary: "Second fault input." },
      { family: "inputs", name: "faultC", summary: "Third fault input." },
      { family: "faults", name: "fault", summary: "Aggregated fault output." }
    ],
    structure: {
      summary: "Fault aggregator combines multiple inputs into one exported fault.",
      nodes: [
        {
          key: "faultPair",
          title: "StageAB",
          kind: "OR",
          summary: "Combines the first two fault conditions.",
          position: { x: 300, y: 160 },
          inputs: [{ name: "in1" }, { name: "in2" }],
          outputs: [{ name: "out" }]
        },
        {
          key: "faultAny",
          title: "Fault",
          kind: "OR",
          summary: "Combines the intermediate result with the final fault input.",
          position: { x: 560, y: 160 },
          inputs: [{ name: "in1" }, { name: "in2" }],
          outputs: [{ name: "out" }]
        }
      ],
      routes: [
        {
          from: { kind: "boundary", family: "inputs", portName: "faultA" },
          to: { kind: "node", nodeKey: "faultPair", portName: "in1" }
        },
        {
          from: { kind: "boundary", family: "inputs", portName: "faultB" },
          to: { kind: "node", nodeKey: "faultPair", portName: "in2" }
        },
        {
          from: { kind: "node", nodeKey: "faultPair", portName: "out" },
          to: { kind: "node", nodeKey: "faultAny", portName: "in1" }
        },
        {
          from: { kind: "boundary", family: "inputs", portName: "faultC" },
          to: { kind: "node", nodeKey: "faultAny", portName: "in2" }
        },
        {
          from: { kind: "node", nodeKey: "faultAny", portName: "out" },
          to: { kind: "boundary", family: "faults", portName: "fault" }
        }
      ]
    }
  }
};

export type UniversalPlcProjectDocument = UniversalPlcDemoProject;

export function createDefaultDeploymentConfig(): DeploymentConfig {
  return {
    controller: {
      target: "shipcontroller-esp32",
      activeBoard: "default",
      activeBoardTemplate: "",
      activeChipTemplate: ""
    },
    wifi: {
      mode: "sta",
      ssid: "Infinity-Starlink",
      password: "",
      apSsid: "ShipController",
      apPassword: "12345678",
      startupPolicy: "sta_fallback_ap"
    },
    oled: {
      enabled: true,
      showIpOnFallback: true,
      width: 128,
      height: 64,
      sda: 21,
      scl: 22,
      address: "0x3C"
    },
    led: {
      enabled: true,
      pin: 25
    },
    debug: {
      serialEnabled: true,
      webEnabled: true,
      livePreviewEnabled: true
    },
    displayScreens: []
  };
}

export function createBlinkOledScreenPreset(): DeploymentDisplayScreenConfig {
  return {
    id: "oled_blink_status",
    label: "Blink Status",
    refreshMs: 1000,
    widgets: [
      { id: "widget_ip", type: "text", label: "IP", signalKey: "system.ip", x: 0, y: 0, w: 128, h: 14 },
      { id: "widget_relay", type: "bool", label: "Relay", signalKey: "blink.relayState", x: 0, y: 16, w: 128, h: 14 },
      { id: "widget_phase", type: "text", label: "Phase", signalKey: "blink.phase", x: 0, y: 32, w: 128, h: 14 },
      {
        id: "widget_remaining",
        type: "number",
        label: "Remain",
        signalKey: "blink.remainingSeconds",
        x: 0,
        y: 48,
        w: 128,
        h: 14
      }
    ]
  };
}

export function ensureBlinkOledScreenPreset(
  screens: DeploymentDisplayScreenConfig[]
): DeploymentDisplayScreenConfig[] {
  const preset = createBlinkOledScreenPreset();
  const existing = screens.find((screen) => screen.id === preset.id);
  if (!existing) {
    return [...screens, preset];
  }

  return screens.map((screen) => (screen.id === preset.id ? preset : screen));
}

function normalizeDeploymentConfig(value: unknown): DeploymentConfig {
  const defaults = createDefaultDeploymentConfig();
  const raw = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const controller = typeof raw.controller === "object" && raw.controller !== null ? (raw.controller as Record<string, unknown>) : {};
  const wifi = typeof raw.wifi === "object" && raw.wifi !== null ? (raw.wifi as Record<string, unknown>) : {};
  const oled = typeof raw.oled === "object" && raw.oled !== null ? (raw.oled as Record<string, unknown>) : {};
  const led = typeof raw.led === "object" && raw.led !== null ? (raw.led as Record<string, unknown>) : {};
  const debug = typeof raw.debug === "object" && raw.debug !== null ? (raw.debug as Record<string, unknown>) : {};
  const rawScreens = Array.isArray(raw.displayScreens) ? raw.displayScreens : [];

  return {
    controller: {
      target: typeof controller.target === "string" ? controller.target : defaults.controller.target,
      activeBoard: typeof controller.activeBoard === "string" ? controller.activeBoard : defaults.controller.activeBoard,
      activeBoardTemplate:
        typeof controller.activeBoardTemplate === "string"
          ? controller.activeBoardTemplate
          : defaults.controller.activeBoardTemplate,
      activeChipTemplate:
        typeof controller.activeChipTemplate === "string"
          ? controller.activeChipTemplate
          : defaults.controller.activeChipTemplate
    },
    wifi: {
      mode: typeof wifi.mode === "string" ? wifi.mode : defaults.wifi.mode,
      ssid: typeof wifi.ssid === "string" ? wifi.ssid : defaults.wifi.ssid,
      password: typeof wifi.password === "string" ? wifi.password : defaults.wifi.password,
      apSsid: typeof wifi.apSsid === "string" ? wifi.apSsid : defaults.wifi.apSsid,
      apPassword: typeof wifi.apPassword === "string" ? wifi.apPassword : defaults.wifi.apPassword,
      startupPolicy: typeof wifi.startupPolicy === "string" ? wifi.startupPolicy : defaults.wifi.startupPolicy
    },
    oled: {
      enabled: typeof oled.enabled === "boolean" ? oled.enabled : defaults.oled.enabled,
      showIpOnFallback:
        typeof oled.showIpOnFallback === "boolean" ? oled.showIpOnFallback : defaults.oled.showIpOnFallback,
      width: typeof oled.width === "number" ? oled.width : defaults.oled.width,
      height: typeof oled.height === "number" ? oled.height : defaults.oled.height,
      sda: typeof oled.sda === "number" ? oled.sda : defaults.oled.sda,
      scl: typeof oled.scl === "number" ? oled.scl : defaults.oled.scl,
      address: typeof oled.address === "string" ? oled.address : defaults.oled.address
    },
    led: {
      enabled: typeof led.enabled === "boolean" ? led.enabled : defaults.led.enabled,
      pin: typeof led.pin === "number" ? led.pin : defaults.led.pin
    },
    debug: {
      serialEnabled: typeof debug.serialEnabled === "boolean" ? debug.serialEnabled : defaults.debug.serialEnabled,
      webEnabled: typeof debug.webEnabled === "boolean" ? debug.webEnabled : defaults.debug.webEnabled,
      livePreviewEnabled:
        typeof debug.livePreviewEnabled === "boolean" ? debug.livePreviewEnabled : defaults.debug.livePreviewEnabled
    },
    displayScreens: rawScreens
      .filter((screen): screen is Record<string, unknown> => typeof screen === "object" && screen !== null)
      .map((screen, index) => ({
        id: typeof screen.id === "string" ? screen.id : `screen_${index + 1}`,
        label: typeof screen.label === "string" ? screen.label : `Screen ${index + 1}`,
        refreshMs: typeof screen.refreshMs === "number" ? screen.refreshMs : 1000,
        widgets: Array.isArray(screen.widgets)
          ? screen.widgets
              .filter((widget): widget is Record<string, unknown> => typeof widget === "object" && widget !== null)
              .map((widget, widgetIndex) => ({
                id: typeof widget.id === "string" ? widget.id : `widget_${widgetIndex + 1}`,
                type: typeof widget.type === "string" ? widget.type : "value",
                label: typeof widget.label === "string" ? widget.label : "",
                signalKey: typeof widget.signalKey === "string" ? widget.signalKey : "",
                x: typeof widget.x === "number" ? widget.x : 0,
                y: typeof widget.y === "number" ? widget.y : 0,
                w: typeof widget.w === "number" ? widget.w : 0,
                h: typeof widget.h === "number" ? widget.h : 0
              }))
          : []
      }))
  };
}

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

function normalizeStructureNodeList(value: unknown): ObjectStructureNodeDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `node_${index + 1}`,
      title: typeof item.title === "string" ? item.title : `Node ${index + 1}`,
      kind: typeof item.kind === "string" ? item.kind : "Block",
      summary: typeof item.summary === "string" ? item.summary : "",
      refObjectId:
        typeof item.refObjectId === "string" || item.refObjectId === null ? (item.refObjectId as string | null) : null,
      position:
        typeof item.position === "object" &&
        item.position !== null &&
        typeof (item.position as Record<string, unknown>).x === "number" &&
        typeof (item.position as Record<string, unknown>).y === "number"
          ? {
              x: (item.position as Record<string, number>).x,
              y: (item.position as Record<string, number>).y
            }
          : { x: 80, y: 80 },
      inputs: normalizePortList(item.inputs, "input"),
      outputs: normalizePortList(item.outputs, "output"),
      parameters: typeof item.parameters === "object" && item.parameters !== null ? (item.parameters as Record<string, unknown>) : undefined,
      relatedSignalIds: Array.isArray(item.relatedSignalIds) ? (item.relatedSignalIds as string[]) : undefined,
      relatedBlockIds: Array.isArray(item.relatedBlockIds) ? (item.relatedBlockIds as string[]) : undefined,
      relatedBindingIds: Array.isArray(item.relatedBindingIds) ? (item.relatedBindingIds as string[]) : undefined
    }));
}

function normalizeStructureDefinition(value: unknown): ObjectStructureDefinition | undefined {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  const raw = value as Record<string, unknown>;
  return {
    summary: typeof raw.summary === "string" ? raw.summary : "Internal parts, ports and local routes inside this object.",
    nodes: normalizeStructureNodeList(raw.nodes),
    routes: Array.isArray(raw.routes) ? (raw.routes as ObjectStructureRouteDefinition[]) : []
  };
}

function normalizeProjectDocument(project: UniversalPlcProjectDocument): UniversalPlcDemoProject {
  return {
    ...project,
    deployment: normalizeDeploymentConfig((project as unknown as Record<string, unknown>).deployment),
    objects: (project.objects ?? []).map((object) => {
      const rawObject = object as unknown as Record<string, unknown>;

      return {
        ...object,
        type: typeof object.type === "string" ? object.type : "CustomObject",
        summary: typeof object.summary === "string" ? object.summary : "",
        nativeConfig:
          typeof rawObject.nativeConfig === "object" && rawObject.nativeConfig !== null
            ? (rawObject.nativeConfig as Record<string, unknown>)
            : undefined,
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
        faults: normalizePortList(rawObject.faults ?? rawObject.alarms, "fault"),
        structure: normalizeStructureDefinition(rawObject.structure),
        behavior:
          typeof rawObject.behavior === "object" && rawObject.behavior !== null
            ? (rawObject.behavior as ObjectBehaviorDefinition)
            : undefined
      };
    }),
    compositionLinks: project.compositionLinks ?? [],
    machines: project.machines ?? [],
    signals: project.signals ?? [],
    bindings: (project.bindings ?? []).map((binding, index) => {
      const rawBinding = binding as unknown as Record<string, unknown>;
      return {
        id: typeof binding.id === "string" ? binding.id : `binding_${index + 1}`,
        signalId: typeof binding.signalId === "string" ? binding.signalId : "",
        physicalSource: typeof binding.physicalSource === "string" ? binding.physicalSource : "",
        direction: binding.direction === "output" ? "output" : "input",
        type: binding.type === "analog" ? "analog" : "bool",
        bindingKind:
          typeof rawBinding.bindingKind === "string"
            ? (rawBinding.bindingKind as IoBindingDefinition["bindingKind"])
            : undefined,
        resourceId: typeof rawBinding.resourceId === "string" ? rawBinding.resourceId : undefined,
        gpio: typeof rawBinding.gpio === "number" ? rawBinding.gpio : undefined,
        status:
          typeof binding.status === "boolean" || typeof binding.status === "number" ? binding.status : undefined,
        debounceMs: typeof binding.debounceMs === "number" ? binding.debounceMs : undefined,
        inverted: typeof binding.inverted === "boolean" ? binding.inverted : undefined,
        initialState: typeof rawBinding.initialState === "boolean" ? rawBinding.initialState : undefined,
        scale: typeof binding.scale === "string" ? binding.scale : undefined,
        failSafeValue:
          typeof binding.failSafeValue === "boolean" || typeof binding.failSafeValue === "number"
            ? binding.failSafeValue
            : undefined
      };
    }),
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
    deployment: createDefaultDeploymentConfig(),
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

function findPortByNameForFamily(
  object: PlcObjectDefinition,
  family: ObjectContractFamily,
  portName: string
) {
  return object[family].find((port) => port.name === portName) ?? null;
}

function applyBuiltinTemplateSeed(object: PlcObjectDefinition) {
  const seed = BUILTIN_OBJECT_TEMPLATE_SEEDS[object.type];
  if (!seed) {
    return object;
  }

  let nextObject = { ...object };

  if (seed.nativeConfig) {
    nextObject = {
      ...nextObject,
      nativeConfig: structuredClone(seed.nativeConfig)
    };
  }

  for (const portSeed of seed.ports) {
    const alreadyExists = nextObject[portSeed.family].some((port) => port.name === portSeed.name);
    if (alreadyExists) {
      continue;
    }

    const nextPort = createObjectPortDefinition(nextObject, portSeed.family, {
      name: portSeed.name,
      dataType: portSeed.dataType ?? "bool",
      summary: portSeed.summary
    });

    nextObject = {
      ...nextObject,
      [portSeed.family]: [...nextObject[portSeed.family], nextPort]
    };
  }

  if (!seed.structure) {
    return nextObject;
  }

  let structuredObject: PlcObjectDefinition = {
    ...nextObject,
    structure: createObjectStructureDefinition(seed.structure.summary)
  };

  const nodeIdByKey = new Map<string, string>();

  for (const nodeSeed of seed.structure.nodes) {
    const builtinBlock = getBuiltinBlockByKind(nodeSeed.kind);
    const nextNode = createObjectStructureNodeDefinition(structuredObject, {
      title: nodeSeed.title,
      kind: nodeSeed.kind,
      summary: nodeSeed.summary,
      position: nodeSeed.position,
      inputs: nodeSeed.inputs ?? builtinBlock?.inputs,
      outputs: nodeSeed.outputs ?? builtinBlock?.outputs
    });

    nodeIdByKey.set(nodeSeed.key, nextNode.id);
    structuredObject = {
      ...structuredObject,
      structure: {
        ...structuredObject.structure!,
        nodes: [...structuredObject.structure!.nodes, nextNode]
      }
    };
  }

  const routes = seed.structure.routes
    .map((routeSeed) => {
      const resolveEndpoint = (
        endpoint: BuiltinTemplateStructureEndpointSeed
      ): ObjectStructureRouteEndpointDefinition | null => {
        if (endpoint.kind === "boundary") {
          if (!endpoint.family) {
            return null;
          }

          const port = findPortByNameForFamily(structuredObject, endpoint.family, endpoint.portName);
          if (!port) {
            return null;
          }

          return {
            kind: "boundary",
            portKind: port.kind,
            portId: port.id
          };
        }

        const nodeId = endpoint.nodeKey ? nodeIdByKey.get(endpoint.nodeKey) ?? null : null;
        const node = nodeId ? structuredObject.structure?.nodes.find((item) => item.id === nodeId) ?? null : null;
        const port =
          node?.inputs.find((item) => item.name === endpoint.portName) ??
          node?.outputs.find((item) => item.name === endpoint.portName) ??
          null;

        if (!node || !port) {
          return null;
        }

        return {
          kind: "node",
          nodeId: node.id,
          portId: port.id
        };
      };

      const from = resolveEndpoint(routeSeed.from);
      const to = resolveEndpoint(routeSeed.to);
      if (!from || !to) {
        return null;
      }

      return createObjectStructureRouteDefinition(structuredObject, {
        label: routeSeed.label ?? "",
        from,
        to
      });
    })
    .filter((route): route is ObjectStructureRouteDefinition => Boolean(route));

  return {
    ...structuredObject,
    structure: {
      ...structuredObject.structure!,
      routes
    }
  };
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
    nativeConfig?: Record<string, unknown>;
    parentObjectId?: string | null;
  }
): PlcObjectDefinition {
  const id = createUniqueId(input.name || input.type || "object", project.objects.map((object) => object.id));
  return applyBuiltinTemplateSeed({
    id,
    name: input.name.trim() || "New Object",
    type: input.type?.trim() || "CustomObject",
    behaviorKind: input.behaviorKind,
    summary: input.summary?.trim() || "Describe what this object owns and exports.",
    nativeConfig: input.nativeConfig ? structuredClone(input.nativeConfig) : undefined,
    parentObjectId: input.parentObjectId ?? null,
    topologyPosition: null,
    commands: [],
    inputs: [],
    outputs: [],
    status: [],
    permissions: [],
    faults: []
  });
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
    refObjectId?: string | null;
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
    refObjectId: input.refObjectId ?? null,
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
  return cloneProjectDocument(demoProjectDocument as unknown as UniversalPlcProjectDocument);
}

export const demoProjectSource = demoProjectDocument as unknown as UniversalPlcProjectDocument;
export const demoProject = loadDemoProject();
