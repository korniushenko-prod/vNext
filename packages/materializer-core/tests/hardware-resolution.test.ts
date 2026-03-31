import { strict as assert } from "node:assert";
import test from "node:test";

import type { ProjectModel } from "@universal-plc/project-schema";
import { validateRuntimePack } from "@universal-plc/runtime-pack-schema";

import esp32C3HardwareResolutionProject from "./fixtures/esp32-c3-hardware-resolution.project.json" with { type: "json" };
import esp32C3HardwareResolutionRuntimeSnapshot from "./fixtures/esp32-c3-hardware-resolution.runtime-pack.snapshot.json" with { type: "json" };
import invalidHardwareMissingResourceMappingProject from "./fixtures/invalid-hardware-missing-resource-mapping.project.json" with { type: "json" };
import invalidHardwareReservedPinConflictProject from "./fixtures/invalid-hardware-reserved-pin-conflict.project.json" with { type: "json" };
import lilygoHardwareResolutionProject from "./fixtures/lilygo-hardware-resolution.project.json" with { type: "json" };
import lilygoHardwareResolutionRuntimeSnapshot from "./fixtures/lilygo-hardware-resolution.runtime-pack.snapshot.json" with { type: "json" };

import type { RuntimePackWithHardwareResolution } from "../src/index.js";
import { materializeProject } from "../src/index.js";

test("LilyGO hardware manifest resolves into target-neutral hardware data", () => {
  const result = materializeProject(structuredClone(lilygoHardwareResolutionProject) as ProjectModel, {
    pack_id: "lilygo-hardware-resolution-pack",
    generated_at: "2026-03-31T10:00:00Z"
  });
  const runtimePack = result.pack as RuntimePackWithHardwareResolution;

  assert.equal(result.ok, true);
  assert.equal(validateRuntimePack(result.pack).ok, true);
  assert.equal(runtimePack.hardware_resolution?.target_preset_ref, "lilygo_t3_v1_6_1_oled_lora_builtin_led");
  assert.deepEqual(runtimePack.hardware_resolution?.reserved_pins, {
    i2c_sda: 21,
    i2c_scl: 22
  });
  assert.ok(runtimePack.hardware_resolution?.forbidden_pins.includes(16));
  assert.equal((((runtimePack.resources.hw_builtin_led.config as Record<string, unknown>).resolved_hardware) as Record<string, unknown>).resource_id, "builtin_led");
  assert.equal((((runtimePack.resources.hw_analog_in_1.config as Record<string, unknown>).resolved_hardware) as Record<string, unknown>).resource_id, "analog_in_1");
  assert.equal(
    canonicalStringify(runtimePack),
    canonicalStringify(lilygoHardwareResolutionRuntimeSnapshot)
  );
});

test("ESP32-C3 hardware manifest resolves into target-neutral hardware data", () => {
  const result = materializeProject(structuredClone(esp32C3HardwareResolutionProject) as ProjectModel, {
    pack_id: "esp32-c3-hardware-resolution-pack",
    generated_at: "2026-03-31T10:05:00Z"
  });
  const runtimePack = result.pack as RuntimePackWithHardwareResolution;

  assert.equal(result.ok, true);
  assert.equal(validateRuntimePack(result.pack).ok, true);
  assert.equal(runtimePack.hardware_resolution?.target_preset_ref, "esp32_c3_super_mini_minimal");
  assert.deepEqual(runtimePack.hardware_resolution?.reserved_pins, {
    usb_dp: 20,
    usb_dm: 21
  });
  assert.equal((((runtimePack.resources.hw_builtin_led.config as Record<string, unknown>).resolved_hardware) as Record<string, unknown>).resource_id, "builtin_led");
  assert.equal((((runtimePack.resources.hw_digital_in_1.config as Record<string, unknown>).resolved_hardware) as Record<string, unknown>).resource_id, "digital_in_1");
  assert.equal(
    canonicalStringify(runtimePack),
    canonicalStringify(esp32C3HardwareResolutionRuntimeSnapshot)
  );
});

test("reserved preset pins produce a canonical materializer diagnostic", () => {
  const result = materializeProject(structuredClone(invalidHardwareReservedPinConflictProject) as ProjectModel, {
    pack_id: "invalid-hardware-reserved-pin-conflict-pack",
    generated_at: "2026-03-31T10:10:00Z"
  });
  const runtimePack = result.pack as RuntimePackWithHardwareResolution;

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "hardware_resolution.pin.reserved_conflict"));
  assert.ok(runtimePack.hardware_resolution?.diagnostics.some((entry) => entry.code === "hardware_resolution.pin.reserved_conflict"));
});

test("bindings without a resolved preset resource produce a canonical materializer diagnostic", () => {
  const result = materializeProject(structuredClone(invalidHardwareMissingResourceMappingProject) as ProjectModel, {
    pack_id: "invalid-hardware-missing-resource-mapping-pack",
    generated_at: "2026-03-31T10:15:00Z"
  });
  const runtimePack = result.pack as RuntimePackWithHardwareResolution;

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => entry.code === "hardware_resolution.resource_mapping.unresolved"));
  assert.ok(runtimePack.hardware_resolution?.diagnostics.some((entry) => entry.code === "hardware_resolution.resource_mapping.unresolved"));
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
