#include <iostream>

#include "sequence_test_support.hpp"

int main() {
  using namespace sequence_test;

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "stop context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));

    expect_true(context.sequence_service.register_program(program).ok(), "register stop program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start stop program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick into run");
    expect_true(context.sequence_service.request_normal_stop(2U, "test", "stop request").ok(), "request normal stop");
    expect_true(context.sequence_service.tick(3U).ok(), "tick stop branch");

    const auto stop_snapshot = context.sequence_service.get_active_snapshot(3U);
    expect_true(
        stop_snapshot.ok() && stop_snapshot.value->current_state_id == std::optional<std::string>{"stop"},
        "normal stop request should branch to normal stop state");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "trip context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));

    expect_true(context.sequence_service.register_program(program).ok(), "register trip program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start trip program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick into run");
    expect_true(context.sequence_service.request_trip_stop(2U, "test", "trip request").ok(), "request trip");
    expect_true(context.sequence_service.tick(3U).ok(), "tick trip branch");

    const auto trip_snapshot = context.sequence_service.get_active_snapshot(3U);
    expect_true(
        trip_snapshot.ok() && trip_snapshot.value->current_state_id == std::optional<std::string>{"trip"},
        "trip request should branch to trip state");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "override context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));

    expect_true(context.sequence_service.register_program(program).ok(), "register override program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start override program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick into run");
    expect_true(context.sequence_service.request_normal_stop(2U, "test", "normal stop").ok(), "request normal stop");
    expect_true(context.sequence_service.request_trip_stop(2U, "test", "trip").ok(), "request trip after stop");
    expect_true(context.sequence_service.tick(3U).ok(), "tick override branch");

    const auto override_snapshot = context.sequence_service.get_active_snapshot(3U);
    expect_true(
        override_snapshot.ok() && override_snapshot.value->current_state_id == std::optional<std::string>{"trip"},
        "trip request should override normal stop request");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "lockout context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));

    expect_true(context.sequence_service.register_program(program).ok(), "register lockout program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start lockout program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick into run");

    const auto active_start_denied = context.sequence_service.start_program("pump1", 2U, "test", "duplicate");
    expect_true(
        !active_start_denied.ok() &&
            active_start_denied.status.code == controller::sequence::SequenceErrorCode::sequence_active_program_exists,
        "start should be denied while another program is active");

    expect_true(context.sequence_service.request_trip_stop(3U, "test", "trip").ok(), "request trip");
    expect_true(context.sequence_service.tick(4U).ok(), "tick into trip");
    expect_true(context.sequence_service.tick(5U).ok(), "tick into lockout");

    const auto lockout_snapshot = context.sequence_service.get_active_snapshot(5U);
    expect_true(
        lockout_snapshot.ok() &&
            lockout_snapshot.value->current_state_id == std::optional<std::string>{"lockout"} &&
            lockout_snapshot.value->lifecycle == controller::sequence::SequenceLifecycle::lockout,
        "entering lockout should set lifecycle lockout");

    const auto lockout_start_denied = context.sequence_service.start_program("pump1", 6U, "test", "while lockout");
    expect_true(
        !lockout_start_denied.ok() &&
            lockout_start_denied.status.code == controller::sequence::SequenceErrorCode::sequence_lockout_active,
        "start should be denied while lockout is active");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_service_stop_trip failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_stop_trip passed\n";
  return 0;
}
