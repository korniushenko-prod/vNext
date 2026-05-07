#include "api/program_editor_api_service.hpp"

#include <algorithm>
#include <utility>

namespace controller::api {

namespace {

using controller::conditions::ConditionNodeKind;
using controller::sequence::ProgramEditorErrorCode;
using controller::sequence::ProgramEditorStatus;
using controller::sequence::SequenceErrorCode;
using controller::sequence::SequenceSnapshot;
using controller::signals::SignalAccessMode;

bool has_text(const std::string& value) {
  return !value.empty();
}

bool is_active_snapshot(const SequenceSnapshot& snapshot) {
  return snapshot.active_program_id.has_value() && snapshot.program_id == *snapshot.active_program_id;
}

bool compare_signal_catalog(
    const controller::sequence::ProgramEditorSignalCatalogEntry& lhs,
    const controller::sequence::ProgramEditorSignalCatalogEntry& rhs) {
  return lhs.path < rhs.path;
}

bool compare_actuator_catalog(
    const controller::sequence::ProgramEditorActuatorCatalogEntry& lhs,
    const controller::sequence::ProgramEditorActuatorCatalogEntry& rhs) {
  return lhs.id < rhs.id;
}

template <typename Entry>
bool compare_named_catalog(const Entry& lhs, const Entry& rhs) {
  return lhs.id < rhs.id;
}

ProgramEditorUiResultCode map_editor_error_code(const ProgramEditorErrorCode code) {
  switch (code) {
    case ProgramEditorErrorCode::ok:
      return ProgramEditorUiResultCode::program_editor_ok;
    case ProgramEditorErrorCode::program_editor_program_not_found:
      return ProgramEditorUiResultCode::program_editor_program_not_found;
    case ProgramEditorErrorCode::program_editor_save_denied:
      return ProgramEditorUiResultCode::program_editor_save_denied;
    case ProgramEditorErrorCode::program_editor_delete_denied:
      return ProgramEditorUiResultCode::program_editor_delete_denied;
    case ProgramEditorErrorCode::program_editor_invalid_draft:
      return ProgramEditorUiResultCode::program_editor_validation_failed;
    case ProgramEditorErrorCode::program_editor_data_unavailable:
      return ProgramEditorUiResultCode::program_editor_data_unavailable;
  }
  return ProgramEditorUiResultCode::program_editor_data_unavailable;
}

}  // namespace

const char* to_string(const ProgramEditorUiResultCode code) {
  switch (code) {
    case ProgramEditorUiResultCode::program_editor_ok:
      return "PROGRAM_EDITOR_OK";
    case ProgramEditorUiResultCode::program_editor_program_not_found:
      return "PROGRAM_EDITOR_PROGRAM_NOT_FOUND";
    case ProgramEditorUiResultCode::program_editor_save_denied:
      return "PROGRAM_EDITOR_SAVE_DENIED";
    case ProgramEditorUiResultCode::program_editor_delete_denied:
      return "PROGRAM_EDITOR_DELETE_DENIED";
    case ProgramEditorUiResultCode::program_editor_enable_denied:
      return "PROGRAM_EDITOR_ENABLE_DENIED";
    case ProgramEditorUiResultCode::program_editor_disable_denied:
      return "PROGRAM_EDITOR_DISABLE_DENIED";
    case ProgramEditorUiResultCode::program_editor_invalid_argument:
      return "PROGRAM_EDITOR_INVALID_ARGUMENT";
    case ProgramEditorUiResultCode::program_editor_validation_failed:
      return "PROGRAM_EDITOR_VALIDATION_FAILED";
    case ProgramEditorUiResultCode::program_editor_data_unavailable:
      return "PROGRAM_EDITOR_DATA_UNAVAILABLE";
  }
  return "PROGRAM_EDITOR_UNKNOWN";
}

ProgramEditorApiService::ProgramEditorApiService(
    controller::signals::SignalRegistry& signal_registry,
    controller::actuators::ActuatorManager& actuator_manager,
    controller::timers::TimerService& timer_service,
    controller::alarms::AlarmService& alarm_service,
    controller::sequence::SequenceService& sequence_service)
    : signal_registry_(signal_registry),
      actuator_manager_(actuator_manager),
      timer_service_(timer_service),
      alarm_service_(alarm_service),
      sequence_service_(sequence_service) {}

ProgramEditorUiResult<std::vector<ProgramEditorProgramListItemDto>> ProgramEditorApiService::list_programs(
    const ApiTimestampMs now_ms) const {
  ProgramEditorUiResult<std::vector<ProgramEditorProgramListItemDto>> result;

  const auto programs = sequence_service_.list_programs();
  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
  if (programs.size() != snapshots.size()) {
    result.status = ProgramEditorUiStatus::error(
        ProgramEditorUiResultCode::program_editor_data_unavailable,
        "Program list and snapshot list sizes do not match.");
    return result;
  }

  result.status = ProgramEditorUiStatus::success("Program editor program list refreshed.");
  result.value = build_program_list(now_ms);
  return result;
}

ProgramEditorUiResult<ProgramEditorLoadDto> ProgramEditorApiService::load_program_editor(
    const std::string& program_id,
    const ApiTimestampMs now_ms) const {
  ProgramEditorUiResult<ProgramEditorLoadDto> result;

  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  const auto program = sequence_service_.get_program_descriptor_copy(program_id);
  if (!program.ok()) {
    result.status = ProgramEditorUiStatus::error(
        ProgramEditorUiResultCode::program_editor_program_not_found,
        program.status.message);
    return result;
  }

  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
  const auto snapshot_it =
      std::find_if(snapshots.begin(), snapshots.end(), [&](const auto& snapshot) { return snapshot.program_id == program_id; });
  if (snapshot_it == snapshots.end()) {
    result.status = ProgramEditorUiStatus::error(
        ProgramEditorUiResultCode::program_editor_data_unavailable,
        "Program '" + program_id + "' is registered but runtime snapshot data is unavailable.");
    return result;
  }

  result.status = ProgramEditorUiStatus::success("Program editor detail refreshed.");
  result.value = build_load_dto(*program.value, *snapshot_it);
  return result;
}

ProgramEditorUiResult<ProgramEditorCatalogDto> ProgramEditorApiService::get_editor_catalog(const ApiTimestampMs now_ms) const {
  static_cast<void>(now_ms);
  ProgramEditorUiResult<ProgramEditorCatalogDto> result;
  ProgramEditorCatalogDto catalog;

  for (const auto& descriptor : signal_registry_.list_descriptors()) {
    if (!descriptor.visible || descriptor.source_module == "sequence_service") {
      continue;
    }

    controller::sequence::ProgramEditorSignalCatalogEntry entry;
    entry.path = descriptor.path;
    entry.name = descriptor.name;
    entry.type = descriptor.type;
    entry.unit = descriptor.unit;
    entry.source_module = descriptor.source_module;
    entry.access_mode = descriptor.access_mode;
    catalog.signals.push_back(entry);
    if (descriptor.access_mode == SignalAccessMode::writable_virtual) {
      catalog.writable_virtual_signals.push_back(entry);
    }
  }
  std::sort(catalog.signals.begin(), catalog.signals.end(), compare_signal_catalog);
  std::sort(catalog.writable_virtual_signals.begin(), catalog.writable_virtual_signals.end(), compare_signal_catalog);

  for (const auto& snapshot : actuator_manager_.list_snapshots()) {
    catalog.actuators.push_back(controller::sequence::ProgramEditorActuatorCatalogEntry{
        snapshot.target_id,
        snapshot.kind,
        snapshot.role,
    });
  }
  std::sort(catalog.actuators.begin(), catalog.actuators.end(), compare_actuator_catalog);

  for (const auto& descriptor : timer_service_.list_descriptors()) {
    catalog.timers.push_back(controller::sequence::ProgramEditorTimerCatalogEntry{
        descriptor.id,
        descriptor.name,
        descriptor.enabled,
    });
  }
  std::sort(catalog.timers.begin(), catalog.timers.end(), compare_named_catalog<controller::sequence::ProgramEditorTimerCatalogEntry>);

  for (const auto& descriptor : alarm_service_.list_descriptors()) {
    catalog.alarms.push_back(controller::sequence::ProgramEditorAlarmCatalogEntry{
        descriptor.id,
        descriptor.name,
        descriptor.enabled,
    });
  }
  std::sort(catalog.alarms.begin(), catalog.alarms.end(), compare_named_catalog<controller::sequence::ProgramEditorAlarmCatalogEntry>);

  const auto programs = sequence_service_.list_programs();
  const auto snapshots = sequence_service_.list_program_snapshots(0U);
  for (std::size_t index = 0; index < programs.size() && index < snapshots.size(); ++index) {
    catalog.programs.push_back(controller::sequence::ProgramEditorProgramCatalogEntry{
        programs[index].id,
        programs[index].name,
        programs[index].type,
        programs[index].enabled,
        is_active_snapshot(snapshots[index]),
    });
  }
  std::sort(catalog.programs.begin(), catalog.programs.end(), compare_named_catalog<controller::sequence::ProgramEditorProgramCatalogEntry>);

  catalog.supported_state_types = {
      controller::sequence::SequenceStateType::generic,
      controller::sequence::SequenceStateType::wait,
      controller::sequence::SequenceStateType::action,
      controller::sequence::SequenceStateType::purge,
      controller::sequence::SequenceStateType::ignition,
      controller::sequence::SequenceStateType::run,
      controller::sequence::SequenceStateType::stop,
      controller::sequence::SequenceStateType::cooldown,
      controller::sequence::SequenceStateType::lockout,
      controller::sequence::SequenceStateType::custom,
  };
  catalog.supported_action_kinds = {
      controller::sequence::SequenceActionKind::relay_request,
      controller::sequence::SequenceActionKind::pwm_request,
      controller::sequence::SequenceActionKind::timer_start,
      controller::sequence::SequenceActionKind::timer_stop,
      controller::sequence::SequenceActionKind::alarm_set_condition,
      controller::sequence::SequenceActionKind::write_virtual_signal,
      controller::sequence::SequenceActionKind::log_note,
  };
  catalog.supported_condition_node_kinds = {
      ConditionNodeKind::all,
      ConditionNodeKind::any,
      ConditionNodeKind::not_op,
      ConditionNodeKind::constant_bool,
      ConditionNodeKind::signal_compare,
      ConditionNodeKind::signal_range,
      ConditionNodeKind::signal_flag,
  };

  result.status = ProgramEditorUiStatus::success("Program editor catalog refreshed.");
  result.value = std::move(catalog);
  return result;
}

ProgramEditorUiResult<ProgramEditorPreviewDto> ProgramEditorApiService::preview_program_edit(
    const ProgramEditorDraftDto& draft,
    const ApiTimestampMs now_ms) const {
  ProgramEditorUiResult<ProgramEditorPreviewDto> result;
  bool runtime_editable = true;
  if (draft.existing_program_id.has_value() && has_text(*draft.existing_program_id)) {
    const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
    const auto snapshot_it = std::find_if(
        snapshots.begin(),
        snapshots.end(),
        [&](const auto& snapshot) { return snapshot.program_id == *draft.existing_program_id; });
    if (snapshot_it != snapshots.end()) {
      runtime_editable = !is_active_snapshot(*snapshot_it);
    }
  }

  const auto preview = sequence_service_.preview_program_editor_draft(draft, runtime_editable);
  result.status = map_editor_status(
      preview.status,
      preview.value.has_value() ? preview.value->validation_issues : std::vector<ProgramEditorIssueDto>{});
  result.value = preview.value;
  return result;
}

ProgramEditorMutationResult ProgramEditorApiService::save_program_edit(
    const std::string& program_id,
    const ProgramEditorDraftDto& draft,
    const CommandContext& context) {
  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    return ProgramEditorMutationResult{false, id_status, program_id, std::nullopt, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return ProgramEditorMutationResult{false, context_status, program_id, std::nullopt, std::nullopt};
  }

  const auto live_detail = load_program_editor(program_id, context.now_ms);
  if (!live_detail.ok()) {
    return ProgramEditorMutationResult{false, live_detail.status, program_id, std::nullopt, std::nullopt};
  }

  const auto preview = preview_program_edit(draft, context.now_ms);
  if (!preview.status.ok()) {
    auto detail = *live_detail.value;
    detail.draft = draft;
    if (preview.value.has_value()) {
      detail.baseline_preview = *preview.value;
      detail.runtime_editable = preview.value->runtime_editable;
      detail.summary.name = draft.name;
      detail.summary.type = draft.type;
      detail.summary.enabled = draft.enabled;
    }
    return ProgramEditorMutationResult{
        false,
        preview.status,
        program_id,
        detail,
        std::nullopt,
    };
  }

  const auto operation = sequence_service_.replace_program(program_id, controller::sequence::make_sequence_program(draft), context.now_ms);
  if (!operation.ok()) {
    return ProgramEditorMutationResult{
        false,
        map_sequence_status(operation.status, ProgramEditorUiResultCode::program_editor_save_denied),
        program_id,
        std::nullopt,
        std::nullopt,
    };
  }

  const auto refreshed = load_program_editor(program_id, context.now_ms);
  return ProgramEditorMutationResult{
      true,
      ProgramEditorUiStatus::success("Program '" + program_id + "' saved."),
      program_id,
      refreshed.value,
      std::nullopt,
  };
}

ProgramEditorMutationResult ProgramEditorApiService::delete_program(
    const std::string& program_id,
    const CommandContext& context) {
  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    return ProgramEditorMutationResult{false, id_status, program_id, std::nullopt, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return ProgramEditorMutationResult{false, context_status, program_id, std::nullopt, std::nullopt};
  }

  const auto operation = sequence_service_.remove_program(program_id, context.now_ms);
  if (!operation.ok()) {
    return ProgramEditorMutationResult{
        false,
        map_sequence_status(operation.status, ProgramEditorUiResultCode::program_editor_delete_denied),
        program_id,
        std::nullopt,
        std::nullopt,
    };
  }

  const auto remaining = list_programs(context.now_ms);
  return ProgramEditorMutationResult{
      true,
      ProgramEditorUiStatus::success("Program '" + program_id + "' deleted."),
      program_id,
      std::nullopt,
      remaining.value,
  };
}

ProgramEditorMutationResult ProgramEditorApiService::set_program_enabled(
    const std::string& program_id,
    const bool enabled,
    const CommandContext& context) {
  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    return ProgramEditorMutationResult{false, id_status, program_id, std::nullopt, std::nullopt};
  }

  const auto context_status = validate_command_context(context);
  if (!context_status.ok()) {
    return ProgramEditorMutationResult{false, context_status, program_id, std::nullopt, std::nullopt};
  }

  const auto operation = sequence_service_.set_program_enabled(program_id, enabled, context.now_ms);
  if (!operation.ok()) {
    return ProgramEditorMutationResult{
        false,
        map_sequence_status(
            operation.status,
            enabled ? ProgramEditorUiResultCode::program_editor_enable_denied
                    : ProgramEditorUiResultCode::program_editor_disable_denied),
        program_id,
        std::nullopt,
        std::nullopt,
    };
  }

  const auto refreshed = load_program_editor(program_id, context.now_ms);
  return ProgramEditorMutationResult{
      true,
      ProgramEditorUiStatus::success(
          std::string{"Program '"} + program_id + "' " + (enabled ? "enabled." : "disabled.")),
      program_id,
      refreshed.value,
      std::nullopt,
  };
}

ProgramEditorUiStatus ProgramEditorApiService::validate_program_id(const std::string& program_id) const {
  if (!has_text(program_id)) {
    return ProgramEditorUiStatus::error(
        ProgramEditorUiResultCode::program_editor_invalid_argument,
        "program_id must not be empty.");
  }
  return ProgramEditorUiStatus::success();
}

ProgramEditorUiStatus ProgramEditorApiService::validate_command_context(const CommandContext& context) const {
  if (!has_text(context.source)) {
    return ProgramEditorUiStatus::error(
        ProgramEditorUiResultCode::program_editor_invalid_argument,
        "CommandContext.source must not be empty.");
  }
  if (!has_text(context.reason)) {
    return ProgramEditorUiStatus::error(
        ProgramEditorUiResultCode::program_editor_invalid_argument,
        "CommandContext.reason must not be empty.");
  }
  return ProgramEditorUiStatus::success();
}

ProgramEditorUiStatus ProgramEditorApiService::map_editor_status(
    const ProgramEditorStatus& status,
    std::vector<ProgramEditorIssueDto> issues) const {
  if (status.ok()) {
    return ProgramEditorUiStatus::success(status.message);
  }
  return ProgramEditorUiStatus::error(map_editor_error_code(status.code), status.message, std::move(issues));
}

ProgramEditorUiStatus ProgramEditorApiService::map_sequence_status(
    const controller::sequence::SequenceStatus& status,
    const ProgramEditorUiResultCode denied_code) const {
  switch (status.code) {
    case SequenceErrorCode::ok:
      return ProgramEditorUiStatus::success(status.message);
    case SequenceErrorCode::sequence_program_not_found:
      return ProgramEditorUiStatus::error(ProgramEditorUiResultCode::program_editor_program_not_found, status.message);
    case SequenceErrorCode::sequence_invalid_program:
    case SequenceErrorCode::sequence_invalid_state_reference:
    case SequenceErrorCode::sequence_invalid_action:
      return ProgramEditorUiStatus::error(ProgramEditorUiResultCode::program_editor_validation_failed, status.message);
    case SequenceErrorCode::sequence_active_program_exists:
      return ProgramEditorUiStatus::error(denied_code, status.message);
    default:
      return ProgramEditorUiStatus::error(ProgramEditorUiResultCode::program_editor_data_unavailable, status.message);
  }
}

std::vector<ProgramEditorProgramListItemDto> ProgramEditorApiService::build_program_list(const ApiTimestampMs now_ms) const {
  std::vector<ProgramEditorProgramListItemDto> items;
  const auto programs = sequence_service_.list_programs();
  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
  const auto count = std::min(programs.size(), snapshots.size());
  items.reserve(count);
  for (std::size_t index = 0; index < count; ++index) {
    items.push_back(build_program_summary(programs[index], snapshots[index]));
  }
  return items;
}

ProgramEditorProgramListItemDto ProgramEditorApiService::build_program_summary(
    const controller::sequence::SequenceProgram& program,
    const controller::sequence::SequenceSnapshot& snapshot) const {
  const bool active = is_active_snapshot(snapshot);
  return ProgramEditorProgramListItemDto{
      program.id,
      program.name,
      program.type,
      program.enabled,
      active,
      !active,
  };
}

ProgramEditorRuntimeStatusDto ProgramEditorApiService::build_runtime_status(
    const std::string& program_id,
    const controller::sequence::SequenceSnapshot& snapshot) const {
  ProgramEditorRuntimeStatusDto status;
  status.program_id = program_id;
  status.active = is_active_snapshot(snapshot);
  status.runtime_editable = !status.active;
  status.lifecycle = status.active ? snapshot.lifecycle : controller::sequence::SequenceLifecycle::idle;
  status.current_state_id = status.active ? snapshot.current_state_id : std::nullopt;
  status.previous_state_id = status.active ? snapshot.previous_state_id : std::nullopt;
  status.state_elapsed_ms = status.active ? snapshot.state_elapsed_ms : 0U;
  status.pending_normal_stop = status.active && snapshot.pending_normal_stop;
  status.pending_trip = status.active && snapshot.pending_trip;
  status.lockout = status.active && snapshot.lockout;
  status.last_reason = status.active ? snapshot.last_reason : "";
  if (status.active) {
    for (const auto& candidate : snapshot.transition_candidates) {
      status.transition_candidates.push_back(ProgramEditorRuntimeTransitionCandidateDto{
          candidate.transition_id,
          candidate.target_state_id,
          candidate.eligible,
          candidate.reason,
          candidate.min_time_satisfied,
          candidate.condition_effective_result,
      });
    }
  }
  return status;
}

ProgramEditorLoadDto ProgramEditorApiService::build_load_dto(
    const controller::sequence::SequenceProgram& program,
    const controller::sequence::SequenceSnapshot& snapshot) const {
  ProgramEditorLoadDto dto;
  dto.summary = build_program_summary(program, snapshot);
  dto.draft = sequence_service_.build_program_editor_draft(program);
  dto.runtime_status = build_runtime_status(program.id, snapshot);
  dto.runtime_editable = dto.runtime_status.runtime_editable;
  const auto preview = sequence_service_.preview_program_editor_draft(dto.draft, dto.runtime_editable);
  dto.baseline_preview = preview.value.value_or(controller::sequence::ProgramEditorPreview{});
  return dto;
}

}  // namespace controller::api
