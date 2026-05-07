#include <iostream>

#include "motor_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::MotorDirection;
using controller::actuators::MotorErrorCode;
using controller::actuators::MotorRuntimeState;
using controller::hal::RelayState;
using motor_service_test_support::TestHarness;

namespace {

int failures = 0;

}  // namespace

int main() {
  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.direction_target_id.reset();
    descriptor.allow_reverse = false;

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "forward-only motor should register", failures);
    const auto reverse_result = harness.service.command_motor(
        "motor1",
        controller::actuators::MotorCommand{
            true,
            50.0,
            MotorDirection::reverse,
            ActuatorPriority::manual,
            "operator",
            "reject_reverse",
            0U,
        });
    motor_service_test_support::expect_true(
        !reverse_result.ok() && reverse_result.status.code == MotorErrorCode::motor_reverse_not_allowed,
        "reverse should be rejected when unsupported",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.enable_target_id.reset();
    descriptor.min_speed_percent = 50.0;
    descriptor.ramp_up_percent_per_sec = 80.0;
    descriptor.ramp_down_percent_per_sec = 50.0;
    descriptor.reverse_delay_ms = 1000U;

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "reversible motor should register", failures);

    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                false,
                0.0,
                MotorDirection::reverse,
                ActuatorPriority::manual,
                "operator",
                "set_reverse_while_stopped",
                0U,
            })
            .ok(),
        "direction-only reverse command while stopped should be accepted",
        failures);
    motor_service_test_support::expect_true(harness.service.tick(0U).ok(), "stopped reverse tick should succeed", failures);

    auto snapshot = harness.service.get_snapshot("motor1");
    motor_service_test_support::expect_true(snapshot.ok(), "snapshot should exist after stopped reverse", failures);
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::stopped &&
              snapshot.value->effective_direction == MotorDirection::reverse,
          "reverse while stopped should apply immediately",
          failures);
    }

    const auto reverse_relay = harness.relay_hal.get_state("direction_1");
    motor_service_test_support::expect_true(
        reverse_relay.ok() && reverse_relay.value.value() == RelayState::on,
        "direction output should map reverse to relay ON",
        failures);

    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                50.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "start_forward",
                0U,
            })
            .ok(),
        "forward run command should be accepted",
        failures);
    motor_service_test_support::expect_true(harness.service.tick(1000U).ok(), "forward start tick should succeed", failures);

    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                50.0,
                MotorDirection::reverse,
                ActuatorPriority::manual,
                "operator",
                "reverse_running",
                1000U,
            })
            .ok(),
        "reverse command while running should be accepted",
        failures);

    motor_service_test_support::expect_true(harness.service.tick(1500U).ok(), "reverse ramp-down tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::ramping_down &&
              snapshot.value->effective_direction == MotorDirection::forward,
          "running reverse should ramp down before direction changes",
          failures);
      motor_service_test_support::expect_near(
          snapshot.value->effective_speed_percent,
          25.0,
          0.000001,
          "reverse ramp-down speed should be deterministic",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(2000U).ok(), "reverse stop tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::reversing_delay &&
              !snapshot.value->effective_run,
          "service should wait in reversing_delay at zero speed",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(2500U).ok(), "reverse delay hold tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::reversing_delay,
          "service should stay in reversing_delay until the delay expires",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(3000U).ok(), "reverse delay completion tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->effective_direction == MotorDirection::reverse &&
              snapshot.value->runtime_state == MotorRuntimeState::running,
          "direction change after reverse_delay should restart the motor in reverse",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(3500U).ok(), "reverse ramp-up tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::running &&
              snapshot.value->effective_direction == MotorDirection::reverse,
          "service should continue running in the new direction after reverse restart",
          failures);
    }

    const auto forward_relay = harness.relay_hal.get_state("direction_1");
    motor_service_test_support::expect_true(
        forward_relay.ok() && forward_relay.value.value() == RelayState::on,
        "direction output should remain relay ON for reverse direction",
        failures);
  }

  if (failures != 0) {
    std::cerr << "test_motor_service_direction failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_motor_service_direction passed\n";
  return 0;
}
