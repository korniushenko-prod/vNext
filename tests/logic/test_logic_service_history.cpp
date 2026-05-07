#include <iostream>

#include "logic_test_support.hpp"

using controller::logic::RuleEventType;
using controller::signals::SignalValue;

int main() {
  using namespace logic_test;

  {
    LogicTestContext context(3U);
    expect_true(context.initialize(), "context should initialize for history transitions");

    auto rule = make_rule("rule.history", "cond.a");
    rule.on_true_actions.push_back(note_action("note_true", "rule turned on"));
    rule.on_false_actions.push_back(program_trip_action("fail_without_program"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register history rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should create rule_became_true and command_executed history");

    expect_true(context.registry.update_signal("cond.a", SignalValue{false}, 20U).ok(), "set cond.a false");
    expect_true(!context.logic_service.tick(20U).ok(), "tick should create command_failed history");

    const auto history = context.logic_service.read_history();
    expect_true(history.size() == 3U, "history should use bounded drop-oldest policy");
    expect_true(history.front().event_type == RuleEventType::command_executed, "oldest entry should be dropped deterministically");
    expect_true(history[1].event_type == RuleEventType::rule_became_false, "false transition should be recorded");
    expect_true(history[2].event_type == RuleEventType::command_failed, "command failure should be recorded");
    expect_true(
        history[0].sequence_number < history[1].sequence_number && history[1].sequence_number < history[2].sequence_number,
        "history ordering should remain deterministic");
  }

  if (failures != 0) {
    std::cerr << "test_logic_service_history failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_history passed\n";
  return 0;
}
