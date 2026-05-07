#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "alarms/alarm_types.hpp"
#include "api/api_result.hpp"
#include "api/api_types.hpp"
#include "hal/relay_hal.hpp"
#include "sequence/sequence_snapshot.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::api {

struct ProgramSummaryDto {
  std::string id;
  std::string name;
  controller::sequence::SequenceProgramType type{controller::sequence::SequenceProgramType::generic};
  bool enabled{false};
  bool is_active{false};
  std::optional<controller::sequence::SequenceLifecycle> lifecycle;
  std::optional<std::string> current_state;
  std::optional<bool> lockout;
};

struct TransitionCandidateDto {
  std::string transition_id;
  std::string target_state_id;
  bool eligible{false};
  std::string reason;
  bool min_time_satisfied{true};
  std::optional<bool> condition_effective_result;
};

struct AlarmSummaryDto {
  bool any_active{false};
  bool trip_active{false};
  bool safety_active{false};
  std::uint64_t active_count{0U};
  std::optional<controller::alarms::AlarmSeverity> highest_severity;
  std::optional<std::string> highest_severity_alarm_id;
  std::vector<std::string> active_alarm_ids;
};

struct ActuatorSummaryDto {
  std::string id;
  controller::actuators::ActuatorTargetKind kind{controller::actuators::ActuatorTargetKind::relay};
  controller::actuators::ActuatorRole role{controller::actuators::ActuatorRole::generic};
  bool safe_fallback{true};
  std::string owner;
  std::string reason;
  controller::actuators::ActuatorPriority priority{controller::actuators::ActuatorPriority::default_priority};
  std::optional<controller::hal::RelayState> relay_state;
  std::optional<bool> pwm_enabled;
  std::optional<double> pwm_duty_percent;
};

struct ProgramStatusDto {
  std::optional<std::string> program_id;
  bool program_registered{false};
  bool is_active{false};
  bool enabled{false};
  std::string name;
  controller::sequence::SequenceProgramType type{controller::sequence::SequenceProgramType::generic};
  std::optional<std::string> active_program_id;
  controller::sequence::SequenceLifecycle lifecycle{controller::sequence::SequenceLifecycle::idle};
  std::optional<std::string> current_state_id;
  std::optional<std::string> previous_state_id;
  controller::sequence::SequenceStateType current_state_type{controller::sequence::SequenceStateType::generic};
  controller::sequence::SequenceDurationMs state_elapsed_ms{0U};
  bool pending_normal_stop{false};
  bool pending_trip{false};
  bool lockout{false};
  bool can_start{false};
  bool can_reset{false};
  std::string last_reason;
  std::vector<TransitionCandidateDto> transition_candidates;
  AlarmSummaryDto active_alarms;
  std::vector<ActuatorSummaryDto> actuators;
};

struct ProgramHistoryEntryDto {
  controller::sequence::SequenceHistorySequenceNumber sequence_number{0U};
  std::string program_id;
  controller::sequence::SequenceEventType event_type{controller::sequence::SequenceEventType::program_started};
  std::optional<std::string> from_state;
  std::optional<std::string> to_state;
  controller::sequence::SequenceTimestampMs timestamp_ms{0U};
  std::string source;
  std::string reason;
};

struct CommandResultDto {
  bool accepted{false};
  ApiErrorCode code{ApiErrorCode::ok};
  std::string message;
  std::optional<std::string> active_program_id;
  std::optional<controller::sequence::SequenceLifecycle> lifecycle;
  std::optional<std::string> current_state_id;
  std::optional<bool> can_reset;
  std::optional<ProgramStatusDto> status;
};

}  // namespace controller::api
