#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperErrorCode;
using controller::actuators::StepperRuntimeState;
using controller::hal::StepperDirection;
using stepper_service_test_support::TestHarness;

namespace {

int failures = 0;

}

int main() {
  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "jog descriptor should register", failures);

    stepper_service_test_support::expect_true(
        harness.service.start_jog("axis1", StepperDirection::forward, 0U, "operator", "jog_forward").ok(),
        "start_jog should succeed",
        failures);
    stepper_service_test_support::expect_true(harness.service.tick(1000U).ok(), "jog tick should succeed", failures);

    const auto moving = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(moving.runtime_state == StepperRuntimeState::manual_jog, "jog should enter manual_jog state", failures);
    stepper_service_test_support::expect_true(moving.position_steps == 40, "jog should move at jog_speed_steps_per_sec", failures);
    stepper_service_test_support::expect_true(moving.command_speed_steps_per_sec == 40.0, "command speed should reflect jog speed", failures);

    stepper_service_test_support::expect_true(harness.service.stop("axis1", 1100U, "operator", "stop_jog").ok(), "stop should end jog", failures);
    const auto stopped = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(stopped.runtime_state == StepperRuntimeState::ready, "stop should return to ready", failures);
    stepper_service_test_support::expect_true(stopped.position_steps == 40, "stop should preserve current position", failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.home_required_on_boot = true;
    descriptor.home_signal_path = "inputs.home";
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "homing-jog descriptor should register", failures);

    const auto need_home = harness.service.start_jog("axis1", StepperDirection::forward, 0U, "operator", "jog_before_home");
    stepper_service_test_support::expect_true(
        !need_home.ok() && need_home.status.code == StepperErrorCode::stepper_homing_required,
        "jog should be rejected while need_homing",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.fault_signal_path = "inputs.fault";
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.fault");
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.fault", true, 0U);
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "fault-jog descriptor should register", failures);
    stepper_service_test_support::expect_true(harness.service.tick(0U).ok(), "fault activation tick should succeed", failures);

    const auto rejected = harness.service.start_jog("axis1", StepperDirection::forward, 1U, "operator", "jog_faulted");
    stepper_service_test_support::expect_true(
        !rejected.ok() && rejected.status.code == StepperErrorCode::stepper_fault_active,
        "jog should be rejected while faulted",
        failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_jog failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_jog passed\n";
  return 0;
}
