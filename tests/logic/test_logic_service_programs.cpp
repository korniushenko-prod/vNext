#include <iostream>
#include <optional>

#include "logic_test_support.hpp"

using controller::sequence::SequenceLifecycle;
using controller::signals::SignalValue;

int main() {
  using namespace logic_test;

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for program start");

    auto rule = make_rule("rule.program_start", "cond.a");
    rule.on_true_actions.push_back(program_start_action("start_program", "program.main"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register program start rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should delegate program_start");

    const auto snapshot = context.sequence_service.get_active_snapshot(10U);
    expect_true(
        snapshot.ok() && snapshot.value->active_program_id == std::optional<std::string>{"program.main"},
        "program_start action should delegate to SequenceService");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for normal stop");
    expect_true(context.sequence_service.start_program("program.main", 5U, "test", "direct start").ok(), "start program directly");

    auto rule = make_rule("rule.stop", "cond.a");
    rule.on_true_actions.push_back(program_normal_stop_action("request_stop"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register normal stop rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should request normal stop");

    const auto snapshot = context.sequence_service.get_active_snapshot(10U);
    expect_true(
        snapshot.ok() && snapshot.value->pending_normal_stop,
        "program_request_normal_stop should delegate to SequenceService");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for trip");
    expect_true(context.sequence_service.start_program("program.main", 5U, "test", "direct start").ok(), "start program directly");

    auto rule = make_rule("rule.trip", "cond.a");
    rule.on_true_actions.push_back(program_trip_action("request_trip"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register trip rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should request trip");

    const auto snapshot = context.sequence_service.get_active_snapshot(10U);
    expect_true(
        snapshot.ok() && snapshot.value->pending_trip,
        "program_request_trip should delegate to SequenceService");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for reset");
    expect_true(context.sequence_service.start_program("program.main", 5U, "test", "direct start").ok(), "start program directly");
    expect_true(context.sequence_service.request_trip_stop(6U, "test", "trip").ok(), "request trip directly");
    expect_true(context.sequence_service.tick(7U).ok(), "tick sequence to trip");
    expect_true(context.sequence_service.tick(8U).ok(), "tick sequence to lockout");

    auto rule = make_rule("rule.reset", "cond.a");
    rule.on_true_actions.push_back(program_reset_action("reset_active"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register reset rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should reset active program");

    const auto snapshots = context.sequence_service.list_program_snapshots(10U);
    expect_true(
        !snapshots.empty() && snapshots.front().lifecycle == SequenceLifecycle::idle &&
            !snapshots.front().active_program_id.has_value(),
        "program_reset_active should delegate when reset is allowed");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for program failure");

    auto rule = make_rule("rule.program_fail", "cond.a");
    rule.on_true_actions.push_back(program_trip_action("trip_without_program"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register failing program rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");

    const auto tick_result = context.logic_service.tick(10U);
    expect_true(!tick_result.ok(), "program action failures should surface structured results");
    expect_true(
        tick_result.status.code == controller::logic::LogicErrorCode::logic_sequence_action_failed,
        "program action failure should use logic_sequence_action_failed");
  }

  if (failures != 0) {
    std::cerr << "test_logic_service_programs failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_programs passed\n";
  return 0;
}
