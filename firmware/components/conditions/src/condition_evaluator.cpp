#include "conditions/condition_evaluator.hpp"

#include <functional>
#include <sstream>
#include <type_traits>
#include <unordered_map>
#include <utility>
#include <vector>

namespace controller::conditions {

namespace {

using controller::signals::SignalSnapshot;
using controller::signals::SignalType;
using controller::signals::SignalValue;

struct EvaluatedNode {
  ConditionStatus status{};
  bool raw_result{false};
  bool effective_result{false};
  std::string reason;
  std::string signal_path;
  std::string value_summary;
};

struct DelayOutcome {
  bool effective_result{false};
  std::string delay_suffix;
};

bool is_numeric_signal_type(const SignalType type) {
  return type == SignalType::int64 || type == SignalType::float64;
}

std::string signal_value_to_string(const SignalValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        std::ostringstream stream;
        stream << candidate;
        return stream.str();
      },
      value);
}

std::string join_ids(const std::vector<std::string>& ids) {
  std::ostringstream stream;
  for (std::size_t index = 0; index < ids.size(); ++index) {
    if (index != 0U) {
      stream << ", ";
    }
    stream << ids[index];
  }
  return stream.str();
}

void append_issue(
    std::vector<ConditionValidationIssue>& issues,
    const ConditionErrorCode code,
    const std::string& node_id,
    const std::string& message) {
  issues.push_back(ConditionValidationIssue{code, node_id, message});
}

template <typename T>
const T* payload_if(const ConditionNode& node) {
  return std::get_if<T>(&node.payload);
}

DelayOutcome apply_leaf_delays(
    const ConditionNodeMetadata& metadata,
    const bool raw_result,
    const ConditionTimestampMs now_ms,
    ConditionNodeRuntimeState& runtime_state) {
  auto clear_pending = [&runtime_state]() {
    runtime_state.pending_transition_active = false;
    runtime_state.pending_target_result = false;
    runtime_state.pending_since_ms = 0U;
  };

  auto start_pending = [&runtime_state, now_ms](const bool target_result) {
    runtime_state.pending_transition_active = true;
    runtime_state.pending_target_result = target_result;
    runtime_state.pending_since_ms = now_ms;
  };

  if (!runtime_state.initialized) {
    runtime_state.initialized = true;
    runtime_state.effective_result = false;
    clear_pending();

    if (raw_result) {
      if (metadata.delay_on_ms == 0U) {
        runtime_state.effective_result = true;
      } else {
        start_pending(true);
      }
    }
  } else if (raw_result == runtime_state.effective_result) {
    clear_pending();
  } else {
    const bool target_result = raw_result;
    const ConditionDurationMs delay_ms = target_result ? metadata.delay_on_ms : metadata.delay_off_ms;

    if (delay_ms == 0U) {
      runtime_state.effective_result = target_result;
      clear_pending();
    } else if (
        runtime_state.pending_transition_active &&
        runtime_state.pending_target_result == target_result) {
      const auto elapsed_ms =
          now_ms >= runtime_state.pending_since_ms ? (now_ms - runtime_state.pending_since_ms) : 0U;
      if (elapsed_ms >= delay_ms) {
        runtime_state.effective_result = target_result;
        clear_pending();
      }
    } else {
      start_pending(target_result);
    }
  }

  runtime_state.last_raw_result = raw_result;
  runtime_state.last_evaluated_ms = now_ms;
  ++runtime_state.update_counter;

  DelayOutcome outcome;
  outcome.effective_result = runtime_state.effective_result;

  if (runtime_state.pending_transition_active) {
    std::ostringstream suffix;
    suffix << " Waiting "
           << (runtime_state.pending_target_result ? "delay_on" : "delay_off")
           << " " << (runtime_state.pending_target_result ? metadata.delay_on_ms : metadata.delay_off_ms)
           << " ms from " << runtime_state.pending_since_ms << " ms.";
    outcome.delay_suffix = suffix.str();
  }

  return outcome;
}

void update_stateless_runtime(
    const bool result,
    const ConditionTimestampMs now_ms,
    ConditionNodeRuntimeState& runtime_state) {
  runtime_state.initialized = true;
  runtime_state.last_raw_result = result;
  runtime_state.effective_result = result;
  runtime_state.pending_transition_active = false;
  runtime_state.pending_target_result = false;
  runtime_state.pending_since_ms = 0U;
  runtime_state.last_evaluated_ms = now_ms;
  ++runtime_state.update_counter;
}

ConditionStatus missing_signal_status(const std::string& signal_path) {
  return ConditionStatus::error(
      ConditionErrorCode::condition_signal_not_found,
      "Signal '" + signal_path + "' is not registered.");
}

ConditionStatus read_failed_status(const std::string& signal_path) {
  return ConditionStatus::error(
      ConditionErrorCode::condition_read_failed,
      "Signal '" + signal_path + "' has not been initialized.");
}

ConditionStatus type_mismatch_status(
    const std::string& signal_path,
    const std::string& detail) {
  return ConditionStatus::error(
      ConditionErrorCode::condition_signal_type_mismatch,
      "Signal '" + signal_path + "' type mismatch: " + detail);
}

ConditionStatus invalid_operator_status(
    const std::string& signal_path,
    const ConditionOperator op) {
  return ConditionStatus::error(
      ConditionErrorCode::condition_invalid_operator,
      "Signal '" + signal_path + "' does not support operator '" + to_string(op) + "'.");
}

bool compare_double_values(const double lhs, const double rhs, const ConditionOperator op) {
  switch (op) {
    case ConditionOperator::eq:
      return lhs == rhs;
    case ConditionOperator::neq:
      return lhs != rhs;
    case ConditionOperator::gt:
      return lhs > rhs;
    case ConditionOperator::gte:
      return lhs >= rhs;
    case ConditionOperator::lt:
      return lhs < rhs;
    case ConditionOperator::lte:
      return lhs <= rhs;
  }

  return false;
}

bool compare_int64_values(const std::int64_t lhs, const std::int64_t rhs, const ConditionOperator op) {
  switch (op) {
    case ConditionOperator::eq:
      return lhs == rhs;
    case ConditionOperator::neq:
      return lhs != rhs;
    case ConditionOperator::gt:
      return lhs > rhs;
    case ConditionOperator::gte:
      return lhs >= rhs;
    case ConditionOperator::lt:
      return lhs < rhs;
    case ConditionOperator::lte:
      return lhs <= rhs;
  }

  return false;
}

double numeric_release_threshold(
    const ConditionOperator op,
    const double threshold,
    const double hysteresis) {
  switch (op) {
    case ConditionOperator::gt:
    case ConditionOperator::gte:
      return threshold - hysteresis;
    case ConditionOperator::lt:
    case ConditionOperator::lte:
      return threshold + hysteresis;
    case ConditionOperator::eq:
    case ConditionOperator::neq:
      return threshold;
  }

  return threshold;
}

bool evaluate_numeric_compare_with_hysteresis(
    const double lhs,
    const double rhs,
    const ConditionOperator op,
    const double hysteresis,
    const bool latch_is_true,
    bool& used_hysteresis_hold) {
  if (hysteresis <= 0.0 || !latch_is_true) {
    used_hysteresis_hold = false;
    return compare_double_values(lhs, rhs, op);
  }

  used_hysteresis_hold = true;
  const double release_threshold = numeric_release_threshold(op, rhs, hysteresis);

  switch (op) {
    case ConditionOperator::gt:
    case ConditionOperator::gte:
      return lhs >= release_threshold;
    case ConditionOperator::lt:
    case ConditionOperator::lte:
      return lhs <= release_threshold;
    case ConditionOperator::eq:
    case ConditionOperator::neq:
      used_hysteresis_hold = false;
      return compare_double_values(lhs, rhs, op);
  }

  used_hysteresis_hold = false;
  return compare_double_values(lhs, rhs, op);
}

}  // namespace

bool is_group_node_kind(const ConditionNodeKind kind) {
  return kind == ConditionNodeKind::all || kind == ConditionNodeKind::any || kind == ConditionNodeKind::not_op;
}

bool is_leaf_node_kind(const ConditionNodeKind kind) {
  return !is_group_node_kind(kind);
}

bool is_supported_operator(const ConditionOperator op) {
  switch (op) {
    case ConditionOperator::eq:
    case ConditionOperator::neq:
    case ConditionOperator::gt:
    case ConditionOperator::gte:
    case ConditionOperator::lt:
    case ConditionOperator::lte:
      return true;
  }

  return false;
}

bool is_supported_signal_flag(const ConditionSignalFlag flag) {
  switch (flag) {
    case ConditionSignalFlag::valid:
    case ConditionSignalFlag::fault:
    case ConditionSignalFlag::stale:
    case ConditionSignalFlag::initialized:
      return true;
  }

  return false;
}

const char* to_string(const ConditionNodeKind kind) {
  switch (kind) {
    case ConditionNodeKind::all:
      return "all";
    case ConditionNodeKind::any:
      return "any";
    case ConditionNodeKind::not_op:
      return "not";
    case ConditionNodeKind::constant_bool:
      return "constant_bool";
    case ConditionNodeKind::signal_compare:
      return "signal_compare";
    case ConditionNodeKind::signal_range:
      return "signal_range";
    case ConditionNodeKind::signal_flag:
      return "signal_flag";
  }

  return "unknown";
}

const char* to_string(const ConditionOperator op) {
  switch (op) {
    case ConditionOperator::eq:
      return "eq";
    case ConditionOperator::neq:
      return "neq";
    case ConditionOperator::gt:
      return "gt";
    case ConditionOperator::gte:
      return "gte";
    case ConditionOperator::lt:
      return "lt";
    case ConditionOperator::lte:
      return "lte";
  }

  return "unknown";
}

const char* to_string(const ConditionRangeMode mode) {
  switch (mode) {
    case ConditionRangeMode::in_range:
      return "in_range";
    case ConditionRangeMode::out_of_range:
      return "out_of_range";
  }

  return "unknown";
}

const char* to_string(const ConditionSignalFlag flag) {
  switch (flag) {
    case ConditionSignalFlag::valid:
      return "valid";
    case ConditionSignalFlag::fault:
      return "fault";
    case ConditionSignalFlag::stale:
      return "stale";
    case ConditionSignalFlag::initialized:
      return "initialized";
  }

  return "unknown";
}

const char* to_string(const ConditionErrorCode code) {
  switch (code) {
    case ConditionErrorCode::ok:
      return "OK";
    case ConditionErrorCode::condition_tree_empty:
      return "CONDITION_TREE_EMPTY";
    case ConditionErrorCode::condition_root_not_found:
      return "CONDITION_ROOT_NOT_FOUND";
    case ConditionErrorCode::condition_duplicate_node_id:
      return "CONDITION_DUPLICATE_NODE_ID";
    case ConditionErrorCode::condition_invalid_child_reference:
      return "CONDITION_INVALID_CHILD_REFERENCE";
    case ConditionErrorCode::condition_invalid_node_kind:
      return "CONDITION_INVALID_NODE_KIND";
    case ConditionErrorCode::condition_invalid_node_structure:
      return "CONDITION_INVALID_NODE_STRUCTURE";
    case ConditionErrorCode::condition_invalid_operator:
      return "CONDITION_INVALID_OPERATOR";
    case ConditionErrorCode::condition_invalid_range:
      return "CONDITION_INVALID_RANGE";
    case ConditionErrorCode::condition_delay_unsupported:
      return "CONDITION_DELAY_UNSUPPORTED";
    case ConditionErrorCode::condition_hysteresis_unsupported:
      return "CONDITION_HYSTERESIS_UNSUPPORTED";
    case ConditionErrorCode::condition_signal_not_found:
      return "CONDITION_SIGNAL_NOT_FOUND";
    case ConditionErrorCode::condition_signal_type_mismatch:
      return "CONDITION_SIGNAL_TYPE_MISMATCH";
    case ConditionErrorCode::condition_read_failed:
      return "CONDITION_READ_FAILED";
    case ConditionErrorCode::condition_node_not_found:
      return "CONDITION_NODE_NOT_FOUND";
    case ConditionErrorCode::condition_evaluation_error:
      return "CONDITION_EVALUATION_ERROR";
  }

  return "UNKNOWN_CONDITION_ERROR";
}

ConditionValueType condition_value_type_from_value(const ConditionValue& value) {
  return std::visit(
      [](const auto& candidate) {
        using CandidateType = std::decay_t<decltype(candidate)>;
        if constexpr (std::is_same_v<CandidateType, bool>) {
          return ConditionValueType::boolean;
        } else if constexpr (std::is_same_v<CandidateType, std::int64_t>) {
          return ConditionValueType::int64;
        } else if constexpr (std::is_same_v<CandidateType, double>) {
          return ConditionValueType::float64;
        } else {
          return ConditionValueType::string;
        }
      },
      value);
}

bool is_numeric_condition_value(const ConditionValue& value) {
  return std::holds_alternative<std::int64_t>(value) || std::holds_alternative<double>(value);
}

std::optional<double> condition_value_as_double(const ConditionValue& value) {
  if (const auto* int_value = std::get_if<std::int64_t>(&value)) {
    return static_cast<double>(*int_value);
  }
  if (const auto* double_value = std::get_if<double>(&value)) {
    return *double_value;
  }
  return std::nullopt;
}

std::string to_string(const ConditionValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        std::ostringstream stream;
        stream << candidate;
        return stream.str();
      },
      value);
}

const char* to_string(const ConditionValueType type) {
  switch (type) {
    case ConditionValueType::boolean:
      return "bool";
    case ConditionValueType::int64:
      return "int64";
    case ConditionValueType::float64:
      return "double";
    case ConditionValueType::string:
      return "string";
  }

  return "unknown";
}

ConditionNodeKind node_kind_from_payload(const ConditionNodePayload& payload) {
  return std::visit(
      [](const auto& candidate) -> ConditionNodeKind {
        using CandidateType = std::decay_t<decltype(candidate)>;
        if constexpr (std::is_same_v<CandidateType, ConditionGroupNode>) {
          return ConditionNodeKind::all;
        } else if constexpr (std::is_same_v<CandidateType, ConditionConstantBoolNode>) {
          return ConditionNodeKind::constant_bool;
        } else if constexpr (std::is_same_v<CandidateType, ConditionSignalCompareNode>) {
          return ConditionNodeKind::signal_compare;
        } else if constexpr (std::is_same_v<CandidateType, ConditionSignalRangeNode>) {
          return ConditionNodeKind::signal_range;
        } else {
          return ConditionNodeKind::signal_flag;
        }
      },
      payload);
}

ConditionValidationResult validate_tree(const ConditionTree& tree) {
  std::vector<ConditionValidationIssue> issues;
  std::unordered_map<std::string, const ConditionNode*> nodes_by_id;

  if (tree.nodes.empty()) {
    append_issue(
        issues,
        ConditionErrorCode::condition_tree_empty,
        tree.root_node_id,
        "Condition tree '" + tree.tree_id + "' must contain at least one node.");
  }

  for (const auto& node : tree.nodes) {
    if (node.metadata.node_id.empty()) {
      append_issue(
          issues,
          ConditionErrorCode::condition_invalid_node_structure,
          node.metadata.node_id,
          "Every condition node must have a non-empty node_id.");
      continue;
    }

    if (!nodes_by_id.emplace(node.metadata.node_id, &node).second) {
      append_issue(
          issues,
          ConditionErrorCode::condition_duplicate_node_id,
          node.metadata.node_id,
          "Duplicate node_id '" + node.metadata.node_id + "' is not allowed.");
      continue;
    }

    const auto payload_kind = node_kind_from_payload(node.payload);
    if (payload_kind == ConditionNodeKind::all) {
      if (!is_group_node_kind(node.metadata.kind)) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_node_kind,
            node.metadata.node_id,
            "Group payload requires node kind all, any or not.");
      }
    } else if (payload_kind != node.metadata.kind) {
      append_issue(
          issues,
          ConditionErrorCode::condition_invalid_node_kind,
          node.metadata.node_id,
          "Node kind '" + std::string{to_string(node.metadata.kind)} + "' does not match payload.");
    }

    if (is_group_node_kind(node.metadata.kind)) {
      if (node.metadata.delay_on_ms != 0U || node.metadata.delay_off_ms != 0U) {
        append_issue(
            issues,
            ConditionErrorCode::condition_delay_unsupported,
            node.metadata.node_id,
            "Group nodes do not support delay_on_ms or delay_off_ms in Stage 8.");
      }
      if (node.metadata.hysteresis.has_value()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_hysteresis_unsupported,
            node.metadata.node_id,
            "Group nodes do not support hysteresis in Stage 8.");
      }
    }

    if (const auto* group = payload_if<ConditionGroupNode>(node)) {
      if (node.metadata.kind == ConditionNodeKind::all || node.metadata.kind == ConditionNodeKind::any) {
        if (group->children.empty()) {
          append_issue(
              issues,
              ConditionErrorCode::condition_invalid_node_structure,
              node.metadata.node_id,
              "ALL and ANY nodes require at least one child.");
        }
      } else if (node.metadata.kind == ConditionNodeKind::not_op && group->children.size() != 1U) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_node_structure,
            node.metadata.node_id,
            "NOT nodes require exactly one child.");
      }
      continue;
    }

    if (payload_if<ConditionConstantBoolNode>(node) != nullptr) {
      if (node.metadata.delay_on_ms != 0U || node.metadata.delay_off_ms != 0U) {
        append_issue(
            issues,
            ConditionErrorCode::condition_delay_unsupported,
            node.metadata.node_id,
            "constant_bool nodes do not support delay_on_ms or delay_off_ms in Stage 8.");
      }
      if (node.metadata.hysteresis.has_value()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_hysteresis_unsupported,
            node.metadata.node_id,
            "constant_bool nodes do not support hysteresis in Stage 8.");
      }
      continue;
    }

    if (const auto* compare_node = payload_if<ConditionSignalCompareNode>(node)) {
      if (compare_node->signal_path.empty()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_node_structure,
            node.metadata.node_id,
            "signal_compare nodes require a signal_path.");
      }
      if (!is_supported_operator(compare_node->op)) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_operator,
            node.metadata.node_id,
            "signal_compare uses an unsupported operator.");
      }

      const auto rhs_type = condition_value_type_from_value(compare_node->rhs);
      const bool rhs_is_bool_or_string =
          rhs_type == ConditionValueType::boolean || rhs_type == ConditionValueType::string;
      if (rhs_is_bool_or_string &&
          compare_node->op != ConditionOperator::eq &&
          compare_node->op != ConditionOperator::neq) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_operator,
            node.metadata.node_id,
            "bool and string comparisons only support eq and neq.");
      }

      if (node.metadata.hysteresis.has_value()) {
        if (!is_numeric_condition_value(compare_node->rhs)) {
          append_issue(
              issues,
              ConditionErrorCode::condition_hysteresis_unsupported,
              node.metadata.node_id,
              "signal_compare hysteresis requires a numeric comparison literal.");
        } else if (node.metadata.hysteresis.value() < 0.0) {
          append_issue(
              issues,
              ConditionErrorCode::condition_hysteresis_unsupported,
              node.metadata.node_id,
              "signal_compare hysteresis must be greater than or equal to zero.");
        } else if (
            compare_node->op == ConditionOperator::eq ||
            compare_node->op == ConditionOperator::neq) {
          append_issue(
              issues,
              ConditionErrorCode::condition_hysteresis_unsupported,
              node.metadata.node_id,
              "signal_compare hysteresis supports only gt, gte, lt and lte.");
        }
      }
      continue;
    }

    if (const auto* range_node = payload_if<ConditionSignalRangeNode>(node)) {
      if (range_node->signal_path.empty()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_node_structure,
            node.metadata.node_id,
            "signal_range nodes require a signal_path.");
      }
      if (!is_numeric_condition_value(range_node->lower) || !is_numeric_condition_value(range_node->upper)) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_range,
            node.metadata.node_id,
            "signal_range bounds must be numeric.");
      } else if (condition_value_as_double(range_node->lower).value() >
                 condition_value_as_double(range_node->upper).value()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_range,
            node.metadata.node_id,
            "signal_range lower bound must be less than or equal to upper bound.");
      }
      if (node.metadata.hysteresis.has_value()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_hysteresis_unsupported,
            node.metadata.node_id,
            "signal_range hysteresis is postponed in Stage 8.");
      }
      continue;
    }

    if (const auto* flag_node = payload_if<ConditionSignalFlagNode>(node)) {
      if (flag_node->signal_path.empty()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_node_structure,
            node.metadata.node_id,
            "signal_flag nodes require a signal_path.");
      }
      if (!is_supported_signal_flag(flag_node->flag)) {
        append_issue(
            issues,
            ConditionErrorCode::condition_invalid_node_structure,
            node.metadata.node_id,
            "signal_flag uses an unsupported flag selector.");
      }
      if (node.metadata.hysteresis.has_value()) {
        append_issue(
            issues,
            ConditionErrorCode::condition_hysteresis_unsupported,
            node.metadata.node_id,
            "signal_flag nodes do not support hysteresis in Stage 8.");
      }
      continue;
    }

    append_issue(
        issues,
        ConditionErrorCode::condition_invalid_node_structure,
        node.metadata.node_id,
        "Node payload is not recognized.");
  }

  if (tree.root_node_id.empty() || nodes_by_id.count(tree.root_node_id) == 0U) {
    append_issue(
        issues,
        ConditionErrorCode::condition_root_not_found,
        tree.root_node_id,
        "Root node '" + tree.root_node_id + "' was not found in tree '" + tree.tree_id + "'.");
  }

  for (const auto& node : tree.nodes) {
    if (const auto* group = payload_if<ConditionGroupNode>(node)) {
      for (const auto& child_id : group->children) {
        if (nodes_by_id.count(child_id) == 0U) {
          append_issue(
              issues,
              ConditionErrorCode::condition_invalid_child_reference,
              node.metadata.node_id,
              "Node '" + node.metadata.node_id + "' references missing child '" + child_id + "'.");
        }
      }
    }
  }

  ConditionValidationResult result;
  result.issues = std::move(issues);
  if (!result.issues.empty()) {
    result.status = ConditionStatus::error(result.issues.front().code, result.issues.front().message);
  }
  return result;
}

ConditionEvaluator::ConditionEvaluator(
    ConditionTree tree,
    const controller::signals::SignalRegistry& signal_registry)
    : tree_(std::move(tree)),
      signal_registry_(signal_registry),
      validation_(validate_tree(tree_)) {
  if (validation_.ok()) {
    for (std::size_t index = 0; index < tree_.nodes.size(); ++index) {
      const auto& node_id = tree_.nodes[index].metadata.node_id;
      node_index_by_id_.emplace(node_id, index);
      runtime_state_by_id_.emplace(node_id, ConditionNodeRuntimeState{});
    }
  }

  last_result_.tree_id = tree_.tree_id;
}

const ConditionTree& ConditionEvaluator::tree() const {
  return tree_;
}

const ConditionValidationResult& ConditionEvaluator::validation() const {
  return validation_;
}

ConditionEvaluationResult ConditionEvaluator::evaluate(const ConditionTimestampMs now_ms) {
  ++evaluation_counter_;

  ConditionEvaluationResult result;
  result.tree_id = tree_.tree_id;
  result.evaluation_counter = evaluation_counter_;

  if (!validation_.ok()) {
    result.status = validation_.status;
    result.reason = "Tree validation failed: " + validation_.status.message;
    last_result_ = result;
    return last_result_;
  }

  std::unordered_map<std::string, SignalSnapshot> snapshots_by_path;
  for (const auto& snapshot : signal_registry_.list_signal_snapshots(now_ms)) {
    snapshots_by_path.emplace(snapshot.descriptor.path, snapshot);
  }

  std::vector<ConditionTraceEntry> trace_entries;

  std::function<EvaluatedNode(const std::string&)> evaluate_node = [&](const std::string& node_id) -> EvaluatedNode {
    const auto node_index = node_index_by_id_.find(node_id);
    if (node_index == node_index_by_id_.end()) {
      EvaluatedNode invalid_node;
      invalid_node.status = ConditionStatus::error(
          ConditionErrorCode::condition_node_not_found,
          "Node '" + node_id + "' is not part of the evaluator tree.");
      invalid_node.reason = invalid_node.status.message;
      trace_entries.push_back(ConditionTraceEntry{
          node_id,
          ConditionNodeKind::constant_bool,
          false,
          false,
          invalid_node.status.code,
          invalid_node.reason,
          "",
          ""});
      return invalid_node;
    }

    const auto& node = tree_.nodes[node_index->second];
    auto& runtime_state = runtime_state_by_id_.at(node_id);
    EvaluatedNode evaluated;

    if (const auto* group = payload_if<ConditionGroupNode>(node)) {
      std::vector<std::string> true_children;
      std::vector<std::string> false_children;
      std::vector<std::string> error_children;
      ConditionStatus first_child_error = ConditionStatus::success();
      std::vector<EvaluatedNode> child_results;
      child_results.reserve(group->children.size());

      for (const auto& child_id : group->children) {
        auto child_result = evaluate_node(child_id);
        if (!child_result.status.ok()) {
          error_children.push_back(child_id);
          if (first_child_error.ok()) {
            first_child_error = child_result.status;
          }
        } else if (child_result.effective_result) {
          true_children.push_back(child_id);
        } else {
          false_children.push_back(child_id);
        }
        child_results.push_back(std::move(child_result));
      }

      if (!error_children.empty()) {
        evaluated.status = ConditionStatus::error(
            first_child_error.code,
            "Child evaluation failed for node '" + node_id + "': " + join_ids(error_children) + ".");
        evaluated.reason = evaluated.status.message;
      } else if (node.metadata.kind == ConditionNodeKind::all) {
        evaluated.raw_result = false_children.empty();
        evaluated.effective_result = evaluated.raw_result;
        evaluated.reason = evaluated.raw_result
                               ? "ALL node is true because every child is true."
                               : "ALL node is false because these children are false: " + join_ids(false_children) + ".";
      } else if (node.metadata.kind == ConditionNodeKind::any) {
        evaluated.raw_result = !true_children.empty();
        evaluated.effective_result = evaluated.raw_result;
        evaluated.reason = evaluated.raw_result
                               ? "ANY node is true because these children are true: " + join_ids(true_children) + "."
                               : "ANY node is false because all children are false.";
      } else {
        const auto& child = child_results.front();
        if (!child.status.ok()) {
          evaluated.status = child.status;
          evaluated.reason = child.reason;
        } else {
          evaluated.raw_result = !child.effective_result;
          evaluated.effective_result = evaluated.raw_result;
          evaluated.reason =
              "NOT node inverts child '" + group->children.front() + "' from " +
              std::string{child.effective_result ? "true" : "false"} + " to " +
              std::string{evaluated.effective_result ? "true" : "false"} + ".";
        }
      }

      update_stateless_runtime(evaluated.effective_result, now_ms, runtime_state);
    } else if (const auto* constant_node = payload_if<ConditionConstantBoolNode>(node)) {
      evaluated.raw_result = constant_node->value;
      evaluated.effective_result = constant_node->value;
      evaluated.reason = "constant_bool evaluates to " + std::string{constant_node->value ? "true" : "false"} + ".";
      update_stateless_runtime(evaluated.effective_result, now_ms, runtime_state);
    } else if (const auto* compare_node = payload_if<ConditionSignalCompareNode>(node)) {
      evaluated.signal_path = compare_node->signal_path;
      const auto snapshot = snapshots_by_path.find(compare_node->signal_path);
      if (snapshot == snapshots_by_path.end()) {
        evaluated.status = missing_signal_status(compare_node->signal_path);
        evaluated.reason = evaluated.status.message;
      } else if (!snapshot->second.initialized || !snapshot->second.value.has_value()) {
        evaluated.status = read_failed_status(compare_node->signal_path);
        evaluated.reason = evaluated.status.message;
      } else {
        const auto& signal_snapshot = snapshot->second;
        const auto signal_type = signal_snapshot.descriptor.type;
        evaluated.value_summary = signal_value_to_string(*signal_snapshot.value);

        bool raw_result = false;
        bool used_hysteresis_hold = false;

        if (signal_type == SignalType::boolean) {
          if (compare_node->op != ConditionOperator::eq && compare_node->op != ConditionOperator::neq) {
            evaluated.status = invalid_operator_status(compare_node->signal_path, compare_node->op);
            evaluated.reason = evaluated.status.message;
          } else if (!std::holds_alternative<bool>(compare_node->rhs)) {
            evaluated.status = type_mismatch_status(compare_node->signal_path, "expected bool literal.");
            evaluated.reason = evaluated.status.message;
          } else {
            const bool lhs = std::get<bool>(*signal_snapshot.value);
            const bool rhs = std::get<bool>(compare_node->rhs);
            raw_result = compare_node->op == ConditionOperator::eq ? (lhs == rhs) : (lhs != rhs);
          }
        } else if (signal_type == SignalType::string) {
          if (compare_node->op != ConditionOperator::eq && compare_node->op != ConditionOperator::neq) {
            evaluated.status = invalid_operator_status(compare_node->signal_path, compare_node->op);
            evaluated.reason = evaluated.status.message;
          } else if (!std::holds_alternative<std::string>(compare_node->rhs)) {
            evaluated.status = type_mismatch_status(compare_node->signal_path, "expected string literal.");
            evaluated.reason = evaluated.status.message;
          } else {
            const auto& lhs = std::get<std::string>(*signal_snapshot.value);
            const auto& rhs = std::get<std::string>(compare_node->rhs);
            raw_result = compare_node->op == ConditionOperator::eq ? (lhs == rhs) : (lhs != rhs);
          }
        } else if (is_numeric_signal_type(signal_type)) {
          if (!is_numeric_condition_value(compare_node->rhs)) {
            evaluated.status = type_mismatch_status(compare_node->signal_path, "expected numeric literal.");
            evaluated.reason = evaluated.status.message;
          } else {
            const bool rhs_is_int64 = std::holds_alternative<std::int64_t>(compare_node->rhs);
            const bool lhs_is_int64 = std::holds_alternative<std::int64_t>(*signal_snapshot.value);

            if (
                !node.metadata.hysteresis.has_value() &&
                lhs_is_int64 && rhs_is_int64) {
              raw_result = compare_int64_values(
                  std::get<std::int64_t>(*signal_snapshot.value),
                  std::get<std::int64_t>(compare_node->rhs),
                  compare_node->op);
            } else {
              const double lhs = lhs_is_int64 ? static_cast<double>(std::get<std::int64_t>(*signal_snapshot.value))
                                              : std::get<double>(*signal_snapshot.value);
              const double rhs = rhs_is_int64 ? static_cast<double>(std::get<std::int64_t>(compare_node->rhs))
                                              : std::get<double>(compare_node->rhs);
              raw_result = evaluate_numeric_compare_with_hysteresis(
                  lhs,
                  rhs,
                  compare_node->op,
                  node.metadata.hysteresis.value_or(0.0),
                  runtime_state.initialized && runtime_state.effective_result,
                  used_hysteresis_hold);
              if (used_hysteresis_hold) {
                std::ostringstream summary;
                summary << evaluated.value_summary << " (holding until release threshold "
                        << numeric_release_threshold(compare_node->op, rhs, node.metadata.hysteresis.value_or(0.0))
                        << ")";
                evaluated.value_summary = summary.str();
              }
            }
          }
        } else {
          evaluated.status = ConditionStatus::error(
              ConditionErrorCode::condition_signal_type_mismatch,
              "Signal '" + compare_node->signal_path + "' uses an unsupported type.");
          evaluated.reason = evaluated.status.message;
        }

        if (evaluated.status.ok()) {
          std::ostringstream reason_stream;
          reason_stream << "Signal '" << compare_node->signal_path << "' value " << evaluated.value_summary
                        << " " << to_string(compare_node->op) << " " << to_string(compare_node->rhs)
                        << " => " << (raw_result ? "true" : "false") << ".";
          const auto delay_outcome = apply_leaf_delays(node.metadata, raw_result, now_ms, runtime_state);
          evaluated.raw_result = raw_result;
          evaluated.effective_result = delay_outcome.effective_result;
          evaluated.reason = reason_stream.str() + delay_outcome.delay_suffix;
        }
      }
    } else if (const auto* range_node = payload_if<ConditionSignalRangeNode>(node)) {
      evaluated.signal_path = range_node->signal_path;
      const auto snapshot = snapshots_by_path.find(range_node->signal_path);
      if (snapshot == snapshots_by_path.end()) {
        evaluated.status = missing_signal_status(range_node->signal_path);
        evaluated.reason = evaluated.status.message;
      } else if (!snapshot->second.initialized || !snapshot->second.value.has_value()) {
        evaluated.status = read_failed_status(range_node->signal_path);
        evaluated.reason = evaluated.status.message;
      } else if (!is_numeric_signal_type(snapshot->second.descriptor.type)) {
        evaluated.status = type_mismatch_status(range_node->signal_path, "signal_range requires numeric signal types.");
        evaluated.reason = evaluated.status.message;
      } else {
        const double lhs = std::holds_alternative<std::int64_t>(*snapshot->second.value)
                               ? static_cast<double>(std::get<std::int64_t>(*snapshot->second.value))
                               : std::get<double>(*snapshot->second.value);
        const double lower = condition_value_as_double(range_node->lower).value();
        const double upper = condition_value_as_double(range_node->upper).value();
        const bool in_range = lhs >= lower && lhs <= upper;
        const bool raw_result =
            range_node->mode == ConditionRangeMode::in_range ? in_range : !in_range;
        evaluated.value_summary = signal_value_to_string(*snapshot->second.value);

        std::ostringstream reason_stream;
        reason_stream << "Signal '" << range_node->signal_path << "' value " << evaluated.value_summary
                      << " is " << (in_range ? "inside" : "outside")
                      << " [" << lower << ", " << upper << "] with mode "
                      << to_string(range_node->mode) << " => " << (raw_result ? "true" : "false") << ".";
        const auto delay_outcome = apply_leaf_delays(node.metadata, raw_result, now_ms, runtime_state);
        evaluated.raw_result = raw_result;
        evaluated.effective_result = delay_outcome.effective_result;
        evaluated.reason = reason_stream.str() + delay_outcome.delay_suffix;
      }
    } else if (const auto* flag_node = payload_if<ConditionSignalFlagNode>(node)) {
      evaluated.signal_path = flag_node->signal_path;
      const auto snapshot = snapshots_by_path.find(flag_node->signal_path);
      if (snapshot == snapshots_by_path.end()) {
        evaluated.status = missing_signal_status(flag_node->signal_path);
        evaluated.reason = evaluated.status.message;
      } else {
        bool actual_flag = false;
        switch (flag_node->flag) {
          case ConditionSignalFlag::valid:
            actual_flag = snapshot->second.valid;
            break;
          case ConditionSignalFlag::fault:
            actual_flag = snapshot->second.fault;
            break;
          case ConditionSignalFlag::stale:
            actual_flag = snapshot->second.stale;
            break;
          case ConditionSignalFlag::initialized:
            actual_flag = snapshot->second.initialized;
            break;
        }

        const bool raw_result = actual_flag == flag_node->expected;
        std::ostringstream reason_stream;
        reason_stream << "Signal '" << flag_node->signal_path << "' flag " << to_string(flag_node->flag)
                      << " is " << (actual_flag ? "true" : "false")
                      << " and expected " << (flag_node->expected ? "true" : "false")
                      << " => " << (raw_result ? "true" : "false") << ".";
        const auto delay_outcome = apply_leaf_delays(node.metadata, raw_result, now_ms, runtime_state);
        evaluated.raw_result = raw_result;
        evaluated.effective_result = delay_outcome.effective_result;
        evaluated.reason = reason_stream.str() + delay_outcome.delay_suffix;
        evaluated.value_summary = actual_flag ? "true" : "false";
      }
    } else {
      evaluated.status = ConditionStatus::error(
          ConditionErrorCode::condition_evaluation_error,
          "Node '" + node_id + "' has an unsupported payload.");
      evaluated.reason = evaluated.status.message;
    }

    if (!evaluated.status.ok()) {
      update_stateless_runtime(false, now_ms, runtime_state);
      evaluated.raw_result = false;
      evaluated.effective_result = false;
    }

    trace_entries.push_back(ConditionTraceEntry{
        node.metadata.node_id,
        node.metadata.kind,
        evaluated.raw_result,
        evaluated.effective_result,
        evaluated.status.code,
        evaluated.reason,
        evaluated.signal_path,
        evaluated.value_summary});

    return evaluated;
  };

  const auto root_result = evaluate_node(tree_.root_node_id);
  result.raw_result = root_result.raw_result;
  result.effective_result = root_result.effective_result;
  result.status = root_result.status;
  result.reason = root_result.reason;
  result.trace = std::move(trace_entries);

  last_result_ = result;
  return last_result_;
}

void ConditionEvaluator::reset_runtime() {
  for (auto& entry : runtime_state_by_id_) {
    entry.second = ConditionNodeRuntimeState{};
  }
  evaluation_counter_ = 0U;
  last_result_ = ConditionEvaluationResult{};
  last_result_.tree_id = tree_.tree_id;
}

const ConditionEvaluationResult& ConditionEvaluator::get_last_result() const {
  return last_result_;
}

const std::vector<ConditionTraceEntry>& ConditionEvaluator::get_last_trace() const {
  return last_result_.trace;
}

ConditionResult<ConditionNodeRuntimeState> ConditionEvaluator::get_node_runtime_state(const std::string& node_id) const {
  ConditionResult<ConditionNodeRuntimeState> result;
  const auto runtime_entry = runtime_state_by_id_.find(node_id);
  if (runtime_entry == runtime_state_by_id_.end()) {
    result.status = ConditionStatus::error(
        ConditionErrorCode::condition_node_not_found,
        "Node '" + node_id + "' does not exist in evaluator runtime state.");
    return result;
  }

  result.value = runtime_entry->second;
  return result;
}

}  // namespace controller::conditions
