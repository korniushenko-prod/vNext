#include <iostream>

#include "rules_api_test_support.hpp"

using controller::hal::RelayState;
using controller::signals::SignalValue;

int main() {
  using namespace rules_api_test;

  RulesApiTestContext context;
  expect_true(context.initialize(), "rules api list context should initialize");

  auto inactive_rule = make_rule("rule.inactive", "cond.a");
  auto active_rule = make_rule("rule.active", "cond.b");
  active_rule.while_true_actions.push_back(relay_action("hold_main", "relay.main", RelayState::on, "hold main"));
  auto disabled_rule = make_rule("rule.disabled", "cond.c");
  disabled_rule.while_true_actions.push_back(relay_action("hold_alt", "relay.alt", RelayState::on, "hold alt"));
  auto error_rule = make_rule("rule.error", "missing.signal");

  expect_true(context.logic.logic_service.register_rule(inactive_rule).ok(), "register inactive rule");
  expect_true(context.logic.logic_service.register_rule(active_rule).ok(), "register active rule");
  expect_true(context.logic.logic_service.register_rule(disabled_rule).ok(), "register disabled rule");
  expect_true(context.logic.logic_service.register_rule(error_rule).ok(), "register error rule");

  expect_true(context.logic.registry.update_signal("cond.b", SignalValue{true}, 10U).ok(), "set cond.b true");
  expect_true(context.logic.registry.update_signal("cond.c", SignalValue{true}, 10U).ok(), "set cond.c true");
  expect_true(!context.logic.logic_service.tick(10U).ok(), "tick should surface the evaluation error rule");
  expect_true(
      context.logic.logic_service.set_rule_enabled("rule.disabled", false, 11U).ok(),
      "disable disabled-rule candidate");

  const auto result = context.api_service.list_rules(20U);
  expect_true(result.ok(), "list_rules should succeed");
  expect_true(result.value->size() == 4U, "list_rules should return every registered rule");
  expect_true((*result.value)[0].id == "rule.inactive", "rule order should stay deterministic");
  expect_true((*result.value)[1].id == "rule.active", "second card should keep registration order");
  expect_true((*result.value)[2].id == "rule.disabled", "third card should keep registration order");
  expect_true((*result.value)[3].id == "rule.error", "fourth card should keep registration order");

  const auto active_card = find_card(*result.value, "rule.active");
  const auto inactive_card = find_card(*result.value, "rule.inactive");
  const auto disabled_card = find_card(*result.value, "rule.disabled");
  const auto error_card = find_card(*result.value, "rule.error");

  expect_true(active_card.has_value() && active_card->status == "active", "active rule should map to active card status");
  expect_true(
      inactive_card.has_value() && inactive_card->status == "inactive",
      "inactive rule should map to inactive card status");
  expect_true(
      disabled_card.has_value() && disabled_card->status == "disabled",
      "disabled rule should map to disabled card status");
  expect_true(error_card.has_value() && error_card->status == "error", "evaluation errors should map to error card status");
  expect_true(active_card.has_value() && !active_card->if_summary.empty(), "if summary should be present");
  expect_true(active_card.has_value() && !active_card->then_summary.empty(), "then summary should be present");
  expect_true(
      disabled_card.has_value() && !disabled_card->then_summary.empty(),
      "cards should keep summaries even when the rule is disabled");

  if (failures != 0) {
    std::cerr << "test_rules_api_list failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_rules_api_list passed\n";
  return 0;
}
