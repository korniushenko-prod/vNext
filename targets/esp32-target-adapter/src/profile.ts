import { RUNTIME_PACK_SCHEMA_VERSION, type RuntimeBindingKind } from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterManifest } from "@universal-plc/target-adapter-contracts";
import type { Esp32CapabilityProfile } from "./types.js";

const SUPPORTED_BINDING_KINDS: RuntimeBindingKind[] = ["digital_in", "digital_out", "analog_in", "analog_out", "service"];
const SUPPORTED_CHANNEL_KINDS = ["signal", "command", "state", "event", "alarm", "telemetry"];
const SUPPORTED_VALUE_TYPES = ["bool", "int", "float", "duration", "string", "u32"];
const SUPPORTED_NATIVE_KINDS = [
  "std.digital_input.v1",
  "std.analog_input.v1",
  "std.digital_output.v1",
  "std.timed_relay.v1",
  "std.pulse_flowmeter.v1"
];
const SUPPORTED_OPERATION_KINDS = ["offline_validate", "offline_plan", "reset_totalizer", "reset", "test_pulse"];

export const esp32CapabilityProfile: Esp32CapabilityProfile = {
  target_id: "esp32.shipcontroller.v1",
  display_name: "ESP32 ShipController Offline Adapter",
  supported_binding_kinds: SUPPORTED_BINDING_KINDS,
  supported_channel_kinds: SUPPORTED_CHANNEL_KINDS,
  supported_value_types: SUPPORTED_VALUE_TYPES,
  supported_native_kinds: SUPPORTED_NATIVE_KINDS,
  supported_operation_kinds: SUPPORTED_OPERATION_KINDS,
  supports_trace: true,
  supports_operations: true,
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
