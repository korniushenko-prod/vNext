#include <iostream>
#include <string>

#include "actuators/actuator_types.hpp"
#include "pid/pid_service.hpp"
#include "pid_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::PwmEffectiveState;
using controller::pid::PidMode;
using controller::pid::PidServiceMode;
using pid_service_test_support::TestHarness;
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
  descriptor.core_config.manual_output = 42.0;
  expect_true(harness.service.register_pid(descriptor).ok(), "manual descriptor should register", failures);

  expect_true(harness.service.tick(100U).ok(), "manual tick should succeed", failures);
  const auto manual_snapshot = harness.service.get_snapshot("loop1");
  const auto manual_actuator = harness.actuator_manager.get_snapshot("pwm_1");
  expect_true(manual_snapshot.ok() && manual_snapshot.value->effective_mode == PidServiceMode::manual, "manual mode should stay active", failures);
  expect_near(
      manual_snapshot.ok() ? manual_snapshot.value->output : 0.0,
      42.0,
      1e-9,
      "manual mode should command manual output",
      failures);
  expect_true(
      manual_actuator.ok() && manual_actuator.value->priority == ActuatorPriority::pid &&
          manual_actuator.value->owner == "pid:loop1",
      "manual mode should submit a PID-priority actuator request",
      failures);
  expect_near(
      manual_actuator.ok() ? std::get<PwmEffectiveState>(manual_actuator.value->effective).duty_percent : 0.0,
      42.0,
      1e-9,
      "manual actuator duty should match manual output",
      failures);

  expect_true(
      harness.service.set_requested_mode("loop1", PidServiceMode::auto_mode, 150U).ok(),
      "set_requested_mode(auto) should succeed",
      failures);
  update_double_signal(harness.registry, "plant.pv", 25.0, 200U);
  expect_true(harness.service.tick(200U).ok(), "auto tick should succeed", failures);
  const auto auto_snapshot = harness.service.get_snapshot("loop1");
  expect_true(
      auto_snapshot.ok() && auto_snapshot.value->requested_mode == PidServiceMode::auto_mode &&
          auto_snapshot.value->effective_mode == PidServiceMode::auto_mode,
      "set_requested_mode should update requested and effective modes",
      failures);
  expect_true(
      auto_snapshot.ok() && auto_snapshot.value->updated,
      "auto mode should produce a fresh PID update",
      failures);

  const double held_output = auto_snapshot.ok() ? auto_snapshot.value->output : 0.0;
  expect_true(
      harness.service.set_requested_mode("loop1", PidServiceMode::hold, 250U).ok(),
      "set_requested_mode(hold) should succeed",
      failures);
  update_double_signal(harness.registry, "plant.pv", 35.0, 300U);
  expect_true(harness.service.tick(300U).ok(), "hold tick should succeed", failures);
  const auto hold_snapshot = harness.service.get_snapshot("loop1");
  expect_true(hold_snapshot.ok() && hold_snapshot.value->effective_mode == PidServiceMode::hold, "hold mode should become effective", failures);
  expect_near(
      hold_snapshot.ok() ? hold_snapshot.value->output : 0.0,
      held_output,
      1e-9,
      "hold mode should keep the last output",
      failures);
  expect_true(hold_snapshot.ok() && !hold_snapshot.value->updated, "hold mode should not report a fresh PID update", failures);

  expect_true(
      harness.service.set_requested_mode("loop1", PidServiceMode::disabled, 350U).ok(),
      "set_requested_mode(disabled) should succeed",
      failures);
  const auto disabled_actuator = harness.actuator_manager.get_snapshot("pwm_1");
  expect_true(
      disabled_actuator.ok() && disabled_actuator.value->owner == "safe_fallback",
      "disabled mode should clear the owned output request",
      failures);

  expect_true(harness.service.set_enabled("loop1", false, 400U).ok(), "set_enabled(false) should succeed", failures);
  const auto disabled_snapshot = harness.service.get_snapshot("loop1");
  expect_true(
      disabled_snapshot.ok() && !disabled_snapshot.value->enabled &&
          disabled_snapshot.value->effective_mode == PidServiceMode::disabled,
      "set_enabled(false) should force effective disabled mode",
      failures);

  if (failures != 0) {
    std::cerr << "test_pid_service_modes failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_service_modes passed\n";
  return 0;
}
