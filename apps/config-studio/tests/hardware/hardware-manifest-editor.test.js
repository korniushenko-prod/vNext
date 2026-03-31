const test = require("node:test");
const assert = require("node:assert/strict");

const {
  HARDWARE_CATALOG_FIXTURE,
  EDITABLE_HARDWARE_PROJECT_FIXTURES
} = require("../../src/hardware/fixtures/hardware-surface-fixtures");
const {
  createEditableHardwareManifestViewModel,
  setHardwareTargetPreset,
  setHardwareResourceBindingGpio,
  saveHardwareManifest
} = require("../../src/hardware/ui/hardware-manifest-editor");

function fixtureById(id) {
  return EDITABLE_HARDWARE_PROJECT_FIXTURES.find((entry) => entry.id === id);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

test("editable hardware manifest surface exposes target preset selection", () => {
  const project = clone(fixtureById("hardware-editable-lilygo").model);
  const result = setHardwareTargetPreset(project, HARDWARE_CATALOG_FIXTURE, "esp32_c3_super_mini_minimal");

  assert.equal(result.selected_target_preset_ref, "esp32_c3_super_mini_minimal");
  assert.equal(result.resources.length, 3);
  assert.equal(result.resources[0].id, "builtin_led");
  assert.equal(result.board_template_ref, "esp32_c3_super_mini");
});

test("editable hardware manifest surface shows conflicts before save", () => {
  const project = clone(fixtureById("hardware-editable-lilygo").model);
  const conflict = setHardwareResourceBindingGpio(
    project,
    HARDWARE_CATALOG_FIXTURE,
    "general_output_1",
    25
  );

  assert.equal(conflict.ok, false);
  assert.ok(conflict.diagnostics.some((entry) => entry.code === "hardware.ui.gpio.conflict"));
  assert.equal(conflict.viewModel.selected_resource.id, "general_output_1");
  assert.equal(conflict.viewModel.selected_resource.status, "ready");
});

test("editable hardware manifest save succeeds for the canonical frozen defaults", () => {
  const project = clone(fixtureById("hardware-editable-esp32-c3").model);
  const saved = saveHardwareManifest(project, HARDWARE_CATALOG_FIXTURE);
  const viewModel = createEditableHardwareManifestViewModel({
    projectModel: saved.project,
    catalog: HARDWARE_CATALOG_FIXTURE,
    selectedResourceId: "digital_out_1"
  });

  assert.equal(saved.ok, true);
  assert.deepEqual(saved.diagnostics, []);
  assert.equal(viewModel.can_save, true);
  assert.equal(viewModel.summary.resource_count, 3);
  assert.equal(viewModel.selected_resource.gpio, 10);
});

test("forbidden pin selection is blocked before manifest save", () => {
  const project = clone(fixtureById("hardware-editable-lilygo").model);
  const blocked = setHardwareResourceBindingGpio(
    project,
    HARDWARE_CATALOG_FIXTURE,
    "general_output_1",
    16
  );

  assert.equal(blocked.ok, false);
  assert.ok(blocked.diagnostics.some((entry) => entry.code === "hardware.ui.pin.forbidden"));
  assert.equal(project.hardware.manifest.resource_bindings.general_output_1.gpio, 14);
});
