#include <iostream>

#include "sequence_test_support.hpp"

int main() {
  using namespace sequence_test;

  SequenceTestContext context;
  expect_true(context.initialize(), "reset context should initialize");

  auto program = make_basic_program();
  program.states[0].transitions.clear();
  program.states[0].transitions.push_back(transition("to_run", "run"));

  expect_true(context.sequence_service.register_program(program).ok(), "register reset program");
  expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start reset program");
  expect_true(context.sequence_service.tick(1U).ok(), "tick to run");
  expect_true(context.sequence_service.request_trip_stop(2U, "test", "trip").ok(), "request trip");
  expect_true(context.sequence_service.tick(3U).ok(), "tick to trip");
  expect_true(context.sequence_service.tick(4U).ok(), "tick to lockout");

  const auto denied_reset = context.sequence_service.reset_active_program(5U, "test", "reset denied");
  expect_true(
      !denied_reset.ok() &&
          denied_reset.status.code == controller::sequence::SequenceErrorCode::sequence_reset_denied,
      "reset should be denied while reset_condition is false");

  const auto denied_history = context.sequence_service.read_history();
  expect_true(!denied_history.empty(), "history should exist after denied reset");
  expect_true(
      denied_history.back().event_type == controller::sequence::SequenceEventType::reset_denied,
      "reset denied history entry should be created");

  expect_true(context.registry.update_signal("permit.reset", controller::signals::SignalValue{true}, 6U).ok(), "allow reset");
  expect_true(context.sequence_service.tick(6U).ok(), "tick lockout to republish can_reset");

  const auto reset_result = context.sequence_service.reset_active_program(7U, "test", "reset ok");
  expect_true(reset_result.ok(), "reset should succeed when lockout and reset_condition are true");

  const auto active_signal = context.registry.read_bool("program.active", 7U);
  const auto pending_trip_signal = context.registry.read_bool("program.pump1.pending_trip", 7U);
  expect_true(active_signal.ok() && !active_signal.value.value(), "reset should clear active program");
  expect_true(pending_trip_signal.ok() && !pending_trip_signal.value.value(), "reset should clear pending flags");

  const auto history = context.sequence_service.read_history();
  expect_true(!history.empty(), "history should exist after reset");
  expect_true(
      history.back().event_type == controller::sequence::SequenceEventType::reset,
      "reset history entry should be created");

  if (failures != 0) {
    std::cerr << "test_sequence_service_reset failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_reset passed\n";
  return 0;
}
