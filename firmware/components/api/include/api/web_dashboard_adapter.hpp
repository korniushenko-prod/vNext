#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "api/sequence_api_service.hpp"

namespace controller::api {

enum class DashboardResultCode {
  dashboard_ok,
  dashboard_no_active_program,
  dashboard_start_denied,
  dashboard_stop_denied,
  dashboard_trip_denied,
  dashboard_reset_denied,
  dashboard_api_error,
  dashboard_invalid_argument,
  dashboard_data_unavailable,
};

const char* to_string(DashboardResultCode code);

struct DashboardProgramOption {
  std::string id;
  std::string name;
  std::string type;
  bool enabled{false};
  bool is_active{false};
  std::string lifecycle;
  std::optional<std::string> current_state_id;
  std::optional<std::string> current_state_name;
  bool lockout{false};
  bool can_start{false};
  std::string start_reason;
};

struct DashboardTransitionCandidate {
  std::string transition_id;
  std::string target_state_id;
  std::optional<std::string> target_state_name;
  bool eligible{false};
  std::string reason;
  bool min_time_satisfied{true};
  std::optional<bool> condition_effective_result;
};

struct DashboardAlarmEntry {
  std::string id;
  std::string severity;
  bool active{true};
};

struct DashboardActuatorSummary {
  std::string id;
  std::string kind;
  std::string role;
  bool is_on{false};
  bool safe_fallback{true};
  std::string owner;
  std::string reason;
  std::string priority;
  std::string state_text;
  std::string emphasis;
  std::optional<bool> relay_on;
  std::optional<bool> pwm_enabled;
  std::optional<double> pwm_duty_percent;
};

struct DashboardHistoryEntry {
  std::uint64_t timestamp_ms{0U};
  std::string event_type;
  std::optional<std::string> from_state;
  std::optional<std::string> to_state;
  std::string reason;
  std::string source;
};

struct WebDashboardViewModel {
  std::vector<DashboardProgramOption> registered_programs;
  std::optional<std::string> selected_program_id;
  std::optional<std::string> active_program_id;
  std::string active_program_name;
  std::string lifecycle;
  std::optional<std::string> current_state_id;
  std::optional<std::string> current_state_name;
  std::string current_state_type;
  std::uint64_t state_elapsed_ms{0U};
  std::optional<std::string> next_transition_target_state_id;
  std::optional<std::string> next_transition_target_state_name;
  std::string next_transition_reason;
  bool pending_normal_stop{false};
  bool pending_trip{false};
  bool lockout{false};
  bool can_start{false};
  bool can_stop{false};
  bool can_trip{false};
  bool can_reset{false};
  std::string start_reason;
  std::string stop_reason;
  std::string trip_reason;
  std::string reset_reason;
  std::string last_reason;
  std::vector<DashboardTransitionCandidate> transition_candidates;
  std::vector<DashboardTransitionCandidate> blocked_transitions;
  bool alarms_any_active{false};
  std::uint64_t alarms_active_count{0U};
  std::string alarms_highest_severity;
  bool alarms_trip_active{false};
  bool alarms_safety_active{false};
  std::vector<DashboardAlarmEntry> active_alarm_entries;
  std::vector<DashboardActuatorSummary> actuator_summaries;
  std::vector<DashboardHistoryEntry> recent_history;
};

struct DashboardSourceData {
  std::vector<ProgramSummaryDto> programs;
  ProgramStatusDto status;
  std::optional<ProgramStatusDto> selected_program_status;
  std::vector<ProgramHistoryEntryDto> history;
};

struct DashboardDataResponse {
  bool success{false};
  DashboardResultCode code{DashboardResultCode::dashboard_data_unavailable};
  std::string message;
  ApiTimestampMs refresh_timestamp_ms{0U};
  WebDashboardViewModel dashboard;
  std::vector<std::string> warnings;
};

struct DashboardCommandResponse {
  bool accepted{false};
  DashboardResultCode code{DashboardResultCode::dashboard_data_unavailable};
  std::string message;
  bool refresh_recommended{true};
  std::optional<DashboardDataResponse> updated_dashboard;
};

class WebDashboardAdapter {
 public:
  explicit WebDashboardAdapter(SequenceApiService& sequence_api_service);

  DashboardDataResponse get_dashboard_data(ApiTimestampMs now_ms) const;
  DashboardCommandResponse post_start(const std::string& program_id, const CommandContext& context);
  DashboardCommandResponse post_stop(const CommandContext& context);
  DashboardCommandResponse post_trip(const CommandContext& context);
  DashboardCommandResponse post_reset(const CommandContext& context);

  static WebDashboardViewModel build_view_model(const DashboardSourceData& source);

 private:
  static constexpr ApiHistoryLimit kDashboardHistoryLimit = 8;

  static DashboardResultCode map_api_code(ApiErrorCode code, DashboardResultCode denied_code);
  static std::optional<std::string> select_program_id(
      const std::vector<ProgramSummaryDto>& programs,
      const ProgramStatusDto& status);
  static DashboardDataResponse make_error_response(
      DashboardResultCode code,
      std::string message,
      ApiTimestampMs now_ms);
  static DashboardCommandResponse build_command_response(
      const CommandResultDto& result,
      DashboardResultCode denied_code,
      ApiTimestampMs now_ms,
      WebDashboardAdapter& adapter);

  SequenceApiService& sequence_api_service_;
};

}  // namespace controller::api
