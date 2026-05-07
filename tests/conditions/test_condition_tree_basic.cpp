#include <cstdint>
#include <iostream>
#include <string>

#include "conditions/condition_evaluator.hpp"
#include "signals/signal_registry.hpp"

using controller::conditions::ConditionConstantBoolNode;
using controller::conditions::ConditionEvaluator;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionTree;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalRegistry;
using controller::signals::SignalType;
using controller::signals::SignalValue;

namespace {

int failures = 0;

void expect_true(const bool condition, const std::string& message) {
  if (!condition) {
    std::cerr << "FAIL: " << message << '\n';
    ++failures;
  }
}

SignalDescriptor make_descriptor(
    std::string path,
    std::string name,
    SignalType type,
    std::string unit = "",
    const std::uint64_t max_age_ms = 0U) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
      std::move(unit),
      "tests",
      SignalAccessMode::read_only,
      max_age_ms,
      true,
      true,
  };
}

ConditionNode make_constant_bool_node(const std::string& node_id, const bool value) {
  return ConditionNode{
      {node_id, node_id, "", ConditionNodeKind::constant_bool, 0U, 0U, std::nullopt},
      ConditionConstantBoolNode{value},
  };
}

ConditionNode make_compare_node(
    const std::string& node_id,
    const std::string& signal_path,
    const ConditionOperator op,
    const controller::conditions::ConditionValue& rhs) {
  return ConditionNode{
      {node_id, node_id, "", ConditionNodeKind::signal_compare, 0U, 0U, std::nullopt},
      ConditionSignalCompareNode{signal_path, op, rhs},
  };
}

}  // namespace

int main() {
  SignalRegistry registry;
  expect_true(registry.register_signal(make_descriptor("mode.auto", "Mode Auto", SignalType::boolean)).ok(), "register bool signal");
  expect_true(registry.register_signal(make_descriptor("counter.total", "Counter", SignalType::int64)).ok(), "register int64 signal");
  expect_true(registry.register_signal(make_descriptor("ai1.pressure_bar", "Pressure", SignalType::float64, "bar")).ok(), "register double signal");
  expect_true(registry.register_signal(make_descriptor("program.state", "Program State", SignalType::string)).ok(), "register string signal");

  expect_true(registry.update_signal("mode.auto", SignalValue{true}, 10U).ok(), "update bool signal");
  expect_true(registry.update_signal("counter.total", SignalValue{std::int64_t{7}}, 10U).ok(), "update int64 signal");
  expect_true(registry.update_signal("ai1.pressure_bar", SignalValue{2.5}, 10U).ok(), "update double signal");
  expect_true(registry.update_signal("program.state", SignalValue{std::string{"run"}}, 10U).ok(), "update string signal");

  {
    ConditionTree tree{"constant-tree", "const_true", {make_constant_bool_node("const_true", true)}};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(evaluator.validation().ok(), "constant tree should validate");
    expect_true(result.ok() && result.effective_result, "constant_bool true should evaluate true");
  }

  {
    ConditionTree tree{
        "bool-tree",
        "bool_eq",
        {
            make_compare_node("bool_eq", "mode.auto", ConditionOperator::eq, true),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "bool eq compare should be true");
  }

  {
    ConditionTree tree{
        "bool-neq-tree",
        "bool_neq",
        {
            make_compare_node("bool_neq", "mode.auto", ConditionOperator::neq, false),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "bool neq compare should be true");
  }

  {
    ConditionTree tree{
        "numeric-tree",
        "counter_gt",
        {
            make_compare_node("counter_gt", "counter.total", ConditionOperator::gt, std::int64_t{5}),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "int64 gt compare should be true");
  }

  {
    ConditionTree tree{
        "double-tree",
        "pressure_lte",
        {
            make_compare_node("pressure_lte", "ai1.pressure_bar", ConditionOperator::lte, 2.5),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "double lte compare should be true");
  }

  {
    ConditionTree tree{
        "string-tree",
        "state_eq",
        {
            make_compare_node("state_eq", "program.state", ConditionOperator::eq, std::string{"run"}),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "string eq compare should be true");
  }

  {
    ConditionTree tree{
        "string-neq-tree",
        "state_neq",
        {
            make_compare_node("state_neq", "program.state", ConditionOperator::neq, std::string{"idle"}),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "string neq compare should be true");
  }

  {
    ConditionTree tree{
        "promotion-tree",
        "int64_eq_double",
        {
            make_compare_node("int64_eq_double", "counter.total", ConditionOperator::eq, 7.0),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "mixed numeric eq should promote int64 to double");
  }

  {
    ConditionTree tree{
        "promotion-tree-2",
        "double_gt_int64",
        {
            make_compare_node("double_gt_int64", "ai1.pressure_bar", ConditionOperator::gt, std::int64_t{2}),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(10U);
    expect_true(result.ok() && result.effective_result, "mixed numeric gt should promote int64 to double");
  }

  if (failures != 0) {
    std::cerr << "test_condition_tree_basic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_condition_tree_basic passed\n";
  return 0;
}
