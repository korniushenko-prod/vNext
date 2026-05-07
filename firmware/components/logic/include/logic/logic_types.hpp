#pragma once

#include <cstddef>
#include <cstdint>
#include <optional>
#include <string>
#include <vector>

#include "conditions/condition_trace.hpp"

namespace controller::logic {

using LogicTimestampMs = std::uint64_t;
using LogicUpdateCounter = std::uint64_t;
using LogicActivationCount = std::uint64_t;
using LogicHistorySequenceNumber = std::uint64_t;

enum class RuleActionKind {
  relay_request,
  pwm_request,
  timer_start,
  timer_stop,
  alarm_set_condition,
  write_virtual_signal,
  program_start,
  program_request_normal_stop,
  program_request_trip,
  program_reset_active,
  log_note,
};

enum class RuleActionSection {
  on_true,
  while_true,
  on_false,
};

enum class RuleEventType {
  rule_became_true,
  rule_became_false,
  output_request_failed,
  command_executed,
  command_failed,
  evaluation_error,
  rule_disabled_cleared,
};

struct RuntimeRuleState {
  bool initialized{false};
  bool active{false};
  std::optional<bool> last_raw_result;
  bool last_effective_result{false};
  LogicTimestampMs last_transition_ms{0U};
  LogicActivationCount activation_count{0U};
  LogicUpdateCounter update_counter{0U};
  std::string last_reason;
  std::optional<std::string> last_error;
  std::vector<controller::conditions::ConditionTraceEntry> last_condition_trace;
};

struct LogicSummary {
  bool any_rule_active{false};
  std::size_t active_rule_count{0U};
  LogicTimestampMs last_tick_ms{0U};
  LogicUpdateCounter update_counter{0U};
};

const char* to_string(RuleActionKind kind);
const char* to_string(RuleActionSection section);
const char* to_string(RuleEventType event_type);

}  // namespace controller::logic
