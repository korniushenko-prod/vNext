#include <iostream>

#include "sequence_test_support.hpp"

int main() {
  using namespace sequence_test;

  SequenceTestContext context;
  expect_true(context.initialize(), "signals context should initialize");

  auto program = make_basic_program();
  program.states[0].transitions.clear();

  expect_true(context.sequence_service.register_program(program).ok(), "register signal program");

  const auto initial_can_start = context.registry.read_bool("program.pump1.can_start", 0U);
  expect_true(initial_can_start.ok() && initial_can_start.value.value(), "can_start should be true before start");

  expect_true(context.sequence_service.start_program("pump1", 10U, "test", "start").ok(), "start signal program");
  expect_true(context.sequence_service.tick(25U).ok(), "tick for elapsed");

  const auto global_active = context.registry.read_bool("program.active", 25U);
  const auto lifecycle = context.registry.read_string("program.lifecycle", 25U);
  const auto current_state = context.registry.read_string("program.pump1.current_state", 25U);
  const auto state_elapsed = context.registry.read_int64("program.pump1.state_elapsed_ms", 25U);
  expect_true(global_active.ok() && global_active.value.value(), "global program.active should be published");
  expect_true(lifecycle.ok() && !lifecycle.value.value().empty(), "global lifecycle should be published");
  expect_true(current_state.ok() && current_state.value.value() == "start", "per-program current_state should be published");
  expect_true(state_elapsed.ok() && state_elapsed.value.value() == 15, "state_elapsed_ms should update with now_ms");

  expect_true(context.sequence_service.request_trip_stop(30U, "test", "trip").ok(), "request trip");
  expect_true(context.sequence_service.tick(31U).ok(), "tick to trip");
  expect_true(context.sequence_service.tick(32U).ok(), "tick to lockout");

  const auto can_reset_before = context.registry.read_bool("program.pump1.can_reset", 32U);
  expect_true(can_reset_before.ok() && !can_reset_before.value.value(), "can_reset should be false while reset_condition is false");

  expect_true(context.registry.update_signal("permit.reset", controller::signals::SignalValue{true}, 33U).ok(), "allow reset");
  expect_true(context.sequence_service.tick(33U).ok(), "tick lockout to republish reset state");

  const auto can_reset_after = context.registry.read_bool("program.pump1.can_reset", 33U);
  expect_true(can_reset_after.ok() && can_reset_after.value.value(), "can_reset should become true when reset_condition is true");

  if (failures != 0) {
    std::cerr << "test_sequence_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_signals passed\n";
  return 0;
}
