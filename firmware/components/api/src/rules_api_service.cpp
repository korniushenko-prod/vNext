#include "api/rules_api_service.hpp"

#include <algorithm>
#include <functional>
#include <sstream>
#include <type_traits>
#include <unordered_map>
#include <utility>

#include "conditions/condition_node.hpp"
#include "conditions/condition_value.hpp"
#include "hal/relay_hal.hpp"

namespace controller::api {

namespace {

using controller::actuators::ActuatorTargetKind;
using controller::conditions::ConditionConstantBoolNode;
using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionOperator;
using controller::conditions::ConditionRangeMode;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionSignalFlag;
using controller::conditions::ConditionSignalFlagNode;
using controller::conditions::ConditionSignalRangeNode;
using controller::logic::LogicErrorCode;
using controller::logic::RuleAction;
using controller::logic::RuleActionKind;
using controller::logic::RuleDescriptor;
using controller::logic::RuleSnapshot;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::signals::SignalValue;

bool has_text(const std::string& value) {
  return !value.empty();
}

template <typename T>
const T* payload_if(const ConditionNode& node) {
  return std::get_if<T>(&node.payload);
}

std::string bool_text(const bool value) {
  return value ? "true" : "false";
}

std::string relay_state_text(const controller::hal::RelayState state) {
  return state == controller::hal::RelayState::on ? "on" : "off";
}

std::string signal_value_text(const SignalValue& value) {
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

bool is_output_action(const RuleActionKind kind) {
  return kind == RuleActionKind::relay_request || kind == RuleActionKind::pwm_request;
}

std::string action_snippet(const RuleAction& action) {
  if (const auto* relay_action = std::get_if<controller::logic::RuleRelayRequestAction>(&action.payload)) {
    return relay_action->target_id + "=" + relay_state_text(relay_action->state);
  }
  if (const auto* pwm_action = std::get_if<controller::logic::RulePwmRequestAction>(&action.payload)) {
    std::ostringstream stream;
    stream << pwm_action->target_id << "=" << (pwm_action->enabled ? "enabled@" : "disabled@") << pwm_action->duty_percent
           << "%";
    return stream.str();
  }
  if (const auto* timer_action = std::get_if<controller::logic::RuleTimerStartAction>(&action.payload)) {
    return "start " + timer_action->timer_id;
  }
  if (const auto* timer_action = std::get_if<controller::logic::RuleTimerStopAction>(&action.payload)) {
    return "stop " + timer_action->timer_id;
  }
  if (const auto* alarm_action = std::get_if<controller::logic::RuleAlarmSetConditionAction>(&action.payload)) {
    return alarm_action->alarm_id + "=" + bool_text(alarm_action->condition_active);
  }
  if (const auto* signal_action = std::get_if<controller::logic::RuleWriteVirtualSignalAction>(&action.payload)) {
    return signal_action->signal_path + "=" + signal_value_text(signal_action->value);
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
    return has_text(note_action->note) ? note_action->note : "note";
  }
  return std::string{controller::logic::to_string(action.kind)};
}

std::string summarize_action_group(const std::vector<RuleAction>& actions) {
  if (actions.empty()) {
    return "none";
  }

  std::ostringstream stream;
  const std::size_t preview_count = std::min<std::size_t>(actions.size(), 2U);
  for (std::size_t index = 0; index < preview_count; ++index) {
    if (index != 0U) {
      stream << ", ";
    }
    stream << action_snippet(actions[index]);
  }
  if (actions.size() > preview_count) {
    stream << " +" << (actions.size() - preview_count) << " more";
  }
  return stream.str();
}

std::string signal_compare_summary(const ConditionSignalCompareNode& node) {
  return node.signal_path + " " + controller::conditions::to_string(node.op) + " " + condition_value_text(node.rhs);
}

std::string signal_range_summary(const ConditionSignalRangeNode& node) {
  const char* mode = node.mode == ConditionRangeMode::in_range ? "in" : "out";
  return node.signal_path + " " + mode + " [" + condition_value_text(node.lower) + ", " +
         condition_value_text(node.upper) + "]";
}

std::string signal_flag_summary(const ConditionSignalFlagNode& node) {
  return node.signal_path + "." + controller::conditions::to_string(node.flag) + " == " + bool_text(node.expected);
}

RuleSnapshot make_draft_snapshot(const RuleDescriptor& draft, const std::string& reason) {
  RuleSnapshot snapshot;
  snapshot.id = draft.id;
  snapshot.name = draft.name;
  snapshot.enabled = draft.enabled;
  snapshot.active = false;
  snapshot.last_reason = reason;
  snapshot.condition_effective_result = false;
  return snapshot;
}

bool compare_signal_catalog(const RuleSignalCatalogEntryDto& lhs, const RuleSignalCatalogEntryDto& rhs) {
  return lhs.path < rhs.path;
}

bool compare_actuator_catalog(const RuleActuatorCatalogEntryDto& lhs, const RuleActuatorCatalogEntryDto& rhs) {
  return lhs.id < rhs.id;
}

template <typename Entry>
bool compare_named_catalog(const Entry& lhs, const Entry& rhs) {
  return lhs.id < rhs.id;
}

}  // namespace

const char* to_string(const RulesUiResultCode code) {
  switch (code) {
    case RulesUiResultCode::rules_ui_ok:
      return "RULES_UI_OK";
    case RulesUiResultCode::rules_ui_rule_not_found:
      return "RULES_UI_RULE_NOT_FOUND";
    case RulesUiResultCode::rules_ui_save_denied:
      return "RULES_UI_SAVE_DENIED";
    case RulesUiResultCode::rules_ui_delete_denied:
      return "RULES_UI_DELETE_DENIED";
    case RulesUiResultCode::rules_ui_enable_denied:
      return "RULES_UI_ENABLE_DENIED";
    case RulesUiResultCode::rules_ui_disable_denied:
      return "RULES_UI_DISABLE_DENIED";
    case RulesUiResultCode::rules_ui_invalid_argument:
      return "RULES_UI_INVALID_ARGUMENT";
    case RulesUiResultCode::rules_ui_validation_failed:
      return "RULES_UI_VALIDATION_FAILED";
    case RulesUiResultCode::rules_ui_data_unavailable:
      return "RULES_UI_DATA_UNAVAILABLE";
  }

  return "RULES_UI_UNKNOWN";
}

RulesApiService::RulesApiService(
    controller::logic::LogicService& logic_service,
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    controller::sequence::SequenceService& sequence_service)
    : logic_service_(logic_service),
      signal_registry_(signal_registry),
      actuator_manager_(actuator_manager),
      timer_service_(timer_service),
      alarm_service_(alarm_service),
      sequence_service_(sequence_service) {}

RulesUiResult<std::vector<RuleCardDto>> RulesApiService::list_rules(const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);

  RulesUiResult<std::vector<RuleCardDto>> result;
  const auto descriptors = logic_service_.list_rules();
  const auto snapshots = logic_service_.list_snapshots();
  if (descriptors.size() != snapshots.size()) {
    result.status = RulesUiStatus::error(
        RulesUiResultCode::rules_ui_data_unavailable,
        "Rule list and snapshot list sizes do not match.");
    return result;
  }

  std::vector<RuleCardDto> cards;
  cards.reserve(descriptors.size());
  for (std::size_t index = 0; index < descriptors.size(); ++index) {
    cards.push_back(build_rule_card(descriptors[index], snapshots[index]));
  }

  result.status = RulesUiStatus::success("Rules list refreshed.");
  result.value = std::move(cards);
  return result;
}

RulesUiResult<RuleDetailDto> RulesApiService::get_rule(const std::string& rule_id, const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);

  RulesUiResult<RuleDetailDto> result;
  const auto id_status = validate_rule_id(rule_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  const auto descriptor = logic_service_.get_rule(rule_id);
  if (!descriptor.ok()) {
    result.status = map_logic_query_status(descriptor.status, RulesUiResultCode::rules_ui_rule_not_found);
    return result;
  }

  const auto snapshot = logic_service_.get_snapshot(rule_id);
  if (!snapshot.ok()) {
    result.status = map_logic_query_status(snapshot.status, RulesUiResultCode::rules_ui_data_unavailable);
    return result;
  }

  result.status = RulesUiStatus::success("Rule detail refreshed.");
  result.value = build_rule_detail(*descriptor.value, *snapshot.value);
  return result;
}

RulesUiResult<RuleEditorCatalogDto> RulesApiService::get_rule_editor_catalog(const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);

  RulesUiResult<RuleEditorCatalogDto> result;
  result.status = RulesUiStatus::success("Rule editor catalog refreshed.");
  result.value = build_editor_catalog();
  return result;
}

RulesMutationResult RulesApiService::create_rule(const RuleDescriptorDraftDto& draft, const CommandContext& context) {
  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return RulesMutationResult{false, context_status, draft.id, std::nullopt};
  }

  const auto validation = logic_service_.validate_rule(draft);
  if (!validation.ok()) {
    const auto issues = map_validation_issues(validation.issues);
    return RulesMutationResult{
        false,
        RulesUiStatus::error(
            RulesUiResultCode::rules_ui_validation_failed,
            validation.status.message,
            issues),
        draft.id,
        build_rule_detail(draft, make_draft_snapshot(draft, "validation_failed"), issues)};
  }

  const auto operation = logic_service_.register_rule(draft);
  if (!operation.ok()) {
    return RulesMutationResult{
        false,
        map_logic_command_status(operation.status, RulesUiResultCode::rules_ui_save_denied),
        draft.id,
        std::nullopt};
  }

  const auto detail = get_rule(draft.id, context.now_ms);
  return RulesMutationResult{
      true,
      RulesUiStatus::success("Rule '" + draft.id + "' created."),
      draft.id,
      detail.ok() ? detail.value : std::nullopt};
}

RulesMutationResult RulesApiService::update_rule(
    const std::string& rule_id,
    const RuleDescriptorDraftDto& draft,
    const CommandContext& context) {
  const auto id_status = validate_rule_id(rule_id);
  if (!id_status.ok()) {
    return RulesMutationResult{false, id_status, rule_id, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return RulesMutationResult{false, context_status, rule_id, std::nullopt};
  }

  const auto validation = logic_service_.validate_rule(draft, rule_id);
  if (!validation.ok()) {
    const auto issues = map_validation_issues(validation.issues);
    const auto live_snapshot = logic_service_.get_snapshot(rule_id);
    const auto draft_snapshot =
        live_snapshot.ok() ? *live_snapshot.value : make_draft_snapshot(draft, "validation_failed");
    return RulesMutationResult{
        false,
        RulesUiStatus::error(
            RulesUiResultCode::rules_ui_validation_failed,
            validation.status.message,
            issues),
        rule_id,
        build_rule_detail(draft, draft_snapshot, issues)};
  }

  const auto operation = logic_service_.replace_rule(rule_id, draft, context.now_ms);
  if (!operation.ok()) {
    return RulesMutationResult{
        false,
        map_logic_command_status(operation.status, RulesUiResultCode::rules_ui_save_denied),
        rule_id,
        std::nullopt};
  }

  const auto detail = get_rule(rule_id, context.now_ms);
  return RulesMutationResult{
      true,
      RulesUiStatus::success("Rule '" + rule_id + "' updated."),
      rule_id,
      detail.ok() ? detail.value : std::nullopt};
}

RulesMutationResult RulesApiService::delete_rule(const std::string& rule_id, const CommandContext& context) {
  const auto id_status = validate_rule_id(rule_id);
  if (!id_status.ok()) {
    return RulesMutationResult{false, id_status, rule_id, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return RulesMutationResult{false, context_status, rule_id, std::nullopt};
  }

  const auto operation = logic_service_.remove_rule(rule_id, context.now_ms);
  if (!operation.ok()) {
    return RulesMutationResult{
        false,
        map_logic_command_status(operation.status, RulesUiResultCode::rules_ui_delete_denied),
        rule_id,
        std::nullopt};
  }

  return RulesMutationResult{
      true,
      RulesUiStatus::success("Rule '" + rule_id + "' deleted."),
      rule_id,
      std::nullopt};
}

RulesMutationResult RulesApiService::set_rule_enabled(
    const std::string& rule_id,
    const bool enabled,
    const CommandContext& context) {
  const auto id_status = validate_rule_id(rule_id);
  if (!id_status.ok()) {
    return RulesMutationResult{false, id_status, rule_id, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return RulesMutationResult{false, context_status, rule_id, std::nullopt};
  }

  const auto operation = logic_service_.set_rule_enabled(rule_id, enabled, context.now_ms);
  if (!operation.ok()) {
    return RulesMutationResult{
        false,
        map_logic_command_status(
            operation.status,
            enabled ? RulesUiResultCode::rules_ui_enable_denied : RulesUiResultCode::rules_ui_disable_denied),
        rule_id,
        std::nullopt};
  }

  const auto detail = get_rule(rule_id, context.now_ms);
  return RulesMutationResult{
      true,
      RulesUiStatus::success(
          std::string{"Rule '"} + rule_id + "' " + (enabled ? "enabled." : "disabled.")),
      rule_id,
      detail.ok() ? detail.value : std::nullopt};
}

RulesUiStatus RulesApiService::validate_rule_id(const std::string& rule_id) const {
  if (!has_text(rule_id)) {
    return RulesUiStatus::error(
        RulesUiResultCode::rules_ui_invalid_argument,
        "rule_id must not be empty.");
  }
  return RulesUiStatus::success();
}

RulesUiStatus RulesApiService::validate_command_context(const CommandContext& context) const {
  if (!has_text(context.source)) {
    return RulesUiStatus::error(
        RulesUiResultCode::rules_ui_invalid_argument,
        "CommandContext.source must not be empty.");
  }
  if (!has_text(context.reason)) {
    return RulesUiStatus::error(
        RulesUiResultCode::rules_ui_invalid_argument,
        "CommandContext.reason must not be empty.");
  }
  return RulesUiStatus::success();
}

RulesUiStatus RulesApiService::map_logic_query_status(
    const controller::logic::LogicStatus& status,
    const RulesUiResultCode fallback_code) const {
  switch (status.code) {
    case LogicErrorCode::ok:
      return RulesUiStatus::success();
    case LogicErrorCode::logic_rule_not_found:
      return RulesUiStatus::error(RulesUiResultCode::rules_ui_rule_not_found, status.message);
    case LogicErrorCode::logic_invalid_rule:
    case LogicErrorCode::logic_invalid_action:
      return RulesUiStatus::error(RulesUiResultCode::rules_ui_validation_failed, status.message);
    default:
      return RulesUiStatus::error(fallback_code, status.message);
  }
}

RulesUiStatus RulesApiService::map_logic_command_status(
    const controller::logic::LogicStatus& status,
    const RulesUiResultCode denied_code,
    std::vector<RuleValidationIssueDto> issues) const {
  switch (status.code) {
    case LogicErrorCode::ok:
      return RulesUiStatus::success();
    case LogicErrorCode::logic_rule_not_found:
      return RulesUiStatus::error(RulesUiResultCode::rules_ui_rule_not_found, status.message);
    case LogicErrorCode::logic_invalid_rule:
    case LogicErrorCode::logic_invalid_action:
      return RulesUiStatus::error(RulesUiResultCode::rules_ui_validation_failed, status.message, std::move(issues));
    case LogicErrorCode::logic_signal_publish_failed:
      return RulesUiStatus::error(RulesUiResultCode::rules_ui_data_unavailable, status.message);
    default:
      return RulesUiStatus::error(denied_code, status.message);
  }
}

std::vector<RuleValidationIssueDto> RulesApiService::map_validation_issues(
    const std::vector<controller::logic::LogicValidationIssue>& issues) const {
  std::vector<RuleValidationIssueDto> mapped;
  mapped.reserve(issues.size());
  for (const auto& issue : issues) {
    mapped.push_back(RuleValidationIssueDto{
        issue.field,
        controller::logic::to_string(issue.code),
        issue.message,
    });
  }
  return mapped;
}

std::string RulesApiService::build_condition_summary(const controller::conditions::ConditionTree& tree) const {
  std::unordered_map<std::string, const ConditionNode*> nodes_by_id;
  for (const auto& node : tree.nodes) {
    nodes_by_id.emplace(node.metadata.node_id, &node);
  }

  std::function<std::string(const std::string&)> summarize = [&](const std::string& node_id) -> std::string {
    const auto node_it = nodes_by_id.find(node_id);
    if (node_it == nodes_by_id.end()) {
      return "missing(" + node_id + ")";
    }

    const auto& node = *node_it->second;
    if (const auto* group = payload_if<ConditionGroupNode>(node)) {
      std::vector<std::string> child_summaries;
      child_summaries.reserve(group->children.size());
      for (const auto& child_id : group->children) {
        child_summaries.push_back(summarize(child_id));
      }

      std::ostringstream stream;
      if (node.metadata.kind == ConditionNodeKind::all) {
        stream << "ALL(";
      } else if (node.metadata.kind == ConditionNodeKind::any) {
        stream << "ANY(";
      } else {
        stream << "NOT(";
      }
      for (std::size_t index = 0; index < child_summaries.size(); ++index) {
        if (index != 0U) {
          stream << "; ";
        }
        stream << child_summaries[index];
      }
      stream << ")";
      return stream.str();
    }

    if (const auto* constant_node = payload_if<ConditionConstantBoolNode>(node)) {
      return std::string{"CONST "} + bool_text(constant_node->value);
    }
    if (const auto* compare_node = payload_if<ConditionSignalCompareNode>(node)) {
      return signal_compare_summary(*compare_node);
    }
    if (const auto* range_node = payload_if<ConditionSignalRangeNode>(node)) {
      return signal_range_summary(*range_node);
    }
    if (const auto* flag_node = payload_if<ConditionSignalFlagNode>(node)) {
      return signal_flag_summary(*flag_node);
    }
    return std::string{"UNKNOWN("} + node.metadata.node_id + ")";
  };

  if (!has_text(tree.root_node_id)) {
    return "Invalid condition tree";
  }
  return summarize(tree.root_node_id);
}

std::string RulesApiService::build_action_summary(const std::vector<RuleAction>& actions) const {
  return summarize_action_group(actions);
}

std::optional<std::string> RulesApiService::build_else_summary(const std::vector<RuleAction>& actions) const {
  if (actions.empty()) {
    return std::nullopt;
  }
  return "on_false: " + summarize_action_group(actions);
}

std::string RulesApiService::derive_rule_status(const RuleSnapshot& snapshot) const {
  if (!snapshot.enabled) {
    return "disabled";
  }
  if (snapshot.last_error.has_value()) {
    return "error";
  }
  if (snapshot.active) {
    return "active";
  }
  return "inactive";
}

RuleCardDto RulesApiService::build_rule_card(
    const RuleDescriptor& descriptor,
    const RuleSnapshot& snapshot) const {
  RuleCardDto card;
  card.id = descriptor.id;
  card.name = descriptor.name;
  card.enabled = snapshot.enabled;
  card.active = snapshot.active;
  card.status = derive_rule_status(snapshot);
  card.activation_count = snapshot.activation_count;
  card.last_transition_ms = snapshot.last_transition_ms;
  card.last_reason = snapshot.last_reason;
  card.last_error = snapshot.last_error;
  card.if_summary = build_condition_summary(descriptor.condition_tree);
  card.then_summary =
      "on_true: " + build_action_summary(descriptor.on_true_actions) +
      " | while_true: " + build_action_summary(descriptor.while_true_actions);
  card.else_summary = build_else_summary(descriptor.on_false_actions);
  return card;
}

RuleDetailDto RulesApiService::build_rule_detail(
    const RuleDescriptor& descriptor,
    const RuleSnapshot& snapshot,
    std::vector<RuleValidationIssueDto> validation_issues) const {
  RuleDetailDto detail;
  detail.metadata.id = descriptor.id;
  detail.metadata.name = descriptor.name;
  detail.metadata.enabled = descriptor.enabled;
  detail.metadata.description = descriptor.description;
  detail.draft = descriptor;
  detail.current_status.enabled = snapshot.enabled;
  detail.current_status.active = snapshot.active;
  detail.current_status.status = derive_rule_status(snapshot);
  detail.current_status.activation_count = snapshot.activation_count;
  detail.current_status.last_transition_ms = snapshot.last_transition_ms;
  detail.current_status.last_reason = snapshot.last_reason;
  detail.current_status.last_error = snapshot.last_error;
  detail.current_condition_trace = snapshot.condition_trace;
  detail.if_summary = build_condition_summary(descriptor.condition_tree);
  detail.then_summary =
      "on_true: " + build_action_summary(descriptor.on_true_actions) +
      " | while_true: " + build_action_summary(descriptor.while_true_actions);
  detail.else_summary = build_else_summary(descriptor.on_false_actions);
  detail.validation_issues = std::move(validation_issues);
  return detail;
}

RuleEditorCatalogDto RulesApiService::build_editor_catalog() const {
  RuleEditorCatalogDto catalog;

  for (const auto& descriptor : signal_registry_.list_descriptors()) {
    if (!descriptor.visible || descriptor.source_module == "logic_service") {
      continue;
    }

    RuleSignalCatalogEntryDto entry;
    entry.path = descriptor.path;
    entry.name = descriptor.name;
    entry.type = descriptor.type;
    entry.unit = descriptor.unit;
    entry.source_module = descriptor.source_module;
    entry.access_mode = descriptor.access_mode;
    catalog.signals.push_back(entry);
    if (descriptor.access_mode == SignalAccessMode::writable_virtual) {
      catalog.writable_virtual_signals.push_back(entry);
    }
  }
  std::sort(catalog.signals.begin(), catalog.signals.end(), compare_signal_catalog);
  std::sort(
      catalog.writable_virtual_signals.begin(),
      catalog.writable_virtual_signals.end(),
      compare_signal_catalog);

  for (const auto& snapshot : actuator_manager_.list_snapshots()) {
    RuleActuatorCatalogEntryDto entry;
    entry.id = snapshot.target_id;
    entry.kind = snapshot.kind;
    entry.role = snapshot.role;
    if (snapshot.kind == ActuatorTargetKind::relay) {
      catalog.relay_targets.push_back(entry);
    } else {
      catalog.pwm_targets.push_back(entry);
    }
  }
  std::sort(catalog.relay_targets.begin(), catalog.relay_targets.end(), compare_actuator_catalog);
  std::sort(catalog.pwm_targets.begin(), catalog.pwm_targets.end(), compare_actuator_catalog);

  for (const auto& descriptor : timer_service_.list_descriptors()) {
    catalog.timers.push_back(RuleTimerCatalogEntryDto{descriptor.id, descriptor.name});
  }
  std::sort(catalog.timers.begin(), catalog.timers.end(), compare_named_catalog<RuleTimerCatalogEntryDto>);

  for (const auto& descriptor : alarm_service_.list_descriptors()) {
    catalog.alarms.push_back(RuleAlarmCatalogEntryDto{descriptor.id, descriptor.name});
  }
  std::sort(catalog.alarms.begin(), catalog.alarms.end(), compare_named_catalog<RuleAlarmCatalogEntryDto>);

  for (const auto& program : sequence_service_.list_programs()) {
    catalog.programs.push_back(RuleProgramCatalogEntryDto{
        program.id,
        program.name,
        program.type,
        program.enabled,
    });
  }
  std::sort(catalog.programs.begin(), catalog.programs.end(), compare_named_catalog<RuleProgramCatalogEntryDto>);

  return catalog;
}

}  // namespace controller::api
