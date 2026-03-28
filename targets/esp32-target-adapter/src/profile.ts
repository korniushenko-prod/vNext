import { RUNTIME_PACK_SCHEMA_VERSION, type RuntimeBindingKind } from "@universal-plc/runtime-pack-schema";
import type { TargetAdapterManifest } from "@universal-plc/target-adapter-contracts";
import type { Esp32CapabilityProfile } from "./types.js";

const SUPPORTED_BINDING_KINDS: RuntimeBindingKind[] = ["digital_in", "digital_out", "analog_in", "analog_out", "service"];
const SUPPORTED_CHANNEL_KINDS = ["signal", "command", "state", "event", "alarm"];
const SUPPORTED_VALUE_TYPES = ["bool", "int", "float", "duration", "string"];
const SUPPORTED_OPERATION_KINDS = ["offline_validate", "offline_plan"];

export const esp32CapabilityProfile: Esp32CapabilityProfile = {
  target_id: "esp32-shipcontroller",
  display_name: "ESP32 ShipController Offline Adapter",
  supported_binding_kinds: SUPPORTED_BINDING_KINDS,
  supported_channel_kinds: SUPPORTED_CHANNEL_KINDS,
  supported_value_types: SUPPORTED_VALUE_TYPES,
  supported_operation_kinds: SUPPORTED_OPERATION_KINDS,
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