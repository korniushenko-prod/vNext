#include <iostream>

#include "sequence_test_support.hpp"

using controller::hal::RelayState;

int main() {
  using namespace sequence_test;

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "transition context should initialize");

    auto program = make_basic_program();
    program.states[0].min_time_ms = 100U;
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(
        transition("to_run", "run", make_bool_signal_tree("ready_tree", "transition.ready", true), true));

    expect_true(context.sequence_service.register_program(program).ok(), "register transition program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start transition program");

    expect_true(context.registry.update_signal("transition.ready", controller::signals::SignalValue{true}, 50U).ok(), "set ready at 50ms");
    expect_true(context.sequence_service.tick(50U).ok(), "tick at 50ms");

    const auto blocked_snapshot = context.sequence_service.get_active_snapshot(50U);
    expect_true(blocked_snapshot.ok(), "snapshot at 50ms");
    expect_true(
        blocked_snapshot.ok() && blocked_snapshot.value->current_state_id == std::optional<std::string>{"start"},
        "min_time should block transition before elapsed");
    expect_true(
        blocked_snapshot.ok() && !blocked_snapshot.value->transition_candidates.empty() &&
            !blocked_snapshot.value->transition_candidates.front().eligible &&
            !blocked_snapshot.value->transition_candidates.front().min_time_satisfied,
        "transition candidate checklist should show blocked transition");

    expect_true(context.sequence_service.tick(100U).ok(), "tick at 100ms");
    const auto run_snapshot = context.sequence_service.get_active_snapshot(100U);
    expect_true(
        run_snapshot.ok() && run_snapshot.value->current_state_id == std::optional<std::string>{"run"},
        "transition by condition should move to run after min_time");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "timeout context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].max_time_ms = 25U;
    program.states[0].timeout_target_state_id = "trip";

    expect_true(context.sequence_service.register_program(program).ok(), "register timeout program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start timeout program");
    expect_true(context.sequence_service.tick(30U).ok(), "tick timeout program");

    const auto timeout_snapshot = context.sequence_service.get_active_snapshot(30U);
    expect_true(
        timeout_snapshot.ok() && timeout_snapshot.value->current_state_id == std::optional<std::string>{"trip"},
        "timeout should transition to trip state");
  }

  {
    SequenceTestContext context;
    expect_true(context.initialize(), "guard context should initialize");

    auto program = make_basic_program();
    program.states[0].transitions.clear();
    program.states[0].transitions.push_back(transition("to_run", "run"));
    program.states[1].guard_condition = make_bool_signal_tree("guard_tree", "guard.ok", true);
    program.states[1].guard_fail_target_state_id = "trip";

    expect_true(context.sequence_service.register_program(program).ok(), "register guard program");
    expect_true(context.sequence_service.start_program("pump1", 0U, "test", "start").ok(), "start guard program");
    expect_true(context.sequence_service.tick(1U).ok(), "tick into run");
    expect_true(context.registry.update_signal("guard.ok", controller::signals::SignalValue{false}, 2U).ok(), "drop guard");
    expect_true(context.sequence_service.tick(2U).ok(), "tick guard failure");

    const auto trip_snapshot = context.sequence_service.get_active_snapshot(2U);
    expect_true(
        trip_snapshot.ok() && trip_snapshot.value->current_state_id == std::optional<std::string>{"trip"},
        "guard failure should branch to trip");
    expect_true(
        trip_snapshot.ok() && !trip_snapshot.value->last_guard_trace.empty(),
        "guard trace should be preserved in snapshot");
  }

  if (failures != 0) {
    std::cerr << "test_sequence_service_transitions failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_sequence_service_transitions passed\n";
  return 0;
}
