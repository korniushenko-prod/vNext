#include <iostream>

#include "logic_test_support.hpp"

using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::logic::LogicErrorCode;
using controller::signals::SignalValue;

int main() {
  using namespace logic_test;

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for validation failures");

    auto invalid_placement = make_rule("rule.invalid_placement", "cond.a");
    invalid_placement.on_true_actions.push_back(relay_action("bad_relay", "relay.main", controller::hal::RelayState::on));
    expect_true(!context.logic_service.register_rule(invalid_placement).ok(), "invalid action placement should be rejected");

    auto invalid_tree = make_rule("rule.invalid_tree", "cond.a");
    invalid_tree.condition_tree = controller::conditions::ConditionTree{
        "bad_tree",
        "root",
        {ConditionNode{{"root", "root", "", ConditionNodeKind::all, 0U, 0U, std::nullopt}, ConditionGroupNode{{"missing"}}}},
    };
    expect_true(!context.logic_service.register_rule(invalid_tree).ok(), "invalid condition tree should be rejected");

    auto unknown_targets = make_rule("rule.unknown_targets", "cond.a");
    unknown_targets.while_true_actions.push_back(relay_action("missing_relay", "relay.unknown", controller::hal::RelayState::on));
    unknown_targets.on_true_actions.push_back(timer_start_action("missing_timer", "timer.unknown"));
    unknown_targets.on_true_actions.push_back(alarm_action("missing_alarm", "alarm.unknown", true));
    unknown_targets.on_true_actions.push_back(program_start_action("missing_program", "program.unknown"));
    unknown_targets.on_true_actions.push_back(virtual_signal_action("missing_signal", "virtual.unknown", SignalValue{true}));
    expect_true(!context.logic_service.register_rule(unknown_targets).ok(), "unknown references should be rejected by validator");

    auto readonly_write = make_rule("rule.readonly_write", "cond.a");
    readonly_write.on_true_actions.push_back(virtual_signal_action("readonly_write", "readonly.flag", SignalValue{true}));
    expect_true(!context.logic_service.register_rule(readonly_write).ok(), "non-writable virtual signal path should be rejected");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for evaluation error");

    auto error_rule = make_rule("rule.eval_error", "missing.signal");
    error_rule.while_true_actions.push_back(relay_action("relay_on", "relay.main", controller::hal::RelayState::on));

    expect_true(context.logic_service.register_rule(error_rule).ok(), "register rule with runtime-evaluated missing signal");
    const auto tick_result = context.logic_service.tick(10U);
    expect_true(!tick_result.ok(), "condition evaluation error should surface");
    expect_true(
        tick_result.status.code == LogicErrorCode::logic_condition_evaluation_error,
        "condition evaluation errors should map to logic_condition_evaluation_error");

    const auto snapshot = context.logic_service.get_snapshot("rule.eval_error");
    expect_true(snapshot.ok() && !snapshot.value->active, "evaluation error should be treated as false");
    expect_true(
        snapshot.ok() && snapshot.value->last_error.has_value(),
        "evaluation error should be recorded in the snapshot");

    const auto history = context.logic_service.read_history();
    expect_true(
        !history.empty() && history.back().event_type == controller::logic::RuleEventType::evaluation_error,
        "evaluation error should be recorded in history");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for not found results");

    const auto missing_rule = context.logic_service.get_rule("rule.missing");
    expect_true(
        !missing_rule.ok() && missing_rule.status.code == LogicErrorCode::logic_rule_not_found,
        "reading missing rule should surface structured not found result");

    const auto missing_snapshot = context.logic_service.get_snapshot("rule.missing");
    expect_true(
        !missing_snapshot.ok() && missing_snapshot.status.code == LogicErrorCode::logic_rule_not_found,
        "reading missing snapshot should surface structured not found result");
  }

  if (failures != 0) {
    std::cerr << "test_logic_service_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_errors passed\n";
  return 0;
}
