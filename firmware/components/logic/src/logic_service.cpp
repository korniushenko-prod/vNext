#include "logic/logic_service.hpp"

#include <algorithm>
#include <cstdint>
#include <limits>
#include <string>
#include <type_traits>
#include <utility>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::logic {

namespace {

using controller::actuators::ActuatorPriority;
using controller::actuators::ActuatorRequest;
using controller::actuators::ActuatorTargetKind;
using controller::actuators::PwmActuatorCommand;
using controller::actuators::RelayActuatorCommand;
using controller::conditions::ConditionEvaluationResult;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::signals::SignalValue;

bool has_text(const std::string& value) {
  return !value.empty();
}

std::int64_t to_signal_int64(const std::uint64_t value) {
  constexpr auto max_value = static_cast<std::uint64_t>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

void append_issue(
    LogicValidationResult& result,
    const LogicErrorCode code,
    const std::string& field,
    const std::string& message) {
  result.issues.push_back(LogicValidationIssue{code, field, message});
  if (result.status.ok()) {
    result.status = LogicStatus::error(code, message);
  }
}

std::string rule_owner(const std::string& rule_id) {
  return "rule:" + rule_id;
}

SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type,
    const std::string& unit = "") {
  return SignalDescriptor{
      path,
      name,
      "Logic runtime signal",
      type,
      unit,
      "logic_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

LogicStatus wrap_signal_error(const controller::signals::SignalStatus& status, const std::string& context) {
  return LogicStatus::error(LogicErrorCode::logic_signal_publish_failed, context + ": " + status.message);
}

LogicStatus wrap_actuator_error(const controller::actuators::ActuatorStatus& status, const std::string& context) {
  return LogicStatus::error(LogicErrorCode::logic_output_request_failed, context + ": " + status.message);
}

LogicStatus wrap_timer_error(const controller::timers::TimerStatus& status, const std::string& context) {
  return LogicStatus::error(LogicErrorCode::logic_timer_action_failed, context + ": " + status.message);
}

LogicStatus wrap_alarm_error(const controller::alarms::AlarmStatus& status, const std::string& context) {
  return LogicStatus::error(LogicErrorCode::logic_alarm_action_failed, context + ": " + status.message);
}

LogicStatus wrap_sequence_error(const controller::sequence::SequenceStatus& status, const std::string& context) {
  return LogicStatus::error(LogicErrorCode::logic_sequence_action_failed, context + ": " + status.message);
}

LogicStatus wrap_virtual_signal_error(const controller::signals::SignalStatus& status, const std::string& context) {
  return LogicStatus::error(LogicErrorCode::logic_virtual_signal_write_failed, context + ": " + status.message);
}

LogicStatus wrap_condition_error(const std::string& context) {
  return LogicStatus::error(LogicErrorCode::logic_condition_evaluation_error, context);
}

std::string join_reason_parts(const std::string& lhs, const std::string& rhs) {
  if (!has_text(lhs)) {
    return rhs;
  }
  if (!has_text(rhs)) {
    return lhs;
  }
  return lhs + " | " + rhs;
}

std::string describe_action(const RuleAction& action) {
  if (has_text(action.description)) {
    return action.description;
  }
  if (has_text(action.id)) {
    return action.id;
  }
  return to_string(action.kind);
}

bool is_output_action(const RuleActionKind kind) {
  return kind == RuleActionKind::relay_request || kind == RuleActionKind::pwm_request;
}

LogicStatus register_signal_if_missing(
    controller::signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const LogicTimestampMs now_ms) {
  if (registry.has_signal(descriptor.path)) {
    return LogicStatus::success();
  }

  const auto result = registry.register_signal(descriptor, initial_value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to register signal '" + descriptor.path + "'");
  }
  return LogicStatus::success();
}

LogicStatus update_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const SignalValue& value,
    const LogicTimestampMs now_ms) {
  const auto result = registry.update_signal(path, value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to update signal '" + path + "'");
  }
  return LogicStatus::success();
}

void clear_signal_if_present(controller::signals::SignalRegistry& registry, const std::string& path) {
  if (registry.has_signal(path)) {
    static_cast<void>(registry.clear_signal(path));
  }
}

}  // namespace

const char* to_string(const RuleActionKind kind) {
  switch (kind) {
    case RuleActionKind::relay_request:
      return "relay_request";
    case RuleActionKind::pwm_request:
      return "pwm_request";
    case RuleActionKind::timer_start:
      return "timer_start";
    case RuleActionKind::timer_stop:
      return "timer_stop";
    case RuleActionKind::alarm_set_condition:
      return "alarm_set_condition";
    case RuleActionKind::write_virtual_signal:
      return "write_virtual_signal";
    case RuleActionKind::program_start:
      return "program_start";
    case RuleActionKind::program_request_normal_stop:
      return "program_request_normal_stop";
    case RuleActionKind::program_request_trip:
      return "program_request_trip";
    case RuleActionKind::program_reset_active:
      return "program_reset_active";
    case RuleActionKind::log_note:
      return "log_note";
  }

  return "unknown";
}

const char* to_string(const RuleActionSection section) {
  switch (section) {
    case RuleActionSection::on_true:
      return "on_true";
    case RuleActionSection::while_true:
      return "while_true";
    case RuleActionSection::on_false:
      return "on_false";
  }

  return "unknown";
}

const char* to_string(const RuleEventType event_type) {
  switch (event_type) {
    case RuleEventType::rule_became_true:
      return "rule_became_true";
    case RuleEventType::rule_became_false:
      return "rule_became_false";
    case RuleEventType::output_request_failed:
      return "output_request_failed";
    case RuleEventType::command_executed:
      return "command_executed";
    case RuleEventType::command_failed:
      return "command_failed";
    case RuleEventType::evaluation_error:
      return "evaluation_error";
    case RuleEventType::rule_disabled_cleared:
      return "rule_disabled_cleared";
  }

  return "unknown";
}

const char* to_string(const LogicErrorCode code) {
  switch (code) {
    case LogicErrorCode::ok:
      return "OK";
    case LogicErrorCode::logic_rule_already_registered:
      return "LOGIC_RULE_ALREADY_REGISTERED";
    case LogicErrorCode::logic_rule_not_found:
      return "LOGIC_RULE_NOT_FOUND";
    case LogicErrorCode::logic_invalid_rule:
      return "LOGIC_INVALID_RULE";
    case LogicErrorCode::logic_invalid_action:
      return "LOGIC_INVALID_ACTION";
    case LogicErrorCode::logic_condition_evaluation_error:
      return "LOGIC_CONDITION_EVALUATION_ERROR";
    case LogicErrorCode::logic_output_request_failed:
      return "LOGIC_OUTPUT_REQUEST_FAILED";
    case LogicErrorCode::logic_timer_action_failed:
      return "LOGIC_TIMER_ACTION_FAILED";
    case LogicErrorCode::logic_alarm_action_failed:
      return "LOGIC_ALARM_ACTION_FAILED";
    case LogicErrorCode::logic_sequence_action_failed:
      return "LOGIC_SEQUENCE_ACTION_FAILED";
    case LogicErrorCode::logic_virtual_signal_write_failed:
      return "LOGIC_VIRTUAL_SIGNAL_WRITE_FAILED";
    case LogicErrorCode::logic_rule_disabled:
      return "LOGIC_RULE_DISABLED";
    case LogicErrorCode::logic_signal_publish_failed:
      return "LOGIC_SIGNAL_PUBLISH_FAILED";
  }

  return "UNKNOWN_LOGIC_ERROR";
}

RuleActionKind action_kind_from_payload(const RuleActionPayload& payload) {
  return std::visit(
      [](const auto& candidate) {
        using CandidateType = std::decay_t<decltype(candidate)>;

        if constexpr (std::is_same_v<CandidateType, RuleRelayRequestAction>) {
          return RuleActionKind::relay_request;
        } else if constexpr (std::is_same_v<CandidateType, RulePwmRequestAction>) {
          return RuleActionKind::pwm_request;
        } else if constexpr (std::is_same_v<CandidateType, RuleTimerStartAction>) {
          return RuleActionKind::timer_start;
        } else if constexpr (std::is_same_v<CandidateType, RuleTimerStopAction>) {
          return RuleActionKind::timer_stop;
        } else if constexpr (std::is_same_v<CandidateType, RuleAlarmSetConditionAction>) {
          return RuleActionKind::alarm_set_condition;
        } else if constexpr (std::is_same_v<CandidateType, RuleWriteVirtualSignalAction>) {
          return RuleActionKind::write_virtual_signal;
        } else if constexpr (std::is_same_v<CandidateType, RuleProgramStartAction>) {
          return RuleActionKind::program_start;
        } else if constexpr (std::is_same_v<CandidateType, RuleProgramRequestNormalStopAction>) {
          return RuleActionKind::program_request_normal_stop;
        } else if constexpr (std::is_same_v<CandidateType, RuleProgramRequestTripAction>) {
          return RuleActionKind::program_request_trip;
        } else if constexpr (std::is_same_v<CandidateType, RuleProgramResetActiveAction>) {
          return RuleActionKind::program_reset_active;
        } else {
          return RuleActionKind::log_note;
        }
      },
      payload);
}

LogicService::LogicService(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    controller::sequence::SequenceService& sequence_service,
    const std::size_t history_capacity)
    : signal_registry_(signal_registry),
      actuator_manager_(actuator_manager),
      timer_service_(timer_service),
      alarm_service_(alarm_service),
      sequence_service_(sequence_service),
      history_(history_capacity) {}

LogicValidationResult LogicService::validate_rule(
    const RuleDescriptor& rule,
    const std::optional<std::string> existing_rule_id) const {
  LogicValidationResult result;

  if (!has_text(rule.id)) {
    append_issue(result, LogicErrorCode::logic_invalid_rule, "rule.id", "Rule id must not be empty.");
  } else if (!controller::signals::is_valid_signal_path(rule.id)) {
    append_issue(
        result,
        LogicErrorCode::logic_invalid_rule,
        "rule.id",
        "Rule id '" + rule.id + "' must use dot-separated alphanumeric or underscore segments.");
  } else if (existing_rule_id.has_value() && *existing_rule_id != rule.id) {
    append_issue(
        result,
        LogicErrorCode::logic_invalid_rule,
        "rule.id",
        "Replacement rule id '" + rule.id + "' must match the existing rule id '" + *existing_rule_id + "'.");
  } else if (has_rule(rule.id) && (!existing_rule_id.has_value() || *existing_rule_id != rule.id)) {
    append_issue(
        result,
        LogicErrorCode::logic_rule_already_registered,
        "rule.id",
        "Rule '" + rule.id + "' is already registered.");
  }

  if (!has_text(rule.name)) {
    append_issue(result, LogicErrorCode::logic_invalid_rule, "rule.name", "Rule name must not be empty.");
  }

  const auto condition_validation = controller::conditions::validate_tree(rule.condition_tree);
  if (!condition_validation.ok()) {
    append_issue(
        result,
        LogicErrorCode::logic_invalid_rule,
        "rule.condition_tree",
        "Condition tree is invalid: " + condition_validation.status.message);
  }

  const auto validate_action_section =
      [&](const std::vector<RuleAction>& actions, const RuleActionSection section, const std::string& field_prefix) {
        for (std::size_t index = 0; index < actions.size(); ++index) {
          const auto& action = actions[index];
          const auto field = field_prefix + "[" + std::to_string(index) + "]";

          if (action.kind != action_kind_from_payload(action.payload)) {
            append_issue(
                result,
                LogicErrorCode::logic_invalid_action,
                field,
                "Action kind '" + std::string{to_string(action.kind)} + "' does not match payload.");
            continue;
          }

          const bool output_action = is_output_action(action.kind);
          if (output_action && section != RuleActionSection::while_true) {
            append_issue(
                result,
                LogicErrorCode::logic_invalid_action,
                field,
                "Output action '" + std::string{to_string(action.kind)} + "' is only allowed in while_true_actions.");
            continue;
          }
          if (!output_action && section == RuleActionSection::while_true) {
            append_issue(
                result,
                LogicErrorCode::logic_invalid_action,
                field,
                "Command action '" + std::string{to_string(action.kind)} + "' is not allowed in while_true_actions.");
            continue;
          }

          if (const auto* relay_action = std::get_if<RuleRelayRequestAction>(&action.payload)) {
            const auto snapshot = actuator_manager_.get_snapshot(relay_action->target_id);
            if (!snapshot.ok()) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Relay action references unknown actuator '" + relay_action->target_id + "'.");
            } else if (snapshot.value->kind != ActuatorTargetKind::relay) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Relay action target '" + relay_action->target_id + "' is not a relay actuator.");
            }
          } else if (const auto* pwm_action = std::get_if<RulePwmRequestAction>(&action.payload)) {
            const auto snapshot = actuator_manager_.get_snapshot(pwm_action->target_id);
            if (!snapshot.ok()) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "PWM action references unknown actuator '" + pwm_action->target_id + "'.");
            } else if (snapshot.value->kind != ActuatorTargetKind::pwm) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "PWM action target '" + pwm_action->target_id + "' is not a PWM actuator.");
            }
          } else if (const auto* timer_action = std::get_if<RuleTimerStartAction>(&action.payload)) {
            if (!timer_service_.has_timer(timer_action->timer_id)) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Timer start action references unknown timer '" + timer_action->timer_id + "'.");
            }
          } else if (const auto* timer_action = std::get_if<RuleTimerStopAction>(&action.payload)) {
            if (!timer_service_.has_timer(timer_action->timer_id)) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Timer stop action references unknown timer '" + timer_action->timer_id + "'.");
            }
          } else if (const auto* alarm_action = std::get_if<RuleAlarmSetConditionAction>(&action.payload)) {
            if (!alarm_service_.has_alarm(alarm_action->alarm_id)) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Alarm action references unknown alarm '" + alarm_action->alarm_id + "'.");
            }
          } else if (const auto* signal_action = std::get_if<RuleWriteVirtualSignalAction>(&action.payload)) {
            const auto descriptor_result = signal_registry_.get_descriptor(signal_action->signal_path);
            if (!descriptor_result.ok()) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Virtual signal action references unknown signal '" + signal_action->signal_path + "'.");
            } else if (descriptor_result.value->access_mode != SignalAccessMode::writable_virtual) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Signal '" + signal_action->signal_path + "' is not writable_virtual.");
            } else if (!controller::signals::signal_value_matches_type(signal_action->value, descriptor_result.value->type)) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Virtual signal action value type does not match '" + signal_action->signal_path + "'.");
            }
          } else if (const auto* program_action = std::get_if<RuleProgramStartAction>(&action.payload)) {
            if (!sequence_service_.has_program(program_action->program_id)) {
              append_issue(
                  result,
                  LogicErrorCode::logic_invalid_action,
                  field,
                  "Program start action references unknown program '" + program_action->program_id + "'.");
            }
          }
        }
      };

  validate_action_section(rule.on_true_actions, RuleActionSection::on_true, "rule.on_true_actions");
  validate_action_section(rule.while_true_actions, RuleActionSection::while_true, "rule.while_true_actions");
  validate_action_section(rule.on_false_actions, RuleActionSection::on_false, "rule.on_false_actions");

  if (result.status.ok()) {
    result.status = LogicStatus::success();
  }
  return result;
}

LogicOperationResult LogicService::register_rule(const RuleDescriptor& rule) {
  if (rules_by_id_.count(rule.id) != 0U) {
    return LogicOperationResult{
        LogicStatus::error(
            LogicErrorCode::logic_rule_already_registered,
            "Rule '" + rule.id + "' is already registered.")};
  }

  const auto validation = validate_rule(rule);
  if (!validation.ok()) {
    return LogicOperationResult{LogicStatus::error(
        validation.status.code == LogicErrorCode::ok ? LogicErrorCode::logic_invalid_rule : validation.status.code,
        validation.status.message)};
  }

  RuleRecord record{
      rule,
      controller::conditions::ConditionEvaluator(rule.condition_tree, signal_registry_),
      RuntimeRuleState{},
      false,
  };

  auto status = ensure_global_signals_registered();
  if (!status.ok()) {
    return LogicOperationResult{status};
  }
  status = ensure_rule_signals_registered(rule);
  if (!status.ok()) {
    return LogicOperationResult{status};
  }
  record.signals_registered = true;

  rule_order_.push_back(rule.id);
  rules_by_id_.emplace(rule.id, std::move(record));
  recompute_summary();

  status = publish_signals(0U);
  return LogicOperationResult{status};
}

bool LogicService::has_rule(const std::string& id) const {
  return rules_by_id_.count(id) != 0U;
}

LogicResult<RuleDescriptor> LogicService::get_rule(const std::string& id) const {
  LogicResult<RuleDescriptor> result;
  const auto entry = rules_by_id_.find(id);
  if (entry == rules_by_id_.end()) {
    result.status = LogicStatus::error(LogicErrorCode::logic_rule_not_found, "Rule '" + id + "' is not registered.");
    return result;
  }

  result.status = LogicStatus::success();
  result.value = entry->second.descriptor;
  return result;
}

std::vector<RuleDescriptor> LogicService::list_rules() const {
  std::vector<RuleDescriptor> rules;
  rules.reserve(rule_order_.size());
  for (const auto& id : rule_order_) {
    rules.push_back(rules_by_id_.at(id).descriptor);
  }
  return rules;
}

LogicOperationResult LogicService::tick(const LogicTimestampMs now_ms) {
  summary_.last_tick_ms = now_ms;
  ++summary_.update_counter;

  bool actuator_state_dirty = false;
  LogicStatus first_error = LogicStatus::success();

  for (const auto& id : rule_order_) {
    auto& record = rules_by_id_.at(id);
    if (!record.descriptor.enabled) {
      continue;
    }

    const auto status = process_rule(record, now_ms, actuator_state_dirty);
    if (first_error.ok() && !status.ok()) {
      first_error = status;
    }
  }

  if (actuator_state_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (first_error.ok() && !evaluate_result.ok()) {
      first_error = wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state for logic rules.");
    }
  }

  recompute_summary();
  const auto publish_status = publish_signals(now_ms);
  if (first_error.ok() && !publish_status.ok()) {
    first_error = publish_status;
  }

  return LogicOperationResult{first_error};
}

LogicOperationResult LogicService::replace_rule(
    const std::string& id,
    const RuleDescriptor& rule,
    const LogicTimestampMs now_ms) {
  const auto entry = rules_by_id_.find(id);
  if (entry == rules_by_id_.end()) {
    return LogicOperationResult{
        LogicStatus::error(LogicErrorCode::logic_rule_not_found, "Rule '" + id + "' is not registered.")};
  }

  const auto validation = validate_rule(rule, id);
  if (!validation.ok()) {
    return LogicOperationResult{LogicStatus::error(
        validation.status.code == LogicErrorCode::ok ? LogicErrorCode::logic_invalid_rule : validation.status.code,
        validation.status.message)};
  }

  auto status = ensure_global_signals_registered();
  if (!status.ok()) {
    return LogicOperationResult{status};
  }
  status = ensure_rule_signals_registered(rule);
  if (!status.ok()) {
    return LogicOperationResult{status};
  }

  auto& record = entry->second;
  bool actuator_state_dirty = false;
  status = reset_rule_runtime(record, now_ms, "rule_replaced", true, false, actuator_state_dirty);
  if (status.ok()) {
    auto replacement_runtime = record.runtime;
    const auto signals_registered = record.signals_registered;
    rules_by_id_.erase(entry);
    rules_by_id_.emplace(
        id,
        RuleRecord{
            rule,
            controller::conditions::ConditionEvaluator(rule.condition_tree, signal_registry_),
            std::move(replacement_runtime),
            signals_registered,
        });
  }

  if (actuator_state_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (status.ok() && !evaluate_result.ok()) {
      status = wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after rule replacement.");
    }
  }

  recompute_summary();
  const auto publish_status = publish_signals(now_ms);
  if (status.ok() && !publish_status.ok()) {
    status = publish_status;
  }

  return LogicOperationResult{status};
}

LogicOperationResult LogicService::remove_rule(const std::string& id, const LogicTimestampMs now_ms) {
  const auto entry = rules_by_id_.find(id);
  if (entry == rules_by_id_.end()) {
    return LogicOperationResult{
        LogicStatus::error(LogicErrorCode::logic_rule_not_found, "Rule '" + id + "' is not registered.")};
  }

  bool actuator_state_dirty = false;
  auto status = reset_rule_runtime(entry->second, now_ms, "rule_removed", true, false, actuator_state_dirty);

  rule_order_.erase(std::remove(rule_order_.begin(), rule_order_.end(), id), rule_order_.end());
  rules_by_id_.erase(entry);
  clear_rule_signals(id);

  if (actuator_state_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (status.ok() && !evaluate_result.ok()) {
      status = wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after rule removal.");
    }
  }

  recompute_summary();
  const auto publish_status = publish_signals(now_ms);
  if (status.ok() && !publish_status.ok()) {
    status = publish_status;
  }

  return LogicOperationResult{status};
}

LogicOperationResult LogicService::set_rule_enabled(const std::string& id, const bool enabled, const LogicTimestampMs now_ms) {
  const auto entry = rules_by_id_.find(id);
  if (entry == rules_by_id_.end()) {
    return LogicOperationResult{
        LogicStatus::error(LogicErrorCode::logic_rule_not_found, "Rule '" + id + "' is not registered.")};
  }

  auto& record = entry->second;
  if (record.descriptor.enabled == enabled) {
    return LogicOperationResult{LogicStatus::success()};
  }

  record.descriptor.enabled = enabled;

  LogicStatus status = LogicStatus::success();
  bool actuator_state_dirty = false;
  if (enabled) {
    record.runtime.last_error.reset();
    record.runtime.last_reason = "rule_enabled";
    ++record.runtime.update_counter;
  } else {
    status = reset_rule_runtime(record, now_ms, "rule_disabled", true, true, actuator_state_dirty);
  }

  if (actuator_state_dirty) {
    const auto evaluate_result = actuator_manager_.evaluate(now_ms);
    if (status.ok() && !evaluate_result.ok()) {
      status = wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after enable change.");
    }
  }

  recompute_summary();
  const auto publish_status = publish_signals(now_ms);
  if (status.ok() && !publish_status.ok()) {
    status = publish_status;
  }

  return LogicOperationResult{status};
}

LogicResult<RuleSnapshot> LogicService::get_snapshot(const std::string& id) const {
  LogicResult<RuleSnapshot> result;
  const auto entry = rules_by_id_.find(id);
  if (entry == rules_by_id_.end()) {
    result.status = LogicStatus::error(LogicErrorCode::logic_rule_not_found, "Rule '" + id + "' is not registered.");
    return result;
  }

  result.status = LogicStatus::success();
  result.value = build_snapshot(entry->second);
  return result;
}

std::vector<RuleSnapshot> LogicService::list_snapshots() const {
  std::vector<RuleSnapshot> snapshots;
  snapshots.reserve(rule_order_.size());
  for (const auto& id : rule_order_) {
    snapshots.push_back(build_snapshot(rules_by_id_.at(id)));
  }
  return snapshots;
}

LogicSummary LogicService::get_summary() const {
  return summary_;
}

std::vector<RuleHistoryEntry> LogicService::read_history() const {
  return history_.read();
}

void LogicService::clear_history() {
  history_.clear();
}

LogicStatus LogicService::ensure_global_signals_registered() {
  if (global_signals_registered_) {
    return LogicStatus::success();
  }

  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor("rule.any_active", "Rule any active", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor("rule.active_count", "Rule active count", SignalType::int64),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return status;
  }

  global_signals_registered_ = true;
  return LogicStatus::success();
}

LogicStatus LogicService::ensure_rule_signals_registered(const RuleDescriptor& rule) {
  const auto base = "rule." + rule.id;

  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".enabled", rule.name + " enabled", SignalType::boolean),
      SignalValue{rule.enabled},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".active", rule.name + " active", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".activation_count", rule.name + " activation count", SignalType::int64),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_reason", rule.name + " last reason", SignalType::string),
      SignalValue{std::string{}},
      0U);
  if (!status.ok()) {
    return status;
  }

  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_transition_ms", rule.name + " last transition", SignalType::int64, "ms"),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return status;
  }

  return register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_error", rule.name + " last error", SignalType::string),
      SignalValue{std::string{}},
      0U);
}

LogicStatus LogicService::publish_signals(const LogicTimestampMs now_ms) {
  auto status = ensure_global_signals_registered();
  if (!status.ok()) {
    return status;
  }

  status = update_signal(signal_registry_, "rule.any_active", SignalValue{summary_.any_rule_active}, now_ms);
  if (!status.ok()) {
    return status;
  }

  status = update_signal(signal_registry_, "rule.active_count", SignalValue{to_signal_int64(summary_.active_rule_count)}, now_ms);
  if (!status.ok()) {
    return status;
  }

  for (const auto& id : rule_order_) {
    const auto& record = rules_by_id_.at(id);
    status = ensure_rule_signals_registered(record.descriptor);
    if (!status.ok()) {
      return status;
    }

    const auto base = "rule." + record.descriptor.id;
    status = update_signal(signal_registry_, base + ".enabled", SignalValue{record.descriptor.enabled}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".active", SignalValue{record.runtime.active}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(
        signal_registry_,
        base + ".activation_count",
        SignalValue{to_signal_int64(record.runtime.activation_count)},
        now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".last_reason", SignalValue{record.runtime.last_reason}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(
        signal_registry_,
        base + ".last_transition_ms",
        SignalValue{to_signal_int64(record.runtime.last_transition_ms)},
        now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(
        signal_registry_,
        base + ".last_error",
        SignalValue{record.runtime.last_error.value_or(std::string{})},
        now_ms);
    if (!status.ok()) {
      return status;
    }
  }

  return LogicStatus::success();
}

LogicStatus LogicService::process_rule(RuleRecord& record, const LogicTimestampMs now_ms, bool& actuator_state_dirty) {
  ++record.runtime.update_counter;
  record.runtime.initialized = true;
  record.runtime.last_error.reset();

  const bool was_active = record.runtime.active;
  const ConditionEvaluationResult evaluation = record.evaluator.evaluate(now_ms);
  record.runtime.last_condition_trace = evaluation.trace;
  record.runtime.last_raw_result = evaluation.raw_result;

  bool effective_result = false;
  LogicStatus first_error = LogicStatus::success();

  if (!evaluation.ok()) {
    effective_result = false;
    record.runtime.last_error = evaluation.reason;
    record.runtime.last_reason = "Condition evaluation failed: " + evaluation.reason;
    record_history(record.descriptor.id, RuleEventType::evaluation_error, now_ms, "condition", evaluation.reason);
    first_error = wrap_condition_error(
        "Rule '" + record.descriptor.id + "' condition evaluation failed: " + evaluation.reason);
  } else {
    effective_result = evaluation.effective_result;
    record.runtime.last_reason = evaluation.reason;
  }

  if (!was_active && effective_result) {
    record.runtime.active = true;
    record.runtime.last_effective_result = true;
    record.runtime.last_transition_ms = now_ms;
    ++record.runtime.activation_count;
    record_history(record.descriptor.id, RuleEventType::rule_became_true, now_ms, rule_owner(record.descriptor.id), record.runtime.last_reason);

    const auto status = execute_command_actions(record, RuleActionSection::on_true, record.descriptor.on_true_actions, now_ms);
    if (first_error.ok() && !status.ok()) {
      first_error = status;
    }
  } else if (was_active && !effective_result) {
    const auto status = clear_rule_outputs(record, now_ms, false, actuator_state_dirty);
    if (first_error.ok() && !status.ok()) {
      first_error = status;
    }

    record.runtime.active = false;
    record.runtime.last_effective_result = false;
    record.runtime.last_transition_ms = now_ms;
    if (evaluation.ok() && !has_text(record.runtime.last_reason)) {
      record.runtime.last_reason = "condition_false";
    }
    record_history(record.descriptor.id, RuleEventType::rule_became_false, now_ms, rule_owner(record.descriptor.id), record.runtime.last_reason);

    const auto on_false_status =
        execute_command_actions(record, RuleActionSection::on_false, record.descriptor.on_false_actions, now_ms);
    if (first_error.ok() && !on_false_status.ok()) {
      first_error = on_false_status;
    }
  } else {
    record.runtime.active = effective_result;
    record.runtime.last_effective_result = effective_result;
    if (!effective_result && evaluation.ok() && !has_text(record.runtime.last_reason)) {
      record.runtime.last_reason = "condition_false";
    }
  }

  if (record.runtime.active) {
    const auto status = apply_persistent_actions(record, record.descriptor.while_true_actions, now_ms, actuator_state_dirty);
    if (first_error.ok() && !status.ok()) {
      first_error = status;
    }
  }

  return first_error;
}

LogicStatus LogicService::execute_command_actions(
    RuleRecord& record,
    const RuleActionSection section,
    const std::vector<RuleAction>& actions,
    const LogicTimestampMs now_ms) {
  for (const auto& action : actions) {
    const auto status = apply_command_action(record, section, action, now_ms);
    if (!status.ok()) {
      record.runtime.last_error = status.message;
      record.runtime.last_reason = status.message;
      record_history(record.descriptor.id, RuleEventType::command_failed, now_ms, std::string{to_string(section)}, status.message);
      return status;
    }

    record_history(
        record.descriptor.id,
        RuleEventType::command_executed,
        now_ms,
        std::string{to_string(section)},
        describe_action(action));
  }

  return LogicStatus::success();
}

LogicStatus LogicService::reset_rule_runtime(
    RuleRecord& record,
    const LogicTimestampMs now_ms,
    const std::string& reason,
    const bool clear_outputs,
    const bool record_history_entry,
    bool& actuator_state_dirty) {
  LogicStatus status = LogicStatus::success();
  if (clear_outputs) {
    status = clear_rule_outputs(record, now_ms, record_history_entry, actuator_state_dirty);
  }

  record.evaluator.reset_runtime();
  const auto next_update_counter = record.runtime.update_counter + 1U;
  record.runtime = RuntimeRuleState{};
  record.runtime.initialized = false;
  record.runtime.update_counter = next_update_counter;
  record.runtime.last_reason = reason;
  return status;
}

LogicStatus LogicService::apply_persistent_actions(
    RuleRecord& record,
    const std::vector<RuleAction>& actions,
    const LogicTimestampMs now_ms,
    bool& actuator_state_dirty) {
  LogicStatus first_error = LogicStatus::success();
  const auto owner = rule_owner(record.descriptor.id);

  for (const auto& action : actions) {
    if (const auto* relay_action = std::get_if<RuleRelayRequestAction>(&action.payload)) {
      const auto result = actuator_manager_.submit_request(ActuatorRequest{
          relay_action->target_id,
          owner,
          join_reason_parts(
              "Rule '" + record.descriptor.name + "'",
              has_text(relay_action->reason) ? relay_action->reason : describe_action(action)),
          ActuatorPriority::auto_rule,
          now_ms,
          std::nullopt,
          RelayActuatorCommand{relay_action->state},
      });
      if (!result.ok()) {
        const auto status =
            wrap_actuator_error(result.status, "Failed to submit relay request for '" + relay_action->target_id + "'");
        record.runtime.last_error = status.message;
        record.runtime.last_reason = status.message;
        record_history(record.descriptor.id, RuleEventType::output_request_failed, now_ms, owner, status.message);
        if (first_error.ok()) {
          first_error = status;
        }
        continue;
      }

      actuator_state_dirty = true;
    } else if (const auto* pwm_action = std::get_if<RulePwmRequestAction>(&action.payload)) {
      const auto result = actuator_manager_.submit_request(ActuatorRequest{
          pwm_action->target_id,
          owner,
          join_reason_parts(
              "Rule '" + record.descriptor.name + "'",
              has_text(pwm_action->reason) ? pwm_action->reason : describe_action(action)),
          ActuatorPriority::auto_rule,
          now_ms,
          std::nullopt,
          PwmActuatorCommand{pwm_action->duty_percent, pwm_action->enabled},
      });
      if (!result.ok()) {
        const auto status = wrap_actuator_error(result.status, "Failed to submit PWM request for '" + pwm_action->target_id + "'");
        record.runtime.last_error = status.message;
        record.runtime.last_reason = status.message;
        record_history(record.descriptor.id, RuleEventType::output_request_failed, now_ms, owner, status.message);
        if (first_error.ok()) {
          first_error = status;
        }
        continue;
      }

      actuator_state_dirty = true;
    }
  }

  return first_error;
}

LogicStatus LogicService::clear_rule_outputs(
    RuleRecord& record,
    const LogicTimestampMs now_ms,
    const bool record_history_entry,
    bool& actuator_state_dirty) {
  const auto owner = rule_owner(record.descriptor.id);
  const auto clear_result = actuator_manager_.clear_requests_for_owner(owner);
  if (!clear_result.ok()) {
    const auto status = wrap_actuator_error(clear_result.status, "Failed to clear actuator owner '" + owner + "'");
    record.runtime.last_error = status.message;
    record.runtime.last_reason = status.message;
    return status;
  }

  actuator_state_dirty = true;
  if (record_history_entry) {
    record_history(record.descriptor.id, RuleEventType::rule_disabled_cleared, now_ms, owner, "disabled_rule_cleared_outputs");
  }

  return LogicStatus::success();
}

LogicStatus LogicService::apply_command_action(
    RuleRecord& record,
    const RuleActionSection section,
    const RuleAction& action,
    const LogicTimestampMs now_ms) {
  const auto owner = rule_owner(record.descriptor.id);
  const auto action_reason = join_reason_parts(
      "Rule '" + record.descriptor.name + "'",
      join_reason_parts(std::string{to_string(section)} + " action", describe_action(action)));

  if (const auto* timer_action = std::get_if<RuleTimerStartAction>(&action.payload)) {
    const auto result = timer_service_.start_timer(timer_action->timer_id, now_ms);
    if (!result.ok()) {
      return wrap_timer_error(result.status, "Failed to start timer '" + timer_action->timer_id + "'");
    }
    return LogicStatus::success();
  }

  if (const auto* timer_action = std::get_if<RuleTimerStopAction>(&action.payload)) {
    const auto result = timer_service_.stop_timer(timer_action->timer_id, now_ms);
    if (!result.ok()) {
      return wrap_timer_error(result.status, "Failed to stop timer '" + timer_action->timer_id + "'");
    }
    return LogicStatus::success();
  }

  if (const auto* alarm_action = std::get_if<RuleAlarmSetConditionAction>(&action.payload)) {
    const auto result = alarm_service_.set_condition(
        alarm_action->alarm_id,
        alarm_action->condition_active,
        now_ms,
        owner,
        action_reason);
    if (!result.ok()) {
      return wrap_alarm_error(result.status, "Failed to set alarm '" + alarm_action->alarm_id + "'");
    }
    return LogicStatus::success();
  }

  if (const auto* signal_action = std::get_if<RuleWriteVirtualSignalAction>(&action.payload)) {
    const auto result = signal_registry_.write_virtual_signal(signal_action->signal_path, signal_action->value, now_ms);
    if (!result.ok()) {
      return wrap_virtual_signal_error(result.status, "Failed to write virtual signal '" + signal_action->signal_path + "'");
    }
    return LogicStatus::success();
  }

  if (const auto* program_action = std::get_if<RuleProgramStartAction>(&action.payload)) {
    const auto result = sequence_service_.start_program(program_action->program_id, now_ms, owner, action_reason);
    if (!result.ok()) {
      return wrap_sequence_error(result.status, "Failed to start program '" + program_action->program_id + "'");
    }
    return LogicStatus::success();
  }

  if (std::holds_alternative<RuleProgramRequestNormalStopAction>(action.payload)) {
    const auto result = sequence_service_.request_normal_stop(now_ms, owner, action_reason);
    if (!result.ok()) {
      return wrap_sequence_error(result.status, "Failed to request normal stop.");
    }
    return LogicStatus::success();
  }

  if (std::holds_alternative<RuleProgramRequestTripAction>(action.payload)) {
    const auto result = sequence_service_.request_trip_stop(now_ms, owner, action_reason);
    if (!result.ok()) {
      return wrap_sequence_error(result.status, "Failed to request trip stop.");
    }
    return LogicStatus::success();
  }

  if (std::holds_alternative<RuleProgramResetActiveAction>(action.payload)) {
    const auto result = sequence_service_.reset_active_program(now_ms, owner, action_reason);
    if (!result.ok()) {
      return wrap_sequence_error(result.status, "Failed to reset active program.");
    }
    return LogicStatus::success();
  }

  if (const auto* note_action = std::get_if<RuleLogNoteAction>(&action.payload)) {
    record.runtime.last_reason = has_text(note_action->note) ? note_action->note : action_reason;
    return LogicStatus::success();
  }

  return LogicStatus::success();
}

void LogicService::clear_rule_signals(const std::string& rule_id) {
  const auto base = "rule." + rule_id;
  clear_signal_if_present(signal_registry_, base + ".enabled");
  clear_signal_if_present(signal_registry_, base + ".active");
  clear_signal_if_present(signal_registry_, base + ".activation_count");
  clear_signal_if_present(signal_registry_, base + ".last_reason");
  clear_signal_if_present(signal_registry_, base + ".last_transition_ms");
  clear_signal_if_present(signal_registry_, base + ".last_error");
}

void LogicService::recompute_summary() {
  summary_.active_rule_count = 0U;
  for (const auto& id : rule_order_) {
    const auto entry = rules_by_id_.find(id);
    if (entry != rules_by_id_.end() && entry->second.runtime.active) {
      ++summary_.active_rule_count;
    }
  }
  summary_.any_rule_active = summary_.active_rule_count > 0U;
}

void LogicService::record_history(
    const std::string& rule_id,
    const RuleEventType event_type,
    const LogicTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  history_.append(RuleHistoryEntry{
      0U,
      rule_id,
      event_type,
      now_ms,
      source,
      reason,
  });
}

RuleSnapshot LogicService::build_snapshot(const RuleRecord& record) const {
  RuleSnapshot snapshot;
  snapshot.id = record.descriptor.id;
  snapshot.name = record.descriptor.name;
  snapshot.enabled = record.descriptor.enabled;
  snapshot.active = record.runtime.active;
  snapshot.activation_count = record.runtime.activation_count;
  snapshot.last_transition_ms = record.runtime.last_transition_ms;
  snapshot.last_reason = record.runtime.last_reason;
  snapshot.last_error = record.runtime.last_error;
  snapshot.condition_effective_result = record.runtime.last_effective_result;
  snapshot.owner = rule_owner(record.descriptor.id);
  snapshot.condition_trace = record.runtime.last_condition_trace;
  snapshot.update_counter = record.runtime.update_counter;

  if (record.runtime.active) {
    snapshot.active_output_count = static_cast<std::size_t>(std::count_if(
        record.descriptor.while_true_actions.begin(),
        record.descriptor.while_true_actions.end(),
        [](const RuleAction& action) { return is_output_action(action.kind); }));
  }

  return snapshot;
}

}  // namespace controller::logic
