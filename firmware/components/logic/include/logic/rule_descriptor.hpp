#pragma once

#include <string>
#include <vector>

#include "conditions/condition_tree.hpp"
#include "logic/rule_action.hpp"

namespace controller::logic {

struct RuleDescriptor {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string description;
  controller::conditions::ConditionTree condition_tree;
  std::vector<RuleAction> on_true_actions;
  std::vector<RuleAction> while_true_actions;
  std::vector<RuleAction> on_false_actions;
  std::string source_module;
  bool visible{true};
  std::vector<std::string> tags;
};

}  // namespace controller::logic
