#include <cstdint>
#include <iostream>
#include <string>

#include "conditions/condition_evaluator.hpp"
#include "signals/signal_registry.hpp"

using controller::conditions::ConditionEvaluator;
using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionSignalFlag;
using controller::conditions::ConditionSignalFlagNode;
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
    const SignalType type,
    const std::uint64_t max_age_ms = 0U) {
  return SignalDescriptor{
      std::move(path),
      std::move(name),
      "test signal",
      type,
      "",
      "tests",
      SignalAccessMode::read_only,
      max_age_ms,
      true,
      true,
  };
}

}  // namespace

int main() {
  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("pressure", "Pressure", SignalType::float64, 50U)).ok(), "register pressure");
    expect_true(registry.update_signal("pressure", SignalValue{2.5}, 0U, false, true).ok(), "update pressure with valid=false fault=true");

    ConditionTree tree{
        "trace-tree",
        "root",
        {
            ConditionNode{
                {"root", "root", "", ConditionNodeKind::all, 0U, 0U, std::nullopt},
                ConditionGroupNode{{"valid_false", "fault_true", "stale_true", "init_true"}},
            },
            ConditionNode{
                {"valid_false", "valid_false", "", ConditionNodeKind::signal_flag, 0U, 0U, std::nullopt},
                ConditionSignalFlagNode{"pressure", ConditionSignalFlag::valid, false},
            },
            ConditionNode{
                {"fault_true", "fault_true", "", ConditionNodeKind::signal_flag, 0U, 0U, std::nullopt},
                ConditionSignalFlagNode{"pressure", ConditionSignalFlag::fault, true},
            },
            ConditionNode{
                {"stale_true", "stale_true", "", ConditionNodeKind::signal_flag, 0U, 0U, std::nullopt},
                ConditionSignalFlagNode{"pressure", ConditionSignalFlag::stale, true},
            },
            ConditionNode{
                {"init_true", "init_true", "", ConditionNodeKind::signal_flag, 0U, 0U, std::nullopt},
                ConditionSignalFlagNode{"pressure", ConditionSignalFlag::initialized, true},
            },
        }};

    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(60U);
    expect_true(result.ok() && result.effective_result, "all signal flag checks should pass");
    expect_true(result.trace.size() == 5U, "trace should include four leaves plus root");
    expect_true(result.trace[0].node_id == "valid_false", "trace should start with first child");
    expect_true(result.trace[0].signal_path == "pressure", "trace should include signal path");
    expect_true(result.trace[0].reason.find("flag valid") != std::string::npos, "trace reason should mention the checked flag");
    expect_true(result.trace[0].value_summary == "false", "trace should summarize actual flag value");
    expect_true(result.trace[4].node_id == "root", "trace should end with root");
  }

  {
    SignalRegistry registry;
    expect_true(registry.register_signal(make_descriptor("temperature", "Temperature", SignalType::float64)).ok(), "register temperature");
    expect_true(registry.update_signal("temperature", SignalValue{5.0}, 0U).ok(), "update temperature");
    expect_true(
        registry.register_signal(make_descriptor("mode.uninitialized", "Mode", SignalType::string)).ok(),
        "register uninitialized signal");

    ConditionTree tree{
        "failure-trace-tree",
        "root",
        {
            ConditionNode{
                {"root", "root", "", ConditionNodeKind::all, 0U, 0U, std::nullopt},
                ConditionGroupNode{{"temp_ok", "mode_init"}},
            },
            ConditionNode{
                {"temp_ok", "temp_ok", "", ConditionNodeKind::signal_compare, 0U, 0U, std::nullopt},
                ConditionSignalCompareNode{"temperature", ConditionOperator::gt, 10.0},
            },
            ConditionNode{
                {"mode_init", "mode_init", "", ConditionNodeKind::signal_flag, 0U, 0U, std::nullopt},
                ConditionSignalFlagNode{"mode.uninitialized", ConditionSignalFlag::initialized, false},
            },
        }};

    ConditionEvaluator evaluator(tree, registry);
    const auto result = evaluator.evaluate(0U);
    expect_true(result.ok() && !result.effective_result, "failing leaf trace tree should still evaluate without structured error");
    expect_true(result.reason.find("temp_ok") != std::string::npos, "top-level reason should mention the failing leaf id");
    expect_true(result.trace[0].node_id == "temp_ok", "first leaf should appear first in trace");
    expect_true(!result.trace[0].effective_result, "failing compare leaf should be false");
    expect_true(result.trace[1].node_id == "mode_init", "initialized=false check should still appear in trace");
    expect_true(result.trace[1].effective_result, "initialized expected false should pass for uninitialized signal");
  }

  if (failures != 0) {
    std::cerr << "test_condition_tree_trace failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_condition_tree_trace passed\n";
  return 0;
}
