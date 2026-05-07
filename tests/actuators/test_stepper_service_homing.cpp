#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperErrorCode;
using controller::actuators::StepperRuntimeState;
using stepper_service_test_support::TestHarness;

namespace {

int failures = 0;

}

int main() {
  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.home_required_on_boot = true;
    descriptor.home_signal_path = "inputs.home";

    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "homing descriptor should register", failures);
    const auto initial = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(initial.runtime_state == StepperRuntimeState::need_homing, "home_required_on_boot should enter need_homing", failures);

    const auto rejected_move = harness.service.move_to_steps("axis1", 100, 0U, "operator", "move_before_home");
    stepper_service_test_support::expect_true(
        !rejected_move.ok() && rejected_move.status.code == StepperErrorCode::stepper_homing_required,
        "move should be rejected before homing",
        failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.home_required_on_boot = true;
    descriptor.home_signal_path = "inputs.home";
    descriptor.home_position_steps = 25;
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.home");
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.home", false, 0U);

    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "homing signal descriptor should register", failures);
    stepper_service_test_support::expect_true(
        harness.service.command_home("axis1", 0U, "operator", "find_home").ok(),
        "command_home should start homing",
        failures);

    stepper_service_test_support::expect_true(harness.service.tick(500U).ok(), "homing tick should succeed before signal", failures);
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.home", true, 600U);
    stepper_service_test_support::expect_true(harness.service.tick(600U).ok(), "home signal should complete homing", failures);

    const auto homed = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(homed.runtime_state == StepperRuntimeState::ready, "completed homing should return ready", failures);
    stepper_service_test_support::expect_true(homed.homed, "completed homing should mark homed", failures);
    stepper_service_test_support::expect_true(homed.position_steps == 25, "home_position_steps should be applied", failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.home_required_on_boot = true;
    descriptor.home_signal_path = "inputs.bad_home";
    stepper_service_test_support::register_string_signal(harness.registry, "inputs.bad_home");

    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "bad-home descriptor should register", failures);
    stepper_service_test_support::expect_true(harness.service.command_home("axis1", 0U, "operator", "bad_home").ok(), "command_home should still be accepted", failures);

    const auto tick_result = harness.service.tick(100U);
    stepper_service_test_support::expect_true(
        !tick_result.ok() && tick_result.status.code == StepperErrorCode::stepper_signal_read_failed,
        "invalid home signal should surface signal_read_failed",
        failures);

    const auto faulted = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(faulted.runtime_state == StepperRuntimeState::fault, "bad home signal should enter fault state", failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_homing failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_homing passed\n";
  return 0;
}
