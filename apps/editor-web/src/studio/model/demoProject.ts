export type WorkspaceId = "bind" | "logic" | "machine" | "observe";

export interface MachineStateDefinition {
  id: string;
  name: string;
  kind: "initial" | "normal" | "fault" | "final";
  sectionId: string;
  regionId?: string;
  position: { x: number; y: number };
  entryActions?: string[];
  exitActions?: string[];
  timeoutMs?: number;
  active?: boolean;
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
  type: "exclusive" | "parallel";
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
  sections: MachineSectionDefinition[];
  regions?: MachineRegionDefinition[];
  sceneGroups?: MachineSceneGroupDefinition[];
  states: MachineStateDefinition[];
  transitions: MachineTransitionDefinition[];
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
  failSafeValue?: boolean | number | string;
}

export interface LogicBlockDefinition {
  id: string;
  name: string;
  type: "StartStopLatch" | "ThresholdMonitor" | "TimerOn" | "InterlockSet";
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
  machines: MachineDefinition[];
  signals: SignalDefinition[];
  bindings: IoBindingDefinition[];
  blocks: LogicBlockDefinition[];
  runtimeSnapshot: RuntimeSnapshot;
}

export const demoProject: UniversalPlcDemoProject = {
  id: "demo_boiler",
  name: "Demo Boiler Supervisor",
  machines: [
    {
      id: "boiler_sequence",
      name: "Boiler Sequence",
      sections: [
        {
          id: "sec_startup",
          name: "Startup",
          summary: "Idle and Starting states with permissives, purge and feedback acquisition.",
          color: "#5ab1ff",
          regionIds: ["cmd_region"],
          relatedSignalIds: ["pump.start_cmd", "pump.run_fb"],
          relatedBlockIds: ["block_start_stop_latch", "block_timer_on"],
          relatedBindingIds: ["bind_pump_start", "bind_pump_run"]
        },
        {
          id: "sec_running",
          name: "Running",
          summary: "Normal run and controlled stop path with tank level observation.",
          color: "#66d9c7",
          regionIds: ["feedback_region", "cmd_region"],
          relatedSignalIds: ["tank.level", "pump.run_fb"],
          relatedBlockIds: ["block_threshold_monitor", "block_interlock_set"],
          relatedBindingIds: ["bind_tank_level", "bind_pump_run"]
        },
        {
          id: "sec_fault",
          name: "Fault Handling",
          summary: "Trip path and manual recovery back to idle.",
          color: "#ff7b8d",
          regionIds: ["fault_region"],
          relatedSignalIds: ["pump.fault_fb"],
          relatedBlockIds: ["block_interlock_set"],
          relatedBindingIds: ["bind_pump_fault"]
        }
      ],
      regions: [
        {
          id: "cmd_region",
          name: "Command Path",
          type: "exclusive",
          summary: "Operator intent, permissive checks and orderly stop sequencing.",
          color: "#7bb6ff",
          stateIds: ["idle", "starting", "stopping"],
          relatedSignalIds: ["pump.start_cmd"],
          relatedBlockIds: ["block_start_stop_latch", "block_timer_on"],
          relatedBindingIds: ["bind_pump_start"]
        },
        {
          id: "feedback_region",
          name: "Feedback Path",
          type: "exclusive",
          summary: "Run confirmation and live process observation while the machine is active.",
          color: "#66d9c7",
          stateIds: ["running"],
          relatedSignalIds: ["pump.run_fb", "tank.level"],
          relatedBlockIds: ["block_threshold_monitor"],
          relatedBindingIds: ["bind_pump_run", "bind_tank_level"]
        },
        {
          id: "fault_region",
          name: "Fault Path",
          type: "exclusive",
          summary: "Trip isolation and operator-guided recovery back to Idle.",
          color: "#ff7b8d",
          stateIds: ["fault"],
          relatedSignalIds: ["pump.fault_fb"],
          relatedBlockIds: ["block_interlock_set"],
          relatedBindingIds: ["bind_pump_fault"]
        }
      ],
      sceneGroups: [
        {
          id: "grp_startup",
          name: "Startup Envelope",
          summary: "Warm-up and feedback acquisition before steady operation is allowed.",
          color: "#5ab1ff",
          stateIds: ["idle", "starting"],
          sectionIds: ["sec_startup"],
          regionIds: ["cmd_region"],
          relatedSignalIds: ["pump.start_cmd", "pump.run_fb"],
          relatedBlockIds: ["block_start_stop_latch", "block_timer_on"],
          relatedBindingIds: ["bind_pump_start", "bind_pump_run"]
        },
        {
          id: "grp_operation",
          name: "Normal Operation",
          summary: "Controlled running and stop path with process-level observation.",
          color: "#66d9c7",
          stateIds: ["running", "stopping"],
          sectionIds: ["sec_running"],
          regionIds: ["feedback_region", "cmd_region"],
          relatedSignalIds: ["tank.level", "pump.run_fb", "pump.start_cmd"],
          relatedBlockIds: ["block_threshold_monitor", "block_interlock_set", "block_timer_on"],
          relatedBindingIds: ["bind_tank_level", "bind_pump_run", "bind_pump_start"]
        },
        {
          id: "grp_fault",
          name: "Fault Handling",
          summary: "Trip containment zone with reset path back to the main sequence.",
          color: "#ff7b8d",
          stateIds: ["fault"],
          sectionIds: ["sec_fault"],
          regionIds: ["fault_region"],
          relatedSignalIds: ["pump.fault_fb"],
          relatedBlockIds: ["block_interlock_set"],
          relatedBindingIds: ["bind_pump_fault"]
        }
      ],
      states: [
        {
          id: "idle",
          name: "Idle",
          kind: "initial",
          sectionId: "sec_startup",
          regionId: "cmd_region",
          position: { x: 72, y: 300 },
          exitActions: ["clear_start_request"],
          relatedSignalIds: ["pump.start_cmd"],
          relatedBlockIds: ["block_start_stop_latch"],
          relatedBindingIds: ["bind_pump_start"]
        },
        {
          id: "starting",
          name: "Starting",
          kind: "normal",
          sectionId: "sec_startup",
          regionId: "cmd_region",
          position: { x: 300, y: 220 },
          entryActions: ["open_purge_air", "start_timer"],
          timeoutMs: 8000,
          relatedSignalIds: ["pump.start_cmd", "pump.run_fb"],
          relatedBlockIds: ["block_start_stop_latch", "block_timer_on"],
          relatedBindingIds: ["bind_pump_start", "bind_pump_run"]
        },
        {
          id: "running",
          name: "Running",
          kind: "normal",
          sectionId: "sec_running",
          regionId: "feedback_region",
          position: { x: 410, y: 420 },
          entryActions: ["enable_burner"],
          active: true,
          relatedSignalIds: ["pump.run_fb", "tank.level"],
          relatedBlockIds: ["block_threshold_monitor", "block_interlock_set"],
          relatedBindingIds: ["bind_pump_run", "bind_tank_level"]
        },
        {
          id: "stopping",
          name: "Stopping",
          kind: "final",
          sectionId: "sec_running",
          regionId: "cmd_region",
          position: { x: 700, y: 300 },
          entryActions: ["close_fuel", "run_post_purge"],
          relatedSignalIds: ["pump.start_cmd"],
          relatedBlockIds: ["block_timer_on"],
          relatedBindingIds: ["bind_pump_start"]
        },
        {
          id: "fault",
          name: "Fault",
          kind: "fault",
          sectionId: "sec_fault",
          regionId: "fault_region",
          position: { x: 700, y: 74 },
          entryActions: ["trip_outputs", "raise_alarm"],
          relatedSignalIds: ["pump.fault_fb"],
          relatedBlockIds: ["block_interlock_set"],
          relatedBindingIds: ["bind_pump_fault"]
        }
      ],
      transitions: [
        {
          id: "t_idle_starting",
          source: "idle",
          target: "starting",
          sectionId: "sec_startup",
          event: "start",
          action: "latch_start",
          relatedSignalIds: ["pump.start_cmd"],
          relatedBlockIds: ["block_start_stop_latch"],
          relatedBindingIds: ["bind_pump_start"]
        },
        {
          id: "t_starting_running",
          source: "starting",
          target: "running",
          sectionId: "sec_startup",
          guard: "feedback_ok",
          relatedSignalIds: ["pump.run_fb"],
          relatedBlockIds: ["block_timer_on"],
          relatedBindingIds: ["bind_pump_run"]
        },
        {
          id: "t_running_stopping",
          source: "running",
          target: "stopping",
          sectionId: "sec_running",
          event: "stop",
          relatedSignalIds: ["pump.start_cmd"],
          relatedBlockIds: ["block_interlock_set"],
          relatedBindingIds: ["bind_pump_start"]
        },
        {
          id: "t_stopping_idle",
          source: "stopping",
          target: "idle",
          sectionId: "sec_running",
          guard: "stopped",
          relatedSignalIds: ["pump.run_fb"],
          relatedBlockIds: ["block_timer_on"],
          relatedBindingIds: ["bind_pump_run"]
        },
        {
          id: "t_starting_fault",
          source: "starting",
          target: "fault",
          sectionId: "sec_fault",
          guard: "timeout",
          delayMs: 8000,
          relatedSignalIds: ["pump.run_fb"],
          relatedBlockIds: ["block_timer_on"],
          relatedBindingIds: ["bind_pump_run"]
        },
        {
          id: "t_running_fault",
          source: "running",
          target: "fault",
          sectionId: "sec_fault",
          guard: "fault_detected",
          relatedSignalIds: ["pump.fault_fb"],
          relatedBlockIds: ["block_interlock_set"],
          relatedBindingIds: ["bind_pump_fault"]
        },
        {
          id: "t_fault_idle",
          source: "fault",
          target: "idle",
          sectionId: "sec_fault",
          event: "reset",
          relatedSignalIds: ["pump.fault_fb"],
          relatedBlockIds: ["block_interlock_set"],
          relatedBindingIds: ["bind_pump_fault"]
        }
      ]
    }
  ],
  signals: [
    { id: "pump.start_cmd", name: "Pump Start Cmd", type: "bool", direction: "output", value: false },
    { id: "pump.run_fb", name: "Pump Run Feedback", type: "bool", direction: "input", value: true },
    { id: "pump.fault_fb", name: "Pump Fault Feedback", type: "bool", direction: "input", value: false },
    { id: "tank.level", name: "Tank Level", type: "number", direction: "input", value: 42.1 }
  ],
  bindings: [
    {
      id: "bind_pump_start",
      signalId: "pump.start_cmd",
      physicalSource: "DO1",
      direction: "output",
      type: "bool",
      status: false,
      failSafeValue: "off"
    },
    {
      id: "bind_pump_run",
      signalId: "pump.run_fb",
      physicalSource: "DI1",
      direction: "input",
      type: "bool",
      status: true,
      debounceMs: 50,
      inverted: false
    },
    {
      id: "bind_pump_fault",
      signalId: "pump.fault_fb",
      physicalSource: "DI2",
      direction: "input",
      type: "bool",
      status: false,
      debounceMs: 50,
      inverted: false
    },
    {
      id: "bind_tank_level",
      signalId: "tank.level",
      physicalSource: "AI1",
      direction: "input",
      type: "analog",
      status: 42.1,
      scale: "0..10V -> 0..100%",
      failSafeValue: 0
    }
  ],
  blocks: [
    {
      id: "block_start_stop_latch",
      name: "StartStopLatch",
      type: "StartStopLatch",
      inputs: ["start", "stop"],
      outputs: ["run_enabled"],
      parameters: { mode: "set_reset" }
    },
    {
      id: "block_threshold_monitor",
      name: "ThresholdMonitor",
      type: "ThresholdMonitor",
      inputs: ["pv"],
      outputs: ["high_alarm"],
      parameters: { threshold: 80 }
    },
    {
      id: "block_timer_on",
      name: "TimerOn",
      type: "TimerOn",
      inputs: ["enable"],
      outputs: ["done"],
      parameters: { delayMs: 3000 }
    },
    {
      id: "block_interlock_set",
      name: "InterlockSet",
      type: "InterlockSet",
      inputs: ["permit", "trip"],
      outputs: ["allow_run"],
      parameters: { strategy: "fail_safe" }
    }
  ],
  runtimeSnapshot: {
    activeMachineId: "boiler_sequence",
    activeStateId: "running",
    health: "ok",
    lastEvent: "start",
    diagnostics: [
      {
        id: "diag_pump_1_feedback",
        severity: "warning",
        objectId: "pump_1",
        cause: "no feedback timeout",
        hint: "check feedback input"
      }
    ]
  }
};
