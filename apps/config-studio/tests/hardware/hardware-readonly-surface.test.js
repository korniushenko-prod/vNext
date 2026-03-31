const test = require("node:test");
const assert = require("node:assert/strict");

const {
  READONLY_HARDWARE_FIXTURE_IDS,
  READONLY_HARDWARE_FIXTURES
} = require("../../src/hardware/fixtures/hardware-surface-fixtures");
const {
  createReadonlyHardwareSurfaceViewModel,
  renderReadonlyHardwareResourceMarkup,
  renderReadonlyHardwareDetailsMarkup
} = require("../../src/hardware/ui/hardware-readonly-surface");

function fixtureById(id) {
  return READONLY_HARDWARE_FIXTURES.find((entry) => entry.id === id);
}

test("hardware readonly fixtures expose the canonical preset lane set", () => {
  assert.deepEqual(READONLY_HARDWARE_FIXTURE_IDS, [
    "hardware-readonly-lilygo",
    "hardware-readonly-esp32-c3",
    "hardware-readonly-invalid"
  ]);
});

test("readonly hardware view model summarizes the LilyGO preset lane", () => {
  const surface = createReadonlyHardwareSurfaceViewModel({
    fixture: fixtureById("hardware-readonly-lilygo"),
    selectedResourceId: "analog_in_1"
  });

  assert.equal(surface.target_preset_ref, "lilygo_t3_v1_6_1_oled_lora_builtin_led");
  assert.equal(surface.board_template_ref, "lilygo_t3_v1_6_1");
  assert.equal(surface.chip_template_ref, "esp32_pico_d4");
  assert.equal(surface.selected_resource.id, "analog_in_1");
  assert.equal(surface.summary.resource_count, 3);
  assert.equal(surface.summary.reserved_pin_count, 2);
  assert.equal(surface.summary.diagnostic_count, 0);
  assert.match(surface.boundary_notes[0], /read-only hardware view only/i);
});

test("readonly hardware markup renders resource and target details canonically", () => {
  const surface = createReadonlyHardwareSurfaceViewModel({
    fixture: fixtureById("hardware-readonly-esp32-c3"),
    selectedResourceId: "digital_out_1"
  });

  const cardMarkup = renderReadonlyHardwareResourceMarkup(surface.selected_resource);
  const detailsMarkup = renderReadonlyHardwareDetailsMarkup(surface);

  assert.match(cardMarkup, /Digital Output 1/);
  assert.match(cardMarkup, /GPIO 10/);
  assert.match(cardMarkup, /6, 7, 10/);
  assert.match(detailsMarkup, /esp32_c3_super_mini_minimal/);
  assert.match(detailsMarkup, /Reserved Pins/);
  assert.match(detailsMarkup, /usb_dp/);
  assert.match(detailsMarkup, /Boundary Notes/);
});

test("invalid readonly hardware fixture surfaces manifest diagnostics without edit actions", () => {
  const surface = createReadonlyHardwareSurfaceViewModel({
    fixture: fixtureById("hardware-readonly-invalid"),
    selectedResourceId: "builtin_led"
  });

  const detailsMarkup = renderReadonlyHardwareDetailsMarkup(surface);

  assert.equal(surface.summary.diagnostic_count, 2);
  assert.match(detailsMarkup, /hardware_resolution\.pin\.forbidden/);
  assert.match(detailsMarkup, /hardware_resolution\.pin\.reserved_conflict/);
  assert.doesNotMatch(detailsMarkup, /Save Manifest|Load Demo|Reset Preset Defaults/i);
});
