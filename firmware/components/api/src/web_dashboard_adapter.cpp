#include "api/web_dashboard_adapter.hpp"

#include <algorithm>
#include <iomanip>
#include <sstream>
#include <utility>

#include "actuators/actuator_types.hpp"
#include "alarms/alarm_types.hpp"
#include "hal/hal_common.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::api {

namespace {

using controller::actuators::ActuatorPriority;
using controller::actuators::ActuatorRole;
using controller::actuators::ActuatorTargetKind;
using controller::alarms::AlarmSeverity;
using controller::hal::RelayState;
using controller::sequence::SequenceLifecycle;

bool has_text(const std::string& value) {
  return !value.empty();
}

std::string relay_state_text(const RelayState state) {
  return state == RelayState::on ? "Relay ON" : "Relay OFF";
}

std::string format_duty_percent(const double duty_percent) {
  std::ostringstream stream;
  stream << std::fixed << std::setprecision(1) << duty_percent;
  return stream.str();
}

std::string severity_text(const std::optional<AlarmSeverity>& severity) {
  return severity.has_value() ? to_string(*severity) : "none";
}

std::string state_type_text(const controller::sequence::SequenceStateType type) {
  return controller::sequence::to_string(type);
}

std::string lifecycle_text(const SequenceLifecycle lifecycle) {
  return controller::sequence::to_string(lifecycle);
}

std::string program_type_text(const controller::sequence::SequenceProgramType type) {
  return controller::sequence::to_string(type);
}

std::string actuator_kind_text(const ActuatorTargetKind kind) {
  return controller::actuators::to_string(kind);
}

std::string actuator_role_text(const ActuatorRole role) {
  return controller::actuators::to_string(role);
}

std::string actuator_priority_text(const ActuatorPriority priority) {
  return controller::actuators::to_string(priority);
}

std::string history_event_text(const controller::sequence::SequenceEventType event_type) {
  return controller::sequence::to_string(event_type);
}

std::string build_start_reason(
    const ProgramSummaryDto& program,
    const ProgramStatusDto& status,
    const bool selected_program_is_active) {
  if (!program.enabled) {
    return "Selected program is disabled.";
  }
  if (status.active_program_id.has_value()) {
    if (selected_program_is_active) {
      return "Selected program is already active.";
    }
    return "Another program is active. Stop or reset it before starting a different program.";
  }
  return "Selected program cannot start yet. Check start permits and blockers.";
}

std::string build_stop_reason(const ProgramStatusDto& status) {
  if (!status.active_program_id.has_value()) {
    return "No active program to stop.";
  }
  if (status.pending_trip) {
    return "Trip is already pending. Wait for the trip path to complete.";
  }
  if (status.pending_normal_stop) {
    return "Normal stop is already pending.";
  }
  if (status.lockout) {
    return "Program is in lockout. Reset is required instead of normal stop.";
  }
  return "Normal stop is not available right now.";
}

std::string build_trip_reason(const ProgramStatusDto& status) {
  if (!status.active_program_id.has_value()) {
    return "No active program to trip.";
  }
  if (status.pending_trip) {
    return "Trip is already pending.";
  }
  if (status.lockout) {
    return "Program is already in lockout.";
  }
  return "Trip is not available right now.";
}

std::string build_reset_reason(const ProgramStatusDto& status) {
  if (!status.active_program_id.has_value()) {
    return "No active program to reset.";
  }
  if (!status.lockout) {
    return "Reset is only allowed when the active program is in lockout.";
  }
  return "Reset is blocked until the reset condition becomes true.";
}

}  // namespace

const char* to_string(const DashboardResultCode code) {
  switch (code) {
    case DashboardResultCode::dashboard_ok:
      return "DASHBOARD_OK";
    case DashboardResultCode::dashboard_no_active_program:
      return "DASHBOARD_NO_ACTIVE_PROGRAM";
    case DashboardResultCode::dashboard_start_denied:
      return "DASHBOARD_START_DENIED";
    case DashboardResultCode::dashboard_stop_denied:
      return "DASHBOARD_STOP_DENIED";
    case DashboardResultCode::dashboard_trip_denied:
      return "DASHBOARD_TRIP_DENIED";
    case DashboardResultCode::dashboard_reset_denied:
      return "DASHBOARD_RESET_DENIED";
    case DashboardResultCode::dashboard_api_error:
      return "DASHBOARD_API_ERROR";
    case DashboardResultCode::dashboard_invalid_argument:
      return "DASHBOARD_INVALID_ARGUMENT";
    case DashboardResultCode::dashboard_data_unavailable:
      return "DASHBOARD_DATA_UNAVAILABLE";
  }

  return "DASHBOARD_UNKNOWN";
}

WebDashboardAdapter::WebDashboardAdapter(SequenceApiService& sequence_api_service)
    : sequence_api_service_(sequence_api_service) {}

DashboardDataResponse WebDashboardAdapter::get_dashboard_data(const ApiTimestampMs now_ms) const {
  const auto programs = sequence_api_service_.list_programs(now_ms);
  if (!programs.ok()) {
    return make_error_response(
        map_api_code(programs.status.code, DashboardResultCode::dashboard_api_error),
        programs.status.message,
        now_ms);
  }

  const auto status = sequence_api_service_.get_active_program_status(now_ms);
  if (!status.ok()) {
    return make_error_response(
        map_api_code(status.status.code, DashboardResultCode::dashboard_api_error),
        status.status.message,
        now_ms);
  }

  DashboardSourceData source;
  source.programs = *programs.value;
  source.status = *status.value;

  DashboardDataResponse response;
  response.success = true;
  response.code = source.status.active_program_id.has_value()
                      ? DashboardResultCode::dashboard_ok
                      : DashboardResultCode::dashboard_no_active_program;
  response.message = source.status.active_program_id.has_value()
                         ? "Dashboard data refreshed."
                         : "No active program. Select a registered program to start.";
  response.refresh_timestamp_ms = now_ms;

  const auto history_program_id = select_program_id(source.programs, source.status);
  if (history_program_id.has_value()) {
    const auto selected_status = sequence_api_service_.get_program_status(*history_program_id, now_ms);
    if (selected_status.ok()) {
      source.selected_program_status = *selected_status.value;
    } else {
      response.warnings.push_back("Selected program status is unavailable: " + selected_status.status.message);
    }
  }
  if (history_program_id.has_value()) {
    const auto history = sequence_api_service_.get_program_history(*history_program_id, kDashboardHistoryLimit);
    if (history.ok()) {
      source.history = *history.value;
    } else {
      response.warnings.push_back("Recent history is unavailable: " + history.status.message);
    }
  } else {
    response.warnings.push_back("No registered programs are available for history.");
  }

  response.dashboard = build_view_model(source);
  return response;
}

DashboardCommandResponse WebDashboardAdapter::post_start(const std::string& program_id, const CommandContext& context) {
  return build_command_response(
      sequence_api_service_.start_program(program_id, context),
      DashboardResultCode::dashboard_start_denied,
      context.now_ms,
      *this);
}

DashboardCommandResponse WebDashboardAdapter::post_stop(const CommandContext& context) {
  return build_command_response(
      sequence_api_service_.request_normal_stop(context),
      DashboardResultCode::dashboard_stop_denied,
      context.now_ms,
      *this);
}

DashboardCommandResponse WebDashboardAdapter::post_trip(const CommandContext& context) {
  return build_command_response(
      sequence_api_service_.request_trip_stop(context),
      DashboardResultCode::dashboard_trip_denied,
      context.now_ms,
      *this);
}

DashboardCommandResponse WebDashboardAdapter::post_reset(const CommandContext& context) {
  return build_command_response(
      sequence_api_service_.reset_active_program(context),
      DashboardResultCode::dashboard_reset_denied,
      context.now_ms,
      *this);
}

WebDashboardViewModel WebDashboardAdapter::build_view_model(const DashboardSourceData& source) {
  WebDashboardViewModel view_model;
  const ProgramStatusDto* selected_program_status =
      source.selected_program_status.has_value() ? &(*source.selected_program_status) : nullptr;
  view_model.selected_program_id = select_program_id(source.programs, source.status);
  view_model.active_program_id = source.status.active_program_id;
  view_model.active_program_name = has_text(source.status.name) ? source.status.name : "No active program";
  view_model.lifecycle = lifecycle_text(source.status.lifecycle);
  view_model.current_state_id = source.status.current_state_id;
  view_model.current_state_name = source.status.current_state_id;
  view_model.current_state_type = state_type_text(source.status.current_state_type);
  view_model.state_elapsed_ms = source.status.state_elapsed_ms;
  view_model.pending_normal_stop = source.status.pending_normal_stop;
  view_model.pending_trip = source.status.pending_trip;
  view_model.lockout = source.status.lockout;
  view_model.last_reason = source.status.last_reason;

  for (const auto& program : source.programs) {
    DashboardProgramOption option;
    option.id = program.id;
    option.name = program.name;
    option.type = program_type_text(program.type);
    option.enabled = program.enabled;
    option.is_active = program.is_active;
    option.lifecycle = program.lifecycle.has_value() ? lifecycle_text(*program.lifecycle) : "idle";
    option.current_state_id = program.current_state;
    option.current_state_name = program.current_state;
    option.lockout = program.lockout.value_or(false);
    option.can_start = !view_model.active_program_id.has_value() && program.enabled;
    if (selected_program_status != nullptr &&
        selected_program_status->program_id == std::optional<std::string>{program.id}) {
      option.can_start = !view_model.active_program_id.has_value() && selected_program_status->can_start;
    }
    if (!option.can_start) {
      const auto selected_program_is_active =
          view_model.active_program_id.has_value() && *view_model.active_program_id == program.id;
      option.start_reason = build_start_reason(program, source.status, selected_program_is_active);
    }
    view_model.registered_programs.push_back(std::move(option));
  }

  for (const auto& candidate : source.status.transition_candidates) {
    DashboardTransitionCandidate mapped;
    mapped.transition_id = candidate.transition_id;
    mapped.target_state_id = candidate.target_state_id;
    mapped.target_state_name = candidate.target_state_id;
    mapped.eligible = candidate.eligible;
    mapped.reason = candidate.reason;
    mapped.min_time_satisfied = candidate.min_time_satisfied;
    mapped.condition_effective_result = candidate.condition_effective_result;
    view_model.transition_candidates.push_back(mapped);
  }

  const auto eligible_transition = std::find_if(
      view_model.transition_candidates.begin(),
      view_model.transition_candidates.end(),
      [](const DashboardTransitionCandidate& candidate) { return candidate.eligible; });
  if (eligible_transition != view_model.transition_candidates.end()) {
    view_model.next_transition_target_state_id = eligible_transition->target_state_id;
    view_model.next_transition_target_state_name = eligible_transition->target_state_name;
    view_model.next_transition_reason = eligible_transition->reason;
  } else if (!view_model.transition_candidates.empty()) {
    view_model.next_transition_target_state_id = view_model.transition_candidates.front().target_state_id;
    view_model.next_transition_target_state_name = view_model.transition_candidates.front().target_state_name;
    view_model.next_transition_reason = view_model.transition_candidates.front().reason;
    view_model.blocked_transitions = view_model.transition_candidates;
  }

  view_model.can_start = false;
  if (view_model.selected_program_id.has_value()) {
    const auto selected_it = std::find_if(
        view_model.registered_programs.begin(),
        view_model.registered_programs.end(),
        [&](const DashboardProgramOption& option) { return option.id == *view_model.selected_program_id; });
    if (selected_it != view_model.registered_programs.end()) {
      view_model.can_start = selected_program_status != nullptr ? selected_program_status->can_start : selected_it->can_start;
      view_model.start_reason = view_model.can_start ? "" : selected_it->start_reason;
    }
  }
  if (!view_model.can_start && !view_model.selected_program_id.has_value()) {
    view_model.start_reason = "Select a registered program to start.";
  }

  view_model.can_stop =
      view_model.active_program_id.has_value() && !source.status.pending_normal_stop && !source.status.pending_trip &&
      !source.status.lockout;
  if (!view_model.can_stop) {
    view_model.stop_reason = build_stop_reason(source.status);
  }

  view_model.can_trip =
      view_model.active_program_id.has_value() && !source.status.pending_trip && !source.status.lockout;
  if (!view_model.can_trip) {
    view_model.trip_reason = build_trip_reason(source.status);
  }

  view_model.can_reset = source.status.can_reset;
  if (!view_model.can_reset) {
    view_model.reset_reason = build_reset_reason(source.status);
  }

  view_model.alarms_any_active = source.status.active_alarms.any_active;
  view_model.alarms_active_count = source.status.active_alarms.active_count;
  view_model.alarms_highest_severity = severity_text(source.status.active_alarms.highest_severity);
  view_model.alarms_trip_active = source.status.active_alarms.trip_active;
  view_model.alarms_safety_active = source.status.active_alarms.safety_active;
  for (const auto& alarm_id : source.status.active_alarms.active_alarm_ids) {
    view_model.active_alarm_entries.push_back(DashboardAlarmEntry{
        alarm_id,
        alarm_id == source.status.active_alarms.highest_severity_alarm_id.value_or(std::string{})
            ? view_model.alarms_highest_severity
            : "",
        true,
    });
  }

  for (const auto& actuator : source.status.actuators) {
    DashboardActuatorSummary summary;
    summary.id = actuator.id;
    summary.kind = actuator_kind_text(actuator.kind);
    summary.role = actuator_role_text(actuator.role);
    summary.safe_fallback = actuator.safe_fallback;
    summary.owner = actuator.owner;
    summary.reason = actuator.reason;
    summary.priority = actuator_priority_text(actuator.priority);

    if (actuator.relay_state.has_value()) {
      summary.relay_on = *actuator.relay_state == RelayState::on;
      summary.is_on = *summary.relay_on;
      summary.state_text = relay_state_text(*actuator.relay_state);
    } else {
      summary.pwm_enabled = actuator.pwm_enabled.value_or(false);
      summary.pwm_duty_percent = actuator.pwm_duty_percent.value_or(0.0);
      summary.is_on = summary.pwm_enabled.value_or(false) && summary.pwm_duty_percent.value_or(0.0) > 0.0;
      summary.state_text =
          std::string(summary.pwm_enabled.value_or(false) ? "PWM enabled" : "PWM disabled") + " @ " +
          format_duty_percent(summary.pwm_duty_percent.value_or(0.0)) + "%";
    }

    if (summary.safe_fallback) {
      summary.emphasis = "safe_fallback";
    } else if (has_text(summary.owner) && summary.owner.rfind("program:", 0U) == 0U) {
      summary.emphasis = "sequence_owned";
    } else {
      summary.emphasis = "observed";
    }

    view_model.actuator_summaries.push_back(std::move(summary));
  }

  for (const auto& entry : source.history) {
    view_model.recent_history.push_back(DashboardHistoryEntry{
        entry.timestamp_ms,
        history_event_text(entry.event_type),
        entry.from_state,
        entry.to_state,
        entry.reason,
        entry.source,
    });
  }

  return view_model;
}

DashboardResultCode WebDashboardAdapter::map_api_code(const ApiErrorCode code, const DashboardResultCode denied_code) {
  switch (code) {
    case ApiErrorCode::ok:
      return DashboardResultCode::dashboard_ok;
    case ApiErrorCode::api_no_active_program:
      return DashboardResultCode::dashboard_no_active_program;
    case ApiErrorCode::api_start_denied:
    case ApiErrorCode::api_stop_denied:
    case ApiErrorCode::api_trip_denied:
    case ApiErrorCode::api_reset_denied:
      return denied_code;
    case ApiErrorCode::api_invalid_argument:
      return DashboardResultCode::dashboard_invalid_argument;
    case ApiErrorCode::api_program_not_found:
    case ApiErrorCode::api_program_inactive:
    case ApiErrorCode::api_history_unavailable:
      return DashboardResultCode::dashboard_data_unavailable;
    case ApiErrorCode::api_sequence_service_error:
    case ApiErrorCode::api_internal_mapping_error:
      return DashboardResultCode::dashboard_api_error;
  }

  return DashboardResultCode::dashboard_api_error;
}

std::optional<std::string> WebDashboardAdapter::select_program_id(
    const std::vector<ProgramSummaryDto>& programs,
    const ProgramStatusDto& status) {
  if (status.active_program_id.has_value()) {
    return status.active_program_id;
  }
  if (!programs.empty()) {
    return programs.front().id;
  }
  return std::nullopt;
}

DashboardDataResponse WebDashboardAdapter::make_error_response(
    const DashboardResultCode code,
    std::string message,
    const ApiTimestampMs now_ms) {
  DashboardDataResponse response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  return response;
}

DashboardCommandResponse WebDashboardAdapter::build_command_response(
    const CommandResultDto& result,
    const DashboardResultCode denied_code,
    const ApiTimestampMs now_ms,
    WebDashboardAdapter& adapter) {
  DashboardCommandResponse response;
  response.accepted = result.accepted;
  response.code = map_api_code(result.code, denied_code);
  response.message = result.message;
  response.refresh_recommended = true;

  const auto dashboard = adapter.get_dashboard_data(now_ms);
  response.updated_dashboard = dashboard;
  if (dashboard.success) {
    response.refresh_recommended = false;
  }

  return response;
}

}  // namespace controller::api
