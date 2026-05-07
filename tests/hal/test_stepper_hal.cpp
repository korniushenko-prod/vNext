#include <iostream>
#include <string>

#include "hal/stepper_hal.hpp"

using controller::hal::MockStepperHal;
using controller::hal::StepperChannelConfig;
using controller::hal::StepperDirection;
using controller::hal::StepperStopMode;

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
  MockStepperHal stepper_hal({
      StepperChannelConfig{"stepper_1"},
  });

  expect_true(stepper_hal.initialize().ok(), "stepper HAL should initialize");

  expect_true(stepper_hal.set_enabled("stepper_1", true).ok(), "set_enabled should succeed");
  const auto enabled = stepper_hal.get_enabled("stepper_1");
  expect_true(enabled.ok() && enabled.value.value(), "get_enabled should reflect enable state");

  expect_true(stepper_hal.set_direction("stepper_1", StepperDirection::reverse).ok(), "set_direction should succeed");
  const auto direction = stepper_hal.get_direction("stepper_1");
  expect_true(direction.ok() && direction.value.value() == StepperDirection::reverse, "direction should round-trip");

  expect_true(stepper_hal.set_step_rate_hz("stepper_1", 250.0).ok(), "set_step_rate_hz should succeed");
  const auto step_rate = stepper_hal.get_step_rate_hz("stepper_1");
  expect_true(step_rate.ok() && step_rate.value.value() == 250.0, "step rate should round-trip");

  expect_true(stepper_hal.stop("stepper_1").ok(), "stop should succeed");
  const auto stopped = stepper_hal.get_enabled("stepper_1");
  const auto stop_mode = stepper_hal.get_last_stop_mode("stepper_1");
  expect_true(stopped.ok() && !stopped.value.value(), "stop should disable the mock stepper");
  expect_true(stop_mode.ok() && stop_mode.value.value() == StepperStopMode::hold, "stop should record a normal stop mode");

  expect_true(stepper_hal.set_enabled("stepper_1", true).ok(), "re-enable should succeed");
  expect_true(stepper_hal.emergency_stop("stepper_1").ok(), "emergency_stop should succeed");
  const auto emergency_mode = stepper_hal.get_last_stop_mode("stepper_1");
  expect_true(emergency_mode.ok() && emergency_mode.value.value() == StepperStopMode::emergency, "emergency_stop should record emergency stop mode");

  expect_true(stepper_hal.set_fault("stepper_1", true).ok(), "fault injection should succeed");
  const auto fault = stepper_hal.get_fault("stepper_1");
  expect_true(fault.ok() && fault.value.value(), "fault state should be reported");

  if (failures != 0) {
    std::cerr << "test_stepper_hal failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_hal passed\n";
  return 0;
}
