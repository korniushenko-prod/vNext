export type WorkspaceId = "bind" | "logic" | "machine" | "observe";

export interface ObjectInterfacePortDefinition {
  id: string;
  name: string;
  kind: "input" | "output" | "command" | "status" | "permission" | "alarm";
  summary: string;
  signalIds?: string[];
  bindingIds?: string[];
}

export interface ObjectBehaviorDefinition {
  machineId?: string;
  summary: string;
}

export interface PlcObjectDefinition {
  id: string;
  name: string;
  type: string;
  behaviorKind: "sequence" | "control" | "monitoring";
  summary: string;
  commands: ObjectInterfacePortDefinition[];
  inputs: ObjectInterfacePortDefinition[];
  outputs: ObjectInterfacePortDefinition[];
  status: ObjectInterfacePortDefinition[];
  permissions: ObjectInterfacePortDefinition[];
  alarms: ObjectInterfacePortDefinition[];
  behavior?: ObjectBehaviorDefinition;
}

export interface ObjectCompositionLinkDefinition {
  id: string;
  sourceObjectId: string;
  targetObjectId: string;
  kind: "command" | "permission" | "status" | "fault";
  label: string;
  summary: string;
  sourcePortId?: string;
  targetPortId?: string;
}

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
  objectId: string;
  name: string;
  behaviorKind: "sequence" | "control" | "monitoring";
  behaviorSummary?: {
    primaryStateIds: string[];
    faultStateIds: string[];
    recoveryTransitionIds: string[];
  };
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
  objects: PlcObjectDefinition[];
  compositionLinks: ObjectCompositionLinkDefinition[];
  machines: MachineDefinition[];
  signals: SignalDefinition[];
  bindings: IoBindingDefinition[];
  blocks: LogicBlockDefinition[];
  runtimeSnapshot: RuntimeSnapshot;
}

export const demoProject: UniversalPlcDemoProject = {
  id: "demo_boiler",
  name: "Demo Boiler Supervisor",
  objects: [
    {
      id: "burner",
      name: "Burner",
      type: "Burner",
      behaviorKind: "sequence",
      summary: "Main burner object with start, run, stop, fault and recovery behavior.",
      commands: [
        {
          id: "burner.cmd.start",
          name: "start",
          kind: "command",
          summary: "Start request from boiler supervisor.",
          signalIds: ["pump.start_cmd"],
          bindingIds: ["bind_pump_start"]
        },
        {
          id: "burner.cmd.stop",
          name: "stop",
          kind: "command",
          summary: "Controlled stop request."
        },
        {
          id: "burner.cmd.reset",
          name: "reset",
          kind: "command",
          summary: "Manual recovery from fault."
        }
      ],
      inputs: [
        {
          id: "burner.in.fuel_ready",
          name: "fuelReady",
          kind: "input",
          summary: "Fuel group reports that fuel path is ready."
        },
        {
          id: "burner.in.water_ok",
          name: "waterOk",
          kind: "input",
          summary: "Water level group allows burner operation."
        },
        {
          id: "burner.in.protection_ok",
          name: "boilerPermissive",
          kind: "input",
          summary: "Boiler protection object grants run permissive."
        }
      ],
      outputs: [
        {
          id: "burner.out.request_fuel",
          name: "requestFuel",
          kind: "output",
          summary: "Burner asks fuel group to prepare circulation and valves."
        },
        {
          id: "burner.out.running",
          name: "running",
          kind: "output",
          summary: "Burner reports active run state."
        }
      ],
      status: [
        {
          id: "burner.status.state",
          name: "state",
          kind: "status",
          summary: "idle / starting / running / stopping / fault"
        }
      ],
      permissions: [
        {
          id: "burner.perm.start",
          name: "startPermissive",
          kind: "permission",
          summary: "Combined start permissive derived from fuel, water and protection objects."
        }
      ],
      alarms: [
        {
          id: "burner.alarm.fault",
          name: "fault",
          kind: "alarm",
          summary: "Trip state exported to the rest of the system."
        }
      ],
      behavior: {
        machineId: "boiler_sequence",
        summary: "Sequence-first internal behavior with startup, run, stop and recovery."
      }
    },
    {
      id: "fuel_group",
      name: "FuelGroup",
      type: "FuelGroup",
      behaviorKind: "control",
      summary: "Fuel preparation, circulation and ready signal for burner start.",
      commands: [
        {
          id: "fuel_group.cmd.prepare",
          name: "prepareFuel",
          kind: "command",
          summary: "Prepare fuel path for burner start."
        }
      ],
      inputs: [
        {
          id: "fuel_group.in.burner_request",
          name: "burnerRequest",
          kind: "input",
          summary: "Burner asks fuel group to become ready."
        }
      ],
      outputs: [
        {
          id: "fuel_group.out.ready",
          name: "fuelReady",
          kind: "output",
          summary: "Fuel path ready for ignition."
        }
      ],
      status: [
        {
          id: "fuel_group.status.mode",
          name: "activeMode",
          kind: "status",
          summary: "Current active fuel mode."
        }
      ],
      permissions: [
        {
          id: "fuel_group.perm.ready",
          name: "ready",
          kind: "permission",
          summary: "Fuel group grants ready permissive."
        }
      ],
      alarms: [
        {
          id: "fuel_group.alarm.fault",
          name: "fuelFault",
          kind: "alarm",
          summary: "Fuel-side fault blocks burner start."
        }
      ]
    },
    {
      id: "water_level_group",
      name: "WaterLevelGroup",
      type: "WaterLevelGroup",
      behaviorKind: "monitoring",
      summary: "Monitors level thresholds and grants burner permission when water is healthy.",
      commands: [],
      inputs: [
        {
          id: "water_level_group.in.level",
          name: "levelValue",
          kind: "input",
          summary: "Measured drum or tank level.",
          signalIds: ["tank.level"],
          bindingIds: ["bind_tank_level"]
        }
      ],
      outputs: [
        {
          id: "water_level_group.out.water_ok",
          name: "waterOk",
          kind: "output",
          summary: "Water level is within safe operating band."
        }
      ],
      status: [
        {
          id: "water_level_group.status.state",
          name: "state",
          kind: "status",
          summary: "normal / low / highhigh / fault"
        }
      ],
      permissions: [
        {
          id: "water_level_group.perm.run",
          name: "runAllowed",
          kind: "permission",
          summary: "Allows burner run while level is healthy."
        }
      ],
      alarms: [
        {
          id: "water_level_group.alarm.low",
          name: "lowLowAlarm",
          kind: "alarm",
          summary: "Critical low level alarm."
        }
      ]
    },
    {
      id: "boiler_protection",
      name: "BoilerProtection",
      type: "BoilerProtection",
      behaviorKind: "control",
      summary: "Supervisor permissives and trip conditions around the burner.",
      commands: [],
      inputs: [
        {
          id: "boiler_protection.in.running",
          name: "burnerRunning",
          kind: "input",
          summary: "Burner running status for supervision."
        }
      ],
      outputs: [
        {
          id: "boiler_protection.out.permissive",
          name: "boilerPermissive",
          kind: "output",
          summary: "Global protection permissive for burner start."
        }
      ],
      status: [
        {
          id: "boiler_protection.status.health",
          name: "health",
          kind: "status",
          summary: "ok / warning / fault"
        }
      ],
      permissions: [
        {
          id: "boiler_protection.perm.start",
          name: "startAllowed",
          kind: "permission",
          summary: "Start allowed by protection layer."
        }
      ],
      alarms: [
        {
          id: "boiler_protection.alarm.trip",
          name: "protectionTrip",
          kind: "alarm",
          summary: "Protection trip propagated to burner."
        }
      ]
    }
  ],
  compositionLinks: [
    {
      id: "link_burner_to_fuel",
      sourceObjectId: "burner",
      targetObjectId: "fuel_group",
      kind: "command",
      label: "requestFuel",
      summary: "Burner asks the fuel group to prepare the fuel path.",
      sourcePortId: "burner.out.request_fuel",
      targetPortId: "fuel_group.in.burner_request"
    },
    {
      id: "link_fuel_to_burner",
      sourceObjectId: "fuel_group",
      targetObjectId: "burner",
      kind: "status",
      label: "fuelReady",
      summary: "Fuel group reports readiness to burner.",
      sourcePortId: "fuel_group.out.ready",
      targetPortId: "burner.in.fuel_ready"
    },
    {
      id: "link_water_to_burner",
      sourceObjectId: "water_level_group",
      targetObjectId: "burner",
      kind: "permission",
      label: "waterOk",
      summary: "Water level group grants run permission.",
      sourcePortId: "water_level_group.out.water_ok",
      targetPortId: "burner.in.water_ok"
    },
    {
      id: "link_protection_to_burner",
      sourceObjectId: "boiler_protection",
      targetObjectId: "burner",
      kind: "permission",
      label: "boilerPermissive",
      summary: "Protection object allows burner start.",
      sourcePortId: "boiler_protection.out.permissive",
      targetPortId: "burner.in.protection_ok"
    },
    {
      id: "link_burner_to_protection",
      sourceObjectId: "burner",
      targetObjectId: "boiler_protection",
      kind: "status",
      label: "running",
      summary: "Burner publishes running state to boiler protection.",
      sourcePortId: "burner.out.running",
      targetPortId: "boiler_protection.in.running"
    }
  ],
  machines: [
    {
      id: "boiler_sequence",
      objectId: "burner",
      name: "Boiler Sequence",
      behaviorKind: "sequence",
      behaviorSummary: {
        primaryStateIds: ["idle", "starting", "running", "stopping"],
        faultStateIds: ["fault"],
        recoveryTransitionIds: ["t_fault_idle"]
      },
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
