import { RUNTIME_PACK_SCHEMA_VERSION } from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterManifest } from "@universal-plc/target-adapter-contracts";
import type { Esp32CapabilityProfile } from "./types.js";

export const esp32CapabilityProfile: Esp32CapabilityProfile = {
  target_id: "esp32-shipcontroller",
  display_name: "ESP32 ShipController Offline Adapter",
  supported_binding_kinds: ["digital_in", "digital_out", "analog_in", "analog_out", "service"],
  supported_channel_kinds: ["signal", "command", "state", "event", "alarm"],
  supported_value_types: ["bool", "int", "float", "duration", "string"],
  supports_trace: false,
  supports_simulation: false,
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
  target_family: "esp32-shipcontroller",
  runtime_pack_schema_version: RUNTIME_PACK_SCHEMA_VERSION,
  capabilities: ["validate", "diagnostics", "apply", "readback"],
  artifact_kinds: ["config", "report"]
};