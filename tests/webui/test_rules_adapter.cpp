#include <iostream>

#include "rules_api_test_support.hpp"

using controller::api::RulesUiResultCode;
using controller::signals::SignalValue;

int main() {
  using namespace rules_api_test;

  {
    RulesWebUiTestContext context;
    expect_true(context.initialize(), "rules adapter load context should initialize");

    auto rule = make_editor_rule();
    expect_true(context.logic.logic_service.register_rule(rule).ok(), "register editor rule for adapter");
    expect_true(context.logic.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
    expect_true(
        context.logic.registry.write_virtual_signal("virtual.flag", SignalValue{true}, 10U).ok(),
        "initialize virtual flag before adapter load");
    expect_true(context.logic.logic_service.tick(10U).ok(), "tick rule for adapter load");

    const auto list = context.web_adapter.load_rule_list(11U);
    expect_true(list.success, "adapter should load the rule list");
    expect_true(list.value->total_count == 1U, "list view model should count cards");
    expect_true(list.value->active_count == 1U, "list view model should count active rules");

    const auto detail = context.web_adapter.load_rule_detail("rule.editor", 11U);
    expect_true(detail.success, "adapter should load detail view model");
    expect_true(
        !detail.value->trace_lines.empty(),
        "adapter detail should preserve trace lines");
    expect_true(
        find_trace_line(detail.value->trace_lines, "temp_ok").has_value(),
        "adapter detail should keep trace entries by node id");
    expect_true(detail.value->can_disable && !detail.value->can_enable, "enabled rule should expose disable action");
  }

  {
    RulesWebUiTestContext context;
    expect_true(context.initialize(), "rules adapter validation context should initialize");

    auto invalid = make_rule("rule.invalid", "cond.a");
    invalid.on_true_actions.push_back(relay_action("bad", "relay.main", controller::hal::RelayState::on, "wrong section"));

    const auto save_result = context.web_adapter.save_rule(std::nullopt, invalid, make_command_context(1U, "ui", "save invalid"));
    expect_true(!save_result.accepted, "adapter should preserve save denial");
    expect_true(
        save_result.code == RulesUiResultCode::rules_ui_validation_failed,
        "validation failures should keep a stable adapter code");
    expect_true(
        !save_result.validation_issues.empty(),
        "adapter should preserve validation issues for the UI");
    expect_true(
        save_result.detail.has_value() && !save_result.detail->validation_issues.empty(),
        "adapter detail model should also keep validation issues inline");
  }

  if (failures != 0) {
    std::cerr << "test_rules_adapter failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_rules_adapter passed\n";
  return 0;
}
