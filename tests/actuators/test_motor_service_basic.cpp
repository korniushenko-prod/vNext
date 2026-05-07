#include <iostream>
#include <string>

#include "motor_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::MotorDirection;
using controller::actuators::MotorErrorCode;
using controller::actuators::MotorRuntimeState;
using motor_service_test_support::TestHarness;

namespace {

int failures = 0;

}  // namespace

int main() {
  TestHarness harness;
  auto descriptor = motor_service_test_support::make_descriptor();

  const auto register_result = harness.service.register_motor(descriptor);
  motor_service_test_support::expect_true(register_result.ok(), "valid motor descriptor should register", failures);

  const auto duplicate_result = harness.service.register_motor(descriptor);
  motor_service_test_support::expect_true(
      !duplicate_result.ok() && duplicate_result.status.code == MotorErrorCode::motor_already_registered,
      "duplicate motor id should be rejected",
      failures);

  const auto command_result = harness.service.command_motor(
      "motor1",
      controller::actuators::MotorCommand{
          true,
          40.0,
          MotorDirection::forward,
          ActuatorPriority::manual,
          "operator",
          "start_forward",
          0U,
      });
  motor_service_test_support::expect_true(command_result.ok(), "start command should be accepted", failures);

  const auto tick_result = harness.service.tick(1000U);
  motor_service_test_support::expect_true(tick_result.ok(), "tick should succeed after start command", failures);

  const auto snapshot_result = harness.service.get_snapshot("motor1");
  motor_service_test_support::expect_true(snapshot_result.ok(), "snapshot should exist", failures);
  if (snapshot_result.ok()) {
    const auto& snapshot = *snapshot_result.value;
    motor_service_test_support::expect_true(snapshot.requested_run, "requested_run should stay true", failures);
    motor_service_test_support::expect_true(snapshot.effective_run, "effective_run should become true", failures);
    motor_service_test_support::expect_true(
        snapshot.runtime_state == MotorRuntimeState::running,
        "runtime state should reach running",
        failures);
    motor_service_test_support::expect_near(
        snapshot.effective_speed_percent,
        40.0,
        0.000001,
        "effective speed should reach the requested value",
        failures);
  }

  const auto stop_result = harness.service.stop_motor("motor1", 1000U, "operator", "stop_request");
  motor_service_test_support::expect_true(stop_result.ok(), "stop command should be accepted", failures);
  motor_service_test_support::expect_true(harness.service.tick(2000U).ok(), "stop ramp tick should succeed", failures);
  motor_service_test_support::expect_true(harness.service.tick(3000U).ok(), "motor should reach stopped state", failures);

  const auto stopped_snapshot = harness.service.get_snapshot("motor1");
  motor_service_test_support::expect_true(stopped_snapshot.ok(), "stopped snapshot should exist", failures);
  if (stopped_snapshot.ok()) {
    motor_service_test_support::expect_true(
        !stopped_snapshot.value->requested_run && !stopped_snapshot.value->effective_run,
        "requested and effective run should be false after stop",
        failures);
    motor_service_test_support::expect_true(
        stopped_snapshot.value->runtime_state == MotorRuntimeState::stopped,
        "runtime state should return to stopped",
        failures);
  }

  if (failures != 0) {
    std::cerr << "test_motor_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_motor_service_basic passed\n";
  return 0;
}
