#include "sequence/program_matrix_builder.hpp"

#include <algorithm>
#include <cstddef>
#include <functional>
#include <optional>
#include <sstream>
#include <string>
#include <type_traits>
#include <unordered_map>
#include <utility>
#include <vector>

#include "conditions/condition_node.hpp"

namespace controller::sequence {

namespace {

using controller::conditions::ConditionConstantBoolNode;
using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionSignalFlagNode;
using controller::conditions::ConditionSignalRangeNode;
using controller::signals::SignalValue;

constexpr const char* kIssueDuplicateActuatorAction = "MATRIX_DUPLICATE_ACTUATOR_ACTION";
constexpr const char* kIssueConflictingActuatorAction = "MATRIX_CONFLICTING_ACTUATOR_ACTION";
constexpr const char* kIssueUnknownActuatorTarget = "MATRIX_UNKNOWN_ACTUATOR_TARGET";
constexpr const char* kIssueSuspiciousIdleState = "MATRIX_SUSPICIOUS_IDLE_STATE";
constexpr const char* kIssueUnsafeTripOutput = "MATRIX_UNSAFE_TRIP_OUTPUT";
constexpr const char* kIssueUnsafeLockoutOutput = "MATRIX_UNSAFE_LOCKOUT_OUTPUT";

template <typename T>
const T* payload_if(const ConditionNode& node) {
  return std::get_if<T>(&node.payload);
}

bool has_text(const std::string& value) {
  return !value.empty();
}

std::string bool_text(const bool value) {
  return value ? "true" : "false";
}

std::string relay_state_text(const controller::hal::RelayState state) {
  return state == controller::hal::RelayState::on ? "ON" : "OFF";
}

std::string signal_value_text(const SignalValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        using CandidateType = std::decay_t<decltype(candidate)>;
        if constexpr (std::is_same_v<CandidateType, bool>) {
          return bool_text(candidate);
        } else if constexpr (std::is_same_v<CandidateType, std::string>) {
          return "\"" + candidate + "\"";
        } else {
          std::ostringstream stream;
          stream << candidate;
          return stream.str();
        }
      },
      value);
}

std::string condition_value_text(const controller::conditions::ConditionValue& value) {
  return std::visit(
      [](const auto& candidate) -> std::string {
        using CandidateType = std::decay_t<decltype(candidate)>;
        if constexpr (std::is_same_v<CandidateType, bool>) {
          return bool_text(candidate);
        } else if constexpr (std::is_same_v<CandidateType, std::string>) {
          return "\"" + candidate + "\"";
        } else {
          std::ostringstream stream;
          stream << candidate;
          return stream.str();
        }
      },
      value);
}

std::string summarize_condition_tree(const std::optional<controller::conditions::ConditionTree>& tree) {
  if (!tree.has_value()) {
    return "none";
  }

  std::unordered_map<std::string, const ConditionNode*> nodes_by_id;
  for (const auto& node : tree->nodes) {
    nodes_by_id.emplace(node.metadata.node_id, &node);
  }

  std::function<std::string(const std::string&)> summarize = [&](const std::string& node_id) -> std::string {
    const auto node_it = nodes_by_id.find(node_id);
    if (node_it == nodes_by_id.end()) {
      return "missing(" + node_id + ")";
    }

    const auto& node = *node_it->second;
    if (const auto* group = payload_if<ConditionGroupNode>(node)) {
      std::ostringstream stream;
      stream << controller::conditions::to_string(node.metadata.kind) << "(";
      for (std::size_t index = 0; index < group->children.size(); ++index) {
        if (index != 0U) {
          stream << "; ";
        }
        stream << summarize(group->children[index]);
      }
      stream << ")";
      return stream.str();
    }
    if (const auto* constant_node = payload_if<ConditionConstantBoolNode>(node)) {
      return std::string{"const "} + bool_text(constant_node->value);
    }
    if (const auto* compare_node = payload_if<ConditionSignalCompareNode>(node)) {
      return compare_node->signal_path + " " + controller::conditions::to_string(compare_node->op) + " " +
             condition_value_text(compare_node->rhs);
    }
    if (const auto* range_node = payload_if<ConditionSignalRangeNode>(node)) {
      return range_node->signal_path + " " + controller::conditions::to_string(range_node->mode) + " [" +
             condition_value_text(range_node->lower) + ", " + condition_value_text(range_node->upper) + "]";
    }
    if (const auto* flag_node = payload_if<ConditionSignalFlagNode>(node)) {
      return flag_node->signal_path + "." + controller::conditions::to_string(flag_node->flag) + " == " +
             bool_text(flag_node->expected);
    }

    return "unknown";
  };

  if (tree->root_node_id.empty()) {
    return "invalid";
  }
  return summarize(tree->root_node_id);
}

std::string summarize_action(const SequenceAction& action) {
  if (const auto* relay_action = std::get_if<SequenceRelayRequestAction>(&action.payload)) {
    return relay_action->target_id + "=" + relay_state_text(relay_action->state);
  }
  if (const auto* pwm_action = std::get_if<SequencePwmRequestAction>(&action.payload)) {
    std::ostringstream stream;
    stream << pwm_action->target_id << "=" << (pwm_action->enabled ? "PWM " : "PWM OFF");
    if (pwm_action->enabled) {
      stream << pwm_action->duty_percent << "%";
    }
    return stream.str();
  }
  if (const auto* timer_action = std::get_if<SequenceTimerStartAction>(&action.payload)) {
    return "start timer " + timer_action->timer_id;
  }
  if (const auto* timer_action = std::get_if<SequenceTimerStopAction>(&action.payload)) {
    return "stop timer " + timer_action->timer_id;
  }
  if (const auto* alarm_action = std::get_if<SequenceAlarmSetConditionAction>(&action.payload)) {
    return alarm_action->alarm_id + "=" + bool_text(alarm_action->condition_active);
  }
  if (const auto* signal_action = std::get_if<SequenceWriteVirtualSignalAction>(&action.payload)) {
    return signal_action->signal_path + "=" + signal_value_text(signal_action->value);
  }
  if (const auto* note_action = std::get_if<SequenceLogNoteAction>(&action.payload)) {
    return note_action->note.empty() ? "note" : note_action->note;
  }
  return controller::sequence::to_string(action.kind);
}

std::optional<std::string> action_target_id(const SequenceAction& action) {
  if (const auto* relay_action = std::get_if<SequenceRelayRequestAction>(&action.payload)) {
    return relay_action->target_id;
  }
  if (const auto* pwm_action = std::get_if<SequencePwmRequestAction>(&action.payload)) {
    return pwm_action->target_id;
  }
  return std::nullopt;
}

std::string action_reason(const SequenceAction& action) {
  if (const auto* relay_action = std::get_if<SequenceRelayRequestAction>(&action.payload)) {
    return relay_action->reason;
  }
  if (const auto* pwm_action = std::get_if<SequencePwmRequestAction>(&action.payload)) {
    return pwm_action->reason;
  }
  return {};
}

ProgramMatrixActionSummary build_action_summary(const SequenceAction& action, const bool persistent) {
  return ProgramMatrixActionSummary{
      action.id,
      action.description,
      action.kind,
      controller::sequence::to_string(action.kind),
      summarize_action(action),
      action_target_id(action),
      action_reason(action),
      persistent,
  };
}

struct PersistentIntent {
  std::string target_id;
  controller::actuators::ActuatorTargetKind target_kind{controller::actuators::ActuatorTargetKind::relay};
  ProgramMatrixCellType cell_type{ProgramMatrixCellType::none};
  std::string label;
  std::optional<double> value;
  std::string action_id;
  std::size_t action_index{0U};
};

std::optional<PersistentIntent> build_persistent_intent(const SequenceAction& action, const std::size_t action_index) {
  if (const auto* relay_action = std::get_if<SequenceRelayRequestAction>(&action.payload)) {
    return PersistentIntent{
        relay_action->target_id,
        controller::actuators::ActuatorTargetKind::relay,
        relay_action->state == controller::hal::RelayState::on ? ProgramMatrixCellType::relay_on
                                                               : ProgramMatrixCellType::relay_off,
        relay_action->state == controller::hal::RelayState::on ? "ON" : "OFF",
        std::nullopt,
        action.id,
        action_index,
    };
  }
  if (const auto* pwm_action = std::get_if<SequencePwmRequestAction>(&action.payload)) {
    std::ostringstream stream;
    if (pwm_action->enabled) {
      stream << "PWM " << pwm_action->duty_percent << "%";
    } else {
      stream << "PWM OFF";
    }

    return PersistentIntent{
        pwm_action->target_id,
        controller::actuators::ActuatorTargetKind::pwm,
        pwm_action->enabled ? ProgramMatrixCellType::pwm_enabled : ProgramMatrixCellType::pwm_disabled,
        stream.str(),
        pwm_action->enabled ? std::optional<double>{pwm_action->duty_percent} : std::nullopt,
        action.id,
        action_index,
    };
  }

  return std::nullopt;
}

bool equivalent_intent(const PersistentIntent& lhs, const PersistentIntent& rhs) {
  return lhs.target_id == rhs.target_id && lhs.target_kind == rhs.target_kind && lhs.cell_type == rhs.cell_type &&
         lhs.value == rhs.value;
}

bool is_persistent_energized(const PersistentIntent& intent) {
  return intent.cell_type == ProgramMatrixCellType::relay_on || intent.cell_type == ProgramMatrixCellType::pwm_enabled;
}

std::string state_path(const std::string& program_id, const std::string& state_id) {
  return "programs/" + program_id + "/states/" + state_id;
}

std::string action_path(const std::string& program_id, const std::string& state_id, const SequenceAction& action) {
  return state_path(program_id, state_id) + "/active_actions/" + action.id;
}

struct ColumnTracker {
  ProgramMatrixActuatorColumn column;
  std::size_t first_state_order{0U};
  std::size_t first_action_order{0U};
};

std::string timeout_summary_for_state(const SequenceState& state) {
  if (!state.max_time_ms.has_value()) {
    return "none";
  }

  std::ostringstream stream;
  stream << "max_time_ms=" << *state.max_time_ms;
  if (state.timeout_target_state_id.has_value()) {
    stream << " -> " << *state.timeout_target_state_id;
  }
  return stream.str();
}

std::string guard_fail_summary_for_state(const SequenceState& state) {
  if (!state.guard_condition.has_value() && !state.guard_fail_target_state_id.has_value()) {
    return "none";
  }

  if (state.guard_fail_target_state_id.has_value()) {
    return "guard fail -> " + *state.guard_fail_target_state_id;
  }
  return "guard defined";
}

}  // namespace

const char* to_string(const ProgramMatrixIssueSeverity severity) {
  switch (severity) {
    case ProgramMatrixIssueSeverity::info:
      return "info";
    case ProgramMatrixIssueSeverity::warning:
      return "warning";
    case ProgramMatrixIssueSeverity::error:
      return "error";
  }

  return "warning";
}

const char* to_string(const ProgramMatrixErrorCode code) {
  switch (code) {
    case ProgramMatrixErrorCode::ok:
      return "PROGRAM_MATRIX_OK";
    case ProgramMatrixErrorCode::program_matrix_invalid_argument:
      return "PROGRAM_MATRIX_INVALID_ARGUMENT";
    case ProgramMatrixErrorCode::program_matrix_data_unavailable:
      return "PROGRAM_MATRIX_DATA_UNAVAILABLE";
    case ProgramMatrixErrorCode::program_matrix_build_failed:
      return "PROGRAM_MATRIX_BUILD_FAILED";
  }

  return "PROGRAM_MATRIX_UNKNOWN";
}

const char* to_string(const ProgramMatrixCellType cell_type) {
  switch (cell_type) {
    case ProgramMatrixCellType::none:
      return "none";
    case ProgramMatrixCellType::relay_on:
      return "relay_on";
    case ProgramMatrixCellType::relay_off:
      return "relay_off";
    case ProgramMatrixCellType::pwm_enabled:
      return "pwm_enabled";
    case ProgramMatrixCellType::pwm_disabled:
      return "pwm_disabled";
    case ProgramMatrixCellType::unsupported:
      return "unsupported";
  }

  return "none";
}

ProgramMatrixResult<ProgramMatrix> ProgramMatrixBuilder::build(
    const SequenceProgram& program,
    const std::vector<ProgramMatrixActuatorMetadata>& actuator_metadata,
    const std::optional<ProgramMatrixRuntimeSummary>& runtime_summary) const {
  ProgramMatrixResult<ProgramMatrix> result;

  if (!has_text(program.id)) {
    result.status = ProgramMatrixStatus::error(
        ProgramMatrixErrorCode::program_matrix_invalid_argument,
        "Program matrix cannot be built for an empty program id.");
    return result;
  }

  std::unordered_map<std::string, ProgramMatrixActuatorMetadata> metadata_by_id;
  metadata_by_id.reserve(actuator_metadata.size());
  for (const auto& metadata : actuator_metadata) {
    if (!has_text(metadata.actuator_id)) {
      continue;
    }
    metadata_by_id[metadata.actuator_id] = metadata;
  }
  const bool metadata_lookup_available = !metadata_by_id.empty();

  ProgramMatrix matrix;
  matrix.program_id = program.id;
  matrix.program_name = program.name;
  matrix.program_type = program.type;
  matrix.program_enabled = program.enabled;
  matrix.runtime_summary = runtime_summary.value_or(ProgramMatrixRuntimeSummary{});
  if (!matrix.runtime_summary.selected_program_id.has_value()) {
    matrix.runtime_summary.selected_program_id = program.id;
  }
  matrix.runtime_summary.selected_program_active =
      matrix.runtime_summary.active_program_id.has_value() && *matrix.runtime_summary.active_program_id == program.id;

  matrix.special_states.initial_state_id = program.initial_state_id;
  matrix.special_states.normal_stop_state_id = program.normal_stop_state_id;
  matrix.special_states.trip_state_id = program.trip_state_id;
  matrix.special_states.lockout_state_id = program.lockout_state_id;

  std::unordered_map<std::string, ColumnTracker> columns_by_id;
  std::unordered_map<std::string, ProgramMatrixCell> cells_by_key;

  auto add_issue = [&](ProgramMatrixIssue issue) {
    matrix.issues.push_back(std::move(issue));
  };

  for (std::size_t state_index = 0; state_index < program.states.size(); ++state_index) {
    const auto& state = program.states[state_index];

    ProgramMatrixStateRow row;
    row.state_id = state.id;
    row.state_name = state.name;
    row.state_type = state.type;
    row.row_order = state_index;
    row.is_initial = state.id == program.initial_state_id;
    row.is_normal_stop = state.id == program.normal_stop_state_id;
    row.is_trip = state.id == program.trip_state_id;
    row.is_lockout = state.id == program.lockout_state_id;
    row.enabled = state.enabled;
    row.non_skippable = state.non_skippable;
    row.manual_allowed = state.manual_allowed;
    row.min_time_ms = state.min_time_ms;
    row.max_time_ms = state.max_time_ms;
    row.currently_active = matrix.runtime_summary.selected_program_active &&
                           matrix.runtime_summary.current_state_id.has_value() &&
                           *matrix.runtime_summary.current_state_id == state.id;

    matrix.special_states.initial_present = matrix.special_states.initial_present || row.is_initial;
    matrix.special_states.normal_stop_present = matrix.special_states.normal_stop_present || row.is_normal_stop;
    matrix.special_states.trip_present = matrix.special_states.trip_present || row.is_trip;
    matrix.special_states.lockout_present = matrix.special_states.lockout_present || row.is_lockout;
    matrix.state_rows.push_back(row);

    ProgramMatrixStateDetailSummary detail;
    detail.state_id = state.id;
    detail.state_name = state.name;
    detail.state_type = state.type;
    detail.enabled = state.enabled;
    detail.currently_active = row.currently_active;
    detail.guard_summary = summarize_condition_tree(state.guard_condition);
    detail.timeout_summary = timeout_summary_for_state(state);
    detail.guard_fail_summary = guard_fail_summary_for_state(state);

    for (const auto& action : state.entry_actions) {
      detail.entry_actions.push_back(build_action_summary(action, false));
    }
    for (const auto& action : state.exit_actions) {
      detail.exit_actions.push_back(build_action_summary(action, false));
    }
    for (const auto& transition : state.transitions) {
      detail.transitions.push_back(ProgramMatrixTransitionSummary{
          transition.id,
          transition.name,
          transition.enabled,
          transition.target_state_id,
          transition.require_min_time_done,
          summarize_condition_tree(transition.condition),
      });
    }

    std::unordered_map<std::string, std::vector<PersistentIntent>> intents_by_target;
    for (std::size_t action_index = 0; action_index < state.active_actions.size(); ++action_index) {
      const auto& action = state.active_actions[action_index];
      detail.active_actions.push_back(build_action_summary(action, false));

      const auto persistent_intent = build_persistent_intent(action, action_index);
      if (!persistent_intent.has_value()) {
        continue;
      }

      detail.active_actions.back().persistent = true;
      if (!has_text(persistent_intent->target_id)) {
        add_issue(ProgramMatrixIssue{
            action_path(program.id, state.id, action),
            kIssueUnknownActuatorTarget,
            ProgramMatrixIssueSeverity::warning,
            "Persistent active action references an actuator target that is not known to the matrix lookup.",
        });
        continue;
      }

      intents_by_target[persistent_intent->target_id].push_back(*persistent_intent);

      const auto metadata_it = metadata_by_id.find(persistent_intent->target_id);
      if (metadata_lookup_available && metadata_it == metadata_by_id.end()) {
        add_issue(ProgramMatrixIssue{
            action_path(program.id, state.id, action),
            kIssueUnknownActuatorTarget,
            ProgramMatrixIssueSeverity::warning,
            "Persistent active action references an actuator target that is not known to the matrix lookup.",
        });
      }

      if (columns_by_id.find(persistent_intent->target_id) == columns_by_id.end()) {
        ProgramMatrixActuatorColumn column;
        column.actuator_id = persistent_intent->target_id;
        column.actuator_name = persistent_intent->target_id;
        column.actuator_kind = persistent_intent->target_kind;
        column.actuator_role = controller::actuators::ActuatorRole::generic;
        column.metadata_found = false;
        if (metadata_it != metadata_by_id.end()) {
          column.actuator_name = has_text(metadata_it->second.actuator_name) ? metadata_it->second.actuator_name
                                                                             : metadata_it->second.actuator_id;
          column.actuator_kind = metadata_it->second.actuator_kind;
          column.actuator_role = metadata_it->second.actuator_role;
          column.metadata_found = metadata_it->second.known;
        }

        columns_by_id.emplace(
            persistent_intent->target_id,
            ColumnTracker{column, state_index, action_index});
      }
    }

    if (state.active_actions.empty() && state.transitions.empty() && !row.is_normal_stop && !row.is_lockout &&
        state.type != SequenceStateType::stop && state.type != SequenceStateType::lockout) {
      add_issue(ProgramMatrixIssue{
          state_path(program.id, state.id),
          kIssueSuspiciousIdleState,
          ProgramMatrixIssueSeverity::warning,
          "State has no persistent active actions and no transitions, so it may be an unintended dead-end.",
      });
    }

    for (const auto& entry : intents_by_target) {
      if (entry.second.empty()) {
        continue;
      }

      const auto& first_intent = entry.second.front();
      ProgramMatrixCell cell;
      cell.state_id = state.id;
      cell.actuator_id = entry.first;
      cell.cell_type = first_intent.cell_type;
      cell.label = first_intent.label;
      cell.value = first_intent.value;
      cell.source_action_id = first_intent.action_id;
      cell.source_action_index = first_intent.action_index;

      bool all_equivalent = true;
      for (std::size_t index = 1; index < entry.second.size(); ++index) {
        if (!equivalent_intent(first_intent, entry.second[index])) {
          all_equivalent = false;
          break;
        }
      }

      if (entry.second.size() > 1U) {
        if (all_equivalent) {
          const auto warning_message =
              "State contains duplicate persistent actuator actions for the same actuator target.";
          add_issue(ProgramMatrixIssue{
              state_path(program.id, state.id) + "/active_actions",
              kIssueDuplicateActuatorAction,
              ProgramMatrixIssueSeverity::warning,
              warning_message,
          });
          cell.warning = warning_message;
        } else {
          const auto warning_message =
              "State contains conflicting persistent actuator actions for the same actuator target.";
          add_issue(ProgramMatrixIssue{
              state_path(program.id, state.id) + "/active_actions",
              kIssueConflictingActuatorAction,
              ProgramMatrixIssueSeverity::warning,
              warning_message,
          });
          cell.warning = warning_message;
        }
      }

      const auto metadata_it = metadata_by_id.find(entry.first);
      const auto role = metadata_it == metadata_by_id.end() ? controller::actuators::ActuatorRole::generic
                                                            : metadata_it->second.actuator_role;
      bool any_energized = false;
      for (const auto& intent : entry.second) {
        any_energized = any_energized || is_persistent_energized(intent);
      }
      if (role == controller::actuators::ActuatorRole::fuel && any_energized) {
        if (row.is_trip) {
          cell.warning = "Trip state contains a persistent fuel actuator ON action.";
          add_issue(ProgramMatrixIssue{
              state_path(program.id, state.id),
              kIssueUnsafeTripOutput,
              ProgramMatrixIssueSeverity::error,
              "Trip state contains a persistent fuel actuator ON action.",
          });
        }
        if (row.is_lockout) {
          cell.warning = "Lockout state contains a persistent fuel actuator ON action.";
          add_issue(ProgramMatrixIssue{
              state_path(program.id, state.id),
              kIssueUnsafeLockoutOutput,
              ProgramMatrixIssueSeverity::error,
              "Lockout state contains a persistent fuel actuator ON action.",
          });
        }
      }

      cells_by_key[state.id + "\n" + entry.first] = std::move(cell);
    }

    matrix.state_details.push_back(std::move(detail));
  }

  matrix.special_states.all_present = matrix.special_states.initial_present && matrix.special_states.normal_stop_present &&
                                      matrix.special_states.trip_present && matrix.special_states.lockout_present;

  std::vector<ColumnTracker> ordered_columns;
  ordered_columns.reserve(columns_by_id.size());
  for (const auto& entry : columns_by_id) {
    ordered_columns.push_back(entry.second);
  }
  std::sort(
      ordered_columns.begin(),
      ordered_columns.end(),
      [](const ColumnTracker& lhs, const ColumnTracker& rhs) {
        if (lhs.first_state_order != rhs.first_state_order) {
          return lhs.first_state_order < rhs.first_state_order;
        }
        if (lhs.first_action_order != rhs.first_action_order) {
          return lhs.first_action_order < rhs.first_action_order;
        }
        return lhs.column.actuator_id < rhs.column.actuator_id;
      });

  for (std::size_t column_index = 0; column_index < ordered_columns.size(); ++column_index) {
    ordered_columns[column_index].column.display_order = column_index;
    matrix.actuator_columns.push_back(ordered_columns[column_index].column);
  }

  matrix.matrix_cells.reserve(matrix.state_rows.size() * std::max<std::size_t>(1U, matrix.actuator_columns.size()));
  for (const auto& row : matrix.state_rows) {
    for (const auto& column : matrix.actuator_columns) {
      const auto key = row.state_id + "\n" + column.actuator_id;
      const auto cell_it = cells_by_key.find(key);
      if (cell_it != cells_by_key.end()) {
        matrix.matrix_cells.push_back(cell_it->second);
        continue;
      }

      matrix.matrix_cells.push_back(ProgramMatrixCell{
          row.state_id,
          column.actuator_id,
          ProgramMatrixCellType::none,
          "",
          std::nullopt,
          std::nullopt,
          std::nullopt,
          std::nullopt,
      });
    }
  }

  result.status = ProgramMatrixStatus::success("Program matrix built.");
  result.value = std::move(matrix);
  return result;
}

}  // namespace controller::sequence
