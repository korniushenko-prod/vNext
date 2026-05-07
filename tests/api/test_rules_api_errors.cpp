#include <iostream>

#include "rules_api_test_support.hpp"

using controller::api::RulesUiResultCode;
using controller::hal::RelayState;

int main() {
  using namespace rules_api_test;

  RulesApiTestContext context;
  expect_true(context.initialize(), "rules api errors context should initialize");

  const auto missing_rule = context.api_service.get_rule("rule.missing", 1U);
  expect_true(!missing_rule.ok(), "unknown rule id should be rejected");
  expect_true(
      missing_rule.status.code == RulesUiResultCode::rules_ui_rule_not_found,
      "unknown rule should map to RULES_UI_RULE_NOT_FOUND");

  auto valid_rule = make_rule("rule.valid", "cond.a");
  const auto invalid_context = context.api_service.create_rule(valid_rule, make_command_context(1U, "", ""));
  expect_true(!invalid_context.accepted, "invalid command context should be rejected");
  expect_true(
      invalid_context.status.code == RulesUiResultCode::rules_ui_invalid_argument,
      "invalid command context should map to RULES_UI_INVALID_ARGUMENT");

  auto invalid_id = make_rule("", "cond.a");
  const auto invalid_draft = context.api_service.create_rule(invalid_id, make_command_context(2U));
  expect_true(!invalid_draft.accepted, "invalid rule draft should fail validation");
  expect_true(
      invalid_draft.status.code == RulesUiResultCode::rules_ui_validation_failed,
      "invalid draft should map to RULES_UI_VALIDATION_FAILED");
  expect_true(
      !invalid_draft.status.validation_issues.empty(),
      "validation failures should preserve structured issues");

  auto invalid_placement = make_rule("rule.invalid_placement", "cond.a");
  invalid_placement.on_true_actions.push_back(relay_action("bad", "relay.main", RelayState::on, "wrong section"));
  const auto invalid_placement_result =
      context.api_service.create_rule(invalid_placement, make_command_context(3U));
  expect_true(!invalid_placement_result.accepted, "invalid action placement should be rejected");
  expect_true(
      !invalid_placement_result.status.validation_issues.empty() &&
          invalid_placement_result.status.validation_issues.front().path.find("on_true_actions") != std::string::npos,
      "invalid placement should report the failing section path");

  auto invalid_reference = make_rule("rule.invalid_reference", "cond.a");
  invalid_reference.on_true_actions.push_back(
      virtual_signal_action("bad_signal", "readonly.flag", controller::signals::SignalValue{true}));
  invalid_reference.while_true_actions.push_back(relay_action("bad_target", "relay.missing", RelayState::on, "missing target"));
  const auto invalid_reference_result =
      context.api_service.create_rule(invalid_reference, make_command_context(4U));
  expect_true(!invalid_reference_result.accepted, "invalid references should be rejected");
  expect_true(
      invalid_reference_result.status.validation_issues.size() >= 2U,
      "invalid references should report structured issues for each failing section");

  if (failures != 0) {
    std::cerr << "test_rules_api_errors failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_rules_api_errors passed\n";
  return 0;
}
