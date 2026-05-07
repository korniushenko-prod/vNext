#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperRuntimeState;
using controller::signals::SignalRegistry;
using stepper_service_test_support::TestHarness;

namespace {

int failures = 0;

}

int main() {
  TestHarness harness;
  auto descriptor = stepper_service_test_support::make_descriptor();
  descriptor.max_steps = 400;
  descriptor.home_signal_path = "inputs.home";
  descriptor.limit_min_signal_path = "inputs.limit_min";
  descriptor.limit_max_signal_path = "inputs.limit_max";

  stepper_service_test_support::register_bool_signal(harness.registry, "inputs.home");
  stepper_service_test_support::register_bool_signal(harness.registry, "inputs.limit_min");
  stepper_service_test_support::register_bool_signal(harness.registry, "inputs.limit_max");
  stepper_service_test_support::update_bool_signal(harness.registry, "inputs.home", false, 0U);
  stepper_service_test_support::update_bool_signal(harness.registry, "inputs.limit_min", false, 0U);
  stepper_service_test_support::update_bool_signal(harness.registry, "inputs.limit_max", false, 0U);

  stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "signal descriptor should register", failures);
  stepper_service_test_support::expect_true(harness.service.move_to_steps("axis1", 200, 0U, "operator", "publish_move").ok(), "move command should succeed", failures);
  stepper_service_test_support::expect_true(harness.service.tick(1000U).ok(), "signal tick should succeed", failures);

  const auto state = harness.registry.read_string("stepper.axis1.runtime_state", 1000U);
  const auto position_steps = harness.registry.read_int64("stepper.axis1.position_steps", 1000U);
  const auto position_percent = harness.registry.read_double("stepper.axis1.position_percent", 1000U);
  const auto target_steps = harness.registry.read_int64("stepper.axis1.target_steps", 1000U);
  const auto target_percent = harness.registry.read_double("stepper.axis1.target_percent", 1000U);
  const auto home_signal = harness.registry.read_bool("stepper.axis1.home_signal", 1000U);
  const auto limit_min = harness.registry.read_bool("stepper.axis1.limit_min", 1000U);
  const auto limit_max = harness.registry.read_bool("stepper.axis1.limit_max", 1000U);

  stepper_service_test_support::expect_true(state.ok() && state.value.value() == "moving", "runtime_state signal should publish moving", failures);
  stepper_service_test_support::expect_true(position_steps.ok() && position_steps.value.value() == 100, "position_steps signal should publish current position", failures);
  stepper_service_test_support::expect_near(position_percent.ok() ? position_percent.value.value() : 0.0, 25.0, 1e-9, "position_percent should map correctly", failures);
  stepper_service_test_support::expect_true(target_steps.ok() && target_steps.value.value() == 200, "target_steps signal should publish active target", failures);
  stepper_service_test_support::expect_near(target_percent.ok() ? target_percent.value.value() : 0.0, 50.0, 1e-9, "target_percent should publish active target percent", failures);
  stepper_service_test_support::expect_true(home_signal.ok() && !home_signal.value.value(), "home signal publication should reflect current input", failures);
  stepper_service_test_support::expect_true(limit_min.ok() && !limit_min.value.value(), "limit_min publication should reflect current input", failures);
  stepper_service_test_support::expect_true(limit_max.ok() && !limit_max.value.value(), "limit_max publication should reflect current input", failures);

  const auto snapshot = stepper_service_test_support::snapshot(harness.service, "axis1");
  stepper_service_test_support::expect_true(snapshot.runtime_state == StepperRuntimeState::moving, "snapshot should match moving state", failures);

  if (failures != 0) {
    std::cerr << "test_stepper_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_signals passed\n";
  return 0;
}
