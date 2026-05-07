#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <utility>
#include <vector>

#include "api/rules_api_service.hpp"
#include "api/web_rules_adapter.hpp"
#include "logic_test_support.hpp"

namespace rules_api_test {

using logic_test::alarm_action;
using logic_test::expect_true;
using logic_test::failures;
using logic_test::make_rule;
using logic_test::note_action;
using logic_test::program_normal_stop_action;
using logic_test::program_reset_action;
using logic_test::program_start_action;
using logic_test::program_trip_action;
using logic_test::pwm_action;
using logic_test::relay_action;
using logic_test::timer_start_action;
using logic_test::timer_stop_action;
using logic_test::virtual_signal_action;

inline controller::api::CommandContext make_command_context(
    const controller::api::ApiTimestampMs now_ms,
    std::string source = "rules_ui_test",
    std::string reason = "mechanic request") {
  controller::api::CommandContext context;
  context.now_ms = now_ms;
  context.source = std::move(source);
  context.reason = std::move(reason);
  context.actor = std::string{"tester"};
  return context;
}

inline controller::conditions::ConditionTree make_nested_condition_tree() {
  using controller::conditions::ConditionConstantBoolNode;
  using controller::conditions::ConditionGroupNode;
  using controller::conditions::ConditionNode;
  using controller::conditions::ConditionNodeKind;
  using controller::conditions::ConditionOperator;
  using controller::conditions::ConditionSignalCompareNode;
  using controller::conditions::ConditionSignalFlag;
  using controller::conditions::ConditionSignalFlagNode;

  return controller::conditions::ConditionTree{
      "rules.editor.tree",
      "root",
      {
          ConditionNode{
              {"root", "All permits", "", ConditionNodeKind::all, 0U, 0U, std::nullopt},
              ConditionGroupNode{{"compare_a", "any_group"}},
          },
          ConditionNode{
              {"compare_a", "A is true", "", ConditionNodeKind::signal_compare, 25U, 0U, std::nullopt},
              ConditionSignalCompareNode{"cond.a", ConditionOperator::eq, true},
          },
          ConditionNode{
              {"any_group", "Secondary", "", ConditionNodeKind::any, 0U, 0U, std::nullopt},
              ConditionGroupNode{{"temp_ok", "flag_ok"}},
          },
          ConditionNode{
              {"temp_ok", "Temp high", "", ConditionNodeKind::signal_compare, 0U, 0U, 0.5},
              ConditionSignalCompareNode{"sensor.temp", ConditionOperator::gt, 40.0},
          },
          ConditionNode{
              {"flag_ok", "Virtual flag", "", ConditionNodeKind::signal_flag, 50U, 0U, std::nullopt},
              ConditionSignalFlagNode{"virtual.flag", ConditionSignalFlag::initialized, true},
          },
      }};
}

inline controller::logic::RuleDescriptor make_editor_rule(std::string id = "rule.editor") {
  auto rule = make_rule(id, "cond.a");
  rule.name = "Editor Rule";
  rule.description = "Rule used by Stage 13 editor tests";
  rule.condition_tree = make_nested_condition_tree();
  rule.on_true_actions = {
      timer_start_action("start_main_timer", "timer.main"),
      virtual_signal_action("set_flag_true", "virtual.flag", controller::signals::SignalValue{true}),
  };
  rule.while_true_actions = {
      relay_action("relay_hold", "relay.main", controller::hal::RelayState::on, "hold relay"),
      pwm_action("pwm_hold", "pwm.main", 37.5, true, "hold pwm"),
  };
  rule.on_false_actions = {
      timer_stop_action("stop_main_timer", "timer.main"),
      alarm_action("alarm_reset", "alarm.main", false),
      virtual_signal_action("clear_text", "virtual.text", controller::signals::SignalValue{std::string{"idle"}}),
  };
  return rule;
}

struct RulesApiTestContext {
  logic_test::LogicTestContext logic;
  controller::api::RulesApiService api_service;

  explicit RulesApiTestContext(const std::size_t history_capacity = 8U)
      : logic(history_capacity),
        api_service(
            logic.logic_service,
            logic.registry,
            logic.actuator_manager,
            logic.timer_service,
            logic.alarm_service,
            logic.sequence_service) {}

  bool initialize() {
    return logic.initialize();
  }
};

struct RulesWebUiTestContext : public RulesApiTestContext {
  controller::api::WebRulesAdapter web_adapter;

  explicit RulesWebUiTestContext(const std::size_t history_capacity = 8U)
      : RulesApiTestContext(history_capacity),
        web_adapter(api_service) {}
};

inline std::optional<controller::api::RuleCardDto> find_card(
    const std::vector<controller::api::RuleCardDto>& cards,
    const std::string& id) {
  for (const auto& card : cards) {
    if (card.id == id) {
      return card;
    }
  }
  return std::nullopt;
}

inline std::optional<controller::api::TraceLineViewModel> find_trace_line(
    const std::vector<controller::api::TraceLineViewModel>& trace_lines,
    const std::string& node_id) {
  for (const auto& trace_line : trace_lines) {
    if (trace_line.node_id == node_id) {
      return trace_line;
    }
  }
  return std::nullopt;
}

}  // namespace rules_api_test
