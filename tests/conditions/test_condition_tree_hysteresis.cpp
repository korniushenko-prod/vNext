#include <cstdint>
#include <iostream>
#include <string>

#include "conditions/condition_evaluator.hpp"
#include "conditions/condition_tree.hpp"
#include "signals/signal_registry.hpp"

using controller::conditions::ConditionErrorCode;
using controller::conditions::ConditionEvaluator;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionSignalFlag;
using controller::conditions::ConditionSignalFlagNode;
using controller::conditions::ConditionSignalRangeNode;
using controller::conditions::ConditionTree;
using controller::conditions::validate_tree;
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

SignalDescriptor make_descriptor(std::string path, std::string name) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      SignalType::float64,
      "",
      "tests",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

ConditionNode make_compare_node(
    const std::string& node_id,
    const ConditionOperator op,
    const double rhs,
    const double hysteresis) {
  return ConditionNode{
      {node_id, node_id, "", ConditionNodeKind::signal_compare, 0U, 0U, hysteresis},
      ConditionSignalCompareNode{"pv", op, rhs},
  };
}

}  // namespace

int main() {
  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("pv", "PV")).ok(), "register pv");
    expect_true(registry.update_signal("pv", SignalValue{9.0}, 0U).ok(), "init pv");

    ConditionTree tree{"gt-tree", "gt", {make_compare_node("gt", ConditionOperator::gt, 10.0, 2.0)}};
    ConditionEvaluator evaluator(tree, registry);
    expect_true(!evaluator.evaluate(0U).effective_result, "gt hysteresis should start false below threshold");
    expect_true(registry.update_signal("pv", SignalValue{10.1}, 10U).ok(), "raise pv above threshold");
    expect_true(evaluator.evaluate(10U).effective_result, "gt hysteresis should become true above threshold");
    expect_true(registry.update_signal("pv", SignalValue{9.5}, 20U).ok(), "drop pv but stay above release");
    expect_true(evaluator.evaluate(20U).effective_result, "gt hysteresis should hold true above release threshold");
    expect_true(registry.update_signal("pv", SignalValue{7.9}, 30U).ok(), "drop pv below release");
    expect_true(!evaluator.evaluate(30U).effective_result, "gt hysteresis should release below threshold minus hysteresis");
  }

  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("pv", "PV")).ok(), "register pv lt");
    expect_true(registry.update_signal("pv", SignalValue{6.0}, 0U).ok(), "init pv lt");

    ConditionTree tree{"lt-tree", "lt", {make_compare_node("lt", ConditionOperator::lt, 5.0, 1.0)}};
    ConditionEvaluator evaluator(tree, registry);
    expect_true(!evaluator.evaluate(0U).effective_result, "lt hysteresis should start false above threshold");
    expect_true(registry.update_signal("pv", SignalValue{4.9}, 10U).ok(), "lower pv below threshold");
    expect_true(evaluator.evaluate(10U).effective_result, "lt hysteresis should become true below threshold");
    expect_true(registry.update_signal("pv", SignalValue{5.5}, 20U).ok(), "raise pv but stay below release");
    expect_true(evaluator.evaluate(20U).effective_result, "lt hysteresis should hold true below release threshold");
    expect_true(registry.update_signal("pv", SignalValue{6.1}, 30U).ok(), "raise pv above release");
    expect_true(!evaluator.evaluate(30U).effective_result, "lt hysteresis should release above threshold plus hysteresis");
  }

  {
    ConditionTree tree{
        "eq-invalid",
        "eq",
        {
            ConditionNode{
                {"eq", "eq", "", ConditionNodeKind::signal_compare, 0U, 0U, 0.5},
                ConditionSignalCompareNode{"pv", ConditionOperator::eq, 1.0},
            },
        }};
    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "eq hysteresis should be rejected");
    expect_true(validation.status.code == ConditionErrorCode::condition_hysteresis_unsupported, "eq hysteresis error code");
  }

  {
    ConditionTree tree{
        "flag-invalid",
        "flag",
        {
            ConditionNode{
                {"flag", "flag", "", ConditionNodeKind::signal_flag, 0U, 0U, 1.0},
                ConditionSignalFlagNode{"pv", ConditionSignalFlag::valid, true},
            },
        }};
    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "signal_flag hysteresis should be rejected");
    expect_true(validation.status.code == ConditionErrorCode::condition_hysteresis_unsupported, "signal_flag hysteresis error code");
  }

  {
    ConditionTree tree{
        "range-invalid",
        "range",
        {
            ConditionNode{
                {"range", "range", "", ConditionNodeKind::signal_range, 0U, 0U, 0.5},
                ConditionSignalRangeNode{"pv", 1.0, 2.0, controller::conditions::ConditionRangeMode::in_range},
            },
        }};
    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "signal_range hysteresis should be rejected");
    expect_true(validation.status.code == ConditionErrorCode::condition_hysteresis_unsupported, "signal_range hysteresis error code");
  }

  if (failures != 0) {
    std::cerr << "test_condition_tree_hysteresis failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_condition_tree_hysteresis passed\n";
  return 0;
}
