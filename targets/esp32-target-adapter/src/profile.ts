import { RUNTIME_PACK_SCHEMA_VERSION, type RuntimeBindingKind } from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterManifest } from "@universal-plc/target-adapter-contracts";
import { esp32OperationSupportProfile } from "./operations.js";
import type { Esp32CapabilityProfile } from "./types.js";

const SUPPORTED_BINDING_KINDS: RuntimeBindingKind[] = ["digital_in", "digital_out", "analog_in", "analog_out", "service", "bus"];
const SUPPORTED_CHANNEL_KINDS = ["signal", "command", "state", "event", "alarm", "telemetry"];
const SUPPORTED_VALUE_TYPES = ["bool", "int", "float", "duration", "string", "u32"];
const SUPPORTED_NATIVE_KINDS = [
  "std.digital_input.v1",
  "std.analog_input.v1",
  "std.digital_output.v1",
  "std.timed_relay.v1",
  "std.pulse_flowmeter.v1",
  "std.pid_controller.v1",
  "std.run_hours_counter.v1",
  "std.event_counter.v1",
  "std.threshold_monitor.v1",
  "std.maintenance_counter.v1",
  "std.comm_bridge.v1",
  "std.remote_point_frontend.v1"
];
const SUPPORTED_OPERATION_KINDS = [
  "offline_validate",
  "offline_plan",
  "reset_totalizer",
  "reset",
  "test_pulse",
  "reset_integral",
  "hold",
  "release",
  "autotune",
  "pid_autotune",
  "reset_counter",
  "reset_hours",
  "reset_latch",
  "acknowledge_due",
  "reset_interval",
  "reset_maintenance",
  "start_supervision",
  "stop_supervision",
  "acknowledge_faults",
  "reset_package_counters",
  "pid_autotune_proxy"
];
const SUPPORTED_HARDWARE_PRESETS = [
  "lilygo_t3_v1_6_1_oled_lora_builtin_led",
  "esp32_c3_super_mini_minimal"
];
const SUPPORTED_HARDWARE_BOARDS = [
  "lilygo_t3_v1_6_1",
  "esp32_c3_super_mini"
];
const SUPPORTED_HARDWARE_CHIPS = [
  "esp32_pico_d4",
  "esp32_c3"
];

export const esp32CapabilityProfile: Esp32CapabilityProfile = {
  target_id: "esp32.shipcontroller.v1",
  display_name: "ESP32 ShipController Offline Adapter",
  supported_binding_kinds: SUPPORTED_BINDING_KINDS,
  supported_channel_kinds: SUPPORTED_CHANNEL_KINDS,
  supported_value_types: SUPPORTED_VALUE_TYPES,
  supported_native_kinds: SUPPORTED_NATIVE_KINDS,
  supported_operation_kinds: SUPPORTED_OPERATION_KINDS,
  hardware_preset_support: {
    enabled: true,
    supported_target_presets: SUPPORTED_HARDWARE_PRESETS,
    supported_board_templates: SUPPORTED_HARDWARE_BOARDS,
    supported_chip_templates: SUPPORTED_HARDWARE_CHIPS
  },
  supports_trace: true,
  supports_operations: true,
  operations_support: esp32OperationSupportProfile,
  package_supervision_support: {
    enabled: true,
    summary_outputs: true,
    aggregate_monitors: true,
    aggregate_alarms: true,
    trace_groups: true,
    operation_proxies: true
  },
  package_coordination_support: {
    enabled: true,
    package_state: true,
    summary_outputs: true,
    aggregate_monitors: true,
    trace_groups: true,
    operation_proxies: true
  },
  package_mode_phase_support: {
    enabled: true,
    modes: true,
    phases: true,
    mode_summary: true,
    phase_summary: true,
    groups: true,
    trace_groups: true,
    active_refs: true,
    package_mode_execution: true,
    phase_transition_execution: true,
    transition_guard_diagnostics: true
  },
  package_permissive_interlock_support: {
    enabled: true,
    gate_summary: true,
    reason_codes: true,
    diagnostics_refs: true,
    transition_guards: true
  },
  package_protection_recovery_support: {
    enabled: true,
    protection_summary: true,
    reason_codes: true,
    diagnostics_refs: true,
    recovery_requests: true
  },
  package_arbitration_support: {
    enabled: true,
    ownership_lanes: true,
    command_summary: true,
    reason_codes: true,
    request_preview: true,
    supported_ownership_lanes: ["auto", "manual", "service", "remote"],
    supported_request_kinds: [
      "request_start",
      "request_stop",
      "request_reset",
      "request_enable",
      "request_disable"
    ]
  },
  package_override_handover_support: {
    enabled: true,
    holder_visibility: true,
    request_visibility: true,
    reason_codes: true,
    last_handover_reason: true,
    supported_holder_lanes: ["auto", "manual", "service", "remote"],
    supported_request_kinds: [
      "request_takeover",
      "request_release",
      "request_return_to_auto"
    ],
    supported_denial_reasons: [
      "blocked_by_policy",
      "held_by_other_owner",
      "not_available"
    ]
  },
  supports_persistence: true,
  supports_simulation: false,
  supported_pulse_source_modes: ["hall_pulse", "analog_threshold_pulse", "remote_pulse"],
  pulse_source_constraints: [
    {
      mode: "hall_pulse",
      required_binding_kind: "digital_in",
      required_value_types: ["bool"]
    },
    {
      mode: "analog_threshold_pulse",
      required_binding_kind: "analog_in",
      required_value_types: ["float", "int"]
    },
    {
      mode: "remote_pulse",
      required_binding_kind: "service",
      required_value_types: ["u32", "bool", "int"]
    }
  ],
  limits: {
    max_instances: 512,
    max_connections: 2048,
    max_resources: 1024
  }
};

export const esp32TargetAdapterManifest: TargetAdapterManifest = {
  id: "esp32-target-adapter",
  kind: "target_adapter",
  contract_version: "0.1.0",
  display_name: "ESP32 ShipController Offline Adapter",
  target_family: "esp32.shipcontroller.v1",
  runtime_pack_schema_version: RUNTIME_PACK_SCHEMA_VERSION,
  capabilities: ["validate", "diagnostics", "apply", "readback"],
  artifact_kinds: ["config", "report"]
};
