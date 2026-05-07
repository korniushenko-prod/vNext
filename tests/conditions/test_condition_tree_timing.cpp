#include <cstdint>
#include <iostream>
#include <string>

#include "conditions/condition_evaluator.hpp"
#include "conditions/condition_tree.hpp"
#include "signals/signal_registry.hpp"

using controller::conditions::ConditionEvaluator;
using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionSignalCompareNode;
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
      SignalType::boolean,
      "",
      "tests",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

ConditionNode make_bool_compare_node(
    const std::string& node_id,
    const std::string& signal_path,
    const std::uint64_t delay_on_ms,
    const std::uint64_t delay_off_ms) {
  return ConditionNode{
      {node_id, node_id, "", ConditionNodeKind::signal_compare, delay_on_ms, delay_off_ms, std::nullopt},
      ConditionSignalCompareNode{signal_path, ConditionOperator::eq, true},
  };
}

}  // namespace

int main() {
  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("delayed.flag", "Delayed Flag")).ok(), "register delayed.flag");
    expect_true(registry.update_signal("delayed.flag", SignalValue{false}, 0U).ok(), "init delayed.flag false");

    ConditionTree tree{
        "delay-on-tree",
        "leaf",
        {
            make_bool_compare_node("leaf", "delayed.flag", 100U, 0U),
        }};

    ConditionEvaluator evaluator(tree, registry);
    expect_true(!evaluator.evaluate(0U).effective_result, "initial false should stay false");
    expect_true(registry.update_signal("delayed.flag", SignalValue{true}, 10U).ok(), "set delayed.flag true");
    expect_true(!evaluator.evaluate(10U).effective_result, "delay_on should keep result false at transition start");
    expect_true(!evaluator.evaluate(109U).effective_result, "delay_on should still be pending before expiry");
    expect_true(evaluator.evaluate(110U).effective_result, "delay_on should become true when delay expires");
  }

  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("hold.flag", "Hold Flag")).ok(), "register hold.flag");
    expect_true(registry.update_signal("hold.flag", SignalValue{true}, 0U).ok(), "init hold.flag true");

    ConditionTree tree{
        "delay-off-tree",
        "leaf",
        {
            make_bool_compare_node("leaf", "hold.flag", 0U, 50U),
        }};

    ConditionEvaluator evaluator(tree, registry);
    expect_true(evaluator.evaluate(0U).effective_result, "initial true should become true immediately without delay_on");
    expect_true(registry.update_signal("hold.flag", SignalValue{false}, 20U).ok(), "set hold.flag false");
    expect_true(evaluator.evaluate(20U).effective_result, "delay_off should keep result true at transition start");
    expect_true(evaluator.evaluate(69U).effective_result, "delay_off should still hold before expiry");
    expect_true(!evaluator.evaluate(70U).effective_result, "delay_off should release after expiry");
  }

  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("flip.flag", "Flip Flag")).ok(), "register flip.flag");
    expect_true(registry.update_signal("flip.flag", SignalValue{false}, 0U).ok(), "init flip.flag false");

    ConditionTree tree{
        "cancel-tree",
        "leaf",
        {
            make_bool_compare_node("leaf", "flip.flag", 100U, 0U),
        }};

    ConditionEvaluator evaluator(tree, registry);
    expect_true(registry.update_signal("flip.flag", SignalValue{true}, 10U).ok(), "set flip.flag true first time");
    expect_true(!evaluator.evaluate(10U).effective_result, "first pending delay_on should start");
    expect_true(registry.update_signal("flip.flag", SignalValue{false}, 50U).ok(), "flip flag back false");
    expect_true(!evaluator.evaluate(50U).effective_result, "pending transition should cancel when raw returns false");
    expect_true(registry.update_signal("flip.flag", SignalValue{true}, 60U).ok(), "set flip.flag true second time");
    expect_true(!evaluator.evaluate(60U).effective_result, "second pending delay_on should restart");
    expect_true(!evaluator.evaluate(159U).effective_result, "second pending delay_on should still wait");
    expect_true(evaluator.evaluate(160U).effective_result, "second pending delay_on should complete from new start time");
  }

  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("stable.flag", "Stable Flag")).ok(), "register stable.flag");
    expect_true(registry.update_signal("stable.flag", SignalValue{true}, 10U).ok(), "init stable.flag true");

    ConditionTree tree{
        "stable-tree",
        "leaf",
        {
            make_bool_compare_node("leaf", "stable.flag", 25U, 0U),
        }};

    ConditionEvaluator evaluator(tree, registry);
    const auto first = evaluator.evaluate(10U);
    const auto second = evaluator.evaluate(10U);
    const auto runtime = evaluator.get_node_runtime_state("leaf");
    expect_true(!first.effective_result && !second.effective_result, "repeated evaluate with same now_ms should stay stable");
    expect_true(runtime.ok() && runtime.value->pending_transition_active, "pending transition should remain active on repeated same-time evaluate");
    expect_true(runtime.ok() && runtime.value->pending_since_ms == 10U, "pending_since_ms should not drift on repeated same-time evaluate");
  }

  {
    ConditionTree tree{
        "invalid-group-delay",
        "root",
        {
            ConditionNode{
                {"root", "root", "", ConditionNodeKind::all, 5U, 0U, std::nullopt},
                ConditionGroupNode{{"child"}},
            },
            make_bool_compare_node("child", "unused.flag", 0U, 0U),
        }};

    const auto validation = validate_tree(tree);
    expect_true(!validation.ok(), "group delay should be rejected by validator");
    expect_true(
        validation.status.code == controller::conditions::ConditionErrorCode::condition_delay_unsupported,
        "group delay should report CONDITION_DELAY_UNSUPPORTED");
  }

  if (failures != 0) {
    std::cerr << "test_condition_tree_timing failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_condition_tree_timing passed\n";
  return 0;
}
