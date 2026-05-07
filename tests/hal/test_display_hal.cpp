#include <iostream>
#include <string>

#include "hal/display_hal.hpp"

using controller::hal::DisplayConfig;
using controller::hal::HalErrorCode;
using controller::hal::MockDisplayHal;

namespace {

int failures = 0;

void expect_true(bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

}  // namespace

int main() {
  MockDisplayHal display_hal(DisplayConfig{2U, 8U, false});

  expect_true(display_hal.initialize().ok(), "display HAL should initialize");
  expect_true(display_hal.write_line(0U, "HELLOWORLD").ok(), "write_line should succeed for valid index");
  const auto line_0 = display_hal.read_line(0U);
  expect_true(line_0.ok() && line_0.value.value() == "HELLOWOR", "mock display should expose buffered line contents");

  expect_true(display_hal.clear().ok(), "clear should succeed");
  const auto cleared_line = display_hal.read_line(0U);
  expect_true(cleared_line.ok() && cleared_line.value.value().empty(), "clear should blank buffered lines");

  const auto invalid_line = display_hal.read_line(3U);
  expect_true(
      !invalid_line.ok() && invalid_line.status.code == HalErrorCode::invalid_range,
      "out-of-range line should return HAL_INVALID_RANGE");

  expect_true(display_hal.set_backlight(true).ok(), "set_backlight should succeed");
  const auto backlight = display_hal.get_backlight_enabled();
  expect_true(backlight.ok() && backlight.value.value(), "backlight state should round-trip consistently");
  expect_true(display_hal.line_count() == 2U, "line_count capability should reflect configured line count");
  expect_true(
      display_hal.line_width().has_value() && display_hal.line_width().value() == 8U,
      "line_width capability should reflect configured width");

  if (failures != 0) {
    std::cerr << "test_display_hal failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_display_hal passed\n";
  return 0;
}
