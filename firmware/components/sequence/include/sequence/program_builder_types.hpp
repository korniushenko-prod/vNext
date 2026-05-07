#pragma once

#include <cstddef>
#include <cstdint>
#include <map>
#include <optional>
#include <string>
#include <vector>

#include "actuators/actuator_types.hpp"
#include "sequence/program_builder_result.hpp"
#include "sequence/sequence_program.hpp"
#include "sequence/sequence_types.hpp"
#include "signals/signal_types.hpp"
#include "signals/signal_value.hpp"

namespace controller::sequence {

enum class ProgramSkeletonKind {
  custom_blank,
  pump_basic,
  compressor_basic,
  burner_supervisory_skeleton,
  incinerator_supervisory_skeleton,
  dosing_basic,
};

enum class ProgramBuilderParameterType {
  boolean,
  int64,
  float64,
  string,
};

using ProgramBuilderParameterValue = controller::signals::SignalValue;

struct ProgramBuilderSignalCatalogEntry {
  std::string path;
  controller::signals::SignalType type{controller::signals::SignalType::boolean};
  std::string unit;
  std::string source_module;
};

struct ProgramBuilderActuatorCatalogEntry {
  std::string id;
  controller::actuators::ActuatorTargetKind kind{controller::actuators::ActuatorTargetKind::relay};
  controller::actuators::ActuatorRole role{controller::actuators::ActuatorRole::generic};
};

struct ProgramBuilderTimerCatalogEntry {
  std::string id;
  std::string name;
  bool enabled{true};
};

struct ProgramBuilderAlarmCatalogEntry {
  std::string id;
  std::string name;
  bool enabled{true};
};

struct ProgramBuilderSignalSlotDefinition {
  std::string slot_name;
  std::string label;
  std::string description;
  bool required{true};
  std::vector<controller::signals::SignalType> allowed_types;
};

struct ProgramBuilderActuatorSlotDefinition {
  std::string slot_name;
  std::string label;
  std::string description;
  bool required{true};
  std::vector<controller::actuators::ActuatorTargetKind> allowed_kinds;
  std::vector<controller::actuators::ActuatorRole> allowed_roles;
  bool allow_generic_role_fallback{false};
};

struct ProgramBuilderNamedSlotDefinition {
  std::string slot_name;
  std::string label;
  std::string description;
  bool required{true};
};

struct ProgramBuilderParameterDefinition {
  std::string parameter_name;
  std::string label;
  std::string description;
  ProgramBuilderParameterType type{ProgramBuilderParameterType::string};
  bool required{true};
  std::optional<std::int64_t> min_int64_value;
  std::optional<std::int64_t> max_int64_value;
  std::optional<double> min_double_value;
  std::optional<double> max_double_value;
  std::string unit;
};

struct ProgramSkeletonCatalogEntry {
  ProgramSkeletonKind kind{ProgramSkeletonKind::custom_blank};
  std::string label;
  std::string description;
  controller::sequence::SequenceProgramType default_program_type{controller::sequence::SequenceProgramType::custom};
  std::vector<ProgramBuilderSignalSlotDefinition> signal_slots;
  std::vector<ProgramBuilderActuatorSlotDefinition> actuator_slots;
  std::vector<ProgramBuilderNamedSlotDefinition> timer_slots;
  std::vector<ProgramBuilderNamedSlotDefinition> alarm_slots;
  std::vector<ProgramBuilderParameterDefinition> parameter_slots;
  std::vector<std::string> preview_state_ids;
};

struct ProgramBuilderCatalog {
  std::vector<ProgramBuilderSignalCatalogEntry> signals;
  std::vector<ProgramBuilderActuatorCatalogEntry> actuators;
  std::vector<ProgramBuilderTimerCatalogEntry> timers;
  std::vector<ProgramBuilderAlarmCatalogEntry> alarms;
  std::vector<std::string> existing_program_ids;
  std::vector<ProgramSkeletonCatalogEntry> supported_skeletons;
};

struct ProgramBuilderDraft {
  std::optional<std::string> draft_id;
  ProgramSkeletonKind skeleton_kind{ProgramSkeletonKind::custom_blank};
  std::string program_id;
  std::string program_name;
  controller::sequence::SequenceProgramType program_type{controller::sequence::SequenceProgramType::custom};
  std::optional<std::string> description;
  std::map<std::string, std::string> signal_bindings;
  std::map<std::string, std::string> actuator_bindings;
  std::map<std::string, std::string> timer_bindings;
  std::map<std::string, std::string> alarm_bindings;
  std::map<std::string, ProgramBuilderParameterValue> parameters;
  bool enabled_after_create{false};
};

struct ProgramBuilderDraftSummary {
  ProgramSkeletonKind skeleton_kind{ProgramSkeletonKind::custom_blank};
  std::string program_id;
  std::string program_name;
  controller::sequence::SequenceProgramType program_type{controller::sequence::SequenceProgramType::custom};
  std::optional<std::string> description;
  std::size_t required_binding_count{0U};
  std::size_t bound_binding_count{0U};
  std::size_t required_parameter_count{0U};
  std::size_t provided_parameter_count{0U};
};

struct ProgramBuilderStatePreview {
  std::string state_id;
  std::string state_name;
  controller::sequence::SequenceStateType type{controller::sequence::SequenceStateType::generic};
  bool non_skippable{false};
  std::vector<std::string> active_binding_slots;
};

struct ProgramBuilderTransitionPreview {
  std::string transition_id;
  std::string source_state_id;
  std::string target_state_id;
  std::string summary;
  bool placeholder{false};
  bool require_min_time_done{false};
};

struct ProgramBuilderBranchPreview {
  std::string initial_state_id;
  std::string normal_stop_state_id;
  std::string trip_state_id;
  std::string lockout_state_id;
};

struct ProgramBuilderPreview {
  ProgramBuilderDraftSummary draft_summary;
  std::vector<ProgramBuilderIssue> validation_issues;
  std::optional<controller::sequence::SequenceProgram> generated_program;
  std::vector<ProgramBuilderStatePreview> generated_states;
  std::vector<ProgramBuilderTransitionPreview> generated_transitions;
  ProgramBuilderBranchPreview branches;
  std::vector<std::string> required_review_warnings;
  bool will_create_disabled{true};
};

bool is_supported_program_skeleton_kind(ProgramSkeletonKind kind);
const char* to_string(ProgramSkeletonKind kind);
const char* to_string(ProgramBuilderParameterType type);

}  // namespace controller::sequence
