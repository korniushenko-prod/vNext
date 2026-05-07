#include <cmath>
#include <iostream>
#include <string>

#include "hal/analog_input_hal.hpp"

using controller::hal::AnalogInputChannelConfig;
using controller::hal::HalErrorCode;
using controller::hal::MockAnalogInputHal;

namespace {

int failures = 0;

void expect_true(bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

bool almost_equal(double lhs, double rhs) {
  return std::fabs(lhs - rhs) < 0.000001;
}

}  // namespace

int main() {
  MockAnalogInputHal input_hal({
      AnalogInputChannelConfig{"ai_1", {0, 1000, 0.0, 10.0}, false, 0},
  });

  expect_true(input_hal.initialize().ok(), "analog input HAL should initialize");
  expect_true(input_hal.set_mock_raw_value("ai_1", 500).ok(), "raw value injection should succeed");

  const auto raw_read = input_hal.read_raw("ai_1");
  const auto scaled_read = input_hal.read_scaled("ai_1");
  expect_true(raw_read.ok() && raw_read.value.value() == 500, "raw read should return injected value");
  expect_true(scaled_read.ok() && almost_equal(scaled_read.value.value(), 5.0), "scaled read should return deterministic engineering value");

  expect_true(input_hal.set_mock_raw_value("ai_1", 1200).ok(), "raw value should accept over-range input");
  const auto unclamped_read = input_hal.read_scaled("ai_1");
  expect_true(unclamped_read.ok() && almost_equal(unclamped_read.value.value(), 12.0), "scaled read should extrapolate while clamp is disabled");

  expect_true(input_hal.configure_clamp("ai_1", true).ok(), "clamp enable should succeed");
  const auto clamped_read = input_hal.read_scaled("ai_1");
  expect_true(clamped_read.ok() && almost_equal(clamped_read.value.value(), 10.0), "scaled read should clamp to engineering maximum when clamp is enabled");

  const auto invalid_scaling = input_hal.configure_scaling("ai_1", 10, 10, 0.0, 1.0);
  expect_true(
      !invalid_scaling.ok() && invalid_scaling.code == HalErrorCode::invalid_range,
      "invalid scaling should be rejected");

  const auto unknown_input = input_hal.read_raw("missing");
  expect_true(
      !unknown_input.ok() && unknown_input.status.code == HalErrorCode::unknown_id,
      "unknown analog input id should return HAL_UNKNOWN_ID");

  if (failures != 0) {
    std::cerr << "test_analog_input_hal failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_analog_input_hal passed\n";
  return 0;
}
