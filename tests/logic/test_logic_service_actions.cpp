#include <iostream>

#include "logic_test_support.hpp"

using controller::signals::SignalValue;

int main() {
  using namespace logic_test;

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for timer actions");

    auto rule = make_rule("rule.timer", "cond.a");
    rule.on_true_actions.push_back(timer_start_action("start_timer", "timer.main"));
    rule.on_false_actions.push_back(timer_stop_action("stop_timer", "timer.main"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register timer rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should start timer");

    const auto started = context.timer_service.get_snapshot("timer.main", 10U);
    expect_true(started.ok() && started.value->armed, "on_true timer_start should execute once");

    expect_true(context.logic_service.tick(11U).ok(), "second tick should not restart timer");
    const auto still_started = context.timer_service.get_snapshot("timer.main", 11U);
    expect_true(still_started.ok() && still_started.value->armed, "timer should stay armed while rule remains active");

    expect_true(context.registry.update_signal("cond.a", SignalValue{false}, 20U).ok(), "set cond.a false");
    expect_true(context.logic_service.tick(20U).ok(), "tick should stop timer");

    const auto stopped = context.timer_service.get_snapshot("timer.main", 20U);
    expect_true(stopped.ok() && !stopped.value->armed, "on_false timer_stop should execute once");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for alarm and signal actions");

    auto rule = make_rule("rule.command", "cond.a");
    rule.on_true_actions.push_back(alarm_action("set_alarm", "alarm.main", true));
    rule.on_true_actions.push_back(virtual_signal_action("set_virtual", "virtual.flag", SignalValue{true}));

    expect_true(context.logic_service.register_rule(rule).ok(), "register command rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should execute alarm and virtual signal actions");

    const auto alarm_snapshot = context.alarm_service.get_snapshot("alarm.main");
    expect_true(alarm_snapshot.ok() && alarm_snapshot.value->state.condition_active, "alarm_set_condition should execute");

    const auto virtual_signal = context.registry.read_bool("virtual.flag", 10U);
    expect_true(virtual_signal.ok() && virtual_signal.value.value(), "write_virtual_signal should execute for writable_virtual");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for command failure");

    auto rule = make_rule("rule.fail_stop", "cond.a");
    rule.on_true_actions.push_back(program_normal_stop_action("stop_without_program"));
    rule.on_true_actions.push_back(timer_start_action("should_not_run", "timer.main"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register failure rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");

    const auto tick_result = context.logic_service.tick(10U);
    expect_true(!tick_result.ok(), "command action failure should surface structured result");
    expect_true(
        tick_result.status.code == controller::logic::LogicErrorCode::logic_sequence_action_failed,
        "program request failure should map to logic_sequence_action_failed");

    const auto timer_snapshot = context.timer_service.get_snapshot("timer.main", 10U);
    expect_true(
        timer_snapshot.ok() && !timer_snapshot.value->armed,
        "later actions in the same section should not execute after a failure");
  }

  if (failures != 0) {
    std::cerr << "test_logic_service_actions failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_actions passed\n";
  return 0;
}
