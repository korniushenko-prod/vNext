#include "sequence/sequence_service.hpp"

#include <algorithm>
#include <cstdint>
#include <limits>
#include <sstream>
#include <string>
#include <string_view>
#include <type_traits>
#include <unordered_map>
#include <utility>

#include "signals/signal_descriptor.hpp"
#include "signals/signal_value.hpp"

namespace controller::sequence {

namespace {

using controller::actuators::ActuatorPriority;
using controller::actuators::ActuatorRequest;
using controller::actuators::PwmActuatorCommand;
using controller::actuators::RelayActuatorCommand;
using controller::conditions::ConditionEvaluationResult;
using controller::conditions::ConditionEvaluator;
using controller::conditions::ConditionTraceEntry;
using controller::signals::SignalAccessMode;
using controller::signals::SignalDescriptor;
using controller::signals::SignalType;
using controller::signals::SignalValue;

bool has_text(const std::string& value) {
  return !value.empty();
}

bool ends_with(const std::string& value, const std::string_view suffix) {
  return value.size() >= suffix.size() &&
         value.compare(value.size() - suffix.size(), suffix.size(), suffix.data(), suffix.size()) == 0;
}

std::int64_t to_signal_int64(const SequenceDurationMs value) {
  constexpr auto max_value = static_cast<SequenceDurationMs>(std::numeric_limits<std::int64_t>::max());
  if (value > max_value) {
    return std::numeric_limits<std::int64_t>::max();
  }
  return static_cast<std::int64_t>(value);
}

void append_issue(
    SequenceValidationResult& result,
    const SequenceErrorCode code,
    const std::string& field,
    const std::string& message) {
  result.issues.push_back(SequenceValidationIssue{code, field, message});
  if (result.status.ok()) {
    result.status = SequenceStatus::error(code, message);
  }
}

void append_editor_issue(
    ProgramEditorValidationResult& result,
    const ProgramEditorErrorCode status_code,
    const std::string& path,
    std::string code,
    const ProgramEditorIssueSeverity severity,
    std::string message) {
  result.issues.push_back(ProgramEditorValidationIssue{
      path,
      std::move(code),
      severity,
      std::move(message),
  });

  if (severity == ProgramEditorIssueSeverity::error && result.status.ok()) {
    result.status = ProgramEditorStatus::error(status_code, result.issues.back().message);
  }
}

std::string state_owner(const std::string& program_id, const std::string& state_id) {
  return "program:" + program_id + ":state:" + state_id;
}

SignalDescriptor make_signal_descriptor(
    const std::string& path,
    const std::string& name,
    const SignalType type,
    const std::string& unit = "") {
  return SignalDescriptor{
      path,
      name,
      "Sequence runtime signal",
      type,
      unit,
      "sequence_service",
      SignalAccessMode::read_only,
      0U,
      true,
      true,
  };
}

SequenceStatus wrap_signal_error(const controller::signals::SignalStatus& status, const std::string& context) {
  return SequenceStatus::error(
      SequenceErrorCode::sequence_signal_publish_failed,
      context + ": " + status.message);
}

SequenceStatus wrap_actuator_error(const controller::actuators::ActuatorStatus& status, const std::string& context) {
  return SequenceStatus::error(
      SequenceErrorCode::sequence_actuator_request_failed,
      context + ": " + status.message);
}

SequenceStatus wrap_timer_error(const controller::timers::TimerStatus& status, const std::string& context) {
  return SequenceStatus::error(
      SequenceErrorCode::sequence_timer_action_failed,
      context + ": " + status.message);
}

SequenceStatus wrap_alarm_error(const controller::alarms::AlarmStatus& status, const std::string& context) {
  return SequenceStatus::error(
      SequenceErrorCode::sequence_alarm_action_failed,
      context + ": " + status.message);
}

SequenceStatus wrap_virtual_signal_error(const controller::signals::SignalStatus& status, const std::string& context) {
  return SequenceStatus::error(
      SequenceErrorCode::sequence_virtual_signal_write_failed,
      context + ": " + status.message);
}

SequenceLifecycle lifecycle_for_runtime(
    const SequenceRuntimeState& runtime,
    const SequenceProgram& program,
    const std::string& current_state_id) {
  if (!runtime.active_program_id.has_value()) {
    return SequenceLifecycle::idle;
  }
  if (current_state_id == program.lockout_state_id) {
    return SequenceLifecycle::lockout;
  }
  if (current_state_id == program.trip_state_id) {
    return SequenceLifecycle::trip_requested;
  }
  if (current_state_id == program.normal_stop_state_id) {
    return SequenceLifecycle::completed;
  }
  if (runtime.pending_trip) {
    return SequenceLifecycle::trip_requested;
  }
  if (runtime.pending_normal_stop) {
    return SequenceLifecycle::normal_stop_requested;
  }
  return SequenceLifecycle::running;
}

std::string describe_action(const SequenceAction& action) {
  if (has_text(action.description)) {
    return action.description;
  }
  if (has_text(action.id)) {
    return action.id;
  }
  return to_string(action.kind);
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

SequenceStatus register_signal_if_missing(
    controller::signals::SignalRegistry& registry,
    const SignalDescriptor& descriptor,
    const SignalValue& initial_value,
    const SequenceTimestampMs now_ms) {
  if (registry.has_signal(descriptor.path)) {
    return SequenceStatus::success();
  }

  const auto result = registry.register_signal(descriptor, initial_value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to register signal '" + descriptor.path + "'");
  }
  return SequenceStatus::success();
}

SequenceStatus update_signal(
    controller::signals::SignalRegistry& registry,
    const std::string& path,
    const SignalValue& value,
    const SequenceTimestampMs now_ms) {
  const auto result = registry.update_signal(path, value, now_ms, true, false);
  if (!result.ok()) {
    return wrap_signal_error(result.status, "Failed to update signal '" + path + "'");
  }
  return SequenceStatus::success();
}

bool is_output_action_kind(const SequenceActionKind kind) {
  return kind == SequenceActionKind::relay_request || kind == SequenceActionKind::pwm_request;
}

SequenceProgram build_sequence_program_from_editor_draft(const ProgramEditorDraft& draft) {
  SequenceProgram program;
  program.id = draft.program_id;
  program.name = draft.name;
  program.description = draft.description;
  program.enabled = draft.enabled;
  program.type = draft.type;
  program.initial_state_id = draft.initial_state_id;
  program.normal_stop_state_id = draft.normal_stop_state_id;
  program.trip_state_id = draft.trip_state_id;
  program.lockout_state_id = draft.lockout_state_id;
  program.start_condition = draft.start_condition;
  program.reset_condition = draft.reset_condition;
  program.states.reserve(draft.states.size());

  for (const auto& state_draft : draft.states) {
    SequenceState state;
    state.id = state_draft.id;
    state.name = state_draft.name;
    state.enabled = state_draft.enabled;
    state.type = state_draft.state_type;
    state.entry_actions = state_draft.entry_actions;
    state.active_actions = state_draft.active_actions;
    state.exit_actions = state_draft.exit_actions;
    state.guard_condition = state_draft.guard_condition;
    state.guard_fail_target_state_id = state_draft.guard_fail_target_state_id;
    state.min_time_ms = state_draft.min_time_ms;
    state.max_time_ms = state_draft.max_time_ms;
    state.timeout_target_state_id = state_draft.timeout_target_state_id;
    state.non_skippable = state_draft.non_skippable;
    state.manual_allowed = state_draft.manual_allowed;
    state.transitions.reserve(state_draft.transitions.size());

    for (const auto& transition_draft : state_draft.transitions) {
      state.transitions.push_back(SequenceTransition{
          transition_draft.id,
          transition_draft.name,
          transition_draft.target_state_id,
          transition_draft.condition_tree,
          transition_draft.require_min_time_done,
          transition_draft.enabled,
      });
    }

    program.states.push_back(std::move(state));
  }

  return program;
}

std::string map_sequence_issue_to_editor_code(const SequenceValidationIssue& issue) {
  if (issue.field == "program.id") {
    return "PROGRAM_EDITOR_INVALID_ID_CHANGE";
  }
  if (issue.field == "program.name") {
    return "PROGRAM_EDITOR_EMPTY_NAME";
  }
  if (issue.field == "program.states") {
    return "PROGRAM_EDITOR_EMPTY_STATES";
  }
  if (issue.field == "program.initial_state_id" ||
      issue.field == "program.normal_stop_state_id" ||
      issue.field == "program.trip_state_id" ||
      issue.field == "program.lockout_state_id") {
    return "PROGRAM_EDITOR_MISSING_SPECIAL_STATE";
  }
  if (issue.message.find("Duplicate state id") != std::string::npos) {
    return "PROGRAM_EDITOR_DUPLICATE_STATE_ID";
  }
  if (ends_with(issue.field, ".guard_fail_target_state_id")) {
    return "PROGRAM_EDITOR_INVALID_GUARD_TARGET";
  }
  if (ends_with(issue.field, ".timeout_target_state_id")) {
    return "PROGRAM_EDITOR_INVALID_TIMEOUT_TARGET";
  }
  if (issue.field.find(".transitions[") != std::string::npos &&
      ends_with(issue.field, ".target_state_id")) {
    return "PROGRAM_EDITOR_INVALID_TRANSITION_TARGET";
  }
  if (issue.field == "program.start_condition" ||
      issue.field == "program.reset_condition" ||
      ends_with(issue.field, ".guard_condition") ||
      ends_with(issue.field, ".condition")) {
    return "PROGRAM_EDITOR_INVALID_CONDITION";
  }
  if (issue.code == SequenceErrorCode::sequence_invalid_action) {
    if (issue.message.find("only allowed in active_actions") != std::string::npos ||
        issue.message.find("not allowed in active_actions") != std::string::npos ||
        issue.message.find("does not match payload") != std::string::npos) {
      return "PROGRAM_EDITOR_INVALID_ACTION_PLACEMENT";
    }
    return "PROGRAM_EDITOR_INVALID_ACTION_TARGET";
  }
  if (ends_with(issue.field, ".min_time_ms") || ends_with(issue.field, ".max_time_ms")) {
    return "PROGRAM_EDITOR_INVALID_TIMING";
  }
  return "PROGRAM_EDITOR_VALIDATION_ERROR";
}

std::size_t count_transitions(const ProgramEditorDraft& draft) {
  std::size_t count = 0U;
  for (const auto& state : draft.states) {
    count += state.transitions.size();
  }
  return count;
}

}  // namespace

SequenceProgram make_sequence_program(const ProgramEditorDraft& draft) {
  return build_sequence_program_from_editor_draft(draft);
}

const char* to_string(const SequenceErrorCode code) {
  switch (code) {
    case SequenceErrorCode::ok:
      return "OK";
    case SequenceErrorCode::sequence_program_already_registered:
      return "SEQUENCE_PROGRAM_ALREADY_REGISTERED";
    case SequenceErrorCode::sequence_program_not_found:
      return "SEQUENCE_PROGRAM_NOT_FOUND";
    case SequenceErrorCode::sequence_program_disabled:
      return "SEQUENCE_PROGRAM_DISABLED";
    case SequenceErrorCode::sequence_active_program_exists:
      return "SEQUENCE_ACTIVE_PROGRAM_EXISTS";
    case SequenceErrorCode::sequence_invalid_program:
      return "SEQUENCE_INVALID_PROGRAM";
    case SequenceErrorCode::sequence_invalid_state_reference:
      return "SEQUENCE_INVALID_STATE_REFERENCE";
    case SequenceErrorCode::sequence_invalid_action:
      return "SEQUENCE_INVALID_ACTION";
    case SequenceErrorCode::sequence_start_denied:
      return "SEQUENCE_START_DENIED";
    case SequenceErrorCode::sequence_no_active_program:
      return "SEQUENCE_NO_ACTIVE_PROGRAM";
    case SequenceErrorCode::sequence_reset_denied:
      return "SEQUENCE_RESET_DENIED";
    case SequenceErrorCode::sequence_lockout_active:
      return "SEQUENCE_LOCKOUT_ACTIVE";
    case SequenceErrorCode::sequence_signal_publish_failed:
      return "SEQUENCE_SIGNAL_PUBLISH_FAILED";
    case SequenceErrorCode::sequence_actuator_request_failed:
      return "SEQUENCE_ACTUATOR_REQUEST_FAILED";
    case SequenceErrorCode::sequence_timer_action_failed:
      return "SEQUENCE_TIMER_ACTION_FAILED";
    case SequenceErrorCode::sequence_alarm_action_failed:
      return "SEQUENCE_ALARM_ACTION_FAILED";
    case SequenceErrorCode::sequence_virtual_signal_write_failed:
      return "SEQUENCE_VIRTUAL_SIGNAL_WRITE_FAILED";
  }
  return "UNKNOWN_SEQUENCE_ERROR";
}

const char* to_string(const ProgramEditorIssueSeverity severity) {
  switch (severity) {
    case ProgramEditorIssueSeverity::info:
      return "info";
    case ProgramEditorIssueSeverity::warning:
      return "warning";
    case ProgramEditorIssueSeverity::error:
      return "error";
  }
  return "error";
}

const char* to_string(const ProgramEditorErrorCode code) {
  switch (code) {
    case ProgramEditorErrorCode::ok:
      return "PROGRAM_EDITOR_OK";
    case ProgramEditorErrorCode::program_editor_invalid_draft:
      return "PROGRAM_EDITOR_INVALID_DRAFT";
    case ProgramEditorErrorCode::program_editor_program_not_found:
      return "PROGRAM_EDITOR_PROGRAM_NOT_FOUND";
    case ProgramEditorErrorCode::program_editor_save_denied:
      return "PROGRAM_EDITOR_SAVE_DENIED";
    case ProgramEditorErrorCode::program_editor_delete_denied:
      return "PROGRAM_EDITOR_DELETE_DENIED";
    case ProgramEditorErrorCode::program_editor_data_unavailable:
      return "PROGRAM_EDITOR_DATA_UNAVAILABLE";
  }
  return "PROGRAM_EDITOR_UNKNOWN";
}

const char* to_string(const SequenceProgramType type) {
  switch (type) {
    case SequenceProgramType::generic:
      return "generic";
    case SequenceProgramType::pump:
      return "pump";
    case SequenceProgramType::compressor:
      return "compressor";
    case SequenceProgramType::burner:
      return "burner";
    case SequenceProgramType::incinerator:
      return "incinerator";
    case SequenceProgramType::dosing:
      return "dosing";
    case SequenceProgramType::custom:
      return "custom";
  }
  return "unknown";
}

const char* to_string(const SequenceStateType type) {
  switch (type) {
    case SequenceStateType::generic:
      return "generic";
    case SequenceStateType::wait:
      return "wait";
    case SequenceStateType::action:
      return "action";
    case SequenceStateType::purge:
      return "purge";
    case SequenceStateType::ignition:
      return "ignition";
    case SequenceStateType::run:
      return "run";
    case SequenceStateType::stop:
      return "stop";
    case SequenceStateType::cooldown:
      return "cooldown";
    case SequenceStateType::lockout:
      return "lockout";
    case SequenceStateType::custom:
      return "custom";
  }
  return "unknown";
}

const char* to_string(const SequenceActionKind kind) {
  switch (kind) {
    case SequenceActionKind::relay_request:
      return "relay_request";
    case SequenceActionKind::pwm_request:
      return "pwm_request";
    case SequenceActionKind::timer_start:
      return "timer_start";
    case SequenceActionKind::timer_stop:
      return "timer_stop";
    case SequenceActionKind::alarm_set_condition:
      return "alarm_set_condition";
    case SequenceActionKind::write_virtual_signal:
      return "write_virtual_signal";
    case SequenceActionKind::log_note:
      return "log_note";
  }
  return "unknown";
}

const char* to_string(const SequenceActionSection section) {
  switch (section) {
    case SequenceActionSection::entry:
      return "entry";
    case SequenceActionSection::active:
      return "active";
    case SequenceActionSection::exit:
      return "exit";
  }
  return "unknown";
}

const char* to_string(const SequenceLifecycle lifecycle) {
  switch (lifecycle) {
    case SequenceLifecycle::idle:
      return "idle";
    case SequenceLifecycle::running:
      return "running";
    case SequenceLifecycle::normal_stop_requested:
      return "normal_stop_requested";
    case SequenceLifecycle::trip_requested:
      return "trip_requested";
    case SequenceLifecycle::lockout:
      return "lockout";
    case SequenceLifecycle::completed:
      return "completed";
  }
  return "unknown";
}

const char* to_string(const SequenceEventType event_type) {
  switch (event_type) {
    case SequenceEventType::program_started:
      return "program_started";
    case SequenceEventType::state_entered:
      return "state_entered";
    case SequenceEventType::state_exited:
      return "state_exited";
    case SequenceEventType::transition_taken:
      return "transition_taken";
    case SequenceEventType::start_denied:
      return "start_denied";
    case SequenceEventType::normal_stop_requested:
      return "normal_stop_requested";
    case SequenceEventType::trip_requested:
      return "trip_requested";
    case SequenceEventType::guard_failed:
      return "guard_failed";
    case SequenceEventType::timeout:
      return "timeout";
    case SequenceEventType::reset:
      return "reset";
    case SequenceEventType::reset_denied:
      return "reset_denied";
    case SequenceEventType::program_completed:
      return "program_completed";
  }
  return "unknown";
}

SequenceActionKind action_kind_from_payload(const SequenceActionPayload& payload) {
  return std::visit(
      [](const auto& candidate) -> SequenceActionKind {
        using CandidateType = std::decay_t<decltype(candidate)>;
        if constexpr (std::is_same_v<CandidateType, SequenceRelayRequestAction>) {
          return SequenceActionKind::relay_request;
        } else if constexpr (std::is_same_v<CandidateType, SequencePwmRequestAction>) {
          return SequenceActionKind::pwm_request;
        } else if constexpr (std::is_same_v<CandidateType, SequenceTimerStartAction>) {
          return SequenceActionKind::timer_start;
        } else if constexpr (std::is_same_v<CandidateType, SequenceTimerStopAction>) {
          return SequenceActionKind::timer_stop;
        } else if constexpr (std::is_same_v<CandidateType, SequenceAlarmSetConditionAction>) {
          return SequenceActionKind::alarm_set_condition;
        } else if constexpr (std::is_same_v<CandidateType, SequenceWriteVirtualSignalAction>) {
          return SequenceActionKind::write_virtual_signal;
        } else {
          return SequenceActionKind::log_note;
        }
      },
      payload);
}

SequenceService::SequenceService(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    const std::size_t history_capacity)
    : signal_registry_(signal_registry),
      actuator_manager_(actuator_manager),
      timer_service_(timer_service),
      alarm_service_(alarm_service),
      history_(history_capacity) {}

SequenceValidationResult SequenceService::validate_program(const SequenceProgram& program) const {
  SequenceValidationResult result;

  if (!has_text(program.id)) {
    append_issue(result, SequenceErrorCode::sequence_invalid_program, "program.id", "Program id must not be empty.");
  } else if (!controller::signals::is_valid_signal_path(program.id)) {
    append_issue(
        result,
        SequenceErrorCode::sequence_invalid_program,
        "program.id",
        "Program id '" + program.id + "' must use dot-separated alphanumeric or underscore segments.");
  }
  if (!has_text(program.name)) {
    append_issue(result, SequenceErrorCode::sequence_invalid_program, "program.name", "Program name must not be empty.");
  }
  if (program.states.empty()) {
    append_issue(result, SequenceErrorCode::sequence_invalid_program, "program.states", "Program must contain at least one state.");
  }
  if (!has_text(program.initial_state_id)) {
    append_issue(result, SequenceErrorCode::sequence_invalid_program, "program.initial_state_id", "initial_state_id must not be empty.");
  }
  if (!has_text(program.normal_stop_state_id)) {
    append_issue(
        result,
        SequenceErrorCode::sequence_invalid_program,
        "program.normal_stop_state_id",
        "normal_stop_state_id must not be empty.");
  }
  if (!has_text(program.trip_state_id)) {
    append_issue(result, SequenceErrorCode::sequence_invalid_program, "program.trip_state_id", "trip_state_id must not be empty.");
  }
  if (!has_text(program.lockout_state_id)) {
    append_issue(
        result,
        SequenceErrorCode::sequence_invalid_program,
        "program.lockout_state_id",
        "lockout_state_id must not be empty.");
  }

  if (program.start_condition.has_value()) {
    const auto validation = controller::conditions::validate_tree(*program.start_condition);
    if (!validation.ok()) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_program,
          "program.start_condition",
          "Start condition is invalid: " + validation.status.message);
    }
  }
  if (program.reset_condition.has_value()) {
    const auto validation = controller::conditions::validate_tree(*program.reset_condition);
    if (!validation.ok()) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_program,
          "program.reset_condition",
          "Reset condition is invalid: " + validation.status.message);
    }
  }

  std::unordered_map<std::string, const SequenceState*> states_by_id;
  for (const auto& state : program.states) {
    if (!has_text(state.id)) {
      append_issue(result, SequenceErrorCode::sequence_invalid_program, "state.id", "State id must not be empty.");
      continue;
    }
    if (!has_text(state.name)) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_program,
          "state." + state.id + ".name",
          "State '" + state.id + "' name must not be empty.");
    }
    if (!states_by_id.emplace(state.id, &state).second) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_program,
          "state." + state.id,
          "Duplicate state id '" + state.id + "' is not allowed.");
    }
  }

  const auto require_state = [&](const std::string& state_id, const std::string& field) {
    if (has_text(state_id) && states_by_id.count(state_id) == 0U) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_state_reference,
          field,
          "Program references unknown state '" + state_id + "'.");
    }
  };

  require_state(program.initial_state_id, "program.initial_state_id");
  require_state(program.normal_stop_state_id, "program.normal_stop_state_id");
  require_state(program.trip_state_id, "program.trip_state_id");
  require_state(program.lockout_state_id, "program.lockout_state_id");

  const auto validate_action_section = [&](const SequenceState& state,
                                           const std::vector<SequenceAction>& actions,
                                           const SequenceActionSection section) {
    for (std::size_t index = 0; index < actions.size(); ++index) {
      const auto& action = actions[index];
      const auto action_field =
          "state." + state.id + "." + std::string{to_string(section)} + "[" + std::to_string(index) + "]";

      if (action.kind != action_kind_from_payload(action.payload)) {
        append_issue(
            result,
            SequenceErrorCode::sequence_invalid_action,
            action_field,
            "Action kind '" + std::string{to_string(action.kind)} + "' does not match payload.");
        continue;
      }

      const bool is_output_action =
          action.kind == SequenceActionKind::relay_request || action.kind == SequenceActionKind::pwm_request;
      const bool section_is_active = section == SequenceActionSection::active;
      if (is_output_action && !section_is_active) {
        append_issue(
            result,
            SequenceErrorCode::sequence_invalid_action,
            action_field,
            "Output action '" + std::string{to_string(action.kind)} + "' is only allowed in active_actions.");
        continue;
      }
      if (!is_output_action && section_is_active) {
        append_issue(
            result,
            SequenceErrorCode::sequence_invalid_action,
            action_field,
            "Command action '" + std::string{to_string(action.kind)} + "' is not allowed in active_actions.");
        continue;
      }

      if (const auto* relay_action = std::get_if<SequenceRelayRequestAction>(&action.payload)) {
        if (!actuator_manager_.has_target(relay_action->target_id)) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "Relay action references unknown actuator '" + relay_action->target_id + "'.");
        }
      } else if (const auto* pwm_action = std::get_if<SequencePwmRequestAction>(&action.payload)) {
        if (!actuator_manager_.has_target(pwm_action->target_id)) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "PWM action references unknown actuator '" + pwm_action->target_id + "'.");
        }
      } else if (const auto* timer_action = std::get_if<SequenceTimerStartAction>(&action.payload)) {
        if (!timer_service_.has_timer(timer_action->timer_id)) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "Timer start action references unknown timer '" + timer_action->timer_id + "'.");
        }
      } else if (const auto* timer_action = std::get_if<SequenceTimerStopAction>(&action.payload)) {
        if (!timer_service_.has_timer(timer_action->timer_id)) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "Timer stop action references unknown timer '" + timer_action->timer_id + "'.");
        }
      } else if (const auto* alarm_action = std::get_if<SequenceAlarmSetConditionAction>(&action.payload)) {
        if (!alarm_service_.has_alarm(alarm_action->alarm_id)) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "Alarm action references unknown alarm '" + alarm_action->alarm_id + "'.");
        }
      } else if (const auto* signal_action = std::get_if<SequenceWriteVirtualSignalAction>(&action.payload)) {
        const auto descriptor_result = signal_registry_.get_descriptor(signal_action->signal_path);
        if (!descriptor_result.ok()) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "Virtual signal action references unknown signal '" + signal_action->signal_path + "'.");
        } else if (descriptor_result.value->access_mode != SignalAccessMode::writable_virtual) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "Signal '" + signal_action->signal_path + "' is not writable_virtual.");
        } else if (!controller::signals::signal_value_matches_type(signal_action->value, descriptor_result.value->type)) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_action,
              action_field,
              "Virtual signal action value type does not match '" + signal_action->signal_path + "'.");
        }
      }
    }
  };

  for (const auto& state : program.states) {
    if (state.guard_condition.has_value()) {
      const auto validation = controller::conditions::validate_tree(*state.guard_condition);
      if (!validation.ok()) {
        append_issue(
            result,
            SequenceErrorCode::sequence_invalid_program,
            "state." + state.id + ".guard_condition",
            "Guard condition for state '" + state.id + "' is invalid: " + validation.status.message);
      }
    }
    if (state.guard_fail_target_state_id.has_value() && states_by_id.count(*state.guard_fail_target_state_id) == 0U) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_state_reference,
          "state." + state.id + ".guard_fail_target_state_id",
          "State '" + state.id + "' references unknown guard fail target '" + *state.guard_fail_target_state_id + "'.");
    }
    if (state.max_time_ms.has_value() && *state.max_time_ms > 0U && !state.timeout_target_state_id.has_value()) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_program,
          "state." + state.id + ".timeout_target_state_id",
          "State '" + state.id + "' requires timeout_target_state_id when max_time_ms is set.");
    }
    if ((!state.max_time_ms.has_value() || *state.max_time_ms == 0U) && state.timeout_target_state_id.has_value()) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_program,
          "state." + state.id + ".timeout_target_state_id",
          "State '" + state.id + "' cannot set timeout_target_state_id without max_time_ms.");
    }
    if (state.min_time_ms.has_value() &&
        state.max_time_ms.has_value() &&
        *state.max_time_ms > 0U &&
        *state.min_time_ms > *state.max_time_ms) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_program,
          "state." + state.id + ".min_time_ms",
          "State '" + state.id + "' min_time_ms cannot exceed max_time_ms.");
    }
    if (state.timeout_target_state_id.has_value() && states_by_id.count(*state.timeout_target_state_id) == 0U) {
      append_issue(
          result,
          SequenceErrorCode::sequence_invalid_state_reference,
          "state." + state.id + ".timeout_target_state_id",
          "State '" + state.id + "' references unknown timeout target '" + *state.timeout_target_state_id + "'.");
    }

    validate_action_section(state, state.entry_actions, SequenceActionSection::entry);
    validate_action_section(state, state.active_actions, SequenceActionSection::active);
    validate_action_section(state, state.exit_actions, SequenceActionSection::exit);

    for (std::size_t index = 0; index < state.transitions.size(); ++index) {
      const auto& transition = state.transitions[index];
      const auto field = "state." + state.id + ".transitions[" + std::to_string(index) + "]";
      if (!has_text(transition.id)) {
        append_issue(result, SequenceErrorCode::sequence_invalid_program, field + ".id", "Transition id must not be empty.");
      }
      if (!has_text(transition.name)) {
        append_issue(result, SequenceErrorCode::sequence_invalid_program, field + ".name", "Transition name must not be empty.");
      }
      if (!has_text(transition.target_state_id) || states_by_id.count(transition.target_state_id) == 0U) {
        append_issue(
            result,
            SequenceErrorCode::sequence_invalid_state_reference,
            field + ".target_state_id",
            "Transition '" + transition.id + "' references unknown target state '" + transition.target_state_id + "'.");
      }
      if (transition.condition.has_value()) {
        const auto validation = controller::conditions::validate_tree(*transition.condition);
        if (!validation.ok()) {
          append_issue(
              result,
              SequenceErrorCode::sequence_invalid_program,
              field + ".condition",
              "Transition '" + transition.id + "' condition is invalid: " + validation.status.message);
        }
      }
    }
  }

  if (result.status.ok()) {
    result.status = SequenceStatus::success();
  }
  return result;
}

SequenceOperationResult SequenceService::register_program(const SequenceProgram& program) {
  if (programs_by_id_.count(program.id) != 0U) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_program_already_registered,
        "Program '" + program.id + "' is already registered.")};
  }

  const auto validation = validate_program(program);
  if (!validation.ok()) {
    return SequenceOperationResult{SequenceStatus::error(
        validation.status.code == SequenceErrorCode::ok ? SequenceErrorCode::sequence_invalid_program : validation.status.code,
        validation.status.message)};
  }

  ProgramRecord record;
  record.program = program;
  if (program.start_condition.has_value()) {
    record.start_evaluator.emplace(*program.start_condition, signal_registry_);
  }
  if (program.reset_condition.has_value()) {
    record.reset_evaluator.emplace(*program.reset_condition, signal_registry_);
  }

  auto status = ensure_global_signals_registered();
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  status = ensure_program_signals_registered(record.program);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  record.signals_registered = true;

  program_order_.push_back(program.id);
  programs_by_id_.emplace(program.id, std::move(record));

  status = publish_signals(0U);
  return SequenceOperationResult{status};
}

bool SequenceService::has_program(const std::string& id) const {
  return programs_by_id_.count(id) != 0U;
}

SequenceResult<SequenceProgram> SequenceService::get_program(const std::string& id) const {
  SequenceResult<SequenceProgram> result;
  const auto entry = programs_by_id_.find(id);
  if (entry == programs_by_id_.end()) {
    result.status = SequenceStatus::error(
        SequenceErrorCode::sequence_program_not_found,
        "Program '" + id + "' is not registered.");
    return result;
  }

  result.status = SequenceStatus::success();
  result.value = entry->second.program;
  return result;
}

SequenceResult<SequenceProgram> SequenceService::get_program_descriptor_copy(const std::string& id) const {
  return get_program(id);
}

std::vector<SequenceProgram> SequenceService::list_programs() const {
  std::vector<SequenceProgram> programs;
  programs.reserve(program_order_.size());
  for (const auto& id : program_order_) {
    programs.push_back(programs_by_id_.at(id).program);
  }
  return programs;
}

SequenceOperationResult SequenceService::replace_program(
    const std::string& program_id,
    const SequenceProgram& new_descriptor,
    const SequenceTimestampMs now_ms) {
  const auto entry = programs_by_id_.find(program_id);
  if (entry == programs_by_id_.end()) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_program_not_found,
        "Program '" + program_id + "' is not registered.")};
  }
  if (is_program_active(program_id)) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_active_program_exists,
        "Program '" + program_id + "' is active and cannot be replaced until it is inactive.")};
  }
  if (new_descriptor.id != program_id) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_invalid_program,
        "Program replacement id '" + new_descriptor.id + "' must match existing program id '" + program_id + "'.")};
  }

  const auto validation = validate_program(new_descriptor);
  if (!validation.ok()) {
    return SequenceOperationResult{SequenceStatus::error(
        validation.status.code == SequenceErrorCode::ok ? SequenceErrorCode::sequence_invalid_program : validation.status.code,
        validation.status.message)};
  }

  ProgramRecord replacement;
  replacement.program = new_descriptor;
  if (new_descriptor.start_condition.has_value()) {
    replacement.start_evaluator.emplace(*new_descriptor.start_condition, signal_registry_);
  }
  if (new_descriptor.reset_condition.has_value()) {
    replacement.reset_evaluator.emplace(*new_descriptor.reset_condition, signal_registry_);
  }

  auto status = ensure_global_signals_registered();
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  status = ensure_program_signals_registered(replacement.program);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  replacement.signals_registered = true;

  auto old_record = std::move(entry->second);
  programs_by_id_.erase(entry);
  programs_by_id_.emplace(program_id, std::move(replacement));

  status = publish_signals(now_ms);
  if (!status.ok()) {
    programs_by_id_.erase(program_id);
    programs_by_id_.emplace(program_id, std::move(old_record));
    const auto rollback_status = publish_signals(now_ms);
    static_cast<void>(rollback_status);
    return SequenceOperationResult{status};
  }

  return SequenceOperationResult{SequenceStatus::success()};
}

SequenceOperationResult SequenceService::remove_program(const std::string& program_id, const SequenceTimestampMs now_ms) {
  const auto entry = programs_by_id_.find(program_id);
  if (entry == programs_by_id_.end()) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_program_not_found,
        "Program '" + program_id + "' is not registered.")};
  }
  if (is_program_active(program_id)) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_active_program_exists,
        "Program '" + program_id + "' is active and cannot be deleted until it is inactive.")};
  }

  auto order_it = std::find(program_order_.begin(), program_order_.end(), program_id);
  const auto restore_index =
      order_it == program_order_.end() ? program_order_.size() : static_cast<std::size_t>(std::distance(program_order_.begin(), order_it));
  auto removed_record = std::move(entry->second);
  programs_by_id_.erase(entry);
  if (order_it != program_order_.end()) {
    program_order_.erase(order_it);
  }

  const auto status = publish_signals(now_ms);
  if (!status.ok()) {
    programs_by_id_.emplace(program_id, std::move(removed_record));
    program_order_.insert(program_order_.begin() + static_cast<std::ptrdiff_t>(restore_index), program_id);
    const auto rollback_status = publish_signals(now_ms);
    static_cast<void>(rollback_status);
    return SequenceOperationResult{status};
  }

  return SequenceOperationResult{SequenceStatus::success()};
}

SequenceOperationResult SequenceService::set_program_enabled(
    const std::string& program_id,
    const bool enabled,
    const SequenceTimestampMs now_ms) {
  const auto entry = programs_by_id_.find(program_id);
  if (entry == programs_by_id_.end()) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_program_not_found,
        "Program '" + program_id + "' is not registered.")};
  }
  if (!enabled && is_program_active(program_id)) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_active_program_exists,
        "Program '" + program_id + "' is active and cannot be disabled until it is inactive.")};
  }
  if (entry->second.program.enabled == enabled) {
    return SequenceOperationResult{SequenceStatus::success()};
  }

  const auto previous = entry->second.program.enabled;
  entry->second.program.enabled = enabled;
  const auto status = publish_signals(now_ms);
  if (!status.ok()) {
    entry->second.program.enabled = previous;
    const auto rollback_status = publish_signals(now_ms);
    static_cast<void>(rollback_status);
    return SequenceOperationResult{status};
  }

  return SequenceOperationResult{SequenceStatus::success()};
}

ProgramEditorDraft SequenceService::build_program_editor_draft(const SequenceProgram& program) const {
  return make_program_editor_draft(program);
}

ProgramEditorDraft make_program_editor_draft(const SequenceProgram& program) {
  ProgramEditorDraft draft;
  draft.existing_program_id = program.id;
  draft.program_id = program.id;
  draft.name = program.name;
  draft.type = program.type;
  draft.enabled = program.enabled;
  draft.description = program.description;
  draft.initial_state_id = program.initial_state_id;
  draft.normal_stop_state_id = program.normal_stop_state_id;
  draft.trip_state_id = program.trip_state_id;
  draft.lockout_state_id = program.lockout_state_id;
  draft.start_condition = program.start_condition;
  draft.reset_condition = program.reset_condition;
  draft.states.reserve(program.states.size());

  for (const auto& state : program.states) {
    ProgramEditorStateDraft state_draft;
    state_draft.id = state.id;
    state_draft.name = state.name;
    state_draft.enabled = state.enabled;
    state_draft.state_type = state.type;
    state_draft.non_skippable = state.non_skippable;
    state_draft.manual_allowed = state.manual_allowed;
    state_draft.min_time_ms = state.min_time_ms;
    state_draft.max_time_ms = state.max_time_ms;
    state_draft.timeout_target_state_id = state.timeout_target_state_id;
    state_draft.guard_fail_target_state_id = state.guard_fail_target_state_id;
    state_draft.entry_actions = state.entry_actions;
    state_draft.active_actions = state.active_actions;
    state_draft.exit_actions = state.exit_actions;
    state_draft.guard_condition = state.guard_condition;
    state_draft.transitions.reserve(state.transitions.size());

    for (const auto& transition : state.transitions) {
      state_draft.transitions.push_back(ProgramEditorTransitionDraft{
          transition.id,
          transition.name,
          transition.enabled,
          transition.target_state_id,
          transition.condition,
          transition.require_min_time_done,
      });
    }

    draft.states.push_back(std::move(state_draft));
  }

  return draft;
}

ProgramEditorValidationResult SequenceService::validate_program_editor_draft(
    const ProgramEditorDraft& draft,
    const bool runtime_editable) const {
  ProgramEditorValidationResult result;
  result.status = ProgramEditorStatus::success("Program editor draft validated.");

  if (!draft.existing_program_id.has_value() || !has_text(*draft.existing_program_id) || !has_program(*draft.existing_program_id)) {
    append_editor_issue(
        result,
        ProgramEditorErrorCode::program_editor_program_not_found,
        "program.existing_program_id",
        "PROGRAM_EDITOR_PROGRAM_NOT_FOUND",
        ProgramEditorIssueSeverity::error,
        "Program editor draft must reference an existing registered program.");
  }

  if (draft.existing_program_id.has_value() && has_text(*draft.existing_program_id) && draft.program_id != *draft.existing_program_id) {
    append_editor_issue(
        result,
        ProgramEditorErrorCode::program_editor_invalid_draft,
        "program.program_id",
        "PROGRAM_EDITOR_INVALID_ID_CHANGE",
        ProgramEditorIssueSeverity::error,
        "program_id is immutable in the step editor and must match the loaded program.");
  }

  if (!runtime_editable) {
    append_editor_issue(
        result,
        ProgramEditorErrorCode::program_editor_save_denied,
        "program.runtime_editable",
        "PROGRAM_EDITOR_ACTIVE_PROGRAM_EDIT_DENIED",
        ProgramEditorIssueSeverity::error,
        "Active program is read-only and cannot be saved while it is running.");
  }

  const auto sequence_program = build_sequence_program_from_editor_draft(draft);
  const auto validation = validate_program(sequence_program);
  for (const auto& issue : validation.issues) {
    append_editor_issue(
        result,
        ProgramEditorErrorCode::program_editor_invalid_draft,
        issue.field,
        map_sequence_issue_to_editor_code(issue),
        ProgramEditorIssueSeverity::error,
        issue.message);
  }

  if (result.status.ok()) {
    result.status = ProgramEditorStatus::success("Program editor draft validated.");
  }
  return result;
}

ProgramEditorResult<ProgramEditorPreview> SequenceService::preview_program_editor_draft(
    const ProgramEditorDraft& draft,
    const bool runtime_editable) const {
  ProgramEditorResult<ProgramEditorPreview> result;
  ProgramEditorPreview preview;
  preview.program_summary.program_id = draft.program_id;
  preview.program_summary.name = draft.name;
  preview.program_summary.type = draft.type;
  preview.program_summary.enabled = draft.enabled;
  preview.program_summary.state_count = draft.states.size();
  preview.program_summary.transition_count = count_transitions(draft);
  preview.special_state_summary.initial_state_id = draft.initial_state_id;
  preview.special_state_summary.normal_stop_state_id = draft.normal_stop_state_id;
  preview.special_state_summary.trip_state_id = draft.trip_state_id;
  preview.special_state_summary.lockout_state_id = draft.lockout_state_id;
  preview.runtime_editable = runtime_editable;

  std::unordered_map<std::string, bool> state_ids;
  for (const auto& state : draft.states) {
    state_ids.emplace(state.id, true);
    preview.ordered_state_summaries.push_back(ProgramEditorStateSummary{
        state.id,
        state.name,
        state.enabled,
        state.state_type,
        state.transitions.size(),
        state.entry_actions.size(),
        state.active_actions.size(),
        state.exit_actions.size(),
        state.guard_condition.has_value(),
        state.non_skippable,
        state.manual_allowed,
    });

    for (const auto& transition : state.transitions) {
      preview.transition_summaries.push_back(ProgramEditorTransitionSummary{
          state.id,
          transition.id,
          transition.name,
          transition.target_state_id,
          transition.enabled,
          transition.require_min_time_done,
          transition.condition_tree.has_value(),
      });
    }
  }

  preview.special_state_summary.all_present =
      state_ids.count(draft.initial_state_id) != 0U &&
      state_ids.count(draft.normal_stop_state_id) != 0U &&
      state_ids.count(draft.trip_state_id) != 0U &&
      state_ids.count(draft.lockout_state_id) != 0U;

  if (!runtime_editable) {
    preview.warnings.push_back("Active program is read-only in Stage 21. Save and delete stay denied until it is inactive.");
  }

  const auto validation = validate_program_editor_draft(draft, runtime_editable);
  preview.validation_issues = validation.issues;
  preview.save_allowed = validation.ok() && runtime_editable;

  result.status = validation.ok() ? ProgramEditorStatus::success("Program editor preview refreshed.") : validation.status;
  result.value = std::move(preview);
  return result;
}

SequenceOperationResult SequenceService::start_program(
    const std::string& id,
    const SequenceTimestampMs now_ms,
    std::string source,
    std::string reason) {
  if (runtime_.active_program_id.has_value()) {
    if (runtime_.lockout) {
      return SequenceOperationResult{SequenceStatus::error(
          SequenceErrorCode::sequence_lockout_active,
          "Program '" + *runtime_.active_program_id + "' is in lockout and must be reset before another start.")};
    }
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_active_program_exists,
        "Program '" + *runtime_.active_program_id + "' is already active.")};
  }

  const auto entry = programs_by_id_.find(id);
  if (entry == programs_by_id_.end()) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_program_not_found,
        "Program '" + id + "' is not registered.")};
  }

  ProgramRecord& record = entry->second;
  if (!record.program.enabled) {
    record_history(id, SequenceEventType::start_denied, now_ms, source, "program_disabled");
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_program_disabled,
        "Program '" + id + "' is disabled.")};
  }

  bool start_allowed = true;
  std::string condition_reason;
  const auto condition_status = evaluate_program_condition(
      record.start_evaluator,
      "start condition",
      now_ms,
      start_allowed,
      nullptr,
      &condition_reason);
  if (!condition_status.ok() || !start_allowed) {
    const auto denial_reason = !condition_status.ok() ? condition_status.message : join_reason_parts(reason, condition_reason);
    record_history(id, SequenceEventType::start_denied, now_ms, source, denial_reason);
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_start_denied,
        "Program '" + id + "' start denied: " + denial_reason)};
  }

  const auto* initial_state = find_state(record.program, record.program.initial_state_id);
  if (initial_state == nullptr) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_invalid_state_reference,
        "Program '" + id + "' initial_state_id '" + record.program.initial_state_id + "' was not found.")};
  }

  runtime_ = SequenceRuntimeState{};
  runtime_.active_program_id = id;
  runtime_.lifecycle = SequenceLifecycle::running;
  runtime_.last_reason = reason;
  ++runtime_.update_counter;

  record_history(id, SequenceEventType::program_started, now_ms, source, reason);
  auto status = enter_state(record.program, *initial_state, now_ms, source, reason, true);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  status = publish_signals(now_ms);
  return SequenceOperationResult{status};
}

SequenceOperationResult SequenceService::request_normal_stop(
    const SequenceTimestampMs now_ms,
    std::string source,
    std::string reason) {
  if (!runtime_.active_program_id.has_value()) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_no_active_program,
        "No active program to stop.")};
  }

  runtime_.pending_normal_stop = true;
  runtime_.last_reason = reason;
  if (!runtime_.pending_trip && !runtime_.lockout) {
    runtime_.lifecycle = SequenceLifecycle::normal_stop_requested;
  }
  ++runtime_.update_counter;

  record_history(*runtime_.active_program_id, SequenceEventType::normal_stop_requested, now_ms, source, reason);
  return SequenceOperationResult{publish_signals(now_ms)};
}

SequenceOperationResult SequenceService::request_trip_stop(
    const SequenceTimestampMs now_ms,
    std::string source,
    std::string reason) {
  if (!runtime_.active_program_id.has_value()) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_no_active_program,
        "No active program to trip.")};
  }

  runtime_.pending_trip = true;
  runtime_.last_reason = reason;
  if (!runtime_.lockout) {
    runtime_.lifecycle = SequenceLifecycle::trip_requested;
  }
  ++runtime_.update_counter;

  record_history(*runtime_.active_program_id, SequenceEventType::trip_requested, now_ms, source, reason);
  return SequenceOperationResult{publish_signals(now_ms)};
}

SequenceOperationResult SequenceService::reset_active_program(
    const SequenceTimestampMs now_ms,
    std::string source,
    std::string reason) {
  if (!runtime_.active_program_id.has_value()) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_no_active_program,
        "No active program to reset.")};
  }

  auto& record = programs_by_id_.at(*runtime_.active_program_id);
  if (!runtime_.current_state_id.has_value() || *runtime_.current_state_id != record.program.lockout_state_id) {
    record_history(record.program.id, SequenceEventType::reset_denied, now_ms, source, reason);
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_reset_denied,
        "Program '" + record.program.id + "' can only be reset while in lockout state.")};
  }

  bool reset_allowed = true;
  std::string condition_reason;
  const auto condition_status = evaluate_program_condition(
      record.reset_evaluator,
      "reset condition",
      now_ms,
      reset_allowed,
      nullptr,
      &condition_reason);
  if (!condition_status.ok() || !reset_allowed) {
    const auto denial_reason = !condition_status.ok() ? condition_status.message : join_reason_parts(reason, condition_reason);
    record_history(record.program.id, SequenceEventType::reset_denied, now_ms, source, denial_reason);
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_reset_denied,
        "Program '" + record.program.id + "' reset denied: " + denial_reason)};
  }

  if (const auto* current_state = find_state(record.program, *runtime_.current_state_id)) {
    const auto clear_status = clear_state_owner_requests(record.program, *current_state, now_ms);
    if (!clear_status.ok()) {
      return SequenceOperationResult{clear_status};
    }
  }

  record_history(record.program.id, SequenceEventType::reset, now_ms, source, reason);

  runtime_.previous_state_id = runtime_.current_state_id;
  runtime_.active_program_id.reset();
  runtime_.current_state_id.reset();
  runtime_.lifecycle = SequenceLifecycle::idle;
  runtime_.state_entered_ms = 0U;
  runtime_.state_elapsed_ms = 0U;
  runtime_.pending_normal_stop = false;
  runtime_.pending_trip = false;
  runtime_.lockout = false;
  runtime_.last_reason = reason;
  ++runtime_.update_counter;
  clear_active_state_runtime();

  return SequenceOperationResult{publish_signals(now_ms)};
}

SequenceOperationResult SequenceService::tick(const SequenceTimestampMs now_ms) {
  if (!runtime_.active_program_id.has_value()) {
    return SequenceOperationResult{publish_signals(now_ms)};
  }

  auto& record = programs_by_id_.at(*runtime_.active_program_id);
  auto status = update_runtime_timing(now_ms);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }

  const auto state_before = runtime_.current_state_id;
  status = handle_pending_requests(record.program, now_ms);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  if (runtime_.current_state_id != state_before) {
    return SequenceOperationResult{publish_signals(now_ms)};
  }

  if (!runtime_.current_state_id.has_value()) {
    return SequenceOperationResult{publish_signals(now_ms)};
  }

  const auto* state = find_state(record.program, *runtime_.current_state_id);
  if (state == nullptr) {
    return SequenceOperationResult{SequenceStatus::error(
        SequenceErrorCode::sequence_invalid_state_reference,
        "Active state '" + *runtime_.current_state_id + "' is missing from program '" + record.program.id + "'.")};
  }

  status = apply_active_actions(record.program, *state, now_ms);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }

  bool guard_failed = false;
  std::string guard_reason;
  std::string guard_target;
  status = evaluate_guard(record.program, *state, now_ms, guard_failed, guard_reason, guard_target);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  if (guard_failed) {
    status = transition_to_state(record.program, guard_target, now_ms, "guard", guard_reason, SequenceEventType::guard_failed);
    return SequenceOperationResult{status.ok() ? publish_signals(now_ms) : status};
  }

  bool timed_out = false;
  std::string timeout_reason;
  status = handle_timeout(record.program, *state, now_ms, timed_out, timeout_reason);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  if (timed_out) {
    status = transition_to_state(
        record.program,
        *state->timeout_target_state_id,
        now_ms,
        "timeout",
        timeout_reason,
        SequenceEventType::timeout);
    return SequenceOperationResult{status.ok() ? publish_signals(now_ms) : status};
  }

  bool transition_taken = false;
  std::string target_state_id;
  std::string transition_reason;
  status = evaluate_transitions(record.program, *state, now_ms, transition_taken, target_state_id, transition_reason);
  if (!status.ok()) {
    return SequenceOperationResult{status};
  }
  if (transition_taken) {
    status = transition_to_state(
        record.program,
        target_state_id,
        now_ms,
        "transition",
        transition_reason,
        SequenceEventType::transition_taken);
    return SequenceOperationResult{status.ok() ? publish_signals(now_ms) : status};
  }

  return SequenceOperationResult{publish_signals(now_ms)};
}

SequenceResult<SequenceSnapshot> SequenceService::get_active_snapshot(const SequenceTimestampMs now_ms) {
  SequenceResult<SequenceSnapshot> result;
  if (!runtime_.active_program_id.has_value()) {
    result.status = SequenceStatus::error(
        SequenceErrorCode::sequence_no_active_program,
        "No active program snapshot is available.");
    return result;
  }

  auto& record = programs_by_id_.at(*runtime_.active_program_id);
  result.status = SequenceStatus::success();
  result.value = build_snapshot_for_program(record, now_ms);
  return result;
}

std::vector<SequenceSnapshot> SequenceService::list_program_snapshots(const SequenceTimestampMs now_ms) {
  std::vector<SequenceSnapshot> snapshots;
  snapshots.reserve(program_order_.size());
  for (const auto& id : program_order_) {
    auto& record = programs_by_id_.at(id);
    snapshots.push_back(build_snapshot_for_program(record, now_ms));
  }
  return snapshots;
}

std::vector<SequenceHistoryEntry> SequenceService::read_history() const {
  return history_.read();
}

void SequenceService::clear_history() {
  history_.clear();
}

const SequenceState* SequenceService::find_state(const SequenceProgram& program, const std::string& state_id) const {
  for (const auto& state : program.states) {
    if (state.id == state_id) {
      return &state;
    }
  }
  return nullptr;
}

SequenceStateType SequenceService::current_state_type() const {
  if (!runtime_.active_program_id.has_value() || !runtime_.current_state_id.has_value()) {
    return SequenceStateType::generic;
  }

  const auto& record = programs_by_id_.at(*runtime_.active_program_id);
  const auto* state = find_state(record.program, *runtime_.current_state_id);
  return state != nullptr ? state->type : SequenceStateType::generic;
}

std::optional<std::string> SequenceService::current_state_owner() const {
  if (!runtime_.active_program_id.has_value() || !runtime_.current_state_id.has_value()) {
    return std::nullopt;
  }
  return state_owner(*runtime_.active_program_id, *runtime_.current_state_id);
}

bool SequenceService::is_program_active(const std::string& program_id) const {
  return runtime_.active_program_id.has_value() && *runtime_.active_program_id == program_id;
}

SequenceStatus SequenceService::ensure_global_signals_registered() {
  if (global_signals_registered_) {
    return SequenceStatus::success();
  }

  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor("program.active", "Program active", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor("program.active_id", "Program active id", SignalType::string),
      SignalValue{std::string{}},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor("program.lifecycle", "Program lifecycle", SignalType::string),
      SignalValue{std::string{"idle"}},
      0U);
  if (!status.ok()) {
    return status;
  }

  global_signals_registered_ = true;
  return SequenceStatus::success();
}

SequenceStatus SequenceService::ensure_program_signals_registered(const SequenceProgram& program) {
  const auto base = "program." + program.id;
  auto status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".current_state", program.name + " current state", SignalType::string),
      SignalValue{std::string{}},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".previous_state", program.name + " previous state", SignalType::string),
      SignalValue{std::string{}},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".state_elapsed_ms", program.name + " state elapsed", SignalType::int64, "ms"),
      SignalValue{std::int64_t{0}},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".pending_normal_stop", program.name + " pending normal stop", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".pending_trip", program.name + " pending trip", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".lockout", program.name + " lockout", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".can_start", program.name + " can start", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".can_reset", program.name + " can reset", SignalType::boolean),
      SignalValue{false},
      0U);
  if (!status.ok()) {
    return status;
  }
  status = register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".last_reason", program.name + " last reason", SignalType::string),
      SignalValue{std::string{}},
      0U);
  if (!status.ok()) {
    return status;
  }
  return register_signal_if_missing(
      signal_registry_,
      make_signal_descriptor(base + ".current_state_type", program.name + " current state type", SignalType::string),
      SignalValue{std::string{"generic"}},
      0U);
}

SequenceStatus SequenceService::publish_signals(const SequenceTimestampMs now_ms) {
  auto status = ensure_global_signals_registered();
  if (!status.ok()) {
    return status;
  }

  status = update_signal(signal_registry_, "program.active", SignalValue{runtime_.active_program_id.has_value()}, now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(
      signal_registry_,
      "program.active_id",
      SignalValue{runtime_.active_program_id.has_value() ? *runtime_.active_program_id : std::string{}},
      now_ms);
  if (!status.ok()) {
    return status;
  }
  status = update_signal(
      signal_registry_,
      "program.lifecycle",
      SignalValue{std::string{to_string(runtime_.active_program_id.has_value() ? runtime_.lifecycle : SequenceLifecycle::idle)}},
      now_ms);
  if (!status.ok()) {
    return status;
  }

  for (const auto& id : program_order_) {
    auto& record = programs_by_id_.at(id);
    status = ensure_program_signals_registered(record.program);
    if (!status.ok()) {
      return status;
    }

    const auto snapshot = build_snapshot_for_program(record, now_ms);
    const auto base = "program." + record.program.id;

    status = update_signal(
        signal_registry_,
        base + ".current_state",
        SignalValue{snapshot.current_state_id.has_value() ? *snapshot.current_state_id : std::string{}},
        now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(
        signal_registry_,
        base + ".previous_state",
        SignalValue{snapshot.previous_state_id.has_value() ? *snapshot.previous_state_id : std::string{}},
        now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".state_elapsed_ms", SignalValue{to_signal_int64(snapshot.state_elapsed_ms)}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".pending_normal_stop", SignalValue{snapshot.pending_normal_stop}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".pending_trip", SignalValue{snapshot.pending_trip}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".lockout", SignalValue{snapshot.lockout}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".can_start", SignalValue{snapshot.can_start}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".can_reset", SignalValue{snapshot.can_reset}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(signal_registry_, base + ".last_reason", SignalValue{snapshot.last_reason}, now_ms);
    if (!status.ok()) {
      return status;
    }
    status = update_signal(
        signal_registry_,
        base + ".current_state_type",
        SignalValue{std::string{to_string(snapshot.current_state_type)}},
        now_ms);
    if (!status.ok()) {
      return status;
    }
  }

  return SequenceStatus::success();
}

SequenceStatus SequenceService::enter_state(
    const SequenceProgram& program,
    const SequenceState& state,
    const SequenceTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const bool record_history_entry) {
  runtime_.current_state_id = state.id;
  runtime_.state_entered_ms = now_ms;
  runtime_.state_elapsed_ms = 0U;
  runtime_.lockout = state.id == program.lockout_state_id;
  runtime_.lifecycle = lifecycle_for_runtime(runtime_, program, state.id);
  runtime_.last_reason = reason;
  ++runtime_.update_counter;

  auto status = refresh_active_runtime(program);
  if (!status.ok()) {
    return status;
  }

  status = execute_actions(program, state, state.entry_actions, SequenceActionSection::entry, now_ms, source, reason);
  if (!status.ok()) {
    return status;
  }

  if (record_history_entry) {
    record_history(program.id, SequenceEventType::state_entered, now_ms, source, reason, runtime_.previous_state_id, state.id);
  }

  return apply_active_actions(program, state, now_ms);
}

SequenceStatus SequenceService::exit_current_state(
    const SequenceProgram& program,
    const SequenceTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  if (!runtime_.current_state_id.has_value()) {
    return SequenceStatus::success();
  }

  const auto* state = find_state(program, *runtime_.current_state_id);
  if (state == nullptr) {
    return SequenceStatus::error(
        SequenceErrorCode::sequence_invalid_state_reference,
        "Program '" + program.id + "' references missing active state '" + *runtime_.current_state_id + "'.");
  }

  record_history(program.id, SequenceEventType::state_exited, now_ms, source, reason, state->id, std::nullopt);
  auto status = execute_actions(program, *state, state->exit_actions, SequenceActionSection::exit, now_ms, source, reason);
  if (!status.ok()) {
    return status;
  }

  status = clear_state_owner_requests(program, *state, now_ms);
  if (!status.ok()) {
    return status;
  }

  runtime_.previous_state_id = runtime_.current_state_id;
  runtime_.current_state_id.reset();
  runtime_.state_entered_ms = now_ms;
  runtime_.state_elapsed_ms = 0U;
  ++runtime_.update_counter;
  clear_active_state_runtime();
  return SequenceStatus::success();
}

SequenceStatus SequenceService::transition_to_state(
    const SequenceProgram& program,
    const std::string& target_state_id,
    const SequenceTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    const SequenceEventType event_type) {
  const auto* target_state = find_state(program, target_state_id);
  if (target_state == nullptr) {
    return SequenceStatus::error(
        SequenceErrorCode::sequence_invalid_state_reference,
        "Program '" + program.id + "' references missing target state '" + target_state_id + "'.");
  }

  record_history(program.id, event_type, now_ms, source, reason, runtime_.current_state_id, target_state_id);
  auto status = exit_current_state(program, now_ms, source, reason);
  if (!status.ok()) {
    return status;
  }
  return enter_state(program, *target_state, now_ms, source, reason, true);
}

SequenceStatus SequenceService::execute_actions(
    const SequenceProgram& program,
    const SequenceState& state,
    const std::vector<SequenceAction>& actions,
    const SequenceActionSection section,
    const SequenceTimestampMs now_ms,
    const std::string& source,
    const std::string& reason) {
  for (const auto& action : actions) {
    if (section == SequenceActionSection::active) {
      continue;
    }

    const auto action_reason = join_reason_parts(
        reason,
        "state '" + state.id + "' " + std::string{to_string(section)} + " action '" + describe_action(action) + "'");

    if (const auto* timer_action = std::get_if<SequenceTimerStartAction>(&action.payload)) {
      const auto result = timer_service_.start_timer(timer_action->timer_id, now_ms);
      if (!result.ok()) {
        return wrap_timer_error(result.status, "Failed to start timer '" + timer_action->timer_id + "'");
      }
    } else if (const auto* timer_action = std::get_if<SequenceTimerStopAction>(&action.payload)) {
      const auto result = timer_service_.stop_timer(timer_action->timer_id, now_ms);
      if (!result.ok()) {
        return wrap_timer_error(result.status, "Failed to stop timer '" + timer_action->timer_id + "'");
      }
    } else if (const auto* alarm_action = std::get_if<SequenceAlarmSetConditionAction>(&action.payload)) {
      const auto result = alarm_service_.set_condition(
          alarm_action->alarm_id,
          alarm_action->condition_active,
          now_ms,
          source.empty() ? state_owner(program.id, state.id) : source,
          action_reason);
      if (!result.ok()) {
        return wrap_alarm_error(result.status, "Failed to set alarm '" + alarm_action->alarm_id + "'");
      }
    } else if (const auto* signal_action = std::get_if<SequenceWriteVirtualSignalAction>(&action.payload)) {
      const auto result = signal_registry_.write_virtual_signal(signal_action->signal_path, signal_action->value, now_ms);
      if (!result.ok()) {
        return wrap_virtual_signal_error(result.status, "Failed to write virtual signal '" + signal_action->signal_path + "'");
      }
    }
  }

  return SequenceStatus::success();
}

SequenceStatus SequenceService::apply_active_actions(
    const SequenceProgram& program,
    const SequenceState& state,
    const SequenceTimestampMs now_ms) {
  bool submitted_any = false;
  const auto owner = state_owner(program.id, state.id);

  for (const auto& action : state.active_actions) {
    if (const auto* relay_action = std::get_if<SequenceRelayRequestAction>(&action.payload)) {
      const auto result = actuator_manager_.submit_request(ActuatorRequest{
          relay_action->target_id,
          owner,
          join_reason_parts(
              "Sequence state '" + state.name + "'",
              has_text(relay_action->reason) ? relay_action->reason : describe_action(action)),
          ActuatorPriority::sequence,
          now_ms,
          std::nullopt,
          RelayActuatorCommand{relay_action->state},
      });
      if (!result.ok()) {
        return wrap_actuator_error(result.status, "Failed to submit relay request for '" + relay_action->target_id + "'");
      }
      submitted_any = true;
    } else if (const auto* pwm_action = std::get_if<SequencePwmRequestAction>(&action.payload)) {
      const auto result = actuator_manager_.submit_request(ActuatorRequest{
          pwm_action->target_id,
          owner,
          join_reason_parts(
              "Sequence state '" + state.name + "'",
              has_text(pwm_action->reason) ? pwm_action->reason : describe_action(action)),
          ActuatorPriority::sequence,
          now_ms,
          std::nullopt,
          PwmActuatorCommand{pwm_action->duty_percent, pwm_action->enabled},
      });
      if (!result.ok()) {
        return wrap_actuator_error(result.status, "Failed to submit PWM request for '" + pwm_action->target_id + "'");
      }
      submitted_any = true;
    }
  }

  if (!submitted_any) {
    return SequenceStatus::success();
  }

  const auto evaluate_result = actuator_manager_.evaluate(now_ms);
  if (!evaluate_result.ok()) {
    return wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator requests for owner '" + owner + "'");
  }
  return SequenceStatus::success();
}

SequenceStatus SequenceService::clear_state_owner_requests(
    const SequenceProgram& program,
    const SequenceState& state,
    const SequenceTimestampMs now_ms) {
  const auto owner = state_owner(program.id, state.id);
  const auto clear_result = actuator_manager_.clear_requests_for_owner(owner);
  if (!clear_result.ok()) {
    return wrap_actuator_error(clear_result.status, "Failed to clear actuator owner '" + owner + "'");
  }

  const auto evaluate_result = actuator_manager_.evaluate(now_ms);
  if (!evaluate_result.ok()) {
    return wrap_actuator_error(evaluate_result.status, "Failed to evaluate actuator state after clearing owner '" + owner + "'");
  }

  return SequenceStatus::success();
}

void SequenceService::clear_active_state_runtime() {
  active_state_runtime_.guard_evaluator.reset();
  active_state_runtime_.transitions.clear();
  active_state_runtime_.last_guard_trace.clear();
  active_state_runtime_.last_transition_candidates.clear();
}

SequenceStatus SequenceService::refresh_active_runtime(const SequenceProgram& program) {
  clear_active_state_runtime();
  if (!runtime_.current_state_id.has_value()) {
    return SequenceStatus::success();
  }

  const auto* state = find_state(program, *runtime_.current_state_id);
  if (state == nullptr) {
    return SequenceStatus::error(
        SequenceErrorCode::sequence_invalid_state_reference,
        "Program '" + program.id + "' references missing active state '" + *runtime_.current_state_id + "'.");
  }

  if (state->guard_condition.has_value()) {
    active_state_runtime_.guard_evaluator.emplace(*state->guard_condition, signal_registry_);
  }

  for (const auto& transition : state->transitions) {
    TransitionRuntime runtime_transition;
    runtime_transition.transition = transition;
    if (transition.condition.has_value()) {
      runtime_transition.evaluator.emplace(*transition.condition, signal_registry_);
    }
    active_state_runtime_.transitions.push_back(std::move(runtime_transition));
  }

  return SequenceStatus::success();
}

SequenceStatus SequenceService::update_runtime_timing(const SequenceTimestampMs now_ms) {
  if (!runtime_.current_state_id.has_value()) {
    runtime_.state_elapsed_ms = 0U;
    return SequenceStatus::success();
  }

  runtime_.state_elapsed_ms = now_ms >= runtime_.state_entered_ms ? (now_ms - runtime_.state_entered_ms) : 0U;
  return SequenceStatus::success();
}

SequenceStatus SequenceService::evaluate_guard(
    const SequenceProgram& program,
    const SequenceState& state,
    const SequenceTimestampMs now_ms,
    bool& guard_failed,
    std::string& failure_reason,
    std::string& target_state_id) {
  guard_failed = false;
  failure_reason.clear();
  target_state_id.clear();
  active_state_runtime_.last_guard_trace.clear();

  if (!active_state_runtime_.guard_evaluator.has_value()) {
    return SequenceStatus::success();
  }

  const auto evaluation = active_state_runtime_.guard_evaluator->evaluate(now_ms);
  active_state_runtime_.last_guard_trace = evaluation.trace;
  if (!evaluation.ok() || !evaluation.effective_result) {
    guard_failed = true;
    target_state_id = state.guard_fail_target_state_id.value_or(program.trip_state_id);
    failure_reason = !evaluation.ok()
                         ? "Guard evaluation failed in state '" + state.id + "': " + evaluation.reason
                         : "Guard failed in state '" + state.id + "': " + evaluation.reason;
  }

  return SequenceStatus::success();
}

SequenceStatus SequenceService::evaluate_transitions(
    const SequenceProgram& program,
    const SequenceState& state,
    const SequenceTimestampMs now_ms,
    bool& transition_taken,
    std::string& target_state_id,
    std::string& transition_reason) {
  (void)program;
  transition_taken = false;
  target_state_id.clear();
  transition_reason.clear();
  active_state_runtime_.last_transition_candidates.clear();

  for (auto& runtime_transition : active_state_runtime_.transitions) {
    SequenceTransitionCandidate candidate;
    candidate.transition_id = runtime_transition.transition.id;
    candidate.target_state_id = runtime_transition.transition.target_state_id;

    if (!runtime_transition.transition.enabled) {
      candidate.eligible = false;
      candidate.reason = "transition_disabled";
      active_state_runtime_.last_transition_candidates.push_back(std::move(candidate));
      continue;
    }

    const auto min_time_required = state.min_time_ms.value_or(0U);
    candidate.min_time_satisfied =
        !runtime_transition.transition.require_min_time_done || runtime_.state_elapsed_ms >= min_time_required;

    bool condition_ok = true;
    if (runtime_transition.evaluator.has_value()) {
      const auto evaluation = runtime_transition.evaluator->evaluate(now_ms);
      candidate.condition_trace = evaluation.trace;
      if (evaluation.ok()) {
        candidate.condition_effective_result = evaluation.effective_result;
        condition_ok = evaluation.effective_result;
        candidate.reason = evaluation.reason;
      } else {
        candidate.condition_effective_result = false;
        condition_ok = false;
        candidate.reason = "Condition evaluation failed: " + evaluation.reason;
      }
    } else {
      candidate.condition_effective_result = std::nullopt;
      candidate.reason = "unconditional_transition";
    }

    candidate.eligible = candidate.min_time_satisfied && condition_ok;
    if (!candidate.min_time_satisfied) {
      candidate.reason = join_reason_parts(candidate.reason, "min_time_not_satisfied");
    }

    if (!transition_taken && candidate.eligible) {
      transition_taken = true;
      target_state_id = runtime_transition.transition.target_state_id;
      transition_reason =
          "Transition '" + runtime_transition.transition.id + "' -> '" + runtime_transition.transition.target_state_id +
          "' selected from state '" + state.id + "': " + candidate.reason;
    }

    active_state_runtime_.last_transition_candidates.push_back(std::move(candidate));
  }

  return SequenceStatus::success();
}

SequenceStatus SequenceService::handle_pending_requests(const SequenceProgram& program, const SequenceTimestampMs now_ms) {
  if (!runtime_.current_state_id.has_value() || runtime_.lockout) {
    return SequenceStatus::success();
  }

  if (runtime_.pending_trip && *runtime_.current_state_id != program.trip_state_id) {
    return transition_to_state(
        program,
        program.trip_state_id,
        now_ms,
        "trip_request",
        runtime_.last_reason,
        SequenceEventType::transition_taken);
  }

  if (runtime_.pending_normal_stop && *runtime_.current_state_id != program.normal_stop_state_id) {
    return transition_to_state(
        program,
        program.normal_stop_state_id,
        now_ms,
        "normal_stop_request",
        runtime_.last_reason,
        SequenceEventType::transition_taken);
  }

  return SequenceStatus::success();
}

SequenceStatus SequenceService::handle_timeout(
    const SequenceProgram& program,
    const SequenceState& state,
    const SequenceTimestampMs now_ms,
    bool& timed_out,
    std::string& timeout_reason) {
  (void)program;
  (void)now_ms;
  timed_out = false;
  timeout_reason.clear();
  if (!state.max_time_ms.has_value() || *state.max_time_ms == 0U) {
    return SequenceStatus::success();
  }

  if (runtime_.state_elapsed_ms >= *state.max_time_ms) {
    timed_out = true;
    timeout_reason = "State '" + state.id + "' timed out after " + std::to_string(runtime_.state_elapsed_ms) + " ms.";
  }

  return SequenceStatus::success();
}

SequenceStatus SequenceService::evaluate_program_condition(
    std::optional<ConditionEvaluator>& evaluator,
    const std::string& context,
    const SequenceTimestampMs now_ms,
    bool& result,
    std::vector<ConditionTraceEntry>* trace,
    std::string* reason) {
  result = true;
  if (trace != nullptr) {
    trace->clear();
  }
  if (reason != nullptr) {
    reason->clear();
  }

  if (!evaluator.has_value()) {
    return SequenceStatus::success();
  }

  const ConditionEvaluationResult evaluation = evaluator->evaluate(now_ms);
  if (trace != nullptr) {
    *trace = evaluation.trace;
  }
  if (reason != nullptr) {
    *reason = evaluation.reason;
  }
  if (!evaluation.ok()) {
    result = false;
    return SequenceStatus::error(
        SequenceErrorCode::sequence_invalid_program,
        "Failed to evaluate " + context + ": " + evaluation.reason);
  }

  result = evaluation.effective_result;
  return SequenceStatus::success();
}

bool SequenceService::compute_can_start(ProgramRecord& record, const SequenceTimestampMs now_ms) {
  if (!record.program.enabled || runtime_.active_program_id.has_value()) {
    return false;
  }
  bool allowed = true;
  return evaluate_program_condition(record.start_evaluator, "start condition", now_ms, allowed).ok() && allowed;
}

bool SequenceService::compute_can_reset(ProgramRecord& record, const SequenceTimestampMs now_ms) {
  if (!runtime_.active_program_id.has_value() ||
      *runtime_.active_program_id != record.program.id ||
      !runtime_.current_state_id.has_value() ||
      *runtime_.current_state_id != record.program.lockout_state_id) {
    return false;
  }

  bool allowed = true;
  return evaluate_program_condition(record.reset_evaluator, "reset condition", now_ms, allowed).ok() && allowed;
}

SequenceSnapshot SequenceService::build_snapshot_for_program(ProgramRecord& record, const SequenceTimestampMs now_ms) {
  SequenceSnapshot snapshot;
  snapshot.program_id = record.program.id;
  snapshot.active_program_id = runtime_.active_program_id;
  snapshot.history_size = history_.size();

  if (runtime_.active_program_id.has_value() && *runtime_.active_program_id == record.program.id) {
    snapshot.lifecycle = runtime_.lifecycle;
    snapshot.current_state_id = runtime_.current_state_id;
    snapshot.previous_state_id = runtime_.previous_state_id;
    snapshot.current_state_type = current_state_type();
    snapshot.state_elapsed_ms =
        now_ms >= runtime_.state_entered_ms ? (now_ms - runtime_.state_entered_ms) : 0U;
    snapshot.pending_normal_stop = runtime_.pending_normal_stop;
    snapshot.pending_trip = runtime_.pending_trip;
    snapshot.lockout = runtime_.lockout;
    snapshot.can_start = false;
    snapshot.can_reset = compute_can_reset(record, now_ms);
    snapshot.last_reason = runtime_.last_reason;
    snapshot.transition_candidates = active_state_runtime_.last_transition_candidates;
    snapshot.last_guard_trace = active_state_runtime_.last_guard_trace;
    snapshot.update_counter = runtime_.update_counter;
    return snapshot;
  }

  snapshot.lifecycle = SequenceLifecycle::idle;
  snapshot.current_state_type = SequenceStateType::generic;
  snapshot.can_start = compute_can_start(record, now_ms);
  snapshot.can_reset = false;
  snapshot.last_reason = "";
  return snapshot;
}

void SequenceService::record_history(
    const std::string& program_id,
    const SequenceEventType event_type,
    const SequenceTimestampMs now_ms,
    const std::string& source,
    const std::string& reason,
    std::optional<std::string> from_state,
    std::optional<std::string> to_state) {
  history_.append(SequenceHistoryEntry{
      0U,
      program_id,
      event_type,
      std::move(from_state),
      std::move(to_state),
      now_ms,
      source,
      reason,
  });
}

}  // namespace controller::sequence
