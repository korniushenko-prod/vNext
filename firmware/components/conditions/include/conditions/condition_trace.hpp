#pragma once

#include <string>

#include "conditions/condition_types.hpp"

namespace controller::conditions {

struct ConditionTraceEntry {
  std::string node_id;
  ConditionNodeKind node_kind{ConditionNodeKind::constant_bool};
  bool raw_result{false};
  bool effective_result{false};
  ConditionErrorCode error_code{ConditionErrorCode::ok};
  std::string reason;
  std::string signal_path;
  std::string value_summary;
};

}  // namespace controller::conditions
