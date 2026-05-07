#include <iostream>

#include "logic_test_support.hpp"

using controller::signals::SignalValue;

int main() {
  using namespace logic_test;

  LogicTestContext context;
  expect_true(context.initialize(), "context should initialize for signal publication");

  auto rule = make_rule("rule.signals", "cond.a");
  expect_true(context.logic_service.register_rule(rule).ok(), "register signal rule");

  expect_true(context.logic_service.tick(5U).ok(), "initial tick should publish baseline signals");
  auto any_active = context.registry.read_bool("rule.any_active", 5U);
  auto active_count = context.registry.read_int64("rule.active_count", 5U);
  auto enabled = context.registry.read_bool("rule.rule.signals.enabled", 5U);
  auto active = context.registry.read_bool("rule.rule.signals.active", 5U);
  auto activation_count = context.registry.read_int64("rule.rule.signals.activation_count", 5U);
  auto last_reason = context.registry.read_string("rule.rule.signals.last_reason", 5U);

  expect_true(any_active.ok() && !any_active.value.value(), "rule.any_active should publish false when no rules are active");
  expect_true(active_count.ok() && active_count.value.value() == 0, "rule.active_count should publish zero initially");
  expect_true(enabled.ok() && enabled.value.value(), "per-rule enabled signal should publish");
  expect_true(active.ok() && !active.value.value(), "per-rule active signal should publish false initially");
  expect_true(activation_count.ok() && activation_count.value.value() == 0, "activation_count signal should publish zero initially");
  expect_true(last_reason.ok(), "last_reason signal should publish");

  expect_true(context.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
  expect_true(context.logic_service.tick(10U).ok(), "tick should update published rule signals");

  any_active = context.registry.read_bool("rule.any_active", 10U);
  active_count = context.registry.read_int64("rule.active_count", 10U);
  active = context.registry.read_bool("rule.rule.signals.active", 10U);
  activation_count = context.registry.read_int64("rule.rule.signals.activation_count", 10U);

  expect_true(any_active.ok() && any_active.value.value(), "rule.any_active should publish true when any rule is active");
  expect_true(active_count.ok() && active_count.value.value() == 1, "rule.active_count should publish one active rule");
  expect_true(active.ok() && active.value.value(), "per-rule active signal should update with condition state");
  expect_true(activation_count.ok() && activation_count.value.value() == 1, "activation_count signal should update with transitions");

  if (failures != 0) {
    std::cerr << "test_logic_service_signals failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_signals passed\n";
  return 0;
}
