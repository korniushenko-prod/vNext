import { strict as assert } from "node:assert";
import test from "node:test";

import type { RuntimePack } from "@universal-plc/runtime-pack-schema";

import esp32C3HardwareArtifactSnapshot from "./fixtures/esp32-c3-hardware-resolution.shipcontroller-artifact.json" with { type: "json" };
import lilygoHardwareArtifactSnapshot from "./fixtures/lilygo-hardware-resolution.shipcontroller-artifact.json" with { type: "json" };
import {
  esp32C3HardwareResolutionRuntimePack,
  lilygoHardwareResolutionRuntimePack
} from "./hardware-fixtures.js";

import {
  checkEsp32Compatibility,
  emitShipControllerConfigArtifact,
  esp32CapabilityProfile
} from "../src/index.js";

test("capability profile exposes frozen hardware preset support", () => {
  assert.deepEqual(esp32CapabilityProfile.hardware_preset_support, {
    enabled: true,
    supported_target_presets: [
      "lilygo_t3_v1_6_1_oled_lora_builtin_led",
      "esp32_c3_super_mini_minimal"
    ],
    supported_board_templates: [
      "lilygo_t3_v1_6_1",
      "esp32_c3_super_mini"
    ],
    supported_chip_templates: [
      "esp32_pico_d4",
      "esp32_c3"
    ]
  });
});

test("LilyGO hardware runtime pack passes compatibility and emits deterministic hardware artifact", () => {
  const compatibility = checkEsp32Compatibility(structuredClone(lilygoHardwareResolutionRuntimePack) as RuntimePack);
  const artifact = emitShipControllerConfigArtifact(structuredClone(lilygoHardwareResolutionRuntimePack) as RuntimePack);

  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);
  assert.equal(artifact.artifacts.hardware?.target_preset_ref, "lilygo_t3_v1_6_1_oled_lora_builtin_led");
  assert.equal(artifact.artifacts.hardware?.board_template_ref, "lilygo_t3_v1_6_1");
  assert.equal(artifact.artifacts.hardware?.chip_template_ref, "esp32_pico_d4");
  assert.equal(artifact.artifacts.hardware?.resources.length, 3);
  assert.equal(canonicalStringify(artifact), canonicalStringify(lilygoHardwareArtifactSnapshot));
});

test("ESP32-C3 hardware runtime pack passes compatibility and emits deterministic hardware artifact", () => {
  const compatibility = checkEsp32Compatibility(structuredClone(esp32C3HardwareResolutionRuntimePack) as RuntimePack);
  const artifact = emitShipControllerConfigArtifact(structuredClone(esp32C3HardwareResolutionRuntimePack) as RuntimePack);

  assert.equal(compatibility.ok, true);
  assert.deepEqual(compatibility.diagnostics, []);
  assert.equal(artifact.artifacts.hardware?.target_preset_ref, "esp32_c3_super_mini_minimal");
  assert.equal(artifact.artifacts.hardware?.board_template_ref, "esp32_c3_super_mini");
  assert.equal(artifact.artifacts.hardware?.chip_template_ref, "esp32_c3");
  assert.equal(artifact.artifacts.hardware?.resources.length, 2);
  assert.equal(canonicalStringify(artifact), canonicalStringify(esp32C3HardwareArtifactSnapshot));
});

test("forbidden resolved hardware pin produces canonical compatibility diagnostic", () => {
  const mutated = structuredClone(lilygoHardwareResolutionRuntimePack) as RuntimePack & Record<string, any>;
  mutated.hardware_resolution.diagnostics = [
    {
      code: "hardware_resolution.pin.forbidden",
      severity: "error",
      message: "Hardware binding `hw_builtin_led` uses forbidden GPIO 16.",
      binding_id: "hw_builtin_led",
      gpio: 16
    }
  ];

  const compatibility = checkEsp32Compatibility(mutated as RuntimePack);

  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "hardware_resolution.pin.forbidden"));
});

test("reserved bus collision produces canonical compatibility diagnostic", () => {
  const mutated = structuredClone(lilygoHardwareResolutionRuntimePack) as RuntimePack & Record<string, any>;
  mutated.hardware_resolution.diagnostics = [
    {
      code: "hardware_resolution.pin.reserved_conflict",
      severity: "error",
      message: "Hardware binding `hw_bad_out_1` collides with reserved pin `i2c_sda` on GPIO 21.",
      binding_id: "hw_bad_out_1",
      gpio: 21
    }
  ];

  const compatibility = checkEsp32Compatibility(mutated as RuntimePack);

  assert.equal(compatibility.ok, false);
  assert.ok(compatibility.diagnostics.some((entry) => entry.code === "hardware_resolution.pin.reserved_conflict"));
});

function canonicalStringify(value: unknown): string {
  return JSON.stringify(sortDeep(value), null, 2);
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => sortDeep(entry));
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, sortDeep(entry)])
    );
  }

  return value;
}
