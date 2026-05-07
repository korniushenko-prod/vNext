#include <iostream>

#include "rules_api_test_support.hpp"

using controller::signals::SignalValue;

int main() {
  using namespace rules_api_test;

  RulesApiTestContext context;
  expect_true(context.initialize(), "rules api editor context should initialize");

  auto rule = make_editor_rule();
  expect_true(context.logic.logic_service.register_rule(rule).ok(), "register editor rule");
  expect_true(context.logic.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
  expect_true(
      context.logic.registry.write_virtual_signal("virtual.flag", SignalValue{true}, 10U).ok(),
      "initialize virtual flag for trace");
  expect_true(context.logic.logic_service.tick(10U).ok(), "tick editor rule to populate trace");

  const auto detail = context.api_service.get_rule("rule.editor", 20U);
  expect_true(detail.ok(), "get_rule should return typed detail dto");
  expect_true(detail.value->metadata.id == "rule.editor", "detail metadata should expose rule id");
  expect_true(detail.value->draft.on_true_actions.size() == 2U, "detail should include on_true actions");
  expect_true(
      !detail.value->current_condition_trace.empty(),
      "detail should include the current condition trace");
  expect_true(
      detail.value->current_status.status == "active",
      "detail status should reflect the current active state");

  const auto catalog = context.api_service.get_rule_editor_catalog(20U);
  expect_true(catalog.ok(), "editor catalog should load");
  expect_true(!catalog.value->signals.empty(), "catalog should include signals");
  expect_true(!catalog.value->relay_targets.empty(), "catalog should include relay targets");
  expect_true(!catalog.value->pwm_targets.empty(), "catalog should include pwm targets");
  expect_true(!catalog.value->timers.empty(), "catalog should include timers");
  expect_true(!catalog.value->alarms.empty(), "catalog should include alarms");
  expect_true(!catalog.value->programs.empty(), "catalog should include programs");
  expect_true(
      catalog.value->writable_virtual_signals.size() >= 4U,
      "catalog should include writable virtual signal paths");

  if (failures != 0) {
    std::cerr << "test_rules_api_editor failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_rules_api_editor passed\n";
  return 0;
}
