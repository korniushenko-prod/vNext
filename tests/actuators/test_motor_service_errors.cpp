#include <iostream>

#include "motor_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::MotorDirection;
using controller::actuators::MotorErrorCode;
using motor_service_test_support::TestHarness;

namespace {

int failures = 0;

}  // namespace

int main() {
  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.id.clear();

    const auto invalid_descriptor = harness.service.register_motor(descriptor);
    motor_service_test_support::expect_true(
        !invalid_descriptor.ok() && invalid_descriptor.status.code == MotorErrorCode::motor_invalid_descriptor,
        "invalid descriptor should be rejected",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.direction_target_id.reset();
    descriptor.allow_reverse = true;

    const auto invalid_descriptor = harness.service.register_motor(descriptor);
    motor_service_test_support::expect_true(
        !invalid_descriptor.ok() && invalid_descriptor.status.code == MotorErrorCode::motor_invalid_descriptor,
        "descriptor with allow_reverse but no direction target should be rejected",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.direction_target_id.reset();
    descriptor.allow_reverse = false;

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "error-test motor should register", failures);

    const auto invalid_command = harness.service.command_motor(
        "motor1",
        controller::actuators::MotorCommand{
            true,
            motor_service_test_support::nan_value(),
            MotorDirection::forward,
            ActuatorPriority::manual,
            "operator",
            "nan_speed",
            0U,
        });
    motor_service_test_support::expect_true(
        !invalid_command.ok() && invalid_command.status.code == MotorErrorCode::motor_invalid_command,
        "invalid command should be rejected",
        failures);

    const auto unknown_motor = harness.service.command_motor(
        "missing",
        controller::actuators::MotorCommand{
            true,
            30.0,
            MotorDirection::forward,
            ActuatorPriority::manual,
            "operator",
            "unknown_motor",
            0U,
        });
    motor_service_test_support::expect_true(
        !unknown_motor.ok() && unknown_motor.status.code == MotorErrorCode::motor_not_found,
        "unknown motor should return motor_not_found",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.min_speed_percent = 10.0;

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "output-failure motor should register", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                25.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "output_failure",
                0U,
            })
            .ok(),
        "output-failure command should be accepted",
        failures);

    (void)harness.pwm_hal.set_fault("pwm_1", true);
    const auto tick_result = harness.service.tick(0U);
    motor_service_test_support::expect_true(
        !tick_result.ok() && tick_result.status.code == MotorErrorCode::motor_output_request_failed,
        "HAL/application failures should surface as motor_output_request_failed",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.tach_signal_path = "inputs.bad_tach";

    motor_service_test_support::register_string_signal(harness.registry, "inputs.bad_tach");
    motor_service_test_support::update_string_signal(harness.registry, "inputs.bad_tach", "oops", 0U);
    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "bad-tach motor should register", failures);

    const auto tick_result = harness.service.tick(0U);
    motor_service_test_support::expect_true(
        !tick_result.ok() && tick_result.status.code == MotorErrorCode::motor_signal_read_failed,
        "signal read failures should surface with motor_signal_read_failed",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();

    (void)harness.registry.register_signal(
        motor_service_test_support::make_signal_descriptor(
            "motor.motor1.enabled",
            "preexisting motor enabled",
            controller::signals::SignalType::boolean));
    const auto publish_failure = harness.service.register_motor(descriptor);
    motor_service_test_support::expect_true(
        !publish_failure.ok() && publish_failure.status.code == MotorErrorCode::motor_signal_publish_failed,
        "signal registration/publish conflicts should surface with motor_signal_publish_failed",
        failures);
  }

  if (failures != 0) {
    std::cerr << "test_motor_service_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_motor_service_errors passed\n";
  return 0;
}
