#include <iostream>

#include "motor_service_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::MotorDirection;
using controller::actuators::MotorHistoryEventType;
using motor_service_test_support::TestHarness;

namespace {

int failures = 0;

bool has_event(
    const std::vector<controller::actuators::MotorHistoryEntry>& entries,
    const MotorHistoryEventType event_type) {
  for (const auto& entry : entries) {
    if (entry.event_type == event_type) {
      return true;
    }
  }
  return false;
}

}  // namespace

int main() {
  {
    TestHarness harness;
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.fault_signal_path = "inputs.motor_fault";
    descriptor.min_speed_percent = 10.0;

    motor_service_test_support::register_bool_signal(harness.registry, "inputs.motor_fault");
    motor_service_test_support::update_bool_signal(harness.registry, "inputs.motor_fault", false, 0U);

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "history motor should register", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                40.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "history_start",
                0U,
            })
            .ok(),
        "history start command should be accepted",
        failures);
    motor_service_test_support::expect_true(harness.service.tick(0U).ok(), "history start tick should succeed", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                40.0,
                MotorDirection::reverse,
                ActuatorPriority::manual,
                "operator",
                "history_reverse",
                1000U,
            })
            .ok(),
        "history reverse command should be accepted",
        failures);
    motor_service_test_support::expect_true(harness.service.tick(1000U).ok(), "history reverse tick should succeed", failures);
    motor_service_test_support::expect_true(harness.service.tick(2000U).ok(), "history reverse delay tick should succeed", failures);
    motor_service_test_support::update_bool_signal(harness.registry, "inputs.motor_fault", true, 3000U);
    motor_service_test_support::expect_true(harness.service.tick(3000U).ok(), "history fault tick should succeed", failures);

    const auto history_result = harness.service.read_history("motor1");
    motor_service_test_support::expect_true(history_result.ok(), "history should be readable", failures);
    if (history_result.ok()) {
      const auto& entries = *history_result.value;
      motor_service_test_support::expect_true(has_event(entries, MotorHistoryEventType::command_received), "history should include command_received", failures);
      motor_service_test_support::expect_true(has_event(entries, MotorHistoryEventType::started), "history should include started", failures);
      motor_service_test_support::expect_true(has_event(entries, MotorHistoryEventType::direction_changed), "history should include direction_changed", failures);
      motor_service_test_support::expect_true(has_event(entries, MotorHistoryEventType::fault_entered), "history should include fault_entered", failures);
      motor_service_test_support::expect_true(has_event(entries, MotorHistoryEventType::output_requested), "history should include output_requested", failures);
      for (std::size_t index = 1; index < entries.size(); ++index) {
        motor_service_test_support::expect_true(
            entries[index - 1].sequence_number < entries[index].sequence_number,
            "history sequence numbers should increase deterministically",
            failures);
      }
    }
  }

  {
    TestHarness harness(4U);
    auto descriptor = motor_service_test_support::make_descriptor();
    descriptor.min_speed_percent = 10.0;

    motor_service_test_support::expect_true(harness.service.register_motor(descriptor).ok(), "bounded-history motor should register", failures);
    motor_service_test_support::expect_true(
        harness.service.command_motor(
            "motor1",
            controller::actuators::MotorCommand{
                true,
                30.0,
                MotorDirection::forward,
                ActuatorPriority::manual,
                "operator",
                "history_capacity",
                0U,
            })
            .ok(),
        "bounded history start command should be accepted",
        failures);
    motor_service_test_support::expect_true(harness.service.tick(0U).ok(), "bounded history start tick should succeed", failures);
    motor_service_test_support::expect_true(harness.service.stop_motor("motor1", 1000U, "operator", "history_stop").ok(), "bounded history stop command should succeed", failures);
    motor_service_test_support::expect_true(harness.service.tick(2000U).ok(), "bounded history stop tick should succeed", failures);
    motor_service_test_support::expect_true(harness.service.tick(3000U).ok(), "bounded history settle tick should succeed", failures);

    const auto history_result = harness.service.read_history("motor1");
    motor_service_test_support::expect_true(history_result.ok(), "bounded history should be readable", failures);
    if (history_result.ok()) {
      const auto& entries = *history_result.value;
      motor_service_test_support::expect_true(entries.size() == 4U, "history should drop oldest entries at capacity", failures);
      if (!entries.empty()) {
        motor_service_test_support::expect_true(entries.front().sequence_number > 1U, "drop-oldest policy should discard early events first", failures);
      }
    }
  }

  if (failures != 0) {
    std::cerr << "test_motor_service_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_motor_service_history passed\n";
  return 0;
}
