#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <utility>

namespace controller::conditions {

using ConditionTimestampMs = std::uint64_t;
using ConditionDurationMs = std::uint64_t;
using ConditionEvaluationCounter = std::uint64_t;
using ConditionNodeUpdateCounter = std::uint64_t;

enum class ConditionNodeKind {
  all,
  any,
  not_op,
  constant_bool,
  signal_compare,
  signal_range,
  signal_flag,
};

enum class ConditionOperator {
  eq,
  neq,
  gt,
  gte,
  lt,
  lte,
};

enum class ConditionRangeMode {
  in_range,
  out_of_range,
};

enum class ConditionSignalFlag {
  valid,
  fault,
  stale,
  initialized,
};

enum class ConditionErrorCode {
  ok,
  condition_tree_empty,
  condition_root_not_found,
  condition_duplicate_node_id,
  condition_invalid_child_reference,
  condition_invalid_node_kind,
  condition_invalid_node_structure,
  condition_invalid_operator,
  condition_invalid_range,
  condition_delay_unsupported,
  condition_hysteresis_unsupported,
  condition_signal_not_found,
  condition_signal_type_mismatch,
  condition_read_failed,
  condition_node_not_found,
  condition_evaluation_error,
};

struct ConditionStatus {
  ConditionErrorCode code{ConditionErrorCode::ok};
  std::string message;

  bool ok() const {
    return code == ConditionErrorCode::ok;
  }

  static ConditionStatus success() {
    return {};
  }

  static ConditionStatus error(const ConditionErrorCode error_code, std::string detail) {
    return ConditionStatus{error_code, std::move(detail)};
  }
};

template <typename T>
struct ConditionResult {
  ConditionStatus status{};
  std::optional<T> value;

  bool ok() const {
    return status.ok() && value.has_value();
  }
};

struct ConditionOperationResult {
  ConditionStatus status{};

  bool ok() const {
    return status.ok();
  }
};

bool is_group_node_kind(ConditionNodeKind kind);
bool is_leaf_node_kind(ConditionNodeKind kind);
bool is_supported_operator(ConditionOperator op);
bool is_supported_signal_flag(ConditionSignalFlag flag);
const char* to_string(ConditionNodeKind kind);
const char* to_string(ConditionOperator op);
const char* to_string(ConditionRangeMode mode);
const char* to_string(ConditionSignalFlag flag);
const char* to_string(ConditionErrorCode code);

}  // namespace controller::conditions
