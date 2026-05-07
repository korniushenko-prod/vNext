#pragma once

#include <optional>
#include <string>
#include <variant>
#include <vector>

#include "conditions/condition_types.hpp"
#include "conditions/condition_value.hpp"

namespace controller::conditions {

struct ConditionNodeMetadata {
  std::string node_id;
  std::string name;
  std::string description;
  ConditionNodeKind kind{ConditionNodeKind::constant_bool};
  ConditionDurationMs delay_on_ms{0U};
  ConditionDurationMs delay_off_ms{0U};
  std::optional<double> hysteresis;
};

struct ConditionGroupNode {
  std::vector<std::string> children;
};

struct ConditionConstantBoolNode {
  bool value{false};
};

struct ConditionSignalCompareNode {
  std::string signal_path;
  ConditionOperator op{ConditionOperator::eq};
  ConditionValue rhs{false};
};

struct ConditionSignalRangeNode {
  std::string signal_path;
  ConditionValue lower{std::int64_t{0}};
  ConditionValue upper{std::int64_t{0}};
  ConditionRangeMode mode{ConditionRangeMode::in_range};
};

struct ConditionSignalFlagNode {
  std::string signal_path;
  ConditionSignalFlag flag{ConditionSignalFlag::valid};
  bool expected{true};
};

using ConditionNodePayload = std::variant<
    ConditionGroupNode,
    ConditionConstantBoolNode,
    ConditionSignalCompareNode,
    ConditionSignalRangeNode,
    ConditionSignalFlagNode>;

struct ConditionNode {
  ConditionNodeMetadata metadata;
  ConditionNodePayload payload;
};

ConditionNodeKind node_kind_from_payload(const ConditionNodePayload& payload);

}  // namespace controller::conditions
