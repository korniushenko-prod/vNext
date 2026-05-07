#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "sequence/program_matrix_result.hpp"
#include "sequence/sequence_action.hpp"
#include "sequence/sequence_transition.hpp"
#include "sequence/sequence_types.hpp"

namespace controller::sequence {

enum class ProgramMatrixCellType {
  none,
  relay_on,
  relay_off,
  pwm_enabled,
  pwm_disabled,
  unsupported,
};

struct ProgramMatrixActuatorMetadata {
  std::string actuator_id;
  std::string actuator_name;
  controller::actuators::ActuatorTargetKind actuator_kind{controller::actuators::ActuatorTargetKind::relay};
  controller::actuators::ActuatorRole actuator_role{controller::actuators::ActuatorRole::generic};
  bool known{true};
};

struct ProgramMatrixRuntimeSummary {
  std::optional<std::string> selected_program_id;
  std::optional<std::string> active_program_id;
  std::optional<std::string> current_state_id;
  SequenceLifecycle lifecycle{SequenceLifecycle::idle};
  bool lockout{false};
  std::string last_reason;
  bool selected_program_active{false};
};

struct ProgramMatrixActionSummary {
  std::string action_id;
  std::string description;
  SequenceActionKind kind{SequenceActionKind::log_note};
  std::string kind_text;
  std::string summary;
  std::optional<std::string> target_id;
  std::string reason;
  bool persistent{false};
};

struct ProgramMatrixTransitionSummary {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string target_state_id;
  bool require_min_time_done{false};
  std::string condition_summary;
};

struct ProgramMatrixStateDetailSummary {
  std::string state_id;
  std::string state_name;
  SequenceStateType state_type{SequenceStateType::generic};
  bool enabled{true};
  bool currently_active{false};
  std::vector<ProgramMatrixActionSummary> entry_actions;
  std::vector<ProgramMatrixActionSummary> active_actions;
  std::vector<ProgramMatrixActionSummary> exit_actions;
  std::vector<ProgramMatrixTransitionSummary> transitions;
  std::string guard_summary;
  std::string timeout_summary;
  std::string guard_fail_summary;
};

struct ProgramMatrixStateRow {
  std::string state_id;
  std::string state_name;
  SequenceStateType state_type{SequenceStateType::generic};
  std::size_t row_order{0U};
  bool is_initial{false};
  bool is_normal_stop{false};
  bool is_trip{false};
  bool is_lockout{false};
  bool enabled{true};
  bool non_skippable{false};
  bool manual_allowed{false};
  std::optional<SequenceDurationMs> min_time_ms;
  std::optional<SequenceDurationMs> max_time_ms;
  bool currently_active{false};
};

struct ProgramMatrixActuatorColumn {
  std::string actuator_id;
  std::string actuator_name;
  controller::actuators::ActuatorTargetKind actuator_kind{controller::actuators::ActuatorTargetKind::relay};
  controller::actuators::ActuatorRole actuator_role{controller::actuators::ActuatorRole::generic};
  std::size_t display_order{0U};
  bool metadata_found{false};
};

struct ProgramMatrixCell {
  std::string state_id;
  std::string actuator_id;
  ProgramMatrixCellType cell_type{ProgramMatrixCellType::none};
  std::string label;
  std::optional<double> value;
  std::optional<std::string> source_action_id;
  std::optional<std::size_t> source_action_index;
  std::optional<std::string> warning;
};

struct ProgramMatrixSpecialStateSummary {
  std::string initial_state_id;
  std::string normal_stop_state_id;
  std::string trip_state_id;
  std::string lockout_state_id;
  bool initial_present{false};
  bool normal_stop_present{false};
  bool trip_present{false};
  bool lockout_present{false};
  bool all_present{false};
};

struct ProgramMatrix {
  std::string program_id;
  std::string program_name;
  SequenceProgramType program_type{SequenceProgramType::generic};
  bool program_enabled{true};
  std::vector<ProgramMatrixStateRow> state_rows;
  std::vector<ProgramMatrixActuatorColumn> actuator_columns;
  std::vector<ProgramMatrixCell> matrix_cells;
  std::vector<ProgramMatrixIssue> issues;
  std::vector<ProgramMatrixStateDetailSummary> state_details;
  ProgramMatrixSpecialStateSummary special_states;
  ProgramMatrixRuntimeSummary runtime_summary;
};

const char* to_string(ProgramMatrixCellType cell_type);

}  // namespace controller::sequence
