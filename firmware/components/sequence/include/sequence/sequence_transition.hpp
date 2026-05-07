#pragma once

#include <optional>
#include <string>

#include "conditions/condition_tree.hpp"

namespace controller::sequence {

struct SequenceTransition {
  std::string id;
  std::string name;
  std::string target_state_id;
  std::optional<controller::conditions::ConditionTree> condition;
  bool require_min_time_done{false};
  bool enabled{true};
};

}  // namespace controller::sequence
