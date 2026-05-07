#include <iostream>

#include "motor_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::MotorDirection;
using controller::actuators::MotorRuntimeState;
using motor_service_test_support::TestHarness;

namespace {

int failures = 0;

}  // namespace

int main() {
  TestHarness harness;
  auto descriptor = motor_service_test_support::make_descriptor();
  descriptor.fault_signal_path = "inputs.motor_fault";

  motor_service_test_support::register_bool_signal(harness.registry, "inputs.motor_fault");
  motor_service_test_support::update_bool_signal(harness.registry, "inputs.motor_fault", false, 0U);

  motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "signal-publishing motor should register", failures);
  motor_service_test_support::expect_true(
      harness.registry.has_signal("motor.motor1.enabled") &&
          harness.registry.has_signal("motor.motor1.runtime_state") &&
          harness.registry.has_signal("motor.motor1.requested_speed_percent"),
      "motor SignalRegistry paths should be registered",
      failures);

  motor_service_test_support::expect_true(
      harness.service.command_motor(
          "motor1",
          controller::actuators::MotorCommand{
              true,
              45.0,
              MotorDirection::forward,
              ActuatorPriority::manual,
              "operator",
              "signal_start",
              0U,
          })
          .ok(),
      "signal start command should be accepted",
      failures);
  motor_service_test_support::expect_true(harness.service.tick(1000U).ok(), "signal tick should succeed", failures);

  const auto requested_run = harness.registry.read_bool("motor.motor1.requested_run", 1000U);
  const auto effective_run = harness.registry.read_bool("motor.motor1.effective_run", 1000U);
  const auto requested_speed = harness.registry.read_double("motor.motor1.requested_speed_percent", 1000U);
  const auto effective_speed = harness.registry.read_double("motor.motor1.effective_speed_percent", 1000U);
  const auto runtime_state = harness.registry.read_string("motor.motor1.runtime_state", 1000U);
  const auto start_count = harness.registry.read_int64("motor.motor1.start_count", 1000U);
  const auto last_reason = harness.registry.read_string("motor.motor1.last_reason", 1000U);
  const auto fault_reason = harness.registry.read_string("motor.motor1.fault_reason", 1000U);

  motor_service_test_support::expect_true(
      requested_run.ok() && requested_run.value.value() &&
          effective_run.ok() && effective_run.value.value(),
      "requested and effective run states should publish correctly",
      failures);
  motor_service_test_support::expect_true(
      requested_speed.ok() && effective_speed.ok(),
      "requested and effective speeds should publish",
      failures);
  if (requested_speed.ok()) {
    motor_service_test_support::expect_near(
        requested_speed.value.value(),
        45.0,
        0.000001,
        "requested speed signal should reflect command",
        failures);
  }
  if (effective_speed.ok()) {
    motor_service_test_support::expect_near(
        effective_speed.value.value(),
        45.0,
        0.000001,
        "effective speed signal should reflect runtime state",
        failures);
  }
  motor_service_test_support::expect_true(
      runtime_state.ok() && runtime_state.value.value() == std::string("running"),
      "runtime_state should publish the string state name",
      failures);
  motor_service_test_support::expect_true(
      start_count.ok() && start_count.value.value() == 1,
      "start_count should publish",
      failures);
  motor_service_test_support::expect_true(
      last_reason.ok() && motor_service_test_support::contains_text(last_reason.value.value(), "running"),
      "last_reason should publish a human-readable runtime reason",
      failures);
  motor_service_test_support::expect_true(
      fault_reason.ok() && fault_reason.value.value().empty(),
      "fault_reason should publish even when empty",
      failures);

  motor_service_test_support::update_bool_signal(harness.registry, "inputs.motor_fault", true, 2000U);
  motor_service_test_support::expect_true(harness.service.tick(2000U).ok(), "fault publication tick should succeed", failures);

  const auto fault_flag = harness.registry.read_bool("motor.motor1.fault", 2000U);
  const auto fault_state = harness.registry.read_string("motor.motor1.runtime_state", 2000U);
  const auto published_fault_reason = harness.registry.read_string("motor.motor1.fault_reason", 2000U);
  motor_service_test_support::expect_true(
      fault_flag.ok() && fault_flag.value.value(),
      "fault flag should publish when the motor faults",
      failures);
  motor_service_test_support::expect_true(
      fault_state.ok() && fault_state.value.value() == std::string("fault"),
      "fault state should publish the runtime fault state",
      failures);
  motor_service_test_support::expect_true(
      published_fault_reason.ok() &&
          motor_service_test_support::contains_text(published_fault_reason.value.value(), "fault_signal_active"),
      "fault_reason should publish the fault cause",
      failures);

  if (failures != 0) {
    std::cerr << "test_motor_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_motor_service_signals passed\n";
  return 0;
}
