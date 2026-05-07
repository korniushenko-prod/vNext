#include <iostream>

#include "motor_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::MotorDirection;
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
    descriptor.min_speed_percent = 10.0;
    descriptor.fault_signal_path = "inputs.motor_fault";
    descriptor.tach_signal_path = "inputs.motor_tach";

    motor_service_test_support::register_bool_signal(harness.registry, "inputs.motor_fault");
    motor_service_test_support::register_double_signal(harness.registry, "inputs.motor_tach");
    motor_service_test_support::update_bool_signal(harness.registry, "inputs.motor_fault", false, 0U);
    motor_service_test_support::update_double_signal(harness.registry, "inputs.motor_tach", 123.5, 0U);

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "fault-aware motor should register", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                50.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "start_before_fault",
                0U,
            })
            .ok(),
        "start command should be accepted before fault",
        failures);
    motor_service_test_support::expect_true(harness.service.tick(0U).ok(), "initial running tick should succeed", failures);

    auto snapshot = harness.service.get_snapshot("motor1");
    motor_service_test_support::expect_true(snapshot.ok(), "snapshot should exist before fault", failures);
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->tach_value.has_value() && *snapshot.value->tach_value == 123.5,
          "tach value should be exposed when available",
          failures);
    }

    motor_service_test_support::update_bool_signal(harness.registry, "inputs.motor_fault", true, 1000U);
    motor_service_test_support::expect_true(harness.service.tick(1000U).ok(), "fault tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->fault && snapshot.value->runtime_state == MotorRuntimeState::fault,
          "fault signal should drive runtime fault state",
          failures);
    }

    const auto pwm_enabled = harness.pwm_hal.get_enabled("pwm_1");
    const auto enable_state = harness.relay_hal.get_state("enable_1");
    motor_service_test_support::expect_true(
        pwm_enabled.ok() && !pwm_enabled.value.value(),
        "fault should clear PWM enable",
        failures);
    motor_service_test_support::expect_true(
        enable_state.ok() && enable_state.value.value() == RelayState::off,
        "fault should clear enable relay",
        failures);

    motor_service_test_support::update_bool_signal(harness.registry, "inputs.motor_fault", false, 2000U);
    motor_service_test_support::expect_true(harness.service.tick(2000U).ok(), "fault recovery tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          !snapshot.value->fault && snapshot.value->runtime_state == MotorRuntimeState::stopped &&
              !snapshot.value->requested_run,
          "recovered fault should return to stopped and require a fresh command",
          failures);
    }

    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                35.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "restart_after_fault",
                2500U,
            })
            .ok(),
        "fresh run command should be required after fault clears",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.fault_signal_path = "inputs.missing_fault";

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "missing-fault motor should register", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                25.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "start_without_fault_signal",
                0U,
            })
            .ok(),
        "start command should be accepted even when fault signal is missing",
        failures);
    const auto tick_result = harness.service.tick(1000U);
    motor_service_test_support::expect_true(tick_result.ok(), "missing fault signal should not crash or fault by default", failures);
  }

  if (failures != 0) {
    std::cerr << "test_motor_service_faults failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_motor_service_faults passed\n";
  return 0;
}
