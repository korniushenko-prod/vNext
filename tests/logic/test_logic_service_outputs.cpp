#include <iostream>

#include "logic_test_support.hpp"

using controller::actuators::ActuatorPriority;
using controller::actuators::PwmEffectiveState;
using controller::actuators::RelayEffectiveState;
using controller::hal::RelayState;
using controller::signals::SignalValue;

int main() {
  using namespace logic_test;

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for output actions");

    auto rule = make_rule("rule.outputs", "cond.a");
    rule.while_true_actions.push_back(relay_action("relay_on", "relay.main", RelayState::on, "main relay on"));
    rule.while_true_actions.push_back(pwm_action("pwm_on", "pwm.main", 42.0, true, "main pwm on"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register output rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should apply while_true outputs");

    const auto relay_snapshot = context.actuator_manager.get_snapshot("relay.main");
    const auto pwm_snapshot = context.actuator_manager.get_snapshot("pwm.main");

    expect_true(
        relay_snapshot.ok() && relay_snapshot.value->priority == ActuatorPriority::auto_rule &&
            relay_snapshot.value->owner == "rule:rule.outputs" &&
            std::get<RelayEffectiveState>(relay_snapshot.value->effective).state == RelayState::on,
        "while_true relay_request should create AutoRule request");
    expect_true(
        pwm_snapshot.ok() && pwm_snapshot.value->priority == ActuatorPriority::auto_rule &&
            pwm_snapshot.value->owner == "rule:rule.outputs" &&
            std::get<PwmEffectiveState>(pwm_snapshot.value->effective).enabled &&
            std::get<PwmEffectiveState>(pwm_snapshot.value->effective).duty_percent == 42.0,
        "while_true pwm_request should create AutoRule request");

    expect_true(context.registry.update_signal("cond.a", SignalValue{false}, 20U).ok(), "set cond.a false");
    expect_true(context.logic_service.tick(20U).ok(), "tick should clear outputs when rule becomes inactive");

    const auto relay_cleared = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_cleared.ok() && relay_cleared.value->owner == "safe_fallback",
        "rule inactive should clear owned output requests");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for disable clears");

    auto rule = make_rule("rule.disable", "cond.a");
    rule.while_true_actions.push_back(relay_action("relay_on", "relay.main", RelayState::on, "main relay on"));

    expect_true(context.logic_service.register_rule(rule).ok(), "register disable rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should activate disable rule");
    expect_true(context.logic_service.set_rule_enabled("rule.disable", false, 15U).ok(), "disable rule should succeed");

    const auto relay_snapshot = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_snapshot.ok() && relay_snapshot.value->owner == "safe_fallback",
        "disabled rule should clear owned requests");
  }

  {
    LogicTestContext context;
    expect_true(context.initialize(), "context should initialize for deterministic tie behavior");

    auto alpha = make_rule("alpha.rule", "cond.a");
    auto zeta = make_rule("zeta.rule", "cond.b");
    alpha.while_true_actions.push_back(relay_action("alpha_on", "relay.main", RelayState::on, "alpha on"));
    zeta.while_true_actions.push_back(relay_action("zeta_off", "relay.main", RelayState::off, "zeta off"));

    expect_true(context.logic_service.register_rule(alpha).ok(), "register alpha rule");
    expect_true(context.logic_service.register_rule(zeta).ok(), "register zeta rule");
    expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(context.registry.update_signal("cond.b", SignalValue{true}, 10U).ok(), "set cond.b true");
    expect_true(context.logic_service.tick(10U).ok(), "tick should apply both requests");

    const auto relay_snapshot = context.actuator_manager.get_snapshot("relay.main");
    expect_true(
        relay_snapshot.ok() && relay_snapshot.value->owner == "rule:alpha.rule" &&
            std::get<RelayEffectiveState>(relay_snapshot.value->effective).state == RelayState::on,
        "same-priority rule outputs should remain deterministic through owner tie-break");
  }

  if (failures != 0) {
    std::cerr << "test_logic_service_outputs failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_outputs passed\n";
  return 0;
}
