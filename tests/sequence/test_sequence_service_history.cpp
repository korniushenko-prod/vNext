#include <iostream>

#include "sequence_test_support.hpp"

int main() {
  using namespace sequence_test;

  {
    SequenceTestContext context(3U);
    expect_true(context.initialize(), "history context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));

    expect_true(context.sequence_service.register_program(program).ok(), "register history program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start history program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick to run");
    expect_true(context.sequence_service.request_normal_stop(2U, "test", "stop").ok(), "request stop");
    expect_true(context.sequence_service.tick(3U).ok(), "tick to stop");

    const auto history = context.sequence_service.read_history();
    expect_true(history.size() == 3U, "bounded max history policy should drop oldest entries");
    expect_true(history.front().sequence_number < history.back().sequence_number, "history order should remain deterministic");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "full history context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));

    expect_true(context.sequence_service.register_program(program).ok(), "register full history program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start full history program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick to run");
    expect_true(context.sequence_service.request_trip_stop(2U, "test", "trip").ok(), "request trip");
    expect_true(context.sequence_service.tick(3U).ok(), "tick to trip");
    expect_true(context.sequence_service.tick(4U).ok(), "tick to lockout");
    expect_true(context.registry.update_signal("permit.reset", controller::signals::SignalValue{true}, 5U).ok(), "allow reset");
    expect_true(context.sequence_service.tick(5U).ok(), "tick for reset publication");
    expect_true(context.sequence_service.reset_active_program(6U, "test", "reset").ok(), "reset active program");

    const auto history = context.sequence_service.read_history();
    bool saw_start = false;
    bool saw_transition = false;
    bool saw_trip_request = false;
    bool saw_reset = false;
    for (const auto& entry : history) {
      saw_start = saw_start || entry.event_type == controller::sequence::SequenceEventType::program_started;
      saw_transition = saw_transition || entry.event_type == controller::sequence::SequenceEventType::transition_taken;
      saw_trip_request = saw_trip_request || entry.event_type == controller::sequence::SequenceEventType::trip_requested;
      saw_reset = saw_reset || entry.event_type == controller::sequence::SequenceEventType::reset;
    }

    expect_true(saw_start, "history entries should include start");
    expect_true(saw_transition, "history entries should include transition");
    expect_true(saw_trip_request, "history entries should include trip request");
    expect_true(saw_reset, "history entries should include reset");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_service_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_history passed\n";
  return 0;
}
