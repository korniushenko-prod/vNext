#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "conditions/condition_trace.hpp"
#include "logic/logic_types.hpp"

namespace controller::logic {

struct RuleSnapshot {
  std::string id;
  std::string name;
  bool enabled{true};
  bool active{false};
  LogicActivationCount activation_count{0U};
  LogicTimestampMs last_transition_ms{0U};
  std::string last_reason;
  std::optional<std::string> last_error;
  bool condition_effective_result{false};
  std::optional<std::string> owner;
  std::vector<controller::conditions::ConditionTraceEntry> condition_trace;
  std::size_t active_output_count{0U};
  LogicUpdateCounter update_counter{0U};
};

}  // namespace controller::logic
