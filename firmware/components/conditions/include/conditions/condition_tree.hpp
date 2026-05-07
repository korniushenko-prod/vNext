#pragma once

#include <string>
#include <vector>

#include "conditions/condition_node.hpp"
#include "conditions/condition_result.hpp"

namespace controller::conditions {

struct ConditionTree {
  std::string tree_id;
  std::string root_node_id;
  std::vector<ConditionNode> nodes;
};

ConditionValidationResult validate_tree(const ConditionTree& tree);

}  // namespace controller::conditions
