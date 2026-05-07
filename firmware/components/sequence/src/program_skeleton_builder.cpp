#include "sequence/program_skeleton_builder.hpp"

#include <algorithm>
#include <cstdint>
#include <map>
#include <optional>
#include <sstream>
#include <string>
#include <utility>
#include <variant>
#include <vector>

#include "conditions/condition_node.hpp"
#include "conditions/condition_tree.hpp"

namespace controller::sequence {

namespace {

using controller::actuators::ActuatorRole;
using controller::actuators::ActuatorTargetKind;
using controller::conditions::ConditionConstantBoolNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionTree;
using controller::sequence::SequenceAction;
using controller::sequence::SequenceActionKind;
using controller::sequence::SequenceProgram;
using controller::sequence::SequenceProgramType;
using controller::sequence::SequencePwmRequestAction;
using controller::sequence::SequenceRelayRequestAction;
using controller::sequence::SequenceState;
using controller::sequence::SequenceStateType;
using controller::sequence::SequenceTransition;
using controller::signals::SignalType;

bool has_text(const std::string& value) {
  return !value.empty();
}

template <typename EntryType>
bool compare_named_id(const EntryType& left, const EntryType& right) {
  if (left.id != right.id) {
    return left.id < right.id;
  }
  return left.name < right.name;
}

bool compare_signal_catalog(const ProgramBuilderSignalCatalogEntry& left, const ProgramBuilderSignalCatalogEntry& right) {
  if (left.path != right.path) {
    return left.path < right.path;
  }
  return left.source_module < right.source_module;
}

bool compare_actuator_catalog(
    const ProgramBuilderActuatorCatalogEntry& left,
    const ProgramBuilderActuatorCatalogEntry& right) {
  if (left.id != right.id) {
    return left.id < right.id;
  }
  if (left.kind != right.kind) {
    return static_cast<int>(left.kind) < static_cast<int>(right.kind);
  }
  return static_cast<int>(left.role) < static_cast<int>(right.role);
}

ProgramBuilderIssue make_issue(
    std::string path,
    std::string code,
    const ProgramBuilderIssueSeverity severity,
    std::string message) {
  return ProgramBuilderIssue{
      std::move(path),
      std::move(code),
      severity,
      std::move(message),
  };
}

void append_issue(
    ProgramBuilderValidationResult& result,
    const ProgramBuilderIssue issue,
    const ProgramBuilderErrorCode error_code = ProgramBuilderErrorCode::builder_invalid_draft) {
  const bool is_error = issue.severity == ProgramBuilderIssueSeverity::error;
  result.issues.push_back(issue);
  if (is_error && result.status.ok()) {
    result.status = ProgramBuilderStatus::error(error_code, result.issues.back().message);
  }
}

void append_warning(
    ProgramBuilderValidationResult& result,
    const std::string& path,
    const std::string& code,
    const std::string& message) {
  append_issue(
      result,
      make_issue(path, code, ProgramBuilderIssueSeverity::warning, message),
      ProgramBuilderErrorCode::ok);
}

ConditionTree constant_bool_tree(const std::string& tree_id, const bool value) {
  const auto node_id = tree_id + ".root";
  return ConditionTree{
      tree_id,
      node_id,
      {ConditionNode{
          {node_id, node_id, "Stage 20 placeholder transition", ConditionNodeKind::constant_bool, 0U, 0U, std::nullopt},
          ConditionConstantBoolNode{value},
      }},
  };
}

SequenceAction relay_action(
    const std::string& id,
    const std::string& target_id,
    const std::string& reason) {
  return SequenceAction{
      id,
      reason,
      SequenceActionKind::relay_request,
      SequenceRelayRequestAction{target_id, controller::hal::RelayState::on, reason},
  };
}

SequenceAction pwm_action(
    const std::string& id,
    const std::string& target_id,
    const std::string& reason) {
  return SequenceAction{
      id,
      reason,
      SequenceActionKind::pwm_request,
      SequencePwmRequestAction{target_id, 100.0, true, reason},
  };
}

template <typename ValueType>
std::string numeric_text(const ValueType value) {
  std::ostringstream stream;
  stream << value;
  return stream.str();
}

std::optional<std::int64_t> parameter_as_int64(const ProgramBuilderParameterValue& value) {
  if (const auto* int_value = std::get_if<std::int64_t>(&value)) {
    return *int_value;
  }
  return std::nullopt;
}

std::optional<double> parameter_as_double(const ProgramBuilderParameterValue& value) {
  if (const auto* float_value = std::get_if<double>(&value)) {
    return *float_value;
  }
  if (const auto* int_value = std::get_if<std::int64_t>(&value)) {
    return static_cast<double>(*int_value);
  }
  return std::nullopt;
}

const ProgramSkeletonCatalogEntry* find_definition(
    const std::vector<ProgramSkeletonCatalogEntry>& definitions,
    const ProgramSkeletonKind kind) {
  for (const auto& definition : definitions) {
    if (definition.kind == kind) {
      return &definition;
    }
  }
  return nullptr;
}

ProgramBuilderDraftSummary build_summary(
    const ProgramBuilderDraft& draft,
    const ProgramSkeletonCatalogEntry* definition) {
  ProgramBuilderDraftSummary summary;
  summary.skeleton_kind = draft.skeleton_kind;
  summary.program_id = draft.program_id;
  summary.program_name = draft.program_name;
  summary.program_type = draft.program_type;
  summary.description = draft.description;

  if (definition == nullptr) {
    return summary;
  }

  for (const auto& slot : definition->signal_slots) {
    if (slot.required) {
      ++summary.required_binding_count;
    }
    const auto it = draft.signal_bindings.find(slot.slot_name);
    if (it != draft.signal_bindings.end() && has_text(it->second)) {
      ++summary.bound_binding_count;
    }
  }
  for (const auto& slot : definition->actuator_slots) {
    if (slot.required) {
      ++summary.required_binding_count;
    }
    const auto it = draft.actuator_bindings.find(slot.slot_name);
    if (it != draft.actuator_bindings.end() && has_text(it->second)) {
      ++summary.bound_binding_count;
    }
  }
  for (const auto& slot : definition->timer_slots) {
    if (slot.required) {
      ++summary.required_binding_count;
    }
    const auto it = draft.timer_bindings.find(slot.slot_name);
    if (it != draft.timer_bindings.end() && has_text(it->second)) {
      ++summary.bound_binding_count;
    }
  }
  for (const auto& slot : definition->alarm_slots) {
    if (slot.required) {
      ++summary.required_binding_count;
    }
    const auto it = draft.alarm_bindings.find(slot.slot_name);
    if (it != draft.alarm_bindings.end() && has_text(it->second)) {
      ++summary.bound_binding_count;
    }
  }
  for (const auto& parameter : definition->parameter_slots) {
    if (parameter.required) {
      ++summary.required_parameter_count;
    }
    if (draft.parameters.count(parameter.parameter_name) != 0U) {
      ++summary.provided_parameter_count;
    }
  }

  return summary;
}

std::vector<ProgramSkeletonCatalogEntry> build_definitions() {
  return {
      ProgramSkeletonCatalogEntry{
          ProgramSkeletonKind::custom_blank,
          "Custom Blank",
          "Smallest safe sequence skeleton with placeholder transitions and explicit stop, trip and lockout branches.",
          SequenceProgramType::custom,
          {},
          {},
          {},
          {},
          {},
          {"OFF", "READY", "RUN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
      },
      ProgramSkeletonCatalogEntry{
          ProgramSkeletonKind::pump_basic,
          "Pump Basic",
          "Safe pump-oriented starter skeleton with primary output binding and minimum on/off timing review slots.",
          SequenceProgramType::pump,
          {
              {"pressure_low", "Pressure Low", "Optional low-pressure permissive or review signal.", false, {SignalType::boolean}},
              {"pressure_high", "Pressure High", "Optional high-pressure permissive or review signal.", false, {SignalType::boolean}},
          },
          {
              {
                  "primary_output",
                  "Primary Output",
                  "Relay or PWM actuator that represents the main pump output.",
                  true,
                  {ActuatorTargetKind::relay, ActuatorTargetKind::pwm},
                  {ActuatorRole::pump, ActuatorRole::motor},
                  true,
              },
          },
          {
              {"startup_bypass", "Startup Bypass Timer", "Optional timer slot reserved for later startup bypass behavior.", false},
          },
          {
              {"alarm_trip", "Trip Alarm", "Optional alarm slot reserved for future trip wiring.", false},
          },
          {
              {"min_run_time_ms", "Minimum Run Time", "Minimum review time for the RUN state before a normal stop transition should be considered.", ProgramBuilderParameterType::int64, true, 0, std::nullopt, std::nullopt, std::nullopt, "ms"},
              {"min_off_time_ms", "Minimum Off Time", "Minimum review time for the OFF state before a start path should be considered.", ProgramBuilderParameterType::int64, true, 0, std::nullopt, std::nullopt, std::nullopt, "ms"},
          },
          {"OFF", "READY_CHECK", "START", "RUN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
      },
      ProgramSkeletonCatalogEntry{
          ProgramSkeletonKind::compressor_basic,
          "Compressor Basic",
          "Safe compressor-oriented starter skeleton with placeholder sequencing and cooldown review timing.",
          SequenceProgramType::compressor,
          {
              {"pressure_low", "Pressure Low", "Optional low-pressure permissive or review signal.", false, {SignalType::boolean}},
              {"pressure_high", "Pressure High", "Optional high-pressure permissive or review signal.", false, {SignalType::boolean}},
          },
          {
              {
                  "primary_output",
                  "Primary Output",
                  "Relay or PWM actuator that represents the main compressor output.",
                  true,
                  {ActuatorTargetKind::relay, ActuatorTargetKind::pwm},
                  {ActuatorRole::motor, ActuatorRole::pump},
                  true,
              },
          },
          {
              {"cooldown_timer", "Cooldown Timer", "Optional timer slot reserved for later cooldown logic.", false},
          },
          {
              {"alarm_trip", "Trip Alarm", "Optional alarm slot reserved for future trip wiring.", false},
          },
          {
              {"min_run_time_ms", "Minimum Run Time", "Minimum review time for the RUN state before a normal stop transition should be considered.", ProgramBuilderParameterType::int64, true, 0, std::nullopt, std::nullopt, std::nullopt, "ms"},
              {"cooldown_ms", "Cooldown Time", "Cooldown dwell time reserved for the COOLDOWN state.", ProgramBuilderParameterType::int64, true, 0, std::nullopt, std::nullopt, std::nullopt, "ms"},
          },
          {"OFF", "READY_CHECK", "START_UNLOADED", "RUN", "COOLDOWN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
      },
      ProgramSkeletonCatalogEntry{
          ProgramSkeletonKind::burner_supervisory_skeleton,
          "Burner Supervisory Skeleton",
          "Safety-first supervisory burner skeleton with required semantic bindings and timing parameters but no hazardous output defaults.",
          SequenceProgramType::burner,
          {
              {"flame_signal", "Flame Signal", "Required flame proving feedback signal.", true, {SignalType::boolean}},
              {"air_ok_signal", "Air OK Signal", "Required air permissive feedback signal.", true, {SignalType::boolean}},
              {"temp_signal", "Temperature Signal", "Optional temperature signal reserved for later supervision logic.", false, {SignalType::int64, SignalType::float64}},
          },
          {
              {"fan_output", "Fan Output", "Required combustion air fan actuator. Stage 20 validates the slot but does not auto-energize it.", true, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::fan}, false},
              {"ignition_output", "Ignition Output", "Required ignition actuator. Stage 20 validates the slot but does not auto-energize it.", true, {ActuatorTargetKind::relay}, {ActuatorRole::ignition}, false},
              {"fuel_output", "Fuel Output", "Required fuel actuator. Stage 20 validates the slot but does not auto-energize it.", true, {ActuatorTargetKind::relay}, {ActuatorRole::fuel}, false},
          },
          {},
          {
              {"alarm_trip", "Trip Alarm", "Optional alarm slot reserved for future trip wiring.", false},
          },
          {
              {"prepurge_ms", "Prepurge Time", "Required review timing for the PREPURGE state.", ProgramBuilderParameterType::int64, true, 1, std::nullopt, std::nullopt, std::nullopt, "ms"},
              {"ignition_timeout_ms", "Ignition Timeout", "Required review timing for the IGNITION state timeout path.", ProgramBuilderParameterType::int64, true, 1, std::nullopt, std::nullopt, std::nullopt, "ms"},
              {"postpurge_ms", "Postpurge Time", "Required review timing for the POSTPURGE state.", ProgramBuilderParameterType::int64, true, 1, std::nullopt, std::nullopt, std::nullopt, "ms"},
          },
          {"OFF", "READY_CHECK", "PREPURGE", "IGNITION", "FLAME_PROVE", "RUN", "POSTPURGE", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
      },
      ProgramSkeletonCatalogEntry{
          ProgramSkeletonKind::incinerator_supervisory_skeleton,
          "Incinerator Supervisory Skeleton",
          "Supervisory incinerator skeleton with validated bindings and threshold parameters, intentionally held as a review-first scaffold.",
          SequenceProgramType::incinerator,
          {
              {"chamber_temp_signal", "Chamber Temperature", "Required chamber temperature feedback signal.", true, {SignalType::int64, SignalType::float64}},
              {"flame_signal", "Flame Signal", "Optional flame feedback signal reserved for later stages.", false, {SignalType::boolean}},
              {"sludge_ready_signal", "Sludge Ready Signal", "Optional readiness signal for sludge feed.", false, {SignalType::boolean}},
          },
          {
              {"fan_output", "Fan Output", "Required air fan actuator. Stage 20 validates the slot but does not auto-energize it.", true, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::fan}, false},
              {"diesel_output", "Diesel Output", "Required auxiliary fuel actuator. Stage 20 validates the slot but does not auto-energize it.", true, {ActuatorTargetKind::relay}, {ActuatorRole::fuel}, false},
              {"sludge_output", "Sludge Output", "Required sludge feed actuator. Stage 20 validates the slot but does not auto-energize it.", true, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::pump, ActuatorRole::valve}, true},
          },
          {},
          {
              {"alarm_trip", "Trip Alarm", "Optional alarm slot reserved for future trip wiring.", false},
          },
          {
              {"warmup_temp", "Warmup Temperature", "Required warmup threshold captured for later supervisory logic.", ProgramBuilderParameterType::float64, true, std::nullopt, std::nullopt, -273.15, std::nullopt, ""},
              {"cooldown_temp", "Cooldown Temperature", "Required cooldown threshold captured for later supervisory logic.", ProgramBuilderParameterType::float64, true, std::nullopt, std::nullopt, -273.15, std::nullopt, ""},
          },
          {"OFF", "READY_CHECK", "DIESEL_WARMUP", "SLUDGE_ENABLE", "SLUDGE_RUN", "COOLDOWN", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
      },
      ProgramSkeletonCatalogEntry{
          ProgramSkeletonKind::dosing_basic,
          "Dosing Basic",
          "Safe dosing skeleton with primary output binding and target-volume review parameter.",
          SequenceProgramType::dosing,
          {
              {"flow_signal", "Flow Signal", "Optional flow or accumulation signal for later dispense review logic.", false, {SignalType::int64, SignalType::float64}},
          },
          {
              {"primary_output", "Primary Output", "Pump or valve actuator that represents the dosing output.", true, {ActuatorTargetKind::relay, ActuatorTargetKind::pwm}, {ActuatorRole::pump, ActuatorRole::valve}, true},
          },
          {},
          {},
          {
              {"target_volume", "Target Volume", "Required target volume captured for later dispense logic.", ProgramBuilderParameterType::float64, true, std::nullopt, std::nullopt, 0.0, std::nullopt, ""},
          },
          {"OFF", "READY_CHECK", "START", "DISPENSE", "COMPLETE", "NORMAL_STOP", "TRIP_STOP", "LOCKOUT"},
      },
  };
}

SequenceProgramType default_program_type_for(const ProgramSkeletonKind kind) {
  switch (kind) {
    case ProgramSkeletonKind::custom_blank:
      return SequenceProgramType::custom;
    case ProgramSkeletonKind::pump_basic:
      return SequenceProgramType::pump;
    case ProgramSkeletonKind::compressor_basic:
      return SequenceProgramType::compressor;
    case ProgramSkeletonKind::burner_supervisory_skeleton:
      return SequenceProgramType::burner;
    case ProgramSkeletonKind::incinerator_supervisory_skeleton:
      return SequenceProgramType::incinerator;
    case ProgramSkeletonKind::dosing_basic:
      return SequenceProgramType::dosing;
  }
  return SequenceProgramType::custom;
}

SequenceState make_state(
    const std::string& id,
    const SequenceStateType type,
    const bool non_skippable = false) {
  SequenceState state;
  state.id = id;
  state.name = id;
  state.type = type;
  state.non_skippable = non_skippable;
  return state;
}

void add_placeholder_transition(
    SequenceState& state,
    const std::string& transition_id,
    const std::string& target_state_id,
    const bool require_min_time_done = false) {
  state.transitions.push_back(SequenceTransition{
      transition_id,
      transition_id,
      target_state_id,
      constant_bool_tree("builder." + transition_id, false),
      require_min_time_done,
      true,
  });
}

void add_trip_lockout_transition(SequenceState& state) {
  state.transitions.push_back(SequenceTransition{
      state.id + "_to_LOCKOUT",
      state.id + "_to_LOCKOUT",
      "LOCKOUT",
      std::nullopt,
      false,
      true,
  });
}

std::vector<ProgramBuilderStatePreview> build_state_previews(const SequenceProgram& program) {
  std::vector<ProgramBuilderStatePreview> previews;
  previews.reserve(program.states.size());

  for (const auto& state : program.states) {
    ProgramBuilderStatePreview preview;
    preview.state_id = state.id;
    preview.state_name = state.name;
    preview.type = state.type;
    preview.non_skippable = state.non_skippable;
    for (const auto& action : state.active_actions) {
      if (const auto* relay = std::get_if<SequenceRelayRequestAction>(&action.payload)) {
        preview.active_binding_slots.push_back(relay->target_id);
      } else if (const auto* pwm = std::get_if<SequencePwmRequestAction>(&action.payload)) {
        preview.active_binding_slots.push_back(pwm->target_id);
      }
    }
    previews.push_back(std::move(preview));
  }

  return previews;
}

std::vector<ProgramBuilderTransitionPreview> build_transition_previews(const SequenceProgram& program) {
  std::vector<ProgramBuilderTransitionPreview> previews;

  for (const auto& state : program.states) {
    for (const auto& transition : state.transitions) {
      ProgramBuilderTransitionPreview preview;
      preview.transition_id = transition.id;
      preview.source_state_id = state.id;
      preview.target_state_id = transition.target_state_id;
      preview.placeholder = transition.condition.has_value();
      preview.require_min_time_done = transition.require_min_time_done;
      preview.summary = transition.condition.has_value()
                            ? "Placeholder review transition generated in Stage 20."
                            : "Direct branch transition.";
      previews.push_back(std::move(preview));
    }
  }

  return previews;
}

SequenceAction main_output_action(
    const ProgramBuilderActuatorCatalogEntry& actuator,
    const std::string& slot_name,
    const std::string& state_id) {
  const auto description = "Stage 20 skeleton output for slot '" + slot_name + "' in state '" + state_id + "'";
  if (actuator.kind == ActuatorTargetKind::relay) {
    return relay_action(state_id + "." + slot_name + ".relay", actuator.id, description);
  }
  return pwm_action(state_id + "." + slot_name + ".pwm", actuator.id, description);
}

ProgramBuilderActuatorCatalogEntry find_actuator_catalog_entry(
    const std::vector<ProgramBuilderActuatorCatalogEntry>& actuators,
    const std::string& id) {
  for (const auto& actuator : actuators) {
    if (actuator.id == id) {
      return actuator;
    }
  }
  return ProgramBuilderActuatorCatalogEntry{};
}

ProgramBuilderCatalog build_catalog_from_runtime(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    const controller::sequence::SequenceService& sequence_service) {
  ProgramBuilderCatalog catalog;

  for (const auto& descriptor : signal_registry.list_descriptors()) {
    if (!descriptor.visible) {
      continue;
    }
    catalog.signals.push_back(ProgramBuilderSignalCatalogEntry{
        descriptor.path,
        descriptor.type,
        descriptor.unit,
        descriptor.source_module,
    });
  }
  std::sort(catalog.signals.begin(), catalog.signals.end(), compare_signal_catalog);

  for (const auto& snapshot : actuator_manager.list_snapshots()) {
    catalog.actuators.push_back(ProgramBuilderActuatorCatalogEntry{
        snapshot.target_id,
        snapshot.kind,
        snapshot.role,
    });
  }
  std::sort(catalog.actuators.begin(), catalog.actuators.end(), compare_actuator_catalog);

  for (const auto& descriptor : timer_service.list_descriptors()) {
    catalog.timers.push_back(ProgramBuilderTimerCatalogEntry{
        descriptor.id,
        descriptor.name,
        descriptor.enabled,
    });
  }
  std::sort(catalog.timers.begin(), catalog.timers.end(), compare_named_id<ProgramBuilderTimerCatalogEntry>);

  for (const auto& descriptor : alarm_service.list_descriptors()) {
    catalog.alarms.push_back(ProgramBuilderAlarmCatalogEntry{
        descriptor.id,
        descriptor.name,
        descriptor.enabled,
    });
  }
  std::sort(catalog.alarms.begin(), catalog.alarms.end(), compare_named_id<ProgramBuilderAlarmCatalogEntry>);

  for (const auto& program : sequence_service.list_programs()) {
    catalog.existing_program_ids.push_back(program.id);
  }
  std::sort(catalog.existing_program_ids.begin(), catalog.existing_program_ids.end());

  catalog.supported_skeletons = build_definitions();
  return catalog;
}

ProgramBuilderValidationResult validate_signal_binding(
    const ProgramBuilderDraft& draft,
    const ProgramSkeletonCatalogEntry& definition,
    controller::signals::SignalRegistry& signal_registry) {
  ProgramBuilderValidationResult result;
  result.status = ProgramBuilderStatus::success();

  for (const auto& slot : definition.signal_slots) {
    const auto binding_it = draft.signal_bindings.find(slot.slot_name);
    const auto path = "draft.signal_bindings." + slot.slot_name;
    const auto binding = binding_it == draft.signal_bindings.end() ? std::string{} : binding_it->second;
    if (!has_text(binding)) {
      if (slot.required) {
        append_issue(
            result,
            make_issue(
                path,
                "BUILDER_MISSING_REQUIRED_BINDING",
                ProgramBuilderIssueSeverity::error,
                "Required signal binding '" + slot.slot_name + "' is missing."));
      }
      continue;
    }

    const auto descriptor = signal_registry.get_descriptor(binding);
    if (!descriptor.ok()) {
      append_issue(
          result,
          make_issue(
              path,
              "BUILDER_UNKNOWN_BINDING_TARGET",
              ProgramBuilderIssueSeverity::error,
              "Signal binding '" + slot.slot_name + "' references unknown signal '" + binding + "'."));
      continue;
    }

    if (!slot.allowed_types.empty()) {
      const auto allowed = std::find(slot.allowed_types.begin(), slot.allowed_types.end(), descriptor.value->type);
      if (allowed == slot.allowed_types.end()) {
        append_issue(
            result,
            make_issue(
                path,
                "BUILDER_WRONG_SIGNAL_TYPE",
                ProgramBuilderIssueSeverity::error,
                "Signal '" + binding + "' does not match the expected type for slot '" + slot.slot_name + "'."));
      }
    }
  }

  return result;
}

ProgramBuilderValidationResult validate_actuator_binding(
    const ProgramBuilderDraft& draft,
    const ProgramSkeletonCatalogEntry& definition,
    controller::actuators::ActuatorManager& actuator_manager) {
  ProgramBuilderValidationResult result;
  result.status = ProgramBuilderStatus::success();

  for (const auto& slot : definition.actuator_slots) {
    const auto binding_it = draft.actuator_bindings.find(slot.slot_name);
    const auto path = "draft.actuator_bindings." + slot.slot_name;
    const auto binding = binding_it == draft.actuator_bindings.end() ? std::string{} : binding_it->second;
    if (!has_text(binding)) {
      if (slot.required) {
        append_issue(
            result,
            make_issue(
                path,
                "BUILDER_MISSING_REQUIRED_BINDING",
                ProgramBuilderIssueSeverity::error,
                "Required actuator binding '" + slot.slot_name + "' is missing."));
      }
      continue;
    }

    const auto snapshot = actuator_manager.get_snapshot(binding);
    if (!snapshot.ok()) {
      append_issue(
          result,
          make_issue(
              path,
              "BUILDER_UNKNOWN_BINDING_TARGET",
              ProgramBuilderIssueSeverity::error,
              "Actuator binding '" + slot.slot_name + "' references unknown actuator '" + binding + "'."));
      continue;
    }

    if (!slot.allowed_kinds.empty()) {
      const auto kind_it = std::find(slot.allowed_kinds.begin(), slot.allowed_kinds.end(), snapshot.value->kind);
      if (kind_it == slot.allowed_kinds.end()) {
        append_issue(
            result,
            make_issue(
                path,
                "BUILDER_WRONG_BINDING_KIND",
                ProgramBuilderIssueSeverity::error,
                "Actuator '" + binding + "' has an unsupported kind for slot '" + slot.slot_name + "'."));
        continue;
      }
    }

    if (!slot.allowed_roles.empty()) {
      const auto role_it = std::find(slot.allowed_roles.begin(), slot.allowed_roles.end(), snapshot.value->role);
      const bool allow_generic =
          slot.allow_generic_role_fallback && snapshot.value->role == controller::actuators::ActuatorRole::generic;
      if (role_it == slot.allowed_roles.end() && !allow_generic) {
        append_issue(
            result,
            make_issue(
                path,
                "BUILDER_WRONG_BINDING_KIND",
                ProgramBuilderIssueSeverity::error,
                "Actuator '" + binding + "' has role '" + std::string{controller::actuators::to_string(snapshot.value->role)} +
                    "' but slot '" + slot.slot_name + "' requires a different role."));
      }
    }
  }

  return result;
}

template <typename CatalogGetter>
ProgramBuilderValidationResult validate_named_binding_set(
    const std::map<std::string, std::string>& bindings,
    const std::vector<ProgramBuilderNamedSlotDefinition>& slots,
    const std::string& root_path,
    const std::string& missing_code,
    const std::string& unknown_code,
    CatalogGetter&& exists) {
  ProgramBuilderValidationResult result;
  result.status = ProgramBuilderStatus::success();

  for (const auto& slot : slots) {
    const auto binding_it = bindings.find(slot.slot_name);
    const auto binding = binding_it == bindings.end() ? std::string{} : binding_it->second;
    const auto path = root_path + "." + slot.slot_name;
    if (!has_text(binding)) {
      if (slot.required) {
        append_issue(
            result,
            make_issue(
                path,
                missing_code,
                ProgramBuilderIssueSeverity::error,
                "Required binding '" + slot.slot_name + "' is missing."));
      }
      continue;
    }
    if (!exists(binding)) {
      append_issue(
          result,
          make_issue(
              path,
              unknown_code,
              ProgramBuilderIssueSeverity::error,
              "Binding '" + slot.slot_name + "' references unknown id '" + binding + "'."));
    }
  }

  return result;
}

ProgramBuilderValidationResult validate_parameters(
    const ProgramBuilderDraft& draft,
    const ProgramSkeletonCatalogEntry& definition) {
  ProgramBuilderValidationResult result;
  result.status = ProgramBuilderStatus::success();

  for (const auto& parameter : definition.parameter_slots) {
    const auto value_it = draft.parameters.find(parameter.parameter_name);
    const auto path = "draft.parameters." + parameter.parameter_name;
    if (value_it == draft.parameters.end()) {
      if (parameter.required) {
        append_issue(
            result,
            make_issue(
                path,
                "BUILDER_MISSING_REQUIRED_PARAMETER",
                ProgramBuilderIssueSeverity::error,
                "Required parameter '" + parameter.parameter_name + "' is missing."));
      }
      continue;
    }

    const auto& value = value_it->second;
    switch (parameter.type) {
      case ProgramBuilderParameterType::boolean:
        if (!std::holds_alternative<bool>(value)) {
          append_issue(result, make_issue(path, "BUILDER_WRONG_PARAMETER_TYPE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be boolean."));
        }
        break;
      case ProgramBuilderParameterType::int64: {
        const auto int_value = parameter_as_int64(value);
        if (!int_value.has_value()) {
          append_issue(result, make_issue(path, "BUILDER_WRONG_PARAMETER_TYPE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be int64."));
          break;
        }
        if (parameter.min_int64_value.has_value() && *int_value < *parameter.min_int64_value) {
          append_issue(result, make_issue(path, "BUILDER_INVALID_PARAMETER_RANGE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be >= " + std::to_string(*parameter.min_int64_value) + "."));
        }
        if (parameter.max_int64_value.has_value() && *int_value > *parameter.max_int64_value) {
          append_issue(result, make_issue(path, "BUILDER_INVALID_PARAMETER_RANGE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be <= " + std::to_string(*parameter.max_int64_value) + "."));
        }
        break;
      }
      case ProgramBuilderParameterType::float64: {
        const auto float_value = parameter_as_double(value);
        if (!float_value.has_value()) {
          append_issue(result, make_issue(path, "BUILDER_WRONG_PARAMETER_TYPE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be numeric."));
          break;
        }
        if (parameter.min_double_value.has_value() && *float_value < *parameter.min_double_value) {
          append_issue(result, make_issue(path, "BUILDER_INVALID_PARAMETER_RANGE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be >= " + numeric_text(*parameter.min_double_value) + "."));
        }
        if (parameter.max_double_value.has_value() && *float_value > *parameter.max_double_value) {
          append_issue(result, make_issue(path, "BUILDER_INVALID_PARAMETER_RANGE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be <= " + numeric_text(*parameter.max_double_value) + "."));
        }
        break;
      }
      case ProgramBuilderParameterType::string:
        if (!std::holds_alternative<std::string>(value)) {
          append_issue(result, make_issue(path, "BUILDER_WRONG_PARAMETER_TYPE", ProgramBuilderIssueSeverity::error, "Parameter '" + parameter.parameter_name + "' must be string."));
        }
        break;
    }
  }

  if (definition.kind == ProgramSkeletonKind::incinerator_supervisory_skeleton) {
    const auto warmup_it = draft.parameters.find("warmup_temp");
    const auto cooldown_it = draft.parameters.find("cooldown_temp");
    if (warmup_it != draft.parameters.end() && cooldown_it != draft.parameters.end()) {
      const auto warmup = parameter_as_double(warmup_it->second);
      const auto cooldown = parameter_as_double(cooldown_it->second);
      if (warmup.has_value() && cooldown.has_value() && *cooldown >= *warmup) {
        append_issue(result, make_issue("draft.parameters.cooldown_temp", "BUILDER_INVALID_PARAMETER_RANGE", ProgramBuilderIssueSeverity::error, "cooldown_temp must be lower than warmup_temp for the review skeleton."));
      }
    }
  }

  return result;
}

void merge_validation(ProgramBuilderValidationResult& target, const ProgramBuilderValidationResult& source) {
  for (const auto& issue : source.issues) {
    append_issue(
        target,
        issue,
        source.status.code == ProgramBuilderErrorCode::ok ? ProgramBuilderErrorCode::ok : source.status.code);
  }
}

std::optional<std::int64_t> required_int_parameter(
    const ProgramBuilderDraft& draft,
    const std::string& name) {
  const auto it = draft.parameters.find(name);
  if (it == draft.parameters.end()) {
    return std::nullopt;
  }
  return parameter_as_int64(it->second);
}

SequenceProgram build_sequence_program(
    const ProgramBuilderDraft& draft,
    const ProgramSkeletonCatalogEntry& definition,
    const ProgramBuilderCatalog& catalog) {
  SequenceProgram program;
  program.id = draft.program_id;
  program.name = draft.program_name;
  program.enabled = false;
  program.type = draft.program_type;

  auto add_primary_output_if_present = [&](SequenceState& state) {
    const auto binding_it = draft.actuator_bindings.find("primary_output");
    if (binding_it == draft.actuator_bindings.end() || !has_text(binding_it->second)) {
      return;
    }
    const auto actuator = find_actuator_catalog_entry(catalog.actuators, binding_it->second);
    if (!has_text(actuator.id)) {
      return;
    }
    state.active_actions.push_back(main_output_action(actuator, "primary_output", state.id));
  };

  if (definition.kind == ProgramSkeletonKind::custom_blank) {
    program.initial_state_id = "OFF";
    program.normal_stop_state_id = "NORMAL_STOP";
    program.trip_state_id = "TRIP_STOP";
    program.lockout_state_id = "LOCKOUT";

    auto off = make_state("OFF", SequenceStateType::wait);
    auto ready = make_state("READY", SequenceStateType::wait);
    auto run = make_state("RUN", SequenceStateType::run);
    auto normal_stop = make_state("NORMAL_STOP", SequenceStateType::stop, true);
    auto trip_stop = make_state("TRIP_STOP", SequenceStateType::stop, true);
    auto lockout = make_state("LOCKOUT", SequenceStateType::lockout, true);

    add_placeholder_transition(off, "OFF_to_READY", "READY");
    add_placeholder_transition(ready, "READY_to_RUN", "RUN");
    add_placeholder_transition(run, "RUN_to_NORMAL_STOP", "NORMAL_STOP");
    add_trip_lockout_transition(trip_stop);

    program.states = {off, ready, run, normal_stop, trip_stop, lockout};
    return program;
  }

  if (definition.kind == ProgramSkeletonKind::pump_basic) {
    program.initial_state_id = "OFF";
    program.normal_stop_state_id = "NORMAL_STOP";
    program.trip_state_id = "TRIP_STOP";
    program.lockout_state_id = "LOCKOUT";

    auto off = make_state("OFF", SequenceStateType::wait, true);
    if (const auto min_off = required_int_parameter(draft, "min_off_time_ms")) {
      off.min_time_ms = static_cast<SequenceDurationMs>(*min_off);
    }
    auto ready = make_state("READY_CHECK", SequenceStateType::wait, true);
    auto start = make_state("START", SequenceStateType::action, true);
    auto run = make_state("RUN", SequenceStateType::run, true);
    if (const auto min_run = required_int_parameter(draft, "min_run_time_ms")) {
      run.min_time_ms = static_cast<SequenceDurationMs>(*min_run);
    }
    add_primary_output_if_present(run);
    auto normal_stop = make_state("NORMAL_STOP", SequenceStateType::stop, true);
    auto trip_stop = make_state("TRIP_STOP", SequenceStateType::stop, true);
    auto lockout = make_state("LOCKOUT", SequenceStateType::lockout, true);

    add_placeholder_transition(off, "OFF_to_READY_CHECK", "READY_CHECK", off.min_time_ms.has_value());
    add_placeholder_transition(ready, "READY_CHECK_to_START", "START");
    add_placeholder_transition(start, "START_to_RUN", "RUN");
    add_placeholder_transition(run, "RUN_to_NORMAL_STOP", "NORMAL_STOP", run.min_time_ms.has_value());
    add_trip_lockout_transition(trip_stop);

    program.states = {off, ready, start, run, normal_stop, trip_stop, lockout};
    return program;
  }

  if (definition.kind == ProgramSkeletonKind::compressor_basic) {
    program.initial_state_id = "OFF";
    program.normal_stop_state_id = "NORMAL_STOP";
    program.trip_state_id = "TRIP_STOP";
    program.lockout_state_id = "LOCKOUT";

    auto off = make_state("OFF", SequenceStateType::wait, true);
    auto ready = make_state("READY_CHECK", SequenceStateType::wait, true);
    auto start_unloaded = make_state("START_UNLOADED", SequenceStateType::action, true);
    auto run = make_state("RUN", SequenceStateType::run, true);
    if (const auto min_run = required_int_parameter(draft, "min_run_time_ms")) {
      run.min_time_ms = static_cast<SequenceDurationMs>(*min_run);
    }
    add_primary_output_if_present(run);
    auto cooldown = make_state("COOLDOWN", SequenceStateType::cooldown, true);
    if (const auto cooldown_ms = required_int_parameter(draft, "cooldown_ms")) {
      cooldown.min_time_ms = static_cast<SequenceDurationMs>(*cooldown_ms);
    }
    auto normal_stop = make_state("NORMAL_STOP", SequenceStateType::stop, true);
    auto trip_stop = make_state("TRIP_STOP", SequenceStateType::stop, true);
    auto lockout = make_state("LOCKOUT", SequenceStateType::lockout, true);

    add_placeholder_transition(off, "OFF_to_READY_CHECK", "READY_CHECK");
    add_placeholder_transition(ready, "READY_CHECK_to_START_UNLOADED", "START_UNLOADED");
    add_placeholder_transition(start_unloaded, "START_UNLOADED_to_RUN", "RUN");
    add_placeholder_transition(run, "RUN_to_COOLDOWN", "COOLDOWN", run.min_time_ms.has_value());
    add_placeholder_transition(cooldown, "COOLDOWN_to_NORMAL_STOP", "NORMAL_STOP", cooldown.min_time_ms.has_value());
    add_trip_lockout_transition(trip_stop);

    program.states = {off, ready, start_unloaded, run, cooldown, normal_stop, trip_stop, lockout};
    return program;
  }

  if (definition.kind == ProgramSkeletonKind::burner_supervisory_skeleton) {
    program.initial_state_id = "OFF";
    program.normal_stop_state_id = "NORMAL_STOP";
    program.trip_state_id = "TRIP_STOP";
    program.lockout_state_id = "LOCKOUT";

    auto off = make_state("OFF", SequenceStateType::wait, true);
    auto ready = make_state("READY_CHECK", SequenceStateType::wait, true);
    auto prepurge = make_state("PREPURGE", SequenceStateType::purge, true);
    if (const auto prepurge_ms = required_int_parameter(draft, "prepurge_ms")) {
      prepurge.min_time_ms = static_cast<SequenceDurationMs>(*prepurge_ms);
    }
    auto ignition = make_state("IGNITION", SequenceStateType::ignition, true);
    if (const auto ignition_timeout = required_int_parameter(draft, "ignition_timeout_ms")) {
      ignition.max_time_ms = static_cast<SequenceDurationMs>(*ignition_timeout);
      ignition.timeout_target_state_id = "TRIP_STOP";
    }
    auto flame_prove = make_state("FLAME_PROVE", SequenceStateType::wait, true);
    auto run = make_state("RUN", SequenceStateType::run, true);
    auto postpurge = make_state("POSTPURGE", SequenceStateType::purge, true);
    if (const auto postpurge_ms = required_int_parameter(draft, "postpurge_ms")) {
      postpurge.min_time_ms = static_cast<SequenceDurationMs>(*postpurge_ms);
    }
    auto normal_stop = make_state("NORMAL_STOP", SequenceStateType::stop, true);
    auto trip_stop = make_state("TRIP_STOP", SequenceStateType::stop, true);
    auto lockout = make_state("LOCKOUT", SequenceStateType::lockout, true);

    add_placeholder_transition(off, "OFF_to_READY_CHECK", "READY_CHECK");
    add_placeholder_transition(ready, "READY_CHECK_to_PREPURGE", "PREPURGE");
    add_placeholder_transition(prepurge, "PREPURGE_to_IGNITION", "IGNITION", prepurge.min_time_ms.has_value());
    add_placeholder_transition(ignition, "IGNITION_to_FLAME_PROVE", "FLAME_PROVE");
    add_placeholder_transition(flame_prove, "FLAME_PROVE_to_RUN", "RUN");
    add_placeholder_transition(run, "RUN_to_POSTPURGE", "POSTPURGE");
    add_placeholder_transition(postpurge, "POSTPURGE_to_NORMAL_STOP", "NORMAL_STOP", postpurge.min_time_ms.has_value());
    add_trip_lockout_transition(trip_stop);

    program.states = {off, ready, prepurge, ignition, flame_prove, run, postpurge, normal_stop, trip_stop, lockout};
    return program;
  }

  if (definition.kind == ProgramSkeletonKind::incinerator_supervisory_skeleton) {
    program.initial_state_id = "OFF";
    program.normal_stop_state_id = "NORMAL_STOP";
    program.trip_state_id = "TRIP_STOP";
    program.lockout_state_id = "LOCKOUT";

    auto off = make_state("OFF", SequenceStateType::wait, true);
    auto ready = make_state("READY_CHECK", SequenceStateType::wait, true);
    auto warmup = make_state("DIESEL_WARMUP", SequenceStateType::action, true);
    auto sludge_enable = make_state("SLUDGE_ENABLE", SequenceStateType::action, true);
    auto sludge_run = make_state("SLUDGE_RUN", SequenceStateType::run, true);
    auto cooldown = make_state("COOLDOWN", SequenceStateType::cooldown, true);
    auto normal_stop = make_state("NORMAL_STOP", SequenceStateType::stop, true);
    auto trip_stop = make_state("TRIP_STOP", SequenceStateType::stop, true);
    auto lockout = make_state("LOCKOUT", SequenceStateType::lockout, true);

    add_placeholder_transition(off, "OFF_to_READY_CHECK", "READY_CHECK");
    add_placeholder_transition(ready, "READY_CHECK_to_DIESEL_WARMUP", "DIESEL_WARMUP");
    add_placeholder_transition(warmup, "DIESEL_WARMUP_to_SLUDGE_ENABLE", "SLUDGE_ENABLE");
    add_placeholder_transition(sludge_enable, "SLUDGE_ENABLE_to_SLUDGE_RUN", "SLUDGE_RUN");
    add_placeholder_transition(sludge_run, "SLUDGE_RUN_to_COOLDOWN", "COOLDOWN");
    add_placeholder_transition(cooldown, "COOLDOWN_to_NORMAL_STOP", "NORMAL_STOP");
    add_trip_lockout_transition(trip_stop);

    program.states = {off, ready, warmup, sludge_enable, sludge_run, cooldown, normal_stop, trip_stop, lockout};
    return program;
  }

  program.initial_state_id = "OFF";
  program.normal_stop_state_id = "NORMAL_STOP";
  program.trip_state_id = "TRIP_STOP";
  program.lockout_state_id = "LOCKOUT";

  auto off = make_state("OFF", SequenceStateType::wait, true);
  auto ready = make_state("READY_CHECK", SequenceStateType::wait, true);
  auto start = make_state("START", SequenceStateType::action, true);
  auto dispense = make_state("DISPENSE", SequenceStateType::run, true);
  add_primary_output_if_present(dispense);
  auto complete = make_state("COMPLETE", SequenceStateType::stop, true);
  auto normal_stop = make_state("NORMAL_STOP", SequenceStateType::stop, true);
  auto trip_stop = make_state("TRIP_STOP", SequenceStateType::stop, true);
  auto lockout = make_state("LOCKOUT", SequenceStateType::lockout, true);

  add_placeholder_transition(off, "OFF_to_READY_CHECK", "READY_CHECK");
  add_placeholder_transition(ready, "READY_CHECK_to_START", "START");
  add_placeholder_transition(start, "START_to_DISPENSE", "DISPENSE");
  add_placeholder_transition(dispense, "DISPENSE_to_COMPLETE", "COMPLETE");
  add_placeholder_transition(complete, "COMPLETE_to_NORMAL_STOP", "NORMAL_STOP");
  add_trip_lockout_transition(trip_stop);

  program.states = {off, ready, start, dispense, complete, normal_stop, trip_stop, lockout};
  return program;
}

}  // namespace

const char* to_string(const ProgramBuilderIssueSeverity severity) {
  switch (severity) {
    case ProgramBuilderIssueSeverity::info:
      return "info";
    case ProgramBuilderIssueSeverity::warning:
      return "warning";
    case ProgramBuilderIssueSeverity::error:
      return "error";
  }
  return "unknown";
}

const char* to_string(const ProgramBuilderErrorCode code) {
  switch (code) {
    case ProgramBuilderErrorCode::ok:
      return "PROGRAM_BUILDER_OK";
    case ProgramBuilderErrorCode::builder_unsupported_skeleton:
      return "PROGRAM_BUILDER_UNSUPPORTED_SKELETON";
    case ProgramBuilderErrorCode::builder_invalid_draft:
      return "PROGRAM_BUILDER_INVALID_DRAFT";
    case ProgramBuilderErrorCode::builder_duplicate_program_id:
      return "PROGRAM_BUILDER_DUPLICATE_PROGRAM_ID";
    case ProgramBuilderErrorCode::builder_data_unavailable:
      return "PROGRAM_BUILDER_DATA_UNAVAILABLE";
    case ProgramBuilderErrorCode::builder_generation_failed:
      return "PROGRAM_BUILDER_GENERATION_FAILED";
  }
  return "PROGRAM_BUILDER_UNKNOWN";
}

bool is_supported_program_skeleton_kind(const ProgramSkeletonKind kind) {
  switch (kind) {
    case ProgramSkeletonKind::custom_blank:
    case ProgramSkeletonKind::pump_basic:
    case ProgramSkeletonKind::compressor_basic:
    case ProgramSkeletonKind::burner_supervisory_skeleton:
    case ProgramSkeletonKind::incinerator_supervisory_skeleton:
    case ProgramSkeletonKind::dosing_basic:
      return true;
  }
  return false;
}

const char* to_string(const ProgramSkeletonKind kind) {
  switch (kind) {
    case ProgramSkeletonKind::custom_blank:
      return "custom_blank";
    case ProgramSkeletonKind::pump_basic:
      return "pump_basic";
    case ProgramSkeletonKind::compressor_basic:
      return "compressor_basic";
    case ProgramSkeletonKind::burner_supervisory_skeleton:
      return "burner_supervisory_skeleton";
    case ProgramSkeletonKind::incinerator_supervisory_skeleton:
      return "incinerator_supervisory_skeleton";
    case ProgramSkeletonKind::dosing_basic:
      return "dosing_basic";
  }
  return "unknown";
}

const char* to_string(const ProgramBuilderParameterType type) {
  switch (type) {
    case ProgramBuilderParameterType::boolean:
      return "boolean";
    case ProgramBuilderParameterType::int64:
      return "int64";
    case ProgramBuilderParameterType::float64:
      return "float64";
    case ProgramBuilderParameterType::string:
      return "string";
  }
  return "unknown";
}

ProgramSkeletonBuilder::ProgramSkeletonBuilder(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    const controller::sequence::SequenceService& sequence_service)
    : signal_registry_(signal_registry),
      actuator_manager_(actuator_manager),
      timer_service_(timer_service),
      alarm_service_(alarm_service),
      sequence_service_(sequence_service) {}

ProgramBuilderCatalog ProgramSkeletonBuilder::build_catalog(const SequenceTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  return build_catalog_from_runtime(signal_registry_, actuator_manager_, timer_service_, alarm_service_, sequence_service_);
}

ProgramBuilderDraft ProgramSkeletonBuilder::create_empty_draft(const ProgramSkeletonKind kind) const {
  ProgramBuilderDraft draft;
  draft.skeleton_kind = kind;
  draft.program_type = default_program_type_for(kind);
  draft.enabled_after_create = false;
  return draft;
}

ProgramBuilderValidationResult ProgramSkeletonBuilder::validate_draft(const ProgramBuilderDraft& draft) const {
  auto catalog = build_catalog();
  ProgramBuilderValidationResult result;
  result.status = ProgramBuilderStatus::success();

  if (!is_supported_program_skeleton_kind(draft.skeleton_kind)) {
    append_issue(
        result,
        make_issue(
            "draft.skeleton_kind",
            "BUILDER_UNSUPPORTED_SKELETON",
            ProgramBuilderIssueSeverity::error,
            "Unsupported skeleton kind was requested."),
        ProgramBuilderErrorCode::builder_unsupported_skeleton);
    return result;
  }

  const auto* definition = find_definition(catalog.supported_skeletons, draft.skeleton_kind);
  if (definition == nullptr) {
    append_issue(
        result,
        make_issue(
            "draft.skeleton_kind",
            "BUILDER_UNSUPPORTED_SKELETON",
            ProgramBuilderIssueSeverity::error,
            "No definition is available for the requested skeleton kind."),
        ProgramBuilderErrorCode::builder_unsupported_skeleton);
    return result;
  }

  if (!has_text(draft.program_id)) {
    append_issue(result, make_issue("draft.program_id", "BUILDER_MISSING_PROGRAM_ID", ProgramBuilderIssueSeverity::error, "program_id must not be empty."));
  } else if (!controller::signals::is_valid_signal_path(draft.program_id)) {
    append_issue(
        result,
        make_issue(
            "draft.program_id",
            "BUILDER_INVALID_PROGRAM_ID",
            ProgramBuilderIssueSeverity::error,
            "program_id must use dot-separated alphanumeric or underscore segments."));
  } else if (sequence_service_.has_program(draft.program_id)) {
    append_issue(
        result,
        make_issue("draft.program_id", "BUILDER_DUPLICATE_PROGRAM_ID", ProgramBuilderIssueSeverity::error, "Program id '" + draft.program_id + "' is already registered."),
        ProgramBuilderErrorCode::builder_duplicate_program_id);
  }

  if (!has_text(draft.program_name)) {
    append_issue(result, make_issue("draft.program_name", "BUILDER_MISSING_PROGRAM_NAME", ProgramBuilderIssueSeverity::error, "program_name must not be empty."));
  }

  merge_validation(result, validate_signal_binding(draft, *definition, signal_registry_));
  merge_validation(result, validate_actuator_binding(draft, *definition, actuator_manager_));
  merge_validation(
      result,
      validate_named_binding_set(
          draft.timer_bindings,
          definition->timer_slots,
          "draft.timer_bindings",
          "BUILDER_MISSING_REQUIRED_BINDING",
          "BUILDER_UNKNOWN_BINDING_TARGET",
          [&](const std::string& id) { return timer_service_.has_timer(id); }));
  merge_validation(
      result,
      validate_named_binding_set(
          draft.alarm_bindings,
          definition->alarm_slots,
          "draft.alarm_bindings",
          "BUILDER_MISSING_REQUIRED_BINDING",
          "BUILDER_UNKNOWN_BINDING_TARGET",
          [&](const std::string& id) { return alarm_service_.has_alarm(id); }));
  merge_validation(result, validate_parameters(draft, *definition));

  if (draft.enabled_after_create) {
    append_warning(
        result,
        "draft.enabled_after_create",
        "BUILDER_UNSAFE_ENABLE_REQUEST",
        "Stage 20 always creates programs disabled for review. The enable request will be ignored.");
  }

  if (!result.has_errors() && result.status.code != ProgramBuilderErrorCode::ok) {
    result.status = ProgramBuilderStatus::success();
  }

  return result;
}

ProgramBuilderResult<ProgramBuilderPreview> ProgramSkeletonBuilder::build_preview(const ProgramBuilderDraft& draft) const {
  ProgramBuilderResult<ProgramBuilderPreview> result;
  const auto catalog = build_catalog();
  const auto validation = validate_draft(draft);
  const auto* definition = find_definition(catalog.supported_skeletons, draft.skeleton_kind);

  ProgramBuilderPreview preview;
  preview.draft_summary = build_summary(draft, definition);
  preview.validation_issues = validation.issues;
  preview.will_create_disabled = true;
  preview.required_review_warnings.push_back("Stage 20 creates a disabled review skeleton. It does not auto-start and advanced editing comes later.");
  preview.required_review_warnings.push_back("Forward transitions are placeholders in this stage and require manual review before a production-ready program exists.");

  if (definition != nullptr &&
      (definition->kind == ProgramSkeletonKind::burner_supervisory_skeleton ||
       definition->kind == ProgramSkeletonKind::incinerator_supervisory_skeleton)) {
    preview.required_review_warnings.push_back("Hazardous actuator slots are validated but not auto-energized by the Stage 20 skeleton generator.");
  }
  if (definition != nullptr && definition->kind == ProgramSkeletonKind::incinerator_supervisory_skeleton) {
    preview.required_review_warnings.push_back("Warmup and cooldown thresholds are captured and validated, but full supervisory temperature logic is postponed.");
  }
  if (definition != nullptr && definition->kind == ProgramSkeletonKind::dosing_basic) {
    preview.required_review_warnings.push_back("Target volume is captured for review, but closed-loop dispense completion logic is postponed.");
  }

  if (definition != nullptr) {
    preview.branches.initial_state_id = definition->preview_state_ids.empty() ? "" : definition->preview_state_ids.front();
    preview.branches.normal_stop_state_id = "NORMAL_STOP";
    preview.branches.trip_state_id = "TRIP_STOP";
    preview.branches.lockout_state_id = "LOCKOUT";
  }

  if (validation.has_errors() || definition == nullptr) {
    result.status = validation.status.ok() ? ProgramBuilderStatus::error(ProgramBuilderErrorCode::builder_invalid_draft, "Draft validation failed.") : validation.status;
    result.value = std::move(preview);
    return result;
  }

  auto generated = build_program(draft);
  if (!generated.ok()) {
    result.status = generated.status;
    result.value = std::move(preview);
    return result;
  }

  preview.generated_program = *generated.value;
  preview.generated_states = build_state_previews(*generated.value);
  preview.generated_transitions = build_transition_previews(*generated.value);
  preview.branches.initial_state_id = generated.value->initial_state_id;
  preview.branches.normal_stop_state_id = generated.value->normal_stop_state_id;
  preview.branches.trip_state_id = generated.value->trip_state_id;
  preview.branches.lockout_state_id = generated.value->lockout_state_id;

  result.status = ProgramBuilderStatus::success("Program builder preview refreshed.");
  result.value = std::move(preview);
  return result;
}

ProgramBuilderResult<SequenceProgram> ProgramSkeletonBuilder::build_program(const ProgramBuilderDraft& draft) const {
  ProgramBuilderResult<SequenceProgram> result;
  const auto catalog = build_catalog();
  const auto validation = validate_draft(draft);
  if (validation.has_errors()) {
    result.status = validation.status.ok() ? ProgramBuilderStatus::error(ProgramBuilderErrorCode::builder_invalid_draft, "Draft validation failed.") : validation.status;
    return result;
  }

  const auto* definition = find_definition(catalog.supported_skeletons, draft.skeleton_kind);
  if (definition == nullptr) {
    result.status = ProgramBuilderStatus::error(ProgramBuilderErrorCode::builder_unsupported_skeleton, "No skeleton definition exists for the requested kind.");
    return result;
  }

  auto program = build_sequence_program(draft, *definition, catalog);
  const auto sequence_validation = sequence_service_.validate_program(program);
  if (!sequence_validation.ok()) {
    std::string message = sequence_validation.status.message;
    if (message.empty() && !sequence_validation.issues.empty()) {
      message = sequence_validation.issues.front().message;
    }
    result.status = ProgramBuilderStatus::error(ProgramBuilderErrorCode::builder_generation_failed, has_text(message) ? message : "Generated sequence program is invalid.");
    return result;
  }

  result.status = ProgramBuilderStatus::success("Program skeleton generated.");
  result.value = std::move(program);
  return result;
}

}  // namespace controller::sequence
