#include "api/sequence_api_service.hpp"

#include <algorithm>
#include <utility>

namespace controller::api {

namespace {

bool has_text(const std::string& value) {
  return !value.empty();
}

bool is_active_snapshot(const controller::sequence::SequenceSnapshot& snapshot) {
  return snapshot.active_program_id.has_value() && snapshot.program_id == *snapshot.active_program_id;
}

ProgramHistoryEntryDto to_history_entry_dto(const controller::sequence::SequenceHistoryEntry& entry) {
  return ProgramHistoryEntryDto{
      entry.sequence_number,
      entry.program_id,
      entry.event_type,
      entry.from_state,
      entry.to_state,
      entry.timestamp_ms,
      entry.source,
      entry.reason,
  };
}

}  // namespace

SequenceApiService::SequenceApiService(
    controller::sequence::SequenceService& sequence_service,
    controller::alarms::AlarmService& alarm_service,
    controller::actuators::ActuatorManager& actuator_manager)
    : sequence_service_(sequence_service),
      alarm_service_(alarm_service),
      actuator_manager_(actuator_manager) {}

ApiResult<std::vector<ProgramSummaryDto>> SequenceApiService::list_programs(const ApiTimestampMs now_ms) const {
  ApiResult<std::vector<ProgramSummaryDto>> result;

  const auto programs = sequence_service_.list_programs();
  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
  if (programs.size() != snapshots.size()) {
    result.status = ApiStatus::error(
        ApiErrorCode::api_internal_mapping_error,
        "Program list and snapshot list sizes do not match.");
    return result;
  }

  std::vector<ProgramSummaryDto> summaries;
  summaries.reserve(programs.size());
  for (std::size_t index = 0; index < programs.size(); ++index) {
    const auto& program = programs[index];
    const auto& snapshot = snapshots[index];

    ProgramSummaryDto dto;
    dto.id = program.id;
    dto.name = program.name;
    dto.type = program.type;
    dto.enabled = program.enabled;
    dto.is_active = is_active_snapshot(snapshot);
    if (dto.is_active) {
      dto.lifecycle = snapshot.lifecycle;
      dto.current_state = snapshot.current_state_id;
      dto.lockout = snapshot.lockout;
    }

    summaries.push_back(std::move(dto));
  }

  result.status = ApiStatus::success();
  result.value = std::move(summaries);
  return result;
}

ApiResult<ProgramStatusDto> SequenceApiService::get_active_program_status(const ApiTimestampMs now_ms) const {
  ApiResult<ProgramStatusDto> result;
  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);

  for (const auto& snapshot : snapshots) {
    if (!is_active_snapshot(snapshot)) {
      continue;
    }

    const auto program = sequence_service_.get_program(snapshot.program_id);
    if (!program.ok()) {
      result.status = map_sequence_query_status(program.status, ApiErrorCode::api_internal_mapping_error);
      return result;
    }

    result.status = ApiStatus::success();
    result.value = build_program_status(*program.value, snapshot);
    return result;
  }

  result.status = ApiStatus::success();
  result.value = build_idle_status();
  return result;
}

ApiResult<ProgramStatusDto> SequenceApiService::get_program_status(
    const std::string& program_id,
    const ApiTimestampMs now_ms) const {
  ApiResult<ProgramStatusDto> result;

  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  const auto program = sequence_service_.get_program(program_id);
  if (!program.ok()) {
    result.status = map_sequence_query_status(program.status, ApiErrorCode::api_program_not_found);
    return result;
  }

  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
  const auto snapshot_it =
      std::find_if(snapshots.begin(), snapshots.end(), [&](const auto& snapshot) { return snapshot.program_id == program_id; });
  if (snapshot_it == snapshots.end()) {
    result.status = ApiStatus::error(
        ApiErrorCode::api_internal_mapping_error,
        "Program '" + program_id + "' is registered but no snapshot was produced.");
    return result;
  }

  result.status = ApiStatus::success();
  result.value = build_program_status(*program.value, *snapshot_it);
  return result;
}

ApiResult<std::vector<ProgramHistoryEntryDto>> SequenceApiService::get_program_history(
    const std::string& program_id,
    const std::optional<ApiHistoryLimit> limit) const {
  ApiResult<std::vector<ProgramHistoryEntryDto>> result;

  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  const auto program = sequence_service_.get_program(program_id);
  if (!program.ok()) {
    result.status = map_sequence_query_status(program.status, ApiErrorCode::api_program_not_found);
    return result;
  }

  std::size_t effective_limit = 0U;
  const auto limit_status = validate_history_limit(limit, effective_limit);
  if (!limit_status.ok()) {
    result.status = limit_status;
    return result;
  }

  std::vector<ProgramHistoryEntryDto> entries;
  const auto history = sequence_service_.read_history();
  for (const auto& entry : history) {
    if (entry.program_id != program_id) {
      continue;
    }
    if (entries.size() >= effective_limit) {
      break;
    }
    entries.push_back(to_history_entry_dto(entry));
  }

  result.status = ApiStatus::success();
  result.value = std::move(entries);
  return result;
}

ApiResult<std::vector<ProgramHistoryEntryDto>> SequenceApiService::get_active_program_history(
    const std::optional<ApiHistoryLimit> limit) const {
  ApiResult<std::vector<ProgramHistoryEntryDto>> result;

  const auto active_program_id = current_active_program_id();
  if (!active_program_id.has_value()) {
    result.status = ApiStatus::error(
        ApiErrorCode::api_no_active_program,
        "No active program history is available.");
    return result;
  }

  return get_program_history(*active_program_id, limit);
}

CommandResultDto SequenceApiService::start_program(const std::string& program_id, const CommandContext& context) {
  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    return make_command_result(false, id_status.code, id_status.message);
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return make_command_result(false, context_status.code, context_status.message);
  }

  const auto operation =
      sequence_service_.start_program(program_id, context.now_ms, context.source, context.reason);
  if (!operation.ok()) {
    auto status = try_get_program_status(program_id, context.now_ms);
    if (!status.has_value()) {
      status = try_get_active_status(context.now_ms);
    }
    return make_command_result(
        false,
        map_sequence_command_error(operation.status, ApiErrorCode::api_start_denied),
        operation.status.message,
        status);
  }

  return make_command_result(
      true,
      ApiErrorCode::ok,
      "Program '" + program_id + "' start accepted.",
      try_get_program_status(program_id, context.now_ms));
}

CommandResultDto SequenceApiService::request_normal_stop(const CommandContext& context) {
  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return make_command_result(false, context_status.code, context_status.message);
  }

  const auto operation =
      sequence_service_.request_normal_stop(context.now_ms, context.source, context.reason);
  if (!operation.ok()) {
    return make_command_result(
        false,
        map_sequence_command_error(operation.status, ApiErrorCode::api_stop_denied),
        operation.status.message,
        try_get_active_status(context.now_ms));
  }

  return make_command_result(
      true,
      ApiErrorCode::ok,
      "Active program normal stop requested.",
      try_get_active_status(context.now_ms));
}

CommandResultDto SequenceApiService::request_trip_stop(const CommandContext& context) {
  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return make_command_result(false, context_status.code, context_status.message);
  }

  const auto operation =
      sequence_service_.request_trip_stop(context.now_ms, context.source, context.reason);
  if (!operation.ok()) {
    return make_command_result(
        false,
        map_sequence_command_error(operation.status, ApiErrorCode::api_trip_denied),
        operation.status.message,
        try_get_active_status(context.now_ms));
  }

  return make_command_result(
      true,
      ApiErrorCode::ok,
      "Active program trip requested.",
      try_get_active_status(context.now_ms));
}

CommandResultDto SequenceApiService::reset_active_program(const CommandContext& context) {
  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return make_command_result(false, context_status.code, context_status.message);
  }

  const auto operation =
      sequence_service_.reset_active_program(context.now_ms, context.source, context.reason);
  if (!operation.ok()) {
    return make_command_result(
        false,
        map_sequence_command_error(operation.status, ApiErrorCode::api_reset_denied),
        operation.status.message,
        try_get_active_status(context.now_ms));
  }

  return make_command_result(
      true,
      ApiErrorCode::ok,
      "Active program reset accepted.",
      try_get_active_status(context.now_ms));
}

ApiStatus SequenceApiService::validate_program_id(const std::string& program_id) const {
  if (!has_text(program_id)) {
    return ApiStatus::error(ApiErrorCode::api_invalid_argument, "program_id must not be empty.");
  }
  return ApiStatus::success();
}

ApiStatus SequenceApiService::validate_command_context(const CommandContext& context) const {
  if (!has_text(context.source)) {
    return ApiStatus::error(ApiErrorCode::api_invalid_argument, "CommandContext.source must not be empty.");
  }
  if (!has_text(context.reason)) {
    return ApiStatus::error(ApiErrorCode::api_invalid_argument, "CommandContext.reason must not be empty.");
  }
  return ApiStatus::success();
}

ApiStatus SequenceApiService::validate_history_limit(
    const std::optional<ApiHistoryLimit>& limit,
    std::size_t& effective_limit) const {
  if (!limit.has_value()) {
    effective_limit = static_cast<std::size_t>(kDefaultHistoryLimit);
    return ApiStatus::success();
  }
  if (*limit < 0) {
    return ApiStatus::error(ApiErrorCode::api_invalid_argument, "history limit must be zero or greater.");
  }

  effective_limit = static_cast<std::size_t>(*limit);
  return ApiStatus::success();
}

ApiStatus SequenceApiService::map_sequence_query_status(
    const controller::sequence::SequenceStatus& status,
    const ApiErrorCode fallback_code) const {
  switch (status.code) {
    case controller::sequence::SequenceErrorCode::ok:
      return ApiStatus::success();
    case controller::sequence::SequenceErrorCode::sequence_program_not_found:
      return ApiStatus::error(ApiErrorCode::api_program_not_found, status.message);
    case controller::sequence::SequenceErrorCode::sequence_no_active_program:
      return ApiStatus::error(ApiErrorCode::api_no_active_program, status.message);
    default:
      return ApiStatus::error(fallback_code, status.message);
  }
}

ApiErrorCode SequenceApiService::map_sequence_command_error(
    const controller::sequence::SequenceStatus& status,
    const ApiErrorCode denied_code) const {
  switch (status.code) {
    case controller::sequence::SequenceErrorCode::sequence_program_not_found:
      return ApiErrorCode::api_program_not_found;
    case controller::sequence::SequenceErrorCode::sequence_no_active_program:
      return ApiErrorCode::api_no_active_program;
    case controller::sequence::SequenceErrorCode::sequence_start_denied:
      return ApiErrorCode::api_start_denied;
    case controller::sequence::SequenceErrorCode::sequence_reset_denied:
      return ApiErrorCode::api_reset_denied;
    case controller::sequence::SequenceErrorCode::sequence_program_disabled:
    case controller::sequence::SequenceErrorCode::sequence_active_program_exists:
    case controller::sequence::SequenceErrorCode::sequence_lockout_active:
      return denied_code;
    case controller::sequence::SequenceErrorCode::sequence_invalid_program:
    case controller::sequence::SequenceErrorCode::sequence_invalid_state_reference:
    case controller::sequence::SequenceErrorCode::sequence_invalid_action:
    case controller::sequence::SequenceErrorCode::sequence_signal_publish_failed:
    case controller::sequence::SequenceErrorCode::sequence_actuator_request_failed:
    case controller::sequence::SequenceErrorCode::sequence_timer_action_failed:
    case controller::sequence::SequenceErrorCode::sequence_alarm_action_failed:
    case controller::sequence::SequenceErrorCode::sequence_virtual_signal_write_failed:
      return ApiErrorCode::api_sequence_service_error;
    case controller::sequence::SequenceErrorCode::sequence_program_already_registered:
      return ApiErrorCode::api_internal_mapping_error;
    case controller::sequence::SequenceErrorCode::ok:
      return ApiErrorCode::ok;
  }

  return ApiErrorCode::api_sequence_service_error;
}

AlarmSummaryDto SequenceApiService::build_alarm_summary() const {
  AlarmSummaryDto dto;
  const auto aggregate = alarm_service_.get_aggregate_status();
  dto.any_active = aggregate.any_active;
  dto.trip_active = aggregate.trip_active;
  dto.safety_active = aggregate.safety_active;
  dto.active_count = aggregate.active_count;
  dto.highest_severity = aggregate.highest_severity;
  dto.highest_severity_alarm_id = aggregate.highest_severity_alarm_id;

  for (const auto& snapshot : alarm_service_.list_snapshots()) {
    if (snapshot.state.active) {
      dto.active_alarm_ids.push_back(snapshot.descriptor.id);
    }
  }

  return dto;
}

std::vector<ActuatorSummaryDto> SequenceApiService::build_actuator_summaries() const {
  std::vector<ActuatorSummaryDto> actuators;
  const auto snapshots = actuator_manager_.list_snapshots();
  actuators.reserve(snapshots.size());

  for (const auto& snapshot : snapshots) {
    ActuatorSummaryDto dto;
    dto.id = snapshot.target_id;
    dto.kind = snapshot.kind;
    dto.role = snapshot.role;
    dto.safe_fallback = snapshot.safe_fallback;
    dto.owner = snapshot.owner;
    dto.reason = snapshot.reason;
    dto.priority = snapshot.priority;

    if (const auto* relay_state = std::get_if<controller::actuators::RelayEffectiveState>(&snapshot.effective)) {
      dto.relay_state = relay_state->state;
    } else if (const auto* pwm_state = std::get_if<controller::actuators::PwmEffectiveState>(&snapshot.effective)) {
      dto.pwm_enabled = pwm_state->enabled;
      dto.pwm_duty_percent = pwm_state->duty_percent;
    }

    actuators.push_back(std::move(dto));
  }

  return actuators;
}

std::vector<TransitionCandidateDto> SequenceApiService::build_transition_candidates(
    const std::vector<controller::sequence::SequenceTransitionCandidate>& candidates) const {
  std::vector<TransitionCandidateDto> dtos;
  dtos.reserve(candidates.size());

  for (const auto& candidate : candidates) {
    dtos.push_back(TransitionCandidateDto{
        candidate.transition_id,
        candidate.target_state_id,
        candidate.eligible,
        candidate.reason,
        candidate.min_time_satisfied,
        candidate.condition_effective_result,
    });
  }

  return dtos;
}

ProgramStatusDto SequenceApiService::build_idle_status() const {
  ProgramStatusDto dto;
  dto.program_registered = false;
  dto.is_active = false;
  dto.lifecycle = controller::sequence::SequenceLifecycle::idle;
  dto.current_state_type = controller::sequence::SequenceStateType::generic;
  dto.active_alarms = build_alarm_summary();
  dto.actuators = build_actuator_summaries();
  return dto;
}

ProgramStatusDto SequenceApiService::build_program_status(
    const controller::sequence::SequenceProgram& program,
    const controller::sequence::SequenceSnapshot& snapshot) const {
  ProgramStatusDto dto;
  dto.program_id = program.id;
  dto.program_registered = true;
  dto.is_active = is_active_snapshot(snapshot);
  dto.enabled = program.enabled;
  dto.name = program.name;
  dto.type = program.type;
  dto.active_program_id = snapshot.active_program_id;
  dto.lifecycle = dto.is_active ? snapshot.lifecycle : controller::sequence::SequenceLifecycle::idle;
  dto.current_state_id = dto.is_active ? snapshot.current_state_id : std::nullopt;
  dto.previous_state_id = dto.is_active ? snapshot.previous_state_id : std::nullopt;
  dto.current_state_type = dto.is_active ? snapshot.current_state_type : controller::sequence::SequenceStateType::generic;
  dto.state_elapsed_ms = dto.is_active ? snapshot.state_elapsed_ms : 0U;
  dto.pending_normal_stop = dto.is_active && snapshot.pending_normal_stop;
  dto.pending_trip = dto.is_active && snapshot.pending_trip;
  dto.lockout = dto.is_active && snapshot.lockout;
  dto.can_start = snapshot.can_start;
  dto.can_reset = dto.is_active && snapshot.can_reset;
  dto.last_reason = dto.is_active ? snapshot.last_reason : "";
  if (dto.is_active) {
    dto.transition_candidates = build_transition_candidates(snapshot.transition_candidates);
  }
  dto.active_alarms = build_alarm_summary();
  dto.actuators = build_actuator_summaries();
  return dto;
}

CommandResultDto SequenceApiService::make_command_result(
    const bool accepted,
    const ApiErrorCode code,
    std::string message,
    std::optional<ProgramStatusDto> status) const {
  CommandResultDto result;
  result.accepted = accepted;
  result.code = code;
  result.message = std::move(message);
  result.status = std::move(status);
  if (result.status.has_value()) {
    result.active_program_id = result.status->active_program_id;
    result.lifecycle = result.status->lifecycle;
    result.current_state_id = result.status->current_state_id;
    result.can_reset = result.status->can_reset;
  }
  return result;
}

std::optional<ProgramStatusDto> SequenceApiService::try_get_program_status(
    const std::string& program_id,
    const ApiTimestampMs now_ms) const {
  const auto result = get_program_status(program_id, now_ms);
  if (!result.ok()) {
    return std::nullopt;
  }
  return result.value;
}

std::optional<ProgramStatusDto> SequenceApiService::try_get_active_status(const ApiTimestampMs now_ms) const {
  const auto result = get_active_program_status(now_ms);
  if (!result.ok()) {
    return std::nullopt;
  }
  return result.value;
}

std::optional<std::string> SequenceApiService::current_active_program_id() const {
  const auto snapshots = sequence_service_.list_program_snapshots(0U);
  for (const auto& snapshot : snapshots) {
    if (is_active_snapshot(snapshot)) {
      return snapshot.program_id;
    }
  }
  return std::nullopt;
}

}  // namespace controller::api
