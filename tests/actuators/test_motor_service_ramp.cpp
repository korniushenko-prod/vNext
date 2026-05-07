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
  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.enable_target_id.reset();
    descriptor.direction_target_id.reset();
    descriptor.allow_reverse = false;
    descriptor.ramp_up_percent_per_sec = 20.0;
    descriptor.ramp_down_percent_per_sec = 10.0;

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "ramp descriptor should register", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                50.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "start_ramp",
                0U,
            })
            .ok(),
        "ramp start command should be accepted",
        failures);

    motor_service_test_support::expect_true(harness.service.tick(1000U).ok(), "first ramp tick should succeed", failures);
    auto snapshot = harness.service.get_snapshot("motor1");
    motor_service_test_support::expect_true(snapshot.ok(), "snapshot should exist after ramp up", failures);
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::ramping_up,
          "runtime state should show ramping_up before target is reached",
          failures);
      motor_service_test_support::expect_near(
          snapshot.value->effective_speed_percent,
          20.0,
          0.000001,
          "soft start should ramp deterministically by 20 percent per second",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(2500U).ok(), "second ramp tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::running,
          "motor should reach running once requested speed is reached",
          failures);
      motor_service_test_support::expect_near(
          snapshot.value->effective_speed_percent,
          50.0,
          0.000001,
          "soft start should converge to the requested speed",
          failures);
      motor_service_test_support::expect_true(snapshot.value->start_count == 1U, "start_count should increment on actual start", failures);
    }

    motor_service_test_support::expect_true(
        harness.service.stop_motor("motor1", 2500U, "operator", "stop_ramp").ok(),
        "stop command should be accepted for soft stop",
        failures);
    motor_service_test_support::expect_true(harness.service.tick(3500U).ok(), "soft stop tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::ramping_down,
          "runtime state should show ramping_down while stopping",
          failures);
      motor_service_test_support::expect_near(
          snapshot.value->effective_speed_percent,
          40.0,
          0.000001,
          "soft stop should ramp down deterministically",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(7500U).ok(), "final stop tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::stopped && !snapshot.value->effective_run,
          "motor should finish in stopped state after ramp down",
          failures);
    }
  }

  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.enable_target_id.reset();
    descriptor.direction_target_id.reset();
    descriptor.allow_reverse = false;
    descriptor.start_boost_percent = 60.0;
    descriptor.start_boost_ms = 500U;
    descriptor.ramp_up_percent_per_sec = 40.0;
    descriptor.ramp_down_percent_per_sec = 60.0;

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "boost descriptor should register", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                30.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "start_boosted",
                0U,
            })
            .ok(),
        "boost start command should be accepted",
        failures);

    motor_service_test_support::expect_true(harness.service.tick(0U).ok(), "initial boost tick should succeed", failures);
    auto snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::starting_boost,
          "start boost should activate on stop-to-run transition",
          failures);
      motor_service_test_support::expect_near(
          snapshot.value->effective_speed_percent,
          60.0,
          0.000001,
          "boost speed should be applied immediately",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(400U).ok(), "boost hold tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_near(
          snapshot.value->effective_speed_percent,
          60.0,
          0.000001,
          "boost speed should persist during boost window",
          failures);
    }

    motor_service_test_support::expect_true(harness.service.tick(900U).ok(), "post-boost tick should succeed", failures);
    snapshot = harness.service.get_snapshot("motor1");
    if (snapshot.ok()) {
      motor_service_test_support::expect_true(
          snapshot.value->runtime_state == MotorRuntimeState::running,
          "motor should settle to running after boost completes",
          failures);
      motor_service_test_support::expect_near(
          snapshot.value->effective_speed_percent,
          30.0,
          0.000001,
          "after boost the service should ramp down to the requested speed",
          failures);
      motor_service_test_support::expect_true(snapshot.value->start_count == 1U, "boosted start should count as a start", failures);
    }
  }

  if (failures != 0) {
    std::cerr << "test_motor_service_ramp failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_motor_service_ramp passed\n";
  return 0;
}
