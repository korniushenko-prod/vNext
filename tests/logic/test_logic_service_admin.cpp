#include <iostream>
#include <variant>

#include "logic_test_support.hpp"

using controller::actuators::RelayEffectiveState;
using controller::hal::RelayState;
using controller::signals::SignalValue;

int main() {
  using namespace logic_test;

  {
    LogicTestContext context;
    expect_true(context.initialize(), "logic admin replace context should initialize");

    auto rule = make_rule("rule.replace", "cond.a");
    rule.while_true_actions.push_back(relay_action("hold_main", "relay.main", RelayState::on, "hold main"));
    expect_true(context.logic_service.register_rule(rule).ok(), "register replace rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick replace rule active");

    auto replacement = make_rule("rule.replace", "cond.a");
    replacement.while_true_actions.push_back(relay_action("hold_alt", "relay.alt", RelayState::on, "hold alt"));
    expect_true(context.logic_service.replace_rule("rule.replace", replacement, 12U).ok(), "replace_rule should succeed");

    const auto relay_main_after_replace = context.actuator_manager.get_snapshot("relay.main");
    const auto replace_snapshot = context.logic_service.get_snapshot("rule.replace");
    expect_true(
        relay_main_after_replace.ok() && relay_main_after_replace.value->owner == "safe_fallback",
        "replace_rule should clear owned requests");
    expect_true(
        replace_snapshot.ok() && !replace_snapshot.value->active && replace_snapshot.value->activation_count == 0U,
        "replace_rule should reset runtime state");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "logic admin remove context should initialize");

    auto rule = make_rule("rule.remove", "cond.a");
    rule.while_true_actions.push_back(relay_action("hold_main", "relay.main", RelayState::on, "hold main"));
    expect_true(context.logic_service.register_rule(rule).ok(), "register remove rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick remove rule active");
    expect_true(context.logic_service.remove_rule("rule.remove", 12U).ok(), "remove_rule should succeed");

    const auto relay_after_remove = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_after_remove.ok() && relay_after_remove.value->owner == "safe_fallback",
        "remove_rule should clear owned requests");
    expect_true(!context.logic_service.has_rule("rule.remove"), "remove_rule should erase the rule");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "logic admin enable context should initialize");

    auto rule = make_rule("rule.enable", "cond.a");
    rule.while_true_actions.push_back(relay_action("hold_main", "relay.main", RelayState::on, "hold main"));
    expect_true(context.logic_service.register_rule(rule).ok(), "register enable rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick enable rule active");
    expect_true(context.logic_service.set_rule_enabled("rule.enable", false, 11U).ok(), "disable rule should succeed");

    const auto disabled_snapshot = context.logic_service.get_snapshot("rule.enable");
    const auto relay_after_disable = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        disabled_snapshot.ok() &&
            !disabled_snapshot.value->active &&
            disabled_snapshot.value->activation_count == 0U,
        "disable should reset runtime state");
    expect_true(
        relay_after_disable.ok() && relay_after_disable.value->owner == "safe_fallback",
        "disable should clear owned requests");

    expect_true(context.logic_service.set_rule_enabled("rule.enable", true, 12U).ok(), "re-enable rule should succeed");
    const auto reenabled_snapshot = context.logic_service.get_snapshot("rule.enable");
    expect_true(
        reenabled_snapshot.ok() && !reenabled_snapshot.value->active,
        "re-enable should not auto-fire until the next tick");

    const auto relay_before_next_tick = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_before_next_tick.ok() && relay_before_next_tick.value->owner == "safe_fallback",
        "re-enable should not recreate output ownership before the next evaluation");

    expect_true(context.logic_service.tick(13U).ok(), "tick re-enabled rule");
    const auto relay_after_next_tick = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_after_next_tick.ok() &&
            relay_after_next_tick.value->owner == "rule:rule.enable" &&
            std::get<RelayEffectiveState>(relay_after_next_tick.value->effective).state == RelayState::on,
        "re-enabled rule should fire again on the next tick");
  }

  if (failures != 0) {
    std::cerr << "test_logic_service_admin failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_admin passed\n";
  return 0;
}
