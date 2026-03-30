(function bootstrap(root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.PackageOverviewFixtures = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function factory() {
  const READONLY_PACKAGE_OVERVIEW_FIXTURES = Object.freeze([
    {
      id: "package-overview-boiler-skeleton",
      title: "BoilerPackageSkeleton v1",
      description: "Read-only authoring-layer package overview for the first proven package baseline. This remains a skeleton, not full burner-management logic.",
      package_instance_id: "boiler_pkg_1",
      package_definition: {
        package_id: "std.boiler_supervisor.v1",
        title: "Boiler Supervisor Skeleton",
        origin: "std_library",
        preset_count: 2,
        template_count: 4,
        presets: [
          "boiler_loop_default",
          "maintenance_service_default"
        ],
        templates: [
          "pid_loop_template",
          "hall_flowmeter_template",
          "runtime_counter_template",
          "maintenance_counter_template"
        ],
        boundary_notes: [
          "Package is an authoring-layer assembly only. Runtime and target outputs stay package-neutral after flattening.",
          "BoilerPackageSkeleton v1 is a composition skeleton for loop, monitoring, and maintenance slices. It is not burner-management, ignition, or safety logic.",
          "Effective object path must remain invariant with the explicit-expanded project path when values are identical."
        ]
      },
      members: [
        {
          id: "pid_1",
          title: "PID Controller",
          role: "control_core",
          type_title: "PID Controller v1",
          type_ref: "std:pid_controller_v1",
          template_ref: "std:pid_loop_template",
          preset_ref: "boiler_loop_default",
          effective_object_id: "boiler_pkg_1__pid_1",
          boundary_note: "Control core only. Autotune is allowed as the specialized Wave 9 operation lane; package itself adds no execution kind.",
          related_surfaces: [
            {
              title: "PID + hold/release/autotune",
              section: "Operations Overview",
              fixture_id: "operations-readonly-pid"
            }
          ]
        },
        {
          id: "flowmeter_1",
          title: "Pulse Flowmeter",
          role: "usage_source",
          type_title: "PulseFlowmeter v1",
          type_ref: "std:pulse_flowmeter_v1",
          template_ref: "std:hall_flowmeter_template",
          preset_ref: "boiler_loop_default",
          effective_object_id: "boiler_pkg_1__flowmeter_1",
          boundary_note: "Acquisition-capable member. Resource binding belongs to the flattened effective object, not to a package execution layer.",
          related_surfaces: [
            {
              title: "PulseFlowmeter + reset_totalizer",
              section: "Operations Overview",
              fixture_id: "operations-readonly-flowmeter"
            }
          ]
        },
        {
          id: "run_hours_1",
          title: "Run Hours Counter",
          role: "usage_accumulator",
          type_title: "RunHoursCounter v1",
          type_ref: "std:run_hours_counter_v1",
          template_ref: "std:runtime_counter_template",
          preset_ref: "maintenance_service_default",
          effective_object_id: "boiler_pkg_1__run_hours_1",
          boundary_note: "Counter member contributes accumulated usage_total_out. It is still flattened into an ordinary runtime object.",
          related_surfaces: [
            {
              title: "RunHoursCounter + reset_counter",
              section: "Operations Overview",
              fixture_id: "operations-readonly-runhours"
            }
          ]
        },
        {
          id: "maintenance_counter_1",
          title: "Maintenance Counter",
          role: "service_monitor",
          type_title: "MaintenanceCounter v1",
          type_ref: "std:maintenance_counter_v1",
          template_ref: "std:maintenance_counter_template",
          preset_ref: "maintenance_service_default",
          effective_object_id: "boiler_pkg_1__maintenance_counter_1",
          boundary_note: "Downstream monitoring object only. It consumes accumulated usage input and does not gain hidden acquisition logic from the package.",
          related_surfaces: [
            {
              title: "MaintenanceCounter + service operations",
              section: "Operations Overview",
              fixture_id: "operations-readonly-maintenance"
            }
          ]
        },
        {
          id: "remaining_monitor_1",
          title: "Remaining Threshold Monitor",
          role: "monitor",
          type_title: "ThresholdMonitor v1",
          type_ref: "std:threshold_monitor_v1",
          template_ref: "",
          preset_ref: "maintenance_service_default",
          effective_object_id: "boiler_pkg_1__remaining_monitor_1",
          boundary_note: "Pure downstream monitor over normalized values. Package keeps it as composition, not direct acquisition.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "boiler_pkg_1__pid_1", title: "PID Controller", type_title: "PID Controller v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__flowmeter_1", title: "Pulse Flowmeter", type_title: "PulseFlowmeter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__run_hours_1", title: "Run Hours Counter", type_title: "RunHoursCounter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__maintenance_counter_1", title: "Maintenance Counter", type_title: "MaintenanceCounter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__remaining_monitor_1", title: "Remaining Threshold Monitor", type_title: "ThresholdMonitor v1", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ]
    },
    {
      id: "package-overview-boiler-supervisor",
      title: "BoilerSupervisor v1",
      description: "Read-only package supervision surface over frozen child objects. Summary outputs, rollups, traces, and proxy operations stay metadata-first and target-neutral.",
      package_instance_id: "boiler_pkg_1",
      package_definition: {
        package_id: "std.boiler_supervisor.v1",
        title: "Boiler Supervisor v1",
        origin: "std_library",
        preset_count: 1,
        template_count: 2,
        presets: ["default_supervision"],
        templates: ["run_hours_service_preset", "maintenance_service_saved"],
        boundary_notes: [
          "Package supervision remains authoring-only and derives summary metadata from flattened child objects.",
          "Proxy operations stay generic or Wave 9-specialized child lanes. The package adds no execution engine of its own."
        ]
      },
      members: [
        {
          id: "pid_1",
          title: "Pressure Controller",
          role: "control_core",
          type_title: "PID Controller v1",
          type_ref: "std:pid_controller_v1",
          template_ref: "",
          preset_ref: "default_supervision",
          effective_object_id: "boiler_pkg_1__pid_1",
          boundary_note: "Control core only. Package supervision can proxy child operations but cannot add package-specific execution.",
          related_surfaces: [
            { title: "PID + hold/release/autotune", section: "Operations Overview", fixture_id: "operations-readonly-pid" }
          ]
        },
        {
          id: "flowmeter_1",
          title: "Feedwater Flowmeter",
          role: "usage_source",
          type_title: "PulseFlowmeter v1",
          type_ref: "std:pulse_flowmeter_v1",
          template_ref: "",
          preset_ref: "default_supervision",
          effective_object_id: "boiler_pkg_1__flowmeter_1",
          boundary_note: "Acquisition stays on the child object. Package supervision only summarizes and proxies the child surface.",
          related_surfaces: [
            { title: "PulseFlowmeter + reset_totalizer", section: "Operations Overview", fixture_id: "operations-readonly-flowmeter" }
          ]
        },
        {
          id: "run_hours_1",
          title: "Boiler Runtime Hours",
          role: "usage_accumulator",
          type_title: "RunHoursCounter v1",
          type_ref: "std:run_hours_counter_v1",
          template_ref: "run_hours_service_preset",
          preset_ref: "default_supervision",
          effective_object_id: "boiler_pkg_1__run_hours_1",
          boundary_note: "Accumulated runtime stays on the child counter and is surfaced upward as package summary only.",
          related_surfaces: [
            { title: "RunHoursCounter + reset_counter", section: "Operations Overview", fixture_id: "operations-readonly-runhours" }
          ]
        },
        {
          id: "maintenance_counter_1",
          title: "Boiler Maintenance Counter",
          role: "service_monitor",
          type_title: "MaintenanceCounter v1",
          type_ref: "std:maintenance_counter_v1",
          template_ref: "maintenance_service_saved",
          preset_ref: "default_supervision",
          effective_object_id: "boiler_pkg_1__maintenance_counter_1",
          boundary_note: "Downstream maintenance monitoring only. The package keeps usage accumulation upstream and only exposes package-level rollups.",
          related_surfaces: [
            { title: "MaintenanceCounter + service operations", section: "Operations Overview", fixture_id: "operations-readonly-maintenance" }
          ]
        },
        {
          id: "threshold_monitor_1",
          title: "Maintenance Due Monitor",
          role: "monitor",
          type_title: "ThresholdMonitor v1",
          type_ref: "std:threshold_monitor_v1",
          template_ref: "",
          preset_ref: "default_supervision",
          effective_object_id: "boiler_pkg_1__threshold_monitor_1",
          boundary_note: "Pure downstream monitor over child outputs. Package supervision uses it for summary and alarm rollups only.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "boiler_pkg_1__pid_1", title: "Pressure Controller", type_title: "PID Controller v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__flowmeter_1", title: "Feedwater Flowmeter", type_title: "PulseFlowmeter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__run_hours_1", title: "Boiler Runtime Hours", type_title: "RunHoursCounter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__maintenance_counter_1", title: "Boiler Maintenance Counter", type_title: "MaintenanceCounter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_pkg_1__threshold_monitor_1", title: "Maintenance Due Monitor", type_title: "ThresholdMonitor v1", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_supervision: {
        snapshot_state: "alarm_present",
        summary_outputs: [
          { id: "package_ok", title: "Package OK", value: "false", semantic_state: "degraded" },
          { id: "alarm_present", title: "Alarm Present", value: "true", semantic_state: "alarm_present" },
          { id: "maintenance_due", title: "Maintenance Due", value: "true", semantic_state: "maintenance_due" },
          { id: "loop_in_auto", title: "Loop In Auto", value: "true", semantic_state: "healthy" },
          { id: "flow_ok", title: "Flow OK", value: "true", semantic_state: "healthy" },
          { id: "runtime_total", title: "Runtime Total", value: "148.6 h", semantic_state: "informational" }
        ],
        aggregate_monitors: [
          {
            id: "health_rollup",
            title: "Health Rollup",
            state: "degraded",
            severity: "warning",
            summary: "Threshold alarm is active while the rest of the package remains online."
          }
        ],
        aggregate_alarms: [
          {
            id: "alarm_rollup",
            title: "Alarm Rollup",
            state: "alarm_present",
            severity: "warning",
            summary: "Maintenance due is active and the threshold monitor is latched."
          }
        ],
        trace_groups: [
          { id: "process_summary", title: "Process Summary", signal_count: 3, summary: "runtime_total, flow_rate, mv_out" },
          { id: "health_summary", title: "Health Summary", signal_count: 3, summary: "alarm_active, due_out, loop_ok" }
        ],
        operation_proxies: [
          { id: "reset_flow_totalizer", title: "Reset Flow Totalizer", child_operation_kind: "reset_totalizer", state: "available", summary: "Ready on target." },
          { id: "reset_runtime_counter", title: "Reset Runtime Counter", child_operation_kind: "reset_counter", state: "running", summary: "Synthetic reset baseline is currently running." },
          { id: "reset_maintenance_interval", title: "Reset Maintenance Interval", child_operation_kind: "reset_interval", state: "completed", summary: "Last maintenance reset completed successfully." },
          { id: "pid_autotune", title: "PID Autotune", child_operation_kind: "autotune", state: "blocked", summary: "Blocked until the loop is forced into manual mode." },
          { id: "pid_autotune_retry", title: "PID Autotune Retry", child_operation_kind: "autotune", state: "failed", summary: "Previous autotune attempt failed because PV oscillation never stabilized." },
          { id: "pid_autotune_cancelled", title: "PID Autotune Cancelled", child_operation_kind: "autotune", state: "cancelled", summary: "Most recent specialized run was cancelled by operator." }
        ],
        child_summary_cards: [
          { member_id: "pid_1", title: "Pressure Controller", state: "blocked", summary: "Autotune is blocked; hold and release remain available." },
          { member_id: "flowmeter_1", title: "Feedwater Flowmeter", state: "healthy", summary: "Remote source quality is good and totalizer reset is available." },
          { member_id: "run_hours_1", title: "Boiler Runtime Hours", state: "running", summary: "Runtime reset placeholder reports running synthetic lifecycle." },
          { member_id: "maintenance_counter_1", title: "Boiler Maintenance Counter", state: "maintenance_due", summary: "Service interval reached; reset interval already completed once." },
          { member_id: "threshold_monitor_1", title: "Maintenance Due Monitor", state: "alarm_present", summary: "Alarm is active and contributing to package rollups." }
        ]
      }
    },
    {
      id: "package-overview-boiler-supervisor-coordination",
      title: "BoilerSupervisorCoordination v1",
      description: "Read-only package coordination overview over frozen child execution lanes and package-level proxy operations.",
      package_instance_id: "boiler_supervisor_coordination_1",
      package_definition: {
        package_id: "std.boiler_supervisor_coordination.v1",
        title: "Boiler Supervisor Coordination v1",
        origin: "std_library",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package coordination is authoring-level orchestration only.",
          "BoilerSupervisorCoordination v1 is supervisory only and does not imply burner safety."
        ]
      },
      members: [
        {
          id: "pump_group_1",
          title: "Pump Group",
          role: "circulation",
          type_title: "PumpGroup v1",
          type_ref: "std:pump_group_v1",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_coordination_1__pump_group_1",
          boundary_note: "Circulation remains a child execution lane; package only coordinates and proxies it.",
          related_surfaces: []
        },
        {
          id: "pid_1",
          title: "PID Controller",
          role: "control_core",
          type_title: "PID Controller v1",
          type_ref: "std:pid_controller_v1",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_coordination_1__pid_1",
          boundary_note: "PID autotune remains the existing Wave 9 child execution path behind the package proxy.",
          related_surfaces: [
            { title: "PID + hold/release/autotune", section: "Operations Overview", fixture_id: "operations-readonly-pid" }
          ]
        }
      ],
      effective_objects: [
        { id: "boiler_supervisor_coordination_1__pump_group_1", title: "Pump Group", type_title: "PumpGroup v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_coordination_1__pid_1", title: "PID Controller", type_title: "PID Controller v1", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_coordination: {
        snapshot_state: "control_active",
        summary_outputs: [
          { id: "ready_summary", title: "Ready Summary", value: "true", semantic_state: "ready" },
          { id: "fault_summary", title: "Fault Summary", value: "false", semantic_state: "standby" },
          { id: "circulation_summary", title: "Circulation Summary", value: "true", semantic_state: "circulation_active" },
          { id: "control_summary", title: "Control Summary", value: "true", semantic_state: "control_active" }
        ],
        aggregate_monitors: [
          { id: "coordination_health", title: "Coordination Health", state: "ready", severity: "warning", summary: "Child surfaces are aligned and package coordination is active." }
        ],
        trace_groups: [
          { id: "coordination_trace", title: "Coordination Trace", signal_count: 3, summary: "circulation_active, loop_ok, remaining_out" }
        ],
        operation_proxies: [
          { id: "start_supervision", title: "Start Supervision", kind: "start_supervision", state: "completed", summary: "Package start proxy completed through the child pump group lane." },
          { id: "stop_supervision", title: "Stop Supervision", kind: "stop_supervision", state: "available", summary: "Ready to stop supervisory circulation." },
          { id: "acknowledge_faults", title: "Acknowledge Faults", kind: "acknowledge_faults", state: "blocked", summary: "Blocked until an active fault is latched." },
          { id: "reset_package_counters", title: "Reset Package Counters", kind: "reset_package_counters", state: "running", summary: "Reset proxy is currently using the frozen child reset lane." },
          { id: "pid_autotune_proxy", title: "PID Autotune Proxy", kind: "pid_autotune_proxy", state: "available", summary: "Delegates to the existing Wave 9 PID autotune child path." }
        ]
      }
    },
    {
      id: "package-overview-boiler-supervisor-modes",
      title: "BoilerSupervisorModes v1",
      description: "Read-only package mode / phase overview for the boiler-like Wave 13 reference domain.",
      package_instance_id: "boiler_supervisor_modes_1",
      package_definition: {
        package_id: "boiler_supervisor_modes",
        title: "BoilerSupervisorModes v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package mode / phase remains a generic package orchestration metadata layer only.",
          "BoilerSupervisorModes v1 is boiler-like reference content only and does not introduce burner execution."
        ]
      },
      members: [
        {
          id: "boiler_core_1",
          title: "Boiler Supervisor Core",
          role: "control_core",
          type_title: "Boiler Supervisor Core",
          type_ref: "project:boiler_supervisor_core",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_modes_1__boiler_core_1",
          boundary_note: "Wave 13 only summarizes child supervisory state into package mode / phase metadata.",
          related_surfaces: []
        },
        {
          id: "flow_guard_1",
          title: "Flow Guard",
          role: "availability_guard",
          type_title: "Flow Guard",
          type_ref: "project:flow_guard",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_modes_1__flow_guard_1",
          boundary_note: "Flow availability remains child-owned and is only referenced by package mode / phase metadata.",
          related_surfaces: []
        },
        {
          id: "maintenance_counter_1",
          title: "Boiler Maintenance Counter",
          role: "service_monitor",
          type_title: "Maintenance Counter",
          type_ref: "project:maintenance_counter",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_modes_1__maintenance_counter_1",
          boundary_note: "Maintenance remains downstream and package-level mode / phase stays execution-neutral.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "boiler_supervisor_modes_1__boiler_core_1", title: "Boiler Supervisor Core", type_title: "Boiler Supervisor Core", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_modes_1__flow_guard_1", title: "Flow Guard", type_title: "Flow Guard", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_modes_1__maintenance_counter_1", title: "Boiler Maintenance Counter", type_title: "Maintenance Counter", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_mode_phase: {
        snapshot_state: "mode_phase_available",
        active_mode: { id: "standby", title: "Standby" },
        active_phase: { id: "precheck", title: "Precheck" },
        mode_summary_entries: [
          { id: "off_summary", title: "Off Summary", semantic_state: "inactive", summary: "Off lane remains inactive." },
          { id: "standby_summary", title: "Standby Summary", semantic_state: "active", summary: "Standby is the current supervisory mode." },
          { id: "run_summary", title: "Run Summary", semantic_state: "inactive", summary: "Run mode becomes active only after precheck clears." }
        ],
        phase_summary_entries: [
          { id: "idle_summary", title: "Idle Summary", semantic_state: "inactive", summary: "Idle phase is inactive." },
          { id: "precheck_summary", title: "Precheck Summary", semantic_state: "active", summary: "Precheck is active while supervisory gates are evaluated." },
          { id: "run_phase_summary", title: "Run Phase Summary", semantic_state: "inactive", summary: "Run phase follows the core run lane." }
        ],
        mode_groups: [
          { id: "availability_modes", title: "Availability Modes", member_count: 2, summary: "Off and standby remain the non-running supervisory modes." },
          { id: "control_modes", title: "Control Modes", member_count: 1, summary: "Run remains the active control-oriented mode." }
        ],
        phase_groups: [
          { id: "preparation_phases", title: "Preparation Phases", member_count: 2, summary: "Phases that prepare active supervision." },
          { id: "active_phases", title: "Active Phases", member_count: 1, summary: "Phases that represent active run behavior." }
        ],
        trace_groups: [
          { id: "mode_phase_trace", title: "Mode / Phase Trace", signal_count: 3, summary: "standby_out, run_out, remaining_out" }
        ],
        package_supervision_id: "",
        package_coordination_id: ""
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-modes",
      title: "PumpSkidSupervisorModes v1",
      description: "Read-only package mode / phase overview for the non-boiler Wave 13 reference domain.",
      package_instance_id: "pump_skid_supervisor_modes_1",
      package_definition: {
        package_id: "std.pump_skid_supervisor_modes.v1",
        title: "PumpSkidSupervisorModes v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "PumpSkidSupervisorModes v1 is the mandatory non-boiler acceptance slice for Wave 13.",
          "Package mode / phase metadata remains authoring-level only and does not switch child execution."
        ]
      },
      members: [
        {
          id: "pump_group_1",
          title: "Pump Group",
          role: "pump_group",
          type_title: "Pump Group",
          type_ref: "project:pump_group",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_modes_1__pump_group_1",
          boundary_note: "Mode and phase metadata stay derived from child group state only.",
          related_surfaces: []
        },
        {
          id: "maintenance_counter_1",
          title: "Pump Maintenance Counter",
          role: "service_monitor",
          type_title: "Maintenance Counter",
          type_ref: "project:maintenance_counter",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_modes_1__maintenance_counter_1",
          boundary_note: "Downstream service data remains child-owned and only summarized upward.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "pump_skid_supervisor_modes_1__pump_group_1", title: "Pump Group", type_title: "Pump Group", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_modes_1__maintenance_counter_1", title: "Pump Maintenance Counter", type_title: "Maintenance Counter", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_mode_phase: {
        snapshot_state: "mode_phase_available",
        active_mode: { id: "auto", title: "Auto" },
        active_phase: { id: "ready", title: "Ready" },
        mode_summary_entries: [
          { id: "off_summary", title: "Off Summary", semantic_state: "inactive", summary: "Off mode is inactive." },
          { id: "auto_summary", title: "Auto Summary", semantic_state: "active", summary: "Auto is the active package mode." },
          { id: "service_summary", title: "Service Summary", semantic_state: "inactive", summary: "Service remains inactive." }
        ],
        phase_summary_entries: [
          { id: "idle_summary", title: "Idle Summary", semantic_state: "inactive", summary: "Idle is currently inactive." },
          { id: "ready_summary", title: "Ready Summary", semantic_state: "active", summary: "Ready is active while waiting for pumping demand." },
          { id: "pumping_summary", title: "Pumping Summary", semantic_state: "inactive", summary: "Pumping will activate only when demand is present." }
        ],
        mode_groups: [
          { id: "availability_modes", title: "Availability Modes", member_count: 2, summary: "Off and auto cover normal skid availability." },
          { id: "service_modes", title: "Service Modes", member_count: 1, summary: "Service remains a separate supervisory lane." }
        ],
        phase_groups: [
          { id: "preparation_phases", title: "Preparation Phases", member_count: 2, summary: "Idle and ready form the preparation lane." },
          { id: "active_phases", title: "Active Phases", member_count: 1, summary: "Pumping is the only active phase." }
        ],
        trace_groups: [
          { id: "mode_phase_trace", title: "Mode / Phase Trace", signal_count: 3, summary: "ready_out, pumping_out, remaining_out" }
        ],
        package_supervision_id: "",
        package_coordination_id: ""
      }
    },
    {
      id: "package-overview-boiler-supervisor-modes-execution",
      title: "BoilerSupervisorModesExecution v1",
      description: "Generic package mode transition execution surface for the boiler-like Wave 14 reference domain.",
      package_instance_id: "boiler_supervisor_modes_execution_1",
      package_definition: {
        package_id: "boiler_supervisor_modes_execution",
        title: "BoilerSupervisorModesExecution v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Wave 14 opens only bounded package mode / phase execution baseline.",
          "Boiler-like content remains reference-only and does not introduce burner sequence runtime."
        ]
      },
      members: [
        {
          id: "boiler_core_1",
          title: "Boiler Mode Core",
          role: "control_core",
          type_title: "Boiler Mode Core",
          type_ref: "project:boiler_mode_core",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_modes_execution_1__boiler_core_1",
          boundary_note: "Package transition execution stays bounded and package-neutral over this child lane.",
          related_surfaces: []
        },
        {
          id: "flow_guard_1",
          title: "Flow Guard",
          role: "availability_guard",
          type_title: "Flow Guard",
          type_ref: "project:flow_guard",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_modes_execution_1__flow_guard_1",
          boundary_note: "Guard diagnostics stay synthetic and do not become safety runtime.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "boiler_supervisor_modes_execution_1__boiler_core_1", title: "Boiler Mode Core", type_title: "Boiler Mode Core", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_modes_execution_1__flow_guard_1", title: "Flow Guard", type_title: "Flow Guard", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_mode_phase: {
        snapshot_state: "mode_phase_available",
        active_mode: { id: "auto", title: "Auto" },
        active_phase: { id: "precheck", title: "Precheck" },
        active_transition: {
          id: "start_run",
          intent: "request_phase_start",
          lifecycle_state: "running",
          guard_state: "clear",
          target_label: "Run Phase",
          summary: "Synthetic package phase start is running over the bounded run lane."
        },
        transition_actions: [
          {
            id: "to_service",
            title: "Request Service Mode",
            intent: "request_mode_change",
            lifecycle_state: "completed",
            guard_state: "clear",
            target_label: "Service Mode",
            request_preview: "request_mode_change -> pkgmode_boiler_supervisor_modes_execution_1.mode.service",
            summary: "Synthetic mode change baseline completed without opening package-specific execution."
          },
          {
            id: "start_run",
            title: "Start Run Phase",
            intent: "request_phase_start",
            lifecycle_state: "running",
            guard_state: "clear",
            target_label: "Run Phase",
            request_preview: "request_phase_start -> pkgmode_boiler_supervisor_modes_execution_1.phase.run",
            summary: "Phase start remains a bounded generic request over the active run lane."
          },
          {
            id: "abort_shutdown",
            title: "Abort Shutdown Phase",
            intent: "request_phase_abort",
            lifecycle_state: "failed",
            guard_state: "blocked",
            target_label: "Shutdown Phase",
            request_preview: "request_phase_abort -> pkgmode_boiler_supervisor_modes_execution_1.phase.shutdown",
            summary: "Abort is surfaced as blocked by guard diagnostics rather than hidden sequence behavior."
          }
        ],
        mode_summary_entries: [
          { id: "off_summary", title: "Off Summary", semantic_state: "inactive", summary: "Off lane remains inactive." },
          { id: "auto_summary", title: "Auto Summary", semantic_state: "active", summary: "Auto is the current bounded execution mode." },
          { id: "service_summary", title: "Service Summary", semantic_state: "inactive", summary: "Service is available only on explicit bounded request." }
        ],
        phase_summary_entries: [
          { id: "idle_summary", title: "Idle Summary", semantic_state: "inactive", summary: "Idle lane is inactive." },
          { id: "precheck_summary", title: "Precheck Summary", semantic_state: "active", summary: "Precheck is active while bounded run request is being evaluated." },
          { id: "run_summary", title: "Run Summary", semantic_state: "informational", summary: "Run lane is the target of the current synthetic phase start." }
        ],
        mode_groups: [
          { id: "availability_modes", title: "Availability Modes", member_count: 2, summary: "Off and auto remain the bounded availability lane." }
        ],
        phase_groups: [
          { id: "active_phases", title: "Active Phases", member_count: 2, summary: "Run and shutdown remain the bounded active phase lanes." }
        ],
        trace_groups: [
          { id: "mode_phase_trace", title: "Mode / Phase Trace", signal_count: 2, summary: "auto_out, run_out" }
        ],
        package_supervision_id: "",
        package_coordination_id: ""
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-modes-execution",
      title: "PumpSkidSupervisorModesExecution v1",
      description: "Generic package mode transition execution surface for the mandatory non-boiler Wave 14 reference domain.",
      package_instance_id: "pump_skid_supervisor_modes_execution_1",
      package_definition: {
        package_id: "pump_skid_supervisor_modes_execution",
        title: "PumpSkidSupervisorModesExecution v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Non-boiler acceptance remains mandatory for Wave 14 package execution baseline.",
          "Package transition execution stays generic and never becomes skid-specific imperative runtime."
        ]
      },
      members: [
        {
          id: "pump_group_1",
          title: "Pump Group",
          role: "pump_group",
          type_title: "Pump Group",
          type_ref: "project:pump_group",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_modes_execution_1__pump_group_1",
          boundary_note: "Execution requests stay bounded package transitions over child-owned lanes.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "pump_skid_supervisor_modes_execution_1__pump_group_1", title: "Pump Group", type_title: "Pump Group", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_mode_phase: {
        snapshot_state: "mode_phase_available",
        active_mode: { id: "auto", title: "Auto" },
        active_phase: { id: "prime", title: "Prime" },
        active_transition: {
          id: "abort_flush",
          intent: "request_phase_abort",
          lifecycle_state: "cancelled",
          guard_state: "clear",
          target_label: "Flush Phase",
          summary: "Synthetic package phase abort completed as a bounded cancel path."
        },
        transition_actions: [
          {
            id: "to_service",
            title: "Request Service Mode",
            intent: "request_mode_change",
            lifecycle_state: "pending",
            guard_state: "clear",
            target_label: "Service Mode",
            request_preview: "request_mode_change -> pkgmode_pump_skid_supervisor_modes_execution_1.mode.service",
            summary: "Mode change is waiting for confirmation token on the synthetic transport boundary."
          },
          {
            id: "start_run",
            title: "Start Run Phase",
            intent: "request_phase_start",
            lifecycle_state: "completed",
            guard_state: "clear",
            target_label: "Run Phase",
            request_preview: "request_phase_start -> pkgmode_pump_skid_supervisor_modes_execution_1.phase.run",
            summary: "Run phase start completed on the generic synthetic execution path."
          },
          {
            id: "abort_flush",
            title: "Abort Flush Phase",
            intent: "request_phase_abort",
            lifecycle_state: "cancelled",
            guard_state: "clear",
            target_label: "Flush Phase",
            request_preview: "request_phase_abort -> pkgmode_pump_skid_supervisor_modes_execution_1.phase.flush",
            summary: "Abort remains bounded and package-neutral even on the non-boiler domain."
          }
        ],
        mode_summary_entries: [
          { id: "off_summary", title: "Off Summary", semantic_state: "inactive", summary: "Off remains inactive." },
          { id: "auto_summary", title: "Auto Summary", semantic_state: "active", summary: "Auto is the current bounded execution mode." },
          { id: "service_summary", title: "Service Summary", semantic_state: "informational", summary: "Service is available through the synthetic request lane." }
        ],
        phase_summary_entries: [
          { id: "idle_summary", title: "Idle Summary", semantic_state: "inactive", summary: "Idle is inactive." },
          { id: "prime_summary", title: "Prime Summary", semantic_state: "active", summary: "Prime is the current active phase." },
          { id: "run_summary", title: "Run Summary", semantic_state: "informational", summary: "Run remains the bounded active target phase." }
        ],
        mode_groups: [
          { id: "availability_modes", title: "Availability Modes", member_count: 2, summary: "Off and auto define normal skid availability." }
        ],
        phase_groups: [
          { id: "active_phases", title: "Active Phases", member_count: 2, summary: "Prime and run remain the bounded active lane." }
        ],
        trace_groups: [
          { id: "mode_phase_trace", title: "Mode / Phase Trace", signal_count: 2, summary: "prime_out, run_out" }
        ],
        package_supervision_id: "",
        package_coordination_id: ""
      }
    },
    {
      id: "package-overview-boiler-supervisor-interlocks",
      title: "BoilerSupervisorInterlocks v1",
      description: "Read-only package permissive/interlock overview for the boiler-like Wave 15 reference domain.",
      package_instance_id: "boiler_supervisor_interlocks_1",
      package_definition: {
        package_id: "boiler_supervisor_interlocks",
        title: "BoilerSupervisorInterlocks v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Wave 15 package permissive/interlock remains a generic, package-neutral gating layer.",
          "Boiler-like content is reference-only and does not introduce safety semantics."
        ]
      },
      members: [
        {
          id: "feedwater_guard_1",
          title: "Feedwater Guard",
          role: "permissive_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_interlocks_1__feedwater_guard_1",
          boundary_note: "Child-owned source only. Package gate metadata remains read-only over flattened member outputs.",
          related_surfaces: []
        },
        {
          id: "circulation_guard_1",
          title: "Circulation Guard",
          role: "permissive_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_interlocks_1__circulation_guard_1",
          boundary_note: "Package gating derives from child state and does not become package execution.",
          related_surfaces: []
        },
        {
          id: "demand_guard_1",
          title: "Demand Guard",
          role: "permissive_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_interlocks_1__demand_guard_1",
          boundary_note: "Demand is still a child condition only and is summarized upward by the package gate surface.",
          related_surfaces: []
        },
        {
          id: "fault_latch_1",
          title: "Fault Latch",
          role: "interlock_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_interlocks_1__fault_latch_1",
          boundary_note: "Interlock indication remains metadata-only and does not introduce safety workflow or reset handling.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "boiler_supervisor_interlocks_1__feedwater_guard_1", title: "Feedwater Guard", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_interlocks_1__circulation_guard_1", title: "Circulation Guard", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_interlocks_1__demand_guard_1", title: "Demand Guard", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_interlocks_1__fault_latch_1", title: "Fault Latch", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_permissive_interlock: {
        snapshot_state: "blocked",
        gate_summary: {
          state: "blocked",
          ready: false,
          blocked_reason_ids: ["feedwater_ok", "demand_present"],
          held_reason_ids: ["permissive_blocked"],
          faulted_reason_ids: ["package_faulted"],
          transition_guard_ids: ["allow_auto_run"]
        },
        permissives: [
          { id: "feedwater_ok", title: "Feedwater OK", state: "blocked", reason_code: "feedwater_missing", summary: "Feedwater permissive is not satisfied." },
          { id: "circulation_ok", title: "Circulation OK", state: "ready", reason_code: "", summary: "Circulation permissive is clear." },
          { id: "demand_present", title: "Demand Present", state: "blocked", reason_code: "demand_missing", summary: "Demand permissive is missing." }
        ],
        interlocks: [
          { id: "permissive_blocked", title: "Permissive Blocked", state: "held", reason_code: "permissive_blocked", summary: "Package remains held until blocked permissives clear." },
          { id: "package_faulted", title: "Package Faulted", state: "faulted", reason_code: "package_faulted", summary: "Fault indication is latched by the package gate layer." }
        ],
        transition_guards: [
          {
            id: "allow_auto_run",
            title: "Allow Auto Run",
            state: "blocked",
            blocked_by_ids: ["feedwater_ok", "demand_present", "permissive_blocked", "package_faulted"],
            target_label: "Mode Transition: Auto",
            summary: "Auto transition stays blocked until all permissives are clear and no interlock remains active."
          }
        ],
        summary_outputs: [
          { id: "package_ready", title: "Package Ready", value: "false", semantic_state: "blocked" },
          { id: "package_faulted", title: "Package Faulted", value: "true", semantic_state: "faulted" }
        ],
        aggregate_monitors: [
          {
            id: "gate_health",
            title: "Gate Health",
            state: "blocked",
            severity: "warning",
            summary: "Package gate layer reports blocked permissives and active interlocks."
          }
        ],
        trace_groups: [
          { id: "gate_trace", title: "Package Gate Trace", signal_count: 2, summary: "feedwater_ok, package_faulted" }
        ]
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-interlocks",
      title: "PumpSkidSupervisorInterlocks v1",
      description: "Read-only package permissive/interlock overview for the mandatory non-boiler Wave 15 reference domain.",
      package_instance_id: "pump_skid_supervisor_interlocks_1",
      package_definition: {
        package_id: "pump_skid_supervisor_interlocks",
        title: "PumpSkidSupervisorInterlocks v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Wave 15 package permissive/interlock remains generic across domains.",
          "Pump-skid content is the mandatory second acceptance domain and carries no boiler-specific semantics."
        ]
      },
      members: [
        {
          id: "suction_guard_1",
          title: "Suction Guard",
          role: "permissive_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_interlocks_1__suction_guard_1",
          boundary_note: "Package gate metadata stays generic over child-owned source state.",
          related_surfaces: []
        },
        {
          id: "discharge_guard_1",
          title: "Discharge Path Guard",
          role: "permissive_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_interlocks_1__discharge_guard_1",
          boundary_note: "Discharge gating remains a flattened child signal, not package runtime.",
          related_surfaces: []
        },
        {
          id: "motor_ready_1",
          title: "Motor Ready",
          role: "permissive_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_interlocks_1__motor_ready_1",
          boundary_note: "Readiness remains child-owned and only summarized by the package gate surface.",
          related_surfaces: []
        },
        {
          id: "fault_latch_1",
          title: "Fault Latch",
          role: "interlock_source",
          type_title: "Package Gate Source",
          type_ref: "project:package_gate_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_interlocks_1__fault_latch_1",
          boundary_note: "Fault indication stays read-only and generic at the package layer.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "pump_skid_supervisor_interlocks_1__suction_guard_1", title: "Suction Guard", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_interlocks_1__discharge_guard_1", title: "Discharge Path Guard", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_interlocks_1__motor_ready_1", title: "Motor Ready", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_interlocks_1__fault_latch_1", title: "Fault Latch", type_title: "Package Gate Source", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_permissive_interlock: {
        snapshot_state: "ready",
        gate_summary: {
          state: "ready",
          ready: true,
          blocked_reason_ids: [],
          held_reason_ids: [],
          faulted_reason_ids: [],
          transition_guard_ids: ["allow_auto_run"]
        },
        permissives: [
          { id: "suction_ok", title: "Suction OK", state: "ready", reason_code: "", summary: "Suction permissive is clear." },
          { id: "discharge_path_ok", title: "Discharge Path OK", state: "ready", reason_code: "", summary: "Discharge path permissive is clear." },
          { id: "motor_ready", title: "Motor Ready", state: "ready", reason_code: "", summary: "Motor readiness permissive is clear." }
        ],
        interlocks: [
          { id: "permissive_blocked", title: "Permissive Blocked", state: "ready", reason_code: "permissive_blocked", summary: "Hold path is inactive." },
          { id: "package_faulted", title: "Package Faulted", state: "ready", reason_code: "package_faulted", summary: "Fault path is inactive." }
        ],
        transition_guards: [
          {
            id: "allow_auto_run",
            title: "Allow Auto Run",
            state: "clear",
            blocked_by_ids: [],
            target_label: "Mode Transition: Auto",
            summary: "Auto transition is clear when all permissives are ready and no interlock is active."
          }
        ],
        summary_outputs: [
          { id: "package_ready", title: "Package Ready", value: "true", semantic_state: "ready" },
          { id: "package_faulted", title: "Package Faulted", value: "false", semantic_state: "informational" }
        ],
        aggregate_monitors: [
          {
            id: "gate_health",
            title: "Gate Health",
            state: "ready",
            severity: "info",
            summary: "Package gate layer is clear across the non-boiler reference domain."
          }
        ],
        trace_groups: [
          { id: "gate_trace", title: "Package Gate Trace", signal_count: 2, summary: "suction_ok, package_faulted" }
        ]
      }
    },
    {
      id: "package-overview-boiler-supervisor-protection",
      title: "BoilerSupervisorProtection v1",
      description: "Read-only package protection / recovery surface over child-owned trip, inhibit, and recovery request lanes. It stays generic, non-safety, and package-neutral.",
      package_instance_id: "boiler_supervisor_protection_1",
      package_definition: {
        package_id: "boiler_supervisor_protection",
        title: "BoilerSupervisorProtection v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package protection / recovery is a generic supervisory layer only. It is not certified safety logic, flame safeguard, or burner management.",
          "Trips, inhibits, and recovery requests remain child-owned signals and operations after flattening."
        ]
      },
      members: [
        {
          id: "pressure_trip_1",
          title: "Pressure Trip Source",
          role: "trip_source",
          type_title: "Package Protection Source",
          type_ref: "project:package_protection_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_protection_1__pressure_trip_1",
          boundary_note: "Trip state remains a child-owned source and is only summarized at the package layer.",
          related_surfaces: []
        },
        {
          id: "feedwater_guard_1",
          title: "Feedwater Guard",
          role: "inhibit_source",
          type_title: "Package Protection Source",
          type_ref: "project:package_protection_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_protection_1__feedwater_guard_1",
          boundary_note: "Recovery blocking remains child-owned and does not imply package runtime of its own.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "boiler_supervisor_protection_1__pressure_trip_1", title: "Pressure Trip Source", type_title: "Package Protection Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_protection_1__feedwater_guard_1", title: "Feedwater Guard", type_title: "Package Protection Source", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_protection_recovery: {
        snapshot_state: "tripped",
        protection_summary: {
          state: "tripped",
          ready: false,
          trip_reason_ids: ["pressure_trip"],
          inhibit_reason_ids: ["feedwater_blocked"],
          recovery_request_ids: ["request_recovery", "reset_pressure_trip"],
          diagnostic_summary_ids: ["active_reasons"]
        },
        trips: [
          {
            id: "pressure_trip",
            title: "Pressure Trip",
            state: "tripped",
            latching: true,
            reason_code: "pressure_trip_active",
            diagnostic_ref: "diag_pressure_trip",
            summary: "Package pressure trip is latched."
          }
        ],
        inhibits: [
          {
            id: "feedwater_blocked",
            title: "Feedwater Blocked",
            state: "blocked",
            reason_code: "feedwater_blocked",
            diagnostic_ref: "diag_feedwater_blocked",
            summary: "Feedwater path is blocked until upstream conditions recover."
          }
        ],
        diagnostic_summaries: [
          {
            id: "active_reasons",
            title: "Active Reasons",
            trip_ids: ["pressure_trip"],
            inhibit_ids: ["feedwater_blocked"],
            summary: "Recovery remains blocked until the feedwater inhibit clears and the latched trip is reset."
          }
        ],
        recovery_requests: [
          {
            id: "request_recovery",
            title: "Request Recovery",
            kind: "reset",
            availability_state: "available",
            target_operation_id: "op_boiler_supervisor_protection_1__pressure_trip_1_request_recovery",
            target_owner_instance_id: "boiler_supervisor_protection_1__pressure_trip_1",
            summary: "Recovery request stays visible as a child-targeted reset intent."
          },
          {
            id: "reset_pressure_trip",
            title: "Reset Pressure Trip",
            kind: "reset_latch",
            availability_state: "available",
            target_operation_id: "op_boiler_supervisor_protection_1__pressure_trip_1_reset_trip",
            target_owner_instance_id: "boiler_supervisor_protection_1__pressure_trip_1",
            summary: "Trip reset remains child-owned and confirmation-gated."
          }
        ],
        summary_outputs: [
          { id: "package_ready", title: "Package Ready", value: "false", semantic_state: "blocked" },
          { id: "package_tripped", title: "Package Tripped", value: "true", semantic_state: "tripped" }
        ],
        aggregate_monitors: [
          {
            id: "protection_health",
            title: "Protection Health",
            state: "tripped",
            severity: "alarm",
            summary: "Trip remains latched while the inhibit still blocks recovery."
          }
        ],
        trace_groups: [
          { id: "protection_trace", title: "Protection Trace", signal_count: 2, summary: "blocked_out, trip_out" }
        ]
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-protection",
      title: "PumpSkidSupervisorProtection v1",
      description: "Read-only package protection / recovery surface in the second reference domain. Vocabulary stays generic and does not imply boiler-specific semantics.",
      package_instance_id: "pump_skid_supervisor_protection_1",
      package_definition: {
        package_id: "pump_skid_supervisor_protection",
        title: "PumpSkidSupervisorProtection v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package protection / recovery remains generic, non-safety, and read-only at this wave.",
          "Pump-skid protection states are summarized from child members and do not create hidden coordination or sequence runtime."
        ]
      },
      members: [
        {
          id: "motor_trip_1",
          title: "Motor Trip Source",
          role: "trip_source",
          type_title: "Package Protection Source",
          type_ref: "project:package_protection_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_protection_1__motor_trip_1",
          boundary_note: "Trip indication stays child-owned and generic at the package layer.",
          related_surfaces: []
        },
        {
          id: "suction_guard_1",
          title: "Suction Guard",
          role: "inhibit_source",
          type_title: "Package Protection Source",
          type_ref: "project:package_protection_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_protection_1__suction_guard_1",
          boundary_note: "Suction inhibit remains a child source and only feeds the package summary.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "pump_skid_supervisor_protection_1__motor_trip_1", title: "Motor Trip Source", type_title: "Package Protection Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_protection_1__suction_guard_1", title: "Suction Guard", type_title: "Package Protection Source", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_protection_recovery: {
        snapshot_state: "ready",
        protection_summary: {
          state: "ready",
          ready: true,
          trip_reason_ids: [],
          inhibit_reason_ids: [],
          recovery_request_ids: ["request_recovery", "reset_motor_trip"],
          diagnostic_summary_ids: ["ready_path"]
        },
        trips: [
          {
            id: "motor_trip",
            title: "Motor Trip",
            state: "ready",
            latching: false,
            reason_code: "motor_trip_active",
            diagnostic_ref: "diag_motor_trip",
            summary: "Motor trip remains clear on the ready baseline."
          }
        ],
        inhibits: [
          {
            id: "suction_blocked",
            title: "Suction Blocked",
            state: "ready",
            reason_code: "suction_blocked",
            diagnostic_ref: "diag_suction_blocked",
            summary: "Suction path inhibit remains clear on the ready baseline."
          }
        ],
        diagnostic_summaries: [
          {
            id: "ready_path",
            title: "Ready Path",
            trip_ids: [],
            inhibit_ids: [],
            summary: "Protection baseline is clear and the package is ready."
          }
        ],
        recovery_requests: [
          {
            id: "request_recovery",
            title: "Request Recovery",
            kind: "reset",
            availability_state: "unavailable",
            target_operation_id: "op_pump_skid_supervisor_protection_1__motor_trip_1_request_recovery",
            target_owner_instance_id: "pump_skid_supervisor_protection_1__motor_trip_1",
            summary: "Recovery request remains visible but inactive while the package is ready."
          },
          {
            id: "reset_motor_trip",
            title: "Reset Motor Trip",
            kind: "reset_latch",
            availability_state: "unavailable",
            target_operation_id: "op_pump_skid_supervisor_protection_1__motor_trip_1_reset_trip",
            target_owner_instance_id: "pump_skid_supervisor_protection_1__motor_trip_1",
            summary: "Trip reset stays explicit without adding runnable package semantics."
          }
        ],
        summary_outputs: [
          { id: "package_ready", title: "Package Ready", value: "true", semantic_state: "ready" },
          { id: "package_tripped", title: "Package Tripped", value: "false", semantic_state: "informational" }
        ],
        aggregate_monitors: [
          {
            id: "protection_health",
            title: "Protection Health",
            state: "ready",
            severity: "info",
            summary: "Protection baseline is clear across the non-boiler reference domain."
          }
        ],
        trace_groups: [
          { id: "protection_trace", title: "Protection Trace", signal_count: 2, summary: "blocked_out, trip_out" }
        ]
      }
    },
    {
      id: "package-overview-boiler-supervisor-protection-no-snapshot",
      title: "BoilerSupervisorProtection v1 / No Snapshot",
      description: "Package protection / recovery contract exists but no target snapshot is available yet.",
      package_instance_id: "boiler_supervisor_protection_1",
      package_definition: {
        package_id: "boiler_supervisor_protection",
        title: "BoilerSupervisorProtection v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package protection / recovery remains metadata-first even when no target snapshot is available."
        ]
      },
      members: [],
      effective_objects: [],
      package_protection_recovery: {
        snapshot_state: "no_snapshot",
        protection_summary: null,
        trips: [],
        inhibits: [],
        diagnostic_summaries: [],
        recovery_requests: [],
        summary_outputs: [],
        aggregate_monitors: [],
        trace_groups: []
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-protection-unsupported",
      title: "PumpSkidSupervisorProtection v1 / Unsupported",
      description: "Package protection / recovery metadata exists, but the current target surface does not expose it.",
      package_instance_id: "pump_skid_supervisor_protection_1",
      package_definition: {
        package_id: "pump_skid_supervisor_protection",
        title: "PumpSkidSupervisorProtection v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Unsupported package protection / recovery is surfaced explicitly and does not imply fallback safety or execution semantics."
        ]
      },
      members: [],
      effective_objects: [],
      package_protection_recovery: {
        snapshot_state: "unsupported_by_target",
        protection_summary: null,
        trips: [],
        inhibits: [],
        diagnostic_summaries: [],
        recovery_requests: [],
        summary_outputs: [],
        aggregate_monitors: [],
        trace_groups: []
      }
    },
    {
      id: "package-overview-boiler-supervisor-interlocks-no-snapshot",
      title: "BoilerSupervisorInterlocks v1 / No Snapshot",
      description: "Package permissive/interlock contract exists but no target snapshot is available yet.",
      package_instance_id: "boiler_supervisor_interlocks_1",
      package_definition: {
        package_id: "boiler_supervisor_interlocks",
        title: "BoilerSupervisorInterlocks v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package permissive/interlock remains metadata-first even when no target snapshot is available."
        ]
      },
      members: [],
      effective_objects: [],
      package_permissive_interlock: {
        snapshot_state: "no_snapshot",
        gate_summary: null,
        permissives: [],
        interlocks: [],
        transition_guards: [],
        summary_outputs: [],
        aggregate_monitors: [],
        trace_groups: []
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-interlocks-unsupported",
      title: "PumpSkidSupervisorInterlocks v1 / Unsupported",
      description: "Package permissive/interlock metadata exists, but the current target surface does not expose it.",
      package_instance_id: "pump_skid_supervisor_interlocks_1",
      package_definition: {
        package_id: "pump_skid_supervisor_interlocks",
        title: "PumpSkidSupervisorInterlocks v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Unsupported package permissive/interlock is surfaced explicitly and does not imply fallback execution."
        ]
      },
      members: [],
      effective_objects: [],
      package_permissive_interlock: {
        snapshot_state: "unsupported_by_target",
        gate_summary: null,
        permissives: [],
        interlocks: [],
        transition_guards: [],
        summary_outputs: [],
        aggregate_monitors: [],
        trace_groups: []
      }
    },
    {
      id: "package-overview-boiler-supervisor-modes-no-snapshot",
      title: "BoilerSupervisorModes v1 / No Snapshot",
      description: "Package mode / phase contract exists but no target snapshot is available yet.",
      package_instance_id: "boiler_supervisor_modes_1",
      package_definition: {
        package_id: "std.boiler_supervisor_modes.v1",
        title: "BoilerSupervisorModes v1",
        origin: "std_library",
        preset_count: 1,
        template_count: 2,
        presets: ["default_modes"],
        templates: ["run_hours_service_preset", "maintenance_service_saved"],
        boundary_notes: [
          "Package mode / phase stays metadata-first even when no snapshot is available."
        ]
      },
      members: [],
      effective_objects: [],
      package_mode_phase: {
        snapshot_state: "no_snapshot",
        active_mode: { id: "none", title: "None" },
        active_phase: { id: "none", title: "None" },
        mode_summary_entries: [],
        phase_summary_entries: [],
        mode_groups: [],
        phase_groups: [],
        trace_groups: [],
        package_supervision_id: "",
        package_coordination_id: ""
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-modes-unsupported",
      title: "PumpSkidSupervisorModes v1 / Unsupported",
      description: "Package mode / phase metadata exists, but the current target surface does not expose it.",
      package_instance_id: "pump_skid_supervisor_modes_1",
      package_definition: {
        package_id: "std.pump_skid_supervisor_modes.v1",
        title: "PumpSkidSupervisorModes v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Unsupported package mode / phase is surfaced explicitly and does not imply fallback execution."
        ]
      },
      members: [],
      effective_objects: [],
      package_mode_phase: {
        snapshot_state: "unsupported_by_target",
        active_mode: { id: "none", title: "None" },
        active_phase: { id: "none", title: "None" },
        mode_summary_entries: [],
        phase_summary_entries: [],
        mode_groups: [],
        phase_groups: [],
        trace_groups: [],
        package_supervision_id: "",
        package_coordination_id: ""
      }
    },
    {
      id: "package-overview-boiler-supervisor-arbitration",
      title: "BoilerSupervisorArbitration v1",
      description: "Read-only package arbitration surface over explicit ownership lanes and command results. This remains generic command arbitration metadata, not a hidden package execution engine.",
      package_instance_id: "boiler_supervisor_arbitration_1",
      package_definition: {
        package_id: "boiler_supervisor_arbitration",
        title: "BoilerSupervisorArbitration v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package arbitration remains generic and package-neutral. It summarizes ownership and command outcomes over flattened child objects only.",
          "Boiler-like content here is reference-only and does not introduce burner-specific execution semantics."
        ]
      },
      members: [
        {
          id: "auto_owner_1",
          title: "Auto Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_arbitration_1__auto_owner_1",
          boundary_note: "Ownership source only. It exposes authority state and does not execute package commands itself.",
          related_surfaces: []
        },
        {
          id: "manual_owner_1",
          title: "Manual Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_arbitration_1__manual_owner_1",
          boundary_note: "Manual ownership remains a generic child source and does not gain package-local execution behavior.",
          related_surfaces: []
        },
        {
          id: "service_owner_1",
          title: "Service Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_arbitration_1__service_owner_1",
          boundary_note: "Service lane exists only as explicit ownership metadata over child members.",
          related_surfaces: []
        },
        {
          id: "remote_owner_1",
          title: "Remote Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_arbitration_1__remote_owner_1",
          boundary_note: "Remote ownership remains explicit and generic, without vendor-specific command wiring.",
          related_surfaces: []
        },
        {
          id: "enable_request_1",
          title: "Enable Request Target",
          role: "command_target",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_arbitration_1__enable_request_1",
          boundary_note: "Command targets stay flattened child objects; package arbitration only summarizes the decision lane.",
          related_surfaces: []
        },
        {
          id: "reset_request_1",
          title: "Reset Request Target",
          role: "command_target",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "boiler_supervisor_arbitration_1__reset_request_1",
          boundary_note: "Reset target remains a plain child member with no hidden package command execution.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "boiler_supervisor_arbitration_1__auto_owner_1", title: "Auto Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_arbitration_1__manual_owner_1", title: "Manual Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_arbitration_1__service_owner_1", title: "Service Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_arbitration_1__remote_owner_1", title: "Remote Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_arbitration_1__enable_request_1", title: "Enable Request Target", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "boiler_supervisor_arbitration_1__reset_request_1", title: "Reset Request Target", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_arbitration: {
        snapshot_state: "accepted",
        ownership_summary: {
          id: "ownership_summary",
          active_lane_ids: ["manual_owner"],
          summary: "Manual ownership is currently active."
        },
        ownership_lanes: [
          {
            id: "auto_owner",
            title: "Auto Owner",
            lane: "auto",
            summary: "Automatic ownership lane is available.",
            source_ports: [{ instance_id: "boiler_supervisor_arbitration_1__auto_owner_1", port_id: "authority_out" }]
          },
          {
            id: "manual_owner",
            title: "Manual Owner",
            lane: "manual",
            summary: "Manual ownership lane is active.",
            source_ports: [{ instance_id: "boiler_supervisor_arbitration_1__manual_owner_1", port_id: "authority_out" }]
          },
          {
            id: "service_owner",
            title: "Service Owner",
            lane: "service",
            summary: "Service ownership lane is available for maintenance use.",
            source_ports: [{ instance_id: "boiler_supervisor_arbitration_1__service_owner_1", port_id: "authority_out" }]
          },
          {
            id: "remote_owner",
            title: "Remote Owner",
            lane: "remote",
            summary: "Remote ownership lane is available but not active.",
            source_ports: [{ instance_id: "boiler_supervisor_arbitration_1__remote_owner_1", port_id: "authority_out" }]
          }
        ],
        command_summary: {
          id: "command_summary",
          active_owner_lane_ids: ["manual_owner"],
          accepted_lane_ids: ["enable_auto"],
          blocked_lane_ids: ["reset_service"],
          denied_lane_ids: ["disable_remote"],
          superseded_lane_ids: ["start_service"],
          summary: "One accepted lane remains active while blocked, denied, and superseded outcomes stay explicit."
        },
        command_lanes: [
          {
            id: "enable_auto",
            title: "Enable In Auto",
            request_kind: "request_enable",
            ownership_lane: "auto",
            arbitration_result: "accepted",
            request_preview: "request_enable -> enable_request_1",
            summary: "Enable request is accepted for the automatic lane."
          },
          {
            id: "reset_service",
            title: "Reset In Service",
            request_kind: "request_reset",
            ownership_lane: "service",
            arbitration_result: "blocked",
            blocked_reason: "service_lockout",
            request_preview: "request_reset -> reset_request_1",
            summary: "Reset request is blocked while manual ownership stays active."
          },
          {
            id: "disable_remote",
            title: "Disable From Remote",
            request_kind: "request_disable",
            ownership_lane: "remote",
            arbitration_result: "denied",
            denied_reason: "manual_owner_active",
            request_preview: "request_disable -> enable_request_1",
            summary: "Remote disable is denied because manual ownership has authority."
          },
          {
            id: "start_service",
            title: "Start In Service",
            request_kind: "request_start",
            ownership_lane: "service",
            arbitration_result: "superseded",
            superseded_by_lane_id: "enable_auto",
            request_preview: "request_start -> enable_request_1",
            summary: "Service start is superseded by the accepted auto enable request."
          }
        ],
        summary_outputs: [
          { id: "command_ready", title: "Command Ready", value: "true", semantic_state: "healthy" },
          { id: "command_denied", title: "Command Denied", value: "true", semantic_state: "degraded" }
        ],
        aggregate_monitors: [
          {
            id: "arbitration_health",
            title: "Arbitration Health",
            state: "accepted",
            severity: "info",
            summary: "At least one accepted lane is available while blocked and denied outcomes remain explicit."
          }
        ],
        trace_groups: [
          { id: "arbitration_trace", title: "Arbitration Trace", signal_count: 3, summary: "manual authority, blocked state, denied state" }
        ]
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-arbitration",
      title: "PumpSkidSupervisorArbitration v1",
      description: "Read-only package arbitration surface over explicit ownership lanes and command results in the second reference domain.",
      package_instance_id: "pump_skid_supervisor_arbitration_1",
      package_definition: {
        package_id: "pump_skid_supervisor_arbitration",
        title: "PumpSkidSupervisorArbitration v1",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package arbitration remains generic and package-neutral across the second acceptance domain.",
          "Pump-skid content is reference-only and does not inherit boiler-specific command semantics."
        ]
      },
      members: [
        {
          id: "auto_owner_1",
          title: "Auto Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_arbitration_1__auto_owner_1",
          boundary_note: "Ownership source only. No hidden package execution is introduced here.",
          related_surfaces: []
        },
        {
          id: "manual_owner_1",
          title: "Manual Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_arbitration_1__manual_owner_1",
          boundary_note: "Manual ownership remains a generic child source over flattened runtime objects.",
          related_surfaces: []
        },
        {
          id: "service_owner_1",
          title: "Service Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_arbitration_1__service_owner_1",
          boundary_note: "Service lane is explicit metadata and does not imply maintenance execution hooks.",
          related_surfaces: []
        },
        {
          id: "remote_owner_1",
          title: "Remote Owner",
          role: "ownership_lane",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_arbitration_1__remote_owner_1",
          boundary_note: "Remote ownership stays explicit and bounded to generic arbitration language only.",
          related_surfaces: []
        },
        {
          id: "start_request_1",
          title: "Start Request Target",
          role: "command_target",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_arbitration_1__start_request_1",
          boundary_note: "Command targets remain plain child members after package flattening.",
          related_surfaces: []
        },
        {
          id: "disable_request_1",
          title: "Disable Request Target",
          role: "command_target",
          type_title: "Package Command Source",
          type_ref: "project:package_command_source",
          template_ref: "",
          preset_ref: "",
          effective_object_id: "pump_skid_supervisor_arbitration_1__disable_request_1",
          boundary_note: "Disable target stays package-neutral and receives only summarized arbitration metadata.",
          related_surfaces: []
        }
      ],
      effective_objects: [
        { id: "pump_skid_supervisor_arbitration_1__auto_owner_1", title: "Auto Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_arbitration_1__manual_owner_1", title: "Manual Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_arbitration_1__service_owner_1", title: "Service Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_arbitration_1__remote_owner_1", title: "Remote Owner", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_arbitration_1__start_request_1", title: "Start Request Target", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_arbitration_1__disable_request_1", title: "Disable Request Target", type_title: "Package Command Source", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_arbitration: {
        snapshot_state: "accepted",
        ownership_summary: {
          id: "ownership_summary",
          active_lane_ids: ["auto_owner"],
          summary: "Automatic ownership is currently active."
        },
        ownership_lanes: [
          {
            id: "auto_owner",
            title: "Auto Owner",
            lane: "auto",
            summary: "Automatic ownership lane is active.",
            source_ports: [{ instance_id: "pump_skid_supervisor_arbitration_1__auto_owner_1", port_id: "authority_out" }]
          },
          {
            id: "manual_owner",
            title: "Manual Owner",
            lane: "manual",
            summary: "Manual ownership lane is available but not active.",
            source_ports: [{ instance_id: "pump_skid_supervisor_arbitration_1__manual_owner_1", port_id: "authority_out" }]
          },
          {
            id: "service_owner",
            title: "Service Owner",
            lane: "service",
            summary: "Service ownership lane is available for maintenance use.",
            source_ports: [{ instance_id: "pump_skid_supervisor_arbitration_1__service_owner_1", port_id: "authority_out" }]
          },
          {
            id: "remote_owner",
            title: "Remote Owner",
            lane: "remote",
            summary: "Remote ownership lane is available but denied for reset.",
            source_ports: [{ instance_id: "pump_skid_supervisor_arbitration_1__remote_owner_1", port_id: "authority_out" }]
          }
        ],
        command_summary: {
          id: "command_summary",
          active_owner_lane_ids: ["auto_owner"],
          accepted_lane_ids: ["start_auto"],
          blocked_lane_ids: ["disable_service"],
          denied_lane_ids: ["reset_remote"],
          superseded_lane_ids: ["stop_manual"],
          summary: "Automatic ownership remains active while blocked, denied, and superseded command outcomes stay explicit."
        },
        command_lanes: [
          {
            id: "start_auto",
            title: "Start In Auto",
            request_kind: "request_start",
            ownership_lane: "auto",
            arbitration_result: "accepted",
            request_preview: "request_start -> start_request_1",
            summary: "Automatic start request is accepted."
          },
          {
            id: "disable_service",
            title: "Disable In Service",
            request_kind: "request_disable",
            ownership_lane: "service",
            arbitration_result: "blocked",
            blocked_reason: "service_window_closed",
            request_preview: "request_disable -> disable_request_1",
            summary: "Service disable is blocked until the maintenance window opens."
          },
          {
            id: "reset_remote",
            title: "Reset From Remote",
            request_kind: "request_reset",
            ownership_lane: "remote",
            arbitration_result: "denied",
            denied_reason: "auto_owner_active",
            request_preview: "request_reset -> disable_request_1",
            summary: "Remote reset is denied because automatic ownership has authority."
          },
          {
            id: "stop_manual",
            title: "Stop In Manual",
            request_kind: "request_stop",
            ownership_lane: "manual",
            arbitration_result: "superseded",
            superseded_by_lane_id: "start_auto",
            request_preview: "request_stop -> start_request_1",
            summary: "Manual stop is superseded by the accepted auto start request."
          }
        ],
        summary_outputs: [
          { id: "command_ready", title: "Command Ready", value: "true", semantic_state: "healthy" },
          { id: "command_blocked", title: "Command Blocked", value: "true", semantic_state: "degraded" }
        ],
        aggregate_monitors: [
          {
            id: "arbitration_health",
            title: "Arbitration Health",
            state: "accepted",
            severity: "info",
            summary: "Accepted arbitration remains available while blocked and denied outcomes stay visible."
          }
        ],
        trace_groups: [
          { id: "arbitration_trace", title: "Arbitration Trace", signal_count: 3, summary: "auto authority, blocked state, denied state" }
        ]
      }
    },
    {
      id: "package-overview-boiler-supervisor-no-snapshot",
      title: "BoilerSupervisor v1 / No Snapshot",
      description: "Package supervision contract is present but no readback snapshot is available yet.",
      package_instance_id: "boiler_pkg_1",
      package_definition: {
        package_id: "std.boiler_supervisor.v1",
        title: "Boiler Supervisor v1",
        origin: "std_library",
        preset_count: 1,
        template_count: 2,
        presets: ["default_supervision"],
        templates: ["run_hours_service_preset", "maintenance_service_saved"],
        boundary_notes: [
          "Package supervision stays metadata-first even when no target snapshot is available."
        ]
      },
      members: [],
      effective_objects: [],
      package_supervision: {
        snapshot_state: "no_snapshot",
        summary_outputs: [],
        aggregate_monitors: [],
        aggregate_alarms: [],
        trace_groups: [],
        operation_proxies: [],
        child_summary_cards: []
      }
    },
    {
      id: "package-overview-boiler-supervisor-overrides",
      title: "BoilerSupervisorOverrides v1",
      description: "Read-only package override / handover surface over explicit current holder, requested holder, and bounded handover requests.",
      package_instance_id: "boiler_supervisor_overrides_1",
      package_definition: {
        package_id: "boiler_supervisor_overrides",
        title: "Boiler Supervisor Overrides",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package override / handover remains generic, package-neutral, and non-safety.",
          "Boiler-like content is reference-only and does not define boiler-specific authority semantics."
        ]
      },
      members: [
        { id: "auto_owner_1", title: "Auto Owner", type_title: "Package Command Source", role: "holder", effective_object_id: "boiler_supervisor_overrides_1__auto_owner_1", boundary_note: "Auto holder remains a flattened child object.", related_surfaces: [] },
        { id: "manual_owner_1", title: "Manual Owner", type_title: "Package Command Source", role: "holder", effective_object_id: "boiler_supervisor_overrides_1__manual_owner_1", boundary_note: "Manual holder remains a flattened child object.", related_surfaces: [] },
        { id: "service_owner_1", title: "Service Owner", type_title: "Package Command Source", role: "holder", effective_object_id: "boiler_supervisor_overrides_1__service_owner_1", boundary_note: "Service holder remains a flattened child object.", related_surfaces: [] },
        { id: "takeover_request_1", title: "Takeover Request Surface", type_title: "Package Command Source", role: "request_surface", effective_object_id: "boiler_supervisor_overrides_1__takeover_request_1", boundary_note: "Handover request surfaces remain flattened child objects.", related_surfaces: [] },
        { id: "release_request_1", title: "Release Request Surface", type_title: "Package Command Source", role: "request_surface", effective_object_id: "boiler_supervisor_overrides_1__release_request_1", boundary_note: "Handover request surfaces remain flattened child objects.", related_surfaces: [] }
      ],
      effective_objects: [
        { id: "boiler_supervisor_overrides_1__manual_owner_1", package_neutral: true },
        { id: "boiler_supervisor_overrides_1__release_request_1", package_neutral: true }
      ],
      package_override_handover: {
        snapshot_state: "accepted",
        authority_holders: [
          { id: "auto_owner", title: "Auto Holder", lane: "auto", source_ports: [{ instance_id: "boiler_supervisor_overrides_1__auto_owner_1", port_id: "authority_out" }], summary: "Automatic lane is available for return-to-auto." },
          { id: "manual_owner", title: "Manual Holder", lane: "manual", source_ports: [{ instance_id: "boiler_supervisor_overrides_1__manual_owner_1", port_id: "authority_out" }], summary: "Manual holder is currently active." },
          { id: "service_owner", title: "Service Holder", lane: "service", source_ports: [{ instance_id: "boiler_supervisor_overrides_1__service_owner_1", port_id: "authority_out" }], summary: "Service holder can request bounded takeover." },
          { id: "remote_owner", title: "Remote Holder", lane: "remote", source_ports: [{ instance_id: "boiler_supervisor_overrides_1__remote_owner_1", port_id: "authority_out" }], summary: "Remote holder remains visible but not authoritative." }
        ],
        handover_summary: {
          id: "handover_summary",
          current_holder_id: "manual_owner",
          current_lane: "manual",
          requested_holder_id: "service_owner",
          accepted_request_ids: ["release_to_auto", "return_to_auto"],
          blocked_request_ids: ["service_takeover"],
          denied_request_ids: ["remote_takeover"],
          last_handover_reason: "manual_override_active",
          summary: "Manual override is active while release back to auto remains available."
        },
        handover_requests: [
          { id: "service_takeover", title: "Service Takeover", request_kind: "request_takeover", requested_holder_id: "service_owner", requested_lane: "service", state: "blocked", blocked_reason: "blocked_by_policy", request_preview: "request_takeover -> service_owner", summary: "Service takeover is blocked until the active manual holder releases authority." },
          { id: "release_to_auto", title: "Release To Auto", request_kind: "request_release", requested_holder_id: "auto_owner", requested_lane: "auto", state: "accepted", request_preview: "request_release -> auto_owner", summary: "Current holder may release control back to the automatic lane." },
          { id: "return_to_auto", title: "Return To Auto", request_kind: "request_return_to_auto", requested_holder_id: "auto_owner", requested_lane: "auto", state: "accepted", request_preview: "request_return_to_auto -> auto_owner", summary: "Return-to-auto remains available as the bounded fallback handover." },
          { id: "remote_takeover", title: "Remote Takeover", request_kind: "request_takeover", requested_holder_id: "remote_owner", requested_lane: "remote", state: "denied", denied_reason: "held_by_other_owner", request_preview: "request_takeover -> remote_owner", summary: "Remote takeover is denied while manual override remains the active holder." }
        ],
        summary_outputs: [
          { id: "override_ready", semantic_state: "informational", value: "true", summary: "Release path is ready." },
          { id: "override_blocked", semantic_state: "informational", value: "true", summary: "Blocked takeover remains visible." }
        ],
        aggregate_monitors: [
          { id: "override_handover_health", state: "accepted", severity: "info", summary: "Override / handover monitor stays healthy." }
        ],
        trace_groups: [
          { id: "override_handover_trace", signal_count: 3, summary: "Holder and request traces stay visible." }
        ]
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-overrides",
      title: "PumpSkidSupervisorOverrides v1",
      description: "Read-only package override / handover surface over current automatic holder, manual/service takeover requests, and bounded return-to-auto.",
      package_instance_id: "pump_skid_supervisor_overrides_1",
      package_definition: {
        package_id: "pump_skid_supervisor_overrides",
        title: "Pump Skid Supervisor Overrides",
        origin: "project",
        preset_count: 0,
        template_count: 0,
        presets: [],
        templates: [],
        boundary_notes: [
          "Package override / handover remains generic, package-neutral, and non-safety.",
          "Pump-skid content is the mandatory second acceptance domain and does not inherit boiler-specific semantics."
        ]
      },
      members: [
        { id: "auto_owner_1", title: "Auto Owner", type_title: "Package Command Source", role: "holder", effective_object_id: "pump_skid_supervisor_overrides_1__auto_owner_1", boundary_note: "Auto holder remains a flattened child object.", related_surfaces: [] },
        { id: "manual_owner_1", title: "Manual Owner", type_title: "Package Command Source", role: "holder", effective_object_id: "pump_skid_supervisor_overrides_1__manual_owner_1", boundary_note: "Manual holder remains a flattened child object.", related_surfaces: [] },
        { id: "service_owner_1", title: "Service Owner", type_title: "Package Command Source", role: "holder", effective_object_id: "pump_skid_supervisor_overrides_1__service_owner_1", boundary_note: "Service holder remains a flattened child object.", related_surfaces: [] },
        { id: "handover_request_1", title: "Handover Request Surface", type_title: "Package Command Source", role: "request_surface", effective_object_id: "pump_skid_supervisor_overrides_1__handover_request_1", boundary_note: "Handover request surfaces remain flattened child objects.", related_surfaces: [] },
        { id: "return_auto_request_1", title: "Return To Auto Surface", type_title: "Package Command Source", role: "request_surface", effective_object_id: "pump_skid_supervisor_overrides_1__return_auto_request_1", boundary_note: "Handover request surfaces remain flattened child objects.", related_surfaces: [] }
      ],
      effective_objects: [
        { id: "pump_skid_supervisor_overrides_1__auto_owner_1", package_neutral: true },
        { id: "pump_skid_supervisor_overrides_1__handover_request_1", package_neutral: true }
      ],
      package_override_handover: {
        snapshot_state: "accepted",
        authority_holders: [
          { id: "auto_owner", title: "Auto Holder", lane: "auto", source_ports: [{ instance_id: "pump_skid_supervisor_overrides_1__auto_owner_1", port_id: "authority_out" }], summary: "Automatic lane is currently active." },
          { id: "manual_owner", title: "Manual Holder", lane: "manual", source_ports: [{ instance_id: "pump_skid_supervisor_overrides_1__manual_owner_1", port_id: "authority_out" }], summary: "Manual holder can request local handover." },
          { id: "service_owner", title: "Service Holder", lane: "service", source_ports: [{ instance_id: "pump_skid_supervisor_overrides_1__service_owner_1", port_id: "authority_out" }], summary: "Service holder is available for maintenance takeover." },
          { id: "remote_owner", title: "Remote Holder", lane: "remote", source_ports: [{ instance_id: "pump_skid_supervisor_overrides_1__remote_owner_1", port_id: "authority_out" }], summary: "Remote holder is visible but not currently requested." }
        ],
        handover_summary: {
          id: "handover_summary",
          current_holder_id: "auto_owner",
          current_lane: "auto",
          requested_holder_id: "manual_owner",
          accepted_request_ids: ["manual_takeover", "return_to_auto"],
          blocked_request_ids: ["service_takeover"],
          denied_request_ids: ["remote_release"],
          last_handover_reason: "returned_to_auto",
          summary: "Automatic authority is active while a manual takeover remains available."
        },
        handover_requests: [
          { id: "manual_takeover", title: "Manual Takeover", request_kind: "request_takeover", requested_holder_id: "manual_owner", requested_lane: "manual", state: "accepted", request_preview: "request_takeover -> manual_owner", summary: "Local manual handover is available from the panel lane." },
          { id: "service_takeover", title: "Service Takeover", request_kind: "request_takeover", requested_holder_id: "service_owner", requested_lane: "service", state: "blocked", blocked_reason: "not_available", request_preview: "request_takeover -> service_owner", summary: "Service takeover is blocked until the maintenance window is open." },
          { id: "return_to_auto", title: "Return To Auto", request_kind: "request_return_to_auto", requested_holder_id: "auto_owner", requested_lane: "auto", state: "accepted", request_preview: "request_return_to_auto -> auto_owner", summary: "Return-to-auto stays available as the package-neutral fallback." },
          { id: "remote_release", title: "Remote Release", request_kind: "request_release", requested_holder_id: "remote_owner", requested_lane: "remote", state: "denied", denied_reason: "held_by_other_owner", request_preview: "request_release -> remote_owner", summary: "Remote release is denied because the automatic holder remains authoritative." }
        ],
        summary_outputs: [
          { id: "override_ready", semantic_state: "informational", value: "true", summary: "Manual takeover is ready." },
          { id: "override_denied", semantic_state: "informational", value: "true", summary: "Remote release denial remains visible." }
        ],
        aggregate_monitors: [
          { id: "override_handover_health", state: "accepted", severity: "info", summary: "Override / handover monitor stays healthy." }
        ],
        trace_groups: [
          { id: "override_handover_trace", signal_count: 3, summary: "Holder and request traces stay visible." }
        ]
      }
    },
    {
      id: "package-overview-boiler-supervisor-unsupported",
      title: "BoilerSupervisor v1 / Unsupported",
      description: "Package supervision metadata exists, but the current target surface does not expose snapshots for it.",
      package_instance_id: "boiler_pkg_1",
      package_definition: {
        package_id: "std.boiler_supervisor.v1",
        title: "Boiler Supervisor v1",
        origin: "std_library",
        preset_count: 1,
        template_count: 2,
        presets: ["default_supervision"],
        templates: ["run_hours_service_preset", "maintenance_service_saved"],
        boundary_notes: [
          "Unsupported package supervision is surfaced explicitly and does not create fallback execution semantics."
        ]
      },
      members: [],
      effective_objects: [],
      package_supervision: {
        snapshot_state: "unsupported_by_target",
        summary_outputs: [],
        aggregate_monitors: [],
        aggregate_alarms: [],
        trace_groups: [],
        operation_proxies: [],
        child_summary_cards: []
      }
    },
    {
      id: "package-overview-pump-skid-supervisor-pilot",
      title: "PumpSkidSupervisor v1",
      description: "First pilot-track package overview. Package shape stays authoring-first here; deploy/apply/readback closes on the commissioning surface.",
      package_instance_id: "pump_skid_supervisor_1",
      package_definition: {
        package_id: "std.pump_skid_supervisor.v1",
        title: "PumpSkidSupervisor v1",
        origin: "project",
        preset_count: 3,
        template_count: 3,
        presets: ["single_pump_basic", "single_pump_with_run_hours", "duty_standby_basic"],
        templates: ["run_hours_pilot_template", "maintenance_pilot_template", "pressure_high_alarm_template"],
        boundary_notes: [
          "Pilot package remains an authoring-layer assembly. Runtime pack and target artifact stay package-neutral after flattening.",
          "This slice is bounded to PumpSkidSupervisor v1 MVP acceptance and does not open a new generic package runtime layer.",
          "Deploy/apply/readback baseline is surfaced separately on the commissioning surface."
        ]
      },
      members: [
        { id: "pump_group_1", title: "Pump Group", role: "package_state", type_title: "Pump Group", type_ref: "project:pump_group", template_ref: "", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__pump_group_1", boundary_note: "Bounded package state helper for pilot mode summaries only.", related_surfaces: [] },
        { id: "pump_cmd_1", title: "Pump Command Output", role: "actuator", type_title: "Digital Output v1", type_ref: "std:digital_output_v1", template_ref: "", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__pump_cmd_1", boundary_note: "Physical actuation binding remains on the flattened effective object.", related_surfaces: [] },
        { id: "run_feedback_1", title: "Run Feedback", role: "feedback", type_title: "Digital Input v1", type_ref: "std:digital_input_v1", template_ref: "", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__run_feedback_1", boundary_note: "Acquisition remains a child object concern and is only rolled up at package level.", related_surfaces: [] },
        { id: "fault_feedback_1", title: "Fault Feedback", role: "fault_feedback", type_title: "Digital Input v1", type_ref: "std:digital_input_v1", template_ref: "", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__fault_feedback_1", boundary_note: "Fault visibility remains on the child object and is summarized upward.", related_surfaces: [] },
        { id: "pressure_pv_1", title: "Pressure PV", role: "process_value", type_title: "Analog Input v1", type_ref: "std:analog_input_v1", template_ref: "", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__pressure_pv_1", boundary_note: "Analog acquisition remains on the effective object layer.", related_surfaces: [] },
        { id: "run_hours_1", title: "Run Hours Counter", role: "usage_accumulator", type_title: "RunHoursCounter v1", type_ref: "std:run_hours_counter_v1", template_ref: "run_hours_pilot_template", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__run_hours_1", boundary_note: "Run hours flatten into an ordinary runtime object and feed downstream usage_total_in.", related_surfaces: [{ title: "RunHoursCounter + reset_counter", section: "Operations Overview", fixture_id: "operations-readonly-runhours" }] },
        { id: "maintenance_counter_1", title: "Maintenance Counter", role: "service_monitor", type_title: "MaintenanceCounter v1", type_ref: "std:maintenance_counter_v1", template_ref: "maintenance_pilot_template", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__maintenance_counter_1", boundary_note: "Maintenance counter remains downstream-only and consumes accumulated usage from run hours.", related_surfaces: [{ title: "MaintenanceCounter + service operations", section: "Operations Overview", fixture_id: "operations-readonly-maintenance" }] },
        { id: "pressure_monitor_1", title: "Pressure High Monitor", role: "monitor", type_title: "ThresholdMonitor v1", type_ref: "std:threshold_monitor_v1", template_ref: "pressure_high_alarm_template", preset_ref: "single_pump_with_run_hours", effective_object_id: "pump_skid_supervisor_1__pressure_monitor_1", boundary_note: "Threshold monitor remains downstream over normalized pressure value.", related_surfaces: [] }
      ],
      effective_objects: [
        { id: "pump_skid_supervisor_1__pump_group_1", title: "Pump Group", type_title: "Pump Group", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_1__pump_cmd_1", title: "Pump Command Output", type_title: "Digital Output v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_1__run_feedback_1", title: "Run Feedback", type_title: "Digital Input v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_1__fault_feedback_1", title: "Fault Feedback", type_title: "Digital Input v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_1__pressure_pv_1", title: "Pressure PV", type_title: "Analog Input v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_1__run_hours_1", title: "Run Hours Counter", type_title: "RunHoursCounter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_1__maintenance_counter_1", title: "Maintenance Counter", type_title: "MaintenanceCounter v1", execution_boundary: "ordinary_runtime_object", package_neutral: true },
        { id: "pump_skid_supervisor_1__pressure_monitor_1", title: "Pressure High Monitor", type_title: "ThresholdMonitor v1", execution_boundary: "ordinary_runtime_object", package_neutral: true }
      ],
      package_supervision: {
        snapshot_state: "healthy",
        summary_outputs: [
          { id: "package_ready", title: "Package Ready", value: "true", semantic_state: "healthy" },
          { id: "package_running", title: "Package Running", value: "true", semantic_state: "running" },
          { id: "package_faulted", title: "Package Faulted", value: "false", semantic_state: "healthy" },
          { id: "pressure_value", title: "Pressure Value", value: "3.4 bar", semantic_state: "informational" },
          { id: "runtime_total", title: "Runtime Total", value: "148.6 h", semantic_state: "informational" }
        ],
        aggregate_monitors: [
          { id: "package_health", title: "Package Health", state: "healthy", severity: "info", summary: "Run, pressure, and readiness signals are healthy on the pilot baseline." }
        ],
        aggregate_alarms: [
          { id: "package_alarm_rollup", title: "Package Alarm Rollup", state: "healthy", severity: "info", summary: "No pressure or fault alarm is active on the pilot baseline." }
        ],
        trace_groups: [
          { id: "process_trace", title: "Process Trace", signal_count: 3, summary: "pressure_value, runtime_total, remaining_out" },
          { id: "status_trace", title: "Status Trace", signal_count: 3, summary: "package_ready, package_running, package_faulted" }
        ],
        operation_proxies: [
          { id: "reset_runtime_counter", title: "Reset Runtime Counter", state: "available", summary: "Child reset counter lane is available." },
          { id: "reset_maintenance_interval", title: "Reset Maintenance Interval", state: "available", summary: "Child maintenance reset lane is available." }
        ],
        child_summary_cards: [
          { id: "pump_group_state", member_id: "pump_group_1", title: "Pump Group", state: "healthy", summary: "Automatic group state is online." },
          { id: "pressure_monitor_state", member_id: "pressure_monitor_1", title: "Pressure Monitor", state: "healthy", summary: "Pressure high monitor is clear." },
          { id: "maintenance_state", member_id: "maintenance_counter_1", title: "Maintenance Counter", state: "healthy", summary: "Maintenance window is not yet due." }
        ]
      },
      package_mode_phase: {
        snapshot_state: "mode_phase_available",
        active_mode: { id: "auto", title: "Auto" },
        active_phase: { id: "running", title: "Running" },
        mode_summary_entries: [
          { id: "off_summary", title: "Off", semantic_state: "informational", summary: "Package parked." },
          { id: "auto_summary", title: "Auto", semantic_state: "healthy", summary: "Automatic lane is active." },
          { id: "manual_summary", title: "Manual", semantic_state: "informational", summary: "Manual lane is available but inactive." }
        ],
        phase_summary_entries: [
          { id: "idle_summary", title: "Idle", semantic_state: "informational", summary: "No circulation." },
          { id: "ready_summary", title: "Ready", semantic_state: "healthy", summary: "Start conditions are satisfied." },
          { id: "running_summary", title: "Running", semantic_state: "running", summary: "Pump skid is circulating." }
        ],
        mode_groups: [
          { id: "availability_modes", title: "Availability Modes", member_count: 2, summary: "Off and auto availability grouping." },
          { id: "commissioning_modes", title: "Commissioning Modes", member_count: 1, summary: "Manual service lane grouping." }
        ],
        phase_groups: [
          { id: "standby_phases", title: "Standby Phases", member_count: 2, summary: "Idle and ready phases." },
          { id: "active_phases", title: "Active Phases", member_count: 1, summary: "Running phase." }
        ],
        trace_groups: [
          { id: "mode_phase_trace", title: "Mode / Phase Trace", signal_count: 3, summary: "active_mode, active_phase, start_running" }
        ],
        transition_actions: [
          { id: "to_manual", title: "Request Manual Mode", intent: "request_mode_change", lifecycle_state: "pending", guard_state: "clear", summary: "Manual handover request is pending confirmation." },
          { id: "start_running", title: "Request Phase Start", intent: "request_phase_start", lifecycle_state: "completed", guard_state: "clear", summary: "Phase start already completed on the pilot baseline." },
          { id: "abort_running", title: "Request Phase Abort", intent: "request_phase_abort", lifecycle_state: "blocked", guard_state: "blocked", summary: "Abort remains blocked while the circulation lane is healthy." }
        ]
      }
    }
  ]);

  return {
    READONLY_PACKAGE_OVERVIEW_FIXTURES,
    READONLY_PACKAGE_FIXTURE_IDS: [
      "package-overview-boiler-skeleton",
      "package-overview-boiler-supervisor",
      "package-overview-boiler-supervisor-coordination",
      "package-overview-boiler-supervisor-modes",
      "package-overview-pump-skid-supervisor-modes",
      "package-overview-boiler-supervisor-modes-execution",
      "package-overview-pump-skid-supervisor-modes-execution",
      "package-overview-boiler-supervisor-interlocks",
      "package-overview-pump-skid-supervisor-interlocks",
      "package-overview-boiler-supervisor-protection",
      "package-overview-pump-skid-supervisor-protection",
      "package-overview-boiler-supervisor-protection-no-snapshot",
      "package-overview-pump-skid-supervisor-protection-unsupported",
      "package-overview-boiler-supervisor-interlocks-no-snapshot",
      "package-overview-pump-skid-supervisor-interlocks-unsupported",
      "package-overview-boiler-supervisor-modes-no-snapshot",
      "package-overview-pump-skid-supervisor-modes-unsupported",
      "package-overview-boiler-supervisor-arbitration",
      "package-overview-pump-skid-supervisor-arbitration",
      "package-overview-boiler-supervisor-overrides",
      "package-overview-pump-skid-supervisor-overrides",
      "package-overview-boiler-supervisor-no-snapshot",
      "package-overview-boiler-supervisor-unsupported",
      "package-overview-pump-skid-supervisor-pilot"
    ]
  };
});
