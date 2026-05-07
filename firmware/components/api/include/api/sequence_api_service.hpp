#pragma once

#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_manager.hpp"
#include "alarms/alarm_service.hpp"
#include "api/api_result.hpp"
#include "api/sequence_api_types.hpp"
#include "sequence/sequence_service.hpp"

namespace controller::api {

class SequenceApiService {
 public:
  SequenceApiService(
      controller::sequence::SequenceService& sequence_service,
      controller::alarms::AlarmService& alarm_service,
      controller::actuators::ActuatorManager& actuator_manager);

  ApiResult<std::vector<ProgramSummaryDto>> list_programs(ApiTimestampMs now_ms) const;
  ApiResult<ProgramStatusDto> get_active_program_status(ApiTimestampMs now_ms) const;
  ApiResult<ProgramStatusDto> get_program_status(const std::string& program_id, ApiTimestampMs now_ms) const;
  ApiResult<std::vector<ProgramHistoryEntryDto>> get_program_history(
      const std::string& program_id,
      std::optional<ApiHistoryLimit> limit = std::nullopt) const;
  ApiResult<std::vector<ProgramHistoryEntryDto>> get_active_program_history(
      std::optional<ApiHistoryLimit> limit = std::nullopt) const;

  CommandResultDto start_program(const std::string& program_id, const CommandContext& context);
  CommandResultDto request_normal_stop(const CommandContext& context);
  CommandResultDto request_trip_stop(const CommandContext& context);
  CommandResultDto reset_active_program(const CommandContext& context);

 private:
  ApiStatus validate_program_id(const std::string& program_id) const;
  ApiStatus validate_command_context(const CommandContext& context) const;
  ApiStatus validate_history_limit(const std::optional<ApiHistoryLimit>& limit, std::size_t& effective_limit) const;

  ApiStatus map_sequence_query_status(
      const controller::sequence::SequenceStatus& status,
      ApiErrorCode fallback_code) const;
  ApiErrorCode map_sequence_command_error(
      const controller::sequence::SequenceStatus& status,
      ApiErrorCode denied_code) const;

  AlarmSummaryDto build_alarm_summary() const;
  std::vector<ActuatorSummaryDto> build_actuator_summaries() const;
  std::vector<TransitionCandidateDto> build_transition_candidates(
      const std::vector<controller::sequence::SequenceTransitionCandidate>& candidates) const;
  ProgramStatusDto build_idle_status() const;
  ProgramStatusDto build_program_status(
      const controller::sequence::SequenceProgram& program,
      const controller::sequence::SequenceSnapshot& snapshot) const;
  CommandResultDto make_command_result(
      bool accepted,
      ApiErrorCode code,
      std::string message,
      std::optional<ProgramStatusDto> status = std::nullopt) const;
  std::optional<ProgramStatusDto> try_get_program_status(const std::string& program_id, ApiTimestampMs now_ms) const;
  std::optional<ProgramStatusDto> try_get_active_status(ApiTimestampMs now_ms) const;
  std::optional<std::string> current_active_program_id() const;

  controller::sequence::SequenceService& sequence_service_;
  controller::alarms::AlarmService& alarm_service_;
  controller::actuators::ActuatorManager& actuator_manager_;
};

}  // namespace controller::api
