#include "api/web_rules_adapter.hpp"

#include <algorithm>
#include <functional>
#include <sstream>
#include <type_traits>
#include <unordered_map>
#include <utility>

#include "conditions/condition_node.hpp"
#include "conditions/condition_value.hpp"
#include "hal/relay_hal.hpp"
#include "signals/signal_types.hpp"

namespace controller::api {

namespace {

using controller::conditions::ConditionConstantBoolNode;
using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionSignalFlagNode;
using controller::conditions::ConditionSignalRangeNode;
using controller::logic::RuleAction;
using controller::logic::RuleActionKind;
using controller::signals::SignalType;

template <typename T>
const T* payload_if(const ConditionNode& node) {
  return std::get_if<T>(&node.payload);
}

std::string bool_text(const bool value) {
  return value ? "true" : "false";
}

std::string signal_value_text(const controller::signals::SignalValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        using CandidateType = std::decay_t<decltype(candidate)>;
        if constexpr (std::is_same_v<CandidateType, bool>) {
          return bool_text(candidate);
        } else if constexpr (std::is_same_v<CandidateType, std::string>) {
          return "\"" + candidate + "\"";
        } else {
          std::ostringstream stream;
          stream << candidate;
          return stream.str();
        }
      },
      value);
}

std::string condition_value_text(const controller::conditions::ConditionValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        using CandidateType = std::decay_t<decltype(candidate)>;
        if constexpr (std::is_same_v<CandidateType, bool>) {
          return bool_text(candidate);
        } else if constexpr (std::is_same_v<CandidateType, std::string>) {
          return "\"" + candidate + "\"";
        } else {
          std::ostringstream stream;
          stream << candidate;
          return stream.str();
        }
      },
      value);
}

std::string relay_state_text(const controller::hal::RelayState state) {
  return state == controller::hal::RelayState::on ? "on" : "off";
}

bool is_group_kind(const ConditionNodeKind kind) {
  return kind == ConditionNodeKind::all || kind == ConditionNodeKind::any || kind == ConditionNodeKind::not_op;
}

bool supports_delay(const ConditionNodeKind kind) {
  return kind == ConditionNodeKind::signal_compare ||
         kind == ConditionNodeKind::signal_range ||
         kind == ConditionNodeKind::signal_flag;
}

bool supports_hysteresis(const ConditionNodeKind kind) {
  return kind == ConditionNodeKind::signal_compare;
}

bool is_output_action(const RuleActionKind kind) {
  return kind == RuleActionKind::relay_request || kind == RuleActionKind::pwm_request;
}

std::vector<std::string> command_action_kinds() {
  return {
      "timer_start",
      "timer_stop",
      "alarm_set_condition",
      "write_virtual_signal",
      "program_start",
      "program_request_normal_stop",
      "program_request_trip",
      "program_reset_active",
  };
}

std::vector<std::string> persistent_action_kinds() {
  return {
      "relay_request",
      "pwm_request",
  };
}

std::vector<std::string> compare_operators_for_type(const std::optional<SignalType> signal_type) {
  if (!signal_type.has_value()) {
    return {"eq", "neq", "gt", "gte", "lt", "lte"};
  }

  switch (*signal_type) {
    case SignalType::boolean:
    case SignalType::string:
      return {"eq", "neq"};
    case SignalType::int64:
    case SignalType::float64:
      return {"eq", "neq", "gt", "gte", "lt", "lte"};
  }

  return {"eq", "neq", "gt", "gte", "lt", "lte"};
}

std::optional<SignalType> find_signal_type(
    const RuleEditorCatalogDto& catalog,
    const std::string& signal_path) {
  const auto signal_it = std::find_if(
      catalog.signals.begin(),
      catalog.signals.end(),
      [&](const RuleSignalCatalogEntryDto& entry) { return entry.path == signal_path; });
  if (signal_it == catalog.signals.end()) {
    return std::nullopt;
  }
  return signal_it->type;
}

RuleValueEditorKind value_editor_kind_for_type(const std::optional<SignalType> signal_type) {
  if (!signal_type.has_value()) {
    return RuleValueEditorKind::none;
  }

  switch (*signal_type) {
    case SignalType::boolean:
      return RuleValueEditorKind::boolean_toggle;
    case SignalType::int64:
      return RuleValueEditorKind::int64_number;
    case SignalType::float64:
      return RuleValueEditorKind::float64_number;
    case SignalType::string:
      return RuleValueEditorKind::string_text;
  }

  return RuleValueEditorKind::none;
}

std::string action_summary(const RuleAction& action) {
  if (const auto* relay_action = std::get_if<controller::logic::RuleRelayRequestAction>(&action.payload)) {
    return relay_action->target_id + " -> " + relay_state_text(relay_action->state);
  }
  if (const auto* pwm_action = std::get_if<controller::logic::RulePwmRequestAction>(&action.payload)) {
    std::ostringstream stream;
    stream << pwm_action->target_id << " -> " << (pwm_action->enabled ? "enabled" : "disabled") << " @ "
           << pwm_action->duty_percent << "%";
    return stream.str();
  }
  if (const auto* timer_action = std::get_if<controller::logic::RuleTimerStartAction>(&action.payload)) {
    return "start " + timer_action->timer_id;
  }
  if (const auto* timer_action = std::get_if<controller::logic::RuleTimerStopAction>(&action.payload)) {
    return "stop " + timer_action->timer_id;
  }
  if (const auto* alarm_action = std::get_if<controller::logic::RuleAlarmSetConditionAction>(&action.payload)) {
    return alarm_action->alarm_id + " -> " + bool_text(alarm_action->condition_active);
  }
  if (const auto* signal_action = std::get_if<controller::logic::RuleWriteVirtualSignalAction>(&action.payload)) {
    return signal_action->signal_path + " -> " + signal_value_text(signal_action->value);
  }
  if (const auto* program_action = std::get_if<controller::logic::RuleProgramStartAction>(&action.payload)) {
    return "start " + program_action->program_id;
  }
  if (std::holds_alternative<controller::logic::RuleProgramRequestNormalStopAction>(action.payload)) {
    return "program normal stop";
  }
  if (std::holds_alternative<controller::logic::RuleProgramRequestTripAction>(action.payload)) {
    return "program trip";
  }
  if (std::holds_alternative<controller::logic::RuleProgramResetActiveAction>(action.payload)) {
    return "program reset";
  }
  if (const auto* note_action = std::get_if<controller::logic::RuleLogNoteAction>(&action.payload)) {
    return note_action->note;
  }
  return std::string{controller::logic::to_string(action.kind)};
}

std::string condition_node_summary(
    const ConditionNode& node,
    const RuleEditorCatalogDto& catalog) {
  if (const auto* group = payload_if<ConditionGroupNode>(node)) {
    return std::string{controller::conditions::to_string(node.metadata.kind)} +
           " with " + std::to_string(group->children.size()) + " child node(s)";
  }
  if (const auto* constant_node = payload_if<ConditionConstantBoolNode>(node)) {
    return std::string{"constant "} + bool_text(constant_node->value);
  }
  if (const auto* compare_node = payload_if<ConditionSignalCompareNode>(node)) {
    static_cast<void>(catalog);
    return compare_node->signal_path + " " + controller::conditions::to_string(compare_node->op) + " " +
           condition_value_text(compare_node->rhs);
  }
  if (const auto* range_node = payload_if<ConditionSignalRangeNode>(node)) {
    return range_node->signal_path + " " + controller::conditions::to_string(range_node->mode) + " [" +
           condition_value_text(range_node->lower) + ", " + condition_value_text(range_node->upper) + "]";
  }
  if (const auto* flag_node = payload_if<ConditionSignalFlagNode>(node)) {
    return flag_node->signal_path + "." + controller::conditions::to_string(flag_node->flag) + " == " +
           bool_text(flag_node->expected);
  }
  return "Unsupported node payload";
}

}  // namespace

const char* to_string(const RuleValueEditorKind kind) {
  switch (kind) {
    case RuleValueEditorKind::none:
      return "none";
    case RuleValueEditorKind::boolean_toggle:
      return "boolean_toggle";
    case RuleValueEditorKind::int64_number:
      return "int64_number";
    case RuleValueEditorKind::float64_number:
      return "float64_number";
    case RuleValueEditorKind::string_text:
      return "string_text";
  }

  return "unknown";
}

WebRulesAdapter::WebRulesAdapter(RulesApiService& rules_api_service)
    : rules_api_service_(rules_api_service) {}

RulesViewResponse<WebRulesListViewModel> WebRulesAdapter::load_rule_list(const ApiTimestampMs now_ms) const {
  const auto result = rules_api_service_.list_rules(now_ms);
  if (!result.ok()) {
    return make_list_error(result.status.code, result.status.message, now_ms, result.status.validation_issues);
  }

  RulesViewResponse<WebRulesListViewModel> response;
  response.success = true;
  response.code = map_result_code(result.status.code);
  response.message = result.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_list_view_model(*result.value);
  return response;
}

RulesViewResponse<WebRuleDetailViewModel> WebRulesAdapter::load_rule_detail(
    const std::string& rule_id,
    const ApiTimestampMs now_ms) const {
  const auto detail = rules_api_service_.get_rule(rule_id, now_ms);
  if (!detail.ok()) {
    return make_detail_error(detail.status.code, detail.status.message, now_ms, detail.status.validation_issues);
  }

  const auto catalog = rules_api_service_.get_rule_editor_catalog(now_ms);
  if (!catalog.ok()) {
    return make_detail_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  RulesViewResponse<WebRuleDetailViewModel> response;
  response.success = true;
  response.code = map_result_code(detail.status.code);
  response.message = detail.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_detail_view_model(*detail.value, *catalog.value);
  response.validation_issues = detail.value->validation_issues;
  return response;
}

RulesViewResponse<WebRuleEditorCatalogViewModel> WebRulesAdapter::load_editor_catalog(const ApiTimestampMs now_ms) const {
  const auto catalog = rules_api_service_.get_rule_editor_catalog(now_ms);
  if (!catalog.ok()) {
    return make_catalog_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  RulesViewResponse<WebRuleEditorCatalogViewModel> response;
  response.success = true;
  response.code = map_result_code(catalog.status.code);
  response.message = catalog.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.value = build_catalog_view_model(*catalog.value);
  return response;
}

WebRulesCommandResponse WebRulesAdapter::save_rule(
    std::optional<std::string> rule_id,
    const RuleDescriptorDraftDto& draft,
    const CommandContext& context) {
  const auto result = rule_id.has_value()
                          ? rules_api_service_.update_rule(*rule_id, draft, context)
                          : rules_api_service_.create_rule(draft, context);
  const auto effective_rule_id = result.rule_id.has_value() ? result.rule_id : rule_id;
  return build_command_response(result, effective_rule_id, context.now_ms);
}

WebRulesCommandResponse WebRulesAdapter::delete_rule(const std::string& rule_id, const CommandContext& context) {
  return build_command_response(rules_api_service_.delete_rule(rule_id, context), std::nullopt, context.now_ms);
}

WebRulesCommandResponse WebRulesAdapter::enable_rule(const std::string& rule_id, const CommandContext& context) {
  return build_command_response(rules_api_service_.set_rule_enabled(rule_id, true, context), rule_id, context.now_ms);
}

WebRulesCommandResponse WebRulesAdapter::disable_rule(const std::string& rule_id, const CommandContext& context) {
  return build_command_response(rules_api_service_.set_rule_enabled(rule_id, false, context), rule_id, context.now_ms);
}

WebRulesListViewModel WebRulesAdapter::build_list_view_model(const std::vector<RuleCardDto>& cards) {
  WebRulesListViewModel view_model;
  view_model.cards = cards;
  view_model.total_count = cards.size();
  for (const auto& card : cards) {
    if (card.status == "active") {
      ++view_model.active_count;
    } else if (card.status == "disabled") {
      ++view_model.disabled_count;
    } else if (card.status == "error") {
      ++view_model.error_count;
    }
  }
  return view_model;
}

WebRuleEditorCatalogViewModel WebRulesAdapter::build_catalog_view_model(const RuleEditorCatalogDto& catalog) {
  WebRuleEditorCatalogViewModel view_model;
  view_model.signals = catalog.signals;
  view_model.relay_targets = catalog.relay_targets;
  view_model.pwm_targets = catalog.pwm_targets;
  view_model.timers = catalog.timers;
  view_model.alarms = catalog.alarms;
  view_model.programs = catalog.programs;
  view_model.writable_virtual_signals = catalog.writable_virtual_signals;
  return view_model;
}

WebRuleDetailViewModel WebRulesAdapter::build_detail_view_model(
    const RuleDetailDto& detail,
    const RuleEditorCatalogDto& catalog) {
  WebRuleDetailViewModel view_model;
  view_model.metadata = detail.metadata;
  view_model.current_status = detail.current_status;
  view_model.if_summary = detail.if_summary;
  view_model.then_summary = detail.then_summary;
  view_model.else_summary = detail.else_summary;
  view_model.draft = detail.draft;
  view_model.condition_tree = detail.draft.condition_tree;
  view_model.validation_issues = detail.validation_issues;
  view_model.can_enable = !detail.current_status.enabled;
  view_model.can_disable = detail.current_status.enabled;

  std::unordered_map<std::string, const ConditionNode*> nodes_by_id;
  for (const auto& node : detail.draft.condition_tree.nodes) {
    nodes_by_id.emplace(node.metadata.node_id, &node);
  }

  std::size_t next_order_index = 0U;
  std::function<void(const std::string&, const std::optional<std::string>&, std::size_t)> visit =
      [&](const std::string& node_id, const std::optional<std::string>& parent_node_id, const std::size_t depth) {
        const auto node_it = nodes_by_id.find(node_id);
        if (node_it == nodes_by_id.end()) {
          return;
        }

        const auto& node = *node_it->second;
        ConditionBuilderNodeViewModel entry;
        entry.node_id = node.metadata.node_id;
        entry.parent_node_id = parent_node_id;
        entry.depth = depth;
        entry.order_index = next_order_index++;
        entry.kind = controller::conditions::to_string(node.metadata.kind);
        entry.title = node.metadata.name.empty() ? node.metadata.node_id : node.metadata.name;
        entry.summary = condition_node_summary(node, catalog);
        entry.supports_children = is_group_kind(node.metadata.kind);
        entry.supports_delay = supports_delay(node.metadata.kind);
        entry.supports_hysteresis = supports_hysteresis(node.metadata.kind);

        if (const auto* group = payload_if<ConditionGroupNode>(node)) {
          entry.child_node_ids = group->children;
        } else if (const auto* compare_node = payload_if<ConditionSignalCompareNode>(node)) {
          entry.allowed_compare_operators = compare_operators_for_type(find_signal_type(catalog, compare_node->signal_path));
        }

        view_model.condition_nodes.push_back(entry);

        if (const auto* group = payload_if<ConditionGroupNode>(node)) {
          for (const auto& child_id : group->children) {
            visit(child_id, node.metadata.node_id, depth + 1U);
          }
        }
      };

  if (!detail.draft.condition_tree.root_node_id.empty()) {
    visit(detail.draft.condition_tree.root_node_id, std::nullopt, 0U);
  }

  const auto build_action_section =
      [&](const std::string& section_name, const std::string& heading, const std::vector<RuleAction>& actions) {
        ActionSectionViewModel section;
        section.section = section_name;
        section.heading = heading;
        section.allowed_action_kinds =
            section_name == "while_true" ? persistent_action_kinds() : command_action_kinds();

        for (const auto& action : actions) {
          ActionEditorItemViewModel item;
          item.id = action.id;
          item.kind = controller::logic::to_string(action.kind);
          item.summary = action_summary(action);
          item.persistent_output = is_output_action(action.kind);
          item.command_action = !item.persistent_output;

          if (const auto* relay_action = std::get_if<controller::logic::RuleRelayRequestAction>(&action.payload)) {
            item.target_id = relay_action->target_id;
          } else if (const auto* pwm_action = std::get_if<controller::logic::RulePwmRequestAction>(&action.payload)) {
            item.target_id = pwm_action->target_id;
          } else if (const auto* timer_action = std::get_if<controller::logic::RuleTimerStartAction>(&action.payload)) {
            item.timer_id = timer_action->timer_id;
          } else if (const auto* timer_action = std::get_if<controller::logic::RuleTimerStopAction>(&action.payload)) {
            item.timer_id = timer_action->timer_id;
          } else if (const auto* alarm_action = std::get_if<controller::logic::RuleAlarmSetConditionAction>(&action.payload)) {
            item.alarm_id = alarm_action->alarm_id;
          } else if (const auto* signal_action = std::get_if<controller::logic::RuleWriteVirtualSignalAction>(&action.payload)) {
            item.signal_path = signal_action->signal_path;
            item.value_editor_kind = value_editor_kind_for_type(find_signal_type(catalog, signal_action->signal_path));
          } else if (const auto* program_action = std::get_if<controller::logic::RuleProgramStartAction>(&action.payload)) {
            item.program_id = program_action->program_id;
          }

          section.actions.push_back(std::move(item));
        }

        return section;
      };

  view_model.action_sections.push_back(
      build_action_section("on_true", "On True Actions", detail.draft.on_true_actions));
  view_model.action_sections.push_back(
      build_action_section("while_true", "While True Actions", detail.draft.while_true_actions));
  view_model.action_sections.push_back(
      build_action_section("on_false", "On False Actions", detail.draft.on_false_actions));

  for (const auto& trace_entry : detail.current_condition_trace) {
    view_model.trace_lines.push_back(TraceLineViewModel{
        trace_entry.node_id,
        controller::conditions::to_string(trace_entry.node_kind),
        trace_entry.raw_result,
        trace_entry.effective_result,
        controller::conditions::to_string(trace_entry.error_code),
        trace_entry.reason,
        trace_entry.signal_path,
        trace_entry.value_summary,
    });
  }

  return view_model;
}

RulesUiResultCode WebRulesAdapter::map_result_code(const RulesUiResultCode code) {
  return code;
}

RulesViewResponse<WebRulesListViewModel> WebRulesAdapter::make_list_error(
    const RulesUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms,
    std::vector<RuleValidationIssueDto> validation_issues) {
  RulesViewResponse<WebRulesListViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = std::move(validation_issues);
  return response;
}

RulesViewResponse<WebRuleDetailViewModel> WebRulesAdapter::make_detail_error(
    const RulesUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms,
    std::vector<RuleValidationIssueDto> validation_issues) {
  RulesViewResponse<WebRuleDetailViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = std::move(validation_issues);
  return response;
}

RulesViewResponse<WebRuleEditorCatalogViewModel> WebRulesAdapter::make_catalog_error(
    const RulesUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms,
    std::vector<RuleValidationIssueDto> validation_issues) {
  RulesViewResponse<WebRuleEditorCatalogViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = std::move(validation_issues);
  return response;
}

WebRulesCommandResponse WebRulesAdapter::build_command_response(
    const RulesMutationResult& result,
    const std::optional<std::string> detail_rule_id,
    const ApiTimestampMs now_ms) {
  WebRulesCommandResponse response;
  response.accepted = result.accepted;
  response.code = map_result_code(result.status.code);
  response.message = result.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = result.status.validation_issues;

  const auto catalog = rules_api_service_.get_rule_editor_catalog(now_ms);
  if (result.detail.has_value() && catalog.ok()) {
    response.detail = build_detail_view_model(*result.detail, *catalog.value);
  }

  const auto list = load_rule_list(now_ms);
  if (list.success) {
    response.list = *list.value;
  }

  if (result.accepted && detail_rule_id.has_value()) {
    const auto detail = load_rule_detail(*detail_rule_id, now_ms);
    if (detail.success) {
      response.detail = *detail.value;
    }
  }

  return response;
}

}  // namespace controller::api
