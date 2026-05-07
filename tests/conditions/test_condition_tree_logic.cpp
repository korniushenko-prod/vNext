#include <iostream>
#include <string>
#include <vector>

#include "conditions/condition_evaluator.hpp"
#include "signals/signal_registry.hpp"

using controller::conditions::ConditionEvaluator;
using controller::conditions::ConditionGroupNode;
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

ConditionNode make_group_node(
    const std::string& node_id,
    const ConditionNodeKind kind,
    std::vector<std::string> children) {
  return ConditionNode{
      {node_id, node_id, "", kind, 0U, 0U, std::nullopt},
      ConditionGroupNode{std::move(children)},
  };
}

ConditionNode make_compare_node(
    const std::string& node_id,
    const std::string& signal_path,
    const bool rhs) {
  return ConditionNode{
      {node_id, node_id, "", ConditionNodeKind::signal_compare, 0U, 0U, std::nullopt},
      ConditionSignalCompareNode{signal_path, ConditionOperator::eq, rhs},
  };
}

}  // namespace

int main() {
  SignalRegistry registry;
  expect_true(registry.register_signal(make_descriptor("s.false1", "False 1", SignalType::boolean)).ok(), "register s.false1");
  expect_true(registry.register_signal(make_descriptor("s.false2", "False 2", SignalType::boolean)).ok(), "register s.false2");
  expect_true(registry.register_signal(make_descriptor("s.true1", "True 1", SignalType::boolean)).ok(), "register s.true1");
  expect_true(registry.register_signal(make_descriptor("s.true2", "True 2", SignalType::boolean)).ok(), "register s.true2");

  expect_true(registry.update_signal("s.false1", SignalValue{false}, 1U).ok(), "update s.false1");
  expect_true(registry.update_signal("s.false2", SignalValue{false}, 1U).ok(), "update s.false2");
  expect_true(registry.update_signal("s.true1", SignalValue{true}, 1U).ok(), "update s.true1");
  expect_true(registry.update_signal("s.true2", SignalValue{true}, 1U).ok(), "update s.true2");

  ConditionTree tree{
      "logic-tree",
      "root_all",
      {
          make_group_node("root_all", ConditionNodeKind::all, {"leaf_false", "node_any", "node_not"}),
          make_compare_node("leaf_false", "s.false1", true),
          make_group_node("node_any", ConditionNodeKind::any, {"leaf_false2", "leaf_true1"}),
          make_compare_node("leaf_false2", "s.false2", true),
          make_compare_node("leaf_true1", "s.true1", true),
          make_group_node("node_not", ConditionNodeKind::not_op, {"leaf_false3"}),
          make_compare_node("leaf_false3", "s.false2", true),
      }};

  ConditionEvaluator evaluator(tree, registry);
  const auto result = evaluator.evaluate(1U);

  expect_true(evaluator.validation().ok(), "logic tree should validate");
  expect_true(result.ok(), "logic tree evaluation should succeed");
  expect_true(!result.effective_result, "ALL root should be false because the first leaf is false");
  expect_true(result.trace.size() == 7U, "trace should include every leaf and group node");

  const std::vector<std::string> expected_order{
      "leaf_false",
      "leaf_false2",
      "leaf_true1",
      "node_any",
      "leaf_false3",
      "node_not",
      "root_all",
  };
  for (std::size_t index = 0; index < expected_order.size() && index < result.trace.size(); ++index) {
    expect_true(result.trace[index].node_id == expected_order[index], "trace order should be deterministic and post-order");
  }

  expect_true(result.trace[2].effective_result, "ANY subtree should still evaluate later true child");
  expect_true(result.trace[3].effective_result, "ANY node should become true");
  expect_true(result.trace[5].effective_result, "NOT node should invert false child to true");
  expect_true(
      result.reason.find("leaf_false") != std::string::npos,
      "top-level reason should explain which child made the ALL node false");

  if (failures != 0) {
    std::cerr << "test_condition_tree_logic failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_condition_tree_logic passed\n";
  return 0;
}
