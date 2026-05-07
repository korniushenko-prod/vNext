#pragma once

#include <string>
#include <unordered_map>
#include <vector>

#include "conditions/condition_result.hpp"
#include "conditions/condition_tree.hpp"
#include "signals/signal_registry.hpp"

namespace controller::conditions {

struct ConditionNodeRuntimeState {
  bool initialized{false};
  bool last_raw_result{false};
  bool effective_result{false};
  bool pending_transition_active{false};
  bool pending_target_result{false};
  ConditionTimestampMs pending_since_ms{0U};
  ConditionNodeUpdateCounter update_counter{0U};
  ConditionTimestampMs last_evaluated_ms{0U};
};

class ConditionEvaluator {
 public:
  ConditionEvaluator(ConditionTree tree, const controller::signals::SignalRegistry& signal_registry);

  const ConditionTree& tree() const;
  const ConditionValidationResult& validation() const;

  ConditionEvaluationResult evaluate(ConditionTimestampMs now_ms);
  void reset_runtime();

  const ConditionEvaluationResult& get_last_result() const;
  const std::vector<ConditionTraceEntry>& get_last_trace() const;
  ConditionResult<ConditionNodeRuntimeState> get_node_runtime_state(const std::string& node_id) const;

 private:
  ConditionTree tree_;
  const controller::signals::SignalRegistry& signal_registry_;
  ConditionValidationResult validation_;
  std::unordered_map<std::string, std::size_t> node_index_by_id_;
  std::unordered_map<std::string, ConditionNodeRuntimeState> runtime_state_by_id_;
  ConditionEvaluationCounter evaluation_counter_{0U};
  ConditionEvaluationResult last_result_{};
};

}  // namespace controller::conditions
