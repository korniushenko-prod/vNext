#include "api/web_program_editor_adapter.hpp"

#include <algorithm>
#include <functional>
#include <sstream>
#include <type_traits>
#include <unordered_map>
#include <utility>

#include "conditions/condition_node.hpp"

namespace controller::api {

namespace {

using controller::conditions::ConditionConstantBoolNode;
using controller::conditions::ConditionGroupNode;
using controller::conditions::ConditionNode;
using controller::conditions::ConditionNodeKind;
using controller::conditions::ConditionSignalCompareNode;
using controller::conditions::ConditionSignalFlagNode;
using controller::conditions::ConditionSignalRangeNode;
using controller::signals::SignalValue;

template <typename T>
const T* payload_if(const ConditionNode& node) {
  return std::get_if<T>(&node.payload);
}

std::string bool_text(const bool value) {
  return value ? "true" : "false";
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

std::string relay_state_text(const controller::hal::RelayState state) {
  return state == controller::hal::RelayState::on ? "on" : "off";
}

std::string sequence_type_text(const controller::sequence::SequenceProgramType type) {
  return controller::sequence::to_string(type);
}

std::string sequence_state_type_text(const controller::sequence::SequenceStateType type) {
  return controller::sequence::to_string(type);
}

std::string sequence_action_kind_text(const controller::sequence::SequenceActionKind kind) {
  return controller::sequence::to_string(kind);
}

std::string lifecycle_text(const controller::sequence::SequenceLifecycle lifecycle) {
  return controller::sequence::to_string(lifecycle);
}

std::string condition_node_kind_text(const controller::conditions::ConditionNodeKind kind) {
  return controller::conditions::to_string(kind);
}

std::string signal_type_text(const controller::signals::SignalType type) {
  return controller::signals::to_string(type);
}

std::string actuator_kind_text(const controller::actuators::ActuatorTargetKind kind) {
  return controller::actuators::to_string(kind);
}

std::string actuator_role_text(const controller::actuators::ActuatorRole role) {
  return controller::actuators::to_string(role);
}

std::string issue_severity_text(const controller::sequence::ProgramEditorIssueSeverity severity) {
  return controller::sequence::to_string(severity);
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

std::string summarize_action(const controller::sequence::SequenceAction& action) {
  if (const auto* relay_action = std::get_if<controller::sequence::SequenceRelayRequestAction>(&action.payload)) {
    return relay_action->target_id + "=" + relay_state_text(relay_action->state);
  }
  if (const auto* pwm_action = std::get_if<controller::sequence::SequencePwmRequestAction>(&action.payload)) {
    std::ostringstream stream;
    stream << pwm_action->target_id << "=" << (pwm_action->enabled ? "enabled@" : "disabled@") << pwm_action->duty_percent
           << "%";
    return stream.str();
  }
  if (const auto* timer_action = std::get_if<controller::sequence::SequenceTimerStartAction>(&action.payload)) {
    return "start " + timer_action->timer_id;
  }
  if (const auto* timer_action = std::get_if<controller::sequence::SequenceTimerStopAction>(&action.payload)) {
    return "stop " + timer_action->timer_id;
  }
  if (const auto* alarm_action = std::get_if<controller::sequence::SequenceAlarmSetConditionAction>(&action.payload)) {
    return alarm_action->alarm_id + "=" + bool_text(alarm_action->condition_active);
  }
  if (const auto* signal_action = std::get_if<controller::sequence::SequenceWriteVirtualSignalAction>(&action.payload)) {
    return signal_action->signal_path + "=" + signal_value_text(signal_action->value);
  }
  if (const auto* note_action = std::get_if<controller::sequence::SequenceLogNoteAction>(&action.payload)) {
    return note_action->note.empty() ? "note" : note_action->note;
  }
  return sequence_action_kind_text(action.kind);
}

std::string format_optional_duration(const std::optional<controller::sequence::SequenceDurationMs> value) {
  return value.has_value() ? std::to_string(*value) : "";
}

std::string special_role_for_state(const controller::api::ProgramEditorMetadataViewModel& metadata, const std::string& state_id) {
  if (state_id == metadata.initial_state_id) {
    return "initial";
  }
  if (state_id == metadata.normal_stop_state_id) {
    return "normal_stop";
  }
  if (state_id == metadata.trip_state_id) {
    return "trip";
  }
  if (state_id == metadata.lockout_state_id) {
    return "lockout";
  }
  return "";
}

std::vector<ProgramEditorIssueViewModel> map_issue_view_models(
    const std::vector<ProgramEditorIssueDto>& issues) {
  std::vector<ProgramEditorIssueViewModel> mapped;
  mapped.reserve(issues.size());
  for (const auto& issue : issues) {
    mapped.push_back(ProgramEditorIssueViewModel{
        issue.path,
        issue.code,
        issue_severity_text(issue.severity),
        issue.message,
        issue.severity == controller::sequence::ProgramEditorIssueSeverity::error,
    });
  }
  return mapped;
}

}  // namespace

WebProgramEditorAdapter::WebProgramEditorAdapter(ProgramEditorApiService& api_service) : api_service_(api_service) {}

ProgramEditorViewResponse<std::vector<ProgramEditorProgramListItemViewModel>> WebProgramEditorAdapter::load_program_list(
    const ApiTimestampMs now_ms) const {
  const auto programs = api_service_.list_programs(now_ms);
  if (!programs.ok()) {
    return make_list_error(programs.status.code, programs.status.message, now_ms, programs.status.validation_issues);
  }

  ProgramEditorViewResponse<std::vector<ProgramEditorProgramListItemViewModel>> response;
  response.success = true;
  response.code = ProgramEditorUiResultCode::program_editor_ok;
  response.message = "Program editor list loaded.";
  response.refresh_timestamp_ms = now_ms;
  response.value = build_program_list_view_model(*programs.value);
  return response;
}

ProgramEditorViewResponse<WebProgramEditorViewModel> WebProgramEditorAdapter::load_program_editor(
    const std::string& program_id,
    const ApiTimestampMs now_ms) const {
  const auto programs = api_service_.list_programs(now_ms);
  if (!programs.ok()) {
    return make_error(programs.status.code, programs.status.message, now_ms, programs.status.validation_issues);
  }

  const auto catalog = api_service_.get_editor_catalog(now_ms);
  if (!catalog.ok()) {
    return make_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  const auto editor = api_service_.load_program_editor(program_id, now_ms);
  if (!editor.ok()) {
    return make_error(editor.status.code, editor.status.message, now_ms, editor.status.validation_issues);
  }

  ProgramEditorSourceData source;
  source.program_list = *programs.value;
  source.catalog = *catalog.value;
  source.editor = *editor.value;
  source.preview = source.editor.baseline_preview;

  ProgramEditorViewResponse<WebProgramEditorViewModel> response;
  response.success = true;
  response.code = ProgramEditorUiResultCode::program_editor_ok;
  response.message = "Program editor detail loaded.";
  response.refresh_timestamp_ms = now_ms;
  response.value = build_view_model(source);
  return response;
}

ProgramEditorViewResponse<ProgramEditorCatalogViewModel> WebProgramEditorAdapter::load_editor_catalog(
    const ApiTimestampMs now_ms) const {
  const auto catalog = api_service_.get_editor_catalog(now_ms);
  if (!catalog.ok()) {
    return make_catalog_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  ProgramEditorViewResponse<ProgramEditorCatalogViewModel> response;
  response.success = true;
  response.code = ProgramEditorUiResultCode::program_editor_ok;
  response.message = "Program editor catalog loaded.";
  response.refresh_timestamp_ms = now_ms;
  response.value = build_catalog_view_model(*catalog.value);
  return response;
}

ProgramEditorViewResponse<WebProgramEditorViewModel> WebProgramEditorAdapter::preview_program_edit(
    const ProgramEditorDraftDto& draft,
    const ApiTimestampMs now_ms) const {
  const auto programs = api_service_.list_programs(now_ms);
  if (!programs.ok()) {
    return make_error(programs.status.code, programs.status.message, now_ms, programs.status.validation_issues);
  }

  const auto catalog = api_service_.get_editor_catalog(now_ms);
  if (!catalog.ok()) {
    return make_error(catalog.status.code, catalog.status.message, now_ms, catalog.status.validation_issues);
  }

  const auto program_id =
      draft.existing_program_id.has_value() && !draft.existing_program_id->empty() ? *draft.existing_program_id : draft.program_id;
  const auto editor = api_service_.load_program_editor(program_id, now_ms);
  if (!editor.ok()) {
    return make_error(editor.status.code, editor.status.message, now_ms, editor.status.validation_issues);
  }

  const auto preview = api_service_.preview_program_edit(draft, now_ms);
  ProgramEditorSourceData source;
  source.program_list = *programs.value;
  source.catalog = *catalog.value;
  source.editor = *editor.value;
  source.editor.draft = draft;
  source.preview = preview.value;

  ProgramEditorViewResponse<WebProgramEditorViewModel> response;
  response.success = preview.status.ok();
  response.code = preview.status.code;
  response.message = preview.status.message;
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = preview.status.validation_issues;
  response.value = build_view_model(source);
  return response;
}

ProgramEditorMutationResponse WebProgramEditorAdapter::save_program_edit(
    const std::string& program_id,
    const ProgramEditorDraftDto& draft,
    const CommandContext& context) {
  const auto saved = api_service_.save_program_edit(program_id, draft, context);
  ProgramEditorMutationResponse response;
  response.accepted = saved.accepted;
  response.code = saved.status.code;
  response.message = saved.status.message;
  response.refresh_timestamp_ms = context.now_ms;
  response.validation_issues = saved.status.validation_issues;

  if (saved.editor.has_value()) {
    const auto programs = api_service_.list_programs(context.now_ms);
    const auto catalog = api_service_.get_editor_catalog(context.now_ms);
    if (programs.ok() && catalog.ok()) {
      ProgramEditorSourceData source;
      source.program_list = *programs.value;
      source.catalog = *catalog.value;
      source.editor = *saved.editor;
      source.preview = saved.editor->baseline_preview;
      response.value = build_view_model(source);
    }
  }

  return response;
}

ProgramEditorMutationResponse WebProgramEditorAdapter::delete_program(
    const std::string& program_id,
    const CommandContext& context) {
  const auto deleted = api_service_.delete_program(program_id, context);
  ProgramEditorMutationResponse response;
  response.accepted = deleted.accepted;
  response.code = deleted.status.code;
  response.message = deleted.status.message;
  response.refresh_timestamp_ms = context.now_ms;
  response.validation_issues = deleted.status.validation_issues;
  return response;
}

ProgramEditorMutationResponse WebProgramEditorAdapter::enable_program(
    const std::string& program_id,
    const CommandContext& context) {
  const auto changed = api_service_.set_program_enabled(program_id, true, context);
  ProgramEditorMutationResponse response;
  response.accepted = changed.accepted;
  response.code = changed.status.code;
  response.message = changed.status.message;
  response.refresh_timestamp_ms = context.now_ms;
  response.validation_issues = changed.status.validation_issues;

  if (changed.editor.has_value()) {
    const auto programs = api_service_.list_programs(context.now_ms);
    const auto catalog = api_service_.get_editor_catalog(context.now_ms);
    if (programs.ok() && catalog.ok()) {
      ProgramEditorSourceData source;
      source.program_list = *programs.value;
      source.catalog = *catalog.value;
      source.editor = *changed.editor;
      source.preview = changed.editor->baseline_preview;
      response.value = build_view_model(source);
    }
  }

  return response;
}

ProgramEditorMutationResponse WebProgramEditorAdapter::disable_program(
    const std::string& program_id,
    const CommandContext& context) {
  const auto changed = api_service_.set_program_enabled(program_id, false, context);
  ProgramEditorMutationResponse response;
  response.accepted = changed.accepted;
  response.code = changed.status.code;
  response.message = changed.status.message;
  response.refresh_timestamp_ms = context.now_ms;
  response.validation_issues = changed.status.validation_issues;

  if (changed.editor.has_value()) {
    const auto programs = api_service_.list_programs(context.now_ms);
    const auto catalog = api_service_.get_editor_catalog(context.now_ms);
    if (programs.ok() && catalog.ok()) {
      ProgramEditorSourceData source;
      source.program_list = *programs.value;
      source.catalog = *catalog.value;
      source.editor = *changed.editor;
      source.preview = changed.editor->baseline_preview;
      response.value = build_view_model(source);
    }
  }

  return response;
}

WebProgramEditorViewModel WebProgramEditorAdapter::build_view_model(const ProgramEditorSourceData& source) {
  WebProgramEditorViewModel view_model;
  view_model.program_list = build_program_list_view_model(source.program_list);
  view_model.catalog = build_catalog_view_model(source.catalog);

  view_model.metadata.program_id = source.editor.draft.program_id;
  view_model.metadata.name = source.editor.draft.name;
  view_model.metadata.type = sequence_type_text(source.editor.draft.type);
  view_model.metadata.enabled = source.editor.draft.enabled;
  view_model.metadata.description = source.editor.draft.description.value_or("");
  view_model.metadata.initial_state_id = source.editor.draft.initial_state_id;
  view_model.metadata.normal_stop_state_id = source.editor.draft.normal_stop_state_id;
  view_model.metadata.trip_state_id = source.editor.draft.trip_state_id;
  view_model.metadata.lockout_state_id = source.editor.draft.lockout_state_id;
  view_model.metadata.start_condition_summary = summarize_condition_tree(source.editor.draft.start_condition);
  view_model.metadata.reset_condition_summary = summarize_condition_tree(source.editor.draft.reset_condition);

  view_model.runtime_status.active = source.editor.runtime_status.active;
  view_model.runtime_status.runtime_editable = source.editor.runtime_status.runtime_editable;
  view_model.runtime_status.lifecycle = lifecycle_text(source.editor.runtime_status.lifecycle);
  view_model.runtime_status.current_state = source.editor.runtime_status.current_state_id.value_or("Program not active");
  view_model.runtime_status.previous_state = source.editor.runtime_status.previous_state_id.value_or("");
  view_model.runtime_status.state_elapsed_ms = source.editor.runtime_status.state_elapsed_ms;
  view_model.runtime_status.pending_normal_stop = source.editor.runtime_status.pending_normal_stop;
  view_model.runtime_status.pending_trip = source.editor.runtime_status.pending_trip;
  view_model.runtime_status.lockout = source.editor.runtime_status.lockout;
  view_model.runtime_status.last_reason = source.editor.runtime_status.last_reason;
  view_model.runtime_status.banner = source.editor.runtime_status.active
                                         ? "Active program is read-only"
                                         : "Program not active";
  for (const auto& candidate : source.editor.runtime_status.transition_candidates) {
    view_model.runtime_status.transition_candidates.push_back(ProgramEditorRuntimeTransitionCandidateViewModel{
        candidate.transition_id,
        candidate.target_state_id,
        candidate.eligible,
        candidate.reason,
        candidate.min_time_satisfied,
        candidate.condition_effective_result.has_value()
            ? bool_text(*candidate.condition_effective_result)
            : std::string{"n/a"},
    });
  }

  const auto preview = source.preview.value_or(source.editor.baseline_preview);
  view_model.issues = map_issue_view_models(preview.validation_issues);
  view_model.preview.save_allowed = preview.save_allowed;
  view_model.preview.runtime_editable = preview.runtime_editable;
  view_model.preview.warnings = preview.warnings;
  for (const auto& state_summary : preview.ordered_state_summaries) {
    view_model.preview.state_summaries.push_back(
        state_summary.state_id + " | " + sequence_state_type_text(state_summary.state_type) + " | transitions=" +
        std::to_string(state_summary.transition_count));
  }
  for (const auto& transition_summary : preview.transition_summaries) {
    std::string line = transition_summary.source_state_id + " -> " + transition_summary.target_state_id;
    if (transition_summary.require_min_time_done) {
      line += " | min-time";
    }
    view_model.preview.transition_summaries.push_back(std::move(line));
  }
  view_model.preview.special_state_summary =
      "initial=" + preview.special_state_summary.initial_state_id +
      ", normal_stop=" + preview.special_state_summary.normal_stop_state_id +
      ", trip=" + preview.special_state_summary.trip_state_id +
      ", lockout=" + preview.special_state_summary.lockout_state_id;

  std::string selected_state_id = source.editor.runtime_status.current_state_id.value_or("");
  if (selected_state_id.empty() && !source.editor.draft.states.empty()) {
    selected_state_id = source.editor.draft.states.front().id;
  }

  for (const auto& state : source.editor.draft.states) {
    const bool selected = state.id == selected_state_id;
    view_model.states.push_back(ProgramEditorStateListItemViewModel{
        state.id,
        state.name,
        sequence_state_type_text(state.state_type),
        state.enabled,
        selected,
        special_role_for_state(view_model.metadata, state.id),
        state.transitions.size(),
    });

    if (selected) {
      ProgramEditorStateDetailViewModel detail;
      detail.id = state.id;
      detail.name = state.name;
      detail.enabled = state.enabled;
      detail.state_type = sequence_state_type_text(state.state_type);
      detail.non_skippable = state.non_skippable;
      detail.manual_allowed = state.manual_allowed;
      detail.min_time_ms = format_optional_duration(state.min_time_ms);
      detail.max_time_ms = format_optional_duration(state.max_time_ms);
      detail.timeout_target_state_id = state.timeout_target_state_id.value_or("");
      detail.guard_fail_target_state_id = state.guard_fail_target_state_id.value_or("");
      detail.guard_condition_summary = summarize_condition_tree(state.guard_condition);

      for (const auto& action : state.entry_actions) {
        detail.entry_actions.push_back(ProgramEditorActionViewModel{
            action.id,
            action.description,
            sequence_action_kind_text(action.kind),
            summarize_action(action),
        });
      }
      for (const auto& action : state.active_actions) {
        detail.active_actions.push_back(ProgramEditorActionViewModel{
            action.id,
            action.description,
            sequence_action_kind_text(action.kind),
            summarize_action(action),
        });
      }
      for (const auto& action : state.exit_actions) {
        detail.exit_actions.push_back(ProgramEditorActionViewModel{
            action.id,
            action.description,
            sequence_action_kind_text(action.kind),
            summarize_action(action),
        });
      }
      for (const auto& transition : state.transitions) {
        detail.transitions.push_back(ProgramEditorTransitionViewModel{
            transition.id,
            transition.name,
            transition.enabled,
            transition.target_state_id,
            transition.require_min_time_done,
            summarize_condition_tree(transition.condition_tree),
        });
      }

      view_model.selected_state = std::move(detail);
    }
  }

  view_model.command_bar.can_save = preview.save_allowed && preview.runtime_editable;
  view_model.command_bar.can_delete = !source.editor.runtime_status.active;
  view_model.command_bar.can_enable = !source.editor.draft.enabled;
  view_model.command_bar.can_disable = source.editor.draft.enabled && !source.editor.runtime_status.active;
  view_model.command_bar.read_only_banner = source.editor.runtime_status.active ? "Active program is read-only" : "";

  return view_model;
}

ProgramEditorCatalogViewModel WebProgramEditorAdapter::build_catalog_view_model(const ProgramEditorCatalogDto& catalog) {
  ProgramEditorCatalogViewModel view_model;
  for (const auto& signal : catalog.signals) {
    view_model.signal_options.push_back(signal.path + " (" + signal_type_text(signal.type) + ")");
  }
  for (const auto& actuator : catalog.actuators) {
    view_model.actuator_options.push_back(
        actuator.id + " (" + actuator_kind_text(actuator.kind) + ", " + actuator_role_text(actuator.role) + ")");
  }
  for (const auto& timer : catalog.timers) {
    view_model.timer_options.push_back(timer.id + " (" + timer.name + ")");
  }
  for (const auto& alarm : catalog.alarms) {
    view_model.alarm_options.push_back(alarm.id + " (" + alarm.name + ")");
  }
  for (const auto& program : catalog.programs) {
    view_model.program_options.push_back(program.id + " (" + program.name + ")");
  }
  for (const auto& signal : catalog.writable_virtual_signals) {
    view_model.writable_virtual_signal_options.push_back(signal.path);
  }
  for (const auto state_type : catalog.supported_state_types) {
    view_model.state_type_options.push_back(sequence_state_type_text(state_type));
  }
  for (const auto action_kind : catalog.supported_action_kinds) {
    view_model.action_kind_options.push_back(sequence_action_kind_text(action_kind));
  }
  for (const auto node_kind : catalog.supported_condition_node_kinds) {
    view_model.condition_node_kind_options.push_back(condition_node_kind_text(node_kind));
  }
  return view_model;
}

std::vector<ProgramEditorProgramListItemViewModel> WebProgramEditorAdapter::build_program_list_view_model(
    const std::vector<ProgramEditorProgramListItemDto>& programs) {
  std::vector<ProgramEditorProgramListItemViewModel> mapped;
  mapped.reserve(programs.size());
  for (const auto& program : programs) {
    mapped.push_back(ProgramEditorProgramListItemViewModel{
        program.id,
        program.name,
        sequence_type_text(program.type),
        program.enabled,
        program.active,
        program.runtime_editable,
        program.active ? "active" : (program.enabled ? "idle" : "disabled"),
    });
  }
  return mapped;
}

ProgramEditorViewResponse<WebProgramEditorViewModel> WebProgramEditorAdapter::make_error(
    const ProgramEditorUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms,
    std::vector<ProgramEditorIssueDto> validation_issues) {
  ProgramEditorViewResponse<WebProgramEditorViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = std::move(validation_issues);
  return response;
}

ProgramEditorViewResponse<ProgramEditorCatalogViewModel> WebProgramEditorAdapter::make_catalog_error(
    const ProgramEditorUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms,
    std::vector<ProgramEditorIssueDto> validation_issues) {
  ProgramEditorViewResponse<ProgramEditorCatalogViewModel> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = std::move(validation_issues);
  return response;
}

ProgramEditorViewResponse<std::vector<ProgramEditorProgramListItemViewModel>> WebProgramEditorAdapter::make_list_error(
    const ProgramEditorUiResultCode code,
    std::string message,
    const ApiTimestampMs now_ms,
    std::vector<ProgramEditorIssueDto> validation_issues) {
  ProgramEditorViewResponse<std::vector<ProgramEditorProgramListItemViewModel>> response;
  response.success = false;
  response.code = code;
  response.message = std::move(message);
  response.refresh_timestamp_ms = now_ms;
  response.validation_issues = std::move(validation_issues);
  return response;
}

}  // namespace controller::api
