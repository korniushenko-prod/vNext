#pragma once

#include <optional>
#include <string>
#include <vector>

#include "conditions/condition_tree.hpp"
#include "sequence/sequence_action.hpp"
#include "sequence/sequence_transition.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::sequence {

struct SequenceState {
  std::string id;
  std::string name;
  bool enabled{true};
  SequenceStateType type{SequenceStateType::generic};
  std::vector<SequenceAction> entry_actions;
  std::vector<SequenceAction> active_actions;
  std::vector<SequenceAction> exit_actions;
  std::optional<controller::conditions::ConditionTree> guard_condition;
  std::optional<std::string> guard_fail_target_state_id;
  std::optional<SequenceDurationMs> min_time_ms;
  std::optional<SequenceDurationMs> max_time_ms;
  std::optional<std::string> timeout_target_state_id;
  std::vector<SequenceTransition> transitions;
  bool non_skippable{false};
  bool manual_allowed{false};
};

}  // namespace controller::sequence
