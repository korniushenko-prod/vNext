#include <iostream>
#include <variant>

#include "rules_api_test_support.hpp"

using controller::actuators::RelayEffectiveState;
using controller::hal::RelayState;
using controller::signals::SignalValue;

int main() {
  using namespace rules_api_test;

  {
    RulesApiTestContext context;
    expect_true(context.initialize(), "rules api create/update context should initialize");

    auto created_rule = make_editor_rule("rule.mutable");
    const auto create_result = context.api_service.create_rule(created_rule, make_command_context(1U, "ui", "create rule"));
    expect_true(create_result.accepted, "create_rule should accept a valid draft");
    expect_true(context.logic.logic_service.has_rule("rule.mutable"), "create_rule should register the rule");

    expect_true(context.logic.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(
        context.logic.registry.write_virtual_signal("virtual.flag", SignalValue{true}, 10U).ok(),
        "initialize virtual flag before update");
    expect_true(context.logic.logic_service.tick(10U).ok(), "tick created rule active");

    const auto active_snapshot = context.logic.actuator_manager.get_snapshot("relay.main");
    expect_true(
        active_snapshot.ok() &&
            std::get<RelayEffectiveState>(active_snapshot.value->effective).state == RelayState::on &&
            active_snapshot.value->owner == "rule:rule.mutable",
        "created rule should own relay.main while active");

    auto replacement = make_editor_rule("rule.mutable");
    replacement.while_true_actions.clear();
    replacement.while_true_actions.push_back(relay_action("hold_alt", "relay.alt", RelayState::on, "hold alt"));
    const auto update_result =
        context.api_service.update_rule("rule.mutable", replacement, make_command_context(12U, "ui", "replace rule"));
    expect_true(update_result.accepted, "update_rule should replace the existing rule");

    const auto relay_main_after_replace = context.logic.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_main_after_replace.ok() && relay_main_after_replace.value->owner == "safe_fallback",
        "replacing an active rule should clear its owned requests before the new draft runs");

    expect_true(context.logic.logic_service.tick(13U).ok(), "tick replaced rule");
    const auto relay_alt_after_tick = context.logic.actuator_manager.get_snapshot("relay.alt");
    expect_true(
        relay_alt_after_tick.ok() &&
            std::get<RelayEffectiveState>(relay_alt_after_tick.value->effective).state == RelayState::on &&
            relay_alt_after_tick.value->owner == "rule:rule.mutable",
        "updated rule should own the replacement output on the next tick");
  }

  {
    RulesApiTestContext context;
    expect_true(context.initialize(), "rules api delete/enable context should initialize");

    auto rule = make_rule("rule.toggle", "cond.a");
    rule.while_true_actions.push_back(relay_action("hold_main", "relay.main", RelayState::on, "hold main"));
    expect_true(context.api_service.create_rule(rule, make_command_context(1U)).accepted, "create toggle rule");
    expect_true(context.logic.registry.update_signal("cond.a", SignalValue{true}, 5U).ok(), "set cond.a true");
    expect_true(context.logic.logic_service.tick(5U).ok(), "tick toggle rule active");

    const auto disable_result =
        context.api_service.set_rule_enabled("rule.toggle", false, make_command_context(6U, "ui", "disable"));
    expect_true(disable_result.accepted, "set_rule_enabled(false) should succeed");
    const auto relay_after_disable = context.logic.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_after_disable.ok() && relay_after_disable.value->owner == "safe_fallback",
        "disabling an active rule should clear owned requests");

    const auto enable_result =
        context.api_service.set_rule_enabled("rule.toggle", true, make_command_context(7U, "ui", "enable"));
    expect_true(enable_result.accepted, "set_rule_enabled(true) should succeed");

    const auto delete_result = context.api_service.delete_rule("rule.toggle", make_command_context(8U, "ui", "delete"));
    expect_true(delete_result.accepted, "delete_rule should remove a registered rule");
    expect_true(!context.logic.logic_service.has_rule("rule.toggle"), "delete_rule should remove the rule record");
    const auto relay_after_delete = context.logic.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_after_delete.ok() && relay_after_delete.value->owner == "safe_fallback",
        "deleting a rule should leave outputs in safe fallback");
  }

  if (failures != 0) {
    std::cerr << "test_rules_api_mutations failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_rules_api_mutations passed\n";
  return 0;
}
