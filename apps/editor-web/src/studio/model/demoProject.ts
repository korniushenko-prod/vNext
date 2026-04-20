export type WorkspaceId = "bind" | "logic" | "machine" | "observe";
export type BehaviorKind = "sequence" | "control" | "monitoring";
export type ObjectPortKind = "command" | "input" | "output" | "status" | "permission" | "alarm";
export type DataType = "bool" | "number" | "string" | "enum";

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
  type: "bool" | "number" | "string";
  direction: "input" | "output" | "internal";
  value?: boolean | number | string;
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
  type: "StartStopLatch" | "ThresholdMonitor" | "TimerOn" | "InterlockSet" | "PermissiveMatrix" | "Pid";
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

const burnerMachine: MachineDefinition = {
  id: "boiler_sequence",
  name: "Burner Start / Run Sequence",
  behaviorKind: "sequence",
  behaviorSummary: {
    primaryStateIds: ["idle", "pre_start_checks", "pre_purge", "ignition", "flame_proving", "low_fire_stabilize", "modulating_run"],
    faultStateIds: ["fault_lockout"],
    recoveryTransitionIds: ["trx_reset"]
  },
  sections: [
    { id: "sec_preparation", name: "Preparation", summary: "Pre-start permissives and purge preparation.", color: "#3f78ff", regionIds: ["region_startup"], relatedSignalIds: ["operator.burner_start_cmd", "trip_chain_healthy"], relatedBlockIds: ["block_permissive_matrix"], relatedBindingIds: ["bind_burner_start", "bind_trip_chain"] },
    { id: "sec_lightoff", name: "Light-off", summary: "Ignition, flame proving and low-fire stabilization.", color: "#3ec6c0", regionIds: ["region_lightoff"], relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "sec_run", name: "Run", summary: "Sustained firing with pressure-driven demand.", color: "#56c38c", regionIds: ["region_run"], relatedSignalIds: ["steam.pressure"], relatedBlockIds: ["block_pressure_pid"], relatedBindingIds: ["bind_steam_pressure"] },
    { id: "sec_shutdown", name: "Shutdown", summary: "Controlled stop and post-purge path.", color: "#7f9bc0", regionIds: ["region_shutdown"], relatedSignalIds: ["operator.burner_stop_cmd"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_burner_stop"] },
    { id: "sec_fault", name: "Fault", summary: "Trip, lockout and reset handling.", color: "#ff6f7d", regionIds: ["region_fault"], relatedSignalIds: ["low_low_water_trip", "trip_chain_healthy"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_low_low_water_trip", "bind_trip_chain"] }
  ],
  regions: [
    { id: "region_startup", name: "Startup Path", type: "sequence", summary: "Start request, permissives and purge.", color: "#284c8a", stateIds: ["idle", "pre_start_checks", "pre_purge"], relatedSignalIds: ["operator.burner_start_cmd", "trip_chain_healthy"], relatedBlockIds: ["block_start_stop_latch", "block_permissive_matrix"], relatedBindingIds: ["bind_burner_start", "bind_trip_chain"] },
    { id: "region_lightoff", name: "Ignition Path", type: "sequence", summary: "Ignition and flame validation.", color: "#2f6f7b", stateIds: ["ignition", "flame_proving", "low_fire_stabilize"], relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "region_run", name: "Run Path", type: "sequence", summary: "Normal modulation under pressure demand.", color: "#256f57", stateIds: ["modulating_run"], relatedSignalIds: ["steam.pressure"], relatedBlockIds: ["block_pressure_pid"], relatedBindingIds: ["bind_steam_pressure"] },
    { id: "region_shutdown", name: "Shutdown Path", type: "sequence", summary: "Normal stop and post-purge cleanup.", color: "#4c5f7a", stateIds: ["normal_stop", "post_purge"], relatedSignalIds: ["operator.burner_stop_cmd"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_burner_stop"] },
    { id: "region_fault", name: "Fault Path", type: "fault", summary: "Trip and lockout path until manual reset.", color: "#8d3f52", stateIds: ["fault_lockout"], relatedSignalIds: ["low_low_water_trip", "trip_chain_healthy"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_low_low_water_trip", "bind_trip_chain"] }
  ],
  sceneGroups: [
    { id: "grp_startup", name: "Startup Envelope", summary: "Bring auxiliaries and permissives to a startable state.", color: "#3d7eff", stateIds: ["idle", "pre_start_checks", "pre_purge"], sectionIds: ["sec_preparation"], regionIds: ["region_startup"], relatedSignalIds: ["operator.burner_start_cmd", "trip_chain_healthy"], relatedBlockIds: ["block_start_stop_latch", "block_permissive_matrix"], relatedBindingIds: ["bind_burner_start", "bind_trip_chain"] },
    { id: "grp_lightoff", name: "Flame Establishment", summary: "Establish flame and stabilize at low fire.", color: "#45c8ba", stateIds: ["ignition", "flame_proving", "low_fire_stabilize"], sectionIds: ["sec_lightoff"], regionIds: ["region_lightoff"], relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "grp_run", name: "Normal Operation", summary: "Run under demand and pressure regulation.", color: "#53c686", stateIds: ["modulating_run", "normal_stop", "post_purge"], sectionIds: ["sec_run", "sec_shutdown"], regionIds: ["region_run", "region_shutdown"], relatedSignalIds: ["steam.pressure", "operator.burner_stop_cmd"], relatedBlockIds: ["block_pressure_pid", "block_timer_on"], relatedBindingIds: ["bind_steam_pressure", "bind_burner_stop"] },
    { id: "grp_fault", name: "Fault Handling", summary: "Trip containment and manual recovery.", color: "#ff7488", stateIds: ["fault_lockout"], sectionIds: ["sec_fault"], regionIds: ["region_fault"], relatedSignalIds: ["low_low_water_trip"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_low_low_water_trip"] }
  ],
  states: [
    { id: "idle", name: "Idle", kind: "initial", position: { x: 80, y: 240 }, sectionId: "sec_preparation", regionId: "region_startup", entryActions: ["clear start latch"], relatedSignalIds: ["operator.burner_start_cmd"], relatedBlockIds: ["block_start_stop_latch"], relatedBindingIds: ["bind_burner_start"] },
    { id: "pre_start_checks", name: "PreStartChecks", kind: "normal", position: { x: 360, y: 160 }, sectionId: "sec_preparation", regionId: "region_startup", entryActions: ["verify permissives"], timeoutMs: 4000, relatedSignalIds: ["trip_chain_healthy", "boiler.water_level"], relatedBlockIds: ["block_permissive_matrix"], relatedBindingIds: ["bind_trip_chain", "bind_water_level"] },
    { id: "pre_purge", name: "PrePurge", kind: "normal", position: { x: 640, y: 160 }, sectionId: "sec_preparation", regionId: "region_startup", entryActions: ["fan start", "damper open"], timeoutMs: 15000, relatedSignalIds: ["fan.run_fb"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_fan_run"] },
    { id: "ignition", name: "Ignition", kind: "normal", position: { x: 920, y: 180 }, sectionId: "sec_lightoff", regionId: "region_lightoff", entryActions: ["igniter on", "pilot fuel open"], timeoutMs: 5000, relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "flame_proving", name: "FlameProving", kind: "normal", position: { x: 1180, y: 180 }, sectionId: "sec_lightoff", regionId: "region_lightoff", entryActions: ["prove flame"], timeoutMs: 3000, relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "low_fire_stabilize", name: "LowFireStabilize", kind: "normal", position: { x: 1460, y: 180 }, sectionId: "sec_lightoff", regionId: "region_lightoff", entryActions: ["hold low fire"], timeoutMs: 8000, relatedSignalIds: ["steam.pressure"], relatedBlockIds: ["block_pressure_pid"], relatedBindingIds: ["bind_steam_pressure"] },
    { id: "modulating_run", name: "ModulatingRun", kind: "normal", active: true, position: { x: 1460, y: 430 }, sectionId: "sec_run", regionId: "region_run", entryActions: ["enable pressure loop"], relatedSignalIds: ["steam.pressure"], relatedBlockIds: ["block_pressure_pid"], relatedBindingIds: ["bind_steam_pressure"] },
    { id: "normal_stop", name: "NormalStop", kind: "final", position: { x: 1120, y: 430 }, sectionId: "sec_shutdown", regionId: "region_shutdown", entryActions: ["close main fuel"], timeoutMs: 4000, relatedSignalIds: ["operator.burner_stop_cmd"], relatedBlockIds: ["block_start_stop_latch"], relatedBindingIds: ["bind_burner_stop"] },
    { id: "post_purge", name: "PostPurge", kind: "final", position: { x: 840, y: 430 }, sectionId: "sec_shutdown", regionId: "region_shutdown", entryActions: ["fan cool-down purge"], timeoutMs: 10000, relatedSignalIds: ["fan.run_fb"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_fan_run"] },
    { id: "fault_lockout", name: "FaultLockout", kind: "fault", position: { x: 1200, y: 30 }, sectionId: "sec_fault", regionId: "region_fault", entryActions: ["trip fuel", "latch fault"], relatedSignalIds: ["low_low_water_trip", "trip_chain_healthy"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_low_low_water_trip", "bind_trip_chain"] }
  ],
  transitions: [
    { id: "trx_start", source: "idle", target: "pre_start_checks", sectionId: "sec_preparation", event: "start", relatedSignalIds: ["operator.burner_start_cmd"], relatedBlockIds: ["block_start_stop_latch"], relatedBindingIds: ["bind_burner_start"] },
    { id: "trx_permissives_ok", source: "pre_start_checks", target: "pre_purge", sectionId: "sec_preparation", guard: "permissives_ok", relatedSignalIds: ["trip_chain_healthy", "boiler.water_level"], relatedBlockIds: ["block_permissive_matrix"], relatedBindingIds: ["bind_trip_chain", "bind_water_level"] },
    { id: "trx_purge_complete", source: "pre_purge", target: "ignition", sectionId: "sec_lightoff", guard: "purge_complete", delayMs: 15000, relatedSignalIds: ["fan.run_fb"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_fan_run"] },
    { id: "trx_ignition_started", source: "ignition", target: "flame_proving", sectionId: "sec_lightoff", event: "ignition_started", relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "trx_flame_detected", source: "flame_proving", target: "low_fire_stabilize", sectionId: "sec_lightoff", guard: "flame_detected", relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "trx_flame_proved", source: "low_fire_stabilize", target: "modulating_run", sectionId: "sec_run", event: "flame_proved", relatedSignalIds: ["steam.pressure"], relatedBlockIds: ["block_pressure_pid"], relatedBindingIds: ["bind_steam_pressure"] },
    { id: "trx_stop", source: "modulating_run", target: "normal_stop", sectionId: "sec_shutdown", event: "stop", relatedSignalIds: ["operator.burner_stop_cmd"], relatedBlockIds: ["block_start_stop_latch"], relatedBindingIds: ["bind_burner_stop"] },
    { id: "trx_postpurge", source: "normal_stop", target: "post_purge", sectionId: "sec_shutdown", guard: "fuel_closed", delayMs: 4000, relatedSignalIds: ["fan.run_fb"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_fan_run"] },
    { id: "trx_postpurge_done", source: "post_purge", target: "idle", sectionId: "sec_shutdown", guard: "postpurge_done", delayMs: 10000, relatedSignalIds: ["fan.run_fb"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_fan_run"] },
    { id: "trx_trip_from_checks", source: "pre_start_checks", target: "fault_lockout", sectionId: "sec_fault", guard: "trip", relatedSignalIds: ["low_low_water_trip", "trip_chain_healthy"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_low_low_water_trip", "bind_trip_chain"] },
    { id: "trx_trip_from_purge", source: "pre_purge", target: "fault_lockout", sectionId: "sec_fault", guard: "timeout", delayMs: 15000, relatedSignalIds: ["fan.run_fb"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_fan_run"] },
    { id: "trx_trip_from_ignition", source: "ignition", target: "fault_lockout", sectionId: "sec_fault", guard: "flame_fail", delayMs: 5000, relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
    { id: "trx_trip_from_run", source: "modulating_run", target: "fault_lockout", sectionId: "sec_fault", guard: "trip", relatedSignalIds: ["low_low_water_trip"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_low_low_water_trip"] },
    { id: "trx_reset", source: "fault_lockout", target: "idle", sectionId: "sec_fault", event: "reset", action: "clear lockout", relatedSignalIds: ["operator.burner_reset_cmd"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_burner_reset"] }
  ]
};

export const demoProject: UniversalPlcDemoProject = {
  id: "saacke_marine_boiler",
  name: "SAACKE-style Marine Boiler",
  objects: [
    {
      id: "boiler_supervisor",
      name: "BoilerSupervisor",
      type: "BoilerSupervisor",
      behaviorKind: "control",
      summary: "Plant-level orchestration and overview of demand, run-state and trips.",
      commands: [],
      inputs: [{ id: "sup_in_pressure", name: "steamDemand", kind: "input", dataType: "number", summary: "Desired steam pressure or demand reference." }],
      outputs: [{ id: "sup_out_ready", name: "boilerReady", kind: "output", dataType: "bool", summary: "Boiler package is ready for controlled firing." }],
      status: [{ id: "sup_status_mode", name: "supervisorState", kind: "status", dataType: "enum", summary: "Current supervisory state." }],
      permissions: [],
      alarms: [{ id: "sup_alarm_trip", name: "plantTrip", kind: "alarm", dataType: "bool", summary: "Overall boiler trip state." }]
    },
    {
      id: "operator_panel_selectors",
      name: "OperatorPanelSelectors",
      type: "OperatorPanelSelectors",
      behaviorKind: "control",
      summary: "Semantic operator commands and selector outputs after conditioning.",
      commands: [],
      inputs: [],
      outputs: [
        { id: "ops_out_start", name: "burnerStartCmd", kind: "output", dataType: "bool", summary: "Operator requests burner start." },
        { id: "ops_out_stop", name: "burnerStopCmd", kind: "output", dataType: "bool", summary: "Operator requests burner stop." },
        { id: "ops_out_reset", name: "burnerResetCmd", kind: "output", dataType: "bool", summary: "Operator requests burner reset." }
      ],
      status: [
        { id: "ops_status_mode", name: "burnerMode", kind: "status", dataType: "enum", summary: "AUTO or MANUAL operating mode." },
        { id: "ops_status_lead", name: "leadFeedPump", kind: "status", dataType: "enum", summary: "Selected lead feedwater pump." }
      ],
      permissions: [],
      alarms: []
    },
    {
      id: "burner",
      name: "Burner",
      type: "Burner",
      behaviorKind: "sequence",
      summary: "Owns start sequence, ignition, flame proving, modulation and safe shutdown.",
      commands: [
        { id: "burner_cmd_start", name: "start", kind: "command", dataType: "bool", summary: "Request burner start sequence." },
        { id: "burner_cmd_stop", name: "stop", kind: "command", dataType: "bool", summary: "Request controlled burner stop." },
        { id: "burner_cmd_reset", name: "reset", kind: "command", dataType: "bool", summary: "Reset burner lockout." }
      ],
      inputs: [
        { id: "burner_in_fuel_ready", name: "fuelReady", kind: "input", dataType: "bool", summary: "Fuel train is prepared and ready." },
        { id: "burner_in_air_ready", name: "airReady", kind: "input", dataType: "bool", summary: "Combustion air train is ready." },
        { id: "burner_in_water_ok", name: "waterOk", kind: "input", dataType: "bool", summary: "Feedwater and drum level are within safe limits." },
        { id: "burner_in_start_perm", name: "startPermissive", kind: "input", dataType: "bool", summary: "Protection chain permits start." },
        { id: "burner_in_mode", name: "burnerMode", kind: "input", dataType: "enum", summary: "Semantic operating mode." },
        { id: "burner_in_flame", name: "flameDetected", kind: "input", dataType: "bool", summary: "Flame scanner confirms flame." }
      ],
      outputs: [
        { id: "burner_out_request_fuel", name: "requestFuel", kind: "output", dataType: "bool", summary: "Ask fuel group to prepare fuel path." },
        { id: "burner_out_request_air", name: "requestAir", kind: "output", dataType: "bool", summary: "Ask air group to provide purge and combustion air." },
        { id: "burner_out_running", name: "running", kind: "output", dataType: "bool", summary: "Burner is in sustained run." },
        { id: "burner_out_ignition", name: "ignitionActive", kind: "output", dataType: "bool", summary: "Ignition equipment should be energized." }
      ],
      status: [
        { id: "burner_status_state", name: "state", kind: "status", dataType: "enum", summary: "Current burner sequence state." },
        { id: "burner_status_load", name: "loadDemand", kind: "status", dataType: "number", summary: "Demand handed to modulation / servo layer." }
      ],
      permissions: [{ id: "burner_perm_ready_to_ignite", name: "readyToIgnite", kind: "permission", dataType: "bool", summary: "All preconditions are satisfied for light-off." }],
      alarms: [
        { id: "burner_alarm_fault", name: "burnerFault", kind: "alarm", dataType: "bool", summary: "Any burner lockout condition." },
        { id: "burner_alarm_flame_fail", name: "flameFail", kind: "alarm", dataType: "bool", summary: "Flame did not establish or was lost." },
        { id: "burner_alarm_timeout", name: "startTimeout", kind: "alarm", dataType: "bool", summary: "Start sequence timed out." }
      ],
      behavior: { machineId: "boiler_sequence", summary: "Sequence-first object: permissives, purge, ignition, flame proving, run, stop and lockout." },
      structure: {
        summary: "Ports and internal units for burner sequence, ignition, flame supervision and fault handling.",
        nodes: [
          { id: "burner_sequence_unit", title: "BurnerSequence", kind: "sequence", summary: "Owns start, purge, ignition and stop order.", position: { x: 180, y: 120 }, inputs: [{ id: "seq_in_start", name: "start", kind: "input", dataType: "bool", summary: "Start request." }, { id: "seq_in_stop", name: "stop", kind: "input", dataType: "bool", summary: "Stop request." }, { id: "seq_in_perm", name: "startPerm", kind: "input", dataType: "bool", summary: "Start permissive." }], outputs: [{ id: "seq_out_req_fuel", name: "requestFuel", kind: "output", dataType: "bool", summary: "Prepare fuel train." }, { id: "seq_out_req_air", name: "requestAir", kind: "output", dataType: "bool", summary: "Prepare air path." }, { id: "seq_out_ignite", name: "ignite", kind: "output", dataType: "bool", summary: "Ignition demand." }, { id: "seq_out_run", name: "running", kind: "output", dataType: "bool", summary: "Sustained run." }], relatedSignalIds: ["operator.burner_start_cmd", "operator.burner_stop_cmd"], relatedBlockIds: ["block_start_stop_latch"], relatedBindingIds: ["bind_burner_start", "bind_burner_stop"] },
          { id: "ignition_unit", title: "IgnitionUnit", kind: "control", summary: "Handles igniter and pilot demand timing.", position: { x: 520, y: 90 }, inputs: [{ id: "ign_in_ignite", name: "ignite", kind: "input", dataType: "bool", summary: "Light-off demand." }], outputs: [{ id: "ign_out_active", name: "ignitionActive", kind: "output", dataType: "bool", summary: "Ignition output active." }], relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_timer_on"], relatedBindingIds: ["bind_flame_detected"] },
          { id: "flame_supervision_unit", title: "FlameSupervision", kind: "monitoring", summary: "Proves flame and raises flame-fail if absent.", position: { x: 520, y: 300 }, inputs: [{ id: "flame_in_detected", name: "flameDetected", kind: "input", dataType: "bool", summary: "Scanner feedback." }, { id: "flame_in_running", name: "running", kind: "input", dataType: "bool", summary: "Burner run state." }], outputs: [{ id: "flame_out_ok", name: "flameOk", kind: "output", dataType: "bool", summary: "Flame proved." }, { id: "flame_out_fail", name: "flameFail", kind: "output", dataType: "bool", summary: "Flame supervision failure." }], relatedSignalIds: ["flame.detected"], relatedBlockIds: ["block_flame_prover"], relatedBindingIds: ["bind_flame_detected"] },
          { id: "fault_manager", title: "FaultManager", kind: "monitoring", summary: "Collects trips and latches burner lockout.", position: { x: 860, y: 180 }, inputs: [{ id: "fault_in_flame_fail", name: "flameFail", kind: "input", dataType: "bool", summary: "Flame supervision trip." }, { id: "fault_in_reset", name: "reset", kind: "input", dataType: "bool", summary: "Reset command." }], outputs: [{ id: "fault_out_lockout", name: "burnerFault", kind: "output", dataType: "bool", summary: "Burner lockout." }], relatedSignalIds: ["operator.burner_reset_cmd", "low_low_water_trip"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_burner_reset", "bind_low_low_water_trip"] }
        ],
        routes: [
          { id: "route_start_to_seq", label: "start", from: { kind: "boundary", portId: "burner_cmd_start", portKind: "command" }, to: { kind: "node", nodeId: "burner_sequence_unit", portId: "seq_in_start" } },
          { id: "route_stop_to_seq", label: "stop", from: { kind: "boundary", portId: "burner_cmd_stop", portKind: "command" }, to: { kind: "node", nodeId: "burner_sequence_unit", portId: "seq_in_stop" } },
          { id: "route_perm_to_seq", label: "start permissive", from: { kind: "boundary", portId: "burner_in_start_perm", portKind: "input" }, to: { kind: "node", nodeId: "burner_sequence_unit", portId: "seq_in_perm" } },
          { id: "route_seq_to_air", label: "requestAir", from: { kind: "node", nodeId: "burner_sequence_unit", portId: "seq_out_req_air" }, to: { kind: "boundary", portId: "burner_out_request_air", portKind: "output" } },
          { id: "route_seq_to_fuel", label: "requestFuel", from: { kind: "node", nodeId: "burner_sequence_unit", portId: "seq_out_req_fuel" }, to: { kind: "boundary", portId: "burner_out_request_fuel", portKind: "output" } },
          { id: "route_seq_to_ignite", label: "ignite", from: { kind: "node", nodeId: "burner_sequence_unit", portId: "seq_out_ignite" }, to: { kind: "node", nodeId: "ignition_unit", portId: "ign_in_ignite" } },
          { id: "route_ignite_to_boundary", label: "ignitionActive", from: { kind: "node", nodeId: "ignition_unit", portId: "ign_out_active" }, to: { kind: "boundary", portId: "burner_out_ignition", portKind: "output" } },
          { id: "route_run_to_flame", label: "running", from: { kind: "node", nodeId: "burner_sequence_unit", portId: "seq_out_run" }, to: { kind: "node", nodeId: "flame_supervision_unit", portId: "flame_in_running" } },
          { id: "route_flame_input", label: "scanner", from: { kind: "boundary", portId: "burner_in_flame", portKind: "input" }, to: { kind: "node", nodeId: "flame_supervision_unit", portId: "flame_in_detected" } },
          { id: "route_flame_fail", label: "flameFail", from: { kind: "node", nodeId: "flame_supervision_unit", portId: "flame_out_fail" }, to: { kind: "node", nodeId: "fault_manager", portId: "fault_in_flame_fail" } },
          { id: "route_reset_fault", label: "reset", from: { kind: "boundary", portId: "burner_cmd_reset", portKind: "command" }, to: { kind: "node", nodeId: "fault_manager", portId: "fault_in_reset" } },
          { id: "route_fault_to_alarm", label: "burnerFault", from: { kind: "node", nodeId: "fault_manager", portId: "fault_out_lockout" }, to: { kind: "boundary", portId: "burner_alarm_fault", portKind: "alarm" } }
        ]
      }
    },
    {
      id: "fuel_group",
      name: "FuelGroup",
      type: "FuelGroup",
      behaviorKind: "control",
      summary: "Prepares fuel mode, circulation path and ready-to-burn confirmation.",
      commands: [{ id: "fuel_cmd_prepare", name: "prepareFuel", kind: "command", dataType: "bool", summary: "Prepare fuel path for burner demand." }],
      inputs: [
        { id: "fuel_in_request", name: "burnerRequest", kind: "input", dataType: "bool", summary: "Burner requests fuel availability." },
        { id: "fuel_in_mode", name: "fuelModeSelect", kind: "input", dataType: "enum", summary: "Semantic fuel mode selection." }
      ],
      outputs: [{ id: "fuel_out_ready", name: "fuelReady", kind: "output", dataType: "bool", summary: "Fuel train is ready." }],
      status: [
        { id: "fuel_status_mode", name: "activeFuelMode", kind: "status", dataType: "enum", summary: "Current active fuel mode." },
        { id: "fuel_status_temp", name: "fuelTemperatureOk", kind: "status", dataType: "bool", summary: "Fuel temperature within acceptable band." },
        { id: "fuel_status_pressure", name: "fuelPressureOk", kind: "status", dataType: "bool", summary: "Fuel pressure within acceptable band." }
      ],
      permissions: [{ id: "fuel_perm_ready", name: "ready", kind: "permission", dataType: "bool", summary: "Fuel subsystem is ready for burner sequence." }],
      alarms: [{ id: "fuel_alarm_fault", name: "fuelFault", kind: "alarm", dataType: "bool", summary: "Any fuel preparation or circulation fault." }],
      structure: {
        summary: "Internal fuel mode selection, pump/circulation control and ready evaluation.",
        nodes: [
          { id: "fuel_mode_selector", title: "FuelModeSelector", kind: "control", summary: "Determines active fuel path and mode.", position: { x: 180, y: 110 }, inputs: [{ id: "mode_sel", name: "fuelModeSelect", kind: "input", dataType: "enum", summary: "Selected fuel mode." }], outputs: [{ id: "mode_active", name: "activeMode", kind: "output", dataType: "enum", summary: "Active fuel mode." }], relatedSignalIds: ["operator.burner_mode"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: [] },
          { id: "fuel_pump_control", title: "FuelPumpControl", kind: "control", summary: "Starts circulation / fuel pump path for burner demand.", position: { x: 500, y: 110 }, inputs: [{ id: "pump_request", name: "burnerRequest", kind: "input", dataType: "bool", summary: "Burner demands fuel." }, { id: "pump_mode", name: "activeMode", kind: "input", dataType: "enum", summary: "Chosen mode." }], outputs: [{ id: "pump_running", name: "circulationActive", kind: "output", dataType: "bool", summary: "Fuel circulation path active." }], relatedSignalIds: ["fuel_pump.run_fb"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: ["bind_fuel_pump_run"] },
          { id: "fuel_ready_evaluator", title: "FuelReadyEvaluator", kind: "monitoring", summary: "Combines pump, temperature and pressure health into fuelReady.", position: { x: 820, y: 180 }, inputs: [{ id: "ready_pump", name: "circulationActive", kind: "input", dataType: "bool", summary: "Pump path active." }], outputs: [{ id: "ready_out", name: "fuelReady", kind: "output", dataType: "bool", summary: "Fuel ready for burner." }, { id: "ready_fault", name: "fuelFault", kind: "output", dataType: "bool", summary: "Fuel subsystem fault." }], relatedSignalIds: ["fuel_pump.run_fb"], relatedBlockIds: ["block_permissive_matrix"], relatedBindingIds: ["bind_fuel_pump_run"] }
        ],
        routes: [
          { id: "fuel_route_mode", label: "mode", from: { kind: "boundary", portId: "fuel_in_mode", portKind: "input" }, to: { kind: "node", nodeId: "fuel_mode_selector", portId: "mode_sel" } },
          { id: "fuel_route_request", label: "burner request", from: { kind: "boundary", portId: "fuel_in_request", portKind: "input" }, to: { kind: "node", nodeId: "fuel_pump_control", portId: "pump_request" } },
          { id: "fuel_route_mode_active", label: "active mode", from: { kind: "node", nodeId: "fuel_mode_selector", portId: "mode_active" }, to: { kind: "node", nodeId: "fuel_pump_control", portId: "pump_mode" } },
          { id: "fuel_route_circ", label: "circulation", from: { kind: "node", nodeId: "fuel_pump_control", portId: "pump_running" }, to: { kind: "node", nodeId: "fuel_ready_evaluator", portId: "ready_pump" } },
          { id: "fuel_route_ready", label: "fuelReady", from: { kind: "node", nodeId: "fuel_ready_evaluator", portId: "ready_out" }, to: { kind: "boundary", portId: "fuel_out_ready", portKind: "output" } },
          { id: "fuel_route_fault", label: "fuelFault", from: { kind: "node", nodeId: "fuel_ready_evaluator", portId: "ready_fault" }, to: { kind: "boundary", portId: "fuel_alarm_fault", portKind: "alarm" } }
        ]
      }
    },
    {
      id: "combustion_air_group",
      name: "CombustionAirGroup",
      type: "CombustionAirGroup",
      behaviorKind: "control",
      summary: "Provides purge air, damper position and air-ready confirmation.",
      commands: [{ id: "air_cmd_prepare", name: "prepareAir", kind: "command", dataType: "bool", summary: "Prepare combustion air path." }],
      inputs: [{ id: "air_in_request", name: "burnerRequest", kind: "input", dataType: "bool", summary: "Burner requests purge or combustion air." }],
      outputs: [{ id: "air_out_ready", name: "airReady", kind: "output", dataType: "bool", summary: "Air path is ready." }],
      status: [
        { id: "air_status_fan", name: "fanRunning", kind: "status", dataType: "bool", summary: "Fan run confirmation." },
        { id: "air_status_damper", name: "damperPosition", kind: "status", dataType: "number", summary: "Current air damper position." }
      ],
      permissions: [{ id: "air_perm_ready", name: "ready", kind: "permission", dataType: "bool", summary: "Air subsystem ready for burner." }],
      alarms: [{ id: "air_alarm_fault", name: "airFault", kind: "alarm", dataType: "bool", summary: "Air system fault." }]
    },
    {
      id: "feedwater_and_level_group",
      name: "FeedWaterAndLevelGroup",
      type: "FeedWaterAndLevelGroup",
      behaviorKind: "monitoring",
      summary: "Monitors boiler water level and commands feed pumps.",
      commands: [],
      inputs: [
        { id: "water_in_level", name: "levelValue", kind: "input", dataType: "number", summary: "Measured boiler water level." },
        { id: "water_in_lead", name: "leadPumpSelector", kind: "input", dataType: "enum", summary: "Selected lead feed pump." }
      ],
      outputs: [
        { id: "water_out_ok", name: "waterOk", kind: "output", dataType: "bool", summary: "Water level is safe for burner run." },
        { id: "water_out_pump", name: "feedPumpStartCmd", kind: "output", dataType: "bool", summary: "Command to start lead feed pump." }
      ],
      status: [
        { id: "water_status_level", name: "levelState", kind: "status", dataType: "enum", summary: "Semantic level state." },
        { id: "water_status_selected", name: "selectedPump", kind: "status", dataType: "enum", summary: "Selected lead feed pump." }
      ],
      permissions: [{ id: "water_perm_run", name: "runAllowed", kind: "permission", dataType: "bool", summary: "Burner may continue to run." }],
      alarms: [
        { id: "water_alarm_trip", name: "lowLowWaterTrip", kind: "alarm", dataType: "bool", summary: "Critical low-low water trip." },
        { id: "water_alarm_sensor", name: "levelSensorFault", kind: "alarm", dataType: "bool", summary: "Level sensing is invalid." }
      ],
      structure: {
        summary: "Level monitoring and lead-pump selection condensed into one monitoring/control object.",
        nodes: [
          { id: "level_monitor", title: "LevelMonitor", kind: "monitoring", summary: "Computes semantic level state and trips.", position: { x: 220, y: 160 }, inputs: [{ id: "lvl_in_value", name: "levelValue", kind: "input", dataType: "number", summary: "Measured drum level." }], outputs: [{ id: "lvl_out_ok", name: "waterOk", kind: "output", dataType: "bool", summary: "Level safe." }, { id: "lvl_out_trip", name: "lowLowWaterTrip", kind: "output", dataType: "bool", summary: "Critical trip." }], relatedSignalIds: ["boiler.water_level", "low_low_water_trip"], relatedBlockIds: ["block_permissive_matrix"], relatedBindingIds: ["bind_water_level", "bind_low_low_water_trip"] },
          { id: "feed_pump_selector", title: "FeedPumpSelector", kind: "control", summary: "Applies lead pump selector to feedwater pump command.", position: { x: 620, y: 160 }, inputs: [{ id: "pump_sel_in", name: "leadPumpSelector", kind: "input", dataType: "enum", summary: "Selected lead pump." }, { id: "pump_sel_ok", name: "waterOk", kind: "input", dataType: "bool", summary: "Need to maintain safe level." }], outputs: [{ id: "pump_sel_cmd", name: "feedPumpStartCmd", kind: "output", dataType: "bool", summary: "Feed pump start command." }], relatedSignalIds: ["operator.lead_feed_pump"], relatedBlockIds: ["block_interlock_set"], relatedBindingIds: [] }
        ],
        routes: [
          { id: "water_route_level", label: "level", from: { kind: "boundary", portId: "water_in_level", portKind: "input" }, to: { kind: "node", nodeId: "level_monitor", portId: "lvl_in_value" } },
          { id: "water_route_ok", label: "waterOk", from: { kind: "node", nodeId: "level_monitor", portId: "lvl_out_ok" }, to: { kind: "node", nodeId: "feed_pump_selector", portId: "pump_sel_ok" } },
          { id: "water_route_selector", label: "lead pump", from: { kind: "boundary", portId: "water_in_lead", portKind: "input" }, to: { kind: "node", nodeId: "feed_pump_selector", portId: "pump_sel_in" } },
          { id: "water_route_pump_cmd", label: "start cmd", from: { kind: "node", nodeId: "feed_pump_selector", portId: "pump_sel_cmd" }, to: { kind: "boundary", portId: "water_out_pump", portKind: "output" } },
          { id: "water_route_trip", label: "trip", from: { kind: "node", nodeId: "level_monitor", portId: "lvl_out_trip" }, to: { kind: "boundary", portId: "water_alarm_trip", portKind: "alarm" } },
          { id: "water_route_ok_boundary", label: "waterOk", from: { kind: "node", nodeId: "level_monitor", portId: "lvl_out_ok" }, to: { kind: "boundary", portId: "water_out_ok", portKind: "output" } }
        ]
      }
    },
    {
      id: "steam_pressure_control",
      name: "SteamPressureControl",
      type: "SteamPressureControl",
      behaviorKind: "control",
      summary: "Turns pressure error into firing demand / modulation request.",
      commands: [],
      inputs: [{ id: "press_in_value", name: "pressure", kind: "input", dataType: "number", summary: "Measured steam pressure." }],
      outputs: [{ id: "press_out_demand", name: "firingDemand", kind: "output", dataType: "number", summary: "Demand sent to burner load control." }],
      status: [{ id: "press_status_ok", name: "pressureOk", kind: "status", dataType: "bool", summary: "Pressure is within expected operating band." }],
      permissions: [{ id: "press_perm_run", name: "runPermissive", kind: "permission", dataType: "bool", summary: "Pressure control still allows run." }],
      alarms: []
    },
    {
      id: "flame_safety",
      name: "FlameSafety",
      type: "FlameSafety",
      behaviorKind: "monitoring",
      summary: "Independent flame supervision and flame quality diagnostics.",
      commands: [],
      inputs: [{ id: "flame_in_signal", name: "flameSignal", kind: "input", dataType: "number", summary: "Raw flame quality or detector signal." }],
      outputs: [{ id: "flame_out_detected", name: "flameDetected", kind: "output", dataType: "bool", summary: "Semantic flame detected signal." }],
      status: [{ id: "flame_status_quality", name: "signalQuality", kind: "status", dataType: "number", summary: "Flame detector quality." }],
      permissions: [],
      alarms: [{ id: "flame_alarm_fault", name: "flameFault", kind: "alarm", dataType: "bool", summary: "Flame detector or proving fault." }]
    },
    {
      id: "boiler_protection",
      name: "BoilerProtection",
      type: "BoilerProtection",
      behaviorKind: "monitoring",
      summary: "Collects trip causes and exports start/run permissives.",
      commands: [],
      inputs: [],
      outputs: [{ id: "prot_out_trip", name: "tripActive", kind: "output", dataType: "bool", summary: "Trip chain has an active trip." }],
      status: [{ id: "prot_status_trip_chain", name: "tripChainHealthy", kind: "status", dataType: "bool", summary: "Trip chain healthy state." }],
      permissions: [
        { id: "prot_perm_start", name: "startPermissive", kind: "permission", dataType: "bool", summary: "All start permissives satisfied." },
        { id: "prot_perm_run", name: "runPermissive", kind: "permission", dataType: "bool", summary: "All run permissives satisfied." }
      ],
      alarms: [{ id: "prot_alarm_fault", name: "protectionFault", kind: "alarm", dataType: "bool", summary: "Protection subsystem has invalid or missing input." }]
    }
  ],
  compositionLinks: [
    { id: "link_ops_start", sourceObjectId: "operator_panel_selectors", targetObjectId: "burner", sourcePortId: "ops_out_start", targetPortId: "burner_cmd_start", kind: "command", label: "burnerStartCmd", summary: "Operator start command enters burner sequence." },
    { id: "link_ops_stop", sourceObjectId: "operator_panel_selectors", targetObjectId: "burner", sourcePortId: "ops_out_stop", targetPortId: "burner_cmd_stop", kind: "command", label: "burnerStopCmd", summary: "Operator stop command initiates controlled stop." },
    { id: "link_ops_reset", sourceObjectId: "operator_panel_selectors", targetObjectId: "burner", sourcePortId: "ops_out_reset", targetPortId: "burner_cmd_reset", kind: "command", label: "burnerResetCmd", summary: "Operator reset clears burner lockout." },
    { id: "link_ops_mode", sourceObjectId: "operator_panel_selectors", targetObjectId: "burner", sourcePortId: "ops_status_mode", targetPortId: "burner_in_mode", kind: "status", label: "burnerMode", summary: "Semantic burner mode enters burner object." },
    { id: "link_ops_lead_pump", sourceObjectId: "operator_panel_selectors", targetObjectId: "feedwater_and_level_group", sourcePortId: "ops_status_lead", targetPortId: "water_in_lead", kind: "status", label: "leadFeedPump", summary: "Lead pump selector feeds feedwater object." },
    { id: "link_burner_to_fuel", sourceObjectId: "burner", targetObjectId: "fuel_group", sourcePortId: "burner_out_request_fuel", targetPortId: "fuel_in_request", kind: "command", label: "requestFuel", summary: "Burner asks fuel group to prepare the fuel train." },
    { id: "link_fuel_to_burner", sourceObjectId: "fuel_group", targetObjectId: "burner", sourcePortId: "fuel_out_ready", targetPortId: "burner_in_fuel_ready", kind: "permission", label: "fuelReady", summary: "Fuel group grants ready permission to burner." },
    { id: "link_burner_to_air", sourceObjectId: "burner", targetObjectId: "combustion_air_group", sourcePortId: "burner_out_request_air", targetPortId: "air_in_request", kind: "command", label: "requestAir", summary: "Burner asks air group to prepare purge / combustion air." },
    { id: "link_air_to_burner", sourceObjectId: "combustion_air_group", targetObjectId: "burner", sourcePortId: "air_out_ready", targetPortId: "burner_in_air_ready", kind: "permission", label: "airReady", summary: "Air group confirms ready-for-purge / ready-for-combustion." },
    { id: "link_water_to_burner", sourceObjectId: "feedwater_and_level_group", targetObjectId: "burner", sourcePortId: "water_out_ok", targetPortId: "burner_in_water_ok", kind: "permission", label: "waterOk", summary: "Feedwater group keeps burner aware of safe level." },
    { id: "link_protection_to_burner", sourceObjectId: "boiler_protection", targetObjectId: "burner", sourcePortId: "prot_perm_start", targetPortId: "burner_in_start_perm", kind: "permission", label: "startPermissive", summary: "Protection chain grants or denies burner start." },
    { id: "link_flame_to_burner", sourceObjectId: "flame_safety", targetObjectId: "burner", sourcePortId: "flame_out_detected", targetPortId: "burner_in_flame", kind: "status", label: "flameDetected", summary: "Flame supervision exports semantic flame presence." },
    { id: "link_burner_run_to_protection", sourceObjectId: "burner", targetObjectId: "boiler_protection", sourcePortId: "burner_out_running", targetPortId: "prot_status_trip_chain", kind: "status", label: "running", summary: "Protection knows burner run state for trip context." },
    { id: "link_burner_fault_to_protection", sourceObjectId: "burner", targetObjectId: "boiler_protection", sourcePortId: "burner_alarm_fault", targetPortId: "prot_alarm_fault", kind: "fault", label: "burnerFault", summary: "Burner lockout propagates into protection aggregation." },
    { id: "link_fuel_fault_to_protection", sourceObjectId: "fuel_group", targetObjectId: "boiler_protection", sourcePortId: "fuel_alarm_fault", targetPortId: "prot_alarm_fault", kind: "fault", label: "fuelFault", summary: "Fuel fault contributes to global trip/protection context." },
    { id: "link_water_trip_to_protection", sourceObjectId: "feedwater_and_level_group", targetObjectId: "boiler_protection", sourcePortId: "water_alarm_trip", targetPortId: "prot_alarm_fault", kind: "fault", label: "lowLowWaterTrip", summary: "Low-low water trip escalates immediately into protection." }
  ],
  machines: [burnerMachine],
  signals: [
    { id: "operator.burner_start_cmd", name: "operator.burner_start_cmd", type: "bool", direction: "input", value: false },
    { id: "operator.burner_stop_cmd", name: "operator.burner_stop_cmd", type: "bool", direction: "input", value: false },
    { id: "operator.burner_reset_cmd", name: "operator.burner_reset_cmd", type: "bool", direction: "input", value: false },
    { id: "operator.burner_mode", name: "operator.burner_mode", type: "string", direction: "input", value: "AUTO" },
    { id: "operator.lead_feed_pump", name: "operator.lead_feed_pump", type: "string", direction: "input", value: "PUMP_A" },
    { id: "steam.pressure", name: "steam.pressure", type: "number", direction: "input", value: 7.8 },
    { id: "boiler.water_level", name: "boiler.water_level", type: "number", direction: "input", value: 52.4 },
    { id: "flame.detected", name: "flame.detected", type: "bool", direction: "input", value: true },
    { id: "fuel_pump.run_fb", name: "fuel_pump.run_fb", type: "bool", direction: "input", value: true },
    { id: "fan.run_fb", name: "fan.run_fb", type: "bool", direction: "input", value: true },
    { id: "trip_chain_healthy", name: "trip_chain_healthy", type: "bool", direction: "input", value: true },
    { id: "low_low_water_trip", name: "low_low_water_trip", type: "bool", direction: "input", value: false }
  ],
  bindings: [
    { id: "bind_burner_start", signalId: "operator.burner_start_cmd", physicalSource: "DI_START", direction: "input", type: "bool", status: false, debounceMs: 120, failSafeValue: false },
    { id: "bind_burner_stop", signalId: "operator.burner_stop_cmd", physicalSource: "DI_STOP", direction: "input", type: "bool", status: false, debounceMs: 120, failSafeValue: false },
    { id: "bind_burner_reset", signalId: "operator.burner_reset_cmd", physicalSource: "DI_RESET", direction: "input", type: "bool", status: false, debounceMs: 120, failSafeValue: false },
    { id: "bind_steam_pressure", signalId: "steam.pressure", physicalSource: "AI_STEAM_PRESSURE", direction: "input", type: "analog", status: 7.8, scale: "0..16 bar", failSafeValue: 0 },
    { id: "bind_water_level", signalId: "boiler.water_level", physicalSource: "AI_DRUM_LEVEL", direction: "input", type: "analog", status: 52.4, scale: "0..100 %", failSafeValue: 0 },
    { id: "bind_flame_detected", signalId: "flame.detected", physicalSource: "DI_FLAME_SCANNER", direction: "input", type: "bool", status: true, debounceMs: 50, failSafeValue: false },
    { id: "bind_fuel_pump_run", signalId: "fuel_pump.run_fb", physicalSource: "DI_FUEL_PUMP_RUN", direction: "input", type: "bool", status: true, debounceMs: 100, failSafeValue: false },
    { id: "bind_fan_run", signalId: "fan.run_fb", physicalSource: "DI_FAN_RUN", direction: "input", type: "bool", status: true, debounceMs: 100, failSafeValue: false },
    { id: "bind_trip_chain", signalId: "trip_chain_healthy", physicalSource: "DI_TRIP_CHAIN_HEALTHY", direction: "input", type: "bool", status: true, debounceMs: 40, failSafeValue: false },
    { id: "bind_low_low_water_trip", signalId: "low_low_water_trip", physicalSource: "DI_LOW_LOW_WATER", direction: "input", type: "bool", status: false, debounceMs: 20, failSafeValue: true }
  ],
  blocks: [
    { id: "block_start_stop_latch", name: "StartStopLatch", type: "StartStopLatch", inputs: ["operator.burner_start_cmd", "operator.burner_stop_cmd"], outputs: ["burner.start", "burner.stop"], parameters: { priority: "operator" } },
    { id: "block_timer_on", name: "TimerOn", type: "TimerOn", inputs: ["fan.run_fb"], outputs: ["purge_complete"], parameters: { presetMs: 15000 } },
    { id: "block_interlock_set", name: "InterlockSet", type: "InterlockSet", inputs: ["trip_chain_healthy", "low_low_water_trip"], outputs: ["tripActive"], parameters: { tripLatching: true } },
    { id: "block_permissive_matrix", name: "PermissiveMatrix", type: "PermissiveMatrix", inputs: ["trip_chain_healthy", "boiler.water_level", "fuel_pump.run_fb", "fan.run_fb"], outputs: ["startPermissive"], parameters: { strategy: "all_must_be_true" } },
    { id: "block_flame_prover", name: "FlameProver", type: "ThresholdMonitor", inputs: ["flame.detected"], outputs: ["flameOk", "flameFail"], parameters: { proveMs: 3000 } },
    { id: "block_pressure_pid", name: "PressurePid", type: "Pid", inputs: ["steam.pressure"], outputs: ["firingDemand"], parameters: { setpointBar: 8.0, mode: "PI" } }
  ],
  runtimeSnapshot: {
    activeMachineId: "boiler_sequence",
    activeStateId: "modulating_run",
    health: "ok",
    lastEvent: "flame_proved",
    diagnostics: [
      {
        id: "diag_flame_margin",
        severity: "warning",
        objectId: "flame_safety",
        cause: "Flame signal margin is trending lower than nominal.",
        hint: "Inspect burner head, scanner lens and atomization quality before next trip."
      }
    ]
  }
};
