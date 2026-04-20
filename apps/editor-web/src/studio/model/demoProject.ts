export type WorkspaceId = "bind" | "logic" | "machine" | "observe";

export interface MachineStateDefinition {
  id: string;
  name: string;
  kind: "initial" | "normal" | "fault" | "final";
  position: { x: number; y: number };
  entryActions?: string[];
  exitActions?: string[];
  timeoutMs?: number;
  active?: boolean;
}

export interface MachineTransitionDefinition {
  id: string;
  source: string;
  target: string;
  event?: string;
  guard?: string;
  delayMs?: number;
  action?: string;
}

export interface MachineDefinition {
  id: string;
  name: string;
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
      states: [
        {
          id: "idle",
          name: "Idle",
          kind: "initial",
          position: { x: 60, y: 180 },
          exitActions: ["clear_start_request"]
        },
        {
          id: "starting",
          name: "Starting",
          kind: "normal",
          position: { x: 320, y: 90 },
          entryActions: ["open_purge_air", "start_timer"],
          timeoutMs: 8000
        },
        {
          id: "running",
          name: "Running",
          kind: "normal",
          position: { x: 610, y: 180 },
          entryActions: ["enable_burner"],
          active: true
        },
        {
          id: "stopping",
          name: "Stopping",
          kind: "final",
          position: { x: 890, y: 280 },
          entryActions: ["close_fuel", "run_post_purge"]
        },
        {
          id: "fault",
          name: "Fault",
          kind: "fault",
          position: { x: 620, y: 10 },
          entryActions: ["trip_outputs", "raise_alarm"]
        }
      ],
      transitions: [
        { id: "t_idle_starting", source: "idle", target: "starting", event: "start", action: "latch_start" },
        { id: "t_starting_running", source: "starting", target: "running", guard: "feedback_ok" },
        { id: "t_running_stopping", source: "running", target: "stopping", event: "stop" },
        { id: "t_stopping_idle", source: "stopping", target: "idle", guard: "stopped" },
        { id: "t_starting_fault", source: "starting", target: "fault", guard: "timeout", delayMs: 8000 },
        { id: "t_running_fault", source: "running", target: "fault", guard: "fault_detected" },
        { id: "t_fault_idle", source: "fault", target: "idle", event: "reset" }
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
