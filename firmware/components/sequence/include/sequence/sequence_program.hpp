#pragma once

#include <optional>
#include <string>
#include <vector>

#include "conditions/condition_tree.hpp"
#include "sequence/sequence_state.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::sequence {

struct SequenceProgram {
  std::string id;
  std::string name;
  std::optional<std::string> description;
  bool enabled{true};
  SequenceProgramType type{SequenceProgramType::generic};
  std::string initial_state_id;
  std::string normal_stop_state_id;
  std::string trip_state_id;
  std::string lockout_state_id;
  std::optional<controller::conditions::ConditionTree> start_condition;
  std::optional<controller::conditions::ConditionTree> reset_condition;
  std::vector<SequenceState> states;
};

}  // namespace controller::sequence
