#include <iostream>
#include <string>

#include "actuators/actuator_types.hpp"
#include "pid/pid_service.hpp"
#include "pid_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::PwmEffectiveState;
using controller::pid::PidMode;
using pid_service_test_support::TestHarness;
using pid_service_test_support::contains_text;
using pid_service_test_support::expect_near;
using pid_service_test_support::expect_true;
using pid_service_test_support::make_descriptor;
using pid_service_test_support::register_double_signal;
using pid_service_test_support::update_double_signal;

namespace {

int failures = 0;

}  // namespace

int main() {
  TestHarness harness;
  register_double_signal(harness.registry, "plant.pv");
  update_double_signal(harness.registry, "plant.pv", 20.0, 100U);

  auto descriptor = make_descriptor();
  descriptor.core_config.mode = PidMode::manual;
  descriptor.core_config.manual_output = 45.0;
  descriptor.fault_clears_output = true;
  expect_true(harness.service.register_pid(descriptor).ok(), "actuator PID should register", failures);

  expect_true(harness.service.tick(100U).ok(), "manual tick should succeed", failures);
  const auto active_actuator = harness.actuator_manager.get_snapshot("pwm_1");
  expect_true(active_actuator.ok(), "actuator snapshot should be available", failures);
  expect_true(
      active_actuator.ok() && active_actuator.value->priority == ActuatorPriority::pid,
      "PIDService should submit PID-priority requests",
      failures);
  expect_true(
      active_actuator.ok() && active_actuator.value->owner == "pid:loop1",
      "owner should be pid:<id>",
      failures);
  expect_true(
      active_actuator.ok() && !active_actuator.value->reason.empty() &&
          contains_text(active_actuator.value->reason, "mode=manual"),
      "request reason should include human-readable mode context",
      failures);
  expect_near(
      active_actuator.ok() ? std::get<PwmEffectiveState>(active_actuator.value->effective).duty_percent : 0.0,
      45.0,
      1e-9,
      "manual output should drive the PWM target",
      failures);

  update_double_signal(harness.registry, "plant.pv", 20.0, 200U, true, true);
  expect_true(harness.service.tick(200U).ok(), "fault tick should complete", failures);
  const auto fault_actuator = harness.actuator_manager.get_snapshot("pwm_1");
  expect_true(
      fault_actuator.ok() && fault_actuator.value->owner == "safe_fallback",
      "fault with fault_clears_output should clear the PID-owned request",
      failures);

  update_double_signal(harness.registry, "plant.pv", 20.0, 300U, true, false);
  expect_true(harness.service.tick(300U).ok(), "recovery tick should succeed", failures);
  expect_true(harness.service.set_enabled("loop1", false, 320U).ok(), "set_enabled(false) should succeed", failures);
  const auto disabled_actuator = harness.actuator_manager.get_snapshot("pwm_1");
  expect_true(
      disabled_actuator.ok() && disabled_actuator.value->owner == "safe_fallback",
      "disable should clear the PID-owned request",
      failures);

  if (failures != 0) {
    std::cerr << "test_pid_service_actuator failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_service_actuator passed\n";
  return 0;
}
