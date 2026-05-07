#include <algorithm>
#include <iostream>

#include "rules_api_test_support.hpp"

using controller::api::RuleValueEditorKind;
using controller::signals::SignalValue;

int main() {
  using namespace rules_api_test;

  RulesApiTestContext context;
  expect_true(context.initialize(), "rules editor view model context should initialize");

  auto rule = make_editor_rule("rule.viewmodel");
  rule.on_false_actions.push_back(virtual_signal_action("set_count", "virtual.count", SignalValue{std::int64_t{7}}));
  rule.on_false_actions.push_back(virtual_signal_action("set_level", "virtual.level", SignalValue{12.5}));

  expect_true(context.logic.logic_service.register_rule(rule).ok(), "register rule for view model");
  expect_true(context.logic.registry.update_signal("cond.a", SignalValue{true}, 10U).ok(), "set cond.a true");
  expect_true(
      context.logic.registry.write_virtual_signal("virtual.flag", SignalValue{true}, 10U).ok(),
      "initialize virtual flag before view model load");
  expect_true(context.logic.logic_service.tick(10U).ok(), "tick rule for current status");

  const auto detail = context.api_service.get_rule("rule.viewmodel", 11U);
  const auto catalog = context.api_service.get_rule_editor_catalog(11U);
  expect_true(detail.ok(), "detail dto should load");
  expect_true(catalog.ok(), "catalog dto should load");

  const auto view_model = controller::api::WebRulesAdapter::build_detail_view_model(*detail.value, *catalog.value);
  expect_true(view_model.condition_nodes.size() == 5U, "condition builder should flatten nested nodes deterministically");
  expect_true(view_model.condition_nodes[0].node_id == "root", "root node should render first");
  expect_true(view_model.condition_nodes[1].node_id == "compare_a", "first child should keep stored order");
  expect_true(view_model.condition_nodes[2].node_id == "any_group", "group child should keep stored order");
  expect_true(view_model.condition_nodes[3].node_id == "temp_ok", "nested group should keep deterministic order");
  expect_true(
      view_model.condition_nodes[3].allowed_compare_operators.size() == 6U,
      "numeric signal compares should expose numeric operators");

  expect_true(view_model.action_sections.size() == 3U, "view model should expose three action sections");
  expect_true(
      view_model.action_sections[1].allowed_action_kinds.size() == 2U &&
          view_model.action_sections[1].allowed_action_kinds[0] == "relay_request",
      "while_true should expose only persistent output action kinds");
  expect_true(
      std::find(
          view_model.action_sections[0].allowed_action_kinds.begin(),
          view_model.action_sections[0].allowed_action_kinds.end(),
          "relay_request") == view_model.action_sections[0].allowed_action_kinds.end(),
      "on_true should not expose persistent output action kinds");

  auto bool_editor_found = false;
  auto int_editor_found = false;
  auto float_editor_found = false;
  auto string_editor_found = false;
  for (const auto& section : view_model.action_sections) {
    for (const auto& action : section.actions) {
      if (action.signal_path == "virtual.flag") {
        bool_editor_found = action.value_editor_kind == RuleValueEditorKind::boolean_toggle;
      } else if (action.signal_path == "virtual.count") {
        int_editor_found = action.value_editor_kind == RuleValueEditorKind::int64_number;
      } else if (action.signal_path == "virtual.level") {
        float_editor_found = action.value_editor_kind == RuleValueEditorKind::float64_number;
      } else if (action.signal_path == "virtual.text") {
        string_editor_found = action.value_editor_kind == RuleValueEditorKind::string_text;
      }
    }
  }
  expect_true(bool_editor_found, "boolean virtual writes should map to a boolean editor");
  expect_true(int_editor_found, "int64 virtual writes should map to an int64 editor");
  expect_true(float_editor_found, "float64 virtual writes should map to a float64 editor");
  expect_true(string_editor_found, "string virtual writes should map to a string editor");
  expect_true(
      view_model.current_status.status == "active" && !view_model.current_status.last_reason.empty(),
      "current status and reason should be present in the editor model");

  if (failures != 0) {
    std::cerr << "test_rules_editor_view_model failed with " << failures << " issue(s)\n";
    return 1;
  }

  std::cout << "test_rules_editor_view_model passed\n";
  return 0;
}
