#include <iostream>
#include <string>

#include "conditions/condition_evaluator.hpp"
#include "conditions/condition_tree.hpp"
#include "signals/signal_registry.hpp"

using controller::conditions::ConditionErrorCode;
using controller::conditions::ConditionEvaluator;
using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionSignalCompareNode;
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

SignalDescriptor make_descriptor(std::string path, std::string name, const SignalType type) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
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
  {
    const auto validation = validate_tree(ConditionTree{"empty", "root", {}});
    expect_true(!validation.ok(), "empty tree should fail validation");
    expect_true(validation.status.code == ConditionErrorCode::condition_tree_empty, "empty tree error code");
  }

  {
    ConditionTree tree{
        "missing-root",
        "root",
        {
            make_compare_node("leaf", "missing.signal", ConditionOperator::eq, true),
        }};
    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "missing root should fail validation");
    expect_true(validation.status.code == ConditionErrorCode::condition_root_not_found, "missing root error code");
  }

  {
    ConditionTree tree{
        "duplicate",
        "dup",
        {
            make_compare_node("dup", "a", ConditionOperator::eq, true),
            make_compare_node("dup", "b", ConditionOperator::eq, true),
        }};
    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "duplicate node ids should fail validation");
    expect_true(validation.status.code == ConditionErrorCode::condition_duplicate_node_id, "duplicate id error code");
  }

  {
    ConditionTree tree{
        "bad-child",
        "root",
        {
            ConditionNode{
                {"root", "root", "", ConditionNodeKind::all, 0U, 0U, std::nullopt},
                ConditionGroupNode{{"missing-child"}},
            },
        }};
    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "invalid child reference should fail validation");
    expect_true(validation.status.code == ConditionErrorCode::condition_invalid_child_reference, "invalid child reference error code");
  }

  {
    SignalRegistry registry;
    ConditionTree tree{
        "missing-signal",
        "leaf",
        {
            make_compare_node("leaf", "unknown.signal", ConditionOperator::eq, true),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(0U);
    expect_true(!result.ok(), "unknown signal should fail evaluation");
    expect_true(result.status.code == ConditionErrorCode::condition_signal_not_found, "unknown signal error code");
  }

  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("bool.signal", "Bool", SignalType::boolean)).ok(), "register bool.signal");
    expect_true(registry.update_signal("bool.signal", SignalValue{true}, 0U).ok(), "update bool.signal");

    ConditionTree tree{
        "type-mismatch",
        "leaf",
        {
            make_compare_node("leaf", "bool.signal", ConditionOperator::eq, std::string{"AUTO"}),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(0U);
    expect_true(!result.ok(), "type mismatch should fail evaluation");
    expect_true(result.status.code == ConditionErrorCode::condition_signal_type_mismatch, "type mismatch error code");
  }

  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("string.signal", "String", SignalType::string)).ok(), "register string.signal");
    expect_true(registry.update_signal("string.signal", SignalValue{std::string{"AUTO"}}, 0U).ok(), "update string.signal");

    ConditionTree tree{
        "invalid-op-runtime",
        "leaf",
        {
            make_compare_node("leaf", "string.signal", ConditionOperator::gt, 5.0),
        }};
    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(0U);
    expect_true(!result.ok(), "invalid operator for runtime signal type should fail evaluation");
    expect_true(result.status.code == ConditionErrorCode::condition_invalid_operator, "invalid operator runtime error code");
  }

  {
    ConditionTree tree{
        "bad-range",
        "range",
        {
            ConditionNode{
                {"range", "range", "", ConditionNodeKind::signal_range, 0U, 0U, std::nullopt},
                ConditionSignalRangeNode{"pressure", 5.0, 2.0, controller::conditions::ConditionRangeMode::in_range},
            },
        }};
    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "invalid range should fail validation");
    expect_true(validation.status.code == ConditionErrorCode::condition_invalid_range, "invalid range error code");
  }

  if (failures != 0) {
    std::cerr << "test_condition_tree_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_condition_tree_errors passed\n";
  return 0;
}
