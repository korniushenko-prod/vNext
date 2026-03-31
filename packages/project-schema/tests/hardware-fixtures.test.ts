import { strict as assert } from "node:assert";
import test from "node:test";

import esp32C3MinimalHardwareManifestProject from "./fixtures/esp32_c3_minimal_hardware_manifest.project.json" with { type: "json" };
import invalidForbiddenPinOverrideProject from "./fixtures/hardware-invalid-forbidden-pin-override.project.json" with { type: "json" };
import invalidUnknownPresetProject from "./fixtures/hardware-invalid-unknown-preset.project.json" with { type: "json" };
import lilygoT3HardwareManifestProject from "./fixtures/lilygo_t3_hardware_manifest.project.json" with { type: "json" };
import { validateProjectModel } from "../src/index.js";

test("LilyGO T3 hardware manifest fixture stays structurally valid", () => {
  const result = validateProjectModel(lilygoT3HardwareManifestProject);

  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(lilygoT3HardwareManifestProject.hardware.manifest.target_preset_ref, "lilygo_t3_v1_6_1_oled_lora_builtin_led");
  assert.equal(lilygoT3HardwareManifestProject.hardware.catalog.presets.lilygo_t3_v1_6_1_oled_lora_builtin_led.board_template_ref, "lilygo_t3_v1_6_1");
});

test("ESP32-C3 minimal hardware manifest fixture stays structurally valid", () => {
  const result = validateProjectModel(esp32C3MinimalHardwareManifestProject);

  assert.equal(result.ok, true);
  assert.equal(result.diagnostics.length, 0);
  assert.equal(esp32C3MinimalHardwareManifestProject.hardware.manifest.target_preset_ref, "esp32_c3_super_mini_minimal");
  assert.equal(esp32C3MinimalHardwareManifestProject.hardware.catalog.presets.esp32_c3_super_mini_minimal.chip_template_ref, "esp32_c3");
});

test("invalid hardware fixture with unknown preset is rejected", () => {
  const result = validateProjectModel(invalidUnknownPresetProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "hardware.manifest.target_preset_ref.unresolved" &&
    entry.path === "$.hardware.manifest.target_preset_ref"
  )));
});

test("invalid hardware fixture with forbidden pin override is rejected", () => {
  const result = validateProjectModel(invalidForbiddenPinOverrideProject);

  assert.equal(result.ok, false);
  assert.ok(result.diagnostics.some((entry) => (
    entry.code === "hardware.manifest.resource_binding.gpio.forbidden" &&
    entry.path === "$.hardware.manifest.resource_bindings.general_output_1.gpio"
  )));
});
