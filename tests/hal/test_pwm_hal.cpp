#include <cmath>
#include <iostream>
#include <string>

#include "hal/pwm_hal.hpp"

using controller::hal::HalErrorCode;
using controller::hal::MockPwmHal;
using controller::hal::PwmOutputChannelConfig;

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
  MockPwmHal pwm_hal({
      PwmOutputChannelConfig{"pwm_1", {10.0, 90.0, 20.0}, 0.0, false, false},
  });

  expect_true(pwm_hal.initialize().ok(), "PWM HAL should initialize");

  const auto startup_duty = pwm_hal.get_duty_percent("pwm_1");
  expect_true(startup_duty.ok() && almost_equal(startup_duty.value.value(), 10.0), "startup duty should clamp to configured minimum");

  expect_true(pwm_hal.set_duty_percent("pwm_1", 55.0).ok(), "set_duty_percent should succeed");
  const auto nominal_duty = pwm_hal.get_duty_percent("pwm_1");
  expect_true(nominal_duty.ok() && almost_equal(nominal_duty.value.value(), 55.0), "get_duty_percent should return written duty");

  expect_true(pwm_hal.set_duty_percent("pwm_1", 95.0).ok(), "over-range duty request should still succeed");
  const auto clamped_duty = pwm_hal.get_duty_percent("pwm_1");
  expect_true(clamped_duty.ok() && almost_equal(clamped_duty.value.value(), 90.0), "duty should clamp to configured max");

  expect_true(pwm_hal.set_enabled("pwm_1", true).ok(), "set_enabled should succeed");
  const auto enabled = pwm_hal.get_enabled("pwm_1");
  expect_true(enabled.ok() && enabled.value.value(), "enabled state should round-trip");

  expect_true(pwm_hal.apply_safe_state("pwm_1").ok(), "apply_safe_state should succeed");
  const auto safe_duty = pwm_hal.get_duty_percent("pwm_1");
  const auto safe_enabled = pwm_hal.get_enabled("pwm_1");
  expect_true(safe_duty.ok() && almost_equal(safe_duty.value.value(), 20.0), "safe state should apply configured safe duty");
  expect_true(safe_enabled.ok() && !safe_enabled.value.value(), "safe state should disable PWM output");

  const auto invalid_limits = pwm_hal.configure_limits("pwm_1", 80.0, 60.0, 70.0);
  expect_true(
      !invalid_limits.ok() && invalid_limits.code == HalErrorCode::invalid_range,
      "invalid duty configuration should be rejected");

  if (failures != 0) {
    std::cerr << "test_pwm_hal failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pwm_hal passed\n";
  return 0;
}
