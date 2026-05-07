#include <iostream>
#include <optional>

#include "logic_test_support.hpp"

int main() {
  using namespace logic_test;

  LogicTestContext context;
  expect_true(context.initialize(), "logic test context should initialize");

  auto rule = make_rule("rule.basic", "cond.a");
  expect_true(context.logic_service.register_rule(rule).ok(), "register valid rule");
  expect_true(!context.logic_service.register_rule(rule).ok(), "duplicate rule id should be rejected");

  expect_true(context.registry.update_signal("cond.a", controller::signals::SignalValue{true}, 10U).ok(), "set cond.a true");
  const auto tick_true = context.logic_service.tick(10U);
  expect_true(tick_true.ok(), "tick with true condition should succeed");

  const auto active_snapshot = context.logic_service.get_snapshot("rule.basic");
  expect_true(active_snapshot.ok() && active_snapshot.value->active, "rule should become active when condition becomes true");
  expect_true(
      active_snapshot.ok() && active_snapshot.value->activation_count == 1U,
      "activation_count should increment on false to true transition");

  const auto tick_true_again = context.logic_service.tick(11U);
  expect_true(tick_true_again.ok(), "second tick with true condition should succeed");

  const auto second_snapshot = context.logic_service.get_snapshot("rule.basic");
  expect_true(
      second_snapshot.ok() && second_snapshot.value->activation_count == 1U,
      "activation_count should not increment while rule stays active");

  expect_true(context.registry.update_signal("cond.a", controller::signals::SignalValue{false}, 20U).ok(), "set cond.a false");
  const auto tick_false = context.logic_service.tick(20U);
  expect_true(tick_false.ok(), "tick with false condition should succeed");

  const auto inactive_snapshot = context.logic_service.get_snapshot("rule.basic");
  expect_true(inactive_snapshot.ok() && !inactive_snapshot.value->active, "rule should become inactive when condition becomes false");

  expect_true(context.registry.update_signal("cond.a", controller::signals::SignalValue{true}, 30U).ok(), "set cond.a true again");
  expect_true(context.logic_service.tick(30U).ok(), "tick with second true transition should succeed");

  const auto third_snapshot = context.logic_service.get_snapshot("rule.basic");
  expect_true(
      third_snapshot.ok() && third_snapshot.value->activation_count == 2U,
      "activation_count should increment again on the next false to true transition");

  if (failures != 0) {
    std::cerr << "test_logic_service_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_logic_service_basic passed\n";
  return 0;
}
