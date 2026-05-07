#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "conditions/condition_trace.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::sequence {

struct SequenceTransitionCandidate {
  std::string transition_id;
  std::string target_state_id;
  bool eligible{false};
  std::string reason;
  bool min_time_satisfied{true};
  std::optional<bool> condition_effective_result;
  std::vector<controller::conditions::ConditionTraceEntry> condition_trace;
};

struct SequenceSnapshot {
  std::string program_id;
  std::optional<std::string> active_program_id;
  SequenceLifecycle lifecycle{SequenceLifecycle::idle};
  std::optional<std::string> current_state_id;
  std::optional<std::string> previous_state_id;
  SequenceStateType current_state_type{SequenceStateType::generic};
  SequenceDurationMs state_elapsed_ms{0U};
  bool pending_normal_stop{false};
  bool pending_trip{false};
  bool lockout{false};
  bool can_start{false};
  bool can_reset{false};
  std::string last_reason;
  std::vector<SequenceTransitionCandidate> transition_candidates;
  std::vector<controller::conditions::ConditionTraceEntry> last_guard_trace;
  SequenceUpdateCounter update_counter{0U};
  std::size_t history_size{0U};
};

}  // namespace controller::sequence
