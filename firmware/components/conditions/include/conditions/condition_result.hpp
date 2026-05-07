#pragma once

#include <string>
#include <vector>

#include "conditions/condition_trace.hpp"
#include "conditions/condition_types.hpp"

namespace controller::conditions {

struct ConditionValidationIssue {
  ConditionErrorCode code{ConditionErrorCode::ok};
  std::string node_id;
  std::string message;
};

struct ConditionValidationResult {
  ConditionStatus status{};
  std::vector<ConditionValidationIssue> issues;

  bool ok() const {
    return status.ok() && issues.empty();
  }
};

struct ConditionEvaluationResult {
  std::string tree_id;
  bool raw_result{false};
  bool effective_result{false};
  ConditionStatus status{};
  std::string reason;
  ConditionEvaluationCounter evaluation_counter{0U};
  std::vector<ConditionTraceEntry> trace;

  bool ok() const {
    return status.ok();
  }
};

}  // namespace controller::conditions
