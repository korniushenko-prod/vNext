#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperHistoryEventType;
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
    descriptor.limit_min_signal_path = "inputs.limit_min";
    descriptor.min_steps = 0;
    descriptor.max_steps = 500;
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.limit_min");
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.limit_min", false, 0U);
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "min-limit descriptor should register", failures);

    stepper_service_test_support::expect_true(
        harness.service.start_jog("axis1", StepperDirection::reverse, 0U, "operator", "jog_to_min").ok(),
        "reverse jog should start",
        failures);
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.limit_min", true, 100U);
    stepper_service_test_support::expect_true(harness.service.tick(100U).ok(), "limit_min tick should succeed", failures);

    const auto stopped = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(stopped.runtime_state == StepperRuntimeState::ready, "limit_min should stop motion", failures);
    stepper_service_test_support::expect_true(stopped.position_steps == 0, "limit_min should clamp to min_steps", failures);
    stepper_service_test_support::expect_true(stopped.limit_min.value_or(false), "limit_min snapshot should be true", failures);

    const auto history = harness.service.read_history("axis1");
    bool found_limit_event = false;
    for (const auto& entry : history.value.value()) {
      if (entry.event_type == StepperHistoryEventType::limit_reached) {
        found_limit_event = true;
      }
    }
    stepper_service_test_support::expect_true(found_limit_event, "limit_min should create a limit_reached history entry", failures);
  }

  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.limit_max_signal_path = "inputs.limit_max";
    descriptor.max_steps = 300;
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.limit_max");
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.limit_max", false, 0U);
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "max-limit descriptor should register", failures);

    stepper_service_test_support::expect_true(harness.service.move_to_steps("axis1", 250, 0U, "operator", "move_to_max").ok(), "move should start toward max", failures);
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.limit_max", true, 100U);
    stepper_service_test_support::expect_true(harness.service.tick(100U).ok(), "limit_max tick should succeed", failures);

    const auto stopped = stepper_service_test_support::snapshot(harness.service, "axis1");
    stepper_service_test_support::expect_true(stopped.position_steps == 300, "limit_max should clamp to max_steps", failures);
    stepper_service_test_support::expect_true(stopped.limit_max.value_or(false), "limit_max snapshot should be true", failures);

    const auto limit_signal = harness.registry.read_bool("stepper.axis1.limit_max", 100U);
    stepper_service_test_support::expect_true(limit_signal.ok() && limit_signal.value.value(), "limit_max should publish through SignalRegistry", failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_limits failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_limits passed\n";
  return 0;
}
