#pragma once

#include <cstddef>
#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "conditions/condition_tree.hpp"
#include "conditions/condition_types.hpp"
#include "sequence/program_editor_result.hpp"
#include "sequence/sequence_action.hpp"
#include "sequence/sequence_program.hpp"
#include "sequence/sequence_types.hpp"
#include "signals/signal_types.hpp"

namespace controller::sequence {

struct ProgramEditorTransitionDraft {
  std::string id;
  std::string name;
  bool enabled{true};
  std::string target_state_id;
  std::optional<controller::conditions::ConditionTree> condition_tree;
  bool require_min_time_done{false};
};

struct ProgramEditorStateDraft {
  std::string id;
  std::string name;
  bool enabled{true};
  SequenceStateType state_type{SequenceStateType::generic};
  bool non_skippable{false};
  bool manual_allowed{false};
  std::optional<SequenceDurationMs> min_time_ms;
  std::optional<SequenceDurationMs> max_time_ms;
  std::optional<std::string> timeout_target_state_id;
  std::optional<std::string> guard_fail_target_state_id;
  std::vector<SequenceAction> entry_actions;
  std::vector<SequenceAction> active_actions;
  std::vector<SequenceAction> exit_actions;
  std::optional<controller::conditions::ConditionTree> guard_condition;
  std::vector<ProgramEditorTransitionDraft> transitions;
};

struct ProgramEditorDraft {
  std::optional<std::string> existing_program_id;
  std::string program_id;
  std::string name;
  SequenceProgramType type{SequenceProgramType::custom};
  bool enabled{false};
  std::optional<std::string> description;
  std::string initial_state_id;
  std::string normal_stop_state_id;
  std::string trip_state_id;
  std::string lockout_state_id;
  std::optional<controller::conditions::ConditionTree> start_condition;
  std::optional<controller::conditions::ConditionTree> reset_condition;
  std::vector<ProgramEditorStateDraft> states;
};

struct ProgramEditorSignalCatalogEntry {
  std::string path;
  std::string name;
  controller::signals::SignalType type{controller::signals::SignalType::boolean};
  std::string unit;
  std::string source_module;
  controller::signals::SignalAccessMode access_mode{controller::signals::SignalAccessMode::read_only};
};

struct ProgramEditorActuatorCatalogEntry {
  std::string id;
  controller::actuators::ActuatorTargetKind kind{controller::actuators::ActuatorTargetKind::relay};
  controller::actuators::ActuatorRole role{controller::actuators::ActuatorRole::generic};
};

struct ProgramEditorTimerCatalogEntry {
  std::string id;
  std::string name;
  bool enabled{true};
};

struct ProgramEditorAlarmCatalogEntry {
  std::string id;
  std::string name;
  bool enabled{true};
};

struct ProgramEditorProgramCatalogEntry {
  std::string id;
  std::string name;
  SequenceProgramType type{SequenceProgramType::generic};
  bool enabled{true};
  bool active{false};
};

struct ProgramEditorCatalog {
  std::vector<ProgramEditorSignalCatalogEntry> signals;
  std::vector<ProgramEditorActuatorCatalogEntry> actuators;
  std::vector<ProgramEditorTimerCatalogEntry> timers;
  std::vector<ProgramEditorAlarmCatalogEntry> alarms;
  std::vector<ProgramEditorProgramCatalogEntry> programs;
  std::vector<SequenceStateType> supported_state_types;
  std::vector<SequenceActionKind> supported_action_kinds;
  std::vector<controller::conditions::ConditionNodeKind> supported_condition_node_kinds;
  std::vector<ProgramEditorSignalCatalogEntry> writable_virtual_signals;
};

struct ProgramEditorProgramSummary {
  std::string program_id;
  std::string name;
  SequenceProgramType type{SequenceProgramType::custom};
  bool enabled{false};
  std::size_t state_count{0U};
  std::size_t transition_count{0U};
};

struct ProgramEditorStateSummary {
  std::string state_id;
  std::string name;
  bool enabled{true};
  SequenceStateType state_type{SequenceStateType::generic};
  std::size_t transition_count{0U};
  std::size_t entry_action_count{0U};
  std::size_t active_action_count{0U};
  std::size_t exit_action_count{0U};
  bool has_guard_condition{false};
  bool non_skippable{false};
  bool manual_allowed{false};
};

struct ProgramEditorTransitionSummary {
  std::string source_state_id;
  std::string transition_id;
  std::string name;
  std::string target_state_id;
  bool enabled{true};
  bool require_min_time_done{false};
  bool has_condition_tree{false};
};

struct ProgramEditorSpecialStateSummary {
  std::string initial_state_id;
  std::string normal_stop_state_id;
  std::string trip_state_id;
  std::string lockout_state_id;
  bool all_present{false};
};

struct ProgramEditorPreview {
  ProgramEditorProgramSummary program_summary;
  std::vector<ProgramEditorValidationIssue> validation_issues;
  std::vector<ProgramEditorStateSummary> ordered_state_summaries;
  std::vector<ProgramEditorTransitionSummary> transition_summaries;
  ProgramEditorSpecialStateSummary special_state_summary;
  std::vector<std::string> warnings;
  bool save_allowed{false};
  bool runtime_editable{true};
};

ProgramEditorDraft make_program_editor_draft(const SequenceProgram& program);
SequenceProgram make_sequence_program(const ProgramEditorDraft& draft);

}  // namespace controller::sequence
