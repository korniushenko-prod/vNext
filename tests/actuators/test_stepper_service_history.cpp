#include <iostream>

#include "stepper_service_test_support.hpp"

using controller::actuators::StepperHistoryEventType;
using controller::hal::StepperDirection;
using stepper_service_test_support::TestHarness;

namespace {

int failures = 0;

}

int main() {
  {
    TestHarness harness;
    auto descriptor = stepper_service_test_support::make_descriptor();
    descriptor.fault_signal_path = "inputs.fault";
    descriptor.home_signal_path = "inputs.home";
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.fault");
    stepper_service_test_support::register_bool_signal(harness.registry, "inputs.home");
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.fault", false, 0U);
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.home", false, 0U);

    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "history descriptor should register", failures);
    stepper_service_test_support::expect_true(harness.service.command_home("axis1", 1U, "operator", "home").ok(), "home command should register history", failures);
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.home", true, 2U);
    (void)harness.service.tick(2U);
    stepper_service_test_support::expect_true(harness.service.move_to_steps("axis1", 100, 3U, "operator", "move").ok(), "move command should register history", failures);
    stepper_service_test_support::expect_true(harness.service.start_jog("axis1", StepperDirection::forward, 4U, "operator", "jog").ok(), "jog command should register history", failures);
    stepper_service_test_support::expect_true(harness.service.stop("axis1", 5U, "operator", "stop").ok(), "stop should register history", failures);
    stepper_service_test_support::update_bool_signal(harness.registry, "inputs.fault", true, 6U);
    (void)harness.service.tick(6U);

    const auto history = harness.service.read_history("axis1");
    bool saw_home = false;
    bool saw_move = false;
    bool saw_jog = false;
    bool saw_stop = false;
    bool saw_fault = false;
    std::uint64_t previous_sequence = 0U;
    for (const auto& entry : history.value.value()) {
      stepper_service_test_support::expect_true(entry.sequence_number > previous_sequence, "history sequence should be strictly increasing", failures);
      previous_sequence = entry.sequence_number;
      saw_home = saw_home || entry.event_type == StepperHistoryEventType::home_started || entry.event_type == StepperHistoryEventType::home_completed;
      saw_move = saw_move || entry.event_type == StepperHistoryEventType::move_commanded;
      saw_jog = saw_jog || entry.event_type == StepperHistoryEventType::jog_started;
      saw_stop = saw_stop || entry.event_type == StepperHistoryEventType::jog_stopped || entry.event_type == StepperHistoryEventType::stopped;
      saw_fault = saw_fault || entry.event_type == StepperHistoryEventType::fault_entered;
    }

    stepper_service_test_support::expect_true(saw_home, "history should include homing events", failures);
    stepper_service_test_support::expect_true(saw_move, "history should include move events", failures);
    stepper_service_test_support::expect_true(saw_jog, "history should include jog events", failures);
    stepper_service_test_support::expect_true(saw_stop, "history should include stop events", failures);
    stepper_service_test_support::expect_true(saw_fault, "history should include fault events", failures);
  }

  {
    TestHarness harness(3U);
    auto descriptor = stepper_service_test_support::make_descriptor();
    stepper_service_test_support::expect_true(harness.service.register_stepper(descriptor).ok(), "small-history descriptor should register", failures);
    (void)harness.service.move_to_steps("axis1", 10, 1U, "operator", "move_1");
    (void)harness.service.stop("axis1", 2U, "operator", "stop_1");
    (void)harness.service.start_jog("axis1", StepperDirection::forward, 3U, "operator", "jog_1");
    (void)harness.service.stop("axis1", 4U, "operator", "stop_2");

    const auto history = harness.service.read_history("axis1");
    stepper_service_test_support::expect_true(history.value.value().size() == 3U, "history should drop oldest entries when full", failures);
  }

  if (failures != 0) {
    std::cerr << "test_stepper_service_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_stepper_service_history passed\n";
  return 0;
}
