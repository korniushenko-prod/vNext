#include "api/program_matrix_api_service.hpp"

#include <string>
#include <utility>
#include <vector>

namespace controller::api {

namespace {

bool has_text(const std::string& value) {
  return !value.empty();
}

bool is_active_snapshot(const controller::sequence::SequenceSnapshot& snapshot) {
  return snapshot.active_program_id.has_value() && snapshot.program_id == *snapshot.active_program_id;
}

}  // namespace

const char* to_string(const ProgramMatrixUiResultCode code) {
  switch (code) {
    case ProgramMatrixUiResultCode::matrix_ui_ok:
      return "MATRIX_UI_OK";
    case ProgramMatrixUiResultCode::matrix_ui_no_programs:
      return "MATRIX_UI_NO_PROGRAMS";
    case ProgramMatrixUiResultCode::matrix_ui_program_not_found:
      return "MATRIX_UI_PROGRAM_NOT_FOUND";
    case ProgramMatrixUiResultCode::matrix_ui_no_active_program:
      return "MATRIX_UI_NO_ACTIVE_PROGRAM";
    case ProgramMatrixUiResultCode::matrix_ui_data_unavailable:
      return "MATRIX_UI_DATA_UNAVAILABLE";
    case ProgramMatrixUiResultCode::matrix_ui_invalid_argument:
      return "MATRIX_UI_INVALID_ARGUMENT";
  }

  return "MATRIX_UI_UNKNOWN";
}

ProgramMatrixApiService::ProgramMatrixApiService(
    controller::sequence::SequenceService& sequence_service,
    controller::actuators::ActuatorManager& actuator_manager)
    : sequence_service_(sequence_service), actuator_manager_(actuator_manager) {}

ProgramMatrixUiResult<std::vector<ProgramMatrixProgramListItemDto>> ProgramMatrixApiService::list_programs(
    const ApiTimestampMs now_ms) const {
  ProgramMatrixUiResult<std::vector<ProgramMatrixProgramListItemDto>> result;

  const auto programs = sequence_service_.list_programs();
  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
  if (programs.size() != snapshots.size()) {
    result.status = ProgramMatrixUiStatus::error(
        ProgramMatrixUiResultCode::matrix_ui_data_unavailable,
        "Program list and snapshot list sizes do not match.");
    return result;
  }

  std::vector<ProgramMatrixProgramListItemDto> items;
  items.reserve(programs.size());
  const auto metadata = build_actuator_metadata();
  for (std::size_t index = 0; index < programs.size(); ++index) {
    const auto runtime = build_runtime_summary(programs[index].id, now_ms);
    const auto matrix = builder_.build(programs[index], metadata, runtime);

    ProgramMatrixProgramListItemDto item;
    item.id = programs[index].id;
    item.name = programs[index].name;
    item.type = programs[index].type;
    item.enabled = programs[index].enabled;
    item.active = is_active_snapshot(snapshots[index]);
    if (item.active) {
      item.lifecycle = snapshots[index].lifecycle;
      item.current_state_id = snapshots[index].current_state_id;
    }
    if (matrix.ok()) {
      item.state_count = matrix.value->state_rows.size();
      item.actuator_count = matrix.value->actuator_columns.size();
      item.issue_count = matrix.value->issues.size();
    }

    items.push_back(std::move(item));
  }

  if (items.empty()) {
    result.status = ProgramMatrixUiStatus::error(
        ProgramMatrixUiResultCode::matrix_ui_no_programs,
        "No sequence programs are registered.");
    result.value = std::move(items);
    return result;
  }

  result.status = ProgramMatrixUiStatus::success("Program matrix program list refreshed.");
  result.value = std::move(items);
  return result;
}

ProgramMatrixUiResult<ProgramMatrixPayloadDto> ProgramMatrixApiService::get_program_matrix(
    const std::string& program_id,
    const ApiTimestampMs now_ms) const {
  ProgramMatrixUiResult<ProgramMatrixPayloadDto> result;

  const auto id_status = validate_program_id(program_id);
  if (!id_status.ok()) {
    result.status = id_status;
    return result;
  }

  const auto program = sequence_service_.get_program_descriptor_copy(program_id);
  if (!program.ok()) {
    result.status = ProgramMatrixUiStatus::error(
        ProgramMatrixUiResultCode::matrix_ui_program_not_found,
        program.status.message);
    return result;
  }

  return build_matrix_payload(*program.value, build_runtime_summary(program_id, now_ms));
}

ProgramMatrixUiResult<ProgramMatrixPayloadDto> ProgramMatrixApiService::get_active_program_matrix(
    const ApiTimestampMs now_ms) const {
  ProgramMatrixUiResult<ProgramMatrixPayloadDto> result;
  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);

  for (const auto& snapshot : snapshots) {
    if (!is_active_snapshot(snapshot)) {
      continue;
    }

    const auto program = sequence_service_.get_program_descriptor_copy(snapshot.program_id);
    if (!program.ok()) {
      result.status = ProgramMatrixUiStatus::error(
          ProgramMatrixUiResultCode::matrix_ui_data_unavailable,
          program.status.message);
      return result;
    }

    return build_matrix_payload(*program.value, build_runtime_summary(snapshot.program_id, now_ms));
  }

  ProgramMatrixPayloadDto payload;
  payload.runtime_summary = build_runtime_summary(std::nullopt, now_ms);

  result.status = ProgramMatrixUiStatus::error(
      ProgramMatrixUiResultCode::matrix_ui_no_active_program,
      "No active program matrix is available.");
  result.value = std::move(payload);
  return result;
}

ProgramMatrixUiStatus ProgramMatrixApiService::validate_program_id(const std::string& program_id) const {
  if (!has_text(program_id)) {
    return ProgramMatrixUiStatus::error(
        ProgramMatrixUiResultCode::matrix_ui_invalid_argument,
        "program_id must not be empty.");
  }
  return ProgramMatrixUiStatus::success();
}

std::vector<controller::sequence::ProgramMatrixActuatorMetadata> ProgramMatrixApiService::build_actuator_metadata() const {
  std::vector<controller::sequence::ProgramMatrixActuatorMetadata> metadata;
  const auto snapshots = actuator_manager_.list_snapshots();
  metadata.reserve(snapshots.size());
  for (const auto& snapshot : snapshots) {
    metadata.push_back(controller::sequence::ProgramMatrixActuatorMetadata{
        snapshot.target_id,
        snapshot.target_id,
        snapshot.kind,
        snapshot.role,
        true,
    });
  }
  return metadata;
}

ProgramMatrixRuntimeSummaryDto ProgramMatrixApiService::build_runtime_summary(
    const std::optional<std::string> selected_program_id,
    const ApiTimestampMs now_ms) const {
  ProgramMatrixRuntimeSummaryDto runtime;
  runtime.selected_program_id = selected_program_id;

  const auto snapshots = sequence_service_.list_program_snapshots(now_ms);
  for (const auto& snapshot : snapshots) {
    if (!is_active_snapshot(snapshot)) {
      continue;
    }

    runtime.active_program_id = snapshot.program_id;
    runtime.current_state_id = snapshot.current_state_id;
    runtime.lifecycle = snapshot.lifecycle;
    runtime.lockout = snapshot.lockout;
    runtime.last_reason = snapshot.last_reason;
    runtime.selected_program_active =
        selected_program_id.has_value() && *selected_program_id == snapshot.program_id;
    break;
  }

  return runtime;
}

ProgramMatrixUiResult<ProgramMatrixPayloadDto> ProgramMatrixApiService::build_matrix_payload(
    const controller::sequence::SequenceProgram& program,
    const ProgramMatrixRuntimeSummaryDto& runtime_summary) const {
  ProgramMatrixUiResult<ProgramMatrixPayloadDto> result;

  const auto built = builder_.build(program, build_actuator_metadata(), runtime_summary);
  if (!built.ok()) {
    result.status = ProgramMatrixUiStatus::error(
        ProgramMatrixUiResultCode::matrix_ui_data_unavailable,
        built.status.message);
    return result;
  }

  ProgramMatrixPayloadDto payload;
  payload.runtime_summary = runtime_summary;
  payload.matrix = std::move(built.value);

  result.status = ProgramMatrixUiStatus::success("Program matrix detail refreshed.");
  result.value = std::move(payload);
  return result;
}

}  // namespace controller::api
