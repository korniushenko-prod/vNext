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
    descriptor.max_steps = 400;
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "move descriptor should register", failures);

    stepper_service_test_support::expect_true(harness.service.move_to_steps("axis1", 200, 0U, "operator", "absolute_move").ok(), "move_to_steps should start", failures);
    stepper_service_test_support::expect_true(harness.service.tick(250U).ok(), "first motion tick should succeed", failures);
    const auto quarter = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(quarter.runtime_state == StepperRuntimeState::moving, "stepper should still be moving", failures);
    stepper_service_test_support::expect_true(quarter.position_steps == 25, "position should advance deterministically after 250ms", failures);

    stepper_service_test_support::expect_true(harness.service.tick(2000U).ok(), "target-reaching tick should succeed", failures);
    const auto finished = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(finished.runtime_state == StepperRuntimeState::ready, "state should return to ready at target", failures);
    stepper_service_test_support::expect_true(finished.position_steps == 200, "final absolute target should be reached", failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.max_steps = 400;
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "percent descriptor should register", failures);

    stepper_service_test_support::expect_true(harness.service.move_to_percent("axis1", 50.0, 0U, "operator", "percent_move").ok(), "move_to_percent should start", failures);
    stepper_service_test_support::expect_true(harness.service.tick(2500U).ok(), "percent move tick should succeed", failures);

    const auto finished = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(finished.position_steps == 200, "50 percent should map to midpoint steps", failures);
    stepper_service_test_support::expect_near(finished.position_percent, 50.0, 1e-9, "snapshot percent should map back coherently", failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "range descriptor should register", failures);

    const auto bad_steps = harness.service.move_to_steps("axis1", 2000, 0U, "operator", "too_far");
    stepper_service_test_support::expect_true(
        !bad_steps.ok() && bad_steps.status.code == StepperErrorCode::stepper_target_out_of_range,
        "out-of-range steps should be rejected",
        failures);

    const auto bad_percent = harness.service.move_to_percent("axis1", 120.0, 0U, "operator", "bad_percent");
    stepper_service_test_support::expect_true(
        !bad_percent.ok() && bad_percent.status.code == StepperErrorCode::stepper_target_out_of_range,
        "out-of-range percent should be rejected",
        failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_move failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_move passed\n";
  return 0;
}
