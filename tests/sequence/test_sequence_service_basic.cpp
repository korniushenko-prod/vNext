#include <iostream>

#include "sequence_test_support.hpp"

using controller::hal::RelayState;
using controller::sequence::SequenceStateType;

int main() {
  using namespace sequence_test;

  SequenceTestContext context;
  expect_true(context.initialize(), "test context should initialize");

  auto program = make_basic_program();
  program.states.front().entry_actions.push_back(timer_start_action("start_timer", "timer.sequence"));
  program.states[1].active_actions = {relay_action("run_relay", "relay.main", RelayState::on, "run relay")};
  program.states[1].type = SequenceStateType::run;

  expect_true(context.sequence_service.register_program(program).ok(), "register valid program");
  expect_true(
      !context.sequence_service.register_program(program).ok(),
      "duplicate program id should be rejected");

  const auto start_result = context.sequence_service.start_program("pump1", 10U, "test", "basic start");
  expect_true(start_result.ok(), "start program should succeed");

  const auto snapshot = context.sequence_service.get_active_snapshot(10U);
  expect_true(snapshot.ok(), "active snapshot should be available");
  expect_true(snapshot.ok() && snapshot.value->current_state_id == std::optional<std::string>{"start"}, "initial state should be entered");

  const auto timer_snapshot = context.timer_service.get_snapshot("timer.sequence", 10U);
  expect_true(timer_snapshot.ok() && timer_snapshot.value->armed, "entry actions should be applied");

  const auto active_signal = context.registry.read_bool("program.active", 10U);
  const auto active_id_signal = context.registry.read_string("program.active_id", 10U);
  const auto current_state_signal = context.registry.read_string("program.pump1.current_state", 10U);
  expect_true(active_signal.ok() && active_signal.value.value(), "global active signal should be published");
  expect_true(active_id_signal.ok() && active_id_signal.value.value() == "pump1", "global active_id signal should be published");
  expect_true(
      current_state_signal.ok() && current_state_signal.value.value() == "start",
      "per-program current_state signal should be published");

  if (failures != 0) {
    std::cerr << "test_sequence_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_basic passed\n";
  return 0;
}
