#include <iostream>
#include <string>

#include "hal/pulse_input_hal.hpp"

using controller::hal::HalErrorCode;
using controller::hal::MockPulseInputHal;
using controller::hal::PulseInputChannelConfig;

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
  MockPulseInputHal input_hal({
      PulseInputChannelConfig{"pulse_1", 0U, 0.0, true},
  });

  expect_true(input_hal.initialize().ok(), "pulse input HAL should initialize");
  expect_true(input_hal.increment_mock_count("pulse_1", 5U).ok(), "count increment should succeed");
  expect_true(input_hal.set_mock_frequency_hz("pulse_1", 12.5).ok(), "frequency injection should succeed");

  const auto count = input_hal.get_count("pulse_1");
  const auto frequency = input_hal.get_frequency_hz("pulse_1");
  expect_true(count.ok() && count.value.value() == 5U, "pulse count should reflect deterministic increments");
  expect_true(frequency.ok() && frequency.value.value() == 12.5, "frequency placeholder should expose injected value");

  expect_true(input_hal.reset_count("pulse_1").ok(), "reset_count should work in mock scope");
  const auto reset_count = input_hal.get_count("pulse_1");
  expect_true(reset_count.ok() && reset_count.value.value() == 0U, "count should be zero after reset");

  const auto unknown_input = input_hal.get_count("missing");
  expect_true(
      !unknown_input.ok() && unknown_input.status.code == HalErrorCode::unknown_id,
      "unknown pulse input id should return HAL_UNKNOWN_ID");

  if (failures != 0) {
    std::cerr << "test_pulse_input_hal failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pulse_input_hal passed\n";
  return 0;
}
