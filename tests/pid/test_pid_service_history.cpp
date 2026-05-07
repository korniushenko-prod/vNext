#include <iostream>
#include <string>
#include <vector>

#include "pid/pid_service.hpp"
#include "pid_service_test_support.hpp"

using controller::pid::PidMode;
using controller::pid::PidServiceHistoryEventType;
using controller::pid::PidServiceMode;
using pid_service_test_support::TestHarness;
using pid_service_test_support::expect_true;
using pid_service_test_support::make_descriptor;
using pid_service_test_support::register_double_signal;
using pid_service_test_support::update_double_signal;

namespace {

int failures = 0;

bool contains_event(
    const std::vector<controller::pid::PidServiceHistoryEntry>& entries,
    const PidServiceHistoryEventType event_type) {
  for (const auto& entry : entries) {
    if (entry.event_type == event_type) {
      return true;
    }
  }
  return false;
}

}  // namespace

int main() {
  TestHarness harness(0.0, 100.0, 0.0, 5U);
  register_double_signal(harness.registry, "plant.pv");
  update_double_signal(harness.registry, "plant.pv", 20.0, 100U);

  auto descriptor = make_descriptor();
  descriptor.core_config.mode = PidMode::manual;
  descriptor.core_config.manual_output = 30.0;
  expect_true(harness.service.register_pid(descriptor).ok(), "history controller should register", failures);
  expect_true(harness.service.tick(100U).ok(), "manual output tick should succeed", failures);
  expect_true(harness.service.set_constant_setpoint("loop1", 55.0, 120U).ok(), "setpoint change should succeed", failures);
  expect_true(harness.service.set_requested_mode("loop1", PidServiceMode::auto_mode, 130U).ok(), "mode change should succeed", failures);
  update_double_signal(harness.registry, "plant.pv", 20.0, 200U, true, true);
  expect_true(harness.service.tick(200U).ok(), "fault tick should succeed", failures);

  const auto history_result = harness.service.read_history("loop1");
  expect_true(history_result.ok(), "history should be readable", failures);
  expect_true(
      history_result.ok() && history_result.value->size() == 5U,
      "bounded history should drop the oldest entry when full",
      failures);
  expect_true(
      history_result.ok() && !contains_event(*history_result.value, PidServiceHistoryEventType::registered),
      "drop-oldest policy should evict the registration event first",
      failures);
  expect_true(
      history_result.ok() && contains_event(*history_result.value, PidServiceHistoryEventType::output_requested),
      "history should include output request events",
      failures);
  expect_true(
      history_result.ok() && contains_event(*history_result.value, PidServiceHistoryEventType::setpoint_changed),
      "history should include setpoint changes",
      failures);
  expect_true(
      history_result.ok() && contains_event(*history_result.value, PidServiceHistoryEventType::mode_changed),
      "history should include mode changes",
      failures);
  expect_true(
      history_result.ok() && contains_event(*history_result.value, PidServiceHistoryEventType::fault_entered),
      "history should include runtime fault transitions",
      failures);

  if (history_result.ok() && history_result.value->size() >= 2U) {
    expect_true(
        history_result.value->at(0).sequence_number < history_result.value->at(1).sequence_number,
        "history ordering should remain deterministic and monotonic",
        failures);
  }

  harness.service.clear_history();
  const auto cleared_history = harness.service.read_history("loop1");
  expect_true(cleared_history.ok() && cleared_history.value->empty(), "clear_history should remove all retained entries", failures);

  if (failures != 0) {
    std::cerr << "test_pid_service_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_pid_service_history passed\n";
  return 0;
}
