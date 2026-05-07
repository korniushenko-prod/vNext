#include <iostream>
#include <string>

#include "hal/digital_input_hal.hpp"

using controller::hal::DigitalInputChannelConfig;
using controller::hal::HalErrorCode;
using controller::hal::InputPolarity;
using controller::hal::MockDigitalInputHal;

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
  MockDigitalInputHal input_hal({
      DigitalInputChannelConfig{"di_1", InputPolarity::active_high, 50U, false},
      DigitalInputChannelConfig{"di_2", InputPolarity::active_low, 0U, true},
  });

  expect_true(input_hal.initialize().ok(), "digital input HAL should initialize");

  const auto raw_read = input_hal.read_raw("di_1");
  expect_true(raw_read.ok() && !raw_read.value.value(), "raw read should reflect injected physical state");

  expect_true(input_hal.set_mock_raw_state("di_1", true, 10U).ok(), "raw state injection should succeed");
  const auto before_debounce = input_hal.read_debounced("di_1", 10U);
  const auto still_before_debounce = input_hal.read_debounced("di_1", 59U);
  const auto after_debounce = input_hal.read_debounced("di_1", 60U);
  expect_true(before_debounce.ok() && !before_debounce.value.value(), "debounced state should not change immediately");
  expect_true(still_before_debounce.ok() && !still_before_debounce.value.value(), "debounced state should remain old value before debounce expires");
  expect_true(after_debounce.ok() && after_debounce.value.value(), "debounced state should change after debounce interval");

  const auto active_low_read = input_hal.read_debounced("di_2", 0U);
  expect_true(active_low_read.ok() && !active_low_read.value.value(), "active low input should invert raw state into logical state");

  const auto unknown_input = input_hal.read_raw("missing");
  expect_true(
      !unknown_input.ok() && unknown_input.status.code == HalErrorCode::unknown_id,
      "unknown digital input id should return HAL_UNKNOWN_ID");

  if (failures != 0) {
    std::cerr << "test_digital_input_hal failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_digital_input_hal passed\n";
  return 0;
}
